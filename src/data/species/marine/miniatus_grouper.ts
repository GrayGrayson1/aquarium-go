import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Miniatus grouper (coral hind) — Cephalopholis miniata. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#miniatus-grouper
 */
export const miniatusGrouper: SpeciesDefinition = {
  id: 'miniatus_grouper',
  commonName: 'Miniatus Grouper',
  scientificName: 'Cephalopholis miniata',
  category: 'fish',
  group: 'grouper',
  genus: 'Cephalopholis',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — Red Sea and East Africa to the Line Islands, north to southern Japan, south to northern Australia',
  isStarter: false,

  // FishBase max 50 cm TL; LiveAquaria 14 in in aquaria (18 in wild). Game uses 42 cm as a well-grown captive adult.
  adultSizeCm: 42,
  // LiveAquaria 180 gal minimum; conservative footprint of 6 ft × 2 ft.
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: false,
  bioload: 8,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['pellet_large', 'mysis', 'pellet_sinking'],
  feedingStyle: 'ambush',
  feedingSpeed: 0.9,
  feedingAggression: 0.85,
  hungerHours: 40,

  activityZone: ['lower', 'decor', 'middle'],
  temperament: 'predatory',
  territoriality: 0.8,
  aggression: 0.6,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.05, note: 'One per tank. Wild males keep harems over huge territories (hundreds of square metres) that no aquarium can match.' },
  sameSpeciesRule: {
    maleMale: 'lethal',
    femaleFemale: 'fight',
    mixed: 'harassment',
    juvenile: 'fight',
    note: 'Groupers defend caves and territory; two in one tank fight, and the larger may eat the smaller.',
  },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_slow', 'fish_benthic', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'crustacean', 'fry'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 15,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'caution',
  coralRisk: 0.05,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand'], avoid: [], note: 'Needs large caves and ledges to lurk under, plus very strong filtration and skimming for its heavy waste.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 25,
    clutchSize: { min: 20000, max: 200000 },
    incubationHours: 8,
    fryRearingHours: 480,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'A protogynous hermaphrodite: fish mature as females and the largest become harem-holding males. Spawning is pelagic, and the species is not bred in captivity, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // Long-lived predator (well over a decade in public aquaria) → capped near 500.
  lifecycle: { juvenileDays: 20, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.15 },

  hardiness: 0.9,
  difficulty: 'advanced',
  baseValue: 150,
  rarity: 'rare',
  visitorAppeal: 0.95,
  unlock: { requires: ['predators'], hint: 'Unlocks with predator exhibits — it needs a 180-gallon tank and eats small fish.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected only; groupers are not bred for the aquarium trade.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2018)',
    note: 'Widespread, but fished commercially and for sport, and rated highly vulnerable to fishing and climate stress. Commit to a tank it can live in for its whole long life before buying a juvenile.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Juveniles are orange-yellow with sparse faint spots; adults deepen to orange-red covered in bright blue spots.')],
    phenotypes: [
      { id: 'wild', name: 'Miniatus Grouper', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#e8341f', accentColor: '#5cb4ff' }),
    ],
    baseVisual: {
      bodyColor: '#e0402a',
      bodyColor2: '#b52a22',
      bellyColor: '#ec6a44',
      finColor: '#d83a28',
      finColor2: '#2f7fd8',
      accentColor: '#4fa8f0',
      eyeColor: '#2c1a14',
      pattern: 'spots',
      patternScale: 0.55,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0,
      translucency: 0.05,
      finType: 'grouper',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Robust, big-mouthed grouper with a rounded tail; brilliant orange-red to red-brown, the head, body and fins densely covered in small, dark-edged bright blue spots (accent). Fins have thin blue margins (fin2). Juveniles are orange to yellow with fewer, fainter spots.',
  },
  visualMorphs: ['Miniatus Grouper (no morphs; juvenile colour change)'],

  behaviorSet: 'grouper',
  behaviorTraits: { cruiseSpeed: 0.4, burstSpeed: 7, turnRate: 2, hoverTendency: 0.6, schoolingTightness: 0, restOnBottom: 0.3, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.6, nocturnal: 0.3 },
  specialBehaviors: ['ambush_rush', 'cave_lurk', 'territory_patrol', 'yawn_display', 'feeding_anticipation'],

  encyclopedia: {
    summary: 'A blazing red, blue-spotted grouper that waits under ledges and explodes upward to snatch passing fish.',
    nativeHabitat: 'Clear-water coastal and offshore coral reefs, 2–150 m deep, often in caves and under ledges on exposed reef faces.',
    socialStructure: 'Harems of one male and up to 12 females; the male defends a territory of around 475 m² subdivided among the females. All start as females and the largest change into males.',
    tankNeeds: 'A 180-gallon or larger tank with large caves, powerful filtration and skimming. It grows for years — plan for its adult size, not the juvenile you buy.',
    compatibilityNotes: 'Reef-safe with corals, but eats small fish and crustaceans: only fish too large to swallow are safe. Keep one per tank.',
    breedingOverview: 'Spawns in open water within harems. Not bred in captivity.',
    conservationNote: 'Least Concern (IUCN 2018), though fished commercially and sensitive to fishing and climate stress. All aquarium fish are wild-caught.',
    funFact: 'In the wild more than 80% of its diet is small fish — mostly sea goldies (anthias) ambushed with a sudden rush up from the reef.',
    inGameBehavior: 'Lurks in a favourite cave, watches the tank with swivelling eyes, rushes out to ambush food, and learns to wait at the front glass at feeding time.',
  },
  sourceReferences: [
    { id: 'fishbase-cephalopholis-miniata', title: 'FishBase — Cephalopholis miniata (Coral hind)', url: 'https://www.fishbase.se/summary/Cephalopholis-miniata.html', tier: 1, facts: ['max 50 cm TL', 'depth 2–150 m', '~80% of diet small fish (mainly Pseudanthias), rest crustaceans', 'harems of a male and 2–12 females', 'territories up to 475 m²', 'IUCN Least Concern (2017/2018 assessment)', 'high fishing and climate vulnerability'] },
    { id: 'liveaquaria-miniatus', title: 'LiveAquaria — Miniatus Grouper', url: 'https://www.liveaquaria.com/products/miniatus-grouper', tier: 2, facts: ['min tank 180 gal', 'max 14 in in aquaria (18 in wild)', 'aggressive', 'reef compatible with caution', 'not to be trusted with invertebrates or small fish', 'price ~$150'] },
    { id: 'wikipedia-cephalopholis-miniata', title: 'Wikipedia — Cephalopholis miniata (citing IUCN, FishBase, FAO)', url: 'https://en.wikipedia.org/wiki/Cephalopholis_miniata', tier: 3, facts: ['protogynous hermaphrodite', 'juveniles orange-yellow with fewer spots', 'ambushes sea goldies from below', 'popular in public aquaria'] },
  ],
  confidenceNotes: [
    'Size: FishBase max 50 cm TL; LiveAquaria says ~14 in (36 cm) in aquaria. The game uses 42 cm, matching the brief’s conservative 40–45 cm.',
    'Tank size 180 gal (LiveAquaria) is treated as an absolute minimum; public-aquarium displays are far larger. Researched conservatively per the design brief.',
    'IUCN: FishBase lists the assessment date as November 2017 while Wikipedia cites Rocha 2018 — the same assessment, published 2018.',
    'Lifespan is not documented for the species; set near the cap to reflect a long-lived grouper.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'Tiny fish are swallowed whole.', incidentRisk: 0.5 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'A miniatus grouper will ambush and eat small fish.', incidentRisk: 0.4 },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'A grown miniatus has a huge mouth: only fish too large to swallow are safe, and most community reef fish are not.', incidentRisk: 0.15, mitigatedBy: ['hides'] },
    { other: 'tag:shrimp_large', verdictFloor: 'high_risk', reason: 'Cleaner and peppermint shrimp are eaten; the grouper cannot be trusted with invertebrates.', incidentRisk: 0.2 },
    { other: 'tag:crustacean', verdictFloor: 'high_risk', reason: 'Crabs and other crustaceans make up much of its natural diet.', incidentRisk: 0.15 },
    { other: 'dwarf_lionfish', verdictFloor: 'conditional', reason: 'A full-grown miniatus can try to swallow a dwarf lionfish despite its spines; keep only if the lionfish is large relative to the grouper.', incidentRisk: 0.05, mitigatedBy: ['tank_size'] },
  ],
  special: {
    outgrowsSmallTanks: true,
    heavyWaste: true,
  },
  visualLane: 'fish',
};
