/**
 * seahorse_pouch — Hippocampus (male pregnancy). OWNER: lane "breeding".
 *
 *   bonding: a mature male + female greet each other every morning (brighten, circle a hitching post);
 *            `repro.bond` counts greeting days → a pair after 2 mornings (partnerId)
 *   courting (dawn, 3–5 h): the courtship dance — tails entwined, pointing, rising together
 *   ─▶ egg transfer: female ─▶ resting ; male ─▶ pregnant (carryingUntilHour = now + incubationHours,
 *      clutch stage 'in_pouch', visual 'pouch'; renderers swell his belly from `repro.progress`)
 *   ─▶ birth (at night / first light) ─▶ clutch 'fry' (fry_cloud) ─▶ male resting (short) ─▶ re-mates
 * Fry are planktonic: they need a nursery and live copepods / baby brine, and die quickly without them.
 */
import type { Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import type { BreedingModule, StepEnv } from '../types';
import { createClutch, releaseCarried } from '../clutch';
import { addMastery, bumpCounter } from '@/sim/facility';
import {
  addHistory,
  approxDuration,
  dayIndex,
  fmtTemp,
  inWindow,
  isDawn,
  isMature,
  isNight,
  isNurseryFor,
  isReady,
  isResting,
  pairUp,
  plural,
  rollClutchSize,
  roleOf,
  say,
  setStage,
  stageDue,
  startResting,
  tickTimers,
} from '../common';

const BOND_DAYS = 2;
const COURT_H: [number, number] = [3, 5];

const canBirth = (tank: Tank, hour: number) => isNight(tank, hour) || inWindow(hour, tank.lighting.onHour, 1.5);

export const seahorseModule: BreedingModule = {
  id: 'seahorse_pouch',
  breedable: true,
  plan: {
    phases: [{ stage: 'fry', frac: 1, foods: ['copepod_live', 'baby_brine'], natural: ['copepods'], visual: 'fry_cloud', label: 'fry' }],
    eggTags: ['eggs'],
    youngTags: ['fry'],
    parentsEatEggs: false,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: true,
    hatchAtNight: false,
    larvaeViable: true,
    starveSeverity: 1.7,
    coverShelter: 0.1,
    yolkFrac: 0.02,
  },

  step(env: StepEnv) {
    const { state, tank, species: sp, members, hour, ctx } = env;
    const b = sp.breeding;
    const adults = members.filter((c) => isMature(c, sp, hour));
    for (const c of adults) tickTimers(c, hour);
    const males = adults.filter((c) => roleOf(c, sp) === 'male');
    const females = adults.filter((c) => roleOf(c, sp) === 'female');
    const byId = new Map(adults.map((c) => [c.id, c] as const));

    // Pregnancy & birth.
    for (const m of males) {
      if (m.repro.stage !== 'pregnant') continue;
      const cl = m.repro.clutchId ? state.clutches[m.repro.clutchId] : undefined;
      if (!cl || cl.stage !== 'in_pouch' || cl.guardedById !== m.id) {
        startResting(m, hour, b.cooldownDays * 24);
        continue;
      }
      if (m.repro.carryingUntilHour !== undefined && hour >= m.repro.carryingUntilHour && canBirth(tank, hour)) giveBirth(state, tank, sp, m, cl.id, hour, ctx, seahorseModule);
    }

    // Pairs in courtship.
    for (const f of females) {
      if (f.repro.stage !== 'courting') continue;
      const m = f.repro.partnerId ? byId.get(f.repro.partnerId) : undefined;
      if (!m || m.repro.stage !== 'courting') {
        setStage(f, 'bonding', hour);
        continue;
      }
      if (stageDue(f, hour)) transferEggs(state, tank, sp, m, f, hour, ctx);
    }
    for (const m of males) {
      if (m.repro.stage !== 'courting') continue;
      const f = m.repro.partnerId ? byId.get(m.repro.partnerId) : undefined;
      if (!f || f.repro.stage !== 'courting') setStage(m, 'bonding', hour);
    }

    // Morning greetings build the pair bond.
    if (isDawn(tank, hour)) {
      const day = dayIndex(hour);
      const freeMales = males.filter((m) => m.stats.health >= 45);
      for (const f of females) {
        if (f.stats.health < 45) continue;
        let m = f.repro.partnerId ? freeMales.find((x) => x.id === f.repro.partnerId) : undefined;
        if (!m) m = freeMales.find((x) => !x.repro.partnerId || !byId.has(x.repro.partnerId) || x.repro.partnerId === f.id);
        if (!m || f.repro.lastGreetingDay === day) continue;
        if (f.repro.partnerId !== m.id) {
          pairUp(f, m);
          f.repro.bond = 0;
          m.repro.bond = 0;
        }
        f.repro.lastGreetingDay = m.repro.lastGreetingDay = day;
        const before = f.repro.bond ?? 0;
        f.repro.bond = m.repro.bond = Math.min(30, before + 1);
        for (const c of [f, m]) if (c.repro.stage === 'idle' || c.repro.stage === 'conditioning') setStage(c, 'bonding', hour);
        if (before < BOND_DAYS && f.repro.bond >= BOND_DAYS) {
          addHistory(f, 'milestone', `Formed a pair bond with ${m.name}.`, hour);
          addHistory(m, 'milestone', `Formed a pair bond with ${f.name}.`, hour);
          say(state, ctx, { kind: 'breeding', text: `${m.name} and ${f.name} are a bonded pair — they greet each other every morning, brightening and circling their hitching post.`, tankId: tank.id, creatureId: m.id, toast: true });
        } else if (before === 0) {
          say(state, ctx, { kind: 'breeding', text: `${m.name} and ${f.name} greeted each other at first light, brightening in colour and circling together.`, tankId: tank.id, creatureId: m.id });
        }
      }

      // The courtship dance.
      const minT = b.conditions.minTempC;
      const warm = minT === undefined || tank.water.tempC >= minT - 0.25;
      for (const f of females) {
        const m = f.repro.partnerId ? byId.get(f.repro.partnerId) : undefined;
        if (!m || !warm) continue;
        if ((f.repro.bond ?? 0) < BOND_DAYS) continue;
        if (f.repro.stage !== 'bonding' || m.repro.stage !== 'bonding') continue;
        if (!isReady(f) || !isReady(m) || isResting(f, hour) || isResting(m, hour)) continue;
        const end = hour + ctx.rng.range(COURT_H[0], COURT_H[1]);
        setStage(f, 'courting', hour, end);
        setStage(m, 'courting', hour, end);
        say(state, ctx, { kind: 'breeding', text: `${m.name} and ${f.name} are dancing at dawn — tails entwined, pointing their snouts upward and rising together through the water.`, tankId: tank.id, creatureId: m.id, toast: true });
      }
    }

    // Unpaired adults drift back to idle; bonds fade if a partner is gone.
    for (const c of adults) {
      const p = c.repro.partnerId ? byId.get(c.repro.partnerId) : undefined;
      if (!p && c.repro.stage === 'bonding') setStage(c, 'idle', hour);
    }
  },

  check(cc) {
    const { tank, sp, male, female, hour } = cc;
    if (!tank) return;
    const minT = sp.breeding.conditions.minTempC;
    if (minT !== undefined && tank.water.tempC < minT - 0.25) {
      cc.reasons.push(`The water is ${fmtTemp(tank.water.tempC)} — seahorses breed at ${minT} °C or warmer.`);
      cc.steps.push(`Warm the tank to about ${minT + 1} °C.`);
    }
    const paired = female.repro.partnerId === male.id && male.repro.partnerId === female.id;
    const bond = paired ? female.repro.bond ?? 0 : 0;
    if (bond < BOND_DAYS && male.tankId === female.tankId) {
      cc.reasons.push(`They are still getting to know each other (${Math.floor(bond)}/${BOND_DAYS} morning greetings).`);
      cc.steps.push('Seahorses greet their partner every morning — give them a couple of days together.');
    } else if (bond >= BOND_DAYS && !isDawn(tank, hour)) {
      cc.steps.push('Courtship happens at dawn, soon after the lights come on.');
    }
  },

  start(state, male, female, tank, hour) {
    for (const c of [male, female]) if (c.repro.stage === 'idle') setStage(c, 'bonding', hour);
    if (male.repro.partnerId !== female.id) {
      pairUp(male, female);
      male.repro.bond = female.repro.bond = 0;
    }
    return `${male.name} and ${female.name} are together — watch for their morning greetings.`;
  },

  force(state, male, female, tank, hour) {
    pairUp(male, female);
    male.repro.bond = female.repro.bond = Math.max(BOND_DAYS, male.repro.bond ?? 0);
    setStage(male, 'courting', hour, hour + 0.5);
    setStage(female, 'courting', hour, hour + 0.5);
    return `${male.name} and ${female.name} are performing their courtship dance.`;
  },

  status(state, c, sp, hour) {
    const r = c.repro;
    const p = r.partnerId ? state.creatures[r.partnerId] : undefined;
    if (r.stage === 'pregnant') {
      const cl = r.clutchId ? state.clutches[r.clutchId] : undefined;
      const due = (r.carryingUntilHour ?? hour) - hour;
      return { label: due > 0 ? `Pregnant — due in ${approxDuration(due)}` : 'Pregnant — birth is imminent', detail: cl ? `Carrying about ${plural(cl.count, 'young', 'young')} in his brood pouch` : undefined, progress: r.progress };
    }
    if (r.stage === 'bonding' && p) {
      const bond = r.bond ?? 0;
      return bond >= BOND_DAYS
        ? { label: `Bonded with ${p.name}`, detail: 'Greets their partner every morning', progress: 1 }
        : { label: `Pair-bonding with ${p.name}`, detail: `Morning greetings: ${Math.floor(bond)}/${BOND_DAYS}`, progress: bond / BOND_DAYS };
    }
    if (r.stage === 'courting' && p) return { label: `Dancing with ${p.name}`, detail: 'The dawn courtship dance', progress: r.progress };
    return null;
  },
};

function transferEggs(state: GameState, tank: Tank, sp: SpeciesDefinition, m: Creature, f: Creature, hour: number, ctx: SimContext): void {
  const b = sp.breeding;
  const count = rollClutchSize(ctx.rng, sp, f);
  const due = hour + b.incubationHours;
  const cl = createClutch(state, { sp, tank, mother: f, father: m, hour, stage: 'in_pouch', count, visual: 'pouch', nextStageHour: due, guardedById: m.id, notes: 'Developing in the male’s brood pouch.' });
  setStage(m, 'pregnant', hour);
  m.repro.carryingUntilHour = due;
  m.repro.clutchId = cl.id;
  startResting(f, hour, b.cooldownDays * 24 * 1.5);
  f.repro.partnerId = m.id;
  bumpCounter(state, 'pregnancies');
  say(state, ctx, {
    kind: 'breeding',
    text: `${f.name} transferred her eggs — ${m.name} is pregnant! He’ll carry them in his brood pouch for about ${approxDuration(b.incubationHours).replace('~', '')}.`,
    tankId: tank.id,
    creatureId: m.id,
    toast: true,
  });
}

function giveBirth(state: GameState, tank: Tank, sp: SpeciesDefinition, m: Creature, clutchId: string, hour: number, ctx: SimContext, mod: BreedingModule): void {
  const cl = state.clutches[clutchId];
  if (!cl) return;
  releaseCarried(cl, tank, sp, mod, hour);
  const n = cl.count;
  startResting(m, hour, sp.breeding.cooldownDays * 24);
  addHistory(m, 'bred', `Gave birth to ${plural(n, 'fry', 'fry')}.`, hour);
  bumpCounter(state, 'seahorseBirths');
  addMastery(state, 'breeding', 20);
  const nursery = isNurseryFor(state, tank, hour);
  say(state, ctx, {
    kind: 'breeding',
    text: `${m.name} gave birth to ${plural(n, 'fry', 'fry')}!${nursery ? ' Feed them live copepods and baby brine shrimp several times a day.' : ' Move them to a nursery tank with gentle flow and live copepods — they won’t survive long in the display.'}`,
    tankId: tank.id,
    creatureId: m.id,
    toast: true,
  });
}
