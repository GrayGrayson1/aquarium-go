import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Sailfin tang — Zebrasoma velifer (long spelled "veliferum"). Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#sailfin-tang
 */
export const sailfinTang: SpeciesDefinition = {
  id: 'sailfin_tang',
  commonName: 'Sailfin Tang',
  scientificName: 'Zebrasoma velifer',
  category: 'fish',
  group: 'tang',
  genus: 'Zebrasoma',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Pacific — Christmas Island and Indonesia east to Hawaii, the Tuamotus and Pitcairn; north to Japan, south to Sydney and Lord Howe',
  isStarter: false,

  // FishBase 40 cm SL; FAO 40 cm TL, commonly 25 cm. Aquarium adults reach ~30 cm; the game uses 35 cm.
  adultSizeCm: 35,
  // LiveAquaria and Top Shelf: 180 gal; Aquatics Unlimited 125 gal with 18 in width. Hobby guides: a 6-foot tank at least.
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 3.6,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12. FishBase: 24–28 °C in the wild.
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['nori', 'vegetable', 'algae_wafer', 'flake', 'pellet_small', 'biofilm', 'mysis', 'brine_shrimp'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.7,
  feedingAggression: 0.5,
  hungerHours: 12,

  activityZone: ['middle', 'upper', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.55,
  aggression: 0.3,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.06, note: 'One per tank, and no other Zebrasoma. Peaceable with most other fish.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'fight',
    mixed: 'harassment',
    juvenile: 'tension',
    note: 'Aggressive toward its own kind and similar tangs; it raises the sail and slashes with the tail spine.',
  },

  predatorTags: [],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'caution',
  reefSafe: 'mostly_safe',
  coralRisk: 0.08,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs a long run of open water to cruise and plenty of rock to graze; it sleeps wedged in a crevice.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 24,
    clutchSize: { min: 10000, max: 40000 },
    incubationHours: 8,
    fryRearingHours: 600,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns in open water (in pairs per FishBase, in groups at dusk per ADW), releasing floating eggs with no care. Not bred in aquaria.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // FishBase: 27 years maximum from otoliths; 10–15 years in aquaria → the game's 500-day ceiling.
  lifecycle: { juvenileDays: 18, adultDays: 24, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.15 },

  hardiness: 0.75,
  difficulty: 'intermediate',
  baseValue: 85,
  rarity: 'common',
  visitorAppeal: 0.85,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems — and it needs a six-foot tank of 180 gallons or more.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected, mostly in Indonesia, the Philippines and Fiji.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2010)',
    note: 'Least Concern and widespread. It is also eaten locally (Guam). All aquarium fish are wild-caught.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Young are bright yellow with narrow dark bars and fade toward the adult’s brown and pale banding; the body can pale or darken within seconds with mood.')],
    phenotypes: [
      { id: 'wild', name: 'Sailfin Tang', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#e2d6a8', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#4b3a2e',
      bodyColor2: '#3a2e26',
      bellyColor: '#5e4a3a',
      finColor: '#3e342c',
      finColor2: '#9cc7d9',
      accentColor: '#d4cdb4',
      eyeColor: '#2a2018',
      pattern: 'bars',
      patternScale: 0.55,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.08,
      metallic: 0,
      translucency: 0.06,
      finType: 'tang_sailfin',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Deep, compressed disc with a protruding snout and enormous dorsal and anal fins that rise into a sail (fins up, it is as tall as it is long). Broad dark grey-brown bars with brownish-orange lines alternate with narrow pale bars with yellow lines; a dark bar through the eye; snout and chin yellow-brown with small white spots; a blue patch around the tail spine; yellow to brown tail with a white rear edge; the tall fins banded with pale blue-green edges. Young are bright yellow with narrow dark bars and proportionally taller fins; the art draws them from the creature’s life stage.',
  },
  visualMorphs: ['Sailfin Tang (no morphs; yellow-barred juvenile)'],

  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 5, turnRate: 2.3, hoverTendency: 0.3, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.03, curiosity: 0.5, nocturnal: 0, pickRadiusMul: 1.1 },
  specialBehaviors: ['comb_graze', 'patrol_lap', 'sail_display', 'scalpel_flare'],

  encyclopedia: {
    summary: 'A big, banded surgeonfish that throws up an enormous sail of fin whenever it wants to look even bigger.',
    nativeHabitat: 'Lagoon and seaward reefs 0–45 m deep; the young on shallow, sheltered reefs among branching corals.',
    socialStructure: 'Solitary or in pairs; young are solitary.',
    tankNeeds: 'A six-foot tank of 180 gallons or more with open swimming room, strong flow, lots of rock to graze and seaweed most days.',
    compatibilityNotes: 'Reef-safe with most corals if well fed (it may nip LPS), and peaceable with most fish, but fights its own kind and other Zebrasoma. Keep one.',
    breedingOverview: 'Spawns in open water with floating eggs; not bred in aquaria.',
    conservationNote: 'Least Concern (IUCN 2010). All aquarium sailfins are wild-caught.',
    funFact: 'Threatened, it raises the dorsal and anal fins until it is as tall as it is long, then swings the scalpel spine on its tail.',
    inGameBehavior: 'Patrols long laps of the tank grazing the rock, and fans out its huge sail when another tang comes near.',
    feedingNote: 'A grazer: seaweed clipped to the rock at least three times a week, spirulina flake or pellets daily, and the odd thawed mysis. An autofeeder can add pellets; the seaweed goes on by hand.',
    keeperTip: 'Feed seaweed at least three times a week — well-fed tangs stay healthier and calmer.',
  },
  sourceReferences: [
    { id: 'fishbase-zebrasoma-velifer', title: 'FishBase — Zebrasoma velifer (Sailfin tang)', url: 'https://www.fishbase.se/summary/Zebrasoma-veliferum.html', tier: 1, facts: ['40 cm SL', 'depth 0–45 m', 'leafy and turf algae', 'solitary or in pairs', 'tmax 27 years', 'IUCN Least Concern (2010)', 'juveniles yellow with dark bars'] },
    { id: 'worms-zebrasoma-velifer', title: 'WoRMS — Zebrasoma velifer (Bloch, 1795)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=712902', tier: 1, facts: ['velifer is the accepted spelling', 'veliferum unaccepted'] },
    { id: 'fao-acanthuridae-randall', title: 'FAO Species Identification Guide, Western Central Pacific vol. 6 — Acanthuridae (Randall)', url: 'https://www.fao.org/4/y0870e/y0870e30.pdf', tier: 1, facts: ['body depth 1.8–2× in SL', 'dorsal fin extremely elevated', 'bar and line pattern', 'blue patch around the tail spine', 'Z. desjardinii differs in colour and fin-ray counts'] },
    { id: 'liveaquaria-sailfin-tang', title: 'LiveAquaria — Sailfin Tang', url: 'https://www.liveaquaria.com/product/379/?pcatid=379', tier: 2, facts: ['180 gal', '72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12', 'aggressive to its own kind', 'seaweed at least three times a week', 'price ~$80'] },
    { id: 'reefbuilders-zebrasoma-2015', title: 'Reef Builders (2015) — Speciation, biogeography and hybridisation in Zebrasoma', url: 'https://reefbuilders.com/2015/06/29/speciation-biogeography-hybridization-zebrasoma/', tier: 2, facts: ['trade sailfins mostly from Indonesia and the Philippines', 'Z. desjardinii the Indian Ocean sister species', 'yellow fades with age'] },
  ],
  confidenceNotes: [
    'Name: WoRMS and FishBase use Z. velifer; many care sheets still say veliferum.',
    'The Red Sea / Indian Ocean sailfin is a separate valid species, Z. desjardinii (FishBase, FAO); it is not modelled as a form of this one.',
    'Tank size: 125–180 gallons by source; the game uses 180 with a six-foot footprint (LiveAquaria, Top Shelf).',
    'Spawning differs between FishBase (pairs, daytime) and ADW (groups at dusk); it does not matter in the game.',
  ],
  exceptionRules: [
    { other: 'tag:tang', verdictFloor: 'conditional', reason: 'Tangs fight other tangs, Zebrasoma above all. Two can share only a very large tank, added together, with rock breaking sight lines.', incidentRisk: 0.08, mitigatedBy: ['tank_size', 'sight_breaks'] },
  ],
  special: {
    outgrowsSmallTanks: true,
    needsAlgaeOrBiofilm: true,
  },
  visualLane: 'fish',
};
