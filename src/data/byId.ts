/**
 * lane:core (S0 review SD-2, PERSIST-004) — an id → definition table with no prototype. A save can carry any string
 * as a catalog id; with a plain object, "constructor", "toString" or "__proto__" would find an inherited Object
 * property instead of nothing, and every tick would then crash on it.
 */
export function byId<T extends { id: string }>(items: readonly T[]): Record<string, T> {
  const table = Object.create(null) as Record<string, T>;
  for (const item of items) table[item.id] = item;
  return table;
}

/**
 * chunk 6 (B-010, PERSIST-004) — the same safety for a table keyed by something other than `id` (a water class, a buyer
 * archetype, an unlock key): a copy with no prototype, so a save's "toString" finds nothing rather than a function.
 */
export function noProto<T extends object>(table: T): T {
  return Object.assign(Object.create(null) as T, table);
}
