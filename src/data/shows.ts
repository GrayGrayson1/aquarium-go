/**
 * Show circuit data: tiers, classes and their judging standards, hosts, judges and names. OWNER: lane "shows".
 *
 * Inspired by real hobby shows — betta and guppy table shows, goldfish and axolotl morph fairs, shrimp grading
 * and nature-aquarium layout contests — with a dash of Pokémon Contests: a calm, well-bonded animal shows better.
 * Every host, show, judge and exhibitor name here is original.
 *
 * A class "standard" hands out 100 points across criteria, the way real show standards do (a betta judge might give
 * 30 points for finnage and 25 for colour). src/sim/shows/judging.ts scores each criterion 0..1 and the judge's card
 * shows the points, so every score can be explained.
 */
import type { Environment, ShowTier } from '@/types';
import { byId } from '@/data/byId';

// ───────────────────────────── tiers ─────────────────────────────

export interface ShowTierDef {
  id: ShowTier;
  name: string;
  order: number;
  /** Unlock key that opens entries at this tier (src/data/unlocks.ts). */
  unlockKey: string;
  /** Class purse range ($ per class; 1st takes 55%, 2nd 27%, 3rd 18%). */
  purse: [number, number];
  /** Purse / fee rounding step ($). */
  step: number;
  /** Entry fee as a fraction of the show's average class purse. */
  feeFrac: [number, number];
  /** Classes per show. */
  classes: [number, number];
  /** Other exhibitors per class. */
  field: [number, number];
  /** Other exhibitors' scores: mean and spread (points out of 100). */
  npcMean: number;
  npcSd: number;
  /** Reputation for a class win (2nd 60%, 3rd 40%, HM 20%; Best in Show adds the win amount again). */
  rep: number;
  /** Mastery XP for a class win (scaled down for lower placings). */
  xp: number;
  /** Relative chance a newly scheduled show is at this tier (once unlocked). */
  weight: number;
  /** Most entries you may make in one show. */
  maxEntries: number;
  /** Best in Show award, as a fraction of the show's average class purse. */
  bisFrac: number;
  /** Game hours before judging that entries close. */
  closeBeforeH: number;
  /** UI accent. */
  tone: 'aqua' | 'violet' | 'coral' | 'gold';
  /** One line for locked cards / tooltips. */
  blurb: string;
}

export const SHOW_TIERS: Record<ShowTier, ShowTierDef> = {
  club: {
    id: 'club',
    name: 'Club',
    order: 0,
    unlockKey: 'shows',
    purse: [40, 150],
    step: 5,
    feeFrac: [0.1, 0.16],
    classes: [2, 3],
    field: [5, 8],
    npcMean: 50,
    npcSd: 9,
    rep: 3,
    xp: 20,
    weight: 1,
    maxEntries: 3,
    bisFrac: 0.3,
    closeBeforeH: 3,
    tone: 'aqua',
    blurb: 'Friendly local table shows — a well-kept starter can take a ribbon.',
  },
  regional: {
    id: 'regional',
    name: 'Regional',
    order: 1,
    unlockKey: 'shows_regional',
    purse: [250, 800],
    step: 25,
    feeFrac: [0.1, 0.16],
    classes: [3, 3],
    field: [6, 10],
    npcMean: 60,
    npcSd: 8,
    rep: 7,
    xp: 45,
    weight: 0.8,
    maxEntries: 3,
    bisFrac: 0.3,
    closeBeforeH: 4,
    tone: 'violet',
    blurb: 'Expo shows with serious hobby breeders. Bred lines start to matter.',
  },
  national: {
    id: 'national',
    name: 'National',
    order: 2,
    unlockKey: 'shows_national',
    purse: [1500, 5000],
    step: 100,
    feeFrac: [0.12, 0.18],
    classes: [3, 4],
    field: [9, 14],
    npcMean: 69,
    npcSd: 7,
    rep: 14,
    xp: 90,
    weight: 0.55,
    maxEntries: 2,
    bisFrac: 0.25,
    closeBeforeH: 5,
    tone: 'coral',
    blurb: 'Championship classes — winners come from generations of careful breeding.',
  },
  international: {
    id: 'international',
    name: 'International',
    order: 3,
    unlockKey: 'shows_international',
    purse: [8000, 25000],
    step: 500,
    feeFrac: [0.12, 0.2],
    classes: [4, 4],
    field: [12, 18],
    npcMean: 77,
    npcSd: 6,
    rep: 24,
    xp: 160,
    weight: 0.35,
    maxEntries: 2,
    bisFrac: 0.25,
    closeBeforeH: 6,
    tone: 'gold',
    blurb: 'The world stage. Only remarkable animals and living art place here.',
  },
};

