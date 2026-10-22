/**
 * chunk 13 (SHARED-SHOPS.md §3.2 rule 11, §7.3) — whether a club's shared shop is the game on screen. The mark lives
 * outside `GameState`, so it never enters a fingerprint, and here in `state`, so persistence and the game loop (which
 * can't import the interface) can refuse a shared shop: nothing saves it on the device, the loop doesn't tick it, the
 * hidden-tab catch-up doesn't run. Only src/ui/shared sets it. OWNER: core.
 */
import { create } from 'zustand';

export interface SharedMode {
  /** The club whose shared shop is open, or null (a solo game, the title screen). */
  club: string | null;
}

export const useSharedMode = create<SharedMode>(() => ({ club: null }));

/** Is a shared shop open on this device? */
export const inSharedShop = (): boolean => useSharedMode.getState().club !== null;

/** src/ui/shared only: the club whose shop just opened, or null once it's left. */
export const setSharedMode = (club: string | null): void => useSharedMode.setState({ club });
