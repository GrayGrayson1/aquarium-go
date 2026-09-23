/**
 * Formatting helpers + human label maps for the management panels. OWNER: lane "ui-panels".
 */
import type {
  BuyerArchetype,
  CompatVerdict,
  GameEvent,
  LedgerEntry,
  LifeStage,
  ListingKind,
  PersonalityTag,
  TankPurpose,
  VisitorReaction,
  WaterClass,
  Difficulty,
  Rarity,
  Temperament,
  Diet,
  Environment,
  StatusLevel,
  Clutch,
} from '@/types';
import type { BadgeTone } from '@/ui/kit';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time'; // lane:w2-ui (realIn)

export const HOURS_PER_DAY = 24;

/** Compact duration in game time: "45 min", "5 h", "2 d 4 h". */
export function formatSpan(hours: number): string {
  const h = Math.max(0, Number.isFinite(hours) ? hours : 0);
  // lane:w2-ui — round first, then pick the unit, so 59.6 min reads "1 h" (not "60 min") and 23.6 h reads "1 day"
  // (not "24 h"), and 1 d 23.7 h reads "2 days" (not "1 d 24 h").
  if (h * 60 < 59.5) return `${Math.max(1, Math.round(h * 60))} min`;
  const hr = Math.round(h);
  if (hr < 24) return `${hr} h`;
  const d = Math.floor(hr / 24);
  const rest = hr - d * 24;
  return rest > 0 && d < 4 ? `${d} d ${rest} h` : `${d} ${d === 1 ? 'day' : 'days'}`;
}

/**
 * lane:w2-ui — "about 6 min": how long a span of GAME hours lasts in REAL time at 1× (1 game hour = 10 real seconds).
 * Market bids, counter replies and show deadlines are set in real time, so they are shown this way (moved here from
 * the Shows panel so both panels share one format).
 */
