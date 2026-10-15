/**
 * Operations › Problems (`#/operations/issues`; DESIGN-S3D §7.6; AUTO-035): a card per item, with what happens next and
 * what the player can do. Salt: low, out or arriving, a "when" table and Buy / Raise budget (Hire a stock manager
 * without one, ADR-0026 decision 14; at the level's maximum "Raise budget" gives way to its reason, decision 10). A
 * paused line: why it waits (the chain), Add a quarantine tank, or Wait; once decided it reads "Resumes Day {d}".
 * IssueAction is each item's main button, shared with the Overview and the alerts drawer. OWNER: lane "automation".
 */
import { useState } from 'react';
import { ArrowDown, ArrowLeft, CircleCheck, Factory, Heart, Plus, ShieldCheck, Sprout, TriangleAlert, OctagonAlert } from 'lucide-react';
import type { GameState } from '@/types';
import { Button, formatMoney } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { formatClock, dayOf } from '@/sim/time';
import { STOCK_BUDGET } from '@/data/staff';
import { getFacilityLevel } from '@/data/facilities';
import { batchGal, batchSaltKg, saltWaterPerDay, type SupplyProblem } from '@/sim/automation';
import { findLine, quarantineBusyUntil, quarantineKit } from '@/sim/production';
import { lineView } from '@/sim/production/view';
import type { OpsSnapshot } from '@/ui/common/ops';
import { AddQuarantine } from '../livestock/Production';
import { Status, Kicker } from './parts';
import { budgetAtMax, issueViews, nextMixHour, saltBuyLabel, whenText, type IssueView } from './issues';
import { buyEggTin, buySaltBag, buyVegPack, doWait, markDecided } from './actions';
import type { OpsNav } from './OperationsPanel';

const staff = () => go({ kind: 'panel', panel: 'visitors', tab: 'staff' });

/** An item's main action (long label on desktop, short on phone). `testId` is set by the caller's place. */
export function IssueAction({ g, issue, nav, short, testId }: { g: GameState; issue: IssueView; nav: OpsNav; short?: boolean; testId?: string }) {
  const a = issue.action;
  if (!a) return null;
  const label = short ? a.short : a.label;
  const desk = g.progress.unlocked.includes('operations_desk');
  const run = () => {
    switch (a.id) {
      case 'buy-salt':
        buySaltBag(40);
        return;
      case 'buy-eggs':
        buyEggTin();
        return;
      case 'buy-veg':
        buyVegPack();
        return;
      case 'why':
        if (desk) nav.view('issues');
        else nav.tab(issue.tab);
        return;
      case 'feed':
        nav.tab('feed');
        return;
      case 'faster-prep':
        go({ kind: 'panel', panel: 'build', tab: 'facility', target: 'room:water' });
        return;
      default:
        staff();
    }
  };
  return (
    <Button size="sm" className={a.id.startsWith('buy') ? 'ops-buy' : undefined} data-testid={testId} onClick={run}>
      {label}
    </Button>
  );
}

