/**
 * Keeps `ui.focusedTankId` pointing at a tank that exists. Selling (or otherwise removing) the tank you are looking at
 * used to leave the switcher on "No tank · 0/3" with the tank card disabled while the scene showed another tank.
 * OWNER: lane "ui-shell".
 */
import { useEffect } from 'react';
import { useGame } from '@/state/game';
import { useUI, type UIState } from '@/state/ui';
import type { GameState } from '@/types';
import { useShell } from '../common/shellStore';

export function ensureFocusedTank() {
  const g = useGame.getState().game;
  const ui = useUI.getState();
  if (!g || ui.screen !== 'game') return;
  const id = ui.focusedTankId;
  if (id && g.tanks[id]) return;
  // Audit 2026-11-17 (G28, B-231 e): while a tank is being placed, its landing focuses it (PlacementGhost). Focusing the
  // first tank bought after selling every tank mid-placement made aside.ts drop Build on a phone instead of bringing it
  // back; the guard runs again when the tool ends.
  if (ui.tool === 'tank_place') return;
  const next = g.tankOrder.find((t) => !!g.tanks[t]) ?? Object.keys(g.tanks)[0] ?? null;
  if (next === id) return;
  const patch: Parameters<typeof ui.set>[0] = { focusedTankId: next, selectedCreatureId: null, followCreatureId: null };
  if (ui.cameraMode === 'follow') patch.cameraMode = 'front';
  if (ui.tool !== 'none') patch.tool = 'none'; // (a tank placement returned above)
  if (!next) patch.view = 'facility';
  ui.set(patch);
  const shell = useShell.getState();
  if (shell.popover === 'food' || shell.popover === 'target_food' || shell.popover === 'lights') shell.set({ popover: null });
  if (!next && shell.tankCardOpen) shell.set({ tankCardOpen: false });
}

/**
 * The open creature card / follow camera stay with an animal that is still here. A sale that completes in the
 * background (or a death) used to leave a card saying "Following · Doing well" for an animal that was gone, with the
 * Follow chip lit while the rig had quietly fallen back to the front view; an animal moved to another tank from the
 * Livestock panel left the card bound to the old tank. Gone: card and follow close. Moved: the view follows it.
 */
export function selectedCreaturePatch(g: GameState, ui: Pick<UIState, 'screen' | 'view' | 'selectedCreatureId' | 'followCreatureId' | 'cameraMode' | 'focusedTankId'>): Partial<UIState> {
  const patch: Partial<UIState> = {};
  if (ui.screen !== 'game') return patch;
  for (const key of ['selectedCreatureId', 'followCreatureId'] as const) {
    const id = ui[key];
    if (!id) continue;
    const c = g.creatures[id];
    if (!c || (c.status !== 'alive' && c.status !== 'listed')) {
      patch[key] = null;
      if (key === 'followCreatureId' && ui.cameraMode === 'follow') patch.cameraMode = 'front';
    } else if (key === 'selectedCreatureId' && c.tankId && c.tankId !== ui.focusedTankId && g.tanks[c.tankId] && ui.view === 'tank') {
      patch.focusedTankId = c.tankId;
    }
  }
  return patch;
}

function ensureSelectedCreature() {
  const g = useGame.getState().game;
  const ui = useUI.getState();
  if (!g) return;
  const patch = selectedCreaturePatch(g, ui);
  if (Object.keys(patch).length) ui.set(patch);
}

export function useFocusedTankGuard() {
  useEffect(() => {
    ensureFocusedTank();
    ensureSelectedCreature();
    const unsubGame = useGame.subscribe((s, p) => {
      if (s.game?.tankOrder !== p.game?.tankOrder || s.game?.tanks !== p.game?.tanks) ensureFocusedTank();
      if (s.game?.creatures !== p.game?.creatures) ensureSelectedCreature();
    });
    const unsubUI = useUI.subscribe((s, p) => {
      if (s.focusedTankId !== p.focusedTankId || s.screen !== p.screen || (p.tool === 'tank_place' && s.tool !== 'tank_place')) ensureFocusedTank();
    });
    return () => {
      unsubGame();
      unsubUI();
    };
  }, []);
}
