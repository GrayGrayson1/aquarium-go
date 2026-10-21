/**
 * The one place the game gets its Social service (0.5 spec §13.6; SOC-009 A2). OWNER: lane "social".
 *
 * The UI calls `socialService()` and nothing else; by default that is the local stub. Tests and, from chunk 8, the
 * Supabase service (src/ui/online/mode.ts provides it at boot in the players' build) swap it with
 * `provideSocialService`, without UI changes. `setStandingSource` tells the services where the player's own
 * leaderboard numbers come from (the UI points it at the game on screen).
 */
import { createLocalSocialStub, type LocalSocialStub } from './localStub';
import type { SocialService } from './service';
import type { PlayerStanding } from './standing';

export * from './service';
export { playerStanding, type PlayerStanding } from './standing';
export { createLocalSocialStub, STUB_SHOP_SERVER, stubTokenFor, stubPlayerId, SOCIAL_STORAGE_KEY, SOCIAL_CLOUD_KEY, friendCodeFor, initialsOf, inviteWordOf, CLUB_COLORS, readStored, type LocalSocialStub, type StoredSocial, type StoredCloud } from './localStub';
export { VALID_INVITE, HIGHLAND_ID, CLUB_SHOW_ENTRIES } from './data';
export { encodeSaveBody, decodeSaveBody, canCompress, MAX_CLOUD_BODY } from './codec';
export { ONLINE_PROJECT, SHARED_SHOP_SERVER, type OnlineProject } from './project';
export { createSupabaseSocialService, AUTH_STORAGE_KEY, type SupabaseLike, type SupabaseServiceOptions } from './supabase/service';

let current: SocialService | null = null;
let standing: () => PlayerStanding | null = () => null;

/** The Social service in use (the local stub unless one was provided). */
export function socialService(): SocialService {
  current ??= createLocalSocialStub({ standing: () => standing() });
  return current;
}

/** Swap the service (null: back to a fresh local stub on next use). */
export function provideSocialService(s: SocialService | null): void {
  current = s;
}

/** Where the services read the player's own numbers. */
export function setStandingSource(fn: () => PlayerStanding | null): void {
  standing = fn;
}

/** chunk 8 — the player's own numbers now (null: no game, or a showcase). */
export const currentStanding = (): PlayerStanding | null => standing();

/** The local stub's dev hooks, when the service in use is the local stub (dev tools and e2e). */
export function localStub(): LocalSocialStub | null {
  const s = socialService() as Partial<LocalSocialStub>;
  return typeof s.setOffline === 'function' && typeof s.pushTrade === 'function' ? (s as LocalSocialStub) : null;
}
