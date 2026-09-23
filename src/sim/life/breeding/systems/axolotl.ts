/**
 * axolotl_spermatophore — Ambystoma mexicanum. OWNER: lane "breeding".
 *
 *   conditioning ─(cool-water "rainy season" cue + night + both ready)─▶ courting (the "waltz", 3–5 h)
 *   male: depositing (spermatophores, 2 h) ─▶ resting (cooldown/2)
 *   female: following (picks one up, 2 h) ─▶ gravid (fertilisation, 6–12 h) ─▶ laying (eggs singly on plants,
 *           12–24 h; clutch grows while she lays) ─▶ resting (cooldownDays)
 *
 * Eggs (visual 'egg_strands') are eaten by any adult axolotl in the tank unless moved to a nursery; larvae need live
 * food (baby brine / daphnia) and turn cannibal when there are more than ~5 per gallon.
 */
import type { Creature, GameState, Tank } from '@/types';
import type { BreedingModule, StepEnv } from '../types';
import { createClutch, addEggs } from '../clutch';
import {
  addHistory,
  approxDuration,
  coolCueActive,
  ensureEnv,
  fmtTemp,
  isMature,
  isNight,
  isReady,
  pairUp,
  partnerIn,
  pickSite,
  plural,
  rollClutchSize,
  roleOf,
  say,
  setStage,
  stageDue,
  startResting,
  tickTimers,
} from '../common';

const COURT_H: [number, number] = [3, 5];
const LAY_H: [number, number] = [12, 24];

export const axolotlModule: BreedingModule = {
  id: 'axolotl_spermatophore',
  breedable: true,
  plan: {
    phases: [{ stage: 'larvae', frac: 1, foods: ['baby_brine', 'daphnia', 'brine_shrimp', 'bloodworm'], natural: [], visual: 'fry_cloud', label: 'larvae' }],
    eggTags: ['eggs'],
    youngTags: ['fry', 'amphibian_larva'],
    parentsEatEggs: true,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: false,
    hatchAtNight: false,
    larvaeViable: true,
    cannibalPerGallon: 5,
    starveSeverity: 1.2,
    coverShelter: 0.3,
    yolkFrac: 0.08,
  },

  step(env: StepEnv) {
    const { state, tank, species: sp, members, hour, dt, ctx } = env;
    const b = sp.breeding;
    const adults = members.filter((c) => isMature(c, sp, hour));
    for (const c of adults) tickTimers(c, hour);
    const males = adults.filter((c) => roleOf(c, sp) === 'male');
    const females = adults.filter((c) => roleOf(c, sp) === 'female');

    // Ongoing events, driven from the female's side.
    for (const f of females) {
      const m = partnerIn(f, males);
      switch (f.repro.stage) {
        case 'courting':
          if (!m || m.repro.stage !== 'courting') {
            setStage(f, 'conditioning', hour);
            if (m) setStage(m, 'conditioning', hour);
            break;
          }
          if (stageDue(f, hour)) {
            setStage(m, 'depositing', hour, hour + 2);
            setStage(f, 'following', hour, hour + 2);
            say(state, ctx, { kind: 'breeding', text: `${m.name} is setting down little spermatophores on the sand; ${f.name} follows close behind.`, tankId: tank.id, creatureId: m.id });
          }
          break;
        case 'following':
          if (stageDue(f, hour)) {
            setStage(f, 'gravid', hour, hour + ctx.rng.range(6, 12));
            addHistory(f, 'bred', `Picked up a spermatophore from ${m?.name ?? 'her partner'}.`, hour);
            say(state, ctx, { kind: 'breeding', text: `${f.name} picked up a spermatophore — her eggs are being fertilised. Laying should begin within hours.`, tankId: tank.id, creatureId: f.id });
          }
          break;
        case 'gravid':
          if (stageDue(f, hour)) beginLaying(state, tank, env, f);
          break;
        case 'laying':
          layEggs(state, tank, env, f, dt);
          break;
      }
    }
    for (const m of males) {
      if (m.repro.stage === 'depositing' && stageDue(m, hour)) {
        startResting(m, hour, b.cooldownDays * 24 * 0.5);
        addHistory(m, 'bred', 'Deposited spermatophores during courtship.', hour);
      }
    }

    // Idle ↔ conditioning labels.
    const hasOpp = (c: Creature) => (roleOf(c, sp) === 'male' ? females.length > 0 : males.length > 0);
    for (const c of adults) {
      if (c.repro.stage === 'idle' && hasOpp(c)) setStage(c, 'conditioning', hour);
      else if (c.repro.stage === 'conditioning' && !hasOpp(c)) setStage(c, 'idle', hour);
    }

    // New courtships: cool-water cue, at night, both in condition.
    if (!coolCueActive(tank, hour) || !isNight(tank, hour)) return;
    if (b.conditions.maxTempC !== undefined && tank.water.tempC > b.conditions.maxTempC + 0.25) return;
    const freeMales = males.filter((m) => m.repro.stage === 'conditioning' && isReady(m));
    for (const f of females) {
      if (f.repro.stage !== 'conditioning' || !isReady(f)) continue;
      const pref = freeMales.find((m) => m.id === f.repro.partnerId);
      const m = pref ?? [...freeMales].sort((x, y) => y.stats.breedingReadiness - x.stats.breedingReadiness)[0];
      if (!m) break;
      freeMales.splice(freeMales.indexOf(m), 1);
      pairUp(f, m);
      const end = hour + ctx.rng.range(COURT_H[0], COURT_H[1]);
      setStage(f, 'courting', hour, end);
      setStage(m, 'courting', hour, end);
      say(state, ctx, { kind: 'breeding', text: `${m.name} is courting ${f.name} — a slow, tail-waving “waltz” across the sand in the cool night water.`, tankId: tank.id, creatureId: m.id, toast: true });
    }
  },

  check(cc) {
    const { tank, sp, hour } = cc;
    if (!tank) return;
    const max = sp.breeding.conditions.maxTempC;
    if (max !== undefined && tank.water.tempC > max + 0.25) {
      cc.reasons.push(`The water is ${fmtTemp(tank.water.tempC)} — axolotls only breed in cool water (≤ ${max} °C).`);
      cc.steps.push(`Cool ${tank.name} below ${max} °C with a chiller or fan.`);
    }
    if (sp.breeding.conditions.coolingTrigger && !coolCueActive(tank, hour)) {
      cc.reasons.push('They are waiting for a seasonal cue — in the wild, cool rains trigger spawning.');
      cc.steps.push('Chill the water by ~2 °C to simulate the rainy season: two cool water changes (tank card › Care › Cool 25%) or a lower chiller setting.'); // lane:qa-play: name the button
    } else if (coolCueActive(tank, hour) && !isNight(tank, hour)) {
      cc.steps.push('The cue is set — courtship happens at night after the lights go out.');
    }
  },

  start(state, male, female, tank, hour) {
    for (const c of [male, female]) if (c.repro.stage === 'idle') setStage(c, 'conditioning', hour);
    return coolCueActive(tank, hour)
      ? `${male.name} and ${female.name} are together and the water has the “rainy season” chill — watch for courtship tonight.`
      : `${male.name} and ${female.name} are together. Chill the water by ~2 °C to trigger courtship.`;
  },

  force(state, male, female, tank, hour) {
    const env = ensureEnv(tank, hour);
    env.coolCueUntilHour = hour + 48;
    env.coolDropC = Math.max(env.coolDropC ?? 0, 2);
    pairUp(male, female);
    setStage(male, 'courting', hour, hour + 0.5);
    setStage(female, 'courting', hour, hour + 0.5);
    return `${male.name} and ${female.name} are courting.`;
  },

  status(state, c, sp, hour) {
    const cl = c.repro.clutchId ? state.clutches[c.repro.clutchId] : undefined;
    if (c.repro.stage === 'laying' && cl) {
      return { label: 'Laying eggs', detail: `${plural(cl.count, 'egg')} placed singly on plants so far`, progress: c.repro.progress };
    }
    if (c.repro.stage === 'gravid') return { label: 'Eggs being fertilised', detail: `Laying begins in ${approxDuration((c.repro.stageEndsHour ?? hour) - hour)}`, progress: c.repro.progress };
    return null;
  },
};