export const SHOW_TIER_ORDER: ShowTier[] = ['club', 'regional', 'national', 'international'];

// ───────────────────────────── classes ─────────────────────────────

export type ShowCriterionKey = 'form' | 'colour' | 'pattern' | 'size' | 'condition' | 'deportment' | 'rarity' | 'composition' | 'living' | 'welfare' | 'clarity' | 'stocking' | 'biotope';

export interface ShowClassDef {
  id: string;
  name: string;
  /** Short chip label. */
  short: string;
  kind: 'livestock' | 'aquascape';
  /** What the judges look for (one or two sentences). */
  blurb: string;
  /** Livestock: eligible species ids, species groups or environments (any match). */
  species?: string[];
  groups?: string[];
  env?: Environment[];
  /** Betta fin types (appearance.finType). */
  finTypes?: string[];
  /** Aquascape eligibility. */
  scape?: { maxGallons?: number; planted?: boolean; reef?: boolean; biotope?: boolean };
  /** Points per criterion; they sum to 100. */
  standard: Partial<Record<ShowCriterionKey, number>>;
  /** Word for the form criterion ("Finnage", "Gills & frame"). */
  formLabel?: string;
  /** Word for the deportment criterion ("Deportment", "Settled & grazing"). */
  deportmentLabel?: string;
  /** Lowest tier that offers this class. */
  minTier?: ShowTier;
  /** Unlock key needed to enter (aquascape classes need Aquascape Awards). */
  requires?: string;
  /** "Any other variety" class open to a whole environment. */
  open?: boolean;
  /** Lucide icon name hint. */
  icon: string;
}

const FISH_STANDARD = { form: 25, colour: 20, pattern: 15, size: 15, condition: 15, deportment: 10 };

