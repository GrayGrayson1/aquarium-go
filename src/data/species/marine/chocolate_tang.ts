import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Chocolate tang (mimic surgeonfish) — Acanthurus pyroferus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#chocolate-tang
 */
export const chocolateTang: SpeciesDefinition = {
  id: 'chocolate_tang',
  commonName: 'Chocolate Tang',
  scientificName: 'Acanthurus pyroferus',
  category: 'fish',
  group: 'tang',
  genus: 'Acanthurus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — the Seychelles to the Marquesas and Tuamotus, southern Japan to the Great Barrier Reef and New Caledonia',
  isStarter: false,

  // FishBase / Fishes of Australia 29 cm TL; FAO ~25 cm, commonly 18 cm. Aquarium fish reach 7–10 in.
  adultSizeCm: 25,
  // Top Shelf and hobby guides: 125 gal; LiveAquaria: 180 gal. The game uses 125 with a six-foot footprint.
  recommendedMinTankGallons: 125,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 18 },
  activeSwimmer: true,
  bioload: 2.8,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; Fishkeeper 24–28 °C.
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['nori', 'vegetable', 'algae_wafer', 'flake', 'pellet_small', 'biofilm', 'detritus', 'mysis'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.7,
  feedingAggression: 0.45,
  hungerHours: 12,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.55,
  aggression: 0.3,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.08, note: 'One per tank. It is aggressive to other tangs and to fish of its shape or colour — including the angelfish it copies when young.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'fight',
    mixed: 'harassment',
    juvenile: 'tension',
    note: 'Two chocolate tangs fight over grazing ground.',
  },

  predatorTags: [],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.06,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Grazes film algae and detritus at the base of the rock; young fish need holes to dart into, as the pygmy angels they copy do.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 22,
    clutchSize: { min: 10000, max: 40000 },
    incubationHours: 8,
    fryRearingHours: 600,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Like other surgeonfish it spawns in open water with floating eggs and no care; no species study exists and it has never been bred in aquaria.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // No species maximum found (one otolith reading of 7 years); hobby guides 8–10 years in aquaria → ~380 game-days.
  lifecycle: { juvenileDays: 16, adultDays: 22, lifespanDays: 380, sexVisibleAtDays: 380, hatchSizeCm: 0.15 },

  hardiness: 0.75,
  difficulty: 'intermediate',
  baseValue: 110,
  rarity: 'uncommon',
  visitorAppeal: 0.75,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems — and it needs a six-foot tank of 125 gallons or more.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected (Fiji among the sources). Sold young as the "yellow" or "halfblack" mimic and grown as the chocolate tang.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2010)',
    note: 'Least Concern. All aquarium fish are wild-caught; mislabelling is common, so ask for the scientific name.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Young fish copy a pygmy angelfish of their size — all yellow like the Herald’s angel, or grey shading to black like the pearlscale angel — and turn brown when they outgrow it; adults range from yellowish to purplish brown.')],
    phenotypes: [
      { id: 'wild', name: 'Chocolate Tang', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#f07d1a', finColor2: '#f2cc2a' }),
    ],
    baseVisual: {
      bodyColor: '#4a2f2a',
      bodyColor2: '#7b3a2b',
      bellyColor: '#55362c',
      finColor: '#34261f',
      finColor2: '#e6c02e',
      accentColor: '#e2731e',
      eyeColor: '#e0762c',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.08,
      metallic: 0,
      translucency: 0.06,
      finType: 'tang_acanthurus',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'Moderately deep Acanthurus with a protruding snout, a concave forehead and a crescent tail (rounded in the young). Adult chocolate brown shading to brownish red on the chest, an orange patch above the pectoral and gill opening, a broad black band down the gill margin, a narrow white chin band, an orange-ringed eye, dark fins and a broad yellow rear border to the tail. Young copy pygmy angels: all yellow with a rounded tail (Herald’s angel), or pale grey shading to black at the rear (pearlscale angel); the art picks the phase per individual and draws it from the creature’s life stage.',
  },
  visualMorphs: ['Chocolate Tang (no morphs; yellow or halfblack mimic juveniles)'],

  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 0.9, burstSpeed: 5, turnRate: 2.5, hoverTendency: 0.3, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.45, nocturnal: 0 },
  specialBehaviors: ['comb_graze', 'patrol_lap', 'scalpel_flare', 'model_mimicry'],

  encyclopedia: {
    summary: 'A surgeonfish that spends its youth disguised as a little angelfish, then grows up into a chocolate-brown tang with an orange shoulder.',
    nativeHabitat: 'Lagoon and seaward reefs 5–40 m deep, at the base of the reef among mixed coral, rock and sand; usually alone.',
    socialStructure: 'Solitary. Young fish stay within a metre or two of the angelfish they copy.',
    tankNeeds: 'A six-foot tank (125–180 gallons) with open water, lots of rock to graze, holes for the young to hide in, and seaweed most days.',
    compatibilityNotes: 'Reef-safe (an underfed fish may nip LPS). Aggressive to other tangs and to look-alike fish, including the angelfish it mimics. Keep one.',
    breedingOverview: 'Spawns in open water like other surgeonfish; never bred in aquaria.',
    conservationNote: 'Least Concern (IUCN 2010). All aquarium fish are wild-caught.',
    funFact: 'Young mimics fed about 10% more when close to their model angelfish — apparently because territorial damselfish attack them less.',
    inGameBehavior: 'The young dart in and out of the rock like a pygmy angel; adults graze in steady laps along the base of the reef.',
    feedingNote: 'A grazer: seaweed clipped to the rock most days, spirulina flake or small pellets, and a little thawed mysis. An autofeeder can add pellets; the seaweed goes on by hand.',
    keeperTip: 'Ask for the scientific name and where it was collected — "yellow tang", "lemon tang" and "mimic tang" labels are often mixed up.',
  },
  sourceReferences: [
    { id: 'fishbase-acanthurus-pyroferus', title: 'FishBase — Acanthurus pyroferus (Mimic surgeonfish)', url: 'https://www.fishbase.se/summary/Acanthurus-pyroferus.html', tier: 1, facts: ['29 cm TL', 'depth 0–60 m', 'base of reefs, usually alone', 'juveniles mimic Centropyge', 'IUCN Least Concern (2010)'] },
    { id: 'fao-acanthuridae-randall', title: 'FAO Species Identification Guide, Western Central Pacific vol. 6 — Acanthuridae (Randall)', url: 'https://www.fao.org/4/y0870e/y0870e30.pdf', tier: 1, facts: ['~25 cm TL', 'filamentous algae', 'orange patch over the pectoral, black gill band, white chin band', 'yellow tail border', 'four juvenile mimic phases', 'caudal rounded in young, lunate in adults'] },
    { id: 'eagle-jones-2004-mimicry', title: 'Eagle & Jones (2004) Mimicry in coral reef fishes: ecological and behavioural responses of a mimic to its model. J. Zool. 264:33–43', url: 'https://researchonline.jcu.edu.au/6757/', tier: 1, facts: ['juveniles stay within 1–2 m of the model', 'change when they outgrow the model', 'fed more near the model'] },
    { id: 'liveaquaria-mimic-tang', title: 'LiveAquaria — Lemon Tang (Acanthurus pyroferus)', url: 'https://www.liveaquaria.com/product/763/?pcatid=763', tier: 2, facts: ['180 gal', '72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12', 'aggressive to other tangs and look-alikes', 'reef compatible', 'price ~$119'] },
    { id: 'topshelf-chocolate-tang', title: 'Top Shelf Aquatics — Chocolate / Yellow Mimic Tang (Fiji)', url: 'https://topshelfaquatics.com/products/chocolate-yellow-mimic-tang-fiji', tier: 2, facts: ['125 gal', '7–10 in in aquaria', 'moderate care', 'from ~$90'] },
  ],
  confidenceNotes: [
    'Tank size: 125 gallons (Top Shelf, hobby guides) versus 180 (LiveAquaria); the game uses 125 with a six-foot footprint.',
    'Lifespan: no species maximum found (one otolith reading of 7 years at 22.5 cm); related Acanthurus live 30–45 years, so 380 game-days is a cautious middle.',
    'Which mimic phase a juvenile takes depends on the angelfish where it lives, not on genes; the game picks yellow or halfblack per individual and models no locus for it.',
    'Tail-margin colour: yellow (FAO, Fishes of Australia) versus white (Wikipedia); the game uses yellow.',
  ],
  exceptionRules: [
    { other: 'tag:tang', verdictFloor: 'conditional', reason: 'Tangs fight other tangs. Two can share only a very large tank, added together, with rock breaking sight lines.', incidentRisk: 0.07, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'coral_beauty', verdictFloor: 'conditional', reason: 'Attacks fish of its own shape and colour, and young chocolate tangs copy dwarf angelfish.', incidentRisk: 0.04, mitigatedBy: ['tank_size'] },
  ],
  special: {
    outgrowsSmallTanks: true,
    needsAlgaeOrBiofilm: true,
  },
  visualLane: 'fish',
};
