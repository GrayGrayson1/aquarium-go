/**
 * Frags & cuttings: propagate living decor, grow frags out, and hand them to the market. OWNER: lane "frags".
 *
 * The loop (a gentle side business for reef keepers and aquascapers):
 *   grow → take a frag/cutting (parent shrinks a little and heals) → plant it (frag rack, rock or substrate) and let it
 *   grow into a colony → or sell it (Market listing kind 'frag', or the local store for quick cash).
 *
 * Rules and numbers live in src/data/catalog/propagation.ts (per visual, overridable per def). Rate limits are the
 * parent's growth threshold and its healing time; the frag market softens as you sell (valuation.fragSupplyFactor).
 *
 * State (all optional, old saves need nothing):
 *   DecorInstance.frag              provenance + grow-out of a frag/cutting (in a tank, in storage or held by a listing)
 *   DecorInstance.recoverUntilHour  the parent heals until then (no growth, no new cuts)
 *   DecorInstance.fragsTaken        cuts taken from this piece
 *   GameState.inventory.frags       frags waiting to be planted or sold (kept apart from bought decor)
 * Deterministic: the only randomness is the new frag's rotation, drawn from simRng.
 */
import type { GameState, Tank, DecorDef, DecorInstance, DecorPropagation } from '@/types';
import type { ActionResult } from '../care';
import { getDecorDef, isEpiphyte, isFloating, isLiving } from '@/data/catalog/decor';
import { propagationFor, fragNounWithArticle, isCoralDef, fragLabel } from '@/data/catalog/propagation';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { tankDims } from '../tankSpace';
import { nextId } from '../ids';
import { simRng } from '../rng';
import { emitEvent } from '../context';
import { isUnlocked, bumpCounter, addMastery, scapeEditsKey } from '../facility';
import { checkPlacement, maxScaleFor, placementLimits } from './placement';
import { hardscapeTopAt, substrateHeightAt, surfaceHeightAt } from './terrain';
import { beautyScoreImpl } from './beauty';

/** Frags waiting in storage at most (a holding system has limited room; keeps saves small). */
export const MAX_STORED_FRAGS = 40;
/** A parent must be at least this healthy to be cut. */
export const FRAG_MIN_HEALTH = 55;
/** Game hours a newly planted frag spends healing onto its plug before it grows at full pace. */
export const FRAG_SETTLE_HOURS = 12;
/** The frag rack visual key (its slots are computed here, not stored). */
export const FRAG_RACK_VISUAL = 'frag_rack';

const round4 = (v: number) => Math.round(v * 10000) / 10000;
const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
const clamp01 = (v: number) => clamp(v, 0, 1);
const fail = (message: string): ActionResult => ({ ok: false, message });

// ───────────────────────────── naming ─────────────────────────────

export { isCoralDef, fragLabel };

/** Frags/cuttings in storage (lazily created list). */
export function storedFrags(state: GameState): DecorInstance[] {
  return state.inventory.frags ?? [];
}

/** True while a frag is still a frag (not yet grown out into a colony). */
export function isGrowingFrag(inst: DecorInstance): boolean {
  return !!inst.frag && inst.frag.grownHour === undefined;
}

// ───────────────────────────── eligibility ─────────────────────────────

export type FragBlock = 'ok' | 'unknown' | 'not_living' | 'cannot' | 'locked' | 'listed' | 'health' | 'growth' | 'recovering' | 'storage';

export interface FragEligibility {
  ok: boolean;
  code: FragBlock;
  rule: DecorPropagation;
  /** Plain reason ("Healing from the last cut — about 20 h") or the ready line. */
  message: string;
  /** 0..1 progress toward the next cut (growth or healing). */
  progress: number;
  /** Game hours of healing left (code 'recovering'). */
  hoursLeft?: number;
}

