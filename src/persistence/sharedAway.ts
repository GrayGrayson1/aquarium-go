/**
 * chunk 13 (SHARED-SHOPS.md §7.2, ADR-0045 decision 6; SHARE-010) — your own aquarium waits while you're in a club's
 * shared shop. Opening one saves your game first and records here, on the device, which save it was and when you went
 * in; while the shop is open a heartbeat keeps the time. When that save is next resumed (leaving the shop, or a later
 * load after the browser closed inside it), the time spent in the shop is left out of its catch-up: its clock moves on
 * by that much. Time after the last heartbeat (the browser closed) is ordinary time away. Best effort, like the
 * synchronous autosave: storage that refuses only means the shop's time counts as away. OWNER: core.
 */
import type { GameState } from '@/types';
import { inSharedShop } from '@/state/sharedMode';
import { syncStore } from './storage';

export const SHARED_AWAY_KEY = 'aquarium-go.shared-away.v1';

/** A shared shop's own id (the server gives it, `shared_<club>`): never a local slot's. */
export const SHARED_SAVE_PREFIX = 'shared_';

/**
 * SHARE-011 — nothing saves a shared shop on the device or online: true while one is open, and for any world that is
 * one (its id), so a save that lands while the player leaves can't write the shop over their own aquarium.
 */
export function isSharedShop(g: Pick<GameState, 'saveId'> | null | undefined): boolean {
  return inSharedShop() || (typeof g?.saveId === 'string' && g.saveId.startsWith(SHARED_SAVE_PREFIX));
}

/** The words for a save, load, import or export tried in a shared shop (SHARED-SHOPS.md §8, ADR-0048). */
export const SHARED_SAVE_REFUSED = 'The shared shop saves itself on the server.';

export interface SharedAway {
  /** The club whose shop was opened. */
  club: string;
  /** The waiting save's identity (none when the shop was opened from the title screen). */
  saveId: string | null;
  /** Where the player came from, so leaving goes back there. */
  from: 'game' | 'title';
  /** Real ms: when the shop was opened, and the last moment it was known to be open. */
  enteredAt: number;
  heartbeat: number;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function readSharedAway(): SharedAway | null {
  const raw = syncStore.get(SHARED_AWAY_KEY);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<SharedAway> | null;
    if (!r || typeof r.club !== 'string' || !finite(r.enteredAt) || !finite(r.heartbeat)) return null;
    return { club: r.club, saveId: typeof r.saveId === 'string' ? r.saveId : null, from: r.from === 'title' ? 'title' : 'game', enteredAt: r.enteredAt, heartbeat: Math.max(r.enteredAt, r.heartbeat) };
  } catch {
    return null;
  }
}

/** Opening a shared shop: the waiting save (already saved) and the moment. */
export function markSharedAway(club: string, saveId: string | null, from: 'game' | 'title', now = Date.now()): void {
  syncStore.set(SHARED_AWAY_KEY, JSON.stringify({ club, saveId, from, enteredAt: now, heartbeat: now } satisfies SharedAway));
}

/** The shop is still open (every few seconds, and once more on leaving). */
export function sharedAwayHeartbeat(now = Date.now()): void {
  const r = readSharedAway();
  if (r) syncStore.set(SHARED_AWAY_KEY, JSON.stringify({ ...r, heartbeat: Math.max(r.heartbeat, now) }));
}

export function clearSharedAway(): void {
  syncStore.del(SHARED_AWAY_KEY);
}

/**
 * The real time `saveId` waited while its player was in a shared shop, and forget it: resuming that save moves its
 * clock on by this much. Zero for any other save (the record stays for its own).
 */
export function takeSharedAwayMs(saveId: string): number {
  const r = readSharedAway();
  if (!r || !r.saveId || r.saveId !== saveId) return 0;
  clearSharedAway();
  return Math.max(0, r.heartbeat - r.enteredAt);
}
