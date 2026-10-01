/**
 * New game creation + starter definitions. OWNER: core.
 */
import type { GameState, WaterClass, Creature, Sex } from '@/types';
import { SCHEMA_VERSION } from '@/persistence/schema';
import { simRng, mulberry32 } from './rng';
import { createTank } from './tanks';
import { createCreature, addCreature } from './life';
import { initMarket } from './economy';
import { initialFacility, initProgress, findFreeSpot, settleStartingProgress } from './facility';
import { starterAquascape } from './aquascape';
import { tuneEquipmentForSpecies } from './care';
import { emitEvent } from './context';
import { refreshTankCache } from './world';
import { getSpecies, STARTER_IDS, type StarterId } from '@/data/species';

export interface StarterSetup {
  tierId: string;
  waterClass: WaterClass;
  money: number;
  foods: Record<string, number>;
  saltKg: number;
  sex: Sex;
  ageDays: number;
  /** Suggested default names offered on the naming screen. */
  nameIdeas: string[];
  /** Short line shown in the starter reveal: what this path teaches. */
  teaches: string;
  /** Operating-cost/difficulty hint for the reveal card. */
  pathNote: string;
}

export const STARTER_SETUPS: Record<StarterId, StarterSetup> = {
  axolotl: {
    tierId: 'g20L',
    waterClass: 'freshwater_cool',
    money: 350,
    foods: { earthworm: 12, axolotl_pellets: 24 },
    saltKg: 0,
    sex: 'female',
    ageDays: 22,
    nameIdeas: ['Mochi', 'Pip', 'Axel', 'Lotus', 'Nimbus'],
    teaches: 'Cool-water care, gentle flow and colour-morph genetics',
    pathNote: 'Cool freshwater · breeding & morphs',
  },
  betta: {
    tierId: 'g10',
    waterClass: 'freshwater_planted',
    money: 300,
    foods: { micro_pellets: 30, bloodworm_frozen: 10 },
    saltKg: 0,
    sex: 'male',
    ageDays: 18,
    nameIdeas: ['Ember', 'Cobalt', 'Koi', 'Rogue', 'Velvet'], // a male starter: no feminine-reading names (names.ts)
    teaches: 'Warm planted tanks, territorial behaviour and show-fish lines',
    pathNote: 'Tropical planted · display & bubble nests',
  },
  pea_puffer: {
    tierId: 'g10',
    waterClass: 'freshwater_planted',
    money: 300,
    foods: { bloodworm_frozen: 16, live_snails: 12 },
    saltKg: 0,
    sex: 'male',
    ageDays: 12,
    nameIdeas: ['Pea', 'Bean', 'Wasabi', 'Pickle', 'Biscuit'],
    teaches: 'Predator feeding, enrichment and territorial layouts',
    pathNote: 'Planted freshwater · hunter & enrichment',
  },
  ocellaris_clownfish: {
    tierId: 'g29',
    waterClass: 'marine_live_rock',
    money: 450,
    foods: { marine_pellets: 30, mysis_frozen: 12 },
    saltKg: 10,
    sex: 'male',
    ageDays: 14,
    nameIdeas: ['Tango', 'Reef', 'Sunny', 'Mango', 'Biscuit'], // protandrous: neutral names only (names.ts)
    teaches: 'Salinity, live rock, reef-safe choices and social hierarchy',
    pathNote: 'Marine · reef path & pairing',
  },
  lined_seahorse: {
    tierId: 'g29',
    waterClass: 'marine_live_rock',
    money: 500,
    foods: { mysis_frozen: 40, live_copepods: 6 },
    saltKg: 10,
    sex: 'male',
    ageDays: 22,
    nameIdeas: ['Ripple', 'Drift', 'Hitch', 'Atlas', 'Nereus'], // a male starter: no feminine-reading names (names.ts)
    teaches: 'Slow feeding, gentle flow, peaceful tank mates and male pregnancy',
    pathNote: 'Marine · advanced & magical',
  },
};

