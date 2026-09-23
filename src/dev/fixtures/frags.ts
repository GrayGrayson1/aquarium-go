/**
 * Frag & cutting fixtures (lane "frags"): ?fixture=frags_reef | frags_planted | frags_market.
 *   frags_reef     the marine_reef save with grown coral colonies on the rock, a frag rack of frags at every stage
 *                  (fresh, healing, growing) and a few frags in storage
 *   frags_planted  a planted grow-out tank with grown stem plants, rhizome plants and carpets, plus fresh cuttings
 *   frags_market   frags_reef with an active frag-pack listing that already has bids
 * Deterministic apart from the real-time stamp every fixture carries.
 */
import type { GameState, Tank } from '@/types';
import { getDecorDef } from '@/data/catalog/decor';
import { placeDecor, takeFrag, plantFrag, checkPlacement, surfaceHeightAt, substrateHeightAt } from '@/sim/aquascape';
import { tankDims, tankWorldTransform } from '@/sim/tankSpace';
import { createListing, forceBuyerVisit } from '@/sim/economy';
import { marineReef, layoutAll } from './core-fixtures';
import { addPlacedTank, finishTank, stockTank, unlockEverything, ensureFacility } from './core-helpers';
import { newGame } from '@/sim/newGame';

interface Want {
  defId: string;
  x: number;
  z: number;
  scale: number;
  /** Prefer rock tops (corals, epiphytes). */
  onRock?: boolean;
  rotY?: number;
}

/** Place a piece as close as possible to (x, z), scanning outward for a valid spot. Returns its id. */
function placeNear(g: GameState, tank: Tank, w: Want): string | null {
  const def = getDecorDef(w.defId);
  if (!def) return null;
  const d = tankDims(tank);
  const cands: { x: number; z: number; s: number }[] = [];
  for (let r = 0; r <= 0.24; r += 0.012) {
    const steps = r === 0 ? 1 : Math.max(8, Math.round((r / 0.012) * 6));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = w.x + Math.cos(a) * r;
      const z = w.z + Math.sin(a) * r * 0.6;
      if (Math.abs(x) > d.L / 2 - 0.02 || Math.abs(z) > d.W / 2 - 0.02) continue;
      const rock = surfaceHeightAt(tank, x, z) > substrateHeightAt(tank, x, z) + 0.01;
      cands.push({ x, z, s: r + (w.onRock && !rock ? 0.3 : 0) + (!w.onRock && rock ? 0.3 : 0) });
    }
  }
  cands.sort((a, b) => a.s - b.s);
  for (const c of cands) {
    if (!checkPlacement(g, tank, def.id, { x: c.x, z: c.z, rotY: 0.4, scale: w.scale }, { purchase: 'none' }).ok) continue;
    const r = placeDecor(g, tank.id, def.id, { x: c.x, z: c.z, rotY: w.rotY ?? (c.x * 17) % 6.28, scale: w.scale }, false);
    if (r.ok && r.decorId) return r.decorId;
  }
  return null;
}

function grow(tank: Tank, id: string | null, growth: number, health = 94): void {
  const inst = id ? tank.decor.find((x) => x.id === id) : undefined;
  if (inst) {
    inst.growth = growth;
    inst.health = health;
  }
}

/** Cut `n` frags from a colony (skipping its healing time) and return their ids. */
function cut(g: GameState, tank: Tank, parentId: string | null, n: number): string[] {
  const out: string[] = [];
  const p = parentId ? tank.decor.find((x) => x.id === parentId) : undefined;
  if (!p) return out;
  for (let i = 0; i < n; i++) {
    p.growth = 1;
    delete p.recoverUntilHour;
    const r = takeFrag(g, tank.id, p.id);
    if (r.ok && r.fragId) out.push(r.fragId);
  }
  return out;
}

export function fragsReef(): GameState {
  const g = marineReef();
  g.finance.money = 12_000;
  const tank = g.tanks[g.tankOrder[0]];
  const d = tankDims(tank);
  const L = d.L / 2;
  // Grown colonies on the rockwork (placed near the arch and the rock stacks).
  const hammer = placeNear(g, tank, { defId: 'hammer_coral', x: -L * 0.38, z: -0.02, scale: 1.25, onRock: true });
  const torch = placeNear(g, tank, { defId: 'torch_coral', x: L * 0.38, z: -0.03, scale: 1.2, onRock: true });
  const zoa = placeNear(g, tank, { defId: 'zoanthids', x: -L * 0.62, z: 0.02, scale: 1.6, onRock: true });
  const acro = placeNear(g, tank, { defId: 'acropora', x: -L * 0.12, z: -0.06, scale: 1.1, onRock: true });
  const gsp = placeNear(g, tank, { defId: 'green_star_polyps', x: L * 0.62, z: 0.0, scale: 1.4, onRock: true });
  const shroom = placeNear(g, tank, { defId: 'mushroom_coral', x: L * 0.12, z: 0.03, scale: 1.3, onRock: true });
  for (const id of [hammer, torch, zoa, acro, gsp, shroom]) grow(tank, id, 1, 95);
  // A frag rack front-right on the sand.
  placeNear(g, tank, { defId: 'frag_rack', x: L * 0.45, z: d.W * 0.26, scale: 1.2, rotY: 0.12 });
  // Frags at every stage: fresh cuts, healing, growing out.
  const frags = [...cut(g, tank, hammer, 2), ...cut(g, tank, zoa, 2), ...cut(g, tank, acro, 1), ...cut(g, tank, torch, 1), ...cut(g, tank, gsp, 1), ...cut(g, tank, shroom, 1)];
  const now = g.clock.hour;
  const planted: string[] = [];
  for (const id of frags.slice(0, 6)) {
    const r = plantFrag(g, tank.id, id, undefined, { rackOnly: true });
    if (r.ok && r.decorId) planted.push(r.decorId);
  }
  const stages = [0.12, 0.3, 0.2, 0.45, 0.6, 0.16];
  planted.forEach((id, i) => {
    const inst = tank.decor.find((x) => x.id === id);
    if (!inst?.frag) return;
    inst.growth = stages[i % stages.length];
    inst.frag.plantedHour = now - (i % 3) * 30;
    inst.health = 92;
  });
  // The parents have healed (the fixture skips the waiting); one is still recovering.
  for (const id of [hammer, torch, zoa, acro, gsp, shroom]) {
    const p = id ? tank.decor.find((x) => x.id === id) : undefined;
    if (p) {
      p.growth = 0.92;
      delete p.recoverUntilHour;
    }
  }
  const t2 = torch ? tank.decor.find((x) => x.id === torch) : undefined;
  if (t2) t2.recoverUntilHour = now + 20;
  // Everything planted counts as healed except the freshest.
  for (const f of g.inventory.frags ?? []) f.frag = { ...f.frag!, plantedHour: now - 30 };
  finishTank(g, tank);
  g.log = [];
  return g;
}

