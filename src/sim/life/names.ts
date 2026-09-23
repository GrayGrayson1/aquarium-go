/**
 * Charming, original creature names by "vibe". OWNER: lane "lifecycle".
 * Deliberately avoids names of famous fictional aquarium characters.
 *
 * lane:w2-sim — names match what the keeper can see: a female betta is never "Titus". Clearly gendered names are
 * offered only when the animal's sex is visible and fixed (separate sexes); fry of unknown sex, sex-changing species
 * (clownfish, wrasses) and hermaphrodites get names from the neutral pool, so a name never contradicts the sex
 * revealed later. New animals draw their name from a generator seeded by their own id (`nameRngFor`), never from the
 * main sim stream, so cosmetic changes to the pools can't shift the simulation.
 */
import type { GameState, Sex, SpeciesDefinition } from '@/types';
import { mulberry32, hashString, type Rng } from '../rng';

export type NameMood = 'soft' | 'jewel' | 'snack' | 'tropical' | 'mythic' | 'earthy' | 'zippy' | 'noble';

export const NAME_POOLS: Record<NameMood, readonly string[]> = {
  soft: [
    'Mochi', 'Pip', 'Nimbus', 'Lotus', 'Poppy', 'Clover', 'Bramble', 'Pudding', 'Marshmallow', 'Button', 'Pebble', 'Willow',
    'Juniper', 'Maple', 'Hazel', 'Dewdrop', 'Puddle', 'Sprout', 'Tansy', 'Wren', 'Fern', 'Bonbon', 'Muffin', 'Noodle',
    'Dumpling', 'Tofu', 'Cotton', 'Petal', 'Blossom', 'Buttercup', 'Snowdrop', 'Pumpkin', 'Sesame', 'Kiki', 'Lulu', 'Bao',
    'Yuzu', 'Momo', 'Suki', 'Miso', 'Taffy', 'Cocoa', 'Posy', 'Bibi', 'Ollie', 'Pim', 'Tilly', 'Bumble',
  ],
  jewel: [
    'Sapphire', 'Ember', 'Garnet', 'Onyx', 'Opal', 'Topaz', 'Jasper', 'Ruby', 'Indigo', 'Cobalt', 'Velvet', 'Sable',
    'Rogue', 'Zephyr', 'Blaze', 'Saffron', 'Crimson', 'Azure', 'Obsidian', 'Lapis', 'Beryl', 'Cinder', 'Aurelio', 'Vesper',
    'Orion', 'Casimir', 'Valentin', 'Marquis', 'Duchess', 'Figaro', 'Rhapsody', 'Tango', 'Flamenco', 'Carmine', 'Scarlet',
    'Midnight', 'Phantom', 'Silk', 'Brocade', 'Sequin', 'Couture', 'Majesty', 'Regent', 'Solstice', 'Tourmaline', 'Jade',
  ],
  snack: [
    'Pea', 'Bean', 'Wasabi', 'Pickle', 'Biscuit', 'Nugget', 'Crumb', 'Sprinkle', 'Jellybean', 'Peanut', 'Chickpea',
    'Edamame', 'Olive', 'Caper', 'Kiwi', 'Lime', 'Pistachio', 'Tater', 'Waffle', 'Pretzel', 'Crouton', 'Nacho', 'Gnocchi',
    'Ravioli', 'Tamale', 'Churro', 'Mango', 'Dill', 'Basil', 'Pesto', 'Clementine', 'Kumquat', 'Raisin', 'Gumdrop',
    'Truffle', 'Scone', 'Crumpet', 'Bagel', 'Poppyseed', 'Mustard', 'Paprika', 'Cashew', 'Sprocket', 'Tapioca', 'Macaron',
  ],
  tropical: [
    'Sunny', 'Coral', 'Tango', 'Mango', 'Papaya', 'Reef', 'Sandy', 'Kona', 'Maui', 'Lani', 'Kai', 'Nalu', 'Pua', 'Hibiscus',
    'Calypso', 'Salsa', 'Samba', 'Rumba', 'Mambo', 'Tiki', 'Cabana', 'Lagoon', 'Atoll', 'Sunset', 'Citrus', 'Tangerine',
    'Apricot', 'Marigold', 'Sunbeam', 'Bongo', 'Conga', 'Zinnia', 'Cayenne', 'Pepper', 'Poppy', 'Nectar', 'Monsoon', 'Surf',
    'Bodhi', 'Riptide', 'Laguna', 'Cove', 'Marina', 'Guava', 'Luau', 'Ukulele',
  ],
  mythic: [
    'Seraphina', 'Ripple', 'Drift', 'Atlas', 'Oberon', 'Titania', 'Luna', 'Selene', 'Aurora', 'Celeste', 'Nova', 'Stella',
    'Lyra', 'Vega', 'Sirius', 'Andromeda', 'Calliope', 'Galatea', 'Nereus', 'Thalassa', 'Oceanus', 'Triton', 'Undine',
    'Coralie', 'Marisol', 'Ondine', 'Perla', 'Echo', 'Iris', 'Halcyon', 'Aether', 'Elara', 'Ione', 'Nyx', 'Pearl',
    'Moonbeam', 'Stardust', 'Whisper', 'Solenne', 'Isolde', 'Tamsin', 'Aria', 'Hymn', 'Meridian', 'Sylph', 'Wisp',
  ],
  earthy: [
    'Moss', 'Pebble', 'Flint', 'Cobble', 'Gravel', 'Acorn', 'Bark', 'Burdock', 'Chestnut', 'Clay', 'Dusty', 'Loam', 'Nutmeg',
    'Oakley', 'Rowan', 'Sorrel', 'Thistle', 'Truffle', 'Umber', 'Walnut', 'Barley', 'Bramble', 'Cairn', 'Fennel', 'Ginger',
    'Heather', 'Ivy', 'Kelp', 'Lichen', 'Nettle', 'Oat', 'Pine', 'Quill', 'Reed', 'Sage', 'Tumble', 'Wicket', 'Yarrow',
    'Birch', 'Cedar', 'Pumice', 'Shale', 'Tuffet', 'Mudpie', 'Driftwood', 'Cricket',
  ],
  zippy: [
    'Dash', 'Zip', 'Zoom', 'Sprint', 'Flicker', 'Spark', 'Comet', 'Rocket', 'Bolt', 'Jet', 'Scout', 'Skipper', 'Ziggy',
    'Blink', 'Flash', 'Pixel', 'Nimble', 'Scoot', 'Swoosh', 'Whirl', 'Dart', 'Glint', 'Sparky', 'Twinkle', 'Quasar',
    'Photon', 'Neon', 'Laser', 'Tinsel', 'Glitter', 'Streak', 'Swift', 'Racer', 'Turbo', 'Breeze', 'Whisk', 'Hopper', 'Jinx',
    'Pinball', 'Tizzy', 'Fizz', 'Zest', 'Zinger', 'Skitter', 'Flit', 'Sprite',
  ],
  noble: [
    'Admiral', 'Duke', 'Baron', 'Captain', 'Major', 'Regina', 'Empress', 'Tsar', 'Kaiser', 'Sultan', 'Monarch', 'Chancellor',
    'Magnus', 'Maximus', 'Augustus', 'Titus', 'Brutus', 'Goliath', 'Bruno', 'Hercules', 'Rex', 'Leo', 'Sterling',
    'Sovereign', 'Winston', 'Theodore', 'Bartholomew', 'Montgomery', 'Reginald', 'Percival', 'Ambrose', 'Cornelius',
    'Ignatius', 'Horatio', 'Octavia', 'Victoria', 'Constance', 'Beatrix', 'Wilhelmina', 'Genevieve', 'Archibald', 'Gideon',
    'Ptolemy', 'Balthazar', 'Aurelius', 'Clementine',
    // lane:w2-sim — neutral titles, so fry of unknown sex and sex-changing groupers still get a noble name
    'Marshal', 'Governor', 'Senator', 'Consul', 'Viceroy', 'Laureate', 'Magistrate', 'Commodore', 'Chieftain', 'Envoy',
    'Herald', 'Sheriff', 'Mayor', 'Colonel', 'General', 'Professor', 'Judge', 'Ambassador', 'Alderman', 'Provost',
  ],
};

