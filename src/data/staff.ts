/**
 * Staff data: roles, traits, wages, facility capacity and the name pool for generated candidates. OWNER: lane "staff".
 * The simulation lives in src/sim/staff; the UI in src/ui/panels/visitors/StaffTab.tsx.
 *
 * Balance (see docs/GAME_DESIGN.md "Facility arc"): wages are sized against rent and takings so one keeper is a real
 * choice at the specialty shop (rent $30, takings ~$150–300 a day), comfortably worth it at the aquarium store (rent
 * $150, takings ~$1k) and routine at the showroom and beyond. Staff never replace the player's own bond with the
 * animals: keeper care feeds and cleans, but only the player's hand care raises a creature's familiarity.
 */
import type { FacilityLevelId, StaffRole, StaffTrait } from '@/types';

export interface StaffRoleDef {
  id: StaffRole;
  label: string;
  /** Plural label ("Aquarists"). */
  plural: string;
  /** One line for the hiring card. */
  blurb: string;
  /** Wage at skill 1 and skill 5 ($/day); linear in between, rounded to whole dollars. */
  wage: [number, number];
  /** Most of this role one venue can use (the stock manager is a single post). */
  max?: number;
}

export const STAFF_ROLES: Record<StaffRole, StaffRoleDef> = {
  aquarist: {
    id: 'aquarist',
    label: 'Aquarist',
    plural: 'Aquarists',
    // lane:staff2 — fast-metabolism tanks get small meals up to four times a day (src/sim/staff/work.ts mealsPerDay)
    blurb: 'Feeds assigned tanks two to four times a day, changes water when nitrate climbs, keeps the glass clean. Never breeds, moves or sells animals.',
    wage: [60, 160],
  },
  stock_manager: {
    id: 'stock_manager',
    label: 'Stock manager',
    plural: 'Stock managers',
    blurb: 'Reorders foods and salt before they run out, within a daily budget you set.',
    wage: [40, 80],
    max: 1,
  },
  docent: {
    id: 'docent',
    label: 'Docent',
    plural: 'Docents',
    blurb: 'Talks visitors through your exhibits: happier guests, more learning, more donations.',
    wage: [70, 140],
  },
};

export const STAFF_ROLE_ORDER: StaffRole[] = ['aquarist', 'stock_manager', 'docent'];

export interface StaffTraitDef {
  id: StaffTrait;
  label: string;
  /** Short line shown under the name ("never misses a feed"). */
  line: string;
  /** Roles this trait can roll for. */
  roles: StaffRole[];
}

export const STAFF_TRAITS: Record<StaffTrait, StaffTraitDef> = {
  meticulous: { id: 'meticulous', label: 'Meticulous', line: 'never misses a feed — checks hungry animals again at midday', roles: ['aquarist'] },
  gentle_hands: { id: 'gentle_hands', label: 'Gentle hands', line: 'matches new water exactly, so water changes never shock anyone', roles: ['aquarist'] },
  algae_hunter: { id: 'algae_hunter', label: 'Algae hunter', line: 'scrapes the glass at the first green haze', roles: ['aquarist'] },
  reef_minded: { id: 'reef_minded', label: 'Reef-minded', line: 'at home with salt water — marine tanks take less of their time', roles: ['aquarist'] },
  quick_learner: { id: 'quick_learner', label: 'Quick learner', line: 'picks up experience half again as fast', roles: ['aquarist', 'stock_manager', 'docent'] },
  early_bird: { id: 'early_bird', label: 'Early bird', line: 'first in every morning — the day’s work starts an hour early', roles: ['aquarist', 'stock_manager', 'docent'] },
  planner: { id: 'planner', label: 'Planner', line: 'keeps a couple of extra days of food on the shelf', roles: ['stock_manager'] },
  thrifty: { id: 'thrifty', label: 'Thrifty', line: 'orders one pack at a time and always the best value', roles: ['stock_manager'] },
  great_with_kids: { id: 'great_with_kids', label: 'Great with kids', line: 'families and school groups hang on every word', roles: ['docent'] },
  storyteller: { id: 'storyteller', label: 'Storyteller', line: 'talks that leave people reaching for the donation box', roles: ['docent'] },
};

/** Most staff the venue can employ at each facility level. */
export const STAFF_CAPACITY: Record<FacilityLevelId, number> = {
  hobby_room: 0,
  specialty_shop: 2,
  aquarium_store: 4,
  showroom: 6,
  destination: 8,
  grand_hall: 10,
};

