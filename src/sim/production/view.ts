/**
 * Production lines: what the Production tab shows, as numbers (DESIGN-S3D §8.6; 0.5 §11.1). OWNER: lane "production".
 * Pure reads of the state: the screens add the words. Every figure comes from the same state the line runs on.
 */
import type { Clutch, Creature, GameState, ProductionLine, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { dayOf } from '../time';
import { moduleFor } from '../life/breeding/registry';
import { youngLabel } from '../life/breeding/clutch';
import { spPlural } from '../life/breeding/common';
import { planAutofeed } from '../care/autofeed';
import { bestOpenBid } from '../economy/listings';
import { isLineYoung } from './costs';
import { QUARANTINE_HOURS, lineStatus, productionLines, quarantineBusyUntil, quarantineReady, raiseTankFull, restartDay, youngPlaces, youngSizeCm, type LineStatus } from './index';

export type StageId = 'breed' | 'raise' | 'sort' | 'quarantine' | 'sell';

export interface LineView {
  status: LineStatus;
  sp: SpeciesDefinition;
  mother?: Creature;
  father?: Creature;
  breed?: Tank;
  raise?: Tank;
  /** The quarantine tank in use (or the first one). */
  quarantine?: Tank;
  keep?: Tank;
  /** Next clutch: days until the pair is due again (rounded up), the cycle and how far through it they are. */
  next: { days?: number; dayOf?: number; cycle: number; restartDay?: number; conditioning: boolean };
  /** Growing out: the brood in the raise tank (or the young waiting there), its word, and its days. */
  raising: { count: number; word: string; dayOf?: number; ofDays?: number; full: boolean; waiting: number; feeding?: { food: string; meals: number }; places?: { used: number; cap: number }; /** Hours until the brood's next stage (chunk 6, DES-013: "next stage in 6 h"). */ nextStageIn?: number; /** The day the brood is raised and sorted (DES-013: "sorting on Day 42"). */ sortDay?: number };
  /** Quarantine: the batch in its hold (its word: "juveniles", or the species' plural once grown), days left, the day
   * it lists; or the day a busy shared tank frees up. */
  quarantined: { count: number; word: string; daysLeft?: number; listsDay?: number; busyUntilDay?: number; busyTank?: Tank; holdFraction?: number; uncycledTank?: Tank };
  /** Sell: the line's open listings and the best open bid among them. */
  selling: { listed: number; bestBid?: number };
  week: { revenue: number; sold: number; net: number };
  /** The stage the line is busiest in (highlighted). */
  active: StageId;
}

const lineBrood = (state: GameState, line: ProductionLine, tankId: string): Clutch | undefined =>
  Object.values(state.clutches).find((cl) => cl.tankId === tankId && cl.motherId === line.pair.motherId && cl.fatherId === line.pair.fatherId && cl.count > 0);

export function lineView(state: GameState, line: ProductionLine): LineView | null {
  const sp = findSpecies(line.speciesId);
  if (!sp) return null;
  const now = state.clock.hour;
  const mother = state.creatures[line.pair.motherId];
  const father = state.creatures[line.pair.fatherId];
  const breed = state.tanks[line.tanks.breed];
  const raise = state.tanks[line.tanks.raise];
  const keep = state.tanks[line.tanks.keep];
  const status = lineStatus(line);

  // Next clutch: the species' rest after spawning (cooldownDays), counted from the pair's last spawn.
  const cycle = Math.max(1, Math.round(sp.breeding.cooldownDays));
  const last = Math.max(mother?.repro?.lastSpawnHour ?? -Infinity, father?.repro?.lastSpawnHour ?? -Infinity);
  const next: LineView['next'] = { cycle, conditioning: !Number.isFinite(last) };
  if (Number.isFinite(last)) {
    const since = Math.max(0, (now - last) / 24);
    next.dayOf = Math.min(cycle, Math.floor(since));
    next.days = Math.max(1, Math.ceil(cycle - since));
  }
  if (status === 'waiting') next.restartDay = restartDay(state, line);

  // Growing out
  const brood = raise ? lineBrood(state, line, raise.id) : undefined;
  const waitingYoung = raise ? Object.values(state.creatures).filter((c) => c.tankId === raise.id && c.status === 'alive' && isLineYoung(line, c)).length : 0;
  const raising: LineView['raising'] = { count: 0, word: 'fry', full: false, waiting: waitingYoung };
  if (brood) {
    raising.count = brood.count;
    raising.word = youngLabel(brood, moduleFor(sp));
    raising.dayOf = Math.max(0, Math.floor((now - brood.laidHour) / 24));
    raising.ofDays = Math.max(1, Math.round((sp.breeding.incubationHours + sp.breeding.fryRearingHours) / 24));
    if (Number.isFinite(brood.nextStageHour) && brood.nextStageHour > now) raising.nextStageIn = Math.ceil(brood.nextStageHour - now - 1e-9);
    // fry become juveniles at their next stage, and the line sorts them then (sortYoung); before that, the species' days
    const raised = brood.stage === 'fry' && Number.isFinite(brood.nextStageHour) ? brood.nextStageHour : brood.laidHour + sp.breeding.incubationHours + sp.breeding.fryRearingHours;
    raising.sortDay = dayOf(Math.max(now, raised));
  } else if (waitingYoung > 0) {
    raising.count = waitingYoung;
    raising.word = waitingYoung === 1 ? 'juvenile' : 'juveniles';
  }
  raising.full = raise ? raiseTankFull(state, line, sp, now) : false;
  if (raise) {
    // places for young (C-30): the line's young there (a brood counts what it raises) and what's still free
    const used = waitingYoung + (brood ? Math.min(brood.count, sp.breeding.maxRaisedPerClutch) : 0);
    raising.places = { used, cap: used + youngPlaces(state, raise, sp, now, youngSizeCm(state, line, sp)) };
  }
  if (raise) {
    const feeder = raise.equipment.find((e) => e.on && !e.failed && getEquipmentDef(e.defId)?.kind === 'autofeeder');
    if (feeder) {
      const plan = planAutofeed(state.inventory.foods, [sp]);
      const food = plan.foodId ? getFoodDef(plan.foodId)?.name : undefined;
      if (food) raising.feeding = { food, meals: Math.max(1, Math.round(feeder.setting ?? 2)) };
    }
  }

  // Quarantine
  const inHold = (line.batches ?? []).find((b) => b.tankId && b.quarantinedHour !== undefined && !b.released);
  const quarantine = (inHold?.tankId ? state.tanks[inHold.tankId] : undefined) ?? line.tanks.quarantine.map((id) => state.tanks[id]).find(Boolean);
  const quarantined: LineView['quarantined'] = { count: 0, word: 'juveniles' };
  if (inHold && inHold.quarantinedHour !== undefined) {
    const end = inHold.quarantinedHour + QUARANTINE_HOURS;
    quarantined.count = inHold.creatureIds.length;
    const members = inHold.creatureIds.map((id) => state.creatures[id]).filter(Boolean);
    const grown = members.length > 0 && members.every((c) => c.lifeStage !== 'juvenile');
    quarantined.word = grown ? (quarantined.count === 1 ? sp.commonName.toLowerCase() : spPlural(sp)) : quarantined.count === 1 ? 'juvenile' : 'juveniles';
    quarantined.daysLeft = Math.max(0, Math.ceil((end - now) / 24));
    quarantined.listsDay = dayOf(end);
    quarantined.holdFraction = Math.max(0, Math.min(1, (now - inHold.quarantinedHour) / QUARANTINE_HOURS));
  } else if ((line.batches ?? []).some((b) => !b.tankId)) {
    // a batch waits: when does the first busy quarantine tank free up?
    let best: { until: number; tank: Tank } | null = null;
    for (const id of line.tanks.quarantine) {
      const until = quarantineBusyUntil(state, id);
      const t = state.tanks[id];
      if (until !== null && t && (!best || until < best.until)) best = { until, tank: t };
    }
    if (best) {
      quarantined.busyUntilDay = dayOf(best.until);
      quarantined.busyTank = best.tank;
    } else {
      // free but not cycled yet: the batch waits for it (the line's notice says so)
      quarantined.uncycledTank = line.tanks.quarantine.map((id) => state.tanks[id]).find((t) => !!t && !quarantineReady(t));
    }
  }

  // Sell
  let listed = 0;
  let bestBid: number | undefined;
  for (const b of line.batches ?? []) {
    for (const id of b.listingIds ?? []) {
      const l = state.market.listings.find((x) => x.id === id);
      if (!l || l.status !== 'active') continue;
      listed += l.creatureIds.length;
      const bid = bestOpenBid(l);
      if (bid && (bestBid === undefined || bid.amount > bestBid)) bestBid = bid.amount;
    }
  }

  const active: StageId = brood ? 'raise' : quarantined.count > 0 ? 'quarantine' : listed > 0 ? 'sell' : waitingYoung > 0 ? 'sort' : 'breed';
  const s = line.stats;
  return {
    status,
    sp,
    mother,
    father,
    breed,
    raise,
    quarantine,
    keep,
    next,
    raising,
    quarantined,
    selling: { listed, bestBid },
    // whole dollars, as the tile shows them (a few cents' loss reads "$0", not "−$0")
    week: { revenue: s.revenue, sold: s.soldCount, net: Math.round(s.revenue - s.costs) || 0 },
    active,
  };
}

/**
 * Each line's colour (DESIGN-S3D §12: "Cambodian coral, Royal Blue blue, Snowflake aqua, Golden gold"), by its place in
 * the line list, as a colour token's name (`--c-{name}`).
 */
export const LINE_COLOURS = ['coral', 'blue', 'aqua', 'gold', 'violet', 'good', 'watch', 'ink-2'] as const;

export function lineColour(state: GameState, line: ProductionLine): (typeof LINE_COLOURS)[number] {
  const i = Math.max(0, productionLines(state).findIndex((l) => l.id === line.id));
  return LINE_COLOURS[i % LINE_COLOURS.length];
}

/** The line slots caption (ADR-0025 decision 7), as its parts: used, total, and the level it names. */
export function slotsCaption(used: number, slots: number, levelName: string, nextLevel: string | null): string {
  const word = slots === 1 ? 'line slot' : 'line slots';
  if (used === 0) return nextLevel ? `0 of ${slots} ${word} · more at ${nextLevel}` : `0 of ${slots} ${word} · ${levelName}`;
  if (used < slots) return `${used} of ${slots} ${word} · ${levelName}`;
  return nextLevel ? `${slots} of ${slots} ${word} · more at ${nextLevel}` : `${slots} of ${slots} ${word} · ${levelName}`;
}
