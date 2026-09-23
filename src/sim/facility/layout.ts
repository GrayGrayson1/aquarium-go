/**
 * Facility floor layout: tank/stand footprints, placement validation, visitor navigation grid, reachability and
 * free-spot search. Pure functions (no randomness) shared by the sim, the placement ghost and the 3D visitors.
 * OWNER: lane "facility".
 *
 * Rotation convention (three.js, about +Y): tank-local (x, z) → world (x·cosθ + z·sinθ, −x·sinθ + z·cosθ).
 * A tank's front (+z local) therefore faces world (sinθ, cosθ).
 */
import type { FacilityState, GameState, Tank } from '@/types';
import { getTankTier } from '@/data/catalog/tanks';
import { FIXTURE_DEFS, getFacilityLevel, type FacilityPropDef, type FixtureKind } from '@/data/facilities';
import { IN_TO_M } from '../tankSpace';
import { theTank } from '../economy/util';

export interface Placement {
  x: number;
  z: number;
  rotY: number;
}

/** Oriented rectangle on the floor. hx/hz = half extents along the local x/z axes. */
export interface OBB {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  rot: number;
}

export interface PlacedTank {
  id: string;
  tierId: string;
  placement: Placement;
  name?: string;
}

/** Walkway clearance kept free in front of each tank's glass. */
export const FRONT_CLEARANCE_M = 0.75;
/** Gap between neighbouring stands. */
export const STAND_GAP_M = 0.08;
/** Margin from walls. */
export const WALL_MARGIN_M = 0.03;
/** Visitor body radius used to inflate obstacles on the nav grid. */
export const AGENT_RADIUS_M = 0.2;

// ───────────────────────────── geometry ─────────────────────────────

export function tankOuterSize(tierId: string): { L: number; W: number; H: number } {
  const t = getTankTier(tierId);
  const g = (t.glassMm / 1000) * 2;
  return { L: t.dimsIn.l * IN_TO_M + g, W: t.dimsIn.w * IN_TO_M + g, H: t.dimsIn.h * IN_TO_M + g };
}

/**
 * Stand/cabinet footprint on the floor. Matches the stand furniture drawn by the tank shell (a desk is wider than
 * a nano tank; plinths overhang the glass) plus a centimetre of breathing room.
 */
export function tankFootprint(tierId: string, p: Placement): OBB {
  const t = getTankTier(tierId);
  const o = tankOuterSize(tierId);
  let w: number;
  let d: number;
  switch (t.standStyle) {
    case 'desk':
      w = Math.max(o.L + 0.22, 0.72);
      d = Math.max(o.W + 0.16, 0.44);
      break;
    case 'rack':
      w = o.L + 0.03;
      d = o.W + 0.03;
      break;
    case 'built_in':
      w = o.L + 0.12;
      d = o.W + 0.08;
      break;
    case 'plinth':
      w = o.L + 0.16;
      d = o.W + 0.16;
      break;
    default:
      w = o.L + 0.02;
      d = o.W + 0.02;
  }
  return { cx: p.x, cz: p.z, hx: w / 2 + 0.01, hz: d / 2 + 0.01, rot: p.rotY };
}

/** Zone in front of the glass that must stay walkable for viewing. */
export function tankFrontZone(tierId: string, p: Placement, depth = FRONT_CLEARANCE_M): OBB {
  const f = tankFootprint(tierId, p);
  const fx = Math.sin(p.rotY);
  const fz = Math.cos(p.rotY);
  const off = f.hz + depth / 2;
  return { cx: p.x + fx * off, cz: p.z + fz * off, hx: f.hx * 0.9, hz: depth / 2, rot: p.rotY };
}

/** Where a visitor stands to look into the tank (world metres). */
export function viewingPoint(tierId: string, p: Placement, dist = 0.55): { x: number; z: number } {
  const f = tankFootprint(tierId, p);
  return { x: p.x + Math.sin(p.rotY) * (f.hz + dist), z: p.z + Math.cos(p.rotY) * (f.hz + dist) };
}

function axes(o: OBB): [number, number, number, number] {
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  // u = local x in world, v = local z in world
  return [c, -s, s, c];
}

export function pointInOBB(o: OBB, x: number, z: number, inflate = 0): boolean {
  const [ux, uz, vx, vz] = axes(o);
  const dx = x - o.cx;
  const dz = z - o.cz;
  return Math.abs(dx * ux + dz * uz) <= o.hx + inflate && Math.abs(dx * vx + dz * vz) <= o.hz + inflate;
}

