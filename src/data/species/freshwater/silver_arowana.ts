import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Silver arowana — Osteoglossum bicirrhosum. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#silver-arowana
 * The owner kept it with plain notes (ADR-0053 round 2): mostly wild-caught, often by killing the brooding father, and
 * banned in two US states. The platinum is a real, near-white rarity whose inheritance is unknown (a rare form).
 */
export const silverArowana: SpeciesDefinition = {
  id: 'silver_arowana',
  commonName: 'Silver Arowana',
  scientificName: 'Osteoglossum bicirrhosum',
  category: 'fish',
  group: 'arowana',
  genus: 'Osteoglossum',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical'],
  nativeRegion: 'The Amazon, Essequibo (Rupununi) and Oyapock basins, in flooded forests of black and white waters',
  isStarter: false,

  // FishBase 90 cm TL; Seriously Fish 80 cm SL; LiveAquaria 35 in.
  adultSizeCm: 85,
  // Seriously Fish: a tank at least 2 m long; LiveAquaria 250 gal: the design keeps the 500 (120×36 in), room to turn
  // an 85 cm body.
  recommendedMinTankGallons: 500,
  recommendedFootprint: { minLengthIn: 120, minWidthIn: 36 },
  activeSwimmer: true,
  bioload: 12,

  // Seriously Fish 20–30 °C; FishBase 24–30; LiveAquaria 24–28.
  tempC: { min: 22, max: 30, idealMin: 25, idealMax: 28 },
  pH: { min: 5.5, max: 7.5, idealMin: 6, idealMax: 7 },
  salinitySG: null,
  gh: { min: 2, max: 15 },
  kh: { min: 1, max: 8 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['pellet_floating', 'pellet_large', 'insect', 'seafood', 'earthworm', 'bloodworm', 'mysis'],
  feedingStyle: 'surface',
  feedingSpeed: 0.9,
  feedingAggression: 0.7,
  hungerHours: 30,

  activityZone: ['surface', 'upper'],
  temperament: 'predatory',
  territoriality: 0.5,
  aggression: 0.4,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank: aggressive to its own kind where space is short, and even big groups form a pecking order. Avoid other surface fish.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Arowanas fight their own kind in all but the biggest tanks.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fry', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'snail_small', 'worm', 'amphibian'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 18,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 0,
  coverPreference: 0.2,
  substrateRules: { preferred: ['sand', 'bare', 'fine_gravel'], avoid: [], note: 'Open swimming length and a tight, heavy lid matter, not the substrate. A mature tank only.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    // about 2 years (USFWS); females from 55 cm SL
    maturityDays: 25,
    // Verba et al. 2014: broods of 57–146 young
    clutchSize: { min: 57, max: 146 },
    // eggs and larvae held about six weeks (FishBase) → 42 days × 8
    incubationHours: 336,
    fryRearingHours: 0,
    cooldownDays: 365,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns once a year as the floods begin. The female lays a few large eggs and the male carries the eggs, larvae and young in his mouth for about six weeks; the young go out to feed and dart back in at danger. Not bred in aquaria: fish are farmed in outdoor ponds, or yolk-sac young are collected in the wild, often by killing the brooding father.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male_mouth',
  // over 10 years in human care (Smithsonian's National Zoo) → 12 years; young 1 cm in the father's mouth (Verba)
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 480, sexVisibleAtDays: 25, hatchSizeCm: 1 },

  hardiness: 0.6,
  difficulty: 'advanced',
  // LiveAquaria $59.99 (3–5 in)
  baseValue: 60,
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  unlock: { requires: ['fw_large'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Most are collected in the wild as yolk-sac young in Peru and Colombia, often by killing the father that carries them in his mouth; some are farmed in ponds.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2020; not listed by CITES)',
    note: 'Killing brooding males for their young may threaten Peru’s stocks. The trade in young arowanas is illegal in Brazil, and in the US it is illegal to own in Mississippi and Oklahoma and restricted in Hawaii (USFWS, rules as of 2019).',
  },

  genetics: {
    loci: [
      intensityLocus('No domestic colour forms; individuals vary in how strongly the scales take on pink, blue and green tints.'),
      {
        id: 'platinum',
        name: 'Platinum',
        mode: 'mendelian',
        alleles: [
          { id: '+', name: 'Silver', dominance: 2, frequency: 0.995 },
          { id: 'p', name: 'Platinum', dominance: 1, frequency: 0.005, rare: true },
        ],
        note: 'A near-white Osteoglossum shown at Aquarama 2007 as exceptionally rare (PFK); never bred, its inheritance unknown and its species not stated. Recessive is an assumption (the owner, ADR-0053 round 2).',
      },
    ],
    phenotypes: [
      { id: 'platinum', name: 'Platinum', layer: 'base', rarity: 0.85, when: [{ locus: 'platinum', allele: 'p', count: 'hom' }], visual: { bodyColor: '#f2f2ee', bodyColor2: '#f6f0ec', bellyColor: '#fbfbf8', finColor: '#ecebe4', finColor2: '#e8d4cc', accentColor: '#e6eef4', metallic: 0.95, iridescence: 0.35 }, note: 'Near white all over; the inheritance is the hobby’s report, not proven.' },
      { id: 'wild', name: 'Silver Arowana', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor2: '#e0a49a', accentColor: '#7fb8d8', iridescence: 0.65 }, 'Rainbow-scaled'),
    ],
    baseVisual: {
      bodyColor: '#c9cdd2',
      bodyColor2: '#d6b0a8',
      bellyColor: '#e6e8ea',
      finColor: '#a8a49a',
      finColor2: '#c86a5a',
      accentColor: '#8fb0d0',
      eyeColor: '#c9a85a',
      pattern: 'dragon_scale',
      patternScale: 1.4,
      patternContrast: 0.5,
      patternSeed: 0,
      iridescence: 0.5,
      metallic: 0.85,
      translucency: 0.05,
      finType: 'arowana',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.1,
    notes: 'Colour slots for the arowana art: body = the bright silver; body2 = the rosy edges the big scales take on with age; accent = the blue-green glints; fin2 = the reddish edges of the rear dorsal and anal fins. A long, flat-sided blade with huge scales, an upturned trapdoor mouth with two forward-pointing chin barbels, and the dorsal and anal fins set far back beside the small tail.',
  },
  visualMorphs: ['Silver Arowana', 'Platinum'],

  behaviorSet: 'arowana',
  behaviorTraits: { cruiseSpeed: 0.4, burstSpeed: 6, turnRate: 1, hoverTendency: 0.5, schoolingTightness: 0, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.15, curiosity: 0.5, nocturnal: 0.2 },
  specialBehaviors: ['surface_patrol', 'jump_strike', 'barbel_probe', 'log_ambush', 'feeding_anticipation'],

  encyclopedia: {
    summary: 'A long silver blade of a fish with huge scales and two chin barbels that cruises just under the surface: the “water monkey” that leaps for insects on branches.',
    nativeHabitat: 'Flooded forests of the Amazon and the rivers of the Guianas, in black and white waters, where it takes insects, spiders and small animals from the surface and overhanging branches.',
    socialStructure: 'Solitary: arowanas fight their own kind in all but the biggest tanks.',
    tankNeeds: 'A ten-foot tank of 500 gallons or more with open water at the top, strong filtration, stable warm water and a heavy, tight lid: it jumps when startled.',
    compatibilityNotes: 'Eats any fish that fits its large mouth. Good with big fish that keep to lower water, such as oscars, ornate bichirs, black ghosts and stingrays; avoid other surface fish.',
    breedingOverview: 'The father carries the eggs and young in his mouth for about six weeks. It isn’t bred in aquaria.',
    conservationNote: 'Least Concern (IUCN 2020), but most trade fish are wild-caught as young, often by killing the brooding father. Its trade is illegal in Brazil, and it is illegal to own in Mississippi and Oklahoma and restricted in Hawaii. For experts only.',
    funFact: 'Arowanas can leap well out of the water to snatch insects, spiders and even small birds from branches above the river.',
    inGameBehavior: 'Patrols the top of the tank end to end with its barbels forward, turns wide at the glass and lunges up at food the moment it lands.',
    feedingNote: 'Floating carnivore sticks and large pellets, seafood and the odd cricket; no feeder fish.',
    keeperTip: 'Keep a heavy lid on and the room calm: a startled arowana jumps and can hurt itself on the lid or glass.',
  },
  sourceReferences: [
    { id: 'fishbase-osteoglossum-bicirrhosum', title: 'FishBase — Osteoglossum bicirrhosum (Silver arowana)', url: 'https://www.fishbase.se/summary/Osteoglossum-bicirrhosum.html', tier: 1, facts: ['90 cm TL', '24–30 °C', 'Amazon, Rupununi and Oyapock', 'the male broods the eggs and young for about six weeks', 'IUCN Least Concern (2020)'] },
    { id: 'usfws-erss-arowana', title: 'USFWS — Ecological Risk Screening Summary: Silver arowana (2020)', url: 'https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Arawana_0.pdf', tier: 1, facts: ['mature after about 2 years', 'prohibited in Mississippi and Oklahoma', 'on Hawaii’s conditional list'] },
    { id: 'verba-2014-arowana', title: 'Verba et al. 2014 — Mouthbrooding in the silver arowana (Neotropical Ichthyology 12: 145–151)', url: 'https://scielo.br/j/ni/a/vjSLNXfJGmLNrC7B9ZR9pkb/?lang=en', tier: 1, facts: ['broods of 57–146 young, 1.0–6.8 cm', 'the trade in young for the ornamental market is illegal in Brazil'] },
    { id: 'nationalzoo-silver-arowana', title: 'Smithsonian’s National Zoo — Silver arowana', url: 'https://nationalzoo.si.edu/animals/silver-arowana', tier: 1, facts: ['can exceed 100 cm', 'lived beyond 10 years in human care', 'young with blue glints and a yellow-orange bar', 'males slenderer with a longer anal fin'] },
    { id: 'seriouslyfish-osteoglossum-bicirrhosum', title: 'Seriously Fish — Osteoglossum bicirrhosum', url: 'https://www.seriouslyfish.com/species/osteoglossum-bicirrhosum/', tier: 2, facts: ['800 mm SL', 'a tank at least 2 m long', '20–30 °C, pH 5.0–7.5', 'aggressive to its own kind', 'jumps', 'not bred in aquaria'] },
    { id: 'liveaquaria-silver-arowana', title: 'LiveAquaria — Silver Arowana', url: 'https://www.liveaquaria.com/products/silver-arowana', tier: 2, facts: ['35 in', '250 gal minimum', 'jumps when startled: a tight lid', '$59.99 (3–5 in)'] },
    { id: 'pfk-aquarama-platinum', title: 'Practical Fishkeeping — Aquarama’s most expensive fish', url: 'https://www.practicalfishkeeping.co.uk/fishkeeping-news/aquaramas-most-expensive-fish/', tier: 2, facts: ['a near-white “platinum” Osteoglossum', 'exceptionally rare'] },
  ],
  confidenceNotes: [
    'The platinum’s inheritance is unknown and PFK doesn’t say which Osteoglossum it was; recessive is an assumption (the owner chose to include it as a rare form).',
    'Tank: Seriously Fish wants at least 2 m of length, LiveAquaria 250 gal; the game uses the 500-gallon tank, 10 ft long and 3 ft deep.',
    'Young: the National Zoo and Seriously Fish describe a juvenile with a dark stripe and coloured glints; Wikipedia says its colour is the same all its life.',
    'US rules are cited as of 2019 (USFWS 2020); check current state law.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'An arowana swallows small fish whole.', incidentRisk: 0.4 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'An arowana swallows small fish whole.', incidentRisk: 0.3 },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Medium fish fit an adult arowana’s mouth.', incidentRisk: 0.1, mitigatedBy: ['tank_size'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'incompatible', reason: 'An arowana eats shrimp.', incidentRisk: 0.3 },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'The fahaka bites chunks out of tankmates and must live alone.', incidentRisk: 0.3 },
    { other: 'silver_arowana', verdictFloor: 'high_risk', reason: 'Arowanas fight their own kind in all but the biggest tanks.', incidentRisk: 0.1 },
    { other: 'oscar', verdictFloor: 'conditional', reason: 'Big cichlids harass a young arowana: add the arowana grown, to a large tank.', incidentRisk: 0.03, mitigatedBy: ['tank_size'] },
    { other: 'comet_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; an arowana needs tropical water.', incidentRisk: 0.1 },
    { other: 'fancy_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; an arowana needs tropical water.', incidentRisk: 0.1 },
  ],
  special: { escapeArtist: true, outgrowsSmallTanks: true, heavyWaste: true },
  visualLane: 'fish',
};