const BY_SPECIES: Record<string, NameMood[]> = {
  axolotl: ['soft', 'mythic'],
  betta: ['jewel', 'noble'],
  pea_puffer: ['snack', 'soft'],
  ocellaris_clownfish: ['tropical'],
  lined_seahorse: ['mythic', 'soft'],
};

const BY_BEHAVIOR: Record<string, NameMood[]> = {
  schooling_small: ['zippy', 'soft'],
  chromis: ['zippy', 'tropical'],
  livebearer: ['zippy', 'jewel'],
  surface_dweller: ['zippy', 'soft'],
  dartfish: ['zippy', 'jewel'],
  shrimp_dwarf: ['snack', 'earthy'],
  shrimp_cleaner: ['tropical', 'snack'],
  snail: ['earthy', 'snack'],
  hermit_crab: ['earthy', 'snack'],
  crayfish: ['snack', 'earthy'],
  bottom_forager: ['earthy', 'soft'],
  algae_grazer: ['earthy', 'soft'],
  loach_eel: ['earthy', 'soft'],
  hillstream: ['earthy', 'zippy'],
  goby_burrow: ['earthy', 'tropical'],
  goby_perch: ['tropical', 'soft'],
  goldfish: ['snack', 'noble', 'soft'],
  gourami: ['soft', 'jewel'],
  cichlid_discus: ['jewel', 'noble'],
  reef_basslet: ['jewel', 'tropical'],
  angelfish_dwarf: ['jewel', 'tropical'],
  tang: ['tropical', 'zippy'],
  rabbitfish: ['tropical', 'earthy'],
  cardinal_hover: ['mythic', 'tropical'],
  dragonet: ['jewel', 'mythic'],
  mantis_shrimp: ['noble', 'mythic'],
  lionfish: ['noble', 'mythic'],
  grouper: ['noble'],
  frog_aquatic: ['soft', 'snack'],
  sessile: ['earthy', 'mythic'],
};