/** Separating-axis test. `gap` = required clearance between the rectangles. */
export function obbOverlap(a: OBB, b: OBB, gap = 0): boolean {
  const [aux, auz, avx, avz] = axes(a);
  const [bux, buz, bvx, bvz] = axes(b);
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  const test = (nx: number, nz: number) => {
    const ra = a.hx * Math.abs(aux * nx + auz * nz) + a.hz * Math.abs(avx * nx + avz * nz);
    const rb = b.hx * Math.abs(bux * nx + buz * nz) + b.hz * Math.abs(bvx * nx + bvz * nz);
    return Math.abs(dx * nx + dz * nz) > ra + rb + gap;
  };
  return !(test(aux, auz) || test(avx, avz) || test(bux, buz) || test(bvx, bvz));
}

export function obbCorners(o: OBB): [number, number][] {
  const [ux, uz, vx, vz] = axes(o);
  const out: [number, number][] = [];
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    out.push([o.cx + ux * o.hx * sx + vx * o.hz * sz, o.cz + uz * o.hx * sx + vz * o.hz * sz]);
  }
  return out;
}

export function obbInsideRoom(o: OBB, width: number, depth: number, margin = WALL_MARGIN_M): boolean {
  const hw = width / 2 - margin;
  const hd = depth / 2 - margin;
  return obbCorners(o).every(([x, z]) => x >= -hw - 1e-6 && x <= hw + 1e-6 && z >= -hd - 1e-6 && z <= hd + 1e-6);
}

// ───────────────────────────── obstacles ─────────────────────────────

export interface Obstacle {
  obb: OBB;
  label: string;
  kind: 'prop' | 'fixture';
  /** Visitors may walk through it (door swing zones keep tanks away from doors but not people). */
  walkable?: boolean;
}

const PROP_LABELS: Partial<Record<FacilityPropDef['kind'], string>> = {
  bookshelf: 'bookshelf',
  armchair: 'armchair',
  side_table: 'side table',
  floor_lamp: 'floor lamp',
  houseplant: 'houseplant',
  door_swing: 'doorway',
  counter: 'counter',
  merch_shelf: 'shelving',
  planter: 'planter',
  reception: 'reception desk',
  ticket_gate: 'ticket gates',
  column: 'column',
};

export function facilityObstacles(fac: FacilityState): Obstacle[] {
  const level = getFacilityLevel(fac.level);
  const out: Obstacle[] = [];
  for (const p of level.props) {
    if (!p.blocks) continue;
    out.push({ obb: { cx: p.x, cz: p.z, hx: p.w / 2, hz: p.d / 2, rot: p.rotY }, label: PROP_LABELS[p.kind] ?? p.kind, kind: 'prop', walkable: p.kind === 'door_swing' });
  }
  for (const f of fac.fixtures ?? []) {
    const def = FIXTURE_DEFS[f.kind as FixtureKind];
    const w = def?.w ?? 0.6;
    const d = def?.d ?? 0.6;
    out.push({ obb: { cx: f.x, cz: f.z, hx: w / 2, hz: d / 2, rot: f.rotY }, label: def?.name.toLowerCase() ?? f.kind, kind: 'fixture' });
  }
  return out;
}

export function placedTanks(state: GameState): PlacedTank[] {
  const out: PlacedTank[] = [];
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (t) out.push({ id: t.id, tierId: t.tierId, placement: t.placement, name: t.name });
  }
  return out;
}

// ───────────────────────────── navigation grid ─────────────────────────────

export interface NavGrid {
  cell: number;
  nx: number;
  nz: number;
  /** World x/z of cell (0,0) centre. */
  x0: number;
  z0: number;
  width: number;
  depth: number;
  blocked: Uint8Array;
  /** Cell index of the entrance (−1 if the doorway itself is blocked). */
  entrance: number;
  entrancePoint: { x: number; z: number };
}

export function gridCellSize(width: number, depth: number): number {
  return Math.max(0.2, Math.min(0.35, Math.sqrt((width * depth) / 16000)));
}

export function cellIndex(g: NavGrid, x: number, z: number): number {
  const i = Math.round((x - g.x0) / g.cell);
  const j = Math.round((z - g.z0) / g.cell);
  if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return -1;
  return j * g.nx + i;
}

