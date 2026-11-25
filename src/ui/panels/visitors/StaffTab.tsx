/**
 * Visitors › Staff: the team roster (portrait, role, skill stars, wage, today's work, assignments, stock budget), the
 * hiring pool and the wage bill. Staff feed, clean and restock; they never breed, move or sell animals, and their
 * care doesn't count toward the player's own bond with the animals. OWNER: lane "staff".
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Users, UserPlus, Wallet, Fish, Package, Presentation, TriangleAlert, Clock, Lock, Shuffle, Utensils, Info, Sparkles, CircleCheck } from 'lucide-react';
import type { GameState, StaffMember, StaffRole } from '@/types';
import { Badge, Button, Slider, Toggle, formatMoney } from '@/ui/kit';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { STAFF_NOTICE_DAYS, STAFF_ROLES, STAFF_ROLE_ORDER, STAFF_TRAITS, STAFF_XP_PER_LEVEL, STOCK_BUDGET, aquaristCapacity, docentReach, skillStars, tankCareUnits } from '@/data/staff';
import { getFacilityLevel, nextFacilityLevelDef } from '@/data/facilities';
import { dayOf, formatClock } from '@/sim/time';
import { planPurchases, plannedOrders, stockCheckHours } from '@/sim/staff/work'; // lane:automation (chunk 5)
import { opsMemo, opsSnapshot } from '@/ui/common/ops'; // lane:automation (chunk 5, PERF-004)
import { SALT_PRICE_PER_KG } from '@/sim/economy'; // lane:automation (chunk 5)
import { withArticle } from '@/sim/economy/util'; // Audit 2026-11-17 (J16)
import {
  canHire,
  keeperOf,
  nextDuty,
  staffCapacity,
  staffLoad,
  staffWagesPerDay,
  tankLoad,
  todayLine,
} from '@/sim/staff';
import { act, edit } from '../common/act';
import { safe } from '../common/hooks';
import { EmptyState, SectionHead, Tile, Bar, Callout } from '../common/parts';
import { Requirements, reqsFor } from '../common/Requirements';
import { orderedTanks, unlocked } from '../common/derive';
import { poolWhen } from '../common/format';
import { go } from '@/ui/nav/router'; // Audit 2026-11-17 (H26): flags link to their tank
import { glow } from '@/ui/common/glow'; // chunk 22 (S-3)
import { StaffAvatar } from './StaffAvatar';
import './staff.css';

const ROLE_ICON: Record<StaffRole, typeof Fish> = { aquarist: Fish, stock_manager: Package, docent: Presentation };
/** Audit 2026-11-17 (J22): a hired docent's card has no blurb, so its tag says what the role does. */
const ROLE_GLOSS: Partial<Record<StaffRole, string>> = { docent: 'gives talks' };
const first = (m: Pick<StaffMember, 'name'>) => m.name.split(' ')[0];

/** A tank's care load for this aquarist, on average over the shop's tanks (a 20-gallon tank's before there are any). */
function avgTankLoad(g: GameState, m: StaffMember): number {
  const tanks = orderedTanks(g);
  if (!tanks.length) return tankCareUnits(20, false, m.trait);
  return tanks.reduce((a, t) => a + tankLoad(t, m), 0) / tanks.length;
}

/**
 * Audit 2026-11-17 (H11): what someone can take on, in tanks and exhibits rather than "tank units": a candidate's
 * "Can look after about 5 tanks like yours", "Presents up to 5 exhibits", "Checks the shelves at 9:00 AM (and 3:00 PM
 * from ★★★)"; a keeper's "Rounds: 3 tanks · room for about 2 more".
 */
