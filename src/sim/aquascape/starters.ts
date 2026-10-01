/**
 * Hand-authored starter aquascapes, jittered from the save seed so no two games look identical.
 * OWNER: lane "aquascape".
 *
 * Positions are in tank-local metres (x across, z back(-)→front(+)). Heights are resolved from the shared
 * substrate heightfield; epiphytes/corals listed after their host hardscape are seated on top of it.
 */
import type { GameState, Tank, DecorInstance } from '@/types';
import { getDecorDef } from '@/data/catalog/decor';
import { nextId } from '../ids';
import { simRng, type Rng } from '../rng';
import { tankDims } from '../tankSpace';
import { checkPlacement, placementLimits, resolveBaseY, initialLivingState } from './placement';

interface Spec {
  id: string;
  x: number;
  z: number;
  rot?: number;
  s?: number;
  /** growth override (0..1) for living items */
  g?: number;
  /** skip positional jitter (anchored pieces) */
  fixed?: boolean;
}

const AXOLOTL: Spec[] = [
  // An axolotl is a 20+ cm floor walker: keep the front and centre as an open sand stage it can roam, and build the
  // scape along the back and the ends (a sweeping spider-wood root on the left, a smooth den on the right).
  { id: 'spider_wood', x: -0.17, z: -0.065, rot: 0.25, s: 1.1 },
  { id: 'smooth_hide', x: 0.22, z: -0.07, rot: -0.35, s: 1.1 },
  { id: 'river_stone', x: 0.335, z: -0.095, rot: 1.2, s: 1.3 },
  { id: 'river_stone', x: 0.04, z: -0.115, rot: 0.9, s: 1.05 },
  { id: 'river_stone', x: -0.33, z: -0.03, rot: 1.9, s: 0.75 },
  { id: 'river_stone', x: 0.345, z: 0.075, rot: 0.6, s: 0.85 },
  // background curtain of vallisneria (cool-tolerant, low light)
  { id: 'vallisneria', x: -0.33, z: -0.115, s: 0.7, g: 0.9 },
  { id: 'vallisneria', x: -0.245, z: -0.125, s: 0.66, g: 0.85 },
  { id: 'vallisneria', x: -0.04, z: -0.125, s: 0.64, g: 0.85 },
  { id: 'vallisneria', x: 0.105, z: -0.128, s: 0.62, g: 0.8 },
  // epiphytes tied to the wood and the den
  { id: 'java_fern', x: -0.215, z: -0.095, rot: 0.4, s: 1.1, g: 0.9 },
  { id: 'java_fern', x: -0.11, z: -0.085, rot: 2.4, s: 0.95, g: 0.85 },
  { id: 'java_fern', x: 0.3, z: -0.11, rot: -0.6, s: 1.15, g: 0.85 },
  { id: 'anubias_nana', x: -0.135, z: -0.045, rot: 0.9, s: 1.0, g: 0.9 },
  { id: 'anubias_nana', x: 0.19, z: -0.06, rot: -0.3, s: 0.78, g: 0.8, fixed: true },
  { id: 'java_moss', x: -0.18, z: -0.035, s: 0.9, g: 0.85 },
  // cool-water marimo tucked into the front corners
  { id: 'marimo_ball', x: -0.335, z: 0.1, s: 0.9, g: 0.9 },
  { id: 'marimo_ball', x: 0.275, z: 0.115, s: 0.8, g: 0.9 },
];

