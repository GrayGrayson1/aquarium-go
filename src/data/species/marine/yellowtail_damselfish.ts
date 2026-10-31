import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Yellowtail damselfish (yellowtail blue damsel) — Chrysiptera parasema. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#yellowtail-damselfish
 */
export const yellowtailDamselfish: SpeciesDefinition = {
  id: 'yellowtail_damselfish',
  commonName: 'Yellowtail Damselfish',
  scientificName: 'Chrysiptera parasema',
  category: 'fish',
  group: 'damselfish',
  genus: 'Chrysiptera',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Pacific — the Solomons, Papua New Guinea, the Philippines and the Ryukyus, over Acropora patches in sheltered lagoons 1–16 m deep',
  isStarter: false,

  // FishBase 7 cm TL; LiveAquaria 2.75 in.
  adultSizeCm: 7,
  // LiveAquaria 30 gal; Reef Builders about 20 gal.
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 0.6,

  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'mysis', 'brine_shrimp', 'nori', 'vegetable'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.75,
  feedingAggression: 0.5,
  hungerHours: 12,

  activityZone: ['middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.25,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'group', minGroup: 1, idealGroup: 3, note: 'One, or an odd-numbered group of three to seven added together in a larger tank.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'ok', note: 'Unusually mild for a damsel, but territorial toward its own kind and look-alikes.' },

  predatorTags: ['copepod', 'eggs'],
  preyTags: ['fish_small', 'fish_medium'],
  maxLikelyPreySizeCm: 0.6,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.55,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Holds a patch of branching coral or rock and shelters in it at night.' },

  breeding: {
    system: 'egg_layer_generic',
    difficulty: 0.75,
    maturityDays: 14,
    clutchSize: { min: 200, max: 1500 },
    incubationHours: 32,
    fryRearingHours: 180,
    cooldownDays: 10,
    conditions: { needsPartner: true, needsNestSite: true, minTankGallons: 30 },
    predationWithoutNursery: 0.98,
    nurseryRequired: true,
    maxRaisedPerClutch: 6,
    notes: 'Lays eggs on a hard surface; the male guards and fans them until they hatch in about four days. ORA raised about 60 from three spawns in 2016, settling at ~23 days; hard, but possible with a nursery.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // 4–6 years (Wikipedia, weak) → ~200 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 14, lifespanDays: 200, sexVisibleAtDays: 30, hatchSizeCm: 0.2 },

  hardiness: 0.9,
  difficulty: 'beginner',
  baseValue: 25,
  rarity: 'common',
  visitorAppeal: 0.7,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2021)', note: 'Least Concern. ORA breeds it, so captive-bred fish are an option.' },

  genetics: {
    loci: [intensityLocus('No colour forms. Electric blue with a yellow tail; Papua New Guinea fish show more yellow in the dorsal and anal fins.')],
    phenotypes: [
      { id: 'wild', name: 'Yellowtail Damselfish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#1a2fc8', finColor2: '#ffdc1a' }),
    ],
    baseVisual: {
      bodyColor: '#1f33b5',
      bodyColor2: '#15238a',
      bellyColor: '#2a3fa0',
      finColor: '#2a40c0',
      finColor2: '#ffd21f',
      accentColor: '#3a5fe0',
      eyeColor: '#15152a',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.4,
      metallic: 0.1,
      translucency: 0.05,
      finType: 'damsel',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Small oval damsel with a forked tail. Velvety electric blue all over the head, back and belly; bright yellow tail and peduncle and yellow rear tips to the dorsal and anal fins (fin2). Yellow never reaches the back or belly — that would be a different damsel.',
  },
  visualMorphs: ['Yellowtail Damselfish (no morphs)'],

  behaviorSet: 'damsel',
  behaviorTraits: { cruiseSpeed: 1.3, burstSpeed: 6, turnRate: 4, hoverTendency: 0.5, schoolingTightness: 0.1, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.03, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['patch_guard', 'rock_dart'],

  encyclopedia: {
    summary: 'A tough little electric-blue damsel with a bright yellow tail, gentler than most of its family.',
    nativeHabitat: 'Sheltered lagoons and inshore reefs 1–16 m deep, in small groups over patches of Acropora.',
    socialStructure: 'Adults alone or in pairs; young in groups. Males guard the eggs.',
    tankNeeds: 'A tank of 20–30 gallons with rock or coral branches to hold and shelter in; very hardy.',
    compatibilityNotes: 'Reef- and invertebrate-safe, and mild for a damsel, but territorial with its own kind and look-alikes. Add shy fish first.',
    breedingOverview: 'Lays eggs on rock that the male fans until they hatch in about four days; ORA has raised the young.',
    conservationNote: 'Least Concern (IUCN 2021). Captive-bred fish are available.',
    funFact: 'ORA bred it partly as an affordable look-alike for the regal blue tang.',
    inGameBehavior: 'Hovers over its patch of rock, darting in and out, and chases off anything that comes too close.',
    feedingNote: 'An easy omnivore: flake, small pellets, thawed mysis and brine shrimp and some seaweed, a few small meals a day. An autofeeder suits it.',
    keeperTip: 'Keep one, or an odd-numbered group added together, with plenty of rock to break sight lines.',
  },
  sourceReferences: [
    { id: 'fishbase-chrysiptera-parasema', title: 'FishBase — Chrysiptera parasema (Goldtail demoiselle)', url: 'https://www.fishbase.se/summary/Chrysiptera-parasema.html', tier: 1, facts: ['7 cm TL', 'depth 1–16 m', 'over Acropora patches', 'demersal eggs, male guards', 'IUCN Least Concern (2021)'] },
    { id: 'coral-2016-yellowtail-damsel', title: 'CORAL Magazine (2016) — ORA’s captive-bred yellowtail damsel', url: 'https://www.coralmagazine.com/?p=1460673', tier: 2, facts: ['~60 raised from three spawns', 'settlement ~23 days'] },
    { id: 'liveaquaria-yellowtail-damsel', title: 'LiveAquaria — Yellowtail Damselfish', url: 'https://www.liveaquaria.com/products/yellowtail-damselfish', tier: 2, facts: ['30 gal', 'territorial to its own kind', 'reef safe', 'singly or odd groups', '~$25'] },
    { id: 'reefbuilders-yellowtail-damsel', title: 'Reef Builders (2013) — Chrysiptera parasema', url: 'https://reefbuilders.com/2013/11/25/chrysiptera-parasema-yellowtail-damselfish-demoiselle', tier: 2, facts: ['~20 gal', 'unusually mild for a damsel', 'add shy fish first'] },
  ],
  confidenceNotes: [
    'No sex change has been documented for this damsel, so it is modelled as separate-sexed.',
    'Lifespan is weakly sourced (4–6 years).',
    'Breeding is possible in the game but hard, reflecting ORA’s small first success.',
  ],
  exceptionRules: [
    { other: 'tag:damselfish', verdictFloor: 'conditional', reason: 'Territorial toward other damsels and fish of its shape and colour.', incidentRisk: 0.04, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'lined_seahorse', verdictFloor: 'conditional', reason: 'A quick feeder that gets to food first; workable with target feeding.', incidentRisk: 0.03, mitigatedBy: ['target_feeding'] },
  ],
  visualLane: 'fish',
};
