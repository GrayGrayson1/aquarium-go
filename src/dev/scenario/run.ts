/**
 * Run a built scenario forward without a browser and report what happened (chunk 15): the headless script
 * (scripts/scenario.ts), `__AQ.scenario.run` and the tests. A recipe's `checks` are judged at their hour, so a
 * scenario doubles as a test an agent can run.
 */
import type { Creature, GameState } from '@/types';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { dayOf, formatClock } from '@/sim/time';
import { findSpecies } from '@/data/species';
import type { BuildResult } from './build';
import type { CheckRecipe, Range, ScenarioRecipe } from './recipe';

export interface CheckResult {
  name: string;
  afterHours: number;
  /** Game hours into the run when it was judged (null: it couldn't be, and fails). */
  atHours: number | null;
  pass: boolean;
  /** Each measured value and its range, e.g. "ammonia 0.12 (max 0.5) ok". */
  lines: string[];
}

export interface TankReport {
  name: string;
  status: string;
  reason?: string;
  alive: Record<string, number>;
  clutches: number;
  water: { tempC: number; pH: number; ammonia: number; nitrite: number; nitrate: number; oxygen: number; salinitySG: number };
}

export interface RunReport {
  name: string;
  hours: number;
  start: string;
  end: string;
  money: { start: number; end: number };
  births: number;
  deaths: { name: string; species: string; tank: string; cause: string }[];
  sales: number;
  tanks: TankReport[];
  /** The game's own log lines since the start (the last 40). */
  events: string[];
  checks: CheckResult[];
  /** Every check passed (true when there are none). */
  passed: boolean;
}

const METRICS = ['alive', 'births', 'deaths', 'clutches', 'money', 'sales', 'ammonia', 'nitrite', 'nitrate', 'tempC', 'pH', 'oxygen', 'health', 'hunger', 'stress'] as const;
type Metric = (typeof METRICS)[number];

const living = (c: Creature) => c.status === 'alive' || c.status === 'listed';
const round = (v: number, places = 2) => Math.round(v * 10 ** places) / 10 ** places;
const when = (hour: number) => `day ${dayOf(hour)}, ${formatClock(hour)}`;

function inRange(v: number, r: Range): boolean {
  return (r.min === undefined || v >= r.min - 1e-9) && (r.max === undefined || v <= r.max + 1e-9);
}

function rangeText(r: Range): string {
  if (r.min !== undefined && r.max !== undefined) return r.min === r.max ? `exactly ${r.min}` : `${r.min} to ${r.max}`;
  return r.min !== undefined ? `min ${r.min}` : `max ${r.max}`;
}

interface Baseline {
  startHour: number;
  ids: Set<string>;
  aliveIds: Set<string>;
}

function measure(g: GameState, b: Baseline, built: BuildResult, check: CheckRecipe, metric: Metric): number | string {
  const tankId = check.tank !== undefined ? built.tanks[check.tank] : undefined;
  if (check.tank !== undefined && !tankId) return `there's no tank called "${check.tank}"`;
  const inScope = (c: Creature) => (!tankId || c.tankId === tankId) && (!check.species || c.speciesId === check.species);
  const creatures = Object.values(g.creatures).filter(inScope);
  const alive = creatures.filter(living);
  const tanks = tankId ? [g.tanks[tankId]].filter(Boolean) : g.tankOrder.map((id) => g.tanks[id]).filter(Boolean);
  const avg = (vals: number[]) => (vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : NaN);
  switch (metric) {
    case 'alive':
      return alive.length;
    case 'births':
      return creatures.filter((c) => !b.ids.has(c.id)).length;
    case 'deaths':
      return creatures.filter((c) => c.status === 'dead' && (b.aliveIds.has(c.id) || !b.ids.has(c.id))).length;
    case 'clutches':
      return Object.values(g.clutches).filter((cl) => (!tankId || cl.tankId === tankId) && (!check.species || cl.speciesId === check.species)).length;
    case 'money':
      return g.finance.money;
    case 'sales':
      return g.market.history.filter((h) => h.hour >= b.startHour - 1e-9).length;
    case 'health':
    case 'hunger':
    case 'stress': {
      const v = avg(alive.map((c) => c.stats[metric]));
      return Number.isNaN(v) ? 'no animals to measure' : v;
    }
    default: {
      const v = avg(tanks.map((t) => t.water[metric]));
      return Number.isNaN(v) ? 'no tank to measure' : v;
    }
  }
}

