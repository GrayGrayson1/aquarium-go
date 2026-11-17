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

/**
 * Audit 2026-11-17 (G11) — a rule's conditions as the boxes show them: every "any of" split into its alternatives (each
 * with its own progress), and a research project that is also offered as a route (`routes`: its ids) left out of the
 * checklist, so "○ Research: Reef Systems" isn't repeated as "Or research Reef Systems". An "any of" left with one
 * alternative is a plain requirement.
 */
export function ruleParts(g: GameState, conds: readonly Cond[], routes: readonly string[] = []): { requirements: Req[]; either: Req[][] } {
  const isRoute = (c: Cond) => c.type === 'research' && routes.includes(c.id);
  const groups = conds.filter((c): c is Extract<Cond, { type: 'any' }> => c.type === 'any').map((c) => c.of.filter((x) => !isRoute(x)));
  const flat = [...conds.filter((c) => c.type !== 'any' && !isRoute(c)), ...groups.filter((grp) => grp.length === 1).map((grp) => grp[0])];
  return { requirements: reqsFor(g, flat), either: groups.filter((grp) => grp.length > 1).map((grp) => reqsFor(g, grp)) };
}

/** Audit 2026-11-17 (G11): `ruleParts` drawn: the checklist, then "Any one of these:" / "And one of these:" groups. */
export function RuleRequirements({ g, conds, routes, compact }: { g: GameState; conds: readonly Cond[]; routes?: readonly string[]; compact?: boolean }) {
  const { requirements, either } = ruleParts(g, conds, routes);
  return (
    <>
      {requirements.length > 0 && <Requirements items={requirements} compact={compact} />}
      {either.map((alts, i) => (
        <div key={i} className="pn-unlockhelp__alts">
          <p className="pn-unlockhelp__either">{requirements.length || i > 0 ? 'And one of these:' : 'Any one of these:'}</p>
          <Requirements items={alts} compact={compact} />
        </div>
      ))}
    </>
  );
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
