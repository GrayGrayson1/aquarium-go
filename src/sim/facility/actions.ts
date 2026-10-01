/**
 * Facility player actions: level upgrades, opening to the public, admission, tank placement, signage, fixtures.
 * OWNER: lane "facility".
 */
import type { FacilityLevelId, FacilityState, GameState } from '@/types';
import type { ActionResult } from '../care';
import { emitEvent } from '../context';
import { nextId } from '../ids';
import { withArticle } from '../economy/util'; // lane:w2-ui
import { spend, earn } from '../economy';
import { FIXTURE_DEFS, getFacilityLevel, nextFacilityLevelDef, type FacilityLevelDef, type FixtureKind } from '@/data/facilities';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import {
  checkPlacement,
  computeReachability,
  facilityObstacles,
  findFreeSpotIn,
  obbInsideRoom,
  obbOverlap,
  placedTanks,
  relayoutTanks,
  tankFootprint,
  tankFrontZone,
  validatePlacementIn,
  type PlacementCheck,
} from './layout';
import { addReputation, bumpCounter, evalCond, isUnlocked, unlock, unlockLabel } from './progression';

function defaultFixtures(def: FacilityLevelDef): FacilityState['fixtures'] {
  return def.defaultFixtures.map((f, i) => ({ id: `fx_${def.id}_${i}`, kind: f.kind, x: f.x, z: f.z, rotY: f.rotY }));
}

export function initialFacility(level: FacilityLevelId = 'hobby_room'): FacilityState {
  const def = getFacilityLevel(level);
  return {
    level: def.id,
    width: def.width,
    depth: def.depth,
    openToPublic: false,
    admission: def.defaultAdmission,
    openHour: def.openHour,
    closeHour: def.closeHour,
    fixtures: defaultFixtures(def),
  };
}

export interface FacilityUpgradeInfo {
  current: FacilityLevelDef;
  next: FacilityLevelDef | null;
  canUpgrade: boolean;
  cost: number;
  requirements: { label: string; met: boolean; current: number; target: number }[];
  reason?: string;
}

export function facilityUpgradeInfo(state: GameState): FacilityUpgradeInfo {
  const current = getFacilityLevel(state.facility.level);
  const next = nextFacilityLevelDef(state.facility.level);
  if (!next) return { current, next: null, canUpgrade: false, cost: 0, requirements: [], reason: 'You run the grand hall — the top of the arc.' };
  const reqs: FacilityUpgradeInfo['requirements'] = [];
  const rule = next.unlockKey ? UNLOCK_RULE_BY_KEY[next.unlockKey] : undefined;
  if (rule && !isUnlocked(state, next.unlockKey)) {
    const cache = {};
    for (const c of rule.when) {
      const s = evalCond(state, c, cache);
      reqs.push({ label: s.label, met: s.met, current: s.current, target: s.target });
    }
  }
  reqs.push({ label: `$${next.upgradeCost.toLocaleString()}`, met: state.finance.money >= next.upgradeCost, current: Math.floor(state.finance.money), target: next.upgradeCost });
  const unlockedOk = !next.unlockKey || isUnlocked(state, next.unlockKey);
  const canUpgrade = unlockedOk && state.finance.money >= next.upgradeCost;
  const reason = !unlockedOk ? rule?.hint ?? `Locked: ${unlockLabel(next.unlockKey ?? '')}` : !canUpgrade ? `You need $${next.upgradeCost.toLocaleString()}.` : undefined;
  return { current, next, canUpgrade, cost: next.upgradeCost, requirements: reqs, reason };
}

