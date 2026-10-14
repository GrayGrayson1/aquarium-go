/**
 * Production lines (0.5 §11, DESIGN-S3D §8.6, §8.6.1 and §9.5; ADR-0025, ADR-0030). OWNER: lane "production".
 *
 * A line runs one breeding pair's young through systems the player already uses: Breed → Raise → Sort → Quarantine →
 * Sell. It automates clicks the player can make (moving a brood to a nursery, moving animals, Start breeding and
 * Separate for keeper-introduced species, listing); it adds no biology and never creates animals, money or listings
 * from nothing.
 *
 * - **Once per game hour.** `stepProduction` runs from the world step (src/sim/world.ts) for each whole hour crossed,
 *   after the tanks; `production.lastHour` makes a re-stepped hour do nothing more. A line draws no random numbers;
 *   the tanks it settles before a move step as they always do (and simRng continues one stream across them).
 * - **Breed.** The pair spawns through the existing breeding sim in the breed tank. A held pair (paused by the player,
 *   waiting for room, or missing a partner or tank) gets `repro.lineHold`, which keeps its breeding readiness at 0, as
 *   resting does (the mechanism PROD-010 asks for). For species the keeper introduces (bettas), the female rests in her
 *   own tank and the line brings her in when both are ready and moves her back after spawning (ADR-0030 decision 7).
 * - **Raise.** A brood of the pair that is free-swimming moves to the raise tank once, through Move to nursery. A full
 *   raise tank (no place for a young one) leaves the fry where they are, with one notice (ADR-0025 decision 8).
 * - **Sort.** When the brood's young are raised (minted as juveniles), the keep rules keep the best matches (value, then
 *   id) and move them to the keep tank; Prismatics go to the keep tank when "Never sell Prismatic animals" is on, else
 *   they stay with the batch, never listed (ADR-0025 decisions 3 and 4). Favourites are never moved. The rest is a batch.
 * - **Quarantine.** A batch moves into the line's first free quarantine tank (one batch per tank at a time, across
 *   lines; the tank must have room and be cycled or seeded) and stays 168 game hours.
 * - **Sell.** With "List automatically" on, the batch is listed when quarantine ends, by each animal's life stage then
 *   (juveniles as a juvenile batch, adults singly or as a group; ADR-0025 decision 2), at a reserve of fair value × 0.9.
 *   Never a Prismatic, a favourite or an animal in a keep tank. Sales count in the line's week once.
 * - **Waiting for room.** With "Pause when a tank is full", the pair is held while the raise tank can't take the next
 *   clutch (fewer places than the species raises per clutch) and holds the line's young; it restarts by itself.
 * - **Missing references.** A gone parent or tank, or a parent the player moved away, pauses the line with one notice;
 *   the line is kept (ADR-0025 decision 10, ADR-0030 decision 2).
 * - **Costs.** costs.ts: the line's share of its tanks' food and power, hour by hour (ADR-0025 decision 9).
 */
import type { Clutch, Creature, GameState, ListingKind, ProductionBatch, ProductionKeepRule, ProductionLine, ProductionRef, ProductionState, SpeciesDefinition, Tank } from '@/types';
import type { ActionResult } from '../care';
import { emitEvent } from '../context';
import { settleTanks } from '../settle';
import { isHeld } from '../automation/hold'; // lane:automation (chunk 5) — manual mode
import { findSpecies } from '@/data/species';
import { PRODUCTION_LINE_SLOTS, FACILITY_LEVELS, getFacilityLevel } from '@/data/facilities';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { moduleFor } from '../life/breeding/registry';
import { isCarried } from '../life/breeding/clutch';
import { effectiveRole, fmtTemp, isMature, isReady, juvenileSlots, spPlural } from '../life/breeding/common';
import { catalogEntry } from '../life/morphCatalog';
import { evaluatePair } from '../life/breeding/check';
import { moveClutch, separateCreature, startBreeding } from '../life/breeding/actions';
import { moveCreature } from '../life/actions';
import { isPrismatic } from '../life/rareVariants';
import { resolveMorph, morphDisplayName, predictOffspringMorphs } from '../life/genetics';
import { sizeAtAge } from '../life/growth';
import { environmentGate, previewAddition } from '../compat';
import { tankDailyCost } from '../water';
import { activeListingFor, createListing, DEFAULT_LISTING_HOURS } from '../economy/listings';
import { bundleValue, creatureValue } from '../economy/valuation';
import { buyTank, tankKitPrice } from '../economy/purchases';
import { chargeLine, isLineParent, isLineYoung, lineShare, lineTankIds } from './costs';

export { noteFoodSpend, lineShare, lineTankIds, isLineYoung } from './costs';

export const QUARANTINE_HOURS = 168;
export const WEEK_HOURS = 168;
/** "Auctions · reserve at fair value −10%" (0.5 §11.1, PROD-014). */
export const RESERVE_SHARE = 0.9;
/**
 * A quarantine tank takes a batch once it's cycled: the game's own line for a tank with animals, below which the water
 * report says "Tank is still cycling" (danger) and buying animals warns "This tank is not cycled yet" (0.4). Seeded
 * media gives 0.6; a cycled tank 0.88. (It was 0.6: an empty tank's filter bacteria decline without waste, 0.88 → 0.6
 * in about five idle days and a seeded tank within hours, and the line then stalled without a word. An idle seeded
 * tank stays above 0.4 for about five and a half days; after that the line says the tank isn't cycled yet.)
 */
export const QUARANTINE_READY_MATURITY = 0.4;

/** Is a quarantine tank cycled enough for a batch? */
export function quarantineReady(t: Tank): boolean {
  return (t.water.bioMaturity ?? 0) >= QUARANTINE_READY_MATURITY - 1e-9;
}
/** Ended lines kept for their history (ADR-0025 decision 6). */
const ENDED_KEPT = 24;

const ok = (message: string): ActionResult => ({ ok: true, message });
const no = (message: string): ActionResult => ({ ok: false, message });
const roundCents = (n: number) => Math.round(n * 100) / 100;

// ───────────────────────────── queries ─────────────────────────────

export function productionLines(state: GameState): ProductionLine[] {
  return state.production?.lines ?? [];
}

export function findLine(state: GameState, lineId: string): ProductionLine | undefined {
  return productionLines(state).find((l) => l.id === lineId);
}

/** Line slots at the facility's level (1 · 2 · 3 · 4 · 6 · 8). */
export function lineSlots(state: GameState): number {
  return PRODUCTION_LINE_SLOTS[state.facility.level] ?? 1;
}

/** The next level with more slots (for "more at {level}"), or null at the last. */
export function nextSlotLevel(state: GameState): { name: string; slots: number } | null {
  const here = lineSlots(state);
  const i = FACILITY_LEVELS.findIndex((l) => l.id === state.facility.level);
  for (const l of FACILITY_LEVELS.slice(i + 1)) if ((PRODUCTION_LINE_SLOTS[l.id] ?? 0) > here) return { name: l.name, slots: PRODUCTION_LINE_SLOTS[l.id] };
  return null;
}

export function facilityLevelName(state: GameState): string {
  return getFacilityLevel(state.facility.level).name;
}

/** The line a creature is a parent of, if any. */
export function lineOfParent(state: GameState, creatureId: string): ProductionLine | undefined {
  return productionLines(state).find((l) => isLineParent(l, creatureId));
}

/**
 * Protected (ADR-0025 decision 4): every animal in a line's keep tank, every Prismatic and every favourite. Automation
 * never moves them out, lists them or sells them.
 */
export function isProtected(state: GameState, c: Creature): boolean {
  if (c.favorite || isPrismatic(c)) return true;
  return !!c.tankId && productionLines(state).some((l) => l.tanks.keep === c.tankId);
}

export type LineStatus = 'running' | 'paused_by_you' | 'waiting' | 'paused';

