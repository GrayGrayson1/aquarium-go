/**
 * Per-step tank → residents index. OWNER: lane perf2.
 *
 * Why: the sim asks "who lives in tank X?" many times per step (water report, compat, welfare, breeding, food outlook,
 * exhibit and visitor scoring), and every ask used to scan every creature in the world. On the big facility that was
 * ~25 whole-world scans per 1× tick (a third of the tick). Inside a sim step we now build one tank → residents map
 * lazily and answer each ask in O(residents of that tank).
 *
 * It can never return stale data:
 * - The index only exists inside `withResidentIndex(state, fn)` (the world stepper wraps each step, each tank step and
 *   each cache refresh). Outside a scope (UI, actions, tests calling helpers directly) every lookup scans exactly like
 *   before, so code that mutates freely between steps is never affected.
 * - LEAVING needs no bookkeeping: each lookup re-checks the cached members (same object still under its key in
 *   `state.creatures`, still in this tank, still alive/listed), so deaths, sales, move-outs and removals drop out.
 * - JOINING (a new creature, a move-in, a revival) calls `touchResidents()`, which drops the index; the next lookup
 *   rebuilds it. addCreature, moveCreature, the breeding move, the sale relocation and the offline revival do this. A
 *   touch bumps a global epoch, so even an outer scope's saved index is retired.
 * - Replacing `state.creatures` wholesale is detected by identity.
 * - `AQ_VERIFY_RESIDENTS=1` (env, or `setResidentIndexMode('verify')`) cross-checks every indexed lookup against a
 *   fresh scan and throws on any difference, so a join path that forgot to touch fails loudly
 *   (tests/sim/perf2-residents.test.ts runs long staffed/breeding/market worlds in that mode).
 * Order: members keep `Object.values(state.creatures)` order, exactly like the scans they replace, so float sums and
 * RNG draws over them stay bit-identical (sim results are unchanged; the determinism tests pin that).
 */
import type { Creature, GameState } from '@/types';

type Mode = 'on' | 'off' | 'verify';

interface Entry {
  /** Key under which the creature was stored in `state.creatures` when the index was built. */
  k: string;
  c: Creature;
}

interface Index {
  creatures: Record<string, Creature>;
  /** `epoch` when built: any touch since then (even one made inside a nested scope for another state) retires it. */
  epoch: number;
  byTank: Map<string, Entry[]>;
  /** Every alive/listed creature (any tank, or none), in `Object.values` order. */
  all: Entry[];
}

const isResident = (c: Creature | undefined | null): c is Creature => !!c && (c.status === 'alive' || c.status === 'listed');

function envMode(): Mode {
  try {
    const env = typeof process !== 'undefined' ? process.env : undefined;
    const v = env?.AQ_VERIFY_RESIDENTS;
    if (v === '1' || v === 'verify') return 'verify';
    if (env?.AQ_RESIDENT_INDEX === 'off') return 'off';
  } catch {
    /* no process in the browser */
  }
  return 'on';
}

let mode: Mode = envMode();
let scopeState: GameState | null = null;
let index: Index | null = null;
let epoch = 0;
/** Diagnostics (tests / dev): builds and indexed lookups since load. */
export const residentIndexStats = { builds: 0, lookups: 0, touches: 0, verified: 0 };

/** 'on' (default), 'off' (always scan — for A/B tests) or 'verify' (index + cross-check every lookup). */
export function setResidentIndexMode(m: Mode): void {
  mode = m;
  index = null;
}
export function residentIndexMode(): Mode {
  return mode;
}

/**
 * Run `fn` with the residents index enabled for `state`. Nested scopes for the same state share one index; a nested
 * scope for another state gets its own and restores the outer one afterwards.
 */
export function withResidentIndex<R>(state: GameState, fn: () => R): R {
  if (scopeState === state) return fn();
  // (In 'off' mode the scope is still marked — callers use inResidentScope() as a re-entry guard — but lookups scan.)
  const outerState = scopeState;
  const outerIndex = index;
  scopeState = state;
  index = null;
  try {
    return fn();
  } finally {
    scopeState = outerState;
    index = outerIndex;
  }
}

/** True while `state` has an active residents scope. */
export function inResidentScope(state: GameState): boolean {
  return scopeState === state;
}

/** Call after anything that can ADD a resident to a tank (new creature, move-in, revival). Cheap; always safe. */
export function touchResidents(): void {
  residentIndexStats.touches++;
  epoch++;
  index = null;
}

function build(creatures: Record<string, Creature>): Index {
  residentIndexStats.builds++;
  const byTank = new Map<string, Entry[]>();
  const all: Entry[] = [];
  for (const k of Object.keys(creatures)) {
    const c = creatures[k];
    if (!isResident(c)) continue;
    const e: Entry = { k, c };
    all.push(e);
    const t = c.tankId;
    if (typeof t !== 'string') continue;
    let l = byTank.get(t);
    if (!l) byTank.set(t, (l = []));
    l.push(e);
  }
  return { creatures, epoch, byTank, all };
}

function current(state: GameState): Index | null {
  if (scopeState !== state || mode === 'off') return null;
  const creatures = state.creatures;
  if (!creatures) return null;
  if (!index || index.creatures !== creatures || index.epoch !== epoch) index = build(creatures);
  return index;
}

/** The plain scan every lookup used before the index (and still uses outside a scope). */
function scanTank(state: GameState, tankId: string): Creature[] {
  const out: Creature[] = [];
  for (const c of Object.values(state.creatures ?? {})) if (c.tankId === tankId && isResident(c)) out.push(c);
  return out;
}

function scanAll(state: GameState): Creature[] {
  const out: Creature[] = [];
  for (const c of Object.values(state.creatures ?? {})) if (isResident(c)) out.push(c);
  return out;
}

function verify(what: string, got: Creature[], want: Creature[]): void {
  residentIndexStats.verified++;
  let same = got.length === want.length;
  for (let i = 0; same && i < got.length; i++) same = got[i] === want[i];
  if (!same) {
    const ids = (l: Creature[]) => l.map((c) => c.id).join(',');
    throw new Error(`[residents] stale index for ${what}: index [${ids(got)}] vs scan [${ids(want)}] — a join path is missing touchResidents()`);
  }
}

/**
 * Alive + listed creatures in `tankId`, in `Object.values(state.creatures)` order. Always a fresh array (callers may
 * sort or mutate it).
 */
export function residentsOf(state: GameState, tankId: string): Creature[] {
  const idx = typeof tankId === 'string' ? current(state) : null;
  if (!idx) return scanTank(state, tankId);
  residentIndexStats.lookups++;
  const out: Creature[] = [];
  const list = idx.byTank.get(tankId);
  if (list) {
    const creatures = idx.creatures;
    for (const e of list) {
      const c = e.c;
      if (c.tankId === tankId && (c.status === 'alive' || c.status === 'listed') && creatures[e.k] === c) out.push(c);
    }
  }
  if (mode === 'verify') verify(`tank ${tankId}`, out, scanTank(state, tankId));
  return out;
}

/** Every alive + listed creature (in a tank or not), in `Object.values(state.creatures)` order. Fresh array. */
export function allResidents(state: GameState): Creature[] {
  const idx = current(state);
  if (!idx) return scanAll(state);
  residentIndexStats.lookups++;
  const out: Creature[] = [];
  const creatures = idx.creatures;
  for (const e of idx.all) {
    const c = e.c;
    if ((c.status === 'alive' || c.status === 'listed') && creatures[e.k] === c) out.push(c);
  }
  if (mode === 'verify') verify('all', out, scanAll(state));
  return out;
}
