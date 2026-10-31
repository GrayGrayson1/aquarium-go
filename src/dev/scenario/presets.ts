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
    // chunk 16 (ADR-0052 decision 6): a friend's 210-gallon reef, in the 180 (the closest size, on the same 72 × 24 in
    // footprint), with its real stock: the stand-in version is docs/agent/design/CHUNK-16/friends-reef-standins.json
    id: 'friends-reef',
    group: 'Showpieces',
    recipe: r({
      name: "A friend's reef",
      notes: 'A 210-gallon reef (built in the 180, the same footprint): a long live-rock ridge with an arch, aragonite sand, red macroalgae along the front, a bubble-tip anemone and deep actinic light. The five anthias are all female; the group turns one into its male within a few days. The emperor will outgrow it: the sources want 220 gallons for an adult, and the lab warns so.',
      seed: 210,
      base: 'blank',
      // marine pellets for the autofeeder, four small meals a day for the anthias (the friend's own food; since B-211
      // the hopper would also pass over the snails' sinking pellets and any axolotl pellets), frozen foods by hand
      shop: { inventory: { foods: { marine_pellets: 1000, mysis_frozen: 60, brine_frozen: 40, coral_food: 30 } } },
      tanks: [
        {
          name: 'The 210',
          size: 'g180',
          water: 'marine_live_rock',
          substrate: 'aragonite',
          ageDays: 200,
          lights: { preset: 'reef_actinic', intensity: 1.2 },
          backdrop: 'deep_blue',
          bareEquipment: true,
          equipment: ['filter_sump', 'skimmer_insump', 'heater_titanium_800w', 'heater_titanium_800w', 'powerhead_large', 'powerhead_large', 'light_reef', 'light_reef', 'light_reef', 'ato', { id: 'autofeeder', setting: 4 }],
          decor: [
          { id: 'live_rock', x: -0.81, z: -0.05, scale: 1.1, exact: true },
          { id: 'live_rock', x: -0.6, z: -0.1, scale: 0.9, exact: true },
          { id: 'live_rock', x: -0.46, z: -0.08, scale: 1.0, exact: true },
          { id: 'live_rock', x: -0.25, z: -0.1, scale: 1.5, exact: true },
          { id: 'live_rock', x: -0.25, y: 0.12, z: -0.12, scale: 1.0, exact: true },
          { id: 'live_rock_arch', x: -0.07, z: -0.04, scale: 1.3, exact: true },
          { id: 'live_rock', x: 0.1, z: -0.1, scale: 1.7, exact: true },
          { id: 'live_rock', x: 0.1, y: 0.15, z: -0.12, scale: 1.1, exact: true },
          { id: 'live_rock', x: 0.36, z: -0.06, scale: 1.1, exact: true },
          { id: 'live_rock', x: 0.52, z: -0.1, scale: 1.0, exact: true },
          { id: 'live_rock', x: 0.7, z: -0.1, scale: 1.4, exact: true },
          { id: 'live_rock', x: 0.7, y: 0.12, z: -0.12, scale: 0.9, exact: true },
          { id: 'live_rock', x: 0.85, z: 0.0, scale: 0.8, exact: true },
          { id: 'rubble', x: -0.55, z: 0.17, exact: true },
          { id: 'rubble', x: 0.2, z: 0.18, exact: true },
          { id: 'rubble', x: 0.6, z: 0.17, exact: true },
          { id: 'red_ogo', x: -0.7, z: 0.2, exact: true },
          { id: 'red_ogo', x: -0.15, z: 0.22, exact: true },
          { id: 'red_ogo', x: 0.45, z: 0.2, exact: true },
          ],
          animals: [
            { species: 'lyretail_anthias', count: 5, sex: 'females' },
            { species: 'green_chromis', count: 5 },
            { species: 'maroon_clownfish', count: 2, sex: 'pair', names: ['Crimson', 'Scarlet'] },
            { species: 'melanurus_wrasse' },
            { species: 'chocolate_tang' },
            { species: 'sailfin_tang' },
            { species: 'emperor_angelfish' },
            { species: 'foxface_rabbitfish' },
            { species: 'elegant_starfish' },
            { species: 'fighting_conch' },
            { species: 'mexican_turbo_snail', count: 10 },
            { species: 'nassarius_snail', count: 20 },
            { species: 'astraea_snail', count: 3 },
            { species: 'cerith_snail', count: 4 },
            { species: 'hermit_crab', count: 2 },
            { species: 'scarlet_hermit_crab' },
            // the living bubble-tip (wave B) in place of the decor stand-in: it finds its own spot on the rock
            { species: 'bubbletip_anemone' },
          ],
        },
      ],
      // the owner (ADR-0053 round 4, B-220): a snail lost to a hermit crab is the real tank's own risk; no fish may die
      checks: [{ name: 'no fish die in two days', afterHours: 48, tank: 'The 210', category: 'fish', deaths: { max: 0 } }],
    }),
  },
  {
    // chunk 16 (ADR-0052 decision 6): every new species, young and old, for a look round
    id: 'new-species',
    group: 'Showpieces',
    recipe: r({
      name: 'Every new species (chunk 16)',
      notes: 'The 31 species chunk 16 added, in three tanks: the big fish and reef favourites, the clean-up crew and inverts on a sand bed, and the freshwater favourites. A few of each are young so their young colours show.',
      seed: 1600,
      base: 'blank',
      // a showroom, so three big tanks fit side by side, and plenty of every food for their autofeeders
      shop: { money: 50_000, facility: 'showroom', day: 30, hour: 11, inventory: { foods: 'plenty' } },
      tanks: [
        {
          name: 'Big Reef',
          size: 'g240',
          equipment: ['autofeeder'],
          water: 'reef',
          substrate: 'aragonite',
          ageDays: 200,
          lights: { preset: 'reef_actinic', intensity: 1.1 },
          animals: [
            { species: 'emperor_angelfish' },
            { species: 'emperor_angelfish', stage: 'juvenile', name: 'Ringlet' },
            { species: 'sailfin_tang' },
            { species: 'chocolate_tang', stage: 'juvenile', name: 'Lemon' },
            { species: 'lyretail_anthias', count: 5, sex: 'females' },
            { species: 'maroon_clownfish', count: 2, sex: 'pair' },
            { species: 'flame_angelfish' },
            { species: 'yellowtail_damselfish', count: 3 },
            { species: 'bubbletip_anemone' },
          ],
        },
        {
          name: 'Crew and Critters',
          size: 'g125',
          equipment: ['autofeeder'],
          water: 'reef',
          substrate: 'fine_sand',
          ageDays: 200,
          lights: { preset: 'reef_actinic', intensity: 1 },
          animals: [
            { species: 'melanurus_wrasse', count: 3, sex: 'females' },
            { species: 'sixline_wrasse' },
            { species: 'lawnmower_blenny' },
            { species: 'flame_hawkfish' },
            { species: 'elegant_starfish' },
            { species: 'sand_sifting_starfish' },
            { species: 'tuxedo_urchin' },
            { species: 'emerald_crab' },
            { species: 'fighting_conch' },
            { species: 'scarlet_hermit_crab', count: 2 },
            { species: 'mexican_turbo_snail', count: 2 },
            { species: 'nassarius_snail', count: 4 },
            { species: 'astraea_snail', count: 2 },
            { species: 'cerith_snail', count: 2 },
          ],
        },
        {
          name: 'Freshwater Favourites',
          size: 'g90',
          equipment: ['autofeeder'],
          water: 'freshwater_planted',
          ageDays: 120,
          animals: [
            { species: 'freshwater_angelfish', count: 2 },
            { species: 'german_blue_ram', count: 2, sex: 'pair' },
            { species: 'harlequin_rasbora', count: 8 },
            { species: 'zebra_danio', count: 6 },
            { species: 'platy', count: 4, sex: 'mixed' },
            { species: 'swordtail', count: 3, sex: 'mixed' },
            { species: 'dwarf_gourami', count: 2, sex: 'pair' },
            { species: 'ghost_shrimp', count: 4 },
            { species: 'ramshorn_snail', count: 3 },
          ],
        },
      ],
    }),
  },
  {
    // chunk 17 (ADR-0053; design §14): every big-tank species, each in the tank the shop waits for, grouped only where
    // the compatibility matrix (§11) calls them compatible
    id: 'big-tank-species',
    group: 'Showpieces',
    recipe: r({
      name: 'Big-tank species',
      notes: 'The 18 species chunk 17 added, each in the size of tank the shop waits for and grouped only where they get on: river giants with the motoro, the night fish, the oscar, the clown loaches, the fahaka alone, a koi pond, an estuary, two big marine reefs, the trigger and the panther grouper alone, and the three sharks.',
      seed: 1700,
      base: 'blank',
      shop: { money: 200_000, facility: 'grand_hall', day: 60, hour: 11, inventory: { foods: 'plenty' } },
      tanks: [
        { name: 'River Giants', size: 'g500', water: 'freshwater_tropical', substrate: 'sand', ageDays: 120, equipment: ['powerhead_large', { id: 'autofeeder', setting: 4 }], animals: [{ species: 'silver_arowana' }, { species: 'motoro_stingray' }] },
        { name: 'Night Shift', size: 'g240', water: 'freshwater_tropical', ageDays: 120, equipment: [{ id: 'powerhead_large', setting: 1 }, { id: 'autofeeder', setting: 4 }], animals: [{ species: 'black_ghost_knifefish' }, { species: 'ornate_bichir' }] },
        { name: 'Oscar', size: 'g180', water: 'freshwater_tropical', ageDays: 120, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'oscar' }] },
        { name: 'Clown Loaches', size: 'g180', water: 'freshwater_tropical', ageDays: 120, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'clown_loach', count: 6 }] },
        { name: 'Fahaka', size: 'g180', water: 'freshwater_tropical', ageDays: 120, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'fahaka_puffer' }] },
        { name: 'Koi Pond', size: 'g800', water: 'freshwater_cool', ageDays: 120, equipment: ['powerhead_large', { id: 'autofeeder', setting: 4 }], animals: [{ species: 'koi', count: 3 }] },
        { name: 'Estuary', size: 'g500', water: 'brackish', ageDays: 120, equipment: ['powerhead_large', { id: 'autofeeder', setting: 4 }], animals: [{ species: 'silver_mono', count: 6 }, { species: 'spotted_scat', count: 6 }] },
        { name: 'Reef Giants', size: 'g500', water: 'marine_fowlr', substrate: 'aragonite', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'blue_tang' }, { species: 'queen_angelfish' }] },
        { name: 'Triggerfish', size: 'g300', water: 'marine_fowlr', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'clown_triggerfish' }] },
        { name: 'Panther Grouper', size: 'g500', water: 'marine_fowlr', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'panther_grouper' }] },
        { name: 'Shark Lagoon', size: 'g1000', water: 'marine_fowlr', substrate: 'fine_sand', ageDays: 200, equipment: ['powerhead_large', { id: 'autofeeder', setting: 4 }], animals: [{ species: 'brownbanded_bamboo_shark' }, { species: 'naso_tang' }] },
        { name: 'Walking Shark', size: 'g500', water: 'marine_fowlr', substrate: 'fine_sand', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'epaulette_shark' }] },
        { name: 'Catshark Caves', size: 'g500', water: 'marine_fowlr', substrate: 'fine_sand', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'coral_catshark' }] },
      ],
      // the sharks, the ray and the arowana's tankmates eat frozen seafood by hand: aquarists feed them
      staff: [
        { role: 'aquarist', skill: 5, trait: 'meticulous' },
        { role: 'aquarist', skill: 4 },
        { role: 'aquarist', skill: 4 },
        { role: 'stock_manager', skill: 4, trait: 'planner' },
      ],
      checks: [{ name: 'everyone alive after two days', afterHours: 48, deaths: { max: 0 } }],
    }),
  },
  {
    // chunk 17 (design §14): the 1,000-gallon tank as a koi pond, three varieties
    id: 'koi-grand-display',
    group: 'Showpieces',
    recipe: r({
      name: 'Koi grand display',
      notes: 'The 1,000-gallon tank in cool water with three koi of different varieties: a Kohaku, a Showa and a Taisho Sanke.',
      seed: 1701,
      base: 'blank',
      shop: { money: 50_000, facility: 'grand_hall', day: 60, hour: 11, inventory: { foods: 'plenty' } },
      tanks: [
        {
          name: 'Koi Display',
          size: 'g1000',
          water: 'freshwater_cool',
          ageDays: 120,
          equipment: ['powerhead_large', { id: 'autofeeder', setting: 4 }],
          animals: [
            { species: 'koi', morph: 'Kohaku', name: 'Sakura' },
            { species: 'koi', morph: 'Showa', name: 'Kuro' },
            { species: 'koi', morph: 'Taisho Sanke', name: 'Yuki' },
          ],
        },
      ],
      checks: [{ name: 'everyone alive after two days', afterHours: 48, deaths: { max: 0 } }],
    }),
  },
  {
    // chunk 17 (design §14): each shark and the motoro in the tank its research gives for that number, so the lab warns
    // about nothing; egg cases on the way and a pregnant ray
    id: 'sharks-and-a-ray',
    group: 'Showpieces',
    recipe: r({
      name: 'Sharks and a ray',
      notes: 'A bamboo shark in the 1,000, an epaulette pair (with two egg cases tied to the rock), a coral catshark, and a motoro pair whose female is about to give birth.',
      seed: 1702,
      base: 'blank',
      shop: { money: 80_000, facility: 'grand_hall', day: 60, hour: 11, inventory: { foods: 'plenty' } },
      tanks: [
        { name: 'Bamboo Shark', size: 'g1000', water: 'marine_fowlr', substrate: 'fine_sand', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'brownbanded_bamboo_shark', name: 'Banjo' }] },
        {
          name: 'Epaulettes',
          size: 'g500',
          water: 'marine_fowlr',
          substrate: 'fine_sand',
          ageDays: 200,
          equipment: [{ id: 'autofeeder', setting: 4 }],
          animals: [{ species: 'epaulette_shark', count: 2, sex: 'pair', names: ['Strider', 'Pebble'] }],
          young: [{ species: 'epaulette_shark', stage: 'eggs', count: 2, mother: 'Pebble', father: 'Strider' }],
        },
        { name: 'Catshark', size: 'g500', water: 'marine_fowlr', substrate: 'fine_sand', ageDays: 200, equipment: [{ id: 'autofeeder', setting: 4 }], animals: [{ species: 'coral_catshark', name: 'Marble' }] },
        { name: 'Ray Pool', size: 'g500', water: 'freshwater_tropical', substrate: 'fine_sand', ageDays: 120, equipment: ['powerhead_large', { id: 'autofeeder', setting: 4 }], animals: [{ species: 'motoro_stingray', count: 2, sex: 'pair', names: ['Ripple', 'Saucer'], breed: 'ready' }] },
      ],
      // sharks and rays eat frozen seafood by hand
      staff: [
        { role: 'aquarist', skill: 5, trait: 'meticulous' },
        { role: 'aquarist', skill: 4 },
      ],
      checks: [{ name: 'everyone alive after two days', afterHours: 48, deaths: { max: 0 } }],
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
          // the reserve set, so both bids are always above it (the suggested price follows the pair's random traits)
          { animals: ['Pip', 'Nimbus'], reserve: 180, bids: [200, 240] },
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
