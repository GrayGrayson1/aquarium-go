/**
 * Brackish estuary fixtures (lane "brackish"). Hand-scaped showcase worlds for the estuary chapter:
 *   brackish_estuary   125 gal "Mangrove Estuary" (archerfish shoal + sailfin mollies under mangrove roots), focused first
 *   brackish_puffer    the same world, focused on the 29 gal figure-eight puffer creek
 *   brackish_gobies    the same world, focused on the 20 gal bumblebee goby shallows
 * Decor and species are guarded (unknown ids are skipped), so the worlds load while pieces are still landing.
 * Showcase worlds: never saved, never earn money. Deterministic (fixed seed).
 */
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { placeDecor, resolveBaseY } from '@/sim/aquascape';
import { getDecorDef } from '@/data/catalog/decor';
import { nextId } from '@/sim/ids';
import { addPlacedTank, ensureFacility, finishTank, stockTank, unlockEverything, type StockEntry } from './core-helpers';
import { layoutAll } from './core-fixtures';

interface DecorSpec {
  defId: string;
  x: number;
  z: number;
  scale?: number;
  rotY?: number;
}

function estuaryGame(): GameState {
  const g = newGame({ starterId: 'pea_puffer', starterName: 'Pip', seed: 606060, shopName: 'Tidewater Aquatics' });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  ensureFacility(g, 'aquarium_store');
  unlockEverything(g);
  g.finance.money = 25_000;
  g.inventory.salt = Math.max(g.inventory.salt ?? 0, 40);
  for (const id of ['flake_tropical', 'micro_pellets', 'sinking_pellets', 'bloodworm_frozen', 'mysis_frozen', 'brine_frozen', 'daphnia_frozen', 'live_snails', 'algae_wafers', 'blanched_veg', 'earthworm', 'baby_brine_live']) {
    g.inventory.foods[id] = 200;
  }
  return g;
}

/** Place decor in a tank; if the aquascape rules refuse a spot (or the item is new), force it in like the behaviour lab. */
function scape(g: GameState, t: Tank, specs: DecorSpec[]): void {
  for (const d of specs) {
    const def = getDecorDef(d.defId);
    if (!def) continue; // not landed yet
    let ok = false;
    try {
      ok = placeDecor(g, t.id, d.defId, { x: d.x, z: d.z, rotY: d.rotY, scale: d.scale }, true).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      const scale = d.scale ?? 1;
      t.decor.push({ id: nextId(g, 'dec'), defId: d.defId, x: d.x, y: resolveBaseY(t, def, d.x, d.z, scale), z: d.z, rotY: d.rotY ?? 0, scale, seed: 7000 + t.decor.length * 131 });
    }
  }
}

function estuaryTank(g: GameState, tierId: string, name: string, sg: number, substrate: Tank['substrate'], decor: DecorSpec[], stock: StockEntry[]): Tank {
  const t = addPlacedTank(g, tierId, 'brackish', name, { x: 1e5 + g.tankOrder.length * 50, z: 1e5, rotY: 0 });
  t.substrate = substrate;
  t.backdrop = 'black';
  t.decor = [];
  scape(g, t, decor);
  stockTank(g, t.id, stock);
  finishTank(g, t);
  t.water.salinitySG = sg;
  t.water.bioMaturity = 1;
  t.water.algae = 6;
  // established showcase planting: grown in (the seedlings' crowns break the surface)
  for (const d of t.decor) if (getDecorDef(d.defId)?.category === 'plant') d.growth = 1;
  return t;
}

