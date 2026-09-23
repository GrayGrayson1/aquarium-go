/**
 * Decor placement rules + mutators (place / move / remove). OWNER: lane "aquascape".
 * `checkPlacement` is pure (no state change) so the 3D editor can tint its ghost valid/invalid live.
 */
import type { GameState, Tank, DecorDef, DecorInstance } from '@/types';
import type { ActionResult } from '../care';
import { getDecorDef, isFloating, isEpiphyte, isLiving, isEmergent } from '@/data/catalog/decor';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { tankDims, type TankDims } from '../tankSpace';
import { spend, earn, sellFragsToStore } from '../economy';
import { isUnlocked, bumpCounter, tutorialAdvance, addMastery, scapeEditsKey } from '../facility';
import { nextId } from '../ids';
import { withArticle } from '../economy/util'; // lane:w2-ui
import { simRng } from '../rng';
import { substrateHeightAt, surfaceHeightAt } from './terrain';

export interface PlacementPos {
  x: number;
  z: number;
  rotY?: number;
  scale?: number;
}

export interface PlacementCheck {
  ok: boolean;
  message: string;
  /** Resolved base height (tank-local) where the item would sit. */
  y: number;
  /** Scale after clamping to the item's range. */
  scale: number;
  rotY: number;
  /** Reason code for UI styling. */
  code?: 'unknown' | 'locked' | 'environment' | 'bounds' | 'height' | 'overlap' | 'money' | 'inventory';
}

/**
 * Items at this fraction of overlap (0 = touching, 1 = concentric) are rejected. Hardscape can't interpenetrate
 * hardscape; plants/corals grow through and around each other (and over hardscape), so they only clash when planted
 * almost on the same spot.
 */
const HARDSCAPE_OVERLAP_MAX = 0.55;
const LIVING_OVERLAP_MAX = 0.9;
const BOUNDS_MARGIN = 0.003;
/** lane:brackish — how far an emergent plant's crown may rise above the water line (m); the rim gap is ~2.5 cm. */
export const EMERGENT_REACH_M = 0.016;

export const SELL_BACK_FRACTION = 0.5;


function footprint(def: DecorDef, scale: number, rotY: number): { rx: number; rz: number } {
  const w = def.size.w * scale;
  const d = def.size.d * scale;
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  return { rx: (w * c + d * s) / 2, rz: (w * s + d * c) / 2 };
}

/** Largest x/z the item's centre may take at this scale/rotation (for editor clamping). */
export function placementLimits(tank: Pick<Tank, 'tierId' | 'substrate'>, def: DecorDef, scale: number, rotY: number): { maxX: number; maxZ: number } {
  const d = tankDims(tank);
  const { rx, rz } = footprint(def, scale, rotY);
  return { maxX: Math.max(0, d.L / 2 - rx - BOUNDS_MARGIN), maxZ: Math.max(0, d.W / 2 - rz - BOUNDS_MARGIN) };
}

/** Largest scale that fits the tank height (and footprint), clamped to the def's range. */
export function maxScaleFor(tank: Pick<Tank, 'tierId' | 'substrate'>, def: DecorDef): number {
  const d = tankDims(tank);
  const fitH = isFloating(def) ? Infinity : (d.waterY + (isEmergent(def) ? EMERGENT_REACH_M : 0) - d.substrateY * 1.2 - 0.005) / def.size.h;
  const fitW = (d.L - 2 * BOUNDS_MARGIN) / Math.max(def.size.w, def.size.d);
  const fitD = (d.W - 2 * BOUNDS_MARGIN) / Math.min(def.size.w, def.size.d);
  return Math.max(def.scaleRange[0], Math.min(def.scaleRange[1], fitH, fitW, fitD));
}

function envMessage(def: DecorDef, tank: Tank): string | null {
  if (!def.environments.includes(tank.environment)) {
    const env = def.environments.includes('marine') && !def.environments.includes('freshwater') ? 'saltwater' : 'freshwater';
    return `${def.name} belongs in a ${env} tank.`;
  }
  if (def.waterClasses && def.waterClasses.length && !def.waterClasses.includes(tank.waterClass)) {
    if (def.waterClasses.length === 1 && def.waterClasses[0] === 'reef') return `${def.name} needs a reef tank with coral lighting.`;
    return `${def.name} can't live in this tank type.`;
  }
  return null;
}