export function ProblemsView({ g, snap, nav }: { g: GameState; snap: OpsSnapshot; nav: OpsNav }) {
  const issues = issueViews(g, snap.problems);
  const supplies = issues.filter((i) => i.kind !== 'line');
  const lines = issues.filter((i) => i.kind === 'line');
  return (
    <>
      <button type="button" className="ops-link" onClick={() => nav.view(null)} data-testid="ops-issues-back">
        <ArrowLeft size={15} aria-hidden /> Overview
      </button>
      {!issues.length && !snap.decided.length ? (
        <section className="ops-card ops-card--good" data-testid="issues-none">
          <div className="ops-card__head">
            <CircleCheck size={18} aria-hidden style={{ color: 'var(--c-good)' }} />
            <h3 className="ops-card__title">Nothing needs you right now</h3>
          </div>
          <span className="ops-card__body">Shortages and stopped lines show up here first.</span>
        </section>
      ) : (
        <div className="ops-cols">
          <div className="ops-col">
            {supplies.map((i) => (i.kind === 'salt' ? <SaltCard key={i.key} g={g} issue={i} /> : <SupplyCard key={i.key} g={g} issue={i} nav={nav} />))}
          </div>
          <div className="ops-col">
            {lines.map((i) => (
              <LineCard key={i.key} g={g} issue={i} />
            ))}
            {snap.decided.map((d) => (
              <section key={d.lineId} className="ops-card" data-testid="issues-line-decided">
                <div className="ops-card__head">
                  <Factory size={16} aria-hidden />
                  <h3 className="ops-card__title">{d.name}</h3>
                  <Status tone="watch" icon="time">
                    Resumes Day {d.restartDay}
                  </Status>
                </div>
                <span className="ops-card__body">It restarts by itself; no animals are lost.</span>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Head({ issue }: { issue: IssueView }) {
  return (
    <div className="ops-card__head">
      {issue.tone === 'danger' ? <OctagonAlert size={17} aria-hidden style={{ color: 'var(--c-danger)' }} /> : <TriangleAlert size={17} aria-hidden style={{ color: 'var(--c-watch)' }} />}
      <h3 className="ops-card__title">{issue.title}</h3>
      <Status tone={issue.tone} icon={issue.tone === 'danger' ? 'danger' : 'watch'}>
        {issue.badge}
      </Status>
    </div>
  );
}

/** The salt card: reason, the "when" table, Buy and Raise budget (or its stand-ins). */
function SaltCard({ g, issue }: { g: GameState; issue: IssueView }) {
  const p = issue.problem as SupplyProblem;
  const room = g.facility.water;
  const now = g.clock.hour;
  const batchKg = room ? batchSaltKg(batchGal(room)) : 4.1;
  const mix = nextMixHour(now);
  const lvl = getFacilityLevel(g.facility.level);
  const max = STOCK_BUDGET[g.facility.level]?.max ?? 0;
  const rows: { t: string; tone?: 'watch' | 'danger'; text: string }[] = [];
  if (p.state === 'arriving') {
    rows.push({ t: whenText(p.arrives ?? now, now), text: 'The stock manager buys salt mix at the check.' }); // ADR-0032
    if (p.shortDay !== undefined) rows.push({ t: `Day ${p.shortDay}`, text: 'No water change is skipped.' });
  } else if (p.state === 'out') {
    const ready = room?.mix && room.mix.readyHour > now ? `, plus ${Math.floor(room.mix.gal)} gal mixing (ready ${formatClock(room.mix.readyHour)})` : '';
    rows.push({ t: 'Now', text: `Salt water: ${Math.floor(room?.salt ?? 0)} gal${ready}.` });
    if (p.shortDay !== undefined) rows.push({ t: `Day ${p.shortDay}`, tone: 'danger', text: `The salt tanks’ water changes are skipped, not done weak, unless salt arrives (they use about ${Math.round(saltWaterPerDay(g))} gal a day).` }); // ADR-0032
  } else {
    rows.push({ t: whenText(mix, now), tone: 'watch', text: p.stock < 2 * batchKg ? `The batch uses the last ${Math.round(p.stock * 10) / 10} kg.` : `The batch uses ${batchKg.toFixed(1)} kg.` });
    if (p.shortDay !== undefined) rows.push({ t: `Day ${p.shortDay}`, tone: 'watch', text: 'The salt tanks run short of salt water unless salt arrives.' });
  }
  const raise =
    p.why === 'no_manager' ? (
      <Button size="sm" onClick={staff}>
        Hire a stock manager
      </Button>
    ) : p.state === 'arriving' ? (
      <Button size="sm" onClick={staff}>
        Staff
      </Button>
    ) : budgetAtMax(g) ? (
      <span className="ops-muted">{lvl.id === 'grand_hall' ? `The highest budget (${formatMoney(max)})` : `The most for a ${lvl.name} (${formatMoney(max)})`}</span>
    ) : p.why === 'orders_off' ? (
      <Button size="sm" onClick={() => go({ kind: 'panel', panel: 'operations', tab: 'overview', target: 'view:manual' })}>
        Orders are off
      </Button>
    ) : (
      <Button size="sm" data-testid="issues-raise-budget" onClick={staff}>
        Raise budget
      </Button>
    );
  return (
    <section className={`ops-card ops-card--${issue.tone}`} data-testid="issues-salt">
      <Head issue={issue} />
      <span className="ops-card__body">{issue.reason}</span>
      <div className="ops-when">
        {rows.map((r) => (
          <FragmentRow key={r.t} t={r.t} tone={r.tone} text={r.text} />
        ))}
      </div>
      <div className="ops-card__actions">
        <Button className="ops-buy" data-testid="issues-buy-salt" onClick={() => buySaltBag(40)}>
          {p.state === 'arriving' ? issue.action?.label : saltBuyLabel}
        </Button>
        {raise}
      </div>
      {p.state !== 'arriving' && dayOf(now) < (p.shortDay ?? Infinity) && <span className="ops-muted">Salt mix · {Math.round(p.stock * 10) / 10} kg in stock</span>}
    </section>
  );
}

function FragmentRow({ t, tone, text }: { t: string; tone?: 'watch' | 'danger'; text: string }) {
  return (
    <>
      <span className={`ops-when__t${tone ? ` ops-when__t--${tone}` : ''}`}>{t}</span>
      <span>{text}</span>
    </>
  );
}

/** Eggs, vegetables, live food, fresh water: reason and the main action. */
function SupplyCard({ g, issue, nav }: { g: GameState; issue: IssueView; nav: OpsNav }) {
  return (
    <section className={`ops-card ops-card--${issue.tone}`} data-testid={`issues-${issue.kind}`}>
      <Head issue={issue} />
      <span className="ops-card__body">{issue.reason}</span>
      <div className="ops-card__actions">
        <IssueAction g={g} issue={issue} nav={nav} testId={`issues-${issue.kind}-action`} />
      </div>
    </section>
  );
}

/** A paused line: what it waits for (the chain), then Add a quarantine tank or Wait. */
function LineCard({ g, issue }: { g: GameState; issue: IssueView }) {
  const [adding, setAdding] = useState(false);
  const p = issue.problem;
  if (p.kind !== 'line') return null;
  const line = findLine(g, p.lineId);
  const v = line ? lineView(g, line) : null;
  if (!line || !v) return null;
  const breed = g.tanks[line.tanks.breed];
  const raise = g.tanks[line.tanks.raise];
  const m = g.creatures[line.pair.motherId];
  const f = g.creatures[line.pair.fatherId];
  const places = v.raising.places;
  const busy = line.tanks.quarantine.map((id) => ({ id, until: quarantineBusyUntil(g, id) })).filter((q) => q.until !== null);
  const qt = busy[0] ? g.tanks[busy[0].id] : v.quarantine;
  const kit = quarantineKit(g, line.id);
  return (
    <section className={`ops-card ops-card--${issue.tone}`} data-testid="issues-line">
      <Head issue={issue} />
      <span className="ops-card__body">
        {raise?.name ?? 'The raise tank'} is full, so {m?.name ?? 'the pair'} and {f?.name ?? 'its partner'} are kept apart until there’s room. No animals are lost; the line restarts by itself.
      </span>
      <div className="ops-chain">
        <div className="ops-chain__step ops-chain__step--good">
          <Heart size={15} aria-hidden />
          <div className="ops-row__main">
            <span className="ops-row__title">{breed?.name ?? 'Breed tank'}</span>
            <span className="ops-row__sub">
              {m?.name ?? '?'} × {f?.name ?? '?'} wait
            </span>
          </div>
        </div>
        <div className="ops-chain__arrow">
          <ArrowDown size={12} aria-hidden /> the next clutch needs {line ? Math.max(1, places ? places.cap : 0) : 0} places
        </div>
        <div className="ops-chain__step ops-chain__step--watch">
          <Sprout size={15} aria-hidden />
          <div className="ops-row__main">
            <span className="ops-row__title">{raise?.name ?? 'Raise tank'} · full</span>
            <span className="ops-row__sub">{places ? `${places.used} of ${places.cap} places` : 'No room for the next clutch'}</span>
          </div>
        </div>
        {qt && (
          <>
            <div className="ops-chain__arrow">
              <ArrowDown size={12} aria-hidden /> then waits for
            </div>
            <div className={`ops-chain__step ${busy.length ? 'ops-chain__step--watch' : 'ops-chain__step--good'}`}>
              <ShieldCheck size={15} aria-hidden />
              <div className="ops-row__main">
                <span className="ops-row__title">
                  {qt.name} · {busy.length ? 'busy' : 'ready'}
                </span>
                <span className="ops-row__sub">{busy.length ? `Busy until Day ${dayOf(busy[0].until!)}` : 'Takes the juveniles once they’re sorted'}</span>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="ops-card__actions">
        {kit && (
          <Button variant="primary" data-testid="issues-add-qt" onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden /> Add a quarantine tank · {formatMoney(kit.price)}
          </Button>
        )}
        <Button data-testid="issues-wait" onClick={() => doWait(line.id, p.restartDay)}>
          Wait · resumes Day {p.restartDay}
        </Button>
      </div>
      {adding && (
        <AddQuarantine
          g={g}
          line={line}
          onClose={() => setAdding(false)}
          onAdded={() => markDecided(line.id) /* capacity added: the item becomes "Resumes Day {d}" (§9.8) */}
        />
      )}
    </section>
  );
}
