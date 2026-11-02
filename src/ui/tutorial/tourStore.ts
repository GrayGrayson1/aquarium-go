/**
 * chunk 19 (ADR-0055 decision 7, QOL-008) — the tour of the whole game ("Show me around"): whether it runs and which
 * stop it is on. Started from the guide's finale, Settings › Play & access ("Take the tour") and Find anything; the tour
 * itself is src/ui/tutorial/Tour.tsx. Its own module so the starters don't load the tour. OWNER: lane "ui-shell".
 */
import { create } from 'zustand';

export interface TourState {
  running: boolean;
  /** Index into the stops open to the player (src/ui/tutorial/tourStops.ts). */
  step: number;
}

export const useTour = create<TourState>(() => ({ running: false, step: 0 }));

export function startTour(): void {
  useTour.setState({ running: true, step: 0 });
}

export function endTour(): void {
  if (useTour.getState().running) useTour.setState({ running: false, step: 0 });
}
