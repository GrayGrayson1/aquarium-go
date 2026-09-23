/**
 * Pair evaluation (breedingCheck / startBreeding validation). OWNER: lane "breeding".
 * PURE: never writes to state (the UI calls this on frozen store snapshots).
 */
import type { Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { moduleFor } from './registry';
import { withArticle } from '../../economy/util'; // lane:w2-ui
import type { BreedingModule, CheckCtx } from './types';
import {
  BUSY_STAGES,
  READY,
  approxDuration,
  daysToMaturity,
  effectiveRole,
  gallonsOf,
  isGone,
  isMature,
  isResting,
  spName,
  spPlural,
  stageProgress,
} from './common';

/** lane:w2-ui — "fresh water" / "salt water" / "brackish water" (never "freshwater water"). */
const waterWord = (env: string) => (env === 'freshwater' ? 'fresh' : env === 'marine' ? 'salt' : env);

export interface PairEvaluation {
  ok: boolean;
  reasons: string[];
  nextStep?: string;
  /** Reasons that also block Start breeding. */
  startBlockers: string[];
  male?: Creature;
  female?: Creature;
  tank?: Tank | null;
  sp?: SpeciesDefinition;
  mod?: BreedingModule;
}

const BUSY_TEXT: Record<string, string> = {
  guarding: 'is guarding a clutch',
  brooding: 'is mouthbrooding',
  pregnant: 'is pregnant',
  berried: 'is carrying eggs',
  laying: 'is laying eggs',
  spent: 'is recovering from spawning',
  transitioning_female: 'is changing sex',
  depositing: 'is mid-courtship',
  following: 'is mid-courtship',
  nest_preparing: 'is preparing a nest with another partner',
  courting: 'is courting another partner',
  spawning: 'is spawning with another partner',
};

function conditioningHint(sp: SpeciesDefinition): string {
  const tags = sp.breeding.conditions.needsConditioningFood;
  if (tags?.length) return `Condition them with ${tags.slice(0, 3).map((t) => t.replace(/_/g, ' ')).join(', ')} for a day or two.`;
  return 'Keep them healthy, well fed and calm — condition builds over a few hours.';
}

export function evaluatePair(state: GameState, aId: string, bId: string, forStart = false): PairEvaluation {
  const hour = state.clock.hour;
  const fail = (reason: string, step?: string): PairEvaluation => ({ ok: false, reasons: [reason], nextStep: step, startBlockers: [reason] });
  const a = state.creatures[aId];
  const b = state.creatures[bId];
  if (!a || !b) return fail('One of those animals could not be found.');
  if (a.id === b.id) return fail('Choose two different animals.', 'Pick a partner of the same species.');
  for (const c of [a, b]) if (isGone(c)) return fail(`${c.name} is no longer in your care.`);
  const sa = findSpecies(a.speciesId);
  const sb = findSpecies(b.speciesId);
  if (!sa || !sb) return fail('Unknown species.');
  if (sa.id !== sb.id) return fail(`${a.name} is ${withArticle(spName(sa))} and ${b.name} is ${withArticle(spName(sb))} — different species can’t interbreed.`, 'Pick two animals of the same species.');
  const sp = sa;
  const mod = moduleFor(sp);

  const reasons: string[] = [];
  const steps: string[] = [];
  const startBlockers: string[] = [];
  const hard = (r: string, step?: string) => {
    reasons.push(r);
    startBlockers.push(r);
    if (step) steps.push(step);
  };
  const soft = (r: string, step?: string) => {
    reasons.push(r);
    if (step) steps.push(step);
  };

  // Roles.
  const ra = effectiveRole(a, sp, hour);
  const rb = effectiveRole(b, sp, hour);
  let male: Creature = a;
  let female: Creature = b;
  if (sp.sexSystem === 'simultaneous_hermaphrodite') {
    male = a;
    female = b;
  } else if (sp.sexSystem === 'protandrous' || sp.sexSystem === 'protogynous') {
    const fa = ra === 'female';
    const fb = rb === 'female';
    female = fa ? a : fb ? b : ra === 'transitioning' ? a : rb === 'transitioning' ? b : a;
    male = female === a ? b : a;
    if (fa && fb) hard('Both are established females — they can’t change back, and two females will fight.', 'Pair the female with a male instead.');
    else if (!fa && !fb) {
      const t = ra === 'transitioning' ? a : rb === 'transitioning' ? b : null;
      if (t) hard(`${t.name} is still changing sex (${Math.round(stageProgress(t, hour) * 100)}%).`, 'Wait a little longer — the change takes a few days.');
      else if (sp.sexSystem === 'protandrous') hard('Neither fish is female yet.', `${spPlural(sp)[0].toUpperCase()}${spPlural(sp).slice(1)} all start out male — keep two together and the larger, bolder one becomes the female over a few days.`);
      else hard('Neither fish is male yet.', 'In this species the dominant female of a group changes into a male.');
    }
  } else if (sp.sexSystem === 'not_applicable') {
    // Handled by the module (fragmentation / not_in_game).
  } else {
    if (!ra || !rb) {
      const unk = !ra ? a : b;
      hard(`${unk.name}’s sex isn’t visible yet (${spPlural(sp)} can be sexed at ~${Math.round(sp.lifecycle.sexVisibleAtDays)} days old).`, 'Wait until the sexes are visible, or pair a known male with a known female.');
    } else if (ra === rb) {
      hard(`Both are ${ra}s.`, `Pair one male ${spName(sp)} with one female.`);
    }
    male = ra === 'male' ? a : rb === 'male' ? b : a;
    female = male === a ? b : a;
  }

  if (!mod.breedable) {
    const cc = makeCc(state, sp, a, b, male, female, null, hour, reasons, steps, startBlockers, forStart);
    mod.check(cc);
    return { ok: false, reasons: reasons.length ? reasons : [mod.explain?.(sp) ?? 'Not breedable.'], nextStep: mod.explain?.(sp), startBlockers: startBlockers.length ? startBlockers : reasons.slice(), sp, mod };
  }

  // Maturity & condition.
  for (const c of [a, b]) {
    if (!isMature(c, sp, hour)) hard(`${c.name} is too young to breed — mature in ${approxDuration(daysToMaturity(c, sp, hour) * 24)}.`, 'Give them time to grow up.');
  }
  for (const c of [a, b]) {
    if (c.stats.health < 50) hard(`${c.name} needs to recover first (health ${Math.round(c.stats.health)}%).`, 'Sort out water quality and feeding, and let them recover.');
    else if (c.illness) hard(`${c.name} is ill (${c.illness.kind.replace(/_/g, ' ')}).`, 'Treat the illness before breeding.');
    if (c.stats.stress > 70) soft(`${c.name} is too stressed to breed.`, 'Reduce stress: hides, calm tankmates, stable water, no glass tapping.');
    if (c.stats.hunger > 70) soft(`${c.name} is hungry — breeding animals need to be well fed.`, 'Feed them well for a day.');
  }

  // Busy / resting.
  const together = a.repro.partnerId === b.id && b.repro.partnerId === a.id && a.repro.stage === b.repro.stage && ['courting', 'spawning', 'nest_preparing'].includes(a.repro.stage);
  if (together) {
    return { ok: true, reasons: [], nextStep: 'They’re already courting — keep watching the tank!', startBlockers: [], male, female, tank: a.tankId ? state.tanks[a.tankId] ?? null : null, sp, mod };
  }
  for (const c of [a, b]) {
    if (isResting(c, hour)) hard(`${c.name} is resting after breeding — ready again in ${approxDuration((c.repro.stageEndsHour ?? hour) - hour)}.`);
    else if (BUSY_STAGES.has(c.repro.stage)) {
      const withEachOther = c.repro.partnerId === (c === a ? b.id : a.id);
      if (!(withEachOther && (c.repro.stage === 'nest_preparing' || c.repro.stage === 'courting'))) hard(`${c.name} ${BUSY_TEXT[c.repro.stage] ?? 'is busy breeding'}.`);
    }
  }

  // Where would they breed?
  // (Apart pairs are judged in the tank Start breeding would use: the first animal's.)
  let tank: Tank | null = null;
  if (mod.introducedByKeeper) tank = male.tankId ? state.tanks[male.tankId] ?? null : null;
  else if (a.tankId && a.tankId === b.tankId) tank = state.tanks[a.tankId] ?? null;
  else tank = (a.tankId && state.tanks[a.tankId]) || (b.tankId && state.tanks[b.tankId]) || null;
  const apart = !mod.introducedByKeeper && a.tankId !== b.tankId;
  if (tank) {
    if (tank.environment !== sp.environment) hard(`${tank.name} is a ${tank.environment} tank — ${spPlural(sp)} need ${waterWord(sp.environment)} water.`); // lane:w2-ui: not "freshwater water"
    const min = sp.breeding.conditions.minTankGallons;
    if (min && gallonsOf(tank) < min) soft(`${tank.name} is only ${gallonsOf(tank)} gallons — ${spPlural(sp)} need at least ${min} gallons to breed.`, `Use a tank of ${min} gallons or more.`);
  }

  // System-specific requirements.
  const cc = makeCc(state, sp, a, b, male, female, tank, hour, reasons, steps, startBlockers, forStart);
  mod.check(cc);

  // Condition (only worth mentioning when nothing bigger blocks).
  if (!reasons.length && !mod.introducedByKeeper) {
    for (const c of [a, b]) if (c.stats.breedingReadiness < READY) soft(`${c.name} isn’t in breeding condition yet (readiness ${Math.round(c.stats.breedingReadiness)}%).`, conditioningHint(sp));
  }

  // Apart: "ok" means Start breeding can bring them together; anything else is fixed once they share a tank.
  if (apart && !forStart) {
    const host = tank;
    const mover = a.tankId === host?.id ? b : a;
    const move = `Start breeding moves ${mover.name} into ${host?.name ?? 'the same tank'}`;
    if (!startBlockers.length) {
      const then = steps.find((st) => !/Start breeding/.test(st));
      return { ok: true, reasons: [], nextStep: then ? `${move} — then: ${then[0].toLowerCase()}${then.slice(1)}` : `${move}.`, startBlockers, male, female, tank, sp, mod };
    }
    reasons.push('They’re in different tanks.');
  }
  const ok = reasons.length === 0;
  const nextStep = steps[0] ?? (ok ? readyText(mod, sp) : undefined);
  return { ok, reasons, nextStep, startBlockers, male, female, tank, sp, mod };
}

function readyText(mod: BreedingModule, sp: SpeciesDefinition): string {
  switch (mod.id) {
    case 'bubble_nest':
      return 'Use Start breeding to introduce her to his nest — and move her out as soon as they spawn.';
    case 'axolotl_spermatophore':
      return 'Everything is set — courtship happens at night in the cool water.';
    case 'seahorse_pouch':
      return 'Everything is set — watch for their courtship dance at dawn.';
    case 'clownfish_substrate':
      return 'Everything is set — they will clean a nest site and spawn in the evening.';
    case 'livebearer':
      return 'Nothing more to do — livebearers breed readily. Dense plants or a nursery will save the fry.';
    default:
      return `Everything is set — keep conditions stable and watch your ${spPlural(sp)}.`;
  }
}

function makeCc(
  state: GameState,
  sp: SpeciesDefinition,
  a: Creature,
  b: Creature,
  male: Creature,
  female: Creature,
  tank: Tank | null,
  hour: number,
  reasons: string[],
  steps: string[],
  startBlockers: string[],
  forStart: boolean,
): CheckCtx {
  return { state, sp, a, b, male, female, tank, hour, reasons, steps, startBlockers, forStart };
}
