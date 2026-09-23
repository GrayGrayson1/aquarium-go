import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Firefish (fire goby, magnificent dartfish) — Nemateleotris magnifica. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#firefish
 */
export const firefish: SpeciesDefinition = {
  id: 'firefish',
  commonName: 'Firefish',
  scientificName: 'Nemateleotris magnifica',
  category: 'fish',
  group: 'dartfish',
  genus: 'Nemateleotris',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — East Africa to Hawaii, the Marquesas and Pitcairn, north to the Ryukyus, south to New Caledonia',
  isStarter: false,

  // FishBase max 9 cm TL; aquarium adults ~7–7.5 cm (LiveAquaria 3 in).
  adultSizeCm: 7.5,
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.7,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025. FishBase: 22–28 °C.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'planktivore',
  foods: ['mysis', 'brine_shrimp', 'copepod_live', 'pellet_small', 'flake'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.4,
  feedingAggression: 0.1,
  hungerHours: 12,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.35,
  aggression: 0.02,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.5, note: 'Keep one, or a mated pair. Two unpaired firefish usually fight.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'fight',
    mixed: 'courtship_ok',
    juvenile: 'tension',
    note: 'Aggressive only toward its own kind; a true mated pair shares a burrow peacefully.',
  },

  predatorTags: ['copepod', 'shrimp_fry'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 0.8,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'avoids',

  hidesNeeded: 2,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs bolt holes in rockwork or rubble a short dart away from where it hovers.' },

  breeding: {
    system: 'cave_spawner',
    difficulty: 0.9,
    maturityDays: 14,
    // Congener N. decora: 400–500 eggs per spawn, hatching after 96 h at 28 °C (captive study).
    clutchSize: { min: 300, max: 500 },
    incubationHours: 32,
    fryRearingHours: 320,
    cooldownDays: 7,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 25, minTankGallons: 30 },
    predationWithoutNursery: 0.99,
    nurseryRequired: true,
    maxRaisedPerClutch: 4,
    notes: 'Mated pairs are monogamous and share a burrow, where eggs are laid and guarded by the male. The pelagic larvae are very hard to raise: N. magnifica is not commercially bred, though its cousin the purple firefish has been.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // ~3–5 years in aquaria → ~160 game-days.
  lifecycle: { juvenileDays: 11, adultDays: 14, lifespanDays: 160, sexVisibleAtDays: 16, hatchSizeCm: 0.19 },

  hardiness: 0.7,
  difficulty: 'beginner',
  baseValue: 38,
  rarity: 'common',
  visitorAppeal: 0.75,
  unlock: { requires: ['marine_basics'], hint: 'Unlocks with beginner marine fish.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Firefish in the trade are wild-collected; captive breeding of this species has not reached commercial scale.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2023)',
    note: 'Widespread and common. Because every firefish is wild-caught, a lid and a calm tank that keep it alive for years matter.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. The red rear half varies from orange-red to deep crimson between individuals.')],
    phenotypes: [
      { id: 'wild', name: 'Firefish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor2: '#d2301f', finColor: '#b81e1a' }),
    ],
    baseVisual: {
      bodyColor: '#f1e7d6',
      bodyColor2: '#e2482a',
      bellyColor: '#f7efe3',
      finColor: '#d63224',
      finColor2: '#1a1010',
      accentColor: '#f5cf3a',
      eyeColor: '#2a2320',
      pattern: 'bicolor',
      patternScale: 1,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.2,
      finType: 'dartfish',
      finLength: 1.2,
      bodyDepth: 0.9,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Slender body: yellow snout and face (accent), pearly white front half grading through peach to fiery red-orange rear; tail and rear dorsal/anal fins deep red with black edging. Very tall, filament-like first dorsal fin it flicks constantly. No morphs.',
  },
  visualMorphs: ['Firefish (no morphs; individual variation)'],

  behaviorSet: 'dartfish',
  behaviorTraits: { cruiseSpeed: 0.4, burstSpeed: 7, turnRate: 3, hoverTendency: 0.9, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0.1, glassSurfing: 0.02, curiosity: 0.35, nocturnal: 0 },
  specialBehaviors: ['bolt_hole_dart', 'dorsal_flick', 'hover_face_current', 'plankton_snap', 'jump_risk'],

  encyclopedia: {
    summary: 'A slender, flame-tailed dartfish that hovers above its burrow flicking a tall dorsal spine — and vanishes in a blink when startled.',
    nativeHabitat: 'Rubble and sand patches on outer reef slopes, usually 6–28 m deep, hovering just above a burrow facing the current.',
    socialStructure: 'Lives alone or in monogamous pairs that share a burrow.',
    tankNeeds: 'A 20-gallon or larger tank with bolt holes in the rockwork, calm tank mates, frequent small meals — and a tight lid, because startled firefish jump.',
    compatibilityNotes: 'Peaceful and reef-safe. Fights its own kind unless mated. Bullied by boisterous fish and eaten by lionfish and groupers.',
    breedingOverview: 'Pairs spawn in their burrow and the male guards the eggs, but the planktonic larvae are rarely raised; the species is not commercially bred.',
    conservationNote: 'Least Concern (IUCN 2023). Every firefish sold is wild-caught, so a secure lid and a calm tank are part of responsible keeping.',
    funFact: 'The firefish constantly flicks its long first dorsal spine — likely a signal to neighbours — and wedges itself into its hole with that same spine raised.',
    inGameBehavior: 'Hovers facing the current, snaps at drifting food, flicks its dorsal filament, and darts into its bolt hole at the first sign of trouble.',
  },
  sourceReferences: [
    { id: 'fishbase-nemateleotris-magnifica', title: 'FishBase — Nemateleotris magnifica (Fire goby)', url: 'https://www.fishbase.se/summary/Nemateleotris-magnifica.html', tier: 1, facts: ['max 9 cm TL', 'depth typically 6–28 m', '22–28 °C', 'hovers above bottom facing current, eats zooplankton', 'monogamous', 'IUCN Least Concern (2023)'] },
    { id: 'liveaquaria-firefish', title: 'LiveAquaria — Firefish', url: 'https://www.liveaquaria.com/product/168/?pcatid=168', tier: 2, facts: ['min tank 20 gal', 'jumps when stressed — needs a lid', 'needs safety zones to dart into', 'aggressive only to own species; mated pairs peaceful', '72–78 °F, SG 1.020–1.025', 'price ~$40'] },
    { id: 'madhu-2014-nemateleotris-decora', title: 'Captive spawning and embryonic development of purple firefish Nemateleotris decora (Aquaculture 424, 2014)', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0044848613006820', tier: 1, facts: ['congener: 400–500 eggs per spawn', 'incubation 96 h at 28 °C', 'males guard eggs', 'larvae 1.9 mm'] },
  ],
  confidenceNotes: [
    'Breeding numbers come from the congener N. decora (abstract seen via search index; full text paywalled); N. magnifica itself is not reported as commercially bred.',
    'Lifespan (~3–5 years in aquaria) is a care-sheet estimate.',
    'Pairing: FishBase lists the species as monogamous; LiveAquaria confirms mated pairs coexist while other conspecifics fight.',
  ],
  exceptionRules: [],
  special: {
    escapeArtist: true,
  },
  visualLane: 'fish',
};