const BETTA: Spec[] = [
  { id: 'spider_wood', x: -0.085, z: -0.025, rot: -0.2, s: 0.95 },
  { id: 'river_stone', x: 0.125, z: 0.065, rot: 0.8, s: 0.6 },
  { id: 'river_stone', x: 0.19, z: 0.085, rot: 2.2, s: 0.42 },
  // background: warm red rotala/ludwigia accent at the back left, ribbons on the right
  { id: 'rotala', x: -0.215, z: -0.09, s: 0.86, g: 0.85 },
  { id: 'ludwigia', x: -0.145, z: -0.1, s: 0.8, g: 0.8 },
  { id: 'vallisneria', x: 0.2, z: -0.09, s: 0.58, g: 0.9 },
  { id: 'vallisneria', x: 0.105, z: -0.1, s: 0.55, g: 0.85 },
  { id: 'vallisneria', x: 0.02, z: -0.1, s: 0.5, g: 0.8 },
  // epiphytes on the wood (leaf hammocks)
  { id: 'java_fern', x: -0.05, z: -0.025, rot: 0.3, s: 0.95, g: 0.9 },
  { id: 'anubias_nana', x: -0.135, z: 0.0, rot: 1.1, s: 0.85, g: 0.9 },
  { id: 'java_moss', x: -0.1, z: 0.01, s: 0.7, g: 0.85 },
  // midground crypts
  { id: 'cryptocoryne', x: 0.1, z: 0.015, rot: 0.4, s: 0.95, g: 0.85 },
  { id: 'cryptocoryne', x: 0.18, z: -0.02, rot: 1.9, s: 1.05, g: 0.85 },
  { id: 'cryptocoryne', x: -0.2, z: 0.045, rot: 3.0, s: 0.78, g: 0.8 },
  // foreground carpet
  { id: 'monte_carlo', x: 0.15, z: 0.09, s: 0.85, g: 0.8 },
  // botanicals + surface shade (the middle of the surface stays open for bubble nests); the front-left sand is
  // left open on purpose — room for the player's first plant.
  { id: 'almond_leaf', x: 0.035, z: 0.085, rot: 0.45, s: 0.85 },
  { id: 'floating_plants', x: -0.145, z: -0.02, rot: 0.3, s: 0.85, g: 0.85 },
  { id: 'floating_plants', x: 0.16, z: 0.03, rot: 1.7, s: 0.78, g: 0.8 },
];

const PEA_PUFFER: Spec[] = [
  { id: 'spider_wood', x: -0.06, z: -0.02, rot: 0.5, s: 0.92 },
  { id: 'river_stone', x: 0.05, z: 0.075, rot: 0.4, s: 0.55 },
  { id: 'river_stone', x: -0.01, z: 0.092, rot: 1.8, s: 0.4 },
  // a dense wall of stems & ribbons
  { id: 'rotala', x: -0.21, z: -0.09, s: 0.88, g: 0.9 },
  { id: 'rotala', x: -0.14, z: -0.105, s: 0.8, g: 0.85 },
  { id: 'vallisneria', x: -0.065, z: -0.105, s: 0.56, g: 0.9 },
  { id: 'rotala', x: 0.015, z: -0.105, s: 0.82, g: 0.85 },
  { id: 'vallisneria', x: 0.09, z: -0.105, s: 0.55, g: 0.85 },
  { id: 'ludwigia', x: 0.2, z: -0.09, s: 0.86, g: 0.9 },
  { id: 'water_sprite', x: 0.15, z: -0.03, rot: 0.9, s: 0.85, g: 0.9 },
  { id: 'water_sprite', x: -0.2, z: 0.0, rot: 2.1, s: 0.65, g: 0.8 },
  // moss + fern on the wood: cover and sight breaks
  { id: 'java_moss', x: -0.04, z: 0.0, s: 0.95, g: 0.9 },
  { id: 'java_moss', x: -0.11, z: -0.035, s: 0.85, g: 0.9 },
  { id: 'java_fern', x: -0.02, z: -0.05, rot: -0.4, s: 0.92, g: 0.9 },
  { id: 'java_fern', x: 0.2, z: 0.02, rot: 2.4, s: 0.72, g: 0.85 },
  { id: 'anubias_nana', x: -0.085, z: 0.02, rot: 1.4, s: 0.7, g: 0.85 },
  { id: 'cryptocoryne', x: -0.18, z: 0.06, rot: 0.3, s: 0.8, g: 0.85 },
  { id: 'cryptocoryne', x: 0.06, z: -0.03, rot: 2.3, s: 0.9, g: 0.85 },
  { id: 'dwarf_hairgrass', x: -0.075, z: 0.095, s: 0.8, g: 0.8 },
  // the front-right sand is left open: a clearing to watch the hunt, and room for the player's first plant
  { id: 'floating_plants', x: 0.1, z: 0.0, rot: 0.6, s: 0.9, g: 0.85 },
];

