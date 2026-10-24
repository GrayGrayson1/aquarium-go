/**
 * The recipe's escape hatch (chunk 15, ADR-0051 decision 2): a deep merge of plain JSON into a built object, for what
 * the recipe has no field for. Objects merge key by key, everything else (arrays included) replaces; `null` deletes the
 * key. Keys that would reach a prototype (`__proto__`, `constructor`, `prototype`) are refused and reported, so a pasted
 * recipe can't pollute `Object.prototype`. The save path then checks the result (build.ts).
 */

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

/**
 * A JSON copy of `v` (functions and undefined dropped, refused keys left out at any depth), so a merged value never
 * shares objects with the recipe.
 */
function copyJson(v: unknown, path: string, problems: string[]): unknown {
  if (Array.isArray(v)) return v.map((x, i) => copyJson(x, `${path}[${i}]`, problems));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (FORBIDDEN.has(k)) problems.push(`${path}.${k}: that key isn't allowed.`);
      else if (x !== undefined && typeof x !== 'function') out[k] = copyJson(x, `${path}.${k}`, problems);
    }
    return out;
  }
  return typeof v === 'number' && !Number.isFinite(v) ? 0 : v;
}

/**
 * Merge `patch` into `target` in place. Returns the problems (refused keys, a patch that isn't an object), each with
 * its path under `at`.
 */
export function deepMerge(target: Record<string, unknown>, patch: unknown, at = 'patch'): string[] {
  const problems: string[] = [];
  if (!isPlainObject(patch)) return [`${at} must be an object of fields to change.`];
  for (const [k, v] of Object.entries(patch)) {
    const path = `${at}.${k}`;
    if (FORBIDDEN.has(k)) {
      problems.push(`${path}: that key isn't allowed.`);
      continue;
    }
    if (v === null) {
      delete target[k];
    } else if (isPlainObject(v) && isPlainObject(target[k])) {
      problems.push(...deepMerge(target[k] as Record<string, unknown>, v, path));
    } else if (isPlainObject(v)) {
      const fresh: Record<string, unknown> = {};
      problems.push(...deepMerge(fresh, v, path));
      target[k] = fresh;
    } else {
      target[k] = copyJson(v, path, problems);
    }
  }
  return problems;
}
