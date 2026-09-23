/**
 * Per-tank creature simulation: metabolism, feeding competition, waste, welfare, health, illness, growth, ageing,
 * natural death and incidents. OWNER: lane "lifecycle".
 *
 * Deterministic (only ctx.rng), substeps internally (any dt up to many hours), clamps every stat, never NaN.
 */
import { pluralName } from '../economy/util';
import type { Creature, FoodTag, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '../context';
import { findSpecies } from '@/data/species';
import { tutorialChain } from '@/data/quests';
import { addWaste, consumeFood, consumePods, creatureWasteUnits, effectiveBioload, grazeAlgae } from '../water';
import { incidentRisks, huntingDrive, edibleSizeCm, type IncidentRisk } from '../compat';
import { lightsOn } from '../time';
import { feedingPersonalityMul } from './personality';
import { ageDaysOf, gallonsNeededNow, lifeStageFor, observableSex, sexVisible, sizeAtAge } from './growth';
import { ILLNESSES, eligibleIllnesses, illnessDef, type IllnessKind } from './illness';
import {
  buildTankEnv,
  habitatFit,
  ingestionHazard,
  livingIn,
  socialTarget,
  stressFactors,
  stressTarget,
  waterProblemText,
  type SpeciesWaterView,
  type TankEnv,
} from './welfare';

// ───────────────────────────────── constants ─────────────────────────────────

/** Max game-hours per internal sub-step. */
export const LIFE_SUBSTEP_HOURS = 0.5;
/** Hunger points gained per `species.hungerHours`. */
export const HUNGER_PER_HUNGER_HOURS = 60;
export const HISTORY_CAP = 40;
/** Mirror of core's offline grace constants (see GameState.offlineGrace). */
export const GRACE_HEALTH_FLOOR = 20;
export const GRACE_MAX_HUNGER = 60;

/**
 * Early-game grace for the starter: until the tutorial's feed step is done (and at most STARTER_GRACE_HOURS after the
 * starter arrives) its hunger never passes this — "Hungry", never "Very hungry" or starving — so a player who lingers
 * on the first steps is never punished before the game has taught feeding.
 */
export const STARTER_GRACE_MAX_HUNGER = 60;
export const STARTER_GRACE_HOURS = 48;
/** lane:qa-final — a fasting mouthbrooder's hunger ceiling: "hungry", below the tank status's very hungry (70) and starving. */
export const BROODING_MAX_HUNGER = 65;

/** Hunger cap for the starter right now (null = no grace: fed already, tutorial skipped/done, or grace expired). */
export function starterHungerCap(state: GameState, c: Creature, hour: number): number | null {
  if (!c.isStarter) return null;
  const t = state.progress?.tutorial;
  if (!t || t.done || t.skipped) return null;
  if (hour - (c.acquiredHour ?? 0) > STARTER_GRACE_HOURS) return null;
  const feedIdx = tutorialChain(t.starterId || state.starterId).findIndex((st) => st.id === 'feed');
  if (feedIdx < 0 || t.step > feedIdx) return null;
  return STARTER_GRACE_MAX_HUNGER;
}

/** Rich foods that condition animals for breeding. */
export const CONDITIONING_TAGS: FoodTag[] = ['bloodworm', 'brine_shrimp', 'mysis', 'daphnia', 'earthworm', 'copepod_live', 'snail_live', 'baby_brine'];
/** Live foods that also provide hunting enrichment. */
export const LIVE_TAGS: FoodTag[] = ['copepod_live', 'snail_live', 'daphnia', 'earthworm', 'baby_brine', 'infusoria'];

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);
const approach = (cur: number, target: number, h: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-h / Math.max(0.01, tau)));
const perStep = (perDay: number, h: number) => 1 - Math.pow(1 - clamp(perDay, 0, 0.999), h / 24);

// ───────────────────────────────── small helpers ─────────────────────────────────

export function pushHistory(c: Creature, ev: Creature['history'][number]): void {
  if (!Array.isArray(c.history)) c.history = [];
  c.history.push(ev);
  if (c.history.length > HISTORY_CAP) c.history.splice(0, c.history.length - HISTORY_CAP);
}

export function lifeMeta(c: Creature): NonNullable<Creature['life']> {
  if (!c.life) c.life = {};
  return c.life;
}

/** Throttle helper: true (and stamps) if `key` was not emitted within `hours`. */
export function throttle(c: Creature, key: string, hour: number, hours: number): boolean {
  const m = lifeMeta(c);
  if (!m.warned) m.warned = {};
  const last = m.warned[key];
  if (last !== undefined && hour - last < hours && hour >= last) return false;
  m.warned[key] = hour;
  return true;
}

/** Throttle a message for a whole species group in a tank (avoids one toast per neon tetra). */
export function throttleGroup(state: GameState, ids: string[], key: string, hour: number, hours: number): boolean {
  for (const id of ids) {
    const last = state.creatures[id]?.life?.warned?.[key];
    if (last !== undefined && hour - last < hours && hour >= last) return false;
  }
  for (const id of ids) {
    const other = state.creatures[id];
    if (!other) continue;
    const m = lifeMeta(other);
    if (!m.warned) m.warned = {};
    m.warned[key] = hour;
  }
  return true;
}

export function hardinessOf(c: Creature, sp: SpeciesDefinition): number {
  return clamp(0.5 * sp.hardiness + 0.5 * (c.genome?.potentials?.hardiness ?? 50) / 100, 0, 1);
}

/**
 * Food units a creature eats per hunger point. MUST match the water lane's `effectiveBioload` (src/sim/water/env.ts):
 * one food unit relieves one hunger point of a bioload-1 animal; juveniles scale with (size/adult)².
 */
export function appetiteOf(c: Creature, sp: SpeciesDefinition): number {
  try {
    const v = effectiveBioload(sp, c.sizeCm);
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    /* fall through to the documented formula */
  }
  const ratio = c.sizeCm > 0 ? c.sizeCm / Math.max(0.1, sp.adultSizeCm) : 1;
  return Math.max(0.005, sp.bioload * clamp(ratio * ratio, 0.02, 1.4));
}

/** consumeFood with the creature id (target-feed reservations). Resolved lazily — safe under import cycles. */
function consumeFoodFor(tank: Tank, tags: FoodTag[], amount: number, creatureId: string): number {
  return consumeFood(tank, tags, amount, creatureId);
}

