/**
 * The facility rooms' machines and supplies (DESIGN-S3D §4, §8.4, §9.2, §9.3). OWNER: lane "automation" (chunk 5).
 *
 * Finishing Central Water Supply installs the Water room (a prep station, the fresh and salt reserves and a salt mixing
 * station); finishing Live Food Cultures installs the Live food room (two hatchery cones and four infusoria jars)
 * (ADR-0026 decision 8). Upgrades and add-ons are bought in Build › Facility; live-food dosers are tank equipment
 * (src/data/catalog/equipment.ts, `live_food_doser`) bought from the tank card. Prices, upkeep and the upgrades' numbers
 * are placeholders set in chunk 5 (ADR-0014 decision 17); the timings and yields are the design's.
 */

/** The Water room's numbers. */
export const WATER_ROOM = {
  /** Prep station output (gal an hour) by upgrade level, and the price of each next level ("Faster · $380"). */
  prepRates: [6, 9, 12] as const,
  prepPrices: [380, 760] as const,
  /** Reserves (gal) before upgrades, and what each Reservoir upgrade adds ("+150 gal · $240"). */
  freshCap: 150,
  saltCap: 60,
  reservoirFresh: 150,
  reservoirSalt: 60,
  reservoirPrice: 240,
  maxReservoirs: 3,
  /** Salt mixing: checks at 10 AM and 10 PM; a batch starts while salt water is below this share of its reserve. */
  mixHours: [10, 22] as const,
  mixBelow: 0.6,
  mixHoursLong: 12,
  /** Salt water a mixed batch makes (SPEC §9.2, AUTO-032: 30 gal and 4.1 kg, whatever the reserve's size). */
  batchGal: 30,
  /** Running costs ($ a day). */
  prepUpkeep: 0.4,
  mixerUpkeep: 0.3,
} as const;

/** The salinity the mixer makes salt water at (full-strength sea water); src/sim/automation works out the salt it takes. */
export const RESERVE_SG = 1.025;

/** The Live food room's numbers. */
export const FOOD_ROOM = {
  /** Hatchery cones: 24 h each; a start takes 1 scoop of eggs and 0.5 gal of salt water; a harvest gives 20 servings. */
  coneHours: 24,
  coneYield: 20,
  coneSaltGal: 0.5,
  /** Infusoria jars: 72 h each; a start takes 1 serving of Blanched Vegetables; a harvest gives 15 servings. */
  jarHours: 72,
  jarYield: 15,
  baseCones: 2,
  baseJars: 4,
  maxCones: 6,
  maxJars: 8,
  conePrice: 150,
  jarPrice: 40,
  /** Running costs ($ a day) per cone and per jar. */
  coneUpkeep: 0.1,
  jarUpkeep: 0.02,
  /**
   * Live food never expires; the room stores a limited amount (ADR-0026 decision 7): a few days of what it makes. A
   * harvest that would pass it waits ("Full"). Bought packs aren't limited.
   */
  storePerCone: 60,
  storePerJar: 20,
} as const;

/** The live foods the room makes, and what each culture uses. */
export const BRINE = 'baby_brine_live';
export const INFUSORIA = 'infusoria_culture';
export const VEGETABLES = 'blanched_veg';

/** Supplies that aren't foods (the Market › Supplies route reserves their ids: `#/market/supplies/salt` …). */
export const EGGS_SUPPLY = { id: 'brine_shrimp_eggs', name: 'Brine shrimp eggs', price: 18, scoops: 30 } as const;
export const SALT_SUPPLY_ID = 'salt';

/** Salt mix bag sizes sold in Market › Supplies (kg; $3 a kg). The 40 kg bag is new in chunk 5 (DESIGN-S3D decision 16). */
export const SALT_BAGS = [5, 20, 40] as const;

/** Live-food doser: the hours it feeds (three a day), and the young each serving covers. */
export const DOSER = { hours: [8, 14, 20] as const, youngPerServing: 20 } as const;