export function upgradeFacility(state: GameState): ActionResult {
  const info = facilityUpgradeInfo(state);
  const next = info.next;
  if (!next) return { ok: false, message: info.reason ?? 'Already at the top level.' };
  if (next.unlockKey && !isUnlocked(state, next.unlockKey)) return { ok: false, message: `Not yet — ${info.reason ?? 'keep growing your reputation.'}` };
  if (!spend(state, next.upgradeCost, 'facility', `Moved into the ${next.name}`)) return { ok: false, message: `You need $${next.upgradeCost.toLocaleString()} to move into the ${next.name}.` };
  const fac = state.facility;
  const old = { width: fac.width, depth: fac.depth };
  fac.level = next.id;
  fac.width = next.width;
  fac.depth = next.depth;
  fac.openHour = next.openHour;
  fac.closeHour = next.closeHour;
  if (fac.admission < next.defaultAdmission * 0.5) fac.admission = next.defaultAdmission;
  // keep player-bought fixtures that still fit, then lay out the new room's defaults; every bought fixture that
  // doesn't make the move (outside the new walls, in a doorway, or in the way of a tank afterwards) is refunded in full
  const kept = (fac.fixtures ?? []).filter((f) => !f.id.startsWith('fx_'));
  const returned: string[] = [];
  let refund = 0;
  const giveBack = (f: FacilityState['fixtures'][number]) => {
    const def = FIXTURE_DEFS[f.kind as FixtureKind];
    if (!def || f.id.startsWith('fx_')) return;
    returned.push(def.name.toLowerCase());
    refund += def.price;
  };
  fac.fixtures = [];
  for (const f of [...defaultFixtures(next), ...kept]) {
    if (fixtureFits(state, f.kind as FixtureKind, f.x, f.z, f.rotY, { ignoreTanks: true }).ok) fac.fixtures.push(f);
    else giveBack(f);
  }
  const { moved, unplaced } = relayoutTanks(state, old);
  const tanks = placedTanks(state);
  fac.fixtures = fac.fixtures.filter((f) => {
    const def = FIXTURE_DEFS[f.kind as FixtureKind];
    const o = { cx: f.x, cz: f.z, hx: (def?.w ?? 0.6) / 2, hz: (def?.d ?? 0.6) / 2, rot: f.rotY };
    const clash = tanks.some((t) => obbOverlap(o, tankFootprint(t.tierId, t.placement), 0.05) || obbOverlap(o, tankFrontZone(t.tierId, t.placement), 0));
    if (clash) giveBack(f);
    return !clash;
  });
  if (refund > 0 && !state.isShowcase) {
    earn(state, refund, 'facility', `Refund: ${returned.length} fixture${returned.length === 1 ? '' : 's'} that didn’t fit the ${next.name}`);
    emitEvent(state, { kind: 'info', text: `The movers returned ${returned.length === 1 ? withArticle(returned[0]) : `${returned.length} fixtures`} that didn’t fit the new floor plan — $${refund.toLocaleString()} refunded.` });
  }
  if (next.order >= 1) {
    unlock(state, 'visitors');
    fac.openToPublic = true;
  }
  addReputation(state, 8 + next.order * 4, '');
  bumpCounter(state, 'facility_upgrades');
  emitEvent(state, { kind: 'celebrate', text: `Welcome to your ${next.name}! ${next.perks[0] ?? ''}`.trim(), toast: true });
  if (moved.length) emitEvent(state, { kind: 'info', text: `The movers re-arranged ${moved.length} tank${moved.length === 1 ? '' : 's'} to fit the new floor plan.` });
  if (unplaced.length) emitEvent(state, { kind: 'warning', text: `${unplaced.length} tank${unplaced.length === 1 ? '' : 's'} could not find a good spot — rearrange them in Build.`, toast: true });
  return { ok: true, message: `Moved into the ${next.name}.` };
}

export function setOpenToPublic(state: GameState, open: boolean): ActionResult {
  const fac = state.facility;
  if (!open) {
    fac.openToPublic = false;
    return { ok: true, message: 'Closed to the public.' };
  }
  if (fac.level === 'hobby_room') return { ok: false, message: 'Your hobby room is a private home — move into a specialty shop to welcome paying visitors.' };
  if (!isUnlocked(state, 'visitors')) return { ok: false, message: 'Visitors unlock with your first shop.' };
  fac.openToPublic = true;
  if (fac.admission <= 0) fac.admission = getFacilityLevel(fac.level).defaultAdmission;
  if (!state.isShowcase) emitEvent(state, { kind: 'visitor', text: `Doors open! Admission is $${fac.admission}. Visitors come ${fac.openHour}:00–${fac.closeHour}:00.`, toast: true });
  return { ok: true, message: 'Open to the public.' };
}

export function setAdmission(state: GameState, price: number): ActionResult {
  const p = Number.isFinite(price) ? price : 0;
  state.facility.admission = Math.max(0, Math.min(250, Math.round(p)));
  return { ok: true, message: `Admission set to $${state.facility.admission}.` };
}

export function setOpenHours(state: GameState, openHour: number, closeHour: number): ActionResult {
  const o = Math.max(0, Math.min(23, Math.round(openHour)));
  const c = Math.max(1, Math.min(24, Math.round(closeHour)));
  if (c - o < 4) return { ok: false, message: 'Stay open at least 4 hours.' };
  state.facility.openHour = o;
  state.facility.closeHour = c;
  return { ok: true, message: `Open ${o}:00–${c}:00.` };
}

/** Validate a spot for a tank of `tierId` (pass `ignoreTankId` when moving an existing tank). */
export function validatePlacement(state: GameState, tierId: string, placement: { x: number; z: number; rotY: number }, ignoreTankId?: string): PlacementCheck {
  try {
    return validatePlacementIn(state, tierId, placement, ignoreTankId);
  } catch {
    return { ok: false, reason: 'Unknown tank size.' };
  }
}

/** Move a tank on the facility floor (build mode). Validates bounds/overlaps/visitor paths. */
export function placeTank(state: GameState, tankId: string, x: number, z: number, rotY: number): ActionResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'That tank no longer exists.' };
  if (![x, z, rotY].every(Number.isFinite)) return { ok: false, message: 'Invalid position.' };
  const p = { x: Math.round(x * 1000) / 1000, z: Math.round(z * 1000) / 1000, rotY };
  const check = checkPlacement(state.facility, placedTanks(state), t.tierId, p, tankId, t.name);
  if (!check.ok) return { ok: false, message: check.reason ?? 'That spot is blocked.' };
  t.placement = p;
  return { ok: true, message: `${t.name} moved.` };
}