/** Resolve the base y for an item at (x, z). */
export function resolveBaseY(tank: Tank, def: DecorDef, x: number, z: number, scale: number, excludeId?: string, dims?: TankDims): number {
  const d = dims ?? tankDims(tank);
  if (isFloating(def)) return d.waterY - def.size.h * scale;
  if (isEpiphyte(def)) {
    const top = surfaceHeightAt(tank, x, z, excludeId);
    const sub = substrateHeightAt(tank, x, z);
    // tuck slightly into the host surface so it looks attached
    return top > sub + 0.004 ? top - 0.006 * scale : sub - 0.002;
  }
  // hardscape beds into the substrate a little
  const sub = substrateHeightAt(tank, x, z);
  const bury = def.category === 'hardscape' ? Math.min(0.01, def.size.h * scale * 0.08) : 0.001;
  return Math.max(0, sub - bury);
}

/**
 * Validate a placement without changing state. Money/inventory are only checked when `purchase` is given.
 */
export function checkPlacement(
  state: GameState,
  tank: Tank,
  defId: string,
  pos: PlacementPos,
  opts: { excludeId?: string; purchase?: 'buy' | 'owned' | 'none' } = {},
): PlacementCheck {
  const def = getDecorDef(defId);
  const rotY = Number.isFinite(pos.rotY) ? (pos.rotY as number) : 0;
  const base = { y: 0, scale: 1, rotY };
  if (!def) return { ok: false, message: 'Unknown decor item.', code: 'unknown', ...base };
  const scale = clamp(Number.isFinite(pos.scale) ? (pos.scale as number) : 1, def.scaleRange[0], def.scaleRange[1]);
  const res = { y: 0, scale, rotY };
  if (!isUnlocked(state, def.unlock)) {
    const label = def.unlock ? (UNLOCK_KEYS as Record<string, string>)[def.unlock] ?? def.unlock : '';
    return { ok: false, message: `Locked — requires “${label}”.`, code: 'locked', ...res };
  }
  const envMsg = envMessage(def, tank);
  if (envMsg) return { ok: false, message: envMsg, code: 'environment', ...res };
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return { ok: false, message: 'Invalid position.', code: 'bounds', ...res };

  const d = tankDims(tank);
  const { rx, rz } = footprint(def, scale, rotY);
  if (Math.abs(pos.x) + rx > d.L / 2 - BOUNDS_MARGIN + 2e-4 || Math.abs(pos.z) + rz > d.W / 2 - BOUNDS_MARGIN + 2e-4) {
    return { ok: false, message: rx * 2 > d.L || rz * 2 > d.W ? `${def.name} is too big for this tank at this size.` : 'Too close to the glass.', code: 'bounds', ...res };
  }
  const y = resolveBaseY(tank, def, pos.x, pos.z, scale, opts.excludeId, d);
  res.y = y;
  if (isEmergent(def)) {
    // lane:brackish — an emergent plant grows until its crown just breaks the surface (whatever size was asked for)
    const reach = (d.waterY + EMERGENT_REACH_M - y) / def.size.h;
    const one = footprint(def, 1, rotY);
    const byBounds = Math.min((d.L / 2 - BOUNDS_MARGIN - Math.abs(pos.x)) / one.rx, (d.W / 2 - BOUNDS_MARGIN - Math.abs(pos.z)) / one.rz);
    res.scale = Math.max(def.scaleRange[0], Math.min(def.scaleRange[1], reach - 0.005, Math.max(scale, byBounds)));
    if (y + def.size.h * res.scale > d.waterY + EMERGENT_REACH_M + 0.002) return { ok: false, message: `Too tall for this tank — it would press against the lid.`, code: 'height', ...res };
  } else if (!isFloating(def) && y + def.size.h * scale > d.waterY + 0.002) {
    // Plants and corals are simply trimmed to fit (an epiphyte on a tall root, a stem plant in a short tank).
    const fit = (d.waterY + 0.002 - y) / def.size.h;
    if (isLiving(def) && fit >= def.scaleRange[0]) {
      res.scale = Math.min(scale, Math.max(def.scaleRange[0], fit - 0.01));
    } else {
      return { ok: false, message: `Too tall — it would break the surface. Try a smaller size.`, code: 'height', ...res };
    }
  }
  const scaleNow = res.scale;

  const living = isLiving(def);
  const floating = isFloating(def);
  for (const other of tank.decor) {
    if (other.id === opts.excludeId) continue;
    const od = getDecorDef(other.defId);
    if (!od) continue;
    const oFloating = isFloating(od);
    if (floating !== oFloating) continue; // surface plants never clash with the bed
    const oLiving = isLiving(od);
    if (living !== oLiving && !floating) continue; // plants/corals may grow on or against hardscape
    const of = footprint(od, other.scale, other.rotY);
    const dist = Math.hypot(pos.x - other.x, pos.z - other.z);
    const reach = (rx + rz) / 2 + (of.rx + of.rz) / 2;
    const overlap = 1 - dist / Math.max(1e-4, reach);
    // vertical separation (e.g. a coral on top of rock above another coral) relaxes the rule
    const vSep = Math.abs(y - other.y) > Math.min(def.size.h * scaleNow, od.size.h * other.scale) * 0.8;
    if (vSep) continue;
    const limit = living ? LIVING_OVERLAP_MAX : HARDSCAPE_OVERLAP_MAX;
    if (overlap > limit) return { ok: false, message: `Overlaps the ${od.name.toLowerCase()} too much.`, code: 'overlap', ...res };
  }

  if (opts.purchase === 'buy' && state.finance.money < def.price) {
    return { ok: false, message: `Not enough money — ${def.name} costs $${def.price}.`, code: 'money', ...res };
  }
  if (opts.purchase === 'owned' && !state.inventory.decor.some((i) => i.defId === defId)) {
    return { ok: false, message: `You don't have ${withArticle(def.name)} in storage.`, code: 'inventory', ...res };
  }
  return { ok: true, message: `Place ${def.name}`, ...res };
}

