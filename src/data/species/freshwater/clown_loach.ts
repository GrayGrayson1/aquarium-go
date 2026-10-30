import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Clown loach — Chromobotia macracanthus. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#clown-loach
 * No domestic colour forms; the Borneo look is a locality difference (the owner, ADR-0053 round 2: a rare form whose
 * inheritance is the hobby's report).
 */
export const clownLoach: SpeciesDefinition = {
  id: 'clown_loach',
  commonName: 'Clown Loach',
  scientificName: 'Chromobotia macracanthus',
  category: 'fish',
  group: 'loach',
  genus: 'Chromobotia',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Indonesia: Sumatra and Borneo, in the main channels of large rivers; the young grow up on flooded plains',
  isStarter: false,

  // FishBase 30.5 cm TL; Aquarium Co-Op 30–33 cm kept; Seriously Fish 40 cm SL wild maximum.
  adultSizeCm: 30,
  // Seriously Fish: 180×60 cm for a group; FishBase: at least 150 cm long.
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 6,

  // Seriously Fish 24–30 °C; FishBase 25–30; Aquarium Co-Op 28–30.
  tempC: { min: 24, max: 30, idealMin: 26, idealMax: 29 },
  pH: { min: 5, max: 7.5, idealMin: 6, idealMax: 7 },
  salinitySG: null,
  gh: { min: 1, max: 12 },
  // derived: LiveAquaria dKH 8–12 against Seriously Fish's soft water (it gives GH only)
  kh: { min: 1, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'dim',
  diet: 'omnivore',
  foods: ['pellet_sinking', 'pellet_small', 'flake', 'bloodworm', 'brine_shrimp', 'snail_live', 'vegetable', 'earthworm'],
  feedingStyle: 'bottom',
  feedingSpeed: 0.8,
  feedingAggression: 0.55,
  hungerHours: 16,

  activityZone: ['bottom', 'lower', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.2,
  aggression: 0.15,
  finNipper: 0.2,
  hasLongFins: false,
  social: { kind: 'shoal', minGroup: 5, idealGroup: 8, note: 'At least five or six, better ten or more: kept alone or in pairs it turns withdrawn or snappy. A small group hides most of the day; a big one is always out.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Sparring sets a pecking order, and a loser greys out for a while. Young fish shadow the big ones.' },

  predatorTags: ['snail', 'snail_small', 'shrimp_dwarf', 'shrimp_fry', 'fry', 'eggs', 'worm', 'copepod'],
  preyTags: ['fish_large', 'fish_benthic'],
  maxLikelyPreySizeCm: 2,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'caution',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 3,
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_gravel'], avoid: [], note: 'Caves, wood and gaps it can wedge into to rest, and a tight lid: it jumps.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 25,
    // Legendre et al. 2012: 76,000–109,000 eggs per kg of female
    clutchSize: { min: 3500, max: 44000 },
    incubationHours: 6,
    fryRearingHours: 120,
    cooldownDays: 60,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Wild fish migrate up rivers to spawn at the start of the rains. Farms in Southeast Asia and Eastern Europe breed them, traditionally with hormone injections, and some now by copying the wild conditions. No spawning in a home aquarium is documented, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // over 20 years (Seriously Fish), 24 (PFK) → the game's cap
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 30, hatchSizeCm: 0.3 },

  hardiness: 0.6,
  difficulty: 'intermediate',
  // LiveAquaria $29.99 (2.5–3.5 in)
  baseValue: 30,
  rarity: 'common',
  visitorAppeal: 0.8,
  unlock: { requires: ['fw_large'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Many trade fish are wild larvae netted as they drift down Sumatra’s Batang Hari and grown on; hormone-bred fish from Southeast Asian and Czech farms are sold too.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2019)', note: 'Collecting large adults is illegal in Indonesia, and catches of young have fallen sharply since 2000.' },

  genetics: {
    loci: [
      intensityLocus('No domestic colour forms; individuals vary in how deep the orange and red are.'),
      {
        id: 'locality',
        name: 'Locality look',
        mode: 'mendelian',
        alleles: [
          { id: 'B', name: 'Borneo look', dominance: 2, frequency: 0.1, rare: true },
          { id: 's', name: 'Sumatra look', dominance: 1, frequency: 0.9 },
        ],
        note: 'Bornean fish have black or black-and-orange pelvic fins and often thin pale edges to the bands; Sumatran fish have all-red pelvic fins. A population difference, not a gene study: modelled as dominant for drawing only (the owner, ADR-0053 round 2).',
      },
    ],
    phenotypes: [
      { id: 'wild', name: 'Clown Loach', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'borneo', name: 'Borneo', layer: 'overlay', rarity: 0.3, when: [{ locus: 'locality', allele: 'B', count: 'any' }], visual: { bodyMark: 'borneo' }, note: 'Black pelvic fins and pale-edged bands; the inheritance is the hobby’s report, not proven.' },
      intensityOverlay({ bodyColor: '#f88a14', finColor: '#e8241a', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#f2901e',
      bodyColor2: '#e8761a',
      bellyColor: '#f6b860',
      finColor: '#e0341f',
      finColor2: '#141414',
      accentColor: '#111111',
      eyeColor: '#2a1a10',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0.05,
      translucency: 0.05,
      finType: 'forked',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the clown loach art: body = the orange flank; accent = the three black wedge-shaped bands (through the eye, into the dorsal, and from the tail base into the anal fin); fin = the red fins; fin2 = the black edges of the dorsal and tail. bodyMark "borneo" draws black pelvic fins and thin pale borders on the bands.',
  },
  visualMorphs: ['Clown Loach', 'Borneo'],

  behaviorSet: 'loach_shoal',
  behaviorTraits: { cruiseSpeed: 0.8, burstSpeed: 6, turnRate: 3, hoverTendency: 0.2, schoolingTightness: 0.5, restOnBottom: 0.6, hitching: 0, burrowing: 0.1, glassSurfing: 0.1, curiosity: 0.6, nocturnal: 0.4 },
  specialBehaviors: ['click_sounds', 'side_rest', 'wedge_rest', 'pile_rest', 'loach_dance', 'shadowing', 'grey_out', 'snail_hunt', 'spine_raise'],

  encyclopedia: {
    summary: 'A big, orange loach with three bold black bands that lives in a busy group, clicks when it feeds and naps lying on its side.',
    nativeHabitat: 'The main channels of large rivers in Sumatra and Borneo; the young grow up on seasonally flooded plains.',
    socialStructure: 'A shoal with a pecking order: the bigger the group, the bolder every fish in it.',
    tankNeeds: 'A six-foot tank of 180 gallons or more for a group of five or six (eight to ten want more), warm, soft, well-filtered water, caves and wood to wedge into, and a tight lid.',
    compatibilityNotes: 'Peaceful with fish too big to bother, but it eats snails and dwarf shrimp, nips slow long-finned fish and outcompetes gentle feeders such as discus at mealtimes.',
    breedingOverview: 'No spawning in a home aquarium is documented: farms breed it, mostly with hormone injections.',
    conservationNote: 'Least Concern (IUCN 2019). Many trade fish are wild young netted on migration; collecting large adults is illegal in Indonesia.',
    funFact: 'Clown loaches often rest lying flat on their side, which has given many new owners a fright: a fish on its side that is breathing normally is fine.',
    inGameBehavior: 'Forages the floor as a group, piles into caves together and rests on its side; dances up and down the glass after a meal.',
    feedingNote: 'Sinking pellets and frozen foods several times a day, with vegetables; it also hunts any snails in the tank.',
    keeperTip: 'Buy a group, not a pair: a lone clown loach hides and frets, a big group is always out on show.',
  },
  sourceReferences: [
    { id: 'fishbase-chromobotia-macracanthus', title: 'FishBase — Chromobotia macracanthus (Clown loach)', url: 'https://www.fishbase.se/summary/Chromobotia-macracanthus.html', tier: 1, facts: ['30.5 cm TL', '25–30 °C', 'needs a tank at least 150 cm long'] },
    { id: 'legendre-2012-clown-loach', title: 'Legendre et al. 2012 — Captive breeding of the clown loach (Aquatic Living Resources 25: 95–108)', url: 'https://www.cambridge.org/core/product/7C17B5FF5CE8B86FF03F32B10D26ABAC', tier: 1, facts: ['spawns in captivity only after hormone injections', '76,000–109,000 eggs per kg of female'] },
    { id: 'seriouslyfish-chromobotia-macracanthus', title: 'Seriously Fish — Chromobotia macracanthus', url: 'https://www.seriouslyfish.com/species/chromobotia-macracanthus/', tier: 2, facts: ['180×60 cm for a group', '24–30 °C, pH 5.0–7.0', 'groups of 5–6 or more', 'rests on its side', 'jumps', 'Borneo fish have black pelvic fins', 'over 20 years'] },
    { id: 'aquariumcoop-clown-loach', title: 'Aquarium Co-Op — Clown loach care guide', url: 'https://www.aquariumcoop.com/blogs/aquarium/clown-loach-care-guide', tier: 2, facts: ['30–33 cm kept', '28–30 °C', 'eats snails', 'ich-prone', 'clicks'] },
    { id: 'liveaquaria-clown-loach', title: 'LiveAquaria — Clown Loach', url: 'https://www.liveaquaria.com/products/clown-loach', tier: 2, facts: ['100 gal minimum', 'voracious eater of nuisance snails', '$29.99 (2.5–3.5 in)'] },
  ],
  confidenceNotes: [
    'No domestic colour forms; the Borneo look is a locality difference whose inheritance nobody has studied (modelled as dominant for drawing).',
    'Size: 30 cm (FishBase TL); Seriously Fish gives 40 cm SL for wild fish, aquarium fish 15–33 cm.',
    'Breeding: farms use hormone injections (Legendre et al. 2012), and some breed it naturally by copying wild conditions (Aquarium Co-Op); no home spawning is documented.',
    'Sources disagree on temperament (FishBase “aggressive”, Seriously Fish “not especially aggressive”); the game uses semi-aggressive with little aggression to other fish.',
  ],
  exceptionRules: [
    { other: 'tag:snail', verdictFloor: 'incompatible', reason: 'Clown loaches hunt and eat snails, pet snails included.', incidentRisk: 0.3 },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'high_risk', reason: 'Clown loaches eat dwarf shrimp.', incidentRisk: 0.12, mitigatedBy: ['cover'] },
    { other: 'tag:long_fins', verdictFloor: 'conditional', reason: 'Clown loaches nip slow, long-finned fish.', incidentRisk: 0.04 },
    { other: 'betta', verdictFloor: 'high_risk', reason: 'A slow, long-finned betta gets nipped.', incidentRisk: 0.08 },
    { other: 'discus', verdictFloor: 'conditional', reason: 'Boisterous loaches outcompete discus at feeding time.', incidentRisk: 0.02, mitigatedBy: ['target_feeding'] },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'The fahaka attacks tankmates and must live alone.', incidentRisk: 0.3 },
    { other: 'comet_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; a clown loach needs warm tropical water.', incidentRisk: 0.1 },
    { other: 'fancy_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; a clown loach needs warm tropical water.', incidentRisk: 0.1 },
    { other: 'ornate_bichir', verdictFloor: 'conditional', reason: 'An adult bichir hunts the floor at night, where loaches lie on their sides; only loaches too big to swallow.', incidentRisk: 0.04, mitigatedBy: ['tank_size', 'hides'] },
  ],
  special: { needsSinkingFood: true, outgrowsSmallTanks: true, escapeArtist: true, medicationSensitive: true, maleSizeFactor: 0.9 },
  visualLane: 'fish',
};
