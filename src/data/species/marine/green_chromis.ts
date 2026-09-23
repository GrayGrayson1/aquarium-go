import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Green chromis (blue-green chromis) — Chromis viridis. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#green-chromis
 */
export const greenChromis: SpeciesDefinition = {
  id: 'green_chromis',
  commonName: 'Green Chromis',
  scientificName: 'Chromis viridis',
  category: 'fish',
  group: 'damselfish',
  genus: 'Chromis',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — East Africa and the Red Sea to the Line Islands and Tuamotus, north to the Ryukyus, south to the Great Barrier Reef',
  isStarter: false,

  // FishBase max 10 cm TL; aquarium adults 7.5–10 cm (LiveAquaria 4 in).
  adultSizeCm: 8,
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 0.9,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 27 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'planktivore',
  foods: ['flake', 'pellet_small', 'mysis', 'brine_shrimp', 'copepod_live'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.8,
  feedingAggression: 0.45,
  hungerHours: 10,

  activityZone: ['upper', 'middle'],
  temperament: 'peaceful',
  territoriality: 0.3,
  aggression: 0.1,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'shoal', minGroup: 3, idealGroup: 7, note: 'Shoals over branching coral in the wild. Keep 5–7 or more, in odd numbers, in a long tank to spread the pecking order.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'ok',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Mature males set up territories and a dominance hierarchy forms; bullied subordinates can waste away. Groups of three collapse fastest, groups of five to seven in a six-foot tank fare best.',
  },

  predatorTags: ['copepod', 'eggs', 'shrimp_fry'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 0.8,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Likes branching coral or rockwork to dive into when alarmed, plus open water above.' },

  breeding: {
    system: 'substrate_spawner',
    difficulty: 0.9,
    maturityDays: 14,
    clutchSize: { min: 500, max: 2500 },
    // FishBase: eggs hatch in 2–3 days → ~2.5 × 8.
    incubationHours: 20,
    fryRearingHours: 280,
    cooldownDays: 5,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 25, minTankGallons: 55 },
    predationWithoutNursery: 0.99,
    nurseryRequired: true,
    maxRaisedPerClutch: 4,
    notes: 'Males clear a nest on sand or rubble, and several females spawn there in turn. The male fans the eggs and eats any that fail until they hatch 2–3 days later. The tiny larvae need live copepods; only research labs have raised them so far.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // LiveAquaria: 8–15 years with excellent care → ~400 game-days (well below the cap).
  lifecycle: { juvenileDays: 11, adultDays: 14, lifespanDays: 400, sexVisibleAtDays: 30, hatchSizeCm: 0.2 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 12,
  rarity: 'common',
  visitorAppeal: 0.6,
  unlock: { requires: ['marine_basics'], hint: 'Unlocks with beginner marine fish.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'The single most-imported marine aquarium fish, and essentially all wild-caught; captive rearing has only succeeded experimentally (Rising Tide Conservation, 2013; University of Florida).',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2021)',
    note: 'Abundant, but it is collected in huge numbers. Keeping a group healthy for its full 8–15 year life is the best thing a keeper can do.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. The blue-green sheen shifts with light angle and mood; individuals vary slightly.')],
    phenotypes: [
      { id: 'wild', name: 'Green Chromis', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ iridescence: 0.85, bodyColor2: '#4fb6d9' }),
    ],
    baseVisual: {
      bodyColor: '#7fd9c6',
      bodyColor2: '#5ec1d6',
      bellyColor: '#d9f3ea',
      finColor: '#a9e6d8',
      finColor2: '#e6fbf5',
      accentColor: '#9ff0e0',
      eyeColor: '#1d2a2c',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.3,
      patternSeed: 0,
      iridescence: 0.7,
      metallic: 0.3,
      translucency: 0.3,
      finType: 'chromis',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Iridescent apple-green to pale blue body (bluer along the back, paler below), translucent fins, deeply forked tail. Colour is structural shimmer: raise iridescence rather than saturating the base colour. No morphs.',
  },
  visualMorphs: ['Green Chromis (no morphs; individual variation)'],

  behaviorSet: 'chromis',
  behaviorTraits: { cruiseSpeed: 1.3, burstSpeed: 6, turnRate: 3, hoverTendency: 0.3, schoolingTightness: 0.6, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.4, nocturnal: 0 },
  specialBehaviors: ['shoal', 'plankton_pick', 'coral_refuge_dive', 'dominance_chase'],

  encyclopedia: {
    summary: 'A shimmering blue-green damselfish that hangs in glittering clouds above branching coral.',
    nativeHabitat: 'Lagoons and sheltered reefs 1–20 m deep, in large aggregations above thickets of branching Acropora that they dive into when threatened.',
    socialStructure: 'Big shoals in the wild. In aquaria a pecking order develops, and subordinate fish can be chased to death.',
    tankNeeds: 'A 30-gallon or larger tank — ideally 4–6 feet long for a real shoal — with open swimming water, rockwork refuges and several small meals a day.',
    compatibilityNotes: 'Peaceful and reef-safe with other fish. Bickers within its own group; buy 5–7 in odd numbers. Fast feeders that can outcompete seahorses and mandarins.',
    breedingOverview: 'Males prepare a nest where several females spawn; the male guards the eggs for 2–3 days. The larvae have only been raised in research labs.',
    conservationNote: 'Least Concern (IUCN 2021), but it is the most-imported marine aquarium fish of all and nearly every one is wild-caught.',
    funFact: 'A 2012 study ranked the green chromis as the number-one species collected for the marine aquarium hobby — yet its larvae are so tiny that only a few labs have ever raised one.',
    inGameBehavior: 'Swims as a loose shimmering group in the upper water, darts into rock or coral when startled, and squabbles over its pecking order.',
  },
  sourceReferences: [
    { id: 'fishbase-chromis-viridis', title: 'FishBase — Chromis viridis (Blue green damselfish)', url: 'https://www.fishbase.se/summary/Chromis-viridis.html', tier: 1, facts: ['max 10 cm TL', 'depth 1–20 m', 'aggregations above branching Acropora', 'males nest; females spawn in turn', 'eggs hatch in 2–3 days', 'male guards and fans eggs', 'IUCN Least Concern (2021)'] },
    { id: 'liveaquaria-green-chromis', title: 'LiveAquaria — Green Reef Chromis', url: 'https://www.liveaquaria.com/product/115/?pcatid=115', tier: 2, facts: ['min tank 30 gal', 'school of 6+', 'max 4 in', '72–78 °F, SG 1.020–1.025', 'multiple daily feedings', '8–15 years', 'price ~$12'] },
    { id: 'reefbuilders-rising-tide-chromis', title: 'Reef Builders — Rising Tide announces success with captive-bred Green Chromis (2013)', url: 'https://reefbuilders.com/2013/01/28/captive-bred-green-chromis/', tier: 2, facts: ['reared on cultured copepods', 'only a couple dozen juveniles', 'number-one species collected for the hobby'] },
    { id: 'topshelf-chromis-aggression', title: 'Top Shelf Aquatics — Chromis Aggression Over Time', url: 'https://topshelfaquatics.com/blogs/news/chromis-aggression-over-time-explained', tier: 3, facts: ['about 70% of groups collapse to one fish within 18 months', 'groups of 3 worst; 5–7 better', 'six-foot tanks reduce aggression', 'hierarchy forms at maturity'] },
  ],
  confidenceNotes: [
    'High confidence: shoaling, nest spawning, 2–3 day incubation, wild-caught trade, IUCN status.',
    'Group attrition in captivity is reported by retailers and hobbyists (Tier 3; Top Shelf estimates ~70% of groups end as one fish within 18 months) — modelled as male–male fighting that tank length and group size mitigate.',
    'Chromis viridis is often confused with C. atripectoralis (black-axil chromis) in the trade; values here apply to both.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
};