function beginLaying(state: GameState, tank: Tank, env: StepEnv, f: Creature): void {
  const { species: sp, hour, ctx } = env;
  const b = sp.breeding;
  const partnerId = f.repro.partnerId;
  const father = partnerId ? state.creatures[partnerId] : undefined;
  const total = rollClutchSize(ctx.rng, sp, f);
  const layH = ctx.rng.range(LAY_H[0], LAY_H[1]);
  const site = pickSite(tank, 'plants_mid', `${f.id}:${hour.toFixed(1)}`, 5);
  const cl = createClutch(state, {
    sp,
    tank,
    mother: f,
    father: father ?? null,
    hour,
    stage: 'eggs',
    count: 0,
    visual: 'egg_strands',
    nextStageHour: hour + layH * 0.5 + b.incubationHours,
    anchor: site.anchor,
    extraAnchors: site.extra,
    pendingEggs: total,
    notes: 'Eggs laid singly on plants and decor.',
  });
  setStage(f, 'laying', hour, hour + layH);
  f.repro.clutchId = cl.id;
  const adults = tank.purpose === 'nursery' ? '' : ' Adult axolotls eat eggs — move the clutch to a nursery tank once she has finished.';
  say(state, ctx, { kind: 'breeding', text: `${f.name} is laying eggs one by one on the plants and decor!${adults}`, tankId: tank.id, creatureId: f.id, toast: true });
}

function layEggs(state: GameState, tank: Tank, env: StepEnv, f: Creature, dt: number): void {
  const { species: sp, hour, ctx } = env;
  const cl = f.repro.clutchId ? state.clutches[f.repro.clutchId] : undefined;
  if (!cl || cl.tankId !== f.tankId) {
    if (cl) cl.pendingEggs = 0;
    startResting(f, hour, sp.breeding.cooldownDays * 24);
    return;
  }
  const end = f.repro.stageEndsHour ?? hour;
  const pending = cl.pendingEggs ?? 0;
  const remainingH = Math.max(dt, end - hour);
  const n = hour + dt >= end ? pending : Math.min(pending, Math.ceil((pending * dt) / remainingH));
  addEggs(cl, n);
  if ((cl.pendingEggs ?? 0) <= 0) {
    cl.pendingEggs = undefined;
    startResting(f, hour, sp.breeding.cooldownDays * 24);
    addHistory(f, 'bred', `Laid ${plural(cl.initialCount ?? cl.count, 'egg')}.`, hour);
    say(state, ctx, { kind: 'breeding', text: `${f.name} has finished laying — ${plural(cl.count, 'egg')} cling to the plants. She needs a good rest now.`, tankId: tank.id, creatureId: f.id });
  }
}

