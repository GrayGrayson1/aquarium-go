/**
 * Requirement checklist with per-condition progress (icon + words + bar; never colour alone). OWNER: lane "ui-panels".
 * Accepts the facility lane's requirement shape ({ label, met, current, target }).
 */
import clsx from 'clsx';
import { CircleCheck, Circle } from 'lucide-react';
import type { GameState } from '@/types';
import type { Cond } from '@/data/unlocks';
import { evalCond } from '@/sim/facility';
import { Bar } from './parts';
import { safe } from './hooks';

export interface Req {
  label: string;
  met: boolean;
  current: number;
  target: number;
}

function fmt(n: number): string {
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : String(Math.round(n * 10) / 10);
}

/** Evaluate unlock conditions with the facility lane's evaluator. */
export function reqsFor(g: GameState, conds: Cond[]): Req[] {
  const cache = {};
  return conds.map((c) => safe(() => evalCond(g, c, cache), { met: false, current: 0, target: 1, label: c.type }));
}

export function Requirements({ items, compact }: { items: Req[]; compact?: boolean }) {
  if (items.length === 0) return <div className="pn-small pn-muted">No requirements.</div>;
  return (
    <ul className={clsx('pn-reqs', compact && 'pn-reqs--compact')}>
      {items.map((it, i) => {
        const Icon = it.met ? CircleCheck : Circle;
        const numeric = it.target > 1;
        const frac = it.target > 0 ? Math.max(0, Math.min(1, it.current / it.target)) : it.met ? 1 : 0;
        return (
          <li key={i} className={clsx('pn-req', it.met && 'is-done')}>
            <span className="pn-req__icon" aria-hidden>
              <Icon size={14} />
            </span>
            <div className="pn-grow">
              <div className="pn-req__row">
                <span className="pn-req__label">
                  <span className="pn-sr">{it.met ? 'Done: ' : 'Not yet: '}</span>
                  {it.label}
                </span>
                {numeric && (
                  <span className="pn-req__num">
                    {fmt(Math.min(it.current, it.target))}/{fmt(it.target)}
                  </span>
                )}
              </div>
              {!it.met && numeric && <Bar value={frac * 100} tone="aqua" label={it.label} thin />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