export const SHOW_CLASSES: ShowClassDef[] = [
  {
    id: 'betta_halfmoon',
    name: 'Betta · Halfmoon & Double-tail',
    short: 'Halfmoon betta',
    kind: 'livestock',
    blurb: 'A full, even spread with crisp fin edges and rich, even colour. A betta that flares on cue earns deportment.',
    species: ['betta'],
    finTypes: ['halfmoon', 'double_tail'],
    standard: { form: 30, colour: 25, pattern: 10, size: 10, condition: 15, deportment: 10 },
    formLabel: 'Finnage',
    icon: 'Fish',
  },
  {
    id: 'betta_longfin',
    name: 'Betta · Veiltail & Crowntail',
    short: 'Long-fin betta',
    kind: 'livestock',
    blurb: 'Flowing veils or clean, evenly spaced crown rays — symmetry and fin condition matter most.',
    species: ['betta'],
    finTypes: ['veiltail', 'crowntail'],
    standard: { form: 30, colour: 25, pattern: 10, size: 10, condition: 15, deportment: 10 },
    formLabel: 'Finnage',
    icon: 'Fish',
  },
  {
    id: 'betta_plakat',
    name: 'Betta · Plakat',
    short: 'Plakat betta',
    kind: 'livestock',
    blurb: 'The short-finned fighter form: a powerful, balanced body, tight fins and bold colour.',
    species: ['betta'],
    finTypes: ['plakat'],
    standard: { form: 25, colour: 25, pattern: 10, size: 15, condition: 15, deportment: 10 },
    formLabel: 'Body & fins',
    icon: 'Fish',
  },
  {
    id: 'axolotl_morph',
    name: 'Axolotl · Morph class',
    short: 'Axolotl morphs',
    kind: 'livestock',
    blurb: 'Full, feathery gills, a strong frame and clean morph colour. Rare morphs catch the judges’ eye.',
    species: ['axolotl'],
    standard: { form: 25, colour: 20, pattern: 5, size: 15, condition: 15, deportment: 10, rarity: 10 },
    formLabel: 'Gills & frame',
    icon: 'Sparkles',
  },
  {
    id: 'guppy_endler',
    name: 'Guppy & Endler',
    short: 'Guppy & Endler',
    kind: 'livestock',
    blurb: 'Tail shape and dorsal balance, colour saturation and a clean, repeatable pattern.',
    species: ['fancy_guppy', 'endlers_livebearer'],
    standard: { form: 25, colour: 25, pattern: 20, size: 5, condition: 15, deportment: 10 },
    formLabel: 'Tail & dorsal',
    icon: 'Fish',
  },
  {
    id: 'goldfish',
    name: 'Goldfish · Fancy & single-tail',
    short: 'Goldfish',
    kind: 'livestock',
    blurb: 'Deep, balanced body and symmetrical finnage (or a clean, lively single tail), with even colour.',
    species: ['fancy_goldfish', 'comet_goldfish'],
    groups: ['goldfish'],
    standard: { form: 30, colour: 20, pattern: 10, size: 15, condition: 15, deportment: 10 },
    formLabel: 'Body & finnage',
    icon: 'Fish',
  },
  {
    id: 'clownfish_designer',
    name: 'Designer clownfish',
    short: 'Designer clowns',
    kind: 'livestock',
    blurb: 'Crisp, well-edged white bars and deep colour. Rare designer lines score for morph.',
    species: ['ocellaris_clownfish'],
    groups: ['anemonefish'],
    standard: { form: 15, colour: 20, pattern: 20, size: 10, condition: 15, deportment: 10, rarity: 10 },
    formLabel: 'Body & fins',
    icon: 'Sparkles',
  },
  {
    id: 'seahorse',
    name: 'Seahorses',
    short: 'Seahorses',
    kind: 'livestock',
    blurb: 'Upright posture, a well-filled body and clean colour — condition counts double for these delicate fish.',
    species: ['lined_seahorse'],
    groups: ['syngnathid'],
    standard: { form: 25, colour: 20, pattern: 10, size: 15, condition: 20, deportment: 10 },
    formLabel: 'Posture & form',
    icon: 'Fish',
  },
  {
    id: 'discus',
    name: 'Discus',
    short: 'Discus',
    kind: 'livestock',
    blurb: 'A perfectly round body, fine even pattern and intense colour: the “king of the aquarium” classes.',
    species: ['discus'],
    standard: { form: 25, colour: 25, pattern: 15, size: 15, condition: 10, deportment: 10 },
    formLabel: 'Round body',
    minTier: 'regional',
    icon: 'Circle',
  },
  {
    id: 'shrimp',
    name: 'Shrimp grading',
    short: 'Shrimp',
    kind: 'livestock',
    blurb: 'Colour density is almost everything — solid, even colour right down the legs.',
    species: ['cherry_shrimp'],
    groups: ['freshwater_shrimp'],
    standard: { colour: 40, pattern: 15, form: 10, size: 10, condition: 15, deportment: 10 },
    formLabel: 'Shell & form',
    deportmentLabel: 'Settled & grazing',
    icon: 'Shell',
  },
  {
    id: 'open_fw',
    name: 'Open freshwater & brackish',
    short: 'Open freshwater',
    kind: 'livestock',
    blurb: 'Any other variety: judged against the best of its own species for form, colour and condition.',
    env: ['freshwater', 'brackish'],
    standard: FISH_STANDARD,
    open: true,
    icon: 'Droplets',
  },
  {
    id: 'open_marine',
    name: 'Open marine',
    short: 'Open marine',
    kind: 'livestock',
    blurb: 'Any other marine variety: form, colour and a calm, confident manner on the bench.',
    env: ['marine'],
    standard: FISH_STANDARD,
    open: true,
    icon: 'Waves',
  },
  {
    id: 'scape_nano',
    name: 'Nano aquascape (up to 20 gal)',
    short: 'Nano scape',
    kind: 'aquascape',
    blurb: 'A whole landscape in a small tank: composition, healthy growth and happy, suitably stocked animals.',
    scape: { maxGallons: 20 },
    standard: { composition: 45, living: 20, welfare: 15, clarity: 10, stocking: 10 },
    requires: 'photo_contests',
    icon: 'Sprout',
  },
  {
    id: 'scape_planted',
    name: 'Planted aquascape',
    short: 'Planted scape',
    kind: 'aquascape',
    blurb: 'Nature-aquarium layouts: a focal point, depth, open water and lush, healthy plants.',
    scape: { planted: true },
    standard: { composition: 40, living: 25, welfare: 15, clarity: 10, stocking: 10 },
    requires: 'photo_contests',
    icon: 'Leaf',
  },
  {
    id: 'scape_reef',
    name: 'Reef aquascape',
    short: 'Reef scape',
    kind: 'aquascape',
    blurb: 'Rockwork with flow and open sand, thriving corals and a reef-safe community.',
    scape: { reef: true },
    standard: { composition: 35, living: 30, welfare: 15, clarity: 10, stocking: 10 },
    requires: 'photo_contests',
    icon: 'Flower2',
  },
  {
    id: 'scape_biotope',
    name: 'Biotope',
    short: 'Biotope',
    kind: 'aquascape',
    blurb: 'A slice of one real habitat: animals from the same region, living as they would in the wild.',
    scape: { biotope: true },
    standard: { composition: 30, biotope: 25, living: 15, welfare: 15, clarity: 5, stocking: 10 },
    requires: 'photo_contests',
    icon: 'Mountain',
  },
];

