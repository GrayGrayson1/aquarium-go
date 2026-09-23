/**
 * Shared helpers for the species breeding modules. OWNER: lane "breeding".
 * Pure functions over GameState (Immer drafts). Randomness only via ctx.rng / simRng(state);
 * cosmetic anchor jitter uses a hash-seeded RNG so it never disturbs the simulation stream.
 */
import { pluralPhrase } from '@/sim/economy/util';
import type {
  Creature,
  CreatureEvent,
  DecorInstance,
  EquipmentKind,
  FoodTag,
  GameEvent,
  GameState,
  SpeciesDefinition,
  Tank,
} from '@/types';
import type { SimContext } from '@/sim/context';
import { emitEvent } from '@/sim/context';
import { hashString, mulberry32, type Rng } from '@/sim/rng';
import { hourOfDay, lightsOn, HOURS_PER_DAY } from '@/sim/time';
import { decorAnchors, tankDims, type WorldAnchor } from '@/sim/tankSpace';
import { tankHabitat, type TankHabitat } from '@/sim/aquascape';
import type { IncidentRisk } from '@/sim/compat';
import { computeTankEnv, effectiveBioload } from '@/sim/water';
import { findSpecies } from '@/data/species';
import { getDecorDef } from '@/data/catalog/decor';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getTankTier } from '@/data/catalog/tanks';
import type { TankInfo } from './types';
import { residentsOf } from '../../residents'; // lane:perf2

// ───────────────────────────── numbers ─────────────────────────────

export const READY = 60;
/** Tank capacity in adult-equivalent bioload units per gallon (1 unit ≈ one ~5 cm community fish). */
export const UNITS_PER_GALLON = 0.5;
/** Bubble nests need a surface agitation below this. */
export const SURFACE_CALM_MAX = 0.4;
/** Cover needed by egg-scattering spawners (moss, fine-leaved plants). */
export const COVER_FOR_SPAWNING = 0.4;
/** Hours after fry become free-swimming before a guarding betta male starts eating them. */
export const FRY_GRACE_H = 12;
/** Fraction of planktonic larvae lost per stage in a display tank (filters, skimmers, tankmates). */
export const PLANKTONIC_LOSS = 0.9;
export const HISTORY_CAP = 40;

export const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);
export const clamp01 = (v: number) => clamp(v, 0, 1);
/** 0 at lo, 1 at hi (linear, clamped). */
export const ramp = (v: number, lo: number, hi: number) => clamp01((v - lo) / (hi - lo));

export function approxDuration(hours: number): string {
  const h = Math.max(0, hours);
  if (h < 1.5) return '~1 h';
  if (h < 36) return `~${Math.round(h)} h`;
  const d = Math.round(h / HOURS_PER_DAY);
  return `~${d} day${d === 1 ? '' : 's'}`;
}

export const fmtTemp = (c: number) => `${Math.round(c * 10) / 10} °C`;

// ───────────────────────────── creatures ─────────────────────────────

export const isAlive = (c: Creature | undefined | null): c is Creature => !!c && (c.status === 'alive' || c.status === 'listed');
/** Non-narrowing variant for creatures that are known to exist. */
export const isGone = (c: Creature) => c.status !== 'alive' && c.status !== 'listed';

export const ageDaysAt = (c: Creature, hour: number) => Math.max(0, (hour - c.bornHour) / HOURS_PER_DAY);

export function isMature(c: Creature | undefined | null, sp: SpeciesDefinition, hour: number): boolean {
  if (!isAlive(c)) return false;
  if (c.lifeStage === 'egg' || c.lifeStage === 'larva' || c.lifeStage === 'fry') return false;
  return ageDaysAt(c, hour) >= sp.breeding.maturityDays - 1e-6;
}

export const daysToMaturity = (c: Creature, sp: SpeciesDefinition, hour: number) => Math.max(0, sp.breeding.maturityDays - ageDaysAt(c, hour));

export type Role = 'male' | 'female' | 'herm' | 'transitioning' | null;

/** Functional reproductive role (true role; the observable `sex` may still be 'unknown'). */
export function roleOf(c: Creature, sp: SpeciesDefinition): Role {
  if (sp.sexSystem === 'simultaneous_hermaphrodite') return 'herm';
  if (sp.sexSystem === 'not_applicable') return null;
  switch (c.reproRole) {
    case 'male':
      return 'male';
    case 'female':
      return 'female';
    case 'transitioning_female':
      return 'transitioning';
  }
  if (c.sex === 'male' || c.sex === 'female') return c.sex;
  return null;
}

/**
 * Old saves / market stock may carry 'undifferentiated' mature animals. Give gonochoristic adults a stable hidden
 * role (hash of id — no RNG draw), protogynous adults start female. Protandrous (clownfish) roles are handled by the
 * clownfish hierarchy.
 */
export function ensureRole(c: Creature, sp: SpeciesDefinition, hour: number): void {
  if (c.reproRole !== 'undifferentiated') return;
  if (sp.sexSystem === 'simultaneous_hermaphrodite' || sp.sexSystem === 'not_applicable') return;
  if (c.sex === 'male' || c.sex === 'female') {
    c.reproRole = c.sex;
    return;
  }
  if (!isMature(c, sp, hour)) return;
  if (sp.sexSystem === 'gonochoristic') c.reproRole = hashString(c.id) & 1 ? 'female' : 'male';
  else if (sp.sexSystem === 'protogynous') c.reproRole = 'female';
}

