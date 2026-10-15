/**
 * lane:ui-shell (chunk 6; B-196, ADR-0029 decision 10) — "Move tank" on the tank card: put the card away, show the room
 * view and arm the existing placement ghost (src/render/facility/PlacementGhost.tsx) on this tank, starting from its
 * current rotation. The ghost moves it with `placeTank`, or Escape / Cancel leaves it where it is.
 */
import { useUI } from '@/state/ui';
import { getGame } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { usePlacementStore } from '@/render/facility/placementStore';
import { useShell } from '../common/shellStore';

export function startTankMove(tankId: string): void {
  const t = getGame()?.tanks[tankId];
  if (!t) return;
  sfx('open');
  useShell.getState().set({ tankCardOpen: false, popover: null });
  usePlacementStore.getState().reset();
  if (t.placement && Number.isFinite(t.placement.rotY)) usePlacementStore.getState().set({ rotY: t.placement.rotY });
  useUI.getState().set({ tool: 'tank_place', placingTankTierId: null, movingTankId: tankId, view: 'facility', panel: null, panelTarget: null, selectedCreatureId: null });
}
