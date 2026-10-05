/**
 * Progression: reputation, mastery, counters, data-driven unlocks, research, tutorial chains, quest board and
 * achievements. OWNER: lane "facility".
 *
 * Mastery is earned from real play only. Effects are applied from the *effective* value of each activity counter
 * (the max over the aliases other lanes may bump plus what this module derives from the market history and the
 * creature records), so an activity is never rewarded twice even if two lanes both count it.
 */
import type { GameState, MasteryTrack, QuestState } from '@/types';
import type { SimContext } from '../context';
import type { ActionResult } from '../care';
import type { Rng } from '../rng';
import { emitEvent } from '../context';
import { dayOf } from '../time';
import { earn, spend } from '../economy';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { UNLOCK_RULES, UNLOCK_RULE_BY_KEY, STARTER_UNLOCKS, DEFAULT_STARTER_UNLOCKS, type Cond } from '@/data/unlocks';
import { RESEARCH, RESEARCH_BY_ID, type ResearchDef } from '@/data/research';
import { QUESTS, QUEST_BY_ID, QUEST_BOARD_SIZE, TUTORIAL_QUEST_REWARD, tutorialChain, type Objective, type Reward, type TutorialStepDef, type QuestDef } from '@/data/quests';
import { ACHIEVEMENTS } from '@/data/achievements';
import { FACILITY_LEVEL_ORDER, getFacilityLevel } from '@/data/facilities';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { withArticle } from '../economy/util'; // lane:w2-ui
import { giftedLayoutShare } from '../aquascape/starters';

// ───────────────────────────── basics ─────────────────────────────

export function isUnlocked(state: GameState, key: string | null | undefined): boolean {
  if (!key) return true;
  return state.progress.unlocked.includes(key);
}

export function unlockLabel(key: string): string {
  return (UNLOCK_KEYS as Record<string, string>)[key] ?? key.replace(/_/g, ' ');
}

export function unlock(state: GameState, key: string, ctx?: { silent?: boolean }): void {
  if (state.progress.unlocked.includes(key)) return;
  state.progress.unlocked.push(key);
  if (!ctx?.silent && !state.isShowcase) {
    emitEvent(state, { kind: 'unlock', text: `Unlocked: ${unlockLabel(key)}`, toast: true });
  }
}

/**
 * Counter key for the player's own aquascaping edits (place / move / remove) in one tank. Aquascaping achievements,
 * the beauty quests and the aquascape-awards unlock only count tanks the player has actually worked on, so the
 * hand-built starter layout (beauty 87–94) never hands them out for free.
 */
export const scapeEditsKey = (tankId: string): string => `decor_edits:${tankId}`;

/** Record a counter increment (feeds, water changes...) — quests, unlocks and mastery read these. */
export function bumpCounter(state: GameState, key: string, by = 1): void {
  if (!Number.isFinite(by)) return;
  state.progress.counters[key] = (state.progress.counters[key] ?? 0) + by;
}

export function addMastery(state: GameState, track: MasteryTrack, xp: number): void {
  if (!Number.isFinite(xp)) return;
  state.progress.mastery[track] = Math.max(0, (state.progress.mastery[track] ?? 0) + xp);
}

/** Mastery level from XP (0, 1 at 25 XP, 2 at 100, 4 at 400, 10 at 2,500...). */
export function masteryLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 25));
}

export function addReputation(state: GameState, delta: number, reason: string): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  const before = state.progress.reputation;
  // gentle diminishing returns near the top
  const d = delta > 0 ? delta * Math.max(0.15, 1 - before / 1150) : delta;
  state.progress.reputation = Math.max(0, Math.min(1000, before + d));
  if (Math.abs(d) >= 5 && reason && !state.isShowcase) {
    emitEvent(state, { kind: d > 0 ? 'info' : 'warning', text: `${d > 0 ? '+' : ''}${Math.round(d)} reputation — ${reason}` });
  }
}

// ───────────────────────────── counters (effective values) ─────────────────────────────

/** Other lanes may use either spelling; the effective value is the max over aliases (never the sum). */
export const COUNTER_ALIASES: Record<string, string[]> = {
  feeds: ['feeds', 'feed', 'feedings'],
  waterChanges: ['waterChanges', 'water_changes', 'waterChange'],
  water_changes: ['waterChanges', 'water_changes', 'waterChange'],
  cleanings: ['cleanings', 'cleans', 'maintenance'],
  sales: ['sales', 'sold_items', 'salesCount', 'creature_sales', 'animalsSold'],
  sales_total: ['sales_total', 'salesRevenue'],
  tank_sales: ['tank_sales', 'tankSales'],
  births: ['births', 'births_seen', 'clutches_raised', 'clutchesRaised'],
  decor_placed: ['decor_placed', 'decorPlaced'],
  decorPlaced: ['decor_placed', 'decorPlaced'],
  photos: ['photos', 'photo'],
};

export function counterValue(state: GameState, key: string): number {
  const c = state.progress.counters;
  const keys = COUNTER_ALIASES[key] ?? [key];
  let v = 0;
  for (const k of keys) v = Math.max(v, c[k] ?? 0);
  if (key === 'visitors') v = Math.max(v, state.visitors.totalVisitors ?? 0);
  if (key === 'sales') v = Math.max(v, state.market?.history?.length ?? 0);
  return v;
}

/**
 * Per-unit effects applied when an activity's effective counter rises. `repCapDaily`: at most this many units earn
 * reputation per game day — a cap per DAY, not per step, so a 50-shrimp hatch is worth the same whether it was
 * watched at 1× (five separate steps) or caught up offline (one step).
 */
const COUNTER_EFFECTS: { key: string; track: MasteryTrack; xp: number; rep?: number; repCapDaily?: number }[] = [
  { key: 'feeds', track: 'husbandry', xp: 1 },
  { key: 'waterChanges', track: 'husbandry', xp: 4, rep: 0.2, repCapDaily: 20 },
  { key: 'cleanings', track: 'husbandry', xp: 2 },
  { key: 'sales', track: 'business', xp: 10, rep: 1.5, repCapDaily: 20 },
  { key: 'tank_sales', track: 'business', xp: 30, rep: 4, repCapDaily: 20 },
  { key: 'births', track: 'breeding', xp: 25, rep: 3, repCapDaily: 20 },
  { key: 'friend_visits', track: 'exhibition', xp: 3 },
  { key: 'photos', track: 'aquascaping', xp: 1 },
];

/** Units of `key` that may still earn reputation today (see COUNTER_EFFECTS.repCapDaily); spends `used` of them. */
function takeDailyRepBudget(state: GameState, key: string, cap: number, wanted: number): number {
  const c = state.progress.counters;
  const today = dayOf(state.clock.hour);
  const dayKey = `_fxday:${key}`;
  const usedKey = `_fxused:${key}`;
  if (c[dayKey] !== today) {
    c[dayKey] = today;
    c[usedKey] = 0;
  }
  const used = c[usedKey] ?? 0;
  const take = Math.max(0, Math.min(wanted, cap - used));
  c[usedKey] = used + take;
  return take;
}

function applyCounterEffects(state: GameState): void {
  const c = state.progress.counters;
  for (const e of COUNTER_EFFECTS) {
    const eff = counterValue(state, e.key);
    const seenKey = `_fx:${e.key}`;
    const seen = c[seenKey] ?? 0;
    if (eff > seen) {
      const d = eff - seen;
      c[seenKey] = eff;
      addMastery(state, e.track, e.xp * d);
      if (e.rep) addReputation(state, e.rep * (e.repCapDaily ? takeDailyRepBudget(state, e.key, e.repCapDaily, d) : d), '');
      // Marine keepers learn from marine work too.
      if (e.key === 'feeds' || e.key === 'waterChanges') {
        const marine = state.tankOrder.some((id) => state.tanks[id]?.environment === 'marine');
        if (marine) addMastery(state, 'marine', e.xp * d * 0.5);
      }
    } else if (eff < seen) {
      c[seenKey] = eff; // counters were reset (dev tools); resync
    }
  }
}

