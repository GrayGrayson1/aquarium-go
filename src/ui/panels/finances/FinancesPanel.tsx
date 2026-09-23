/**
 * Finances — balance, 14-day income vs expenses chart, categorised ledger, operating cost by tank, and debt/loan
 * status with concrete advice. OWNER: lane "ui-panels".
 */
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Wallet, TrendingUp, TrendingDown, Receipt, Gauge, TriangleAlert, HandCoins, Lightbulb, Landmark, Layers, Building2, Users } from 'lucide-react';
import type { GameState, LedgerEntry } from '@/types';
import { Money, formatMoney } from '@/ui/kit';
import { dailyOperatingCost, cashSuggestions, LOAN_AFTER_DEBT_HOURS, type OperatingCosts } from '@/sim/economy';
import { PanelLayout } from '../common/PanelLayout';
import { usePanelGame, safe } from '../common/hooks';
import { Chip, Seg, EmptyState, SectionHead, Tile, Callout, Bar } from '../common/parts';
import { IncomeChart, type DayPoint } from './IncomeChart';
import { orderedTanks, dailyCost } from '../common/derive';
import { LEDGER_LABEL, dayOfHour, relTime, formatSpan } from '../common/format';

type LedgerFilter = 'all' | 'income' | 'expenses';

export function FinancesPanel() {
  const g = usePanelGame(1000);
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [cat, setCat] = useState<LedgerEntry['category'] | 'all'>('all');

  const data = useMemo(() => {
    if (!g) return null;
    const today = dayOfHour(g.clock.hour);
    const byDay = new Map<number, DayPoint>();
    for (const d of g.finance.daily.slice(-14)) byDay.set(d.day, { day: d.day, label: `Day ${d.day}`, income: Math.max(0, d.income), expenses: Math.abs(d.expenses) });
    // Today's running totals from the ledger (the daily summary is written at day end).
    if (!byDay.has(today)) {
      const lo = (today - 1) * 24;
      let inc = 0;
      let exp = 0;
      for (const e of g.finance.ledger) if (e.hour >= lo) e.amount >= 0 ? (inc += e.amount) : (exp -= e.amount);
      byDay.set(today, { day: today, label: 'Today (so far)', income: inc, expenses: exp, today: true });
    }
    const series = [...byDay.values()].sort((a, b) => a.day - b.day).slice(-14);
    const from = (today - 14) * 24;
    const recent = g.finance.ledger.filter((e) => e.hour >= from);
    const cats = new Map<CatKey, { inc: number; exp: number }>();
    for (const e of recent) {
      // lane:staff — wages are operating costs in the ledger, but get their own line in the breakdown
      const key: CatKey = e.category === 'operating' && e.memo.startsWith('Wages') ? 'wages' : e.category;
      const c = cats.get(key) ?? { inc: 0, exp: 0 };
      if (e.amount >= 0) c.inc += e.amount;
      else c.exp -= e.amount;
      cats.set(key, c);
    }
    const income = [...cats.entries()].filter(([, v]) => v.inc > 0).map(([k, v]) => ({ k, v: v.inc })).sort((a, b) => b.v - a.v);
    const expenses = [...cats.entries()].filter(([, v]) => v.exp > 0).map(([k, v]) => ({ k, v: v.exp })).sort((a, b) => b.v - a.v);
    const ops: OperatingCosts = safe(() => dailyOperatingCost(g), { total: orderedTanks(g).reduce((a, t) => a + dailyCost(g, t), 0), tanks: orderedTanks(g).map((t) => ({ tankId: t.id, name: t.name, cost: dailyCost(g, t) })), rent: 0, levelName: '' });
    const net14 = series.reduce((a, d) => a + d.income - d.expenses, 0);
    const todayPt = series.find((d) => d.day === today);
    return { series, income, expenses, ops, net14, todayPt };
  }, [g]);

  if (!g || !data) return null;
  const money = g.finance.money;
  const inDebt = money < 0;
  const debtHours = g.finance.debtSinceHour != null ? g.clock.hour - g.finance.debtSinceHour : 0;
  const loan = g.finance.loan;
  const runway = data.ops.total > 0 ? money / data.ops.total : Infinity;
  const tips = inDebt || runway < 3 ? safe(() => cashSuggestions(g), []) : [];

  const ledger = [...g.finance.ledger]
    .filter((e) => (filter === 'income' ? e.amount >= 0 : filter === 'expenses' ? e.amount < 0 : true))
    .filter((e) => cat === 'all' || e.category === cat)
    .sort((a, b) => b.hour - a.hour)
    .slice(0, 60);
  const ledgerCats = [...new Set(g.finance.ledger.map((e) => e.category))];

  return (
    <PanelLayout title="Finances" icon={<Wallet size={20} />} subtitle={`${formatMoney(money)} in the bank · ${formatMoney(data.ops.total, { cents: data.ops.total < 20 })}/day to run everything`}>
      <div className="pn-stack pn-stack--lg">
        <div className="pn-balance">
          <div>
            <div className="pn-tiny pn-muted pn-balance__label">Balance</div>
            <div className={clsx('pn-balance__v', inDebt && 'pn-tone-danger')}>{formatMoney(money)}</div>
          </div>
          <div className="pn-balance__deltas">
            {data.todayPt && (
              <span className={clsx('pn-balance__delta', data.todayPt.income - data.todayPt.expenses >= 0 ? 'is-up' : 'is-down')}>
                {data.todayPt.income - data.todayPt.expenses >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatMoney(data.todayPt.income - data.todayPt.expenses, { sign: true })} today
              </span>
            )}
            <span className={clsx('pn-balance__delta', data.net14 >= 0 ? 'is-up' : 'is-down')}>
              {data.net14 >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatMoney(data.net14, { sign: true })} over {data.series.length} day{data.series.length === 1 ? '' : 's'} {/* lane:qa-play: "1 days" */}
            </span>
          </div>
        </div>

        {(inDebt || (loan && loan.outstanding > 0)) && (
          <Callout tone={inDebt ? 'danger' : 'watch'} icon={inDebt ? <TriangleAlert size={16} /> : <Landmark size={16} />} title={inDebt ? `In debt${debtHours > 0 ? ` for ${formatSpan(debtHours)}` : ''}` : 'Aquarium-club loan'}>
            {inDebt && (
              <>
                Bills still come due while you’re below zero, and new purchases are on hold.
                {!loan && debtHours < LOAN_AFTER_DEBT_HOURS && <> If it lasts {formatSpan(LOAN_AFTER_DEBT_HOURS)}, the aquarium club will offer a one-time emergency loan.</>}{' '}
              </>
            )}
            {loan && loan.outstanding > 0 && (
              <>
                You owe <b>{formatMoney(loan.outstanding)}</b> of a {formatMoney(loan.amount)} loan — a quarter of each day’s income goes toward it automatically.
              </>
            )}
          </Callout>
        )}
        {!inDebt && runway < 3 && data.ops.total > 0 && (
          <Callout tone="watch" icon={<Gauge size={16} />} title="Running low">
            About {Math.max(0, Math.floor(runway))} day{Math.floor(runway) === 1 ? '' : 's'} of running costs left in the bank.
          </Callout>
        )}
        {tips.length > 0 && (
          <div className="pn-card pn-advice">
            <SectionHead title="Ways to raise cash" icon={<Lightbulb size={14} />} />
            <ul>
              {tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="pn-card">
          <SectionHead title="Last 14 days" icon={<Receipt size={14} />} />
          {data.series.every((d) => d.income === 0 && d.expenses === 0) ? (
            <EmptyState icon={<Receipt size={22} />} title="No transactions yet">
              Income and costs will chart here day by day.
            </EmptyState>
          ) : (
            <IncomeChart data={data.series} />
          )}
        </section>

        <div className="pn-grid pn-grid--2">
          <CategoryList title="Income · 14 days" icon={<TrendingUp size={14} />} rows={data.income} tone="income" />
          <CategoryList title="Spending · 14 days" icon={<TrendingDown size={14} />} rows={data.expenses} tone="expense" />
        </div>

        <section>
          <SectionHead title="Running costs per day" icon={<Gauge size={14} />} />
          <div className="pn-card pn-opcosts">
            {data.ops.tanks.length === 0 && data.ops.rent === 0 ? (
              <span className="pn-small pn-muted">Nothing to run yet.</span>
            ) : (
              <>
                {[...data.ops.tanks]
                  .sort((a, b) => b.cost - a.cost)
                  .map((t) => (
                    <div key={t.tankId} className="pn-opcost">
                      <span className="pn-opcost__name pn-ellipsis">
                        {/* lane:w2-ui — icon never shrinks away; long names end in … (phones clipped "Rent · Specialty Shop" and lost its icon) */}
                        <Layers size={12} className="pn-muted" aria-hidden style={{ flex: 'none' }} /> <span className="pn-ellipsis">{t.name}</span>
                      </span>
                      <div className="pn-grow">
                        <Bar value={(t.cost / Math.max(0.01, data.ops.total)) * 100} tone="coral" label={`${t.name} running cost`} thin />
                      </div>
                      <span className="pn-opcost__v">{formatMoney(t.cost, { cents: true })}</span>
                    </div>
                  ))}
                {data.ops.rent > 0 && (
                  <div className="pn-opcost">
                    <span className="pn-opcost__name pn-ellipsis">
                      <Building2 size={12} className="pn-muted" aria-hidden style={{ flex: 'none' }} /> <span className="pn-ellipsis">Rent · {data.ops.levelName}</span>
                    </span>
                    <div className="pn-grow">
                      <Bar value={(data.ops.rent / Math.max(0.01, data.ops.total)) * 100} tone="coral" label="Rent" thin />
                    </div>
                    <span className="pn-opcost__v">{formatMoney(data.ops.rent, { cents: true })}</span>
                  </div>
                )}
                {(data.ops.wages ?? 0) > 0 && (
                  // lane:staff — the team's wages, paid at midnight with the bills
                  <div className="pn-opcost" data-testid="finance-wages">
                    <span className="pn-opcost__name pn-ellipsis">
                      <Users size={12} className="pn-muted" aria-hidden style={{ flex: 'none' }} /> <span className="pn-ellipsis">Wages · {data.ops.staffCount} staff</span>
                    </span>
                    <div className="pn-grow">
                      <Bar value={((data.ops.wages ?? 0) / Math.max(0.01, data.ops.total)) * 100} tone="coral" label="Staff wages" thin />
                    </div>
                    <span className="pn-opcost__v">{formatMoney(data.ops.wages ?? 0, { cents: true })}</span>
                  </div>
                )}
                <div className="pn-opcost pn-opcost--total">
                  <span className="pn-opcost__name">Total per day</span>
                  <div className="pn-grow" />
                  <span className="pn-opcost__v">{formatMoney(data.ops.total, { cents: true })}</span>
                </div>
              </>
            )}
          </div>
          <p className="pn-tiny pn-muted" style={{ marginTop: 8 }}>
            Electricity for filters, heaters and lights, wear on equipment, and salt for marine water changes. Empty tanks still cost money to run.
            {(data.ops.wages ?? 0) > 0 && ' Staff wages are paid at midnight; if the cash runs out, they work a short notice period rather than putting you in debt.'}
          </p>
        </section>

        <section>
          <SectionHead title="Ledger" icon={<HandCoins size={14} />}>
            <Seg<LedgerFilter> size="sm" label="Ledger filter" value={filter} onChange={setFilter} items={[{ id: 'all', label: 'All' }, { id: 'income', label: 'Income' }, { id: 'expenses', label: 'Spending' }]} />
          </SectionHead>
          {ledgerCats.length > 1 && (
            <div className="pn-chips pn-chips--scroll" style={{ marginBottom: 10 }}>
              <Chip onClick={() => setCat('all')} pressed={cat === 'all'}>
                Every category
              </Chip>
              {ledgerCats.map((c) => (
                <Chip key={c} onClick={() => setCat(c)} pressed={cat === c}>
                  {LEDGER_LABEL[c] ?? c}
                </Chip>
              ))}
            </div>
          )}
          {ledger.length === 0 ? (
            <EmptyState icon={<Receipt size={22} />} title="No entries">
              Nothing matches this filter yet.
            </EmptyState>
          ) : (
            <ul className="pn-ledger">
              {ledger.map((e, i) => (
                <li key={i} className="pn-ledger__row">
                  <span className={clsx('pn-ledger__dot', e.amount >= 0 ? 'is-in' : 'is-out')} aria-hidden />
                  <span className="pn-grow pn-col" style={{ gap: 1 }}>
                    <span className="pn-small pn-ellipsis">{e.memo}</span>
                    <span className="pn-tiny pn-muted">
                      {LEDGER_LABEL[e.category] ?? e.category} · Day {dayOfHour(e.hour)} · {relTime(e.hour, g.clock.hour)}
                    </span>
                  </span>
                  <Money value={e.amount} sign cents={Math.abs(e.amount) < 10 && Math.round(e.amount) !== e.amount} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelLayout>
  );
}

/** lane:staff — ledger categories plus the 'wages' breakdown line (operating entries whose memo starts "Wages"). */
type CatKey = LedgerEntry['category'] | 'wages';
const catLabel = (k: CatKey) => (k === 'wages' ? 'Staff wages' : LEDGER_LABEL[k] ?? k);

function CategoryList({ title, icon, rows, tone }: { title: string; icon: React.ReactNode; rows: { k: CatKey; v: number }[]; tone: 'income' | 'expense' }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  const total = rows.reduce((a, r) => a + r.v, 0);
  return (
    <div className="pn-card">
      <SectionHead title={title} icon={icon}>
        <span className="pn-small pn-num-t">
          <Money value={total} />
        </span>
      </SectionHead>
      {rows.length === 0 ? (
        <span className="pn-small pn-muted">{tone === 'income' ? 'No income yet.' : 'No spending yet.'}</span>
      ) : (
        <div className="pn-col pn-gap-2">
          {rows.slice(0, 6).map((r) => (
            <div key={r.k} className="pn-catrow">
              <div className="pn-metric__row">
                <span className="pn-dim">{catLabel(r.k)}</span>
                <span className="pn-metric__val">{formatMoney(r.v)}</span>
              </div>
              <div className="pn-catbar">
                <div className={`pn-catbar__fill pn-catbar__fill--${tone}`} style={{ width: `${(r.v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