export function capacityLine(g: GameState, m: StaffMember, hired: boolean): string {
  if (m.role === 'docent') {
    const reach = docentReach(m.skill);
    return hired ? `Presents ${staffLoad(g, m).used} of ${reach} exhibits` : `Presents up to ${reach} exhibits`;
  }
  if (m.role === 'stock_manager') {
    const hours = stockCheckHours(m).map((h) => formatClock(h));
    return `Checks the shelves at ${hours.join(' and ')}${m.skill < 3 ? ' (and 3:00 PM from ★★★)' : ''}`;
  }
  const avg = Math.max(0.1, avgTankLoad(g, m));
  if (!hired) {
    const n = Math.max(1, Math.floor(aquaristCapacity(m.skill) / avg + 1e-9));
    return `Can look after about ${n} ${n === 1 ? 'tank' : 'tanks'} ${orderedTanks(g).length ? 'like yours' : 'of 20 gallons'}`;
  }
  const load = staffLoad(g, m);
  const mine = m.tankIds.filter((id) => g.tanks[id]).length;
  const more = Math.floor((load.capacity - load.used) / avg + 1e-9);
  return `Rounds: ${mine} ${mine === 1 ? 'tank' : 'tanks'} · ${more > 0 ? `room for about ${more} more` : load.used > load.capacity + 1e-6 ? 'more than they can keep up with' : 'no room for more'}`;
}

/**
 * lane:w2-ui — the "Hire your first staff member" quest (q_first_staff) completes on the 'hired_staff' progress flag.
 * A hire raises it itself (the `hireStaff` command, chunk 11); this syncs it once for saves (or fixtures) that
 * already have a team.
 */
function HiredFlagSync({ g }: { g: GameState }) {
  const need = (g.staff?.roster.length ?? 0) > 0 && !g.progress.tutorial.flags?.hired_staff && !g.isShowcase;
  useEffect(() => {
    if (need) edit({ k: 'raiseFlag', name: 'hired_staff' });
  }, [need]);
  return null;
}

