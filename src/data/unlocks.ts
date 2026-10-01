/**
 * Data-driven unlock rules: WHEN each key in src/data/unlockKeys.ts becomes available. OWNER: lane "facility".
 *
 * Every rule is a list of conditions that must ALL hold (use { type: 'any' } for alternatives). Conditions are
 * evaluated by src/sim/facility/progression.ts (`evalCond`). Research projects (src/data/research.ts) grant
 * unlocks directly as well, so a key can be reachable through play OR through research.
 *
 * Conditions only read real play: reputation, mastery earned from husbandry/breeding/aquascaping/sales/visitors,
 * counters bumped by the sim, what you own or have bred, and facility level. There is no disconnected XP grind.
 */
import type { FacilityLevelId, MasteryTrack } from '@/types';
import type { UnlockKey } from './unlockKeys';

export type Cond =
  | { type: 'reputation'; min: number }
  | { type: 'mastery'; track: MasteryTrack; min: number }
  /** Counter from progress.counters (aliases resolved: e.g. 'waterChanges' ≈ 'water_changes'). */
  | { type: 'counter'; key: string; min: number; label?: string }
  /** Distinct species kept alive right now (optionally a specific species or environment). */
  | { type: 'owns_species'; speciesId?: string; env?: 'freshwater' | 'marine'; min?: number }
  /** You have bred (raised offspring of) a species — or any species. */
  | { type: 'bred_species'; speciesId?: string; min?: number }
  /** Lifetime sale revenue ($). */
  | { type: 'total_sales'; min: number }
  /** Lifetime number of sales. */
  | { type: 'sales_count'; min: number }
  | { type: 'research'; id: string }
  /** Facility level at least this. */
  | { type: 'facility'; level: FacilityLevelId }
  | { type: 'unlocked'; key: string }
  /** Own at least `min` tanks (optionally of at least `minGallons`, or of a water environment). */
  | { type: 'tanks'; min: number; minGallons?: number; env?: 'freshwater' | 'marine' | 'brackish'; reef?: boolean } // lane:brackish: + 'brackish'
  /** Lifetime visitors. */
  | { type: 'visitors'; min: number }
  /**
   * Any tank at this beauty score. `scaped` = only tanks the player has aquascaped themselves (at least this many
   * place / move / remove edits in that tank), so a pre-built starter layout doesn't count on its own. `ownLayout`: the
   * tank must also be mostly the player's own layout (under half its pieces still where the gifted starter put them),
   * so a few nudges to the gift don't earn the top aquascaping honours (G2-01).
   */
  | { type: 'beauty'; min: number; scaped?: number; ownLayout?: boolean }
  | { type: 'flag'; flag: string; label?: string }
  | { type: 'tutorial_done' }
  | { type: 'money'; min: number }
  | { type: 'morphs'; min: number }
  | { type: 'any'; of: Cond[]; label?: string }
  | { type: 'all'; of: Cond[]; label?: string };

export interface UnlockRule {
  key: UnlockKey;
  /** All must hold. */
  when: Cond[];
  /** Short plain-language route shown on locked cards. */
  hint: string;
  /** Don't toast (e.g. background keys). */
  silent?: boolean;
}

/** Player edits (place / move / remove) a tank needs before its beauty counts toward aquascaping goals. */
export const SCAPED_EDITS = 3;

const rep = (min: number): Cond => ({ type: 'reputation', min });
const mastery = (track: MasteryTrack, min: number): Cond => ({ type: 'mastery', track, min });
const any = (...of: Cond[]): Cond => ({ type: 'any', of });
const fac = (level: FacilityLevelId): Cond => ({ type: 'facility', level });
const unlocked = (key: string): Cond => ({ type: 'unlocked', key });
const research = (id: string): Cond => ({ type: 'research', id });
const counter = (key: string, min: number, label?: string): Cond => ({ type: 'counter', key, min, label });

