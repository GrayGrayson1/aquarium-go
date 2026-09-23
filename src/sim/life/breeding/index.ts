/**
 * Species-specific reproduction: one state machine per BreedingSystemId (./systems/*), a shared clutch pipeline
 * (./clutch.ts: eggs → larvae → fry → individually minted juveniles), nursery capacity, and player-facing checks.
 * OWNER: lane "breeding".
 *
 * ┌──────────────────────── repro.stage strings (renderers / AI / UI may match on these) ────────────────────────┐
 * │ stage                 │ who                          │ meaning / extra fields                                  │
 * ├───────────────────────┼──────────────────────────────┼─────────────────────────────────────────────────────────┤
 * │ idle                  │ anyone                       │ not breeding (immature, alone, or between events)       │
 * │ conditioning          │ mature adult                 │ building condition; a potential partner is present      │
 * │ gravid                │ female                       │ egg-layers: ripe with eggs (betta: vertical bars);      │
 * │                       │                              │ livebearers: pregnant — carryingUntilHour, progress     │
 * │ nest_building         │ betta male                   │ blowing a bubble nest — nestProgress 0..1, nestAnchor   │
 * │ nest_ready            │ betta male                   │ nest finished, waiting for a female                      │
 * │ bonding               │ seahorse pair                │ morning greetings — bond (days), partnerId              │
 * │ nest_preparing        │ clownfish pair               │ cleaning a rock by the host — nestProgress, nestAnchor  │
 * │ courting              │ pair                         │ courtship: axolotl "waltz", betta flaring under the     │
 * │                       │                              │ nest, puffer chase, seahorse dawn dance — progress      │
 * │ spawning              │ pair                         │ the spawning embrace / pass (brief) — progress          │
 * │ depositing            │ axolotl male                 │ setting down spermatophores                             │
 * │ following             │ axolotl female               │ following the male, picking up a spermatophore          │
 * │ laying                │ axolotl female, snails       │ laying eggs over several hours — progress, clutchId     │
 * │ guarding              │ tending parent               │ fanning/mouthing eggs, tending larvae — clutchId        │
 * │ brooding              │ mouthbrooder male            │ eggs held in the mouth; does not eat — clutchId         │
 * │ pregnant              │ seahorse male                │ brood pouch — carryingUntilHour; progress 0..1 drives    │
 * │                       │                              │ the belly/pouch swell                                   │
 * │ berried               │ shrimp female                │ eggs under the tail — carryingUntilHour, clutchId       │
 * │ spent                 │ betta female                 │ just spawned; must be moved out (see `harassment`)       │
 * │ resting               │ anyone                       │ cooldown after breeding — stageEndsHour                 │
 * │ transitioning_female  │ clownfish (reproRole too)    │ protandrous sex change male → female — progress         │
 * └───────────────────────┴──────────────────────────────┴─────────────────────────────────────────────────────────┘
 * Other repro fields: rank (clownfish hierarchy, 0 = dominant), harassment 0..1 (betta female chased/bitten —
 * renderers may fray her fins), partnerId, stageSinceHour/stageEndsHour, totalClutches, totalOffspringRaised.
 * Clutch visuals: 'bubble_nest' | 'egg_strands' | 'eggs_adhesive' | 'eggs_scattered' | 'pouch' | 'berried' |
 * 'fry_cloud' | 'snail_clutch' at clutch.anchor (+ extraAnchors). Carried broods ('pouch', 'berried') have no anchor —
 * draw them on the carrier (clutch.guardedById).
 *
 * Counters bumped (facility quests): spawns, spawns_<species>, hatches, births, juvenilesRaised, raised_<species>,
 * clutchesRaised, rehomed, morphsDiscovered, sexChanges, pregnancies, seahorseBirths, clutchesMoved,
 * court_<species>, drops_<species>, berried_<species>. Mastery track: 'breeding'.
 * `stats.breedingReadiness` is written here every breeding step (0..100; ≥ 60 = in breeding condition).
 */
import type { Creature, FoodTag, GameState, Tank } from '@/types';
import type { SimContext } from '../../context';
import { findSpecies } from '@/data/species';
import { incidentRisks } from '@/sim/compat';
import { moduleFor } from './registry';
import { stepClutch } from './clutch';
import { evaluatePair } from './check';
import { creatureBreedingStatus } from './status';
import {
  coolCueActive,
  ensureEnv,
  ensureRole,
  isAlive,
  isMature,
  livingIn,
  makeTankInfo,
  noteFoodSeen,
  normalizeRepro,
  say,
  scanFood,
  updateReadiness,
} from './common';

