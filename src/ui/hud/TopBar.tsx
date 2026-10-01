/**
 * Top bar: shop + clock, speed, money (animated delta), reputation, alerts. OWNER: lane "ui-shell".
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play, FastForward, ChevronsRight, Star, Bell, Sun, Moon } from 'lucide-react';
import { useGame, useGameSelector } from '@/state/game';
import { useSettings } from '@/state/settings';
import type { GameSpeed } from '@/types';
import { incomeCue, sfx } from '@/audio/sfx';
import { formatClock, dayOf, hourOfDay } from '@/sim/time';
import { formatMoney, Segmented } from '../kit';
import { formatRep } from '../common/format';
import { useShell } from '../common/shellStore';
import { AlertsPopover, useAlertCount } from './AlertsPopover';
import { DevToggle } from '../dev/DevToggle'; // lane:perf — keeps DevPanel out of the main chunk

export function setSpeed(s: GameSpeed) {
  const g = useGame.getState().game;
  if (!g) return;
  if (s !== 0) useShell.getState().set({ lastSpeed: s });
  else if (g.clock.speed !== 0) useShell.getState().set({ lastSpeed: g.clock.speed as Exclude<GameSpeed, 0> });
  useGame.getState().mutate((d) => {
    d.clock.speed = s;
  });
}

export function togglePause() {
  const g = useGame.getState().game;
  if (!g) return;
  setSpeed(g.clock.speed === 0 ? useShell.getState().lastSpeed : 0);
}

function AnimatedMoney({ value, short }: { value: number; short?: boolean }) {
  const reduced = useSettings((s) => s.reducedMotion);
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || Math.abs(value - from.current) < 0.5) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 650);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, reduced]);
  return <>{short ? formatMoneyShort(Math.round(shown)) : formatMoney(Math.round(shown))}</>;
}

/** Phones: "$54.4k" so the top bar never overlaps itself (the full amount stays in the label and tooltip). */
function formatMoneyShort(v: number): string {
  const a = Math.abs(v);
  if (a < 10_000) return formatMoney(v);
  const sign = v < 0 ? '−' : '';
  if (a < 1_000_000) return `${sign}$${(a / 1000).toFixed(a < 100_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${sign}$${(a / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
}

function MoneyPill({ compact }: { compact?: boolean }) {
  const money = useGameSelector((g) => g.finance.money, 0);
  const saveId = useGameSelector((g) => g.saveId, '');
  const prev = useRef<{ id: string; v: number } | null>(null);
  const [deltas, setDeltas] = useState<{ id: number; v: number }[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const p = prev.current;
    prev.current = { id: saveId, v: money };
    if (!p || p.id !== saveId) return;
    const d = money - p.v;
    if (Math.abs(d) < 0.5) return;
    const id = ++seq.current;
    setDeltas((list) => {
      // merge with a very recent delta of the same sign
      const last = list[list.length - 1];
      if (last && Math.sign(last.v) === Math.sign(d) && id - last.id < 2) return [...list.slice(0, -1), { id, v: last.v + d }];
      return [...list.slice(-2), { id, v: d }];
    });
    if (d > 0) incomeCue(d); // passive income: sparse, quiet (explicit buy/sell cues come from act())
    timers.current.push(window.setTimeout(() => setDeltas((list) => list.filter((x) => x.id !== id)), 2200));
  }, [money, saveId]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const debt = money < 0;
  return (
    <div className={clsx('ag-hudpill ag-money-pill', debt && 'is-debt')} data-testid="hud-money" aria-label={`Money ${formatMoney(money)}`} title={formatMoney(money)} data-tutorial-id="hud-money">
      <span className="ag-money-pill__coin" aria-hidden>$</span>
      <span className="ag-money-pill__val">
        <AnimatedMoney value={money} short={compact} />
      </span>
      <AnimatePresence>
        {deltas.map((d) => (
          <motion.span
            key={d.id}
            className={clsx('ag-money-delta', d.v > 0 ? 'is-pos' : 'is-neg')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            {formatMoney(d.v, { sign: true })}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ClockPill({ compact }: { compact?: boolean }) {
  const hour = useGameSelector((g) => g.clock.hour, 0);
  const shop = useGameSelector((g) => g.shopName, '');
  const h = hourOfDay(hour);
  const night = h < 6.5 || h >= 20;
  return (
    <div className="ag-hudpill ag-clock-pill">
      {!compact && <div className="ag-clock-pill__shop" title={shop}>{shop}</div>}
      <div className="ag-clock-pill__time" data-testid="hud-clock">
        {night ? <Moon size={13} aria-hidden className="ag-clock-pill__icon is-night" /> : <Sun size={13} aria-hidden className="ag-clock-pill__icon" />}
        <span>Day {dayOf(hour)}</span>
        <span className="ag-clock-pill__sep" aria-hidden>·</span>
        <span className="ag-tabular">{formatClock(hour)}</span>
      </div>
    </div>
  );
}

function SpeedControls() {
  const speed = useGameSelector((g) => g.clock.speed, 1 as GameSpeed);
  return (
    <div className="ag-hudpill ag-speed" data-tutorial-id="speed-controls">
      <Segmented<GameSpeed>
        label="Game speed"
        value={speed}
        testIdPrefix="hud-speed-"
        onChange={(s) => setSpeed(s)}
        items={[
          { id: 0, label: '', title: 'Pause (Space)', icon: <Pause size={15} aria-hidden /> },
          { id: 1, label: '', title: 'Normal speed (1)', icon: <Play size={15} aria-hidden /> },
          { id: 3, label: '', title: 'Fast ×3 (2)', icon: <FastForward size={15} aria-hidden /> },
          { id: 10, label: '', title: 'Very fast ×10 (3)', icon: <ChevronsRight size={17} aria-hidden /> },
        ]}
      />
      <span className="ag-speed__label" aria-hidden>
        {speed === 0 ? 'Paused' : `${speed}×`}
      </span>
    </div>
  );
}

function ReputationPill() {
  const rep = useGameSelector((g) => g.progress.reputation, 0);
  return (
    <div className="ag-hudpill ag-rep-pill" title="Reputation" aria-label={`Reputation ${formatRep(rep)} of 1000`}>
      <Star size={14} aria-hidden className="ag-rep-pill__icon" />
      <span className="ag-tabular">{formatRep(rep)}</span>
    </div>
  );
}

function AlertsButton() {
  const count = useAlertCount();
  const open = useShell((s) => s.popover === 'alerts');
  // News that was toasted (or merged away) since the drawer was last opened.
  const fresh = useGameSelector((g) => {
    let n = 0;
    for (let i = g.log.length - 1; i >= 0 && i >= g.log.length - 60; i--) if (g.log[i].toast && !g.log[i].read) n++;
    return n;
  }, 0);
  return (
    <div className="ag-popanchor">
      <button
        type="button"
        className={clsx('ag-hudpill ag-alerts-btn', count.danger > 0 && 'is-danger', count.danger === 0 && count.watch > 0 && 'is-watch')}
        aria-label={`Alerts and events${count.total ? `: ${count.total} need attention` : ''}${fresh ? ` · ${fresh} new` : ''}`}
        aria-expanded={open}
        data-testid="hud-alerts"
        onClick={() => {
          sfx(open ? 'close' : 'open');
          useShell.getState().togglePopover('alerts');
        }}
      >
        <Bell size={16} aria-hidden />
        {count.total > 0 ? <span className="ag-alerts-btn__count">{count.total}</span> : fresh > 0 && !open ? <span className="ag-alerts-btn__dot" aria-hidden /> : null}
      </button>
      <AnimatePresence>{open && <AlertsPopover />}</AnimatePresence>
    </div>
  );
}

export function TopBar({ compact }: { compact?: boolean }) {
  return (
    <div className="ag-topbar">
      <div className="ag-topbar__left">
        <ClockPill compact={compact} />
      </div>
      <div className="ag-topbar__center">
        <SpeedControls />
      </div>
      <div className="ag-topbar__right">
        <DevToggle />
        {!compact && <ReputationPill />}
        <MoneyPill compact={compact} />
        <AlertsButton />
      </div>
    </div>
  );
}
