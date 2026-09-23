/**
 * Upcoming tab: the show calendar as cards — tier, classes (with how many of your animals could enter), fee, purse,
 * deadline countdown and an Enter button. Locked tiers show what unlocks them. OWNER: lane "shows".
 */
import { useMemo } from 'react';
import clsx from 'clsx';
import { CalendarClock, Hourglass, Lock, Trophy, ArrowRight, Info } from 'lucide-react';
import type { GameState, Show } from '@/types';
import { SHOW_CLASS_BY_ID, SHOW_TIERS } from '@/data/shows';
import { upcomingShows, classEligibleCounts, showClosedReason, tierOpen, tierLockHint } from '@/sim/shows';
import { Button } from '@/ui/kit';
import { Card, Chip, EmptyState, Tile } from '../common/parts';
import { safe } from '../common/hooks';
import { TierBadge, Rosette } from './Ribbons';
import { gameWhen, money, purseRange, realIn } from './util';

export function UpcomingTab({ g, onEnter }: { g: GameState; onEnter: (showId: string) => void }) {
  const s = g.shows;
  const now = g.clock.hour;
  const list = useMemo(() => (s ? upcomingShows(s).filter((x) => x.judgingHour > now) : []), [s, now]);
  const stats = s?.stats;
  return (
    <div className="pn-stack">
      {!stats || stats.entered === 0 ? (
        <div className="sh-hero">
          <span className="sh-hero__art" aria-hidden>
            <Rosette place={1} size={30} />
          </span>
          <h3 className="sh-hero__title">The show circuit</h3>
          <div className="sh-hero__text">
            Enter your best animals and aquascapes. Judges score each entry against its class standard — genes and care count, and a calm animal that trusts you shows better.
          </div>
          <div className="sh-note">
            <Info size={13} aria-hidden />
            <span>Show day is a game abstraction: entries are benched at the hall for the judging and home by evening. They stay in your tank, and come back a little unsettled.</span>
          </div>
        </div>
      ) : (
        <div className="sh-note">
          <Info size={13} aria-hidden />
          <span>Only healthy, settled adults travel. Genes and care count, and a calm animal that trusts you shows better.</span>
        </div>
      )}
      {stats && stats.entered > 0 && (
        <div className="sh-tiles">
          <Tile label="Shown" value={stats.entered} />
          <Tile label="Ribbons" value={stats.placings} />
          <Tile label="Class wins" value={stats.wins} />
          <Tile label="Prizes" value={money(stats.prize)} />
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState icon={<CalendarClock size={26} />} title="No shows announced yet">
          The clubs post their calendars in a moment — check back shortly.
        </EmptyState>
      ) : (
        <div className="sh-showlist">
          {list.map((show) => (
            <ShowCard key={show.id} g={g} show={show} onEnter={() => onEnter(show.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ShowCard({ g, show, onEnter }: { g: GameState; show: Show; onEnter: () => void }) {
  const now = g.clock.hour;
  const tier = SHOW_TIERS[show.tier];
  const open = tierOpen(g, show.tier);
  const counts = useMemo(() => (open ? safe(() => classEligibleCounts(g, show), {}) : {}), [g, show, open]);
  const closed = safe(() => showClosedReason(g, show), null);
  const mine = (g.shows?.entries ?? []).filter((e) => e.showId === show.id && e.status === 'entered');
  const toDeadline = show.deadlineHour - now;
  const toJudging = show.judgingHour - now;
  const soon = toDeadline > 0 && toDeadline < 3;
  const anyEligible = Object.values(counts).some((c) => c.eligible > 0);
  return (
    <Card className={clsx('sh-show', !open && 'sh-show--locked', mine.length > 0 && 'sh-show--mine')} testId={`show-card-${show.id}`}>
      <div className="sh-show__top">
        <TierBadge tier={show.tier} locked={!open} />
        <span className={clsx('sh-show__when', toJudging < 4 && 'is-soon')} title={`Judging ${gameWhen(show.judgingHour)} (game time)`}>
          <Trophy size={12} aria-hidden /> Judging in {realIn(toJudging)}
        </span>
      </div>
      <div>
        <h4 className="sh-show__name">{show.name}</h4>
        <div className="sh-show__host">
          {show.tier === 'club' ? `A friendly table show · judge ${show.judge}` : `${tier.name} show · judge ${show.judge}`}
        </div>
      </div>
      <div className="sh-classes" aria-label="Classes">
        {show.classes.map((cl) => {
          const def = SHOW_CLASS_BY_ID[cl.classId];
          if (!def) return null;
          const locked = !!def.requires && !g.progress.unlocked.includes(def.requires);
          const n = counts[cl.classId]?.eligible ?? 0;
          return (
            <span key={cl.classId} className={clsx('sh-class-chip', locked && 'is-locked', !locked && n === 0 && 'is-none')} title={locked ? 'Aquascape classes open with Aquascape Awards' : def.blurb}>
              {locked && <Lock size={11} aria-hidden />}
              {def.short}
              {open && !locked && <b aria-label={`${n} of yours eligible`}>{n}</b>}
            </span>
          );
        })}
      </div>
      <div className="sh-show__money">
        <span className="sh-purse">
          Purse <strong>{purseRange(show.classes.map((c) => c.purse))}</strong> per class
        </span>
        <span>
          Entry <strong>{money(show.fee)}</strong>
        </span>
        <span>
          Up to <strong>{tier.maxEntries}</strong> entries
        </span>
      </div>
      {mine.length > 0 && (
        <div className="sh-mine">
          {mine.map((e) => (
            <Chip key={e.id} tone="aqua">
              {e.name} · {SHOW_CLASS_BY_ID[e.classId]?.short ?? e.classId}
            </Chip>
          ))}
        </div>
      )}
      <div className="sh-show__foot">
        {!open ? (
          <div className="sh-show__lock">
            <Lock size={14} aria-hidden />
            <span>{safe(() => tierLockHint(g, show.tier), `${tier.name} shows are locked.`)}</span>
          </div>
        ) : (
          <span className={clsx('sh-show__deadline', soon && 'is-soon')} title={`Entries close ${gameWhen(show.deadlineHour)} (game time)`}>
            <Hourglass size={12} aria-hidden style={{ verticalAlign: '-2px', marginRight: 4 }} />
            {toDeadline > 0 ? `Entries close in ${realIn(toDeadline)} at 1×` : 'Entries closed'}
          </span>
        )}
        {open && (
          <Button size="sm" variant={anyEligible && !closed ? 'primary' : 'default'} disabled={!!closed && !closed.startsWith('You have the most')} onClick={onEnter} data-testid={`show-enter-${show.id}`} title={closed ?? undefined}>
            {closed && closed.startsWith('You have the most') ? 'View' : 'Enter'} <ArrowRight size={14} aria-hidden />
          </Button>
        )}
      </div>
      {open && closed && !closed.startsWith('Entries have closed') && !closed.startsWith('You have the most') && <div className="pn-tiny pn-muted">{closed}</div>}
    </Card>
  );
}
