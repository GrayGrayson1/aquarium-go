/**
 * Save migrations. OWNER: lane "core".
 *
 * `MIGRATIONS` is a registry of single-version upgrade steps (v → v+1). `migrateSave` detects the save's version
 * (missing `schemaVersion` = legacy v0), applies each step in order up to SCHEMA_VERSION, then runs `repairState`,
 * an idempotent safety net that fills any missing structure with sane defaults, drops animals whose species no
 * longer exists and clamps non-finite numbers. Newer-than-supported saves are refused with a friendly error.
 *
 * To change the GameState shape: bump SCHEMA_VERSION in ./schema.ts, add `{ from: N, to: N+1, up }` below and a test
 * in tests/sim/core-migration.test.ts. Optional fields added by lanes don't need a migration (repair fills
 * structural defaults only).
 *
 * Legacy v0 (pre-release prototype) differences handled by the v0→v1 step:
 *  - no `schemaVersion`; money at top level (`money`) instead of `finance`;
 *  - `tanks` stored as an array (no `tankOrder`), tanks without `simDebtHours`, `tapPressure`, `signage`,
 *    `water.foodByTag`, `water.level`;
 *  - creatures without `visitorWows`, `history`, `repro.totalOffspringRaised`;
 *  - `progress` without `discoveredMorphs` / `counters`; market without `history`; no `isShowcase`.
 */
import type { GameState, Tank, Creature, WaterState, CreatureStats, Potentials, Genome } from '@/types';
import { SCHEMA_VERSION } from './schema';
import { SaveError } from './types';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { DEFAULT_LIGHTS_ON, defaultLightsOff } from '@/sim/time';
import { renamedMorphs, resolveMorph } from '@/sim/life/genetics';
import { sanitizeRareVariant } from '@/sim/life/rareVariants'; // lane:genetics
import { backfillFinds } from '@/sim/life/discovery'; // lane:genetics
import { emptyShowsState } from '@/sim/shows/state'; // B-168
import { PHOTO_REF } from '@/types/shared'; // chunk 12: a shared shop's listing photo
import { CLASS_DEFAULTS } from '@/sim/water/constants'; // chunk 6 (PERSIST-004, B-004)
import { LOG_CAP } from '@/sim/context';
import { BUYER_ARCHETYPES } from '@/data/buyers';
import { SHOW_TIERS } from '@/data/shows';
import { STAFF_ROLES, STAFF_TRAITS, STAFF_MAX_SKILL } from '@/data/staff'; // chunk 6 (PERSIST-004 A3); chunk 7 (B-203)
import { WATER_ROOM, FOOD_ROOM } from '@/data/catalog/machines'; // ADR-0037 (G1); chunk 7 (B-203)
import { earn } from '@/sim/economy/finance'; // chunk 7 (B-203): a removed show's fees

// Loosely-typed JSON while migrating (shapes differ between versions).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export interface Migration {
  from: number;
  to: number;
  description: string;
  up: (s: Json) => Json;
}

const isObj = (v: unknown): v is Record<string, Json> => !!v && typeof v === 'object' && !Array.isArray(v);
/**
 * lane:core (S0 review, PERSIST-004) — an id read from a save must be a plain own key. "__proto__", "constructor",
 * "toString" and the other inherited Object properties would otherwise pass lookups such as `s.tanks[id]`, and the sim
 * would then write through them (prototype pollution, or a crash on every tick).
 */
const isSafeKey = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && !(id in Object.prototype) && id !== 'prototype';
/** `id` is a safe own key of `obj`. */
const hasKey = (obj: Json, id: unknown): boolean => isSafeKey(id) && Object.hasOwn(obj, id);
/** Remove entries whose key isn't a safe id from an id-keyed map, noting each removal. */
function dropUnsafeKeys(map: Json, what: string, repairs: string[]): void {
  for (const id of Object.keys(map)) {
    if (isSafeKey(id)) continue;
    delete map[id];
    repairs.push(`${what} ${JSON.stringify(id).slice(0, 40)}: not a valid id, removed`);
  }
}
/** A name that an Object inherits ("__proto__", "constructor", "toString", …): never a valid key or id in a save. */
const isInheritedName = (k: string): boolean => k in Object.prototype || k === 'prototype';
/** A field holding one id (`id`, `tankId`, `defId`, `clutchId`, …). */
const ID_FIELD = /^id$|Id$/;
/**
 * lane:core (S0 review SD-1/SD-2, PERSIST-004) — one pass over the whole save before the targeted repairs. It removes
 * every map key that names an inherited Object property (in any id-keyed map or sub-map: tanks, alleles, counters,
 * food tags…), clears every id field holding such a name, and drops such names and records with such an id from every
 * list. After it,
 * no lookup through save data (`state.clutches[cl.id]`, `CATALOG[defId]`) can reach Object.prototype, so the sim can
 * neither pollute it nor crash on it every tick. Player-written text (names, messages) is left alone.
 */
function scrubInheritedNames(node: Json, path: string, repairs: string[], depth = 0): void {
  if (depth > 64 || !node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    // A string id, or a record whose own id is such a name, is dropped from its list (a record without an id breaks
    // whatever numbers or finds it, e.g. the log's sequence).
    const kept = node.filter((x) => (typeof x === 'string' ? !isInheritedName(x) : !(isObj(x) && typeof x.id === 'string' && isInheritedName(x.id))));
    if (kept.length !== node.length) {
      // (copied in place: spreading a list of several hundred thousand into splice's arguments throws, B-012)
      for (let i = 0; i < kept.length; i++) node[i] = kept[i];
      node.length = kept.length;
      repairs.push(`${path}: invalid ids removed`);
    }
    for (let i = 0; i < node.length; i++) scrubInheritedNames(node[i], `${path}[${i}]`, repairs, depth + 1);
    return;
  }
  for (const k of Object.keys(node)) {
    if (isInheritedName(k)) {
      delete node[k];
      repairs.push(`${path}: key ${JSON.stringify(k)} is not a valid id, removed`);
      continue;
    }
    const v = node[k];
    if (typeof v === 'string' && ID_FIELD.test(k) && isInheritedName(v)) {
      node[k] = null;
      repairs.push(`${path}.${k}: ${JSON.stringify(v)} is not a valid id, cleared`);
      continue;
    }
    scrubInheritedNames(v, path ? `${path}.${k}` : k, repairs, depth + 1);
  }
}
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
/** chunk 6 (PERSIST-004 A2) — `num`, with a repair note when a value was there but unusable (NaN, 1e999, text…). */
function numNoted(v: unknown, d: number, label: string, repairs: string[]): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v !== undefined) repairs.push(`${label}: ${String(v).slice(0, 24)} → ${d}`);
  return d;
}
/** lane:fix-core (P5-05) — an array of records: anything that is not an object (null, a number…) is dropped. */
const records = (a: unknown): Json[] => (Array.isArray(a) ? a.filter(isObj) : []);
/** An array of strings (ids, unlock keys): anything else is dropped. */
const strings = (a: unknown): string[] => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []);

export const MIGRATIONS: Migration[] = [
  {
    from: 0,
    to: 1,
    description: 'Prototype saves → v1: finance block, tank record + order, LOD debt, discovered morphs, showcase flag',
    up: (s: Json) => {
      // money → finance
      if (!isObj(s.finance)) s.finance = { money: num(s.money, 0), ledger: [], daily: [] };
      delete s.money;
      // tanks array → record + order
      if (Array.isArray(s.tanks)) {
        const rec: Record<string, Json> = {};
        const order: string[] = [];
        for (const t of s.tanks) {
          // lane:core (security-data-2 I2) — only a usable id becomes a key: `rec["__proto__"] = t` would set the
          // record's prototype instead of adding a tank. repairState then notes whatever still points at a dropped tank.
          if (!isObj(t) || !isSafeKey(t.id)) continue;
          rec[t.id] = t;
          order.push(t.id);
        }
        s.tanks = rec;
        if (!Array.isArray(s.tankOrder)) s.tankOrder = order;
      }
      if (!Array.isArray(s.tankOrder)) s.tankOrder = Object.keys(isObj(s.tanks) ? s.tanks : {});
      for (const t of Object.values(isObj(s.tanks) ? s.tanks : {}) as Json[]) {
        if (!isObj(t)) continue;
        t.simDebtHours ??= 0;
        t.tapPressure ??= 0;
        t.signage ??= false;
        if (isObj(t.water)) {
          t.water.foodByTag ??= {};
          t.water.level ??= 1;
        }
      }
      for (const c of Object.values(isObj(s.creatures) ? s.creatures : {}) as Json[]) {
        if (!isObj(c)) continue;
        c.visitorWows ??= 0;
        c.history ??= [];
        if (isObj(c.repro)) c.repro.totalOffspringRaised ??= 0;
      }
      if (isObj(s.progress)) {
        s.progress.counters ??= {};
        if (!Array.isArray(s.progress.discoveredMorphs)) {
          const morphs = new Set<string>();
          for (const c of Object.values(isObj(s.creatures) ? s.creatures : {}) as Json[]) {
            if (isObj(c) && typeof c.speciesId === 'string') morphs.add(`${c.speciesId}:${c.morphName ?? 'Wild type'}`);
          }
          s.progress.discoveredMorphs = [...morphs];
        }
      }
      if (isObj(s.market)) s.market.history ??= [];
      s.isShowcase = false;
      s.schemaVersion = 1;
      return s;
    },
  },
  {
    from: 1,
    to: 2,
    // lane:automation (chunk 5, INTAKE C-44, PERSIST-016) — the S3-D state is optional and needs nothing filled in; the
    // version goes up so an older build reports a chunk 5 save as newer (too_new) instead of closing its Facility
    // research and running the clock with no Water room, Live food room or manual mode.
    description: 'S3-D (deep automation): the Water and Live food rooms, manual mode and the Operations records',
    up: (s: Json) => {
      s.schemaVersion = 2;
      return s;
    },
  },
];

