/**
 * The lab's built-in presets (chunk 15, ADR-0051 decision 4): the owner's four groups (Problems, Breeding,
 * Showpieces, Running a business) and an open sandbox. Each is an ordinary recipe, so it's also an example of the
 * format (docs/SCENARIOS.md), and tests/sim/scenario-presets.test.ts holds every one to a legal save with nothing
 * repaired.
 */
import { RECIPE_FORMAT, RECIPE_VERSION, type ScenarioRecipe } from './recipe';

export type PresetGroup = 'Start' | 'Problems' | 'Breeding' | 'Showpieces' | 'Running a business';

export interface Preset {
  id: string;
  group: PresetGroup;
  recipe: ScenarioRecipe;
}

const r = (recipe: Omit<ScenarioRecipe, 'format' | 'version'>): ScenarioRecipe => ({ format: RECIPE_FORMAT, version: RECIPE_VERSION, ...recipe });

export const PRESETS: Preset[] = [
  {
    id: 'sandbox',
    group: 'Start',
    recipe: r({
      name: 'Sandbox',
      notes: 'Everything unlocked, a million dollars and three empty tanks to fill.',
      shop: { money: 1_000_000, facility: 'showroom', reputation: 400 },
      tanks: [
        { name: 'Planted', size: 'g40B', water: 'freshwater_planted' },
        { name: 'Reef', size: 'g75', water: 'reef' },
        { name: 'Cold Water', size: 'g40B', water: 'freshwater_cool' },
      ],
      open: { view: 'facility' },
    }),
  },
  {
    id: 'ammonia-crisis',
    group: 'Problems',
    recipe: r({
      name: 'Ammonia crisis',
      notes: 'A new tank stocked too fast: ammonia and nitrite are up and the filter bacteria have barely started.',
      shop: { money: 2_000 },
      tanks: [
        {
          name: 'Community',
          size: 'g29',
          water: 'freshwater_tropical',
          cycled: false,
          values: { ammonia: 1.6, nitrite: 0.6, nitrate: 5, bioMaturity: 0.12 },
          animals: [
            { species: 'neon_tetra', count: 10, stats: { stress: 45 } },
            { species: 'panda_corydoras', count: 6, stats: { stress: 40 } },
            { species: 'honey_gourami', count: 2, sex: 'pair' },
          ],
        },
      ],
      checks: [
        { name: 'Left alone, the ammonia stays high', afterHours: 6, tank: 'Community', ammonia: { min: 0.5 } },
        { name: 'Left alone, fish start dying within two days', afterHours: 48, tank: 'Community', deaths: { min: 1 } },
      ],
    }),
  },
  {
    id: 'broke-hungry',
    group: 'Problems',
    recipe: r({
      name: 'Broke shop, hungry fish',
      notes: 'In debt, no food left, and every animal is starving.',
      shop: { money: -150, facility: 'specialty_shop', reputation: 120, inventory: { foods: {}, salt: 0, brineShrimpEggs: 0 } },
      tanks: [
        { name: 'Betta Row', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', sex: 'male', name: 'Cinder', stats: { hunger: 88, health: 58 } }] },
        { name: 'Guppy Tank', size: 'g29', water: 'freshwater_tropical', animals: [{ species: 'fancy_guppy', count: 8, sex: 'mixed', stats: { hunger: 85, health: 62 } }] },
      ],
    }),
  },
  {
    id: 'crowded-aggressive',
    group: 'Problems',
    recipe: r({
      name: 'Crowded, aggressive tank',
      notes: 'Far too many fish in a 20 gallon, with two male bettas and a gang of pea puffers.',
      tanks: [
        {
          name: 'Brawl Tank',
          size: 'g20L',
          water: 'freshwater_tropical',
          animals: [
            { species: 'betta', count: 2, sex: 'male', names: ['Brick', 'Blaze'] },
            { species: 'pea_puffer', count: 4, sex: 'mixed' },
            { species: 'neon_tetra', count: 12 },
            { species: 'fancy_guppy', count: 6, sex: 'mixed' },
          ],
        },
      ],
    }),
  },
  {
    id: 'heater-stuck',
    group: 'Problems',
    recipe: r({
      name: 'Heater stuck on',
      notes: 'A heater whose thermostat stuck (the water is already too warm), and a chiller that stopped in the axolotl tank.',
      tanks: [
        {
          name: 'Planted Tetras',
          size: 'g40B',
          water: 'freshwater_planted',
          equipment: [{ id: 'heater', failed: 'stuck_on' }],
          values: { tempC: 30.5 },
          animals: [
            { species: 'cardinal_tetra', count: 12 },
            { species: 'cherry_shrimp', count: 8 },
          ],
        },
        {
          name: 'Axolotl Grotto',
          size: 'g29',
          water: 'freshwater_cool',
          equipment: [{ id: 'chiller', failed: 'off' }],
          values: { tempC: 22 },
          animals: [{ species: 'axolotl', count: 2, sex: 'pair', names: ['Mochi', 'Lotus'] }],
        },
      ],
    }),
  },
  {
    id: 'betta-pair',
    group: 'Breeding',
    recipe: r({
      name: 'Betta pair, ready',
      notes: 'A conditioned pair in courtship: the male builds his bubble nest and they spawn within hours. A nursery and live food are ready.',
      shop: { foodRoom: true },
      tanks: [
        { name: 'Spawning Tank', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', count: 2, sex: 'pair', names: ['Sapphire', 'Pearl'], morph: 'Royal Blue Halfmoon', breed: 'ready' }] },
        { name: 'Nursery', size: 'g20L', water: 'freshwater_planted', purpose: 'nursery' },
      ],
      open: { tank: 'Spawning Tank' },
    }),
  },
  {
    id: 'clownfish-eggs',
    group: 'Breeding',
    recipe: r({
      name: 'Clownfish pair with eggs',
      notes: 'A bonded clownfish pair that has just spawned beside its rock; the male is fanning the eggs.',
      shop: { foodRoom: true },
      tanks: [
        { name: 'Clownfish Pair', size: 'g29', water: 'marine_live_rock', animals: [{ species: 'ocellaris_clownfish', count: 2, names: ['Tango', 'Coral'], breed: 'spawned' }] },
        { name: 'Larvae Tank', size: 'g20L', water: 'marine_live_rock', purpose: 'nursery', decor: 'none' },
      ],
      open: { tank: 'Clownfish Pair' },
    }),
  },
  {
    id: 'fry-tank',
    group: 'Breeding',
    recipe: r({
      name: 'A tank of fry',
      notes: 'Thirty guppy fry in a nursery, and a shrimp colony with shrimplets.',
      tanks: [
        { name: 'Fry Nursery', size: 'g20L', water: 'freshwater_tropical', purpose: 'nursery', young: [{ species: 'fancy_guppy', stage: 'fry', count: 30 }] },
        {
          name: 'Shrimp Colony',
          size: 'g20L',
          water: 'freshwater_planted',
          decor: ['auto', 'java_moss', 'java_moss', 'cholla_wood', 'almond_leaf'],
          animals: [{ species: 'cherry_shrimp', count: 8, sex: 'mixed', morph: 'Fire Red' }],
          young: [{ species: 'cherry_shrimp', stage: 'fry', count: 40 }],
        },
        { name: 'Guppy Parents', size: 'g29', water: 'freshwater_tropical', animals: [{ species: 'fancy_guppy', count: 6, sex: 'mixed' }] },
      ],
      open: { tank: 'Fry Nursery' },
    }),
  },
  {
    id: 'prismatic-reef',
    group: 'Showpieces',
    recipe: r({
      name: 'Reef with a Prismatic clownfish',
      notes: 'A 75 gallon reef; one of the clownfish is Prismatic.',
      shop: { facility: 'specialty_shop' },
      tanks: [
        {
          name: 'Prism Reef',
          size: 'g75',
          water: 'reef',
          animals: [
            { species: 'ocellaris_clownfish', count: 2, names: ['Opal', 'Nemo'], prismatic: 1 },
            { species: 'royal_gramma' },
            { species: 'firefish', count: 2 },
            { species: 'cleaner_shrimp' },
            { species: 'trochus_snail', count: 3 },
          ],
        },
      ],
    }),
  },
  {
    id: 'grand-hall',
    group: 'Showpieces',
    recipe: r({
      name: 'Late-game grand hall',
      notes: 'The biggest room, eight big exhibits, staff and a high reputation.',
      shop: { facility: 'grand_hall', money: 400_000, reputation: 850, day: 120, hour: 11 },
      tanks: [
        { name: 'Great Reef', size: 'g500', water: 'reef', ageDays: 200, animals: [{ species: 'yellow_tang' }, { species: 'ocellaris_clownfish', count: 2 }, { species: 'green_chromis', count: 10 }, { species: 'cleaner_shrimp', count: 3 }, { species: 'mandarin_dragonet' }] },
        { name: 'Grouper', size: 'g300', water: 'marine_fowlr', animals: [{ species: 'miniatus_grouper', name: 'Admiral' }] },
        { name: 'Amazon', size: 'g240', water: 'freshwater_planted', ageDays: 120, animals: [{ species: 'discus', count: 6 }, { species: 'cardinal_tetra', count: 30 }] },
        { name: 'Goldfish Pond', size: 'g180', water: 'freshwater_cool', animals: [{ species: 'comet_goldfish', count: 4 }] },
        { name: 'Seahorse Gallery', size: 'g90', water: 'marine_live_rock', animals: [{ species: 'lined_seahorse', count: 4, sex: 'mixed' }] },
        { name: 'Mangrove', size: 'g180', water: 'brackish', animals: [{ species: 'banded_archerfish', count: 3 }, { species: 'sailfin_molly', count: 6, sex: 'mixed' }] },
        { name: 'Axolotl Grotto', size: 'g75', water: 'freshwater_cool', animals: [{ species: 'axolotl', count: 3, morph: 'Leucistic' }] },
        { name: 'Shrimp Wall', size: 'g40B', water: 'freshwater_planted', decor: ['auto', 'java_moss', 'java_moss', 'cholla_wood', 'anubias_nana', 'java_fern', 'almond_leaf', 'cryptocoryne'], animals: [{ species: 'cherry_shrimp', count: 20, morph: 'Blue Dream High Grade' }, { species: 'otocinclus', count: 6 }] },
      ],
      staff: [
        { role: 'aquarist', skill: 5, trait: 'reef_minded' },
        { role: 'aquarist', skill: 4, trait: 'meticulous' },
        { role: 'aquarist', skill: 4, trait: 'algae_hunter' },
        { role: 'stock_manager', skill: 4, trait: 'planner' },
        { role: 'docent', skill: 5, trait: 'storyteller' },
      ],
      stockBudget: 600,
      open: { view: 'facility' },
    }),
  },
  {
    id: 'staffed-store',
    group: 'Running a business',
    recipe: r({
      name: 'Staffed store',
      notes: 'An aquarium store open to the public, with two aquarists, a stock manager and a docent.',
      shop: { facility: 'aquarium_store', money: 25_000, reputation: 300, day: 20 },
      tanks: [
        { name: 'Community', size: 'g55', water: 'freshwater_tropical', animals: [{ species: 'neon_tetra', count: 14 }, { species: 'panda_corydoras', count: 6 }, { species: 'bristlenose_pleco' }] },
        { name: 'Planted Show', size: 'g75', water: 'freshwater_planted', decor: ['auto', 'java_fern', 'anubias_nana', 'spider_wood', 'cryptocoryne'], animals: [{ species: 'cardinal_tetra', count: 20 }, { species: 'amano_shrimp', count: 6 }, { species: 'otocinclus', count: 6 }] },
        { name: 'Reef', size: 'g90', water: 'reef', animals: [{ species: 'ocellaris_clownfish', count: 2 }, { species: 'green_chromis', count: 5 }, { species: 'clown_goby', count: 2 }] },
        { name: 'Goldfish', size: 'g75', water: 'freshwater_cool', animals: [{ species: 'fancy_goldfish', count: 3 }] },
        { name: 'Bettas', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', sex: 'male', morph: 'Red Halfmoon' }] },
        { name: 'Livebearers', size: 'g40B', water: 'freshwater_tropical', animals: [{ species: 'fancy_guppy', count: 10, sex: 'mixed' }, { species: 'endlers_livebearer', count: 8, sex: 'mixed' }] },
      ],
      staff: [
        { role: 'aquarist', skill: 3 },
        { role: 'aquarist', skill: 2, trait: 'early_bird' },
        { role: 'stock_manager', skill: 3, trait: 'thrifty' },
        { role: 'docent', skill: 3, trait: 'great_with_kids' },
      ],
      stockBudget: 200,
      open: { view: 'facility' },
    }),
  },
  {
    id: 'show-day',
    group: 'Running a business',
    recipe: r({
      name: 'Show day',
      notes: 'A halfmoon betta and a leucistic axolotl are entered in today’s club shows; judging starts in an hour.',
      shop: { facility: 'specialty_shop', reputation: 150 },
      tanks: [
        { name: 'Show Betta', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', sex: 'male', name: 'Sapphire', morph: 'Royal Blue Halfmoon', potentials: { color: 92, pattern: 88, structure: 90 }, stats: { health: 100, stress: 8, hunger: 20 } }] },
        { name: 'Axolotl Show Tank', size: 'g29', water: 'freshwater_cool', animals: [{ species: 'axolotl', sex: 'female', name: 'Mochi', morph: 'Leucistic', stats: { health: 100, stress: 8, hunger: 20 } }] },
      ],
      shows: { entries: [{ animal: 'Sapphire' }, { animal: 'Mochi' }], showDay: true },
      open: { tank: 'Show Betta' },
    }),
  },
  {
    id: 'market-bids',
    group: 'Running a business',
    recipe: r({
      name: 'Market with bids',
      notes: 'Animals listed for sale with buyers’ bids waiting, and a Prismatic betta in the shop.',
      shop: { facility: 'specialty_shop', reputation: 200 },
      tanks: [
        { name: 'Betta Row', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', sex: 'male', name: 'Ember', morph: 'Turquoise Halfmoon' }] },
        { name: 'Axolotl Tank', size: 'g40B', water: 'freshwater_cool', animals: [{ species: 'axolotl', count: 2, sex: 'pair', names: ['Pip', 'Nimbus'], morph: 'Golden Albino' }] },
        { name: 'Guppies', size: 'g29', water: 'freshwater_tropical', animals: [{ species: 'fancy_guppy', count: 6, sex: 'mixed', names: ['Dot', 'Dash', 'Fizz', 'Pop', 'Zip', 'Bop'] }] },
      ],
      market: {
        offers: [{ species: 'betta', prismatic: true }, { species: 'neon_tetra', count: 8 }],
        listings: [
          { animals: ['Ember'], bids: 3 },
          { animals: ['Pip', 'Nimbus'], bids: [200, 240] },
          { animals: ['Dot', 'Dash', 'Fizz'], bids: 1 },
        ],
      },
    }),
  },
];

const BY_ID = new Map(PRESETS.map((p) => [p.id, p] as const));

/** A built-in preset by id (or by its recipe's name, case ignored). */
export function presetById(id: string): Preset | undefined {
  return BY_ID.get(id) ?? PRESETS.find((p) => p.recipe.name.toLowerCase() === id.trim().toLowerCase());
}
