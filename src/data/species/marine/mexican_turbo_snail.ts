import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Mexican turbo snail (wavy turban) — Turbo fluctuosus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#mexican-turbo-snail
 */
export const mexicanTurboSnail: SpeciesDefinition = {
  id: 'mexican_turbo_snail',
  commonName: 'Mexican Turbo Snail',
  scientificName: 'Turbo fluctuosus',
  category: 'invertebrate',
  group: 'snail',
  genus: 'Turbo',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Eastern Pacific — Baja California and the Gulf of California to Peru and the Galápagos, on and under rocks from the intertidal to 40 m',
  isStarter: false,

  // Trade snails up to 2 in (LiveAquaria); wild shells 2.5–8.6 cm, about as high as wide.
  adultSizeCm: 5,
  // Aquarium Breeder: 10 gal minimum, about one per 5–10 gal (one per 1–3 gal for heavy algae).
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.3,

  // LiveAquaria (all four clean-up snails): 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; sensitive to copper and high nitrate.
  // Gulf of California reefs run 14–32 °C (Galland et al. 2019), so a 25–26 °C reef is inside its range; keepers report shorter lives above ~26 °C.
  tempC: { min: 19, max: 28, idealMin: 21.5, idealMax: 25 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'herbivore',
  foods: ['biofilm', 'nori', 'algae_wafer', 'vegetable'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.05,
  feedingAggression: 0,
  hungerHours: 18,

  activityZone: ['glass', 'decor', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 3, note: 'About one per 5–10 gallons; more only where hair algae grows fast.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Entirely peaceful with its own kind.' },

  predatorTags: [],
  preyTags: ['snail'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.02,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.2,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Grazes rock and glass, mostly in the evening and at night; a heavy snail that knocks over loose rock and frags.' },

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
    notes: 'Separate sexes that spawn into the water; the larvae rarely survive in aquaria and no captive-bred supply exists, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 3–5 years wild, 1–2 in tanks (Aquarium Breeder, unverified) → ~140 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 140, sexVisibleAtDays: 140, hatchSizeCm: 0.05 },

  hardiness: 0.7,
  difficulty: 'beginner',
  baseValue: 5,
  rarity: 'common',
  visitorAppeal: 0.25,
  unlock: { requires: [] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected in the Gulf of California; LiveAquaria pauses collection July–September in the extreme heat.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Collected in large numbers for clean-up crews; buy only as many as your algae can feed.',
  },

  genetics: {
    loci: [intensityLocus('No colour forms. Shells vary a lot — olive, green, brown, reddish or orange, with white streaks, checks and dark mottling.')],
    phenotypes: [
      { id: 'wild', name: 'Mexican Turbo', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#5e5032', accentColor: '#7a3e24' }),
    ],
    baseVisual: {
      bodyColor: '#6b5a3a',
      bodyColor2: '#4f4430',
      bellyColor: '#8c8a78',
      finColor: '#4a4a40',
      finColor2: '#e8e2d0',
      accentColor: '#8a4b2e',
      eyeColor: '#101010',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.05,
      finType: 'snail_turbo',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Colour slots for the snail renderer: body/body2 = olive-brown shell and its mottling; accent = rows of dark and pale checks along the spiral cords; fin/belly = grey foot and tentacles (unsourced). A globose turban with a short conic spire, coarse spiral cords, a knobbed shoulder and a thick round chalky operculum.',
  },
  visualMorphs: ['Mexican Turbo (shell colour varies)'],

  behaviorSet: 'snail',
  behaviorTraits: { cruiseSpeed: 0.03, burstSpeed: 0.05, turnRate: 0.5, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.1, nocturnal: 0.6, pickRadiusMul: 1.5 },
  specialBehaviors: ['hair_algae_graze', 'glass_graze', 'rock_bulldoze'],

  encyclopedia: {
    summary: 'A big, heavy turban snail that mows hair algae off the rock and glass — and bulldozes anything not glued down.',
    nativeHabitat: 'Rocky shores and reefs from the intertidal to 40 m, mostly in the Gulf of California.',
    socialStructure: 'Solitary grazers that tolerate each other completely.',
    tankNeeds: 'A tank of 10 gallons or more with algae to graze (or dried seaweed), secure rockwork and glued frags, stable water and no copper.',
    compatibilityNotes: 'Reef-safe, but tips over loose rock and frags. Eaten or harassed by big wrasses, puffers, triggers, hawkfish, large crabs and shell-hunting hermits.',
    breedingOverview: 'Spawns into the water in tanks now and then, but the young almost never survive.',
    conservationNote: 'Not assessed by the IUCN. Wild-collected in large numbers for the trade.',
    funFact: 'Its trapdoor is a heavy white dome of shell ringed with beaded green ridges.',
    inGameBehavior: 'Plods over rock and glass at dusk and through the night, mowing algae as it goes.',
    feedingNote: 'Grazes hair algae, film and diatoms. When the algae runs out, clip on a piece of dried seaweed or drop in an algae wafer.',
    keeperTip: 'Glue your frags and secure the rockwork — a turban this heavy pushes loose pieces over.',
  },
  sourceReferences: [
    { id: 'worms-turbo-fluctuosus', title: 'WoRMS — Turbo fluctuosus W. Wood, 1828', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=413380', tier: 1, facts: ['accepted name', 'Turbo fluctuosa an incorrect spelling'] },
    { id: 'galland-2019-gulf-temperatures', title: 'Galland, Hastings & Leichter (2019) Thermal variability on Gulf of California reefs. Sci. Rep. 9:18022', url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6889390/fullTextXML', tier: 1, facts: ['14.1–32.1 °C at 5 m over a year', 'site means 20.9–25.3 °C'] },
    { id: 'liveaquaria-mexican-turbo', title: 'LiveAquaria — Mexican Turbo Snail', url: 'https://www.liveaquaria.com/product/571/', tier: 2, facts: ['up to 2 in', '72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025', 'fond of hair algae', 'knocks over unsecured frags', 'no collection July–September'] },
    { id: 'topshelf-mexican-turbo', title: 'Top Shelf Aquatics — Mexican Turbo Snail', url: 'https://topshelfaquatics.com/pages/saltwater-invertebrates/mexican-turbo-snail', tier: 2, facts: ['24–26 °C', 'grazes at night', 'threats: wrasses, puffers, triggers, hawkfish, crabs, hermits'] },
  ],
  confidenceNotes: [
    'Temperature: often called a cold-water snail, but its own reefs run 14–32 °C; the game sets its ideal at 21.5–25 °C and tolerates up to 28.',
    'Whether it can right itself differs by source; the game lets it.',
    'Lifespan comes from a hobby guide only.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Mantis shrimp smash snails, even a heavy turban.', incidentRisk: 0.4 },
  ],
  special: { needsAlgaeOrBiofilm: true, medicationSensitive: true },
  visualLane: 'special',
};