/** What the line is doing: Running, Paused by you, waiting for room, or Paused (missing a parent or tank). */
export function lineStatus(line: ProductionLine): LineStatus {
  if (line.broken) return 'paused';
  if (!line.running) return 'paused_by_you';
  if (line.waiting) return 'waiting';
  return 'running';
}

/** Is the brood free-swimming (the Raise stage's trigger)? The species' last rearing phase, out of the egg and parent. */
export function isFreeSwimming(cl: Clutch, sp: SpeciesDefinition): boolean {
  if (cl.stage === 'eggs' || cl.stage === 'in_pouch' || isCarried(cl) || (cl.pendingEggs ?? 0) > 0) return false;
  const phases = moduleFor(sp).plan.phases;
  return phases.some((p) => p.stage === 'fry') ? cl.stage === 'fry' : true;
}

/** Size of a young one when it's raised (minted): the places it needs in a tank. */
export function youngSizeCm(state: GameState, line: ProductionLine, sp: SpeciesDefinition): number {
  const mother = state.creatures[line.pair.motherId] ?? state.creatures[line.pair.fatherId];
  const ageDays = Math.max(0.5, Math.min((sp.breeding.incubationHours + sp.breeding.fryRearingHours) / 24, Math.max(0.5, sp.lifecycle.juvenileDays * 0.8)));
  try {
    return mother ? sizeAtAge(sp, mother.genome, ageDays) : sp.adultSizeCm * 0.5;
  } catch {
    return sp.adultSizeCm * 0.5;
  }
}

/** Young that will need places in a tank: its broods of this species, up to what each raises. */
function pendingYoung(state: GameState, tankId: string, sp: SpeciesDefinition): number {
  let n = 0;
  for (const cl of Object.values(state.clutches)) if (cl.tankId === tankId && cl.speciesId === sp.id && cl.count > 0) n += Math.min(cl.count, sp.breeding.maxRaisedPerClutch);
  return n;
}

/** Places for young in a tank (C-30): young of this species at their raised size that still fit, minus broods there. */
export function youngPlaces(state: GameState, tank: Tank, sp: SpeciesDefinition, hour: number, sizeCm: number): number {
  return Math.max(0, juvenileSlots(state, tank, sp, hour, sizeCm) - pendingYoung(state, tank.id, sp));
}

/** Does the tank hold any of the line's young or broods? */
function holdsLineYoung(state: GameState, line: ProductionLine, tankId: string): boolean {
  for (const c of Object.values(state.creatures)) if (c.tankId === tankId && c.status === 'alive' && isLineYoung(line, c)) return true;
  for (const cl of Object.values(state.clutches)) if (cl.tankId === tankId && cl.motherId === line.pair.motherId && cl.fatherId === line.pair.fatherId && cl.count > 0) return true;
  return false;
}

/** Waiting for room (DESIGN-S3D §9.5): the raise tank can't take the next clutch and holds the line's young. */
export function raiseTankFull(state: GameState, line: ProductionLine, sp: SpeciesDefinition, hour: number): boolean {
  const raise = state.tanks[line.tanks.raise];
  if (!raise) return false;
  if (!holdsLineYoung(state, line, raise.id)) return false;
  return youngPlaces(state, raise, sp, hour, youngSizeCm(state, line, sp)) < sp.breeding.maxRaisedPerClutch;
}

/** The phenotype rule ids (traits) a creature shows: its base and overlays. */
export function traitsOf(sp: SpeciesDefinition, c: Creature): string[] {
  try {
    const m = resolveMorph(sp, c.genome);
    return m.baseId ? [m.baseId, ...m.overlayIds] : m.overlayIds;
  } catch {
    return [];
  }
}

/** The traits the pair's young can show (the Sort sheet's choices), named. */
export function pairTraits(state: GameState, line: Pick<ProductionLine, 'pair' | 'speciesId'>): { id: string; name: string }[] {
  const sp = findSpecies(line.speciesId);
  const m = state.creatures[line.pair.motherId];
  const f = state.creatures[line.pair.fatherId];
  if (!sp || !m || !f) return [];
  const seen = new Set<string>();
  const out: { id: string; name: string }[] = [];
  let morphs: { morphName: string }[] = [];
  try {
    morphs = predictOffspringMorphs(sp, m.genome, f.genome);
  } catch {
    morphs = [];
  }
  for (const p of morphs) {
    for (const id of catalogEntry(sp, p.morphName)?.traitIds ?? []) {
      const r = sp.genetics.phenotypes.find((x) => x.id === id);
      if (!r || seen.has(r.id) || !r.name || r.when.length === 0 || /wild/i.test(r.name)) continue;
      seen.add(r.id);
      out.push({ id: r.id, name: r.name });
    }
  }
  return out;
}

/** The pair's reachable morphs (the "Breed for" choices), most likely first. */
export function breedForOptions(state: GameState, motherId: string, fatherId: string): { morphName: string; label: string; chance: number }[] {
  const m = state.creatures[motherId];
  const f = state.creatures[fatherId];
  const sp = m ? findSpecies(m.speciesId) : undefined;
  if (!m || !f || !sp) return [];
  try {
    return predictOffspringMorphs(sp, m.genome, f.genome).map((p) => ({ morphName: p.morphName, label: morphDisplayName(sp, p.morphName), chance: p.chance }));
  } catch {
    return [];
  }
}

// ───────────────────────────── names and ids ─────────────────────────────

/** "{Morph} line": the morph's first name part ("Royal Blue Butterfly Halfmoon" → "Royal Blue Butterfly Halfmoon line"). */
export function morphLineName(sp: SpeciesDefinition, breedFor: string | undefined): string {
  const morph = breedFor && !/^wild[\s-]?type$/i.test(breedFor.trim()) ? breedFor.trim() : sp.commonName;
  return `${morph} line`;
}

/** The 0.5 name a single line keeps: "{Species} line" ("Betta line"). */
export function speciesLineName(sp: SpeciesDefinition): string {
  return `${sp.commonName} line`;
}

