import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Blue tang — Paracanthurus hepatus. Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#blue-tang
 * One real form: the Indian Ocean "yellow belly" (a locality form whose inheritance is unknown). Young are blue like
 * the adults (the yellow juvenile in some references is the Atlantic blue tang).
 */
export const blueTang: SpeciesDefinition = {
  id: 'blue_tang',
  commonName: 'Blue Tang',
  scientificName: 'Paracanthurus hepatus',
  category: 'fish',
  group: 'tang',
  genus: 'Paracanthurus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'The Indo-Pacific, from East Africa to Samoa, north to southern Japan and south to the Great Barrier Reef, over current-swept reefs',
  isStarter: false,

  // FishBase / FAO 31 cm TL max, commonly 20; aquarium adults 20–25 cm (Quality Marine).
  adultSizeCm: 30,
  // LiveAquaria, Quality Marine, Top Shelf: 180 gal, at least six feet long.
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 3.5,

  // the game's marine ranges (LiveAquaria 22–26 °C, SG 1.020–1.025)
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'bright',
  diet: 'omnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'flake', 'nori', 'vegetable', 'algae_wafer'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.75,
  feedingAggression: 0.5,
  hungerHours: 10,

  activityZone: ['middle', 'upper', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.5,
  aggression: 0.25,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.05, note: 'One per tank; a group works only in a very large tank with all of them added at once.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Fights its own kind, circling and slashing with the scalpel at the tail base; small fish added together do best.' },

  predatorTags: ['copepod'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'caution',
  reefSafe: 'safe',
  coralRisk: 0.03,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Open swimming lanes and caves to dart into and wedge itself in; a bare bottom is fine.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 16,
    clutchSize: { min: 10000, max: 40000 },
    incubationHours: 9,
    fryRearingHours: 300,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns in groups or pairs at dusk, releasing floating eggs. First bred by the University of Florida’s Tropical Aquaculture Laboratory with Rising Tide Conservation in 2016, and at commercial scale by Biota since 2025: a hatchery job with copepod-fed larvae, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 8–20 years in captivity, 12–14 on average (ADW) → 480; the sexes look alike
  lifecycle: { juvenileDays: 16, adultDays: 22, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.15 },

  hardiness: 0.6,
  difficulty: 'intermediate',
  // LiveAquaria $109.99 (1–2 in); Biota captive-bred $75–120
  baseValue: 110,
  rarity: 'common',
  visitorAppeal: 0.98,
  unlock: { requires: ['marine_large'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most are still wild-collected; captive-bred fish from Biota have been sold since 2025 and are the better buy.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2010)', note: 'Not threatened, but collected heavily for the trade.' },

  genetics: {
    loci: [
      intensityLocus('Individuals vary in how deep the blue is.'),
      {
        id: 'belly',
        name: 'Locality',
        mode: 'mendelian',
        alleles: [
          // the Yellow Belly is a rare form (the owner, ADR-0053 round 2): about 1 in 100 of the shop's stock
          { id: 'P', name: 'Pacific (blue belly)', dominance: 2, frequency: 0.9 },
          { id: 'y', name: 'Indian Ocean (yellow belly)', dominance: 1, frequency: 0.1 },
        ],
        note: 'The Indian Ocean and Red Sea population has a yellow belly that shows at maturity (Quality Marine; Reef Builders 2011): a population difference whose inheritance is unknown, modelled recessive only to set how often shops stock it.',
      },
    ],
    phenotypes: [
      { id: 'wild', name: 'Blue Tang', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'yellow_belly', name: 'Yellow Belly', layer: 'overlay', rarity: 0.3, when: [{ locus: 'belly', allele: 'y', count: 'hom' }], visual: { bellyColor: '#f4d235', bodyColor2: '#f0c92a' }, note: 'Indian Ocean fish: the belly and lower flank yellow in adults.' },
      intensityOverlay({ bodyColor: '#1a5ae0', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#1f5fd6',
      bodyColor2: '#1848b0',
      bellyColor: '#3a7ae2',
      finColor: '#1b2a66',
      finColor2: '#f7d417',
      accentColor: '#0b0f1a',
      eyeColor: '#14161c',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.25,
      metallic: 0,
      translucency: 0.05,
      finType: 'tang',
      finLength: 1,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.1,
    notes: 'Colour slots for the blue tang art: body = the royal blue; accent = the black "palette" band from the eye along the back, looping round to the tail’s edges; fin = the black-edged blue dorsal and anal; fin2 = the yellow tail triangle and pectorals; belly = the yellow of the Indian Ocean form.',
  },
  visualMorphs: ['Blue Tang', 'Yellow Belly'],

  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1.1, burstSpeed: 6, turnRate: 2.6, hoverTendency: 0.35, schoolingTightness: 0.2, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['zooplankton_pick', 'patrol_lap', 'dart_and_wedge', 'play_dead', 'scalpel_flare', 'cleaner_visit'],

  encyclopedia: {
    summary: 'The royal-blue tang with the black “palette” and the yellow tail: the regal, hippo or palette tang of reef shops and films.',
    nativeHabitat: 'Current-swept reefs across the Indo-Pacific, where loose groups hover a metre or two above the coral picking plankton from the water.',
    socialStructure: 'Wild fish gather in loose groups, but in a tank it fights its own kind: one per tank.',
    tankNeeds: 'A six-foot tank of 180 gallons or more with open swimming lanes, rock to dart into, strong flow and stable reef water.',
    compatibilityNotes: 'Reef-safe and peaceful with most fish, inverts and corals; it squabbles with other tangs, so add tangs together in a big tank with rock breaking the sight lines.',
    breedingOverview: 'Spawns in the open sea; hatcheries have bred it since 2016, but not in home tanks.',
    conservationNote: 'Least Concern (IUCN 2010), but collected heavily for the trade; captive-bred fish are the better buy.',
    funFact: 'When frightened it may lie on its side as if dead, then swim off as if nothing happened: a scare, not an illness.',
    inGameBehavior: 'Swims laps along the tank all day, picking at the water, and darts into the rock to wedge itself in when startled.',
    feedingNote: 'Small meals several times a day: mysis, brine shrimp, small pellets and flakes, with seaweed at least three times a week.',
    keeperTip: 'Quarantine it first: blue tangs catch white spot easily.',
  },
  sourceReferences: [
    { id: 'fishbase-paracanthurus-hepatus', title: 'FishBase — Paracanthurus hepatus (Palette surgeonfish)', url: 'https://www.fishbase.se/summary/Paracanthurus-hepatus.html', tier: 1, facts: ['31 cm TL max', 'hovers 1–2 m above the reef', 'wedges into coral when frightened', 'IUCN Least Concern (2010)'] },
    { id: 'fao-acanthuridae', title: 'FAO species guide, vol. 6: Acanthuridae (Randall 2001)', url: 'https://www.fao.org/4/y0870e/y0870e30.pdf', tier: 1, facts: ['31 cm TL max, commonly 20', 'young deeper-bodied, coloured as adults'] },
    { id: 'adw-paracanthurus-hepatus', title: 'Animal Diversity Web — Paracanthurus hepatus', url: 'https://animaldiversity.org/accounts/Paracanthurus_hepatus/', tier: 1, facts: ['8–20 years in captivity', 'may play dead when frightened'] },
    { id: 'liveaquaria-blue-tang', title: 'LiveAquaria — Blue Tang', url: 'https://www.liveaquaria.com/product/330/?pcatid=330', tier: 2, facts: ['180 gal, at least 6 ft long', 'reef compatible', 'seaweed several times a week', '$109.99 (1–2 in)'] },
    { id: 'qualitymarine-blue-tang', title: 'Quality Marine — The blue tang of many names', url: 'https://www.qualitymarine.com/news/the-blue-tang-of-many-names/', tier: 2, facts: ['180 gal, 6 ft+', 'the yellow belly occurs only in the Indian Ocean and Red Sea and shows at maturity'] },
    { id: 'reefbuilders-2016-blue-tang', title: 'Reef Builders 2016 — Captive-bred blue tang', url: 'https://reefbuilders.com/2016/07/20/captive-bred-blue-tang', tier: 2, facts: ['first captive breeding: University of Florida and Rising Tide Conservation, 2016'] },
    { id: 'coral-2025-biota-blue-tang', title: 'CORAL Magazine 2025 — Biota’s captive-bred blue tangs', url: 'https://www.coralmagazine.com/?p=3078387', tier: 2, facts: ['commercial-scale captive breeding since 2025'] },
  ],
  confidenceNotes: [
    'The yellow belly is a population difference whose inheritance is unknown; modelled recessive to set how often shops stock it.',
    'Breeding figures from ADW may describe a related surgeonfish; the game does not breed it.',
    'Water ranges follow the game’s marine bands (LiveAquaria gives 22–26 °C and SG 1.020–1.025).',
  ],
  exceptionRules: [
    { other: 'tag:tang', verdictFloor: 'conditional', reason: 'Tangs fight other tangs; the blue tang is mild, but add tangs together in a big tank with rock breaking the sight lines.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'blue_tang', verdictFloor: 'high_risk', reason: 'Blue tangs fight their own kind: one per tank, unless a group goes into a very large tank together.', incidentRisk: 0.08, mitigatedBy: ['tank_size'] },
  ],
  special: { outgrowsSmallTanks: true },
  visualLane: 'fish',
};