export function fragsMarket(): GameState {
  const g = fragsReef();
  const ids = (g.inventory.frags ?? []).map((f) => f.id);
  if (ids.length) {
    const r = createListing(g, { kind: 'frag', fragIds: ids, reserve: 10, durationHours: 72 });
    if (r.ok && r.listingId) for (let i = 0; i < 8; i++) forceBuyerVisit(g, r.listingId);
  }
  g.log = [];
  return g;
}

export function fragsPlanted(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Mochi', seed: 424243, shopName: 'Green Thumb Aquatics' });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  ensureFacility(g, 'specialty_shop');
  unlockEverything(g);
  g.finance.money = 3_000;
  const tank = addPlacedTank(g, 'g40B', 'freshwater_planted', 'Planted Grow-out');
  stockTank(g, tank.id, [{ species: ['cherry_shrimp'], count: 8 }, { species: ['otocinclus'], count: 3 }]);
  const d = tankDims(tank);
  const L = d.L / 2;
  const W = d.W / 2;
  const wood = placeNear(g, tank, { defId: 'spider_wood', x: -L * 0.35, z: -W * 0.2, scale: 1.3 });
  placeNear(g, tank, { defId: 'seiryu_stone', x: L * 0.3, z: -W * 0.1, scale: 1.4 });
  const rotala = placeNear(g, tank, { defId: 'rotala', x: -L * 0.7, z: -W * 0.55, scale: 1.2 });
  const ludwigia = placeNear(g, tank, { defId: 'ludwigia', x: L * 0.72, z: -W * 0.55, scale: 1.2 });
  const val = placeNear(g, tank, { defId: 'vallisneria', x: L * 0.05, z: -W * 0.7, scale: 1.1 });
  const fern = placeNear(g, tank, { defId: 'java_fern', x: -L * 0.35, z: -W * 0.2, scale: 1.1, onRock: true });
  const anub = placeNear(g, tank, { defId: 'anubias_nana', x: L * 0.3, z: -W * 0.05, scale: 1.1, onRock: true });
  const crypt = placeNear(g, tank, { defId: 'cryptocoryne', x: -L * 0.05, z: 0, scale: 1.2 });
  const mc = placeNear(g, tank, { defId: 'monte_carlo', x: -L * 0.3, z: W * 0.55, scale: 1.8 });
  const hg = placeNear(g, tank, { defId: 'dwarf_hairgrass', x: L * 0.35, z: W * 0.55, scale: 1.8 });
  void wood;
  for (const id of [rotala, ludwigia, val, fern, anub, crypt, mc, hg]) grow(tank, id, 1, 96);
  const cuts = [...cut(g, tank, rotala, 2), ...cut(g, tank, ludwigia, 1), ...cut(g, tank, fern, 1), ...cut(g, tank, mc, 1)];
  // One fresh rotala cutting planted in the foreground next to its parent.
  if (cuts[0]) plantFrag(g, tank.id, cuts[0], { x: -L * 0.55, z: W * 0.2, rotY: 0.6 });
  for (const id of [rotala, ludwigia, fern, mc]) {
    const p = id ? tank.decor.find((x) => x.id === id) : undefined;
    if (p) {
      p.growth = 0.86;
      delete p.recoverUntilHour;
    }
  }
  finishTank(g, tank);
  layoutAll(g);
  g.tankOrder = [tank.id, ...g.tankOrder.filter((id) => id !== tank.id)];
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

export const FRAG_FIXTURES: Record<string, () => GameState> = {
  frags_reef: fragsReef,
  frags_planted: fragsPlanted,
  frags_market: fragsMarket,
};

/** DEV/QA: tank-local → world (for close-up screenshots of racks and plugs via the photo camera). */
export function fragsWorldOf(g: GameState, tankId: string, x: number, y: number, z: number): [number, number, number] {
  const t = g.tanks[tankId];
  if (!t) return [x, y, z];
  const { position, rotY } = tankWorldTransform(t);
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [x * c + z * s + position[0], y + position[1], -x * s + z * c + position[2]];
}

if (typeof window !== 'undefined') {
  // e.g. __AQ.mutate((d) => __AQ_FRAGS.takeFrag(d, tankId, decorId))
  (window as unknown as { __AQ_FRAGS?: unknown }).__AQ_FRAGS = { worldOf: fragsWorldOf, takeFrag, plantFrag };
}