/** Route id: the first word of the morph's name in lower case, `-2`, `-3` when taken; `new` is reserved (§8.6.1). */
export function lineIdFor(state: GameState, sp: SpeciesDefinition, breedFor: string | undefined): string {
  const source = breedFor && breedFor.trim() ? breedFor : sp.commonName;
  let base = (source.trim().split(/\s+/)[0] ?? 'line').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'line';
  if (base === 'new') base = 'new-line';
  const taken = new Set(productionLines(state).map((l) => l.id));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${taken.size + 1}`;
}

/** Default names: one line keeps "{Species} line"; with several, lines on default names take their morph names. */
function applyDefaultNames(state: GameState): void {
  const lines = productionLines(state);
  for (const l of lines) {
    if (l.customName) continue;
    const sp = findSpecies(l.speciesId);
    if (!sp) continue;
    if (lines.length >= 2) l.name = morphLineName(sp, l.breedFor);
  }
}

// ───────────────────────────── tank checks (set-up step 2) ─────────────────────────────

export type LineStage = 'breed' | 'raise' | 'quarantine' | 'keep';

export interface TankFit {
  ok: boolean;
  /** "Fits", "Shared" (used by another line), or the reason it doesn't fit (ADR-0030 decision 5). */
  status: 'fits' | 'shared' | 'no';
  reason?: string;
  /** Places for young (raise, quarantine, keep). */
  places?: number;
}

const STAGE_WORD: Record<LineStage, string> = { breed: 'breed', raise: 'raise', quarantine: 'quarantine', keep: 'keepers' };

/** The stage a line uses a tank for, if any (its quarantine tanks all count). */
function stageOf(line: ProductionLine, tankId: string): LineStage | null {
  if (line.tanks.breed === tankId) return 'breed';
  if (line.tanks.raise === tankId) return 'raise';
  if (line.tanks.quarantine.includes(tankId)) return 'quarantine';
  if (line.tanks.keep === tankId) return 'keep';
  return null;
}

/** The compatibility engine's temperament reasons: fights, fin-nipping, predation (space is the places check's). */
const TEMPERAMENT: ReadonlySet<string> = new Set(['aggression', 'predation', 'social']);

/**
 * Temperament (§8.6.1, 0.5 §11.1 item 5, PROD-003): what the stage will hold, previewed with the compatibility engine
 * as any move is. The breed tank gets the pair (only the male, for species the keeper introduces: the female rests
 * elsewhere); the other stages get the pair's young at their raised size. A temperament reason the engine rates a
 * warning or worse (what makes a mix high-risk or incompatible) doesn't fit, with the engine's own words.
 */
function temperamentRisk(state: GameState, sp: SpeciesDefinition, stage: LineStage, t: Tank, pairIds: string[]): { reason?: string } | null {
  let report;
  try {
    if (stage === 'breed') {
      const ids = (moduleFor(sp).introducedByKeeper ? pairIds.slice(1, 2) : pairIds).filter((id) => !!state.creatures[id] && state.creatures[id].tankId !== t.id);
      if (!ids.length) return null;
      report = previewAddition(state, t.id, { speciesId: sp.id, creatureIds: ids });
    } else {
      report = previewAddition(state, t.id, { speciesId: sp.id, count: Math.max(2, Math.min(6, sp.breeding.maxRaisedPerClutch)), sizeCm: sp.adultSizeCm * 0.35 });
    }
  } catch {
    return null;
  }
  const bad = report.reasons.filter((r) => TEMPERAMENT.has(r.category) && (r.severity === 'critical' || r.severity === 'warning'));
  if (!bad.length) return null;
  return { reason: (bad.find((r) => r.severity === 'critical') ?? bad[0]).text };
}

/**
 * Can this tank serve this stage of a line (water type, temperament and space, §8.6.1)? `chosen` is the line's other
 * stages so far (a tank can't serve two stages of one line); `pairIds` is [mother, father]; `ignoreLineId` leaves a line
 * out of the checks against other lines. Lines may share tanks, but never a keep tank with another line's other stages
 * (its animals are protected, ADR-0025 decision 4: a batch moved into it could never be listed, and young never leave it).
 */
export function tankFitFor(state: GameState, speciesId: string, stage: LineStage, tankId: string, chosen: Partial<Record<LineStage, string>>, pairIds: string[] = [], ignoreLineId?: string): TankFit {
  const sp = findSpecies(speciesId);
  const t = state.tanks[tankId];
  if (!sp || !t) return { ok: false, status: 'no', reason: 'That tank doesn’t exist.' };
  for (const [k, id] of Object.entries(chosen) as [LineStage, string][]) {
    if (k !== stage && id === tankId) return { ok: false, status: 'no', reason: `Already the ${STAGE_WORD[k]} tank` };
  }
  for (const l of productionLines(state)) {
    if (l.id === ignoreLineId) continue;
    const theirs = stageOf(l, tankId);
    if (theirs && (theirs === 'keep') !== (stage === 'keep')) return { ok: false, status: 'no', reason: `Already ${l.name}’s ${STAGE_WORD[theirs]} tank` };
  }
  const gate = environmentGate(sp, t);
  if (!gate.ok) return { ok: false, status: 'no', reason: gate.reason ?? `${t.name} isn’t suitable.` };
  const temp = t.water.tempC;
  // today's water and temperature messages (moveClutch's wording)
  if (temp < sp.tempC.min || temp > sp.tempC.max) return { ok: false, status: 'no', reason: `${t.name} is ${fmtTemp(temp)} — outside the safe range for ${spPlural(sp)} (${sp.tempC.min}–${sp.tempC.max} °C).` };
  let places: number | undefined;
  if (stage !== 'breed') {
    places = juvenileSlots(state, t, sp, state.clock.hour, sp.adultSizeCm * 0.35);
    if (places < 1) return { ok: false, status: 'no', reason: 'No room for young', places: 0 };
  }
  const risk = temperamentRisk(state, sp, stage, t, pairIds);
  if (risk) return { ok: false, status: 'no', reason: risk.reason, places };
  const shared = productionLines(state).some((l) => l.id !== ignoreLineId && lineTankIds(l).includes(tankId));
  return { ok: true, status: shared ? 'shared' : 'fits', places };
}

// ───────────────────────────── creating and changing lines ─────────────────────────────

export interface NewLineSpec {
  motherId: string;
  fatherId: string;
  tanks: { breed: string; raise: string; quarantine: string; keep: string };
  breedFor?: string;
  /** A name the player typed (blank or the default = follow the naming rule). */
  name?: string;
  rules?: Partial<ProductionLine['rules']>;
}

/** The pair a line can use, as (female, male): adults that can breed together, in no other line (§8.6.1, PROD-004). */
export function linePairCheck(state: GameState, aId: string, bId: string): { ok: boolean; message: string; motherId?: string; fatherId?: string; inLine?: string } {
  const a = state.creatures[aId];
  const b = state.creatures[bId];
  if (!a || !b || a.status === 'dead' || a.status === 'sold' || b.status === 'dead' || b.status === 'sold') return { ok: false, message: 'One of those animals could not be found.' };
  const taken = lineOfParent(state, a.id) ?? lineOfParent(state, b.id);
  if (taken) return { ok: false, message: `${taken.name} already uses ${lineOfParent(state, a.id) ? a.name : b.name}.`, inLine: taken.name };
  const ev = evaluatePair(state, a.id, b.id);
  if (!ev.sp || !ev.mod || !ev.male || !ev.female) return { ok: false, message: ev.reasons[0] ?? 'These two can’t breed.' };
  if (!ev.mod.breedable) return { ok: false, message: ev.mod.explain?.(ev.sp) ?? ev.reasons[0] ?? 'This species can’t be bred here yet.' };
  const hour = state.clock.hour;
  if (!isMature(ev.male, ev.sp, hour) || !isMature(ev.female, ev.sp, hour)) return { ok: false, message: ev.reasons[0] ?? 'Both need to be adults.' };
  // A male and a female (any two for simultaneous hermaphrodites): a role problem is one of evaluatePair's hard reasons.
  if (ev.sp.sexSystem !== 'simultaneous_hermaphrodite' && !(effectiveRole(ev.male, ev.sp, hour) === 'male' && effectiveRole(ev.female, ev.sp, hour) === 'female')) {
    return { ok: false, message: ev.startBlockers[0] ?? ev.reasons[0] ?? 'These two can’t breed.' };
  }
  return { ok: true, message: 'ok', motherId: ev.female.id, fatherId: ev.male.id };
}

/** Pairs listed per species: a big colony (20 shrimp make 100 pairs) mustn't crowd out every other species. */
export const PAIRS_PER_SPECIES = 30;

/**
 * Pairs a new line could use (§8.6.1 step 1): every adult pair that can breed together, with lines' pairs marked, up to
 * PAIRS_PER_SPECIES per species (ready pairs first); `speciesId` lists one species ("Choose another pair").
 */
export function candidatePairs(state: GameState, speciesId?: string): { motherId: string; fatherId: string; speciesId: string; inLine?: string; ready: boolean }[] {
  const adults = Object.values(state.creatures).filter((c) => c.status === 'alive' && !!c.tankId && (!speciesId || c.speciesId === speciesId));
  const bySpecies = new Map<string, Creature[]>();
  for (const c of adults) {
    const sp = findSpecies(c.speciesId);
    if (!sp || !moduleFor(sp).breedable || !isMature(c, sp, state.clock.hour)) continue;
    bySpecies.set(c.speciesId, [...(bySpecies.get(c.speciesId) ?? []), c]);
  }
  const out: { motherId: string; fatherId: string; speciesId: string; inLine?: string; ready: boolean }[] = [];
  const seen = new Set<string>();
  for (const [spId, list] of [...bySpecies.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    const mine: typeof out = [];
    const sorted = [...list].sort((x, y) => (x.id < y.id ? -1 : 1));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const ev = evaluatePair(state, a.id, b.id);
        if (!ev.male || !ev.female || !ev.mod?.breedable || !ev.sp) continue;
        if (ev.sp.sexSystem !== 'simultaneous_hermaphrodite' && !(effectiveRole(ev.male, ev.sp, state.clock.hour) === 'male' && effectiveRole(ev.female, ev.sp, state.clock.hour) === 'female')) continue;
        const key = `${ev.female.id}|${ev.male.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const lf = lineOfParent(state, ev.female.id);
        const lm = lineOfParent(state, ev.male.id);
        // a line's own pair is listed but disabled; a pair splitting a line's parent from its partner isn't listed
        if ((lf || lm) && !(lf && lf === lm && lf.pair.motherId === ev.female.id && lf.pair.fatherId === ev.male.id)) continue;
        const line = lf;
        mine.push({ motherId: ev.female.id, fatherId: ev.male.id, speciesId: spId, ...(line ? { inLine: line.name } : {}), ready: !line && isReady(ev.female) && isReady(ev.male) });
      }
    }
    // a line's own pair first, then ready pairs; the order is otherwise by id (stable)
    const rank = (p: (typeof out)[number]) => (p.inLine ? 0 : p.ready ? 1 : 2);
    out.push(...mine.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).slice(0, PAIRS_PER_SPECIES).map((x) => x.p));
  }
  return out;
}

