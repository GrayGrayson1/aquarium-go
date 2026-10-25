import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Cerith snail (Florida cerith) — Cerithium atratum. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#cerith-snail
 */
export const cerithSnail: SpeciesDefinition = {
  id: 'cerith_snail',
  commonName: 'Cerith Snail',
  scientificName: 'Cerithium atratum',
  category: 'invertebrate',
  group: 'snail',
  genus: 'Cerithium',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Atlantic — North Carolina to Brazil, 0–91 m, on sand, seagrass, rock, coral and mangrove mud',
  isStarter: false,

  // Trade snails 1–1.25 in (Reef Cleaners); wild shells about 4 cm, up to 5 cm.
  adultSizeCm: 3,
  // Best in larger, established tanks with deep sand (LiveAquaria); roughly one per 5 gal.
  recommendedMinTankGallons: 5,
  recommendedFootprint: { minLengthIn: 16, minWidthIn: 8 },
  activeSwimmer: false,
  bioload: 0.08,

  // LiveAquaria (all four clean-up snails): 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; sensitive to copper and high nitrate.
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'detritivore',
  foods: ['detritus', 'biofilm', 'pellet_sinking', 'algae_wafer'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.05,
  feedingAggression: 0,
  hungerHours: 20,

  activityZone: ['substrate', 'bottom', 'glass', 'decor'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 4, note: 'Roughly one per 5 gallons.' },
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
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Lives mostly in the sand, turning it over, and climbs the glass at night.' },

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
    notes: 'Lays ribbon-like egg strands on the glass after dark in summer; the larvae rarely settle in tanks. The game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // No lifespan found → ~140 game-days like the other clean-up snails.
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 140, sexVisibleAtDays: 140, hatchSizeCm: 0.05 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 3,
  rarity: 'common',
  visitorAppeal: 0.2,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected in Florida; one of the cheapest and most available reef snails.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. The most common cerith of southwest Florida’s flats.',
  },

  genetics: {
    loci: [intensityLocus('No colour forms. Dirty white to grey with irregular brown mottling, often carrying algae or coralline growth.')],
    phenotypes: [
      { id: 'wild', name: 'Cerith', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#5e4e40', accentColor: '#e2dccc' }),
    ],
    baseVisual: {
      bodyColor: '#6a5a4a',
      bodyColor2: '#3e342c',
      bellyColor: '#a89884',
      finColor: '#7a746a',
      finColor2: '#efeae0',
      accentColor: '#d8d2c3',
      eyeColor: '#101010',
      pattern: 'speckled',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.05,
      finType: 'snail_cerith',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Colour slots for the snail renderer: body/body2 = grey-brown spire and its mottling; accent = the pale beads; fin/belly = grey foot (unsourced). A tall, slender, many-whorled spire with beaded spiral cords.',
  },
  visualMorphs: ['Cerith (no morphs)'],

  behaviorSet: 'snail',
  behaviorTraits: { cruiseSpeed: 0.04, burstSpeed: 0.06, turnRate: 0.6, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0.4, glassSurfing: 0, curiosity: 0.1, nocturnal: 0.7, pickRadiusMul: 1.6 },
  specialBehaviors: ['sand_turn', 'glass_graze', 'night_climb'],

  encyclopedia: {
    summary: 'A slender spire-shelled snail that turns over the sand bed and climbs the glass at night, eating detritus and film.',
    nativeHabitat: 'Shallow sandy and muddy flats, seagrass and reefs from North Carolina to Brazil.',
    socialStructure: 'Solitary, though many share a sand bed.',
    tankNeeds: 'A sand bed and a mature tank with detritus and film algae; stable water, no copper.',
    compatibilityNotes: 'Reef-safe. Hermit crabs love its shell — in Brazil three-quarters of one hermit species’ shells were ceriths.',
    breedingOverview: 'Lays egg strands on the glass at night; the young rarely settle in tanks.',
    conservationNote: 'Not assessed by the IUCN. Abundant in the wild.',
    funFact: 'Hermit crabs prize its long shell — in one Brazilian study, 76% of a hermit species’ homes were cerith shells.',
    inGameBehavior: 'Ploughs through the top of the sand by day and rides up the glass at night.',
    feedingNote: 'Eats detritus, uneaten food, film algae and diatoms. In a clean tank, drop in a sinking pellet or algae wafer now and then.',
    keeperTip: 'Give new ceriths 72 hours before deciding they are dead — they often sit still for days after the move.',
  },
  sourceReferences: [
    { id: 'worms-cerithium-atratum', title: 'WoRMS — Cerithium atratum (Born, 1778)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=224572', tier: 1, facts: ['accepted name', 'Florida cerith', 'C. floridanum a synonym'] },
    { id: 'sealifebase-cerithium-atratum', title: 'SeaLifeBase — Cerithium atratum', url: 'https://www.sealifebase.se/summary/Cerithium-atratum.html', tier: 1, facts: ['North Carolina to Brazil', '0–91 m', 'max 5.0 cm', 'IUCN not evaluated'] },
    { id: 'bmsm-cerithium-atratum', title: 'Bailey-Matthews National Shell Museum — Cerithium atratum', url: 'https://shells.shellmuseum.org/shell/cerithium-atratum/', tier: 1, facts: ['~40 mm', 'detritus feeder', 'beaded spiral cords', 'grey with brown mottling'] },
    { id: 'biagi-2006-hermit-shells', title: 'Biagi et al. (2006) Shell use by the hermit crab Paguristes calliopsis. An. Acad. Bras. Ciênc. 78(3)', url: 'https://www.scielo.br/j/aabc/a/JDCTK3Zm7YFjVqb73tWyzgC/abstract/?lang=en', tier: 1, facts: ['C. atratum 75.86% of shells used'] },
    { id: 'reefcleaners-florida-cerith', title: 'Reef Cleaners — Florida Cerith', url: 'https://www.reefcleaners.org/florida-cerith', tier: 2, facts: ['1–1.25 in', 'film algae, diatoms, detritus', 'egg strands in summer, larvae rarely settle', 'active at night', 'dormant 72 h after adding', '~$1 each'] },
  ],
  confidenceNotes: [
    'Trade "ceriths" may be mixed (LiveAquaria sells Cerithium sp. from the Caribbean and Eastern Pacific); the game uses the Florida cerith.',
    'Lifespan: no figure found.',
    'SeaLifeBase’s "broadcast spawner" is a generic note for the order and contradicts the egg strands; the game follows the keepers’ reports.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Mantis shrimp smash snails.', incidentRisk: 0.4 },
  ],
  special: { needsAlgaeOrBiofilm: true, medicationSensitive: true },
  visualLane: 'special',
};
