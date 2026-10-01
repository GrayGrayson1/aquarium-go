/**
 * Visitors › Staff: the team roster (portrait, role, skill stars, wage, today's work, assignments, stock budget), the
 * hiring pool and the wage bill. Staff feed, clean and restock; they never breed, move or sell animals, and their
 * care doesn't count toward the player's own bond with the animals. OWNER: lane "staff".
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Users, UserPlus, Wallet, Fish, Package, Presentation, TriangleAlert, Clock, Lock, Shuffle, Utensils, Info, Sparkles, CircleCheck } from 'lucide-react';
import type { GameState, StaffMember, StaffRole } from '@/types';
import { Button, Slider, formatMoney } from '@/ui/kit';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { STAFF_NOTICE_DAYS, STAFF_ROLES, STAFF_ROLE_ORDER, STAFF_TRAITS, STAFF_XP_PER_LEVEL, STOCK_BUDGET, skillStars } from '@/data/staff';
import { getFacilityLevel } from '@/data/facilities';
import { dayOf } from '@/sim/time';
import {
  assignTank,
  autoAssignAll,
  canHire,
  fireStaff,
  hireStaff,
  keeperOf,
  nextDuty,
  setStockBudget,
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
import { StaffAvatar } from './StaffAvatar';
import { tutorialAdvance } from '@/sim/facility'; // lane:w2-ui
import './staff.css';

const ROLE_ICON: Record<StaffRole, typeof Fish> = { aquarist: Fish, stock_manager: Package, docent: Presentation };
const first = (m: Pick<StaffMember, 'name'>) => m.name.split(' ')[0];

/**
 * lane:w2-ui — the "Hire your first staff member" quest (q_first_staff) completes on the 'hired_staff' progress flag.
 * Raised when a hire succeeds, and synced once for saves (or fixtures) that already have a team.
 */
function hiredFlag(d: GameState) {
  if (d.progress.tutorial.flags?.hired_staff) return;
  try {
    tutorialAdvance(d, 'hired_staff');
  } catch {
    /* progression mid-edit */
  }
}

function HiredFlagSync({ g }: { g: GameState }) {
  const need = (g.staff?.roster.length ?? 0) > 0 && !g.progress.tutorial.flags?.hired_staff && !g.isShowcase;
  useEffect(() => {
    if (need) edit((d) => hiredFlag(d));
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
                <b>{i.who}:</b> {i.t}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      <section>
        <SectionHead title="Your team" icon={<Users size={14} />}>
          {roster.some((m) => m.role !== 'stock_manager') && (
            <Button size="sm" variant="ghost" data-testid="staff-autoassign" onClick={() => act((d) => autoAssignAll(d), { sound: 'click' })}>
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

      <section>
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
        <Info size={12} aria-hidden /> Staff feed from your food cupboard, change water and keep the glass clean — the same care you give, with the same numbers. They flag broken equipment and sick animals but leave repairs, treatment, breeding, moving and selling to you. Keeper care doesn’t count toward your own bond with an animal.
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
    <span className="st-stars" aria-label={`Skill ${skill} of 5`} title={`Skill ${skill} of 5`}>
      <span className="st-stars__on">{skillStars(skill)}</span>
      <span className="st-stars__off">{'★'.repeat(Math.max(0, 5 - skill))}</span>
    </span>
  );
}

function RoleTag({ role }: { role: StaffRole }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className={clsx('st-role-tag', `st-role-tag--${role}`)}>
      <Icon size={12} aria-hidden /> {STAFF_ROLES[role].label}
    </span>
  );
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
            <RoleTag role={m.role} />
            <Stars skill={m.skill} />
            <span className="st-wage">{formatMoney(m.wage)}/day</span>
          </div>
        </div>
        <FireButton m={m} />
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
            <Sparkles size={11} aria-hidden /> Experience {Math.floor(m.xp)} / {need} days to {skillStars(m.skill + 1)}
          </span>
          <Bar value={(m.xp / Math.max(1, need)) * 100} tone="gold" label={`${m.name} experience`} thin />
        </div>
      )}
    </article>
  );
}

function FireButton({ m }: { m: StaffMember }) {
  const [armed, setArmed] = useState(false);
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
      title={armed ? `Let ${first(m)} go with a final day’s pay` : `Let ${first(m)} go`}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timer.current = window.setTimeout(() => setArmed(false), 4000);
          return;
        }
        act((d) => fireStaff(d, m.id), { sound: 'close', kind: 'info' });
      }}
    >
      {armed ? 'Confirm' : 'Let go'}
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
        <span className="pn-tiny pn-muted">{aquarist ? `Rounds ${load.used.toFixed(1)} of ${load.capacity} tank units` : `Presents ${load.used} of ${load.capacity} exhibits`}</span>
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
                  onClick={() => act((d) => assignTank(d, m.id, t.id, !on), { sound: 'click', quiet: !(!on && other && other.id !== m.id) })}
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
  useEffect(() => setV(st.stockBudget), [st.stockBudget]);
  const spent = st.stockSpent.day === dayOf(g.clock.hour) ? st.stockSpent.amount : 0;
  const commit = (x: number) => {
    setV(x);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => edit((d) => void setStockBudget(d, x)), 300);
  };
  return (
    <div className="st-budget" data-testid="staff-budget">
      <div className="st-assign__head">
        <span className="pn-small">
          Daily budget <b className="st-budget__v">{v === 0 ? 'Paused' : `${formatMoney(v)}/day`}</b>
        </span>
        <span className="pn-tiny pn-muted">{formatMoney(spent)} spent today</span>
      </div>
      <Slider value={v} min={0} max={max} step={5} onChange={commit} label={`${m.name}’s daily stock budget`} />
      <p className="pn-tiny pn-muted" style={{ margin: 0 }}>
        Keeps a few days of every food your animals eat, and salt for marine water changes. Orders show in Finances as “ordered by {first(m)}”.
      </p>
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
        <Button size="sm" variant="primary" disabled={!check.ok} title={check.ok ? `Hire ${first(c)}` : check.reason} data-testid={`staff-hire-${c.id}`} onClick={() => act((d) => { const r = hireStaff(d, c.id); if (r.ok) hiredFlag(d); return r; }, { sound: 'confirm', kind: 'success' })}>
          <UserPlus size={14} aria-hidden /> Hire
        </Button>
      </div>
      {trait && (
        <p className="st-card__trait">
          <b>{trait.label}</b> — {trait.line}
        </p>
      )}
      <p className="pn-tiny pn-muted st-card__blurb">{STAFF_ROLES[c.role].blurb}</p>
      {!check.ok && check.reason && !/has room for/.test(check.reason) && <p className="pn-tiny st-card__why">{check.reason}</p>}
    </article>
  );
}
