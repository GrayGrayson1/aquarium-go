import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Panther grouper — Chromileptes altivelis (the humpback grouper or barramundi cod). Lane species-marine, chunk 17.
 * Sources, key facts and conflicts: docs/research/marine.md#panther-grouper
 * No colour forms. Sold as a white, black-spotted baby of a few centimetres, it grows into a 60 cm predator that eats
 * its tankmates. Young have fewer, bigger spots on white; adults are greenish with many small spots.
 */
export const pantherGrouper: SpeciesDefinition = {
  id: 'panther_grouper',
  commonName: 'Panther Grouper',
  // Catalog of Fishes; the trade spells it Cromileptes, and Ma & Craig 2018 put it in Epinephelus
  scientificName: 'Chromileptes altivelis',
  category: 'fish',
  group: 'grouper',
  genus: 'Chromileptes',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The western Pacific and eastern Indian Ocean, from southern Japan to Queensland and the Nicobar Islands to Western Australia, in sheltered lagoons and silty reefs',
  isStarter: false,

  // L∞ 59.7 cm (Williams et al. 2009); FishBase and Fishes of Australia 70 cm TL max.
  adultSizeCm: 60,
  // LiveAquaria and Top Shelf: 300 gal; the 120×36 in footprint is the game's judgement: a 60 cm fish needs more than
  // two feet front to back → the 500-gallon tank
  recommendedMinTankGallons: 300,
  recommendedFootprint: { minLengthIn: 120, minWidthIn: 36 },
  activeSwimmer: false,
  bioload: 12,

  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.021, idealMax: 1.025 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['seafood', 'pellet_large', 'mysis', 'pellet_sinking'],
  feedingStyle: 'ambush',
  feedingSpeed: 0.8,
  feedingAggression: 0.8,
  hungerHours: 48,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'predatory',
  territoriality: 0.6,
  aggression: 0.5,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.03, note: 'One per tank: adults fight other groupers.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Young added together at the same small size may tolerate each other; adults do not.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_slow', 'fish_benthic', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'crustacean', 'fry'],
  preyTags: ['fish_large'],
  // judgement: a smaller mouth than most groupers, but a grown one takes fish of 12–14 cm
  maxLikelyPreySizeCm: 14,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'caution',
  coralRisk: 0.08,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'aragonite'], avoid: [], note: 'Sand and live rock with caves big enough for it, plus open room, strong filtration and a lid.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 25,
    clutchSize: { min: 50000, max: 500000 },
    incubationHours: 8,
    fryRearingHours: 400,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Every panther grouper starts female and the biggest turn male; it spawns in open water with floating eggs. Food-fish hatcheries in Indonesia and Taiwan breed it in tanks of 60–150 cubic metres, not home aquaria, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // 19 years at most (Williams et al. 2009) → the game's cap; the sexes look alike
  lifecycle: { juvenileDays: 20, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'advanced',
  // LiveAquaria $29.99–34.99 at 2–4 in ($18.99 under 2 in)
  baseValue: 35,
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  unlock: { requires: ['predators'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Young are both wild-caught and hatchery-raised (the food-fish farms of Indonesia and Taiwan).',
  conservation: { status: 'Data Deficient (IUCN Red List, assessed 2016; listed Vulnerable before)', note: 'Overfished for the live reef-fish food trade in Southeast Asia, and protected in Queensland. Released aquarium fish have turned up in Hawaii and Florida: never release one.' },

  genetics: {
    loci: [intensityLocus('No colour forms; individuals vary in how bold the spots are.')],
    phenotypes: [
      { id: 'wild', name: 'Panther Grouper', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#050505', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#b4b092',
      bodyColor2: '#a9a68c',
      bellyColor: '#dcdac8',
      finColor: '#c2c0a8',
      finColor2: '#8fa4b8',
      accentColor: '#0d0d0d',
      eyeColor: '#3a2a1a',
      pattern: 'dalmatian',
      patternScale: 0.8,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0.03,
      finType: 'grouper_highfin',
      finLength: 1.15,
      bodyDepth: 1.1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the panther grouper art: body = the pale greenish brown; accent = the round black spots; fin = the big rounded fins, fin2 = their bluish cast. A tall, narrow body with a small head and a deeply hollow "humpback" head profile. Young are drawn white with fewer, bigger spots.',
  },
  visualMorphs: ['Panther Grouper'],

  behaviorSet: 'grouper',
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 5, turnRate: 1.6, hoverTendency: 0.7, schoolingTightness: 0, restOnBottom: 0.35, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.6, nocturnal: 0.25 },
  specialBehaviors: ['slow_hover', 'odd_turn', 'ambush_rush', 'cave_lurk', 'feeding_anticipation', 'fright_colour'],

  encyclopedia: {
    summary: 'A tall, polka-dotted grouper with a hollow “humpback” head: sold as a white, black-spotted baby, it grows into a 60 cm predator.',
    nativeHabitat: 'Sheltered lagoons and silty reefs from Japan to Australia, where it ambushes small fish and crustaceans.',
    socialStructure: 'Solitary: adults fight other groupers.',
    tankNeeds: 'A ten-foot tank of 500 gallons (it needs three feet front to back as an adult), caves big enough for it, open room, strong filtration and a lid.',
    compatibilityNotes: 'It eats any fish, shrimp or crab it can swallow, and it keeps growing into bigger mouthfuls. Only large fish, big tangs and angels, are safe once it is grown.',
    breedingOverview: 'Bred in food-fish hatcheries in Southeast Asia, not in home tanks. Every one starts female; the biggest turn male.',
    conservationNote: 'Data Deficient (IUCN 2016); overfished for the live food-fish trade.',
    funFact: 'It hovers with its head tilted down and makes odd, slow turns, sometimes nearly upside down.',
    inGameBehavior: 'Hovers slowly by the rock, tilting and turning, and rushes at food the moment it lands.',
    feedingNote: 'Seafood and large frozen foods every other day for adults; no live feeder fish.',
    keeperTip: 'The cute spotted baby is a tank-buster: plan the 500-gallon tank before you buy it.',
  },
  sourceReferences: [
    { id: 'cof-chromileptes', title: 'Catalog of Fishes — Chromileptes altivelis', url: 'https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromileptes', tier: 1, facts: ['valid as Chromileptes altivelis (Valenciennes 1828)', 'others use Cromileptes or Epinephelus'] },
    { id: 'fishbase-chromileptes-altivelis', title: 'FishBase — Chromileptes altivelis (Humpback grouper)', url: 'https://www.fishbase.se/summary/Chromileptes-altivelis.html', tier: 1, facts: ['70 cm TL', 'eats small fishes and crustaceans', 'IUCN Data Deficient (2016)'] },
    { id: 'foa-chromileptes-altivelis', title: 'Fishes of Australia — Chromileptes altivelis', url: 'https://fishesofaustralia.net.au/Home/species/4661', tier: 1, facts: ['sheltered lagoons and silty areas', 'young white with fewer, larger black spots'] },
    { id: 'williams-2009-humpback-grouper', title: 'Williams et al. 2009 — Biology of the humpback grouper (Endangered Species Research 9: 67–79)', url: 'https://researchonline.jcu.edu.au/8039', tier: 1, facts: ['L∞ 59.7 cm', 'oldest 19 years', 'sex change at about 55 cm'] },
    { id: 'adw-cromileptes-altivelis', title: 'Animal Diversity Web — Cromileptes altivelis', url: 'https://animaldiversity.org/accounts/Cromileptes_altivelis', tier: 1, facts: ['swims slowly with many odd turns, sometimes upside down'] },
    { id: 'liveaquaria-panther-grouper', title: 'LiveAquaria — Panther Grouper', url: 'https://www.liveaquaria.com/products/panther-grouper', tier: 2, facts: ['300 gal', 'a lid to prevent escape', '$18.99 under 2 in; $29.99–34.99 at 2–4 in', 'tank-raised fish sold'] },
    { id: 'topshelf-panther-grouper', title: 'Top Shelf Aquatics — Panther Grouper', url: 'https://topshelfaquatics.com/products/panther-grouper-cromileptes-altivelis', tier: 2, facts: ['grows to about 28 in', 'eats shrimp, crabs and small fish'] },
  ],
  confidenceNotes: [
    'The 120×36 in footprint is the game’s judgement for a 60 cm fish; the sources give 300 gal.',
    'Hobby keepers report fast growth in aquaria; FishBase calls its growth slow in the wild.',
    'Name: Chromileptes (Catalog of Fishes), Cromileptes (the trade, WoRMS spelling), Epinephelus (Ma & Craig 2018).',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'Tiny fish are swallowed whole.', incidentRisk: 0.5 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'An ambush predator: small fish are eaten.', incidentRisk: 0.4 },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Only fish too big to swallow are safe: a grown panther grouper takes fish of 12–14 cm.', incidentRisk: 0.12, mitigatedBy: ['hides'] },
    { other: 'tag:shrimp_large', verdictFloor: 'high_risk', reason: 'Cleaner and peppermint shrimp are eaten.', incidentRisk: 0.2 },
    { other: 'tag:crustacean', verdictFloor: 'high_risk', reason: 'Crustaceans are much of its natural diet.', incidentRisk: 0.15 },
    { other: 'miniatus_grouper', verdictFloor: 'high_risk', reason: 'Adult groupers fight other groupers, and the panther grows bigger.', incidentRisk: 0.1, mitigatedBy: ['tank_size'] },
    { other: 'dwarf_lionfish', verdictFloor: 'high_risk', reason: 'A grown panther grouper can swallow a dwarf lionfish.', incidentRisk: 0.08 },
    { other: 'panther_grouper', verdictFloor: 'high_risk', reason: 'Adult panther groupers fight each other: one per tank.', incidentRisk: 0.08 },
  ],
  special: { outgrowsSmallTanks: true, heavyWaste: true, escapeArtist: true },
  visualLane: 'fish',
};