export function initialLivingState(def: DecorDef): Pick<DecorInstance, 'growth' | 'health'> {
  if (def.category === 'plant') return { growth: 0.35, health: 90 };
  if (def.category === 'coral') return { growth: 0.3, health: 88 };
  if (def.category === 'anemone') return { growth: 0.55, health: 85 };
  if (def.visual === 'botanical_almond_leaf') return { health: 100 };
  return {};
}

/** Place a decor item (purchase handled here via economy.spend unless `owned`). */
export function placeDecorImpl(state: GameState, tankId: string, defId: string, pos: PlacementPos, owned: boolean, afterChange: (tank: Tank) => void): ActionResult & { decorId?: string } {
  const tank = state.tanks[tankId];
  if (!tank) return { ok: false, message: 'Tank not found.' };
  const check = checkPlacement(state, tank, defId, pos, { purchase: owned ? 'owned' : 'buy' });
  if (!check.ok) return { ok: false, message: check.message };
  const def = getDecorDef(defId)!;
  let fromInventory: DecorInstance | undefined;
  if (owned) {
    const idx = state.inventory.decor.findIndex((i) => i.defId === defId);
    fromInventory = state.inventory.decor.splice(idx, 1)[0];
  } else if (!spend(state, def.price, 'decor', `Bought ${def.name}`)) {
    return { ok: false, message: `Not enough money — ${def.name} costs $${def.price}.` };
  }
  const rng = simRng(state);
  const inst: DecorInstance = {
    id: fromInventory?.id ?? nextId(state, 'dc'),
    defId,
    x: round4(pos.x),
    y: round4(check.y),
    z: round4(pos.z),
    rotY: round4(check.rotY),
    scale: round4(check.scale),
    seed: fromInventory?.seed ?? rng.int(1, 2 ** 31 - 2),
    ...initialLivingState(def),
  };
  if (fromInventory?.growth !== undefined) inst.growth = fromInventory.growth;
  if (fromInventory?.health !== undefined) inst.health = fromInventory.health;
  tank.decor.push(inst);
  bumpCounter(state, 'decorPlaced');
  bumpCounter(state, scapeEditsKey(tankId));
  tutorialAdvance(state, 'decor_placed');
  addMastery(state, 'aquascaping', 2);
  afterChange(tank);
  return { ok: true, message: owned ? `${def.name} placed.` : `${def.name} placed — $${def.price}.`, decorId: inst.id };
}