/** Version stored in a raw save (0 when absent = legacy prototype). */
export function detectVersion(raw: Json): number {
  const v = raw?.schemaVersion;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

/**
 * lane:core (PERSIST-014, ADR-0019 decision 4) — what the player is told about a save written by a newer version
 * (`too_new`, save format `v`). The slot layer uses it too, for a stored record it leaves alone.
 */
export function tooNewMessage(v: number): string {
  return `This save comes from a newer version of Aquarium Go (save format v${v}; this game reads up to v${SCHEMA_VERSION}). Refresh the page to get the latest version.`;
}

/**
 * Structural validation before migrating. Returns a friendly error string, or null when it looks like a save.
 */
export function validateSaveShape(raw: unknown): string | null {
  if (!isObj(raw)) return "That doesn't look like an Aquarium Go save.";
  const hasTanks = isObj(raw.tanks) || Array.isArray(raw.tanks);
  const looksLikeSave = hasTanks && isObj(raw.creatures) && (isObj(raw.clock) || typeof raw.starterId === 'string');
  if (!looksLikeSave) return "That file is readable, but it isn't an Aquarium Go save (no tanks or creatures found).";
  const v = detectVersion(raw);
  if (v > SCHEMA_VERSION) return tooNewMessage(v); // lane:core (PERSIST-014)
  return null;
}

export interface MigrateResult {
  state: GameState;
  fromVersion: number;
  applied: string[];
  repairs: string[];
}

/** Migrate any supported save shape to the current schema. Throws SaveError (friendly) when impossible. */
export function migrateSave(raw: unknown, what = 'This save'): MigrateResult {
  const problem = validateSaveShape(raw);
  if (problem) {
    const code = isObj(raw) && detectVersion(raw) > SCHEMA_VERSION ? 'too_new' : 'not_a_save';
    throw new SaveError(code, problem);
  }
  // Work on a private copy so callers' objects are never half-migrated.
  let s: Json = typeof structuredClone === 'function' ? structuredClone(raw) : JSON.parse(JSON.stringify(raw));
  const fromVersion = detectVersion(s);
  const applied: string[] = [];
  let v = fromVersion;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) throw new SaveError('invalid', `${what} uses an old format (v${v}) that can no longer be upgraded.`, `no migration from v${v}`);
    try {
      s = step.up(s);
    } catch (e) {
      throw new SaveError('invalid', `${what} couldn't be upgraded to the current version.`, `migration v${step.from}->v${step.to} failed: ${(e as Error).message}`);
    }
    s.schemaVersion = step.to;
    applied.push(`v${step.from}→v${step.to}: ${step.description}`);
    v = step.to;
  }
  const repairs = repairState(s);
  return { state: s as GameState, fromVersion, applied, repairs };
}

// ───────────────────────────────── repair ─────────────────────────────────

const DEFAULT_STATS: CreatureStats = { health: 90, hunger: 30, stress: 15, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 };
const DEFAULT_POTENTIALS: Potentials = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };

function defaultWater(marine: boolean, cool: boolean): WaterState {
  return {
    tempC: cool ? 17 : 25.5,
    pH: marine ? 8.2 : 7.2,
    ammonia: 0,
    nitrite: 0,
    nitrate: 5,
    oxygen: 0.95,
    salinitySG: marine ? 1.025 : 1.0,
    gh: marine ? 0 : 8,
    kh: marine ? 8 : 5,
    detritus: 0,
    algae: 0,
    clarity: 1,
    bioMaturity: 0.85,
    foodInWater: 0,
    foodByTag: {},
    level: 1,
  };
}

function fillNumbers<T extends object>(target: Json, defaults: T, label: string, repairs: string[]): T {
  if (!isObj(target)) {
    repairs.push(`${label}: rebuilt`);
    return { ...defaults };
  }
  for (const [k, dv] of Object.entries(defaults)) {
    if (typeof dv === 'number' && (typeof target[k] !== 'number' || !Number.isFinite(target[k]))) {
      target[k] = dv;
      repairs.push(`${label}.${k}`);
    } else if (target[k] === undefined && dv !== undefined) {
      target[k] = typeof dv === 'object' && dv !== null ? JSON.parse(JSON.stringify(dv)) : dv;
      repairs.push(`${label}.${k}`);
    }
  }
  return target as T;
}

/** How a repair note names a value that should have been an id. */
const idText = (v: unknown): string => (v === undefined ? 'missing' : `${(JSON.stringify(v) ?? String(v)).slice(0, 40)} is not a valid id`);

/**
 * lane:core (PERSIST-011; PERSIST-003 and ADR-0005 decision 1, "good saves going forward") — equipment, decor and frag
 * records whose `defId` is a usable key. A well-formed id that this build's catalog doesn't know is kept unchanged: a
 * newer build can add catalog items without a schema change (PERSIST-007), and deleting them here would lose them on
 * the next save (security-data-2 M3). Every reader skips a definition it can't find. A record whose id is missing, not
 * a string, empty, or an inherited Object name (which the scrub has already cleared to null) is dropped with a note.
 */
function withDefId(a: unknown, what: string, label: string, repairs: string[]): Json[] {
  const all = records(a);
  const kept = all.filter((r) => isSafeKey(r.defId));
  if (kept.length !== all.length) repairs.push(`${label}: ${all.length - kept.length} ${what} without a valid id removed`);
  return kept;
}

/** The save's clock (0 when unreadable), for checks that run before the clock itself is repaired. */
const hour0 = (s: Json): number => (typeof s.clock?.hour === 'number' && Number.isFinite(s.clock.hour) ? s.clock.hour : 0);

function repairTank(s: Json, id: string, t: Json, repairs: string[]): Tank | null {
  if (!isObj(t)) return null;
  t.id = id;
  if (typeof t.tierId !== 'string' || !TANK_TIER_BY_ID[t.tierId]) {
    repairs.push(`tank ${id}: unknown tier ${String(t.tierId)} → g20L`);
    t.tierId = 'g20L';
  }
  // chunk 6 (PERSIST-004 A3, B-004) — a water class the tables don't know (an inherited name crashed every tick) is
  // reset, by the tank's environment, with a note
  let wc: string = typeof t.waterClass === 'string' ? t.waterClass : 'freshwater_tropical';
  if (!Object.hasOwn(CLASS_DEFAULTS, wc)) {
    const fallback = t.environment === 'marine' ? 'marine_fowlr' : t.environment === 'brackish' ? 'brackish' : 'freshwater_tropical';
    repairs.push(`tank ${id}.waterClass: ${String(t.waterClass).slice(0, 40)} unknown → ${fallback}`);
    wc = fallback;
  }
  t.waterClass = wc;
  const marine = wc === 'reef' || wc.startsWith('marine');
  t.environment ??= marine ? 'marine' : wc === 'brackish' ? 'brackish' : 'freshwater';
  t.name ??= TANK_TIER_BY_ID[t.tierId].name;
  t.purpose ??= 'display';
  t.water = fillNumbers(t.water, defaultWater(marine, wc === 'freshwater_cool'), `tank ${id}.water`, repairs);
  // lane:automation (PERSIST-006) — the Auto Water Changer's last-run hours are finite numbers, not after the clock, when
  // present; a broken one is dropped (the device then runs at the next lights-on, once). Absent ones need nothing. A
  // future hour would stop the device and keep keepers off the tank's routine care for good.
  if (isObj(t.water.lab)) {
    for (const k of ['lastAutoChangeHour', 'lastAutoScrapeHour', 'lastDoseHour'] as const) { // lastDoseHour: lane:automation (chunk 5)
      const v = t.water.lab[k];
      if (v === undefined || (typeof v === 'number' && Number.isFinite(v) && v <= hour0(s))) continue;
      repairs.push(`tank ${id}.water.lab.${k}: ${String(v).slice(0, 40)}, removed`);
      delete t.water.lab[k];
    }
  }
  if (!isObj(t.placement)) t.placement = { x: 0, z: 0, rotY: 0 };
  t.placement = fillNumbers(t.placement, { x: 0, z: 0, rotY: 0 }, `tank ${id}.placement`, repairs);
  t.equipment = withDefId(t.equipment, 'equipment', `tank ${id}`, repairs);
  t.decor = withDefId(t.decor, 'decor', `tank ${id}`, repairs);
  for (const d of t.decor) {
    for (const k of ['x', 'y', 'z', 'rotY'] as const) d[k] = num(d[k], 0);
    d.scale = num(d.scale, 1);
    d.seed = num(d.seed, 1);
  }
  if (!isObj(t.substrate)) t.substrate = { kind: marine ? 'aragonite' : 'fine_gravel', depthCm: 4, color: marine ? '#efe6d6' : '#8a7c68' };
  t.backdrop ??= marine ? 'deep_blue' : 'black';
  // the same default photoperiod a new tank gets (createTank): on at 07:00, off when the room closes
  const closeHour = typeof s.facility?.closeHour === 'number' ? s.facility.closeHour : undefined;
  t.lighting = fillNumbers(t.lighting, { preset: marine ? 'cool' : 'warm', intensity: 1, onHour: DEFAULT_LIGHTS_ON, offHour: defaultLightsOff(closeHour), moonlight: true }, `tank ${id}.lighting`, repairs);
  const hour = num(s.clock?.hour, 0);
  t.createdHour = num(t.createdHour, 0);
  t.lastMaintenanceHour = num(t.lastMaintenanceHour, hour);
  t.tapPressure = num(t.tapPressure, 0);
  t.signage = !!t.signage;
  t.simDebtHours = Math.max(0, num(t.simDebtHours, 0));
  t.cache = fillNumbers(
    t.cache,
    { stockingLoad: 0, beauty: 40, welfare: 100, exhibitScore: 30, stability: 70, status: 'good', compatVerdict: 'excellent' },
    `tank ${id}.cache`,
    repairs,
  );
  return t as Tank;
}