export function realIn(hours: number): string {
  const min = (Math.max(0, Number.isFinite(hours) ? hours : 0) / GAME_HOURS_PER_REAL_SECOND) / 60;
  if (min < 0.75) return 'under a minute';
  if (min < 59.5) return `about ${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m >= 5 && m < 60 ? `about ${h} h ${m} min` : `about ${m >= 60 ? h + 1 : h} h`;
}

/** lane:w2-ui — "about 2 min ago" / "just now" (real time at 1×), the past-tense twin of `realIn`. */
export function realAgo(hours: number): string {
  const min = (Math.max(0, Number.isFinite(hours) ? hours : 0) / GAME_HOURS_PER_REAL_SECOND) / 60;
  return min < 0.75 ? 'just now' : `${realIn(hours)} ago`;
}

/** Relative game time for past events: "just now", "3 h ago", "yesterday", "4 days ago". */
export function relTime(hour: number, now: number): string {
  const dh = now - hour;
  if (dh < 0.25) return 'just now';
  // lane:w2-ui — no "60 min ago" / "24 h ago" at the unit edges
  if (dh * 60 < 59.5) return `${Math.round(dh * 60)} min ago`;
  if (dh < 23.5) return `${Math.round(dh)} h ago`;
  const days = Math.floor(dh / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Time until a future game hour: "in 5 h", "ending now". */
export function untilTime(hour: number, now: number): string {
  const dh = hour - now;
  if (dh <= 0) return 'ending now';
  return `in ${formatSpan(dh)}`;
}

export const dayOfHour = (hour: number) => Math.floor(hour / HOURS_PER_DAY) + 1;

export function pct(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function round(v: number, step = 1): number {
  return Math.round(v / step) * step;
}

/** Price rounding that feels natural ($5 steps under $200, $10 under $1k, $50 above). */
export function nicePrice(v: number): number {
  if (!isFinite(v) || v <= 0) return 0;
  if (v < 20) return Math.max(1, Math.round(v));
  if (v < 200) return round(v, 5);
  if (v < 1000) return round(v, 10);
  return round(v, 50);
}

export const WATER_CLASS_LABEL: Record<WaterClass, string> = {
  freshwater_cool: 'Cool freshwater',
  freshwater_tropical: 'Tropical freshwater',
  freshwater_planted: 'Planted freshwater',
  marine_fowlr: 'Marine fish-only',
  marine_live_rock: 'Marine with live rock',
  reef: 'Reef',
  brackish: 'Brackish',
};

export const WATER_CLASS_BLURB: Record<WaterClass, string> = {
  freshwater_cool: 'Unheated, clear and gentle. Axolotls, goldfish and white clouds.',
  freshwater_tropical: 'Warm community water for tetras, livebearers and bettas.',
  freshwater_planted: 'Warm water with rich soil and bright light for lush plants.',
  marine_fowlr: 'Saltwater for hardy fish. Simple and robust.',
  marine_live_rock: 'Saltwater with living rock — natural filtration and grazing.',
  reef: 'Stable saltwater and strong light for corals and anemones.',
  brackish: 'Part-salt estuary water (SG about 1.004–1.012) for puffers, gobies, mollies and archerfish.', // lane:brackish
};

/** Colour tint per water class (used by glyphs + tank cards). */
export const WATER_CLASS_TINT: Record<WaterClass, [string, string]> = {
  freshwater_cool: ['#7fd6cf', '#1c5a63'],
  freshwater_tropical: ['#9ad8a8', '#1d5a4a'],
  freshwater_planted: ['#c8dc7c', '#2c5a2a'],
  marine_fowlr: ['#6fd3f2', '#0d4a7a'],
  marine_live_rock: ['#7ccfe6', '#123f6e'],
  reef: ['#8aa2ff', '#1a2780'],
  brackish: ['#b4d2a8', '#2c5a4f'], // lane:brackish — olive shallows to teal depths
};

export const PLAYABLE_WATER_CLASSES: WaterClass[] = [
  'freshwater_cool',
  'freshwater_tropical',
  'freshwater_planted',
  'brackish', // lane:brackish — unlocked by Brackish Estuaries research
  'marine_fowlr',
  'marine_live_rock',
  'reef',
];

export const ENV_LABEL: Record<Environment, string> = { freshwater: 'Freshwater', marine: 'Marine', brackish: 'Brackish' };

export const PURPOSE_LABEL: Record<TankPurpose, string> = {
  display: 'Display',
  nursery: 'Nursery',
  quarantine: 'Quarantine',
  breeding: 'Breeding',
};

export const PURPOSE_HINT: Record<TankPurpose, string> = {
  display: 'Shown to visitors and scored as an exhibit.',
  nursery: 'Safe rearing for eggs and fry — no hungry adults.',
  quarantine: 'Observe new arrivals before they join a display.',
  breeding: 'Conditioning and spawning away from tank mates.',
};

export const VERDICT_LABEL: Record<CompatVerdict, string> = {
  excellent: 'Excellent match',
  usually_compatible: 'Usually compatible',
  conditional: 'Conditional',
  high_risk: 'High risk',
  incompatible: 'Incompatible',
};

export function verdictStatus(v: CompatVerdict): StatusLevel {
  if (v === 'excellent' || v === 'usually_compatible') return 'good';
  if (v === 'conditional') return 'watch';
  return 'danger';
}

export const VERDICT_RANK: Record<CompatVerdict, number> = {
  excellent: 0,
  usually_compatible: 1,
  conditional: 2,
  high_risk: 3,
  incompatible: 4,
};

export const ARCHETYPE_LABEL: Record<BuyerArchetype, string> = {
  beginner: 'Beginner hobbyist',
  experienced_keeper: 'Experienced keeper',
  breeder: 'Breeder',
  collector: 'Collector',
  aquascaper: 'Aquascaper',
  family: 'Family',
  public_aquarium: 'Public aquarium',
  conservation: 'Conservation buyer',
  bargain_hunter: 'Bargain hunter',
};

export const LISTING_KIND_LABEL: Record<ListingKind, string> = {
  creature: 'Single animal',
  group: 'Group',
  pair: 'Breeding pair',
  juveniles: 'Juveniles',
  tank: 'Whole aquarium',
  frag: 'Frags & cuttings', // lane:frags
};

export const PERSONALITY_LABEL: Record<PersonalityTag, string> = {
  bold: 'Bold',
  shy: 'Shy',
  explorer: 'Explorer',
  food_obsessed: 'Food obsessed',
  glass_curious: 'Glass curious',
  nest_builder: 'Nest builder',
  homebody: 'Homebody',
  social: 'Social',
  solitary: 'Solitary',
  night_owl: 'Night owl',
  showoff: 'Show-off',
  easily_startled: 'Easily startled',
  patient_feeder: 'Patient feeder',
  competitive_feeder: 'Competitive feeder',
  decor_inspector: 'Decor inspector',
};

export type ChipTone = BadgeTone | 'coral';

export const PERSONALITY_TONE: Partial<Record<PersonalityTag, ChipTone>> = {
  bold: 'coral',
  showoff: 'gold',
  shy: 'violet',
  easily_startled: 'violet',
  explorer: 'aqua',
  glass_curious: 'aqua',
  social: 'good',
  night_owl: 'violet',
};

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  egg: 'Egg',
  larva: 'Larva',
  fry: 'Fry',
  juvenile: 'Juvenile',
  adult: 'Adult',
  elder: 'Elder',
};

export const CLUTCH_STAGE_LABEL: Record<Clutch['stage'], string> = {
  eggs: 'Eggs',
  in_pouch: 'In the pouch',
  larvae: 'Larvae',
  fry: 'Free-swimming fry',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export const DIFFICULTY_TONE: Record<Difficulty, BadgeTone> = {
  beginner: 'good',
  intermediate: 'aqua',
  advanced: 'watch',
  expert: 'danger',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very rare',
  legendary: 'Legendary',
};

export const RARITY_TONE: Record<Rarity, BadgeTone> = {
  common: 'neutral',
  uncommon: 'aqua',
  rare: 'violet',
  very_rare: 'gold',
  legendary: 'gold',
};

export const TEMPERAMENT_LABEL: Record<Temperament, string> = {
  peaceful: 'Peaceful',
  semi_aggressive: 'Semi-aggressive',
  aggressive: 'Aggressive',
  predatory: 'Predatory',
};

export const DIET_LABEL: Record<Diet, string> = {
  carnivore: 'Carnivore',
  omnivore: 'Omnivore',
  herbivore: 'Herbivore',
  planktivore: 'Planktivore',
  detritivore: 'Detritivore',
  photosynthetic: 'Photosynthetic',
};

export const LEDGER_LABEL: Record<LedgerEntry['category'], string> = {
  livestock_sale: 'Livestock sales',
  tank_sale: 'Aquarium sales',
  admission: 'Admissions',
  tips: 'Tips & donations',
  quest: 'Quest rewards',
  award: 'Awards',
  livestock_purchase: 'Livestock',
  tank_purchase: 'Tanks',
  equipment: 'Equipment',
  decor: 'Decor',
  food: 'Food',
  consumables: 'Salt & supplies',
  operating: 'Operating costs',
  facility: 'Facility',
  research: 'Research',
  other: 'Other',
};

export const LOG_KIND_LABEL: Record<GameEvent['kind'], string> = {
  info: 'Info',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Urgent',
  celebrate: 'Milestone',
  breeding: 'Breeding',
  market: 'Market',
  visitor: 'Visitors',
  death: 'Loss',
  unlock: 'Unlock',
};

export const MOOD_LABEL: Record<VisitorReaction['mood'], string> = {
  wow: 'Amazed',
  happy: 'Happy',
  neutral: 'Neutral',
  bored: 'Bored',
  concerned: 'Concerned',
};

export const SEX_LABEL = { male: 'Male', female: 'Female', unknown: 'Unsexed' } as const;

export function titleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Mochi, Pip and 3 others" */
export function nameList(names: string[], max = 3): string {
  if (names.length === 0) return '';
  if (names.length <= max) {
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}

/** Deterministic string hash → 32-bit uint (cosmetic use only). */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const FOOD_TAG_LABEL: Record<string, string> = {
  flake: 'flakes',
  pellet_small: 'small pellets',
  pellet_sinking: 'sinking pellets',
  pellet_large: 'large pellets',
  bloodworm: 'bloodworms',
  brine_shrimp: 'brine shrimp',
  mysis: 'mysis shrimp',
  daphnia: 'daphnia',
  earthworm: 'earthworms',
  snail_live: 'live snails',
  algae_wafer: 'algae wafers',
  vegetable: 'vegetables',
  nori: 'nori',
  copepod_live: 'live copepods',
  coral_food: 'coral food',
  biofilm: 'biofilm',
  detritus: 'detritus',
  infusoria: 'infusoria',
  baby_brine: 'baby brine shrimp',
};
