/**
 * Behaviour-lane QA fixtures (lane "behavior"). Each focuses a busy tank so creature AI can be watched:
 *   behavior-lab        planted community: schooling tetras, corydoras, shrimp, snails, otos, gouramis, loaches…
 *   behavior-reef       reef: clownfish pair + anemone, cleaner station, gramma, firefish, gobies, chromis, crabs
 *   behavior-crowd      125 gal with ~60 animals (performance)
 *   behavior-oddballs   axolotls, frogs, goldfish, crayfish, hillstream loaches, discus (one tank each; first focused)
 *   behavior-predators  mantis shrimp, dwarf lionfish, grouper, seahorses
 * Species are guarded (stockTank skips unknown ids). Showcase worlds: never saved, never earn money.
 */
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import type { StarterId } from '@/data/species';
import { addPlacedTank, decorateTank, ensureFacility, finishTank, stockTank, unlockEverything, type StockEntry } from './core-helpers';
import { layoutAll } from './core-fixtures';
import { placeDecor, resolveBaseY } from '@/sim/aquascape';
import { getDecorDef } from '@/data/catalog/decor';
import { nextId } from '@/sim/ids';

function labGame(starter: StarterId, seed: number): GameState {
  const g = newGame({ starterId: starter, starterName: 'Lab', seed, shopName: 'Behaviour Lab' });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  ensureFacility(g, 'showroom');
  unlockEverything(g);
  g.finance.money = 50_000;
  for (const id of ['flake_tropical', 'micro_pellets', 'sinking_pellets', 'bloodworm_frozen', 'mysis_frozen', 'brine_frozen', 'live_snails', 'live_copepods', 'algae_wafers', 'earthworm', 'marine_pellets', 'axolotl_pellets', 'goldfish_pellets']) {
    g.inventory.foods[id] = 200;
  }
  return g;
}

function labTank(g: GameState, tierId: string, wc: WaterClass, name: string, stock: StockEntry[], hint?: StarterId, extraDecor: { defId: string; x: number; z: number; scale?: number }[] = []): Tank {
  const t = addPlacedTank(g, tierId, wc, name, { x: 1e5 + g.tankOrder.length * 50, z: 1e5, rotY: 0 });
  decorateTank(g, t, hint);
  for (const d of extraDecor) {
    let ok = false;
    try {
      ok = placeDecor(g, t.id, d.defId, { x: d.x, z: d.z, scale: d.scale }, true).ok;
    } catch {
      ok = false;
    }
    const def = getDecorDef(d.defId);
    if (!ok && def) {
      // lab only: force it in (e.g. a host anemone for the clownfish pair)
      const scale = d.scale ?? 1;
      t.decor.push({ id: nextId(g, 'dec'), defId: d.defId, x: d.x, y: resolveBaseY(t, def, d.x, d.z, scale), z: d.z, rotY: 0, scale, seed: 1234 });
    }
  }
  stockTank(g, t.id, stock);
  finishTank(g, t);
  return t;
}