/** A creature that becomes a line's parent leaves every line's batches: it belongs to one line (the parent role wins). */
function claimParents(state: GameState, ids: string[]): void {
  for (const l of productionLines(state)) {
    if (!l.batches) continue;
    for (const b of l.batches) b.creatureIds = b.creatureIds.filter((id) => !ids.includes(id));
    l.batches = l.batches.filter((b) => b.creatureIds.length > 0 || (b.listingIds?.length ?? 0) > 0);
    if (!l.batches.length) delete l.batches;
  }
}

function freshStats(hour: number): ProductionLine['stats'] {
  return { weekStartHour: hour, soldCount: 0, revenue: 0, costs: 0, totalSold: 0, totalRevenue: 0, totalCosts: 0 };
}

function ensureProduction(state: GameState): ProductionState {
  if (!state.production) state.production = { lines: [] };
  return state.production;
}

/** Start line (§8.6.1): validates everything, creates the line and moves the pair into place. */
export function createLine(state: GameState, spec: NewLineSpec): ActionResult & { lineId?: string } {
  if (productionLines(state).length >= lineSlots(state)) return no('Every line slot is in use.');
  const pair = linePairCheck(state, spec.motherId, spec.fatherId);
  if (!pair.ok || !pair.motherId || !pair.fatherId) return no(pair.message);
  const mother = state.creatures[pair.motherId];
  const father = state.creatures[pair.fatherId];
  const sp = findSpecies(mother.speciesId)!;
  const chosen: Record<LineStage, string> = { breed: spec.tanks.breed, raise: spec.tanks.raise, quarantine: spec.tanks.quarantine, keep: spec.tanks.keep };
  for (const stage of ['breed', 'raise', 'quarantine', 'keep'] as LineStage[]) {
    const fit = tankFitFor(state, sp.id, stage, chosen[stage], chosen, [mother.id, father.id]);
    if (!fit.ok) return no(fit.reason ?? 'That tank doesn’t fit.');
  }
  const keeper = !!moduleFor(sp).introducedByKeeper;
  const hour = state.clock.hour;
  // Move the pair into place: the male (and, for pairs that live together, the female) into the breed tank. A female the
  // keeper introduces rests in her own tank, or the keep tank if she lived with the male (ADR-0030 decision 7).
  const restTankId = keeper ? (mother.tankId && mother.tankId !== spec.tanks.breed ? mother.tankId : spec.tanks.keep) : undefined;
  for (const c of keeper ? [father] : [mother, father]) {
    if (c.tankId === spec.tanks.breed) continue;
    const r = moveCreature(state, c.id, spec.tanks.breed);
    if (!r.ok) return no(r.message);
  }
  const prod = ensureProduction(state);
  const id = lineIdFor(state, sp, spec.breedFor);
  const typed = spec.name?.trim();
  const line: ProductionLine = {
    id,
    name: '',
    speciesId: sp.id,
    ...(spec.breedFor ? { breedFor: spec.breedFor } : {}),
    pair: { motherId: mother.id, fatherId: father.id, ...(restTankId ? { restTankId } : {}) },
    tanks: { breed: spec.tanks.breed, raise: spec.tanks.raise, quarantine: [spec.tanks.quarantine], keep: spec.tanks.keep },
    running: true,
    rules: { pauseWhenFull: spec.rules?.pauseWhenFull ?? true, keepPrismatic: spec.rules?.keepPrismatic ?? true, autoList: spec.rules?.autoList ?? true, keep: sanitizeKeepRules(spec.rules?.keep ?? []) },
    stats: freshStats(hour),
    createdHour: hour,
  };
  prod.lines.push(line);
  const defaultName = prod.lines.length >= 2 ? morphLineName(sp, spec.breedFor) : speciesLineName(sp);
  if (typed && typed !== defaultName) {
    line.name = typed.slice(0, 40);
    line.customName = true;
  } else line.name = defaultName;
  applyDefaultNames(state);
  claimParents(state, [mother.id, father.id]);
  return { ok: true, message: `${line.name} started`, lineId: id };
}

function sanitizeKeepRules(rules: ProductionKeepRule[]): ProductionKeepRule[] {
  return rules
    .filter((r) => r && Array.isArray(r.traitIds) && r.traitIds.length > 0)
    .map((r) => ({ traitIds: r.traitIds.filter((x) => typeof x === 'string').slice(0, 4), count: Math.max(1, Math.min(12, Math.round(Number(r.count) || 1))) }))
    .slice(0, 6);
}

/** The line switch (header card; PROD-009). Off = paused by the player: nothing new is bred, moved or listed. */
export function setLineRunning(state: GameState, lineId: string, on: boolean): ActionResult {
  const line = findLine(state, lineId);
  if (!line) return no('That line isn’t here any more.');
  line.running = !!on;
  syncHolds(state, line);
  return ok(on ? `${line.name} running` : `${line.name} paused`);
}

export function setLineRule(state: GameState, lineId: string, rule: 'pauseWhenFull' | 'keepPrismatic' | 'autoList', on: boolean): ActionResult {
  const line = findLine(state, lineId);
  if (!line) return no('That line isn’t here any more.');
  line.rules[rule] = !!on;
  if (rule === 'pauseWhenFull' && !on && line.waiting) {
    line.waiting = false;
    syncHolds(state, line);
  }
  return ok('');
}

export function setKeepRules(state: GameState, lineId: string, rules: ProductionKeepRule[]): ActionResult {
  const line = findLine(state, lineId);
  if (!line) return no('That line isn’t here any more.');
  line.rules.keep = sanitizeKeepRules(rules);
  return ok('');
}

export function renameLine(state: GameState, lineId: string, name: string): ActionResult {
  const line = findLine(state, lineId);
  if (!line) return no('That line isn’t here any more.');
  const t = name.trim().slice(0, 40);
  if (!t) return no('Give the line a name.');
  line.name = t;
  line.customName = true;
  return ok('');
}

/** End line (ADR-0025 decision 6): the animals stay where they are, the slot frees, the numbers go to its history. */
export function endLine(state: GameState, lineId: string): ActionResult {
  const prod = state.production;
  const line = findLine(state, lineId);
  if (!prod || !line) return no('That line isn’t here any more.');
  prod.lines = prod.lines.filter((l) => l !== line);
  for (const id of [line.pair.motherId, line.pair.fatherId]) {
    const c = state.creatures[id];
    if (c?.repro?.lineHold) delete c.repro.lineHold;
  }
  const s = line.stats;
  prod.ended = [...(prod.ended ?? []), { id: line.id, name: line.name, speciesId: line.speciesId, createdHour: line.createdHour, endedHour: state.clock.hour, totalSold: s.totalSold, totalRevenue: s.totalRevenue, totalCosts: s.totalCosts }].slice(-ENDED_KEPT);
  return ok(`${line.name} ended`);
}