const CLOWNFISH: Spec[] = [
  { id: 'live_rock_arch', x: -0.1, z: -0.03, rot: 0.08, s: 1.25 },
  { id: 'live_rock', x: 0.215, z: -0.06, rot: 0.9, s: 1.45 },
  { id: 'live_rock', x: 0.33, z: -0.1, rot: 2.1, s: 0.8 },
  // a low, flat ledge front-right left EMPTY on purpose — the future anemone spot
  { id: 'live_rock', x: 0.29, z: 0.045, rot: 2.6, s: 0.72 },
  { id: 'live_rock', x: -0.325, z: -0.085, rot: 1.7, s: 0.62 },
  { id: 'rubble', x: -0.02, z: 0.075, rot: 0.3, s: 1.05 },
  { id: 'rubble', x: 0.12, z: 0.1, rot: 1.9, s: 0.8 },
  { id: 'rubble', x: -0.3, z: 0.07, rot: 0.9, s: 0.7 },
  // lane:qa-visual — a little more life on the rockwork: a purple sea rod rising from the back gap between the arch
  // and the right-hand stack, crimson ogo bushes seated on the corner rocks and green chaeto tufts at their feet
  // (the open sand stage and the empty anemone ledge stay open)
  { id: 'gorgonian', x: 0.07, z: -0.12, rot: 2.3, s: 0.95, g: 0.85 },
  { id: 'red_ogo', x: 0.325, z: -0.11, s: 0.95, g: 0.85 },
  { id: 'red_ogo', x: -0.315, z: -0.1, s: 0.8, g: 0.85 },
  { id: 'red_ogo', x: 0.145, z: -0.115, s: 0.7, g: 0.8 },
  { id: 'chaetomorpha', x: -0.265, z: 0.02, s: 0.85, g: 0.85 },
  { id: 'chaetomorpha', x: 0.125, z: -0.01, s: 0.7, g: 0.85 },
];

const SEAHORSE: Spec[] = [
  { id: 'live_rock', x: -0.19, z: -0.07, rot: 0.4, s: 1.15 },
  { id: 'live_rock', x: 0.205, z: -0.08, rot: 2.2, s: 1.0 },
  { id: 'live_rock', x: -0.315, z: -0.1, rot: 1.1, s: 0.66 },
  { id: 'live_rock', x: 0.32, z: -0.085, rot: 0.2, s: 0.6 },
  { id: 'rubble', x: 0.02, z: -0.02, rot: 0.7, s: 1.1 },
  { id: 'rubble', x: 0.2, z: 0.07, rot: 2.4, s: 0.75 },
  // hitching forest: gorgonians rooted on the rocks and in the sand
  { id: 'gorgonian', x: -0.085, z: -0.1, rot: -0.3, s: 1.3, g: 0.9 },
  { id: 'gorgonian', x: -0.2, z: -0.065, rot: 0.2, s: 0.88, g: 0.85 },
  { id: 'gorgonian', x: 0.215, z: -0.08, rot: 1.1, s: 0.9, g: 0.85 },
  { id: 'gorgonian', x: 0.06, z: -0.11, rot: 2.6, s: 1.05, g: 0.85 },
  { id: 'hitching_post', x: -0.31, z: 0.0, rot: 0.5, s: 1.1 },
  { id: 'hitching_post', x: 0.315, z: -0.005, rot: 2.0, s: 1.0 },
  { id: 'red_ogo', x: -0.05, z: 0.035, s: 1.05, g: 0.9 },
  { id: 'red_ogo', x: 0.14, z: 0.015, s: 0.95, g: 0.85 },
  { id: 'red_ogo', x: -0.24, z: 0.04, s: 0.8, g: 0.85 },
  { id: 'chaetomorpha', x: 0.26, z: 0.085, s: 0.72, g: 0.85 },
  { id: 'feeding_dish', x: -0.12, z: 0.1, s: 1.0 },
];

const GENERIC_FW: Spec[] = [
  { id: 'spider_wood', x: -0.1, z: -0.03, rot: 0.2, s: 0.9 },
  { id: 'river_stone', x: 0.15, z: 0.04, s: 0.9 },
  { id: 'java_fern', x: -0.07, z: -0.02, s: 0.9, g: 0.8 },
  { id: 'cryptocoryne', x: 0.12, z: -0.05, s: 0.9, g: 0.8 },
  { id: 'vallisneria', x: 0.2, z: -0.09, s: 0.5, g: 0.8 },
];

const GENERIC_MARINE: Spec[] = [
  { id: 'live_rock', x: -0.12, z: -0.04, s: 1.0 },
  { id: 'live_rock', x: 0.14, z: -0.05, rot: 1.4, s: 0.8 },
  { id: 'rubble', x: 0.0, z: 0.05, s: 0.9 },
  { id: 'red_ogo', x: 0.2, z: -0.08, s: 0.8, g: 0.8 },
];

