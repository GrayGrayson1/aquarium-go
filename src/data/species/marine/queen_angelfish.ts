import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Queen angelfish — Holacanthus ciliaris. Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#queen-angelfish
 * No trade forms. Young look completely different (dark blue with curved bright blue bars, a yellow tail and a golden
 * face) until about 16 cm. Left out: the Townsend angelfish (a hybrid with the blue angel) and the wild colour oddities
 * of St Paul's Rocks.
 */
export const queenAngelfish: SpeciesDefinition = {
  id: 'queen_angelfish',
  commonName: 'Queen Angelfish',
  scientificName: 'Holacanthus ciliaris',
  category: 'fish',
  group: 'angelfish',
  genus: 'Holacanthus',
  environment: 'marine',
  // not reef: it nips corals and clams
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The western Atlantic: Florida and the Gulf of Mexico through the Caribbean to Brazil, among reefs and gorgonians',
  isStarter: false,

  // FishBase and the Florida Museum 45 cm TL max; aquarium adults are smaller.
  adultSizeCm: 40,
  // LiveAquaria and Quality Marine: 250 gal → the 300-gallon tank
  recommendedMinTankGallons: 250,
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 6,

  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['pellet_small', 'flake', 'mysis', 'brine_shrimp', 'pellet_large', 'nori', 'vegetable', 'algae_wafer'],
  feedingStyle: 'picker',
  feedingSpeed: 0.7,
  feedingAggression: 0.65,
  hungerHours: 10,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.8,
  aggression: 0.55,
  finNipper: 0.1,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.04, note: 'One per tank, and no other large angel. Wild adults live in pairs; research tanks of 1,000–2,000 litres held pairs, with some fighting.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'fight', mixed: 'courtship_ok', juvenile: 'fight', note: 'Young are strongly territorial; a true pair can share a very large tank.' },

  predatorTags: ['sessile_invert', 'coral_polyp', 'clam', 'worm', 'copepod'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'mostly_safe',
  frySafe: 'caution',
  plantSafe: 'caution',
  reefSafe: 'unsafe',
  coralRisk: 0.65,
  anemoneRelationship: 'harms_anemone',

  hidesNeeded: 2,
  coverPreference: 0.45,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Plenty of live rock to pick at and caves big enough for it to turn round in.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    // Lm 22 cm (FishBase); the colour change comes at about 16 cm
    maturityDays: 22,
    // 25,000–75,000 an evening (Florida Museum, ADW)
    clutchSize: { min: 25000, max: 75000 },
    // hatch in 15–20 h (Florida Museum), 18 h (Skorupa et al. 2025)
    incubationHours: 6,
    fryRearingHours: 220,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Pairs rise and release floating eggs at sunset. The first captive spawning was in a Brazilian research lab in December 2024, with nothing reported yet on raising the young, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // up to 15 years (National Geographic) → the game's cap; the sexes look alike
  lifecycle: { juvenileDays: 22, adultDays: 24, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.2 },

  hardiness: 0.65,
  difficulty: 'advanced',
  // LiveAquaria $218.99 (1–1.5 in)
  baseValue: 220,
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  unlock: { requires: ['marine_large'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'All are wild-caught in Florida, the Caribbean and Brazil.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Stable, though heavily collected off Brazil.' },

  genetics: {
    loci: [intensityLocus('No trade forms; individuals vary in how bright the yellow and blue are.')],
    phenotypes: [
      { id: 'wild', name: 'Queen Angelfish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor2: '#ffd21a', accentColor: '#5fd0ff' }),
    ],
    baseVisual: {
      bodyColor: '#2f8fb0',
      bodyColor2: '#e6c22a',
      bellyColor: '#f0c838',
      finColor: '#2a6fd8',
      finColor2: '#ffd21a',
      accentColor: '#1b2f8f',
      eyeColor: '#1c1a24',
      pattern: 'reticulated',
      patternScale: 0.7,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.35,
      metallic: 0,
      translucency: 0.04,
      finType: 'angelfish_large',
      finLength: 1.15,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the queen angel art: body = the blue-green with yellow scale centres (body2); fin = the blue dorsal and anal with long trailing tips; fin2 = the all-yellow tail and pectorals; accent = the "crown", a dark blue spot ringed with bright blue on the forehead. Young are drawn dark blue with curved bright blue bars, a yellow tail and a golden face.',
  },
  visualMorphs: ['Queen Angelfish'],

  behaviorSet: 'angelfish_dwarf',
  behaviorTraits: { cruiseSpeed: 0.7, burstSpeed: 4.5, turnRate: 2, hoverTendency: 0.45, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.65, nocturnal: 0 },
  specialBehaviors: ['rock_pick', 'sponge_graze', 'cave_patrol', 'new_fish_chase', 'juvenile_cleaning'],

  encyclopedia: {
    summary: 'A big, iridescent blue-and-yellow angelfish with an all-yellow tail and a blue “crown” on its forehead; its young are dark blue with curved bright blue bars.',
    nativeHabitat: 'Reefs and gorgonian gardens of the western Atlantic, where it picks at sponges, the main part of its diet.',
    socialStructure: 'Adults live in pairs; young hold small territories and run cleaning stations for bigger fish.',
    tankNeeds: 'An eight-foot tank of 300 gallons with plenty of live rock to pick at, big caves, stable water and three meals a day.',
    compatibilityNotes: 'Not reef-safe: it nips corals and clams. One large angel per tank; it chases fish added after it, so add it last. Good with big tangs and other robust fish.',
    breedingOverview: 'Spawns in the open sea at sunset; first spawned in a lab in December 2024, with no young raised yet.',
    conservationNote: 'Least Concern (IUCN 2009).',
    funFact: 'The young look so different from the adults that they were once thought to be another species.',
    inGameBehavior: 'Patrols the rock and caves low in the tank, picking at everything, and comes to the front to see what you are doing.',
    feedingNote: 'Varied food three times a day: angel formula with sponge, small pellets, frozen mysis and brine shrimp, and seaweed.',
    keeperTip: 'Add it last: a queen angel chases any fish that arrives after it.',
  },
  sourceReferences: [
    { id: 'fishbase-holacanthus-ciliaris', title: 'FishBase — Holacanthus ciliaris (Queen angelfish)', url: 'https://www.fishbase.se/summary/Holacanthus-ciliaris.html', tier: 1, facts: ['45 cm TL max', 'eats mainly sponges', 'Lm 22 cm', 'IUCN Least Concern (2009)'] },
    { id: 'floridamuseum-queen-angelfish', title: 'Florida Museum — Queen angelfish', url: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/holacanthus-ciliaris', tier: 1, facts: ['45 cm', 'young dark blue with curved bright blue bars and a yellow tail', 'young clean other fish', '25,000–75,000 eggs an evening'] },
    { id: 'adw-holacanthus-ciliaris', title: 'Animal Diversity Web — Holacanthus ciliaris', url: 'https://animaldiversity.org/accounts/Holacanthus_ciliaris/', tier: 1, facts: ['very aggressive in aquariums', 'males larger'] },
    { id: 'skorupa-2025-queen-spawning', title: 'Skorupa et al. 2025 — First captive spawning of the queen angelfish (World Aquaculture Society)', url: 'https://www.was.org/Meeting/Program/PaperDetail/167384', tier: 1, facts: ['spawned twice in December 2024', 'hatch at about 18 h'] },
    { id: 'skorupa-2025-queen-growth', title: 'Skorupa et al. 2025 — Growth of the queen angelfish in aquaculture (World Aquaculture Society)', url: 'https://was.org/Meeting/Program/PaperDetail/167558', tier: 1, facts: ['young colours lost at about 15.9 cm TL'] },
    { id: 'liveaquaria-queen-angelfish', title: 'LiveAquaria — Queen Angelfish', url: 'https://www.liveaquaria.com/products/queen-angelfish', tier: 2, facts: ['18 in', '250 gal', 'not a good reef dweller: nips corals and clam mantles', 'add it last', '$218.99'] },
    { id: 'qualitymarine-queen-angelfish', title: 'Quality Marine — Queen angelfish', url: 'https://www.qualitymarine.com/quality-marine/fish/angels/holacanthus/queen-juvenile-10061/', tier: 2, facts: ['250 gal or larger', 'territorial to other large angels'] },
    { id: 'natgeo-queen-angelfish', title: 'National Geographic — Queen angelfish', url: 'https://www.nationalgeographic.com/animals/fish/facts/queen-angelfish', tier: 2, facts: ['up to 15 years'] },
  ],
  confidenceNotes: [
    'Sex change (protogyny) is assumed from related angelfish; the sexes look alike.',
    'Left out: the Townsend angelfish (a hybrid with the blue angel) and the wild colour oddities of St Paul’s Rocks (about 1 % of one island population, not a trade form).',
  ],
  exceptionRules: [
    // design §11 (the review): usually compatible with the big tangs
    { other: 'tag:tang', verdictFloor: 'usually_compatible', reason: 'Big angels and tangs share a big tank well; both graze, so give enough greens for all.', incidentRisk: 0.01, mitigatedBy: ['tank_size'] },
    { other: 'emperor_angelfish', verdictFloor: 'high_risk', reason: 'Two large angelfish fight: keep one big angel per tank.', incidentRisk: 0.12, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:dwarf_angelfish', verdictFloor: 'conditional', reason: 'A queen angel bullies smaller angelfish, especially ones added after it: add the dwarf angel first, in a very large tank.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:clam', verdictFloor: 'high_risk', reason: 'It picks at clam mantles until the clam dies.', incidentRisk: 0.15 },
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A big, bold feeder that outcompetes and may pick at slow seahorses.', incidentRisk: 0.08 },
  ],
  special: { outgrowsSmallTanks: true },
  visualLane: 'fish',
};
