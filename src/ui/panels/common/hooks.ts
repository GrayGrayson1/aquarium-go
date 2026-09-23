/**
 * Panel hooks: a throttled game snapshot (the sim ticks at 4 Hz; panels only need ~1–2 Hz unless the player acts),
 * safe domain calls, media queries. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useSettings } from '@/state/settings';

let urgent = 0;
/** Mark the next store change as player-driven so every panel refreshes immediately. */
export function markUrgent(on: boolean): void {
  urgent += on ? 1 : -1;
  if (urgent < 0) urgent = 0;
}

/**
 * Game state snapshot that refreshes at most every `ms` for simulation ticks, but immediately after player actions
 * run through `act()`. Keeps big panels cheap while the sim runs.
 */
export function usePanelGame(ms = 700): GameState | null {
  const [g, setG] = useState<GameState | null>(() => useGame.getState().game);
  useEffect(() => {
    let last = performance.now();
    let timer: number | null = null;
    let latest = useGame.getState().game;
    // Pick up anything that changed between the initial render and subscribing.
    if (latest !== g) setG(latest);
    const unsub = useGame.subscribe((s) => {
      latest = s.game;
      const now = performance.now();
      if (urgent > 0 || now - last >= ms || !latest) {
        last = now;
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
        setG(latest);
      } else if (timer == null) {
        timer = window.setTimeout(() => {
          timer = null;
          last = performance.now();
          setG(latest);
        }, Math.max(16, ms - (now - last)));
      }
    });
    return () => {
      unsub();
      if (timer != null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
  return g;
}

/** Call a domain function that may still be a stub / may throw on odd data. Never crash a panel. */
export function safe<T>(fn: () => T, fallback: T): T {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[panels] domain call failed', e);
    return fallback;
  }
}

/** Memoised safe call keyed on deps. */
export function useSafeMemo<T>(fn: () => T, fallback: T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => safe(fn, fallback), deps);
}

export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

export const PHONE_QUERY = '(max-width: 760px)';
export const useIsPhone = () => useMedia(PHONE_QUERY);

export function useReducedMotion(): boolean {
  return useSettings((s) => s.reducedMotion);
}

/** Remember the previous value of something across renders. */
export function usePrevious<T>(v: T): T | undefined {
  const r = useRef<T | undefined>(undefined);
  useEffect(() => {
    r.current = v;
  }, [v]);
  return r.current;
}
