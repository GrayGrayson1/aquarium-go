/**
 * chunk 13 — the club cards' answers (`sharedShops()`, `sharedUsage()`): one for every card on screen, asked again after
 * a while or when a visit ends (the shop's day and money moved on), so a card never asks the database for each club.
 * OWNER: lane "social".
 */
import type { SharedShops, SharedUsage } from '@/social';

const FRESH_MS = 20_000;

type Entry<T> = { at: number; p: Promise<T> } | null;
let shops: Entry<SharedShops> = null;
let usage: Entry<SharedUsage> = null;

function cached<T>(get: () => Entry<T>, set: (v: Entry<T>) => void, load: () => Promise<T>): Promise<T> {
  const c = get();
  if (c && Date.now() - c.at < FRESH_MS) return c.p;
  const p = load();
  set({ at: Date.now(), p });
  p.catch(() => set(null));
  return p;
}

export const cachedShops = (load: () => Promise<SharedShops>): Promise<SharedShops> =>
  cached(
    () => shops,
    (v) => (shops = v),
    load,
  );

export const cachedUsage = (load: () => Promise<SharedUsage>): Promise<SharedUsage> =>
  cached(
    () => usage,
    (v) => (usage = v),
    load,
  );

/** The cards' answers are stale (a shop was just made, opened or left). */
export function forgetSharedShops(): void {
  shops = null;
  usage = null;
}
