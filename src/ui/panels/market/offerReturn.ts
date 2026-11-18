/**
 * "New tank" from a shop offer → Build › Tanks → Quick buy → straight back to that offer with the new tank chosen as
 * the destination. Without it the player landed in the new, empty tank and had to find the offer again.
 * Transient UI memory only (never saved). OWNER: lane "qa-play".
 */
import type { WaterClass } from '@/types';
import { edit } from '../common/act';

let pending: { offerId: string; waterClass?: WaterClass; at: number } | null = null;

/**
 * Audit 2026-11-17 (F6, the owner's choice) — the offer stays in the shop while the player is away choosing or buying
 * a tank for it: its hold (holdOffer, the sim) is renewed every 15 s while the return is pending, and released when
 * the detour is dropped (leaving Build, or the return running out). Coming back to the offer, its own view holds it.
 */
const HOLD_EVERY_MS = 15_000;
let renew: number | null = null;
function stopRenew(): void {
  if (renew != null) window.clearInterval(renew);
  renew = null;
}
const release = (offerId: string) => edit({ k: 'holdOffer', offer: offerId, release: true });

/** How long the detour to Build may take (real ms) before the return is forgotten. */
const TTL_MS = 5 * 60_000;

/**
 * lane:fix-panels — `waterClass` is the water the offer's animal needs, so Build › Tanks opens on it (it used to open
 * on the first tank's water, and the guided shortcut bought a tank the animal couldn't live in).
 */
export function rememberOfferReturn(offerId: string, waterClass?: WaterClass): void {
  pending = { offerId, waterClass, at: Date.now() };
  stopRenew();
  if (typeof window === 'undefined') return;
  renew = window.setInterval(() => {
    if (peekOfferReturn()) return edit({ k: 'holdOffer', offer: offerId });
    stopRenew();
    if (pending?.offerId === offerId) pending = null;
    release(offerId);
  }, HOLD_EVERY_MS);
}

/** The pending return without consuming it (Build reads the preferred water type from it). */
export function peekOfferReturn(): { offerId: string; waterClass?: WaterClass } | null {
  return pending && Date.now() - pending.at < TTL_MS ? { offerId: pending.offerId, waterClass: pending.waterClass } : null;
}

/** The offer to go back to (once), or null. */
export function takeOfferReturn(): string | null {
  const p = pending;
  pending = null;
  stopRenew(); // the offer's own view holds it from here
  return p && Date.now() - p.at < TTL_MS ? p.offerId : null;
}

export function clearOfferReturn(): void {
  const p = pending;
  pending = null;
  stopRenew();
  if (p) release(p.offerId); // F6: the detour was dropped, so the offer is no longer being looked at
}
