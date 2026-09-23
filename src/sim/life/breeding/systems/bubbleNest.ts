/**
 * bubble_nest — Betta splendens (and other nest-building anabantoids). OWNER: lane "breeding".
 *
 * Male:   conditioning ─(ready, warm, calm surface)─▶ nest_building (nestProgress 0..1) ─▶ nest_ready
 *         ─(conditioned female introduced via Start breeding)─▶ courting (3–6 h) ─▶ spawning (the embrace, 1.5–3 h)
 *         ─▶ guarding (catches falling eggs, tends larvae in the nest) ─▶ resting
 * Female: conditioning ─▶ gravid (ripe, vertical bars) ─▶ courting ─▶ spawning ─▶ spent ─(moved out)─▶ resting
 *
 * EDGE CASE: a female left with the male outside courtship (and especially once spent) is chased and bitten —
 * `repro.harassment` rises, with escalating warnings, stress and injury until she is separated.
 * Once the fry are free-swimming the male must be removed too, or he starts eating them (clutch.ts).
 */
import type { Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import type { BreedingModule, StepEnv } from '../types';
import { createClutch } from '../clutch';
import {
  SURFACE_CALM_MAX,
  addHistory,
  clamp01,
  fmtTemp,
  habitatOf,
  hurt,
  isMature,
  isReady,
  pairUp,
  pickSite,
  plural,
  rollClutchSize,
  roleOf,
  say,
  setStage,
  stageDue,
  startResting,
  surfaceAgitation,
  throttle,
  tickTimers,
} from '../common';

const NEST_BUILD_H = 30;
const COURT_H: [number, number] = [3, 6];
const SPAWN_H: [number, number] = [1.5, 3];
/** Harassment gained per hour by a female sharing the male's tank outside courtship (before cover). */
const HARASS_RATE = 0.05;
const HARASS_WARN = [0.15, 0.4, 0.7, 0.95];

export const bubbleNestModule: BreedingModule = {
  id: 'bubble_nest',
  breedable: true,
  introducedByKeeper: true,
  plan: {
    phases: [
      { stage: 'larvae', frac: 0.25, foods: ['infusoria'], natural: ['infusoria'], visual: 'keep', label: 'larvae' },
      { stage: 'fry', frac: 0.75, foods: ['baby_brine', 'infusoria', 'daphnia'], natural: ['infusoria'], visual: 'fry_cloud', label: 'fry' },
    ],
    eggTags: ['eggs'],
    youngTags: ['fry'],
    parentsEatEggs: true,
    guardEggs: true,
    guardianEatsFry: true,
    guardYoung: true,
    planktonic: false,
    hatchAtNight: false,
    larvaeViable: true,
    starveSeverity: 1.1,
    coverShelter: 0.35,
    yolkFrac: 0.25,
  },

  step(env: StepEnv) {
    const { state, tank, species: sp, members, hour, dt, ctx, info } = env;
    const b = sp.breeding;
    const adults = members.filter((c) => isMature(c, sp, hour));
    for (const c of adults) tickTimers(c, hour);
    const males = adults.filter((c) => roleOf(c, sp) === 'male');
    const females = adults.filter((c) => roleOf(c, sp) === 'female');
    const warm = b.conditions.minTempC === undefined || tank.water.tempC >= b.conditions.minTempC - 0.5;
    const agitation = info.agitation();
    const calm = !b.conditions.needsSurfaceCalm || agitation <= SURFACE_CALM_MAX;

    for (const m of males) {
      const r = m.repro;
      switch (r.stage) {
        case 'idle':
        case 'conditioning': {
          if (warm && m.stats.breedingReadiness >= 45) {
            setStage(m, 'nest_building', hour);
            r.nestProgress = r.nestProgress ?? 0;
            r.nestAnchor = pickSite(tank, 'surface', `${m.id}:nest`).anchor;
          } else if (r.stage === 'idle') setStage(m, 'conditioning', hour);
          decayNest(m, dt, 0.02);
          break;
        }
        case 'nest_building': {
          if (m.stats.breedingReadiness < 20 || !warm) {
            setStage(m, 'conditioning', hour);
            break;
          }
          if (!r.nestAnchor) r.nestAnchor = pickSite(tank, 'surface', `${m.id}:nest`).anchor;
          const builder = m.personality?.includes('nest_builder') ? 1.8 : 1;
          if (calm) r.nestProgress = clamp01((r.nestProgress ?? 0) + ((dt / NEST_BUILD_H) * builder * (0.5 + m.stats.breedingReadiness / 200)));
          else {
            decayNest(m, dt, 0.06);
            if (throttle(m, 'nest_choppy', hour, 24)) {
              say(state, ctx, { kind: 'tip', text: `The surface of ${tank.name} is too choppy for ${m.name}’s bubble nest — turn the filter flow down or remove the airstone.`, tankId: tank.id, creatureId: m.id });
            }
          }
          r.progress = r.nestProgress;
          if ((r.nestProgress ?? 0) >= 1) {
            setStage(m, 'nest_ready', hour);
            r.progress = 1;
            addHistory(m, 'milestone', 'Built a bubble nest.', hour);
            if (throttle(m, 'nest_done', hour, 72)) {
              say(state, ctx, { kind: 'breeding', text: `${m.name} has built a shimmering bubble nest beneath the leaves — he’s ready for a conditioned female.`, tankId: tank.id, creatureId: m.id, toast: true });
            }
          }
          break;
        }
        case 'courting':
        case 'spawning': {
          const f = females.find((x) => x.id === r.partnerId);
          if (!f || f.repro.stage !== r.stage) setStage(m, 'nest_ready', hour);
          break;
        }
        case 'nest_ready':
          if (!calm) decayNest(m, dt, 0.04);
          if ((r.nestProgress ?? 0) < 0.6) setStage(m, 'nest_building', hour);
          break;
        case 'guarding': {
          const cl = r.clutchId ? state.clutches[r.clutchId] : undefined;
          if (!cl || cl.tankId !== m.tankId || cl.guardedById !== m.id) {
            if (cl && cl.guardedById === m.id) cl.guardedById = undefined;
            startResting(m, hour, b.cooldownDays * 24 * 0.6);
            r.nestProgress = 0.2;
          }
          break;
        }
      }
    }

    // Courtship & spawning, driven by the female.
    for (const f of females) {
      const m = f.repro.partnerId ? males.find((x) => x.id === f.repro.partnerId) : undefined;
      switch (f.repro.stage) {
        case 'idle':
        case 'conditioning':
          if (isReady(f) && warm) setStage(f, 'gravid', hour);
          else if (f.repro.stage === 'idle') setStage(f, 'conditioning', hour);
          break;
        case 'gravid':
          if (f.stats.breedingReadiness < 40) setStage(f, 'conditioning', hour);
          break;
        case 'courting':
          if (!m || m.repro.stage !== 'courting') {
            setStage(f, isReady(f) ? 'gravid' : 'conditioning', hour);
            break;
          }
          if (f.stats.breedingReadiness < 35) {
            // she isn't ready — courtship turns into a chase
            setStage(f, 'conditioning', hour);
            setStage(m, 'nest_ready', hour);
            say(state, ctx, { kind: 'warning', text: `${f.name} isn’t ready to spawn, and ${m.name}’s courtship is turning into a chase. Separate them and condition her first.`, tankId: tank.id, creatureId: f.id, toast: true });
            break;
          }
          if (stageDue(f, hour)) {
            const end = hour + ctx.rng.range(SPAWN_H[0], SPAWN_H[1]);
            setStage(f, 'spawning', hour, end);
            setStage(m, 'spawning', hour, end);
            say(state, ctx, { kind: 'breeding', text: `${m.name} wraps around ${f.name} beneath the nest — the spawning embrace has begun.`, tankId: tank.id, creatureId: m.id });
          }
          break;
        case 'spawning':
          if (!m || m.repro.stage !== 'spawning') {
            setStage(f, 'conditioning', hour);
            break;
          }
          if (stageDue(f, hour)) spawn(state, tank, sp, m, f, hour, ctx);
          break;
        case 'spent':
          if (!males.length) {
            startResting(f, hour, b.cooldownDays * 24);
            addHistory(f, 'note', 'Recovering after spawning.', hour);
          }
          break;
      }
    }

    // New courtship: a ready nest + a gravid female in the same tank.
    for (const m of males) {
      if (m.repro.stage !== 'nest_ready' || !isReady(m)) continue;
      const f = females.find((x) => x.repro.stage === 'gravid' && (!x.repro.partnerId || x.repro.partnerId === m.id)) ?? females.find((x) => x.repro.stage === 'gravid');
      if (!f) continue;
      pairUp(m, f);
      const end = hour + ctx.rng.range(COURT_H[0], COURT_H[1]);
      setStage(m, 'courting', hour, end);
      setStage(f, 'courting', hour, end);
      say(state, ctx, { kind: 'breeding', text: `${m.name} flares his fins and dances beneath his nest, leading ${f.name} to it. She’s showing her vertical breeding bars.`, tankId: tank.id, creatureId: m.id, toast: true });
    }

    harassment(state, tank, sp, males, females, hour, dt, ctx);
  },

  check(cc) {
    const { male, female, sp, tank, hour, state } = cc;
    const mt = male.tankId ? state.tanks[male.tankId] : null;
    const minT = sp.breeding.conditions.minTempC;
    if (mt && minT !== undefined && mt.water.tempC < minT - 0.5) {
      const r = `${mt.name} is ${fmtTemp(mt.water.tempC)} — bettas spawn in warm water (${minT} °C or more).`;
      cc.reasons.push(r);
      cc.startBlockers.push(r);
      cc.steps.push(`Raise the heater in ${mt.name} to about ${minT + 1} °C.`);
    }
    const nest = male.repro.stage === 'nest_ready' || male.repro.stage === 'courting' || male.repro.stage === 'spawning';
    if (!nest) {
      const calm = mt ? surfaceAgitation(mt, habitatOf(state, mt).cover) <= SURFACE_CALM_MAX : true;
      const r = male.repro.stage === 'nest_building' ? `${male.name} is still building his bubble nest (${Math.round((male.repro.nestProgress ?? 0) * 100)}%).` : `${male.name} hasn’t built a bubble nest yet.`;
      cc.reasons.push(r);
      cc.startBlockers.push(r);
      cc.steps.push(calm ? 'The male needs a bubble nest first — keep him warm, well fed with live or frozen foods and give him time.' : 'The male needs a bubble nest first — make sure the surface is calm (lower the filter flow, remove airstones).');
    }
    if (female.stats.breedingReadiness < 55 && female.repro.stage !== 'courting' && female.repro.stage !== 'spawning') {
      const r = `${female.name} isn’t conditioned yet (readiness ${Math.round(female.stats.breedingReadiness)}%) — an unready female gets chased instead of courted.`;
      cc.reasons.push(r);
      cc.startBlockers.push(r);
      cc.steps.push('Condition her with bloodworm, brine shrimp or daphnia until she looks plump and shows vertical bars.');
    }
    if (tank && habitatOf(state, tank).cover < 0.25) cc.steps.push('Add plants or floating cover so the female has somewhere to hide from the male.');
    if (male.tankId && female.tankId === male.tankId && !cc.forStart && female.repro.stage !== 'courting' && female.repro.stage !== 'spawning') {
      cc.steps.push(`Don’t leave ${female.name} in with ${male.name} for long outside spawning — he will attack her.`);
    }
    void hour;
  },

  start(state, male, female, tank, hour) {
    pairUp(male, female);
    const end = hour + 3 + (female.stats.breedingReadiness >= 80 ? 0 : 2);
    setStage(male, 'courting', hour, end);
    setStage(female, 'courting', hour, end);
    female.repro.harassment = Math.min(female.repro.harassment ?? 0, 0.05);
    return `${female.name} has been floated into ${tank.name}. ${male.name} is displaying beneath his nest — remove her as soon as they have spawned.`;
  },

  force(state, male, female, tank, hour) {
    male.repro.nestProgress = 1;
    male.repro.nestAnchor = male.repro.nestAnchor ?? pickSite(tank, 'surface', `${male.id}:nest`).anchor;
    pairUp(male, female);
    setStage(male, 'courting', hour, hour + 0.5);
    setStage(female, 'courting', hour, hour + 0.5);
    return `${male.name} has a finished nest and is courting ${female.name}.`;
  },

  onPhase(state, cl, tank, sp, hour, ctx) {
    const male = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
    if (cl.stage === 'larvae') {
      say(state, ctx, { kind: 'breeding', text: `The eggs hatched — ${plural(cl.count, 'tiny larva', 'tiny larvae')} hang tail-down in the bubble nest${male ? ` while ${male.name} spits strays back into place` : ''}.`, tankId: tank.id, creatureId: male?.id, toast: true });
      return true;
    }
    if (cl.stage === 'fry') {
      const extra = male && male.tankId === tank.id ? ` Move ${male.name} out now — his job is done and he may start eating them.` : '';
      say(state, ctx, { kind: 'breeding', text: `${plural(cl.count, 'fry', 'fry')} are free-swimming! Feed infusoria, then baby brine shrimp.${extra}`, tankId: tank.id, creatureId: male?.id, toast: true });
      return true;
    }
    return false;
  },

  status(state, c, sp, hour) {
    if (roleOf(c, sp) === 'female' && (c.repro.harassment ?? 0) > 0.15 && c.repro.stage !== 'courting' && c.repro.stage !== 'spawning') {
      const h = c.repro.harassment ?? 0;
      return { label: h > 0.4 ? 'Injured by the male — separate now!' : 'Being chased by the male', detail: 'Move her to her own tank to recover', progress: h };
    }
    // lane:qa-play — she stays gravid down to readiness 40, but pairing needs 55 (see the pairing check above): say so
    if (c.repro.stage === 'gravid' && c.stats.breedingReadiness < 55) return { label: 'Ripe with eggs', detail: 'Showing breeding bars, but fading — feed her well before pairing' };
    if (c.repro.stage === 'gravid') return { label: 'Ripe with eggs', detail: 'Showing vertical breeding bars — ready for a male with a nest' };
    return null;
  },
};

function decayNest(m: Creature, dt: number, rate: number): void {
  if (m.repro.nestProgress === undefined) return;
  m.repro.nestProgress = clamp01(m.repro.nestProgress - rate * dt);
}

function spawn(state: GameState, tank: Tank, sp: SpeciesDefinition, m: Creature, f: Creature, hour: number, ctx: SimContext): void {
  const count = rollClutchSize(ctx.rng, sp, f);
  const anchor = m.repro.nestAnchor ?? pickSite(tank, 'surface', `${m.id}:nest`).anchor;
  const cl = createClutch(state, {
    sp,
    tank,
    mother: f,
    father: m,
    hour,
    stage: 'eggs',
    count,
    visual: 'bubble_nest',
    nextStageHour: hour + sp.breeding.incubationHours,
    anchor,
    guardedById: m.id,
    notes: 'Eggs carried up into the bubble nest.',
  });
  setStage(m, 'guarding', hour);
  m.repro.clutchId = cl.id;
  setStage(f, 'spent', hour);
  f.repro.harassment = 0;
  f.repro.warnLevel = 0;
  say(state, ctx, {
    kind: 'breeding',
    text: `${m.name} and ${f.name} spawned! ${m.name} is catching ${plural(count, 'egg')} and spitting them into the nest. Move ${f.name} out now — he will soon turn on her.`,
    tankId: tank.id,
    creatureId: m.id,
    toast: true,
  });
}

/** Female kept with a male outside courtship: chasing, torn fins, escalating warnings. */
function harassment(state: GameState, tank: Tank, sp: SpeciesDefinition, males: Creature[], females: Creature[], hour: number, dt: number, ctx: SimContext): void {
  const cover = habitatOf(state, tank).cover;
  const aggressor = males.find((m) => m.repro.stage === 'guarding') ?? males[0];
  for (const f of females) {
    const r = f.repro;
    const courting = r.stage === 'courting' || r.stage === 'spawning';
    if (!aggressor || courting) {
      r.harassment = Math.max(0, (r.harassment ?? 0) - 0.05 * dt);
      if ((r.harassment ?? 0) < 0.1) r.warnLevel = 0;
      continue;
    }
    const mult = (r.stage === 'spent' ? 1.5 : 1) * (aggressor.repro.stage === 'guarding' ? 1.25 : 1);
    r.harassment = clamp01((r.harassment ?? 0) + HARASS_RATE * mult * (1 - 0.6 * cover) * dt);
    const h = r.harassment;
    hurt(f, 6 * h * dt, h > 0.4 ? 1.2 * (h - 0.3) * dt : 0, h > 0.3 ? 1.5 * h * dt : 0, 'harassment');
    const level = HARASS_WARN.filter((t) => h >= t).length;
    if (level > (r.warnLevel ?? 0)) {
      r.warnLevel = level;
      const m = aggressor;
      const texts = [
        `${m.name} is chasing ${f.name} around ${tank.name}. ${sp.commonName.includes('Betta') ? 'Bettas only share a tank briefly for spawning' : 'Bubble-nesting males turn on females after spawning'} — separate them.`,
        `${f.name}’s fins are torn — ${m.name} is attacking her. Separate them now!`,
        `${f.name} is badly injured and hiding at the surface. Move her to a recovery tank immediately.`,
        `${f.name} is in critical condition from ${m.name}’s attacks.`,
      ];
      if (level >= 2) hurt(f, 15, 6, 10, 'harassment');
      addHistory(f, level >= 2 ? 'illness' : 'note', level >= 2 ? `Injured by ${m.name} after being left in his tank.` : `Chased by ${m.name}.`, hour);
      say(state, ctx, { kind: level >= 2 ? 'danger' : 'warning', text: texts[level - 1], tankId: tank.id, creatureId: f.id, toast: true });
    }
  }
  void sp;
}

