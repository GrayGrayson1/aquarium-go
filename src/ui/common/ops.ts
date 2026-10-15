/**
 * Operations' shared view of the game (DESIGN-S3D §5.3, §5.4, §7.1, §9.8). OWNER: lane "automation" (chunk 5).
 *
 * - The tier the player is at (Overview's early, before-the-Desk and full layouts) and the ladder of what opens next.
 * - Problems, their counts and the forecast, memoised (PERF-004): the forecast dry-runs the stock manager's next check,
 *   which walks every animal, so it runs once per key — the game hour and the stock, budget, holds and lines that move
 *   it — never on each 4 Hz publish or panel refresh. The dock, More, bell, panel, Supplies and Staff all read the same
 *   snapshot; Today, the flows and the week's money are kept per key too (`opsMemo`).
 * - The Operations dot: red when anything needs you, amber when something is worth a look or manual mode is on (§5.4;
 *   no news dot).
 */
import type { GameState } from '@/types';
import { BRINE, INFUSORIA, VEGETABLES } from '@/data/catalog/machines';
import { RESEARCH_BY_ID } from '@/data/research';
import { FACILITY_LEVEL_ORDER, getFacilityLevel } from '@/data/facilities';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import type { FacilityLevelId } from '@/types';
import { automationProblems, decidedLines, manualModeOn, problemCounts, type Problem } from '@/sim/automation';
import { evalCond } from '@/sim/facility';
import { lineSlots, lineStatus, productionLines } from '@/sim/production';
import { nextStockCheck, type StockForecast } from '@/sim/staff/work';
import { HOURS_PER_DAY } from '@/sim/time';

export type OpsLayout = 'early' | 'before' | 'full';

export interface OpsTier {
  /** Tier 1: the Autofeeder and the Auto Water Changer (Better Life Support or husbandry mastery). */
  assisted: boolean;
  water: boolean;
  food: boolean;
  lines: number;
  slots: number;
  /** Tier 5: the Operations Desk is researched. */
  desk: boolean;
  layout: OpsLayout;
}

export function opsTier(g: GameState): OpsTier {
  const unlocked = g.progress.unlocked;
  const water = !!g.facility.water;
  const food = !!g.facility.food;
  const lines = productionLines(g).length;
  const desk = unlocked.includes('operations_desk');
  return {
    assisted: unlocked.includes('gear_autofeeder'),
    water,
    food,
    lines,
    slots: lineSlots(g),
    desk,
    layout: desk ? 'full' : water || food || lines >= 2 ? 'before' : 'early',
  };
}

export interface OpsSnapshot {
  problems: Problem[];
  counts: { total: number; danger: number; watch: number };
  decided: { lineId: string; name: string; restartDay: number }[];
  manual: boolean;
  /** The stock manager's next shelf check, dry-run (null without one). */
  forecast: StockForecast | null;
}

const EMPTY: OpsSnapshot = { problems: [], counts: { total: 0, danger: 0, watch: 0 }, decided: [], manual: false, forecast: null };

/** What moves Problems: the hour, the stock, the budget, the holds, the lines. Cheap: no walk over animals. */
export function opsKey(g: GameState): string {
  const st = g.staff;
  const lines = (g.production?.lines ?? []).map((l) => `${l.id}:${l.waiting ? 1 : 0}${l.running ? 1 : 0}`).join(',');
  const w = g.facility.water;
  const f = g.facility.food;
  return [
    g.saveId,
    Math.floor(g.clock.hour),
    g.inventory.salt,
    g.inventory.brineShrimpEggs ?? 0,
    Math.floor(g.inventory.foods[VEGETABLES] ?? 0),
    Math.floor(g.inventory.foods[BRINE] ?? 0),
    Math.floor(g.inventory.foods[INFUSORIA] ?? 0),
    st ? `${st.stockBudget}:${st.ordersOff ? 1 : 0}:${st.stockSpent.amount}:${st.roster.length}` : '-',
    JSON.stringify(g.automation?.hold ?? null),
    JSON.stringify(g.automation?.lineWait ?? null),
    lines,
    g.tankOrder.length,
    w ? `${w.fresh < 1 ? 0 : 1}:${w.mix ? 1 : 0}` : '-',
    f ? `${f.cones.length}:${f.jars.length}` : '-',
  ].join('|');
}

let cache: { key: string; snap: OpsSnapshot } | null = null;

/** Problems and their counts for this game, computed once per key. */
export function opsSnapshot(g: GameState | null | undefined): OpsSnapshot {
  if (!g || g.isShowcase) return EMPTY;
  const key = opsKey(g);
  if (cache?.key === key) return cache.snap;
  let snap: OpsSnapshot;
  try {
    const forecast = nextStockCheck(g);
    const problems = automationProblems(g, g.clock.hour, forecast);
    snap = { problems, counts: problemCounts(problems), decided: decidedLines(g), manual: manualModeOn(g), forecast };
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('operations snapshot failed', e);
    snap = EMPTY;
  }
  cache = { key, snap };
  return snap;
}

const memos = new Map<string, { key: string; value: unknown }>();

/** A summary kept until the Operations key moves (PERF-004): Today, the water flows, the week's money, Staff's status. */
export function opsMemo<T>(name: string, g: GameState, fn: () => T): T {
  const key = opsKey(g);
  const hit = memos.get(name);
  if (hit?.key === key) return hit.value as T;
  const value = fn();
  memos.set(name, { key, value });
  return value;
}

