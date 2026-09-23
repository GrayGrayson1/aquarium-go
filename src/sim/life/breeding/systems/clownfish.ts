/**
 * clownfish_substrate — protandrous anemonefish (Amphiprion). OWNER: lane "breeding".
 *
 * HIERARCHY (every tank with ≥ 2 clownfish of a species): fish are ranked by size, boldness (temperament potential)
 * and age; `repro.rank` 0 = dominant. Mature undifferentiated fish function as males.
 *   - No female in the group → the top-ranked mature male becomes 'transitioning_female' (stage + reproRole) over
 *     ~3 game-days, then female (history 'sex_change', toast). Sex change is one-way.
 *   - Only ONE female per group. If she dies or is removed, the top-ranked male transitions.
 *   - Two established females in one tank fight (stress, injury, danger warnings) until one is rehomed.
 * PAIR: female + highest-ranked male (partnerId). bond grows while together (days).
 *   bond ≥ 2 & both ready & warm & a nest site ─▶ nest_preparing (both clean a rock beside the host, 12–24 h)
 *   ─(late afternoon/evening)─▶ spawning (2 h) ─▶ adhesive orange eggs ('eggs_adhesive' at the nest)
 *   male ─▶ guarding (fans & mouths the eggs) ; female ─▶ resting (cooldownDays)
 * Eggs hatch after incubationHours, at night; the larvae are planktonic and are lost in a display tank.
 */