function judge(g: GameState, b: Baseline, built: BuildResult, check: CheckRecipe, i: number, atHours: number): CheckResult {
  const lines: string[] = [];
  let pass = true;
  let any = false;
  for (const m of METRICS) {
    const r = check[m];
    if (!r) continue;
    any = true;
    const v = measure(g, b, built, check, m);
    if (typeof v === 'string') {
      pass = false;
      lines.push(`${m}: ${v}`);
      continue;
    }
    const ok = inRange(v, r);
    if (!ok) pass = false;
    lines.push(`${m} ${round(v, 3)} (${rangeText(r)}) ${ok ? 'ok' : 'FAILED'}`);
  }
  if (!any) {
    pass = false;
    lines.push(`nothing to check (${METRICS.join(', ')})`);
  }
  return { name: check.name ?? `check ${i + 1}`, afterHours: check.afterHours, atHours, pass, lines };
}

/** The longest a run goes (a year). */
export const MAX_RUN_HOURS = 24 * 365;

/**
 * Run `built` (its state is changed in place) forward `hours` game hours in one-hour steps, or longer if a check asks
 * for later, judging each check at its hour.
 */
export function runScenario(built: BuildResult, recipe: ScenarioRecipe, hours: number): RunReport {
  const g = built.state;
  const all = (Array.isArray(recipe.checks) ? recipe.checks : []).map((c, i) => ({ c, i }));
  const judgeable = ({ c }: { c: CheckRecipe }) => !!c && typeof c === 'object' && typeof c.afterHours === 'number' && Number.isFinite(c.afterHours) && c.afterHours >= 0 && c.afterHours <= MAX_RUN_HOURS;
  const checks = all.filter(judgeable);
  const total = Math.min(MAX_RUN_HOURS, Math.max(Number.isFinite(hours) ? Math.max(0, hours) : 0, ...checks.map(({ c }) => c.afterHours)));
  const b: Baseline = {
    startHour: g.clock.hour,
    ids: new Set(Object.keys(g.creatures)),
    aliveIds: new Set(Object.values(g.creatures).filter(living).map((c) => c.id)),
  };
  const startMoney = g.finance.money;
  const logStart = new Set(g.log.map((e) => e.id));
  const results: CheckResult[] = new Array(all.length);
  // a check that can't be judged fails, so a mistyped one never passes quietly
  for (const { c, i } of all)
    if (!judgeable({ c })) results[i] = { name: (c && typeof c === 'object' && typeof c.name === 'string' && c.name) || `check ${i + 1}`, afterHours: NaN, atHours: null, pass: false, lines: [`afterHours must be game hours from 0 to ${MAX_RUN_HOURS}`] };
  const due = [...checks].sort((x, y) => x.c.afterHours - y.c.afterHours);
  const focusTankId = built.focusTankId ?? undefined;
  let elapsed = 0;
  const judgeDue = () => {
    while (due.length && due[0].c.afterHours <= elapsed + 1e-9) {
      flushSimDebt(g);
      const { c, i } = due.shift()!;
      results[i] = judge(g, b, built, c, i, Math.round((g.clock.hour - b.startHour) * 100) / 100); // the hours really played
    }
  };
  judgeDue();
  while (elapsed < total - 1e-9) {
    const step = Math.min(1, total - elapsed);
    advanceWorld(g, step, { focusTankId });
    elapsed += step;
    judgeDue();
  }
  flushSimDebt(g);
  const tankName = (id: string | null) => (id && g.tanks[id]?.name) || 'no tank';
  const deaths = Object.values(g.creatures)
    .filter((c) => c.status === 'dead' && (b.aliveIds.has(c.id) || !b.ids.has(c.id)))
    .map((c) => ({ name: c.name, species: findSpecies(c.speciesId)?.commonName ?? c.speciesId, tank: tankName(c.tankId), cause: c.deathCause ?? 'unknown' }));
  const tanks: TankReport[] = g.tankOrder
    .map((id) => g.tanks[id])
    .filter(Boolean)
    .map((t) => {
      const alive: Record<string, number> = {};
      for (const c of Object.values(g.creatures)) if (c.tankId === t.id && living(c)) alive[c.speciesId] = (alive[c.speciesId] ?? 0) + 1;
      const w = t.water;
      return {
        name: t.name,
        status: t.cache.status,
        ...(t.cache.statusReason ? { reason: t.cache.statusReason } : {}),
        alive,
        clutches: Object.values(g.clutches).filter((cl) => cl.tankId === t.id).length,
        water: { tempC: round(w.tempC, 1), pH: round(w.pH), ammonia: round(w.ammonia, 3), nitrite: round(w.nitrite, 3), nitrate: round(w.nitrate, 1), oxygen: round(w.oxygen), salinitySG: round(w.salinitySG, 3) },
      };
    });
  const list = results.filter(Boolean);
  return {
    name: recipe.name,
    hours: round(elapsed, 2),
    start: when(b.startHour),
    end: when(g.clock.hour),
    money: { start: round(startMoney), end: round(g.finance.money) },
    births: Object.keys(g.creatures).filter((id) => !b.ids.has(id)).length,
    deaths,
    sales: g.market.history.filter((h) => h.hour >= b.startHour - 1e-9).length,
    tanks,
    events: g.log.filter((e) => !logStart.has(e.id)).slice(-40).map((e) => `${when(e.hour)}  ${e.text}`),
    checks: list,
    passed: list.every((c) => c.pass),
  };
}

