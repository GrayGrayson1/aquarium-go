/**
 * Operations › Overview (DESIGN-S3D §7.1; AUTO-030): three layouts by tier. Early (Tier 1 or less): assisted care, the
 * line, dashed locked tiles and the tier ladder. Before the Operations Desk (from the first system beyond Tier 1): a
 * Systems tile for each system the player has, dashed tiles for what's locked, and "What opens up next". From the
 * Desk: Problems first, the Systems tiles, This week and Today (desktop), with the manual-mode banner while on.
 * OWNER: lane "automation" (chunk 5).
 */
import type { ReactNode } from 'react';
import { CalendarClock, ChevronRight, Droplets, Egg, Factory, FlaskConical, Gauge, Hand, Play, ShoppingBag, Sparkles, TrendingUp, TriangleAlert, OctagonAlert, Users, Utensils, Waves, CircleCheck } from 'lucide-react';
import type { GameState } from '@/types';
import { Button, Badge } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { formatClock, dayOf } from '@/sim/time';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { FOOD_ROOM, BRINE, INFUSORIA } from '@/data/catalog/machines';
import { pickAutofeedFood } from '@/sim/care/autofeed';
import { inhabitantsOf } from '@/sim/water/env';
import {
  batchGal,
  batchSaltKg,
  changerOf,
  doserOf,
  freshCap,
  heldSystems,
  isHeld,
  lastChangeHour,
  manualSince,
  saltCap,
  saltWaterNeeded,
  savedThisWeek,
  tankChangeNeed,
  todayJobs,
  weekMoney,
  type ScheduledJob,
} from '@/sim/automation';
import { lineStatus, productionLines } from '@/sim/production';
import { lineView } from '@/sim/production/view';
import { stockManager } from '@/sim/staff/work';
import { opsMemo, opsSnapshot, tierLadder, type OpsSnapshot, type OpsTier } from '@/ui/common/ops';
import { formatMoney } from '@/ui/kit';
import { Status, SystemTile, LockedTile, Ladder, Kicker, OpsBar } from './parts';
import { issueViews, issuesHeader, type IssueView } from './issues';
import { IssueAction } from './Problems';
import { doHoldAll, doResumeAll } from './actions';
import type { OpsNav } from './OperationsPanel';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const gal = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });

export function Overview({ g, snap, tier, nav, small }: { g: GameState; snap: OpsSnapshot; tier: OpsTier; nav: OpsNav; small: boolean }) {
  if (tier.layout === 'early') return <EarlyOverview g={g} tier={tier} nav={nav} small={small} />;
  if (tier.layout === 'before') return <BeforeDesk g={g} snap={snap} tier={tier} nav={nav} small={small} />;
  const issues = issueViews(g, snap.problems);
  return (
    <>
      {snap.manual && <ManualBanner g={g} />}
      <ProblemsCard g={g} issues={issues} counts={snap.counts} nav={nav} small={small} />
      <SystemsGrid g={g} snap={snap} tier={tier} nav={nav} small={small} />
      {small ? (
        <Week g={g} small />
      ) : (
        <div className="ops-cols">
          <Week g={g} small={false} />
          <Today g={g} manual={snap.manual} />
        </div>
      )}
    </>
  );
}

/** Manual mode on: the amber banner leads the Overview (§7.1). */
function ManualBanner({ g }: { g: GameState }) {
  const since = manualSince(g);
  return (
    <section className="ops-card ops-manual" data-testid="ops-manual-banner">
      <div className="ops-card__head">
        <span className="ops-chip">
          <Hand size={18} aria-hidden />
        </span>
        <div className="ops-row__main">
          <h3 className="ops-card__title">Manual mode is on</h3>
          <span className="ops-card__body">Since {since !== null ? formatClock(since) : 'now'}. Nothing is moved, changed, made or listed until you resume.</span>
        </div>
        <Button variant="primary" onClick={doResumeAll} data-testid="ops-resume-all">
          <Play size={15} aria-hidden /> Resume all
        </Button>
      </div>
    </section>
  );
}

const issueIcon = (i: IssueView) => (i.tone === 'danger' ? <OctagonAlert size={16} aria-hidden className="ops-status--danger" /> : <TriangleAlert size={16} aria-hidden style={{ color: 'var(--c-watch)' }} />);

