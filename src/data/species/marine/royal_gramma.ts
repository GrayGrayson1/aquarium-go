import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Royal gramma — Gramma loreto. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#royal-gramma
 */
export const royalGramma: SpeciesDefinition = {
  id: 'royal_gramma',
  commonName: 'Royal Gramma',
  scientificName: 'Gramma loreto',
  category: 'fish',
  group: 'basslet',
  genus: 'Gramma',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Central Atlantic — Bermuda and the Bahamas through the Caribbean to northern South America',
  isStarter: false,

  // FishBase max 8 cm TL; LiveAquaria 3 in.
  adultSizeCm: 8,
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025. FishBase: 22–27 °C.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'dim',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'flake', 'copepod_live'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.55,
  feedingAggression: 0.35,
  hungerHours: 14,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.6,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.5, note: 'Best kept singly. Groups (one male, several females) need a large tank with many caves.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'courtship_ok',
    juvenile: 'tension',
    note: 'Defends its cave fiercely against other grammas and similar-looking cave fish such as dottybacks; mouth-gaping displays escalate to chasing.',
  },

  predatorTags: ['copepod', 'worm', 'shrimp_fry'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0.02,
  anemoneRelationship: 'avoids',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs rock caves and overhangs; males build nests of algae in a crevice.' },

  breeding: {
    system: 'cave_spawner',
    difficulty: 0.75,
    maturityDays: 14,
    clutchSize: { min: 20, max: 100 },
    // Eggs hatch in about a week (hobby/aquaculture reports) → ~6 × 8.
    incubationHours: 48,
    fryRearingHours: 240,
    cooldownDays: 4,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 24, minTankGallons: 30 },
    predationWithoutNursery: 0.97,
    nurseryRequired: true,
    maxRaisedPerClutch: 6,
    notes: 'The male builds a nest of algae pieces inside a crevice and guards it; females lay small batches of eggs there almost daily in season. The male guards, maintains and clears the nest. Larvae are planktonic and must be reared separately.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // ~5+ years in aquaria → ~220 game-days.
  lifecycle: { juvenileDays: 11, adultDays: 14, lifespanDays: 220, sexVisibleAtDays: 14, hatchSizeCm: 0.3 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 60,
  rarity: 'common',
  visitorAppeal: 0.8,
  unlock: { requires: ['marine_basics'], hint: 'Research Marine Systems to unlock beginner marine fish.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most royal grammas sold are still wild-collected in the Caribbean; captive-bred fish (Biota; earlier BCMI batches for public aquariums) are available in smaller numbers at roughly twice the price.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2011)',
    note: 'Common across the Caribbean. Collection is the main pressure; look for aquacultured fish when available.',
  },

  genetics: {
    loci: [intensityLocus('No commercial morphs. Individuals differ in how sharply the violet front meets the yellow rear. (The "Brazilian gramma" is a different species, Gramma brasiliensis.)')],
    phenotypes: [
      { id: 'wild', name: 'Royal Gramma', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#8a24b8', bodyColor2: '#ffc812', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#8e2fb0',
      bodyColor2: '#f5c01c',
      bellyColor: '#b35ad0',
      finColor: '#9a3bb8',
      finColor2: '#f5c01c',
      accentColor: '#16101c',
      eyeColor: '#d8b43a',
      pattern: 'bicolor',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0,
      translucency: 0.15,
      finType: 'gramma',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Vivid magenta-violet front half blending (not a hard line) into golden-yellow rear half; a thin dark line through the eye and a black spot at the front of the dorsal fin. Pelvic fins long and violet. No morphs.',
  },
  visualMorphs: ['Royal Gramma (no morphs; individual variation)'],

  behaviorSet: 'reef_basslet',
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 5, turnRate: 3.5, hoverTendency: 0.6, schoolingTightness: 0, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['cave_guard', 'upside_down_ledge', 'nest_build', 'mouth_gape_display'],

  encyclopedia: {
    summary: 'A jewel of the Caribbean: half violet, half gold, and happiest hanging upside down beneath a rocky ledge.',
    nativeHabitat: 'Caves and ledges on Caribbean reefs from 1 to 60 m, often in small groups under overhangs.',
    socialStructure: 'Each fish guards a crevice. Males build and defend algae nests where several females may spawn.',
    tankNeeds: 'A 30-gallon or larger tank with plenty of caves, subdued lighting and a meaty diet of mysis, brine shrimp and quality pellets.',
    compatibilityNotes: 'Peaceful with most community fish of similar size but fights other grammas and similar cave-dwellers like dottybacks. Reef-safe. Large predators will eat it.',
    breedingOverview: 'Males weave nests of algae in crevices and guard the eggs. The larvae are planktonic and need careful rearing; aquaculture is now commercial on a small scale.',
    conservationNote: 'Least Concern (IUCN 2011). Most are still wild-caught, so choose aquacultured fish when you can.',
    funFact: 'Royal grammas orient their bellies toward the nearest surface, so under a ledge they swim upside down without a second thought.',
    inGameBehavior: 'Hovers at the mouth of its favourite cave, flips upside down under overhangs, gapes at intruders and darts out to snatch food.',
    feedingNote: 'Snatches food drifting past its cave: thawed mysis and brine shrimp, small marine pellets, flakes and live copepods. Feed small amounts once or twice a day. An autofeeder with pellets or flakes suits it well.',
    keeperTip: 'Under bright reef lights, build at least one shaded cave or overhang just for it. A gramma with a dim retreat of its own settles in faster and spends more time in view.',
  },
  sourceReferences: [
    { id: 'fishbase-gramma-loreto', title: 'FishBase — Gramma loreto (Royal gramma)', url: 'https://www.fishbase.se/summary/Gramma-loreto.html', tier: 1, facts: ['max 8 cm TL', 'depth 1–60 m', '22–27 °C', 'caves and ledges, swims belly toward substrate', 'eats ectoparasites and plankton', 'male nest building and care', 'IUCN Least Concern (2011)', 'reared in captivity'] },
    { id: 'liveaquaria-royal-gramma', title: 'LiveAquaria — Royal Gramma Basslet', url: 'https://www.liveaquaria.com/product/53/?pcatid=53', tier: 2, facts: ['min tank 30 gal', '72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025', 'aggressive to its own kind — keep singly', 'caves and subdued lighting', 'meaty diet', 'price ~$33'] },
    { id: 'coral-mag-cb-royal-gramma', title: 'CORAL Magazine — Quality Marine Offers Captive-Bred Royal Grammas (2016)', url: 'https://www.coralmagazine.com/2016/08/23/quality-marine-offers-captive-bred-royal-grammas/', tier: 2, facts: ['BCMI (Australia) aquacultured royal grammas, 2016', 'first batches limited to public aquariums'] },
    { id: 'biota-royal-gramma', title: 'The Biota Group — Royal Gramma Basslet (captive-bred)', url: 'https://shop.thebiotagroup.com/products/royal-gramm', tier: 2, facts: ['captive-bred Gramma loreto sold to hobbyists', '30+ gal', 'captive-bred price $60–70'] },
  ],
  confidenceNotes: [
    'High confidence: size, cave dwelling, upside-down orientation, male nest care, conspecific aggression.',
    'Clutch size and egg incubation time are drawn from aquaculture/hobby reports (moderate confidence).',
    'Captive-bred availability is real but limited; the bulk of the trade remains wild-caught.',
    'Sex system: treated as gonochoristic (males larger with longer fins); literature on possible sex change in Gramma is sparse.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
  positiveInteractions: [
    { other: 'cleaner_shrimp', text: 'Wild royal grammas pick parasites off other fish; in the tank it happily shares caves with a cleaner shrimp.' },
  ],
};