export const SHOW_CLASS_BY_ID: Record<string, ShowClassDef> = byId(SHOW_CLASSES);

export const CRITERION_LABEL: Record<ShowCriterionKey, string> = {
  form: 'Form',
  colour: 'Colour',
  pattern: 'Pattern',
  size: 'Size & maturity',
  condition: 'Condition',
  deportment: 'Deportment',
  rarity: 'Morph',
  composition: 'Composition',
  living: 'Plant & coral health',
  welfare: 'Animal welfare',
  clarity: 'Clarity & upkeep',
  stocking: 'Stocking',
  biotope: 'Biotope accuracy',
};

// ───────────────────────────── rewards & rules ─────────────────────────────

/** Class purse split for 1st, 2nd and 3rd. Honourable Mentions get a rosette. */
export const PRIZE_SPLIT = [0.55, 0.27, 0.18] as const;
/** Reputation / XP by placing (1st, 2nd, 3rd, HM), as a fraction of the tier's class-win amount. */
export const PLACE_SHARE = [1, 0.6, 0.4, 0.2] as const;
/** XP for simply taking part (fraction of a win). */
export const ENTRY_XP_SHARE = 0.1;

/** Class wins at Regional or higher for the Champion title. */
export const CHAMPION_WINS = 3;
/** Further class wins at National or higher (after Champion) for Grand Champion. */
export const GRAND_CHAMPION_WINS = 3;

/** Humane entry rules — shows are for healthy, settled adults only. */
export const SHOW_RULES = {
  minHealth: 75,
  maxStress: 50,
  maxInjury: 10,
  maxHunger: 70,
  /** Hours an animal needs to settle after arriving in a tank before it can travel. */
  settleHours: 24,
  /** Rest between shows (game hours): two days to recover from travel. */
  restHours: 48,
  /** Stress an animal comes home with after a day on the show bench (before its bond with you softens it). */
  travelStress: 9,
} as const;

/** Breeding stages that keep an animal at home (never take a gravid, pregnant or brooding animal to a show). */
export const SHOW_BUSY_STAGES: Record<string, string> = {
  gravid: 'Gravid — carrying eggs',
  pregnant: 'Pregnant — carrying young in his pouch',
  berried: 'Carrying eggs under her tail',
  brooding: 'Brooding young',
  guarding: 'Guarding a clutch',
  laying: 'Laying eggs right now',
  spawning: 'Spawning right now',
  courting: 'Courting — best not to interrupt',
  depositing: 'Mid-courtship — best not to interrupt',
  following: 'Mid-courtship — best not to interrupt',
  nest_preparing: 'Preparing a nest with a partner',
  spent: 'Recovering from spawning',
  transitioning_female: 'Changing sex — needs calm',
};

