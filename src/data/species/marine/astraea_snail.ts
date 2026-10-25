import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Astraea snail (West Indian star snail) — Lithopoma tectum, sold as Astraea tecta. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#astraea-snail
 */
export const astraeaSnail: SpeciesDefinition = {
  id: 'astraea_snail',
  commonName: 'Astraea Snail',
  scientificName: 'Lithopoma tectum',
  category: 'invertebrate',
  group: 'snail',
  genus: 'Lithopoma',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Caribbean, the Gulf of Mexico, the Lesser Antilles and Brazil, on rocky shores and reefs 0–10 m deep',
  isStarter: false,

  // Trade snails up to 1 in (LiveAquaria, Reef Cleaners); wild shells up to 6 cm (SeaLifeBase).
  adultSizeCm: 2.5,
  // About one per 5 gal, by how much algae the tank grows.
  recommendedMinTankGallons: 5,
  recommendedFootprint: { minLengthIn: 16, minWidthIn: 8 },
  activeSwimmer: false,
  bioload: 0.1,

  // LiveAquaria (all four clean-up snails): 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; sensitive to copper and high nitrate.
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'herbivore',
  foods: ['biofilm', 'algae_wafer', 'nori', 'vegetable'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.04,
  feedingAggression: 0,
  hungerHours: 18,

  activityZone: ['glass', 'decor', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 4, note: 'Roughly one per 5 gallons in a tank that grows algae.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Entirely peaceful with its own kind.' },

  predatorTags: [],
  preyTags: ['snail', 'snail_small'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.2,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Grazes rock and glass; it cannot right itself if it falls on its back, so set flipped snails upright.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 12,
    clutchSize: { min: 100, max: 2000 },
    incubationHours: 24,
    fryRearingHours: 120,
    cooldownDays: 20,
    conditions: { needsPartner: true, minTankGallons: 20 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes; broadcast spawns (sperm first, then eggs), sometimes in tanks after a warm spell, but the eggs are eaten and juveniles are rare. The game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 3–5 years (Aquarium Breeder, unverified) → ~140 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 140, sexVisibleAtDays: 140, hatchSizeCm: 0.05 },

  hardiness: 0.6,
  difficulty: 'beginner',
  baseValue: 3,
  rarity: 'common',
  visitorAppeal: 0.2,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected in Florida and the Caribbean; Florida landings of turban and star snails can top a million a year.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Collected in huge numbers for clean-up crews.',
  },

  genetics: {
    loci: [intensityLocus('No colour forms. Shells range from olive-green to reddish orange with pale patches, often crusted with algae.')],
    phenotypes: [
      { id: 'wild', name: 'Astraea', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#7a884c', accentColor: '#5a6a3a' }),
    ],
    baseVisual: {
      bodyColor: '#8a8a62',
      bodyColor2: '#6e7a45',
      bellyColor: '#a89a84',
      finColor: '#8c8676',
      finColor2: '#e9e4d6',
      accentColor: '#5e6a40',
      eyeColor: '#101010',
      pattern: 'bars',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.05,
      finType: 'snail_astraea',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Colour slots for the snail renderer: body/body2 = olive cone and its patches; accent = algae film; fin/belly = grey-tan foot (unsourced). A flat-sided cone of about 6 whorls with slanting folds that stand out as knobs at each keel, a nearly flat base.',
  },
  visualMorphs: ['Astraea (shell colour varies)'],

  behaviorSet: 'snail',
  behaviorTraits: { cruiseSpeed: 0.03, burstSpeed: 0.04, turnRate: 0.5, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.1, nocturnal: 0.6, pickRadiusMul: 1.5 },
  specialBehaviors: ['glass_graze', 'film_graze', 'cannot_self_right'],

  encyclopedia: {
    summary: 'A little star-shaped cone snail that grazes film and hair algae from rock and glass — but can’t turn itself over.',
    nativeHabitat: 'Rocky intertidal shores and reefs from Florida and the Gulf through the Caribbean to Brazil.',
    socialStructure: 'Solitary grazers that ignore each other.',
    tankNeeds: 'A tank with film or hair algae (or seaweed), stable water, no copper — and a keeper who rights fallen snails.',
    compatibilityNotes: 'Reef-safe and too small to topple corals. Wrasses, puffers, triggers, crabs and hermits pick at it, especially when it lies upside down.',
    breedingOverview: 'Spawns into the water now and then in tanks; the eggs are eaten and young are rare.',
    conservationNote: 'Not assessed by the IUCN. Collected by the hundreds of thousands for the trade.',
    funFact: 'Its shell is a near-perfect pyramid — the knobbed folds on each whorl make a star when you look down on it.',
    inGameBehavior: 'Creeps over the rock and glass grazing, busiest at dusk — and if it tumbles onto its back, it stays there until you help.',
    feedingNote: 'Grazes film algae, diatoms, some hair algae and cyanobacteria. When the algae runs short, add a little seaweed or an algae wafer.',
    keeperTip: 'Check every day for snails on their backs and turn them over — an upturned Astraea starves or gets eaten.',
  },
  sourceReferences: [
    { id: 'worms-lithopoma-tectum', title: 'WoRMS — Lithopoma tectum ([Lightfoot], 1786)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=419499', tier: 1, facts: ['accepted name', 'West Indian starsnail', 'no record for Astraea tecta'] },
    { id: 'sealifebase-lithopoma-tectum', title: 'SeaLifeBase — Lithopoma tectum', url: 'https://www.sealifebase.se/summary/Lithopoma-tectum.html', tier: 1, facts: ['max 6.0 cm', '0–10 m, rocky intertidal', 'IUCN not evaluated'] },
    { id: 'was-2022-florida-snail-landings', title: 'Geiger & Levine (FWC) — Florida marine-life snail landings, Aquaculture 2022 abstract', url: 'https://was.org/Meeting/Program/PaperDetail/157970', tier: 1, facts: ['Turbo and Lithopoma landings can exceed one million a year'] },
    { id: 'liveaquaria-astraea', title: 'LiveAquaria — Astraea Turbo Snail', url: 'https://www.liveaquaria.com/products/astraea-turbo-snail', tier: 2, facts: ['up to 1 in', 'pyramid shell', 'eats hair algae, cyanobacteria, diatoms', 'cannot right itself', '72–78 °F, SG 1.023–1.025'] },
    { id: 'reefcleaners-astraea', title: 'Reef Cleaners — Astraea tectas', url: 'https://www.reefcleaners.org/astraea-tectas', tier: 2, facts: ['nickel- to quarter-sized', 'film and hair algae', 'cannot right itself', '~$1 each'] },
  ],
  confidenceNotes: [
    'Name: the trade’s "Astraea tecta" is Lithopoma tectum in WoRMS, and trade stock probably mixes Lithopoma species.',
    'Hair algae: most sources say it eats it, one says it mostly ignores it.',
    'Lifespan comes from a hobby guide only.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Mantis shrimp smash snails.', incidentRisk: 0.4 },
  ],
  special: { needsAlgaeOrBiofilm: true, medicationSensitive: true },
  visualLane: 'special',
};