/** Can this placed piece be fragged/cut right now, and if not, why (and how close is it)? */
export function fragEligibility(state: GameState, tank: Tank | undefined, inst: DecorInstance | undefined): FragEligibility {
  const def = inst ? getDecorDef(inst.defId) : undefined;
  const rule = propagationFor(def);
  const no = (code: FragBlock, message: string, progress = 0, hoursLeft?: number): FragEligibility => ({ ok: false, code, rule, message, progress: clamp01(progress), hoursLeft });
  if (!tank || !inst || !def) return no('unknown', 'That piece could not be found.');
  if (!isLiving(def)) return no('not_living', rule.why ?? 'Only living plants and corals can be propagated.');
  if (!rule.can) return no('cannot', rule.why ?? `${def.name} can't be propagated by hand.`);
  if (!isUnlocked(state, def.unlock)) {
    const label = def.unlock ? (UNLOCK_KEYS as Record<string, string>)[def.unlock] ?? def.unlock : '';
    return no('locked', `Needs the “${label}” research first.`);
  }
  if (tank.listingId && state.market.listings.some((l) => l.id === tank.listingId && l.status === 'active')) {
    return no('listed', `${tank.name} is listed for sale — its ${isCoralDef(def) ? 'corals' : 'plants'} are part of the deal.`);
  }
  const now = state.clock.hour;
  const growth = clamp01(inst.growth ?? 0.5);
  if (inst.recoverUntilHour !== undefined && now < inst.recoverUntilHour) {
    const left = inst.recoverUntilHour - now;
    return no('recovering', `Healing from the last cut — ready again in about ${Math.max(1, Math.round(left))} h (game time).`, 1 - left / Math.max(1, rule.recoveryHours), left);
  }
  if ((inst.health ?? 90) < FRAG_MIN_HEALTH) return no('health', `Too stressed to cut. Let it regain its health first (${Math.round(inst.health ?? 0)}%).`, (inst.health ?? 0) / FRAG_MIN_HEALTH);
  if (growth < rule.minGrowth) {
    return no('growth', `Still growing — ${Math.round(growth * 100)}% of the ${Math.round(rule.minGrowth * 100)}% it needs before a cut.`, growth / rule.minGrowth);
  }
  if (storedFrags(state).length >= MAX_STORED_FRAGS) return no('storage', `Your holding system is full (${MAX_STORED_FRAGS} frags). Plant or sell some first.`, 1);
  return { ok: true, code: 'ok', rule, message: `Ready — cut ${fragNounWithArticle(rule)}.`, progress: 1 };
}

// ───────────────────────────── take a frag ─────────────────────────────

function refreshBeauty(state: GameState, tank: Tank): void {
  try {
    tank.cache.beauty = beautyScoreImpl(state, tank).score;
  } catch {
    /* derived cache only */
  }
}

function hoursText(h: number): string {
  if (h < 36) return `about ${Math.round(h)} h`;
  const d = h / 24;
  return `about ${Math.round(d * 2) / 2} days`;
}

/**
 * Cut a frag/cutting from a placed piece. The parent loses a little growth and heals for a while (no growth, no new
 * cuts); the frag goes to storage as a small clone (same seed = same colour morph) that grows when planted.
 */
