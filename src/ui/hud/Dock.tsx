/**
 * Bottom dock: the management destinations. Locked items show a lock badge and open a locked panel (0.5 spec §5.7).
 * OWNER: lane "ui-shell".
 * lane:notify — attention dots (top-right of the icon): Tanks — a tank other than the one in view needs a look
 * (amber/red, live; the one in view has its dot on the Tank card button); Shows — new
 * results (opens Shows › Results, which marks them seen); Market — bids waiting for an answer; Research — a project
 * finished since it was last open; a newly unlocked destination until first opened. Rules: ../common/notify.ts.
 */
import clsx from 'clsx';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Box, Fish, Store, Users, Hammer, FlaskConical, Wallet, BookOpen, Settings, Lock, Wrench, type LucideProps } from 'lucide-react';
import { useUI, type PanelId } from '@/state/ui';
import { useGameSelector, getGame } from '@/state/game';
import { tutorialStepId } from '@/sim/facility';
import { safe } from '../common/safe';
import { useDevMode } from '@/state/devTools'; // lane:core (PLAT-005)
import { sfx } from '@/audio/sfx';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { tutorialFlag } from '../common/actions';
import { Trophy } from 'lucide-react'; // lane:shows
import { AttnDot, useNavDots } from './AttnDot'; // lane:notify

interface DockItem {
  id: PanelId;
  label: string;
  icon: ComponentType<LucideProps>;
  /** Unlock key that gates it (null = always open). */
  lock?: string | null;
  hint?: string;
}

export const DOCK_ITEMS: DockItem[] = [
  { id: 'tanks', label: 'Tanks', icon: Box },
  { id: 'livestock', label: 'Livestock', icon: Fish },
  { id: 'market', label: 'Market', icon: Store },
  { id: 'visitors', label: 'Visitors', icon: Users, lock: 'visitors', hint: 'Grow your reputation to open your doors to visitors.' },
  { id: 'shows', label: 'Shows', icon: Trophy, lock: 'shows', hint: 'Finish the guide (or reach 20 reputation) to enter club shows.' }, // lane:shows
  { id: 'build', label: 'Build', icon: Hammer },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'encyclopedia', label: 'Encyclopedia', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** While the guide is on a step that needs a particular panel section, open straight to it. */
export function guideTarget(id: PanelId): string | null {
  const g = getGame();
  const t = g?.progress?.tutorial;
  if (!g || g.isShowcase || !t || t.done || t.skipped || id !== 'build') return null;
  const stepId = safe('tutorialStepId', () => tutorialStepId(g), null);
  if (stepId === 'habitat') return (g.progress.tutorial.starterId || g.starterId) === 'ocellaris_clownfish' ? 'decor-cat:hardscape' : 'decor-cat:plant';
  if (stepId === 'upgrade') return (g.progress.tutorial.starterId || g.starterId) === 'ocellaris_clownfish' ? 'tab:equipment' : 'tab:tanks';
  return null;
}

export function openPanel(id: PanelId, target: string | null = null) {
  const ui = useUI.getState();
  if (target == null && ui.panel !== id) target = guideTarget(id);
  if (ui.panel === id && target == null) {
    sfx('close');
    ui.set({ panel: null, panelTarget: null });
  } else {
    sfx('open');
    ui.set({ panel: id, panelTarget: target });
    tutorialFlag(`opened_${id}`);
    tutorialFlag(`opened_panel:${id}`);
  }
}

/** Edge fades that tell the player the dock scrolls (phones). */
function useScrollFades() {
  const ref = useRef<HTMLDivElement>(null);
  const [f, setF] = useState({ l: false, r: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const l = el.scrollLeft > 4;
      const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setF((p) => (p.l === l && p.r === r ? p : { l, r }));
    };
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(upd) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', upd);
      ro?.disconnect();
    };
  }, []);
  return { ref, fades: f };
}

export function Dock() {
  const panel = useUI((s) => s.panel);
  const { ref, fades } = useScrollFades();
  // keep the open panel's button in view when the dock scrolls
  useEffect(() => {
    if (!panel || !ref.current) return;
    ref.current.querySelector<HTMLElement>(`[data-testid="dock-${panel}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [panel, ref]);
  const unlocked = useGameSelector((g) => g.progress.unlocked.join('|'), '');
  const dev = useDevMode();
  const isUnlocked = (key?: string | null) => !key || dev || unlocked.split('|').includes(key);
  // lane:notify — attention dots (lane:w2-ui's show-results count badge became one of them)
  const badges = useNavDots(DOCK_ITEMS);
  return (
    <nav className={clsx('ag-dock', fades.l && 'has-more-left', fades.r && 'has-more-right')} aria-label="Management">
      <div className="ag-dock__scroll" ref={ref}>
        {DOCK_ITEMS.map((it) => {
          const open = isUnlocked(it.lock);
          const Icon = it.icon;
          const hint = it.hint ?? (it.lock ? (UNLOCK_KEYS as Record<string, string>)[it.lock] : undefined);
          const badge = open && panel !== it.id ? badges[it.id] : undefined; // lane:w2-ui / lane:notify — not on the open panel
          return (
            <button
              key={it.id}
              type="button"
              className={clsx('ag-dock__item', panel === it.id && 'is-active', !open && 'is-locked')}
              data-testid={`dock-${it.id}`}
              data-tutorial-id={`dock-${it.id}`}
              aria-pressed={panel === it.id}
              aria-label={open ? (badge ? `${it.label} — ${badge.label}` : it.label) : `${it.label} (locked): ${hint ?? ''}`}
              title={open ? (badge ? `${it.label} — ${badge.label}` : it.label) : hint}
              onClick={() => {
                // lane:ui-shell (chunk 1, §5.7) — a locked destination opens its panel, which says what unlocks it
                // (it used to only toast `lockedToast`); a badge opens straight to what it counts (e.g. Shows › Results)
                openPanel(it.id, badge && panel !== it.id ? badge.target : null);
              }}
            >
              <span className="ag-dock__icon">
                <Icon size={20} aria-hidden />
                {!open && (
                  <span className="ag-dock__lock" aria-hidden>
                    <Lock size={10} />
                  </span>
                )}
                {badge && <AttnDot level={badge.level} className="ag-dock__attn" testId={`dock-badge-${it.id}`} />}
              </span>
              <span className="ag-dock__label">{it.label}</span>
            </button>
          );
        })}
        {dev && (
          <button
            type="button"
            className={clsx('ag-dock__item ag-dock__item--dev', panel === 'dev' && 'is-active')}
            aria-label="Developer tools"
            onClick={() => openPanel('dev')}
          >
            <span className="ag-dock__icon">
              <Wrench size={20} aria-hidden />
            </span>
            <span className="ag-dock__label">Dev</span>
          </button>
        )}
      </div>
    </nav>
  );
}