export function StaffTab({ g }: { g: GameState }) {
  if (!unlocked(g, 'staff')) return <LockedStaff g={g} />;
  const st = g.staff;
  const roster = st?.roster ?? [];
  const cap = staffCapacity(g);
  const wages = safe(() => staffWagesPerDay(g), { total: 0, count: 0, byRole: { aquarist: 0, stock_manager: 0, docent: 0 } });
  const tanks = orderedTanks(g);
  const covered = tanks.filter((t) => roster.some((m) => m.role === 'aquarist' && m.tankIds.includes(t.id))).length;
  const stock = roster.find((m) => m.role === 'stock_manager');
  const docents = roster.some((m) => m.role === 'docent');
  const talks = roster.filter((m) => m.role === 'docent').reduce((a, m) => a + (m.today?.day === dayOf(g.clock.hour) ? m.today.talks : 0), 0);
  const issues = roster.flatMap((m) => (m.today?.day === dayOf(g.clock.hour) ? m.today.issues.map((t) => ({ who: first(m), t })) : []));
  const unpaid = roster.filter((m) => (m.unpaidDays ?? 0) > 0);
  const order = [...roster].sort((a, b) => STAFF_ROLE_ORDER.indexOf(a.role) - STAFF_ROLE_ORDER.indexOf(b.role) || a.hiredHour - b.hiredHour);
  const applying = st?.candidates.length ?? 0;
  return (
    <div className="pn-stack pn-stack--lg st-tab" data-testid="staff-tab">
      <HiredFlagSync g={g} />
      <div className={clsx('pn-grid st-tiles', stock || docents ? 'st-tiles--4' : 'st-tiles--3')}>
        <Tile icon={<Users size={14} />} tone="aqua" label="Team" value={`${roster.length} / ${cap}`} hint={`${getFacilityLevel(g.facility.level).name} capacity`} />
        <Tile icon={<Wallet size={14} />} tone="coral" label="Wages" value={`${formatMoney(wages.total)}/day`} hint="paid at midnight" />
        <Tile icon={<Fish size={14} />} tone={covered === tanks.length && tanks.length ? 'good' : 'gold'} label="Tanks in care" value={`${covered} / ${tanks.length}`} hint={covered < tanks.length ? `${tanks.length - covered} still yours` : 'every tank covered'} />
        {stock ? (
          <Tile icon={<Package size={14} />} tone="gold" label="Stock budget" value={`${formatMoney(st?.stockBudget ?? 0)}/day`} hint={`${formatMoney(st?.stockSpent.day === dayOf(g.clock.hour) ? st.stockSpent.amount : 0)} spent today`} />
        ) : docents ? (
          <Tile icon={<Presentation size={14} />} tone="violet" label="Talks today" value={talks} hint={g.facility.openToPublic ? 'at 11 AM, 2 PM and 4 PM' : 'doors are closed'} />
        ) : null}
      </div>

      {/* chunk 22 (S-3): the candidates sit under every team card (about 1,900 px down on a phone) and nothing up here
          said anyone had applied */}
      {roster.length < cap && applying > 0 && (
        <Callout
          tone="info"
          icon={<UserPlus size={15} />}
          action={
            <Button size="sm" data-testid="staff-see-candidates" onClick={() => glow('[data-testid="staff-hiring"]', { block: 'start' })}>
              See them
            </Button>
          }
        >
          <span data-testid="staff-applying">{applying === 1 ? '1 person is applying for a job.' : `${applying} people are applying for a job.`}</span>
        </Callout>
      )}

      {unpaid.length > 0 && (
        <Callout tone="danger" icon={<TriangleAlert size={16} />} title="Wages unpaid">
          {unpaid.map((m) => `${first(m)} hasn’t been paid for ${m.unpaidDays} day${m.unpaidDays === 1 ? '' : 's'}`).join(' · ')}. Anyone unpaid for {STAFF_NOTICE_DAYS} days leaves — you’ll be feeding and cleaning yourself until you can rehire.
        </Callout>
      )}
      {issues.length > 0 && (
        <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Flagged by the team today">
          <ul className="st-issues">
            {issues.slice(0, 4).map((i, k) => (
              <li key={k}>
                <b>{i.who}:</b> <IssueText g={g} text={i.t} />
              </li>
            ))}
            {issues.length > 4 && <li className="pn-muted">+{issues.length - 4} more</li>}
          </ul>
        </Callout>
      )}

      <section>
        <SectionHead title="Your team" icon={<Users size={14} />}>
          {roster.some((m) => m.role !== 'stock_manager') && (
            <Button size="sm" variant="ghost" data-testid="staff-autoassign" onClick={() => act({ k: 'autoAssignAll' }, { sound: 'click' })}>
              <Shuffle size={14} aria-hidden /> Share out tanks
            </Button>
          )}
        </SectionHead>
        {order.length === 0 ? (
          <EmptyState icon={<UserPlus size={22} />} title="No one on the team yet">
            An aquarist takes over the daily feeding and water changes for the tanks you give them. You keep the fun parts: breeding, aquascaping, trading — and your own bond with each animal.
          </EmptyState>
        ) : (
          <div className="st-list">
            {order.map((m) => (
              <StaffCard key={m.id} g={g} m={m} />
            ))}
          </div>
        )}
      </section>

      <section data-testid="staff-hiring">
        <SectionHead title="Hiring" icon={<UserPlus size={14} />}>
          <span className="pn-tiny pn-muted st-pool-clock">
            <Clock size={12} aria-hidden /> New faces {poolWhen(st?.nextPoolHour ?? -1, g.clock.hour)}
          </span>
        </SectionHead>
        {roster.length >= cap && (st?.candidates.length ?? 0) > 0 && (
          <div className="st-full">
            <Callout tone="info" icon={<Users size={15} />}>
              Your team is full — {getFacilityLevel(g.facility.level).name.toLowerCase()} has room for {cap}. Expanding the venue makes room for more (or let someone go).
            </Callout>
          </div>
        )}
        {(st?.candidates.length ?? 0) === 0 ? (
          <EmptyState icon={<UserPlus size={22} />} title="No candidates right now">
            New people apply every few days.
          </EmptyState>
        ) : (
          <div className="st-list st-list--candidates">
            {st!.candidates.map((c) => (
              <CandidateCard key={c.id} g={g} c={c} />
            ))}
          </div>
        )}
      </section>

      <p className="pn-tiny pn-muted st-foot">
        <Info size={12} aria-hidden /> Staff feed from your food cupboard, change water and keep the glass clean — the same care you give, with the same numbers. They flag broken equipment and sick animals but leave repairs, treatment, breeding, moving and selling to you. Keeper care doesn’t count toward your own bond with an animal, or your quests.
      </p>
    </div>
  );
}

// ───────────────────────────── locked ─────────────────────────────

