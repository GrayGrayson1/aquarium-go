/**
 * An in-memory platform for tests (0.5 design §14). OWNER: lane "platform".
 *
 * Touches no browser API. Notifications it may show land in `.shown` and clipboard writes in `.copied`; `open(route)`,
 * `pause()` and `resume()` stand in for the player tapping a notification and the page going away and coming back.
 * Like a desktop browser it has no share sheet, no schedule or cancelAll, and no storage list of its own.
 */
import type { NotifyPermission, Platform, PlatformNotification } from './types';

export interface MemoryPlatformOptions {
  /** The permission state to report (default 'default'). */
  permission?: NotifyPermission;
  /** The player's answer when request() asks while the permission is 'default' (default 'granted'). */
  answer?: 'default' | 'granted' | 'denied';
}

export interface MemoryPlatform extends Platform {
  /** Every notification show() accepted, in order. */
  shown: PlatformNotification[];
  /** Every text written to the clipboard, in order. */
  copied: string[];
  /** How many times request() was called (nothing may call it at boot). */
  requests: number;
  /** The player taps a notification: every onOpen subscriber gets the route. */
  open(route: string | null): void;
  /** The page goes to the background: every onPause subscriber runs. */
  pause(): void;
  /** The page comes back: every onResume subscriber runs. */
  resume(): void;
}

export function createMemoryPlatform(opts: MemoryPlatformOptions = {}): MemoryPlatform {
  let permission: NotifyPermission = opts.permission ?? 'default';
  const answer = opts.answer ?? 'granted';
  const openers = new Set<(route: string | null) => void>();
  const pauses = new Set<() => void>();
  const resumes = new Set<() => void>();
  const subscribe = <T>(set: Set<T>, cb: T) => {
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  };

  const mp: MemoryPlatform = {
    kind: 'web',
    shown: [],
    copied: [],
    requests: 0,
    notifications: {
      permission: () => permission,
      async request() {
        mp.requests++;
        // A browser asks only while nothing is decided; after that it answers with the decision.
        if (permission === 'default') permission = answer;
        return permission;
      },
      async show(n) {
        if (permission !== 'granted') return false;
        mp.shown.push({ ...n });
        return true;
      },
      onOpen: (cb) => subscribe(openers, cb),
    },
    clipboard: {
      async write(text) {
        mp.copied.push(text);
        return true;
      },
    },
    lifecycle: {
      onPause: (cb) => subscribe(pauses, cb),
      onResume: (cb) => subscribe(resumes, cb),
    },
    open(route) {
      for (const cb of [...openers]) cb(route);
    },
    pause() {
      for (const cb of [...pauses]) cb();
    },
    resume() {
      for (const cb of [...resumes]) cb();
    },
  };
  return mp;
}