// ───────────────────────────── derived scans ─────────────────────────────

function ensureScan(state: GameState) {
  const p = state.progress;
  if (!p.scan) p.scan = { logSeq: maxLogSeq(state), marketHour: state.clock.hour, day: dayOf(state.clock.hour) };
  return p.scan;
}

function seqOf(id: string): number {
  const i = id.lastIndexOf('_');
  const n = parseInt(i >= 0 ? id.slice(i + 1) : id, 36);
  return Number.isFinite(n) ? n : 0;
}

function maxLogSeq(state: GameState): number {
  let m = 0;
  for (const e of state.log) m = Math.max(m, seqOf(e.id));
  return m;
}

/** Reputation lost per death, and the most a single game day of deaths can cost (a cap per day, not per step). */
const DEATH_REP = 1.5;
const DEATH_REP_CAP_DAILY = 10;

function scanLog(state: GameState): void {
  const scan = ensureScan(state);
  let maxSeq = scan.logSeq;
  let deaths = 0;
  for (const e of state.log) {
    const s = seqOf(e.id);
    if (s <= scan.logSeq) continue;
    maxSeq = Math.max(maxSeq, s);
    if (e.kind === 'death') deaths++;
  }
  scan.logSeq = maxSeq;
  if (deaths > 0) {
    const penalty = takeDailyRepBudget(state, 'deaths', DEATH_REP_CAP_DAILY, deaths * DEATH_REP);
    if (penalty > 0) addReputation(state, -penalty, 'an animal died in your care');
  }
}

function scanMarket(state: GameState): void {
  const scan = ensureScan(state);
  const hist = state.market?.history ?? [];
  const c = state.progress.counters;
  const cursor = scan.marketHour;
  const at = scan.marketAtCursor ?? 0;
  let seenAt = 0;
  let maxHour = cursor;
  for (const h of hist) {
    if (!(h.hour >= cursor)) continue;
    if (h.hour === cursor) {
      seenAt++;
      if (seenAt <= at) continue;
    }
    const price = Math.max(0, Number.isFinite(h.price) ? h.price : 0);
    c.sold_items = (c.sold_items ?? 0) + 1;
    c.sales_total = (c.sales_total ?? 0) + price;
    if (h.kind === 'tank') {
      c.tank_sales = (c.tank_sales ?? 0) + 1;
      c.best_tank_sale = Math.max(c.best_tank_sale ?? 0, price);
      addMastery(state, 'business', Math.min(200, price / 50));
    } else {
      addMastery(state, 'business', Math.min(80, price / 40));
    }
    if (h.hour > maxHour) maxHour = h.hour;
  }
  scan.marketHour = maxHour;
  scan.marketAtCursor = hist.filter((h) => h.hour === maxHour).length;
}

/** Clutches raised = distinct parent/birth groups among creatures bred in this save. */
function scanBirths(state: GameState): void {
  const groups = new Set<string>();
  let offspring = 0;
  for (const cr of Object.values(state.creatures)) {
    if (!cr.lineage || (cr.lineage.generation ?? 0) < 1) continue;
    if (!cr.lineage.motherId && !cr.lineage.fatherId) continue;
    offspring++;
    groups.add(`${cr.lineage.motherId}|${cr.lineage.fatherId}|${Math.floor(cr.bornHour / 12)}`);
  }
  const c = state.progress.counters;
  c.births_seen = Math.max(c.births_seen ?? 0, groups.size);
  c.offspring_raised = Math.max(c.offspring_raised ?? 0, offspring);
}

// ───────────────────────────── conditions ─────────────────────────────

interface CondCache {
  owned?: { all: Set<string>; fw: Set<string>; marine: Set<string> };
  bred?: Set<string>;
  /** Best beauty by minimum player-edit count (0 = any tank), '+own' for tanks that are mostly the player's layout. */
  maxBeauty?: Record<string, number>;
}

function owned(state: GameState, cache: CondCache) {
  if (!cache.owned) {
    const all = new Set<string>();
    const fw = new Set<string>();
    const marine = new Set<string>();
    for (const cr of Object.values(state.creatures)) {
      if (cr.status !== 'alive' && cr.status !== 'listed') continue;
      if (!cr.tankId) continue;
      all.add(cr.speciesId);
      const env = findSpecies(cr.speciesId)?.environment;
      if (env === 'marine') marine.add(cr.speciesId);
      else fw.add(cr.speciesId);
    }
    cache.owned = { all, fw, marine };
  }
  return cache.owned;
}

function bred(state: GameState, cache: CondCache) {
  if (!cache.bred) {
    const s = new Set<string>();
    for (const cr of Object.values(state.creatures)) {
      if ((cr.lineage?.generation ?? 0) >= 1 && (cr.lineage.motherId || cr.lineage.fatherId)) s.add(cr.speciesId);
    }
    cache.bred = s;
  }
  return cache.bred;
}

/** Best beauty among tanks (optionally only those the player has aquascaped with at least `scaped` edits). */
/** A tank with at least this share of its pieces still on the gifted starter template is not the player's layout. */
const GIFTED_LAYOUT_MAX = 0.5;

const ownLayout = (state: GameState, id: string): boolean => {
  const t = state.tanks[id];
  return !!t && giftedLayoutShare(state, t) < GIFTED_LAYOUT_MAX;
};

function maxBeauty(state: GameState, cache: CondCache, scaped = 0, own = false) {
  cache.maxBeauty ??= {};
  const key = own ? `${scaped}+own` : `${scaped}`;
  if (cache.maxBeauty[key] === undefined) {
    let m = 0;
    for (const id of state.tankOrder) {
      if (scaped > 0 && (state.progress.counters[scapeEditsKey(id)] ?? 0) < scaped) continue;
      const b = state.tanks[id]?.cache?.beauty ?? 0;
      if (b > m && (!own || ownLayout(state, id))) m = b;
    }
    cache.maxBeauty[key] = m;
  }
  return cache.maxBeauty[key];
}

/** One measurable part of a compound goal ("layout edits 1/3", "beauty 95/70"). */
export interface CondStep {
  label: string;
  current: number;
  target: number;
  met: boolean;
}

/**
 * Progress toward "beauty `min` in a tank you aquascaped (`scaped` edits)": the tank closest to meeting BOTH parts.
 * current/target report the part still missing (edits first), so a 95-beauty tank without edits reads "1/3", not "0/70".
 */
function scapedBeautyProgress(state: GameState, min: number, scaped: number, own = false): { tankId: string | null; current: number; target: number; detail: string; steps: CondStep[] } {
  let best: { id: string; edits: number; beauty: number; score: number; mine: boolean } | null = null;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (!t) continue;
    const edits = Math.max(0, Math.floor(state.progress.counters[scapeEditsKey(id)] ?? 0));
    const beauty = Math.floor(t.cache?.beauty ?? 0);
    const mine = !own || ownLayout(state, id);
    const score = (scaped > 0 ? Math.min(1, edits / scaped) : 1) + Math.min(1, beauty / Math.max(1, min)) + (mine ? 1 : 0);
    if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && beauty > best.beauty)) best = { id, edits, beauty, score, mine };
  }
  if (!best) {
    return { tankId: null, current: 0, target: scaped, detail: `Set up a tank, then edit its layout (0/${scaped}) · beauty 0/${min}`, steps: [{ label: 'Layout edits', current: 0, target: scaped, met: false }, { label: 'Beauty', current: 0, target: min, met: false }] };
  }
  const name = state.tanks[best.id]?.name ?? 'your tank';
  const editsMet = best.edits >= scaped;
  const beautyMet = best.beauty >= min;
  const editsShown = Math.min(best.edits, scaped);
  const gift = own && !best.mine ? ' · still mostly the gifted layout: rework it into your own' : '';
  const detail = `${name}: ${editsMet ? 'layout edited' : 'edit the layout'} (${editsShown}/${scaped}) · beauty ${best.beauty}/${min}${gift}`;
  const steps: CondStep[] = [
    { label: `Layout edits in ${name}`, current: editsShown, target: scaped, met: editsMet },
    { label: 'Beauty', current: best.beauty, target: min, met: beautyMet },
  ];
  if (own) steps.push({ label: 'A layout of your own', current: best.mine ? 1 : 0, target: 1, met: best.mine });
  // The missing part drives current/target (edits first, then your own layout: they are what the player has to go
  // and do).
  const bottleneck = !editsMet ? steps[0] : own && !best.mine ? steps[2] : steps[1];
  return { tankId: best.id, current: Math.min(bottleneck.current, bottleneck.target), target: bottleneck.target, detail, steps };
}