function repairCreature(s: Json, id: string, c: Json, repairs: string[]): Creature | null {
  if (!isObj(c) || typeof c.speciesId !== 'string') return null;
  const sp = findSpecies(c.speciesId);
  if (!sp) {
    repairs.push(`creature ${id}: unknown species ${c.speciesId} removed`);
    return null;
  }
  const hour = num(s.clock?.hour, 0);
  c.id = id;
  c.name = typeof c.name === 'string' && c.name ? c.name : sp.commonName;
  c.sex ??= 'unknown';
  c.reproRole ??= c.sex === 'female' ? 'female' : c.sex === 'male' ? 'male' : 'undifferentiated';
  c.bornHour = num(c.bornHour, hour - 24 * (sp.lifecycle.juvenileDays + 2));
  // chunk 6 (PERSIST-004 A2) — born after the clock's hour is a negative age: born now (a hatch inside a step can land
  // a rounding error past the clock, so the check allows a millionth of an hour)
  if (c.bornHour > hour + 1e-6) {
    repairs.push(`creature ${id}.bornHour: ${String(c.bornHour).slice(0, 24)} after the clock → ${hour}`);
    c.bornHour = hour;
  }
  c.lifeStage ??= 'adult';
  c.sizeCm = Math.max(0.05, num(c.sizeCm, sp.adultSizeCm * 0.8));
  if (c.tankId !== null && typeof c.tankId !== 'string') c.tankId = null;
  if (!isObj(c.genome)) c.genome = { alleles: {}, potentials: { ...DEFAULT_POTENTIALS } };
  if (!isObj(c.genome.alleles)) c.genome.alleles = {};
  c.genome.potentials = fillNumbers(c.genome.potentials, DEFAULT_POTENTIALS, `creature ${id}.potentials`, repairs);
  if (!isObj(c.appearance)) {
    c.appearance = { ...sp.genetics.baseVisual, patternSeed: num(c.genome?.seed, 12345) };
    repairs.push(`creature ${id}.appearance`);
  }
  c.morphName ??= 'Wild type';
  c.personality = strings(c.personality);
  c.stats = fillNumbers(c.stats, DEFAULT_STATS, `creature ${id}.stats`, repairs);
  for (const k of Object.keys(DEFAULT_STATS) as (keyof CreatureStats)[]) c.stats[k] = Math.max(0, Math.min(100, c.stats[k]));
  c.repro = fillNumbers(c.repro, { stage: 'idle', stageSinceHour: hour, totalClutches: 0, totalOffspringRaised: 0 }, `creature ${id}.repro`, repairs);
  c.lineage = fillNumbers(
    c.lineage,
    { motherId: null, fatherId: null, generation: 0, lineId: `${c.speciesId}-market`, breederName: 'Captive-bred stock' },
    `creature ${id}.lineage`,
    repairs,
  );
  c.captiveBred ??= true;
  c.acquiredHour = num(c.acquiredHour, hour);
  c.purchasePrice = num(c.purchasePrice, 0);
  c.status ??= 'alive';
  c.history = records(c.history);
  c.visitorWows = num(c.visitorWows, 0);
  repairRareVariant(c, id, `creature ${id}`, repairs);
  return c as Creature;
}

/**
 * lane:genetics — keep a valid Prismatic state exactly as saved; drop an unreadable one (with a note) and coerce a broken
 * origin/seed deterministically. An absent field means an ordinary animal and is left alone (no note).
 */
function repairRareVariant(c: Json, id: string, label: string, repairs: string[]): void {
  if (c.rareVariant === undefined) return;
  const fixed = sanitizeRareVariant(c.rareVariant, id);
  if (!fixed) {
    delete c.rareVariant;
    repairs.push(`${label}.rareVariant: unreadable, removed`);
  } else if (fixed.origin !== c.rareVariant.origin || fixed.visualSeed !== c.rareVariant.visualSeed || Object.keys(c.rareVariant).length !== 3) {
    c.rareVariant = fixed;
    repairs.push(`${label}.rareVariant`);
  }
}

/**
 * Idempotent repair pass (runs on every load). Fills missing structure, removes references to unknown species,
 * clamps non-finite numbers. Returns a list of what was repaired (empty for healthy saves).
 */
/**
 * Round-3 R02-06 — S16-05 renamed morphs with descriptive overlays ("Red High Grade Cherry" → "High Grade Red
 * Cherry"). Saves from before it carry the old names on living animals and in the discovered-morphs list, so the next
 * brood would be a second "first bred" of the same morph: rename them in place and drop the duplicates.
 */
function renameLegacyMorphs(s: Json): void {
  if (isObj(s.creatures)) {
    for (const c of Object.values(s.creatures) as Json[]) {
      if (!isObj(c) || typeof c.morphName !== 'string') continue;
      const sp = findSpecies(c.speciesId);
      const now = sp ? renamedMorphs(sp).get(c.morphName) : undefined;
      if (now) c.morphName = now;
    }
  }
  const p = s.progress;
  if (!isObj(p) || !Array.isArray(p.discoveredMorphs)) return;
  // (a Set: the list used to be de-duplicated with includes(), quadratic for a crafted 100,000 entries, B-122)
  const out = new Set<string>();
  for (const key of p.discoveredMorphs as string[]) {
    const i = key.indexOf(':');
    const sp = i > 0 ? findSpecies(key.slice(0, i)) : undefined;
    const now = sp ? renamedMorphs(sp).get(key.slice(i + 1)) : undefined;
    out.add(now ? `${key.slice(0, i)}:${now}` : key);
  }
  p.discoveredMorphs = [...out];
}

/** chunk 6 (PERSIST-004 A1) — list lengths far beyond play: trimmed on load, with a note. */
const MAX_CLOSED_LISTINGS = 1_000;
const MAX_DISCOVERED_MORPHS = 20_000;

/**
 * chunk 6 (PERSIST-004 A2) — the last pass: any number still NaN or ±Infinity anywhere in the save (a field no targeted
 * repair knows) becomes 0, noted by path (the first ten, then a count). The serializer never writes such numbers; only a
 * hand-made file (1e999 parses to Infinity) has them.
 */
function scrubNonFinite(s: Json, repairs: string[]): void {
  let n = 0;
  const walk = (node: Json, path: string, depth: number) => {
    if (depth > 64 || !node || typeof node !== 'object') return;
    const keys = Array.isArray(node) ? node.keys() : Object.keys(node);
    for (const k of keys as Iterable<string | number>) {
      const v = node[k];
      if (typeof v === 'number') {
        if (Number.isFinite(v)) continue;
        node[k] = 0;
        if (++n <= 10) repairs.push(`${path}.${k}: ${String(v)} → 0`);
      } else if (v && typeof v === 'object') walk(v, `${path}.${k}`, depth + 1);
    }
  };
  walk(s, '$', 0);
  if (n > 10) repairs.push(`…and ${n - 10} more unreadable numbers → 0`);
}

/**
 * Chunk 6 (B-194; ADR-0029 decision 8, ADR-0034 decision 5) — overlays renamed so each look has its own name. The
 * bristlenose's two-copy fin overlay was "Super Long-fin", which lost its "Super" beside the Super Red colour, so "Super
 * Red Long-fin" named two looks; it is now "Double Long-fin". An animal (owned, or in the shop's stock) whose name the
 * overlay touched takes the name its genes give now (that tells the two "Super Red Long-fin" looks apart); discovered
 * names are renamed in place. Each renamed animal is noted.
 */
const OVERLAY_RENAMES: readonly { speciesId: string; from: string; to: string; touches: RegExp }[] = [{ speciesId: 'bristlenose_pleco', from: 'Super Long-fin', to: 'Double Long-fin', touches: /Long-fin/ }];