/** "Choose another pair" (ADR-0030 decision 2): a new pair for a line, checked like a new line's. */
export function setLinePair(state: GameState, lineId: string, aId: string, bId: string): ActionResult {
  const line = findLine(state, lineId);
  if (!line) return no('That line isn’t here any more.');
  const own = [line.pair.motherId, line.pair.fatherId];
  const others = productionLines(state).filter((l) => l !== line);
  if (others.some((l) => isLineParent(l, aId) || isLineParent(l, bId))) return no('That pair already runs another line.');
  const saved = state.production!.lines;
  let pair: ReturnType<typeof linePairCheck>;
  state.production!.lines = others; // check the pair without this line's own claim
  try {
    pair = linePairCheck(state, aId, bId);
  } finally {
    state.production!.lines = saved;
  }
  if (!pair.ok || !pair.motherId || !pair.fatherId) return no(pair.message);
  const mother = state.creatures[pair.motherId];
  if (mother.speciesId !== line.speciesId) return no(`This line breeds ${findSpecies(line.speciesId)?.commonName.toLowerCase() ?? 'another species'}s.`);
  const keeper = !!moduleFor(findSpecies(line.speciesId)!).introducedByKeeper;
  for (const id of own) {
    const c = state.creatures[id];
    if (c?.repro?.lineHold) delete c.repro.lineHold;
  }
  const father = state.creatures[pair.fatherId];
  for (const c of keeper ? [father] : [mother, father]) {
    if (c.tankId === line.tanks.breed) continue;
    const r = moveCreature(state, c.id, line.tanks.breed);
    if (!r.ok) return no(r.message);
  }
  line.pair = { motherId: mother.id, fatherId: father.id, ...(keeper ? { restTankId: mother.tankId && mother.tankId !== line.tanks.breed ? mother.tankId : line.tanks.keep } : {}) };
  claimParents(state, [mother.id, father.id]);
  line.routed = undefined;
  line.sortedThroughHour = state.clock.hour;
  clearBroken(line);
  return ok('');
}

/** "Choose another tank" (ADR-0030 decision 2): a new tank for a stage, checked like set-up step 2. */
export function setLineTank(state: GameState, lineId: string, stage: LineStage, tankId: string, replace?: string): ActionResult {
  const line = findLine(state, lineId);
  if (!line) return no('That line isn’t here any more.');
  const chosen: Partial<Record<LineStage, string>> = { breed: line.tanks.breed, raise: line.tanks.raise, quarantine: line.tanks.quarantine[0], keep: line.tanks.keep };
  delete chosen[stage];
  const fit = tankFitFor(state, line.speciesId, stage, tankId, chosen, [line.pair.motherId, line.pair.fatherId], line.id);
  if (!fit.ok) return no(fit.reason ?? 'That tank doesn’t fit.');
  if (stage === 'breed') {
    // the pair moves to its new breed tank (a keeper-introduced female stays where she rests)
    const keeper = !!moduleFor(findSpecies(line.speciesId)!).introducedByKeeper;
    for (const id of keeper ? [line.pair.fatherId] : [line.pair.motherId, line.pair.fatherId]) {
      const c = state.creatures[id];
      if (!c || c.status !== 'alive' || c.tankId === tankId) continue;
      const r = moveCreature(state, c.id, tankId);
      if (!r.ok) return no(r.message);
    }
  }
  if (stage === 'quarantine') {
    const qs = line.tanks.quarantine.filter((id) => id !== replace && !!state.tanks[id]);
    line.tanks.quarantine = [tankId, ...qs.filter((id) => id !== tankId)];
  } else if (stage === 'breed' || stage === 'raise' || stage === 'keep') {
    line.tanks[stage] = tankId;
    if (stage === 'keep' && line.pair.restTankId && !state.tanks[line.pair.restTankId]) line.pair.restTankId = tankId;
  }
  clearBroken(line);
  return ok('');
}

/** The tier and water a new quarantine tank copies: the line's first quarantine tank, else its raise tank. */
export function quarantineKit(state: GameState, lineId: string): { tierId: string; waterClass: Tank['waterClass']; like: string; price: number; seededPrice: number } | null {
  const line = findLine(state, lineId);
  if (!line) return null;
  const model = line.tanks.quarantine.map((id) => state.tanks[id]).find(Boolean) ?? state.tanks[line.tanks.raise];
  if (!model) return null;
  const plain = tankKitPrice(model.tierId, model.waterClass, false, state);
  const seeded = tankKitPrice(model.tierId, model.waterClass, true, state);
  return { tierId: model.tierId, waterClass: model.waterClass, like: model.name, price: plain.total, seededPrice: seeded.total };
}

/**
 * "Add a quarantine tank" (ADR-0025 decision 5, ADR-0030 decision 3): a real kit purchase (Build's price, today's
 * no-money and no-space messages), seeded media optional, the tank assigned to the line as its next quarantine tank.
 */
export function addQuarantineTank(state: GameState, lineId: string, seeded: boolean): ActionResult & { tankId?: string; tankName?: string; tierName?: string; price?: number; restartDay?: number } {
  const line = findLine(state, lineId);
  const kit = quarantineKit(state, lineId);
  if (!line || !kit) return no('That line isn’t here any more.');
  const names = new Set(Object.values(state.tanks).map((t) => t.name));
  let n = 2;
  while (names.has(`Quarantine ${n}`)) n++;
  const name = `Quarantine ${n}`;
  const before = state.finance.money;
  const r = buyTank(state, kit.tierId, kit.waterClass, undefined, { seeded, name });
  if (!r.ok || !r.tankId) return no(r.message);
  const tank = state.tanks[r.tankId];
  tank.purpose = 'quarantine';
  line.tanks.quarantine = [...line.tanks.quarantine.filter((id) => !!state.tanks[id]), tank.id];
  const ready = quarantineReady(tank);
  return {
    ok: true,
    message: r.message,
    tankId: tank.id,
    tankName: tank.name,
    tierName: TANK_TIER_BY_ID[tank.tierId]?.name ?? tank.tierId,
    price: roundCents(before - state.finance.money),
    ...(ready ? { restartDay: restartDay(state, line) } : {}),
  };
}

/**
 * The day the line's waiting young can move on (and a held line restart): today if a batch is waiting and a ready
 * quarantine tank is free, else the day the busy one frees up, else the day the raise tank's brood is raised.
 */
export function restartDay(state: GameState, line: ProductionLine): number {
  const now = state.clock.hour;
  const day = (h: number) => Math.floor(h / 24) + 1;
  const waiting = (line.batches ?? []).some((b) => !b.tankId);
  const busyUntil = line.tanks.quarantine
    .map((id) => quarantineBusyUntil(state, id))
    .filter((h): h is number => h !== null);
  const freeNow = line.tanks.quarantine.some((id) => state.tanks[id] && quarantineBusyUntil(state, id) === null && quarantineReady(state.tanks[id]));
  if (waiting) return freeNow || !busyUntil.length ? day(now) : day(Math.min(...busyUntil));
  const brood = Object.values(state.clutches).find((cl) => cl.tankId === line.tanks.raise && cl.motherId === line.pair.motherId && cl.fatherId === line.pair.fatherId);
  return brood ? day(Math.max(now, brood.nextStageHour)) : day(now);
}

/** When the batch quarantined in a tank finishes its hold (any line), or null when the tank is free. */
export function quarantineBusyUntil(state: GameState, tankId: string): number | null {
  let until: number | null = null;
  for (const l of productionLines(state)) {
    for (const b of l.batches ?? []) {
      if (b.tankId !== tankId || b.released || b.quarantinedHour === undefined) continue;
      const end = b.quarantinedHour + QUARANTINE_HOURS;
      until = until === null ? end : Math.max(until, end);
    }
  }
  return until;
}