import type { Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import type { BreedingModule, StepEnv } from '../types';
import { createClutch } from '../clutch';
import { addMastery, bumpCounter } from '@/sim/facility';
import {
  addHistory,
  ageDaysAt,
  approxDuration,
  clamp,
  fmtTemp,
  habitatOf,
  hasNestSite,
  hurt,
  isAlive,
  isEvening,
  isMature,
  isReady,
  isResting,
  pairUp,
  pickSite,
  plural,
  say,
  setStage,
  stageDue,
  startResting,
  throttleTank,
  throttleTankBackoff,
  tickTimers,
} from '../common';

/** Game hours for a male to become a functional female. */
export const SEX_CHANGE_H = 72;
const BOND_DAYS = 2;
const PREP_H: [number, number] = [12, 24];
const SPAWN_H = 2;

function score(c: Creature, hour: number): number {
  const roleBonus = c.reproRole === 'female' ? 1000 : c.reproRole === 'transitioning_female' ? 500 : 0;
  return roleBonus + c.sizeCm * 10 + (c.genome?.potentials?.temperament ?? 50) * 0.08 + Math.min(40, ageDaysAt(c, hour)) * 0.15;
}

export const clownfishModule: BreedingModule = {
  id: 'clownfish_substrate',
  breedable: true,
  plan: {
    phases: [
      { stage: 'larvae', frac: 0.7, foods: ['infusoria', 'baby_brine', 'copepod_live'], natural: ['copepods'], visual: 'fry_cloud', label: 'larvae' },
      { stage: 'fry', frac: 0.3, foods: ['baby_brine', 'copepod_live', 'flake', 'pellet_small'], natural: ['copepods'], visual: 'fry_cloud', label: 'baby clownfish' },
    ],
    eggTags: ['eggs'],
    youngTags: ['fry'],
    parentsEatEggs: false,
    guardEggs: true,
    guardianEatsFry: false,
    planktonic: true,
    hatchAtNight: true,
    larvaeViable: true,
    starveSeverity: 1.3,
    coverShelter: 0.1,
    yolkFrac: 0.05,
  },

  step(env: StepEnv) {
    const { state, tank, species: sp, members, hour, dt, ctx } = env;
    for (const c of members) tickTimers(c, hour);

    // Mature undifferentiated fish become functional males ("clownfish start male").
    for (const c of members) {
      if (c.reproRole === 'undifferentiated' && isMature(c, sp, hour)) {
        c.reproRole = 'male';
        if (c.sex === 'unknown') c.sex = 'male';
      }
    }

    const ranked = [...members].sort((a, b) => score(b, hour) - score(a, hour) || (a.id < b.id ? -1 : 1));
    ranked.forEach((c, i) => (c.repro.rank = i));
    const females = ranked.filter((c) => c.reproRole === 'female');
    const trans = ranked.filter((c) => c.reproRole === 'transitioning_female');

    // Two established females: fights.
    if (females.length >= 2) fight(state, tank, females, hour, dt, ctx);

    // Ongoing sex changes.
    for (const t of trans) {
      if (t.repro.stage !== 'transitioning_female') setStage(t, 'transitioning_female', hour, hour + SEX_CHANGE_H);
      t.repro.progress = clamp((hour - t.repro.stageSinceHour) / SEX_CHANGE_H, 0, 1);
      if (stageDue(t, hour)) completeSexChange(state, tank, sp, t, ranked, hour, ctx);
    }

    // Start a sex change when the group has no female.
    if (!females.length && !trans.length && ranked.length >= 2) {
      const top = ranked.find((c) => c.reproRole === 'male' && isMature(c, sp, hour) && c.stats.health >= 40);
      // A male tending eggs finishes the job first; the change begins once the brood is gone.
      if (top && top.repro.stage !== 'guarding') beginSexChange(state, tank, sp, top, ranked, hour, ctx);
    }

    // The breeding pair.
    if (females.length === 1) pairLoop(env, females[0], ranked);
    for (const c of ranked) {
      if (c.reproRole !== 'female' && c.repro.stage === 'idle' && c.repro.partnerId && !ranked.some((x) => x.id === c.repro.partnerId)) c.repro.partnerId = undefined;
    }
  },

  check(cc) {
    const { state, tank, sp, male, female, hour } = cc;
    if (!tank) return;
    const minT = sp.breeding.conditions.minTempC;
    if (minT !== undefined && tank.water.tempC < minT - 0.25) {
      cc.reasons.push(`The water is ${fmtTemp(tank.water.tempC)} — clownfish spawn at ${minT} °C or warmer.`);
      cc.steps.push(`Nudge the heater up to about ${minT + 1} °C.`);
    }
    if (!hasNestSite(tank, habitatOf(state, tank))) {
      cc.reasons.push('There is no flat rock, tile or host anemone for a nest site.');
      cc.steps.push('Add a flat rock (or a host anemone) near their favourite spot — they clean it before laying.');
    }
    const paired = female.repro.partnerId === male.id && male.repro.partnerId === female.id;
    if (!paired && male.tankId === female.tankId) {
      cc.reasons.push(`${female.name} and ${male.name} haven’t formed a pair yet.`);
      cc.steps.push('Keep them together — the dominant female pairs with the top-ranked male.');
    } else if (paired && (female.repro.bond ?? 0) < BOND_DAYS) {
      cc.reasons.push(`They are still bonding (${Math.floor(female.repro.bond ?? 0)}/${BOND_DAYS} days).`);
      cc.steps.push('Give the new pair a couple of days together.');
    }
    void hour;
  },

  start(state, male, female, tank, hour) {
    pairUp(male, female);
    return `${female.name} and ${male.name} share ${tank.name} now — watch the hierarchy settle and the pair bond form.`;
  },

  force(state, male, female, tank, hour) {
    if (female.reproRole !== 'female') {
      female.reproRole = 'female';
      female.sex = 'female';
      addHistory(female, 'sex_change', 'Became the dominant female (dev).', hour);
    }
    if (male.reproRole !== 'male') male.reproRole = 'male';
    if (male.sex === 'unknown') male.sex = 'male';
    pairUp(male, female);
    male.repro.bond = female.repro.bond = Math.max(BOND_DAYS, female.repro.bond ?? 0);
    const nest = pickSite(tank, 'host_rock', `${female.id}:nest`).anchor;
    female.repro.nestAnchor = male.repro.nestAnchor = nest;
    setStage(female, 'nest_preparing', hour, hour + 0.5);
    setStage(male, 'nest_preparing', hour, hour + 0.5);
    female.repro.nestProgress = male.repro.nestProgress = 0.9;
    return `${female.name} and ${male.name} are preparing a nest site.`;
  },

  status(state, c, sp, hour) {
    const r = c.repro;
    if (r.stage === 'transitioning_female') return { label: 'Becoming female', detail: `The dominant fish of the group — complete in ${approxDuration((r.stageEndsHour ?? hour) - hour)}`, progress: r.progress };
    if (r.stage === 'nest_preparing') {
      const p = r.partnerId ? state.creatures[r.partnerId] : undefined;
      return { label: 'Preparing a nest site', detail: p ? `Cleaning a rock with ${p.name}` : undefined, progress: r.progress };
    }
    if (r.stage === 'idle' || r.stage === 'conditioning') {
      const p = r.partnerId ? state.creatures[r.partnerId] : undefined;
      const together = !!p && isAlive(p) && p.tankId === c.tankId;
      if (c.reproRole === 'female' || together || (r.rank ?? 0) > 0) {
        const role = c.reproRole === 'female' ? 'Dominant female' : together ? 'Breeding male' : `Rank ${(r.rank ?? 0) + 1} in the group`;
        const bond = r.bond ?? 0;
        if (together && bond < BOND_DAYS) return { label: role, detail: `Bonding with ${p!.name}`, progress: bond / BOND_DAYS };
        return { label: role, detail: together ? `Paired with ${p!.name}` : isMature(c, sp, hour) ? 'Waiting for a partner' : 'Still growing' };
      }
    }
    return null;
  },
};

function beginSexChange(state: GameState, tank: Tank, sp: SpeciesDefinition, top: Creature, ranked: Creature[], hour: number, ctx: SimContext): void {
  top.reproRole = 'transitioning_female';
  setStage(top, 'transitioning_female', hour, hour + SEX_CHANGE_H);
  const former = top.repro.partnerId ? state.creatures[top.repro.partnerId] : undefined;
  const formerFemale = former && former.reproRole === 'female' && (former.tankId !== tank.id || !isAlive(former)) ? former : undefined;
  addHistory(top, 'milestone', 'Became the dominant fish of the group and began changing sex.', hour);
  const text = formerFemale
    ? `With ${formerFemale.name} gone, ${top.name} is now the largest and boldest clownfish — and is beginning to change from male to female.`
    : `${top.name} is growing larger and bolder than the others — the dominant clownfish is beginning to change from male to female.`;
  say(state, ctx, { kind: 'breeding', text, tankId: tank.id, creatureId: top.id, toast: true });
  void sp;
  void ranked;
}

function completeSexChange(state: GameState, tank: Tank, sp: SpeciesDefinition, t: Creature, ranked: Creature[], hour: number, ctx: SimContext): void {
  t.reproRole = 'female';
  t.sex = 'female';
  setStage(t, 'idle', hour);
  const partner = ranked.find((c) => c !== t && c.reproRole === 'male' && isMature(c, sp, hour)) ?? ranked.find((c) => c !== t && c.reproRole !== 'female');
  addHistory(t, 'sex_change', partner ? `Became the dominant female — ${partner.name} is her male partner.` : 'Became the dominant female.', hour);
  if (partner) {
    pairUp(t, partner);
    t.repro.bond = 0;
    partner.repro.bond = 0;
    addHistory(partner, 'milestone', `Became ${t.name}’s male partner.`, hour);
  }
  bumpCounter(state, 'sexChanges');
  addMastery(state, 'breeding', 15);
  say(state, ctx, {
    kind: 'breeding',
    text: partner ? `${t.name} has become the dominant female — ${partner.name} is her male partner.` : `${t.name} has become a female.`,
    tankId: tank.id,
    creatureId: t.id,
    toast: true,
  });
}

function fight(state: GameState, tank: Tank, females: Creature[], hour: number, dt: number, ctx: SimContext): void {
  const [a, b] = females;
  for (const [f, w] of [
    [a, 1],
    [b, 1.6],
  ] as const) {
    hurt(f, 5 * w * dt, 0.35 * w * dt, 1.2 * w * dt, 'fighting', 20);
  }
  if (throttleTank(tank, `clown_fight_${a.speciesId}`, hour, 12)) {
    say(state, ctx, {
      kind: 'danger',
      text: `${a.name} and ${b.name} are both established females and are fighting for dominance. A female clownfish can’t change back — move one of them to another tank.`,
      tankId: tank.id,
      creatureId: b.id,
      toast: true,
    });
  }
}

function pairLoop(env: StepEnv, f: Creature, ranked: Creature[]): void {
  const { state, tank, species: sp, hour, dt, ctx } = env;
  const b = sp.breeding;
  const topMale = ranked.find((c) => c !== f && c.reproRole === 'male' && isMature(c, sp, hour));
  let m = f.repro.partnerId ? ranked.find((c) => c.id === f.repro.partnerId && c.reproRole === 'male') : undefined;
  if (!m && topMale) {
    pairUp(f, topMale);
    f.repro.bond = 0;
    topMale.repro.bond = 0;
    m = topMale;
    addHistory(topMale, 'milestone', `Paired with ${f.name}.`, hour);
    say(state, ctx, { kind: 'breeding', text: `${f.name} has accepted ${topMale.name} as her partner — they’re sticking close together now.`, tankId: tank.id, creatureId: f.id });
  }
  if (!m) {
    if (f.repro.stage === 'nest_preparing' || f.repro.stage === 'spawning') setStage(f, 'idle', hour);
    return;
  }
  if (m.repro.partnerId !== f.id) m.repro.partnerId = f.id;

  // Bond grows while together.
  const bonded = (f.repro.bond ?? 0) >= BOND_DAYS;
  f.repro.bond = Math.min(30, (f.repro.bond ?? 0) + dt / 24);
  m.repro.bond = f.repro.bond;
  if (!bonded && f.repro.bond >= BOND_DAYS) {
    addHistory(f, 'milestone', `Formed a bonded pair with ${m.name}.`, hour);
    addHistory(m, 'milestone', `Formed a bonded pair with ${f.name}.`, hour);
  }

  const warm = b.conditions.minTempC === undefined || tank.water.tempC >= b.conditions.minTempC - 0.25;
  switch (f.repro.stage) {
    case 'idle':
    case 'conditioning': {
      if ((f.repro.bond ?? 0) < BOND_DAYS || !warm || isResting(m, hour) || m.repro.stage === 'guarding') break;
      if (!isReady(f) || !isReady(m)) {
        if (f.repro.stage === 'idle') setStage(f, 'conditioning', hour);
        break;
      }
      const hab = habitatOf(state, tank);
      if (!hasNestSite(tank, hab)) {
        if (throttleTankBackoff(tank, 'clown_nest', hour, 48)) say(state, ctx, { kind: 'tip', text: `${f.name} and ${m.name} are ready to spawn but have nowhere to lay — add a flat rock or tile near their home.`, tankId: tank.id });
        break;
      }
      const nest = pickSite(tank, hab.hasHost ? 'host_rock' : 'rock', `${f.id}:nest`).anchor;
      f.repro.nestAnchor = m.repro.nestAnchor = nest;
      const end = hour + ctx.rng.range(PREP_H[0], PREP_H[1]);
      setStage(f, 'nest_preparing', hour, end);
      setStage(m, 'nest_preparing', hour, end);
      say(state, ctx, { kind: 'breeding', text: `${f.name} and ${m.name} are nipping and cleaning a patch of rock ${hab.hasHost ? 'beside their anemone' : 'near their home'} — a sure sign spawning is near.`, tankId: tank.id, creatureId: f.id, toast: true });
      break;
    }
    case 'nest_preparing': {
      if (m.repro.stage !== 'nest_preparing') {
        setStage(f, 'idle', hour);
        break;
      }
      const p = clamp((hour - f.repro.stageSinceHour) / Math.max(0.5, (f.repro.stageEndsHour ?? hour) - f.repro.stageSinceHour), 0, 1);
      f.repro.nestProgress = m.repro.nestProgress = p;
      if (stageDue(f, hour) && isEvening(tank, hour)) {
        setStage(f, 'spawning', hour, hour + SPAWN_H);
        setStage(m, 'spawning', hour, hour + SPAWN_H);
        say(state, ctx, { kind: 'breeding', text: `${f.name}’s egg tube is showing — she’s making slow passes over the clean rock with ${m.name} right behind her.`, tankId: tank.id, creatureId: f.id });
      }
      break;
    }
    case 'spawning': {
      if (m.repro.stage !== 'spawning') {
        setStage(f, 'idle', hour);
        break;
      }
      if (stageDue(f, hour)) spawn(state, tank, sp, m, f, hour, ctx);
      break;
    }
  }
  // Male without a live clutch stops guarding.
  if (m.repro.stage === 'guarding') {
    const cl = m.repro.clutchId ? state.clutches[m.repro.clutchId] : undefined;
    if (!cl || cl.tankId !== m.tankId || cl.guardedById !== m.id || cl.stage !== 'eggs') {
      if (cl && cl.guardedById === m.id) cl.guardedById = undefined;
      startResting(m, hour, b.cooldownDays * 24 * 0.5);
    }
  }
  if ((m.repro.stage === 'nest_preparing' || m.repro.stage === 'spawning') && f.repro.stage !== m.repro.stage) setStage(m, 'idle', hour);
}

function spawn(state: GameState, tank: Tank, sp: SpeciesDefinition, m: Creature, f: Creature, hour: number, ctx: SimContext): void {
  const count = Math.round(sp.breeding.clutchSize.min + (sp.breeding.clutchSize.max - sp.breeding.clutchSize.min) * clamp(0.2 + 0.5 * ((f.genome?.potentials?.fertility ?? 50) / 100) + 0.3 * ctx.rng.next(), 0, 1) * clamp(0.6 + 0.2 * f.repro.totalClutches, 0.6, 1));
  const anchor = f.repro.nestAnchor ?? pickSite(tank, 'rock', `${f.id}:nest`).anchor;
  const extra = pickSite(tank, 'rock', `${f.id}:${hour.toFixed(1)}`, 6).extra.map((v) => ({ x: anchor.x + (v.x - anchor.x) * 0.3, y: anchor.y, z: anchor.z + (v.z - anchor.z) * 0.3 }));
  const cl = createClutch(state, {
    sp,
    tank,
    mother: f,
    father: m,
    hour,
    stage: 'eggs',
    count,
    visual: 'eggs_adhesive',
    nextStageHour: hour + sp.breeding.incubationHours,
    anchor,
    extraAnchors: extra,
    guardedById: m.id,
    notes: 'Adhesive orange eggs on a cleaned rock.',
  });
  setStage(m, 'guarding', hour);
  m.repro.clutchId = cl.id;
  startResting(f, hour, sp.breeding.cooldownDays * 24);
  const nursery = tank.purpose === 'nursery';
  say(state, ctx, {
    kind: 'breeding',
    text: `${f.name} laid ${plural(count, 'bright orange egg')} on the rock — ${m.name} is fanning and mouthing them.${nursery ? '' : ` They’ll hatch after lights-out in ${approxDuration(sp.breeding.incubationHours)}; move them to a nursery tank before then or the larvae will be lost.`}`,
    tankId: tank.id,
    creatureId: f.id,
    toast: true,
  });
}