// ───────────────────────────── schedule ─────────────────────────────

/** Game hours between consecutive shows on the calendar. */
export const SHOW_GAP_H: [number, number] = [16, 28];
/** Upcoming shows kept on the calendar. */
export const SHOWS_VISIBLE = 4;
/** Judging hour-of-day range (afternoons). */
export const JUDGING_HOUR: [number, number] = [11, 16];
/** Judged shows kept for the Results tab. */
export const SHOWS_KEPT = 10;
/** Finished entries kept (pending entries are never dropped). */
export const ENTRIES_KEPT = 32;
/** Trophy records kept. */
export const TROPHIES_KEPT = 60;
/** Ribbons kept on each animal's record. */
export const RIBBONS_KEPT = 12;

// ───────────────────────────── names ─────────────────────────────

export const SHOW_HOSTS: Record<ShowTier, string[]> = {
  club: ['Riverside Aquarium Club', 'Maple Hollow Fishkeepers', 'Harbourview Aquatic Society', 'Old Mill Aquarists', 'Northgate Fish Club', 'Willow Creek Aquarium Society', 'Lantern Bay Aquarists', 'Kingfisher Lane Fish Club'],
  regional: ['Tri-County Aquarium Expo', 'Lakeshore Aquatic Fair', 'Valley Aquarists’ Open', 'Coastal Fishkeeping Festival', 'Midlands Aquarium Show', 'Highland Aquatic Fair'],
  national: ['National Aquarium Championships', 'Grand National Fish & Aquascape Show', 'Fin & Frond National', 'Aquarists’ Guild National Championship'],
  international: ['World Aquatic Championship', 'International Living Aquarium Awards', 'Pacific Rim Aquatic Open', 'Global Aquascape & Fish Exposition'],
};

export const CLUB_SHOW_TITLES = ['Table Show', 'Members’ Show', 'Open Show', 'Spring Table Show', 'Autumn Table Show', 'Evening Show'];

export const SHOW_JUDGES = ['A. Okafor', 'M. Lindqvist', 'R. Takahashi', 'S. Moreau', 'J. Ferreira', 'D. Novak', 'E. Harlow', 'K. Mensah', 'L. Castellanos', 'P. Iyer', 'T. Brannigan', 'Y. Sato', 'H. Achterberg', 'N. Oduya'];

export const EXHIBITOR_SURNAMES = ['Adeyemi', 'Bergström', 'Carvalho', 'Dunmore', 'Esposito', 'Fairweather', 'Gallagher', 'Hollis', 'Ibarra', 'Jansen', 'Kowalski', 'Lindgren', 'Marchetti', 'Nakamura', 'Okonkwo', 'Pellegrini', 'Quinlan', 'Rasmussen', 'Salazar', 'Tanaka', 'Underwood', 'Vasquez', 'Whitlock', 'Yilmaz', 'Zhou'];

export const EXHIBIT_NAMES = ['Ruby Tide', 'Nimbus', 'Copper Moon', 'Saffron', 'Midnight Veil', 'Juniper', 'Starling', 'Ember Glow', 'Blue Lagoon', 'Marigold', 'Pebble', 'Tempest', 'Moonbeam', 'Rosehip', 'Cobalt', 'Fennel', 'Sparrow', 'Opal', 'Kestrel', 'Halcyon', 'Clementine', 'Sable', 'Mistral', 'Pippin', 'Aurora', 'Thistle', 'Indigo', 'Bramble'];

export const SCAPE_NAMES = ['Mossy Hollow', 'Quiet Current', 'Stone Garden', 'Morning Mist', 'Rainforest Edge', 'Reef Terrace', 'Hidden Valley', 'Driftwood Cathedral', 'Tidepool', 'Emerald Stream', 'Shallows at Dawn', 'The Old Riverbed', 'Coral Canyon', 'Fern Glade'];
