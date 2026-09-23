/**
 * Keeps `ui.focusedTankId` pointing at a tank that exists. Selling (or otherwise removing) the tank you are looking at
 * used to leave the switcher on "No tank · 0/3" with the tank card disabled while the scene showed another tank.
 * OWNER: lane "ui-shell".
 */
import { useEffect } from 'react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useShell } from '../common/shellStore';

function ensureFocusedTank() {
  const g = useGame.getState().game;
  const ui = useUI.getState();
  if (!g || ui.screen !== 'game') return;
  const id = ui.focusedTankId;
  if (id && g.tanks[id]) return;
  const next = g.tankOrder.find((t) => !!g.tanks[t]) ?? Object.keys(g.tanks)[0] ?? null;
  if (next === id) return;
  const patch: Parameters<typeof ui.set>[0] = { focusedTankId: next, selectedCreatureId: null, followCreatureId: null };
  if (ui.cameraMode === 'follow') patch.cameraMode = 'front';
  if (ui.tool !== 'none' && ui.tool !== 'tank_place') patch.tool = 'none';
  if (!next) patch.view = 'facility';
  ui.set(patch);
  const shell = useShell.getState();
  if (shell.popover === 'food' || shell.popover === 'target_food' || shell.popover === 'lights') shell.set({ popover: null });
  if (!next && shell.tankCardOpen) shell.set({ tankCardOpen: false });
}

export function useFocusedTankGuard() {
  useEffect(() => {
    ensureFocusedTank();
    const unsubGame = useGame.subscribe((s, p) => {
      if (s.game?.tankOrder !== p.game?.tankOrder || s.game?.tanks !== p.game?.tanks) ensureFocusedTank();
    });
    const unsubUI = useUI.subscribe((s, p) => {
      if (s.focusedTankId !== p.focusedTankId || s.screen !== p.screen) ensureFocusedTank();
    });
    return () => {
      unsubGame();
      unsubUI();
    };
  }, []);
}