// ───────────────────────────── the hourly step ─────────────────────────────

/** Run every line once for each whole game hour in [startHour, endHour) not already run (0.5 §11.3). */
export function stepProduction(state: GameState, startHour: number, endHour: number): void {
  const prod = state.production;
  if (!prod || !prod.lines.length) return;
  for (let h = Math.ceil(startHour - 1e-9); h < endHour - 1e-9; h++) {
    if (prod.lastHour !== undefined && h <= prod.lastHour) continue;
    prod.lastHour = h;
    for (const line of [...prod.lines]) {
      try {
        stepLine(state, line, h);
      } catch (e) {
        // A line must never stop the world: report and carry on (the next hour tries again). Each action the line took
        // before the error was a whole action (a move, a listing), so they stay; nothing is half-done or rolled back.
        if (typeof console !== 'undefined') console.warn('production line step failed', line.id, e);
      }
    }
  }
}

function notice(state: GameState, line: ProductionLine, key: string, hour: number, e: { kind: 'info' | 'warning'; text: string; tankId?: string; creatureId?: string; toast?: boolean }): void {
  const seen = (line.noticed ??= {});
  if (seen[key] !== undefined) return;
  seen[key] = hour;
  emitEvent(state, e);
}

function forget(line: ProductionLine, prefix: string): void {
  if (!line.noticed) return;
  for (const k of Object.keys(line.noticed)) if (k.startsWith(prefix)) delete line.noticed[k];
  if (!Object.keys(line.noticed).length) delete line.noticed;
}

function clearBroken(line: ProductionLine): void {
  if (!line.broken) return;
  delete line.broken;
  forget(line, 'broken:');
}

/** Pair members held from spawning while the line is paused, waiting or broken (readinessTarget reads the flag). */
function syncHolds(state: GameState, line: ProductionLine): void {
  const hold = !line.running || !!line.waiting || !!line.broken || isHeld(state, 'lines');
  for (const id of [line.pair.motherId, line.pair.fatherId]) {
    const c = state.creatures[id];
    if (!c || !c.repro) continue;
    if (hold) c.repro.lineHold = true;
    else if (c.repro.lineHold) delete c.repro.lineHold;
  }
}

/** A tank's name for notices: its own, or the last one the line saw (a sold or deleted tank keeps its last name). */
function tankName(state: GameState, line: ProductionLine, id: string): string {
  return state.tanks[id]?.name ?? line.tankNames?.[id] ?? 'A tank';
}

/** Remember the line's tanks' names while they exist. */
function noteTankNames(state: GameState, line: ProductionLine): void {
  const names: Record<string, string> = {};
  for (const id of lineTankIds(line)) {
    const n = state.tanks[id]?.name ?? line.tankNames?.[id];
    if (n) names[id] = n;
  }
  line.tankNames = names;
}

/** What, if anything, the line is missing (ADR-0025 decision 10). */
function findBroken(state: GameState, line: ProductionLine, keeper: boolean): ProductionLine['broken'] | null {
  const hour = state.clock.hour;
  const gone = (c: Creature | undefined) => !c || c.status === 'dead' || c.status === 'sold';
  for (const [ref, id] of [['mother', line.pair.motherId], ['father', line.pair.fatherId]] as [ProductionRef, string][]) {
    const c = state.creatures[id];
    if (gone(c)) return { ref, id, name: c?.name ?? findSpecies(line.speciesId)?.commonName ?? 'A parent', sinceHour: hour };
  }
  for (const [ref, id] of [['breed', line.tanks.breed], ['raise', line.tanks.raise], ['keep', line.tanks.keep]] as [ProductionRef, string][]) {
    if (!state.tanks[id]) return { ref, id, name: line.broken?.id === id ? line.broken.name : tankName(state, line, id), sinceHour: hour };
  }
  if (!line.tanks.quarantine.some((id) => !!state.tanks[id])) {
    const id = line.tanks.quarantine[0] ?? '';
    return { ref: 'quarantine', id, name: line.broken?.id === id ? line.broken.name : tankName(state, line, id), sinceHour: hour };
  }
  // A parent the player moved away (PROD-017 A2): the male, and a female who doesn't rest elsewhere, belong in the
  // breed tank; a keeper-introduced female is in the breed tank or her resting tank.
  const mother = state.creatures[line.pair.motherId];
  const father = state.creatures[line.pair.fatherId];
  if (father.tankId !== line.tanks.breed) return { ref: 'father', id: father.id, name: father.name, sinceHour: hour, moved: true };
  const motherOk = keeper ? mother.tankId === line.tanks.breed || mother.tankId === (line.pair.restTankId ?? line.tanks.keep) : mother.tankId === line.tanks.breed;
  if (!motherOk) return { ref: 'mother', id: mother.id, name: mother.name, sinceHour: hour, moved: true };
  return null;
}

function brokenText(state: GameState, line: ProductionLine, b: NonNullable<ProductionLine['broken']>): string {
  if (b.moved) {
    const breed = state.tanks[line.tanks.breed]?.name ?? 'the breed tank';
    return `${line.name} paused: ${b.name} isn’t in ${breed}. Move ${b.name} back, or choose another pair.`;
  }
  if (b.ref === 'mother' || b.ref === 'father') return `${line.name} paused: ${b.name} is no longer in your care. Choose another pair, or end the line.`;
  return `${line.name} paused: ${b.name} is gone. Choose another tank, or end the line.`;
}

/** A paused line's notice, for its note (ADR-0030 decision 2); '' while nothing is missing. */
export function lineNoticeText(state: GameState, line: ProductionLine): string {
  return line.broken ? brokenText(state, line, line.broken) : '';
}

function rollWeek(line: ProductionLine, hour: number): void {
  const s = line.stats;
  if (!(hour >= s.weekStartHour + WEEK_HOURS)) return;
  const weeks = Math.floor((hour - s.weekStartHour) / WEEK_HOURS);
  s.weekStartHour += weeks * WEEK_HOURS;
  s.soldCount = 0;
  s.revenue = 0;
  s.costs = 0;
}

/** The line's hourly share of its tanks' running costs (power: tankDailyCost / 24). */
function chargePower(state: GameState, line: ProductionLine): void {
  for (const id of lineTankIds(line)) {
    const t = state.tanks[id];
    if (!t) continue;
    const share = lineShare(state, line, id);
    if (!(share > 0)) continue;
    let daily = 0;
    try {
      daily = Math.max(0, tankDailyCost(state, t));
    } catch {
      daily = 0;
    }
    chargeLine(line, (daily / 24) * share);
  }
}

/** Sales of the line's listings count once each (PROD-015); closed listings leave the batch. */
function countSales(state: GameState, line: ProductionLine): void {
  for (const b of line.batches ?? []) {
    if (!b.listingIds?.length) continue;
    const open: string[] = [];
    for (const id of b.listingIds) {
      const l = state.market.listings.find((x) => x.id === id);
      if (!l) continue;
      if (l.status === 'active') {
        open.push(id);
        continue;
      }
      if (l.status === 'sold') {
        const n = l.creatureIds.length;
        const v = roundCents(l.soldFor ?? 0);
        line.stats.soldCount += n;
        line.stats.revenue = roundCents(line.stats.revenue + v);
        line.stats.totalSold += n;
        line.stats.totalRevenue = roundCents(line.stats.totalRevenue + v);
      }
    }
    b.listingIds = open.length ? open : undefined;
  }
  // A batch is done once its hold ended and none of its listings is still open.
  if (line.batches) {
    line.batches = line.batches.filter((b) => !(b.released && !b.listingIds?.length));
    if (!line.batches.length) delete line.batches;
  }
}