/** Pure version of roleOf + ensureRole (for read-only UI queries — never writes state). */
export function effectiveRole(c: Creature, sp: SpeciesDefinition, hour: number): Role {
  const r = roleOf(c, sp);
  if (r) return r;
  if (c.reproRole !== 'undifferentiated' || !isMature(c, sp, hour)) return null;
  if (sp.sexSystem === 'gonochoristic') return hashString(c.id) & 1 ? 'female' : 'male';
  if (sp.sexSystem === 'protogynous') return 'female';
  if (sp.sexSystem === 'protandrous') return 'male';
  return null;
}

/** Reveal the observable sex once an animal has actually bred. */
export function revealSex(c: Creature, sp: SpeciesDefinition, as: 'male' | 'female'): void {
  if (sp.sexSystem === 'simultaneous_hermaphrodite' || sp.sexSystem === 'not_applicable') return;
  if (c.sex === 'unknown') c.sex = as;
}

/** Normalise repro state from older saves. */
export function normalizeRepro(c: Creature, hour: number): void {
  if (!c.repro) c.repro = { stage: 'idle', stageSinceHour: hour, totalClutches: 0, totalOffspringRaised: 0 };
  if (!c.repro.stage) c.repro.stage = 'idle';
  if (!Number.isFinite(c.repro.stageSinceHour)) c.repro.stageSinceHour = hour;
  if (!Number.isFinite(c.repro.totalClutches)) c.repro.totalClutches = 0;
  if (!Number.isFinite(c.repro.totalOffspringRaised)) c.repro.totalOffspringRaised = 0;
}

export function setStage(c: Creature, stage: string, hour: number, endsHour?: number): void {
  c.repro.stage = stage;
  c.repro.stageSinceHour = hour;
  c.repro.progress = 0;
  c.repro.stageEndsHour = endsHour;
}

/** 0..1 progress of a timed stage (uses stageEndsHour or carryingUntilHour). */
export function stageProgress(c: Creature, hour: number): number {
  const r = c.repro;
  const end = r.stageEndsHour ?? r.carryingUntilHour;
  if (end === undefined) return clamp01(r.progress ?? 0);
  const span = end - r.stageSinceHour;
  return span > 0 ? clamp01((hour - r.stageSinceHour) / span) : 1;
}

export function stageDue(c: Creature, hour: number): boolean {
  return c.repro.stageEndsHour !== undefined && hour >= c.repro.stageEndsHour - 1e-9;
}

export function startResting(c: Creature, hour: number, hours: number): void {
  setStage(c, 'resting', hour, hour + Math.max(1, hours));
  c.repro.clutchId = undefined;
  c.repro.carryingUntilHour = undefined;
}

export const isResting = (c: Creature, hour: number) => c.repro.stage === 'resting' && (c.repro.stageEndsHour ?? 0) > hour;

/** Resting → idle when the rest is over. Keeps `progress` updated for timed stages. */
export function tickTimers(c: Creature, hour: number): void {
  if (c.repro.stageEndsHour !== undefined || c.repro.carryingUntilHour !== undefined) c.repro.progress = stageProgress(c, hour);
  if (c.repro.stage === 'resting' && stageDue(c, hour)) setStage(c, 'idle', hour);
}

/** Stages in which an animal is committed to an ongoing breeding event. */
export const BUSY_STAGES = new Set([
  'courting',
  'spawning',
  'depositing',
  'following',
  'laying',
  'guarding',
  'brooding',
  'pregnant',
  'berried',
  'nest_preparing',
  'spent',
  'transitioning_female',
]);

export const isFreeStage = (c: Creature) => c.repro.stage === 'idle' || c.repro.stage === 'conditioning' || c.repro.stage === 'gravid' || c.repro.stage === 'bonding' || c.repro.stage === 'nest_ready' || c.repro.stage === 'nest_building';

export function addHistory(c: Creature, kind: CreatureEvent['kind'], text: string, hour: number): void {
  if (!Array.isArray(c.history)) c.history = [];
  c.history.push({ hour, kind, text });
  if (c.history.length > HISTORY_CAP) c.history.splice(0, c.history.length - HISTORY_CAP);
}

/** Per-creature throttle stored with the life lane's warning map (keys prefixed 'breed:'). */
export function throttle(c: Creature, key: string, hour: number, everyH: number): boolean {
  if (!c.life) c.life = {};
  if (!c.life.warned) c.life.warned = {};
  const k = `breed:${key}`;
  const last = c.life.warned[k];
  if (last !== undefined && hour - last < everyH) return false;
  c.life.warned[k] = hour;
  return true;
}

/** Tank-level throttle for tips that are not about one animal. */
export function throttleTank(tank: Tank, key: string, hour: number, everyH: number): boolean {
  const env = ensureEnv(tank, hour);
  if (!env.warned) env.warned = {};
  const last = env.warned[key];
  if (last !== undefined && hour - last < everyH) return false;
  env.warned[key] = hour;
  return true;
}

/**
 * Like throttleTank, but each repeat of the same tip waits twice as long (everyH, 2×, 4×… capped at 16×) — a standing
 * condition ("waiting for a seasonal cue") is worth repeating a couple of times, not every day forever.
 */
export function throttleTankBackoff(tank: Tank, key: string, hour: number, everyH: number): boolean {
  const env = ensureEnv(tank, hour);
  if (!env.warned) env.warned = {};
  const last = env.warned[key];
  const n = env.warned[`${key}#n`] ?? 0;
  if (last !== undefined && hour - last < everyH * Math.pow(2, Math.min(4, n))) return false;
  env.warned[key] = hour;
  env.warned[`${key}#n`] = n + (last !== undefined ? 1 : 0);
  return true;
}