function sanitize(c: Creature): void {
  const s = c.stats;
  s.health = clamp(s.health, 0, 100);
  s.hunger = clamp(s.hunger, 0, 100);
  s.stress = clamp(s.stress, 0, 100);
  s.energy = clamp(s.energy, 0, 100);
  s.social = clamp(s.social, 0, 100);
  s.comfort = clamp(s.comfort, 0, 100);
  s.breedingReadiness = clamp(s.breedingReadiness, 0, 100);
  s.enrichment = clamp(s.enrichment, 0, 100);
  if (!Number.isFinite(c.sizeCm) || c.sizeCm <= 0) c.sizeCm = 0.1;
  if (c.illness && !Number.isFinite(c.illness.severity)) c.illness.severity = 20;
  const m = c.life;
  if (m) {
    if (m.injury !== undefined) m.injury = clamp(m.injury, 0, 100);
    if (m.conditioning !== undefined) m.conditioning = clamp(m.conditioning, 0, 100);
    if (m.tapSensitivity !== undefined) m.tapSensitivity = clamp(m.tapSensitivity, 0, 10);
    if (m.bond !== undefined) m.bond = clamp(m.bond, 0, 100);
  }
}

function lc(s: string): string {
  return s.toLowerCase();
}

function pronoun(c: Creature): { they: string; their: string } {
  if (c.sex === 'female') return { they: 'she', their: 'her' };
  if (c.sex === 'male') return { they: 'he', their: 'his' };
  return { they: 'they', their: 'their' };
}

// ───────────────────────────────── death ─────────────────────────────────

export type DeathKind = 'starvation' | 'water' | 'illness' | 'stress' | 'injury' | 'old_age' | 'predation' | 'unknown';

interface DeathInfo {
  kind: DeathKind;
  cause: string;
  text: string;
  /** Toast the death (default true). Repeat predation losses in one tank are logged but toasted at most daily. */
  toast?: boolean;
}

/** Mark a creature dead with a respectful explanation. Respects the offline grace period. Returns true if it died. */
export function killCreature(state: GameState, c: Creature, info: DeathInfo, hour: number, emit: SimContext['emit']): boolean {
  if (state.offlineGrace) {
    c.stats.health = Math.max(c.stats.health, GRACE_HEALTH_FLOOR);
    return false;
  }
  if (c.status === 'dead') return false;
  c.status = 'dead';
  c.stats.health = 0;
  c.deathCause = info.cause;
  pushHistory(c, { hour, kind: 'note', text: `Passed away — ${info.cause}.` });
  emit({ kind: 'death', text: info.text, tankId: c.tankId ?? undefined, creatureId: c.id, toast: info.toast ?? true });
  return true;
}

