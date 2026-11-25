/**
 * chunk 21 (C, "What next?") — the sheet the tank bar's button opens: the most useful thing to do now as one big
 * button, and up to three more under it (the ranking: ./nextBest.ts). Pressing an action goes there and closes the
 * sheet (./goNext.ts). With nothing to do it says so and offers the collection.
 *
 * Its own chunk (chunk 21 review S3): WhatNext.tsx, in the main chunk, loads it when the pointer or the focus reaches
 * the button, when it opens, or a few seconds after the HUD is up, with the ranking and the way there, so the main
 * chunk carries only the button.
 *
 * The sheet is one of the shell's popovers (`popover: 'next'`), so it closes as they do: Escape, a press elsewhere,
 * another popover opening. It takes the focus when it opens (its title, as a panel does, §18; the arrow keys and Tab
 * reach the actions) and gives it back to the button when it closes without a choice; a choice that goes somewhere
 * leaves it where the destination puts it. It re-reads the game every 1.5 s while open (the ranking walks every tank:
 * never on each 4 Hz publish), and it is a phone's full-width sheet under the tank bar, or on a computer a dropdown
 * under the button. OWNER: lane "next" (chunk 21).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { motion } from 'motion/react';
import { BookOpen, Box, ChevronRight, CircleCheck, Compass, Gift, Hourglass, LockOpen, OctagonAlert, ScrollText, Store, TriangleAlert, Utensils, X, type LucideIcon } from 'lucide-react';
import { useGame } from '@/state/game';
import { useSettings } from '@/state/settings';
import { useSharedMode } from '@/state/sharedMode';
import { sfx } from '@/audio/sfx';
import { IconButton } from '../kit';
import { useShell } from '../common/shellStore';
import { safe, useIsMobile, useMedia } from '../common/safe';
import { convertTempText } from '../common/format';
import { FINE_POINTER } from '../tutorial/guideText';
import { useShared } from '../shared/store';
import { nextBestActions, nothingUrgent, type NextAction, type NextRule } from './nextBest';
import { goNext } from './goNext';
import './next-sheet.css';

/** How many actions the sheet shows: the top one and three more. */
export const NEXT_SHOWN = 4;
/** How often the open sheet re-reads the game. */
const REFRESH_MS = 1500;

const ICON: Record<NextRule, LucideIcon> = {
  danger: OctagonAlert,
  guide: Compass,
  empty: Store,
  hungry: Utensils,
  care: TriangleAlert,
  expiring: Hourglass,
  ready: Gift,
  unlock: LockOpen,
  quest: ScrollText,
  collect: BookOpen,
};
const TONE: Record<NextRule, 'danger' | 'watch' | 'guide' | 'calm'> = {
  danger: 'danger',
  guide: 'guide',
  empty: 'watch',
  hungry: 'watch',
  care: 'watch',
  expiring: 'watch',
  ready: 'calm',
  unlock: 'calm',
  quest: 'calm',
  collect: 'calm',
};
/** An action's icon: its rule's, but the tank's (the tab bar's Tanks cube) for "No tank · Buy one". */
const iconOf = (a: NextAction): LucideIcon => (a.key === 'empty:tank' ? Box : ICON[a.rule]);

/** On a computer the sheet hangs under the button, kept on screen (phones: CSS puts it under the tank bar). */
function useDropPosition(enabled: boolean): { left: number; top: number; maxHeight: number } | null {
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (!enabled) {
      setPos(null);
      return;
    }
    const place = () => {
      const btn = document.querySelector<HTMLElement>('[data-testid="hud-next"]');
      const r = btn?.getBoundingClientRect();
      if (!r || r.width === 0) return;
      const width = Math.min(400, window.innerWidth - 32);
      const left = Math.round(Math.max(16, Math.min(r.left, window.innerWidth - width - 16)));
      const top = Math.round(r.bottom + 10);
      // (it ends above the dock's line: 72 px of dock, the 16 px edge and a little air)
      const maxHeight = Math.max(200, Math.min(620, window.innerHeight - top - 100));
      setPos((p) => (p && p.left === left && p.top === top && p.maxHeight === maxHeight ? p : { left, top, maxHeight }));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [enabled]);
  return pos;
}

/** Is this control on screen (laid out, not hidden; not the page itself)? (A fixed-position anchor has no offsetParent.) */
const onScreen = (el: HTMLElement | null): el is HTMLElement => !!el && el !== document.body && document.contains(el) && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible';