export interface CondStatus {
  met: boolean;
  current: number;
  target: number;
  label: string;
  /** Compound goals: plain-language progress line, e.g. "Ember’s Tank: edit the layout (1/3) · beauty 95/70". */
  detail?: string;
  /** Compound goals: each measurable part (UI may render one mini-bar per step). */
  steps?: CondStep[];
  /** Tank the progress refers to (compound tank goals). */
  tankId?: string;
}

const levelIdx = (id: string) => Math.max(0, FACILITY_LEVEL_ORDER.indexOf(id as never));

export function evalCond(state: GameState, cond: Cond, cache: CondCache = {}): CondStatus {
  const p = state.progress;
  switch (cond.type) {
    case 'reputation':
      return { met: p.reputation >= cond.min, current: Math.floor(p.reputation), target: cond.min, label: `${cond.min} reputation` };
    case 'mastery': {
      const v = p.mastery[cond.track] ?? 0;
      return { met: v >= cond.min, current: Math.floor(v), target: cond.min, label: `${cond.min} ${cond.track} mastery` };
    }
    case 'counter': {
      const v = counterValue(state, cond.key);
      return { met: v >= cond.min, current: v, target: cond.min, label: cond.label ?? `${cond.key.replace(/_/g, ' ')} ${cond.min}` };
    }
    case 'owns_species': {
      const o = owned(state, cache);
      if (cond.speciesId) {
        const has = o.all.has(cond.speciesId);
        return { met: has, current: has ? 1 : 0, target: 1, label: `Keep ${withArticle(findSpecies(cond.speciesId)?.commonName ?? cond.speciesId)}` }; // lane:w2-ui: an/a
      }
      const set = cond.env === 'marine' ? o.marine : cond.env === 'freshwater' ? o.fw : o.all;
      const min = cond.min ?? 1;
      return { met: set.size >= min, current: set.size, target: min, label: `Keep ${min} species${cond.env ? ` (${cond.env})` : ''}` };
    }
    case 'bred_species': {
      const b = bred(state, cache);
      if (cond.speciesId) {
        const has = b.has(cond.speciesId);
        return { met: has, current: has ? 1 : 0, target: 1, label: `Breed ${findSpecies(cond.speciesId)?.commonName ?? cond.speciesId}` };
      }
      const min = cond.min ?? 1;
      return { met: b.size >= min, current: b.size, target: min, label: `Breed ${min} species` };
    }
    case 'total_sales': {
      const hist = (state.market?.history ?? []).reduce((a, h) => a + Math.max(0, h.price || 0), 0);
      const v = Math.max(counterValue(state, 'sales_total'), hist);
      return { met: v >= cond.min, current: Math.floor(v), target: cond.min, label: `$${cond.min.toLocaleString('en-US')} in sales` };
    }
    case 'sales_count': {
      const v = counterValue(state, 'sales');
      return { met: v >= cond.min, current: v, target: cond.min, label: `${cond.min} sale${cond.min === 1 ? '' : 's'}` };
    }
    case 'research': {
      const done = p.research.completed.includes(cond.id);
      return { met: done, current: done ? 1 : 0, target: 1, label: `Research: ${RESEARCH_BY_ID[cond.id]?.name ?? cond.id}` };
    }
    case 'facility': {
      const cur = levelIdx(state.facility.level);
      const need = levelIdx(cond.level);
      return { met: cur >= need, current: cur, target: need, label: getFacilityLevel(cond.level).name };
    }
    case 'unlocked': {
      const has = p.unlocked.includes(cond.key);
      return { met: has, current: has ? 1 : 0, target: 1, label: unlockLabel(cond.key) };
    }
    case 'tanks': {
      let n = 0;
      for (const id of state.tankOrder) {
        const t = state.tanks[id];
        if (!t) continue;
        if (cond.env && t.environment !== cond.env) continue;
        if (cond.reef && t.waterClass !== 'reef') continue;
        if (cond.minGallons) {
          let g = 0;
          try {
            g = getTankTier(t.tierId).gallons;
          } catch {
            g = 0;
          }
          if (g < cond.minGallons) continue;
        }
        n++;
      }
      const what = cond.minGallons ? `${cond.minGallons}+ gal tank` : cond.reef ? 'reef tank' : cond.env ? `${cond.env} tank` : 'tank';
      return { met: n >= cond.min, current: n, target: cond.min, label: `${cond.min} ${what}${cond.min === 1 ? '' : 's'}` };
    }
    case 'visitors': {
      const v = state.visitors.totalVisitors ?? 0;
      return { met: v >= cond.min, current: Math.floor(v), target: cond.min, label: `${cond.min.toLocaleString('en-US')} visitors` };
    }
    case 'beauty': {
      const scaped = cond.scaped ?? 0;
      const own = !!cond.ownLayout;
      const v = maxBeauty(state, cache, scaped, own);
      if (!scaped && !own) return { met: v >= cond.min, current: Math.floor(v), target: cond.min, label: `Beauty ${cond.min}` };
      const label = own ? `Beauty ${cond.min} in a layout of your own (${scaped} layout edits)` : `Beauty ${cond.min} in a tank you aquascaped (${scaped} layout edits)`;
      if (v >= cond.min) return { met: true, current: cond.min, target: cond.min, label };
      // Not met yet: say which part is missing instead of "0/70" beside a tank that already scores 95.
      const pr = scapedBeautyProgress(state, cond.min, scaped, own);
      return { met: false, current: pr.current, target: pr.target, label, detail: pr.detail, steps: pr.steps, tankId: pr.tankId ?? undefined };
    }
    case 'flag': {
      const has = !!p.tutorial.flags[cond.flag];
      return { met: has, current: has ? 1 : 0, target: 1, label: cond.label ?? cond.flag.replace(/_/g, ' ') };
    }
    case 'tutorial_done': {
      const d = p.tutorial.done;
      return { met: d, current: d ? 1 : 0, target: 1, label: 'Finish the tutorial' };
    }
    case 'money': {
      return { met: state.finance.money >= cond.min, current: Math.floor(state.finance.money), target: cond.min, label: `$${cond.min.toLocaleString('en-US')}` };
    }
    case 'morphs': {
      const v = p.discoveredMorphs.length;
      return { met: v >= cond.min, current: v, target: cond.min, label: `${cond.min} morphs discovered` };
    }
    case 'strains': {
      const v = p.discoveredStrains?.length ?? 0;
      return { met: v >= cond.min, current: v, target: cond.min, label: `${cond.min} named ${cond.min === 1 ? 'strain' : 'strains'} discovered` };
    }
    case 'prismatics': {
      const v = p.prismaticFinds?.length ?? 0;
      return { met: v >= cond.min, current: v, target: cond.min, label: `${cond.min} Prismatic ${cond.min === 1 ? 'animal' : 'animals'}` };
    }
    case 'any': {
      const subs = cond.of.map((c) => evalCond(state, c, cache));
      const met = subs.some((s) => s.met);
      // progress of the closest alternative
      let best = subs[0];
      for (const s of subs) if (ratio(s) > ratio(best)) best = s;
      return { met, current: met ? 1 : ratio(best ?? { met: false, current: 0, target: 1, label: '' }), target: 1, label: cond.label ?? subs.map((s) => s.label).join(' or ') };
    }
    case 'all': {
      const subs = cond.of.map((c) => evalCond(state, c, cache));
      const met = subs.every((s) => s.met);
      const r = subs.length ? subs.reduce((a, s) => a + ratio(s), 0) / subs.length : 1;
      return { met, current: met ? 1 : r, target: 1, label: cond.label ?? subs.map((s) => s.label).join(' + ') };
    }
  }
}