/** Largest internal sub-step for breeding state machines (game hours). */
const MAX_BREED_SUBSTEP = 1;
/** Temperature drop (°C, vs the warmest reading of the last ~24 h) that counts as a seasonal cooling cue. */
export const COOL_CUE_DROP_C = 1.8;
const COOL_CUE_HOURS = 48;

/** Human-readable labels for every stage string (UI chips, debug panel). */
export const BREEDING_STAGE_LABELS: Record<string, string> = {
  idle: 'Not breeding',
  conditioning: 'Conditioning',
  gravid: 'Gravid',
  nest_building: 'Building a bubble nest',
  nest_ready: 'Nest ready',
  bonding: 'Pair-bonding',
  nest_preparing: 'Preparing a nest site',
  courting: 'Courting',
  spawning: 'Spawning',
  depositing: 'Depositing spermatophores',
  following: 'Following the male',
  laying: 'Laying eggs',
  guarding: 'Guarding the brood',
  brooding: 'Mouthbrooding',
  pregnant: 'Pregnant',
  berried: 'Berried',
  spent: 'Spent — separate her',
  resting: 'Resting',
  transitioning_female: 'Becoming female',
};

export function stepTankBreeding(state: GameState, tank: Tank, dt: number, ctx: SimContext): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  let t = 0;
  while (t < dt - 1e-9) {
    const sdt = Math.min(MAX_BREED_SUBSTEP, dt - t);
    stepOnce(state, tank, ctx.hour + t, sdt, ctx);
    t += sdt;
  }
}

function stepOnce(state: GameState, tank: Tank, hour: number, dt: number, ctx: SimContext): void {
  const all = livingIn(state, tank.id);
  updateEnvironment(state, tank, hour, all, ctx);
  const info = makeTankInfo(state, tank, hour, () => {
    try {
      return (incidentRisks(state, tank.id) ?? []).filter((r) => r.youngOnly);
    } catch {
      return [];
    }
  });

  const groups = new Map<string, Creature[]>();
  for (const c of all) {
    let g = groups.get(c.speciesId);
    if (!g) groups.set(c.speciesId, (g = []));
    g.push(c);
  }
  for (const [spId, members] of groups) {
    const sp = findSpecies(spId);
    if (!sp) continue;
    const mod = moduleFor(sp);
    if (!mod.breedable) continue;
    for (const c of members) {
      normalizeRepro(c, hour);
      if (sp.sexSystem !== 'protandrous') ensureRole(c, sp, hour);
      updateReadiness(tank, c, sp, hour, dt, info);
    }
    try {
      mod.step({ state, tank, species: sp, members, hour, dt, ctx, info });
    } catch (e) {
      // A breeding glitch must never stop the world.
      if (typeof console !== 'undefined') console.warn(`breeding step failed for ${spId}`, e);
    }
  }

  for (const cl of Object.values(state.clutches)) {
    if (cl.tankId !== tank.id) continue;
    const sp = findSpecies(cl.speciesId);
    if (!sp) {
      delete state.clutches[cl.id];
      continue;
    }
    try {
      stepClutch(state, cl, tank, sp, moduleFor(sp), hour, dt, ctx, info);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn(`clutch step failed for ${cl.id}`, e);
    }
  }
}

