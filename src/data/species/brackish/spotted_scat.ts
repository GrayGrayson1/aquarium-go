import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Spotted scat — Scatophagus argus. Lane brackish, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/brackish.md#spotted-scat
 * No trade forms. The red "ruby" scat is the young's colour phase, not a line (Aquarium Glaser, Aquatics Unlimited): every
 * young scat is drawn barred, with red-orange patches on the head and back, and turns spotted as it grows (the art's
 * young colours). The silver or striped scat (Selenotoca) is another genus, not in this chunk.
 */
export const spottedScat: SpeciesDefinition = {
  id: 'spotted_scat',
  commonName: 'Spotted Scat',
  scientificName: 'Scatophagus argus',
  category: 'fish',
  group: 'scat',
  genus: 'Scatophagus',
  environment: 'brackish',
  waterClasses: ['brackish', 'marine_fowlr'],
  nativeRegion: 'The Indo-Pacific from Kuwait to Fiji, in harbours, mangrove estuaries and the lower reaches of rivers',
  isStarter: false,

  // usually 15–20 cm in aquaria (Aquarium Glaser), up to 38 (TFH); Fishes of Australia 33 cm SL; FishBase 45 cm TL max.
  adultSizeCm: 30,
  // TFH: a six- to eight-foot tank for a school
  recommendedMinTankGallons: 240,
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 5,

  // FishBase 20–28 °C; Aquatics Unlimited 22–26.
  tempC: { min: 20, max: 30, idealMin: 23, idealMax: 28 },
  pH: { min: 7.2, max: 8.6, idealMin: 7.6, idealMax: 8.4 },
  // the game's synthesis: young in barely brackish water, adults best in sea water (TFH; Aquatics Unlimited 1.010–1.025)
  salinitySG: { min: 1.003, max: 1.025, idealMin: 1.01, idealMax: 1.022 },
  gh: { min: 10, max: 25 },
  kh: { min: 8, max: 14 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'omnivore',
  foods: ['vegetable', 'nori', 'algae_wafer', 'flake', 'pellet_small', 'pellet_sinking', 'brine_shrimp', 'bloodworm', 'mysis'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.9,
  feedingAggression: 0.75,
  hungerHours: 18,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.15,
  aggression: 0.2,
  finNipper: 0.1,
  hasLongFins: false,
  social: { kind: 'group', minGroup: 6, idealGroup: 6, note: 'A group of six or more, all added at the same time; they sort out a pecking order.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'ok', juvenile: 'ok', note: 'Chases and jostling through the roots; a group spreads it out.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'shrimp_dwarf', 'copepod', 'worm', 'fish_tiny', 'snail_small', 'coral_polyp', 'sessile_invert'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 3,

  shrimpSafe: 'unsafe',
  snailSafe: 'caution',
  frySafe: 'unsafe',
  plantSafe: 'unsafe',
  reefSafe: 'unsafe',
  coralRisk: 0.5,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'aragonite', 'fine_sand'], avoid: [], note: 'A mangrove-style tank: roots and branches to chase through, open water and hard-wearing decor. Live plants are eaten.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    // females at 7–9 months (Wikipedia, uncited) → about 25 game days
    maturityDays: 25,
    clutchSize: { min: 20000, max: 200000 },
    // about 20 hours (Wikipedia)
    incubationHours: 7,
    fryRearingHours: 240,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Not bred in aquariums. Scats spawn in the sea at the start of the monsoon; their larvae have bony head plates and drift in the plankton before settling in estuaries. Trade fish are wild-caught young.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.18 },

  hardiness: 0.85,
  difficulty: 'intermediate',
  // Aquatics Unlimited $19.99–59.99 (1–3 in)
  baseValue: 30,
  rarity: 'uncommon',
  visitorAppeal: 0.82,
  unlock: { requires: ['brackish'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Sold as wild-caught young; even farms grow on wild-caught fingerlings.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Widespread and fished for food; it depends on mangrove estuaries.' },

  genetics: {
    loci: [intensityLocus('Green to yellowish adults; individuals vary in how many and how dark the spots are.')],
    phenotypes: [
      { id: 'wild', name: 'Spotted Scat', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#8ea06a', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#9aa77c',
      bodyColor2: '#7c8758',
      bellyColor: '#dfe2cf',
      finColor: '#8d9466',
      finColor2: '#4a4a30',
      accentColor: '#3a2e1e',
      eyeColor: '#2c2418',
      pattern: 'spots',
      patternScale: 0.9,
      patternContrast: 0.75,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0.3,
      translucency: 0.1,
      finType: 'scat',
      finLength: 1,
      bodyDepth: 1.15,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the scat art: body = the silvery green; body2 = the back; accent = the dark spots. Young fish are drawn barred, with red-orange patches on the head and back and reddish fins (the red "ruby" phase), and turn spotted as they grow. A deep, flat, almost square body with a steep forehead.',
  },
  visualMorphs: ['Spotted Scat'],

  behaviorSet: 'rabbitfish',
  behaviorTraits: { cruiseSpeed: 0.7, burstSpeed: 5, turnRate: 2.4, hoverTendency: 0.45, schoolingTightness: 0.4, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.85, nocturnal: 0 },
  specialBehaviors: ['graze_surfaces', 'beg_at_glass', 'chase_play', 'steal_archer_prey'],

  encyclopedia: {
    summary: 'A deep, spotted, greedy grazer of mangrove estuaries: its young are the red “ruby scats” of the shops.',
    nativeHabitat: 'Harbours, mangrove creeks and river mouths across the Indo-Pacific; the young drift into estuaries and the lower reaches of rivers.',
    socialStructure: 'Lives in groups with a pecking order; the tiniest young live alone.',
    tankNeeds: 'An eight-foot tank of 240 gallons or more for a group, brackish water raised towards sea water as they grow, roots and branches, open water and very good filtration.',
    compatibilityNotes: 'The classic partner of the silver mono, and good with archerfish and mollies. It eats plants and grazes soft corals, and starves out tiny gobies.',
    breedingOverview: 'Not bred in aquariums: scats spawn in the sea.',
    conservationNote: 'Least Concern (IUCN 2009).',
    funFact: 'In the wild a scat will follow an archerfish and snatch the insects it shoots down. Its fin spines are venomous: handle it with care.',
    inGameBehavior: 'Roams the middle and lower water picking at rock, roots and glass, and crowds the front at feeding time.',
    feedingNote: 'Lots of greens (seaweed, blanched vegetables, algae wafers) with flakes, pellets and frozen foods; it eats a great deal.',
    keeperTip: 'Its fin spines are venomous: use a net, not your hands.',
  },
  sourceReferences: [
    { id: 'fishbase-scatophagus-argus', title: 'FishBase — Scatophagus argus (Spotted scat)', url: 'https://www.fishbase.se/summary/Scatophagus-argus.html', tier: 1, facts: ['45 cm TL max, 20 cm common', 'marine, brackish and fresh', '20–28 °C', 'IUCN Least Concern (2009)'] },
    { id: 'foa-scatophagus-argus', title: 'Fishes of Australia — Scatophagus argus', url: 'https://fishesofaustralia.net.au/home/species/2212', tier: 1, facts: ['33 cm SL', 'mangrove creeks and lower streams', 'small young barred with red-orange patches', 'venom glands at the fin-spine bases'] },
    { id: 'xiao-2019-scat-genome', title: 'Xiao et al. 2019 — Genome survey of the spotted scat', url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6940847/fullTextXML', tier: 1, facts: ['the female grows faster and larger'] },
    { id: 'tfh-scatophagus-argus', title: 'TFH Magazine — Scatophagus argus', url: 'https://tfhmagazine.com/articles/saltwater/scatophagus-argus', tier: 2, facts: ['usually up to 38 cm', 'adults best in full marine water', 'a six- to eight-foot tank', 'follows archerfish', 'not bred in captivity'] },
    { id: 'pfk-mucky-mouths', title: 'Practical Fishkeeping — The mucky mouths', url: 'https://www.practicalfishkeeping.co.uk/features/the-mucky-mouths/', tier: 2, facts: ['brackish is best, starting at 10–15 ppt', 'always keep in groups', 'a heavy bioload'] },
    { id: 'glaser-scatophagus-argus', title: 'Aquarium Glaser — Scatophagus argus', url: 'https://www.aquariumglaser.de/en/fish-archives/scatophagus-argus-2', tier: 2, facts: ['“rubifrons” is a dealer’s name', 'small red scats are striped and turn spotted at 4–5 cm'] },
    { id: 'aquaticsunlimited-ruby-scat', title: 'Aquatics Unlimited — Red (ruby) scat', url: 'https://aquaticsunlimited.com/product/brackish-scat-red-ruby-scatophagus-argus-rubifrons/', tier: 2, facts: ['the red is a juvenile stage', 'keep at least six', '$19.99–59.99 (1–3 in)'] },
  ],
  confidenceNotes: [
    'The red “ruby” scat is the young’s colour phase (Aquatics Unlimited, Aquarium Glaser); TFH and Wikipedia call red an individual variation that can last. The game draws every young scat red-patched.',
    'Salinity: one range spans the young’s brackish water and the adults’ sea water; its bounds are the game’s synthesis.',
    'Age at maturity (7–9 months) is uncited in Wikipedia; the sexes differ in size by one study (females larger) and the other way by Aquarium Glaser.',
  ],
  exceptionRules: [
    { other: 'banded_archerfish', verdictFloor: 'usually_compatible', reason: 'Natural companions: scats even follow archerfish to snatch the insects they shoot down.', incidentRisk: 0 },
    { other: 'figure_eight_puffer', verdictFloor: 'conditional', reason: 'The puffer nips fins and wants lower salinity than grown scats.', incidentRisk: 0.05 },
    { other: 'bumblebee_goby', verdictFloor: 'high_risk', reason: 'A greedy, fast scat starves a tiny goby out and may eat it.', incidentRisk: 0.1 },
    { other: 'tag:coral_polyp', verdictFloor: 'high_risk', reason: 'Scats graze anything soft, corals and plants included.', incidentRisk: 0.2 },
    { other: 'tag:tang', verdictFloor: 'conditional', reason: 'In a fish-only marine tank scats compete hard for the seaweed tangs live on, and grown tangs need a very large tank.', incidentRisk: 0.03, mitigatedBy: ['tank_size', 'target_feeding'] },
    { other: 'queen_angelfish', verdictFloor: 'conditional', reason: 'In a fish-only marine tank a queen angel chases newcomers and greedy scats win the food: a very large tank, the angel added last.', incidentRisk: 0.03, mitigatedBy: ['tank_size'] },
  ],
  special: { venomous: true, heavyWaste: true, outgrowsSmallTanks: true },
  visualLane: 'fish',
};