function LockedStaff({ g }: { g: GameState }) {
  const rule = UNLOCK_RULE_BY_KEY['staff'];
  return (
    <div className="pn-stack pn-stack--lg st-tab" data-testid="staff-tab">
      <div className="pn-card st-locked">
        <div className="pn-row pn-gap-3">
          <span className="pn-doors__icon">
            <Lock size={20} />
          </span>
          <div className="pn-grow">
            <div className="pn-card__title">Staff arrive with your first shop</div>
            <div className="pn-small pn-muted">{rule?.hint ?? 'Move into a specialty shop to hire your first staff.'}</div>
          </div>
        </div>
        {rule && <Requirements items={reqsFor(g, rule.when)} />}
      </div>
      <div className="st-roles">
        {STAFF_ROLE_ORDER.map((r) => {
          const def = STAFF_ROLES[r];
          const Icon = ROLE_ICON[r];
          return (
            <div key={r} className={clsx('pn-card st-role', `st-role--${r}`)}>
              <div className="st-role__head">
                <Icon size={16} aria-hidden />
                <b>{def.label}</b>
                <span className="pn-tiny pn-muted">
                  {formatMoney(def.wage[0])}–{formatMoney(def.wage[1])}/day
                </span>
              </div>
              <p className="pn-small pn-dim">{def.blurb}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── cards ─────────────────────────────

function Stars({ skill }: { skill: number }) {
  return (
    <span className="st-stars" title={`Skill ${skill} of 5`}>
      {/* Audit 2026-11-17 (J36): a plain span's aria-label isn't read; the glyphs were ("black star" five times) */}
      <span className="st-stars__on" aria-hidden>{skillStars(skill)}</span>
      <span className="st-stars__off" aria-hidden>{'★'.repeat(Math.max(0, 5 - skill))}</span>
      <span className="st-sr">Skill {skill} of 5</span>
    </span>
  );
}

function RoleTag({ role, gloss }: { role: StaffRole; gloss?: boolean }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className={clsx('st-role-tag', `st-role-tag--${role}`)}>
      <Icon size={12} aria-hidden /> {STAFF_ROLES[role].label}
      {gloss && ROLE_GLOSS[role] ? ` (${ROLE_GLOSS[role]})` : ''}
    </span>
  );
}

/** "9 AM and 3 PM" (chunk 6, DES-013: the stock manager's checks in the design's words, §8.7). */
function listHours(hours: number[]): string {
  const word = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
  const w = hours.map(word);
  return w.length <= 1 ? w[0] ?? '' : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
}

function StaffCard({ g, m }: { g: GameState; m: StaffMember }) {
  const [editing, setEditing] = useState(false);
  const trait = STAFF_TRAITS[m.trait];
  const today = safe(() => todayLine(g, m), null);
  const next = safe(() => nextDuty(g, m), '');
  const issues = m.today?.day === dayOf(g.clock.hour) ? m.today.issues : [];
  const need = STAFF_XP_PER_LEVEL * m.skill;
  return (
    <article className={clsx('pn-card st-card', `st-card--${m.role}`, (m.unpaidDays ?? 0) > 0 && 'st-card--unpaid')} data-testid={`staff-member-${m.id}`}>
      <div className="st-card__top">
        <StaffAvatar seed={m.avatarSeed} role={m.role} size={48} name={m.name} />
        <div className="st-card__who">
          <div className="st-card__name">{m.name}</div>
          <div className="st-card__meta">
            <RoleTag role={m.role} gloss />
            <Stars skill={m.skill} />
            <span className="st-wage">{formatMoney(m.wage)}/day</span>
          </div>
          {m.role === 'stock_manager' && (
            <div className="st-card__duty" data-testid={`staff-duty-${m.id}`}>
              Stock manager · skill {m.skill} · checks the shelves at {listHours(stockCheckHours(m))}
            </div>
          )}
        </div>
        {m.role === 'stock_manager' && !(m.unpaidDays ?? 0) && <Badge tone="good">On shift</Badge>}
        <FireButton m={m} money={g.finance.money} />
      </div>
      {trait && (
        <p className="st-card__trait">
          <b>{trait.label}</b> — {trait.line}
        </p>
      )}
      <div className={clsx('st-card__today', today && 'has-work')}>
        {today ? <CircleCheck size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
        <span>
          {today ? (
            <>
              <b>Today:</b> {today}
            </>
          ) : (
            next
          )}
        </span>
      </div>
      {issues.length > 0 && (
        <ul className="st-card__issues">
          {issues.slice(0, 3).map((t, i) => (
            <li key={i}>
              <TriangleAlert size={12} aria-hidden /> <span className="st-sr">Watch:</span> {t}
            </li>
          ))}
        </ul>
      )}
      {m.role === 'stock_manager' ? <BudgetControl g={g} m={m} /> : <Assignments g={g} m={m} editing={editing} setEditing={setEditing} />}
      {m.skill < 5 && (
        <div className="st-xp" title="Experience grows with every day on the job">
          <span className="pn-tiny pn-muted">
            <Sparkles size={11} aria-hidden /> Experience {Math.floor(m.xp)} / {need} days to <span aria-hidden>{skillStars(m.skill + 1)}</span><span className="st-sr">skill {m.skill + 1}</span>
          </span>
          <Bar value={(m.xp / Math.max(1, need)) * 100} tone="gold" label={`${m.name} experience`} thin />
        </div>
      )}
    </article>
  );
}

/** A flag's text with the tank it names as a link to its card (Audit 2026-11-17, H26). */
function IssueText({ g, text }: { g: GameState; text: string }) {
  const tank = orderedTanks(g)
    .filter((t) => t.name && text.includes(t.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (!tank) return <>{text}</>;
  const at = text.lastIndexOf(tank.name);
  return (
    <>
      {text.slice(0, at)}
      <button type="button" className="pn-inline-link" onClick={() => go({ kind: 'tankCard', tankId: tank.id, tab: / failed in /.test(text) ? 'gear' : 'life' })}>
        {tank.name}
      </button>
      {text.slice(at + tank.name.length)}
    </>
  );
}

/**
 * The second press's words (Audit 2026-11-17, J34 and its review): `fireStaff` pays a final day's wage only when the
 * till covers it, so the label says which.
 */
export function fireWords(m: StaffMember, money: number): { label: string; title: string } {
  const who = first(m);
  return money >= m.wage
    ? { label: `Let ${who} go (final day’s pay)`, title: `Let ${who} go with a final day’s pay (${formatMoney(m.wage)})` }
    : { label: `Let ${who} go (no final day’s pay)`, title: `Let ${who} go: the till can’t cover a final day’s pay (${formatMoney(m.wage)})` };
}

function FireButton({ m, money }: { m: StaffMember; money: number }) {
  const [armed, setArmed] = useState(false);
  const words = fireWords(m, money);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return (
    <Button
      size="sm"
      variant={armed ? 'danger' : 'ghost'}
      className="st-fire"
      data-testid={`staff-fire-${m.id}`}
      title={armed ? words.title : `Let ${first(m)} go`}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timer.current = window.setTimeout(() => setArmed(false), 4000);
          return;
        }
        act({ k: 'fireStaff', staff: m.id }, { sound: 'close', kind: 'info' });
      }}
    >
      {armed ? words.label : 'Let go'}
    </Button>
  );
}

function Assignments({ g, m, editing, setEditing }: { g: GameState; m: StaffMember; editing: boolean; setEditing: (v: boolean) => void }) {
  const load = safe(() => staffLoad(g, m), { used: 0, capacity: 1 });
  const tanks = orderedTanks(g);
  const mine = tanks.filter((t) => m.tankIds.includes(t.id));
  const aquarist = m.role === 'aquarist';
  const pct = (load.used / Math.max(0.01, load.capacity)) * 100;
  return (
    <div className="st-assign">
      <div className="st-assign__head">
        <span className="pn-tiny pn-muted">{capacityLine(g, m, true)}</span>
        <button type="button" className="pn-inline-link pn-tiny" data-testid={`staff-edit-${m.id}`} aria-expanded={editing} onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : aquarist ? 'Change tanks' : 'Change exhibits'}
        </button>
      </div>
      <Bar value={pct} tone={pct > 100 ? 'danger' : 'aqua'} label={`${m.name} workload`} thin />
      {!editing ? (
        <div className="st-assign__names pn-small pn-dim">
          {mine.length ? (
            <>
              {aquarist ? <Utensils size={12} aria-hidden /> : <Presentation size={12} aria-hidden />} {mine.map((t) => t.name).join(' · ')}
            </>
          ) : (
            <span className="pn-muted">{aquarist ? 'No tanks yet — tap “Change tanks”.' : 'No exhibits yet.'}</span>
          )}
        </div>
      ) : (
        <div className="st-assign__chips" role="group" aria-label={`${m.name} ${aquarist ? 'tanks' : 'exhibits'}`}>
          {tanks
            .filter((t) => aquarist || (t.purpose ?? 'display') === 'display')
            .map((t) => {
              const on = m.tankIds.includes(t.id);
              const other = aquarist ? keeperOf(g, t.id) : null;
              const units = aquarist ? tankLoad(t, m) : 1;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={clsx('pn-chip pn-chip--btn st-chip', on && 'is-on')}
                  aria-pressed={on}
                  data-testid={`staff-assign-${m.id}-${t.id}`}
                  title={aquarist ? `${t.name} · ${units.toFixed(1)} units${other && other.id !== m.id ? ` · now with ${first(other)}` : ''}` : t.name}
                  // lane:guide — quiet for a plain toggle, but say so when the tank is taken from another aquarist
                  onClick={() => act({ k: 'assignTank', staff: m.id, tank: t.id, on: !on }, { sound: 'click', quiet: !(!on && other && other.id !== m.id) })}
                >
                  {on && <CircleCheck size={12} aria-hidden />}
                  {t.name}
                  {!on && other && other.id !== m.id && <span className="st-chip__who">· {first(other)}</span>}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

function BudgetControl({ g, m }: { g: GameState; m: StaffMember }) {
  const st = g.staff!;
  const max = STOCK_BUDGET[g.facility.level]?.max ?? 300;
  const [v, setV] = useState(st.stockBudget);
  const timer = useRef<number | null>(null);
  // lane:automation (chunk 5) — follow the budget from elsewhere, but never while the player's own change is on its way
  // (the save is debounced and this card refreshes on a timer: the slider used to jump back mid-gesture)
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current) setV(st.stockBudget);
  }, [st.stockBudget]);
  const spent = st.stockSpent.day === dayOf(g.clock.hour) ? st.stockSpent.amount : 0;
  const commit = (x: number) => {
    setV(x);
    pending.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      edit({ k: 'setStockBudget', amount: x });
      pending.current = false;
    }, 300);
  };
  // lane:automation (chunk 5, DESIGN-S3D §8.7, ADR-0026 decision 10) — any whole-dollar amount up to the level's maximum,
  // what it covers at the next check, and the orders switch (which keeps the budget)
  const lvl = getFacilityLevel(g.facility.level);
  const next = nextFacilityLevelDef(g.facility.level);
  const nextMax = next ? STOCK_BUDGET[next.id]?.max : undefined;
  const cap = v >= max ? (next && nextMax ? `the most at ${withArticle(lvl.name)}; up to ${formatMoney(nextMax)} at ${withArticle(next.name)}` : `the most at ${withArticle(lvl.name)}`) : `up to ${formatMoney(max)} at ${withArticle(lvl.name)}`; // Audit 2026-11-17 (J16): "an Aquarium Store"
  return (
    <div className="st-budget" data-testid="staff-budget">
      <div className="st-assign__head">
        <span className="pn-small">
          Daily stock budget <b className="st-budget__v">{v === 0 ? 'Paused' : `${formatMoney(v)}/day`}</b>
        </span>
        <Toggle checked={!st.ordersOff} onChange={(on) => edit({ k: 'setStockOrders', on })} label={`${first(m)}’s orders`} testId="staff-orders" />
      </div>
      <Slider value={v} min={0} max={max} step={1} onChange={commit} label={`${m.name}’s daily stock budget`} />
      <span className="pn-tiny pn-muted">
        Spent today: {formatMoney(spent)} of {formatMoney(v)} · {cap}
      </span>
      <BudgetStatus g={g} m={m} budget={v} />
      <p className="pn-tiny pn-muted" style={{ margin: 0 }}>
        Keeps a few days of every food your animals eat, and salt for marine water changes. Orders show in Finances as “ordered by {first(m)}”.
      </p>
    </div>
  );
}

/**
 * lane:automation (chunk 5, DESIGN-S3D §8.7; AUTO-046) — while a salt order is wanted: what the budget covers at the
 * next check (green), or what doesn't fit and the amount that would cover it (amber). Between the two the stock manager
 * buys what fits in 5 kg steps (§9.6). The design's words name Rosa and "her"; this names whoever the manager is.
 */
export function BudgetStatus({ g, m, budget }: { g: GameState; m: StaffMember; budget: number }) {
  // the dry runs walk every animal: once per Operations key (game hour, stock, budget), never per refresh (PERF-004)
  const s = opsMemo('staff:budget', g, () => {
    const wanted = safe(() => plannedOrders(g, m).find((o) => o.kind === 'salt'), undefined);
    const all = wanted?.kg ? safe(() => planPurchases(g, m, Infinity, Infinity), null) : null;
    return { wanted, all, f: opsSnapshot(g).forecast };
  });
  const { wanted, all, f } = s;
  if (!wanted?.kg || g.staff?.ordersOff || !all) return null;
  const food = all.buys.filter((b) => b.kind !== 'salt').reduce((a, b) => a + b.price, 0);
  const saltPrice = wanted.kg * SALT_PRICE_PER_KG;
  const need = Math.ceil(food + saltPrice);
  const at = f ? formatClock(f.at) : '9:00 AM';
  // what's left of the day's budget at that check (a purchase earlier the same day has used some; the chunk 5 review)
  const spent = f ? Math.max(0, f.budget - f.left) : 0;
  const ok = budget - spent >= need;
  return (
    <div className={`pn-small pn-tone-${ok ? 'good' : 'watch'}`} data-testid="staff-budget-status">
      {ok
        ? `Covers food (${formatMoney(food)}) and a ${wanted.kg} kg order of salt mix (${formatMoney(saltPrice)}): ${first(m)} buys it at the ${at} check.`
        : `Food takes ${formatMoney(food)} of it, so salt mix doesn’t fit (5 kg is ${formatMoney(5 * SALT_PRICE_PER_KG)}). ${formatMoney(need + spent)} covers food and the ${wanted.kg} kg order.`}
    </div>
  );
}

function CandidateCard({ g, c }: { g: GameState; c: StaffMember }) {
  const trait = STAFF_TRAITS[c.trait];
  const check = safe(() => canHire(g, c), { ok: false, reason: '' });
  return (
    <article className={clsx('pn-card st-card st-card--candidate', `st-card--${c.role}`)} data-testid={`staff-candidate-${c.id}`}>
      <div className="st-card__top">
        <StaffAvatar seed={c.avatarSeed} role={c.role} size={44} name={c.name} />
        <div className="st-card__who">
          <div className="st-card__name">{c.name}</div>
          <div className="st-card__meta">
            <RoleTag role={c.role} />
            <Stars skill={c.skill} />
            <span className="st-wage">{formatMoney(c.wage)}/day</span>
          </div>
        </div>
        <Button size="sm" variant="primary" disabled={!check.ok} title={check.ok ? `Hire ${first(c)}` : check.reason} data-testid={`staff-hire-${c.id}`} onClick={() => act({ k: 'hireStaff', candidate: c.id }, { sound: 'confirm', kind: 'success' })}>
          <UserPlus size={14} aria-hidden /> Hire
        </Button>
      </div>
      {trait && (
        <p className="st-card__trait">
          <b>{trait.label}</b> — {trait.line}
        </p>
      )}
      <p className="pn-tiny pn-muted st-card__blurb">{STAFF_ROLES[c.role].blurb}</p>
      <p className="pn-tiny st-card__blurb" data-testid={`staff-cancover-${c.id}`}>{capacityLine(g, c, false)}</p>
      {!check.ok && check.reason && !/has room for/.test(check.reason) && <p className="pn-tiny st-card__why">{check.reason}</p>}
    </article>
  );
}
