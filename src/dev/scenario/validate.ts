/**
 * validateRecipe (chunk 15): what the lab shows while a recipe is edited. A trial build (no runs forward) names each
 * problem; the game's own compatibility verdict for each tank warns about a bad pairing without refusing it, since
 * bad setups are what the owner wants to test (ADR-0051 decision 5).
 */
import type { CompatVerdict } from '@/types';
import { evaluateTank } from '@/sim/compat';
import { getTankTier } from '@/data/catalog/tanks';
import { buildScenario, type BuildEnv, type BuildIssue } from './build';

export interface Validation {
  issues: BuildIssue[];
  /** What the recipe makes. */
  counts: { tanks: number; animals: number; young: number; staff: number; listings: number; offers: number };
  tanks: { name: string; gallons: number; animals: number; verdict: CompatVerdict; status: string; reason?: string }[];
  /** Every animal's name in the built world (listings, shows and lines refer to animals by name). */
  names: string[];
}

const RISKY: CompatVerdict[] = ['high_risk', 'incompatible'];

export function validateRecipe(input: unknown, env: BuildEnv = {}): Validation {
  const built = buildScenario(input, { ...env, trial: true });
  const g = built.state;
  const issues = [...built.issues];
  const tanks: Validation['tanks'] = [];
  for (const [name, id] of Object.entries(built.tanks)) {
    const t = g.tanks[id];
    if (!t) continue;
    let verdict: CompatVerdict = 'excellent';
    let reason: string | undefined;
    try {
      const rep = evaluateTank(g, id);
      verdict = rep.verdict;
      reason = rep.reasons.find((r) => r.severity === 'critical' || r.severity === 'warning' || r.severity === 'caution')?.text;
    } catch {
      /* an empty or unusual tank: no verdict */
    }
    const animals = Object.values(g.creatures).filter((c) => c.tankId === id && (c.status === 'alive' || c.status === 'listed')).length;
    tanks.push({ name, gallons: getTankTier(t.tierId).gallons, animals, verdict, status: t.cache.status, ...(reason ? { reason } : {}) });
    if (RISKY.includes(verdict)) issues.push({ level: 'warning', at: name, message: `The game rates "${name}" ${verdict.replace('_', ' ')}${reason ? `: ${reason}` : ''} (built anyway).` });
  }
  return {
    issues,
    counts: {
      tanks: Object.keys(built.tanks).length,
      animals: Object.keys(built.animals).length,
      young: Object.values(g.clutches).reduce((n, cl) => n + cl.count, 0),
      staff: g.staff?.roster.length ?? 0,
      listings: g.market.listings.filter((l) => l.status === 'active').length,
      offers: g.market.stock.length,
    },
    tanks,
    names: Object.keys(built.animals),
  };
}