export function moveDecorImpl(state: GameState, tankId: string, decorId: string, pos: PlacementPos, afterChange: (tank: Tank) => void): ActionResult {
  const tank = state.tanks[tankId];
  if (!tank) return { ok: false, message: 'Tank not found.' };
  const inst = tank.decor.find((i) => i.id === decorId);
  if (!inst) return { ok: false, message: 'Decor not found.' };
  const check = checkPlacement(state, tank, inst.defId, { x: pos.x, z: pos.z, rotY: pos.rotY ?? inst.rotY, scale: pos.scale ?? inst.scale }, { excludeId: decorId, purchase: 'none' });
  if (!check.ok) return { ok: false, message: check.message };
  const def = getDecorDef(inst.defId)!;
  // Epiphytes/corals attached on top of hardscape travel with it (ferns tied to wood, corals glued to rock).
  const riders: { o: DecorInstance; lx: number; lz: number; dy: number }[] = [];
  if (!isLiving(def)) {
    const { rx, rz } = footprint(def, inst.scale, inst.rotY);
    const sub = (o: DecorInstance) => substrateHeightAt(tank, o.x, o.z);
    for (const o of tank.decor) {
      if (o.id === inst.id) continue;
      const od = getDecorDef(o.defId);
      if (!od || !isEpiphyte(od)) continue;
      const dx = o.x - inst.x;
      const dz = o.z - inst.z;
      if ((dx / rx) ** 2 + (dz / rz) ** 2 > 1 || o.y < sub(o) + 0.004) continue;
      riders.push({ o, lx: dx, lz: dz, dy: o.y - inst.y });
    }
  }
  const dRot = check.rotY - inst.rotY;
  const sRatio = check.scale / inst.scale;
  inst.x = round4(pos.x);
  inst.z = round4(pos.z);
  inst.y = round4(check.y);
  inst.rotY = round4(check.rotY);
  inst.scale = round4(check.scale);
  const c = Math.cos(dRot);
  const s = Math.sin(dRot);
  const d = tankDims(tank);
  for (const r of riders) {
    const nx = inst.x + (r.lx * c + r.lz * s) * sRatio;
    const nz = inst.z + (-r.lx * s + r.lz * c) * sRatio;
    r.o.x = round4(clamp(nx, -d.L / 2 + 0.01, d.L / 2 - 0.01));
    r.o.z = round4(clamp(nz, -d.W / 2 + 0.01, d.W / 2 - 0.01));
    r.o.rotY = round4(r.o.rotY + dRot);
    const od = getDecorDef(r.o.defId)!;
    r.o.y = round4(resolveBaseY(tank, od, r.o.x, r.o.z, r.o.scale, r.o.id));
  }
  bumpCounter(state, 'decorMoved');
  bumpCounter(state, scapeEditsKey(tankId));
  afterChange(tank);
  return { ok: true, message: `${getDecorDef(inst.defId)?.name ?? 'Decor'} moved.` };
}

export function removeDecorImpl(state: GameState, tankId: string, decorId: string, sell: boolean, afterChange: (tank: Tank) => void): ActionResult {
  const tank = state.tanks[tankId];
  if (!tank) return { ok: false, message: 'Tank not found.' };
  const idx = tank.decor.findIndex((i) => i.id === decorId);
  if (idx < 0) return { ok: false, message: 'Decor not found.' };
  const [inst] = tank.decor.splice(idx, 1);
  bumpCounter(state, scapeEditsKey(tankId));
  const def = getDecorDef(inst.defId);
  const name = def?.name ?? 'Decor';
  // Epiphytes/corals that were attached on top of it drop to the new surface.
  for (const other of tank.decor) {
    const od = getDecorDef(other.defId);
    if (!od || !isEpiphyte(od)) continue;
    const y = resolveBaseY(tank, od, other.x, other.z, other.scale);
    if (y < other.y - 0.004) other.y = round4(y);
  }
  // lane:frags — a frag still growing out is sold (to the local store) or stored as a frag, not as a bought colony
  if (inst.frag && inst.frag.grownHour === undefined) {
    const res = sell ? sellFragsToStore(state, [inst]) : ((state.inventory.frags ??= []).push({ ...inst, x: 0, y: 0, z: 0 }), { ok: true, message: `${name} frag moved to storage.` });
    afterChange(tank);
    return res;
  }
  if (sell) {
    const value = def ? Math.round(def.price * SELL_BACK_FRACTION * (def.visual === 'botanical_almond_leaf' ? (inst.health ?? 100) / 100 : 1)) : 0;
    if (value > 0) earn(state, value, 'decor', `Sold ${name}`);
    afterChange(tank);
    return { ok: true, message: value > 0 ? `${name} sold for $${value}.` : `${name} removed.` };
  }
  state.inventory.decor.push({ ...inst, x: 0, y: 0, z: 0 });
  afterChange(tank);
  return { ok: true, message: `${name} moved to storage.` };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round4 = (v: number) => Math.round(v * 10000) / 10000;