function buildWorld(): { g: GameState; estuary: Tank; creek: Tank; shallows: Tank } {
  const g = estuaryGame();
  const sand = { kind: 'sand' as const, depthCm: 4, color: '#cdbd9a' };

  // 125 gal (183 × 46 cm): two mangrove tangles frame an open channel where the archerfish patrol under the surface.
  const estuary = estuaryTank(
    g,
    'g125',
    'Mangrove Estuary',
    1.008,
    sand,
    [
      { defId: 'mangrove_roots', x: -0.52, z: -0.06, scale: 2.0, rotY: 0.35 },
      { defId: 'mangrove_roots', x: 0.5, z: -0.08, scale: 1.9, rotY: -2.6 },
      { defId: 'mangrove_roots', x: -0.08, z: -0.14, scale: 1.3, rotY: 1.4 },
      { defId: 'mangrove_seedling', x: -0.22, z: -0.1, scale: 1.4 },
      { defId: 'mangrove_seedling', x: 0.22, z: -0.11, scale: 1.2, rotY: 1.2 },
      { defId: 'vallisneria', x: -0.8, z: -0.17, scale: 1.4 },
      { defId: 'vallisneria', x: 0.8, z: -0.17, scale: 1.3 },
      { defId: 'vallisneria', x: 0.05, z: -0.19, scale: 1.1 },
      { defId: 'oyster_shells', x: 0.12, z: 0.07, scale: 1.4 },
      { defId: 'oyster_shells', x: -0.66, z: 0.09, scale: 1.1, rotY: 2.4 },
      { defId: 'estuary_pebbles', x: -0.28, z: 0.1, scale: 1.6 },
      { defId: 'estuary_pebbles', x: 0.34, z: 0.1, scale: 1.3, rotY: 2 },
      { defId: 'river_stone', x: -0.36, z: 0.03, scale: 1.8 },
      { defId: 'river_stone', x: 0.7, z: 0.06, scale: 1.4, rotY: 1 },
      { defId: 'java_fern', x: -0.48, z: -0.01, scale: 1.3 },
      { defId: 'anubias_nana', x: 0.46, z: 0.02, scale: 1.2 },
      { defId: 'cryptocoryne', x: 0.62, z: 0.08, scale: 1.2 },
      { defId: 'cryptocoryne', x: -0.72, z: 0.07, scale: 1.1 },
    ],
    [
      { species: ['banded_archerfish'], count: 4, names: ['Arrow', 'Quiver', 'Fletch', 'Nock'] },
      { species: ['sailfin_molly'], count: 6, sex: 'mixed', names: ['Sails', 'Pearl', 'Marsh', 'Dotty', 'Tide', 'Ember'] },
    ],
  );

  // 29 gal (76 × 30 cm, tall): a single figure-eight puffer's creek bank, with snails on the menu.
  const creek = estuaryTank(
    g,
    'g29',
    'Puffer Creek',
    1.006,
    { kind: 'fine_sand', depthCm: 3.5, color: '#d6c7a4' },
    [
      { defId: 'mangrove_roots', x: -0.15, z: -0.04, scale: 1.5, rotY: 0.6 },
      { defId: 'mangrove_roots', x: 0.2, z: -0.08, scale: 0.9, rotY: -2.2 },
      { defId: 'vallisneria', x: -0.31, z: -0.11, scale: 1.2 },
      { defId: 'vallisneria', x: 0.31, z: -0.11, scale: 1.1 },
      { defId: 'cryptocoryne', x: 0.03, z: -0.09, scale: 1.1 },
      { defId: 'mangrove_seedling', x: 0.09, z: -0.06, scale: 1 },
      { defId: 'java_fern', x: -0.13, z: -0.02, scale: 1.1 },
      { defId: 'anubias_nana', x: 0.2, z: -0.05, scale: 1 },
      { defId: 'estuary_pebbles', x: 0.1, z: 0.07, scale: 1.2 },
      { defId: 'river_stone', x: 0.27, z: 0.05, scale: 1.2 },
      { defId: 'oyster_shells', x: -0.27, z: 0.08, scale: 0.9, rotY: 1.1 },
      { defId: 'java_moss', x: -0.2, z: 0.02, scale: 1.1 },
    ],
    [{ species: ['figure_eight_puffer'], count: 1, names: ['Loop'] }],
  );

  // 20 gal long (76 × 30 cm): bumblebee goby shallows, a shell and pebble flat with a cave for every goby.
  const shallows = estuaryTank(
    g,
    'g20L',
    'Bumblebee Shallows',
    1.005,
    { kind: 'fine_sand', depthCm: 3, color: '#dccca8' },
    [
      { defId: 'mangrove_roots', x: -0.17, z: -0.07, scale: 1.1, rotY: 0.4 },
      { defId: 'stone_cave', x: 0.11, z: -0.07, scale: 0.9 },
      { defId: 'oyster_shells', x: 0.02, z: 0.05, scale: 1.2 },
      { defId: 'oyster_shells', x: 0.25, z: 0.03, scale: 1, rotY: 2.2 },
      { defId: 'vallisneria', x: 0.31, z: -0.11, scale: 1 },
      { defId: 'vallisneria', x: -0.33, z: -0.11, scale: 0.9 },
      { defId: 'cryptocoryne', x: 0.21, z: -0.09, scale: 1 },
      { defId: 'estuary_pebbles', x: -0.09, z: 0.08, scale: 1.3 },
      { defId: 'estuary_pebbles', x: 0.3, z: 0.09, scale: 0.9, rotY: 1.5 },
      { defId: 'river_stone', x: 0.31, z: -0.03, scale: 1.1 },
      { defId: 'anubias_nana', x: -0.3, z: 0.05, scale: 1 },
      { defId: 'java_moss', x: -0.16, z: -0.05, scale: 1.1 },
    ],
    [{ species: ['bumblebee_goby'], count: 7, sex: 'mixed' }],
  );
  return { g, estuary, creek, shallows };
}

function finish(g: GameState, first: string): GameState {
  // the URL loader focuses tankOrder[0]; the starter's own tank goes last
  g.tankOrder = [first, ...g.tankOrder.filter((id) => id !== first)];
  layoutAll(g, g.tankOrder);
  g.isShowcase = true;
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

export function brackishEstuary(): GameState {
  const w = buildWorld();
  return finish(w.g, w.estuary.id);
}

export function brackishPuffer(): GameState {
  const w = buildWorld();
  return finish(w.g, w.creek.id);
}

export function brackishGobies(): GameState {
  const w = buildWorld();
  return finish(w.g, w.shallows.id);
}

export const BRACKISH_FIXTURES: Record<string, () => GameState> = {
  brackish_estuary: brackishEstuary,
  brackish_puffer: brackishPuffer,
  brackish_gobies: brackishGobies,
};