function stepLine(state: GameState, line: ProductionLine, hour: number): void {
  const sp = findSpecies(line.speciesId);
  if (!sp) return;
  const mod = moduleFor(sp);
  const keeper = !!mod.introducedByKeeper;
  settleTanks(state, [...lineTankIds(line), state.creatures[line.pair.motherId]?.tankId, state.creatures[line.pair.fatherId]?.tankId]);
  countSales(state, line); // sales closed during the hour that just ended count in its week
  rollWeek(line, hour);
  chargePower(state, line);
  if (state.tanks[line.tanks.breed] || state.tanks[line.tanks.raise]) noteTankNames(state, line);
  // a sold extra quarantine tank leaves the list (with none left, the line is missing its quarantine tank, below)
  if (line.tanks.quarantine.length > 1 && line.tanks.quarantine.some((id) => !state.tanks[id]) && line.tanks.quarantine.some((id) => !!state.tanks[id])) {
    line.tanks.quarantine = line.tanks.quarantine.filter((id) => !!state.tanks[id]);
  }
  pruneBatches(state, line);
  pruneNoticed(state, line);

  // Missing parent or tank: pause with one notice per incident, kept until fixed (ADR-0025 decision 10).
  const broken = findBroken(state, line, keeper);
  if (broken) {
    const key = `broken:${broken.ref}:${broken.id}:${broken.moved ? 'moved' : 'gone'}`;
    if (!line.broken || line.broken.ref !== broken.ref || line.broken.id !== broken.id || !!line.broken.moved !== !!broken.moved) {
      forget(line, 'broken:');
      line.broken = broken;
    }
    notice(state, line, key, hour, { kind: 'warning', text: brokenText(state, line, line.broken), tankId: state.tanks[line.tanks.breed] ? line.tanks.breed : undefined, creatureId: broken.ref === 'mother' || broken.ref === 'father' ? broken.id : undefined, toast: true });
    syncHolds(state, line);
    if (keeper) tendFemale(state, line, sp, true); // a courting female still goes back to rest
    return;
  }
  clearBroken(line);

  // Waiting for room (Pause when a tank is full): hold the pair until the raise tank can take the next clutch.
  const full = line.rules.pauseWhenFull && raiseTankFull(state, line, sp, hour);
  if (full !== !!line.waiting) {
    const raise = state.tanks[line.tanks.raise];
    const m = state.creatures[line.pair.motherId];
    const f = state.creatures[line.pair.fatherId];
    if (full) {
      line.waiting = true;
      // lane:automation (chunk 5, DESIGN-S3D §8.9) — the Automation notification "{Line} paused" carries the restart day
      if (line.running)
        emitEvent(state, {
          kind: 'info',
          text: `${raise?.name ?? 'The raise tank'} is full, so ${m?.name ?? 'the pair'} and ${f?.name ?? 'its partner'} are kept apart until there's room.`,
          tankId: line.tanks.raise,
          notice: { topic: 'line_paused', vars: { line: line.name, lineId: line.id, tank: raise?.name ?? 'The raise tank', pair: `${m?.name ?? 'the pair'} and ${f?.name ?? 'its partner'}`, day: restartDay(state, line) } },
        });
    } else {
      delete line.waiting;
      if (state.automation?.lineWait?.[line.id] !== undefined) delete state.automation.lineWait[line.id]; // lane:automation — the wait is over
      if (line.running) emitEvent(state, { kind: 'info', text: `${line.name} is running again: ${raise?.name ?? 'the raise tank'} has room.`, tankId: line.tanks.raise });
    }
  }
  syncHolds(state, line);
  const held = isHeld(state, 'lines'); // lane:automation (chunk 5, AUTO-036) — manual mode holds every line as a pause does
  if (keeper) tendFemale(state, line, sp, !line.running || held || !!line.waiting);
  if (!line.running || held) return; // paused by the player, or held: nothing is moved, sorted or listed (PROD-009)

  routeBroods(state, line, sp, hour);
  sortYoung(state, line, sp, hour);
  quarantine(state, line, sp, hour);
  release(state, line, sp, hour);
}

/** Bettas: bring the ready female to the male's nest, and move her back after spawning (ADR-0030 decision 7). */
function tendFemale(state: GameState, line: ProductionLine, sp: SpeciesDefinition, held: boolean): void {
  const f = state.creatures[line.pair.motherId];
  const m = state.creatures[line.pair.fatherId];
  const restId = line.pair.restTankId && state.tanks[line.pair.restTankId] ? line.pair.restTankId : line.tanks.keep;
  if (!f || !m || !state.tanks[restId]) return;
  const inBreed = f.tankId === line.tanks.breed;
  const courting = f.repro.stage === 'courting' || f.repro.stage === 'spawning';
  if (inBreed && !courting) {
    separateCreature(state, f.id, restId);
    return;
  }
  if (inBreed || held || f.tankId !== restId) return;
  // The male still guards a brood in the breed tank: wait (the female would be chased).
  const guarding = Object.values(state.clutches).some((cl) => cl.tankId === line.tanks.breed && cl.guardedById === m.id);
  if (guarding || m.repro.stage !== 'nest_ready' || !isReady(m) || f.repro.stage !== 'gravid') return;
  const ev = evaluatePair(state, m.id, f.id, true);
  if (ev.startBlockers.length) return;
  startBreeding(state, m.id, f.id, line.tanks.breed);
  void sp;
}

/** Raise: each free-swimming brood of the pair in the breed tank moves to the raise tank once (PROD-006). */
function routeBroods(state: GameState, line: ProductionLine, sp: SpeciesDefinition, hour: number): void {
  const raise = state.tanks[line.tanks.raise];
  if (!raise || activeListingFor(state, raise.id)) return; // a tank listed for sale takes nothing new
  const routed = new Set(line.routed ?? []);
  for (const cl of Object.values(state.clutches)) {
    if (cl.tankId !== line.tanks.breed || cl.motherId !== line.pair.motherId || cl.fatherId !== line.pair.fatherId) continue;
    if (routed.has(cl.id) || !(cl.count > 0) || !isFreeSwimming(cl, sp)) continue;
    if (youngPlaces(state, raise, sp, hour, youngSizeCm(state, line, sp)) < 1) {
      notice(state, line, `full:${cl.id}`, hour, { kind: 'warning', text: `${line.name}: the raise tank is full, so the fry stay in ${state.tanks[line.tanks.breed]?.name ?? 'the breed tank'}.`, tankId: line.tanks.breed });
      continue;
    }
    const r = moveClutch(state, cl.id, raise.id);
    if (r.ok) routed.add(cl.id);
  }
  // Keep only broods that still exist.
  const live = [...routed].filter((id) => !!state.clutches[id]);
  line.routed = live.length ? live : undefined;
}

/** Sort: the pair's newly raised young (one sort per brood) — keepers to the keep tank, the rest a batch (PROD-013). */
function sortYoung(state: GameState, line: ProductionLine, sp: SpeciesDefinition, hour: number): void {
  const since = line.sortedThroughHour ?? line.createdHour;
  const inBatch = new Set((line.batches ?? []).flatMap((b) => b.creatureIds));
  const young = Object.values(state.creatures)
    .filter((c) => c.status === 'alive' && isLineYoung(line, c) && (c.tankId === line.tanks.raise || c.tankId === line.tanks.breed) && c.acquiredHour > since + 1e-9 && c.acquiredHour <= hour + 1e-9 && !inBatch.has(c.id))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!young.length) return;
  line.sortedThroughHour = Math.max(since, ...young.map((c) => c.acquiredHour));
  const keep: Creature[] = [];
  let rest = young.filter((c) => !c.favorite); // favourites are protected: never moved
  if (line.rules.keepPrismatic) {
    keep.push(...rest.filter((c) => isPrismatic(c)));
    rest = rest.filter((c) => !isPrismatic(c));
  }
  for (const rule of line.rules.keep) {
    const need = new Set(rule.traitIds);
    const hits = rest
      .filter((c) => !isPrismatic(c) || !line.rules.keepPrismatic)
      .filter((c) => {
        const t = new Set(traitsOf(sp, c));
        for (const id of need) if (!t.has(id)) return false;
        return true;
      })
      .map((c) => ({ c, v: creatureValue(state, c).total }))
      .sort((a, b) => b.v - a.v || (a.c.id < b.c.id ? -1 : a.c.id > b.c.id ? 1 : 0))
      .slice(0, rule.count)
      .map((x) => x.c);
    keep.push(...hits);
    const picked = new Set(hits.map((c) => c.id));
    rest = rest.filter((c) => !picked.has(c.id));
  }
  const keepTank = state.tanks[line.tanks.keep];
  const keepListed = !!keepTank && !!activeListingFor(state, keepTank.id);
  for (const c of keep) {
    const from = c.tankId;
    if (keepListed) continue; // a tank listed for sale takes nothing new: the keeper stays where it is
    if (keepTank && juvenileSlots(state, keepTank, sp, hour, c.sizeCm) >= 1 && moveCreature(state, c.id, keepTank.id).ok) continue;
    notice(state, line, `keepfull:${c.id}`, hour, { kind: 'warning', text: `${line.name}: ${keepTank?.name ?? 'The keep tank'} is full, so ${c.name} stays in ${(from && state.tanks[from]?.name) || 'its tank'}.`, tankId: from ?? undefined, creatureId: c.id });
  }
  if (rest.length) (line.batches ??= []).push({ id: `b${hour}`, creatureIds: rest.map((c) => c.id), sortedHour: hour });
}

