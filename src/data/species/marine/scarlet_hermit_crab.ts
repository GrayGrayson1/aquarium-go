import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Scarlet reef hermit crab — Paguristes cadenati. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#scarlet-reef-hermit-crab
 */
export const scarletHermitCrab: SpeciesDefinition = {
  id: 'scarlet_hermit_crab',
  commonName: 'Scarlet Reef Hermit Crab',
  scientificName: 'Paguristes cadenati',
  category: 'invertebrate',
  group: 'hermit_crab',
  genus: 'Paguristes',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Caribbean, the Bahamas, South Florida and the Gulf of Mexico, on coral reefs and rubble',
  isStarter: false,

  // Wikipedia / Naturalis ~3 cm; LiveAquaria 1.5 in (3.8 cm) maximum.
  adultSizeCm: 3,
  // Aquatics Unlimited 10–15 gal established tank; Reeflex 50 L.
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.1,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025. No copper.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26.5 },
  pH: { min: 7.8, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['biofilm', 'detritus', 'nori', 'algae_wafer', 'flake', 'pellet_small'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.3,
  feedingAggression: 0.25,
  hungerHours: 18,

  activityZone: ['bottom', 'substrate', 'decor', 'glass'],
  temperament: 'peaceful',
  territoriality: 0.2,
  aggression: 0.1,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 3, note: 'Several can share a tank. Keep empty shells of a few shapes, a size larger than the ones they wear.' },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'tension',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Squabbles over shells, less than blue-leg hermits do when spare shells are on hand.',
  },

  predatorTags: ['snail_small'],
  preyTags: ['crustacean'],
  maxLikelyPreySizeCm: 1.5,

  shrimpSafe: 'safe',
  snailSafe: 'mostly_safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.04,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Roams rock and sand; it hides to molt and then moves quickly into a bigger shell.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 100, max: 600 },
    incubationHours: 160,
    fryRearingHours: 400,
    cooldownDays: 20,
    conditions: { needsPartner: true, minTankGallons: 20 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes; females carry orange eggs in the shell year-round and release planktonic larvae. Not bred in aquaria, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'female',
  // Top Shelf: 2–4 years (unverified) → ~120 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 16, lifespanDays: 120, sexVisibleAtDays: 120, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 7,
  rarity: 'common',
  visitorAppeal: 0.45,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected in the Caribbean and Florida (a licensed Florida "marine life" catch).',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Collected for clean-up crews; Florida limits how many a collector may take.',
  },

  genetics: {
    loci: [intensityLocus('No colour forms. Bright red legs and claws, deep red antennae and yellow eyestalks; the borrowed shell varies.')],
    phenotypes: [
      { id: 'wild', name: 'Scarlet Reef Hermit', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#e0122a', accentColor: '#ffd030' }),
    ],
    baseVisual: {
      bodyColor: '#d0182a',
      bodyColor2: '#8e0f1a',
      bellyColor: '#e8e2d2',
      finColor: '#c9b79c',
      finColor2: '#7a5e44',
      accentColor: '#f2c230',
      eyeColor: '#b8c640',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.05,
      finType: 'hermit_crab',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the crab renderer: body = red legs and claws; body2 = deep red antennae; accent = yellow eyestalks and face; fin/fin2 = the borrowed cerith-style shell. Smooth, hairless legs; the left claw a little larger.',
  },
  visualMorphs: ['Scarlet Reef Hermit (no morphs; shells vary)'],

  behaviorSet: 'hermit_crab',
  behaviorTraits: { cruiseSpeed: 0.15, burstSpeed: 0.6, turnRate: 1.5, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.3, nocturnal: 0.4, pickRadiusMul: 1.5 },
  specialBehaviors: ['shell_inspect', 'shell_swap', 'algae_pick', 'retract_into_shell', 'rock_climb'],

  encyclopedia: {
    summary: 'A bright red, yellow-eyed hermit that clears hair algae and slime from the rock and is gentler with snails than most.',
    nativeHabitat: 'Coral reefs and rubble in the Caribbean and Gulf of Mexico, from the shallows to tens of metres down.',
    socialStructure: 'Lives loosely alongside others, swapping into better shells as it grows.',
    tankNeeds: 'An established tank of 10 gallons or more with algae to graze, spare empty shells, stable water and no copper.',
    compatibilityNotes: 'Reef-safe and peaceful; may tip loose frags or steal food from corals. It rarely bothers snails if spare shells are on hand. Prey for mantis shrimp.',
    breedingOverview: 'Females carry eggs in the shell and release drifting larvae; not bred in aquaria.',
    conservationNote: 'Not assessed by the IUCN. Wild-collected under Florida’s marine-life rules.',
    funFact: 'It has been on a postage stamp — Barbados, 1985.',
    inGameBehavior: 'Trundles over rock and sand picking at algae, ducks into its shell when startled, and tries on every empty shell you add.',
    feedingNote: 'Grazes hair and film algae, slime and detritus day and night, and takes fish food that reaches the bottom. If algae runs short, add a little dried seaweed or an algae wafer.',
    keeperTip: 'Keep empty shells of several shapes a size larger than the one it wears — it prefers light, oval shells.',
  },
  sourceReferences: [
    { id: 'worms-paguristes-cadenati', title: 'WoRMS — Paguristes cadenati Forest, 1954', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=368215', tier: 1, facts: ['accepted name', 'Diogenidae', 'coral reefs and hard bottoms'] },
    { id: 'oca-red-reef-hermit', title: 'Oregon Coast Aquarium — Red reef hermit crab', url: 'https://aquarium.org/animals/red-reef-hermit-crab/', tier: 1, facts: ['detritus scavenger', 'IUCN not evaluated', '1985 Barbados stamp'] },
    { id: 'naturalis-paguristes-cadenati', title: 'Naturalis Caribbean diving — Paguristes cadenati', url: 'https://caribbean-diving.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=6428', tier: 1, facts: ['red legs, yellow eyestalks', '~3 cm'] },
    { id: 'liveaquaria-scarlet-hermit', title: 'LiveAquaria — Scarlet Reef Hermit Crab', url: 'https://www.liveaquaria.com/product/620/', tier: 2, facts: ['1.5 in max', '72–78 °F, pH 8.1–8.4, SG 1.020–1.025', 'eats hair and slime algae and cyanobacteria', 'needs spare shells', 'reef safe'] },
    { id: 'topshelf-scarlet-hermit', title: 'Top Shelf Aquatics — Scarlet Red Hermit Crab', url: 'https://topshelfaquatics.com/pages/saltwater-invertebrates/scarlett-red-hermit-crab', tier: 2, facts: ['rarely bothers snails if shells are scarce it may', 'prefers light oval shells', 'hides to molt', 'may irritate LPS'] },
  ],
  confidenceNotes: [
    'Snail safety: sources and keepers disagree; many bad reports turn out to be red-leg hermits. Modelled as a small risk that spare shells reduce.',
    'Depth range differs by source (0–100 m, 8–30 m, 1–52 m); irrelevant in a tank.',
    'Lifespan (2–4 years) comes from a retailer page only.',
  ],
  exceptionRules: [
    { other: 'tag:snail', verdictFloor: 'usually_compatible', reason: 'May take a living snail’s shell when spare empty shells run out; with shells on hand it rarely bothers snails.', incidentRisk: 0.015 },
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Hermit crabs are favourite prey for smashing mantis shrimp — the shell is no protection.', incidentRisk: 0.5 },
  ],
  special: {
    needsAlgaeOrBiofilm: true,
    medicationSensitive: true,
  },
  visualLane: 'special',
};