function emptyState(seed: number, starterId: string): GameState {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    saveId: `save_${seed.toString(36)}_${now.toString(36)}`,
    seed,
    rngState: seed,
    idCounter: 0,
    createdRealMs: now,
    lastSavedRealMs: now,
    lastTickRealMs: now,
    clock: { hour: 8, speed: 1 }, // start at 8 AM on day 1
    starterId,
    shopName: 'My Aquarium',
    tanks: {},
    tankOrder: [],
    creatures: {},
    clutches: {},
    inventory: { foods: {}, salt: 0, equipment: [], decor: [] },
    facility: initialFacility('hobby_room'),
    market: { stock: [], listings: [], buyers: [], demand: {}, lastRefreshHour: -999, history: [] },
    finance: { money: 0, ledger: [], daily: [] },
    progress: {
      reputation: 0,
      mastery: { husbandry: 0, breeding: 0, aquascaping: 0, marine: 0, business: 0, exhibition: 0 },
      unlocked: [],
      research: { progressHours: 0, completed: [] },
      achievements: [],
      quests: [],
      tutorial: { starterId, step: 0, done: false, skipped: false, flags: {} },
      counters: {},
      discoveredSpecies: [],
      discoveredMorphs: [],
    },
    visitors: {
      today: { day: 1, count: 0, revenue: 0, tips: 0, satisfactionSum: 0 },
      history: [],
      reactions: [],
      exhibit: {},
      totalVisitors: 0,
    },
    log: [],
  };
}

/**
 * Roll the five candidate starter individuals shown on the reveal screen.
 * Deterministic for a given seed; the chosen one is adopted as-is by newGame.
 */
export function previewStarters(seed: number): Record<StarterId, Creature> {
  const tmp = emptyState(seed, 'axolotl');
  const rng = simRng(tmp);
  const out = {} as Record<StarterId, Creature>;
  for (const id of STARTER_IDS) {
    const setup = STARTER_SETUPS[id];
    out[id] = createCreature(tmp, rng, id, { sex: setup.sex, ageDays: setup.ageDays, isStarter: true, captiveBred: true, potentialsBias: 0.25, name: setup.nameIdeas[0] });
  }
  return out;
}

export interface NewGameOptions {
  starterId: StarterId;
  starterName: string;
  shopName?: string;
  seed?: number;
  /** Candidate rolled by previewStarters (same seed) — adopted so the player gets the individual they saw. */
  starterCreature?: Creature;
}

/** Starting hunger of the starter creature (0 = full, 100 = starving; "Well fed" is below 20). */
export const STARTER_START_HUNGER = 8;

export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

export function newGame(opts: NewGameOptions): GameState {
  const seed = opts.seed ?? randomSeed();
  const state = emptyState(seed, opts.starterId);
  if (opts.shopName) state.shopName = opts.shopName;
  const setup = STARTER_SETUPS[opts.starterId];
  const species = getSpecies(opts.starterId);
  // advance the RNG past the preview rolls so previews and the world stay independent but deterministic
  state.rngState = mulberry32(seed ^ 0x9e3779b9).state();
  const rng = simRng(state);

  state.finance.money = setup.money;
  state.inventory.foods = { ...setup.foods };
  state.inventory.salt = setup.saltKg;

  const placement = findFreeSpot(state, setup.tierId) ?? { x: 0, z: -1.4, rotY: 0 };
  const name = opts.starterName.trim() || setup.nameIdeas[0];
  const tank = createTank(state, setup.tierId, setup.waterClass, { cycled: true, name: `${name}’s Tank`, placement });
  tank.decor = starterAquascape(state, opts.starterId, tank);
  tuneEquipmentForSpecies(state, tank.id, opts.starterId);

  let creature: Creature;
  if (opts.starterCreature) {
    creature = { ...opts.starterCreature, id: '' };
    creature.id = `cr_starter_${seed.toString(36)}`;
    creature.bornHour = state.clock.hour - setup.ageDays * 24;
    creature.acquiredHour = state.clock.hour;
  } else {
    creature = createCreature(state, rng, opts.starterId, { sex: setup.sex, ageDays: setup.ageDays, isStarter: true, captiveBred: true, potentialsBias: 0.25 });
  }
  creature.name = name;
  creature.isStarter = true;
  creature.favorite = true;
  // The starter arrives fed and settled (the shop fed it this morning): "Well fed", not already "Hungry". Together with
  // the life lane's early-game grace (STARTER_GRACE_MAX_HUNGER) the tutorial can never produce a starving pet.
  creature.stats = { ...creature.stats, hunger: STARTER_START_HUNGER };
  creature.history = [{ hour: state.clock.hour, kind: 'acquired', text: `Arrived as your very first ${species.commonName.toLowerCase()}.` }];
  addCreature(state, creature, tank.id);

  state.progress.discoveredSpecies.push(opts.starterId);
  state.progress.discoveredMorphs.push(`${opts.starterId}:${creature.morphName}`);

  initProgress(state, opts.starterId);
  initMarket(state);
  refreshTankCache(state, tank);
  // What the starting setup already satisfies (e.g. "Into the Blue" for marine starters) is recorded silently.
  settleStartingProgress(state);

  emitEvent(state, { kind: 'celebrate', text: `Welcome home, ${name}! Your ${species.commonName.toLowerCase()} tank is established and ready.`, tankId: tank.id, creatureId: creature.id, toast: true });
  return state;
}
