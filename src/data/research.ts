/**
 * Research projects: spend money + game time to learn a new kind of fishkeeping. OWNER: lane "facility".
 * One project runs at a time; progress advances with game time in stepProgression.
 * `requires` uses the shared condition language from ./unlocks.
 */
import type { MasteryTrack } from '@/types';
import type { Cond } from './unlocks';
import type { UnlockKey } from './unlockKeys';

export interface ResearchDef {
  id: string;
  name: string;
  /** One or two sentences, plain language. */
  blurb: string;
  cost: number;
  /** Game hours of study (1 game day = 24 h = 4 real minutes at 1×). */
  hours: number;
  requires: Cond[];
  grants: UnlockKey[];
  /** Mastery XP awarded on completion. */
  track: MasteryTrack;
  xp: number;
  /** Lucide icon name hint for the UI. */
  icon: string;
  branch: 'freshwater' | 'marine' | 'breeding' | 'gear' | 'exhibition';
}

export const RESEARCH: ResearchDef[] = [
  // ── gear ──
  { id: 'life_support_2', name: 'Better Life Support', blurb: 'Quieter canister filters, precise heaters and brighter LEDs — plus autofeeders for busy weeks. They hold dry food only, so they suit flake and pellet eaters, not seahorses or puffers.', cost: 250, hours: 16, requires: [], grants: ['gear_tier2', 'gear_autofeeder'], track: 'husbandry', xp: 40, icon: 'Cpu', branch: 'gear' },
  { id: 'planted_co2', name: 'CO₂ & Planted Tanks', blurb: 'Injected CO₂ and planted-tank lighting for lush, pearling carpets.', cost: 350, hours: 20, requires: [{ type: 'unlocked', key: 'gear_tier2' }], grants: ['gear_co2'], track: 'aquascaping', xp: 40, icon: 'Sprout', branch: 'gear' },
  { id: 'life_support_3', name: 'Premium Life Support', blurb: 'Sumps, reef-grade lighting and large chillers for serious systems.', cost: 3000, hours: 72, requires: [{ type: 'unlocked', key: 'gear_tier2' }, { type: 'facility', level: 'aquarium_store' }], grants: ['gear_tier3', 'gear_ato'], track: 'husbandry', xp: 120, icon: 'Server', branch: 'gear' },

  // ── freshwater ──
  { id: 'coldwater_systems', name: 'Cool-water Systems', blurb: 'Chillers and fans for axolotls, goldfish and other animals that need cool, clean water.', cost: 300, hours: 20, requires: [], grants: ['fw_coldwater', 'gear_chiller'], track: 'husbandry', xp: 40, icon: 'Snowflake', branch: 'freshwater' },
  { id: 'discus_husbandry', name: 'Discus Husbandry', blurb: 'Soft, warm, spotless water and big water changes: the king of the aquarium.', cost: 1500, hours: 48, requires: [{ type: 'unlocked', key: 'fw_intermediate' }], grants: ['fw_advanced'], track: 'husbandry', xp: 100, icon: 'Crown', branch: 'freshwater' },
  // lane:brackish — the estuary chapter: part-salt water, hydrometers and mangrove roots (after intermediate freshwater).
  { id: 'brackish_estuaries', name: 'Brackish Estuaries', blurb: 'Where rivers meet the sea: part-strength salt water, a hydrometer and mangrove roots. Opens figure-eight puffers, bumblebee gobies, mollies and archerfish.', cost: 1200, hours: 40, requires: [{ type: 'unlocked', key: 'fw_intermediate' }], grants: ['brackish', 'decor_mangrove'], track: 'husbandry', xp: 100, icon: 'Droplets', branch: 'freshwater' },

  // ── breeding ──
  { id: 'breeding_program', name: 'Breeding Programme', blurb: 'Nursery tanks, fry foods and separation plans so more young survive.', cost: 300, hours: 18, requires: [], grants: ['nursery'], track: 'breeding', xp: 40, icon: 'Egg', branch: 'breeding' },
  { id: 'genetics_lab', name: 'Genetics Lab', blurb: 'Reveal precise allele-level genetics and plan morph lines with confidence.', cost: 1200, hours: 48, requires: [{ type: 'unlocked', key: 'nursery' }, { type: 'mastery', track: 'breeding', min: 60 }], grants: ['genetics_lab'], track: 'breeding', xp: 120, icon: 'Dna', branch: 'breeding' },

  // ── marine ──
  { id: 'marine_systems', name: 'Marine Systems', blurb: 'Salt mixing, live rock and protein skimmers — your first step into saltwater.', cost: 600, hours: 30, requires: [], grants: ['marine_basics', 'gear_skimmer', 'gear_ato'], track: 'marine', xp: 60, icon: 'Waves', branch: 'marine' },
  { id: 'seahorse_husbandry', name: 'Seahorse Husbandry', blurb: 'Gentle flow, hitching forests and slow target-feeding of frozen mysis for seahorses, which won’t eat flakes or pellets.', cost: 800, hours: 36, requires: [{ type: 'unlocked', key: 'marine_basics' }], grants: ['marine_seahorse'], track: 'marine', xp: 80, icon: 'Anchor', branch: 'marine' },
  { id: 'reef_systems', name: 'Reef Systems', blurb: 'Stable alkalinity, reef lighting and your first soft corals.', cost: 1500, hours: 48, requires: [{ type: 'unlocked', key: 'marine_basics' }, { type: 'unlocked', key: 'gear_tier2' }], grants: ['reef', 'decor_corals_soft'], track: 'marine', xp: 120, icon: 'Flower2', branch: 'marine' },
  { id: 'lps_corals', name: 'LPS Corals', blurb: 'Large-polyp stony corals: hammer, torch and frogspawn.', cost: 1800, hours: 48, requires: [{ type: 'unlocked', key: 'reef' }], grants: ['decor_corals_lps'], track: 'marine', xp: 100, icon: 'Flower', branch: 'marine' },
  { id: 'anemone_care', name: 'Anemone Care', blurb: 'Mature reefs, strong light and patience — a true host for clownfish.', cost: 2000, hours: 60, requires: [{ type: 'unlocked', key: 'reef' }], grants: ['decor_anemones'], track: 'marine', xp: 120, icon: 'Sparkle', branch: 'marine' },
  { id: 'refugium_pods', name: 'Refugiums & Copepods', blurb: 'Grow copepods in a refugium so pod-eating specialists can thrive.', cost: 2500, hours: 60, requires: [{ type: 'unlocked', key: 'reef' }], grants: ['marine_advanced'], track: 'marine', xp: 140, icon: 'Bug', branch: 'marine' },
  { id: 'large_marine', name: 'Big-water Marine', blurb: 'Open-water fish like tangs need long tanks and powerful circulation.', cost: 4000, hours: 72, requires: [{ type: 'unlocked', key: 'marine_basics' }, { type: 'unlocked', key: 'tank_180' }], grants: ['marine_large'], track: 'marine', xp: 160, icon: 'Fish', branch: 'marine' },
  { id: 'predator_husbandry', name: 'Predator Husbandry', blurb: 'Safe handling, species-only systems and feeding plans for mantis shrimp, lionfish and groupers.', cost: 5000, hours: 96, requires: [{ type: 'unlocked', key: 'marine_basics' }, { type: 'facility', level: 'showroom' }], grants: ['predators'], track: 'marine', xp: 200, icon: 'Swords', branch: 'marine' },

  // ── exhibition ──
  { id: 'public_education', name: 'Public Education', blurb: 'Write clear signs about each species, its habitat and its conservation status.', cost: 400, hours: 20, requires: [], grants: ['signage'], track: 'exhibition', xp: 40, icon: 'BookOpen', branch: 'exhibition' },
  { id: 'aquascape_awards', name: 'Aquascape Awards', blurb: 'Enter the regional aquascaping awards and unlock premium hardscape.', cost: 500, hours: 24, requires: [{ type: 'mastery', track: 'aquascaping', min: 60 }], grants: ['photo_contests', 'decor_premium'], track: 'aquascaping', xp: 80, icon: 'Award', branch: 'exhibition' },
  { id: 'acrylic_engineering', name: 'Acrylic Engineering', blurb: 'Bonded acrylic panels and reinforced plinths for 500–600 gallon showpieces.', cost: 12000, hours: 120, requires: [{ type: 'facility', level: 'showroom' }, { type: 'unlocked', key: 'tank_300' }], grants: ['tank_500', 'tank_600'], track: 'exhibition', xp: 250, icon: 'Box', branch: 'exhibition' },
  { id: 'grand_display', name: 'Grand Display Engineering', blurb: 'Panoramic glass, structural plinths and life support for 800–1,000 gallon exhibits.', cost: 30000, hours: 168, requires: [{ type: 'facility', level: 'destination' }, { type: 'unlocked', key: 'tank_500' }], grants: ['tank_800', 'tank_1000'], track: 'exhibition', xp: 400, icon: 'Landmark', branch: 'exhibition' },
];

export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));

export function getResearch(id: string): ResearchDef | undefined {
  return RESEARCH_BY_ID[id];
}