function ratio(s: CondStatus): number {
  if (s.met) return 1;
  if (s.target <= 0) return 0;
  return Math.max(0, Math.min(1, s.current / s.target));
}

export function condsMet(state: GameState, conds: Cond[], cache: CondCache = {}): boolean {
  return conds.every((c) => evalCond(state, c, cache).met);
}

// ───────────────────────────── rewards ─────────────────────────────

export function grantReward(state: GameState, reward: Reward | undefined, memo: string): string[] {
  const out: string[] = [];
  if (!reward) return out;
  if (reward.money && reward.money > 0 && !state.isShowcase) {
    earn(state, reward.money, 'quest', memo);
    out.push(`$${reward.money}`);
  }
  if (reward.reputation) {
    addReputation(state, reward.reputation, '');
    out.push(`+${reward.reputation} reputation`);
  }
  if (reward.mastery) {
    addMastery(state, reward.mastery.track, reward.mastery.xp);
    out.push(`+${reward.mastery.xp} ${reward.mastery.track}`);
  }
  for (const k of reward.unlocks ?? []) {
    if (!isUnlocked(state, k)) {
      unlock(state, k);
      out.push(unlockLabel(k));
    }
  }
  for (const [foodId, n] of Object.entries(reward.foods ?? {})) {
    state.inventory.foods[foodId] = (state.inventory.foods[foodId] ?? 0) + n;
    out.push(`${n} servings of food`);
  }
  return out;
}

// ───────────────────────────── objectives ─────────────────────────────

export interface ObjectiveStatus {
  met: boolean;
  current: number;
  target: number;
  label?: string;
}

/**
 * `baseline`: a relative quest's counter value when it started. `baselines`: a tutorial step's counter values (and
 * reputation) when the STEP started — tutorial progress only counts what happened during the step.
 */
function objectiveStatus(state: GameState, obj: Objective, opts: { baseline?: number; baselines?: Record<string, number>; target?: number; startHour?: number }, cache: CondCache): ObjectiveStatus {
  switch (obj.type) {
    case 'flag': {
      // Only flags raised since the current step began count (see ProgressState.tutorial.flagHours) — and, with
      // `minHours`, only once the step has been on screen that long (an "observe" step should be watched, not flashed).
      // A flag seen during the dwell counts when the dwell ends: the AI throttles repeat sightings (30 s a behaviour),
      // so waiting for a fresh one could hold the step several times longer than the dwell.
      const fresh = state.progress.tutorial.flagHours ?? {};
      const start = opts.startHour ?? -Infinity;
      const dwelt = state.clock.hour >= start + (obj.minHours ?? 0) - 1e-9;
      let met = dwelt && obj.anyOf.some((f) => fresh[f] !== undefined && fresh[f] >= start);
      if (!met && obj.fallbackHours !== undefined && opts.startHour !== undefined) met = state.clock.hour - opts.startHour >= obj.fallbackHours;
      return { met, current: met ? 1 : 0, target: 1 };
    }
    case 'counter': {
      let v = counterValue(state, obj.key);
      if (obj.relative) v -= opts.baselines?.[obj.key] ?? opts.baseline ?? 0;
      const target = opts.target ?? obj.min;
      return { met: v >= target, current: Math.max(0, Math.floor(v)), target, label: obj.label };
    }
    case 'reputation': {
      const rep = state.progress.reputation;
      const base = opts.baselines?.reputation;
      const gained = obj.gain && base !== undefined ? rep - base : Infinity;
      const met = rep >= obj.min && gained >= (obj.gain ?? 0) - 1e-9;
      if (met) return { met, current: obj.gain && base !== undefined ? obj.gain : obj.min, target: obj.gain && base !== undefined ? obj.gain : obj.min, label: obj.label };
      // Below the bar: show reputation vs the bar. Past it: show what has been earned during this step.
      if (rep < obj.min) return { met, current: Math.floor(rep), target: obj.min, label: obj.label };
      return { met, current: Math.max(0, Math.floor(gained)), target: obj.gain ?? 1, label: 'reputation earned on this step' };
    }
    case 'cond': {
      const s = evalCond(state, obj.cond, cache);
      return { met: s.met, current: s.current, target: s.target, label: obj.label ?? s.label };
    }
    case 'any': {
      const subs = obj.of.map((o) => objectiveStatus(state, o, opts, cache));
      const met = subs.some((s) => s.met);
      let best = subs[0];
      for (const s of subs) if (s.target > 0 && best && best.target > 0 && s.current / s.target > best.current / best.target) best = s;
      return met ? { met, current: 1, target: 1 } : (best ?? { met: false, current: 0, target: 1 });
    }
  }
}

/** Counter key a relative objective measures (for baselines). */
function relativeKey(obj: Objective): string | null {
  if (obj.type === 'counter' && obj.relative) return obj.key;
  if (obj.type === 'any') for (const o of obj.of) {
    const k = relativeKey(o);
    if (k) return k;
  }
  return null;
}

// ───────────────────────────── tutorial ─────────────────────────────

export function interpolate(state: GameState, text: string): string {
  const starter = Object.values(state.creatures).find((c) => c.isStarter && (c.status === 'alive' || c.status === 'listed'));
  const sp = findSpecies(state.progress.tutorial.starterId || state.starterId);
  // Ideal bands are formatted exactly like the tank card's water report ("24.5–28.0 °C", "1.023–1.026").
  const temp = sp ? `${sp.tempC.idealMin.toFixed(1)}–${sp.tempC.idealMax.toFixed(1)} °C` : 'the right temperature';
  const sal = sp?.salinitySG ? `${sp.salinitySG.idealMin.toFixed(3)}–${sp.salinitySG.idealMax.toFixed(3)}` : 'marine salinity';
  return text
    .replace(/\{name\}/g, starter?.name ?? sp?.commonName ?? 'your starter')
    .replace(/\{species\}/g, (sp?.commonName ?? 'fish').toLowerCase())
    .replace(/\{temp\}/g, temp)
    .replace(/\{salinity\}/g, sal);
}

function tutorialStepDefs(state: GameState): TutorialStepDef[] {
  return tutorialChain(state.progress.tutorial.starterId || state.starterId);
}

export function tutorialStepId(state: GameState): string | null {
  const t = state.progress.tutorial;
  if (t.done || t.skipped) return null;
  return tutorialStepDefs(state)[t.step]?.id ?? null;
}

function completeTutorialStep(state: GameState, step: TutorialStepDef, rewarded: boolean): void {
  const t = state.progress.tutorial;
  const chain = tutorialStepDefs(state);
  // A reward the player already earned another way (research) — say so instead of "New upgrade unlocked!".
  const alreadyOwned = !!step.reward?.unlocks?.length && step.reward.unlocks.every((k) => isUnlocked(state, k));
  if (rewarded) grantReward(state, step.reward, `Tutorial: ${interpolate(state, step.title)}`);
  if (step.done && !state.isShowcase) {
    const text = alreadyOwned ? `${interpolate(state, step.title)}: you already have ${step.reward!.unlocks!.map(unlockLabel).join(' and ')} — you’re ahead of the tutorial!` : interpolate(state, step.done);
    emitEvent(state, { kind: 'tip', text, toast: true });
  }
  t.step += 1;
  t.stepStartedHour = state.clock.hour;
  t.flagHours = {};
  captureStepBaselines(state);
  if (t.step >= chain.length) {
    t.done = true;
    const q = state.progress.quests.find((x) => x.id === 'tutorial');
    if (q && q.status === 'active') {
      q.status = 'complete';
      q.progress = 1;
    }
  }
}

