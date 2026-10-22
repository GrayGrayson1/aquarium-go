/**
 * Copying a world. Moved here from src/game/fastMutate.ts in chunk 10, so shared shops' step block (./sharedStep.ts)
 * can run a step on a copy and drop it whole if the step throws (SHARED-SHOPS.md §3.2 rule 2).
 */

type Obj = Record<string, unknown>;

/**
 * lane:perf2 — deep copy of plain game data. The state is plain JSON-like data (objects, arrays, primitives), for which
 * a direct recursive copy is ~4× faster than structuredClone (big_facility: 0.9 ms vs 3.3 ms per full re-clone, which
 * happens on the first tick after every UI `mutate`). Anything that isn't a plain object/array (a Map, a typed array…)
 * still goes through structuredClone, so nothing is ever aliased.
 */
export function deepClone<T>(v: T): T {
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
    // only own keys (B-122): an inherited enumerable name can never reach a prototype through the working copy
    if (!Object.hasOwn(v as Obj, k)) continue;
    const x = (v as Obj)[k];
    out[k] = x === null || typeof x !== 'object' ? x : deepClone(x);
  }
  return out as T;
}

/**
 * Chunk 11 (SHARED-SHOPS.md §3.2 rule 10): delete the object's own keys that hold `undefined`, so a value built from
 * optional parts holds only what it has. A snapshot (JSON) drops such keys and a joiner would add them back in another
 * order. Shallow; returns the same object.
 */
export function compact<T extends object>(o: T): T {
  for (const k of Object.keys(o)) if ((o as Obj)[k] === undefined) delete (o as Obj)[k];
  return o;
}