export const STARTER_LAYOUTS: Record<string, Spec[]> = {
  axolotl: AXOLOTL,
  betta: BETTA,
  pea_puffer: PEA_PUFFER,
  ocellaris_clownfish: CLOWNFISH,
  lined_seahorse: SEAHORSE,
};

function tryPlace(tmp: Tank, spec: Spec, rng: Rng | null, state: GameState): { x: number; z: number; rotY: number; scale: number; y: number } | null {
  const def = getDecorDef(spec.id);
  if (!def) return null;
  const jit = rng && !spec.fixed;
  const d = tankDims(tmp);
  // layouts are authored for the starter tank; scale positions to other tank sizes proportionally
  const ref = { L: 0.762, W: 0.3048 };
  const isSmall = d.L < 0.6;
  const sx = isSmall ? 1 : d.L / ref.L;
  const sz = isSmall ? 1 : d.W / ref.W;
  const scale = Math.max(def.scaleRange[0], Math.min(def.scaleRange[1], (spec.s ?? 1) * (jit ? 1 + (rng!.next() - 0.5) * 0.08 : 1)));
  const rotY = (spec.rot ?? 0) + (jit ? (rng!.next() - 0.5) * 0.5 : 0);
  let x = spec.x * sx + (jit ? (rng!.next() - 0.5) * 0.02 : 0);
  let z = spec.z * sz + (jit ? (rng!.next() - 0.5) * 0.016 : 0);
  const lim = placementLimits(tmp, def, scale, rotY);
  x = Math.max(-lim.maxX, Math.min(lim.maxX, x));
  z = Math.max(-lim.maxZ, Math.min(lim.maxZ, z));
  const chk = checkPlacement(state, tmp, spec.id, { x, z, rotY, scale }, { purchase: 'none' });
  if (chk.ok) return { x, z, rotY, scale: chk.scale, y: chk.y };
  if (chk.code === 'height') {
    // shrink to fit under the surface
    for (let k = 0.92; k > 0.5; k -= 0.08) {
      const s2 = Math.max(def.scaleRange[0], scale * k);
      const c2 = checkPlacement(state, tmp, spec.id, { x, z, rotY, scale: s2 }, { purchase: 'none' });
      if (c2.ok) return { x, z, rotY, scale: c2.scale, y: c2.y };
    }
  }
  return null;
}

