/**
 * chunk 19 (ADR-0055 decision 3, QOL-004) — the Find anything palette: the top bar's search button (phones: More),
 * ⌘K / Ctrl+K and / open it; typing searches the whole game (searchIndex.ts); arrow keys move, Enter goes, Escape
 * closes. Mounted by GameHUD. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Lock, CornerDownLeft, X } from 'lucide-react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSharedMode } from '@/state/sharedMode';
import { sfx } from '@/audio/sfx';
import { useSocialAvailable } from '../online/mode';
import { useShell } from '../common/shellStore';
import { isTextEntry } from '../common/safe';
import { go } from '../nav/router';
import { startTour } from '../tutorial/tourStore';
import { findAnything, orderResults, type FindGo, type FindResult } from './searchIndex';

import { useFind } from './findStore';
export { useFind };

export function openFind(): void {
  if (useUI.getState().screen !== 'game') return;
  sfx('open');
  useShell.getState().set({ popover: null });
  useFind.setState({ open: true });
}
export function closeFind(): void {
  if (useFind.getState().open) useFind.setState({ open: false });
}

/** Go where a result points. */
export function goFind(to: FindGo): void {
  const ui = useUI.getState();
  switch (to.kind) {
    case 'route':
      go(to.route);
      return;
    case 'panel':
      ui.set({ panel: to.panel, panelTarget: to.target });
      return;
    case 'tank':
      ui.set({ focusedTankId: to.tankId, view: 'tank', panel: null, selectedCreatureId: null });
      useShell.getState().set({ tankCardOpen: true });
      return;
    case 'creature':
      go({ kind: 'creature', creatureId: to.creatureId });
      return;
    case 'tour':
      startTour();
      return;
  }
}

