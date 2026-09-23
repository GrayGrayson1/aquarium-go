/**
 * Staff-lane fixtures and builders (also used by tests/sim/staff-*.test.ts). OWNER: lane "staff".
 *
 *   staff_store     aquarium store, 7 stocked tanks (fresh, cool, marine, seahorses), a keeper team, a stock manager
 *                   and a docent — open, mid-afternoon
 *   staff_shop      a specialty shop that has just unlocked staff: candidate pool, nobody hired yet (hiring-flow QA)
 *   staff_fast      (lane:staff2) a store of fast-metabolism fish (discus, chromis, guppies, tetras, seahorses) and two
 *                   keepers, early evening: the 9 PM snack round is next
 *   big_facility    (core fixture) is staffed + stocked through `staffUpLateGame` so the grand hall doesn't show
 *                   "No food left" alerts.
 * Deterministic: fixed seeds, fixed names.
 */
import type { GameState, StaffRole, StaffTrait, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { ensureFacility, unlockEverything, addPlacedTank, stockTank, decorateTank, finishTank, type StockEntry } from './core-helpers';
import { layoutAll } from './core-fixtures';
import { ensureLive } from '@/sim/facility/visitors';
import { addStaffDirect, autoAssignAll, ensureStaff, refreshCandidates, setStockBudget } from '@/sim/staff';
import { initialFacility, evalCond } from '@/sim/facility';
import { ACHIEVEMENTS } from '@/data/achievements';
import { tuneEquipmentForSpecies } from '@/sim/care';
import { advanceWorld } from '@/sim/world';
import { getFacilityLevel } from '@/data/facilities';
import { STOCK_BUDGET } from '@/data/staff';

interface Spec {
  tier: string;
  wc: WaterClass;
  name: string;
  stock: StockEntry[];
  signage?: boolean;
}

/** The mixed store floor used by the staff tests: something for every kind of keeper care. */
export const STAFF_STORE_TANKS: Spec[] = [
  { tier: 'g75', wc: 'freshwater_planted', name: 'Amazon Stream', stock: [{ species: ['cardinal_tetra', 'neon_tetra'], count: 16 }, { species: ['panda_corydoras'], count: 6 }], signage: true },
  { tier: 'g55', wc: 'freshwater_cool', name: 'Axolotl Lagoon', stock: [{ species: 'axolotl', count: 3, sex: 'mixed' }], signage: true },
  { tier: 'g40B', wc: 'marine_live_rock', name: 'Seahorse Forest', stock: [{ species: 'lined_seahorse', count: 2, sex: 'pair' }, { species: ['cleaner_shrimp'], count: 1 }, { species: ['trochus_snail'], count: 3 }] },
  { tier: 'g29', wc: 'marine_live_rock', name: 'Clown Reef', stock: [{ species: 'ocellaris_clownfish', count: 2 }, { species: ['cleaner_shrimp'], count: 1 }], signage: true },
  { tier: 'g29', wc: 'freshwater_planted', name: 'Betta Row', stock: [{ species: 'betta', count: 1, sex: 'male' }, { species: ['nerite_snail'], count: 2 }] },
  { tier: 'g20L', wc: 'freshwater_planted', name: 'Shrimp Colony', stock: [{ species: ['cherry_shrimp'], count: 15 }, { species: ['nerite_snail'], count: 2 }] },
  { tier: 'g10', wc: 'freshwater_planted', name: 'Pea Puffer Pod', stock: [{ species: 'pea_puffer', count: 4, sex: 'mixed' }] },
];

/** Food and salt for a venue: a few days of each staple the residents eat. */
export function stockCupboard(g: GameState, servingsEach = 60, saltKg = 20): void {
  const foods = ['flake_tropical', 'micro_pellets', 'sinking_pellets', 'axolotl_pellets', 'bloodworm_frozen', 'brine_frozen', 'mysis_frozen', 'marine_pellets', 'algae_wafers'];
  for (const id of foods) g.inventory.foods[id] = Math.max(g.inventory.foods[id] ?? 0, servingsEach);
  g.inventory.salt = Math.max(g.inventory.salt ?? 0, saltKg);
}

/**
 * lane:staff2 — a floor of fast-metabolism fish (tests/sim/staff2-feeding.test.ts): discus, a chromis + firefish reef
 * (slow feeders sharing every food with fast ones), guppies and Endler's, a tetra school over corydoras, seahorses
 * tong-fed beside faster cardinalfish, and a betta as the twice-a-day control.
 */
export const FAST_FEEDER_TANKS: Spec[] = [
  { tier: 'g75', wc: 'freshwater_tropical', name: 'Discus Lounge', stock: [{ species: 'discus', count: 4 }], signage: true },
  { tier: 'g90', wc: 'marine_live_rock', name: 'Chromis Reef', stock: [{ species: ['green_chromis'], count: 12 }, { species: ['firefish'], count: 2, sex: 'pair' }, { species: ['cleaner_shrimp'], count: 1 }] },
  { tier: 'g40B', wc: 'freshwater_planted', name: 'Guppy Line', stock: [{ species: ['fancy_guppy'], count: 8, sex: 'mixed' }, { species: ['endlers_livebearer'], count: 6, sex: 'mixed' }] },
  { tier: 'g55', wc: 'freshwater_planted', name: 'Tetra School', stock: [{ species: ['neon_tetra'], count: 16 }, { species: ['panda_corydoras'], count: 4 }] },
  { tier: 'g55', wc: 'marine_live_rock', name: 'Seahorse Gallery', stock: [{ species: 'lined_seahorse', count: 4, sex: 'pair' }, { species: ['banggai_cardinalfish'], count: 2 }] },
  { tier: 'g10', wc: 'freshwater_planted', name: 'Betta Nook', stock: [{ species: 'betta', count: 1, sex: 'male' }] },
];

/** A store-level venue with the staff test tanks (no staff yet). `tanks` (lane:staff2): another floor plan. */
export function staffStoreWorld(seed = 515151, tanks: Spec[] = STAFF_STORE_TANKS): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed, shopName: 'Tidewater Aquatics' });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  g.tanks = {};
  g.tankOrder = [];
  g.creatures = {};
  g.clutches = {};
  g.facility = initialFacility('aquarium_store');
  ensureFacility(g, 'aquarium_store');
  unlockEverything(g);
  g.clock.hour = 24 * 3 + 7; // day 4, 7 AM
  g.visitors.today.day = Math.floor(g.clock.hour / 24) + 1;
  for (const s of tanks) {
    const t = addPlacedTank(g, s.tier, s.wc, s.name, { x: 1e5 + g.tankOrder.length * 50, z: 1e5, rotY: 0 });
    // Set up for the lead species first (heater, flow, light), the way a player's new-tank wizard does.
    const lead = s.stock[0].species;
    tuneEquipmentForSpecies(g, t.id, Array.isArray(lead) ? lead[0] : lead);
    stockTank(g, t.id, s.stock);
    try {
      decorateTank(g, t);
    } catch {
      /* decor optional */
    }
    t.signage = !!s.signage;
    finishTank(g, t);
  }
  layoutAll(g);
  g.finance.money = 20_000;
  g.progress.reputation = 240;
  g.facility.openToPublic = true;
  g.facility.admission = 8;
  g.inventory.foods = {};
  stockCupboard(g);
  // Achievements the setup already satisfies are recorded quietly (no toast storm on load).
  for (const a of ACHIEVEMENTS) if (!g.progress.achievements.includes(a.id) && evalCond(g, a.cond).met) g.progress.achievements.push(a.id);
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