/** Hourly temperature log → seasonal cooling cue; food offered → conditioning/fry-feeding memory. */
function updateEnvironment(state: GameState, tank: Tank, hour: number, all: Creature[], ctx: SimContext): void {
  const env = ensureEnv(tank, hour);
  scanFood(tank, hour);
  const temp = tank.water.tempC;
  if (!Number.isFinite(temp)) return;
  if (hour - env.lastLogHour >= 1 - 1e-9) {
    env.tempLog.push(Math.round(temp * 100) / 100);
    if (env.tempLog.length > 24) env.tempLog.splice(0, env.tempLog.length - 24);
    env.lastLogHour = hour;
  }
  if (!env.tempLog.length) return;
  const warmest = Math.max(...env.tempLog);
  const drop = warmest - temp;
  if (drop >= COOL_CUE_DROP_C && !coolCueActive(tank, hour)) {
    env.coolCueUntilHour = hour + COOL_CUE_HOURS;
    env.coolDropC = Math.round(drop * 10) / 10;
    const cued = all.filter((c) => {
      const sp = findSpecies(c.speciesId);
      return !!sp && !!sp.breeding.conditions.coolingTrigger && isMature(c, sp, hour);
    });
    if (cued.length) {
      const names = cued.slice(0, 2).map((c) => c.name);
      const who = names.length === 2 ? `${names[0]} and ${names[1]} are` : `${names[0]} is`;
      say(state, ctx, { kind: 'breeding', text: `The water in ${tank.name} has cooled by ${env.coolDropC} °C — like the first cool rains of the season. ${who} restless tonight.`, tankId: tank.id, creatureId: cued[0].id, toast: true });
    }
  }
}

/** Can these two breed now, and if not, why? Includes the next concrete step for the player. */
export function breedingCheck(state: GameState, aId: string, bId: string): { ok: boolean; reasons: string[]; nextStep?: string } {
  try {
    const r = evaluatePair(state, aId, bId, false);
    return { ok: r.ok, reasons: r.reasons, nextStep: r.nextStep };
  } catch (e) {
    return { ok: false, reasons: ['Breeding check unavailable right now.'] };
  }
}

/** Plain-language breeding status for a creature card ("Building a bubble nest", "Pregnant — due in ~2 days"). */
export function breedingStatus(state: GameState, creatureId: string): { label: string; detail?: string; progress?: number } | null {
  try {
    return creatureBreedingStatus(state, creatureId);
  } catch {
    return null;
  }
}

/**
 * Record that foods were offered to a tank (the care lane's feedTank should call this inside its mutate recipe).
 * Breeding uses it for conditioning (rich/live foods) and for feeding larvae/fry (infusoria, baby brine, copepods).
 */
export function noteBreedingFood(state: GameState, tankId: string, tags: readonly FoodTag[]): void {
  const tank = state.tanks[tankId];
  if (!tank || !tags.length) return;
  noteFoodSeen(tank, tags, state.clock.hour);
}

/** 0..1 visual progress of the current repro stage (belly/pouch swell, nest size) — renderers. */
export function reproProgress(c: Creature): number {
  const r = c.repro;
  if (!r) return 0;
  if (r.stage === 'nest_building' || r.stage === 'nest_ready') return Math.max(0, Math.min(1, r.nestProgress ?? 0));
  return Math.max(0, Math.min(1, r.progress ?? 0));
}

/** True while an animal is committed to a breeding event (UI may warn before moving/selling it). */
export function isBreedingBusy(c: Creature): boolean {
  return ['courting', 'spawning', 'depositing', 'following', 'laying', 'guarding', 'brooding', 'pregnant', 'berried', 'nest_preparing'].includes(c.repro?.stage);
}

/** Short explanation of how a species breeds in the game (encyclopedia / breeding panel). */
export function breedingSystemInfo(speciesId: string): { system: string; breedable: boolean; summary: string } | null {
  const sp = findSpecies(speciesId);
  if (!sp) return null;
  const mod = moduleFor(sp);
  return { system: sp.breeding.system, breedable: mod.breedable, summary: mod.explain?.(sp) ?? sp.breeding.notes };
}

/** Is a tank currently giving a seasonal cooling cue (axolotl, corydoras)? */
export function coolingCue(state: GameState, tankId: string): { active: boolean; dropC?: number; untilHour?: number } {
  const t = state.tanks[tankId];
  if (!t) return { active: false };
  return { active: coolCueActive(t, state.clock.hour), dropC: t.breedingEnv?.coolDropC, untilHour: t.breedingEnv?.coolCueUntilHour };
}

export { clutchStatus, clutchProgress } from './status';
export { nurseryRoom } from './clutch';
export { evaluatePair } from './check';
export { juvenileSlots as nurseryCapacityFor } from './common';
export type { PairEvaluation } from './check';
export type { ClutchStatus } from './status';

/** Living creatures helper re-exported for tests/tools. */
export function breedingMembers(state: GameState, tankId: string, speciesId: string): Creature[] {
  return livingIn(state, tankId).filter((c) => c.speciesId === speciesId && isAlive(c));
}
