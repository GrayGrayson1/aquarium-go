import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Six-line wrasse — Pseudocheilinus hexataenia. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#six-line-wrasse
 */
export const sixlineWrasse: SpeciesDefinition = {
  id: 'sixline_wrasse',
  commonName: 'Six-line Wrasse',
  scientificName: 'Pseudocheilinus hexataenia',
  category: 'fish',
  group: 'wrasse',
  genus: 'Pseudocheilinus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — the Red Sea and East Africa to the Tuamotus, among branching corals on seaward reefs 1–35 m deep',
  isStarter: false,

  // FishBase 10 cm TL; Australian Museum 8.5 cm; Fishes of Australia 7.5 cm; aquarium fish ~3 in.
  adultSizeCm: 8,
  // LiveAquaria 30 gal (body text) / 60 gal (quick stats); Quality Marine 55 gal. The game uses 40 gal.
  recommendedMinTankGallons: 40,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 0.6,

  // LiveAquaria / Quality Marine: 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; FishBase 24–28 °C.
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'copepod_live', 'pellet_small', 'flake'],
  feedingStyle: 'picker',
  feedingSpeed: 0.75,
  feedingAggression: 0.5,
  hungerHours: 10,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.45,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank. It bullies peaceful wrasses and small, timid fish, and attacks newcomers.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'fight', note: 'Never two in one tank.' },

  // pyramidellid snails, flatworms, bristleworms and pods — and small shrimp
  predatorTags: ['copepod', 'worm', 'snail_small', 'shrimp_fry', 'shrimp_dwarf'],
  preyTags: ['fish_small', 'fish_medium'],
  maxLikelyPreySizeCm: 1.5,

  shrimpSafe: 'caution',
  snailSafe: 'mostly_safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Darts in and out of rockwork all day and sleeps in a crevice, wrapped in a mucus cocoon; needs a tight lid.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 12,
    clutchSize: { min: 50, max: 500 },
    incubationHours: 8,
    fryRearingHours: 300,
    cooldownDays: 1,
    conditions: { needsPartner: true, minTankGallons: 55 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Pairs dash upward to spawn just before sunset, releasing floating eggs (spawned daily in captivity), but no fish have been raised; the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // Hobby sources 4–10 years (unverified) → ~240 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 240, sexVisibleAtDays: 240, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 55,
  rarity: 'common',
  visitorAppeal: 0.7,
  unlock: { requires: [] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected; very common in the trade.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Least Concern and widespread across the Indo-Pacific.' },

  genetics: {
    loci: [intensityLocus('No colour forms. Violet-blue with six orange lines; males brighten when courting.')],
    phenotypes: [
      { id: 'wild', name: 'Six-line Wrasse', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#ff6a10', bodyColor: '#4e32a0' }),
    ],
    baseVisual: {
      bodyColor: '#5a3fa8',
      bodyColor2: '#3e2c8f',
      bellyColor: '#9a6a9e',
      finColor: '#5dae5a',
      finColor2: '#3b7bff',
      accentColor: '#ff7a1e',
      eyeColor: '#d2232a',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0,
      translucency: 0.05,
      finType: 'wrasse',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Small elongate wrasse with a pointed snout and thick lips. Violet-blue body (purple-orange lower down) with six narrow orange lines along the upper two thirds; orange cheek with tiny yellow dots; green tail and peduncle; a black eyespot ringed blue on the upper tail base; a red eye with two white lines.',
  },
  visualMorphs: ['Six-line Wrasse (no morphs)'],

  behaviorSet: 'wrasse',
  behaviorTraits: { cruiseSpeed: 1.6, burstSpeed: 6.5, turnRate: 4.5, hoverTendency: 0.3, schoolingTightness: 0, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.03, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['rock_sleep', 'rock_dart', 'pest_hunt', 'mucus_cocoon'],

  encyclopedia: {
    summary: 'A tiny violet wrasse with six orange pinstripes that never stops darting in and out of the rock.',
    nativeHabitat: 'Seaward reefs and reef crests 1–35 m deep, always among branching corals.',
    socialStructure: 'Small loose groups in the wild, pairing to spawn; every fish starts female.',
    tankNeeds: 'A tank of 40 gallons or more with lots of live rock to weave through, a tight lid, and two or three small meaty meals a day.',
    compatibilityNotes: 'Coral-safe and a hunter of flatworms, bristleworms and pest snails, but a bully: it harasses peaceful wrasses and small, timid fish. Add it after them, and keep one.',
    breedingOverview: 'Spawns at sunset with floating eggs; never raised in captivity.',
    conservationNote: 'Least Concern (IUCN 2009). Wild-collected.',
    funFact: 'In a 24-hour trial, six-line wrasses ate every adult Acropora-eating flatworm offered — but none of their eggs.',
    inGameBehavior: 'Flits through the rockwork picking at it, vanishing into one hole and popping out of another, and turns in at night to sleep in a crevice.',
    feedingNote: 'A small carnivore: thawed mysis and brine shrimp, live copepods and small pellets, two or three times a day. An autofeeder with small pellets suits it.',
    keeperTip: 'Add it after your peaceful fish, and keep the tank covered — it jumps.',
  },
  sourceReferences: [
    { id: 'fishbase-pseudocheilinus-hexataenia', title: 'FishBase — Pseudocheilinus hexataenia (Sixline wrasse)', url: 'https://www.fishbase.se/summary/Pseudocheilinus-hexataenia.html', tier: 1, facts: ['10 cm TL', 'depth 1–35 m', 'among coral branches', 'small crustaceans', 'IUCN Least Concern (2009)'] },
    { id: 'barton-2020-aefw', title: 'Barton et al. (2020) Predators of Acropora-eating flatworms. Aquaculture Environment Interactions 12:61–66', url: 'https://researchonline.jcu.edu.au/62557/', tier: 1, facts: ['ate 100% of adult flatworms', '0% of egg capsules'] },
    { id: 'am-sixline-wrasse', title: 'Australian Museum — Sixline Wrasse', url: 'https://australian.museum/learn/animals/fishes/sixline-wrasse-pseudocheilinus-hexataenia/', tier: 1, facts: ['8.5 cm', 'violet with orange stripes', 'tail eyespot'] },
    { id: 'liveaquaria-sixline-wrasse', title: 'LiveAquaria — Six Line Wrasse', url: 'https://www.liveaquaria.com/products/six-line-wrasse', tier: 2, facts: ['30–60 gal', '72–78 °F, SG 1.020–1.025', 'semi-aggressive, bullies peaceful wrasses', 'eats pyramid snails, flatworms, bristleworms', 'reef safe', '~$57'] },
    { id: 'qm-sixline-wrasse', title: 'Quality Marine — Six-line Wrasse', url: 'https://www.qualitymarine.com/quality-marine/fish/wrasses/pseudocheilinus/six-line-33580/', tier: 2, facts: ['55 gal', 'one per tank, never two males', 'jumps'] },
  ],
  confidenceNotes: [
    'Tank size: LiveAquaria gives 30 and 60 gallons on one page; Quality Marine 55; the game uses 40.',
    'The mucus cocoon and protogyny are reported for the genus and in hobby sources, not in a species-level study.',
    'Colours: scientific sources describe orange stripes on violet; LiveAquaria “blue lines on orange” — the game follows the scientific description.',
  ],
  exceptionRules: [
    { other: 'tag:wrasse', verdictFloor: 'conditional', reason: 'Bullies other small wrasses, especially peaceful ones added after it.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'conditional', reason: 'Picks off small ornamental shrimp.', incidentRisk: 0.05, mitigatedBy: ['cover'] },
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A fast, pushy little feeder that harasses slow fish.', incidentRisk: 0.06 },
  ],
  special: { escapeArtist: true },
  visualLane: 'fish',
};