function finish(g: GameState, first: string): GameState {
  // the lab tank first (the URL loader focuses tankOrder[0]); the starter's own tank goes last
  g.tankOrder = [first, ...g.tankOrder.filter((id) => id !== first)];
  layoutAll(g, g.tankOrder);
  g.isShowcase = true;
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

export function behaviorLab(): GameState {
  const g = labGame('betta', 515001);
  const t = labTank(
    g,
    'g40B',
    'freshwater_planted',
    'Community Lab',
    [
      { species: ['neon_tetra'], count: 12 },
      { species: ['cardinal_tetra'], count: 6 },
      { species: ['panda_corydoras'], count: 6 },
      { species: ['cherry_shrimp'], count: 8 },
      { species: ['amano_shrimp'], count: 2 },
      { species: ['mystery_snail'], count: 2 },
      { species: ['nerite_snail'], count: 2 },
      { species: ['otocinclus'], count: 3 },
      { species: ['honey_gourami'], count: 2, sex: 'pair' },
      { species: ['kuhli_loach'], count: 3 },
      { species: ['fancy_guppy'], count: 4, sex: 'mixed' },
    ],
    'betta',
  );
  return finish(g, t.id);
}

export function behaviorReef(): GameState {
  const g = labGame('ocellaris_clownfish', 515002);
  const t = labTank(
    g,
    'g75',
    'reef',
    'Reef Lab',
    [
      { species: ['ocellaris_clownfish'], count: 2 },
      { species: ['royal_gramma'], count: 1 },
      { species: ['firefish'], count: 1 },
      { species: ['watchman_goby'], count: 1 },
      { species: ['clown_goby'], count: 1 },
      { species: ['green_chromis'], count: 5 },
      { species: ['banggai_cardinalfish'], count: 3 },
      { species: ['cleaner_shrimp'], count: 1 },
      { species: ['peppermint_shrimp'], count: 1 },
      { species: ['hermit_crab'], count: 3 },
      { species: ['trochus_snail'], count: 2 },
      { species: ['coral_beauty'], count: 1 },
      { species: ['mandarin_dragonet'], count: 1 },
    ],
    'ocellaris_clownfish',
    [{ defId: 'bubble_tip_anemone', x: 0.1, z: -0.05 }],
  );
  return finish(g, t.id);
}

export function behaviorCrowd(): GameState {
  const g = labGame('pea_puffer', 515003);
  const t = labTank(
    g,
    'g125',
    'freshwater_planted',
    'Crowd Lab',
    [
      { species: ['neon_tetra'], count: 20 },
      { species: ['cardinal_tetra'], count: 12 },
      { species: ['panda_corydoras'], count: 8 },
      { species: ['cherry_shrimp'], count: 6 },
      { species: ['otocinclus'], count: 3 },
      { species: ['honey_gourami'], count: 2 },
      { species: ['fancy_guppy'], count: 5, sex: 'mixed' },
      { species: ['bristlenose_pleco'], count: 1 },
      { species: ['kuhli_loach'], count: 3 },
    ],
    'betta',
  );
  return finish(g, t.id);
}

export function behaviorOddballs(): GameState {
  const g = labGame('axolotl', 515004);
  const a = labTank(g, 'g40B', 'freshwater_cool', 'Axolotl Lab', [{ species: ['axolotl'], count: 2, sex: 'mixed' }], 'axolotl');
  labTank(g, 'g29', 'freshwater_tropical', 'Frog Lab', [{ species: ['african_dwarf_frog'], count: 3 }, { species: ['panda_corydoras'], count: 4 }], 'pea_puffer');
  labTank(g, 'g55', 'freshwater_cool', 'Goldfish Lab', [{ species: ['fancy_goldfish'], count: 3 }, { species: ['comet_goldfish'], count: 1 }], 'axolotl');
  labTank(g, 'g20L', 'freshwater_tropical', 'Crayfish Lab', [{ species: ['dwarf_crayfish'], count: 2 }, { species: ['hillstream_loach'], count: 2 }], 'pea_puffer');
  labTank(g, 'g55', 'freshwater_tropical', 'Discus Lab', [{ species: ['discus'], count: 4 }], 'pea_puffer');
  return finish(g, a.id);
}

export function behaviorPredators(): GameState {
  const g = labGame('lined_seahorse', 515005);
  const m = labTank(g, 'g40B', 'marine_live_rock', 'Mantis Lab', [{ species: ['peacock_mantis_shrimp'], count: 1 }], 'lined_seahorse');
  labTank(g, 'g75', 'marine_fowlr', 'Predator Lab', [{ species: ['dwarf_lionfish'], count: 1 }, { species: ['miniatus_grouper'], count: 1 }], 'ocellaris_clownfish');
  labTank(g, 'g29', 'marine_live_rock', 'Seahorse Lab', [{ species: ['lined_seahorse'], count: 2, sex: 'pair' }], 'lined_seahorse');
  return finish(g, m.id);
}
