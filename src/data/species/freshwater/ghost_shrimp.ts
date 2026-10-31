import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Ghost shrimp (eastern grass shrimp) — Palaemon paludosus, formerly Palaemonetes paludosus. Lane species-fw, chunk 16
 * (ADR-0052). Sources, key facts and conflicts: docs/research/freshwater.md#ghost-shrimp
 * "Ghost shrimp" is a loose trade name (sellers use it for Macrobrachium and others too); the game models P. paludosus.
 */
export const ghostShrimp: SpeciesDefinition = {
  id: 'ghost_shrimp',
  commonName: 'Ghost Shrimp',
  scientificName: 'Palaemon paludosus',
  category: 'invertebrate',
  group: 'freshwater_shrimp',
  genus: 'Palaemon',
  environment: 'freshwater',
  waterClasses: ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'The Atlantic coastal plain of the eastern USA, from New Jersey to Florida — ponds, lakes and streams thick with water plants',
  isStarter: false,

  // ADW: adults under 50 mm, large females 25–43 mm; Aquariadise males ~4 cm, females ~5 cm.
  adultSizeCm: 4,
  // Aquariadise 5 gal; The Shrimp Farm 10 gal and about three per gallon.
  recommendedMinTankGallons: 5,
  recommendedFootprint: { minLengthIn: 16, minWidthIn: 8 },
  activeSwimmer: false,
  bioload: 0.2,

  // The Shrimp Farm 18–27.5 °C, pH 6.5–8.0, 3–15 dKH; ADW wild preference 10–35 °C.
  tempC: { min: 15, max: 30, idealMin: 20, idealMax: 26 },
  pH: { min: 6.5, max: 8.2, idealMin: 7, idealMax: 8 },
  salinitySG: null,
  gh: { min: 3, max: 15 },
  kh: { min: 3, max: 15 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['detritus', 'biofilm', 'algae_wafer', 'pellet_sinking', 'flake', 'bloodworm'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.3,
  feedingAggression: 0.3,
  hungerHours: 36,

  activityZone: ['bottom', 'decor', 'glass', 'substrate'],
  temperament: 'peaceful',
  territoriality: 0.05,
  aggression: 0.1,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 6, note: 'Bolder in a group; about three to a gallon at most.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'They jostle over food but rarely hurt each other.' },

  // a bolder scavenger than the dwarf shrimps: it takes fish fry, eggs and small worms
  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod', 'worm'],
  preyTags: ['shrimp_large', 'crustacean'],
  maxLikelyPreySizeCm: 0.8,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_gravel', 'planted_soil', 'fine_sand'], avoid: [], note: 'Plants and wood to pick over and hide in while moulting; a sponge filter, since shrimp and young are sucked into open intakes.' },

  breeding: {
    system: 'shrimp_berried',
    difficulty: 0.4,
    maturityDays: 8,
    clutchSize: { min: 10, max: 80 },
    incubationHours: 140,
    fryRearingHours: 96,
    cooldownDays: 4,
    conditions: { needsPartner: true, needsCover: true, minTempC: 22, maxTempC: 29, minTankGallons: 5 },
    predationWithoutNursery: 0.7,
    nurseryRequired: false,
    maxRaisedPerClutch: 6,
    notes: 'The female mates within hours of a moult and carries 10–80 green eggs under her tail for two to three weeks. Unlike cherry shrimp, the young hatch as tiny swimming larvae — but they need no brackish water and live off their yolk, becoming miniature shrimp within about a week. Fish and filter intakes take most of them, so a planted tank with a sponge filter is the nursery. The game counts the larval week as part of rearing.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'female',
  // 6–13 months wild, 1–1.5 years in aquaria (The Shrimp Farm) → ~50 game-days.
  lifecycle: { juvenileDays: 8, adultDays: 10, lifespanDays: 50, sexVisibleAtDays: 8, hatchSizeCm: 0.4 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 1,
  rarity: 'common',
  visitorAppeal: 0.3,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most are collected or pond-raised in the south-eastern USA, often sold as feeders.',
  conservation: { status: 'Least Concern (IUCN Red List)', note: 'Common in its native range and already introduced in California. Never release aquarium animals.' },

  genetics: {
    loci: [intensityLocus('No colour forms. Glass-clear with fine speckling, orange bands on the antennae and front claws and red dots on the tail fan; it can shift its pigment to match the background.')],
    phenotypes: [
      { id: 'wild', name: 'Ghost Shrimp', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ finColor2: '#f08a3a', accentColor: '#c8602a', patternContrast: 0.45 }),
    ],
    baseVisual: {
      bodyColor: '#d8dccf',
      bodyColor2: '#c4c8ba',
      bellyColor: '#e6e8de',
      finColor: '#d8dccf',
      finColor2: '#e8a070',
      accentColor: '#b07040',
      eyeColor: '#101010',
      gillColor: '#7fa35a',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.3,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.85,
      finType: 'shrimp',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the shrimp art: body/body2/belly = the nearly clear body; fin2 = the orange bands on the antennae and claws; accent = the speckles and the red dots on the tail fan; gill = the green eggs under a berried female’s tail. The gut shows through the body.',
  },
  visualMorphs: ['Ghost Shrimp (no morphs; clear body)'],

  behaviorSet: 'shrimp_dwarf',
  behaviorTraits: { cruiseSpeed: 0.5, burstSpeed: 7, turnRate: 3, hoverTendency: 0.15, schoolingTightness: 0, restOnBottom: 0.6, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.35, nocturnal: 0.4, pickRadiusMul: 1.5 },
  specialBehaviors: ['graze_surfaces', 'pleopod_fan', 'moult', 'tail_flick_escape', 'berried_fanning', 'swarm_food'],

  encyclopedia: {
    summary: 'A nearly invisible little shrimp, clear as glass, that picks over plants and gravel for leftovers.',
    nativeHabitat: 'Ponds, lakes and streams of the eastern USA, among dense underwater plants.',
    socialStructure: 'Lives in loose groups with no hierarchy; more active at night.',
    tankNeeds: 'A tank of 5 gallons or more with plants, a sponge filter and a few hiding places; happy unheated or tropical.',
    compatibilityNotes: 'Peaceful with small fish, snails and other shrimp, though bolder than cherry shrimp and it eats fish fry. Bettas, goldfish, angelfish and other big-mouthed fish eat it.',
    breedingOverview: 'Females carry green eggs under the tail; the young hatch as tiny larvae that turn into shrimp within a week, without brackish water.',
    conservationNote: 'Least Concern; common in the wild.',
    funFact: 'Its larvae can turn into little shrimp in 5–10 days without being fed at all, living on their yolk.',
    inGameBehavior: 'Picks steadily over the plants and floor, flicks backwards when startled, and hides for a day or two after a moult.',
    feedingNote: 'A scavenger: leftovers, biofilm and algae, plus a sinking pellet or algae wafer a few times a week in a clean tank.',
    keeperTip: 'Leave moulted shells in the tank — they eat them back — and don’t mistake a moult for a dead shrimp.',
  },
  sourceReferences: [
    { id: 'adw-palaemonetes-paludosus', title: 'Animal Diversity Web (University of Michigan) — Palaemonetes paludosus', url: 'https://animaldiversity.org/accounts/Palaemonetes_paludosus/', tier: 1, facts: ['adults under 50 mm', 'Atlantic coastal plain', '8–85 eggs', 'incubation 12–14 days', 'matures in 2–3 months', 'lives 6–13 months'] },
    { id: 'worms-palaemon-paludosus', title: 'WoRMS — Palaemon paludosus (Gibbes, 1850)', url: 'https://www.marinespecies.org/rest/AphiaRecordByAphiaID/932400', tier: 1, facts: ['accepted name Palaemon paludosus', 'Palaemonetes paludosus unaccepted'] },
    { id: 'fao-dobkin-larvae', title: 'Dobkin — Abbreviated larval development in caridean shrimps (FAO)', url: 'https://www.fao.org/4/AC741T/AC741T24.htm', tier: 1, facts: ['three zoeal stages', 'postlarva in 5–10 days without food', 'no brackish water needed'] },
    { id: 'shrimpfarm-ghost-shrimp', title: 'The Shrimp Farm — Ghost shrimp care sheet', url: 'https://www.theshrimpfarm.com/posts/shrimp-caresheet-ghost-shrimp-palaemonetes-sp/', tier: 2, facts: ['18–27.5 °C, pH 6.5–8.0', '10 gal, ~3 per gallon', 'more aggressive than dwarf shrimp', 'sponge filter', '1–1.5 years'] },
    { id: 'aquariadise-ghost-shrimp', title: 'Aquariadise — Ghost shrimp care', url: 'https://aquariadise.com/ghost-shrimp-palaemonetes-care-info/', tier: 2, facts: ['5 gal', 'males ~4 cm, females ~5 cm', 'green ovary saddle', '$1–3'] },
  ],
  confidenceNotes: [
    'Shops sell several animals as “ghost shrimp”, including the larger, aggressive whisker shrimp (Macrobrachium); the game models Palaemon paludosus.',
    'Sizes conflict (2.5 cm in Wikipedia, up to 5 cm in ADW) and so does the egg-carrying time (12–14 days against about 3 weeks).',
  ],
  exceptionRules: [],
  special: { medicationSensitive: true },
  visualLane: 'special',
};
