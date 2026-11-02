/**
 * chunk 19 (ADR-0055 decision 6, QOL-007) — the shared shop's controls as a dropdown from the top-left name pill, in
 * place of chunk 13's strip above the dock (it ran into the Front · Orbit · Follow · Close chips between about 900 and
 * 1,100 px and took two rows on a phone). The pill shows who's here; the dropdown holds the strip's words and controls
 * unchanged (SHARED-SHOPS.md §8, ADR-0050): "Shared · {shop} · Here: …", the owner's members list (pause and speed,
 * spending), Money and "Back to my aquarium". OWNER: lane "social".
 */
import { useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronDown, Moon, Sun, Users } from 'lucide-react';
import { useSharedMode } from '@/state/sharedMode';
import { useGameSelector } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { Button } from '../kit';
import { formatClock, dayOf, hourOfDay } from '@/sim/time';
import { useShell } from '../common/shellStore';
import { onScreen, useShared } from './store';
import { leaveSharedShop } from './session';
import { SHARED_WORDS as W } from './words';
import { SharedMoneyButton, SharedMoneySheet } from './SharedMoney';
import { MembersList } from './SharedScreens';
import './shared.css';

/** In a shared shop, on screen: the pill replaces the clock pill (TopBar). */
export function useInSharedShop(): boolean {
  const shared = useSharedMode((s) => s.club !== null);
  const phase = useShared((s) => s.phase);
  return shared && onScreen(phase);
}

/** "{n} here" — how many members are on screen now (the words are drafted for the owner, ADR-0055 decision 8). */
export const hereCount = (n: number): string => `${n} here`;

/**
 * The top-left pill in a shared shop: the shop's name, who's here and the day and time (phones: who's here and the
 * time); it opens the dropdown.
 */
export function SharedPill({ compact }: { compact?: boolean }) {
  const shop = useShared((s) => s.shopName);
  const here = useShared((s) => s.members.filter((m) => m.here).length);
  const hour = useGameSelector((g) => g.clock.hour, 0);
  const open = useShell((s) => s.popover === 'shared');
  const [money, setMoney] = useState(false);
  const h = hourOfDay(hour);
  const night = h < 6.5 || h >= 20;
  const day = dayOf(hour);
  return (
    <div className="ag-popanchor ag-shared-anchor">
      <button
        type="button"
        className={clsx('ag-hudpill ag-clock-pill ag-shared-pill', open && 'is-open', compact && 'is-compact')}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${W.cardTitle}: ${shop}. ${hereCount(here)}. Day ${day}, ${formatClock(hour)}`}
        data-testid="shared-strip"
        onClick={() => {
          sfx(open ? 'close' : 'open');
          useShell.getState().togglePopover('shared');
        }}
      >
        {compact ? (
          // phones: two short lines, so the speed buttons keep their room ("👥 2 ▾" over the time)
          <>
            <span className="ag-shared-pill__here">
              <Users size={12} aria-hidden className="ag-shared-pill__icon" />
              <span className="ag-tabular" data-testid="shared-here-count">{here}</span>
              <ChevronDown size={12} aria-hidden className="ag-shared-pill__chev" />
            </span>
            <span className="ag-clock-pill__time ag-shared-pill__time" data-testid="hud-clock">
              <span className="ag-tabular">{formatClock(hour)}</span>
            </span>
          </>
        ) : (
          <>
            <span className="ag-clock-pill__shop ag-shared-pill__shop">
              {shop}
              <ChevronDown size={14} aria-hidden className="ag-shared-pill__chev" />
            </span>
            <span className="ag-clock-pill__time" data-testid="hud-clock">
              <Users size={13} aria-hidden className="ag-shared-pill__icon" />
              <span className="ag-tabular" data-testid="shared-here-count">{hereCount(here)}</span>
              <span className="ag-clock-pill__sep" aria-hidden>
                ·
              </span>
              {night ? <Moon size={12} aria-hidden className="ag-clock-pill__icon is-night" /> : <Sun size={12} aria-hidden className="ag-clock-pill__icon" />}
              <span>Day {day}</span>
              <span className="ag-tabular">{formatClock(hour)}</span>
            </span>
          </>
        )}
      </button>
      <AnimatePresence>{open && <SharedMenu key="shared-menu" onMoney={() => setMoney(true)} />}</AnimatePresence>
      <SharedMoneySheet open={money} onClose={() => setMoney(false)} />
    </div>
  );
}

/** The dropdown: who's here, the owner's members list, Money and the way back. */
function SharedMenu({ onMoney }: { onMoney: () => void }) {
  const shop = useShared((s) => s.shopName);
  const members = useShared((s) => s.members);
  const owner = useShared((s) => !!s.you?.owner);
  const here = members.filter((m) => m.here).map((m) => m.name);
  const close = () => useShell.getState().set({ popover: null });
  return (
    <motion.div
      className="ag-popover ag-shared-menu"
      role="dialog"
      aria-label={W.cardTitle}
      data-testid="shared-menu"
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
    >
      <p className="ag-shared-menu__who" data-testid="shared-strip-text">
        <Users size={14} aria-hidden /> <span>{W.strip(shop, here)}</span>
      </p>
      {owner && <MembersList inline />}
      <div className="ag-shared-menu__actions">
        <SharedMoneyButton
          onOpen={() => {
            close();
            onMoney();
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="ag-shared-menu__back"
          onClick={() => {
            close();
            void leaveSharedShop();
          }}
          data-testid="shared-back"
        >
          <ArrowLeft size={14} aria-hidden /> {W.back}
        </Button>
      </div>
    </motion.div>
  );
}