/** lane:w2-sim — names that read as clearly feminine or masculine; every other name in the pools is neutral. */
const FEMININE_NAMES: readonly string[] = [
  'Poppy', 'Hazel', 'Tansy', 'Kiki', 'Lulu', 'Suki', 'Posy', 'Bibi', 'Tilly', 'Willow', 'Juniper',
  'Sapphire', 'Opal', 'Ruby', 'Beryl', 'Duchess', 'Scarlet', 'Jade', 'Saffron',
  'Lani', 'Pua', 'Calypso', 'Marina', 'Coral',
  'Seraphina', 'Titania', 'Luna', 'Selene', 'Aurora', 'Celeste', 'Stella', 'Lyra', 'Andromeda', 'Calliope', 'Galatea',
  'Thalassa', 'Undine', 'Coralie', 'Marisol', 'Ondine', 'Perla', 'Iris', 'Elara', 'Ione', 'Nyx', 'Pearl', 'Solenne',
  'Isolde', 'Tamsin', 'Aria',
  'Heather', 'Ivy', 'Olive', 'Clementine',
  'Regina', 'Empress', 'Octavia', 'Victoria', 'Constance', 'Beatrix', 'Wilhelmina', 'Genevieve',
];
const MASCULINE_NAMES: readonly string[] = [
  'Ollie', 'Jasper', 'Aurelio', 'Orion', 'Casimir', 'Valentin', 'Marquis', 'Figaro',
  'Atlas', 'Oberon', 'Sirius', 'Nereus', 'Oceanus', 'Triton',
  'Duke', 'Baron', 'Tsar', 'Kaiser', 'Sultan', 'Magnus', 'Maximus', 'Augustus', 'Titus', 'Brutus', 'Goliath', 'Bruno',
  'Hercules', 'Rex', 'Leo', 'Winston', 'Theodore', 'Bartholomew', 'Montgomery', 'Reginald', 'Percival', 'Ambrose',
  'Cornelius', 'Ignatius', 'Horatio', 'Archibald', 'Gideon', 'Ptolemy', 'Balthazar', 'Aurelius',
];
const NAME_SEX: Record<string, 'female' | 'male'> = Object.fromEntries([...FEMININE_NAMES.map((n) => [n, 'female']), ...MASCULINE_NAMES.map((n) => [n, 'male'])]);