/** Counter keys (and reputation) a step's objective measures — their values are recorded when the step starts. */
function objectiveKeys(obj: Objective, out: string[] = []): string[] {
  if (obj.type === 'counter') out.push(obj.key);
  else if (obj.type === 'reputation') out.push('reputation');
  else if (obj.type === 'any') for (const o of obj.of) objectiveKeys(o, out);
  return out;
}

/** Record where the current step's counters (and reputation) stand, so only progress made during it counts. */
function captureStepBaselines(state: GameState): void {
  const t = state.progress.tutorial;
  if (t.done || t.skipped) {
    delete t.stepBaselines;
    return;
  }
  const step = tutorialStepDefs(state)[t.step];
  const b: Record<string, number> = {};
  if (step) for (const k of objectiveKeys(step.objective)) b[k] = k === 'reputation' ? state.progress.reputation : counterValue(state, k);
  t.stepBaselines = b;
}

/** Tutorial options for objectiveStatus (step start + baselines; old saves get baselines on first check). */
function tutorialOpts(state: GameState): { startHour?: number; baselines: Record<string, number> } {
  const t = state.progress.tutorial;
  if (!t.stepBaselines) captureStepBaselines(state);
  return { startHour: t.stepStartedHour, baselines: t.stepBaselines ?? {} };
}

/**
 * Unlock keys a not-yet-finished tutorial step will hand out. Play-based unlock rules hold these back until the
 * step does, so "Room to grow" really is what unlocks the 40-gallon breeder (a slow player used to get it first
 * from reputation, then read a step promising it). Research can still grant them.
 */
export function pendingTutorialUnlocks(state: GameState): Set<string> {
  const t = state.progress.tutorial;
  const out = new Set<string>();
  if (t.done || t.skipped) return out;
  const chain = tutorialStepDefs(state);
  for (let i = Math.max(0, t.step); i < chain.length; i++) for (const k of chain[i].reward?.unlocks ?? []) out.add(k);
  return out;
}

function checkTutorial(state: GameState, cache: CondCache): void {
  const t = state.progress.tutorial;
  if (t.done || t.skipped) return;
  if (t.stepStartedHour === undefined) t.stepStartedHour = state.clock.hour;
  const chain = tutorialStepDefs(state);
  for (let guard = 0; guard < chain.length; guard++) {
    const step = chain[t.step];
    if (!step) {
      t.done = true;
      break;
    }
    const st = objectiveStatus(state, step.objective, tutorialOpts(state), cache);
    if (!st.met) break;
    completeTutorialStep(state, step, true);
  }
  const q = state.progress.quests.find((x) => x.id === 'tutorial');
  if (q && q.status === 'active') q.progress = Math.min(1, t.step / chain.length);
}

/** Advance/skip tutorial steps from the UI. With a flag: record it and re-check. Without: the player pressed “Next”. */
export function tutorialAdvance(state: GameState, flag?: string): void {
  const t = state.progress.tutorial;
  if (flag) {
    t.flags[flag] = true;
    if (!t.done && !t.skipped) (t.flagHours ??= {})[flag] = state.clock.hour;
    checkTutorial(state, {});
    return;
  }
  if (t.done || t.skipped) return;
  const step = tutorialStepDefs(state)[t.step];
  if (!step) return;
  // "Look here" steps (a flag objective: open the market, watch the fish, peek at Research) hand out their reward on
  // Next too — there is nothing to cheat, and the done line ("You can now list animals for sale.") must be true.
  const met = objectiveStatus(state, step.objective, tutorialOpts(state), {}).met || step.objective.type === 'flag';
  completeTutorialStep(state, step, met);
  checkTutorial(state, {});
}

/**
 * Does the CURRENT tutorial step still need this flag? True when the step's objective lists it and it hasn't been
 * raised since the step began. UI tip: fire a flag whenever this is true (don't dedupe on `flags[flag]`, which also
 * records flags raised during earlier steps).
 */
export function tutorialWants(state: GameState, flag: string): boolean {
  const t = state.progress.tutorial;
  if (t.done || t.skipped) return false;
  const step = tutorialStepDefs(state)[t.step];
  if (!step) return false;
  const lists = (o: Objective): boolean => (o.type === 'flag' ? o.anyOf.includes(flag) : o.type === 'any' ? o.of.some(lists) : false);
  if (!lists(step.objective)) return false;
  // flagHours is reset at every step start; a flag raised during a step's minimum dwell counts once the dwell ends.
  return (t.flagHours ?? {})[flag] === undefined;
}

export function tutorialSkip(state: GameState): void {
  state.progress.tutorial.skipped = true;
  state.progress.tutorial.done = true;
  // grant the essentials a player would otherwise earn along the way
  for (const k of ['market_listings'] as const) if (!isUnlocked(state, k)) unlock(state, k, { silent: true });
  const q = state.progress.quests.find((x) => x.id === 'tutorial');
  if (q && q.status === 'active') q.status = 'claimed';
}

// ───────────────────────────── quests ─────────────────────────────

function questTitle(q: QuestState): string {
  if (q.id === 'tutorial') return 'First steps';
  return QUEST_BY_ID[q.id]?.title ?? q.id;
}

/** A quest the player can no longer make progress on (hobby-room goals once the shop opens). */
function questOutgrown(state: GameState, def: QuestDef): boolean {
  return def.maxFacility !== undefined && levelIdx(state.facility.level) > levelIdx(def.maxFacility);
}

function updateQuests(state: GameState, cache: CondCache): void {
  // an unfinished quest the player has outgrown leaves the board (it was never claimable, so nothing is lost)
  const p = state.progress;
  if (p.quests.some((q) => q.status === 'active' && q.id !== 'tutorial' && QUEST_BY_ID[q.id] && questOutgrown(state, QUEST_BY_ID[q.id]))) {
    p.quests = p.quests.filter((q) => !(q.status === 'active' && q.id !== 'tutorial' && QUEST_BY_ID[q.id] && questOutgrown(state, QUEST_BY_ID[q.id])));
  }
  for (const q of p.quests) {
    if (q.status !== 'active' || q.id === 'tutorial') continue;
    const def = QUEST_BY_ID[q.id];
    if (!def) continue;
    const st = objectiveStatus(state, def.objective, { baseline: q.baseline, target: q.target, startHour: q.startedHour }, cache);
    q.progress = st.target > 0 ? Math.max(0, Math.min(1, st.current / st.target)) : st.met ? 1 : 0;
    if (st.met) {
      q.status = 'complete';
      q.progress = 1;
      if (!state.isShowcase) emitEvent(state, { kind: 'celebrate', text: `Quest complete: ${def.title} — claim your reward!`, toast: true });
    }
  }
}

/**
 * lane:w2-sim — a board quest nobody has made headway on (under half done) for this long rotates off, so a board
 * full of goals that don't fit the player's path (a community tank for an axolotl keeper, aquascaping for someone
 * who breeds) doesn't block the easy, everyday rewards. Milestone quests (weight ≥ 3: facility moves, the
 * 1,000-gallon display) stay until done. Balance sweeps: the board draw was the biggest luck factor before the shop.
 */
export const QUEST_STALE_HOURS = 96;
/** A rotated quest stays off the board this long. */
const QUEST_ROTATED_OFF_HOURS = 72;

function rotateStaleQuest(state: GameState, now: number): boolean {
  const p = state.progress;
  const stale = p.quests
    .filter((q) => q.id !== 'tutorial' && q.status === 'active' && now - q.startedHour >= QUEST_STALE_HOURS && (q.progress ?? 0) < 0.5 && (QUEST_BY_ID[q.id]?.weight ?? 1) < 3)
    .sort((a, b) => a.startedHour - b.startedHour)[0];
  if (!stale) return false;
  p.quests = p.quests.filter((q) => q !== stale);
  const scan = ensureScan(state);
  const rotated = (scan.rotated ??= {});
  for (const id of Object.keys(rotated)) if (now - rotated[id] >= QUEST_ROTATED_OFF_HOURS) delete rotated[id];
  rotated[stale.id] = now;
  return true;
}

