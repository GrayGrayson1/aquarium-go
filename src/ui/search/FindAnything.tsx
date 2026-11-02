/**
 * chunk 19 (ADR-0055 decision 3, QOL-004) — the Find anything palette: the top bar's search button (phones: More),
 * ⌘K / Ctrl+K and / open it; typing searches the whole game (searchIndex.ts); arrow keys move, Enter goes, Escape
 * closes. Mounted by GameHUD. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Lock, CornerDownLeft, X } from 'lucide-react';
import { create } from 'zustand';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { useSocialAvailable } from '../online/mode';
import { useShell } from '../common/shellStore';
import { isTextEntry } from '../common/safe';
import { go } from '../nav/router';
import { startTour } from '../tutorial/tourStore';
import { findAnything, orderResults, type FindGo, type FindResult } from './searchIndex';

export const useFind = create<{ open: boolean }>(() => ({ open: false }));

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

function Palette() {
  const game = useGame((s) => s.game);
  const social = useSocialAvailable();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
  const results = useMemo(() => (game ? orderResults(findAnything(game, q, { social })) : []), [game, q, social]);
  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 20);
    const back = opener.current;
    return () => {
      window.clearTimeout(t);
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-find-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (r: FindResult | undefined) => {
    if (!r) return;
    sfx('click');
    closeFind();
    goFind(r.go);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      sfx('close');
      closeFind();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  let lastGroup = '';
  return (
    <motion.div className="ag-find-backdrop" data-testid="find-anything" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onPointerDown={(e) => { if (e.target === e.currentTarget) closeFind(); }} onKeyDown={onKey}>
      <motion.div className="ag-find" role="dialog" aria-modal="true" aria-label="Find anything" initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
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
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="find-input"
          />
          <button type="button" className="ag-find__close" aria-label="Close" onClick={() => closeFind()} data-testid="find-close">
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
                  id={`ag-find-${i}`}
                  aria-selected={i === active}
                  data-find-index={i}
                  data-testid={`find-result-${r.key}`}
                  className={clsx('ag-find__row', i === active && 'is-active')}
                  onPointerMove={() => i !== active && setActive(i)}
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