function renameOverlays(s: Json, repairs: string[]): void {
  /** chunk 6 (the fresh review): each renamed animal's old and new discovery keys, so the Encyclopedia keeps it found. */
  const renamed: { from: string; to: string }[] = [];
  const renamedIds = new Map<string, string>();
  const fix = (c: Json, label: string) => {
    if (!isObj(c) || typeof c.morphName !== 'string') return;
    const r = OVERLAY_RENAMES.find((x) => x.speciesId === c.speciesId);
    if (!r || !r.touches.test(c.morphName)) return;
    const sp = findSpecies(c.speciesId);
    if (!sp) return;
    let now = c.morphName.replace(r.from, r.to);
    // from the genes only when every locus is there (a missing genome was filled in empty above: it would read wild)
    const alleles = isObj(c.genome) && isObj(c.genome.alleles) ? (c.genome.alleles as Record<string, unknown>) : null;
    if (alleles && sp.genetics.loci.every((l) => Array.isArray(alleles[l.id]) && (alleles[l.id] as unknown[]).length === 2)) {
      try {
        now = resolveMorph(sp, c.genome as Genome).morphName;
      } catch {
        /* a damaged genome: the plain rename */
      }
    }
    if (now !== c.morphName) {
      renamed.push({ from: `${c.speciesId}:${c.morphName}`, to: `${c.speciesId}:${now}` });
      if (typeof c.id === 'string') renamedIds.set(c.id, now);
      c.morphName = now;
      repairs.push(`${label}.morphName renamed (B-194)`);
    }
  };
  if (isObj(s.creatures)) for (const [id, c] of Object.entries(s.creatures)) fix(c as Json, `creatures.${shortId(id)}`);
  if (isObj(s.market) && Array.isArray(s.market.stock)) {
    for (const o of s.market.stock as Json[]) if (isObj(o) && Array.isArray(o.creatures)) for (const c of o.creatures as Json[]) fix(c, `market.stock.${shortId(o.id)}`);
  }
  // the old name kept as text: a Prismatic find, and a listing's title and summary (its animals are renamed above)
  const plain = (speciesId: unknown, text: unknown): unknown => {
    const r = OVERLAY_RENAMES.find((x) => x.speciesId === speciesId);
    return r && typeof text === 'string' && text.includes(r.from) ? text.replaceAll(r.from, r.to) : text;
  };
  const p = s.progress;
  if (isObj(p) && Array.isArray(p.prismaticFinds)) {
    for (const f of p.prismaticFinds as Json[]) {
      if (!isObj(f)) continue;
      const now = (typeof f.creatureId === 'string' && renamedIds.get(f.creatureId)) || plain(f.speciesId, f.morphName);
      if (now !== f.morphName) {
        f.morphName = now;
        repairs.push(`progress.prismaticFinds ${shortId(f.creatureId)}.morphName renamed (B-194)`);
      }
    }
  }
  if (isObj(s.market) && Array.isArray(s.market.listings)) {
    for (const l of s.market.listings as Json[]) {
      if (!isObj(l)) continue;
      const species = isObj(l.snapshot) && Array.isArray(l.snapshot.speciesIds) ? (l.snapshot.speciesIds as unknown[]) : [];
      for (const sp of species) {
        const title = plain(sp, l.title);
        const summary = isObj(l.snapshot) ? plain(sp, l.snapshot.summary) : undefined;
        if (title === l.title && (!isObj(l.snapshot) || summary === l.snapshot.summary)) continue;
        l.title = title;
        if (isObj(l.snapshot)) l.snapshot.summary = summary;
        repairs.push(`market.listings ${shortId(l.id)}: renamed (B-194)`);
      }
    }
  }
  if (!isObj(p) || !Array.isArray(p.discoveredMorphs)) return;
  const seen = new Set<string>();
  const out: unknown[] = [];
  const found = new Set((p.discoveredMorphs as unknown[]).filter((k): k is string => typeof k === 'string'));
  for (const key of p.discoveredMorphs as unknown[]) {
    let k = key;
    if (typeof key === 'string') {
      const r = OVERLAY_RENAMES.find((x) => key.startsWith(`${x.speciesId}:`) && key.includes(x.from));
      if (r) k = key.replace(r.from, r.to);
    }
    if (typeof k === 'string' && seen.has(k)) continue;
    if (typeof k === 'string') seen.add(k);
    out.push(k);
  }
  // a renamed animal's new name is found if its old one was (the plain rename can't tell "Super Red Long-fin" apart;
  // the animal's genes can)
  for (const r of renamed) {
    if (!found.has(r.from) || seen.has(r.to)) continue;
    seen.add(r.to);
    out.push(r.to);
  }
  p.discoveredMorphs = out;
}

