/**
 * "New tank" from a shop offer → Build › Tanks → Quick buy → straight back to that offer with the new tank chosen as
 * the destination. Without it the player landed in the new, empty tank and had to find the offer again.
 * Transient UI memory only (never saved). OWNER: lane "qa-play".
 */
let pending: { offerId: string; at: number } | null = null;

/** How long the detour to Build may take (real ms) before the return is forgotten. */
const TTL_MS = 5 * 60_000;

export function rememberOfferReturn(offerId: string): void {
  pending = { offerId, at: Date.now() };
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