function explainDeath(state: GameState, env: TankEnv, c: Creature, sp: SpeciesDefinition, hour: number): DeathInfo {
  const dmg = c.life?.damage ?? {};
  let top: string = 'unknown';
  let best = 0;
  for (const [k, v] of Object.entries(dmg)) {
    if (v > best) {
      best = v;
      top = k;
    }
  }
  const name = c.name;
  const spName = lc(sp.commonName);
  switch (top) {
    case 'starvation': {
      const slow = sp.feedingSpeed < 0.3;
      const hint = slow ? `${pluralName(spName)} feed slowly — target feeding and calm tank mates make sure they get their share` : 'regular feeding (or an autofeeder) keeps everyone in condition';
      const p = pronoun(c);
      return { kind: 'starvation', cause: 'not enough food', text: `${name} has passed away. ${cap(p.they)} ${p.they === 'they' ? "weren't" : "wasn't"} getting enough to eat — ${hint}.` };
    }
    case 'water': {
      const wv = env.water.get(sp.id);
      const why = wv?.causeText ?? 'poor water conditions';
      const extra = wv?.sentence ? ` ${wv.sentence}` : '';
      return { kind: 'water', cause: `poor water conditions (${why.split(' — ')[0]})`, text: `${name} has passed away after struggling with ${why}.${extra}` };
    }
    case 'illness': {
      const nm = c.illness ? illnessDef(c.illness.kind)?.name(sp) ?? 'an illness' : 'an illness';
      return { kind: 'illness', cause: `complications of ${nm}`, text: `${name} has passed away after a long fight with ${nm}. Clean, stable water and a quiet quarantine tank give the best chance of recovery.` };
    }
    case 'stress': {
      const f = stressFactors(state, env, c, sp, hour)[0];
      return { kind: 'stress', cause: 'long-term stress', text: `${name} has passed away after a long period of stress${f ? ` (${f.label})` : ''}.` };
    }
    case 'injury':
      return { kind: 'injury', cause: 'injuries from tank mates', text: `${name} has passed away from injuries caused by tank mates. Some animals simply can't share a tank.` };
    case 'age':
      return { kind: 'old_age', cause: 'old age', text: `${name} passed away peacefully of old age. Thank you for giving ${name} such a good life.` };
    default:
      return { kind: 'unknown', cause: 'declining health', text: `${name} has passed away after a period of poor health.` };
  }
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ───────────────────────────────── feeding ─────────────────────────────────

interface Eater {
  c: Creature;
  sp: SpeciesDefinition;
  weight: number;
  appetite: number;
  /** Food units this creature still wants this sub-step. */
  want: number;
  eaten: number;
  target: boolean;
}

function feedTankSubstep(state: GameState, env: TankEnv, list: { c: Creature; sp: SpeciesDefinition }[], h: number, hour: number): void {
  const tank = env.tank;
  if (!(tank.water.foodInWater > 1e-6)) return; // lastMealUnits keeps describing the most recent feeding
  const eaters: Eater[] = [];
  for (const { c, sp } of list) {
    if (c.status === 'dead') continue;
    const hunger = c.stats.hunger;
    if (hunger < 6) continue;
    const target = env.targetFeedId === c.id || (c.life?.targetFedUntil ?? -Infinity) >= hour;
    // A lone animal finishes a meal in ~15–35 game minutes; competition (below), not this cap, is what starves slow feeders.
    const mealsPerHour = (1.6 + 3 * sp.feedingSpeed) * (target ? 2 : 1);
    const wantHunger = Math.min(hunger, 100 * mealsPerHour * h);
    const appetite = appetiteOf(c, sp);
    let weight =
      Math.pow(Math.max(0.02, sp.feedingSpeed), 1.2) *
      (0.5 + sp.feedingAggression) *
      feedingPersonalityMul(c.personality) *
      (0.35 + hunger / 100) *
      (0.6 + 0.4 * (c.stats.health / 100)) *
      (c.illness ? 0.6 : 1) *
      (c.stats.stress > 75 ? 0.7 : 1);
    if (target) weight *= 50;
    eaters.push({ c, sp, weight, appetite, want: wantHunger * appetite, eaten: 0, target });
  }
  if (!eaters.length) return;
  eaters.sort((a, b) => b.weight - a.weight || (a.c.id < b.c.id ? -1 : 1));
  const wMax = eaters[0].weight || 1;
  const passes: ((e: Eater) => number)[] = [
    (e) => 0.6 * Math.pow(e.weight / wMax, 0.8),
    (e) => 0.8 * Math.pow(e.weight / wMax, 0.5),
    () => 1,
  ];
  // Last pass: the hungriest go first. A fish that has been missing out gets bolder about leftovers, so a tank fed
  // properly twice a day doesn't quietly starve its shyest member (slow feeders still lose the first two passes).
  const byHunger = [...eaters].sort((a, b) => b.c.stats.hunger - a.c.stats.hunger || (a.c.id < b.c.id ? -1 : 1));
  for (let pi = 0; pi < passes.length; pi++) {
    const share = passes[pi];
    for (const e of pi === passes.length - 1 ? byHunger : eaters) {
      if (!(tank.water.foodInWater > 1e-6)) break;
      if (e.c.repro?.stage === 'brooding') continue; // mouthbrooders cannot eat while holding eggs
      const remaining = e.want - e.eaten;
      if (remaining <= 1e-6) continue;
      const req = remaining * clamp(share(e), 0, 1);
      if (req <= 1e-6) continue;
      const before = snapshotTags(tank, e.sp.foods);
      let got = 0;
      try {
        got = consumeFoodFor(tank, e.sp.foods, req, e.c.id);
      } catch {
        got = 0;
      }
      got = clamp(got, 0, req);
      if (got > 0) {
        e.eaten += got;
        creditDiet(e.c, e.sp, tank, before, got, e.appetite);
      }
    }
  }
  for (const e of eaters) {
    const m = lifeMeta(e.c);
    m.lastMealUnits = e.eaten;
    if (e.eaten > 0) {
      e.c.stats.hunger = clamp(e.c.stats.hunger - e.eaten / e.appetite, 0, 100);
      m.lastAteHour = hour;
    }
  }
}

function snapshotTags(tank: Tank, tags: FoodTag[]): Partial<Record<FoodTag, number>> | null {
  const by = tank.water.foodByTag;
  if (!by) return null;
  const out: Partial<Record<FoodTag, number>> = {};
  for (const t of tags) out[t] = by[t] ?? 0;
  return out;
}

function creditDiet(c: Creature, sp: SpeciesDefinition, tank: Tank, before: Partial<Record<FoodTag, number>> | null, got: number, appetite: number): void {
  const m = lifeMeta(c);
  if (!m.recentDiet) m.recentDiet = {};
  const hungerPts = got / appetite;
  // Which tags did this bite come from? Use the foodByTag delta when the water lane tracks it.
  const parts: [FoodTag, number][] = [];
  if (before && tank.water.foodByTag) {
    let total = 0;
    for (const t of sp.foods) {
      const d = (before[t] ?? 0) - (tank.water.foodByTag[t] ?? 0);
      if (d > 1e-9) {
        parts.push([t, d]);
        total += d;
      }
    }
    if (total > 0) for (const p of parts) p[1] = (p[1] / total) * hungerPts;
    else {
      // foodByTag not decremented by consumeFood: attribute by what was available to this species.
      let avail = 0;
      for (const t of sp.foods) avail += Math.max(0, before[t] ?? 0);
      if (avail > 0) for (const t of sp.foods) if ((before[t] ?? 0) > 0) parts.push([t, ((before[t] ?? 0) / avail) * hungerPts]);
    }
  }
  const condTags = new Set<FoodTag>([...CONDITIONING_TAGS, ...(sp.breeding.conditions.needsConditioningFood ?? [])]);
  for (const [tag, pts] of parts) {
    m.recentDiet[tag] = (m.recentDiet[tag] ?? 0) + pts;
    if (condTags.has(tag)) m.conditioning = clamp((m.conditioning ?? 0) + pts * 0.8, 0, 100);
    if (LIVE_TAGS.includes(tag)) c.stats.enrichment = clamp(c.stats.enrichment + pts * 0.25, 0, 100);
  }
}

// ───────────────────────────────── natural forage ─────────────────────────────────

/** Food units in one algae point (algae is 0..100 coverage). */
export const ALGAE_UNITS_PER_POINT = 15;
/** Food units represented by a full copepod population (pods 0..1). */
export const POD_UNITS = 300;

/**
 * Between meals, grazers pick biofilm/algae off every surface and pod-hunters (seahorses, dragonets) stalk copepods.
 * Biofilm is a renewable supply that scales with decor grazing surface and tank maturity (a spotless new tank starves
 * otocinclus and nerites); algae and pods are real, depletable water-lane pools. Photosynthetic animals feed on light.
 */
function forageSubstep(env: TankEnv, list: { c: Creature; sp: SpeciesDefinition }[], h: number, hour: number): void {
  const tank = env.tank;
  const maturity = clamp(tank.water.bioMaturity ?? 0.5, 0.05, 1);
  let biofilm = (0.5 + Math.min(4, env.habitat.grazing) * 1.5) * maturity * Math.max(1, env.gallons / 10) * h;
  const lit = lightsOn(tank.lighting.onHour, tank.lighting.offHour, hour);
  for (const { c, sp } of list) {
    if (c.status === 'dead') continue;
    const s = c.stats;
    if (sp.diet === 'photosynthetic' && lit) s.hunger = clamp(s.hunger - 15 * clamp(tank.lighting.intensity ?? 1, 0, 1.5) * h, 0, 100);
    if (s.hunger <= 18) continue;
    const appetite = appetiteOf(c, sp);
    const specialistGrazer = sp.feedingStyle === 'grazer' || !!sp.special?.needsAlgaeOrBiofilm;
    if (sp.foods.includes('biofilm')) {
      const wantPts = Math.min(s.hunger - 15, (specialistGrazer ? 10 : 3) * h);
      let wantUnits = wantPts * appetite;
      let got = 0;
      // Visible algae first (the cleanup crew visibly cleans), then the invisible biofilm film.
      if ((tank.water.algae ?? 0) > 2) {
        try {
          got += grazeAlgae(tank, wantUnits / ALGAE_UNITS_PER_POINT) * ALGAE_UNITS_PER_POINT;
        } catch {
          /* water lane mid-edit */
        }
        wantUnits -= got;
      }
      if (wantUnits > 1e-6) {
        const film = Math.min(wantUnits, biofilm);
        biofilm -= film;
        got += film;
      }
      if (got > 0) s.hunger = clamp(s.hunger - got / appetite, 0, 100);
    }
    if (s.hunger > 18 && sp.foods.includes('copepod_live')) {
      const wantPts = Math.min(s.hunger - 15, (sp.special?.needsPods ? 10 : 2) * h);
      let frac = 0;
      try {
        frac = consumePods(tank, (wantPts * appetite) / POD_UNITS);
      } catch {
        frac = 0;
      }
      if (frac > 0) {
        const pts = (frac * POD_UNITS) / appetite;
        s.hunger = clamp(s.hunger - pts, 0, 100);
        s.enrichment = clamp(s.enrichment + pts * 0.15, 0, 100); // hunting live prey is enriching
        const m = lifeMeta(c);
        if (!m.recentDiet) m.recentDiet = {};
        m.recentDiet.copepod_live = (m.recentDiet.copepod_live ?? 0) + pts;
      }
    }
  }
}

// ───────────────────────────────── illness ─────────────────────────────────

function illnessRisk(env: TankEnv, c: Creature, sp: SpeciesDefinition): { score: number; weights: [IllnessKind, number][]; causeText: string } {
  const wv = env.water.get(sp.id);
  const waterBad = clamp((100 - (wv?.comfort ?? 90)) / 60, 0, 1);
  const stressBad = clamp((c.stats.stress - 40) / 60, 0, 1);
  const injury = clamp((c.life?.injury ?? 0) / 100, 0, 1);
  const ingest = ingestionHazard(env, sp);
  let score = stressBad * 0.6 + waterBad * 0.8 + injury * 0.5 + (ingest ? 0.35 : 0);
  if (c.stats.hunger > 85) score += 0.15;
  const eligible = eligibleIllnesses(sp);
  const weights: [IllnessKind, number][] = [];
  const warm = env.tank.water.tempC > sp.tempC.idealMax + 1;
  for (const k of eligible) {
    let w = 0;
    switch (k) {
      case 'ich':
        w = 0.4 + waterBad + stressBad * 0.8;
        break;
      case 'fin_rot':
        w = 0.2 + waterBad * 1.1 + injury * 2 + (sp.hasLongFins ? 0.4 : 0);
        break;
      case 'fungus':
        w = (sp.category === 'amphibian' ? 0.8 : 0.1) + injury * 1.2 + (warm ? 1.2 : 0) + waterBad * 0.5;
        break;
      case 'swim_bladder':
        w = 0.25 + (c.stats.hunger < 10 ? 0.6 : 0);
        break;
      case 'stress_coloration':
        w = 0.3 + stressBad * 1.6;
        break;
      case 'impaction':
        w = ingest ? 2.2 : 0;
        break;
    }
    if (w > 0) weights.push([k, w]);
  }
  let causeText = 'stress';
  const parts: [string, number][] = [
    [wv?.causeText ?? 'poor water quality', waterBad * 0.8],
    ['chronic stress', stressBad * 0.6],
    ['an injury', injury * 0.5],
    // lane:qa-play — "swallowed substrate" is only ever the cause of impaction (named explicitly at onset); it made
    // lines like "white spot (ich) — likely from swallowed substrate"
  ];
  parts.sort((a, b) => b[1] - a[1]);
  if (parts[0][1] > 0) causeText = parts[0][0];
  return { score, weights, causeText };
}

function illnessConditionsGood(env: TankEnv, c: Creature, sp: SpeciesDefinition, kind: string): boolean {
  const wv = env.water.get(sp.id);
  if ((wv?.harm ?? 0) > 0.05) return false;
  if ((wv?.comfort ?? 90) < 62) return false;
  if (c.stats.stress > 58) return false;
  if (kind === 'impaction' && ingestionHazard(env, sp)) return false;
  if (kind === 'fungus' && env.tank.water.tempC > sp.tempC.idealMax + 1.5) return false;
  return true;
}

// ───────────────────────────────── incidents ─────────────────────────────────

function aliveOf(list: { c: Creature; sp: SpeciesDefinition }[], speciesId: string, ids?: string[]): { c: Creature; sp: SpeciesDefinition }[] {
  return list.filter((x) => x.c.status !== 'dead' && x.c.speciesId === speciesId && (!ids || !ids.length || ids.includes(x.c.id)));
}

function applyIncident(state: GameState, env: TankEnv, list: { c: Creature; sp: SpeciesDefinition }[], risk: IncidentRisk, hour: number, ctx: SimContext): void {
  const actors = aliveOf(list, risk.actorSpeciesId, risk.actorIds);
  if (risk.kind === 'sting' && !actors.length) {
    // Environmental sting from anemone/stinging-coral decor (orchestrator integration of waterlab incidents).
    const stung = aliveOf(list, risk.targetSpeciesId, risk.targetIds);
    if (!stung.length) return;
    const v = ctx.rng.pick(stung).c;
    v.stats.stress = clamp(v.stats.stress + 12, 0, 100);
    if (!state.offlineGrace) v.stats.health = clamp(v.stats.health - ctx.rng.range(2, 6), 5, 100);
    const vm = lifeMeta(v);
    vm.injury = clamp((vm.injury ?? 0) + 6, 0, 100);
    if (throttle(v, 'inc:sting:env', hour, 12)) {
      ctx.emit({ kind: 'warning', text: `${v.name} brushed against a stinging anemone or coral and was stung. ${risk.text ?? ''}`.replace(/\s+/g, ' ').trim(), tankId: env.tank.id, creatureId: v.id });
    }
    return;
  }
  if (!actors.length) return;
  let targets = aliveOf(list, risk.targetSpeciesId, risk.targetIds);
  if (risk.youngOnly) targets = targets.filter((t) => t.c.lifeStage === 'juvenile' || t.c.lifeStage === 'fry' || t.c.lifeStage === 'larva');
  if (!targets.length) return; // eggs/fry clutches belong to the breeding lane
  const rng = ctx.rng;
  const actor = rng.weighted(actors, (a) => (0.5 + a.c.sizeCm / Math.max(0.1, a.sp.adultSizeCm)) * (0.5 + a.c.stats.hunger / 100));

  if (risk.kind === 'predation') {
    // Same reach the compat preview used to call this risk lethal (src/sim/compat/predation.ts), scaled by the
    // predator's current size: a half-grown predator can't take full-grown prey yet.
    const reach = edibleSizeCm(risk.maxPreyCm ?? actor.sp.maxLikelyPreySizeCm, actor.c.sizeCm, actor.sp.adultSizeCm);
    const others = targets.filter((t) => t.c !== actor.c);
    // "May eat the young" means hatchlings and small fry: a juvenile that has grown past the predator's mouth (a 6 cm
    // juvenile cardinalfish next to a seahorse) is safe. Fresh hatchlings always fit, as the compat rule assumes.
    const edible = others.filter((t) => t.c.sizeCm <= (risk.youngOnly ? Math.max(reach, (t.sp.lifecycle?.hatchSizeCm ?? 0) * 1.2) : reach));
    const preySp = (t: { sp: SpeciesDefinition }) => lc(t.sp.commonName);
    const actorLabel = `${actor.c.name} the ${lc(actor.sp.commonName)}`;
    if (!risk.lethal || state.offlineGrace) {
      // Non-lethal hunting (prey too big to kill, e.g. a pea puffer and a mystery snail) or the offline grace period:
      // an attack that frightens and nips, never a loss. Explained in the log (throttled per victim).
      const pool = edible.length ? edible : others;
      if (!pool.length) return;
      const t = rng.pick(pool);
      t.c.stats.stress = clamp(t.c.stats.stress + 20, 0, 100);
      if (!state.offlineGrace && !risk.lethal) {
        const tm = lifeMeta(t.c);
        tm.injury = clamp((tm.injury ?? 0) + 6, 0, 100);
        const dmg = rng.range(1, 3.5);
        t.c.stats.health = clamp(t.c.stats.health - dmg, 1, 100);
        if (!tm.damage) tm.damage = {};
        tm.damage.injury = (tm.damage.injury ?? 0) + dmg;
        if (throttle(t.c, `inc:hunted:${actor.c.speciesId}`, hour, 24)) {
          ctx.emit({ kind: 'warning', text: `${actorLabel} keeps attacking ${t.c.name} the ${preySp(t)}. ${risk.text ?? ''}`.replace(/\s+/g, ' ').trim(), tankId: env.tank.id, creatureId: t.c.id });
        }
      }
      return;
    }
    if (!edible.length) return; // prey has outgrown the predator's reach — a real, visible success of growing out
    const prey = rng.weighted(edible, (t) => (1 / Math.max(0.2, t.c.sizeCm)) * (1.3 - t.c.stats.health / 100) * (t.c.illness ? 1.5 : 1));
    const text = `${prey.c.name} the ${preySp(prey)} is missing — it was likely eaten by ${actorLabel}. ${risk.text ?? ''}`.trim();
    // The first loss in a tank always toasts; repeats (a shrimp colony with a puffer) toast at most once a game day.
    const toast = throttle(actor.c, 'pred_toast', hour, 24);
    const died = killCreature(state, prey.c, { kind: 'predation', cause: `likely preyed upon by ${actorLabel}`, text, toast }, hour, ctx.emit);
    if (died) {
      actor.c.stats.hunger = clamp(actor.c.stats.hunger - 35, 0, 100);
      lifeMeta(actor.c).lastAteHour = hour;
    }
    return;
  }

  const candidates = targets.filter((t) => t.c !== actor.c);
  if (!candidates.length) return;
  const victim = rng.weighted(candidates, (t) => (1.2 - t.c.stats.health / 100) * (0.6 + 1 / Math.max(0.3, t.c.sizeCm / Math.max(0.1, t.sp.adultSizeCm))));
  const v = victim.c;
  const vm = lifeMeta(v);
  const actorLabel = `${actor.c.name} the ${lc(actor.sp.commonName)}`;
  let damage = 0;
  let injury = 0;
  let stress = 0;
  let msg = '';
  let kind: 'warning' | 'danger' = 'warning';
  switch (risk.kind) {
    case 'aggression':
      damage = risk.lethal ? rng.range(12, 24) : rng.range(4, 11);
      injury = risk.lethal ? 22 : 12;
      stress = 22;
      kind = risk.lethal ? 'danger' : 'warning';
      msg = `${actorLabel} attacked ${v.name}. ${risk.text ?? ''}`;
      break;
    case 'fin_nip':
      damage = rng.range(2.5, 7) * (victim.sp.hasLongFins ? 1.3 : 1);
      injury = 10;
      stress = 16;
      msg = `${actorLabel} is nipping ${v.name}'s fins. ${risk.text ?? ''}`;
      break;
    case 'gill_nip':
      damage = rng.range(4, 9);
      injury = 12;
      stress = 18;
      msg = `${actorLabel} nipped at ${v.name}'s delicate gills. ${risk.text ?? ''}`;
      break;
    case 'harassment':
      damage = rng.range(0.5, 3);
      injury = 3;
      stress = 20;
      msg = `${v.name} is being harassed by ${actorLabel}. ${risk.text ?? ''}`;
      break;
    case 'sting':
      damage = rng.range(3, 9);
      injury = 8;
      stress = 12;
      msg = `${v.name} was stung by ${actorLabel}. ${risk.text ?? ''}`;
      break;
    case 'coral_nip':
      damage = rng.range(2, 5);
      stress = 4;
      msg = `${actorLabel} has been nipping at ${v.name}. ${risk.text ?? ''}`;
      break;
    case 'feeding_exclusion':
      v.stats.hunger = clamp(v.stats.hunger + 12, 0, 100);
      if (throttle(v, `inc:feeding_exclusion:${risk.actorSpeciesId}`, hour, 18)) {
        ctx.emit({ kind: 'warning', text: `${v.name} is being crowded out at feeding time by the ${lc(actor.sp.commonName)}. ${risk.text ?? ''} Target feeding helps.`.replace(/\s+/g, ' ').trim(), tankId: env.tank.id, creatureId: v.id });
      }
      return;
  }
  v.stats.stress = clamp(v.stats.stress + stress, 0, 100);
  vm.injury = clamp((vm.injury ?? 0) + injury, 0, 100);
  if (damage > 0) {
    v.stats.health = clamp(v.stats.health - damage, 0, 100);
    if (!vm.damage) vm.damage = {};
    vm.damage.injury = (vm.damage.injury ?? 0) + damage;
  }
  actor.c.stats.stress = clamp(actor.c.stats.stress + 2, 0, 100);
  if (throttle(v, `inc:${risk.kind}:${actor.c.id}`, hour, 8)) {
    ctx.emit({ kind, text: msg.replace(/\s+/g, ' ').trim(), tankId: env.tank.id, creatureId: v.id });
    pushHistory(v, { hour, kind: 'note', text: `Hurt by ${actorLabel} (${risk.kind.replace('_', ' ')}).` });
  }
  if (v.stats.health <= 0) {
    const died = killCreature(
      state,
      v,
      { kind: 'injury', cause: `injuries from ${actorLabel}`, text: `${v.name} has passed away from injuries caused by ${actorLabel}. ${risk.text ?? ''}`.trim() },
      hour,
      ctx.emit,
    );
    if (!died) v.stats.health = Math.max(v.stats.health, GRACE_HEALTH_FLOOR);
  }
}

// ───────────────────────────────── ageing & growth ─────────────────────────────────

/**
 * Recompute life stage, sex reveal and minimum size from age (used every step and by devAgeCreature).
 * Emits milestone events for stage changes and sex reveals.
 */
export function applyAgeing(state: GameState, c: Creature, sp: SpeciesDefinition, hour: number, emit: SimContext['emit'] | null, opts: { snapSize?: boolean } = {}): void {
  const age = ageDaysOf(c, hour);
  const stage = lifeStageFor(sp, age);
  const prev = c.lifeStage;
  if (stage !== prev && !(prev === 'elder' && stage !== 'elder')) {
    c.lifeStage = stage;
    if (stage === 'adult' && (prev === 'juvenile' || prev === 'fry' || prev === 'larva' || prev === 'egg')) {
      const text = `${c.name} is all grown up — now an adult ${lc(sp.commonName)}.`;
      pushHistory(c, { hour, kind: 'milestone', text });
      emit?.({ kind: 'celebrate', text, tankId: c.tankId ?? undefined, creatureId: c.id });
    } else if (stage === 'elder') {
      const text = `${c.name} is entering ${pronoun(c).their} golden years. Elders slow down a little and appreciate calm, stable water.`;
      pushHistory(c, { hour, kind: 'milestone', text });
      emit?.({ kind: 'info', text, tankId: c.tankId ?? undefined, creatureId: c.id });
    }
  }
  // Sex determination / reveal
  if (c.sex === 'unknown' && sexVisible(sp, age)) {
    let role = c.reproRole;
    if (role === 'undifferentiated') {
      if (sp.sexSystem === 'protandrous') role = 'male';
      else if (sp.sexSystem === 'protogynous') role = 'female';
      else if (sp.sexSystem === 'gonochoristic') role = hashCoin(c.id) < 0.5 ? 'male' : 'female';
      c.reproRole = role;
    }
    const obs = observableSex(sp, role, age);
    if (obs !== 'unknown') {
      c.sex = obs;
      let text: string;
      if (sp.sexSystem === 'protandrous') {
        text = `${c.name} has matured as a male. Every ${lc(sp.commonName)} starts life male — the dominant fish of a pair can later become female.`;
      } else if (sp.sexSystem === 'protogynous') {
        text = `${c.name} has matured as a female. In this species the dominant fish can later become male.`;
      } else {
        const cue = SEX_CUES[sp.id]?.[obs];
        text = `${c.name} is a ${obs}!${cue ? ` You can tell by ${cue}.` : ''}`;
      }
      pushHistory(c, { hour, kind: 'milestone', text });
      emit?.({ kind: 'celebrate', text, tankId: c.tankId ?? undefined, creatureId: c.id, toast: true });
    }
  }
  if (opts.snapSize) {
    const target = sizeAtAge(sp, c.genome, age);
    if (c.sizeCm < target) c.sizeCm = target;
  }
}

/** How keepers tell the sexes apart (flavour for the reveal milestone). */
const SEX_CUES: Record<string, { male: string; female: string }> = {
  axolotl: { male: 'the swollen cloaca behind his back legs', female: 'her rounder, fuller body' },
  betta: { male: 'his long flowing fins and bold colour', female: 'her shorter fins and the tiny white egg spot behind her belly fins' },
  pea_puffer: { male: 'the dark stripe along his belly and the wrinkle lines behind his eyes', female: 'her rounder body and plain spotted belly' },
  lined_seahorse: { male: 'the smooth brood pouch on his belly', female: 'her pouchless belly and the small point at her vent' },
};

/** Stable pseudo-coin from an id (only used when legacy data lacks a role). */
function hashCoin(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// ───────────────────────────────── breeding readiness baseline ─────────────────────────────────

/** Baseline breeding readiness (0..100) from maturity, health, comfort, feeding and conditioning. Breeding lane adjusts. */
export function breedingReadinessTarget(c: Creature, sp: SpeciesDefinition, hour: number): number {
  const age = ageDaysOf(c, hour);
  if (age < sp.breeding.maturityDays || c.lifeStage === 'juvenile') return 0;
  if (sp.breeding.system === 'not_in_game') return 0;
  const s = c.stats;
  const fed = s.hunger < 50 ? 1 : s.hunger < 75 ? 0.6 : 0.2;
  const condition = (s.health / 100) * (0.4 + (s.comfort / 100) * 0.6) * clamp(1 - s.stress / 150, 0, 1);
  const cond = c.life?.conditioning ?? 0;
  const fert = c.genome?.potentials?.fertility ?? 50;
  let t = condition * fed * (35 + cond * 0.45 + fert * 0.2);
  if (c.lifeStage === 'elder') t *= 0.5;
  if (c.illness) t *= 0.3;
  return clamp(t, 0, 100);
}

// ───────────────────────────────── main step ─────────────────────────────────

export function stepTankCreaturesImpl(state: GameState, tank: Tank, dt: number, ctx: SimContext): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  const creatures = livingIn(state, tank.id);
  if (!creatures.length) return;
  const list: { c: Creature; sp: SpeciesDefinition }[] = [];
  for (const c of creatures) {
    const sp = findSpecies(c.speciesId);
    if (sp) list.push({ c, sp });
  }
  if (!list.length) return;
  const env = buildTankEnv(state, tank, creatures, ctx.hour);
  let risks: IncidentRisk[] = [];
  if (list.length > 1) {
    try {
      risks = incidentRisks(state, tank.id) ?? [];
    } catch {
      risks = [];
    }
  }
  const fits = new Map<string, number>();
  for (const { sp } of list) if (!fits.has(sp.id)) fits.set(sp.id, habitatFit(env, sp, env.groups.get(sp.id)?.n ?? 1).score);

  // Background tanks (reduced/summary LOD) use coarser sub-steps; every rule is written to be stable for any h.
  const sub = ctx.lod === 'summary' ? 2 : ctx.lod === 'reduced' ? 1 : LIFE_SUBSTEP_HOURS;
  const n = Math.max(1, Math.ceil(dt / sub - 1e-9));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const hour = ctx.hour + i * h;
    const alive = list.filter((x) => x.c.status !== 'dead');
    if (!alive.length) break;
    // 1) metabolism
    for (const { c, sp } of alive) {
      const stageMul = c.lifeStage === 'juvenile' ? 1.25 : c.lifeStage === 'elder' ? 0.85 : 1;
      const before = c.stats.hunger;
      c.stats.hunger = clamp(c.stats.hunger + (h / Math.max(1, sp.hungerHours)) * HUNGER_PER_HUNGER_HOURS * stageMul, 0, 100);
      if (state.offlineGrace && c.stats.hunger > GRACE_MAX_HUNGER) c.stats.hunger = GRACE_MAX_HUNGER;
      if (c.isStarter) {
        // Metabolism alone never pushes the starter past the cap (hunger set higher by other means is left alone).
        const cap = starterHungerCap(state, c, hour);
        if (cap !== null && c.stats.hunger > cap) c.stats.hunger = Math.max(Math.min(before, c.stats.hunger), cap);
      }
      // lane:qa-final — a mouthbrooding male fasts on his body reserves for the whole brood (Banggai cardinalfish: ~3
      // weeks in the wild, 160 game hours here) and cannot eat (feedTankSubstep skips him). Metabolism alone used to pin
      // his hunger at 100, and starvation damage took him from 100 to ~10 health by the release while the tank card
      // told the player to "feed right away". Fasting holds him at "hungry" instead (a game abstraction).
      if (c.repro?.stage === 'brooding' && c.stats.hunger > BROODING_MAX_HUNGER) c.stats.hunger = BROODING_MAX_HUNGER;
    }
    // 2) feeding competition from the water column
    feedTankSubstep(state, env, alive, h, hour);
    forageSubstep(env, alive, h, hour);
    // 3) welfare / health / growth / ageing per creature
    for (const x of alive) stepCreature(state, env, x.c, x.sp, fits.get(x.sp.id) ?? 1, h, hour, ctx);
    // 4) incidents
    for (const risk of risks) {
      if (!(risk.perDay > 0)) continue;
      let perDay = risk.perDay;
      if (risk.kind === 'predation') {
        // Predation emerges from hunger + opportunity: a well-fed predator hunts less (never zero). The compat preview's
        // stated weekly risk is this same perDay at ordinary between-meals hunger (huntingDrive = 1).
        let hMax = 0;
        for (const x of alive) if (x.c.speciesId === risk.actorSpeciesId && x.c.stats.hunger > hMax) hMax = x.c.stats.hunger;
        perDay *= huntingDrive(hMax);
      }
      if (!ctx.rng.chance(perStep(perDay, h))) continue;
      applyIncident(state, env, list, risk, hour, ctx);
    }
    // 5) deaths from accumulated harm
    for (const { c, sp } of alive) {
      if (c.status === 'dead') continue;
      if (c.stats.health <= 0) {
        const info = explainDeath(state, env, c, sp, hour);
        if (!killCreature(state, c, info, hour, ctx.emit)) c.stats.health = Math.max(c.stats.health, GRACE_HEALTH_FLOOR);
      }
    }
  }
  for (const { c } of list) sanitize(c);
}

