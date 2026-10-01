/**
 * "Place another" (R05-03 / R11-04): a paid decor placement ends the tool (one piece per purchase, so a later click
 * on the tank never buys a copy by accident); this remembers the piece for a few seconds so the tool hint can offer
 * an explicit, touch-friendly way to place another without a trip through Build. Shift+click keeps placing on desktop.
 */
import { create } from 'zustand';
import { useUI } from '@/state/ui';

/** How long the offer stays up after a placement (ms). */
export const PLACE_AGAIN_MS = 8000;

interface PlaceAgain {
  defId: string | null;
  tankId: string | null;
}

export const usePlaceAgain = create<PlaceAgain>(() => ({ defId: null, tankId: null }));

/** A paid piece was placed in `tankId` and the tool ended. */
export function offerPlaceAgain(defId: string, tankId: string): void {
  usePlaceAgain.setState({ defId, tankId });
}

export function clearPlaceAgain(): void {
  if (usePlaceAgain.getState().defId) usePlaceAgain.setState({ defId: null, tankId: null });
}

/** Re-arm decor placement with the same piece in the same tank. */
export function placeAnother(): void {
  const { defId, tankId } = usePlaceAgain.getState();
  clearPlaceAgain();
  if (!defId || !tankId) return;
  useUI.getState().set({ tool: 'decor_place', placingDecorDefId: defId, placingFragId: null, view: 'tank', focusedTankId: tankId });
}