export function takeFrag(state: GameState, tankId: string, decorId: string): ActionResult & { fragId?: string } {
  const tank = state.tanks[tankId];
  const inst = tank?.decor.find((d) => d.id === decorId);
  const el = fragEligibility(state, tank, inst);
  if (!el.ok || !tank || !inst) return fail(el.message);
  const def = getDecorDef(inst.defId)!;
  const rule = el.rule;
  const now = state.clock.hour;
  const rng = simRng(state);

  const lo = def.scaleRange[0];
  const hi = def.scaleRange[1];
  const startScale = round4(Math.min(lo, 1)); // frags start as small as the piece can be placed
  const targetScale = round4(clamp(Math.max(inst.scale, startScale + 0.2), startScale, Math.min(hi, 1.4)));
  const item: DecorInstance = {
    id: nextId(state, 'dc'),
    defId: inst.defId,
    x: 0,
    y: 0,
    z: 0,
    rotY: round4(rng.range(0, Math.PI * 2)),
    scale: startScale,
    // A frag is a clone: the same seed keeps the parent's colour morph and form.
    seed: inst.seed,
    growth: rule.startGrowth,
    health: Math.round(clamp((inst.health ?? 90) * 0.97, 30, 100) * 10) / 10,
    frag: {
      parentId: inst.id,
      takenHour: now,
      lineName: inst.frag?.lineName ?? `${state.shopName} line`,
      generation: (inst.frag?.generation ?? 0) + 1,
      startScale,
      targetScale,
    },
  };

  // Parent: a little smaller, then heals.
  inst.growth = round4(clamp((inst.growth ?? 0.5) - rule.cost, 0.2, 1));
  inst.recoverUntilHour = now + rule.recoveryHours;
  inst.fragsTaken = (inst.fragsTaken ?? 0) + 1;
  (state.inventory.frags ??= []).push(item);
  refreshBeauty(state, tank);

  const coral = isCoralDef(def);
  const first = (state.progress.counters.fragsTaken ?? 0) === 0;
  bumpCounter(state, 'fragsTaken');
  bumpCounter(state, coral ? 'coralFragsTaken' : 'cuttingsTaken');
  addMastery(state, coral ? 'marine' : 'aquascaping', coral ? 4 : 3);
  if (first && !state.isShowcase) {
    emitEvent(state, {
      kind: 'tip',
      // lane:w2-ui (copy) — say where storage is, and use the › path style the rest of the UI uses
      text: `Your first ${coral ? 'frag' : 'cutting'}! It waits in storage (Build › Decor). Plant it on a frag rack, a rock or the substrate to grow a new ${coral ? 'colony' : 'plant'}, or sell it: Market › New listing › Frags & cuttings.`,
      tankId,
      toast: true,
    });
  }
  return { ok: true, message: `Took ${fragNounWithArticle(rule)} from the ${def.name.toLowerCase()} — it's in storage. The ${coral ? 'colony' : 'plant'} heals for ${hoursText(rule.recoveryHours)}.`, fragId: item.id };
}

// ───────────────────────────── frag racks & planting ─────────────────────────────

/** Hole positions on a frag rack, in tank-local metres (2 rows × 5, rotated/scaled with the rack). */
export function fragRackSlots(rack: DecorInstance): { x: number; z: number }[] {
  const c = Math.cos(rack.rotY);
  const s = Math.sin(rack.rotY);
  const out: { x: number; z: number }[] = [];
  for (const lz of [0.018, -0.018]) {
    for (const lx of [-0.064, -0.032, 0, 0.032, 0.064]) {
      // decor-local → tank (rotation.y, then scale)
      const x = (lx * c + lz * s) * rack.scale;
      const z = (-lx * s + lz * c) * rack.scale;
      out.push({ x: round4(rack.x + x), z: round4(rack.z + z) });
    }
  }
  return out;
}

export function fragRacksIn(tank: Tank): DecorInstance[] {
  return tank.decor.filter((d) => getDecorDef(d.defId)?.visual === FRAG_RACK_VISUAL);
}

/** Is this piece sitting on a frag rack? */
export function onFragRack(tank: Tank, inst: DecorInstance): boolean {
  for (const r of fragRacksIn(tank)) {
    const def = getDecorDef(r.defId);
    if (def && hardscapeTopAt(r, def, inst.x, inst.z) >= inst.y - 0.012) return true;
  }
  return false;
}

/** Free rack holes in a tank (no living piece already seated within ~1.4 cm). */
export function freeRackSlots(tank: Tank): { x: number; z: number; rackId: string }[] {
  const out: { x: number; z: number; rackId: string }[] = [];
  for (const r of fragRacksIn(tank)) {
    for (const s of fragRackSlots(r)) {
      const taken = tank.decor.some((d) => {
        if (d.id === r.id) return false;
        const dd = getDecorDef(d.defId);
        return !!dd && isLiving(dd) && Math.hypot(d.x - s.x, d.z - s.z) < 0.014 * r.scale;
      });
      if (!taken) out.push({ ...s, rackId: r.id });
    }
  }
  return out;
}

/**
 * A good spot for a frag: a free frag-rack hole (corals and epiphytes), else near its parent (if in this tank),
 * else anywhere valid — on rock for corals/epiphytes, on open substrate for rooted plants. Deterministic.
 */
