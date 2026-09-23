/**
 * 14-day income vs expenses: mirrored columns around a single zero baseline (income up, expenses down) with the
 * daily net as a neutral line. One $ axis, legend, per-day hover/focus tooltip, and a table view.
 * Colours validated for the dark sheet (dataviz validator: lightness band, CVD, contrast all PASS):
 *   income #1AA593, expenses #E0623C. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { formatMoney } from '@/ui/kit';

export interface DayPoint {
  day: number;
  label: string;
  income: number;
  expenses: number; // positive number
  today?: boolean;
}

const INCOME = '#1AA593';
const EXPENSE = '#E0623C';
const NET = '#E9F4F6';

function niceStep(range: number): number {
  const raw = range / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function compact(v: number): string {
  const a = Math.abs(v);
  const s = a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${Math.round(a)}`;
  return `${v < 0 ? '−' : ''}$${s}`;
}

export function IncomeChart({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 640);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [table]);
  // Draw at the real pixel width so axis text stays legible on phones.
  const W = Math.max(280, Math.min(1100, width));
  const H = W < 480 ? 220 : 260;
  const padL = W < 480 ? 44 : 52;
  const padR = 12;
  const padT = 14;
  const padB = 30;

  const geo = useMemo(() => {
    const maxUp = Math.max(10, ...data.map((d) => Math.max(d.income, d.income - d.expenses)));
    const maxDown = Math.max(10, ...data.map((d) => Math.max(d.expenses, d.expenses - d.income)));
    const step = niceStep(maxUp + maxDown);
    const top = Math.ceil(maxUp / step) * step;
    const bottom = Math.ceil(maxDown / step) * step;
    const plotH = H - padT - padB;
    const y = (v: number) => padT + ((top - v) / (top + bottom)) * plotH;
    const ticks: number[] = [];
    for (let v = -bottom; v <= top + 1e-6; v += step) ticks.push(Math.round(v));
    const n = Math.max(1, data.length);
    const slot = (W - padL - padR) / n;
    const barW = Math.min(18, Math.max(6, slot * 0.46));
    return { y, ticks, slot, barW, zero: y(0) };
  }, [data, W, H, padL]);

  if (data.length === 0) return null;
  const { y, ticks, slot, barW, zero } = geo;
  const cx = (i: number) => padL + slot * i + slot / 2;
  const r = 4;
  const colPath = (x: number, y0: number, y1: number) => {
    // Rounded data-end, square at the baseline.
    const h = Math.abs(y1 - y0);
    if (h < 0.5) return '';
    const rr = Math.min(r, h, barW / 2);
    if (y1 < y0) {
      // going up
      return `M${x} ${y0} L${x} ${y1 + rr} Q${x} ${y1} ${x + rr} ${y1} L${x + barW - rr} ${y1} Q${x + barW} ${y1} ${x + barW} ${y1 + rr} L${x + barW} ${y0} Z`;
    }
    return `M${x} ${y0} L${x} ${y1 - rr} Q${x} ${y1} ${x + rr} ${y1} L${x + barW - rr} ${y1} Q${x + barW} ${y1} ${x + barW} ${y1 - rr} L${x + barW} ${y0} Z`;
  };
  const netPts = data.map((d, i) => [cx(i), y(d.income - d.expenses)] as const);
  const hv = hover != null ? data[hover] : null;
  const labelEvery = W < 480 ? 3 : data.length > 10 ? 2 : 1;
  const totals = data.reduce((a, d) => ({ inc: a.inc + d.income, exp: a.exp + d.expenses }), { inc: 0, exp: 0 });

  return (
    <div className="pn-chart">
      <div className="pn-chart__head">
        <div className="pn-chart__legend" aria-hidden={table}>
          <span className="pn-legend">
            <i className="pn-legend__rect" style={{ background: INCOME }} /> Income
          </span>
          <span className="pn-legend">
            <i className="pn-legend__rect" style={{ background: EXPENSE }} /> Expenses
          </span>
          <span className="pn-legend">
            <i className="pn-legend__line" style={{ background: NET }} /> Net
          </span>
        </div>
        <button type="button" className="pn-link" onClick={() => setTable(!table)} aria-pressed={table}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {table ? (
        <div className="pn-chart__table">
          <table>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Income</th>
                <th scope="col">Expenses</th>
                <th scope="col">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day}>
                  <th scope="row">{d.label}</th>
                  <td>{formatMoney(d.income)}</td>
                  <td>{formatMoney(-d.expenses)}</td>
                  <td className={d.income - d.expenses >= 0 ? 'pn-tone-good' : 'pn-tone-danger'}>{formatMoney(d.income - d.expenses, { sign: true })}</td>
                </tr>
              ))}
              <tr className="pn-chart__total">
                <th scope="row">14 days</th>
                <td>{formatMoney(totals.inc)}</td>
                <td>{formatMoney(-totals.exp)}</td>
                <td>{formatMoney(totals.inc - totals.exp, { sign: true })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pn-chart__plot" ref={wrapRef} onPointerLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Income and expenses for the last ${data.length} days. Total income ${formatMoney(totals.inc)}, expenses ${formatMoney(totals.exp)}.`} style={{ height: 'auto', aspectRatio: `${W} / ${H}` }}>
            {/* grid + y ticks */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'rgba(200,235,245,0.35)' : 'rgba(200,235,245,0.08)'} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="pn-chart__tick">
                  {compact(t)}
                </text>
              </g>
            ))}
            {/* hover band */}
            {hover != null && <rect x={padL + slot * hover + 1} y={padT - 6} width={slot - 2} height={H - padT - padB + 12} rx={8} fill="rgba(255,255,255,0.05)" />}
            {/* columns */}
            {data.map((d, i) => {
              const x = cx(i) - barW / 2;
              return (
                <g key={d.day} opacity={hover == null || hover === i ? 1 : 0.55}>
                  {d.income > 0 && <path d={colPath(x, zero - 1, y(d.income))} fill={INCOME} />}
                  {d.expenses > 0 && <path d={colPath(x, zero + 1, y(-d.expenses))} fill={EXPENSE} />}
                </g>
              );
            })}
            {/* net line */}
            <polyline points={netPts.map((p) => p.join(',')).join(' ')} fill="none" stroke={NET} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} vectorEffect="non-scaling-stroke" />
            {netPts.map(([x, yy], i) => (
              <circle key={i} cx={x} cy={yy} r={hover === i ? 5 : 3.5} fill={NET} stroke="#081820" strokeWidth={2} />
            ))}
            {/* x labels */}
            {data.map((d, i) =>
              i % labelEvery === (data.length - 1) % labelEvery ? (
                <text key={d.day} x={cx(i)} y={H - 10} textAnchor="middle" className={clsx('pn-chart__tick', d.today && 'is-today')}>
                  {d.today ? 'Today' : `D${d.day}`}
                </text>
              ) : null,
            )}
            {/* hit targets (bigger than the marks) */}
            {data.map((d, i) => (
              <rect
                key={`hit-${d.day}`}
                x={padL + slot * i}
                y={0}
                width={slot}
                height={H}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.label}: income ${formatMoney(d.income)}, expenses ${formatMoney(d.expenses)}, net ${formatMoney(d.income - d.expenses, { sign: true })}`}
                onPointerEnter={() => setHover(i)}
                onPointerMove={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: 'none', cursor: 'default' }}
              />
            ))}
          </svg>
          {hv && hover != null && (
            <div className="pn-chart__tip" style={{ left: `${(cx(hover) / W) * 100}%` }} role="status">
              <div className="pn-chart__tipday">{hv.label}</div>
              <div className="pn-chart__tiprow">
                <i style={{ background: INCOME }} />
                <b>{formatMoney(hv.income)}</b>
                <span>income</span>
              </div>
              <div className="pn-chart__tiprow">
                <i style={{ background: EXPENSE }} />
                <b>{formatMoney(hv.expenses)}</b>
                <span>expenses</span>
              </div>
              <div className="pn-chart__tiprow">
                <i style={{ background: NET }} />
                <b className={hv.income - hv.expenses >= 0 ? 'pn-tone-good' : 'pn-tone-danger'}>{formatMoney(hv.income - hv.expenses, { sign: true })}</b>
                <span>net</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
