/**
 * Tank switcher (prev/next + name + status), facility ⇄ tank view toggle, tank card toggle. OWNER: lane "ui-shell".
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, LayoutGrid, Maximize2, ClipboardList, CircleCheck, TriangleAlert, OctagonAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { getTankTier } from '@/data/catalog/tanks';
import { tutorialChain } from '@/data/quests';
import { useShell } from '../common/shellStore';
import { safe } from '../common/safe';
import { tutorialFlag } from '../common/actions';
import { PLACEMENT_TOOLS, useDockedCard } from './cardDock';
import { tankStatusReason } from '../common/tankStatus';

export function cycleTank(dir: 1 | -1) {
  const g = useGame.getState().game;
  const ui = useUI.getState();
  if (!g || !g.tankOrder.length) return;
  const i = Math.max(0, g.tankOrder.indexOf(ui.focusedTankId ?? ''));
  const n = (i + dir + g.tankOrder.length) % g.tankOrder.length;
  sfx('click');
  ui.set({ focusedTankId: g.tankOrder[n], selectedCreatureId: null, followCreatureId: null, cameraMode: ui.cameraMode === 'follow' ? 'front' : ui.cameraMode });
}

export function toggleView() {
  const ui = useUI.getState();
  const next = ui.view === 'tank' ? 'facility' : 'tank';
  sfx('open');
  ui.set({ view: next, tool: 'none', selectedCreatureId: next === 'facility' ? null : ui.selectedCreatureId });
  if (next === 'facility') useShell.getState().set({ popover: null });
  tutorialFlag(next === 'facility' ? 'viewed_facility' : 'viewed_tank');
}

/** While the guide asks the player to read the water, open the card with that parameter already expanded. */
function guideWaterParam(): string | null {
  const g = useGame.getState().game;
  if (!g || g.isShowcase) return null;
  const t = g.progress.tutorial;
  if (!t || t.done || t.skipped) return null;
  const step = safe('tutorialChain', () => tutorialChain(t.starterId || g.starterId)[t.step], undefined);
  if (!step || step.hintTarget !== 'tank-card-toggle') return null;
  if (/salinity/i.test(step.body)) return 'salinity';
  if (/ammonia/i.test(step.body)) return 'ammonia';
  if (/temperature/i.test(step.body)) return 'temp';
  return null;
}

/**
 * Open/close the tank card. If it is "open" but covered (a panel, the creature card or a placement tool took the
 * screen — e.g. the Market bottom sheet on a phone), the button brings it to the front instead of closing it unseen.
 */
export function toggleTankCard() {
  const s = useShell.getState();
  const ui = useUI.getState();
  const covered = s.tankCardOpen && (!!ui.panel || !!ui.selectedCreatureId || PLACEMENT_TOOLS.has(ui.tool) || ui.photoMode || ui.hudHidden);
  const open = !s.tankCardOpen || covered;
  sfx(open ? 'open' : 'close');
  if (open) {
    // the one-card rules (cardDock) close panels / the creature card when the card opens; a covered card is
    // already "open", so clear what covers it here
    const patch: Parameters<typeof ui.set>[0] = {};
    if (ui.panel && ui.panel !== 'settings' && ui.panel !== 'dev') {
      patch.panel = null;
      patch.panelTarget = null;
    }
    if (ui.selectedCreatureId) patch.selectedCreatureId = null;
    if (PLACEMENT_TOOLS.has(ui.tool)) patch.tool = 'none';
    if (Object.keys(patch).length) ui.set(patch);
  }
  const param = open ? guideWaterParam() : null;
  s.set({ tankCardOpen: open, openParam: param });
  if (open) tutorialFlag('opened_tank_card');
}

function useThrottledReason(tankId: string, status: string): string {
  const [reason, setReason] = useState('');
  useEffect(() => {
    const read = () => {
      const g = useGame.getState().game;
      setReason(g && tankId ? safe('tankStatusReason', () => tankStatusReason(g, tankId, { sep: '\n' }), '') : '');
    };
    read();
    const id = window.setInterval(read, 2000);
    return () => window.clearInterval(id);
  }, [tankId, status]);
  return reason;
}