export function repairState(s: Json): string[] {
  const repairs: string[] = [];
  scrubInheritedNames(s, '', repairs);
  s.schemaVersion = SCHEMA_VERSION;
  s.saveId ??= `save_repaired_${Date.now().toString(36)}`;
  s.seed = num(s.seed, 1) >>> 0;
  s.rngState = num(s.rngState, s.seed) >>> 0;
  s.idCounter = Math.max(0, Math.floor(num(s.idCounter, 0)));
  const now = Date.now();
  s.createdRealMs = num(s.createdRealMs, now);
  s.lastSavedRealMs = num(s.lastSavedRealMs, now);
  s.lastTickRealMs = num(s.lastTickRealMs, s.lastSavedRealMs);
  if (!isObj(s.clock)) s.clock = { hour: 8, speed: 1 };
  s.clock.hour = numNoted(s.clock.hour, 8, 'clock.hour', repairs);
  // chunk 6 (PERSIST-004 A2) — the clock starts at Day 1, 08:00 and only runs forward: a negative hour is out of its domain
  if (s.clock.hour < 0) {
    repairs.push(`clock.hour: ${String(s.clock.hour).slice(0, 24)} → 8`);
    s.clock.hour = 8;
  }
  if (![0, 1, 3, 10].includes(s.clock.speed)) s.clock.speed = 1;
  // lane:core (PERSIST-011, ADR-0005 decision 1) — a starter species this build doesn't know is kept (a newer build may
  // add one, and every reader falls back when findSpecies finds nothing); an id that isn't a usable key is reset.
  if (!isSafeKey(s.starterId)) {
    repairs.push(`starterId: ${idText(s.starterId)} → betta`);
    s.starterId = 'betta';
  }
  s.shopName = typeof s.shopName === 'string' && s.shopName ? s.shopName : 'My Aquarium';

  if (!isObj(s.tanks)) s.tanks = {};
  dropUnsafeKeys(s.tanks, 'tank', repairs);
  for (const [id, t] of Object.entries(s.tanks)) {
    const fixed = repairTank(s, id, t, repairs);
    if (!fixed) {
      delete s.tanks[id];
      repairs.push(`tank ${id}: unreadable, removed`);
    }
  }
  if (!Array.isArray(s.tankOrder)) s.tankOrder = [];
  s.tankOrder = [...new Set((s.tankOrder as unknown[]).filter((id): id is string => hasKey(s.tanks, id)))];
  for (const id of Object.keys(s.tanks)) if (!s.tankOrder.includes(id)) s.tankOrder.push(id);

  if (!isObj(s.creatures)) s.creatures = {};
  dropUnsafeKeys(s.creatures, 'creature', repairs);
  for (const [id, c] of Object.entries(s.creatures)) {
    const fixed = repairCreature(s, id, c, repairs);
    if (!fixed) {
      delete s.creatures[id];
      continue;
    }
    if (fixed.tankId && !hasKey(s.tanks, fixed.tankId) && (fixed.status === 'alive' || fixed.status === 'listed')) {
      repairs.push(`creature ${id}: tank ${fixed.tankId} missing → holding`);
      fixed.tankId = null;
    }
  }
  if (!isObj(s.clutches)) s.clutches = {};
  dropUnsafeKeys(s.clutches, 'clutch', repairs);
  for (const [id, cl] of Object.entries(s.clutches) as [string, Json][]) {
    if (!isObj(cl) || !hasKey(s.tanks, cl.tankId) || !findSpecies(cl.speciesId)) {
      delete s.clutches[id];
      repairs.push(`clutch ${id}: removed (missing tank/species)`);
      continue;
    }
    cl.id = id; // the sim re-reads `state.clutches[cl.id]` (SD-1): a record's own id must be its key
    cl.count = Math.max(0, Math.floor(num(cl.count, 0)));
    cl.survival = Math.max(0, Math.min(1, num(cl.survival, 1)));
    cl.nextStageHour = num(cl.nextStageHour, num(s.clock.hour, 0) + 24);
  }

  if (!isObj(s.inventory)) s.inventory = {};
  if (!isObj(s.inventory.foods)) s.inventory.foods = {};
  // chunk 6 (PERSIST-004 A2) — stock is a count: never negative or unreadable
  for (const [k, v] of Object.entries(s.inventory.foods)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) continue;
    repairs.push(`inventory.foods.${k.slice(0, 40)}: ${String(v).slice(0, 24)} → 0`);
    s.inventory.foods[k] = 0;
  }
  s.inventory.salt = numNoted(s.inventory.salt, 0, 'inventory.salt', repairs);
  if (s.inventory.salt < 0) {
    repairs.push(`inventory.salt: ${String(s.inventory.salt).slice(0, 24)} → 0`);
    s.inventory.salt = 0;
  }
  s.inventory.equipment = withDefId(s.inventory.equipment, 'equipment', 'inventory', repairs);
  s.inventory.decor = withDefId(s.inventory.decor, 'decor', 'inventory', repairs);
  // lane:frags — optional frag storage: drop unreadable entries, never invent the list for old saves
  if (s.inventory.frags !== undefined) s.inventory.frags = withDefId(s.inventory.frags, 'frags', 'inventory', repairs);

  if (!isObj(s.facility)) s.facility = { level: 'hobby_room', width: 5, depth: 4.5, openToPublic: false, admission: 0, openHour: 9, closeHour: 19, fixtures: [] };
  s.facility = fillNumbers(s.facility, { level: 'hobby_room', width: 5, depth: 4.5, openToPublic: false, admission: 0, openHour: 9, closeHour: 19, fixtures: [] }, 'facility', repairs);

  if (!isObj(s.market)) s.market = {};
  for (const k of ['stock', 'listings', 'buyers', 'history'] as const) s.market[k] = records(s.market[k]);
  if (!isObj(s.market.demand)) s.market.demand = {};
  s.market.lastRefreshHour = num(s.market.lastRefreshHour, -999);
  s.market.stock = s.market.stock.filter((o: Json) => isObj(o) && findSpecies(o.speciesId) && Array.isArray(o.creatures));
  for (const o of s.market.stock as Json[]) for (const c of o.creatures as Json[]) if (isObj(c)) repairRareVariant(c, String(c.id), `offer ${o.id} creature ${c.id}`, repairs); // lane:genetics
  for (const l of s.market.listings as Json[]) {
    l.bids = records(l.bids);
    l.creatureIds = strings(l.creatureIds).filter(isSafeKey);
    if (!isObj(l.snapshot)) l.snapshot = { valuation: 0, healthScore: 0, beautyScore: 0, careDifficulty: '', lineageSummary: '', summary: '', creatureIds: l.creatureIds };
    // lane:core (S0 review, PERSIST-004) — a listing photo is an embedded image (capturePhoto's data URL). Anything else
    // would be rendered as <img src>, the only way a save could make the game fetch a remote URL. Chunk 12
    // (SHARED-SHOPS.md §4.4): a shared shop's photo is a stored photo's reference, `p:` and its hash (PHOTO_REF), which
    // the interface never puts in <img src>; that one form, and nothing else, is kept too.
    if (l.snapshot.photo !== undefined && !(typeof l.snapshot.photo === 'string' && (l.snapshot.photo.startsWith('data:image/') || PHOTO_REF.test(l.snapshot.photo)))) {
      delete l.snapshot.photo;
      repairs.push(`listing ${String(l.id).slice(0, 40)}: photo was not an embedded image, removed`);
    }
    if (l.fragItems !== undefined) l.fragItems = withDefId(l.fragItems, 'frags', `listing ${String(l.id).slice(0, 40)}`, repairs); // lane:frags
    // A sold aquarium's listing keeps the id of the tank it sold, which no longer exists, so a usable id is kept even
    // when its tank is gone (every reader handles a missing tank). One that isn't usable (the scrub clears an inherited
    // name to null) is removed with a note.
    if (l.tankId !== undefined && !isSafeKey(l.tankId)) {
      repairs.push(`listing ${String(l.id).slice(0, 40)}: tankId ${idText(l.tankId)}, removed`);
      delete l.tankId;
    }
  }
  // chunk 6 (PERSIST-004 A3, B-004) — a buyer whose archetype the table doesn't know (an inherited name crashed the market)
  const buyers = s.market.buyers.length;
  s.market.buyers = s.market.buyers.filter((b: Json) => typeof b.archetype === 'string' && Object.hasOwn(BUYER_ARCHETYPES, b.archetype));
  if (s.market.buyers.length !== buyers) repairs.push(`market.buyers: ${buyers - s.market.buyers.length} with an unknown archetype removed`);
  // chunk 6 (PERSIST-004 A1) — closed listings are history (the market keeps 40); far more than play makes are trimmed,
  // oldest first; open ones are never touched
  const closed = (s.market.listings as Json[]).filter((l) => l.status !== 'active');
  if (closed.length > MAX_CLOSED_LISTINGS) {
    const drop = new Set(closed.slice(0, closed.length - MAX_CLOSED_LISTINGS));
    s.market.listings = (s.market.listings as Json[]).filter((l) => !drop.has(l));
    repairs.push(`market.listings: ${drop.size} oldest closed listings removed`);
  }
  if (s.market.fragSaleHours !== undefined) s.market.fragSaleHours = Array.isArray(s.market.fragSaleHours) ? s.market.fragSaleHours.filter((h: unknown) => typeof h === 'number' && Number.isFinite(h)) : []; // lane:frags

  if (!isObj(s.finance)) s.finance = { money: 0, ledger: [], daily: [] };
  s.finance.money = numNoted(s.finance.money, 0, 'finance.money', repairs); // debt is allowed: only unreadable money is reset
  s.finance.ledger = records(s.finance.ledger);
  s.finance.daily = records(s.finance.daily);

  if (!isObj(s.progress)) s.progress = {};
  const p = s.progress;
  p.reputation = num(p.reputation, 0);
  p.mastery = fillNumbers(p.mastery, { husbandry: 0, breeding: 0, aquascaping: 0, marine: 0, business: 0, exhibition: 0 }, 'progress.mastery', repairs);
  for (const k of ['unlocked', 'achievements', 'discoveredSpecies', 'discoveredMorphs'] as const) p[k] = strings(p[k]);
  // chunk 6 (PERSIST-004 A1) — every species' catalog together names about 2,000 morphs: a list far longer is cut
  if (p.discoveredMorphs.length > MAX_DISCOVERED_MORPHS) {
    repairs.push(`progress.discoveredMorphs: ${p.discoveredMorphs.length - MAX_DISCOVERED_MORPHS} beyond ${MAX_DISCOVERED_MORPHS} removed`);
    p.discoveredMorphs.length = MAX_DISCOVERED_MORPHS;
  }
  // lane:genetics — optional lists: repaired when present, derived from the collection when missing (pre-0.4 saves)
  if (p.discoveredStrains !== undefined) p.discoveredStrains = strings(p.discoveredStrains);
  if (p.prismaticFinds !== undefined) p.prismaticFinds = records(p.prismaticFinds).filter((f) => typeof f.speciesId === 'string' && typeof f.creatureId === 'string');
  const quests = records(p.quests);
  p.quests = quests.filter((q) => typeof q.id === 'string');
  if (p.quests.length !== quests.length) repairs.push(`progress.quests: ${quests.length - p.quests.length} without an id removed`);
  if (!isObj(p.research)) p.research = { progressHours: 0, completed: [] };
  p.research.progressHours = num(p.research.progressHours, 0);
  p.research.completed = strings(p.research.completed);
  // lane:core (PERSIST-011, ADR-0005 decision 1) — a project this build doesn't know is kept, like any well-formed id,
  // and the research step leaves it exactly as it is (B-017, ADR-0029 decision 2); an id that isn't a usable key is removed.
  if (p.research.activeId !== undefined && !isSafeKey(p.research.activeId)) {
    repairs.push(`progress.research.activeId: ${idText(p.research.activeId)}, removed`);
    delete p.research.activeId;
  }
  if (!isObj(p.tutorial)) p.tutorial = { starterId: s.starterId, step: 0, done: true, skipped: true, flags: {} };
  if (!isSafeKey(p.tutorial.starterId)) {
    repairs.push(`progress.tutorial.starterId: ${idText(p.tutorial.starterId)} → ${s.starterId}`);
    p.tutorial.starterId = s.starterId;
  }
  if (!isObj(p.tutorial.flags)) p.tutorial.flags = {};
  if (!isObj(p.counters)) p.counters = {};

  if (!isObj(s.visitors)) s.visitors = {};
  const v = s.visitors;
  v.today = fillNumbers(v.today, { day: Math.floor(num(s.clock.hour, 0) / 24) + 1, count: 0, revenue: 0, tips: 0, satisfactionSum: 0 }, 'visitors.today', repairs);
  for (const k of ['history', 'reactions'] as const) v[k] = records(v[k]);
  if (!isObj(v.exhibit)) v.exhibit = {};
  v.totalVisitors = num(v.totalVisitors, 0);

  s.log = records(s.log);
  // chunk 6 (PERSIST-004 A1) — the sim keeps the newest LOG_CAP events; a longer log is trimmed the same way
  if (s.log.length > LOG_CAP) {
    repairs.push(`log: ${s.log.length - LOG_CAP} oldest events removed`);
    s.log.splice(0, s.log.length - LOG_CAP);
  }
  // chunk 11 (SHARED-SHOPS.md §4.3) — a shared shop's event names the member who did it; a tag that isn't a short
  // string is dropped (the event stays)
  for (const e of s.log as Json[]) {
    for (const k of ['by', 'byName'] as const) {
      if (e[k] !== undefined && !(typeof e[k] === 'string' && e[k].length > 0 && e[k].length <= 80)) {
        delete e[k];
        repairs.push(`log: an event's ${k} removed`);
      }
    }
  }
  repairTouches(s, repairs);
  repairPool(s, repairs);
  // lane:shows — optional; an unreadable shows block is dropped (src/sim/shows re-creates it lazily), arrays repaired.
  if (s.shows !== undefined && !isObj(s.shows)) {
    delete s.shows;
    repairs.push('shows: unreadable, reset');
  } else if (isObj(s.shows)) {
    for (const k of ['shows', 'entries', 'trophies'] as const) if (!Array.isArray(s.shows[k])) s.shows[k] = [];
    if (!isObj(s.shows.tankAwards)) s.shows.tankAwards = {};
    if (!isObj(s.shows.stats)) s.shows.stats = { entered: 0, placings: 0, wins: 0, bestInShow: 0, prize: 0 };
    // B-168: a broken stream restarts from its own seed, as ensureShowsState and a new game do (it used to restart from
    // the save seed itself, the world stream's seed)
    s.shows.rng = typeof s.shows.rng === 'number' && Number.isFinite(s.shows.rng) ? s.shows.rng >>> 0 : emptyShowsState(s as GameState).rng;
    s.shows.seq = Math.max(0, Math.floor(num(s.shows.seq, 0)));
    s.shows.cursorHour = num(s.shows.cursorHour, num(s.clock.hour, 0));
    // chunk 6 (PERSIST-004 A3) — a show of a tier the table doesn't know can't be judged (the calendar refills itself);
    // an entry's unknown tier is only a label, so it goes
    const shows = s.shows.shows.length;
    const removed = (s.shows.shows as Json[]).filter((x) => !(isObj(x) && typeof x.tier === 'string' && Object.hasOwn(SHOW_TIERS, x.tier)));
    s.shows.shows = (s.shows.shows as Json[]).filter((x) => !removed.includes(x));
    if (s.shows.shows.length !== shows) repairs.push(`shows.shows: ${shows - s.shows.shows.length} of an unknown tier removed`);
    // chunk 7 (B-203) — a removed show is never judged: its pending entries are scratched and their fees refunded, as
    // a show-day scratch is (they stayed "entered" for good, fees kept)
    const gone = new Map(removed.filter((x) => isObj(x) && typeof x.id === 'string').map((x) => [x.id as string, typeof x.name === 'string' ? x.name : 'the show']));
    for (const e of s.shows.entries as Json[]) {
      if (!isObj(e) || e.status !== 'entered' || !gone.has(e.showId)) continue;
      e.status = 'scratched';
      e.note = 'This show was called off. The club refunded the fee.';
      e.judgedHour = num(s.clock?.hour, 0);
      const fee = Math.max(0, num(e.fee, 0));
      if (fee > 0) earn(s as GameState, fee, 'other', `Show fee refund — ${gone.get(e.showId)}`);
      repairs.push(`shows entry ${shortId(e.id)}: its show was removed, so it was scratched${fee > 0 ? ' and refunded' : ''}`);
    }
    for (const e of s.shows.entries as Json[]) {
      if (isObj(e) && e.tier !== undefined && !(typeof e.tier === 'string' && Object.hasOwn(SHOW_TIERS, e.tier))) {
        repairs.push(`shows entry ${shortId(e.id)}: tier ${String(e.tier).slice(0, 24)} removed`);
        delete e.tier;
      }
    }
  }
  // lane:staff — optional staff state (absent in old saves; rebuilt lazily). Drop it only if unreadable.
  if (s.staff !== undefined && (!isObj(s.staff) || !Array.isArray(s.staff.roster))) {
    delete s.staff;
    repairs.push('staff: unreadable, reset');
  } else if (isObj(s.staff)) {
    for (const k of ['candidates', 'feeds', 'talks'] as const) if (!Array.isArray(s.staff[k])) s.staff[k] = [];
    if (!isObj(s.staff.care)) s.staff.care = {};
    if (!isObj(s.staff.warned)) s.staff.warned = {};
    // chunk 6 (PERSIST-004 A3) — a role the table doesn't know has no wage or duties (payday threw on it): that member
    // or candidate goes, with a note (an unreadable one goes as before)
    for (const k of ['roster', 'candidates'] as const) {
      s.staff[k] = (s.staff[k] as Json[]).filter((m) => isObj(m) && typeof m.id === 'string' && typeof m.role === 'string');
      const n = s.staff[k].length;
      s.staff[k] = (s.staff[k] as Json[]).filter((m) => Object.hasOwn(STAFF_ROLES, m.role));
      if (s.staff[k].length !== n) repairs.push(`staff.${k}: ${n - s.staff[k].length} with an unknown role removed`);
    }
    // (an unknown trait, like a missing one, becomes the trait every role can have)
    for (const m of [...s.staff.roster, ...s.staff.candidates] as Json[]) {
      if (typeof m.trait === 'string' && Object.hasOwn(STAFF_TRAITS, m.trait)) continue;
      if (typeof m.trait === 'string') repairs.push(`staff ${shortId(m.id)}: trait ${m.trait.slice(0, 24)} unknown → quick_learner`);
      m.trait = 'quick_learner';
    }
    for (const m of [...s.staff.roster, ...s.staff.candidates] as Json[]) {
      if (!Array.isArray(m.tankIds)) m.tankIds = [];
      m.tankIds = (m.tankIds as unknown[]).filter((id) => hasKey(s.tanks, id));
      m.skill = Math.max(1, Math.min(STAFF_MAX_SKILL, Math.round(num(m.skill, 1)))); // chunk 7 (B-203): the table's range
      m.wage = Math.max(0, num(m.wage, 60));
      m.xp = Math.max(0, num(m.xp, 0));
      m.hiredHour = num(m.hiredHour, num(s.clock?.hour, 0));
      m.avatarSeed = num(m.avatarSeed, 1);
      if (typeof m.name !== 'string' || !m.name) m.name = 'Team member';
      if (m.unpaidDays !== undefined) m.unpaidDays = Math.max(0, Math.floor(num(m.unpaidDays, 0)));
    }
  }
  repairProduction(s, repairs); // lane:production (chunk 4; PERSIST-006, ADR-0025 decision 10)
  repairAutomation(s, repairs); // lane:automation (chunk 5; PERSIST-016)
  delete s.offlineGrace;
  renameLegacyMorphs(s);
  renameOverlays(s, repairs); // chunk 6, B-194
  backfillFinds(s as GameState); // lane:genetics — only fills lists a pre-0.4 save lacks; silent
  if (s.isShowcase === undefined) s.isShowcase = false;
  scrubNonFinite(s, repairs); // chunk 6 (PERSIST-004 A2): nothing unreadable is left anywhere
  // Keep the id counter ahead of every id we know about so new ids never collide after a repair.
  s.idCounter = Math.max(s.idCounter, maxIdSuffix(s));
  return repairs;
}

