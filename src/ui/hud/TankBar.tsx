/**
 * Tank switcher (prev/next + name + status), facility ⇄ tank view toggle, tank card toggle. OWNER: lane "ui-shell".
 * lane:notify — attention dots: the Tank card button carries the focused tank's dot (amber watch / red danger, live:
 * it goes when the problem is fixed), and the arrow that reaches the most urgent OTHER tank soonest carries that
 * tank's dot. Rules: ../common/notify.ts.
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, LayoutGrid, Maximize2, ClipboardList, CircleCheck, TriangleAlert, OctagonAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGame, useGameSelector } from '@/state/game';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { getTankTier } from '@/data/catalog/tanks';
import { tutorialChain } from '@/data/quests';
import { useShell } from '../common/shellStore';
import { safe } from '../common/safe';
import { tutorialFlag } from '../common/actions';
import { PLACEMENT_TOOLS, useDockedCard } from './cardDock';
import { tankStatusReason } from '../common/tankStatus';
import { nearestAttention, tankAttention, ATTENTION_WORD } from '../common/notify'; // lane:notify
import { AttnDot, useTankAttentionLevel } from './AttnDot'; // lane:notify

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

function useThrottledReason(tankId: string, status: string): { reason: string; extra: string[]; gear: boolean } {
  const [r, setR] = useState<{ reason: string; extra: string[]; gear: boolean }>({ reason: '', extra: [], gear: false });
  useEffect(() => {
    const read = () => {
      const g = useGame.getState().game;
      const reason = g && tankId ? safe('tankStatusReason', () => tankStatusReason(g, tankId, { sep: '\n' }), '') : '';
      // lane:notify — what else needs a look beyond the status line (food running low, broken or idle gear)
      const att = g && tankId ? safe('tankAttention', () => tankAttention(g, tankId), null) : null;
      const said = reason.split('\n');
      const extra = (att?.items ?? []).filter((i) => !said.includes(i.text)).map((i) => i.text);
      const gear = !!att?.items.some((i) => (i.source === 'gear' || i.source === 'fit') && !said.includes(i.text));
      setR((p) => (p.reason === reason && p.gear === gear && p.extra.join('\n') === extra.join('\n') ? p : { reason, extra, gear }));
    };
    read();
    const id = window.setInterval(read, 2000);
    return () => window.clearInterval(id);
  }, [tankId, status]);
  return r;
}

/** lane:notify — the arrow that reaches the most urgent other tank soonest (its dot), with that tank named. */
function useOtherTankCue(focused: string | null): { dir: 1 | -1; level: 'watch' | 'danger'; name: string } | null {
  const key = useGameSelector((g) => {
    const n = nearestAttention(g, focused);
    return n ? `${n.dir}|${n.level}|${g.tanks[n.tankId]?.name ?? ''}` : '';
  }, '');
  if (!key) return null;
  const [dir, level, ...name] = key.split('|');
  return { dir: dir === '-1' ? -1 : 1, level: level as 'watch' | 'danger', name: name.join('|') };
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
  // lane:notify — the focused tank's dot (Tank card button) and the cue towards another tank that needs a look
  const attn = useTankAttentionLevel(info.id);
  const other = useOtherTankCue(info.id || null);
  // the one-line "why" behind the status word (tooltip); throttled — it runs the water report
  const { reason, extra, gear } = useThrottledReason(info.id, `${info.st}:${attn}`);
  if (!info.has) return null;
  const { id, name, st, tierId, idx, n, food } = info;
  const Icon = STATUS_ICON[st] ?? CircleCheck;
  const gallons = tierId ? safe('tier', () => getTankTier(tierId).gallons, 0) : 0;
  const why = [reason, ...extra].filter(Boolean).join('\n');
  const cardWhy = attn !== 'good' ? `${ATTENTION_WORD[attn]} — ${[reason.replace(/\n/g, ' · '), ...extra].filter(Boolean).join(' · ') || 'needs a look'}` : '';
  const arrowCue = (dir: 1 | -1) => (other && other.dir === dir && n > 1 ? other : null);
  const arrowLabel = (dir: 1 | -1) => {
    const base = dir === 1 ? 'Next tank' : 'Previous tank';
    const c = arrowCue(dir);
    return c ? `${base} — ${c.name} needs attention (${ATTENTION_WORD[c.level]})` : base;
  };
  return (
    <div className="ag-tankbar">
      <div className="ag-hudpill ag-switcher">
        <button type="button" className="ag-switcher__arrow" data-testid="tank-prev" aria-label={arrowLabel(-1)} title={arrowCue(-1) ? arrowLabel(-1) : undefined} disabled={n < 2} onClick={() => cycleTank(-1)}>
          <ChevronLeft size={18} />
          {arrowCue(-1) && <AttnDot level={arrowCue(-1)!.level} className="ag-switcher__attn" testId="tank-prev-attn" />}
        </button>
        <div className="ag-switcher__label" aria-live="polite">
          <span className="ag-switcher__name" title={id ? name : undefined}>{id ? name : 'No tank'}</span>
          <span className={clsx('ag-switcher__status', `is-${st}`)} title={why || undefined} data-testid="tank-status">
            <Icon size={12} aria-hidden /> {STATUS_WORD[st]}
            {food && (
              <span className={clsx('ag-switcher__food', `is-${food}`)} title={food === 'out' ? 'Out of food for this tank — restock in Market › Supplies' : 'Food for this tank is running low'}>
                {' '}· {food === 'out' ? 'No food' : 'Food low'}
              </span>
            )}
            {/* lane:notify — broken gear, or gear that can't help these animals (the Tank card's Equipment tab says which) */}
            {gear && (
              <span className="ag-switcher__food is-low ag-switcher__gear" title={extra.join('\n')}>
                {' '}· Check gear
              </span>
            )}
            {gallons > 0 && <span className="ag-switcher__gal"> · {gallons} gal</span>}
            {n > 1 && <span className="ag-switcher__gal"> · {idx + 1}/{n}</span>}
          </span>
        </div>
        <button type="button" className="ag-switcher__arrow" data-testid="tank-next" aria-label={arrowLabel(1)} title={arrowCue(1) ? arrowLabel(1) : undefined} disabled={n < 2} onClick={() => cycleTank(1)}>
          <ChevronRight size={18} />
          {arrowCue(1) && <AttnDot level={arrowCue(1)!.level} className="ag-switcher__attn" testId="tank-next-attn" />}
        </button>
      </div>
      <button
        type="button"
        className={clsx('ag-hudpill ag-hudbtn ag-has-attn', tankCardOpen && 'is-on')}
        data-testid="tank-card-toggle"
        data-tutorial-id="tank-card-toggle"
        data-attention={attn}
        aria-pressed={tankCardOpen}
        aria-label={`Tank card: water, equipment and care${cardWhy ? ` — ${cardWhy}` : ''}`}
        title={cardWhy || undefined}
        disabled={!id}
        onClick={toggleTankCard}
      >
        <ClipboardList size={16} aria-hidden />
        <span className="ag-hudbtn__label">Tank card</span>
        {attn !== 'good' && <AttnDot level={attn} className="ag-hudbtn__attn" testId="tank-card-attn" />}
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