export function autoFragSpot(state: GameState, tank: Tank, item: DecorInstance, opts: { rackOnly?: boolean } = {}): { x: number; z: number; rotY: number; onRack: boolean } | null {
  const def = getDecorDef(item.defId);
  if (!def) return null;
  const ok = (x: number, z: number) => checkPlacement(state, tank, def.id, { x, z, rotY: item.rotY, scale: item.scale }, { purchase: 'none' }).ok;
  const attaches = isEpiphyte(def) || isCoralDef(def);
  if (attaches) {
    for (const s of freeRackSlots(tank)) if (ok(s.x, s.z)) return { x: s.x, z: s.z, rotY: item.rotY, onRack: true };
  }
  if (opts.rackOnly) return null;
  const d = tankDims(tank);
  const parent = item.frag?.parentId ? tank.decor.find((p) => p.id === item.frag!.parentId) : undefined;
  const cx = parent?.x ?? 0;
  const cz = parent?.z ?? d.W * 0.1;
  // beside the parent, not hidden inside its footprint
  const pDef = parent ? getDecorDef(parent.defId) : undefined;
  const pR = parent && pDef ? (Math.max(pDef.size.w, pDef.size.d) * parent.scale) / 2 : 0;
  const cands: { x: number; z: number; score: number }[] = [];
  const nx = 13;
  const nz = 7;
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const x = (-0.5 + (i + 0.5) / nx) * d.L * 0.92;
      const z = (-0.5 + (k + 0.5) / nz) * d.W * 0.85;
      const sub = substrateHeightAt(tank, x, z);
      const top = surfaceHeightAt(tank, x, z);
      const onRock = top > sub + 0.01;
      // corals & epiphytes prefer rock; rooted plants need open substrate in front of the back glass
      const dist = Math.hypot(x - cx, z - cz);
      let score = dist + (dist < pR * 0.9 ? 0.25 : 0);
      if (attaches) score += onRock ? 0 : 0.12;
      else if (onRock) continue;
      else score += Math.max(0, -z) * 0.2; // rooted plants: a little towards the back
      cands.push({ x, z, score });
    }
  }
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands) if (ok(c.x, c.z)) return { x: round4(c.x), z: round4(c.z), rotY: item.rotY, onRack: false };
  return null;
}

/**
 * Plant a stored frag/cutting into a tank at `pos` (or the best automatic spot). Its scale stays the frag's; it grows
 * via the normal growth sim (with a young-frag boost) and physically enlarges as it grows out.
 */
export function plantFrag(state: GameState, tankId: string, fragId: string, pos?: { x: number; z: number; rotY?: number }, opts: { rackOnly?: boolean } = {}): ActionResult & { decorId?: string } {
  const tank = state.tanks[tankId];
  if (!tank) return fail('Tank not found.');
  const list = storedFrags(state);
  const idx = list.findIndex((f) => f.id === fragId);
  if (idx < 0) return fail('That frag is no longer in storage.');
  const item = list[idx];
  const def = getDecorDef(item.defId);
  if (!def) return fail('Unknown frag.');
  const spot = pos ? { ...pos, rotY: pos.rotY ?? item.rotY, onRack: false } : autoFragSpot(state, tank, item, opts);
  if (!spot) {
    return fail(opts.rackOnly ? `No free hole on a frag rack in ${tank.name}.` : `No free spot for the ${fragLabel(item).toLowerCase()} in ${tank.name}. Make a little room${isCoralDef(def) ? ' or add a frag rack' : ''}.`);
  }
  const check = checkPlacement(state, tank, def.id, { x: spot.x, z: spot.z, rotY: spot.rotY, scale: item.scale }, { purchase: 'none' });
  if (!check.ok) return fail(check.message);
  const now = state.clock.hour;
  list.splice(idx, 1);
  const placed: DecorInstance = {
    ...item,
    x: round4(spot.x),
    y: round4(check.y),
    z: round4(spot.z),
    rotY: round4(check.rotY),
    scale: round4(check.scale),
    frag: item.frag ? { ...item.frag, plantedHour: item.frag.plantedHour ?? now } : { takenHour: now, plantedHour: now, startScale: check.scale, targetScale: check.scale },
  };
  tank.decor.push(placed);
  bumpCounter(state, 'decorPlaced');
  bumpCounter(state, scapeEditsKey(tankId));
  addMastery(state, isCoralDef(def) ? 'marine' : 'aquascaping', 1);
  refreshBeauty(state, tank);
  const where = onFragRack(tank, placed) ? 'on the frag rack' : isFloating(def) ? 'at the surface' : check.y > substrateHeightAt(tank, placed.x, placed.z) + 0.008 ? 'on the rock' : 'in the substrate';
  return { ok: true, message: `${fragLabel(placed)} planted ${where} in ${tank.name}. It will heal, then grow.`, decorId: placed.id };
}