const STATUS_ICON = { good: CircleCheck, watch: TriangleAlert, danger: OctagonAlert } as const;
const STATUS_WORD = { good: 'Healthy', watch: 'Watch', danger: 'Danger' } as const;

export function TankBar() {
  const focused = useUI((s) => s.focusedTankId);
  const view = useUI((s) => s.view);
  const tankCardOpen = useDockedCard() === 'tank';
  const info = useGame(
    useShallow((s) => {
      const g = s.game;
      if (!g) return { has: false, id: '', name: '', st: 'good' as const, tierId: '', idx: -1, n: 0, food: null as 'out' | 'low' | null };
      const t = focused ? g.tanks[focused] : null;
      const lvl = t?.cache.foodLevel;
      const food = lvl === 'low' || lvl === 'out' ? lvl : null;
      return {
        has: true,
        id: t?.id ?? '',
        name: t?.name ?? '',
        st: (t?.cache.status ?? 'good') as keyof typeof STATUS_ICON,
        tierId: t?.tierId ?? '',
        idx: t ? g.tankOrder.indexOf(t.id) : -1,
        n: g.tankOrder.length,
        food,
      };
    }),
  );
  // the one-line "why" behind the status word (tooltip); throttled — it runs the water report
  const reason = useThrottledReason(info.id, info.st);
  if (!info.has) return null;
  const { id, name, st, tierId, idx, n, food } = info;
  const Icon = STATUS_ICON[st] ?? CircleCheck;
  const gallons = tierId ? safe('tier', () => getTankTier(tierId).gallons, 0) : 0;
  return (
    <div className="ag-tankbar">
      <div className="ag-hudpill ag-switcher">
        <button type="button" className="ag-switcher__arrow" data-testid="tank-prev" aria-label="Previous tank" disabled={n < 2} onClick={() => cycleTank(-1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="ag-switcher__label" aria-live="polite">
          <span className="ag-switcher__name" title={id ? name : undefined}>{id ? name : 'No tank'}</span>
          <span className={clsx('ag-switcher__status', `is-${st}`)} title={reason || undefined} data-testid="tank-status">
            <Icon size={12} aria-hidden /> {STATUS_WORD[st]}
            {food && (
              <span className={clsx('ag-switcher__food', `is-${food}`)} title={food === 'out' ? 'Out of food for this tank — restock in Market › Supplies' : 'Food for this tank is running low'}>
                {' '}· {food === 'out' ? 'No food' : 'Food low'}
              </span>
            )}
            {gallons > 0 && <span className="ag-switcher__gal"> · {gallons} gal</span>}
            {n > 1 && <span className="ag-switcher__gal"> · {idx + 1}/{n}</span>}
          </span>
        </div>
        <button type="button" className="ag-switcher__arrow" data-testid="tank-next" aria-label="Next tank" disabled={n < 2} onClick={() => cycleTank(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <button
        type="button"
        className={clsx('ag-hudpill ag-hudbtn', tankCardOpen && 'is-on')}
        data-testid="tank-card-toggle"
        data-tutorial-id="tank-card-toggle"
        aria-pressed={tankCardOpen}
        aria-label="Tank card: water, equipment and care"
        disabled={!id}
        onClick={toggleTankCard}
      >
        <ClipboardList size={16} aria-hidden />
        <span className="ag-hudbtn__label">Tank card</span>
      </button>
      <button
        type="button"
        className="ag-hudpill ag-hudbtn"
        data-testid="view-toggle"
        data-tutorial-id="view-toggle"
        aria-label={view === 'tank' ? 'Show the whole room' : 'Return to the tank'}
        onClick={toggleView}
      >
        {view === 'tank' ? <LayoutGrid size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
        <span className="ag-hudbtn__label">{view === 'tank' ? 'Room' : 'Tank'}</span>
      </button>
    </div>
  );
}