/** ⌘K / Ctrl+K anywhere in the game, and / when not typing, open the palette. */
export function useFindKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUI.getState().screen !== 'game' || useFind.getState().open) return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && !e.altKey && k === 'k') {
        e.preventDefault();
        openFind();
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTextEntry(e.target) && !document.querySelector('.ag-modal-backdrop')) {
        e.preventDefault();
        openFind();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function FindAnything() {
  const open = useFind((s) => s.open);
  return <AnimatePresence>{open && <Palette key="find" />}</AnimatePresence>;
}

/** How often the open palette re-reads the world (the query re-searches at once): the index is the whole game. */
const REFRESH_MS = 1500;

function Palette() {
  // (a snapshot, not every tick: rebuilding the index four times a second grew with the game — reviewer note)
  const [game, setGame] = useState(() => useGame.getState().game);
  useEffect(() => {
    const t = window.setInterval(() => setGame(useGame.getState().game), REFRESH_MS);
    return () => window.clearInterval(t);
  }, []);
  const social = useSocialAvailable();
  const shared = useSharedMode((s) => s.club !== null);
  const [q, setQ] = useState('');
  // the highlighted result, by its key: the 1.5 s refresh can reorder the list, and Enter must open what's highlighted
  // (null: the first)
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
  /** A result was chosen: focus stays where the destination puts it (a panel's title), not back on the opener. */
  const went = useRef(false);
  const results = useMemo(() => (game ? orderResults(findAnything(game, q, { social, tour: !shared })) : []), [game, q, social, shared]);
  const active = Math.max(0, activeKey ? results.findIndex((r) => r.key === activeKey) : 0);
  const setActive = (i: number) => setActiveKey(results[Math.max(0, Math.min(results.length - 1, i))]?.key ?? null);
  useEffect(() => setActiveKey(null), [q]);
  useEffect(() => {
    // (autoFocus puts the caret in the box at once; this is the fallback, and never takes focus back from Close)
    const t = window.setTimeout(() => {
      if (!document.activeElement?.closest('.ag-find')) input.current?.focus();
    }, 20);
    const back = opener.current;
    return () => {
      window.clearTimeout(t);
      if (!went.current) {
        // (opened from the phone's More, the opener left with More: its tab, or the top bar's button, instead)
        const shown = (sel: string) => {
          const el = document.querySelector<HTMLElement>(sel);
          return el && el.offsetParent !== null ? el : null;
        };
        const to = back && document.contains(back) ? back : shown('[data-testid="hud-find"]') ?? shown('[data-testid="dock-more"]');
        to?.focus({ preventScroll: true });
        return;
      }
      // a result was chosen: the destination keeps the focus it took (a panel's title). A sheet that took none
      // (Settings, opened from this box rather than a button) gets it here, so the keyboard isn't left on the page.
      const a = document.activeElement;
      if (!a || a === document.body || !document.contains(a)) document.querySelector<HTMLElement>('.pn-sheet:not(.is-aside) .pn-head__title, .ag-sheet .ag-sheet__close')?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-find-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (r: FindResult | undefined) => {
    if (!r) return;
    sfx('click');
    went.current = true;
    closeFind();
    goFind(r.go);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    const inInput = e.target === input.current;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      sfx('close');
      closeFind();
    } else if (e.key === 'Tab') {
      // aria-modal: Tab stays in the box (the box and Close; the results are reached with the arrows)
      e.preventDefault();
      const stops = [input.current, closeBtn.current].filter((x): x is HTMLInputElement | HTMLButtonElement => !!x);
      const at = stops.indexOf(document.activeElement as HTMLInputElement | HTMLButtonElement);
      stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
    } else if (e.key === 'ArrowDown' && inInput) {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp' && inInput) {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter' && inInput) {
      // (Enter on Close closes, on a result goes there: their own clicks)
      e.preventDefault();
      choose(results[active]);
    }
  };

  let lastGroup = '';
  return (
    <motion.div className="ag-find-backdrop" data-testid="find-anything" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onPointerDown={(e) => { if (e.target === e.currentTarget) closeFind(); }} onKeyDown={onKey}>
      <motion.div
        className="ag-find"
        role="dialog"
        aria-modal="true"
        aria-label="Find anything"
        // (a click on blank space — a group's heading, "Nothing found" — keeps the focus where it was, in the box: it fell
        // to the page, and Tab and Escape then left the box — reviewer note)
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest('input, button')) e.preventDefault();
        }}
        initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
        <div className="ag-find__bar">
          <Search size={18} aria-hidden />
          <input
            ref={input}
            className="ag-find__input"
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="ag-find-results"
            aria-activedescendant={results[active] ? `ag-find-${active}` : undefined}
            aria-label="Find anything"
            placeholder="Find anything: animals, gear, research, screens…"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="find-input"
          />
          <button ref={closeBtn} type="button" className="ag-find__close" aria-label="Close" onClick={() => closeFind()} data-testid="find-close">
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="ag-find__results" id="ag-find-results" role="listbox" aria-label="Results" ref={list}>
          {results.length === 0 && (
            <p className="ag-find__none" data-testid="find-none">
              Nothing found for “{q.trim()}”.
            </p>
          )}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={r.key} className="ag-find__item">
                {head && <div className="ag-find__group" role="presentation">{head}</div>}
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  id={`ag-find-${i}`}
                  aria-selected={i === active}
                  data-find-index={i}
                  data-testid={`find-result-${r.key}`}
                  className={clsx('ag-find__row', i === active && 'is-active')}
                  onPointerMove={() => i !== active && setActiveKey(r.key)}
                  onClick={() => choose(r)}
                >
                  <span className="ag-find__title">{r.title}</span>
                  {r.locked && (
                    <span className="ag-find__lock">
                      <Lock size={11} aria-hidden /> Locked
                    </span>
                  )}
                  {r.detail && <span className="ag-find__detail">{r.detail}</span>}
                  {i === active && <CornerDownLeft size={14} aria-hidden className="ag-find__enter" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="ag-find__foot" aria-hidden>
          <span>↑ ↓ to move</span>
          <span>Enter to go</span>
          <span>Esc to close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
