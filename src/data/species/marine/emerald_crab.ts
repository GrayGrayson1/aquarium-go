import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Emerald crab (emerald mithrax) — Mithraculus sculptus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#emerald-crab
 */
export const emeraldCrab: SpeciesDefinition = {
  id: 'emerald_crab',
  commonName: 'Emerald Crab',
  scientificName: 'Mithraculus sculptus',
  category: 'invertebrate',
  group: 'crab',
  genus: 'Mithraculus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Atlantic — Florida and the Gulf of Mexico through the Antilles to Brazil, among calcareous algae, seagrass and coral rubble',
  isStarter: false,

  // Wagner (1990): the largest male 27 mm across the carapace; hobby sources 2–2.5 in across the legs.
  adultSizeCm: 5,
  // Aquarium Source 20–30 gal per crab; Reeflex 50 L; LiveAquaria: a well-established tank with plenty of rock.
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.2,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; TFH 75–82 °F and calcium 380–430 ppm. No copper.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['biofilm', 'detritus', 'nori', 'algae_wafer', 'pellet_sinking', 'mysis', 'brine_shrimp'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.3,
  feedingAggression: 0.35,
  hungerHours: 20,

  activityZone: ['decor', 'bottom', 'glass'],
  temperament: 'semi_aggressive',
  territoriality: 0.4,
  aggression: 0.2,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'Best alone, or a few in a big tank: they fight other crabs when food or hiding places run short.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'tension', mixed: 'ok', juvenile: 'tension', note: 'Crabs squabble over food and caves.' },

  predatorTags: ['snail_small', 'copepod', 'worm'],
  preyTags: ['crustacean'],
  maxLikelyPreySizeCm: 1.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'mostly_safe',
  frySafe: 'caution',
  plantSafe: 'mostly_safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.08,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs plenty of live rock with caves to hide in by day; it comes out at night.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 100, max: 1500 },
    incubationHours: 80,
    fryRearingHours: 80,
    cooldownDays: 20,
    conditions: { needsPartner: true, minTankGallons: 30 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes; females carry the eggs. The larvae pass through two short zoea stages and a megalopa (Rhyne et al. 2006) — rearable, but not in numbers for the trade, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'female',
  // Aquarium Source: 2–4 years → ~120 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 14, lifespanDays: 120, sexVisibleAtDays: 120, hatchSizeCm: 0.1 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 12,
  rarity: 'common',
  visitorAppeal: 0.45,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected in Florida and the Caribbean; one of the most traded crabs in the hobby.',
  conservation: { status: 'Not evaluated (IUCN)', note: 'Not assessed. Collected in large numbers for clean-up crews.' },

  genetics: {
    loci: [intensityLocus('No colour forms. Olive to brownish green, bluish-white spots toward the rear, white claw and leg tips.')],
    phenotypes: [
      { id: 'wild', name: 'Emerald Crab', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#2a6a2a', accentColor: '#5a9a3a' }),
    ],
    baseVisual: {
      bodyColor: '#2f5a2a',
      bodyColor2: '#4e7d3a',
      bellyColor: '#a8b890',
      finColor: '#3a6a34',
      finColor2: '#f0f0e8',
      accentColor: '#dce6e4',
      eyeColor: '#6a1a12',
      pattern: 'mottled',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.08,
      metallic: 0,
      translucency: 0.05,
      finType: 'crab',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the crab renderer: body = the olive-green carapace; body2 = its mottling and leg bands; belly = underside; fin = claws; fin2 = the white spoon-tipped claw ends; accent = the pale spots; eye = eyes. A flat, finely sculpted carapace a little wider than long, spoon-shaped claws, hairy banded legs.',
  },
  visualMorphs: ['Emerald Crab (no morphs)'],

  behaviorSet: 'crab',
  behaviorTraits: { cruiseSpeed: 0.2, burstSpeed: 1.2, turnRate: 2, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.25, nocturnal: 0.8, pickRadiusMul: 1.5 },
  specialBehaviors: ['bubble_algae_pick', 'cave_hide', 'claw_pick'],

  encyclopedia: {
    summary: 'A little green spider crab that hides in the rock by day and comes out at night to pick at bubble algae and hair algae.',
    nativeHabitat: 'Shallow reefs and seagrass beds of the western Atlantic, among calcareous algae and coral rubble.',
    socialStructure: 'Solitary; it squabbles with other crabs over food and shelter.',
    tankNeeds: 'An established tank with plenty of live rock and caves, stable water and no copper.',
    compatibilityNotes: 'Mostly reef-safe; a hungry crab may pick at corals, small invertebrates or a sleeping small fish. Keep it fed.',
    breedingOverview: 'Females carry eggs; the drifting larvae have been reared in the lab but not in numbers.',
    conservationNote: 'Not assessed by the IUCN. Wild-collected in large numbers.',
    funFact: 'Spider crabs stop moulting after their final moult, so adults of the same age can differ a lot in size.',
    inGameBehavior: 'Stays wedged in a crevice through the day, then climbs out after dark and works over the rock with its spoon-tipped claws.',
    feedingNote: 'Eats bubble and hair algae, film and leftovers at night. Offer thawed mysis now and then rather than lots of pellets, or it stops working on the algae.',
    keeperTip: 'Feed mysis, not pellets: crabs given pellets ate far less bubble algae in a 2008 study.',
  },
  sourceReferences: [
    { id: 'worms-mithraculus-sculptus', title: 'WoRMS — Mithraculus sculptus (Lamarck, 1818)', url: 'https://www.marinespecies.org/rest/AphiaRecordsByName/Mithraculus%20sculptus?like=false&marine_only=true', tier: 1, facts: ['accepted name', 'Mithrax sculptus a superseded combination'] },
    { id: 'wagner-1990-mithracidae', title: 'Wagner (1990) The genera Mithrax and Mithraculus. Zoologische Verhandelingen 264', url: 'https://repository.naturalis.nl/document/149174', tier: 1, facts: ['largest male 27 mm wide', 'carapace broader than long', 'olive-green with bluish-white spots, white tips', 'stops moulting after the puberty moult'] },
    { id: 'figueiredo-2008-bubble-algae', title: 'Figueiredo et al. (2008) Emerald crabs to control bubble alga in aquaria. JMBA 88:95–101', url: 'https://www.cambridge.org/core/journals/journal-of-the-marine-biological-association-of-the-united-kingdom/article/efficiency-of-using-emerald-crabs-mithraculus-sculptus-to-control-bubble-alga-ventricaria-ventricosa-syn-valonia-ventricosa-in-aquaria-habitats/639F6330E0A684340BB80510279C03E9', tier: 1, facts: ['eats bubble algae', 'pellets chosen 77% of the time and cut algae eating', 'spoon-shaped claws'] },
    { id: 'liveaquaria-emerald-crab', title: 'LiveAquaria — Emerald Crab', url: 'https://www.liveaquaria.com/products/emerald-crab', tier: 2, facts: ['72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025', 'nocturnal, hides by day', 'may eat corals or small fish when underfed', 'no copper', 'easy'] },
    { id: 'tfh-mithraculus-sculptus', title: 'TFH Magazine — Mithraculus (Mithrax) sculptus', url: 'https://tfhmagazine.com/articles/saltwater/mithraculus-mithrax-sculptus', tier: 2, facts: ['omnivorous scavenger', '75–82 °F, calcium 380–430 ppm'] },
  ],
  confidenceNotes: [
    'Carapace size: SeaLifeBase gives 1.2 cm, Wagner (Tier 1) 27 mm; the game uses about 5 cm across the legs.',
    'Lifespan (2–4 years) comes from a hobby guide only.',
    'No species-specific predators were found; the usual crab eaters (triggers, puffers, mantis shrimp) are assumed.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Crabs are a mantis shrimp’s favourite prey.', incidentRisk: 0.5 },
    { other: 'tag:crab', verdictFloor: 'conditional', reason: 'Crabs fight each other over food and caves.', incidentRisk: 0.03, mitigatedBy: ['hides', 'tank_size'] },
  ],
  special: { needsAlgaeOrBiofilm: true, medicationSensitive: true },
  visualLane: 'special',
};
