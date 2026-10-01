/**
 * "A new version is ready": the build stamps its id into the bundle (`__BUILD_ID__`, vite.config.ts) and into
 * `version.json` next to index.html. A tab running a cached older build fetches that file now and then (bypassing
 * every cache) and offers a reload when the ids differ. Pure helpers here; UpdatePrompt.tsx owns the timers and UI.
 * OWNER: lane "ui-shell".
 */

declare const __BUILD_ID__: string | undefined;

/** This bundle's build id; 'dev' under the dev server and in tests (they never check). */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' && __BUILD_ID__ ? __BUILD_ID__ : 'dev';

/** First look a little after launch (a cached index.html is the usual way to be on an old build), then every 5 min. */
export const FIRST_CHECK_MS = 20_000;
export const CHECK_EVERY_MS = 5 * 60_000;
/** Checks at least this far apart (a player flicking between windows asks at most this often). */
export const CHECK_GAP_MS = 15_000;
/** One return fires focus + visibilitychange (+ online) together: events this close to a check are that same check. */
export const CHECK_BURST_MS = 2_000;

type Timers = { set: (fn: () => void, ms: number) => number; clear: (id: number) => void };
const windowTimers: Timers = { set: (fn, ms) => window.setTimeout(fn, ms), clear: (id) => window.clearTimeout(id) };

/**
 * Rate gate for the checks. An ask runs at once; within CHECK_BURST_MS of the last check it is part of that check;
 * later inside the gap it runs once when the gap ends, so a real return a few seconds after a check is answered a
 * little late instead of dropped until the next 5-minute poll.
 */
export function checkGate(run: () => void, now: () => number = Date.now, timers: Timers = windowTimers, gapMs = CHECK_GAP_MS, burstMs = CHECK_BURST_MS) {
  let last = -Infinity;
  let pending = 0;
  const fire = () => {
    pending = 0;
    last = now();
    run();
  };
  return {
    ask(): void {
      const since = now() - last;
      if (pending || since < burstMs) return;
      if (since >= gapMs) fire();
      else pending = timers.set(fire, gapMs - since);
    },
    cancel(): void {
      if (pending) timers.clear(pending);
      pending = 0;
    },
  };
}

/** Where the deployed build publishes its id (respects the GitHub Pages base path), with a cache-busting query. */
export function versionUrl(base: string, now: number): string {
  return `${base.endsWith('/') ? base : `${base}/`}version.json?t=${now}`;
}

/** The deployed build's id from a version.json body, or null when it is missing or malformed. */
export function parseBuildId(body: unknown): string | null {
  const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : null;
  return typeof id === 'string' && /^[\w.-]{1,64}$/.test(id) ? id : null;
}

/** The deployed release's version ("0.3.2") from a version.json body; null for old builds that did not publish one. */
export function parseLiveVersion(body: unknown): string | null {
  const v = body && typeof body === 'object' ? (body as { version?: unknown }).version : null;
  return typeof v === 'string' && /^\d+\.\d+\.\d+[\w.+-]{0,24}$/.test(v) ? v : null;
}

/** Is a different build live than the one this tab runs? Never for a dev build or an unreadable answer. */
export function isNewBuild(current: string, remote: string | null): boolean {
  return current !== 'dev' && remote != null && remote !== current;
}

/** What version.json says is live: its build id, plus the release version when it publishes one. */
export interface LiveBuild {
  id: string;
  version: string | null;
}

/** Ask the server which build is live. Null when offline, in dev, or on any failure (we simply try again later). */
export async function fetchLiveBuild(base: string): Promise<LiveBuild | null> {
  if (BUILD_ID === 'dev' || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
  try {
    const res = await fetch(versionUrl(base, Date.now()), { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const id = parseBuildId(body);
    return id ? { id, version: parseLiveVersion(body) } : null;
  } catch {
    return null;
  }
}

/** Just the live build id (see fetchLiveBuild). */
export async function fetchLiveBuildId(base: string): Promise<string | null> {
  return (await fetchLiveBuild(base))?.id ?? null;
}