/** Problems first (phone: one card of rows; desktop: a compact card each), or the green all-clear row. */
function ProblemsCard({ g, issues, counts, nav, small }: { g: GameState; issues: IssueView[]; counts: OpsSnapshot['counts']; nav: OpsNav; small: boolean }) {
  if (!issues.length)
    return (
      <div className="ops-card ops-card--good" data-testid="ops-all-clear">
        <div className="ops-row">
          <CircleCheck size={18} aria-hidden style={{ color: 'var(--c-good)' }} />
          <span className="ops-row__title">Everything is running smoothly.</span>
        </div>
      </div>
    );
  if (small)
    return (
      <section className={`ops-card ops-card--${counts.danger ? 'danger' : 'watch'}`} data-testid="ops-problems">
        <Kicker
          end={
            <button type="button" className="ops-link" data-testid="ops-problems-all" onClick={() => nav.view('issues')}>
              All <ChevronRight size={14} aria-hidden />
            </button>
          }
        >
          <span style={{ color: counts.danger ? 'var(--c-danger)' : 'var(--c-watch)' }}>{issuesHeader(counts)}</span>
        </Kicker>
        <div className="ops-rows">
          {issues.map((i) => (
            <div key={i.key} className="ops-row" data-testid={`ops-problem-${i.kind}`}>
              {issueIcon(i)}
              <div className="ops-row__main">
                <span className="ops-row__title">{i.title}</span>
                <span className="ops-row__sub">{i.reason}</span>
              </div>
              <IssueAction g={g} issue={i} nav={nav} short />
            </div>
          ))}
        </div>
      </section>
    );
  return (
    <div className="ops-cols" data-testid="ops-problems" style={issues.length === 1 ? { gridTemplateColumns: '1fr' } : undefined}>
      {issues.map((i) => (
        <section key={i.key} className={`ops-card ops-card--${i.tone}`} data-testid={`ops-problem-${i.kind}`}>
          <div className="ops-card__head">
            {issueIcon(i)}
            <h3 className="ops-card__title">{i.title}</h3>
            <Status tone={i.tone} icon={i.tone === 'danger' ? 'danger' : 'watch'}>
              {i.badge}
            </Status>
          </div>
          <div className="ops-row">
            <span className="ops-card__body ops-row__main">{i.reason}</span>
            <IssueAction g={g} issue={i} nav={nav} />
          </div>
        </section>
      ))}
      <button type="button" className="ops-link" data-testid="ops-problems-all" onClick={() => nav.view('issues')}>
        All <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
}

// ───────────────────────────── Systems tiles ─────────────────────────────

interface TileSpec {
  key: string;
  node: ReactNode;
}

/** The tiles for the systems the player has (§7.1's table). */
function systemTiles(g: GameState, snap: OpsSnapshot, tier: OpsTier, nav: OpsNav, small: boolean): TileSpec[] {
  const out: TileSpec[] = [];
  const tanks = g.tankOrder.map((id) => g.tanks[id]).filter(Boolean);
  // Water changes
  const changers = tanks.filter((t) => changerOf(t));
  const galDay = changers.reduce((a, t) => a + (tankChangeNeed(g, t)?.fresh ?? 0) + (tankChangeNeed(g, t)?.salt ?? 0), 0);
  const done = lastChangeHour(g);
  const wHeld = isHeld(g, 'water');
  const share = changers.length ? Math.round(((changerOf(changers[0])?.fraction ?? 0.1) * 100)) : 10;
  out.push({
    key: 'water-changes',
    node: (
      <SystemTile
        key="wc"
        testId="ops-sys-water-changes"
        icon={<Waves size={17} aria-hidden />}
        name="Water changes"
        status={wHeld ? <Status tone="watch" icon="held">Held</Status> : done !== null ? <Status tone="good">Done {formatClock(done)}</Status> : <Status tone="neutral" icon="time">{changers.length ? 'Due' : 'Off'}</Status>}
        lines={[`${changers.length} ${changers.length === 1 ? 'tank' : 'tanks'} · ${gal(galDay)} gal`, ...(small ? [] : [`${share}% each morning · glass weekly`])]}
        tone={wHeld ? 'watch' : null}
        onOpen={tier.water ? () => nav.tab('water') : undefined}
      />
    ),
  });
  // Water room
  const room = g.facility.water;
  if (room) {
    const salt = snap.problems.find((p) => p.kind === 'supply' && p.supply === 'salt');
    const sHeld = isHeld(g, 'salt');
    const needed = saltWaterNeeded(g);
    const status =
      sHeld ? (
        <Status tone="watch" icon="held">Held</Status>
      ) : !needed ? (
        <Status tone="good">OK</Status>
      ) : salt && salt.kind === 'supply' ? (
        salt.state === 'out' ? <Status tone="danger">Salt out</Status> : salt.state === 'arriving' ? <Status tone="watch" icon="time">Due {formatClock(salt.arrives ?? g.clock.hour)}</Status> : <Status tone="watch">Salt low</Status>
      ) : (
        <Status tone="good">OK</Status>
      );
    const tone = sHeld ? 'watch' : salt?.tone ?? null;
    const batchKg = batchSaltKg(batchGal(room));
    const batches = Math.floor((g.inventory.salt + 1e-6) / batchKg);
    out.push({
      key: 'water-room',
      node: (
        <SystemTile
          key="wr"
          testId="ops-sys-water-room"
          icon={<Droplets size={17} aria-hidden />}
          name="Water room"
          isNew
          status={status}
          tone={tone}
          lines={[needed ? `Fresh ${pct(room.fresh / freshCap(room))} · salt ${pct(room.salt / saltCap(room))}` : `Fresh ${pct(room.fresh / freshCap(room))} · salt not needed`, ...(small || !needed ? [] : [`${Math.round(g.inventory.salt * 10) / 10} kg salt mix · ${batches} ${batches === 1 ? 'batch' : 'batches'} left`])]}
          onOpen={() => nav.tab('water')}
        >
          <OpsBar value={room.fresh / freshCap(room)} label={`Fresh reserve ${pct(room.fresh / freshCap(room))}`} />
          {needed && <OpsBar value={room.salt / saltCap(room)} kind="salt" label={`Salt water reserve ${pct(room.salt / saltCap(room))}`} />}
        </SystemTile>
      ),
    });
  }
  // Live food
  const food = g.facility.food;
  if (food) {
    const held = isHeld(g, 'food');
    const brine = food.cones.length * FOOD_ROOM.coneYield;
    const inf = Math.round((food.jars.length * FOOD_ROOM.jarYield * 24) / FOOD_ROOM.jarHours);
    const last = (g.automation?.days ?? []).filter((d) => d.day < dayOf(g.clock.hour)).slice(-1)[0];
    out.push({
      key: 'live-food',
      node: (
        <SystemTile
          key="lf"
          testId="ops-sys-live-food"
          icon={<Egg size={17} aria-hidden />}
          name="Live food"
          isNew
          status={held ? <Status tone="watch" icon="held">Held</Status> : <Status tone="good" icon="running">Running</Status>}
          tone={held ? 'watch' : null}
          lines={small ? [`Makes ${brine + inf} servings a day`] : [`Baby brine ${brine} a day · uses ${last?.used[BRINE] ?? 0}`, `Infusoria ${inf} a day · uses ${last?.used[INFUSORIA] ?? 0}`]}
          onOpen={() => nav.tab('feed')}
        />
      ),
    });
  }
  // Feeding
  const feeders = tanks.filter((t) => t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder')).length;
  const dosers = tanks.filter((t) => doserOf(t)).length;
  const keeperFed = new Set((g.staff?.roster ?? []).filter((m) => m.role === 'aquarist').flatMap((m) => m.tankIds)).size;
  const fHeld = isHeld(g, 'feeders');
  out.push({
    key: 'feeding',
    node: (
      <SystemTile
        key="fd"
        testId="ops-sys-feeding"
        icon={<Utensils size={17} aria-hidden />}
        name="Feeding"
        status={fHeld ? <Status tone="watch" icon="held">Held</Status> : feeders + dosers ? <Status tone="good" icon="running">Running</Status> : <Status tone="neutral">By hand</Status>}
        tone={fHeld ? 'watch' : null}
        lines={small ? [`${feeders} ${feeders === 1 ? 'feeder' : 'feeders'} · ${dosers} ${dosers === 1 ? 'doser' : 'dosers'}`] : [`${feeders} ${feeders === 1 ? 'Autofeeder' : 'Autofeeders'} · ${dosers} live-food ${dosers === 1 ? 'doser' : 'dosers'}`, `${keeperFed} ${keeperFed === 1 ? 'tank' : 'tanks'} fed by keepers on rounds`]}
        onOpen={tier.food ? () => nav.tab('feed') : undefined}
      />
    ),
  });
  // Production lines
  const lines = productionLines(g);
  if (lines.length) {
    const lHeld = isHeld(g, 'lines');
    const paused = lines.filter((l) => lineStatus(l) === 'waiting' || lineStatus(l) === 'paused').length;
    const byYou = lines.filter((l) => lineStatus(l) === 'paused_by_you').length;
    const smooth = lines.length - paused - byYou;
    const decided = snap.decided[0];
    const sold = opsMemo('week', g, () => weekMoney(g)).sold;
    const status = lHeld ? (
      <Status tone="watch" icon="held">Held</Status>
    ) : paused && !decided ? (
      <Status tone="watch" icon="paused">{small ? `${paused} to check` : `${paused} paused`}</Status>
    ) : decided ? (
      <Status tone="watch" icon="time">Resumes Day {decided.restartDay}</Status>
    ) : byYou ? (
      <Status tone="neutral" icon="paused">{byYou} paused by you</Status>
    ) : (
      <Status tone="good" icon="running">Running</Status>
    );
    out.push({
      key: 'lines',
      node: (
        <SystemTile
          key="ln"
          testId="ops-sys-lines"
          icon={<Factory size={17} aria-hidden />}
          name={small ? 'Lines' : 'Production lines'}
          status={status}
          tone={lHeld || (paused && !decided) ? 'watch' : null}
          lines={small ? [`${lines.length} ${lines.length === 1 ? 'line' : 'lines'} · ${smooth} smooth`] : [`${lines.length} ${lines.length === 1 ? 'line' : 'lines'} · ${smooth} running smoothly`, `${sold} sold this week`]}
          onOpen={() => nav.tab('lines')}
        />
      ),
    });
  }
  // Keepers & stock (desktop, once there's a stock manager)
  const rosa = stockManager(g);
  if (rosa && !small) {
    const aquarists = (g.staff?.roster ?? []).filter((m) => m.role === 'aquarist').length;
    const next = opsMemo('today:12', g, () => todayJobs(g, 12, g.clock.hour, opsSnapshot(g).forecast)).find((j) => j.kind === 'shelves');
    out.push({
      key: 'keepers',
      node: (
        <SystemTile
          key="ks"
          testId="ops-sys-keepers"
          icon={<Users size={17} aria-hidden />}
          name="Keepers & stock"
          status={<Status tone="good">{g.staff!.roster.length} on shift</Status>}
          lines={[`${aquarists} ${aquarists === 1 ? 'aquarist' : 'aquarists'} · ${rosa.name}`, g.staff!.ordersOff ? 'Orders switched off' : `${formatMoney(g.staff!.stockBudget)} stock budget${next ? ` · next order ${formatClock(next.at)}` : ''}`]}
          onOpen={() => go({ kind: 'panel', panel: 'visitors', tab: 'staff' })}
        />
      ),
    });
  }
  return out;
}

function SystemsGrid({ g, snap, tier, nav, small }: { g: GameState; snap: OpsSnapshot; tier: OpsTier; nav: OpsNav; small: boolean }) {
  const tiles = systemTiles(g, snap, tier, nav, small);
  return (
    <div className="ops-grid">
      {tiles.map((t) => t.node)}
      {small && <ManualTile g={g} snap={snap} nav={nav} />}
    </div>
  );
}

/** Phone only: the Manual mode tile with Hold all / Resume all. */
function ManualTile({ g, snap, nav }: { g: GameState; snap: OpsSnapshot; nav: OpsNav }) {
  const since = manualSince(g);
  return (
    <SystemTile
      testId="ops-sys-manual"
      icon={<Hand size={17} aria-hidden />}
      name="Manual mode"
      status={snap.manual ? <Status tone="watch" icon="held">On</Status> : <Status tone="neutral">Off</Status>}
      tone={snap.manual ? 'watch' : null}
      lines={[snap.manual && since !== null ? `Since ${formatClock(since)}` : 'Hold everything']}
      onOpen={() => nav.view('manual')}
    >
      {snap.manual ? (
        <Button size="sm" onClick={doResumeAll}>
          Resume all
        </Button>
      ) : (
        <Button
          size="sm"
          data-testid="ops-hold-all"
          onClick={() => {
            doHoldAll();
            nav.view('manual');
          }}
        >
          Hold all
        </Button>
      )}
    </SystemTile>
  );
}

// ───────────────────────────── This week · Today ─────────────────────────────

function Week({ g, small }: { g: GameState; small: boolean }) {
  const w = opsMemo('week', g, () => weekMoney(g));
  const lines = productionLines(g);
  const name = (id: string) => lines.find((l) => l.id === id)?.name.replace(/ line$/, '') ?? g.production?.ended?.find((h) => h.id === id)?.name.replace(/ line$/, '') ?? id;
  const max = Math.max(1, ...w.lines.map((l) => l.amount));
  return (
    <section className="ops-card" data-testid="ops-week">
      <Kicker icon={<TrendingUp size={14} aria-hidden />}>{w.fromDay !== null ? `This week · Days ${w.fromDay}–${w.toDay}` : 'This week'}</Kicker>
      <div className="ops-cols" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div>
          <div className="ops-muted">Line sales</div>
          <div className="ops-meter__value ops-num">{formatMoney(w.sales)}</div>
        </div>
        <div>
          <div className="ops-muted">{small ? 'Costs' : 'Supplies & upkeep'}</div>
          <div className="ops-meter__value ops-num">{formatMoney(-(w.supplies + w.upkeep), { sign: true })}</div>
        </div>
        <div>
          <div className="ops-muted">Net</div>
          <div className="ops-meter__value ops-num" style={{ color: w.net >= 0 ? 'var(--c-good)' : 'var(--c-danger)' }}>
            {formatMoney(w.net, { sign: true })}
          </div>
        </div>
      </div>
      {w.lines.map((l) => (
        <div key={l.lineId} className="ops-legend">
          <span style={{ minWidth: 96 }}>{name(l.lineId)}</span>
          <div className="ops-bar" style={{ flex: 1 }}>
            <div className="ops-bar__fill ops-bar__fill--salt" style={{ width: `${(l.amount / max) * 100}%` }} />
          </div>
          <span className="ops-legend__val">{formatMoney(l.amount)}</span>
        </div>
      ))}
    </section>
  );
}

const JOB_ICON: Record<ScheduledJob['kind'], ReactNode> = {
  water: <Waves size={15} aria-hidden />,
  mixing: <FlaskConical size={15} aria-hidden />,
  cone: <Egg size={15} aria-hidden />,
  jar: <Sparkles size={15} aria-hidden />,
  shelves: <ShoppingBag size={15} aria-hidden />,
};

/** A scheduled job's title and detail (§7.1 Today; the details the design doesn't word are ADR-0032 decision 3). */
export function jobText(g: GameState, j: ScheduledJob): { title: string; detail: string } {
  const first = (n?: string) => (n ?? 'Your stock manager').split(' ')[0];
  switch (j.kind) {
    case 'water':
      return { title: 'Water changes', detail: `${j.tanks} ${j.tanks === 1 ? 'tank' : 'tanks'} · ${gal(j.gal ?? 0)} gal` };
    case 'mixing':
      return { title: 'Salt mixing', detail: `${Math.floor(j.gal ?? 30)} gal batch · uses ${(j.kg ?? 4.1).toFixed(1)} kg` };
    case 'jar':
      return { title: 'Infusoria', detail: `Jar ${j.index} harvest · ${j.servings} servings` };
    case 'cone':
      return { title: 'Hatchery', detail: `Cone ${j.index} harvest · ${j.servings} servings` };
    case 'shelves': {
      const title = j.check === 'first' ? `${first(j.who)} checks the shelves` : `${first(j.who)}’s second check`;
      const detail = j.saltBlocked ? 'Food first · salt mix won’t fit the budget' : j.buys ? (j.buys.length ? `Buys ${j.buys.slice(0, 2).join(' and ')}${j.buys.length > 2 ? ` and ${j.buys.length - 2} more` : ''}` : 'Nothing to reorder') : j.check === 'second' ? 'Salt mix if the budget allows' : 'Reorders what runs low';
      return { title, detail };
    }
  }
}

function Today({ g, manual }: { g: GameState; manual: boolean }) {
  const jobs = opsMemo('today:4', g, () => todayJobs(g, 4, g.clock.hour, opsSnapshot(g).forecast));
  return (
    <section className="ops-card" data-testid="ops-today">
      <Kicker icon={<CalendarClock size={14} aria-hidden />}>Today</Kicker>
      {manual && <span className="ops-amber">Manual mode: held jobs wait until you resume.</span>}
      <div className="ops-rows">
        {jobs.map((j, i) => {
          const t = jobText(g, j);
          return (
            <div key={`${j.kind}:${j.at}:${j.index ?? ''}`} className="ops-row">
              <span className="ops-num" style={{ minWidth: 72, fontWeight: 620 }}>
                {formatClock(j.at)}
              </span>
              <span className="ops-muted">{JOB_ICON[j.kind]}</span>
              <div className="ops-row__main">
                <span className="ops-row__title">{t.title}</span>
                <span className="ops-row__sub">{t.detail}</span>
              </div>
              {j.held ? (
                <Status tone="watch" icon="held">
                  Held
                </Status>
              ) : i === 0 ? (
                <Badge tone="aqua">Next</Badge>
              ) : null}
            </div>
          );
        })}
        {!jobs.length && <span className="ops-muted">Nothing scheduled.</span>}
      </div>
    </section>
  );
}

// ───────────────────────────── before the Operations Desk ─────────────────────────────

const LOCKED: Record<'water' | 'food' | 'lines' | 'tools', { icon: ReactNode; name: string; desc: string }> = {
  water: { icon: <Droplets size={17} aria-hidden />, name: 'Water room', desc: 'Fresh and salt water for every tank' },
  food: { icon: <Egg size={17} aria-hidden />, name: 'Live food', desc: 'Baby brine shrimp and infusoria for fry' },
  lines: { icon: <Factory size={17} aria-hidden />, name: 'More lines', desc: 'A second line at a Specialty Shop' },
  tools: { icon: <Gauge size={17} aria-hidden />, name: 'Operations tools', desc: 'Problems, weekly money and Hold all' },
};

function lockedTiles(tier: OpsTier, nav: OpsNav, before: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  if (!tier.water) out.push(<LockedTile key="w" testId="ops-early-locked-water" {...LOCKED.water} onOpen={() => nav.tab('water')} />);
  if (!tier.food) out.push(<LockedTile key="f" testId="ops-early-locked-food" {...LOCKED.food} onOpen={() => nav.tab('feed')} />);
  if (tier.slots <= 1) out.push(<LockedTile key="l" testId="ops-early-locked-lines" {...LOCKED.lines} onOpen={() => nav.tab('lines')} />);
  if (!tier.desk) out.push(<LockedTile key="t" testId="ops-early-locked-tools" {...LOCKED.tools} desc={before ? 'Problems first, weekly money, Today and Hold all' : LOCKED.tools.desc} onOpen={() => nav.view('issues')} />);
  return out;
}

function BeforeDesk({ g, snap, tier, nav, small }: { g: GameState; snap: OpsSnapshot; tier: OpsTier; nav: OpsNav; small: boolean }) {
  const tiles = systemTiles(g, snap, tier, nav, small);
  const ladder = (
    <Ladder
      tiers={tierLadder(g)}
      title="What opens up next"
      testId="ops-next-up"
      end={
        <button type="button" className="ops-link" data-testid="ops-next-up-research" onClick={() => go({ kind: 'panel', panel: 'research' })}>
          Research <ChevronRight size={14} aria-hidden />
        </button>
      }
    />
  );
  if (small)
    return (
      <>
        <div className="ops-grid">
          {tiles.map((t) => t.node)}
          {lockedTiles(tier, nav, true)}
        </div>
        {ladder}
      </>
    );
  return (
    <>
      <div className="ops-grid">{tiles.map((t) => t.node)}</div>
      <div className="ops-cols ops-cols--1-2">
        <div className="ops-col">{lockedTiles(tier, nav, true)}</div>
        {ladder}
      </div>
    </>
  );
}

// ───────────────────────────── early game ─────────────────────────────

function EarlyOverview({ g, tier, nav, small }: { g: GameState; tier: OpsTier; nav: OpsNav; small: boolean }) {
  const tanks = g.tankOrder.map((id) => g.tanks[id]).filter(Boolean);
  const fed = tanks.filter((t) => t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder'));
  const cleaned = tanks.filter((t) => changerOf(t));
  const byHand = tanks.filter((t) => !fed.includes(t) && !cleaned.includes(t));
  const line = productionLines(g)[0];
  const v = line ? lineView(g, line) : null;
  const assisted = tier.assisted ? (
    <section className="ops-card" data-testid="ops-assisted">
      <Kicker end={<Badge tone="aqua">Tier 1</Badge>}>Assisted care</Kicker>
      <div className="ops-rows">
        {fed.slice(0, small ? 1 : 3).map((t) => {
          const foodId = pickAutofeedFood(g.inventory.foods, inhabitantsOf(g, t.id).map((i) => i.species));
          const servings = foodId ? Math.floor(g.inventory.foods[foodId] ?? 0) : 0;
          const held = isHeld(g, 'feeders');
          const on = t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder' && e.on && !e.failed);
          return (
            <div key={t.id} className="ops-row">
              <div className="ops-row__main">
                <span className="ops-row__title">{t.name}</span>
                <span className="ops-row__sub">Autofeeder{foodId ? ` · ${getFoodDef(foodId)?.name} · ${servings} servings left` : ''}</span>
              </div>
              {held ? <Status tone="watch" icon="held">Auto-feed held</Status> : on ? <Status tone="aqua" icon="running">Auto-feed</Status> : <Status tone="watch" icon="paused">Auto-feed paused</Status>}
            </div>
          );
        })}
        {!small && byHand.length > 0 && (
          <div className="ops-row">
            <div className="ops-row__main">
              <span className="ops-row__title">{byHand.length} more {byHand.length === 1 ? 'tank' : 'tanks'}</span>
              <span className="ops-row__sub">Fed and cleaned by hand</span>
            </div>
            <span className="ops-muted">By hand</span>
          </div>
        )}
        {cleaned.length === 0 && fed[0] ? (
          <div className="ops-row">
            <span className="ops-row__main ops-row__sub">Auto-clean needs an Auto Water Changer</span>
            <Button size="sm" onClick={() => go({ kind: 'tankCard', tankId: fed[0].id, tab: 'gear' })}>
              Buy · $120
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  ) : (
    <div className="ops-card ops-card--dashed" data-testid="ops-assisted">
      <Kicker>Assisted care</Kicker>
      <span className="ops-muted">Research Better Life Support, or build husbandry mastery with regular care.</span>
    </div>
  );
  const lineRow = line && v && (
    <section className="ops-card" data-testid="ops-early-line">
      <div className="ops-row">
        <div className="ops-row__main">
          <span className="ops-row__title" style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>
            {line.name}
          </span>
          <span className="ops-row__sub">
            {tier.lines} of {tier.slots} line {tier.slots === 1 ? 'slot' : 'slots'} · {v.active === 'quarantine' ? 'Quarantine' : v.active.charAt(0).toUpperCase() + v.active.slice(1)} stage
          </span>
        </div>
        {v.status === 'running' ? <Status tone="good" icon="running">Running</Status> : <Status tone="watch" icon="paused">{v.status === 'paused_by_you' ? 'Paused by you' : 'Paused'}</Status>}
      </div>
    </section>
  );
  const ladder = <Ladder tiers={tierLadder(g)} title="What opens up next" testId="ops-ladder" />;
  return small ? (
    <>
      {assisted}
      {lineRow}
      <div className="ops-grid">{lockedTiles(tier, nav, false)}</div>
      {ladder}
    </>
  ) : (
    <div className="ops-cols">
      <div className="ops-col">
        {assisted}
        {lineRow}
        <div className="ops-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {lockedTiles(tier, nav, false)}
        </div>
      </div>
      {ladder}
    </div>
  );
}