export function cellCenter(g: NavGrid, idx: number): { x: number; z: number } {
  const i = idx % g.nx;
  const j = (idx - i) / g.nx;
  return { x: g.x0 + i * g.cell, z: g.z0 + j * g.cell };
}

/** Rasterise the room: walls, props, fixtures and tank stands (inflated by the visitor radius). */
export function buildNavGrid(fac: FacilityState, tanks: PlacedTank[], agentRadius = AGENT_RADIUS_M): NavGrid {
  const cell = gridCellSize(fac.width, fac.depth);
  const nx = Math.max(2, Math.floor(fac.width / cell));
  const nz = Math.max(2, Math.floor(fac.depth / cell));
  const x0 = -((nx - 1) * cell) / 2;
  const z0 = -((nz - 1) * cell) / 2;
  const blocked = new Uint8Array(nx * nz);
  const hw = fac.width / 2 - agentRadius;
  const hd = fac.depth / 2 - agentRadius;
  const obbs: OBB[] = facilityObstacles(fac)
    .filter((o) => !o.walkable)
    .map((o) => o.obb);
  for (const t of tanks) obbs.push(tankFootprint(t.tierId, t.placement));
  // per-obstacle bounding boxes for fast rejection
  const boxes = obbs.map((o) => {
    const cs = obbCorners(o);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of cs) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    return { o, minX: minX - agentRadius, maxX: maxX + agentRadius, minZ: minZ - agentRadius, maxZ: maxZ + agentRadius };
  });
  for (let j = 0; j < nz; j++) {
    const z = z0 + j * cell;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * cell;
      let b = x < -hw || x > hw || z < -hd || z > hd;
      if (!b) {
        for (const bx of boxes) {
          if (x < bx.minX || x > bx.maxX || z < bx.minZ || z > bx.maxZ) continue;
          if (pointInOBB(bx.o, x, z, agentRadius)) {
            b = true;
            break;
          }
        }
      }
      blocked[j * nx + i] = b ? 1 : 0;
    }
  }
  const level = getFacilityLevel(fac.level);
  const ep = { x: level.entrance.x * (fac.width / level.width), z: level.entrance.z * (fac.depth / level.depth) };
  const grid: NavGrid = { cell, nx, nz, x0, z0, width: fac.width, depth: fac.depth, blocked, entrance: -1, entrancePoint: ep };
  const e = cellIndex(grid, ep.x, ep.z);
  grid.entrance = e >= 0 && !blocked[e] ? e : nearestOpenCell(grid, ep.x, ep.z, 0.45);
  return grid;
}

/** Nearest unblocked cell within `maxDist` metres (−1 if none). */
export function nearestOpenCell(g: NavGrid, x: number, z: number, maxDist = 1.5): number {
  const ci = Math.round((x - g.x0) / g.cell);
  const cj = Math.round((z - g.z0) / g.cell);
  const r = Math.ceil(maxDist / g.cell);
  let best = -1;
  let bestD = Infinity;
  for (let dj = -r; dj <= r; dj++) {
    for (let di = -r; di <= r; di++) {
      const i = ci + di;
      const j = cj + dj;
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
      const idx = j * g.nx + i;
      if (g.blocked[idx]) continue;
      const d = di * di + dj * dj;
      if (d < bestD && d <= r * r) {
        bestD = d;
        best = idx;
      }
    }
  }
  return best;
}

/** Breadth-first distances (in cells, 8-connected without corner cutting) from `start`. −1 = unreachable. */
export function bfs(g: NavGrid, start: number): Int32Array {
  const dist = new Int32Array(g.nx * g.nz).fill(-1);
  if (start < 0 || g.blocked[start]) return dist;
  const queue = new Int32Array(g.nx * g.nz);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  dist[start] = 0;
  while (head < tail) {
    const idx = queue[head++];
    const i = idx % g.nx;
    const j = (idx - i) / g.nx;
    const d = dist[idx] + 1;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.nx || nj >= g.nz) continue;
        const n = nj * g.nx + ni;
        if (g.blocked[n] || dist[n] >= 0) continue;
        if (di && dj && (g.blocked[j * g.nx + ni] || g.blocked[nj * g.nx + i])) continue;
        dist[n] = d;
        queue[tail++] = n;
      }
    }
  }
  return dist;
}

/**
 * Cells of a tank's viewing strip (in front of the glass), nearest-to-centre first. A cell only counts if a person
 * standing there can see the glass directly — nothing solid (another stand, a prop) sits in between.
 */
