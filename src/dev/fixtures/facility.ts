/**
 * Facility-lane fixtures: every facility level furnished with tanks, open (with visitors) where it makes sense.
 * Registered in ./index.ts as facility_hobby, facility_shop, facility_store, facility_showroom,
 * facility_destination and facility_grand. OWNER: lane "facility".
 */
import type { GameState, FacilityLevelId, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { initialFacility, findFreeSpot } from '@/sim/facility';
import { ensureLive } from '@/sim/facility/visitors';
import { evalCond } from '@/sim/facility';
import { ACHIEVEMENTS } from '@/data/achievements';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { stockTank, decorateTank, finishTank, type StockEntry } from './core-helpers';
import { tuneVenue } from './qa-tune'; // lane:qa-play
import type { StarterId } from '@/data/species';

interface ExhibitSpec {
  tier: string;
  wc: WaterClass;
  name: string;
  stock: StockEntry[];
  hint?: StarterId;
  signage?: boolean;
}

function base(starter: StarterId, level: FacilityLevelId, seed: number, shopName: string): GameState {
  const g = newGame({ starterId: starter, starterName: starter === 'betta' ? 'Ember' : starter === 'axolotl' ? 'Mochi' : 'Tango', seed, shopName });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  // start from an empty floor at the requested level
  g.tanks = {};
  g.tankOrder = [];
  for (const c of Object.values(g.creatures)) c.tankId = null;
  g.creatures = {};
  g.clutches = {};
  g.facility = initialFacility(level);
  for (const k of Object.keys(UNLOCK_KEYS)) if (!g.progress.unlocked.includes(k)) g.progress.unlocked.push(k);
  g.clock.hour = 24 * 5 + 13.5; // Saturday early afternoon
  g.visitors.today.day = Math.floor(g.clock.hour / 24) + 1;
  g.log = [];
  return g;
}

function build(g: GameState, list: ExhibitSpec[]): void {
  for (const e of list) {
    const p = findFreeSpot(g, e.tier);
    if (!p) continue;
    const t = createTank(g, e.tier, e.wc, { cycled: true, name: e.name, placement: p });
    stockTank(g, t.id, e.stock, e.hint);
    try {
      decorateTank(g, t, e.hint);
    } catch {
      /* aquascape lane mid-edit */
    }
    t.signage = !!e.signage;
    try {
      finishTank(g, t);
    } catch {
      /* derived caches are optional here */
    }
  }
}

/** Mark already-true achievements as earned so loading a fixture doesn't toast a dozen of them. */
function settle(g: GameState): void {
  for (const a of ACHIEVEMENTS) if (!g.progress.achievements.includes(a.id) && evalCond(g, a.cond).met) g.progress.achievements.push(a.id);
}

function open(g: GameState, occupancy: number, reputation: number, admission?: number): GameState {
  g.facility.openToPublic = g.facility.level !== 'hobby_room';
  g.finance.money = Math.max(g.finance.money, 2000 * Math.pow(3, Math.max(0, ['hobby_room', 'specialty_shop', 'aquarium_store', 'showroom', 'destination', 'grand_hall'].indexOf(g.facility.level))));
  g.visitors.totalVisitors = Math.round(Math.pow(reputation, 1.35));
  if (admission !== undefined) g.facility.admission = admission;
  g.progress.reputation = reputation;
  const live = ensureLive(g);
  live.occupancy = occupancy;
  live.arrivalRate = occupancy / 1.2;
  // lane:w2-sim — the people inside arrived today (occupancy never exceeds the day's arrivals)
  g.visitors.today.count = Math.max(g.visitors.today.count, Math.ceil(occupancy));
  live.mix = { family: 0.35, kids: 0.15, student: 0.12, enthusiast: 0.12, photographer: 0.08, tourist: 0.12, conservation: 0.06 };
  tuneVenue(g); // lane:qa-play — flow / light for mixed tanks and a stocked cupboard (no "No food left" at load)
  settle(g);
  g.lastTickRealMs = Date.now();
  return g;
}

const FW = (species: string | string[], count: number, sex?: StockEntry['sex']): StockEntry => ({ species, count, sex });

export function facilityHobby(): GameState {
  const g = base('betta', 'hobby_room', 91001, 'Ember’s Room');
  build(g, [
    { tier: 'g20L', wc: 'freshwater_planted', name: 'Ember’s Tank', stock: [FW('betta', 1, 'male')], hint: 'betta' },
    { tier: 'g10', wc: 'freshwater_planted', name: 'Shrimp Nano', stock: [FW(['cherry_shrimp', 'pea_puffer'], 6)], hint: 'pea_puffer' },
  ]);
  const live = ensureLive(g);
  live.friend = { name: 'Maya', kind: 'friend', tankId: g.tankOrder[0], untilHour: g.clock.hour + 3, party: 2 };
  g.progress.reputation = 30;
  settle(g);
  g.lastTickRealMs = Date.now();
  return g;
}

export function facilityShop(): GameState {
  const g = base('betta', 'specialty_shop', 91002, 'Tidewater Aquatics');
  build(g, [
    { tier: 'g40B', wc: 'freshwater_planted', name: 'Nature Scape', stock: [FW(['neon_tetra', 'betta'], 12), FW(['otocinclus'], 3)], hint: 'betta', signage: true },
    { tier: 'g29', wc: 'marine_live_rock', name: 'Clown Reef', stock: [FW('ocellaris_clownfish', 2)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g20L', wc: 'freshwater_cool', name: 'Axolotl Pond', stock: [FW('axolotl', 2, 'mixed')], hint: 'axolotl' },
    { tier: 'g20L', wc: 'freshwater_planted', name: 'Betta Bower', stock: [FW('betta', 1, 'male')], hint: 'betta' },
    { tier: 'g10', wc: 'freshwater_planted', name: 'Pea Puffer Pod', stock: [FW('pea_puffer', 4, 'mixed')], hint: 'pea_puffer' },
    { tier: 'g29', wc: 'marine_live_rock', name: 'Seahorse Garden', stock: [FW('lined_seahorse', 2, 'pair')], hint: 'lined_seahorse' },
  ]);
  return open(g, 9, 120, 5);
}

export function facilityStore(): GameState {
  const g = base('ocellaris_clownfish', 'aquarium_store', 91003, 'Blue Current Aquariums');
  build(g, [
    { tier: 'g125', wc: 'reef', name: 'Reef Wall', stock: [FW(['green_chromis', 'ocellaris_clownfish'], 8), FW('ocellaris_clownfish', 2)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g75', wc: 'freshwater_planted', name: 'Amazon Stream', stock: [FW(['cardinal_tetra', 'neon_tetra'], 20), FW(['panda_corydoras'], 6)], hint: 'betta' },
    { tier: 'g55', wc: 'freshwater_cool', name: 'Axolotl Lagoon', stock: [FW('axolotl', 3, 'mixed')], hint: 'axolotl' },
    { tier: 'g40B', wc: 'marine_live_rock', name: 'Seahorse Forest', stock: [FW('lined_seahorse', 3, 'mixed')], hint: 'lined_seahorse' },
    { tier: 'g29', wc: 'freshwater_planted', name: 'Betta Row', stock: [FW('betta', 1, 'male')], hint: 'betta' },
    { tier: 'g20L', wc: 'freshwater_planted', name: 'Puffer Jungle', stock: [FW('pea_puffer', 5, 'mixed')], hint: 'pea_puffer' },
    { tier: 'g20L', wc: 'freshwater_planted', name: 'Shrimp Colony', stock: [FW(['cherry_shrimp', 'pea_puffer'], 12)], hint: 'betta' },
  ]);
  return open(g, 22, 240, 7);
}

export function facilityShowroom(): GameState {
  const g = base('lined_seahorse', 'showroom', 91004, 'The Seahorse Gallery');
  build(g, [
    { tier: 'g300', wc: 'reef', name: 'Living Reef', stock: [FW(['green_chromis'], 14), FW('ocellaris_clownfish', 2)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g180', wc: 'freshwater_planted', name: 'Nature Aquarium', stock: [FW(['cardinal_tetra', 'neon_tetra'], 30)], hint: 'betta', signage: true },
    { tier: 'g125', wc: 'marine_live_rock', name: 'Seahorse Meadow', stock: [FW('lined_seahorse', 4, 'mixed')], hint: 'lined_seahorse', signage: true },
    { tier: 'g90', wc: 'freshwater_cool', name: 'Axolotl Grotto', stock: [FW('axolotl', 4, 'mixed')], hint: 'axolotl' },
    { tier: 'g75', wc: 'freshwater_planted', name: 'Puffer Thicket', stock: [FW('pea_puffer', 6, 'mixed')], hint: 'pea_puffer' },
    { tier: 'g55', wc: 'freshwater_planted', name: 'Betta Salon', stock: [FW('betta', 1, 'male')], hint: 'betta' },
    { tier: 'g40B', wc: 'marine_live_rock', name: 'Clown Pair', stock: [FW('ocellaris_clownfish', 2)], hint: 'ocellaris_clownfish' },
    { tier: 'g29', wc: 'freshwater_planted', name: 'Shrimp Garden', stock: [FW(['cherry_shrimp', 'betta'], 10)], hint: 'betta' },
  ]);
  return open(g, 34, 420, 12);
}

export function facilityDestination(): GameState {
  const g = base('ocellaris_clownfish', 'destination', 91005, 'Harbourlight Aquarium');
  build(g, [
    { tier: 'g600', wc: 'reef', name: 'Coral Cathedral', stock: [FW(['green_chromis'], 24), FW('ocellaris_clownfish', 4), FW(['yellow_tang', 'ocellaris_clownfish'], 3)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g500', wc: 'marine_fowlr', name: 'Open Water', stock: [FW(['yellow_tang', 'green_chromis'], 6), FW(['foxface_rabbitfish', 'green_chromis'], 2)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g300', wc: 'freshwater_planted', name: 'River of Light', stock: [FW(['cardinal_tetra', 'neon_tetra'], 40)], hint: 'betta', signage: true },
    { tier: 'g240', wc: 'marine_live_rock', name: 'Seahorse Sanctuary', stock: [FW('lined_seahorse', 6, 'mixed')], hint: 'lined_seahorse', signage: true },
    { tier: 'g180', wc: 'freshwater_cool', name: 'Axolotl Springs', stock: [FW('axolotl', 5, 'mixed')], hint: 'axolotl' },
    { tier: 'g125', wc: 'freshwater_planted', name: 'Puffer Mangrove', stock: [FW('pea_puffer', 8, 'mixed')], hint: 'pea_puffer' },
    { tier: 'g90', wc: 'reef', name: 'Mandarin Reef', stock: [FW(['mandarin_dragonet', 'ocellaris_clownfish'], 1), FW('ocellaris_clownfish', 2)], hint: 'ocellaris_clownfish' },
    { tier: 'g75', wc: 'freshwater_planted', name: 'Betta Pavilion', stock: [FW('betta', 1, 'male')], hint: 'betta' },
    { tier: 'g55', wc: 'freshwater_tropical', name: 'Discus Lounge', stock: [FW(['discus', 'pea_puffer'], 4)], hint: 'pea_puffer' }, // lane:w2-sim: 5 read "nearly full"
    { tier: 'g40B', wc: 'freshwater_planted', name: 'Guppy Line', stock: [FW(['fancy_guppy', 'betta'], 10, 'mixed')], hint: 'betta' },
  ]);
  return open(g, 60, 640, 18);
}

export function facilityGrand(): GameState {
  const g = base('ocellaris_clownfish', 'grand_hall', 91006, 'The Grand Aquarium');
  build(g, [
    { tier: 'g1000', wc: 'reef', name: 'Grand Reef', stock: [FW(['green_chromis'], 30), FW(['banggai_cardinalfish', 'green_chromis'], 10), FW('ocellaris_clownfish', 4), FW(['yellow_tang', 'ocellaris_clownfish'], 3), FW(['royal_gramma', 'green_chromis'], 3), FW(['cleaner_shrimp', 'green_chromis'], 4)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g800', wc: 'marine_fowlr', name: 'Blue Hole', stock: [FW(['yellow_tang', 'green_chromis'], 4), FW(['green_chromis'], 16), FW(['foxface_rabbitfish', 'green_chromis'], 2)], hint: 'ocellaris_clownfish', signage: true },
    { tier: 'g600', wc: 'freshwater_planted', name: 'Amazon Flooded Forest', stock: [FW(['cardinal_tetra', 'neon_tetra'], 50), FW(['panda_corydoras'], 12)], hint: 'betta', signage: true },
    { tier: 'g500', wc: 'marine_live_rock', name: 'Seahorse Kelp Hall', stock: [FW('lined_seahorse', 8, 'mixed'), FW(['banggai_cardinalfish'], 6)], hint: 'lined_seahorse', signage: true },
    { tier: 'g300', wc: 'freshwater_cool', name: 'Axolotl Lake', stock: [FW('axolotl', 6, 'mixed')], hint: 'axolotl', signage: true },
    { tier: 'g240', wc: 'reef', name: 'Mandarin Reef', stock: [FW(['mandarin_dragonet', 'ocellaris_clownfish'], 2), FW(['clown_goby', 'ocellaris_clownfish'], 3)], hint: 'ocellaris_clownfish' },
    { tier: 'g180', wc: 'freshwater_planted', name: 'Nature Aquarium', stock: [FW(['neon_tetra'], 30), FW(['amano_shrimp', 'otocinclus'], 8)], hint: 'betta' },
    { tier: 'g125', wc: 'freshwater_planted', name: 'Puffer Mangrove', stock: [FW('pea_puffer', 8, 'mixed')], hint: 'pea_puffer' },
    { tier: 'g90', wc: 'marine_live_rock', name: 'Clownfish Nursery', stock: [FW('ocellaris_clownfish', 4)], hint: 'ocellaris_clownfish' },
    { tier: 'g75', wc: 'freshwater_planted', name: 'Betta Pavilion', stock: [FW('betta', 1, 'male')], hint: 'betta' },
    { tier: 'g55', wc: 'freshwater_tropical', name: 'Discus Lounge', stock: [FW(['discus', 'pea_puffer'], 4)], hint: 'pea_puffer' }, // lane:w2-sim: 5 read "nearly full"
    { tier: 'g40B', wc: 'freshwater_planted', name: 'Shrimp Colony', stock: [FW(['cherry_shrimp', 'betta'], 20)], hint: 'betta' },
  ]);
  return open(g, 90, 880, 24);
}

export const FACILITY_FIXTURES: Record<string, () => GameState> = {
  facility_hobby: facilityHobby,
  facility_shop: facilityShop,
  facility_store: facilityStore,
  facility_showroom: facilityShowroom,
  facility_destination: facilityDestination,
  facility_grand: facilityGrand,
};
