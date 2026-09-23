/**
 * Core fixtures (registered in ./index.ts): perf + QA worlds. OWNER: lane "core".
 *   big_facility   grand hall, 15 stocked tanks incl. a 1,000 gal reef with 60+ fish (focused first)
 *   community_fw   planted freshwater community tank + the betta starter's tank
 *   marine_reef    stocked 75 gal reef + the clownfish starter's tank
 *   stress_school  300 gal freshwater tank with 80 schooling fish
 *   offline_test   a normal save whose last tick was 6 real hours ago (exercises offline catch-up + grace)
 *   core_legacy_v0 a synthetic prototype (v0) save after migration
 * Species are guarded with findSpecies (fallbacks keep fixtures usable before species lanes land).
 * Deterministic: fixed seeds.
 */
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createListing } from '@/sim/economy';
import { listSpecies, type StarterId } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { findFreeSpotIn, type PlacedTank } from '@/sim/facility/layout';
import { migrateSave } from '@/persistence/migrations';
import { makeLegacyV0Save } from '@/persistence/legacy';
import {
  ensureFacility,
  unlockEverything,
  addPlacedTank,
  stockTank,
  decorateTank,
  finishTank,
  findTankSpot,
  placeOrGrow,
  type StockEntry,
} from './core-helpers';
import { tuneVenue } from './qa-tune'; // lane:qa-play

function baseGame(starterId: StarterId, name: string, seed: number, shopName: string): GameState {
  const g = newGame({ starterId, starterName: name, seed, shopName });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  return g;
}

/**
 * Re-place every tank: biggest first (back-centre). Uses the facility lane's layout search (props, doorway and
 * visitor-reachability aware) against the tanks placed so far, growing the floor if needed; falls back to the core
 * grid scan if the facility layout can't find a spot.
 */
export function layoutAll(g: GameState, order?: string[]): void {
  const ids = order ?? [...g.tankOrder].sort((a, b) => getTankTier(g.tanks[b].tierId).gallons - getTankTier(g.tanks[a].tierId).gallons);
  ids.forEach((id, i) => {
    g.tanks[id].placement = { x: 1e5 + i * 50, z: 1e5, rotY: 0 };
  });
  const placed: PlacedTank[] = [];
  for (const id of ids) {
    const t = g.tanks[id];
    let p: { x: number; z: number; rotY: number } | null = null;
    for (let attempt = 0; attempt < 3 && !p; attempt++) {
      try {
        p = findFreeSpotIn(g.facility, placed, t.tierId, id, 150);
      } catch {
        p = null;
        break;
      }
      if (!p) {
        g.facility.width = Math.round(g.facility.width * 1.15 * 10) / 10;
        g.facility.depth = Math.round(g.facility.depth * 1.1 * 10) / 10;
      }
    }
    t.placement = p ?? findTankSpot(g, t.tierId, id, false) ?? placeOrGrow(g, t.tierId, id, false);
    placed.push({ id, tierId: t.tierId, placement: t.placement, name: t.name });
  }
}

function build(g: GameState, tierId: string, waterClass: Tank['waterClass'], name: string, stock: StockEntry[], fallback?: string, hint?: StarterId): Tank {
  const t = addPlacedTank(g, tierId, waterClass, name, { x: 1e5 + g.tankOrder.length * 50, z: 1e5, rotY: 0 });
  stockTank(g, t.id, stock, fallback);
  decorateTank(g, t, hint);
  finishTank(g, t);
  return t;
}

function moveToFront(g: GameState, tankId: string): void {
  g.tankOrder = [tankId, ...g.tankOrder.filter((id) => id !== tankId)];
}