export function viewingCells(g: NavGrid, t: PlacedTank, blockers: OBB[] = []): number[] {
  const f = tankFootprint(t.tierId, t.placement);
  const fx = Math.sin(t.placement.rotY);
  const fz = Math.cos(t.placement.rotY);
  const lx = Math.cos(t.placement.rotY);
  const lz = -Math.sin(t.placement.rotY);
  const out: { idx: number; score: number }[] = [];
  const seen = new Set<number>();
  const half = Math.max(0.15, f.hx * 0.8);
  const near = blockers.filter((b) => Math.hypot(b.cx - t.placement.x, b.cz - t.placement.z) < f.hx + f.hz + FRONT_CLEARANCE_M + b.hx + b.hz + 0.5);
  for (let d = AGENT_RADIUS_M + 0.05; d <= FRONT_CLEARANCE_M + 0.1; d += g.cell * 0.7) {
    for (let s = -half; s <= half + 1e-6; s += g.cell * 0.7) {
      const gx = t.placement.x + fx * f.hz + lx * s;
      const gz = t.placement.z + fz * f.hz + lz * s;
      const x = gx + fx * d;
      const z = gz + fz * d;
      const idx = cellIndex(g, x, z);
      if (idx < 0 || seen.has(idx) || g.blocked[idx]) continue;
      seen.add(idx);
      let clear = true;
      for (let k = 1; k <= 6 && clear; k++) {
        const u = k / 7;
        const px = gx + (x - gx) * u;
        const pz = gz + (z - gz) * u;
        for (const b of near) {
          if (pointInOBB(b, px, pz)) {
            clear = false;
            break;
          }
        }
      }
      if (!clear) continue;
      out.push({ idx, score: Math.abs(s) * 1.5 + Math.abs(d - 0.55) });
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out.map((o) => o.idx);
}

export interface Reachability {
  grid: NavGrid;
  dist: Int32Array;
  reachable: Set<string>;
  unreachable: string[];
  /** tankId -> best reachable viewing point (world). */
  viewpoints: Record<string, { x: number; z: number }>;
  /** tankId -> path length (metres) from the entrance, for visit ordering. */
  distance: Record<string, number>;
}

export function computeReachability(fac: FacilityState, tanks: PlacedTank[]): Reachability {
  const grid = buildNavGrid(fac, tanks);
  const dist = bfs(grid, grid.entrance);
  const reachable = new Set<string>();
  const unreachable: string[] = [];
  const viewpoints: Record<string, { x: number; z: number }> = {};
  const distance: Record<string, number> = {};
  const solid = facilityObstacles(fac)
    .filter((o) => !o.walkable)
    .map((o) => o.obb);
  const stands = tanks.map((t) => tankFootprint(t.tierId, t.placement));
  for (let i = 0; i < tanks.length; i++) {
    const t = tanks[i];
    const cells = viewingCells(grid, t, [...solid, ...stands.filter((_, j) => j !== i)]);
    const hit = cells.find((c) => dist[c] >= 0);
    if (hit === undefined) {
      unreachable.push(t.id);
      continue;
    }
    reachable.add(t.id);
    viewpoints[t.id] = cellCenter(grid, hit);
    distance[t.id] = dist[hit] * grid.cell;
  }
  return { grid, dist, reachable, unreachable, viewpoints, distance };
}

/** Reachability for the current game state (memoised on layout signature). */
let reachCache: { sig: string; r: Reachability } | null = null;
export function layoutSignature(fac: FacilityState, tanks: PlacedTank[]): string {
  let s = `${fac.level}|${fac.width}|${fac.depth}|`;
  for (const f of fac.fixtures ?? []) s += `${f.kind}:${f.x.toFixed(2)},${f.z.toFixed(2)},${f.rotY.toFixed(2)};`;
  s += '|';
  for (const t of tanks) s += `${t.id}:${t.tierId}:${t.placement.x.toFixed(3)},${t.placement.z.toFixed(3)},${t.placement.rotY.toFixed(3)};`;
  return s;
}
export function stateReachability(state: GameState): Reachability {
  const tanks = placedTanks(state);
  const sig = layoutSignature(state.facility, tanks);
  if (reachCache && reachCache.sig === sig) return reachCache.r;
  const r = computeReachability(state.facility, tanks);
  reachCache = { sig, r };
  return r;
}

// ───────────────────────────── placement ─────────────────────────────

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
  /** Tanks that would become unreachable. */
  blocks?: string[];
}

const nameOf = (t: PlacedTank) => {
  if (t.name) return t.name;
  try {
    return getTankTier(t.tierId).name;
  } catch {
    return 'tank';
  }
};

/** Cheap checks: bounds, stands, props/fixtures, front clearances. */
export function checkFootprint(fac: FacilityState, tanks: PlacedTank[], tierId: string, p: Placement, ignoreId?: string, gap = STAND_GAP_M): PlacementCheck {
  const fp = tankFootprint(tierId, p);
  if (!obbInsideRoom(fp, fac.width, fac.depth)) return { ok: false, reason: 'That spot is outside the room.' };
  const front = tankFrontZone(tierId, p);
  if (!obbInsideRoom(front, fac.width, fac.depth, 0)) return { ok: false, reason: 'The glass would face a wall — turn it around.' };
  for (const o of facilityObstacles(fac)) {
    if (obbOverlap(fp, o.obb, 0.02)) return { ok: false, reason: `The ${o.label} is in the way.` };
    if (obbOverlap(front, o.obb, 0)) return { ok: false, reason: `The ${o.label} would block the view.` };
  }
  for (const t of tanks) {
    if (t.id === ignoreId) continue;
    const other = tankFootprint(t.tierId, t.placement);
    if (obbOverlap(fp, other, gap)) return { ok: false, reason: `Too close to ${theTank(nameOf(t))}.` };
    if (obbOverlap(fp, tankFrontZone(t.tierId, t.placement), 0)) return { ok: false, reason: `That would block the view of ${theTank(nameOf(t))}.` };
    if (obbOverlap(front, other, 0)) return { ok: false, reason: `Its glass would face straight into ${theTank(nameOf(t))}.` };
  }
  return { ok: true };
}

/** Full validation including keeping a visitor path from the entrance to every exhibit. */
export function checkPlacement(fac: FacilityState, tanks: PlacedTank[], tierId: string, p: Placement, ignoreId?: string, name?: string): PlacementCheck {
  const cheap = checkFootprint(fac, tanks, tierId, p, ignoreId);
  if (!cheap.ok) return cheap;
  const next: PlacedTank[] = tanks.filter((t) => t.id !== ignoreId);
  const candidate: PlacedTank = { id: ignoreId ?? '__candidate__', tierId, placement: p, name };
  next.push(candidate);
  const r = computeReachability(fac, next);
  if (r.grid.entrance < 0) return { ok: false, reason: 'That would block the doorway.' };
  if (r.unreachable.length) {
    const blockedOthers = r.unreachable.filter((id) => id !== candidate.id);
    if (!blockedOthers.length) return { ok: false, reason: 'Nobody could walk up to this tank there — leave an aisle.', blocks: [candidate.id] };
    const t = next.find((x) => x.id === blockedOthers[0]);
    return { ok: false, reason: `Visitors couldn’t reach ${t ? theTank(nameOf(t)) : 'the other tanks'} — leave an aisle.`, blocks: blockedOthers };
  }
  return { ok: true };
}

export function validatePlacementIn(state: GameState, tierId: string, p: Placement, ignoreTankId?: string): PlacementCheck {
  return checkPlacement(state.facility, placedTanks(state), tierId, p, ignoreTankId, ignoreTankId ? state.tanks[ignoreTankId]?.name : undefined);
}

const HALF_PI = Math.PI / 2;

/** Candidate spots: along the back wall (centre outwards), side walls (back to front), front wall, then island rows. */
function* candidateSpots(fac: FacilityState, tierId: string): Generator<Placement> {
  const o = tankOuterSize(tierId);
  const probe = tankFootprint(tierId, { x: 0, z: 0, rotY: 0 });
  const hx = probe.hx;
  const hz = probe.hz;
  const w = fac.width;
  const d = fac.depth;
  const m = WALL_MARGIN_M + 0.005;
  const step = Math.max(0.05, Math.min(0.2, o.L / 12));
  // back wall, facing +z
  {
    const z = -d / 2 + m + hz;
    const maxX = w / 2 - m - hx;
    for (let k = 0; k * step <= maxX + 1e-6; k++) {
      yield { x: k * step, z, rotY: 0 };
      if (k) yield { x: -k * step, z, rotY: 0 };
    }
  }
  // side walls, back to front (left faces +x, right faces −x)
  {
    const minZ = -d / 2 + m + hx;
    const maxZ = d / 2 - m - hx;
    for (let z = minZ; z <= maxZ + 1e-6; z += step) {
      yield { x: -w / 2 + m + hz, z, rotY: HALF_PI };
      yield { x: w / 2 - m - hz, z, rotY: -HALF_PI };
    }
  }
  // island rows facing the entrance (front)
  if (d > 6) {
    const rowGap = 2 * hz + FRONT_CLEARANCE_M + 1.6;
    for (let z = -d / 2 + m + hz + rowGap + 0.8; z < d / 2 - 2.5; z += rowGap) {
      const maxX = w / 2 - m - hx - 1.4;
      for (let k = 0; k * step <= maxX + 1e-6; k++) {
        yield { x: k * step, z, rotY: 0 };
        if (k) yield { x: -k * step, z, rotY: 0 };
      }
    }
  }
  // front wall, facing −z (behind the cut-away camera side)
  {
    const z = d / 2 - m - hz;
    const maxX = w / 2 - m - hx;
    for (let k = 0; k * step <= maxX + 1e-6; k++) {
      yield { x: k * step, z, rotY: Math.PI };
      if (k) yield { x: -k * step, z, rotY: Math.PI };
    }
  }
}

/**
 * First valid spot in preference order. A first pass keeps the level's comfortable spacing between exhibits
 * (galleries breathe more than a hobby room); a second pass accepts the minimum stand gap.
 */
export function findFreeSpotIn(fac: FacilityState, tanks: PlacedTank[], tierId: string, ignoreId?: string, maxPathChecks = 60): Placement | null {
  const spacing = getFacilityLevel(fac.level).tankSpacing ?? STAND_GAP_M;
  const gaps = spacing > STAND_GAP_M ? [spacing, STAND_GAP_M] : [STAND_GAP_M];
  for (const gap of gaps) {
    let pathChecks = 0;
    for (const p of candidateSpots(fac, tierId)) {
      if (!checkFootprint(fac, tanks, tierId, p, ignoreId, gap).ok) continue;
      if (pathChecks++ > maxPathChecks) break;
      if (checkPlacement(fac, tanks, tierId, p, ignoreId).ok) return { x: round3(p.x), z: round3(p.z), rotY: p.rotY };
    }
  }
  return null;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Re-lay tanks after the room changes size (facility upgrade). Keeps each tank's relationship to the wall it was
 * standing against (back / left / right / front) and falls back to the next free wall spot when that fails.
 */
export function relayoutTanks(state: GameState, oldFac: { width: number; depth: number }): { moved: string[]; unplaced: string[] } {
  const fac = state.facility;
  const dw = (fac.width - oldFac.width) / 2;
  const dd = (fac.depth - oldFac.depth) / 2;
  const placed: PlacedTank[] = [];
  const moved: string[] = [];
  const unplaced: string[] = [];
  // biggest tanks first so they get the best wall spots
  const order = [...state.tankOrder].filter((id) => state.tanks[id]).sort((a, b) => getTankTier(state.tanks[b].tierId).gallons - getTankTier(state.tanks[a].tierId).gallons);
  for (const id of order) {
    const t = state.tanks[id];
    const fp = tankFootprint(t.tierId, t.placement);
    const near = (v: number, target: number) => Math.abs(v - target) < 0.45;
    let { x, z } = t.placement;
    const cs = obbCorners(fp);
    const minX = Math.min(...cs.map((c) => c[0]));
    const maxX = Math.max(...cs.map((c) => c[0]));
    const minZ = Math.min(...cs.map((c) => c[1]));
    const maxZ = Math.max(...cs.map((c) => c[1]));
    if (near(minZ, -oldFac.depth / 2)) z -= dd;
    else if (near(maxZ, oldFac.depth / 2)) z += dd;
    if (near(minX, -oldFac.width / 2)) x -= dw;
    else if (near(maxX, oldFac.width / 2)) x += dw;
    let p: Placement | null = { x: round3(x), z: round3(z), rotY: t.placement.rotY };
    if (!checkPlacement(fac, placed, t.tierId, p, t.id, t.name).ok) {
      p = findFreeSpotIn(fac, placed, t.tierId, t.id, 200);
      if (p) moved.push(id);
    }
    if (!p) {
      unplaced.push(id);
      p = t.placement;
    }
    t.placement = p;
    placed.push({ id, tierId: t.tierId, placement: p, name: t.name });
  }
  return { moved, unplaced };
}

// ───────────────────────────── pathfinding (runtime visitors) ─────────────────────────────

/** A* on the nav grid (8-connected, no corner cutting). Returns world waypoints (smoothed) or null. */
export function findPath(g: NavGrid, from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number }[] | null {
  let s = cellIndex(g, from.x, from.z);
  if (s < 0 || g.blocked[s]) s = nearestOpenCell(g, from.x, from.z, 1.2);
  let e = cellIndex(g, to.x, to.z);
  if (e < 0 || g.blocked[e]) e = nearestOpenCell(g, to.x, to.z, 1.2);
  if (s < 0 || e < 0) return null;
  if (s === e) return [cellCenter(g, e)];
  const n = g.nx * g.nz;
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  // binary heap of [f, idx]
  const heapF: number[] = [];
  const heapI: number[] = [];
  const push = (f: number, i: number) => {
    heapF.push(f);
    heapI.push(i);
    let k = heapF.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapF[p] <= heapF[k]) break;
      [heapF[p], heapF[k]] = [heapF[k], heapF[p]];
      [heapI[p], heapI[k]] = [heapI[k], heapI[p]];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heapI[0];
    const lf = heapF.pop()!;
    const li = heapI.pop()!;
    if (heapF.length) {
      heapF[0] = lf;
      heapI[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heapF.length && heapF[l] < heapF[m]) m = l;
        if (r < heapF.length && heapF[r] < heapF[m]) m = r;
        if (m === k) break;
        [heapF[m], heapF[k]] = [heapF[k], heapF[m]];
        [heapI[m], heapI[k]] = [heapI[k], heapI[m]];
        k = m;
      }
    }
    return top;
  };
  const ei = e % g.nx;
  const ej = (e - ei) / g.nx;
  const h = (idx: number) => {
    const i = idx % g.nx;
    const j = (idx - i) / g.nx;
    const dx = Math.abs(i - ei);
    const dz = Math.abs(j - ej);
    return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
  };
  gScore[s] = 0;
  push(h(s), s);
  let found = false;
  let guard = 0;
  while (heapI.length && guard++ < n * 4) {
    const cur = pop();
    if (closed[cur]) continue;
    if (cur === e) {
      found = true;
      break;
    }
    closed[cur] = 1;
    const i = cur % g.nx;
    const j = (cur - i) / g.nx;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.nx || nj >= g.nz) continue;
        const nb = nj * g.nx + ni;
        if (g.blocked[nb] || closed[nb]) continue;
        if (di && dj && (g.blocked[j * g.nx + ni] || g.blocked[nj * g.nx + i])) continue;
        const cost = gScore[cur] + (di && dj ? 1.4142 : 1);
        if (cost < gScore[nb]) {
          gScore[nb] = cost;
          came[nb] = cur;
          push(cost + h(nb), nb);
        }
      }
    }
  }
  if (!found) return null;
  const cells: number[] = [];
  for (let c = e; c >= 0; c = came[c]) {
    cells.push(c);
    if (c === s) break;
  }
  cells.reverse();
  // string-pull: keep a waypoint only when line of sight breaks
  const pts = cells.map((c) => cellCenter(g, c));
  const out: { x: number; z: number }[] = [pts[0]];
  let anchor = 0;
  for (let k = 2; k < pts.length; k++) {
    if (!lineOfSight(g, pts[anchor], pts[k])) {
      out.push(pts[k - 1]);
      anchor = k - 1;
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function lineOfSight(g: NavGrid, a: { x: number; z: number }, b: { x: number; z: number }): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const steps = Math.ceil(len / (g.cell * 0.5));
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const idx = cellIndex(g, a.x + dx * t, a.z + dz * t);
    if (idx < 0 || g.blocked[idx]) return false;
  }
  return true;
}

export function isWalkable(g: NavGrid, x: number, z: number): boolean {
  const idx = cellIndex(g, x, z);
  return idx >= 0 && !g.blocked[idx];
}

/** Helper for UI copy: tank name or tier name. */
export function tankLabel(t: Pick<Tank, 'name' | 'tierId'>): string {
  return t.name || nameOf({ id: '', tierId: t.tierId, placement: { x: 0, z: 0, rotY: 0 } });
}