function stepCreature(state: GameState, env: TankEnv, c: Creature, sp: SpeciesDefinition, fit: number, h: number, hour: number, ctx: SimContext): void {
  const s = c.stats;
  const m = lifeMeta(c);
  const wv: SpeciesWaterView = env.water.get(sp.id) ?? { comfort: 90, harm: 0, cause: null, causeText: null, stressors: [] };
  const hardy = hardinessOf(c, sp);
  const g = env.groups.get(sp.id);
  const groupN = g?.n ?? 1;
  const age = ageDaysOf(c, hour);
  const lit = lightsOn(env.tank.lighting.onHour, env.tank.lighting.offHour, hour);

  // Waste (water lane's calibration: effective bioload × feeding state × hours)
  let waste = 0;
  try {
    waste = creatureWasteUnits(sp, c, h);
  } catch {
    const sizeFrac = clamp(c.sizeCm / Math.max(0.1, sp.adultSizeCm), 0.05, 1.4);
    waste = Math.max(0, sp.bioload) * clamp(sizeFrac * sizeFrac, 0.02, 1.4) * h * (0.55 + 0.45 * (1 - s.hunger / 100));
  }
  if (waste > 0 && Number.isFinite(waste)) {
    try {
      addWaste(env.tank, waste);
    } catch {
      /* water lane mid-edit */
    }
  }

  // Diet memory & conditioning decay
  if (m.recentDiet) {
    const k = Math.exp(-h / 48);
    for (const key of Object.keys(m.recentDiet) as FoodTag[]) {
      const v = (m.recentDiet[key] ?? 0) * k;
      if (v < 0.05) delete m.recentDiet[key];
      else m.recentDiet[key] = v;
    }
  }
  if (m.conditioning) m.conditioning = Math.max(0, m.conditioning - 0.6 * h);
  if (m.tapSensitivity) m.tapSensitivity = Math.max(0, m.tapSensitivity - 2 * h);
  if (m.interactions) m.interactions = Math.max(0, m.interactions - 1.5 * h);

  // Comfort (water + habitat)
  const comfortTarget = clamp(0.62 * wv.comfort + 0.38 * fit * 100, 0, 100);
  s.comfort = approach(s.comfort, comfortTarget, h, 2);

  // Social comfort
  s.social = approach(s.social, socialTarget(sp, groupN), h, 6);

  // Enrichment: decor, varied diet, keeper interaction (bumps elsewhere)
  const variety = m.recentDiet ? Object.values(m.recentDiet).filter((v) => (v ?? 0) > 2).length : 0;
  const enrichTarget = clamp(30 + Math.min(35, env.habitat.enrichment * 45) + Math.min(15, Math.max(0, variety - 1) * 5) + (m.bond ?? 0) * 0.08, 0, 100);
  s.enrichment = approach(s.enrichment, enrichTarget, h, 16);

  // Stress
  const factors = stressFactors(state, env, c, sp, hour);
  s.stress = approach(s.stress, stressTarget(factors, c), h, 3);

  // Energy (day/night rhythm, hunger, stress)
  const nocturnal = clamp(sp.behaviorTraits.nocturnal + (c.personality.includes('night_owl') ? 0.35 : 0), 0, 1);
  let energyTarget = lit ? 78 - nocturnal * 18 : 70 + (1 - nocturnal) * 25;
  energyTarget -= s.stress * 0.2;
  if (s.hunger > 80) energyTarget -= (s.hunger - 80) * 1.2;
  if (c.illness) energyTarget -= c.illness.severity * 0.2;
  if (c.lifeStage === 'elder') energyTarget -= 8;
  s.energy = approach(s.energy, clamp(energyTarget, 5, 100), h, 4);

  // Injuries heal
  if (m.injury && m.injury > 0) m.injury = Math.max(0, m.injury - h * (0.8 + 1.2 * hardy) * (s.stress < 60 ? 1 : 0.4));

  // ── Health
  const dmgMul = 1.35 - 0.7 * hardy;
  const dmg: Record<string, number> = {};
  if (wv.harm > 0) dmg.water = Math.min(12, wv.harm);
  // Body reserves: adults last ~10× their hunger interval at full starvation, juveniles ~6×.
  if (s.hunger >= 85) dmg.starvation = ((s.hunger - 85) / 15) * (100 / ((c.lifeStage === 'juvenile' ? 6 : 10) * Math.max(4, sp.hungerHours)));
  if (s.stress > 70) dmg.stress = ((s.stress - 70) / 30) * 0.5;
  if (m.injury && m.injury > 0) dmg.injury = m.injury * 0.015;
  if (c.illness) {
    const def = illnessDef(c.illness.kind);
    dmg.illness = (clamp(c.illness.severity, 0, 100) / 100) * (def?.drainPerHour ?? 0.3);
  }
  let total = 0;
  if (!m.damage) m.damage = {};
  const decay = Math.exp(-h / 24);
  for (const k of Object.keys(m.damage)) {
    m.damage[k] *= decay;
    if (m.damage[k] < 0.01) delete m.damage[k];
  }
  for (const [k, v] of Object.entries(dmg)) {
    const amt = v * dmgMul * h;
    if (amt > 0) {
      total += amt;
      m.damage[k] = (m.damage[k] ?? 0) + amt;
    }
  }
  s.health -= total;
  const recovering = wv.harm < 0.05 && s.hunger < 75 && s.stress < 55 && !c.illness && (m.injury ?? 0) < 20;
  if (recovering) s.health += (0.6 + 1.2 * hardy) * (0.4 + (s.comfort / 100) * 0.6) * h;
  s.health = clamp(s.health, 0, 100);
  if (state.offlineGrace && s.health < GRACE_HEALTH_FLOOR) s.health = GRACE_HEALTH_FLOOR;

  // ── Illness progression / recovery / onset
  if (c.illness) {
    const def = illnessDef(c.illness.kind);
    const good = illnessConditionsGood(env, c, sp, c.illness.kind);
    if (good) c.illness.severity -= (def?.healPerHour ?? 1) * (env.quarantine ? 2 : 1) * (0.6 + hardy) * h;
    else c.illness.severity += (def?.worsenPerHour ?? 1) * (1.2 - hardy * 0.6) * h;
    c.illness.severity = clamp(c.illness.severity, 0, 100);
    if (c.illness.severity <= 0.01) {
      const name = def?.name(sp) ?? 'its illness';
      const text = `${c.name} has recovered from ${name}.`;
      pushHistory(c, { hour, kind: 'recovered', text });
      ctx.emit({ kind: 'celebrate', text, tankId: env.tank.id, creatureId: c.id });
      c.illness = undefined;
    }
  } else if (s.stress > 40 || wv.comfort < 85 || (m.injury ?? 0) > 0 || s.hunger > 85 || ingestionHazard(env, sp)) {
    const risk = illnessRisk(env, c, sp);
    if (risk.score > 0.15 && risk.weights.length) {
      const pDay = clamp(0.22 * risk.score * (1.2 - hardy), 0, 0.9);
      if (ctx.rng.chance(perStep(pDay, h))) {
        const kind = ctx.rng.weighted(risk.weights, (w) => w[1])[0];
        const def = ILLNESSES[kind];
        c.illness = { kind, severity: ctx.rng.range(15, 30), sinceHour: hour };
        const cause = kind === 'impaction' ? 'swallowed substrate' : kind === 'swim_bladder' ? 'rich feeding and stress' : risk.causeText;
        const text = `${c.name} has ${def.name(sp)} — likely from ${cause}. ${def.cure(sp)}`;
        pushHistory(c, { hour, kind: 'illness', text: `Fell ill with ${def.name(sp)} (${cause}).` });
        ctx.emit({ kind: 'warning', text, tankId: env.tank.id, creatureId: c.id, toast: true });
      }
    }
  }

  // ── Growth: approach the genetic size curve when fed and comfortable (stunted when not)
  const target = sizeAtAge(sp, c.genome, age);
  if (c.sizeCm < target) {
    const cond = (s.hunger < 70 ? 1 : s.hunger < 90 ? 0.4 : 0) * (0.5 + s.comfort / 200) * (c.illness ? 0.5 : 1);
    if (cond > 0) c.sizeCm += (target - c.sizeCm) * (1 - Math.exp(-h * 0.25 * cond));
  }

  // ── Ageing, stage changes, sex reveal
  applyAgeing(state, c, sp, hour + h, ctx.emit);

  // ── Tank size warnings (a juvenile growing beyond its tank)
  const ids = g?.ids ?? [c.id];
  const need = gallonsNeededNow(sp, c.sizeCm);
  if (env.gallons < need && throttleGroup(state, ids, 'tank_small', hour, 48)) {
    const adultNeed = sp.recommendedMinTankGallons;
    const text =
      c.lifeStage === 'juvenile'
        ? `${c.name} is outgrowing this ${env.gallons}-gallon tank. An adult ${lc(sp.commonName)} needs at least ${adultNeed} gallons — plan a bigger home soon.`
        : `${c.name}'s tank is too small. An adult ${lc(sp.commonName)} needs at least ${adultNeed} gallons.`;
    ctx.emit({ kind: 'warning', text, tankId: env.tank.id, creatureId: c.id, toast: true });
  }

  // ── Welfare warnings (throttled per species group in this tank)
  const plural = groupN > 1;
  if (wv.harm > 0.3 && throttleGroup(state, ids, 'water_harm', hour, 12)) {
    const text = plural ? waterProblemText(wv, `Your ${pluralName(sp.commonName)}`, 'are') : waterProblemText(wv, c.name);
    // Logged every 12 h while it lasts, but toasted at most once a game day — a standing problem shouldn't pop up
    // every couple of real minutes.
    if (text) ctx.emit({ kind: 'danger', text, tankId: env.tank.id, creatureId: c.id, toast: throttleGroup(state, ids, 'water_harm_toast', hour, 24) });
  }
  if (s.hunger >= 80 && throttleGroup(state, ids, 'hungry', hour, 24)) {
    const slow = sp.feedingSpeed < 0.3 && [...env.groups.keys()].some((id) => id !== sp.id && (findSpecies(id)?.feedingSpeed ?? 0) > sp.feedingSpeed + 0.2);
    const who = plural ? `Your ${pluralName(sp.commonName)} are` : `${c.name} is`;
    const text = slow ? `${who} very hungry — faster tank mates may be taking the food. Try target feeding.` : `${who} very hungry — time to feed.`;
    ctx.emit({ kind: 'warning', text, tankId: env.tank.id, creatureId: c.id });
  }
  if (s.hunger >= 97 && s.health < 85 && throttleGroup(state, ids, 'starving', hour, 24)) {
    const who = plural ? `Your ${pluralName(sp.commonName)} are` : `${c.name} is`;
    ctx.emit({ kind: 'danger', text: `${who} starving and losing condition — feed right away.`, tankId: env.tank.id, creatureId: c.id, toast: true });
  }
  if (sp.social.minGroup > 1 && groupN < sp.social.minGroup && throttleGroup(state, ids, 'lonely', hour, 48)) {
    const who = plural ? `Your ${pluralName(sp.commonName)} seem` : `${c.name} seems`;
    ctx.emit({ kind: 'tip', text: `${who} lonely — ${pluralName(sp.commonName)} feel safest in groups of ${sp.social.minGroup} or more.`, tankId: env.tank.id, creatureId: c.id });
  }
  if (s.stress > 75 && factors[0] && throttle(c, 'stressed', hour, 24) && throttleGroup(state, ids, 'stressed_group', hour, 6)) {
    ctx.emit({ kind: 'warning', text: `${c.name} is very stressed — mainly ${factors[0].label}.`, tankId: env.tank.id, creatureId: c.id });
  }

  // ── Breeding readiness baseline (breeding lane reads + adjusts)
  s.breedingReadiness = approach(s.breedingReadiness, breedingReadinessTarget(c, sp, hour), h, 24);

  // ── Natural end of life (rare, gentle)
  const life = Math.max(1, sp.lifecycle.lifespanDays);
  if (age > life * 0.9 && !state.offlineGrace) {
    const pDay = clamp(0.01 * Math.exp((age / life - 0.9) * 25) * (1.3 - 0.6 * hardy), 0, 0.9);
    if (ctx.rng.chance(perStep(pDay, h))) {
      m.damage.age = (m.damage.age ?? 0) + 1000;
      killCreature(state, c, explainDeath(state, env, c, sp, hour), hour, ctx.emit);
    }
  }
}
