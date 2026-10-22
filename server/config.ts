/**
 * The shared-shop server's settings (SHARED-SHOPS.md §5.8). The public ones live in code, because the Render CLI can't
 * set a service's environment: the Supabase project's address and publishable key (src/social/project.ts) and, on
 * Render, the game's two sites as the allowed origins. The one secret is the server's password, `SHOPS_SERVER_KEY`
 * (ADR-0047), which the owner pastes into Render's dashboard; it is read here once, passed only to the store
 * (./store.ts), and never logged, sent to a room's worker or written anywhere.
 *
 * Environment: PORT; SHOPS_SERVER_KEY; SHOPS_STUB=1 (in-memory accounts and storage, ./stub.ts: tests, e2e and dev,
 * never with a key); SHOPS_REPLAY=1 (the cross-engine replay's endpoint, stub only); ALLOWED_ORIGINS (comma-separated,
 * `http://127.0.0.1:*` for any local port; off Render only); SHOPS_DIR (the stub shops' folder).
 */
import { ONLINE_PROJECT } from '@/social/project';
import { SHARED_BUILD } from '@/types/shared';

/** The game's sites (§5.3): GitHub Pages and the Render static site. */
export const GAME_ORIGINS = ['https://graygrayson1.github.io', 'https://aquarium-go.onrender.com'] as const;

export interface ServerConfig {
  port: number;
  origins: string[];
  /** In-memory accounts and storage instead of Supabase. */
  stub: boolean;
  replay: boolean;
  /** The Supabase project (public). */
  project: { url: string; publishableKey: string } | null;
  /** The server's password (ADR-0047), or null in the stub. */
  key: string | null;
  version: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const stub = env.SHOPS_STUB === '1';
  const onRender = Boolean(env.RENDER);
  const local = (env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const key = stub ? null : (env.SHOPS_SERVER_KEY ?? '').trim() || null;
  return {
    port: Number(env.PORT ?? 4396),
    // on Render only the game's sites; elsewhere whatever the tests and dev name
    origins: onRender ? [...GAME_ORIGINS] : local,
    stub,
    replay: stub && env.SHOPS_REPLAY === '1',
    project: ONLINE_PROJECT ? { url: ONLINE_PROJECT.url, publishableKey: ONLINE_PROJECT.publishableKey } : null,
    key,
    // the release, as the build stamped it (vite.sharedBuild.ts); `env` is a parameter, which a build's define can't reach
    version: SHARED_BUILD.version,
  };
}

export function originAllowed(origins: readonly string[], origin: string | undefined): boolean {
  if (!origin) return false;
  return origins.some((o) => (o.endsWith(':*') ? origin.startsWith(o.slice(0, -1)) && /^\d+$/.test(origin.slice(o.length - 1)) : origin === o));
}
