import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Naso tang — Naso lituratus (the orangespine unicornfish). Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#naso-tang
 * No named forms. Young are grey with a blue line on the dorsal fin and no mask; adult males grow long streamers from
 * both tips of the tail. The "blonde naso" is a different species (N. elegans), not in this chunk.
 */
export const nasoTang: SpeciesDefinition = {
  id: 'naso_tang',
  commonName: 'Naso Tang',
  scientificName: 'Naso lituratus',
  category: 'fish',
  group: 'tang',
  genus: 'Naso',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'The eastern Indian Ocean and the Pacific, from Indonesia and Christmas Island east to Hawaii and Pitcairn, north to southern Japan',
  isStarter: false,

  // FAO 45 cm TL (commonly 35); FishBase 46 cm SL; LiveAquaria 18 in.
  adultSizeCm: 45,
  // the game's judgement for a fast, 45 cm open-water cruiser: 240 gal, 8 ft (one shop blog); LiveAquaria 180, Reef
  // Builders and TFH at least 200
  recommendedMinTankGallons: 240,
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 5,

  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['nori', 'vegetable', 'algae_wafer', 'pellet_small', 'flake', 'mysis', 'brine_shrimp'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.7,
  feedingAggression: 0.5,
  hungerHours: 12,

  activityZone: ['upper', 'middle'],
  temperament: 'semi_aggressive',
  territoriality: 0.45,
  aggression: 0.25,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.04, note: 'One per tank: wild adults form small groups, but two in a home tank fight.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Bickers with its own kind and related tangs; the fixed blades at the tail base cut.' },

  predatorTags: [],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'unsafe',
  reefSafe: 'safe',
  coralRisk: 0.03,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.2,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Long open lanes, rock arranged for laps, and a cave to sleep in.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 18,
    clutchSize: { min: 10000, max: 40000 },
    incubationHours: 8,
    fryRearingHours: 560,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Probably spawns in pairs in open water with floating eggs; no captive breeding has been reported, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 14 years or more (Taylor et al. 2014) → the game's cap; adult males show their tail streamers
  lifecycle: { juvenileDays: 18, adultDays: 22, lifespanDays: 500, sexVisibleAtDays: 26, hatchSizeCm: 0.15 },

  hardiness: 0.75,
  difficulty: 'intermediate',
  // LiveAquaria $123.99 (juvenile)
  baseValue: 120,
  rarity: 'common',
  visitorAppeal: 0.85,
  unlock: { requires: ['marine_large'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'All are wild-caught; fish from Hawaii are often the brightest.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2010)', note: 'Widespread; also a minor food fish.' },

  genetics: {
    loci: [intensityLocus('No named forms; carotene-rich food keeps the orange bright.')],
    phenotypes: [
      { id: 'wild', name: 'Naso Tang', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#ffd23a', finColor2: '#ff7a1a' }),
    ],
    baseVisual: {
      bodyColor: '#5a4a3e',
      bodyColor2: '#3e342e',
      bellyColor: '#7a6a52',
      finColor: '#1c1a1a',
      finColor2: '#ece8dc',
      accentColor: '#f2c230',
      eyeColor: '#1a1612',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.05,
      finType: 'naso',
      finLength: 1,
      bodyDepth: 0.9,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the naso art: body = the grey-brown; fin = the black dorsal, fin2 = its white edge; accent = the yellow edge of the black mask and the patch above the eyes. The art draws the orange lips and the two bright orange spines at the tail base, and the male’s tail streamers.',
  },
  visualMorphs: ['Naso Tang'],

  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1.4, burstSpeed: 6, turnRate: 2, hoverTendency: 0.2, schoolingTightness: 0.1, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['open_water_cruise', 'graze_macroalgae', 'scalpel_flare', 'night_spots', 'startle_jump', 'cleaner_visit'],

  encyclopedia: {
    summary: 'A sleek grey unicornfish with a black-and-yellow face mask, orange lips and two bright orange blades at the tail; old males trail long streamers from the tail.',
    nativeHabitat: 'Lagoons and outer reefs from Indonesia to Hawaii, grazing leafy brown seaweed.',
    socialStructure: 'Wild adults travel in small groups, but in a home tank two fight: one per tank.',
    tankNeeds: 'An eight-foot tank of 240 gallons or more with long open lanes, strong flow, a cave to sleep in and a tight lid.',
    compatibilityNotes: 'Reef-safe and peaceful with most fish and inverts, but it eats seaweed and squabbles with other tangs.',
    breedingOverview: 'Spawns in the open sea; it has not been bred in captivity.',
    conservationNote: 'Least Concern (IUCN 2010).',
    funFact: 'Its orange “spines” at the tail base are fixed blades, sharp enough to cut a careless hand.',
    inGameBehavior: 'Cruises long laps in the upper water, grazes seaweed and sleeps in a cave at night.',
    feedingNote: 'Mostly seaweed and greens, several times a day, with small pellets and frozen foods.',
    keeperTip: 'Keep a tight lid on the tank: a startled naso tang can jump out.',
  },
  sourceReferences: [
    { id: 'fishbase-naso-lituratus', title: 'FishBase — Naso lituratus (Orangespine unicornfish)', url: 'https://www.fishbase.se/summary/Naso-lituratus.html', tier: 1, facts: ['46 cm SL', 'eats leafy brown algae', 'IUCN Least Concern (2010)'] },
    { id: 'fao-acanthuridae-naso', title: 'FAO species guide, vol. 6: Acanthuridae (Randall 2001)', url: 'https://www.fao.org/4/y0870e/y0870e30.pdf', tier: 1, facts: ['45 cm TL max, commonly 35', 'adult males grow a filament from each tail lobe'] },
    { id: 'taylor-2014-naso', title: 'Taylor et al. 2014 — Growth and longevity of Naso (J. Fish Biol. 85: 901–916)', url: 'https://researchonline.jcu.edu.au/35460/', tier: 1, facts: ['lives 14 years or more'] },
    { id: 'liveaquaria-naso-tang', title: 'LiveAquaria — Naso Tang', url: 'https://www.liveaquaria.com/products/naso-tang', tier: 2, facts: ['18 in', '180 gal', 'reef compatible', 'a tight lid: it jumps', 'young grey with a blue dorsal line and orange anal stripe', '$123.99'] },
    { id: 'reefbuilders-2015-naso', title: 'Reef Builders 2015 — Naso lituratus', url: 'https://reefbuilders.com/2015/03/15/naso-lituratus-a-sleek-striking-outstanding-fish-for-spacious-marine-aquariums', tier: 2, facts: ['200 gal as a bare minimum', 'needs long open laps'] },
    { id: 'tfh-naso-tang', title: 'TFH Magazine — The naso tang', url: 'https://tfhmagazine.com/articles/saltwater/the-naso-tang-full-article', tier: 2, facts: ['at least 200 gal', 'young grey, adults chestnut', 'pale night spots', 'extremely hardy'] },
    { id: 'gensou-naso', title: 'Gensou — Naso tang care', url: 'https://gensou.sg/?p=32419', tier: 3, facts: ['240 gal, 8 ft strongly preferred'] },
  ],
  confidenceNotes: [
    'Tank: LiveAquaria gives 180 gal, Reef Builders and TFH at least 200; the game’s 240 gal (eight feet) follows one shop blog and is a judgement for a fast, 45 cm cruiser.',
    'Breeding figures are placeholders: no captive breeding is known.',
  ],
  exceptionRules: [
    { other: 'tag:tang', verdictFloor: 'conditional', reason: 'Aggressive to other tangs, worst with related or same-shaped ones: add tangs together in a big, long tank with sight breaks.', incidentRisk: 0.07, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'naso_tang', verdictFloor: 'high_risk', reason: 'Two naso tangs fight in a home tank: one per tank.', incidentRisk: 0.08 },
  ],
  special: { outgrowsSmallTanks: true, escapeArtist: true },
  visualLane: 'fish',
};