/** A well-formed id, as text for a repair note. */
const shortId = (v: unknown): string => String(v).slice(0, 40);

const PRODUCTION_REFS = ['mother', 'father', 'breed', 'raise', 'quarantine', 'keep', 'rest'] as const;
const PRODUCTION_STAT_KEYS = ['weekStartHour', 'soldCount', 'revenue', 'costs', 'totalSold', 'totalRevenue', 'totalCosts'] as const;

/**
 * lane:production (PERSIST-006, ADR-0025 decision 10) — production lines, when present. A line whose parent or tank is
 * missing is kept and marked (paused, `broken`) so the player can fix or end it; only an unreadable line is removed.
 * Notes only what it changed: a valid save loads with no repairs and an unchanged hash. Creates nothing (AUTO-027).
 */
function repairProduction(s: Json, repairs: string[]): void {
  // A line hold on an animal that isn't a parent in any line would keep it from ever breeding: remove it.
  const parents = new Set<string>();
  if (s.production !== undefined && !isObj(s.production)) {
    delete s.production;
    repairs.push('production: unreadable, removed');
  } else if (isObj(s.production)) {
    const p = s.production;
    if (!Array.isArray(p.lines)) {
      p.lines = [];
      repairs.push('production.lines: unreadable, reset');
    }
    const kept: Json[] = [];
    const ids = new Set<string>();
    for (const l of p.lines as unknown[]) {
      const ok = isObj(l) && isSafeKey(l.id) && !ids.has(l.id as string) && typeof l.speciesId === 'string' && isObj(l.pair) && typeof l.pair.motherId === 'string' && typeof l.pair.fatherId === 'string' && isObj(l.tanks) && ['breed', 'raise', 'keep'].every((k) => typeof (l.tanks as Json)[k] === 'string');
      if (!ok) {
        repairs.push(`production line ${shortId(isObj(l) ? l.id : l)}: unreadable, removed`);
        continue;
      }
      ids.add(l.id);
      kept.push(l);
    }
    p.lines = kept;
    const hour = hour0(s);
    for (const l of p.lines as Json[]) {
      const at = `production line ${l.id}`;
      if (typeof l.name !== 'string' || !l.name.trim()) {
        l.name = `${shortId(l.id)} line`;
        repairs.push(`${at}.name: missing, set`);
      }
      if (typeof l.tanks.quarantine === 'string') l.tanks.quarantine = [l.tanks.quarantine];
      if (!Array.isArray(l.tanks.quarantine) || !(l.tanks.quarantine as unknown[]).every((x) => typeof x === 'string')) {
        l.tanks.quarantine = strings(l.tanks.quarantine);
        repairs.push(`${at}.tanks.quarantine: repaired`);
      }
      if (l.pair.restTankId !== undefined && typeof l.pair.restTankId !== 'string') {
        delete l.pair.restTankId;
        repairs.push(`${at}.pair.restTankId: unreadable, removed`);
      }
      if (typeof l.running !== 'boolean') {
        l.running = true;
        repairs.push(`${at}.running: set`);
      }
      if (!isObj(l.rules)) {
        l.rules = {};
        repairs.push(`${at}.rules: reset`);
      }
      for (const k of ['pauseWhenFull', 'keepPrismatic', 'autoList'] as const) {
        if (typeof l.rules[k] !== 'boolean') {
          l.rules[k] = true;
          repairs.push(`${at}.rules.${k}: set`);
        }
      }
      if (!Array.isArray(l.rules.keep)) {
        l.rules.keep = [];
        repairs.push(`${at}.rules.keep: reset`);
      } else {
        const good = (l.rules.keep as unknown[]).filter((r) => isObj(r) && Array.isArray(r.traitIds) && (r.traitIds as unknown[]).every((x) => typeof x === 'string') && typeof r.count === 'number' && Number.isFinite(r.count) && r.count >= 1);
        if (good.length !== l.rules.keep.length) {
          l.rules.keep = good;
          repairs.push(`${at}.rules.keep: unreadable rules removed`);
        }
      }
      if (!isObj(l.stats)) {
        l.stats = {};
        repairs.push(`${at}.stats: reset`);
      }
      for (const k of PRODUCTION_STAT_KEYS) {
        if (typeof l.stats[k] !== 'number' || !Number.isFinite(l.stats[k])) {
          l.stats[k] = k === 'weekStartHour' ? hour : 0;
          repairs.push(`${at}.stats.${k}: set`);
        }
      }
      if (typeof l.createdHour !== 'number' || !Number.isFinite(l.createdHour)) {
        l.createdHour = hour;
        repairs.push(`${at}.createdHour: set`);
      }
      for (const k of ['sortedThroughHour'] as const) {
        if (l[k] !== undefined && (typeof l[k] !== 'number' || !Number.isFinite(l[k]))) {
          delete l[k];
          repairs.push(`${at}.${k}: unreadable, removed`);
        }
      }
      if (l.routed !== undefined && (!Array.isArray(l.routed) || !(l.routed as unknown[]).every((x) => typeof x === 'string'))) {
        l.routed = strings(l.routed);
        repairs.push(`${at}.routed: repaired`);
      }
      if (l.batches !== undefined) {
        const good = (Array.isArray(l.batches) ? l.batches : []).filter((b: unknown) => isObj(b) && typeof b.id === 'string' && Array.isArray(b.creatureIds) && typeof b.sortedHour === 'number' && Number.isFinite(b.sortedHour));
        if (!Array.isArray(l.batches) || good.length !== l.batches.length) repairs.push(`${at}.batches: unreadable batches removed`);
        for (const b of good as Json[]) {
          const live = strings(b.creatureIds).filter((id) => hasKey(s.creatures, id));
          if (live.length !== b.creatureIds.length) {
            b.creatureIds = live;
            repairs.push(`${at}.batch ${shortId(b.id)}: missing animals removed`);
          }
          if (b.quarantinedHour !== undefined && (typeof b.quarantinedHour !== 'number' || !Number.isFinite(b.quarantinedHour))) {
            delete b.quarantinedHour;
            delete b.tankId;
            repairs.push(`${at}.batch ${shortId(b.id)}.quarantinedHour: unreadable, removed`);
          }
          if (b.listingIds !== undefined && !Array.isArray(b.listingIds)) {
            delete b.listingIds;
            repairs.push(`${at}.batch ${shortId(b.id)}.listingIds: unreadable, removed`);
          }
        }
        if (good.length) l.batches = good;
        else delete l.batches;
      }
      for (const k of ['noticed', 'tankNames'] as const) {
        if (l[k] !== undefined && !isObj(l[k])) {
          delete l[k];
          repairs.push(`${at}.${k}: unreadable, removed`);
        }
      }
      if (l.waiting !== undefined && l.waiting !== true) {
        delete l.waiting;
        repairs.push(`${at}.waiting: unreadable, removed`);
      }
      if (l.broken !== undefined && !(isObj(l.broken) && (PRODUCTION_REFS as readonly string[]).includes(l.broken.ref as string) && typeof l.broken.id === 'string')) {
        delete l.broken;
        repairs.push(`${at}.broken: unreadable, removed`);
      }
      // Missing references: keep the line, paused, and say what's missing (ADR-0025 decision 10).
      const qts = strings(l.tanks.quarantine);
      const liveQts = qts.filter((id) => hasKey(s.tanks, id));
      if (liveQts.length && liveQts.length !== qts.length) {
        l.tanks.quarantine = liveQts;
        repairs.push(`${at}.tanks.quarantine: missing tanks removed`);
      }
      const missing: [string, string, 'creature' | 'tank'][] = [
        ['mother', l.pair.motherId, 'creature'],
        ['father', l.pair.fatherId, 'creature'],
        ['breed', l.tanks.breed, 'tank'],
        ['raise', l.tanks.raise, 'tank'],
        ['keep', l.tanks.keep, 'tank'],
      ];
      if (!liveQts.length) missing.push(['quarantine', qts[0] ?? '', 'tank']);
      const gone = missing.find(([, id, kind]) => !hasKey(kind === 'creature' ? s.creatures : s.tanks, id));
      if (gone && !(isObj(l.broken) && l.broken.ref === gone[0] && l.broken.id === gone[1])) {
        const names = isObj(l.tankNames) ? l.tankNames : {};
        l.broken = { ref: gone[0], id: gone[1], name: typeof names[gone[1]] === 'string' ? names[gone[1]] : gone[2] === 'creature' ? 'A parent' : 'A tank', sinceHour: hour };
        repairs.push(`${at}: ${gone[0]} ${shortId(gone[1])} missing, paused`);
      }
      parents.add(l.pair.motherId);
      parents.add(l.pair.fatherId);
    }
    if (p.ended !== undefined) {
      const good = (Array.isArray(p.ended) ? p.ended : []).filter((h: unknown) => isObj(h) && typeof h.id === 'string' && typeof h.name === 'string');
      if (!Array.isArray(p.ended) || good.length !== p.ended.length) {
        p.ended = good;
        repairs.push('production.ended: unreadable entries removed');
      }
    }
    if (p.lastHour !== undefined && !(typeof p.lastHour === 'number' && Number.isFinite(p.lastHour) && p.lastHour <= hour + 1)) {
      repairs.push(`production.lastHour: ${String(p.lastHour).slice(0, 40)}, removed`);
      delete p.lastHour;
    }
  }
  for (const [id, c] of Object.entries(s.creatures ?? {}) as [string, Json][]) {
    if (!isObj(c) || !isObj(c.repro) || c.repro.lineHold === undefined) continue;
    if (c.repro.lineHold === true && parents.has(id)) continue;
    const why = c.repro.lineHold === true ? 'no line' : 'unreadable';
    delete c.repro.lineHold;
    repairs.push(`creature ${id}.repro.lineHold: ${why}, removed`);
  }
}

const finiteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const HOLD_KEYS = ['water', 'salt', 'food', 'feeders', 'lines'] as const;

/**
 * chunk 11 (SHARED-SHOPS.md §4.3) — a shared shop's memory of who changed what in the last 30 seconds: optional (never
 * in a solo save), at most 200 well-formed entries; an unreadable one is dropped, an empty list removed.
 */
function repairTouches(s: Json, repairs: string[]): void {
  if (s.touches === undefined) return;
  const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
  const list = Array.isArray(s.touches) ? (s.touches as Json[]) : [];
  const good = list.filter((t) => isObj(t) && str(t.key, 200) && str(t.by, 80) && str(t.name, 80) && str(t.verb, 40) && finiteNum(t.at) && (t.mark === undefined || (typeof t.mark === 'string' && t.mark.length <= 4000)) && (t.ev === undefined || str(t.ev, 80))).slice(-200);
  if (!Array.isArray(s.touches) || good.length !== list.length) repairs.push('touches: unreadable entries removed');
  if (good.length) s.touches = good;
  else delete s.touches;
}

/**
 * chunk 14 (ADR-0050, src/sim/pool.ts) — a shared shop's money pool, when present: each member's record well formed
 * (an unreadable one is dropped, so that member spends freely as one with no record does; a stray or broken field is
 * removed), at most 3 open requests a member and 100 in all, and an empty pool removed. Never in a solo save.
 */
function repairPool(s: Json, repairs: string[]): void {
  if (s.pool === undefined) return;
  if (!isObj(s.pool)) {
    delete s.pool;
    repairs.push('pool: unreadable, removed');
    return;
  }
  const p = s.pool;
  const key = (k: string) => k.length > 0 && k.length <= 80 && !(k in Object.prototype) && k !== '__proto__' && !/[\u0000-\u001f]/.test(k);
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
  const whole = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10_000_000;
  for (const k of Object.keys(p)) {
    if (k !== 'members' && k !== 'asks') {
      delete p[k];
      repairs.push(`pool.${k.slice(0, 40)}: unknown, removed`);
    }
  }
  if (p.members !== undefined) {
    if (!isObj(p.members)) {
      delete p.members;
      repairs.push('pool.members: unreadable, removed');
    } else {
      for (const [id, m] of Object.entries(p.members) as [string, Json][]) {
        if (!key(id) || !isObj(m) || !text(m.name, 120) || !['free', 'allowance', 'ask'].includes(m.tier) || (m.tier === 'allowance' && !whole(m.allowance))) {
          delete p.members[id];
          repairs.push(`pool member ${id.slice(0, 80)}: unreadable, removed`);
          continue;
        }
        const drop = (f: string) => {
          delete m[f];
          repairs.push(`pool member ${id}.${f}: removed`);
        };
        for (const f of Object.keys(m)) if (!['name', 'tier', 'allowance', 'left', 'day', 'extra', 'approve'].includes(f)) drop(f);
        if (m.tier !== 'allowance') for (const f of ['allowance', 'left', 'day']) if (m[f] !== undefined) drop(f);
        if (m.left !== undefined && !(finiteNum(m.left) && m.left >= 0 && m.left <= m.allowance)) drop('left');
        if (m.day !== undefined && !(Number.isInteger(m.day) && m.day >= 0)) drop('day');
        if ((m.left === undefined) !== (m.day === undefined)) for (const f of ['left', 'day']) if (m[f] !== undefined) drop(f);
        // MAX_EXTRA in src/sim/pool.ts: the commands never go past it
        if (m.extra !== undefined && !(finiteNum(m.extra) && m.extra > 0 && m.extra <= 1e9)) drop('extra');
        if (m.approve !== undefined && m.approve !== true) drop('approve');
      }
      if (!Object.keys(p.members).length) delete p.members;
    }
  }
  if (p.asks !== undefined) {
    const list = Array.isArray(p.asks) ? (p.asks as Json[]) : [];
    const each = new Map<string, number>();
    const good = list.filter((a) => {
      const ok = isObj(a) && text(a.id, 80) && text(a.by, 80) && key(a.by) && text(a.name, 120) && whole(a.amount) && (a.note === undefined || text(a.note, 60)) && finiteNum(a.hour) && Object.keys(a).every((f) => ['id', 'by', 'name', 'amount', 'note', 'hour'].includes(f));
      if (!ok) return false;
      const n = (each.get(a.by) ?? 0) + 1;
      each.set(a.by, n);
      return n <= 3;
    }).slice(0, 100); // MAX_ASKS in src/sim/pool.ts
    if (!Array.isArray(p.asks) || good.length !== list.length) repairs.push('pool.asks: unreadable entries removed');
    if (good.length) p.asks = good;
    else delete p.asks;
  }
  if (p.members === undefined && p.asks === undefined) {
    delete s.pool;
    repairs.push('pool: empty, removed');
  }
}

