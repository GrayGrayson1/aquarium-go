/**
 * Defensive wrappers for calling domain functions from UI. Many sim modules are built in parallel and may be
 * stubs, throw on unexpected data, or return placeholder values — the UI must never crash because of that.
 * OWNER: lane "ui-shell".
 */
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/state/game';
import type { GameState } from '@/types';

let warned = new Set<string>();

/** Run `fn`, returning `fallback` if it throws. Logs one warning per `tag`. */
export function safe<T>(tag: string, fn: () => T, fallback: T): T {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch (err) {
    if (!warned.has(tag)) {
      warned.add(tag);
      console.warn(`[ui] ${tag} failed:`, err);
    }
    return fallback;
  }
}

export function resetSafeWarnings() {
  warned = new Set();
}

/**
 * Subscribe to the game state but re-render at most every `ms` milliseconds (heavy cards compute reports).
 * The first change after a quiet period renders immediately, so player actions feel instant.
 */
export function useGameThrottled(ms = 500): GameState | null {
  const [game, setGame] = useState(() => useGame.getState().game);
  const last = useRef(0);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const unsub = useGame.subscribe((s) => {
      const now = performance.now();
      const since = now - last.current;
      if (since >= ms) {
        last.current = now;
        setGame(s.game);
      } else if (timer.current == null) {
        timer.current = window.setTimeout(() => {
          timer.current = null;
          last.current = performance.now();
          setGame(useGame.getState().game);
        }, ms - since);
      }
    });
    return () => {
      unsub();
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, [ms]);
  return game;
}

/** Re-render every `ms` (for runtime-only data like current behaviour labels). */
export function useInterval(ms: number, enabled = true): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setN((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms, enabled]);
  return n;
}

/** matchMedia hook (phone layout switch). */
export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** A phone held sideways (844×390): too short for the desktop chrome, so it gets the phone layout (hud.css/tokens.css key off the same condition). */
export const SHORT_LANDSCAPE_QUERY = '(max-height: 500px) and (orientation: landscape)';
export const MOBILE_QUERY = `(max-width: 720px), ${SHORT_LANDSCAPE_QUERY}`;
export const useIsMobile = () => useMedia(MOBILE_QUERY);

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'number', 'password', 'tel', '']);
/** A field the player types into (Escape / letter shortcuts stay out of it). Sliders, checkboxes and selects are not. */
export function isTextEntry(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t || !t.tagName) return false;
  if (t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
  return t.tagName === 'INPUT' && TEXT_INPUT_TYPES.has(((t as HTMLInputElement).type ?? '').toLowerCase());
}
