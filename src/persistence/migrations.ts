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
import type { GameState, Tank, Creature, WaterState, CreatureStats, Potentials } from '@/types';
import { SCHEMA_VERSION } from './schema';
import { SaveError } from './types';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { DEFAULT_LIGHTS_ON, defaultLightsOff } from '@/sim/time';
import { renamedMorphs } from '@/sim/life/genetics';
import { sanitizeRareVariant } from '@/sim/life/rareVariants'; // lane:genetics
import { backfillFinds } from '@/sim/life/discovery'; // lane:genetics

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
      node.splice(0, node.length, ...kept);
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

function repairTank(s: Json, id: string, t: Json, repairs: string[]): Tank | null {
  if (!isObj(t)) return null;
  t.id = id;
  if (typeof t.tierId !== 'string' || !TANK_TIER_BY_ID[t.tierId]) {
    repairs.push(`tank ${id}: unknown tier ${String(t.tierId)} → g20L`);
    t.tierId = 'g20L';
  }
  const wc = typeof t.waterClass === 'string' ? t.waterClass : 'freshwater_tropical';
  t.waterClass = wc;
  const marine = wc === 'reef' || wc.startsWith('marine');
  t.environment ??= marine ? 'marine' : wc === 'brackish' ? 'brackish' : 'freshwater';
  t.name ??= TANK_TIER_BY_ID[t.tierId].name;
  t.purpose ??= 'display';
  t.water = fillNumbers(t.water, defaultWater(marine, wc === 'freshwater_cool'), `tank ${id}.water`, repairs);
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
  const out: string[] = [];
  for (const key of p.discoveredMorphs as string[]) {
    const i = key.indexOf(':');
    const sp = i > 0 ? findSpecies(key.slice(0, i)) : undefined;
    const now = sp ? renamedMorphs(sp).get(key.slice(i + 1)) : undefined;
    const k = now ? `${key.slice(0, i)}:${now}` : key;
    if (!out.includes(k)) out.push(k);
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
  s.clock.hour = num(s.clock.hour, 8);
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
  s.inventory.salt = num(s.inventory.salt, 0);
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
    // would be rendered as <img src>, the only way a save could make the game fetch a remote URL.
    if (l.snapshot.photo !== undefined && !(typeof l.snapshot.photo === 'string' && l.snapshot.photo.startsWith('data:image/'))) {
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
  if (s.market.fragSaleHours !== undefined) s.market.fragSaleHours = Array.isArray(s.market.fragSaleHours) ? s.market.fragSaleHours.filter((h: unknown) => typeof h === 'number' && Number.isFinite(h)) : []; // lane:frags

  if (!isObj(s.finance)) s.finance = { money: 0, ledger: [], daily: [] };
  s.finance.money = num(s.finance.money, 0);
  s.finance.ledger = records(s.finance.ledger);
  s.finance.daily = records(s.finance.daily);

  if (!isObj(s.progress)) s.progress = {};
  const p = s.progress;
  p.reputation = num(p.reputation, 0);
  p.mastery = fillNumbers(p.mastery, { husbandry: 0, breeding: 0, aquascaping: 0, marine: 0, business: 0, exhibition: 0 }, 'progress.mastery', repairs);
  for (const k of ['unlocked', 'achievements', 'discoveredSpecies', 'discoveredMorphs'] as const) p[k] = strings(p[k]);
  // lane:genetics — optional lists: repaired when present, derived from the collection when missing (pre-0.4 saves)
  if (p.discoveredStrains !== undefined) p.discoveredStrains = strings(p.discoveredStrains);
  if (p.prismaticFinds !== undefined) p.prismaticFinds = records(p.prismaticFinds).filter((f) => typeof f.speciesId === 'string' && typeof f.creatureId === 'string');
  const quests = records(p.quests);
  p.quests = quests.filter((q) => typeof q.id === 'string');
  if (p.quests.length !== quests.length) repairs.push(`progress.quests: ${quests.length - p.quests.length} without an id removed`);
  if (!isObj(p.research)) p.research = { progressHours: 0, completed: [] };
  p.research.progressHours = num(p.research.progressHours, 0);
  p.research.completed = strings(p.research.completed);
  // lane:core (PERSIST-011, ADR-0005 decision 1) — a project this build doesn't know is kept, like any well-formed id
  // (the research step closes it, as v0.4.0 did); an id that isn't a usable key is removed.
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
  // lane:shows — optional; an unreadable shows block is dropped (src/sim/shows re-creates it lazily), arrays repaired.
  if (s.shows !== undefined && !isObj(s.shows)) {
    delete s.shows;
    repairs.push('shows: unreadable, reset');
  } else if (isObj(s.shows)) {
    for (const k of ['shows', 'entries', 'trophies'] as const) if (!Array.isArray(s.shows[k])) s.shows[k] = [];
    if (!isObj(s.shows.tankAwards)) s.shows.tankAwards = {};
    if (!isObj(s.shows.stats)) s.shows.stats = { entered: 0, placings: 0, wins: 0, bestInShow: 0, prize: 0 };
    s.shows.rng = num(s.shows.rng, s.seed) >>> 0;
    s.shows.seq = Math.max(0, Math.floor(num(s.shows.seq, 0)));
    s.shows.cursorHour = num(s.shows.cursorHour, num(s.clock.hour, 0));
  }
  // lane:staff — optional staff state (absent in old saves; rebuilt lazily). Drop it only if unreadable.
  if (s.staff !== undefined && (!isObj(s.staff) || !Array.isArray(s.staff.roster))) {
    delete s.staff;
    repairs.push('staff: unreadable, reset');
  } else if (isObj(s.staff)) {
    for (const k of ['candidates', 'feeds', 'talks'] as const) if (!Array.isArray(s.staff[k])) s.staff[k] = [];
    if (!isObj(s.staff.care)) s.staff.care = {};
    if (!isObj(s.staff.warned)) s.staff.warned = {};
    s.staff.roster = (s.staff.roster as Json[]).filter((m) => isObj(m) && typeof m.id === 'string' && typeof m.role === 'string');
    for (const m of s.staff.roster as Json[]) {
      if (!Array.isArray(m.tankIds)) m.tankIds = [];
      m.tankIds = (m.tankIds as unknown[]).filter((id) => hasKey(s.tanks, id));
      m.skill = Math.max(1, Math.min(5, Math.round(num(m.skill, 1))));
      m.wage = Math.max(0, num(m.wage, 60));
      m.xp = Math.max(0, num(m.xp, 0));
      m.hiredHour = num(m.hiredHour, num(s.clock?.hour, 0));
      m.avatarSeed = num(m.avatarSeed, 1);
      if (typeof m.name !== 'string' || !m.name) m.name = 'Team member';
      if (typeof m.trait !== 'string') m.trait = 'quick_learner';
      if (m.unpaidDays !== undefined) m.unpaidDays = Math.max(0, Math.floor(num(m.unpaidDays, 0)));
    }
  }
  delete s.offlineGrace;
  renameLegacyMorphs(s);
  backfillFinds(s as GameState); // lane:genetics — only fills lists a pre-0.4 save lacks; silent
  if (s.isShowcase === undefined) s.isShowcase = false;
  // Keep the id counter ahead of every id we know about so new ids never collide after a repair.
  s.idCounter = Math.max(s.idCounter, maxIdSuffix(s));
  return repairs;
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
