/**
 * "While you were away" card after Continue/Load (core's bounded offline catch-up summary). OWNER: lane "ui-shell".
 *
 * lane:w2-ui — says honestly how long the player was away (real time) and how much the aquarium actually simulated
 * (game time, capped at OFFLINE_CAP_HOURS), explains the grace period warmly (nobody dies while you're away), then
 * lists what matters with a way to act on it: births, sales, bids waiting, show results, staff notes.
 */
import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Coins, Egg, Store, ShieldCheck, HeartPulse, Trophy, Users, Gavel, ChevronRight } from 'lucide-react';
import type { GameEvent, GameState } from '@/types';
import { useResume, type OfflineSummary } from '@/persistence';
import { useUI, type PanelId } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { placeWord } from '@/sim/shows';
import { SHOW_CLASS_BY_ID } from '@/data/shows';
import { formatMoney, Button } from '../kit';
import { safe } from '../common/safe';
import { EventIcon } from './eventIcons';

function hoursText(h: number) {
  // lane:w2-ui — round before choosing the unit (0.995 h read "60 minutes")
  const m = Math.round(h * 60);
  if (m < 60) return `${Math.max(1, m)} minute${m === 1 ? '' : 's'}`;
  if (Math.round(h) < 48) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`;
  return `${Math.round(h / 24)} days`;
}

/** Real time away: "3 days", "5 hours", "20 minutes" (null under a minute). */
function awayText(ms: number): string | null {
  const min = ms / 60000;
  if (!(min >= 1)) return null;
  if (min < 60) return `${Math.round(min)} minute${Math.round(min) === 1 ? '' : 's'}`;
  const h = min / 60;
  if (h < 36) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

interface Row {
  key: string;
  icon: ReactNode;
  text: string;
  /** Deep link: panel + panelTarget. */
  go?: { panel: PanelId; target: string | null; label: string };
  testId?: string;
}

/** What happened that the player can act on, from the summary plus the game as it is now. */
function whatHappened(g: GameState | null, summary: OfflineSummary): { rows: Row[]; staffIds: Set<string>; activeListings: Set<string> } {
  const rows: Row[] = [];
  const staffIds = new Set<string>();
  const activeListings = new Set<string>();
  if (!g) return { rows, staffIds, activeListings };
  const from = summary.startHour - 1e-6;
  const to = summary.endHour + 1e-6;
  // show results judged while away (best placing first)
  const results = (g.shows?.entries ?? []).filter((e) => (e.status === 'judged' || e.status === 'scratched') && (e.judgedHour ?? -1) >= from && (e.judgedHour ?? -1) <= to);
  if (results.length) {
    const best = [...results].filter((e) => e.status === 'judged' && e.rank).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0];
    const cls = best ? SHOW_CLASS_BY_ID[best.classId]?.short : undefined;
    const bestText = best
      ? best.rank === 1
        ? `${best.name} won${cls ? ` ${cls}` : ''}${best.bestInShow ? ' and Best in Show' : ''}`
        : `${best.name} placed ${safe('placeWord', () => placeWord(best.rank!), `#${best.rank}`)}${cls ? ` in ${cls}` : ''}`
      : 'an entry stayed home';
    rows.push({ key: 'shows', icon: <Trophy size={14} aria-hidden className="ag-evicon--gold" />, text: `Show results are in: ${bestText}${results.length > 1 ? ` (+${results.length - 1} more)` : ''}.`, go: { panel: 'shows', target: 'tab:results', label: 'See results' }, testId: 'welcome-go-shows' });
  }
  // bids waiting on active listings (as of now, not only new ones)
  let bids = 0;
  let listings = 0;
  for (const l of g.market?.listings ?? []) {
    if (l.status !== 'active') continue;
    const open = l.bids.filter((b) => b.status === 'open').length;
    if (open) {
      listings++;
      activeListings.add(l.id);
    }
    bids += open;
  }
  if (bids > 0) rows.push({ key: 'bids', icon: <Gavel size={14} aria-hidden className="ag-evicon--aqua" />, text: `${plural(bids, 'bid')} waiting on ${listings === 1 ? 'your listing' : `${listings} listings`}.`, go: { panel: 'market', target: 'tab:listings', label: 'Review bids' }, testId: 'welcome-go-bids' });
  // staff notes: what the team flagged while you were away (newest first)
  const roster = g.staff?.roster ?? [];
  if (roster.length) {
    const names = roster.map((m) => m.name.split(' ')[0]).filter(Boolean);
    const notes = g.log.filter((e) => e.hour >= from && e.hour <= to && (e.kind === 'warning' || e.kind === 'danger') && names.some((n) => e.text.startsWith(`${n} `) || e.text.startsWith(`${n}:`)));
    for (const e of notes) staffIds.add(e.id);
    const feeds = roster.reduce((a, m) => a + (m.today?.feeds ?? 0), 0);
    const latest = notes[notes.length - 1];
    // first clause only ("Maya couldn’t feed the betta in Betta Row"): the full note is in the log / Staff tab
    const brief = (t: string) => t.split(/ — |\. (?=[A-Z])/)[0].replace(/\.$/, '');
    const text = latest ? `${brief(latest.text)}${notes.length > 1 ? ` (+${notes.length - 1} more note${notes.length > 2 ? 's' : ''})` : ''}.` : feeds > 0 ? `Your team kept up the rounds — ${plural(feeds, 'feed')} so far today.` : `Your team kept things ticking over.`;
    rows.push({ key: 'staff', icon: <Users size={14} aria-hidden className={latest ? 'ag-evicon--watch' : 'ag-evicon--aqua'} />, text, go: latest ? { panel: 'visitors', target: 'staff', label: 'Staff' } : undefined, testId: 'welcome-go-staff' });
  }
  return { rows, staffIds, activeListings };
}

export function WelcomeBack() {
  const summary = useResume((s) => s.summary);
  const screen = useUI((s) => s.screen);
  const clear = useResume((s) => s.clear);
  const show = !!summary && screen === 'game';
  // The card is a snapshot of the moment you came back: read the game once per summary (no per-tick re-render).
  const happened = useMemo(() => (summary ? safe('welcome', () => whatHappened(useGame.getState().game, summary), { rows: [], staffIds: new Set<string>(), activeListings: new Set<string>() }) : null), [summary]);
  // lane:qa-play — "Market special … today only" from hours ago isn't news worth greeting the player with
  const covered = (e: GameEvent) =>
    (e.kind === 'market' && e.text.startsWith('Market special')) ||
    happened?.staffIds.has(e.id) ||
    // "X offered $29 for …" on a listing that the "bids waiting" row already covers
    (e.kind === 'market' && !!e.listingId && !!happened?.activeListings.has(e.listingId)) ||
    // show results + open bids have their own rows
    (!!happened?.rows.some((r) => r.key === 'shows') && /judge’s card/.test(e.text));
  const highlights = (summary?.highlights ?? []).filter((e) => !covered(e));
  // only lines with something to say: no lone "$0", no "0 bids"
  const stats: { key: string; icon: ReactNode; text: string }[] = [];
  if (summary) {
    const money = Math.round(summary.moneyDelta ?? 0);
    if (money !== 0) stats.push({ key: 'money', icon: <Coins size={14} aria-hidden />, text: `${formatMoney(money, { sign: true })} ${money > 0 ? 'earned' : 'spent'}` });
    // births are animals; a clutch is eggs / a brood on the way (not "1 new arrival" for 45 eggs)
    if ((summary.births ?? 0) > 0) stats.push({ key: 'born', icon: <Egg size={14} aria-hidden />, text: plural(summary.births, 'new arrival') });
    if ((summary.newClutches ?? 0) > 0) stats.push({ key: 'clutch', icon: <Egg size={14} aria-hidden />, text: plural(summary.newClutches, 'new clutch', 'new clutches') });
    if (summary.sales > 0) stats.push({ key: 'sales', icon: <Store size={14} aria-hidden />, text: plural(summary.sales, 'sale') });
    else if (summary.bidsReceived > 0 && !happened?.rows.some((r) => r.key === 'bids')) stats.push({ key: 'bidsin', icon: <Store size={14} aria-hidden />, text: `${plural(summary.bidsReceived, 'new bid')}` });
  }
  const away = summary ? awayText(summary.realElapsedMs) : null;
  const ran = summary ? hoursText(summary.hours) : '';
  const go = (r: Row) => {
    if (!r.go) return;
    sfx('open');
    clear();
    useUI.getState().set({ panel: r.go.panel, panelTarget: r.go.target });
  };
  const rows = happened?.rows ?? [];
  const quiet = stats.length === 0 && highlights.length === 0 && rows.length === 0;
  return (
    <AnimatePresence>
      {show && summary && (
        <motion.section
          className="ag-welcome"
          role="dialog"
          aria-label="While you were away"
          data-testid="welcome-back"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.4 }}
        >
          <div className="ag-overline">
            <Moon size={12} aria-hidden /> While you were away
          </div>
          <h3 className="ag-welcome__title">{away ? `Away ${away}` : 'Welcome back'}</h3>
          {/* honest about the cap: real absence vs. what the aquarium actually lived through */}
          <p className="ag-welcome__text" data-testid="welcome-ran">
            {summary.capped ? (
              <>
                {/* lane:qa-final — "game time": next to "Away 3 hours" (real time), a bare "ran 12 hours" read as a contradiction */}
                Your aquarium ran <strong>{ran}</strong> of game time — the safety cap, so a long absence never snowballs.
              </>
            ) : (
              <>
                Your aquarium ran <strong>{ran}</strong> of game time at normal speed.
              </>
            )}
          </p>
          <div className="ag-welcome__grace" data-testid="welcome-grace">
            <ShieldCheck size={15} aria-hidden />
            <span>
              <strong>Everyone made it.</strong> While you’re away, a grace period keeps every animal on basic rations and out of danger.
            </span>
          </div>
          {summary.deathsPrevented > 0 && (
            <div className="ag-welcome__grace is-watch">
              <HeartPulse size={15} aria-hidden />
              <span>
                {plural(summary.deathsPrevented, 'animal')} had a rough patch and {summary.deathsPrevented === 1 ? 'was' : 'were'} pulled through. Check on {summary.deathsPrevented === 1 ? 'it' : 'them'} soon.
              </span>
            </div>
          )}
          {stats.length > 0 && (
            <div className="ag-welcome__stats">
              {stats.map((st) => (
                <span key={st.key}>
                  {st.icon} {st.text}
                </span>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <ul className="ag-welcome__rows">
              {rows.map((r) => (
                <li key={r.key}>
                  <span className="ag-welcome__rowicon">{r.icon}</span>
                  <span className="ag-grow">{r.text}</span>
                  {r.go && (
                    <button type="button" className="ag-welcome__go" data-testid={r.testId} onClick={() => go(r)}>
                      {r.go.label} <ChevronRight size={13} aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {highlights.length > 0 && (
            <ul className="ag-welcome__list">
              {highlights.slice(-(rows.length >= 2 ? 2 : 4)).map((e) => (
                <li key={e.id}>
                  <EventIcon kind={e.kind} size={14} /> <span>{e.text}</span>
                </li>
              ))}
            </ul>
          )}
          {quiet && <p className="ag-welcome__text">All quiet — everyone is doing fine.</p>}
          <Button variant="primary" block onClick={clear} data-testid="welcome-close">
            Back to the aquarium
          </Button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
