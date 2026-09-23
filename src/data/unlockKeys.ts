/**
 * Canonical unlock keys. OWNER: core (keys) — the facility lane defines WHEN each unlocks in src/data/unlocks.ts.
 * Species use group keys in `unlock.requires`; catalog items use `unlock: key | null`.
 */
export const UNLOCK_KEYS = {
  // livestock groups
  fw_basic: 'Beginner freshwater community fish & invertebrates',
  fw_coldwater: 'Cool-water systems (axolotls, goldfish) — needs chiller know-how',
  fw_intermediate: 'Intermediate freshwater species',
  fw_advanced: 'Advanced freshwater (discus)',
  marine_basics: 'Beginner marine fish & clean-up crew',
  marine_seahorse: 'Seahorse husbandry',
  reef: 'Reef systems: corals & anemones',
  marine_large: 'Large open-water marine fish (tangs) — needs big tanks',
  marine_advanced: 'Advanced marine specialists (mandarin dragonet)',
  predators: 'Predator exhibits (mantis shrimp, lionfish, grouper)',
  brackish: 'Brackish estuary fish (puffers, gobies, mollies, archerfish)', // lane:brackish
  // gear
  gear_tier2: 'Better filters, heaters, lights',
  gear_tier3: 'Premium equipment (sumps, reef lighting, large chillers)',
  gear_chiller: 'Chillers',
  gear_skimmer: 'Protein skimmers',
  gear_ato: 'Auto top-off',
  gear_autofeeder: 'Auto-feeders',
  gear_co2: 'CO₂ injection for planted tanks',
  // tanks (see src/data/catalog/tanks.ts)
  tank_40: '40 gal breeder',
  tank_55: '55 gal',
  tank_75: '75 gal',
  tank_90: '90 gal',
  tank_125: '125 gal',
  tank_180: '180 gal',
  tank_240: '240 gal',
  tank_300: '300 gal',
  tank_500: '500 gal',
  tank_600: '600 gal',
  tank_800: '800 gal',
  tank_1000: '1,000 gal grand display',
  // facility & features
  market_listings: 'Sell on the marketplace (auctions)',
  tank_auctions: 'Auction whole aquariums',
  visitors: 'Open to visitors',
  signage: 'Educational signage',
  nursery: 'Nursery & breeding tanks',
  genetics_lab: 'Reveal precise genetics',
  photo_contests: 'Aquascape awards',
  party_mode: 'Party / music mode',
  // lane:shows — show circuit tiers (src/sim/shows); aquascape classes also need photo_contests
  shows: 'Shows & championships (club shows)',
  shows_regional: 'Regional shows',
  shows_national: 'National championships',
  shows_international: 'International championships',
  facility_specialty_shop: 'Small specialty shop',
  facility_aquarium_store: 'Expanded aquarium store',
  facility_showroom: 'Public showroom',
  facility_destination: 'Destination aquarium',
  facility_grand_hall: 'Grand hall',
  staff: 'Hire staff: aquarists, a stock manager and docents', // lane:staff
  // decor
  decor_premium: 'Premium hardscape',
  decor_corals_soft: 'Soft corals & zoanthids',
  decor_corals_lps: 'LPS corals',
  decor_anemones: 'Anemones (host for clownfish)',
  decor_mangrove: 'Mangrove roots & estuary hardscape', // lane:brackish
} as const;

export type UnlockKey = keyof typeof UNLOCK_KEYS;