function refillBoard(state: GameState, rng: Rng, cache: CondCache): void {
  const p = state.progress;
  if (!p.tutorial.done && !p.tutorial.skipped) return;
  const scan = ensureScan(state);
  const now = state.clock.hour;
  if (scan.boardRefreshHour !== undefined && now < scan.boardRefreshHour) return;
  const present = new Set(p.quests.map((q) => q.id));
  const eligible = (def: QuestDef): boolean => {
    if (present.has(def.id)) return false;
    const claimed = p.counters[`quest_claimed:${def.id}`] ?? 0;
    if (claimed > 0 && !def.repeatable) return false;
    if (questOutgrown(state, def)) return false;
    return condsMet(state, def.requires, cache);
  };
  const metNow = (def: QuestDef): boolean => {
    const times = p.counters[`quest_claimed:${def.id}`] ?? 0;
    const target = scaledTarget(def, times);
    const rk = relativeKey(def.objective);
    const baseline = rk ? counterValue(state, rk) : undefined;
    return objectiveStatus(state, def.objective, { baseline, target, startHour: now }, cache).met;
  };
  // A one-shot quest whose goal was reached before it was ever drawn (the move to a showroom while the board was
  // full, the first marine tank right after the research) is still owed: it joins the board straight away — even a
  // full one — and completes on the next tick, instead of being lost for good. One per draw, so an old save with a
  // dozen such goals is paid out over a few hours rather than in one burst.
  const owed = QUESTS.find((def) => !def.repeatable && eligible(def) && metNow(def));
  if (owed) {
    p.quests.push({ id: owed.id, status: 'active', progress: 0, startedHour: now });
    scan.boardRefreshHour = now + 1;
    return;
  }
  const onBoard = p.quests.filter((q) => q.id !== 'tutorial' && (q.status === 'active' || q.status === 'complete'));
  // lane:w2-sim — a full board makes room only by rotating an untouched quest off. The board shows the fresh quest;
  // rotations aren't logged (three slots turning over every few days would add 5–10 log lines per real hour).
  if (onBoard.length >= QUEST_BOARD_SIZE && !rotateStaleQuest(state, now)) return;
  const candidates: QuestDef[] = [];
  for (const def of QUESTS) {
    if (scan.rotated?.[def.id] !== undefined && now - scan.rotated[def.id] < QUEST_ROTATED_OFF_HOURS) continue; // lane:w2-sim
    if (!eligible(def)) continue;
    // skip repeatable quests that would complete instantly (they come round again)
    if (metNow(def)) continue;
    candidates.push(def);
  }
  if (!candidates.length) {
    scan.boardRefreshHour = now + 6;
    return;
  }
  const def = rng.weighted(candidates, (d) => d.weight ?? 1);
  const times = p.counters[`quest_claimed:${def.id}`] ?? 0;
  const rk = relativeKey(def.objective);
  p.quests.push({
    id: def.id,
    status: 'active',
    progress: 0,
    startedHour: now,
    baseline: rk ? counterValue(state, rk) : undefined,
    target: def.objective.type === 'counter' ? scaledTarget(def, times) : undefined,
  });
  // one new quest at a time, a short breather between draws
  scan.boardRefreshHour = now + 1;
}

function scaledTarget(def: QuestDef, times: number): number | undefined {
  if (def.objective.type !== 'counter') return undefined;
  const base = def.objective.min;
  if (!def.objective.relative) return base;
  return Math.max(1, Math.round(base * (1 + 0.5 * times)));
}

export function claimQuest(state: GameState, questId: string): ActionResult {
  const q = state.progress.quests.find((x) => x.id === questId);
  if (!q) return { ok: false, message: 'Quest not found.' };
  if (q.status === 'claimed') return { ok: false, message: 'Already claimed.' };
  if (q.status !== 'complete') return { ok: false, message: 'Not finished yet.' };
  const reward = q.id === 'tutorial' ? TUTORIAL_QUEST_REWARD : QUEST_BY_ID[q.id]?.reward;
  const got = grantReward(state, reward, `Quest: ${questTitle(q)}`);
  q.status = 'claimed';
  const key = `quest_claimed:${q.id}`;
  state.progress.counters[key] = (state.progress.counters[key] ?? 0) + 1;
  const def = QUEST_BY_ID[q.id];
  if (def?.repeatable) state.progress.quests = state.progress.quests.filter((x) => x !== q);
  addMastery(state, 'business', 5);
  return { ok: true, message: got.length ? `Reward: ${got.join(', ')}` : 'Quest claimed.' };
}

// ───────────────────────────── research ─────────────────────────────

export function researchMissing(state: GameState, def: ResearchDef): string[] {
  const cache: CondCache = {};
  return def.requires.map((c) => evalCond(state, c, cache)).filter((s) => !s.met).map((s) => s.label);
}

/** Counter holding what the player actually paid for the active project (refunds use it; absent in old saves). */
const RESEARCH_PAID_KEY = '_research_paid';

/**
 * Unlock keys a project would still add. Most research keys can ALSO be earned through play (reputation, mastery,
 * a first clutch...; see src/data/unlocks.ts), so a project can end up teaching nothing new.
 */
export function researchNewGrants(state: GameState, def: ResearchDef): string[] {
  return def.grants.filter((k) => !state.progress.unlocked.includes(k));
}

/**
 * What starting a project costs right now. Grants the player already owns are not charged for: the list price is
 * pro-rated by the value share of the grants that are still new (the first grant is the project's headline and
 * weighs 3, each extra 1), never below a quarter of the list price, rounded to $5. A project whose grants are all
 * owned costs nothing (it is shown as already learned and can't be bought).
 */
export function researchCost(state: GameState, def: ResearchDef): number {
  const n = def.grants.length;
  const owned = state.progress.unlocked;
  let total = 0;
  let fresh = 0;
  def.grants.forEach((k, i) => {
    const w = i === 0 && n > 1 ? 3 : 1;
    total += w;
    if (!owned.includes(k)) fresh += w;
  });
  if (n === 0 || fresh >= total) return def.cost;
  if (fresh === 0) return 0;
  const round5 = (v: number) => Math.round(v / 5) * 5;
  return Math.min(def.cost, Math.max(round5(def.cost * 0.25), round5((def.cost * fresh) / total)));
}

/** Record a project as done without study (everything it teaches was learned through play). No charge, no rewards. */
function markResearchOwned(state: GameState, def: ResearchDef): void {
  const r = state.progress.research;
  if (!r.completed.includes(def.id)) r.completed.push(def.id);
  state.progress.counters[researchOwnedKey(def.id)] = 1;
}

/** Counter flag: this project was closed because play had already taught everything in it (UI: "learned through play"). */
const researchOwnedKey = (id: string) => `_research_owned:${id}`;

export function startResearch(state: GameState, researchId: string): ActionResult {
  const def = RESEARCH_BY_ID[researchId];
  if (!def) return { ok: false, message: 'Unknown research project.' };
  const r = state.progress.research;
  if (r.completed.includes(def.id)) return { ok: false, message: `${def.name} is already complete.` };
  if (r.activeId === def.id) return { ok: false, message: `${def.name} is already underway.` };
  // Never charge for nothing: when everything it grants is already unlocked, the project is simply marked learned.
  if (researchNewGrants(state, def).length === 0) {
    markResearchOwned(state, def);
    return { ok: true, message: `You already have everything ${def.name} covers — marked as learned, no charge.` };
  }
  if (r.activeId) return { ok: false, message: `Finish ${RESEARCH_BY_ID[r.activeId]?.name ?? 'the current project'} first.` };
  const missing = researchMissing(state, def);
  if (missing.length) return { ok: false, message: `Needs: ${missing.join(', ')}.` };
  const cost = researchCost(state, def);
  if (!spend(state, cost, 'research', `Research: ${def.name}`)) return { ok: false, message: `You need $${cost.toLocaleString('en-US')} to start ${def.name}.` };
  state.progress.counters[RESEARCH_PAID_KEY] = cost;
  r.activeId = def.id;
  r.progressHours = 0;
  const reduced = cost < def.cost ? ` (reduced to $${cost.toLocaleString('en-US')} — you already have part of it)` : '';
  if (!state.isShowcase) emitEvent(state, { kind: 'info', text: `Research started: ${def.name}${reduced}.` });
  return { ok: true, message: `Research started: ${def.name}${reduced}` };
}

