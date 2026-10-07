/**
 * The phone More sheet (0.5 spec §5.3, §18; `#/more`): the destinations that don't fit the tab bar, as a 3-column grid
 * of tiles, and a Settings row. A tile closes More and opens its panel; a locked destination still opens (its panel
 * says what unlocks it, §5.7) and its tile carries a lock badge. The root is an `.ag-popover` (outside taps close it,
 * Escape closes it, focus returns to the More tab) and keeps focus inside while open. OWNER: lane "ui-shell".
 */
import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Lock, Settings, X } from 'lucide-react';
import { useUI } from '@/state/ui';
import { useGameSelector } from '@/state/game';
import { useDevMode } from '@/state/devTools'; // lane:core (PLAT-005)
import { sfx } from '@/audio/sfx';
import { useShell } from '../common/shellStore';
import { useIsMobile } from '../common/safe';
import { openPanel } from './Dock';
import { MORE_ITEMS } from './TabBar';
import { AttnDot, useNavDots } from './AttnDot'; // lane:notify

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function closeMore() {
  if (useShell.getState().popover === 'more') useShell.getState().set({ popover: null });
}

export function MoreSheet() {
  const open = useShell((s) => s.popover === 'more');
  const mobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const unlocked = useGameSelector((g) => g.progress.unlocked.join('|'), '');
  const dev = useDevMode();
  const dots = useNavDots(MORE_ITEMS);
  const panel = useUI((s) => s.panel);
  const selected = useUI((s) => s.selectedCreatureId);
  const tankCard = useShell((s) => s.tankCardOpen);
  const shown = open && mobile;

  // More is a place of its own: a panel or card opened from elsewhere (a toast, a link) puts it away, and so does
  // leaving the phone layout (a rotation to a wide screen has no More tab to close it with)
  useEffect(() => {
    if (open && (panel || selected || tankCard || !mobile)) closeMore();
  }, [open, panel, selected, tankCard, mobile]);

  // focus moves to the sheet's title when it opens, and Tab / Shift+Tab stay inside it (§18)
  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('.ag-more__title')?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const a = document.activeElement as HTMLElement | null;
      const inside = !!a && ref.current.contains(a);
      if (e.shiftKey && (!inside || a === first || a === ref.current.querySelector('.ag-more__title'))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || a === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [shown]);

  const isUnlocked = (key?: string | null) => !key || dev || unlocked.split('|').includes(key);
  const go = (id: (typeof MORE_ITEMS)[number]['id'], target: string | null) => {
    useShell.getState().set({ popover: null });
    openPanel(id, target);
  };

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          ref={ref}
          key="more"
          className="ag-more ag-popover"
          data-testid="more-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ag-more-title"
          data-occlude="bottom"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 34, stiffness: 340 }}
        >
          <div className="ag-more__head">
            <h2 className="ag-more__title" id="ag-more-title" tabIndex={-1}>
              More
            </h2>
            <button type="button" className="ag-more__close" aria-label="Close More" onClick={() => { sfx('close'); closeMore(); }}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="ag-more__grid">
            {MORE_ITEMS.map((it) => {
              const Icon = it.icon;
              const locked = !isUnlocked(it.lock);
              const dot = locked ? undefined : dots[it.id];
              return (
                <button
                  key={it.id}
                  type="button"
                  className={clsx('ag-more__tile', locked && 'is-locked')}
                  data-testid={`more-${it.id}`}
                  data-tutorial-id={`more-${it.id}`}
                  aria-label={locked ? `${it.label} (locked)` : dot ? `${it.label} — ${dot.label}` : undefined}
                  onClick={() => go(it.id, dot?.target ?? null)}
                >
                  <span className="ag-more__chip">
                    <Icon size={20} aria-hidden />
                    {locked && (
                      <span className="ag-more__lock" aria-hidden>
                        <Lock size={9} />
                      </span>
                    )}
                    {dot && <AttnDot level={dot.level} className="ag-more__attn" testId={`more-badge-${it.id}`} />}
                  </span>
                  <span className="ag-more__label">{it.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="ag-more__row"
            data-testid="more-settings"
            onClick={() => {
              sfx('open');
              useShell.getState().set({ popover: null });
              useUI.getState().set({ panel: 'settings' });
            }}
          >
            <span className="ag-more__chip ag-more__chip--sm">
              <Settings size={18} aria-hidden />
            </span>
            <span className="ag-more__rowtext">
              <span className="ag-more__rowtitle">Settings</span>
              <span className="ag-more__rowsub">Saves, sound, notifications</span>
            </span>
            <ChevronRight size={18} aria-hidden className="ag-more__chev" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
