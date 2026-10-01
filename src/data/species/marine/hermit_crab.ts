import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Blue-leg hermit crab — Clibanarius tricolor. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#blue-leg-hermit-crab
 */
export const hermitCrab: SpeciesDefinition = {
  id: 'hermit_crab',
  commonName: 'Blue-leg Hermit Crab',
  scientificName: 'Clibanarius tricolor',
  category: 'invertebrate',
  group: 'hermit_crab',
  genus: 'Clibanarius',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Tropical western Atlantic — Florida Keys, Gulf of Mexico and the Caribbean, in the intertidal and shallow subtidal (0–3 m)',
  isStarter: false,

  // LiveAquaria/TFH: about 1 in (2.5 cm) including shell.
  adultSizeCm: 2.5,
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.1,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025. TFH: 75–82 °F. Intertidal animals tolerate swings.
  tempC: { min: 21, max: 29, idealMin: 23, idealMax: 27 },
  pH: { min: 7.8, max: 8.6, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['biofilm', 'detritus', 'algae_wafer', 'nori', 'pellet_sinking'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.3,
  feedingAggression: 0.3,
  hungerHours: 18,

  activityZone: ['bottom', 'substrate', 'decor', 'glass'],
  temperament: 'peaceful',
  territoriality: 0.3,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 5, note: 'Clean-up crews usually hold several. Give at least one spare empty shell per crab, in slightly larger sizes.' },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'tension',
    mixed: 'ok',
    juvenile: 'tension',
    note: 'Hermits battle each other for better shells; the loser can be badly hurt or killed if spare shells are scarce.',
  },

  predatorTags: ['snail', 'snail_small'],
  preyTags: ['crustacean'],
  maxLikelyPreySizeCm: 2,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'caution',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.05,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs rockwork to climb and a supply of empty shells to move into as it grows.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    // Baeza & Behringer 2017: mean fecundity 184–614 embryos per brooding female, varying by site.
    clutchSize: { min: 180, max: 620 },
    incubationHours: 160,
    fryRearingHours: 400,
    cooldownDays: 20,
    conditions: { needsPartner: true, minTankGallons: 20 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Females brood eggs on their abdomen inside the shell and release planktonic larvae into the sea. Larval development of this species is undescribed and it is not bred in aquaria, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'female',
  // TFH: 1–2 years typical in aquaria; well-kept crabs live longer → ~100 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 16, lifespanDays: 100, sexVisibleAtDays: 100, hatchSizeCm: 0.15 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 5,
  rarity: 'common',
  visitorAppeal: 0.35,
  unlock: { requires: ['marine_basics'], hint: 'Research Marine Systems to unlock beginner marine fish and clean-up crew.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All trade blue-leg hermits are wild-collected, mostly in the Florida Keys and Gulf of Mexico.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Collected in large numbers for aquarium clean-up crews; buy only as many as your algae can feed.',
  },

  genetics: {
    loci: [intensityLocus('No colour morphs. Leg blue and band colour vary slightly between individuals; the borrowed shell varies most of all.')],
    phenotypes: [
      { id: 'wild', name: 'Blue-leg Hermit', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#1f63c8', accentColor: '#f05a26' }),
    ],
    baseVisual: {
      bodyColor: '#2c6ccc',
      bodyColor2: '#1d4f9a',
      bellyColor: '#dfe5ee',
      finColor: '#8a7864',
      finColor2: '#5e5042',
      accentColor: '#e4572e',
      eyeColor: '#101418',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.05,
      finType: 'hermit_crab',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the crab renderer: body = cobalt-blue legs and claws; accent = orange-red joint bands and antennae; fin/fin2 = the borrowed snail shell (brown-grey with darker banding). No morphs.',
  },
  visualMorphs: ['Blue-leg Hermit (no morphs; shells vary)'],

  behaviorSet: 'hermit_crab',
  behaviorTraits: { cruiseSpeed: 0.15, burstSpeed: 0.6, turnRate: 1.5, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.3, nocturnal: 0.5, pickRadiusMul: 1.5 },
  specialBehaviors: ['shell_inspect', 'shell_swap', 'algae_pick', 'retract_into_shell', 'rock_climb', 'shell_fight'],

  encyclopedia: {
    summary: 'A tiny, tireless scavenger with cobalt legs that lives in a borrowed snail shell and upgrades its home as it grows.',
    nativeHabitat: 'Rocky intertidal pools, hard-bottom depressions and seagrass in the Florida Keys, Gulf of Mexico and Caribbean.',
    socialStructure: 'Lives in loose aggregations; neighbours constantly inspect, trade and fight over shells.',
    tankNeeds: 'Rock to climb, algae and leftovers to pick at, and spare empty shells a size or two larger. Needs stable marine water; avoid copper.',
    compatibilityNotes: 'Reef-safe with corals and fish. May kill snails to take their shells, especially when spare shells or food run short. Eaten by mantis shrimp and large predatory fish.',
    breedingOverview: 'Females carry eggs inside the shell and release drifting larvae into the sea. Not bred in aquaria.',
    conservationNote: 'Not assessed by the IUCN. Wild-collected in large numbers for clean-up crews, so avoid overstocking a tank that cannot feed them.',
    funFact: 'Hermits are picky homeowners — they test a new shell with their claws, then switch in a split second, exposing their soft abdomen for only an instant.',
    inGameBehavior: 'Trundles over rock and glass picking at algae, pulls back into its shell when startled, and checks out every empty shell you add.',
    feedingNote: 'Scavenges hair algae, film and leftovers from rock and sand, day and night. If algae runs short, add a little algae wafer, seaweed or a few sinking pellets a few times a week. It rarely needs its own autofeeder.',
    keeperTip: 'Keep two or three empty shells per crab, a size or two larger than its current one. With spare homes on hand, blue-legs fight less and are less likely to attack your snails.',
  },
  sourceReferences: [
    { id: 'liveaquaria-blue-leg-hermit', title: 'LiveAquaria — Dwarf Blue Leg Hermit Crab', url: 'https://www.liveaquaria.com/product/623/?pcatid=623', tier: 2, facts: ['max ~1 in', 'eats hair algae and cyanobacteria', 'may attack snails for their shell or food', 'keep in groups', '72–78 °F, SG 1.020–1.025', 'reef compatible'] },
    { id: 'tfh-clibanarius-tricolor', title: 'Tropical Fish Hobbyist — Clibanarius tricolor', url: 'https://www.tfhmagazine.com/articles/saltwater/clibanarius-tricolor', tier: 2, facts: ['~2.5 cm', 'fights other hermits for shells, loser damaged or killed', 'picks on live snails for shells', 'nocturnal feeders', '75–82 °F', '1–2 years in aquaria'] },
    { id: 'baeza-behringer-2017', title: 'Baeza & Behringer (2017) Small-scale spatial variation in reproductive parameters of the blue-legged hermit crab Clibanarius tricolor. PeerJ (PMC5314957)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5314957/', tier: 1, facts: ['Florida Keys intertidal to ~2 m', 'fecundity 184–614 embryos', 'larval development unknown'] },
    { id: 'sealifebase-clibanarius-tricolor', title: 'SeaLifeBase — Clibanarius tricolor', url: 'https://www.sealifebase.se/summary/Clibanarius-tricolor.html', tier: 1, facts: ['western Atlantic/Caribbean', 'depth 0–3 m', 'IUCN Not Evaluated'] },
  ],
  confidenceNotes: [
    'Snail-killing is documented by LiveAquaria and TFH (two sources) but framed differently: TFH thinks crabs mostly want the shell, LiveAquaria says they may also eat the snail. Modelled as a conditional risk that spare shells reduce.',
    'Lifespan: TFH says 1–2 years in aquaria; hobbyists report longer. 100 game-days (~2.5 years) is a middle value.',
    'Breeding is excluded from the game (not_in_game): larval development is undescribed and no aquarium culture exists.',
  ],
  exceptionRules: [
    { other: 'tag:snail', verdictFloor: 'conditional', reason: 'Blue-leg hermits may kill snails to take their shells, especially when spare empty shells or food run short. Adding spare shells reduces the risk.', incidentRisk: 0.04 },
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Hermit crabs are favourite prey for smashing mantis shrimp — shells are no protection.', incidentRisk: 0.5 },
  ],
  special: {
    needsAlgaeOrBiofilm: true,
    medicationSensitive: true,
  },
  visualLane: 'special',
};
