import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Peppermint shrimp — Lysmata wurdemanni (trade name; see taxonomy note). Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#peppermint-shrimp
 */
export const peppermintShrimp: SpeciesDefinition = {
  id: 'peppermint_shrimp',
  commonName: 'Peppermint Shrimp',
  scientificName: 'Lysmata wurdemanni',
  category: 'invertebrate',
  group: 'marine_shrimp',
  genus: 'Lysmata',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Atlantic — Florida Keys, Gulf of Mexico and the Caribbean, on shallow rocky reefs and jetties',
  isStarter: false,

  adultSizeCm: 5,
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.25,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'dim',
  diet: 'omnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_sinking', 'pellet_small', 'detritus'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.5,
  feedingAggression: 0.3,
  hungerHours: 16,

  activityZone: ['bottom', 'lower', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.1,
  aggression: 0.02,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'group', minGroup: 1, idealGroup: 3, note: 'Tolerates its own kind well; small groups hunt Aiptasia faster, though each shrimp eats a little less.' },
  sameSpeciesRule: {
    maleMale: 'ok',
    femaleFemale: 'ok',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Simultaneous hermaphrodites; groups coexist peacefully.',
  },

  predatorTags: ['aiptasia', 'copepod', 'worm', 'coral_polyp'],
  preyTags: ['shrimp_large', 'crustacean'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.2,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Spends the day in rock crevices and comes out at night to forage.' },

  breeding: {
    system: 'shrimp_larval_marine',
    difficulty: 0.85,
    maturityDays: 14,
    clutchSize: { min: 100, max: 400 },
    // Eggs carried ~10–12 days between moults (hobby/aquaculture reports) → ~11 × 8.
    incubationHours: 88,
    // Larvae metamorphose after several weeks; far easier than cleaner shrimp, and commercial farms do it.
    fryRearingHours: 320,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTempC: 23, minTankGallons: 20 },
    predationWithoutNursery: 0.99,
    nurseryRequired: true,
    maxRaisedPerClutch: 5,
    notes: 'Like cleaner shrimp, every adult is a simultaneous hermaphrodite that carries eggs under its tail after moulting. Larvae hatch at night and must be reared separately; peppermint shrimp are bred commercially and occasionally survive in refugiums.',
  },
  sexSystem: 'simultaneous_hermaphrodite',
  parentalCare: 'female',
  lifecycle: { juvenileDays: 12, adultDays: 16, lifespanDays: 90, sexVisibleAtDays: 12, hatchSizeCm: 0.2 },

  hardiness: 0.65,
  difficulty: 'beginner',
  baseValue: 18,
  rarity: 'common',
  visitorAppeal: 0.45,
  unlock: { requires: ['marine_basics'], hint: 'Unlocks with beginner marine fish and clean-up crew.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most sold are wild-collected in Florida and the Gulf; captive-bred L. boggessi are available and are the more reliable Aiptasia eaters.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Peppermint shrimp are among the few ornamental shrimp farmed commercially, so captive-bred animals are easy to choose.',
  },

  genetics: {
    loci: [intensityLocus('No colour morphs. The trade "peppermint shrimp" is several look-alike Lysmata species with slightly different line patterns.')],
    phenotypes: [
      { id: 'wild', name: 'Peppermint', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#b0182c', patternContrast: 0.95 }),
    ],
    baseVisual: {
      bodyColor: '#f2e6d8',
      bodyColor2: '#e8d3c0',
      bellyColor: '#f7ede2',
      finColor: '#e6d2c0',
      finColor2: '#c8283a',
      accentColor: '#c42636',
      eyeColor: '#2b1616',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.6,
      finType: 'shrimp_lysmata',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Glassy cream body painted with thin red longitudinal lines, like a candy cane seen end-on. No morphs — one base phenotype plus individual variation.',
  },
  visualMorphs: ['Peppermint (no morphs; individual variation)'],

  behaviorSet: 'shrimp_cleaner',
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 3, turnRate: 2, hoverTendency: 0.05, schoolingTightness: 0, restOnBottom: 0.8, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.3, nocturnal: 0.8 },
  specialBehaviors: ['aiptasia_hunt', 'scavenge', 'night_forage', 'molt'],

  encyclopedia: {
    summary: 'A shy, candy-striped scavenger famous for eating Aiptasia, the pest anemone that plagues reef tanks.',
    nativeHabitat: 'Shallow rocky reefs, rubble and jetty pilings in the tropical western Atlantic, hiding by day and foraging at night.',
    socialStructure: 'Gregarious — often found in groups. Every adult is both male and female.',
    tankNeeds: 'Live rock with plenty of crevices, stable full-strength seawater and iodine for moulting. Copper medications are lethal.',
    compatibilityNotes: 'Peaceful with fish and snails. Hungry individuals may steal food from, or pick at, LPS corals such as hammer and frogspawn, and occasionally zoanthids. Eaten by lionfish, groupers, hawkfish and mantis shrimp.',
    breedingOverview: 'Carries eggs under the tail after moulting and releases larvae at night. Commercial farms rear them; in a home tank a few may survive in a refugium.',
    conservationNote: 'Not assessed by the IUCN. Captive-bred peppermints are widely available — and tend to be the best Aiptasia hunters.',
    funFact: '"Peppermint shrimp" is really a cluster of look-alike species. Studies found some kinds eat far more Aiptasia than others, which is why one shop’s peppermints clean up a tank and another’s ignore it.',
    inGameBehavior: 'Hides in the rock by day, then creeps out at night to scavenge — and to pick off any Aiptasia it finds.',
  },
  sourceReferences: [
    { id: 'liveaquaria-peppermint', title: 'LiveAquaria — Peppermint Shrimp', url: 'https://www.liveaquaria.com/products/peppermint-shrimp', tier: 2, facts: ['manages Aiptasia (individuals vary)', 'scavenger', 'stock is L. boggessi / L. ankeri / L. wurdemanni / L. rafa', 'bred by commercial farms', '72–78 °F, SG 1.020–1.025', 'copper and nitrate intolerant', 'price ~$16'] },
    { id: 'rhyne-2004-aiptasia', title: 'Rhyne, Lin & Deal (2004) Biological control of aquarium pest anemone Aiptasia pallida by peppermint shrimp Lysmata. J. Shellfish Research 23: 227–229', url: 'https://www.researchgate.net/publication/289254983_Biological_control_of_aquarium_pest_anemone_Aiptasia_pallida_Verrill_by_peppermint_shrimp_Lysmata_risso', tier: 1, facts: ['Lysmata eat Aiptasia', 'consumption varies by variety/species', 'groups eat less per shrimp but tackle larger anemones'] },
    { id: 'algaebarn-peppermint', title: 'AlgaeBarn — Meet Lysmata boggessi: Peppermint Shrimp', url: 'https://www.algaebarn.com/blog/invertebrates/captive-bred-inverts/peppermint-shrimp/', tier: 2, facts: ['L. boggessi the reliable Aiptasia eater', 'captive-bred available', 'may steal food from LPS corals', 'ignore Aiptasia when overfed'] },
  ],
  confidenceNotes: [
    'Taxonomy: the roster name L. wurdemanni is kept, but most trade peppermints are L. boggessi or other members of the L. wurdemanni complex.',
    'Coral picking (LPS, occasionally zoanthids) is reported mainly by hobbyists and retailers (Tier 2–3); modelled as a modest coralRisk of 0.2 rather than a hard rule.',
    'Egg-carrying time and larval duration are approximations from aquaculture/hobby reports.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Mantis shrimp hunt shrimp; peppermints will be eaten.', incidentRisk: 0.5 },
    { other: 'dwarf_lionfish', verdictFloor: 'high_risk', reason: 'Lionfish eat small ornamental shrimp that fit in their mouths.', incidentRisk: 0.2, mitigatedBy: ['hides'] },
  ],
  special: {
    medicationSensitive: true,
  },
  visualLane: 'special',
  positiveInteractions: [
    { other: 'tag:aiptasia', text: 'Hunts pest Aiptasia anemones at night — a natural fix for a classic reef-tank nuisance.' },
  ],
};
