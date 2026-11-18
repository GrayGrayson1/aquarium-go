/**
 * The Social panel's session state (not saved): who is signed in, and what the service says is new. OWNER: lane
 * "social". Everything goes through `socialService()` (src/social), the one injection point (SOC-009 A2); nothing
 * here touches the game state or the save (SOC-009 A3).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useGame } from '@/state/game';
import { isSharedShop } from '@/persistence';
import { isSocialError, playerStanding, setStandingSource, socialService, type SocialNews, type SocialUser } from '@/social';

// the stub's "me" row reads the aquarium on screen (a showcase has no player to rank)
setStandingSource(() => {
  const g = useGame.getState().game;
  if (!g || g.isShowcase || isSharedShop(g)) return null; // chunk 13: a shared shop isn't on the leaderboards (ADR-0045 decision 12)
  try {
    return playerStanding(g);
  } catch {
    return null;
  }
});

/** Audit 2026-11-17, I13: what's new, and the friend requests waiting for an answer (they light the dot until answered). */
export type SocialDot = SocialNews & { requests?: number };

interface SocialState {
  /** undefined until the service has answered `currentUser()`. */
  user: SocialUser | null | undefined;
  /** `currentUser()` failed for want of a connection. */
  offline: boolean;
  news: SocialDot;
}

export const useSocial = create<SocialState>(() => ({ user: undefined, offline: false, news: { trades: 0, clubs: 0 } }));

/**
 * Ask the service who is signed in (once per session unless `force`). Chunk 8: with no connection, an account already
 * known stays signed in on this device (only `offline` says the server can't be reached).
 */
export async function loadSocialUser(force = false): Promise<void> {
  if (!force && useSocial.getState().user !== undefined) return;
  const seq = ++userSeq;
  try {
    const user = await socialService().currentUser();
    if (seq !== userSeq) return; // a newer answer (or a sign-in or sign-out here) came first: it stands
    useSocial.setState({ user, offline: false });
  } catch (e) {
    if (seq !== userSeq) return;
    const network = isSocialError(e) && e.code === 'network';
    useSocial.setState((s) => ({ user: network && s.user ? s.user : null, offline: network }));
  }
}

/** Chunk 9 (B2, the audit's C7): each ask of who is signed in, so an older answer never overwrites a newer one. */
let userSeq = 0;

export const setSocialUser = (user: SocialUser | null): void => {
  userSeq++;
  useSocial.setState({ user, offline: false });
};

/**
 * Audit 2026-11-17, I13 (and its review): the friend requests Social has already shown on this device (their ids;
 * device-side, never in the save). A request lights the dot only until then: only the owner can decline one
 * (ADR-0054), so a dot that stayed until it was accepted pushed a child to accept someone they didn't want.
 */
export const SEEN_REQUESTS_KEY = 'aquarium-go.social.requests-seen.v1';
const MAX_SEEN_REQUESTS = 200;
function seenRequests(): Set<string> {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(SEEN_REQUESTS_KEY) ?? '[]') as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}
function rememberSeenRequests(ids: readonly string[]): void {
  if (!ids.length) return;
  try {
    const all = [...new Set([...seenRequests(), ...ids])].slice(-MAX_SEEN_REQUESTS);
    globalThis.localStorage?.setItem(SEEN_REQUESTS_KEY, JSON.stringify(all));
  } catch {
    /* the dot may show a request again: no harm */
  }
}
/** The requests waiting as last read (their ids). */
let waitingRequests: string[] = [];

/** Re-read what's new (the Social dot); quiet on failure. */
export async function refreshSocialNews(): Promise<void> {
  try {
    // audit I13: the requests waiting too, the ones Social hasn't shown yet (a request showed only if Friends happened
    // to be opened)
    const [news, ids] = await Promise.all([socialService().news(), socialService().friendRequests().then((r) => r.map((x) => x.id), () => null)]);
    if (ids) waitingRequests = ids;
    const seen = seenRequests();
    useSocial.setState({ news: { ...news, requests: waitingRequests.filter((id) => !seen.has(id)).length } });
  } catch {
    /* keep the last answer */
  }
}

/** Social is open: what's there now has been seen (the friend requests waiting too). */
export async function markSocialSeen(): Promise<void> {
  rememberSeenRequests(waitingRequests);
  useSocial.setState({ news: { trades: 0, clubs: 0, requests: 0 } });
  try {
    await Promise.all([
      socialService().markSeen(),
      // ones that came since the last read are on screen now too
      socialService()
        .friendRequests()
        .then((r) => {
          waitingRequests = r.map((x) => x.id);
          rememberSeenRequests(waitingRequests);
        }, () => {}),
    ]);
  } catch {
    /* the next refresh says again */
  }
}

export const hasSocialNews = (n: SocialDot): boolean => n.trades + n.clubs + (n.requests ?? 0) > 0;

export type Query<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; network: boolean };

/** Load something from the service; `reload` asks again. Answers that arrive after unmount or a newer call are dropped. */
export function useSocialQuery<T>(load: () => Promise<T>, deps: readonly unknown[]): [Query<T>, () => void, (fn: (d: T) => T) => void] {
  const [q, setQ] = useState<Query<T>>({ state: 'loading' });
  const seq = useRef(0);
  const run = useCallback(() => {
    const n = ++seq.current;
    setQ({ state: 'loading' });
    load().then(
      (data) => n === seq.current && setQ({ state: 'ok', data }),
      (e) => n === seq.current && setQ({ state: 'error', network: isSocialError(e) && e.code === 'network' }),
    );
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    run();
    return () => {
      seq.current++;
    };
  }, [run]);
  const patch = useCallback((fn: (d: T) => T) => setQ((cur) => (cur.state === 'ok' ? { state: 'ok', data: fn(cur.data) } : cur)), []);
  return [q, run, patch];
}
