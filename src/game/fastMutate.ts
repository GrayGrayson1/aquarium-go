/**
 * Fast path for heavy simulation mutations. OWNER: lane "core".
 *
 * Why: the sim reads the whole world many times per step (every creature per tank, reports, scores). Through Immer
 * draft proxies those reads are 15–60× slower than on plain objects (measured: big_facility tick 74 ms via `mutate`
 * vs ~5 ms raw). So the game loop runs the sim on a plain, persistent WORKING COPY and publishes the result with
 * structural sharing — every unchanged subtree keeps its previous object identity (exactly what Immer would give
 * React/zustand selectors), changed paths get fresh objects, and the published state never aliases the working copy.
 *
 * The working copy is re-cloned from the store whenever someone else changed the game (a UI `mutate`, a load), so
 * external edits are never lost. One `setGame` per call (one store update per tick).
 */
import type { GameState } from '@/types';
import { useGame } from '@/state/game';

let work: GameState | null = null;
let published: GameState | null = null;
/** A recipe is running (mutateFast is not re-entrant, see below). */
let running = false;

type Obj = Record<string, unknown>;

/**
 * lane:perf2 — deep copy of plain game data. The state is plain JSON-like data (objects, arrays, primitives), for which
 * a direct recursive copy is ~4× faster than structuredClone (big_facility: 0.9 ms vs 3.3 ms per full re-clone, which
 * happens on the first tick after every UI `mutate`). Anything that isn't a plain object/array (a Map, a typed array…)
 * still goes through structuredClone, so nothing is ever aliased.
 */
function deepClone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    const n = v.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = v[i];
      out[i] = x === null || typeof x !== 'object' ? x : deepClone(x);
    }
    return out as T;
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) {
    return typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
  }
  const out: Obj = {};
  for (const k in v as Obj) {
    const x = (v as Obj)[k];
    out[k] = x === null || typeof x !== 'object' ? x : deepClone(x);
  }
  return out as T;
}

/**
 * Structural sharing: returns `prev` when `next` is deep-equal to it, otherwise a new value built from `next` that
 * reuses every unchanged sub-object of `prev`. Never returns an object that belongs to `next` (no aliasing).
 * Allocation-free for unchanged subtrees.
 */
export function share(prev: unknown, next: unknown): unknown {
  if (next === null || typeof next !== 'object') return next;
  if (prev === next) return deepClone(next); // same object on both sides would alias — copy defensively
  if (prev === null || typeof prev !== 'object' || Array.isArray(prev) !== Array.isArray(next)) return deepClone(next);
  if (Array.isArray(next)) {
    const p = prev as unknown[];
    const len = next.length;
    let out: unknown[] | null = p.length !== len ? p.slice(0, Math.min(p.length, len)) : null;
    for (let i = 0; i < len; i++) {
      const pv = i < p.length ? p[i] : undefined;
      const nv = next[i];
      const v = nv === null || typeof nv !== 'object' ? nv : share(pv, nv); // lane:perf2 — leaves inline (no call)
      if (out) out[i] = v;
      else if (v !== pv) {
        out = p.slice(0, i);
        out[i] = v;
      }
    }
    return out ?? prev;
  }
  const p = prev as Obj;
  const n = next as Obj;
  let out: Obj | null = null;
  let nKeys = 0;
  for (const k in n) {
    nKeys++;
    const pv = p[k];
    const nv = n[k];
    const v = nv === null || typeof nv !== 'object' ? nv : share(pv, nv); // lane:perf2 — leaves inline (no call)
    if (out) out[k] = v;
    else if (v !== pv || (pv === undefined && !(k in p))) { // (a missing key only matters when the value is undefined)
      out = {};
      for (const k2 in n) {
        if (k2 === k) break;
        out[k2] = p[k2];
      }
      out[k] = v;
    }
  }
  if (!out) {
    let pKeys = 0;
    for (const _k in p) pKeys++;
    if (pKeys !== nKeys) {
      out = {};
      for (const k in n) out[k] = p[k];
    }
  }
  return out ?? prev;
}

/**
 * Apply a (heavy) mutation to the running game without Immer. `recipe` receives a plain mutable GameState.
 * Returns what the recipe returned (plain values only — do not return objects from the state).
 *
 * Atomic, like `useGame.mutate` (Immer's `produce` discards a draft whose recipe throws): when the recipe throws,
 * nothing is published, the half-changed working copy is dropped (the next call re-clones from the store), and the
 * error is rethrown for the caller to report. A world step that fails part-way must never become the game state,
 * be built on by the next tick, or be autosaved (S0 review, PERSIST-009 / docs/agent/OPERATIONS.md §11). When the
 * publish itself throws (share() failing, or a store subscriber), the copy is dropped too, so the next call starts
 * from the store whether or not the store took the update.
 *
 * Not re-entrant: a call made from inside a running recipe throws before it touches anything. It would otherwise
 * work on, and when failing drop, the outer call's working copy, so the outer call could publish half of a failed
 * recipe, or `null` (code-architecture-game-2 m4). Do nested work inside the running recipe instead.
 */
export function mutateFast<R>(recipe: (state: GameState) => R): R | undefined {
  if (running) throw new Error('mutateFast is not re-entrant: do this work inside the running recipe');
  const current = useGame.getState().game;
  if (!current) return undefined;
  if (!work || published !== current) {
    work = deepClone(current);
    published = current;
  }
  const copy = work;
  let result: R;
  running = true;
  try {
    result = recipe(copy);
  } catch (e) {
    resetFastMutate();
    throw e;
  } finally {
    running = false;
  }
  try {
    publish(current, copy);
  } catch (e) {
    // share() or a store subscriber threw. Whether or not the store took the update, nothing may build on this copy
    // again: the next call re-clones from the store (security-data-2 m2).
    resetFastMutate();
    throw e;
  }
  return result;
}

function publish(current: GameState, copy: GameState): void {
  const next = share(current, copy) as GameState;
  if (next !== current) {
    // Anyone may have replaced the game while the recipe ran (it is synchronous, but be safe).
    if (useGame.getState().game !== current) {
      work = null;
      published = null;
      return;
    }
    useGame.getState().setGame(next);
    // lane:fix-core (S06-05) — a store subscriber may mutate synchronously inside setGame (an achievement pop, an
    // auto-pause). Then the store no longer holds `next`; remembering the subscriber's state as "published" would
    // make the next call reuse the stale working copy and silently revert that write. Drop the copy instead.
    if (useGame.getState().game !== next) {
      work = null;
      published = null;
      return;
    }
  }
  published = useGame.getState().game;
}

/** Drop the working copy (tests / when loading a different game). */
export function resetFastMutate(): void {
  work = null;
  published = null;
}

// Release the working copy as soon as the game is cleared (back to title) so an old world isn't kept alive.
useGame.subscribe((s) => {
  if (!s.game && work) resetFastMutate();
});