export function NextSheet() {
  // (a snapshot, refreshed: the ranking reads every tank's report)
  const [game, setGame] = useState(() => useGame.getState().game);
  useEffect(() => {
    const t = window.setInterval(() => setGame(useGame.getState().game), REFRESH_MS);
    return () => window.clearInterval(t);
  }, []);
  const fine = useMedia(FINE_POINTER);
  const phone = useIsMobile();
  const unit = useSettings((s) => s.tempUnit);
  const hints = useSettings((s) => s.showTutorialHints);
  const shared = useSharedMode((s) => s.club !== null);
  const youId = useShared((s) => s.you?.id ?? null);
  const youOwner = useShared((s) => !!s.you?.owner);
  const list = useMemo(
    () => safe('nextBestActions', () => nextBestActions(game, { fine, hints, member: shared && youId ? { id: youId, owner: youOwner } : null }), [] as NextAction[]),
    [game, fine, hints, shared, youId, youOwner],
  );
  const shown = list.slice(0, NEXT_SHOWN);
  const calm = nothingUrgent(list);
  const pos = useDropPosition(!phone);
  const listRef = useRef<HTMLOListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
  /** An action went somewhere: the focus stays where the destination puts it. */
  const went = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!document.activeElement?.closest('.ag-next-pop')) titleRef.current?.focus({ preventScroll: true });
    }, 30);
    const back = opener.current;
    return () => {
      window.clearTimeout(t);
      const a = document.activeElement;
      const lost = !a || a === document.body || !document.contains(a) || !!a.closest('.ag-next-pop');
      if (!lost) return; // (the player moved on: a press elsewhere put the focus there)
      if (went.current) {
        // the destination took no focus (a sheet opened from here): its title or close button, so the keyboard isn't lost
        document.querySelector<HTMLElement>('.pn-sheet:not(.is-aside) .pn-head__title, .ag-sheet .ag-sheet__close')?.focus({ preventScroll: true });
        return;
      }
      const visible = (el: HTMLElement | null) => (onScreen(el) ? el : null);
      (visible(back) ?? visible(document.querySelector<HTMLElement>('[data-testid="hud-next"]')))?.focus({ preventScroll: true });
    };
  }, []);

  const close = () => {
    sfx('close');
    useShell.getState().set({ popover: null });
  };
  const choose = (a: NextAction) => {
    sfx('click');
    // (only once it really goes: "Keep editing" in the listing wizard's question leaves the focus to come back here)
    goNext(a.to, () => {
      went.current = true;
    });
  };
  // the arrow keys move between the actions (Tab works too)
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (!items.length) return;
    e.preventDefault();
    const down = e.key === 'ArrowDown';
    // (from the title or Close: the first action going down, the last going up)
    items[at < 0 ? (down ? 0 : items.length - 1) : (at + (down ? 1 : -1) + items.length) % items.length]?.focus();
  };
  if (!game) return null;
  return (
    <motion.div
      className="ag-popover ag-next-pop"
      role="dialog"
      aria-labelledby="ag-next-title"
      data-testid="next-sheet"
      style={pos ? { position: 'fixed', left: pos.left, top: pos.top, maxHeight: pos.maxHeight } : undefined}
      onKeyDown={onKey}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <div className="ag-next-pop__head">
        <h2 id="ag-next-title" className="ag-next-pop__title" tabIndex={-1} ref={titleRef}>
          What next?
        </h2>
        <IconButton label="Close" className="ag-iconbtn--quiet" data-testid="next-close" onClick={close}>
          <X size={18} />
        </IconButton>
      </div>
      {calm && (
        <p className="ag-next-pop__calm" data-testid="next-calm">
          <CircleCheck size={16} aria-hidden /> You’re all caught up. Nothing needs you right now.
        </p>
      )}
      <ol className="ag-next-list" ref={listRef}>
        {shown.map((a, i) => {
          const Icon = iconOf(a);
          return (
            <li key={a.key}>
              <button
                type="button"
                className={clsx('ag-next-item', i === 0 && 'is-top', `is-${TONE[a.rule]}`)}
                data-testid={`next-action-${i}`}
                data-next-key={a.key}
                data-rule={a.rule}
                onClick={() => choose(a)}
              >
                <span className="ag-next-item__icon" aria-hidden>
                  <Icon size={i === 0 ? 18 : 16} />
                </span>
                <span className="ag-next-item__text">
                  {a.where && <span className="ag-next-item__where">{a.where}</span>}
                  <span className="ag-next-item__title">{a.title}</span>
                  <span className="ag-next-item__why">{convertTempText(a.why, unit) ?? a.why}</span>
                </span>
                <ChevronRight size={16} aria-hidden className="ag-next-item__go" />
              </button>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
