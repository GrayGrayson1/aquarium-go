/**
 * Safe derived-data helpers over GameState for panels (every domain call is guarded so stubs/mid-edit code never
 * crash the UI). OWNER: lane "ui-panels".
 */
import type { Creature, GameState, Tank, TankTier, SpeciesDefinition, CompatReport, ValueBreakdown, TankValuation } from '@/types';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { creatureValue, tankValuation } from '@/sim/economy';
import { tankDailyCost, getWaterReport } from '@/sim/water';
import { isUnlocked } from '@/sim/facility';
import { creaturesInTank, clutchesInTank, creatureWellbeing, morphDisplayName, type CreatureWellbeing } from '@/sim/life';
import { safe } from './hooks';

export const tierOf = (t: Tank): TankTier | undefined => TANK_TIER_BY_ID[t.tierId];
export const gallonsOf = (t: Tank): number => TANK_TIER_BY_ID[t.tierId]?.gallons ?? 0;
export const speciesOf = (id: string): SpeciesDefinition | undefined => findSpecies(id);

export function orderedTanks(g: GameState): Tank[] {
  const out: Tank[] = [];
  for (const id of g.tankOrder) if (g.tanks[id]) out.push(g.tanks[id]);
  for (const t of Object.values(g.tanks)) if (!g.tankOrder.includes(t.id)) out.push(t);
  return out;
}

export function livingInTank(g: GameState, tankId: string): Creature[] {
  return safe(() => creaturesInTank(g, tankId), Object.values(g.creatures).filter((c) => c.tankId === tankId && (c.status === 'alive' || c.status === 'listed')));
}

export function clutchesIn(g: GameState, tankId: string) {
  return safe(() => clutchesInTank(g, tankId), []);
}

export function ownedCreatures(g: GameState): Creature[] {
  return Object.values(g.creatures).filter((c) => c.status === 'alive' || c.status === 'listed');
}

export function valueOf(g: GameState, c: Creature): number {
  return safe(() => creatureValue(g, c).total, 0);
}

export function valueBreakdown(g: GameState, c: Creature): ValueBreakdown | null {
  return safe<ValueBreakdown | null>(() => creatureValue(g, c), null);
}

export function tankValue(g: GameState, tankId: string): TankValuation | null {
  return safe<TankValuation | null>(() => tankValuation(g, tankId), null);
}

export function dailyCost(g: GameState, t: Tank): number {
  return safe(() => tankDailyCost(g, t), 0);
}

export function waterReport(g: GameState, tankId: string) {
  return safe(() => getWaterReport(g, tankId), null);
}

export function unlocked(g: GameState, key: string | null | undefined): boolean {
  if (!key) return true;
  return safe(() => isUnlocked(g, key), g.progress.unlocked.includes(key));
}

export function speciesUnlocked(g: GameState, sp: SpeciesDefinition): boolean {
  return (sp.unlock?.requires ?? []).every((k) => unlocked(g, k));
}

export function isListed(g: GameState, creatureId: string): boolean {
  const c = g.creatures[creatureId];
  if (c?.status === 'listed') return true;
  return g.market.listings.some((l) => l.status === 'active' && l.creatureIds.includes(creatureId));
}

export function activeListingFor(g: GameState, creatureId: string) {
  return g.market.listings.find((l) => l.status === 'active' && l.creatureIds.includes(creatureId));
}

export function ageDaysOf(g: GameState, c: Creature): number {
  return Math.max(0, (g.clock.hour - c.bornHour) / 24);
}

export function formatAge(days: number): string {
  if (days < 1) return 'newborn';
  if (days < 2) return '1 day';
  return `${Math.floor(days)} days`;
}

/** Worst-first sort helper. */
export const worstStatus = (a: 'good' | 'watch' | 'danger', b: 'good' | 'watch' | 'danger') => (a === 'danger' || b === 'danger' ? 'danger' : a === 'watch' || b === 'watch' ? 'watch' : 'good');

// lane:qa-play — hunger bands match the sim's wellbeing (≥70 "Very hungry" = Watch, ≥90 "Starving" = Danger)
export function creatureCondition(c: Creature): 'good' | 'watch' | 'danger' {
  if (c.illness || c.stats.health < 45 || c.stats.stress > 75 || c.stats.hunger >= 90) return 'danger';
  if (c.stats.health < 72 || c.stats.stress > 50 || c.stats.hunger >= 70 || c.stats.comfort < 45) return 'watch';
  return 'good';
}

export function conditionWord(c: Creature): string {
  if (c.illness) return 'Unwell';
  if (c.stats.hunger >= 90) return 'Starving';
  if (c.stats.health < 45) return 'Poor health';
  if (c.stats.stress > 75) return 'Very stressed';
  if (c.stats.hunger >= 70) return 'Very hungry';
  if (c.stats.stress > 50) return 'Stressed';
  if (c.stats.health < 72) return 'Recovering';
  if (c.stats.comfort < 45) return 'Uncomfortable';
  return 'Thriving';
}

export const EMPTY_COMPAT: CompatReport = { verdict: 'excellent', score: 100, reasons: [], pairs: [], perSpecies: {} };

/** Species + morph without repeated words ("Royal Blue Veiltail Betta"); falls back to the common name. */
export function morphName(c: { speciesId: string; morphName?: string }): string {
  const sp = speciesOf(c.speciesId);
  if (!sp) return c.speciesId;
  return safe(() => morphDisplayName(sp, c.morphName ?? ''), c.morphName && !/^wild/i.test(c.morphName) ? `${c.morphName} ${sp.commonName}` : sp.commonName);
}

/** The lifecycle lane's welfare summary (status + headline + notes), with a light local fallback. */
export function wellbeing(g: GameState, c: Creature): CreatureWellbeing {
  return safe(() => creatureWellbeing(g, c), { status: creatureCondition(c), headline: conditionWord(c), notes: [], stress: [] } as CreatureWellbeing);
}
