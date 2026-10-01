/**
 * "New tank" from a shop offer → Build › Tanks → Quick buy → straight back to that offer with the new tank chosen as
 * the destination. Without it the player landed in the new, empty tank and had to find the offer again.
 * Transient UI memory only (never saved). OWNER: lane "qa-play".
 */
import type { WaterClass } from '@/types';

let pending: { offerId: string; waterClass?: WaterClass; at: number } | null = null;

/** How long the detour to Build may take (real ms) before the return is forgotten. */
const TTL_MS = 5 * 60_000;

/**
 * lane:fix-panels — `waterClass` is the water the offer's animal needs, so Build › Tanks opens on it (it used to open
 * on the first tank's water, and the guided shortcut bought a tank the animal couldn't live in).
 */
export function rememberOfferReturn(offerId: string, waterClass?: WaterClass): void {
  pending = { offerId, waterClass, at: Date.now() };
}

/** The pending return without consuming it (Build reads the preferred water type from it). */
export function peekOfferReturn(): { offerId: string; waterClass?: WaterClass } | null {
  return pending && Date.now() - pending.at < TTL_MS ? { offerId: pending.offerId, waterClass: pending.waterClass } : null;
}

/** The offer to go back to (once), or null. */
export function takeOfferReturn(): string | null {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at < TTL_MS ? p.offerId : null;
}

export function clearOfferReturn(): void {
  pending = null;
}