/** What the player paid for the active project (list price for saves from before this was recorded). */
function paidForActive(state: GameState, def: ResearchDef): number {
  const v = state.progress.counters[RESEARCH_PAID_KEY];
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : def.cost;
}

/** Abandon the active project (half of what was paid is refunded). */
export function cancelResearch(state: GameState): ActionResult {
  const r = state.progress.research;
  const def = r.activeId ? RESEARCH_BY_ID[r.activeId] : undefined;
  if (!def) return { ok: false, message: 'No research in progress.' };
  const paid = paidForActive(state, def);
  r.activeId = undefined;
  r.progressHours = 0;
  delete state.progress.counters[RESEARCH_PAID_KEY];
  const refund = Math.round(paid / 2);
  if (refund > 0) earn(state, refund, 'research', `Research refund: ${def.name}`);
  // lane:guide — name the amount (it said "half the cost refunded" even when nothing had been paid)
  return { ok: true, message: refund > 0 ? `${def.name} cancelled — $${refund.toLocaleString('en-US')} (half the cost) refunded.` : `${def.name} cancelled. Nothing had been paid yet, so there is no refund.` };
}

function stepResearch(state: GameState, dt: number): void {
  const r = state.progress.research;
  if (!r.activeId) return;
  const def = RESEARCH_BY_ID[r.activeId];
  if (!def) {
    r.activeId = undefined;
    return;
  }
  // Everything this project teaches was earned through play while it ran: close it and give the money back.
  if (researchNewGrants(state, def).length === 0) {
    const paid = paidForActive(state, def);
    const frac = def.hours > 0 ? Math.max(0, Math.min(1, r.progressHours / def.hours)) : 1;
    markResearchOwned(state, def);
    r.activeId = undefined;
    r.progressHours = 0;
    delete state.progress.counters[RESEARCH_PAID_KEY];
    if (frac > 0) addMastery(state, def.track, Math.round(def.xp * frac));
    if (!state.isShowcase) {
      if (paid > 0) earn(state, paid, 'research', `Research refund: ${def.name}`);
      emitEvent(state, { kind: 'info', text: `You picked up everything ${def.name} covers through your own keeping, so the project was closed${paid > 0 ? ` and your $${paid.toLocaleString('en-US')} refunded` : ''}.`, toast: true });
    }
    return;
  }
  r.progressHours += dt;
  if (r.progressHours + 1e-9 < def.hours) return;
  r.completed.push(def.id);
  r.activeId = undefined;
  r.progressHours = 0;
  delete state.progress.counters[RESEARCH_PAID_KEY];
  bumpCounter(state, 'research_done');
  addMastery(state, def.track, def.xp);
  addReputation(state, 5, '');
  emitEvent(state, { kind: 'celebrate', text: `Research complete: ${def.name}!`, toast: true });
  for (const k of def.grants) unlock(state, k);
}

// ───────────────────────────── unlocks & achievements ─────────────────────────────

function checkUnlockRules(state: GameState, cache: CondCache): void {
  const held = pendingTutorialUnlocks(state);
  for (const rule of UNLOCK_RULES) {
    if (state.progress.unlocked.includes(rule.key) || held.has(rule.key)) continue;
    if (condsMet(state, rule.when, cache)) unlock(state, rule.key, { silent: rule.silent });
  }
}

function checkAchievements(state: GameState, cache: CondCache): void {
  for (const a of ACHIEVEMENTS) {
    if (state.progress.achievements.includes(a.id)) continue;
    if (!evalCond(state, a.cond, cache).met) continue;
    state.progress.achievements.push(a.id);
    if (a.reputation) addReputation(state, a.reputation, '');
    emitEvent(state, { kind: 'celebrate', text: `Achievement: ${a.title} — ${a.description}`, toast: true });
  }
}

/**
 * Called once when a new game is created (after the starter tank and animal exist): record every unlock rule and
 * achievement the starting setup ALREADY satisfies, quietly — no toasts, no reputation. A brand-new marine keeper
 * simply has "Into the Blue"; it is not celebrated as if earned in the first second of play.
 */
export function settleStartingProgress(state: GameState): void {
  const cache: CondCache = {};
  const held = pendingTutorialUnlocks(state);
  for (const rule of UNLOCK_RULES) {
    if (!state.progress.unlocked.includes(rule.key) && !held.has(rule.key) && condsMet(state, rule.when, cache)) unlock(state, rule.key, { silent: true });
  }
  for (const a of ACHIEVEMENTS) {
    if (!state.progress.achievements.includes(a.id) && evalCond(state, a.cond, cache).met) state.progress.achievements.push(a.id);
  }
}

// ───────────────────────────── daily ─────────────────────────────

function sampleDay(state: GameState): void {
  const c = state.progress.counters;
  let bad = false;
  let signs = 0;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (!t) continue;
    if (t.signage) signs++;
    // "Keep every tank's WATER good": the water part only (animal welfare shows in the tank status separately).
    const water = t.cache?.waterStatus ?? t.cache?.status;
    if (water && water !== 'good') bad = true;
  }
  if (bad) c._badToday = 1;
  c.signs_active = signs;
}

function dailyRollover(state: GameState): void {
  const scan = ensureScan(state);
  const today = dayOf(state.clock.hour);
  if (today <= scan.day) return;
  const c = state.progress.counters;
  const hadTanks = state.tankOrder.length > 0;
  c.water_good_streak = !c._badToday && hadTanks ? (c.water_good_streak ?? 0) + 1 : 0;
  c._badToday = 0;
  let healthy = 0;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (!t) continue;
    const alive = Object.values(state.creatures).some((cr) => cr.tankId === id && cr.status === 'alive');
    if (!alive) continue;
    // A healthy tank: good water and no animal in danger (starving, seriously ill, failing).
    if ((t.cache?.waterStatus ?? t.cache?.status) === 'good' && t.cache?.animalStatus !== 'danger') {
      healthy++;
      addMastery(state, 'husbandry', 3);
      if (t.environment === 'marine') addMastery(state, 'marine', t.waterClass === 'reef' ? 10 : 6);
    }
    addMastery(state, 'aquascaping', Math.max(0, ((t.cache?.beauty ?? 0) - 55) / 3));
  }
  if (healthy) addReputation(state, Math.min(3, healthy * 0.4), '');
  scan.day = today;
}

// ───────────────────────────── init + step ─────────────────────────────

/** Starting unlocks, tutorial and the first quest for a starter. */
export function initProgress(state: GameState, starterId: string): void {
  const p = state.progress;
  for (const k of STARTER_UNLOCKS[starterId] ?? DEFAULT_STARTER_UNLOCKS) if (!p.unlocked.includes(k)) p.unlocked.push(k);
  p.tutorial = { starterId, step: 0, done: false, skipped: false, flags: { ...(p.tutorial?.flags ?? {}), named: true }, stepStartedHour: state.clock.hour, flagHours: {} };
  captureStepBaselines(state);
  if (!p.quests.some((q) => q.id === 'tutorial')) p.quests.push({ id: 'tutorial', status: 'active', progress: 0, startedHour: state.clock.hour });
  p.scan = { logSeq: maxLogSeq(state), marketHour: state.clock.hour, day: dayOf(state.clock.hour) };
}

