/**
 * chunk 8 (ADR-0038; docs/agent/design/ONLINE-STAGE1.md §5.3; REL-025) — which Social service runs, and whether Social
 * shows at all. OWNER: lane "social".
 *
 * - Where the developer tools are allowed (dev builds, and `?dev=1` in the e2e builds): the local stub, unless the
 *   build was made with VITE_SOCIAL_ONLINE_IN_DEV=1 and a project is configured (a hands-on check of the real project).
 * - Otherwise a build made with VITE_SOCIAL_STUB=1 (Playwright's builds only; deploy.yml and render.yaml never set it):
 *   the stub, so no e2e test ever reaches the live project.
 * - Otherwise the players' build: the Supabase service when src/social/project.ts names a project, else no Social (as
 *   before chunk 8).
 *
 * `socialAvailable()` replaces the dev-mode checks that kept Social out of the players' build (SOC-011, superseded on
 * purpose by REL-025): the panel host, the dock, the More sheet, `parseNav` and the router. The club-show reminder and
 * the stub's dev hint stay stub-only.
 */
import { useDevTools, devToolsAllowed } from '@/state/devTools';
import { ONLINE_PROJECT, createSupabaseSocialService, currentStanding, provideSocialService, type OnlineProject } from '@/social';

export type SocialMode = 'stub' | 'online' | 'off';

/** The build flags this reads (import.meta.env in the game; any object in tests). */
export interface SocialEnv {
  VITE_SOCIAL_STUB?: string;
  VITE_SOCIAL_ONLINE_IN_DEV?: string;
}

/** Which service, from the dev-tools gate, the build's flags and the configured project. Pure. */
export function socialModeFor(devAllowed: boolean, env: SocialEnv, project: OnlineProject | null): SocialMode {
  if (devAllowed) return env.VITE_SOCIAL_ONLINE_IN_DEV === '1' && project ? 'online' : 'stub';
  if (env.VITE_SOCIAL_STUB === '1') return 'stub';
  return project ? 'online' : 'off';
}

const ENV: SocialEnv = { VITE_SOCIAL_STUB: import.meta.env.VITE_SOCIAL_STUB, VITE_SOCIAL_ONLINE_IN_DEV: import.meta.env.VITE_SOCIAL_ONLINE_IN_DEV };

/** This session's mode. */
export const socialMode = (): SocialMode => socialModeFor(devToolsAllowed(), ENV, ONLINE_PROJECT);

/** Does Social exist in this session (its panel, dock item, More tile, routes and Settings › Account)? */
export const socialAvailable = (): boolean => socialMode() !== 'off';

/** React: `socialAvailable()` as a hook. */
export function useSocialAvailable(): boolean {
  const allowed = useDevTools((s) => s.allowed);
  return socialModeFor(allowed, ENV, ONLINE_PROJECT) !== 'off';
}

/** React: is this session on the local stub (the dev hint, the club-show reminder)? */
export function useSocialStub(): boolean {
  const allowed = useDevTools((s) => s.allowed);
  return socialModeFor(allowed, ENV, ONLINE_PROJECT) === 'stub';
}

let started = false;

/** At boot (main.tsx): in mode 'online', the Supabase service replaces the default stub. Once. */
export function startSocialService(): void {
  if (started) return;
  started = true;
  if (socialMode() === 'online' && ONLINE_PROJECT) provideSocialService(createSupabaseSocialService(ONLINE_PROJECT, { standing: currentStanding }));
}
