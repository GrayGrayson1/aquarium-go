/**
 * NPC buyer personas, archetypes and livestock sellers for the marketplace.
 * OWNER: lane "market". Pure data (+ tiny lookups). All names are original and fictional.
 *
 * Archetype preference weights (0..2) say how much a buyer cares about each listing aspect. They feed an
 * original "fit" model in src/sim/economy/buyers.ts. Market value is a game valuation, never a statement
 * about any animal's worth.
 */
import type { BuyerArchetype, BuyerProfile, ListingKind } from '@/types';

export interface BuyerArchetypeDef {
  id: BuyerArchetype;
  label: string;
  blurb: string;
  /** Base preference weights (0..2); individuals jitter around these. */
  prefs: BuyerProfile['prefs'];
  /** Per-listing spending ceiling range (log-uniform). */
  budget: [number, number];
  patience: [number, number];
  /** Relative share of the buyer pool. */
  weight: number;
  /** How likely this archetype is to look at each listing kind (0..1.5). */
  kindAffinity: Record<ListingKind, number>;
  /** Fraction of their private value they open with. */
  opening: [number, number];
  /** Roster species ids this archetype tends to favour. */
  favouritePool: string[];
  /** Listings valued below this rarely interest them (public aquariums skip single guppies). */
  minInterestValue: number;
  /** How the persona is named. */
  naming: 'person' | 'family' | 'public_aquarium' | 'conservation';
}

