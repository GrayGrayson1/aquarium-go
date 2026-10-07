/**
 * The phone tab bar (0.5 spec §5.2, §18): Tanks · Livestock · Market · Build · More, in place of the dock wherever
 * MOBILE_QUERY matches (phones either way up). OWNER: lane "ui-shell".
 *
 * - A direct child of .ag-hud, so it keeps the calm-HUD rule (the first tap on a calm HUD only wakes it) and paints
 *   above phone sheets (z 55) and below toasts (z 70); .ag-hud must stay free of z-index, transform and filter.
 * - The four destination tabs keep the dock's test and tutorial ids (dock-tanks …), so helpers and the guide work
 *   unchanged. Tapping the open destination closes it (openPanel's toggle).
 * - More opens the More sheet (MoreSheet.tsx) and is highlighted while it, or any destination inside it, is open; with
 *   the sheet open, More closes it. Opening More puts down what was open, so Back from a tile returns to More.
 * DESIGN-S3D will put Operations first in More and Settings on a gear (INTAKE.md C-1, C-2): MORE_ITEMS is the one
 * list to change.
 */
import clsx from 'clsx';
import { Ellipsis } from 'lucide-react';
import { useUI, type PanelId } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { useShell } from '../common/shellStore';
import { DOCK_ITEMS, openPanel } from './Dock';
import { AttnDot, useNavDots } from './AttnDot'; // lane:notify

const TAB_IDS: readonly PanelId[] = ['tanks', 'livestock', 'market', 'build'];
/** The tab bar's destinations, from the dock's list (labels, icons). */
export const TAB_ITEMS = TAB_IDS.map((id) => DOCK_ITEMS.find((it) => it.id === id)!);
/** Everything else lives in More, in this order (Social joins in chunk 6, dev-only; Settings is the row below). */
export const MORE_ITEMS = (['visitors', 'shows', 'research', 'finances', 'encyclopedia'] as const).map((id) => DOCK_ITEMS.find((it) => it.id === id)!);
/** Destinations that light up the More tab while open. */
export const MORE_DESTINATIONS: ReadonlySet<PanelId> = new Set<PanelId>([...MORE_ITEMS.map((it) => it.id), 'settings']);

/** Open the More sheet (putting down a panel or card), or close it when it is open. */
export function toggleMore(): void {
  const shell = useShell.getState();
  if (shell.popover === 'more') {
    sfx('close');
    shell.set({ popover: null });
    return;
  }
  sfx('open');
  const ui = useUI.getState();
  if (ui.panel || ui.selectedCreatureId) ui.set({ panel: null, panelTarget: null, selectedCreatureId: null });
  shell.set({ popover: 'more', tankCardOpen: false });
}

export function TabBar() {
  const panel = useUI((s) => s.panel);
  const moreOpen = useShell((s) => s.popover === 'more');
  const dots = useNavDots(DOCK_ITEMS); // lane:notify — the dock's attention dots
  const moreActive = moreOpen || (!!panel && MORE_DESTINATIONS.has(panel));
  const moreDot = MORE_ITEMS.map((it) => (panel !== it.id ? dots[it.id] : undefined)).find(Boolean);
  return (
    <nav className="ag-tabbar" aria-label="Main" data-testid="nav-tabbar">
      {TAB_ITEMS.map((it) => {
        const Icon = it.icon;
        const active = panel === it.id && !moreOpen;
        const dot = active ? undefined : dots[it.id];
        return (
          <button
            key={it.id}
            type="button"
            className={clsx('ag-tabbar__item', active && 'is-active')}
            data-testid={`dock-${it.id}`}
            data-tutorial-id={`dock-${it.id}`}
            aria-current={active ? 'page' : undefined}
            aria-label={dot ? `${it.label} — ${dot.label}` : undefined}
            onClick={() => {
              if (moreOpen) useShell.getState().set({ popover: null });
              openPanel(it.id, dot && panel !== it.id ? dot.target : null);
            }}
          >
            <span className="ag-tabbar__icon">
              <Icon size={22} aria-hidden />
              {dot && <AttnDot level={dot.level} className="ag-tabbar__attn" testId={`dock-badge-${it.id}`} />}
            </span>
            <span className="ag-tabbar__label">{it.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={clsx('ag-tabbar__item ag-popanchor', moreActive && 'is-active')}
        data-testid="dock-more"
        data-tutorial-id="dock-more"
        aria-current={moreActive ? 'page' : undefined}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        aria-label={moreDot && !moreOpen ? `More — ${moreDot.label}` : undefined}
        onClick={toggleMore}
      >
        <span className="ag-tabbar__icon">
          <Ellipsis size={22} aria-hidden />
          {moreDot && !moreOpen && <AttnDot level={moreDot.level} className="ag-tabbar__attn" testId="dock-badge-more" />}
        </span>
        <span className="ag-tabbar__label">More</span>
      </button>
    </nav>
  );
}