const TEAM: { name: string; role: StaffRole; skill: number; trait: StaffTrait }[] = [
  { name: 'Maya Okafor', role: 'aquarist', skill: 3, trait: 'meticulous' },
  { name: 'Theo Lindqvist', role: 'aquarist', skill: 2, trait: 'gentle_hands' },
  { name: 'Priya Rahman', role: 'stock_manager', skill: 3, trait: 'planner' },
  { name: 'Jonah Mensah', role: 'docent', skill: 3, trait: 'great_with_kids' },
];

/** Put a fixed team on the roster (deterministic names) and share the tanks out. */
export function hireTeam(g: GameState, team = TEAM): void {
  // Everyone joins first, then the tanks are shared out evenly by room left (not first come, first served).
  for (const t of team) addStaffDirect(g, { ...t, tankIds: [] });
  autoAssignAll(g);
}

export function staffStore(): GameState {
  const g = staffStoreWorld();
  hireTeam(g);
  // Play the morning for real (7 AM → ~2:10 PM): keeper rounds, a stock check, the first talks, the visitor crowd.
  advanceWorld(g, 7.2);
  refreshCandidates(g);
  const live = ensureLive(g);
  live.mix = Object.keys(live.mix).length ? live.mix : { family: 0.35, kids: 0.15, student: 0.12, enthusiast: 0.12, photographer: 0.08, tourist: 0.12, conservation: 0.06 };
  g.log = []; // a fresh inbox on load (the morning's staff work is in their "today" records)
  g.lastTickRealMs = Date.now();
  return g;
}