/** Add stress/injury to an animal (harassment, fights). Health never drops below `floor` from breeding causes. */
export function hurt(c: Creature, stress: number, health: number, injury: number, cause: string, floor = 12): void {
  c.stats.stress = clamp(c.stats.stress + stress, 0, 100);
  if (health > 0) c.stats.health = Math.max(Math.min(c.stats.health, floor), c.stats.health - health);
  if (injury > 0 || health > 0) {
    if (!c.life) c.life = {};
    if (injury > 0) c.life.injury = clamp((c.life.injury ?? 0) + injury, 0, 100);
    if (health > 0) {
      if (!c.life.damage) c.life.damage = {};
      c.life.damage[cause] = (c.life.damage[cause] ?? 0) + health;
    }
  }
}

// ───────────────────────────── naming / text ─────────────────────────────

const PROPER_PREFIXES = ['Banggai', 'Endler', 'Amano', 'African', 'White Cloud', 'Kuhli', 'Royal'];

/** Species name for running text: "axolotl", "betta", "Banggai cardinalfish". */
export function spName(sp: SpeciesDefinition): string {
  const n = sp.commonName;
  if (PROPER_PREFIXES.some((p) => n.startsWith(p))) {
    const [first, ...rest] = n.split(' ');
    return [first, ...rest.map((w) => w.toLowerCase())].join(' ');
  }
  return n.toLowerCase();
}

/** Plural species name for running text: "axolotls", "ocellaris clownfish", "cherry shrimp", "fancy guppies". */
export function spPlural(sp: SpeciesDefinition): string {
  return pluralPhrase(spName(sp));
}