export function stepProgression(state: GameState, dt: number, ctx: SimContext): void {
  if (state.isShowcase) return;
  ensureScan(state);
  const cache: CondCache = {};
  stepResearch(state, dt);
  scanLog(state);
  scanMarket(state);
  // creature scans are O(creatures): once per game hour is plenty (cursor kept in state for determinism)
  const scan = state.progress.scan!;
  if (scan.birthScanHour === undefined || Math.floor(state.clock.hour) !== scan.birthScanHour) {
    scan.birthScanHour = Math.floor(state.clock.hour);
    scanBirths(state);
  }
  sampleDay(state);
  dailyRollover(state);
  applyCounterEffects(state);
  checkTutorial(state, cache);
  updateQuests(state, cache);
  refillBoard(state, ctx.rng, cache);
  checkUnlockRules(state, cache);
  checkAchievements(state, cache);
}

// ───────────────────────────── UI helpers ─────────────────────────────

export interface TutorialStepView {
  index: number;
  total: number;
  id: string;
  title: string;
  body: string;
  hintTarget: string;
  progress: { current: number; target: number; label?: string };
  reward?: Reward;
  starterId: string;
}

export function currentTutorialStep(state: GameState): TutorialStepView | null {
  const t = state.progress.tutorial;
  if (t.done || t.skipped) return null;
  const chain = tutorialStepDefs(state);
  const step = chain[t.step];
  if (!step) return null;
  const st = objectiveStatus(state, step.objective, { startHour: t.stepStartedHour, baselines: t.stepBaselines ?? {} }, {});
  return {
    index: t.step,
    total: chain.length,
    id: step.id,
    title: interpolate(state, step.title),
    body: interpolate(state, step.body),
    hintTarget: step.hintTarget,
    progress: { current: st.current, target: st.target, label: st.label },
    reward: step.reward,
    starterId: t.starterId,
  };
}

export interface QuestView {
  id: string;
  title: string;
  body: string;
  icon: string;
  status: QuestState['status'];
  progress: number;
  current: number;
  target: number;
  reward: Reward;
  isTutorial: boolean;
  /**
   * Compound goals (e.g. Showpiece: edits AND beauty in one tank): a plain-language progress line to show under the
   * bar, e.g. "Ember’s Tank: edit the layout (1/3) · beauty 95/70". current/target then describe the missing part.
   */
  detail?: string;
  /** Compound goals: each measurable part ({ label, current, target, met }). */
  steps?: CondStep[];
  /** Tank the progress refers to (the UI can offer "Go to tank"). */
  tankId?: string;
}

export function activeQuests(state: GameState): QuestView[] {
  const out: QuestView[] = [];
  const cache: CondCache = {};
  for (const q of state.progress.quests) {
    if (q.status === 'claimed') continue;
    if (q.id === 'tutorial') {
      // lane:qa-final — a skipped guide (fixtures and old saves set the flags directly, without tutorialSkip) never
      // leaves "First steps 0/11" on the board for good.
      if (q.status === 'active' && state.progress.tutorial.skipped) continue;
      const chain = tutorialStepDefs(state);
      out.push({ id: 'tutorial', title: 'First steps', body: 'Finish the tutorial to open the quest board.', icon: 'GraduationCap', status: q.status, progress: q.status === 'complete' ? 1 : state.progress.tutorial.step / chain.length, current: Math.min(chain.length, state.progress.tutorial.step), target: chain.length, reward: TUTORIAL_QUEST_REWARD, isTutorial: true });
      continue;
    }
    const def = QUEST_BY_ID[q.id];
    if (!def) continue;
    const st = objectiveStatus(state, def.objective, { baseline: q.baseline, target: q.target, startHour: q.startedHour }, cache);
    const target = st.target;
    let body = def.body;
    if (q.target && def.objective.type === 'counter' && q.target !== def.objective.min) body = def.bodyRepeat ? def.bodyRepeat.replace(/\{n\}/g, String(q.target)) : body;
    const view: QuestView = { id: q.id, title: def.title, body, icon: def.icon ?? 'Target', status: q.status, progress: q.status === 'complete' ? 1 : q.progress, current: q.status === 'complete' ? target : Math.min(target, st.current), target, reward: def.reward, isTutorial: false };
    if (q.status === 'active' && def.objective.type === 'cond') {
      const cs = evalCond(state, def.objective.cond, cache);
      if (cs.detail) view.detail = cs.detail;
      if (cs.steps) view.steps = cs.steps;
      if (cs.tankId) view.tankId = cs.tankId;
    }
    out.push(view);
  }
  return out;
}

export interface UnlockProgressView {
  key: string;
  label: string;
  hint: string;
  /** 0..1 */
  progress: number;
  requirements: { label: string; met: boolean; current: number; target: number }[];
  /** Research projects that grant this key. */
  viaResearch: { id: string; name: string }[];
}

/** Locked keys with how close the player is, nearest first. */
export function unlockProgress(state: GameState): UnlockProgressView[] {
  const cache: CondCache = {};
  const out: UnlockProgressView[] = [];
  const keys = Object.keys(UNLOCK_KEYS);
  for (const key of keys) {
    if (state.progress.unlocked.includes(key)) continue;
    const rule = UNLOCK_RULE_BY_KEY[key];
    const reqs = (rule?.when ?? []).map((c) => evalCond(state, c, cache));
    const viaResearch = RESEARCH.filter((r) => r.grants.includes(key as never)).map((r) => ({ id: r.id, name: r.name }));
    const progress = reqs.length ? reqs.reduce((a, s) => a + ratio(s), 0) / reqs.length : 0;
    out.push({
      key,
      label: unlockLabel(key),
      hint: rule?.hint ?? (viaResearch.length ? `Research ${viaResearch[0].name}.` : 'Keep playing.'),
      progress,
      requirements: reqs.map((s) => ({ label: s.label, met: s.met, current: s.current, target: s.target })),
      viaResearch,
    });
  }
  out.sort((a, b) => b.progress - a.progress);
  return out;
}

export interface ResearchView {
  def: ResearchDef;
  status: 'done' | 'active' | 'available' | 'locked';
  /** 0..1 for the active project. */
  progress: number;
  hoursLeft: number;
  missing: string[];
  /** Enough money for `cost` (not the list price). */
  affordable: boolean;
  /**
   * Everything this project grants is already unlocked (earned through play: reputation, mastery, a first clutch...).
   * Status is then 'done' and it can never be bought — the UI should say "Already learned through play" instead of
   * a price or a Start button.
   */
  alreadyOwned: boolean;
  /** Unlock keys the project would still add (subset of def.grants). The UI should list only these as "Unlocks". */
  grantsNew: string[];
  /** Price to start it now: grants already owned aren't charged (pro-rated; 0 when alreadyOwned). Use instead of def.cost. */
  cost: number;
}

export function researchList(state: GameState): ResearchView[] {
  const r = state.progress.research;
  return RESEARCH.map((def) => {
    const active = r.activeId === def.id;
    const grantsNew = researchNewGrants(state, def);
    const ownedByPlay = !!state.progress.counters[researchOwnedKey(def.id)] || (!active && !r.completed.includes(def.id) && grantsNew.length === 0);
    const done = r.completed.includes(def.id) || (ownedByPlay && !active);
    const missing = done || active ? [] : researchMissing(state, def);
    const cost = done ? 0 : active ? paidForActive(state, def) : researchCost(state, def);
    return {
      def,
      status: done ? 'done' : active ? 'active' : missing.length ? 'locked' : 'available',
      progress: active ? Math.min(1, r.progressHours / def.hours) : done ? 1 : 0,
      hoursLeft: active ? Math.max(0, def.hours - r.progressHours) : done ? 0 : def.hours,
      missing,
      affordable: state.finance.money >= cost,
      alreadyOwned: ownedByPlay,
      grantsNew,
      cost,
    };
  });
}

/** Plain-language label for any condition (for UI cards). */
export function condLabel(state: GameState, cond: Cond): string {
  return evalCond(state, cond, {}).label;
}