function finish(g: GameState, first?: string): GameState {
  layoutAll(g);
  if (first) moveToFront(g, first);
  tuneVenue(g); // lane:qa-play — flow / light for mixed tanks and a stocked cupboard
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

// ───────────────────────────────── fixtures ─────────────────────────────────

export function bigFacility(): GameState {
  const g = baseGame('ocellaris_clownfish', 'Tango', 777001, 'The Grand Aquarium');
  ensureFacility(g, 'grand_hall');
  unlockEverything(g);
  g.finance.money = 250_000;
  g.progress.reputation = 850;
  g.facility.openToPublic = true;
  g.facility.admission = 14;
  const M = 'ocellaris_clownfish';
  const grand = build(
    g,
    'g1000',
    'reef',
    'Grand Reef',
    [
      { species: ['green_chromis'], count: 36 }, // lane:qa-play: was 30 + 10 banggai (low flow) under tangs (high flow)
      { species: ['firefish'], count: 2, sex: 'pair' },
      { species: ['yellow_tang'], count: 3 },
      { species: ['kole_tang'], count: 2 },
      { species: ['royal_gramma'], count: 3 },
      { species: ['ocellaris_clownfish'], count: 4 },
      { species: ['watchman_goby'], count: 2 },
      { species: ['coral_beauty'], count: 1 },
      { species: ['foxface_rabbitfish'], count: 1 },
      { species: ['cleaner_shrimp'], count: 4 },
      { species: ['peppermint_shrimp'], count: 3 },
      { species: ['trochus_snail'], count: 6 },
      { species: ['hermit_crab'], count: 6 },
    ],
    M,
    'ocellaris_clownfish',
  );
  build(g, 'g500', 'marine_fowlr', 'Open Water', [
    { species: ['yellow_tang'], count: 2 },
    { species: ['foxface_rabbitfish'], count: 2 },
    { species: ['green_chromis'], count: 12 },
    { species: ['kole_tang'], count: 2 },
    { species: ['coral_beauty'], count: 1 },
  ], M);
  build(g, 'g300', 'freshwater_tropical', 'Tetra River', [
    { species: ['cardinal_tetra', 'neon_tetra'], count: 30 },
    { species: ['neon_tetra'], count: 20 },
    { species: ['panda_corydoras'], count: 10 },
    { species: ['kuhli_loach'], count: 6 },
    { species: ['bristlenose_pleco'], count: 2 },
  ], 'pea_puffer');
  build(g, 'g180', 'freshwater_planted', 'Nature Aquarium', [
    { species: ['neon_tetra'], count: 32 }, // lane:qa-play: was 25 + 3 honey gouramis (very gentle flow) beside otos/amanos (moderate)
    { species: ['otocinclus'], count: 6 },
    { species: ['amano_shrimp'], count: 8 },
    { species: ['cherry_shrimp'], count: 20 },
  ], 'betta');
  build(g, 'g125', 'marine_live_rock', 'Seahorse Gallery', [
    { species: ['lined_seahorse'], count: 6, sex: 'pair' },
    { species: ['banggai_cardinalfish'], count: 4 },
    { species: ['cleaner_shrimp'], count: 2 },
    { species: ['trochus_snail'], count: 4 },
  ], undefined, 'lined_seahorse');
  build(g, 'g90', 'reef', 'Mandarin Reef', [
    { species: ['mandarin_dragonet'], count: 1 },
    { species: ['clown_goby'], count: 3 },
    { species: ['firefish'], count: 1 },
    { species: ['ocellaris_clownfish'], count: 2 },
    { species: ['peppermint_shrimp'], count: 2 },
  ], M);
  build(g, 'g55', 'freshwater_cool', 'Axolotl Pond', [{ species: ['axolotl'], count: 3, sex: 'mixed' }], undefined, 'axolotl');
  build(g, 'g55', 'freshwater_cool', 'Goldfish Pavilion', [
    { species: ['fancy_goldfish'], count: 3 }, // lane:w2-sim: cool-water filters run a little slower, 4 read "nearly full"
    { species: ['white_cloud_minnow'], count: 6 }, // lane:qa-play: 10 left the pavilion "nearly full" (Watch)
  ], 'axolotl');
  build(g, 'g75', 'freshwater_tropical', 'Discus Lounge', [{ species: ['discus'], count: 5 }], 'pea_puffer');
  build(g, 'g40B', 'freshwater_planted', 'Guppy Line', [
    { species: ['fancy_guppy'], count: 12, sex: 'mixed' },
    { species: ['endlers_livebearer'], count: 10, sex: 'mixed' },
  ], 'betta');
  build(g, 'g20L', 'freshwater_planted', 'Shrimp Colony', [
    { species: ['cherry_shrimp'], count: 25 },
    { species: ['nerite_snail'], count: 3 },
    { species: ['otocinclus'], count: 3 },
  ]);
  build(g, 'g10', 'freshwater_planted', 'Betta Display', [{ species: ['betta'], count: 1, sex: 'male' }], undefined, 'betta');
  build(g, 'g10', 'freshwater_planted', 'Pea Puffer Pod', [{ species: ['pea_puffer'], count: 4, sex: 'mixed' }], undefined, 'pea_puffer');
  build(g, 'g29', 'freshwater_tropical', 'Frog Grotto', [
    { species: ['african_dwarf_frog'], count: 4 },
    { species: ['kuhli_loach'], count: 6 }, // lane:qa-play: was panda corydoras (moderate flow) with very-gentle-flow frogs
  ], 'pea_puffer');
  // Centrepiece at the back-centre; everything else in rows in front of it.
  const order = [grand.id, ...g.tankOrder.filter((id) => id !== grand.id).sort((a, b) => getTankTier(g.tanks[b].tierId).gallons - getTankTier(g.tanks[a].tierId).gallons)];
  layoutAll(g, order);
  moveToFront(g, grand.id);
  tuneVenue(g); // lane:qa-play — flow / light for mixed tanks, a stocked cupboard: loads with no fixture-made Watches
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

export function communityFw(): GameState {
  const g = baseGame('betta', 'Ember', 777002, 'Riverside Aquatics');
  ensureFacility(g, 'specialty_shop');
  unlockEverything(g);
  g.finance.money = 5_000;
  const t = build(g, 'g40B', 'freshwater_planted', 'Community Tank', [
    { species: ['neon_tetra'], count: 12 },
    { species: ['panda_corydoras'], count: 6 },
    { species: ['honey_gourami'], count: 2, sex: 'females' },
    { species: ['cherry_shrimp'], count: 10 },
    { species: ['otocinclus'], count: 4 },
    { species: ['nerite_snail'], count: 2 },
  ], 'betta', 'betta');
  // A well-run community tank this full carries a second filter (a sponge) — without it the stock sits at ~103% of the
  // filter's capacity and the showcase loads on Watch.
  t.equipment.push({ id: `${t.id}_sponge2`, defId: 'filter_sponge', installedHour: g.clock.hour - 24 * 60, condition: 1, on: true, setting: 1 });
  return finish(g, t.id);
}

export function marineReef(): GameState {
  const g = baseGame('ocellaris_clownfish', 'Coral', 777003, 'Blue Reef Studio');
  ensureFacility(g, 'specialty_shop');
  unlockEverything(g);
  g.finance.money = 8_000;
  const t = build(g, 'g75', 'reef', 'Reef Display', [
    { species: ['ocellaris_clownfish'], count: 2 },
    { species: ['royal_gramma'], count: 1 },
    { species: ['firefish'], count: 1 },
    { species: ['green_chromis'], count: 5 },
    { species: ['clown_goby'], count: 1 },
    { species: ['cleaner_shrimp'], count: 2 },
    { species: ['trochus_snail'], count: 3 },
    { species: ['hermit_crab'], count: 3 },
  ], 'ocellaris_clownfish', 'ocellaris_clownfish');
  return finish(g, t.id);
}

export function stressSchool(): GameState {
  const g = baseGame('pea_puffer', 'Bean', 777004, 'School Stress Test');
  ensureFacility(g, 'showroom');
  unlockEverything(g);
  g.finance.money = 20_000;
  const schooling = listSpecies((s) => s.environment === 'freshwater' && (s.social.kind === 'school' || s.social.kind === 'shoal') && s.waterClasses.includes('freshwater_tropical')).map((s) => s.id);
  const t = build(
    g,
    'g300',
    'freshwater_tropical',
    'School of 80',
    [{ species: ['neon_tetra', 'cardinal_tetra', ...schooling], count: 80 }],
    'pea_puffer',
    'pea_puffer',
  );
  return finish(g, t.id);
}

export function offlineTest(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Sleepy', seed: 777005, shopName: 'Away Shop' });
  unlockEverything(g);
  g.finance.money = 600;
  const tank = g.tanks[g.tankOrder[0]];
  for (const c of Object.values(g.creatures)) c.stats.hunger = 70;
  tank.water.ammonia = 0.3;
  // A second tank with a few animals and (if the market lane is ready) a live listing to attract bids.
  const shrimp = build(g, 'g10', 'freshwater_planted', 'Shrimp Tub', [{ species: ['cherry_shrimp'], count: 6 }], undefined, 'betta');
  const forSale = Object.values(g.creatures).find((c) => c.tankId === shrimp.id);
  if (forSale) {
    try {
      createListing(g, { kind: 'creature', creatureIds: [forSale.id], reserve: 4, durationHours: 72, title: 'Cherry shrimp' });
    } catch {
      /* market lane not ready */
    }
  }
  layoutAll(g);
  g.log = [];
  // Last played 6 real hours ago → far beyond the 12 game-hour offline cap.
  g.lastTickRealMs = Date.now() - 6 * 3600 * 1000;
  g.lastSavedRealMs = g.lastTickRealMs;
  return g;
}

export function legacyV0Migrated(): GameState {
  const { state } = migrateSave(makeLegacyV0Save());
  state.lastTickRealMs = Date.now();
  return state;
}

/** Registered by ./index.ts. */
export const CORE_FIXTURES: Record<string, () => GameState> = {
  big_facility: bigFacility,
  community_fw: communityFw,
  marine_reef: marineReef,
  stress_school: stressSchool,
  offline_test: offlineTest,
  core_legacy_v0: legacyV0Migrated,
};

// lane:perf2 — largestTankId moved to ./showcase.ts (debugHooks needs it in the main bundle); re-exported here.
export { largestTankId } from './showcase';