export const BUYER_ARCHETYPES: Record<BuyerArchetype, BuyerArchetypeDef> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner hobbyist',
    blurb: 'New to fishkeeping. Wants hardy, forgiving animals and a stable setup.',
    prefs: { rarity: 0.3, lineage: 0.2, beauty: 0.9, health: 1.5, easyCare: 2, size: 0.4, visitorAppeal: 0.3, price: 1.3 },
    budget: [60, 450],
    patience: [0.3, 0.7],
    weight: 1.3,
    kindAffinity: { creature: 1, group: 1, pair: 0.6, juveniles: 0.7, tank: 1.1, frag: 0.9 /* lane:frags */ },
    opening: [0.82, 0.95],
    favouritePool: ['betta', 'fancy_guppy', 'white_cloud_minnow', 'mystery_snail', 'cherry_shrimp', 'panda_corydoras', 'honey_gourami', 'ocellaris_clownfish', 'sailfin_molly' /* lane:brackish */],
    minInterestValue: 0,
    naming: 'person',
  },
  experienced_keeper: {
    id: 'experienced_keeper',
    label: 'Experienced keeper',
    blurb: 'Years of fishkeeping. Pays fairly for healthy animals and sensible setups.',
    prefs: { rarity: 0.9, lineage: 0.8, beauty: 1, health: 1.6, easyCare: 0.4, size: 1, visitorAppeal: 0.3, price: 0.9 },
    budget: [150, 2600],
    patience: [0.45, 0.85],
    weight: 1.2,
    kindAffinity: { creature: 1, group: 1, pair: 1, juveniles: 0.8, tank: 1, frag: 1.1 /* lane:frags */ },
    opening: [0.84, 0.96],
    favouritePool: ['pea_puffer', 'discus', 'kuhli_loach', 'hillstream_loach', 'otocinclus', 'mandarin_dragonet', 'lined_seahorse', 'axolotl', 'royal_gramma', 'figure_eight_puffer', 'bumblebee_goby' /* lane:brackish */],
    minInterestValue: 0,
    naming: 'person',
  },
  breeder: {
    id: 'breeder',
    label: 'Breeder',
    blurb: 'Runs a fishroom. Values proven breeders, documented lines and pairs.',
    prefs: { rarity: 1.2, lineage: 2, beauty: 0.6, health: 1.2, easyCare: 0.3, size: 0.5, visitorAppeal: 0.1, price: 1 },
    budget: [120, 3200],
    patience: [0.5, 0.9],
    weight: 1,
    kindAffinity: { creature: 0.9, group: 1, pair: 1.5, juveniles: 1.2, tank: 0.45, frag: 0.6 /* lane:frags */ },
    opening: [0.8, 0.93],
    favouritePool: ['betta', 'axolotl', 'fancy_guppy', 'endlers_livebearer', 'cherry_shrimp', 'ocellaris_clownfish', 'lined_seahorse', 'banggai_cardinalfish', 'bristlenose_pleco', 'medaka', 'sailfin_molly', 'bumblebee_goby' /* lane:brackish */],
    minInterestValue: 0,
    naming: 'person',
  },
  collector: {
    id: 'collector',
    label: 'Collector',
    blurb: 'Hunts rare morphs and unusual species. Big budget for the right piece.',
    prefs: { rarity: 2, lineage: 1.4, beauty: 1.2, health: 0.9, easyCare: 0.1, size: 0.8, visitorAppeal: 0.4, price: 0.5 },
    budget: [400, 16000],
    patience: [0.55, 0.95],
    weight: 0.8,
    kindAffinity: { creature: 1.3, group: 0.6, pair: 1.1, juveniles: 0.5, tank: 0.8, frag: 1.1 /* lane:frags */ },
    opening: [0.85, 0.97],
    favouritePool: ['axolotl', 'betta', 'mandarin_dragonet', 'discus', 'lined_seahorse', 'peacock_mantis_shrimp', 'clown_goby', 'ocellaris_clownfish', 'coral_beauty', 'banded_archerfish', 'figure_eight_puffer' /* lane:brackish */],
    minInterestValue: 30,
    naming: 'person',
  },
  aquascaper: {
    id: 'aquascaper',
    label: 'Aquascaper',
    blurb: 'Buys composition and craft. Cares about layout, plants and coherence more than rare genes.',
    prefs: { rarity: 0.2, lineage: 0.2, beauty: 2, health: 1.2, easyCare: 0.6, size: 0.9, visitorAppeal: 0.5, price: 0.8 },
    budget: [250, 9000],
    patience: [0.45, 0.85],
    weight: 0.9,
    kindAffinity: { creature: 0.35, group: 0.9, pair: 0.3, juveniles: 0.2, tank: 1.5, frag: 1.2 /* lane:frags */ },
    opening: [0.84, 0.96],
    favouritePool: ['neon_tetra', 'cardinal_tetra', 'otocinclus', 'amano_shrimp', 'cherry_shrimp', 'honey_gourami', 'white_cloud_minnow', 'nerite_snail', 'firefish'],
    minInterestValue: 20,
    naming: 'person',
  },
  family: {
    id: 'family',
    label: 'Family',
    blurb: 'Wants a charming, safe, easy tank the kids can enjoy.',
    prefs: { rarity: 0.2, lineage: 0.1, beauty: 1.4, health: 1.5, easyCare: 1.8, size: 0.6, visitorAppeal: 1.3, price: 1.2 },
    budget: [80, 900],
    patience: [0.3, 0.7],
    weight: 1,
    kindAffinity: { creature: 0.9, group: 1, pair: 0.7, juveniles: 0.5, tank: 1.3, frag: 0.35 /* lane:frags */ },
    opening: [0.85, 0.96],
    favouritePool: ['ocellaris_clownfish', 'fancy_goldfish', 'axolotl', 'fancy_guppy', 'betta', 'mystery_snail', 'african_dwarf_frog', 'hermit_crab', 'sailfin_molly' /* lane:brackish */],
    minInterestValue: 0,
    naming: 'family',
  },
  public_aquarium: {
    id: 'public_aquarium',
    label: 'Public aquarium',
    blurb: 'Sources healthy, charismatic animals and large proven exhibits for visitors.',
    prefs: { rarity: 1, lineage: 0.8, beauty: 1.5, health: 1.8, easyCare: 0.4, size: 2, visitorAppeal: 2, price: 0.4 },
    budget: [1500, 70000],
    patience: [0.6, 0.95],
    weight: 0.45,
    kindAffinity: { creature: 0.45, group: 0.8, pair: 0.9, juveniles: 0.6, tank: 1.5, frag: 0.2 /* lane:frags */ },
    opening: [0.88, 0.98],
    favouritePool: ['lined_seahorse', 'ocellaris_clownfish', 'yellow_tang', 'dwarf_lionfish', 'peacock_mantis_shrimp', 'mandarin_dragonet', 'axolotl', 'discus', 'banggai_cardinalfish', 'banded_archerfish' /* lane:brackish */],
    minInterestValue: 150,
    naming: 'public_aquarium',
  },
  conservation: {
    id: 'conservation',
    label: 'Conservation-minded buyer',
    blurb: 'Prefers captive-bred, well-documented, healthy animals for education and outreach.',
    prefs: { rarity: 0.7, lineage: 1.8, beauty: 0.5, health: 1.9, easyCare: 0.5, size: 0.4, visitorAppeal: 0.9, price: 0.8 },
    budget: [150, 5500],
    patience: [0.55, 0.9],
    weight: 0.6,
    kindAffinity: { creature: 0.9, group: 1, pair: 1.3, juveniles: 1.1, tank: 0.8, frag: 0.45 /* lane:frags */ },
    opening: [0.83, 0.95],
    favouritePool: ['axolotl', 'lined_seahorse', 'banggai_cardinalfish', 'white_cloud_minnow', 'medaka', 'ocellaris_clownfish', 'watchman_goby'],
    minInterestValue: 0,
    naming: 'conservation',
  },
  bargain_hunter: {
    id: 'bargain_hunter',
    label: 'Bargain hunter',
    blurb: 'Shows up fast with low offers. Occasionally the only bid you get.',
    prefs: { rarity: 0.6, lineage: 0.3, beauty: 0.6, health: 0.7, easyCare: 0.6, size: 0.7, visitorAppeal: 0.3, price: 2 },
    budget: [40, 2200],
    patience: [0.1, 0.45],
    weight: 1.1,
    kindAffinity: { creature: 1, group: 1.1, pair: 0.8, juveniles: 1.1, tank: 1, frag: 1 /* lane:frags */ },
    opening: [0.66, 0.84],
    favouritePool: [],
    minInterestValue: 0,
    naming: 'person',
  },
};