/**
 * lane:automation (chunk 5, PERSIST-016) — the S3-D fields, when present: the Water room, the Live food room, the egg
 * stock, manual mode, the Operations records and the stock manager's orders switch. Notes only what it changed (a valid
 * save loads with no repairs and an unchanged hash); never creates a room or stock.
 */
function repairAutomation(s: Json, repairs: string[]): void {
  const hour = num(s.clock?.hour, 0);
  const fac = s.facility;
  const fix = (cond: boolean, note: string, apply: () => void) => {
    if (!cond) return;
    apply();
    repairs.push(note);
  };
  if (fac.water !== undefined) {
    const w = fac.water;
    if (!isObj(w)) {
      delete fac.water;
      repairs.push('facility.water: unreadable, removed');
    } else {
      for (const k of ['fresh', 'salt'] as const) fix(!(finiteNum(w[k]) && w[k] >= 0), `facility.water.${k}: ${String(w[k]).slice(0, 40)} → 0`, () => (w[k] = 0));
      // the limits are the Water room's table's (ADR-0037, G1), which core-save-forward-safety pins to the save format
      fix(!(Number.isInteger(w.prepLevel) && w.prepLevel >= 0 && w.prepLevel <= WATER_ROOM.prepRates.length - 1), 'facility.water.prepLevel → 0', () => (w.prepLevel = 0));
      fix(!(Number.isInteger(w.reservoirs) && w.reservoirs >= 0 && w.reservoirs <= WATER_ROOM.maxReservoirs), 'facility.water.reservoirs → 0', () => (w.reservoirs = 0));
      fix(!(finiteNum(w.flowHour) && w.flowHour <= hour + 1), `facility.water.flowHour → ${hour}`, () => (w.flowHour = hour));
      fix(w.lastMixHour !== undefined && !(finiteNum(w.lastMixHour) && w.lastMixHour <= hour + 1), 'facility.water.lastMixHour: removed', () => delete w.lastMixHour);
      fix(w.mix !== undefined && w.mix !== null && !(isObj(w.mix) && finiteNum(w.mix.gal) && w.mix.gal >= 0 && finiteNum(w.mix.readyHour)), 'facility.water.mix: unreadable, emptied', () => (w.mix = null));
    }
  }
  if (fac.food !== undefined) {
    const f = fac.food;
    if (!isObj(f)) {
      delete fac.food;
      repairs.push('facility.food: unreadable, removed');
    } else {
      // chunk 7 (B-203): at most what the room holds (FOOD_ROOM's maxima; a bigger room raises SCHEMA_VERSION, ADR-0037)
      for (const k of ['cones', 'jars'] as const) {
        const list = Array.isArray(f[k]) ? f[k] : null;
        const max = k === 'cones' ? FOOD_ROOM.maxCones : FOOD_ROOM.maxJars;
        const good = (list ?? []).filter((c: unknown) => isObj(c) && (c.startedHour === null || finiteNum(c.startedHour))).slice(0, max);
        fix(!list || good.length !== list.length, `facility.food.${k}: unreadable entries removed`, () => (f[k] = good));
      }
      fix(f.lastHour !== undefined && !(finiteNum(f.lastHour) && f.lastHour <= hour + 1), 'facility.food.lastHour: removed', () => delete f.lastHour);
    }
  }
  const inv = s.inventory;
  fix(inv.brineShrimpEggs !== undefined && !(finiteNum(inv.brineShrimpEggs) && inv.brineShrimpEggs >= 0), 'inventory.brineShrimpEggs → 0', () => (inv.brineShrimpEggs = 0));
  if (isObj(s.staff)) fix(s.staff.ordersOff !== undefined && typeof s.staff.ordersOff !== 'boolean', 'staff.ordersOff: removed', () => delete s.staff.ordersOff);
  for (const e of s.finance.ledger as Json[]) fix(e.line !== undefined && !(isObj(e.line) && isSafeKey(e.line.id) && finiteNum(e.line.n)), 'finance.ledger line: removed', () => delete e.line);
  for (const d of s.finance.daily as Json[]) {
    fix(d.lines !== undefined && !(isObj(d.lines) && Object.values(d.lines).every((v) => isObj(v) && finiteNum(v.n) && finiteNum(v.amount))), `finance.daily ${shortId(d.day)}.lines: removed`, () => delete d.lines);
    for (const k of ['supplies', 'upkeep'] as const) fix(d[k] !== undefined && !finiteNum(d[k]), `finance.daily ${shortId(d.day)}.${k}: removed`, () => delete d[k]);
  }
  if (s.automation === undefined) return;
  const a = s.automation;
  if (!isObj(a)) {
    delete s.automation;
    repairs.push('automation: unreadable, removed');
    return;
  }
  if (a.hold !== undefined) {
    if (!isObj(a.hold)) {
      delete a.hold;
      repairs.push('automation.hold: unreadable, removed');
    } else {
      for (const k of HOLD_KEYS) fix(a.hold[k] !== undefined && typeof a.hold[k] !== 'boolean', `automation.hold.${k}: removed`, () => delete a.hold[k]);
      fix(a.hold.since !== undefined && !finiteNum(a.hold.since), 'automation.hold.since: removed', () => delete a.hold.since);
    }
  }
  if (a.lineWait !== undefined) {
    const lines = new Set(((isObj(s.production) && Array.isArray(s.production.lines) ? s.production.lines : []) as Json[]).map((l) => l?.id));
    if (!isObj(a.lineWait)) {
      delete a.lineWait;
      repairs.push('automation.lineWait: unreadable, removed');
    } else
      for (const [id, v] of Object.entries(a.lineWait)) fix(!lines.has(id) || !finiteNum(v), `automation.lineWait.${shortId(id)}: no such line, removed`, () => delete a.lineWait[id]);
  }
  const dayOk = (d: unknown) => isObj(d) && Number.isInteger(d.day) && isObj(d.used) && isObj(d.made) && finiteNum(d.makeCost) && (d.water === undefined || isObj(d.water));
  fix(a.today !== undefined && !dayOk(a.today), 'automation.today: unreadable, removed', () => delete a.today);
  if (a.days !== undefined) {
    const good = (Array.isArray(a.days) ? a.days : []).filter(dayOk).slice(-8);
    fix(!Array.isArray(a.days) || good.length !== a.days.length, 'automation.days: unreadable entries removed', () => (a.days = good));
  }
  if (a.warned !== undefined) {
    if (!isObj(a.warned)) {
      delete a.warned;
      repairs.push('automation.warned: unreadable, removed');
    } else for (const [k, v] of Object.entries(a.warned)) fix(!finiteNum(v), `automation.warned.${shortId(k)}: removed`, () => delete a.warned[k]);
  }
}

/**
 * Highest base-36 numeric suffix among ids created by nextId (`prefix_<n>`, one underscore). Ids of another shape —
 * the starter's `cr_starter_<seed>` — are not counters: lane:fix-core (P5-12) they used to bump the counter to the
 * seed on every load, so every save/load changed the ids (and hashed sexes) of animals born afterwards.
 */
function maxIdSuffix(s: Json): number {
  let max = 0;
  const scan = (id: unknown) => {
    if (typeof id !== 'string') return;
    const m = /^[a-z]+_([0-9a-z]+)$/.exec(id);
    if (!m) return;
    const n = parseInt(m[1], 36);
    if (Number.isFinite(n) && n > max && n < 1e12) max = n;
  };
  for (const id of Object.keys(s.tanks)) scan(id);
  for (const id of Object.keys(s.creatures)) scan(id);
  for (const id of Object.keys(s.clutches)) scan(id);
  for (const l of s.market.listings) scan(l?.id);
  for (const e of s.log) scan(e?.id);
  return max;
}