/** A specialty shop right after staff unlock: a candidate pool and nobody hired (hiring-flow QA). */
export function staffShop(): GameState {
  const g = staffStoreWorld(616161);
  g.facility = initialFacility('specialty_shop');
  ensureFacility(g, 'specialty_shop');
  // Keep the first four tanks (the shop floor is smaller).
  for (const id of g.tankOrder.slice(4)) {
    for (const c of Object.values(g.creatures)) if (c.tankId === id) delete g.creatures[c.id];
    delete g.tanks[id];
  }
  g.tankOrder = g.tankOrder.slice(0, 4);
  layoutAll(g);
  g.finance.money = 2_400;
  g.progress.reputation = 110;
  const st = ensureStaff(g);
  st.stockBudget = STOCK_BUDGET.specialty_shop.default;
  refreshCandidates(g);
  g.clock.hour = 24 * 3 + 10.5;
  return g;
}

/**
 * Late game: the core big_facility grand hall gets a stocked cupboard and a full team (aquarists for every tank, a
 * stock manager with a grand-hall budget and docents), so its HUD no longer shows "No food left" alerts.
 */
export function staffUpLateGame(g: GameState): GameState {
  stockCupboard(g, 240, 80);
  const lvl = getFacilityLevel(g.facility.level);
  const team: { name: string; role: StaffRole; skill: number; trait: StaffTrait }[] = [
    { name: 'Maya Okafor', role: 'aquarist', skill: 4, trait: 'meticulous' },
    { name: 'Kofi Brennan', role: 'aquarist', skill: 4, trait: 'reef_minded' },
    { name: 'Keiko Duarte', role: 'aquarist', skill: 3, trait: 'algae_hunter' },
    { name: 'Luis Nakamura', role: 'aquarist', skill: 3, trait: 'gentle_hands' },
    { name: 'Priya Rahman', role: 'stock_manager', skill: 4, trait: 'planner' },
    { name: 'Amara Castillo', role: 'docent', skill: 4, trait: 'storyteller' },
    { name: 'Jonah Mensah', role: 'docent', skill: 3, trait: 'great_with_kids' },
  ];
  hireTeam(g, team);
  setStockBudget(g, STOCK_BUDGET[lvl.id]?.default ?? 400);
  refreshCandidates(g);
  // lane:qa-final — like staffStoreWorld: achievements the late-game setup already satisfies are recorded quietly, so
  // big_facility / shows-hall load without a "12 new achievements" toast in every QA shot.
  for (const a of ACHIEVEMENTS) if (!g.progress.achievements.includes(a.id) && evalCond(g, a.cond).met) g.progress.achievements.push(a.id);
  return g;
}

/** lane:staff2 — the fast-feeder floor with two keepers and a stock manager, played to early evening (7:30 PM). */
export function staffFast(): GameState {
  const g = staffStoreWorld(11, FAST_FEEDER_TANKS);
  hireTeam(g, [
    { name: 'Ines Park', role: 'aquarist', skill: 2, trait: 'gentle_hands' },
    { name: 'Kai Osei', role: 'aquarist', skill: 3, trait: 'algae_hunter' },
    { name: 'Priya Rahman', role: 'stock_manager', skill: 3, trait: 'planner' },
  ]);
  advanceWorld(g, 12.5); // 7 AM → 7:30 PM: morning, midday and evening rounds done
  refreshCandidates(g);
  ensureLive(g);
  g.log = [];
  g.lastTickRealMs = Date.now();
  return g;
}

export const STAFF_FIXTURES: Record<string, () => GameState> = {
  staff_store: staffStore,
  staff_shop: staffShop,
  staff_fast: staffFast, // lane:staff2
};
