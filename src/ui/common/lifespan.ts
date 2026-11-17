/**
 * Audit 2026-11-17 (D20, the owner's decision) — how long an animal lives, in words for its card: every animal's
 * lifespan, a heads-up once it is an elder, and, for the first companion (whom old age never takes, src/sim/life/step.ts),
 * a line that says so. OWNER: lane "ui-shell".
 */
import type { Creature, SpeciesDefinition } from '@/types';
import { ageDaysOf } from '@/sim/life/growth';

export interface LifespanFacts {
  /** "About 160 days" — null for the first companion, whom old age never takes. */
  value: string | null;
  /** The companion's line, or an elder's "last stretch" heads-up. */
  note: string | null;
}

function pronouns(c: Pick<Creature, 'sex'>): { obj: string; their: string } {
  if (c.sex === 'female') return { obj: 'her', their: 'her' };
  if (c.sex === 'male') return { obj: 'him', their: 'his' };
  return { obj: 'them', their: 'their' };
}

export function lifespanDaysText(sp: Pick<SpeciesDefinition, 'lifecycle'>): string {
  return `${Math.max(1, Math.round(sp.lifecycle.lifespanDays))} days`;
}

export function lifespanFacts(c: Creature, sp: SpeciesDefinition, nowHour: number): LifespanFacts {
  const living = c.status === 'alive' || c.status === 'listed';
  if (c.isStarter) return { value: null, note: living ? `${c.name} is your first companion and will stay with you as long as you look after ${pronouns(c).obj}.` : null };
  let note: string | null = null;
  if (living && c.lifeStage === 'elder') {
    const left = Math.max(1, Math.round(sp.lifecycle.lifespanDays - ageDaysOf(c, nowHour)));
    note = `${c.name} is in ${pronouns(c).their} last stretch: about ${left} ${left === 1 ? 'day' : 'days'} left.`;
  }
  return { value: `About ${lifespanDaysText(sp)}`, note };
}
