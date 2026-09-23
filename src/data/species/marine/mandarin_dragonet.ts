import type { SpeciesDefinition } from '@/types';

/**
 * Mandarin dragonet (mandarinfish) — Synchiropus splendidus. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#mandarin-dragonet
 */
export const mandarinDragonet: SpeciesDefinition = {
  id: 'mandarin_dragonet',
  commonName: 'Mandarin Dragonet',
  scientificName: 'Synchiropus splendidus',
  category: 'fish',
  group: 'dragonet',
  genus: 'Synchiropus',
  environment: 'marine',
  waterClasses: ['reef', 'marine_live_rock'],
  nativeRegion: 'Western Pacific — Ryukyu Islands to Australia, including the Philippines, Indonesia and New Guinea',
  isStarter: false,

  // FishBase max 7 cm TL; ORA ~4 in; ADW 6 cm.
  adultSizeCm: 7,
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.6,

  // ADW: 24–26 °C in the wild; care sheets 72–78 °F, SG 1.020–1.025.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['copepod_live', 'baby_brine', 'brine_shrimp', 'daphnia', 'bloodworm', 'pellet_small'],
  feedingStyle: 'picker',
  feedingSpeed: 0.1,
  feedingAggression: 0.02,
  hungerHours: 10,

  activityZone: ['bottom', 'decor', 'lower'],
  temperament: 'peaceful',
  territoriality: 0.3,
  aggression: 0.02,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.34, note: 'One per tank, or a male–female pair in a large, pod-rich tank. Two males fight.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'courtship_ok',
    juvenile: 'tension',
    note: 'Males (larger, with a tall spiny first dorsal fin) fight each other. A male–female pair coexists in 75+ gallons with ample copepods.',
  },

  predatorTags: ['copepod', 'worm'],
  preyTags: ['fish_small', 'fish_slow', 'fish_benthic'],
  maxLikelyPreySizeCm: 0.3,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'avoids',

  hidesNeeded: 1,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: ['bare'], note: 'Needs abundant mature live rock (1–1.5 lb per gallon) and ideally a refugium so copepods can keep up.' },

  breeding: {
    system: 'egg_layer_generic',
    difficulty: 0.85,
    maturityDays: 16,
    clutchSize: { min: 12, max: 200 },
    // ADW: eggs hatch in about 12 hours → ~0.5 day × 8.
    incubationHours: 4,
    fryRearingHours: 320,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTempC: 24, minTankGallons: 55, needsConditioningFood: ['copepod_live'] },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 4,
    notes: 'At dusk a male displays his tall dorsal fin, then a pair rises together toward the surface and releases a cloud of floating eggs. The eggs hatch in about half a day and the tiny larvae must be skimmed off and reared on copepods — ORA and Biota now do this commercially.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // ADW: 10–15 years wild but often 2–4 in captivity; captive-bred with good pods → ~6 years (240 game-days).
  lifecycle: { juvenileDays: 12, adultDays: 16, lifespanDays: 240, sexVisibleAtDays: 16, hatchSizeCm: 0.15 },

  hardiness: 0.55,
  difficulty: 'advanced',
  baseValue: 55,
  rarity: 'rare',
  visitorAppeal: 0.95,
  unlock: { requires: ['marine_advanced'], hint: 'Unlocks with advanced marine specialists — it needs a mature, copepod-rich reef.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Wild-caught mandarins usually refuse anything but live copepods and often starve; captive-bred ORA/Biota mandarins are trained onto frozen and prepared foods.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2018)',
    note: 'Widespread, but historically many wild-caught mandarins starved in tanks without enough copepods. Captive-bred fish that eat frozen food changed that.',
  },

  genetics: {
    loci: [
      {
        id: 'hue',
        name: 'Body colour',
        mode: 'mendelian',
        alleles: [
          { id: 'G', name: 'Blue-green', dominance: 2, frequency: 0.93 },
          { id: 'r', name: 'Red', dominance: 1, frequency: 0.07 },
        ],
        note: 'Rare wild individuals are bright red (FishBase); ORA breeds a red line. Inheritance is not published — modelled as recessive.',
      },
    ],
    phenotypes: [
      {
        id: 'red',
        name: 'Red Mandarin',
        layer: 'base',
        rarity: 0.7,
        when: [{ locus: 'hue', allele: 'r', count: 'hom' }],
        visual: { bodyColor: '#c9272a', bodyColor2: '#8e1c24', bellyColor: '#b32a2a', finColor: '#d0342e', finColor2: '#f07a2a', accentColor: '#2a8fd0' },
      },
      { id: 'green', name: 'Green Mandarin', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#e8742a',
      bodyColor2: '#1d6fb8',
      bellyColor: '#2f8f7a',
      finColor: '#2b7fc2',
      finColor2: '#f08a32',
      accentColor: '#27c2d8',
      eyeColor: '#d8452a',
      pattern: 'reticulated',
      patternScale: 1,
      patternContrast: 1,
      patternSeed: 0,
      iridescence: 0.35,
      metallic: 0,
      translucency: 0.15,
      finType: 'dragonet',
      finLength: 1,
      bodyDepth: 0.9,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Scaleless, broad-headed bottom fish with big eyes and fan-like pectoral fins used to "hop". Psychedelic pattern: wavy orange bands edged in turquoise over a royal-blue/green ground; fins blue with orange edging. Males carry a tall first dorsal fin. The red form has a red body and nearly all-red pelvic and pectoral fins. Its blue comes from a true cellular pigment (cyanophores), known in only two vertebrate species.',
  },
  visualMorphs: ['Green Mandarin', 'Red Mandarin'],

  behaviorSet: 'dragonet',
  behaviorTraits: { cruiseSpeed: 0.25, burstSpeed: 2.5, turnRate: 2, hoverTendency: 0.7, schoolingTightness: 0, restOnBottom: 0.8, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.35, nocturnal: 0.1 },
  specialBehaviors: ['pod_hunt', 'hop_crawl', 'dusk_spawn_rise', 'dorsal_display', 'slow_feed'],

  encyclopedia: {
    summary: 'A psychedelic, hovering bottom fish that spends all day picking copepods off the rock — one of the most colourful fish on Earth.',
    nativeHabitat: 'Silty lagoons and inshore reefs 1–18 m deep, among coral rubble and branching coral in the western Pacific.',
    socialStructure: 'Lives in small, loose groups or pairs. Males display to females at dusk.',
    tankNeeds: 'A mature reef (six months or more) with plenty of live rock, ideally a refugium, and a steady copepod supply. Captive-bred fish also take frozen foods like baby brine shrimp.',
    compatibilityNotes: 'Peaceful and reef-safe, but a slow, picky eater that starves if fast fish or other copepod-eaters (other dragonets, some wrasses) get the food first. Two males fight. A good companion for seahorses.',
    breedingOverview: 'Pairs rise toward the surface at dusk and release floating eggs that hatch in about 12 hours. Larvae are reared on copepods by commercial farms.',
    conservationNote: 'Least Concern (IUCN 2018). Choose captive-bred mandarins — they eat prepared foods and live far longer in aquaria.',
    funFact: 'Mandarins have no scales. Instead a thick, bad-smelling toxic slime coats their skin, and their shocking colours may be a warning to predators.',
    inGameBehavior: 'Hops over rock and sand on its pectoral fins, hovering and pecking at copepods one by one; at dusk, pairs may rise together in a spawning dance.',
  },
  sourceReferences: [
    { id: 'fishbase-synchiropus-splendidus', title: 'FishBase — Synchiropus splendidus (Mandarinfish)', url: 'https://www.fishbase.se/summary/Synchiropus-splendidus.html', tier: 1, facts: ['max 7 cm TL', 'depth 1–18 m', 'silty lagoons, coral rubble', 'pairs ascend to spawn', 'rare red individuals', 'IUCN Least Concern (2018)', 'reared in captivity'] },
    { id: 'adw-synchiropus-splendidus', title: 'Animal Diversity Web — Synchiropus splendidus', url: 'https://animaldiversity.org/accounts/Synchiropus_splendidus/', tier: 1, facts: ['24–26 °C', 'pair rises ~1 m to spawn', 'eggs hatch in ~12 h', 'eats amphipods, isopods, worms', 'toxic smelly mucus', 'wild 10–15 yr, captive often 2–4 yr'] },
    { id: 'ora-blue-mandarin', title: 'ORA — Blue Mandarin (captive-bred)', url: 'https://www.orafarm.com/product/blue-mandarin/', tier: 2, facts: ['captive-bred accept frozen and dry foods', 'established reef best', 'singly or mated pairs', 'max 4 in'] },
    { id: 'ora-red-mandarin', title: 'ORA — Red Mandarin (captive-bred)', url: 'https://www.orafarm.com/product/red-mandarin/', tier: 2, facts: ['rare red colour variation of S. splendidus', 'red body and red pelvic/pectoral fins'] },
    { id: 'liveaquaria-green-mandarin', title: 'LiveAquaria — Green Mandarin', url: 'https://www.liveaquaria.com/product/551/?pcatid=551', tier: 2, facts: ['well-established 30+ gal with live rock and sand', 'aggressive only to other mandarins', 'live foods for wild fish', 'price ~$50'] },
    { id: 'wikipedia-synchiropus-splendidus', title: 'Wikipedia — Synchiropus splendidus', url: 'https://en.wikipedia.org/wiki/Synchiropus_splendidus', tier: 3, facts: ['one of only two vertebrates known to be blue from cellular pigment (cyanophores)', 'males have an exceptionally tall dorsal fin', 'smelly, bitter slime instead of scales', 'some wild fish refuse all but live pods'] },
    { id: 'topshelf-mandarin-pods', title: 'Top Shelf Aquatics — Mandarin and Dragonet Care Guide: Pods, Feeding and Mature Tank Requirements', url: 'https://topshelfaquatics.com/blogs/news/mandarin-and-dragonet-care-guide-pods-feeding-and-mature-tank-requirements', tier: 3, facts: ['tank established 6+ months (ideally 9–12)', '1–1.5 lb live rock per gallon', 'hundreds of pods a day', 'males fight; pairs in 75+ gal', 'captive-bred accept frozen'] },
  ],
  confidenceNotes: [
    'High confidence: copepod dependence, slow feeding, mature-tank requirement, male–male aggression, captive-bred fish taking frozen food.',
    'Minimum tank size conflict: LiveAquaria says 30 gal; Top Shelf recommends 50–75 gal with a refugium. The game uses 30 gal plus a mature-tank and pods requirement.',
    'requiresMatureDays = 20 game-days ≈ 6 real months × 40/year, consistent with the lifespan compression.',
    'Red colour inheritance is unpublished; modelled as recessive.',
  ],
  exceptionRules: [
    { other: 'mandarin_dragonet', verdictFloor: 'conditional', reason: 'Two male mandarins fight, and every mandarin competes for the same copepods. Only a male–female pair in a large, pod-rich tank works.', incidentRisk: 0.05, mitigatedBy: ['tank_size'] },
    { other: 'green_chromis', verdictFloor: 'usually_compatible', reason: 'Chromis are fast feeders that eat most frozen food before a mandarin notices it; the mandarin relies on copepods.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
  ],
  special: {
    requiresMatureDays: 20,
    needsPods: true,
  },
  visualLane: 'fish',
  positiveInteractions: [
    { other: 'lined_seahorse', text: 'Both are slow, deliberate feeders — one of the few colourful fish that suits a seahorse tank.' },
  ],
};
