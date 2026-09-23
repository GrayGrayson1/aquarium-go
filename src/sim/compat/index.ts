/**
 * Compatibility engine — data-driven evaluator returning reasoned verdicts. OWNER: lane "waterlab".
 *
 * - evaluateTank / previewAddition / incidentRisks: evaluate real tanks (water class, size, habitat, flow, light,
 *   temperature, lid, maturity, pods...). Results are cached per composition + habitat signature, so calling these every
 *   tick is cheap.
 * - speciesPair: pure species-vs-species verdict in a generous hypothetical tank (encyclopedia "gets along with").
 * - evaluateComposition (re-exported from ./engine) lets tests and tools evaluate hypothetical members directly.
 */
import type { GameState, CompatReport, CandidateAddition, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { evaluateComposition, simpleMember, type CompatEvaluation, type CompatMember, type CompatContext, type IncidentRisk } from './engine';
import { tankContext, tankMembers, candidateIndividuals, neutralContext } from './context';
import { fitsEnvironment } from './salinity'; // lane:brackish

export type { IncidentRisk, CompatMember, CompatContext, CompatEvaluation, MemberIndividual } from './engine';
export { evaluateComposition, simpleMember, memberFrom, worseVerdict } from './engine';
export { tankContext, neutralContext, stingingCount } from './context';
export { huntingDrive, preyReachCm, preyFits, edibleSizeCm, tearsPrey, TYPICAL_PREDATOR_HUNGER } from './predation';

const EMPTY: CompatReport = { verdict: 'excellent', score: 100, reasons: [], pairs: [], perSpecies: {} };

// ───────────────────────────── cache ─────────────────────────────

const CACHE = new Map<string, CompatEvaluation>();
const CACHE_MAX = 256;

function signature(members: CompatMember[], ctx: CompatContext): string {
  const m = members
    .map((x) => `${x.species.id}:${x.individuals.map((i) => `${i.id}/${i.sex[0]}/${i.adult ? 1 : 0}/${Math.round(i.sizeCm * 2)}`).join(',')}`)
    .sort()
    .join(';');
  const h = ctx.habitat;
  const r1 = (v: number | undefined | null) => (v === undefined || v === null ? 'n' : Math.round(v * 10));
  const c = [
    ctx.tankId ?? '',
    ctx.gallons,
    ctx.waterClass,
    ctx.purpose,
    ctx.substrate.kind,
    Math.round(ctx.substrate.depthCm),
    r1(h.hides),
    r1(h.cover),
    r1(h.sightBreak),
    r1(h.nitrateUptake),
    ctx.corals,
    ctx.anemones,
    ctx.flowIndex ?? 'n',
    ctx.lightLevel ?? 'n',
    ctx.expectedTempC === null ? 'n' : Math.round(ctx.expectedTempC * 2),
    ctx.salinitySG === null ? 'n' : Math.round(ctx.salinitySG * 1000),
    ctx.pH === undefined || ctx.pH === null ? 'n' : Math.round(ctx.pH * 10),
    ctx.hasLid ? 1 : 0,
    Math.min(60, Math.floor(ctx.ageDays)),
    r1(ctx.bioMaturity),
    r1(ctx.pods),
    Math.round(ctx.algae / 5),
    Math.round(ctx.processCapUnits),
    (ctx.clutchSpecies ?? []).slice().sort().join('+'),
    ctx.stinging ?? 0,
    ctx.glassMm ?? 0,
  ].join('|');
  return `${c}#${m}`;
}

function cached(members: CompatMember[], ctx: CompatContext): CompatEvaluation {
  const key = signature(members, ctx);
  const hit = CACHE.get(key);
  if (hit) return hit;
  const res = evaluateComposition(members, ctx);
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(key, res);
  return res;
}

function evaluateTankFull(state: GameState, tankId: string): CompatEvaluation | null {
  const tank = state.tanks[tankId];
  if (!tank) return null;
  const members = tankMembers(state, tankId);
  if (members.length === 0) return { report: EMPTY, incidents: [] };
  return cached(members, tankContext(state, tank));
}

// ───────────────────────────── public API ─────────────────────────────

/** Evaluate everything currently living in a tank (plus decor/habitat/water). */
export function evaluateTank(state: GameState, tankId: string): CompatReport {
  try {
    return evaluateTankFull(state, tankId)?.report ?? EMPTY;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('evaluateTank failed', e);
    return EMPTY;
  }
}

/** Preview adding a candidate (new purchase or moved creatures) to a tank. Used before every purchase/move. */
export function previewAddition(state: GameState, tankId: string, candidate: CandidateAddition): CompatReport {
  const tank = state.tanks[tankId];
  const sp = findSpecies(candidate.speciesId);
  if (!tank || !sp) return EMPTY;
  const inds = candidateIndividuals(state, candidate, sp);
  const exclude = candidate.creatureIds ?? [];
  const members = tankMembers(state, tankId, [{ species: sp, individuals: inds }], exclude);
  try {
    return cached(members, tankContext(state, tank)).report;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('previewAddition failed', e);
    return EMPTY;
  }
}

const PAIR_CACHE = new Map<string, CompatReport>();

/** Pure species-vs-species check with no tank context (encyclopedia "gets along with" lists). */
export function speciesPair(a: SpeciesDefinition, b: SpeciesDefinition): CompatReport {
  const key = a.id <= b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  const hit = PAIR_CACHE.get(key);
  if (hit) return hit;
  let members: CompatMember[];
  if (a.id === b.id) {
    const n = Math.max(2, Math.min(6, a.social?.minGroup ?? 2));
    members = [simpleMember(a, n, 'mixed')];
  } else {
    members = [simpleMember(a, Math.max(1, Math.min(6, a.social?.minGroup ?? 1)), 'mixed'), simpleMember(b, Math.max(1, Math.min(6, b.social?.minGroup ?? 1)), 'mixed')];
  }
  const res = evaluateComposition(members, neutralContext(a, b)).report;
  if (PAIR_CACHE.size > 2000) PAIR_CACHE.clear();
  PAIR_CACHE.set(key, res);
  return res;
}

/** Can this species live in this tank's water class/environment at all? Hard gate for purchases. */
export function environmentGate(species: SpeciesDefinition, tank: Tank): { ok: boolean; reason?: string } {
  // lane:brackish — same rules as the compatibility engine (./salinity.ts).
  if (fitsEnvironment(species, tank.environment)) return { ok: true };
  const env = (e: string) => (e === 'marine' ? 'marine (saltwater)' : e === 'brackish' ? 'brackish' : 'freshwater');
  return {
    ok: false,
    reason: `${species.commonName} ${/s$/.test(species.commonName) ? 'are' : 'is a'} ${env(species.environment)} ${/s$/.test(species.commonName) ? 'animals' : 'animal'}; this tank is ${env(tank.environment)}. It cannot survive here.`,
  };
}

/** Concrete per-day incident probabilities for the life lane to roll against (predation, fights, nipping...). */
export function incidentRisks(state: GameState, tankId: string): IncidentRisk[] {
  try {
    return evaluateTankFull(state, tankId)?.incidents ?? [];
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('incidentRisks failed', e);
    return [];
  }
}

/** Clear memoised results (tests / hot reload of species data). */
export function clearCompatCache(): void {
  CACHE.clear();
  PAIR_CACHE.clear();
}
