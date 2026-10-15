/**
 * The one place the game gets its Social service (0.5 spec §13.6; SOC-009 A2). OWNER: lane "social".
 *
 * The UI calls `socialService()` and nothing else; by default that is the local stub. Tests (and, later, a real
 * backend) swap it with `provideSocialService`, without UI changes. `setStandingSource` tells the default stub where the
 * player's own leaderboard numbers come from (the UI points it at the game on screen).
 */
import { createLocalSocialStub, type LocalSocialStub } from './localStub';
import type { SocialService } from './service';
import type { PlayerStanding } from './standing';

export * from './service';
export { playerStanding, type PlayerStanding } from './standing';
export { createLocalSocialStub, SOCIAL_STORAGE_KEY, friendCodeFor, readStored, type LocalSocialStub, type StoredSocial } from './localStub';
export { VALID_INVITE, HIGHLAND_ID, CLUB_SHOW_ENTRIES } from './data';

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

/** Where the default stub reads the player's own numbers. */
export function setStandingSource(fn: () => PlayerStanding | null): void {
  standing = fn;
}

/** The local stub's dev hooks, when the service in use is the local stub (dev tools and e2e). */
export function localStub(): LocalSocialStub | null {
  const s = socialService() as Partial<LocalSocialStub>;
  return typeof s.setOffline === 'function' && typeof s.pushTrade === 'function' ? (s as LocalSocialStub) : null;
}