export const UNLOCK_RULES: UnlockRule[] = [
  // ── livestock groups ──
  { key: 'fw_basic', when: [any(rep(40), mastery('husbandry', 150))], hint: 'Reach 40 reputation or build husbandry mastery.' },
  { key: 'fw_coldwater', when: [any(research('coldwater_systems'), { type: 'all', of: [rep(90), mastery('husbandry', 250)] })], hint: 'Research Cool-water Systems, or reach 90 reputation with solid husbandry.' },
  { key: 'fw_intermediate', when: [unlocked('fw_basic'), rep(70), mastery('husbandry', 200)], hint: 'Keep freshwater tanks healthy: 70 reputation and 200 husbandry.' },
  { key: 'fw_advanced', when: [research('discus_husbandry')], hint: 'Research Discus Husbandry.' },
  { key: 'marine_basics', when: [any(research('marine_systems'), { type: 'all', of: [rep(150), mastery('husbandry', 400)] })], hint: 'Research Marine Systems (or reach 150 reputation as a seasoned keeper).' },
  { key: 'marine_seahorse', when: [any(research('seahorse_husbandry'), mastery('marine', 500))], hint: 'Research Seahorse Husbandry (after Marine Systems).' },
  { key: 'reef', when: [research('reef_systems')], hint: 'Research Reef Systems.' },
  { key: 'marine_large', when: [research('large_marine')], hint: 'Research Big-water Marine.' },
  { key: 'marine_advanced', when: [research('refugium_pods')], hint: 'Research Refugiums & Copepods.' },
  { key: 'predators', when: [research('predator_husbandry')], hint: 'Research Predator Husbandry.' },
  // lane:brackish — research it, or earn it as a seasoned freshwater keeper.
  { key: 'brackish', when: [any(research('brackish_estuaries'), { type: 'all', of: [unlocked('fw_intermediate'), rep(260), mastery('husbandry', 500)] })], hint: 'Research Brackish Estuaries (needs intermediate freshwater).' },

  // ── gear ──
  { key: 'gear_tier2', when: [any(rep(50), mastery('husbandry', 180), research('life_support_2'))], hint: 'Research Better Life Support, reach 50 reputation, or keep up regular care.' },
  { key: 'gear_tier3', when: [research('life_support_3')], hint: 'Research Premium Life Support.' },
  { key: 'gear_chiller', when: [any(unlocked('fw_coldwater'), rep(120))], hint: 'Comes with Cool-water Systems research, or at 120 reputation.' },
  { key: 'gear_skimmer', when: [unlocked('marine_basics'), any(rep(40), mastery('marine', 60))], hint: 'Comes with Marine Systems research (or keep a marine tank a little while).' },
  { key: 'gear_ato', when: [unlocked('marine_basics'), any(rep(70), mastery('marine', 120))], hint: 'Comes with Marine Systems research (or reach 70 reputation as a marine keeper).' },
  { key: 'gear_autofeeder', when: [any(mastery('husbandry', 220), research('life_support_2'))], hint: 'Research Better Life Support, or build husbandry mastery with regular care.' },
  { key: 'gear_co2', when: [unlocked('gear_tier2'), any(mastery('aquascaping', 200), research('planted_co2'))], hint: 'Research CO₂ & Planted Tanks, or build aquascaping mastery.' },

  // ── tanks ──
  { key: 'tank_40', when: [any(rep(25), counter('births', 1, 'Raise a clutch'))], hint: 'Reach 25 reputation or raise a clutch.' },
  { key: 'tank_55', when: [rep(60)], hint: 'Reach 60 reputation.' },
  { key: 'tank_75', when: [rep(100), fac('specialty_shop')], hint: 'Open a specialty shop and reach 100 reputation.' },
  { key: 'tank_90', when: [rep(150), fac('specialty_shop')], hint: 'Reach 150 reputation in your shop.' },
  { key: 'tank_125', when: [rep(210), fac('aquarium_store')], hint: 'Expand to an aquarium store and reach 210 reputation.' },
  { key: 'tank_180', when: [rep(280), fac('aquarium_store')], hint: 'Reach 280 reputation in your store.' },
  { key: 'tank_240', when: [rep(360), fac('showroom')], hint: 'Open a public showroom and reach 360 reputation.' },
  { key: 'tank_300', when: [rep(430), fac('showroom')], hint: 'Reach 430 reputation in your showroom.' },
  { key: 'tank_500', when: [any(research('acrylic_engineering'), { type: 'all', of: [rep(560), fac('destination')] })], hint: 'Research Acrylic Engineering, or grow into a destination aquarium.' },
  { key: 'tank_600', when: [any(research('acrylic_engineering'), { type: 'all', of: [rep(620), fac('destination')] })], hint: 'Research Acrylic Engineering.' },
  { key: 'tank_800', when: [any(research('grand_display'), { type: 'all', of: [rep(720), fac('destination'), { type: 'tanks', min: 1, minGallons: 300 }] })], hint: 'Run a 300-gallon exhibit at a destination aquarium, or research Grand Display Engineering.' },
  { key: 'tank_1000', when: [any(research('grand_display'), { type: 'all', of: [rep(800), fac('grand_hall')] })], hint: 'Research Grand Display Engineering or open the Grand Hall.' },

  // ── facility & features ──
  { key: 'market_listings', when: [any({ type: 'flag', flag: 'opened_market', label: 'Open the market' }, { type: 'tutorial_done' }, rep(10))], hint: 'Open the market once.' },
  { key: 'tank_auctions', when: [any({ type: 'sales_count', min: 3 }, mastery('business', 150), fac('specialty_shop'))], hint: 'Make three sales, or open a shop.' },
  { key: 'visitors', when: [fac('specialty_shop')], hint: 'Upgrade to a specialty shop to welcome paying visitors.' },
  { key: 'signage', when: [any(fac('specialty_shop'), rep(45), research('public_education'))], hint: 'Open a shop, reach 45 reputation, or research Public Education.' },
  { key: 'nursery', when: [any(counter('births', 1, 'Raise a clutch'), mastery('breeding', 40), rep(70), research('breeding_program'))], hint: 'Research the Breeding Programme, or reach 70 reputation.' },
  { key: 'genetics_lab', when: [research('genetics_lab')], hint: 'Research the Genetics Lab.' },
  { key: 'photo_contests', when: [any(mastery('aquascaping', 250), { type: 'beauty', min: 85, scaped: SCAPED_EDITS, ownLayout: true }, research('aquascape_awards'))], hint: 'Aquascape a tank yourself to beauty 85, or research Aquascape Awards.' },
  { key: 'party_mode', when: [any(rep(15), counter('feeds', 12, 'Feed 12 times'))], hint: 'Feed your animals 12 times, or reach 15 reputation.' }, // lane:qa-r3 — the real route
  // lane:shows — the show circuit opens after the guide; higher tiers need reputation, then a bigger venue
  { key: 'shows', when: [{ type: 'any', of: [{ type: 'tutorial_done' }, rep(20)], label: 'To finish the guide or reach 20 reputation' }], hint: 'Finish the guide or reach 20 reputation.' },
  { key: 'shows_regional', when: [unlocked('shows'), rep(120)], hint: 'Reach 120 reputation.' },
  { key: 'shows_national', when: [unlocked('shows_regional'), fac('aquarium_store'), rep(250)], hint: 'Expand to an aquarium store and reach 250 reputation.' },
  { key: 'shows_international', when: [unlocked('shows_national'), fac('showroom'), rep(450)], hint: 'Open a public showroom and reach 450 reputation.' },
  { key: 'facility_specialty_shop', when: [rep(100), any({ type: 'sales_count', min: 1 }, counter('friend_visits', 4, 'Host 4 friend visits'))], hint: 'Reach 100 reputation and make a sale (or host a few friends).' }, // lane:w2-sim: 60 → 100 (no shop before ~40 min of play)
  { key: 'facility_aquarium_store', when: [fac('specialty_shop'), rep(180), { type: 'visitors', min: 150 }, { type: 'tanks', min: 4 }], hint: 'Run your shop: 180 reputation, 150 visitors and 4 tanks.' },
  { key: 'facility_showroom', when: [fac('aquarium_store'), rep(350), { type: 'visitors', min: 800 }, { type: 'tanks', min: 7 }, mastery('exhibition', 300)], hint: '350 reputation, 800 visitors and 7 tanks.' },
  { key: 'facility_destination', when: [fac('showroom'), rep(550), { type: 'visitors', min: 3000 }, { type: 'tanks', min: 10 }], hint: '550 reputation, 3,000 visitors and 10 exhibits.' },
  { key: 'facility_grand_hall', when: [fac('destination'), rep(780), { type: 'visitors', min: 9000 }, { type: 'tanks', min: 1, minGallons: 500 }], hint: '780 reputation, 9,000 visitors and a 500-gallon showpiece.' },
  // lane:staff — staff come with the first shop (capacity grows with the facility, see src/data/staff.ts)
  { key: 'staff', when: [fac('specialty_shop')], hint: 'Move into a specialty shop to hire your first staff.' },

  // ── decor ──
  { key: 'decor_premium', when: [any(mastery('aquascaping', 150), rep(120), research('aquascape_awards'))], hint: 'Build aquascaping mastery, reach 120 reputation, or research Aquascape Awards.' },
  { key: 'decor_corals_soft', when: [unlocked('reef')], hint: 'Comes with Reef Systems.' },
  { key: 'decor_corals_lps', when: [unlocked('reef'), any(mastery('marine', 300), research('lps_corals'))], hint: 'Keep a reef healthy, or research LPS Corals.' },
  { key: 'decor_anemones', when: [unlocked('reef'), any(research('anemone_care'), mastery('marine', 500))], hint: 'Research Anemone Care.' },
  { key: 'decor_mangrove', when: [unlocked('brackish')], hint: 'Comes with Brackish Estuaries.' }, // lane:brackish
];

export const UNLOCK_RULE_BY_KEY: Record<string, UnlockRule> = Object.fromEntries(UNLOCK_RULES.map((r) => [r.key, r]));

/**
 * What each starter begins with. Freshwater starters get fw_basic (axolotl also cool-water + chillers); marine
 * starters get marine_basics (seahorse also marine_seahorse + skimmers). Everyone starts with tier-1 gear, the
 * sub-40 gallon tanks (unlock: null) and party mode is earned quickly.
 */
export const STARTER_UNLOCKS: Record<string, UnlockKey[]> = {
  axolotl: ['fw_basic', 'fw_coldwater', 'gear_chiller'],
  betta: ['fw_basic'],
  pea_puffer: ['fw_basic'],
  ocellaris_clownfish: ['marine_basics', 'gear_skimmer'],
  lined_seahorse: ['marine_basics', 'marine_seahorse', 'gear_skimmer'],
};

/** Unlock key for the starter species' own group (from the roster), used as a fallback for unknown starters. */
export const DEFAULT_STARTER_UNLOCKS: UnlockKey[] = ['fw_basic'];