/** Hand-authored (procedurally jittered) starter aquascape for each starter species. */
export function starterAquascapeImpl(state: GameState, starterId: string, tank: Tank): DecorInstance[] {
  const specs = STARTER_LAYOUTS[starterId] ?? (tank.environment === 'marine' ? GENERIC_MARINE : GENERIC_FW);
  const rng = simRng(state);
  const tmp: Tank = { ...tank, decor: [] };
  // starter kits are gifted: unlock checks don't apply to them
  const unlockedBackup = state.progress.unlocked;
  const needed = new Set(specs.map((s) => getDecorDef(s.id)?.unlock).filter((k): k is string => !!k));
  if (needed.size) state.progress.unlocked = [...unlockedBackup, ...needed];
  try {
    for (const spec of specs) {
      const def = getDecorDef(spec.id);
      if (!def) continue;
      const placed = tryPlace(tmp, spec, rng, state) ?? tryPlace(tmp, spec, null, state);
      if (!placed) continue;
      const living = initialLivingState(def);
      const inst: DecorInstance = {
        id: nextId(state, 'dc'),
        defId: spec.id,
        x: round4(placed.x),
        y: round4(placed.y),
        z: round4(placed.z),
        rotY: round4(placed.rotY),
        scale: round4(placed.scale),
        seed: rng.int(1, 2 ** 31 - 2),
        ...living,
      };
      if (living.growth !== undefined) inst.growth = spec.g ?? 0.8;
      if (living.health !== undefined) inst.health = def.visual === 'botanical_almond_leaf' ? 100 : 96;
      tmp.decor.push(inst);
    }
  } finally {
    state.progress.unlocked = unlockedBackup;
  }
  // re-resolve heights now that every host exists (keeps epiphytes seated even if order changes)
  for (const inst of tmp.decor) {
    const def = getDecorDef(inst.defId)!;
    inst.y = round4(resolveBaseY(tmp, def, inst.x, inst.z, inst.scale, inst.id));
  }
  return tmp.decor;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

/**
 * A piece of the template's kind still sitting near its template spot (after cancelling any uniform slide of the
 * whole layout), within this turn (rad) and no bigger than this ratio of its template size, reads as the gifted
 * layout, not the player's work (the seed jitter is ±1 cm, ±0.25 rad, ±4 %). The match radius grows with the tank:
 * GIFTED_MATCH_M or GIFTED_MATCH_FRAC of its length, whichever is larger, so nudging pieces a few cm is tidying, not
 * re-scaping.
 */
const GIFTED_MATCH_M = 0.03;
const GIFTED_MATCH_FRAC = 0.04;
const GIFTED_MATCH_RAD = 0.45;
const GIFTED_MATCH_SCALE = 1.14;

const median = (v: number[]): number => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * lane:staff (S05-01) — how much of this tank is still the gifted starter layout: the share of its pieces that sit
 * (same kind, within a few cm) where the hand-authored template put them. 0 = every piece is the player's own
 * placement, 1 = the layout the tank came with, pruned or not. Pure over the tank and the save's starter id, so it
 * works for old saves too; the show judge scales composition marks by the scaper's own hand. Sliding the whole
 * layout over (every piece the same way) does not make it the player's own: the median offset is cancelled first.
 */
export function giftedLayoutShare(state: Pick<GameState, 'starterId'>, tank: Tank): number {
  const decor = tank.decor ?? [];
  if (!decor.length) return 0;
  const specs = STARTER_LAYOUTS[state.starterId] ?? (tank.environment === 'marine' ? GENERIC_MARINE : GENERIC_FW);
  const d = tankDims(tank);
  const ref = { L: 0.762, W: 0.3048 };
  const isSmall = d.L < 0.6;
  const sx = isSmall ? 1 : d.L / ref.L;
  const sz = isSmall ? 1 : d.W / ref.W;
  const radius = Math.max(GIFTED_MATCH_M, GIFTED_MATCH_FRAC * d.L);
  // the template spots as tryPlace resolves them (scaled to the tank, then kept off the glass), with the pieces that
  // could still be them (same kind, not turned or enlarged by the player)
  const spots: { tx: number; tz: number; cands: DecorInstance[] }[] = [];
  for (const spec of specs) {
    const def = getDecorDef(spec.id);
    if (!def) continue;
    const tr = spec.rot ?? 0;
    const ts = Math.max(def.scaleRange[0], Math.min(def.scaleRange[1], spec.s ?? 1));
    const lim = placementLimits(tank, def, ts, tr);
    const tx = Math.max(-lim.maxX, Math.min(lim.maxX, spec.x * sx));
    const tz = Math.max(-lim.maxZ, Math.min(lim.maxZ, spec.z * sz));
    const cands = decor.filter((inst) => {
      if (inst.defId !== spec.id) return false;
      const turn = Math.abs(Math.atan2(Math.sin(inst.rotY - tr), Math.cos(inst.rotY - tr)));
      // (smaller is fine: starter pieces are shrunk to fit under the surface; bigger means the player resized it)
      return turn <= GIFTED_MATCH_RAD && inst.scale <= ts * GIFTED_MATCH_SCALE;
    });
    spots.push({ tx, tz, cands });
  }
  // a uniform slide of the whole layout: the median displacement from each spot to its nearest candidate
  const dxs: number[] = [];
  const dzs: number[] = [];
  for (const sp of spots) {
    let near: DecorInstance | null = null;
    let nd = Infinity;
    for (const inst of sp.cands) {
      const dist = Math.hypot(inst.x - sp.tx, inst.z - sp.tz);
      if (dist < nd) {
        nd = dist;
        near = inst;
      }
    }
    if (near) {
      dxs.push(near.x - sp.tx);
      dzs.push(near.z - sp.tz);
    }
  }
  const ox = median(dxs);
  const oz = median(dzs);
  const taken = new Set<string>();
  let matched = 0;
  for (const sp of spots) {
    let best: DecorInstance | null = null;
    let bestD = radius;
    for (const inst of sp.cands) {
      if (taken.has(inst.id)) continue;
      const dist = Math.hypot(inst.x - ox - sp.tx, inst.z - oz - sp.tz);
      if (dist <= bestD) {
        bestD = dist;
        best = inst;
      }
    }
    if (best) {
      taken.add(best.id);
      matched++;
    }
  }
  return matched / decor.length;
}