export function plural(n: number, one: string, many?: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : (many ?? `${one}s`)}`;
}

/**
 * Should a routine breeding milestone toast? Easy colony breeders (guppies, cherry shrimp — difficulty < 0.3) toast
 * only the first `first` times per kind. Harder species toast the first five times, then every fourth time — the
 * fifteenth pea-puffer hatch is still logged, but it no longer interrupts (polish: readable logs over an hour of play).
 */
export function toastWorthy(state: GameState, sp: SpeciesDefinition, kind: string, first = 3): boolean {
  const key = `toast_${kind}_${sp.id}`;
  const n = state.progress.counters[key] ?? 0;
  state.progress.counters[key] = n + 1;
  if (sp.breeding.difficulty >= 0.3) return n < Math.max(first, 5) || n % 4 === 0;
  return n < first;
}

export function say(state: GameState, ctx: SimContext | null | undefined, e: Omit<GameEvent, 'id' | 'hour'>): void {
  if (ctx) ctx.emit(e);
  else emitEvent(state, e);
}

// ───────────────────────────── tank environment ─────────────────────────────

export function ensureEnv(tank: Tank, hour: number): NonNullable<Tank['breedingEnv']> {
  if (!tank.breedingEnv) tank.breedingEnv = { tempLog: [], lastLogHour: hour - 1 };
  const env = tank.breedingEnv;
  if (!Array.isArray(env.tempLog)) env.tempLog = [];
  if (!Number.isFinite(env.lastLogHour)) env.lastLogHour = hour - 1;
  return env;
}

export const gallonsOf = (tank: Tank) => {
  try {
    return getTankTier(tank.tierId).gallons;
  } catch {
    return 10;
  }
};

export function coolCueActive(tank: Tank, hour: number): boolean {
  const until = tank.breedingEnv?.coolCueUntilHour;
  return until !== undefined && until > hour;
}

/** Record that a food tag was offered to this tank (feedTank should call noteBreedingFood → this). */
export function noteFoodSeen(tank: Tank, tags: readonly FoodTag[], hour: number): void {
  const env = ensureEnv(tank, hour);
  if (!env.foodSeen) env.foodSeen = {};
  for (const t of tags) env.foodSeen[t] = Math.max(env.foodSeen[t] ?? -Infinity, hour);
}

/** Anything currently in the water column counts as offered. */
export function scanFood(tank: Tank, hour: number): void {
  const fb = tank.water.foodByTag;
  if (!fb) return;
  const seen: FoodTag[] = [];
  for (const k of Object.keys(fb) as FoodTag[]) if ((fb[k] ?? 0) > 1e-4) seen.push(k);
  if (seen.length) noteFoodSeen(tank, seen, hour);
}

/** 1 if one of `tags` was offered within `fullH`, fading to 0 over the next `fadeH` hours. */
export function foodRecency(tank: Tank, tags: readonly FoodTag[], hour: number, fullH = 12, fadeH = 14): number {
  const seen = tank.breedingEnv?.foodSeen;
  if (!seen) return 0;
  let best = 0;
  for (const t of tags) {
    const last = seen[t];
    if (last === undefined) continue;
    const age = hour - last;
    const v = age <= fullH ? 1 : age >= fullH + fadeH ? 0 : 1 - (age - fullH) / fadeH;
    if (v > best) best = v;
  }
  return best;
}

/** 0..1 how conditioned an adult is for spawning (rich/live foods). Species without conditioning foods → 1. */
export function conditioningLevel(tank: Tank, c: Creature, sp: SpeciesDefinition, hour: number): number {
  const tags = sp.breeding.conditions.needsConditioningFood;
  if (!tags || !tags.length) return 1;
  const lifeCond = clamp01((c.life?.conditioning ?? 0) / 100);
  let diet = 0;
  const rd = c.life?.recentDiet;
  if (rd) for (const t of tags) diet += rd[t] ?? 0;
  const dietLevel = clamp01(diet);
  const tankLevel = 0.9 * foodRecency(tank, tags, hour, 24, 36);
  return Math.max(lifeCond, dietLevel, tankLevel);
}

// ───────────────────────────── habitat / equipment ─────────────────────────────

const EMPTY_HABITAT: TankHabitat = {
  hides: 0,
  cover: 0,
  sightBreak: 0,
  hitching: 0,
  grazing: 0,
  enrichment: 0,
  nitrateUptake: 0,
  oxygen: 0,
  hasHost: false,
  nestSites: 0,
  hazards: { sharp: false, ingestible: false },
  corals: { soft: 0, lps: 0, sps: 0, zoanthid: 0, mushroom: 0, gsp: 0 },
};

/** Habitat from the aquascape lane, backed by a local estimate from decor defs (robust to partial implementations). */
export function habitatOf(state: GameState, tank: Tank): TankHabitat {
  let h: TankHabitat = EMPTY_HABITAT;
  try {
    h = tankHabitat(state, tank) ?? EMPTY_HABITAT;
  } catch {
    h = EMPTY_HABITAT;
  }
  const gallons = gallonsOf(tank);
  let cover = 0;
  let hides = 0;
  let hitching = 0;
  let grazing = 0;
  let nestSites = 0;
  let hasHost = false;
  for (const inst of tank.decor ?? []) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    const s = inst.scale || 1;
    const g = def.category === 'plant' ? 0.4 + 0.6 * (inst.growth ?? 1) : 1;
    cover += (def.habitat.cover * s * g) / Math.max(0.5, gallons / 10);
    hides += def.habitat.hides;
    hitching += def.habitat.hitching;
    grazing += def.habitat.grazing;
    if (def.category === 'anemone') hasHost = true;
    for (const a of def.anchors) {
      if (a.kind === 'host') hasHost = true;
      if (a.kind === 'nest_site' || a.kind === 'cave' || a.kind === 'host') nestSites += 1;
    }
  }
  return {
    ...h,
    cover: clamp01(Math.max(h.cover ?? 0, cover)),
    hides: Math.max(h.hides ?? 0, hides),
    hitching: Math.max(h.hitching ?? 0, hitching),
    grazing: Math.max(h.grazing ?? 0, grazing),
    nestSites: Math.max(h.nestSites ?? 0, nestSites),
    hasHost: !!h.hasHost || hasHost,
  };
}

const DEFAULT_AGITATION: Partial<Record<EquipmentKind, number>> = { airstone: 0.55, powerhead: 0.45, wavemaker: 0.5, filter: 0.22, skimmer: 0.12 };
const FLOW_KINDS = new Set<EquipmentKind>(['filter', 'airstone', 'powerhead', 'wavemaker']);

function guessKind(defId: string): EquipmentKind | undefined {
  const id = defId.toLowerCase();
  if (id.includes('air')) return 'airstone';
  if (id.includes('powerhead')) return 'powerhead';
  if (id.includes('wave')) return 'wavemaker';
  if (id.includes('skimmer')) return 'skimmer';
  if (id.includes('filter') || id.includes('hob') || id.includes('canister') || id.includes('sponge')) return 'filter';
  if (id.includes('lid')) return 'lid';
  if (id.includes('refugium')) return 'refugium';
  return undefined;
}

export function equipmentKind(defId: string): EquipmentKind | undefined {
  return getEquipmentDef(defId)?.kind ?? guessKind(defId);
}

/** Surface agitation from running equipment (0 = glassy calm). Dense floating cover softens it. */
export function surfaceAgitation(tank: Tank, cover = 0): number {
  let a = 0;
  for (const eq of tank.equipment ?? []) {
    if (!eq.on || eq.failed) continue;
    const def = getEquipmentDef(eq.defId);
    const kind = def?.kind ?? guessKind(eq.defId);
    if (!kind) continue;
    let v = def?.stats.agitation ?? DEFAULT_AGITATION[kind] ?? 0;
    if (FLOW_KINDS.has(kind) && eq.setting !== undefined && eq.setting >= 0 && eq.setting <= 1) v *= 0.25 + 0.75 * eq.setting;
    a += v;
  }
  return a * (1 - 0.3 * clamp01(cover));
}

export const hasEquipment = (tank: Tank, kind: EquipmentKind) =>
  (tank.equipment ?? []).some((e) => e.on !== false && !e.failed && equipmentKind(e.defId) === kind);

export const hasLid = (tank: Tank) => (tank.equipment ?? []).some((e) => !e.failed && equipmentKind(e.defId) === 'lid');

// ───────────────────────────── time of day ─────────────────────────────

export const isNight = (tank: Tank, hour: number) => !lightsOn(tank.lighting.onHour, tank.lighting.offHour, hour);

export function inWindow(hour: number, start: number, lengthH: number): boolean {
  const h = hourOfDay(hour);
  const s = ((start % 24) + 24) % 24;
  const d = (((h - s) % 24) + 24) % 24;
  return d < lengthH;
}

export const isDawn = (tank: Tank, hour: number) => inWindow(hour, tank.lighting.onHour, 3);
export const isMorning = (tank: Tank, hour: number) => inWindow(hour, tank.lighting.onHour, 4);
export const isEvening = (tank: Tank, hour: number) => inWindow(hour, tank.lighting.offHour - 5, 5);
export const dayIndex = (hour: number) => Math.floor(hour / HOURS_PER_DAY);

export type SpawnWindow = 'morning' | 'evening' | 'night' | 'dawn' | 'any';
export function inSpawnWindow(tank: Tank, hour: number, w: SpawnWindow): boolean {
  switch (w) {
    case 'morning':
      return isMorning(tank, hour);
    case 'dawn':
      return isDawn(tank, hour);
    case 'evening':
      return isEvening(tank, hour);
    case 'night':
      return isNight(tank, hour);
    default:
      return true;
  }
}

// ───────────────────────────── stocking / capacity ─────────────────────────────

export const capacityUnits = (tank: Tank) => gallonsOf(tank) * UNITS_PER_GALLON;

/** Adult-equivalent bioload of one animal (juveniles count half — they will grow). */
export function unitsOf(c: Creature, hour: number): number {
  const sp = findSpecies(c.speciesId);
  if (!sp) return 1;
  const b = Math.max(0.05, sp.bioload);
  if (sp.category === 'coral' || sp.category === 'anemone') return b * 0.3;
  return isMature(c, sp, hour) || c.lifeStage === 'adult' || c.lifeStage === 'elder' ? b : b * 0.5;
}

export function livingIn(state: GameState, tankId: string): Creature[] {
  return residentsOf(state, tankId); // lane:perf2 — alive + listed (= isAlive), per-step index inside a sim step
}

export function usedUnits(state: GameState, tankId: string, hour: number): number {
  let u = 0;
  for (const c of livingIn(state, tankId)) u += unitsOf(c, hour);
  return u;
}

/** Juveniles are planned at ≥ this fraction of an adult's bioload (they will grow) — bounds colonies. */
export const JUVENILE_RESERVE = 0.6;

/** Bioload units an animal takes for capacity planning (water lane's size-scaled bioload; juveniles reserved). */
export function plannedUnits(sp: SpeciesDefinition, sizeCm: number, mature: boolean): number {
  let eff = Math.max(0.005, sp.bioload * (mature ? 1 : 0.5));
  try {
    const v = effectiveBioload(sp, sizeCm);
    if (Number.isFinite(v) && v > 0) eff = v;
  } catch {
    /* water lane unavailable — keep the estimate */
  }
  return mature ? eff : Math.max(eff, JUVENILE_RESERVE * Math.max(0.005, sp.bioload));
}

/**
 * Tank stocking for breeding decisions: capacity from the water lane's model when available
 * (min(space, filtration) units), usage = Σ planned units of the living animals.
 */
export function stockingOf(state: GameState, tank: Tank, hour: number): { cap: number; used: number } {
  let cap = capacityUnits(tank);
  try {
    const env = computeTankEnv(state, tank);
    const c = Math.min(env.spaceCapUnits, env.processCapUnits);
    if (Number.isFinite(c) && c > 0) cap = c;
  } catch {
    /* water lane unavailable — gallons-based estimate */
  }
  let used = 0;
  for (const c of livingIn(state, tank.id)) {
    const sp = findSpecies(c.speciesId);
    if (!sp) {
      used += 1;
      continue;
    }
    const mature = isMature(c, sp, hour) || c.lifeStage === 'adult' || c.lifeStage === 'elder';
    used += plannedUnits(sp, c.sizeCm, mature);
  }
  return { cap, used };
}

/** Bioload units one new juvenile of this size is planned at. */
export function unitsPerJuvenile(sp: SpeciesDefinition, sizeCm: number): number {
  return plannedUnits(sp, sizeCm, false);
}

/** How many more juveniles of this species (at `sizeCm`, default half-grown) the tank can take right now. */
export function juvenileSlots(state: GameState, tank: Tank, sp: SpeciesDefinition, hour: number, sizeCm = sp.adultSizeCm * 0.5): number {
  const { cap, used } = stockingOf(state, tank, hour);
  const per = unitsPerJuvenile(sp, sizeCm);
  return Math.max(0, Math.floor((cap - used) / per + 1e-9));
}

/** Nursery = marked as nursery, or a tank holding no adult animals at all (species-only rearing tank). */
export function isNurseryFor(state: GameState, tank: Tank, hour: number): boolean {
  if (tank.purpose === 'nursery') return true;
  for (const c of livingIn(state, tank.id)) {
    const sp = findSpecies(c.speciesId);
    if (!sp) continue;
    if (sp.category === 'coral') continue;
    if (isMature(c, sp, hour) || c.lifeStage === 'adult' || c.lifeStage === 'elder') return false;
  }
  return true;
}

// ───────────────────────────── water ─────────────────────────────

/** Severity (0 = fine) of the water for delicate eggs/young of this species. */
export function youngWaterSeverity(tank: Tank, sp: SpeciesDefinition): number {
  if (tank.environment !== sp.environment) return 6;
  const w = tank.water;
  let sev = 0;
  sev += Math.max(0, (w.ammonia ?? 0) - 0.2) * 1.6;
  sev += Math.max(0, (w.nitrite ?? 0) - 0.2) * 1.6;
  sev += Math.max(0, (w.nitrate ?? 0) - 60) / 100;
  const t = w.tempC;
  if (t < sp.tempC.min) sev += 0.3 + (sp.tempC.min - t) * 0.25;
  if (t > sp.tempC.max) sev += 0.3 + (t - sp.tempC.max) * 0.25;
  if ((w.oxygen ?? 1) < 0.55) sev += (0.55 - w.oxygen) * 2;
  if (sp.salinitySG) {
    const s = w.salinitySG;
    if (s < sp.salinitySG.min) sev += (sp.salinitySG.min - s) * 150;
    if (s > sp.salinitySG.max) sev += (s - sp.salinitySG.max) * 150;
  }
  return Number.isFinite(sev) ? sev : 0;
}

/** Is the water good enough for spawning at all (adults)? Returns a reason when not. */
export function spawningWaterIssue(tank: Tank, sp: SpeciesDefinition): string | null {
  if (tank.environment !== sp.environment) return `${tank.name} is ${tank.environment}; ${spPlural(sp)} need ${sp.environment === 'freshwater' ? 'fresh' : sp.environment === 'marine' ? 'salt' : sp.environment} water.`; // lane:w2-ui: not "freshwater water"
  const w = tank.water;
  if (w.ammonia > 0.25 || w.nitrite > 0.25) return 'Ammonia/nitrite is detectable — clean, stable water comes first.';
  return null;
}

// ───────────────────────────── anchors ─────────────────────────────

export type Vec = { x: number; y: number; z: number };

export function decorAnchorsOf(tank: Tank, kinds?: readonly WorldAnchor['kind'][]): WorldAnchor[] {
  const out: WorldAnchor[] = [];
  for (const inst of tank.decor ?? []) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    for (const a of decorAnchors(inst, def)) if (!kinds || kinds.includes(a.kind)) out.push(a);
  }
  return out;
}

interface DecorSpot {
  inst: DecorInstance;
  h: number;
  category: string;
}

function decorSpots(tank: Tank, categories?: readonly string[]): DecorSpot[] {
  const out: DecorSpot[] = [];
  for (const inst of tank.decor ?? []) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    if (categories && !categories.includes(def.category)) continue;
    const g = def.category === 'plant' ? 0.4 + 0.6 * (inst.growth ?? 1) : 1;
    out.push({ inst, h: def.size.h * (inst.scale || 1) * g, category: def.category });
  }
  return out;
}

/** Anchors of the given kinds on decor of the given categories. */
function anchorsOn(tank: Tank, categories: readonly string[], kinds: readonly WorldAnchor['kind'][]): WorldAnchor[] {
  const out: WorldAnchor[] = [];
  for (const inst of tank.decor ?? []) {
    const def = getDecorDef(inst.defId);
    if (!def || !categories.includes(def.category)) continue;
    for (const a of decorAnchors(inst, def)) if (kinds.includes(a.kind)) out.push(a);
  }
  return out;
}

export type SiteKind = 'surface' | 'plants_low' | 'plants_mid' | 'rock' | 'host_rock' | 'glass' | 'cave' | 'above_water' | 'midwater';

/** Cosmetic, stable RNG for anchor jitter (never touches the sim RNG stream). */
export const anchorRng = (key: string): Rng => mulberry32(hashString(key));

const toVec = (a: WorldAnchor): Vec => ({ x: a.pos[0], y: a.pos[1], z: a.pos[2] });

/**
 * Choose where eggs/nest/fry sit in tank-local metres. Uses the decor catalog's anchors (the decor generators build
 * real geometry there: flat leaves, cave mouths, nest slates, host discs) and falls back to decor positions or
 * sensible spots inside the swim bounds. Returns a primary anchor + extra spots for eggs laid in several places.
 */
export function pickSite(tank: Tank, kind: SiteKind, key: string, extras = 0): { anchor: Vec; extra: Vec[] } {
  const d = tankDims(tank);
  const rng = anchorRng(`${tank.id}:${key}`);
  const inset = (v: number, half: number) => clamp(v, -half + 0.02, half - 0.02);
  const floorY = d.substrateY + 0.01;
  const clampV = (v: Vec): Vec => ({ x: inset(v.x, d.L / 2), y: clamp(v.y, d.substrateY, d.waterY - 0.004), z: inset(v.z, d.W / 2) });
  const fallbackX = () => rng.range(-d.L * 0.35, d.L * 0.35);
  const fallbackZ = () => rng.range(-d.W * 0.3, d.W * 0.1);
  const plants = decorSpots(tank, ['plant']);
  const hard = decorSpots(tank, ['hardscape', 'ornament', 'substrate_feature']);
  const baseY = (sp: DecorSpot) => (Number.isFinite(sp.inst.y) ? sp.inst.y : d.substrateY);

  const around = (p: Vec, n: number, spreadX: number, spreadY: number): Vec[] => {
    const out: Vec[] = [];
    for (let i = 0; i < n; i++) out.push(clampV({ x: p.x + rng.range(-spreadX, spreadX), y: p.y + rng.range(-spreadY, spreadY), z: p.z + rng.range(-spreadX, spreadX) * 0.6 }));
    return out;
  };
  const spread = (pool: Vec[], n: number, jitter: number): Vec[] => {
    const extra: Vec[] = [];
    for (let i = 0; i < n; i++) {
      const base = pool[(i + 1) % pool.length];
      extra.push(clampV({ x: base.x + rng.range(-jitter, jitter), y: base.y + rng.range(-jitter * 0.5, jitter), z: base.z + rng.range(-jitter, jitter) * 0.7 }));
    }
    return extra;
  };

  let anchor: Vec;
  switch (kind) {
    case 'surface': {
      // A bubble nest floats at the surface above cover: over the tallest plant, else a broad leaf.
      const tall = [...plants].sort((a, b) => b.h - a.h)[0];
      const leaf = anchorsOn(tank, ['plant'], ['leaf_rest'])[0];
      const x = tall ? tall.inst.x : leaf ? leaf.pos[0] : -d.L * 0.3;
      const z = tall ? tall.inst.z : leaf ? leaf.pos[2] : -d.W * 0.15;
      anchor = { x: inset(x, d.L / 2), y: d.waterY - 0.006, z: inset(z, d.W / 2) };
      return { anchor, extra: [] };
    }
    case 'plants_low':
    case 'plants_mid': {
      const low = kind === 'plants_low';
      const plantAnchors = anchorsOn(tank, ['plant'], ['leaf_rest', 'graze', 'perch', 'rest']).map(toVec);
      const plantPos: Vec[] = plants.map((p) => ({ x: p.inst.x + rng.range(-0.01, 0.01), y: baseY(p) + Math.max(0.008, p.h * (low ? 0.2 : 0.5)), z: p.inst.z }));
      const hardAnchors = anchorsOn(tank, ['hardscape', 'ornament'], ['graze', 'rest', 'perch']).map(toVec);
      let pool = low ? [...plantPos, ...plantAnchors.filter((v) => v.y - d.substrateY < 0.08)] : [...plantAnchors, ...plantPos, ...hardAnchors];
      if (!pool.length) pool = hard.map((p) => ({ x: p.inst.x, y: baseY(p) + p.h * 0.5, z: p.inst.z }));
      if (!pool.length) for (let i = 0; i < 3; i++) pool.push({ x: fallbackX(), y: floorY + (low ? 0.02 : (d.waterY - d.substrateY) * 0.25), z: fallbackZ() });
      rng.shuffle(pool);
      anchor = clampV(pool[0]);
      return { anchor, extra: spread(pool, extras, 0.025) };
    }
    case 'host_rock':
    case 'rock': {
      // Clownfish lay on a flat surface at the foot of their host; otherwise a nest slate or flat rock.
      let a: WorldAnchor | undefined;
      if (kind === 'host_rock') {
        for (const inst of tank.decor ?? []) {
          const def = getDecorDef(inst.defId);
          if (!def) continue;
          const as = decorAnchors(inst, def);
          if (as.some((x) => x.kind === 'host')) a = as.find((x) => x.kind === 'nest_site');
          if (a) break;
        }
      }
      const prefs: WorldAnchor['kind'][] = kind === 'host_rock' ? ['nest_site', 'host', 'rest'] : ['nest_site', 'rest', 'host'];
      if (!a) {
        const all = decorAnchorsOf(tank, prefs);
        for (const k of prefs) {
          a = all.find((x) => x.kind === k);
          if (a) break;
        }
      }
      if (a) {
        const off = a.kind === 'host' ? 0.035 : 0; // beside (not inside) a host
        anchor = clampV({ x: a.pos[0] + off, y: a.pos[1], z: a.pos[2] });
      } else if (hard.length) {
        const r = [...hard].sort((p, q) => q.h - p.h)[0];
        anchor = clampV({ x: r.inst.x + 0.02, y: baseY(r) + r.h * 0.6, z: r.inst.z + 0.02 });
      } else anchor = clampV({ x: fallbackX(), y: floorY + 0.01, z: -d.W * 0.2 });
      return { anchor, extra: around(anchor, extras, 0.01, 0.004) };
    }
    case 'cave': {
      const a = decorAnchorsOf(tank, ['cave'])[0] ?? decorAnchorsOf(tank, ['hide'])[0];
      anchor = a ? clampV(toVec(a)) : clampV({ x: fallbackX(), y: floorY + 0.015, z: -d.W * 0.25 });
      return { anchor, extra: around(anchor, extras, 0.008, 0.005) };
    }
    case 'glass': {
      // clustered on the front glass, upper half (classic corydoras spot)
      anchor = clampV({ x: rng.range(-d.L * 0.35, d.L * 0.35), y: d.substrateY + (d.waterY - d.substrateY) * rng.range(0.55, 0.85), z: d.W / 2 - 0.004 });
      const extra: Vec[] = [];
      for (let i = 0; i < extras; i++) extra.push(clampV({ x: anchor.x + rng.range(-0.06, 0.06), y: anchor.y + rng.range(-0.04, 0.03), z: anchor.z }));
      return { anchor, extra };
    }
    case 'above_water': {
      const gap = Math.max(0.006, (d.H - d.waterY) * 0.5);
      anchor = { x: inset(rng.range(-d.L * 0.35, d.L * 0.35), d.L / 2), y: d.waterY + Math.min(0.04, gap), z: -d.W / 2 + 0.004 };
      return { anchor, extra: [] };
    }
    case 'midwater':
    default: {
      const p = plants[0] ?? hard[0];
      const x = p ? p.inst.x + rng.range(-0.04, 0.04) : fallbackX();
      const z = p ? p.inst.z + rng.range(-0.03, 0.03) : fallbackZ();
      anchor = clampV({ x, y: d.substrateY + (d.waterY - d.substrateY) * rng.range(0.25, 0.5), z });
      return { anchor, extra: around(anchor, extras, 0.04, 0.03) };
    }
  }
}

/** Does the tank offer a nest site (rock/tile/host/cave anchor, habitat nest sites, or any hardscape)? */
export function hasNestSite(tank: Tank, habitat: TankHabitat): boolean {
  if (habitat.nestSites > 0 || habitat.hasHost) return true;
  if (decorAnchorsOf(tank, ['nest_site', 'host', 'cave', 'rest']).length) return true;
  return decorSpots(tank, ['hardscape', 'ornament']).length > 0;
}

export function hasCave(tank: Tank, habitat: TankHabitat): boolean {
  if (decorAnchorsOf(tank, ['cave']).length) return true;
  return habitat.hides >= 1 && habitat.nestSites > 0;
}

// ───────────────────────────── tank info (per sub-step cache) ─────────────────────────────

export function makeTankInfo(state: GameState, tank: Tank, hour: number, risks: () => IncidentRisk[]): TankInfo {
  let hab: TankHabitat | undefined;
  let load: number | undefined;
  let agit: number | undefined;
  let rk: IncidentRisk[] | undefined;
  return {
    habitat: () => (hab ??= habitatOf(state, tank)),
    loadRatio: () => {
      if (load === undefined) {
        const st = stockingOf(state, tank, hour);
        load = st.used / Math.max(0.1, st.cap);
      }
      return load;
    },
    agitation: () => (agit ??= surfaceAgitation(tank, habitatOf(state, tank).cover)),
    youngRisks: () => (rk ??= risks()),
  };
}

// ───────────────────────────── readiness ─────────────────────────────

/** Target breeding readiness 0..100 from welfare, water, conditioning foods, crowding and cooldown. */
export function readinessTarget(tank: Tank, c: Creature, sp: SpeciesDefinition, hour: number, info: TankInfo): number {
  if (!isMature(c, sp, hour)) return 0;
  if (isResting(c, hour)) return 0;
  if (tank.environment !== sp.environment) return 0;
  const s = c.stats;
  let f = 1;
  f *= ramp(s.health, 45, 85);
  f *= 1 - ramp(s.stress, 45, 90);
  f *= 1 - ramp(s.hunger, 55, 90);
  f *= 0.4 + 0.6 * ramp(s.comfort, 25, 65);
  if (c.illness) f *= 0.3;
  const t = tank.water.tempC;
  const cond = sp.breeding.conditions;
  if (t < sp.tempC.min || t > sp.tempC.max) f *= 0.15;
  if (cond.minTempC !== undefined && t < cond.minTempC - 0.25) f *= 0.4;
  if (cond.maxTempC !== undefined && t > cond.maxTempC + 0.25) f *= 0.35;
  if (cond.needsConditioningFood?.length) f *= 0.45 + 0.55 * conditioningLevel(tank, c, sp, hour);
  const load = info.loadRatio();
  if (load > 1.05) f *= 0.15;
  else if (load > 0.85) f *= 0.6;
  if (cond.minTankGallons && gallonsOf(tank) < cond.minTankGallons) f *= 0.5;
  f *= Math.min(1, 0.85 + 0.3 * ((c.genome?.potentials?.fertility ?? 50) / 100));
  return 100 * clamp01(f);
}

export function updateReadiness(tank: Tank, c: Creature, sp: SpeciesDefinition, hour: number, dt: number, info: TankInfo): void {
  const cur = Number.isFinite(c.stats.breedingReadiness) ? c.stats.breedingReadiness : 0;
  const target = readinessTarget(tank, c, sp, hour, info);
  const k = target > cur ? 1 - Math.exp(-dt / 10) : 1 - Math.exp(-dt / 4);
  c.stats.breedingReadiness = clamp(cur + (target - cur) * k, 0, 100);
}

export const isReady = (c: Creature) => c.stats.breedingReadiness >= READY;

/** Roll a clutch size from data, scaled by the mother's fertility potential and size. */
export function rollClutchSize(rng: Rng, sp: SpeciesDefinition, mother: Creature | null | undefined): number {
  const { min, max } = sp.breeding.clutchSize;
  const fert = (mother?.genome?.potentials?.fertility ?? 50) / 100;
  const sizeF = mother ? clamp(mother.sizeCm / Math.max(0.1, sp.adultSizeCm), 0.55, 1.15) : 1;
  const t = clamp01((0.15 + 0.5 * fert + 0.35 * rng.next()) * sizeF);
  return Math.max(1, Math.round(min + (Math.max(min, max) - min) * t));
}

/** Breeding line key: keep a shared shop line, otherwise start a new line for this pairing. */
export function lineIdFor(sp: SpeciesDefinition, mother: Creature | null | undefined, father: Creature | null | undefined): string {
  if (mother && father && mother.lineage.lineId === father.lineage.lineId && mother.lineage.breederName === 'Your shop') return mother.lineage.lineId;
  const clean = (s: string | undefined) => (s ?? 'Unknown').replace(/[^A-Za-z0-9]+/g, '').slice(0, 16) || 'Unknown';
  return `${sp.id}-${clean(mother?.name)}x${clean(father?.name)}`;
}

/** Guardian for a clutch from species data (parentalCare). */
export function guardianOf(sp: SpeciesDefinition, male: Creature | null, female: Creature | null): Creature | null {
  switch (sp.parentalCare) {
    case 'male':
    case 'male_mouth':
    case 'male_pouch':
    case 'both':
      return male;
    case 'female':
      return female;
    default:
      return null;
  }
}

export function partnerIn(c: Creature, pool: readonly Creature[]): Creature | undefined {
  const id = c.repro.partnerId;
  if (!id) return undefined;
  return pool.find((p) => p.id === id);
}

export function pairUp(a: Creature, b: Creature): void {
  a.repro.partnerId = b.id;
  b.repro.partnerId = a.id;
}