/** The Operations dot (dock, More row, sheet switcher): red when anything needs you, amber when worth a look or held. */
export function opsDot(g: GameState): { level: 'danger' | 'watch'; label: string } | null {
  const s = opsSnapshot(g);
  if (s.counts.danger) return { level: 'danger', label: `${s.counts.total} ${s.counts.total === 1 ? 'problem' : 'problems'}` };
  if (s.counts.watch) return { level: 'watch', label: `${s.counts.total} to look at` };
  if (s.manual) return { level: 'watch', label: 'Manual mode on' };
  return null;
}

/** The More sheet's Operations row sub-line (copy deck §11). */
export function moreSubline(g: GameState): string {
  const snap = opsSnapshot(g);
  const tier = opsTier(g);
  if (snap.manual) return 'Manual mode on · automation on hold';
  if (tier.layout === 'early') return 'Overview, your line and the map';
  const lines = `${tier.lines} ${tier.lines === 1 ? 'line' : 'lines'}`;
  if (snap.counts.danger) return `${snap.counts.total} ${snap.counts.total === 1 ? 'problem' : 'problems'} · ${lines}`;
  if (snap.counts.watch) return `${snap.counts.total} to look at · ${lines}`;
  const running = productionLines(g).filter((l) => lineStatus(l) === 'running').length;
  return `${running} ${running === 1 ? 'line' : 'lines'} running · ${g.tankOrder.length} ${g.tankOrder.length === 1 ? 'tank' : 'tanks'}`;
}

// ───────────────────────────── the tier ladder (§7.1; ADR-0026 decision 9's rows) ─────────────────────────────

export interface LadderReq {
  met: boolean;
  text: string;
}

export interface LadderTier {
  tier: 2 | 3 | 4 | 5;
  key: 'water' | 'food' | 'lines' | 'tools';
  name: string;
  desc: string;
  open: boolean;
  reqs: LadderReq[];
}

const levelIndex = (id: FacilityLevelId) => FACILITY_LEVEL_ORDER.indexOf(id);

/** A facility level as a requirement: "{Level}: you're past it", or what's missing ("{Level} · 42 of 100 reputation"). */
function levelReq(g: GameState, level: FacilityLevelId): LadderReq[] {
  const def = getFacilityLevel(level);
  if (levelIndex(g.facility.level) >= levelIndex(level)) return [{ met: true, text: `${def.name}: you’re past it` }];
  const rule = def.unlockKey ? UNLOCK_RULE_BY_KEY[def.unlockKey] : undefined;
  const out: LadderReq[] = [];
  for (const c of rule?.when ?? []) {
    if (c.type === 'facility') continue; // the level before it is implied by naming this one
    const s = evalCond(g, c);
    if (s.met) continue;
    if (c.type === 'reputation') out.push({ met: false, text: `${def.name} · ${s.current} of ${s.target} reputation` });
    else out.push({ met: false, text: `${def.name} · ${s.label}` });
  }
  if (!out.length) out.push({ met: false, text: `${def.name} · move up in Build › Facility` });
  return out;
}

/** A research project as a requirement: done, running ("Researching {p} · {n} days left") or "Research {p} · ${c} · {n} days". */
function researchReq(g: GameState, id: string): LadderReq {
  const def = RESEARCH_BY_ID[id];
  const r = g.progress.research;
  if (r.completed.includes(id)) return { met: true, text: `${def.name}: researched` };
  if (r.activeId === id) {
    const left = Math.max(1, Math.ceil((def.hours - r.progressHours) / HOURS_PER_DAY));
    return { met: false, text: `Researching ${def.name} · ${left} ${left === 1 ? 'day' : 'days'} left` };
  }
  const days = Math.max(1, Math.round(def.hours / HOURS_PER_DAY));
  return { met: false, text: `Research ${def.name} · $${def.cost.toLocaleString('en-US')} · ${days} ${days === 1 ? 'day' : 'days'}` };
}

/** Tiers 2 to 5 with their requirements, met or missing (the early ladder, the before-the-Desk card, locked pages). */
export function tierLadder(g: GameState): LadderTier[] {
  const t = opsTier(g);
  return [
    { tier: 2, key: 'water', name: 'Water room', desc: 'Fresh and salt water reserves for every tank', open: t.water, reqs: [...levelReq(g, 'specialty_shop'), researchReq(g, 'central_water_supply')] },
    {
      tier: 3,
      key: 'food',
      name: 'Live food room',
      desc: 'Hatch baby brine shrimp and grow infusoria',
      open: t.food,
      reqs: [researchReq(g, 'central_water_supply'), researchReq(g, 'breeding_program'), researchReq(g, 'live_food_cultures')],
    },
    { tier: 4, key: 'lines', name: 'Breeding facility', desc: 'More production lines that share tanks', open: t.slots >= 2, reqs: levelReq(g, 'specialty_shop') },
    { tier: 5, key: 'tools', name: 'Operations', desc: 'Bottlenecks, schedules, weekly money, manual mode', open: t.desk, reqs: [...levelReq(g, 'aquarium_store'), researchReq(g, 'operations_desk')] },
  ];
}