/** Drop batch members that died, were sold, listed or moved away by the player, or became favourites (protected). */
function pruneBatches(state: GameState, line: ProductionLine): void {
  if (!line.batches) return;
  for (const b of line.batches) {
    b.creatureIds = b.creatureIds.filter((id) => {
      const c = state.creatures[id];
      if (!c || c.status === 'dead' || c.status === 'sold') return false;
      if (b.released) return true; // listed animals stay counted until their listing closes
      if (c.status === 'listed') return false; // listed (by the player, or by this batch's own partial listing)
      if (c.favorite) return false; // a favourite is protected: never moved or listed by the line
      const where = b.tankId ?? undefined;
      if (where ? c.tankId !== where : c.tankId !== line.tanks.raise && c.tankId !== line.tanks.breed) return false;
      return true;
    });
  }
  line.batches = line.batches.filter((b) => b.creatureIds.length > 0 || (b.listingIds?.length ?? 0) > 0);
  if (!line.batches.length) delete line.batches;
}

/** One-off notices are remembered only while what they're about exists (the save mustn't grow with them, B-171). */
function pruneNoticed(state: GameState, line: ProductionLine): void {
  if (!line.noticed) return;
  const batches = new Set((line.batches ?? []).map((b) => b.id));
  for (const k of Object.keys(line.noticed)) {
    const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
    const c = kind === 'keepfull' ? state.creatures[id] : undefined;
    const stale =
      (kind === 'full' && !state.clutches[id]) ||
      (kind === 'keepfull' && (!c || c.status !== 'alive' || c.tankId === line.tanks.keep)) ||
      (kind === 'list' && !batches.has(id)) ||
      (kind === 'cycle' && (!state.tanks[id] || quarantineReady(state.tanks[id])));
    if (stale) delete line.noticed[k];
  }
  if (!Object.keys(line.noticed).length) delete line.noticed;
}

/**
 * Quarantine: each waiting batch moves into the first free, cycled quarantine tank with room (one batch per tank). A
 * batch held up only because the free tanks aren't cycled says so once per tank (ADR-0030 decision 3: "The juveniles
 * move in once it has cycled.").
 */
function quarantine(state: GameState, line: ProductionLine, sp: SpeciesDefinition, hour: number): void {
  for (const b of line.batches ?? []) {
    if (b.tankId || b.released) continue;
    let uncycled: Tank | null = null;
    for (const qid of line.tanks.quarantine) {
      const qt = state.tanks[qid];
      if (!qt || quarantineBusyUntil(state, qid) !== null || activeListingFor(state, qid)) continue;
      if (!quarantineReady(qt)) {
        uncycled ??= qt;
        continue;
      }
      const moved: string[] = [];
      for (const id of b.creatureIds) {
        const c = state.creatures[id];
        if (!c || juvenileSlots(state, qt, sp, hour, c.sizeCm) < 1) break;
        if (moveCreature(state, c.id, qt.id).ok) moved.push(c.id);
        else break;
      }
      if (!moved.length) continue;
      const left = b.creatureIds.filter((id) => !moved.includes(id));
      b.creatureIds = moved;
      b.tankId = qt.id;
      b.quarantinedHour = hour;
      // what didn't fit waits as its own batch for the next free tank
      if (left.length) line.batches!.push({ id: `${b.id}r${hour}`, creatureIds: left, sortedHour: b.sortedHour });
      uncycled = null;
      break;
    }
    if (uncycled && !b.tankId) {
      const members = b.creatureIds.map((id) => state.creatures[id]).filter((c): c is Creature => !!c);
      const where = members.map((c) => c.tankId).find(Boolean) ?? line.tanks.raise;
      // "{Line}: {tank} isn't cycled yet, so the juveniles wait in {tank}."
      notice(state, line, `cycle:${uncycled.id}`, hour, { kind: 'warning', text: `${line.name}: ${uncycled.name} isn’t cycled yet, so the ${youngWord(sp, members, members.length)} ${members.length === 1 ? 'waits' : 'wait'} in ${tankName(state, line, where)}.`, tankId: uncycled.id });
    }
  }
}

/** The word for young in a notice: "juveniles", or the species' plural. */
function youngWord(sp: SpeciesDefinition, creatures: Creature[], n: number): string {
  if (creatures.every((c) => c.lifeStage === 'juvenile')) return n === 1 ? 'juvenile' : 'juveniles';
  const name = sp.commonName.toLowerCase();
  return n === 1 ? name : `${name}s`;
}

/** Sell: when the hold ends, list what may be listed, by life stage, at fair value × 0.9 (PROD-012, PROD-014). */
function release(state: GameState, line: ProductionLine, sp: SpeciesDefinition, hour: number): void {
  for (const b of line.batches ?? []) {
    if (b.released || b.quarantinedHour === undefined || hour < b.quarantinedHour + QUARANTINE_HOURS - 1e-9) continue;
    if (!line.rules.autoList) {
      b.released = true; // left in quarantine for the player
      continue;
    }
    const listable = b.creatureIds
      .map((id) => state.creatures[id])
      .filter((c): c is Creature => !!c && c.status === 'alive' && c.tankId === b.tankId && !isProtected(state, c));
    const groups: { kind: ListingKind; creatures: Creature[] }[] = [];
    const juveniles = listable.filter((c) => c.lifeStage === 'juvenile');
    const adults = listable.filter((c) => c.lifeStage !== 'juvenile');
    if (juveniles.length) groups.push({ kind: 'juveniles', creatures: juveniles });
    if (adults.length) groups.push({ kind: adults.length === 1 ? 'creature' : 'group', creatures: adults });
    const ids: string[] = [];
    let failed: string | null = null;
    const unlisted: Creature[] = [];
    for (const g of groups) {
      const value = bundleValue(state, g.kind, g.creatures).expected;
      const r = createListing(state, { kind: g.kind, creatureIds: g.creatures.map((c) => c.id), reserve: Math.round(value * RESERVE_SHARE), durationHours: DEFAULT_LISTING_HOURS });
      if (r.ok && r.listingId) ids.push(r.listingId);
      else {
        failed = r.message;
        unlisted.push(...g.creatures);
      }
    }
    if (ids.length) b.listingIds = [...(b.listingIds ?? []), ...ids];
    if (failed) {
      // what couldn't be listed is said once and tried again next hour (what was listed has left the batch's members)
      const n = unlisted.length;
      notice(state, line, `list:${b.id}`, hour, { kind: 'warning', text: `${line.name}: ${n} ${youngWord(sp, unlisted, n)} couldn't be listed: ${failed}`, tankId: b.tankId });
      continue;
    }
    b.released = true;
  }
}