export const BUYER_ARCHETYPE_IDS = Object.keys(BUYER_ARCHETYPES) as BuyerArchetype[];

export function archetypeLabel(a: BuyerArchetype | undefined): string {
  return a ? BUYER_ARCHETYPES[a]?.label ?? a : 'Buyer';
}

/** Individual hobbyist names (fictional). */
export const PERSON_NAMES: string[] = [
  'Priya Raman',
  'Tomasz Wierzba',
  'Ada Okonkwo',
  'Leon Marchetti',
  'Mei-Lin Zhou',
  'Rafael Ortega',
  'Hannah Lindqvist',
  'Kwame Asante',
  'Sofia Petrakis',
  'Jonah Whitfield',
  'Yuki Tanabe',
  'Farah Haddad',
  'Mateo Silva',
  'Ingrid Solberg',
  'Dev Kapoor',
  'Amara Nwosu',
  'Callum Reid',
  'Lucia Ferrante',
  'Omar Siddiqui',
  'Nadia Volkova',
  'Theo Brandt',
  'Rosa Delgado',
  'Kenji Morita',
  'Elif Aydın',
  'Samuel Achterberg',
  'Imani Brooks',
  'Pavel Novák',
  'Clara Moreau',
  'Arjun Menon',
  'Freya Halvorsen',
  'Diego Castellanos',
  'Hoa Nguyen',
  'Wren Castellane',
  'Bram de Vries',
  'Zainab Oduya',
  'Marek Kowalczyk',
  'Isla Fairbairn',
  'Tariq Benali',
  'Noor Abadi',
  'Felix Hartmann',
  'Lena Marsh',
  'Oskar Lund',
  'Anika Sørensen',
  'Rohan Iyer',
  'Juniper Hale',
  'Cyrus Bahrami',
  'Paloma Reyes',
  'Silas Grey',
];

/** Family surnames — rendered as "The <Surname> family". */
export const FAMILY_NAMES: string[] = [
  'Okafor',
  'Bergström',
  'Nakamura',
  'Alvarez',
  'MacAllister',
  'Haddad',
  'Kowalski',
  'Fontaine',
  'Adeyemi',
  'Lindgren',
  'Petrov',
  'Castillo',
  'Oyelaran',
  'Whitmore',
];

/** Fictional public aquariums & science centres. */
export const PUBLIC_AQUARIUM_NAMES: string[] = [
  'Tidewater Discovery Centre',
  'Harbourlight Public Aquarium',
  'Northreach Science Hall',
  'Coral Bay Marine Gallery',
  'Riverside Living Waters Museum',
  'Blue Lantern Aquarium',
  'Kelp Hollow Visitor Centre',
  'Glasswater Civic Aquarium',
];

