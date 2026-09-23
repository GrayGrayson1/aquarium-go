/**
 * One docked side card at a time. OWNER: lane "ui-shell".
 *
 * The tank card (left) and the creature card (right) never share the screen with each other or with a management
 * panel: whatever the player opened last wins. Two cards plus the tool rail would leave the tank a ~560 px strip at
 * 1440 px, which the camera framing treats as "no room" (src/render/camera/viewport.ts ignores occluders that leave
 * < 40 % of the width), so the animal ended up behind a card.
 *
 * Rules (enforced by store subscriptions, so every path — HUD buttons, 3D clicks, toasts, the guide — obeys them):
 *  - opening a management panel closes both cards (they are replaced, not hidden, so nothing re-opens later) and puts
 *    down an armed feed / target-feed / tap tool;
 *  - opening the tank card clears the creature selection, closes a management panel and cancels a placement tool;
 *  - selecting a creature closes the tank card and a management panel (except Livestock, which uses the selection
 *    to highlight its own row);
 *  - while a placement tool (decor / tank) is active both cards stay out of the way; nothing re-opens behind the player.
 */
import { useEffect } from 'react';
import { useUI, type PanelId, type ToolId } from '@/state/ui';
import { useGame } from '@/state/game';
import { useShell } from '../common/shellStore';

export const PLACEMENT_TOOLS: ReadonlySet<ToolId> = new Set<ToolId>(['decor_place', 'decor_move', 'tank_place']);
/** Tank-care tools that a management panel replaces (lane:qa-play). */
const CARE_TOOLS: ReadonlySet<ToolId> = new Set<ToolId>(['feed', 'target_feed', 'tap']);

/** Management sheets rendered by PanelHost (settings/dev are shell overlays). */
export const isManagedPanel = (p: PanelId | null): boolean => !!p && p !== 'settings' && p !== 'dev';

export type DockedCard = 'tank' | 'creature' | null;

/** Which side card is actually on screen right now (after panels, placement, photo and watch mode). */
export function useDockedCard(): DockedCard {
  const blocked = useUI((s) => !!s.panel || s.photoMode || s.hudHidden || PLACEMENT_TOOLS.has(s.tool));
  const creatureId = useUI((s) => s.selectedCreatureId);
  const focused = useUI((s) => s.focusedTankId);
  const creature = useGame((s) => !!creatureId && !!s.game?.creatures[creatureId]);
  const tank = useGame((s) => !!focused && !!s.game?.tanks[focused]);
  const tankOpen = useShell((s) => s.tankCardOpen);
  if (blocked) return null;
  if (creature) return 'creature';
  if (tankOpen && tank) return 'tank';
  return null;
}

/** Install the one-card rules (GameHUD mounts this once). */
export function useCardDockRules() {
  useEffect(() => {
    const unsubShell = useShell.subscribe((s, p) => {
      if (!s.tankCardOpen || p.tankCardOpen) return;
      const ui = useUI.getState();
      const patch: Parameters<typeof ui.set>[0] = {};
      if (ui.selectedCreatureId) patch.selectedCreatureId = null;
      if (isManagedPanel(ui.panel)) {
        patch.panel = null;
        patch.panelTarget = null;
      }
      if (PLACEMENT_TOOLS.has(ui.tool)) patch.tool = 'none';
      if (Object.keys(patch).length) ui.set(patch);
    });
    const unsubUI = useUI.subscribe((s, p) => {
      // a management panel replaces the side cards (they don't pop back later, e.g. after placing decor from Build)
      if (isManagedPanel(s.panel) && s.panel !== p.panel && !isManagedPanel(p.panel)) {
        const shell = useShell.getState();
        if (shell.tankCardOpen) shell.set({ tankCardOpen: false });
        // keep a selection made in the same update (deep links that open a panel about this animal)
        if (s.selectedCreatureId && s.selectedCreatureId === p.selectedCreatureId) useUI.getState().set({ selectedCreatureId: null });
        // lane:qa-play — an armed care tool (feed / target feed / tap) is put down too: the tool rail sits under the
        // panel, so its "Click the water…" prompt was left half-hidden behind the sheet with the tool still live.
        if (CARE_TOOLS.has(useUI.getState().tool)) useUI.getState().set({ tool: 'none' });
        return;
      }
      if (!s.selectedCreatureId || s.selectedCreatureId === p.selectedCreatureId) return;
      const shell = useShell.getState();
      if (shell.tankCardOpen) shell.set({ tankCardOpen: false });
      // a panel opened in the same update meant to keep the selection (e.g. Livestock deep link)
      if (isManagedPanel(s.panel) && s.panel === p.panel && s.panel !== 'livestock') useUI.getState().set({ panel: null, panelTarget: null });
    });
    return () => {
      unsubShell();
      unsubUI();
    };
  }, []);
}
