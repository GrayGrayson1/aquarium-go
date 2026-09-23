/**
 * Who may enter which class — and the humane rules. OWNER: lane "shows".
 *
 * Shows are for healthy, settled adults only. Sick, injured, highly stressed, hungry, gravid, pregnant or brooding
 * animals stay home, as do animals still settling into a new tank or resting after their last show. Every "no"
 * comes with a plain reason the UI shows next to the animal.
 *
 * Travel is a labelled game abstraction: an entered animal is "benched at the show hall for the day and home by
 * evening". It stays visible in its tank (no removal), and comes home with a little temporary stress.
 */
import type { Creature, GameState, ShowTier, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { getDecorDef } from '@/data/catalog/decor';
import { SCAPED_EDITS } from '@/data/unlocks';
import { SHOW_BUSY_STAGES, SHOW_RULES, SHOW_TIERS, type ShowClassDef } from '@/data/shows';
import { counterValue, scapeEditsKey } from '../facility/progression';
import { GAME_HOURS_PER_REAL_SECOND } from '../time';

const TIER_ORDER: Record<ShowTier, number> = { club: 0, regional: 1, national: 2, international: 3 };

export function tierAtLeast(tier: ShowTier, min: ShowTier | undefined): boolean {
  return !min || TIER_ORDER[tier] >= TIER_ORDER[min];
}

// ───────────────────────────── class matching ─────────────────────────────

/** Does this animal belong in this livestock class at all (species / group / environment / fin type)? */
export function creatureFitsClass(def: ShowClassDef, c: Creature, sp: SpeciesDefinition | undefined = findSpecies(c.speciesId)): boolean {
  if (def.kind !== 'livestock' || !sp) return false;
  // Corals and anemones are never moved for a show.
  if (sp.category === 'coral' || sp.category === 'anemone') return false;
  const bySpecies = !!def.species?.includes(sp.id);
  const byGroup = !!def.groups?.includes(sp.group);
  const byEnv = !!def.env?.includes(sp.environment);
  if (!bySpecies && !byGroup && !byEnv) return false;
  if (def.finTypes && !def.finTypes.includes(c.appearance?.finType ?? '')) return false;
  return true;
}

export function livingDecorCounts(tank: Tank): { plants: number; corals: number; total: number } {
  let plants = 0;
  let corals = 0;
  for (const d of tank.decor ?? []) {
    const def = getDecorDef(d.defId);
    if (!def) continue;
    if (def.category === 'plant') plants++;
    else if (def.category === 'coral' || def.category === 'anemone') corals++;
  }
  return { plants, corals, total: tank.decor?.length ?? 0 };
}

export function tankGallons(tank: Tank): number {
  try {
    return getTankTier(tank.tierId).gallons;
  } catch {
    return 10;
  }
}

function aliveIn(state: GameState, tankId: string): Creature[] {
  const out: Creature[] = [];
  for (const c of Object.values(state.creatures)) if (c.tankId === tankId && (c.status === 'alive' || c.status === 'listed')) out.push(c);
  return out;
}

/** Class-shape reasons a tank does not fit an aquascape class (empty = it fits). */
export function tankClassReasons(state: GameState, def: ShowClassDef, tank: Tank): string[] {
  if (def.kind !== 'aquascape') return ['Not an aquascape class'];
  const out: string[] = [];
  const sc = def.scape ?? {};
  const gal = tankGallons(tank);
  const living = livingDecorCounts(tank);
  if (sc.maxGallons && gal > sc.maxGallons) out.push(`Too big for this class (${gal} gal; up to ${sc.maxGallons} gal)`);
  if (sc.planted && (tank.environment !== 'freshwater' || living.plants < 4)) out.push(tank.environment !== 'freshwater' ? 'Planted classes are for freshwater layouts' : `Needs at least 4 plants (has ${living.plants})`);
  if (sc.reef && (tank.waterClass !== 'reef' || living.corals < 2)) out.push(tank.waterClass !== 'reef' ? 'Needs a reef tank' : `Needs at least 2 corals (has ${living.corals})`);
  if (sc.biotope && aliveIn(state, tank.id).length === 0) out.push('A biotope needs animals from one habitat');
  return out;
}

export function tankFitsClass(state: GameState, def: ShowClassDef, tank: Tank): boolean {
  return tankClassReasons(state, def, tank).length === 0;
}

// ───────────────────────────── humane rules ─────────────────────────────

/** The pending entry this subject already has, if any (one show at a time). */
export function pendingEntryFor(state: GameState, subjectId: string): { showId: string; showName: string } | null {
  const s = state.shows;
  if (!s) return null;
  for (const e of s.entries) {
    if (e.status !== 'entered' || e.subjectId !== subjectId) continue;
    const show = s.shows.find((x) => x.id === e.showId);
    return { showId: e.showId, showName: show?.name ?? 'another show' };
  }
  return null;
}

/**
 * Why this animal can't go to a show right now (empty = fit to show). `forJudging` skips the checks that only
 * apply when entering (rest days, one-show-at-a-time), for the show-day welfare check.
 */
export function creatureShowReasons(state: GameState, c: Creature, opts: { forJudging?: boolean } = {}): string[] {
  const out: string[] = [];
  const now = state.clock.hour;
  const sp = findSpecies(c.speciesId);
  if (c.status === 'dead') return ['Passed away'];
  if (c.status === 'sold') return ['No longer in your care'];
  if (!c.tankId || !state.tanks[c.tankId]) return ['Not in a tank right now'];
  if (sp && (sp.category === 'coral' || sp.category === 'anemone')) return ['Corals and anemones stay in their tanks'];
  if (c.lifeStage !== 'adult' && c.lifeStage !== 'elder') out.push(c.lifeStage === 'juvenile' ? 'Too young — shows are for adults' : 'Far too young to travel');
  const s = c.stats;
  if (c.illness) out.push(`Unwell (${c.illness.kind.replace(/_/g, ' ')}) — rest at home until recovered`);
  else if ((s?.health ?? 100) < SHOW_RULES.minHealth) out.push(`Not in show condition (health ${Math.round(s.health)})`);
  if ((c.life?.injury ?? 0) > SHOW_RULES.maxInjury) out.push('Still healing from an injury');
  if ((s?.stress ?? 0) > SHOW_RULES.maxStress) out.push(`Too stressed to travel (stress ${Math.round(s.stress)}) — let it settle first`);
  if ((s?.hunger ?? 0) > SHOW_RULES.maxHunger) out.push('Hungry — feed well before show day');
  const stage = c.repro?.stage ?? 'idle';
  const busy = SHOW_BUSY_STAGES[stage];
  if (busy) out.push(busy);
  else if ((c.repro?.carryingUntilHour ?? -Infinity) > now) out.push('Carrying young');
  else if (Object.values(state.clutches ?? {}).some((cl) => cl.guardedById === c.id)) out.push('Guarding a clutch');
  const arrived = Math.max(Number.isFinite(c.acquiredHour) ? c.acquiredHour : -Infinity, c.life?.settledSinceHour ?? -Infinity);
  if (now - arrived < SHOW_RULES.settleHours) out.push(`Still settling in (arrived ${Math.max(1, Math.round(now - arrived))} h ago)`);
  const tank = state.tanks[c.tankId];
  if ((tank.cache?.waterStatus ?? tank.cache?.status) === 'danger') out.push('Its tank’s water needs attention first');
  if (!opts.forJudging) {
    const last = c.awards?.lastShowHour;
    if (last !== undefined && now - last < SHOW_RULES.restHours) {
      const realMin = (SHOW_RULES.restHours - (now - last)) / (GAME_HOURS_PER_REAL_SECOND * 60);
      out.push(`Resting after its last show — ready again in about ${Math.max(1, Math.round(realMin))} min at 1×`);
    }
    const pending = pendingEntryFor(state, c.id);
    if (pending) out.push(`Already entered in ${pending.showName}`);
  }
  return out;
}

/** Why this tank can't be entered in an aquascape class right now (empty = ready for the judges). */
export function tankShowReasons(state: GameState, tank: Tank, def: ShowClassDef | null, opts: { forJudging?: boolean } = {}): string[] {
  const out: string[] = [];
  if (def) out.push(...tankClassReasons(state, def, tank));
  if ((tank.decor?.length ?? 0) < 3) out.push('Needs a layout — at least a few pieces of decor');
  const edits = counterValue(state, scapeEditsKey(tank.id));
  if (edits < SCAPED_EDITS) out.push(`Aquascape classes are for your own layouts — make ${SCAPED_EDITS - edits} more change${SCAPED_EDITS - edits === 1 ? '' : 's'} to this one first`);
  if (tank.cache?.status === 'danger') out.push(`Welfare first: ${tank.cache.statusReason ?? 'this tank needs attention'}`);
  if (!opts.forJudging) {
    const pending = pendingEntryFor(state, tank.id);
    if (pending) out.push(`Already entered in ${pending.showName}`);
  }
  return out;
}

/** Tier gate as a reason (empty when the tier is open). */
export function tierLockReason(state: GameState, tier: ShowTier): string | null {
  const def = SHOW_TIERS[tier];
  if (state.progress.unlocked.includes(def.unlockKey)) return null;
  return `${def.name} shows are locked`;
}