/** Candidates in the hiring pool at each facility level. */
export const STAFF_POOL_SIZE: Record<FacilityLevelId, number> = {
  hobby_room: 0,
  specialty_shop: 3,
  aquarium_store: 4,
  showroom: 5,
  destination: 5,
  grand_hall: 6,
};

/** The candidate pool refreshes every this many game days (at 8 AM). */
export const STAFF_POOL_REFRESH_DAYS = 3;
/** Midnights without pay before someone leaves (they give notice on the first one). */
export const STAFF_NOTICE_DAYS = 3;
/** Days of experience to go from skill s to s + 1 is XP_PER_LEVEL × s (so 1→2 takes 8 days, 4→5 takes 32). */
export const STAFF_XP_PER_LEVEL = 8;

/** Default and maximum stock-manager budget ($/day) by facility level. */
export const STOCK_BUDGET: Record<FacilityLevelId, { default: number; max: number }> = {
  hobby_room: { default: 40, max: 100 },
  specialty_shop: { default: 40, max: 150 },
  aquarium_store: { default: 80, max: 300 },
  showroom: { default: 150, max: 600 },
  destination: { default: 250, max: 1000 },
  grand_hall: { default: 400, max: 1500 },
};

export function staffWage(role: StaffRole, skill: number): number {
  const [lo, hi] = STAFF_ROLES[role].wage;
  const s = Math.max(1, Math.min(5, Math.round(skill)));
  return Math.round(lo + ((hi - lo) * (s - 1)) / 4);
}

/**
 * Aquarist workload capacity in "tank units". A tank costs 0.75 + 0.5·√(gallons/40) units: a 10-gallon nano ≈ 1,
 * a 125-gallon ≈ 1.6, the 1,000-gallon display ≈ 3.3 — bigger tanks take longer, but not linearly longer.
 */
export function aquaristCapacity(skill: number): number {
  const s = Math.max(1, Math.min(5, Math.round(skill)));
  return 4 + 1.5 * (s - 1);
}

export function tankCareUnits(gallons: number, marine: boolean, trait?: StaffTrait): number {
  const g = Number.isFinite(gallons) && gallons > 0 ? gallons : 20;
  const units = 0.75 + 0.5 * Math.sqrt(g / 40);
  return marine && trait === 'reef_minded' ? units * 0.8 : units;
}

/** Exhibits one docent covers in their talks and floor time. */
export function docentReach(skill: number): number {
  return 3 + Math.max(1, Math.min(5, Math.round(skill)));
}

// Original, everyday names from many backgrounds (no real people). Combined as "First Last".
export const STAFF_FIRST_NAMES = [
  'Maya', 'Theo', 'Priya', 'Jonah', 'Amara', 'Luis', 'Keiko', 'Owen', 'Zara', 'Mateo', 'Ingrid', 'Kofi', 'Rosa', 'Felix',
  'Hana', 'Dev', 'Lena', 'Samir', 'Noor', 'Callum', 'Ines', 'Tariq', 'Mei', 'Bram', 'Leila', 'Rafael', 'Aiko', 'Nadia',
  'Ezra', 'Sofia', 'Kwame', 'Freya', 'Arjun', 'Lucia', 'Tomas', 'Yara', 'Emeka', 'Clara', 'Jin', 'Marisol', 'Ravi',
  'Elsie', 'Hugo', 'Anika', 'Dario', 'Wren', 'Idris', 'Beatriz', 'Niko', 'Esme', 'Kai', 'Talia', 'Omar', 'Greta',
];

export const STAFF_LAST_NAMES = [
  'Okafor', 'Lindqvist', 'Rahman', 'Castillo', 'Nakamura', 'Brennan', 'Mensah', 'Duarte', 'Kowalski', 'Haddad', 'Reyes',
  'Sato', 'Abara', 'Moreau', 'Patel', 'Novak', 'Ferreira', 'Osei', 'Larsen', 'Takeda', 'Quinn', 'Adeyemi', 'Varga',
  'Morales', 'Chen', 'Bianchi', 'Nwosu', 'Holm', 'Serrano', 'Iqbal', 'Keane', 'Ruiz', 'Yilmaz', 'Park', 'Achebe', 'Moss',
];

/** Star string for a skill level ("★★★☆☆" or compact "★★★"). */
export function skillStars(skill: number, full = false): string {
  const s = Math.max(0, Math.min(5, Math.round(skill)));
  return full ? '★'.repeat(s) + '☆'.repeat(5 - s) : '★'.repeat(s);
}