// ───────────────────────────── growth hooks (called by growth.ts) ─────────────────────────────

/**
 * Growth multiplier for a living piece at `hour`: 0 while a parent heals from a cut, slow while a new frag settles
 * onto its plug, then young frags grow fast in relative terms (a small colony doubles quickly).
 */
export function fragGrowthFactor(inst: DecorInstance, hour: number): number {
  if (inst.recoverUntilHour !== undefined && hour < inst.recoverUntilHour) return 0;
  const f = inst.frag;
  if (!f || f.grownHour !== undefined) return 1;
  if (f.plantedHour !== undefined && hour - f.plantedHour < FRAG_SETTLE_HOURS) return 0.25;
  const g = inst.growth ?? 0.5;
  return g < 0.6 ? 1.8 : 1.35;
}

const SCALE_STEP = 0.02;

/**
 * After the tank's growth step: growing frags enlarge toward their colony size (never past the glass, the surface
 * or the rack's modest limit), and a frag that reaches full growth "grows out" into an ordinary colony.
 */
export function stepFragGrowOut(state: GameState, tank: Tank): void {
  if (!tank.decor.some(isGrowingFrag)) return;
  const now = state.clock.hour;
  let d: ReturnType<typeof tankDims> | undefined;
  for (const inst of tank.decor) {
    if (!isGrowingFrag(inst)) continue;
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    const f = inst.frag!;
    if (f.plantedHour === undefined) f.plantedHour = now;
    const rule = propagationFor(def);
    const g = clamp01(inst.growth ?? rule.startGrowth);
    const start = f.startScale ?? inst.scale;
    let target = Math.max(start, f.targetScale ?? start);
    if (onFragRack(tank, inst)) target = Math.min(target, start + 0.12); // racks hold frags, not colonies
    const prog = clamp01((g - rule.startGrowth) / Math.max(0.05, 0.95 - rule.startGrowth));
    const eased = prog * prog * (3 - 2 * prog);
    let want = Math.floor((start + (target - start) * eased) / SCALE_STEP) * SCALE_STEP;
    if (want > inst.scale + SCALE_STEP * 0.5) {
      d ??= tankDims(tank);
      want = Math.min(want, maxScaleFor(tank, def), def.scaleRange[1]);
      const lim = placementLimits(tank, def, want, inst.rotY);
      const fitsGlass = Math.abs(inst.x) <= lim.maxX + 1e-4 && Math.abs(inst.z) <= lim.maxZ + 1e-4;
      const fitsSurface = isFloating(def) || inst.y + def.size.h * want <= d.waterY - 0.004;
      if (fitsGlass && fitsSurface && want > inst.scale) inst.scale = round4(want);
    }
    if (g >= 0.97) {
      f.grownHour = now;
      bumpCounter(state, 'fragsGrownOut');
      const coral = isCoralDef(def);
      addMastery(state, coral ? 'marine' : 'aquascaping', 10);
      if (!state.isShowcase) {
        emitEvent(state, {
          kind: 'celebrate',
          text: `The ${fragLabel(inst).toLowerCase()} you cut on day ${Math.floor(f.takenHour / 24) + 1} has grown into a full ${coral ? 'colony' : 'plant'} in ${tank.name}.`,
          tankId: tank.id,
          toast: true,
        });
      }
    }
  }
}