/** Which sex a name may read as, or null if it should read as neutral (unknown sex, sex change, hermaphrodite). */
export function nameSexFor(species: SpeciesDefinition, sex?: Sex | null): 'female' | 'male' | null {
  if (species.sexSystem !== 'gonochoristic') return null;
  return sex === 'female' || sex === 'male' ? sex : null;
}

/** The sex a name reads as ('female' / 'male'), or null for a neutral name. */
export function nameReadsAs(name: string): 'female' | 'male' | null {
  return NAME_SEX[name.replace(/\s+(II|III|IV|Jr\.|the Second|\d+)$/, '')] ?? null;
}

/** The name "vibes" that suit a species. */
export function nameMoodsFor(species: SpeciesDefinition): NameMood[] {
  return BY_SPECIES[species.id] ?? BY_BEHAVIOR[species.behaviorSet] ?? (species.category === 'invertebrate' ? ['snack', 'earthy'] : ['soft', 'jewel']);
}

/** Names for this species: its moods' neutral names, plus gendered names only when they match a visible, fixed sex. */
export function namePoolFor(species: SpeciesDefinition, sex?: Sex | null): string[] {
  const want = nameSexFor(species, sex);
  const out: string[] = [];
  for (const mood of nameMoodsFor(species))
    for (const n of NAME_POOLS[mood]) {
      const g = NAME_SEX[n];
      if (g && g !== want) continue;
      if (!out.includes(n)) out.push(n);
    }
  return out;
}

/** lane:w2-sim — the name generator for a new creature: seeded by the save and its id, independent of the sim RNG. */
export function nameRngFor(state: Pick<GameState, 'seed'>, creatureId: string): Rng {
  return mulberry32(hashString(`name:${state.seed ?? 0}:${creatureId}`));
}

/** Names already used by living/listed creatures (to avoid duplicates in one collection). */
export function takenNames(state: GameState): Set<string> {
  const s = new Set<string>();
  for (const c of Object.values(state.creatures)) if (c.status === 'alive' || c.status === 'listed') s.add(c.name);
  for (const offer of state.market?.stock ?? []) for (const c of offer.creatures ?? []) s.add(c.name);
  return s;
}

const SUFFIXES = ['II', 'III', 'IV', 'Jr.', 'the Second'];

/** Deterministic charming name; avoids names in `taken` when possible. `sex` picks sex-matched names (see top). */
export function generateName(species: SpeciesDefinition, rng: Rng, taken?: Set<string>, sex?: Sex | null): string {
  const pool = namePoolFor(species, sex);
  let pick = rng.pick(pool);
  for (let i = 0; i < 8 && taken?.has(pick); i++) pick = rng.pick(pool);
  if (taken?.has(pick)) {
    for (const s of SUFFIXES) {
      const alt = `${pick} ${s}`;
      if (!taken.has(alt)) return alt;
    }
  }
  return pick;
}

/** A handful of distinct name ideas (naming screen). */
export function suggestNames(species: SpeciesDefinition, rng: Rng, count = 5, taken?: Set<string>, sex?: Sex | null): string[] {
  const pool = namePoolFor(species, sex).filter((n) => !taken?.has(n));
  const copy = pool.slice();
  rng.shuffle(copy);
  return copy.slice(0, Math.max(0, count));
}