/** The report as plain text (the headless script prints this). */
export function formatReport(r: RunReport): string {
  const out: string[] = [];
  out.push(`Scenario: ${r.name}`);
  out.push(`Ran ${r.hours} game hours: ${r.start} → ${r.end}`);
  out.push(`Money: $${r.money.start} → $${r.money.end} (${r.money.end >= r.money.start ? '+' : ''}${round(r.money.end - r.money.start)})`);
  out.push(`Births: ${r.births}   Deaths: ${r.deaths.length}   Sales: ${r.sales}`);
  for (const d of r.deaths) out.push(`  died: ${d.name} (${d.species}, ${d.tank}): ${d.cause}`);
  out.push('Tanks:');
  for (const t of r.tanks) {
    const alive = Object.entries(t.alive).map(([sp, n]) => `${n} ${findSpecies(sp)?.commonName ?? sp}`).join(', ') || 'empty';
    out.push(`  ${t.name} [${t.status}${t.reason ? `: ${t.reason}` : ''}]`);
    out.push(`    ${alive}${t.clutches ? `; ${t.clutches} clutch${t.clutches === 1 ? '' : 'es'}` : ''}`);
    const w = t.water;
    out.push(`    ${w.tempC} °C, pH ${w.pH}, ammonia ${w.ammonia}, nitrite ${w.nitrite}, nitrate ${w.nitrate}, O₂ ${w.oxygen}, SG ${w.salinitySG}`);
  }
  if (r.events.length) {
    out.push('What happened (the last 40 lines):');
    for (const e of r.events) out.push(`  ${e}`);
  }
  if (r.checks.length) {
    out.push('Checks:');
    for (const c of r.checks) {
      out.push(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name} (${c.atHours === null ? 'not judged' : `after ${c.afterHours} h`})`);
      for (const l of c.lines) out.push(`        ${l}`);
    }
    out.push(r.passed ? 'All checks passed.' : 'Some checks failed.');
  }
  return out.join('\n');
}