/** Fictional conservation / education groups. */
export const CONSERVATION_NAMES: string[] = [
  'Canal Heritage Keepers',
  'Seagrass & Seahorse Trust',
  'Freshwater Futures Collective',
  'Reef Nursery Outreach',
  'Coldwater Amphibian Circle',
  'Shoreline Stewards Network',
  'Riverbank Education Project',
  'Living Lagoon Society',
];

export interface SellerDef {
  name: string;
  /** Roster species ids this seller specialises in (empty = general). */
  specialties: string[];
  /** Flavour appended to breeder-line offers, e.g. "golden line". */
  lineFlavour: string;
}

/** Fictional livestock sellers / NPC breeders that stock the shop. */
export const SELLERS: SellerDef[] = [
  { name: 'Bayou Axolotl Co.', specialties: ['axolotl'], lineFlavour: 'line' },
  { name: 'Siamese Silk Bettas', specialties: ['betta'], lineFlavour: 'show line' },
  { name: 'Tidepool Breeders', specialties: ['ocellaris_clownfish', 'banggai_cardinalfish', 'royal_gramma', 'firefish'], lineFlavour: 'aquacultured line' },
  { name: 'Seagrass Seahorse Farm', specialties: ['lined_seahorse'], lineFlavour: 'captive-bred line' },
  { name: 'Riverbend Aquatics', specialties: ['neon_tetra', 'cardinal_tetra', 'panda_corydoras', 'otocinclus', 'kuhli_loach', 'honey_gourami'], lineFlavour: 'farm line' },
  { name: 'Glasshouse Guppies', specialties: ['fancy_guppy', 'endlers_livebearer', 'medaka'], lineFlavour: 'strain' },
  { name: 'Little Cherry Shrimpery', specialties: ['cherry_shrimp', 'amano_shrimp', 'mystery_snail', 'nerite_snail', 'dwarf_crayfish'], lineFlavour: 'colony' },
  { name: 'Western Ghats Puffer Room', specialties: ['pea_puffer'], lineFlavour: 'tank-bred line' },
  { name: 'Coldwater Koi & Goldfish', specialties: ['fancy_goldfish', 'comet_goldfish', 'white_cloud_minnow'], lineFlavour: 'line' },
  { name: 'Coral Loft Aquaculture', specialties: ['clown_goby', 'watchman_goby', 'green_chromis', 'cleaner_shrimp', 'peppermint_shrimp', 'trochus_snail', 'hermit_crab'], lineFlavour: 'aquacultured line' },
  { name: 'Deep Reef Specialists', specialties: ['mandarin_dragonet', 'coral_beauty', 'yellow_tang', 'kole_tang', 'foxface_rabbitfish', 'dwarf_lionfish', 'miniatus_grouper', 'peacock_mantis_shrimp'], lineFlavour: 'selected stock' },
  { name: 'Amazon Gold Discus', specialties: ['discus', 'bristlenose_pleco', 'hillstream_loach', 'african_dwarf_frog'], lineFlavour: 'strain' },
  { name: 'Mangrove Coast Aquatics', specialties: ['figure_eight_puffer', 'bumblebee_goby', 'sailfin_molly', 'banded_archerfish'], lineFlavour: 'estuary stock' }, // lane:brackish
  { name: 'Harbor Street Aquatics', specialties: [], lineFlavour: 'stock' },
];

/** The local fish store used for quick sales. */
export const LOCAL_FISH_STORE = 'Harbor Street Aquatics';

/** Emergency lender in the "going broke" safety net. */
export const AQUARIUM_CLUB = 'the Riverside Aquarium Club';

/**
 * lane:frags — how much each archetype wants coral frags vs plant cuttings (multiplies their interest in a 'frag'
 * listing by its coral share). Reef collectors chase coral; aquascapers and breeders (moss for fry tanks) want plants.
 */
export const FRAG_TASTE: Record<BuyerArchetype, { coral: number; plant: number }> = {
  beginner: { coral: 0.8, plant: 1.1 },
  experienced_keeper: { coral: 1.1, plant: 0.9 },
  breeder: { coral: 0.45, plant: 1.2 },
  collector: { coral: 1.5, plant: 0.25 },
  aquascaper: { coral: 0.3, plant: 1.6 },
  family: { coral: 0.4, plant: 0.7 },
  public_aquarium: { coral: 0.5, plant: 0.1 },
  conservation: { coral: 0.6, plant: 0.4 },
  bargain_hunter: { coral: 1, plant: 1 },
};