/** Find a free spot for a new tank of this tier; null if the floor is full. */
export function findFreeSpot(state: GameState, tierId: string): { x: number; z: number; rotY: number } | null {
  try {
    return findFreeSpotIn(state.facility, placedTanks(state), tierId);
  } catch {
    return null;
  }
}

export const SIGN_COST = 15;

export function toggleSignage(state: GameState, tankId: string): ActionResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'That tank no longer exists.' };
  if (t.signage) {
    t.signage = false;
    return { ok: true, message: 'Sign removed.' };
  }
  if (!isUnlocked(state, 'signage')) return { ok: false, message: 'Educational signage unlocks with your first shop (or 45 reputation).' };
  if (!spend(state, SIGN_COST, 'facility', `Sign for ${t.name}`)) return { ok: false, message: `A sign costs $${SIGN_COST}.` };
  t.signage = true;
  bumpCounter(state, 'signs_placed');
  return { ok: true, message: `Sign added to ${t.name} — visitors will learn about its residents.` };
}

// ───────────────────────────── fixtures ─────────────────────────────

function fixtureFits(state: GameState, kind: FixtureKind, x: number, z: number, rotY: number, opts: { ignoreId?: string; ignoreTanks?: boolean } = {}): PlacementCheck {
  const def = FIXTURE_DEFS[kind];
  if (!def) return { ok: false, reason: 'Unknown fixture.' };
  const fac = state.facility;
  const o = { cx: x, cz: z, hx: def.w / 2, hz: def.d / 2, rot: rotY };
  if (!obbInsideRoom(o, fac.width, fac.depth, 0.05)) return { ok: false, reason: 'Outside the room.' };
  const others = facilityObstacles({ ...fac, fixtures: (fac.fixtures ?? []).filter((f) => f.id !== opts.ignoreId) });
  for (const ob of others) if (obbOverlap(o, ob.obb, 0.1)) return { ok: false, reason: `The ${ob.label} is in the way.` };
  if (!opts.ignoreTanks) {
    for (const t of placedTanks(state)) {
      if (obbOverlap(o, tankFootprint(t.tierId, t.placement), 0.1) || obbOverlap(o, tankFrontZone(t.tierId, t.placement), 0)) return { ok: false, reason: `Too close to the ${t.name ?? 'tank'}.` };
    }
    const r = computeReachability({ ...fac, fixtures: [...(fac.fixtures ?? []).filter((f) => f.id !== opts.ignoreId), { id: '_c', kind, x, z, rotY }] }, placedTanks(state));
    if (r.grid.entrance < 0) return { ok: false, reason: 'That would block the doorway.' };
    if (r.unreachable.length) return { ok: false, reason: 'That would block an aisle to a tank.' };
  }
  return { ok: true };
}

export function validateFixture(state: GameState, kind: FixtureKind, x: number, z: number, rotY: number, ignoreId?: string): PlacementCheck {
  return fixtureFits(state, kind, x, z, rotY, { ignoreId });
}

export function addFixture(state: GameState, kind: FixtureKind, x: number, z: number, rotY = 0): ActionResult & { fixtureId?: string } {
  const def = FIXTURE_DEFS[kind];
  if (!def) return { ok: false, message: 'Unknown fixture.' };
  if (state.facility.level === 'hobby_room') return { ok: false, message: 'Fixtures are for public spaces — move into a shop first.' };
  const fit = fixtureFits(state, kind, x, z, rotY);
  if (!fit.ok) return { ok: false, message: fit.reason ?? 'Blocked.' };
  if (!spend(state, def.price, 'facility', def.name)) return { ok: false, message: `${withArticle(def.name.toLowerCase(), true)} costs $${def.price}.` }; // lane:w2-ui: "An info kiosk"
  const id = nextId(state, 'fixp');
  state.facility.fixtures.push({ id, kind, x, z, rotY });
  return { ok: true, message: `${def.name} placed.`, fixtureId: id };
}

export function removeFixture(state: GameState, fixtureId: string): ActionResult {
  const fac = state.facility;
  const f = fac.fixtures.find((x) => x.id === fixtureId);
  if (!f) return { ok: false, message: 'Not found.' };
  fac.fixtures = fac.fixtures.filter((x) => x.id !== fixtureId);
  const def = FIXTURE_DEFS[f.kind as FixtureKind];
  // the room's own furniture (fx_*) came free and sells for nothing; bought fixtures fetch half price
  if (def && !state.isShowcase && !f.id.startsWith('fx_')) earn(state, Math.round(def.price / 2), 'facility', `Sold: ${def.name}`);
  return { ok: true, message: `${def?.name ?? 'Fixture'} removed.` };
}
