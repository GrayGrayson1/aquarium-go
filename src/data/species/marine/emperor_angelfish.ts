import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Emperor angelfish — Pomacanthus imperator. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#emperor-angelfish
 */
export const emperorAngelfish: SpeciesDefinition = {
  id: 'emperor_angelfish',
  commonName: 'Emperor Angelfish',
  scientificName: 'Pomacanthus imperator',
  category: 'fish',
  group: 'angelfish',
  genus: 'Pomacanthus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — the Red Sea and East Africa to the Line and Tuamotu Islands, north to southern Japan, south to the Great Barrier Reef',
  isStarter: false,

  // FishBase 40 cm SL; Fishes of Australia / Australian Museum 38 cm TL; FAO ~30 cm. Aquarium adults ~30 cm.
  adultSizeCm: 35,
  // LiveAquaria and Top Shelf: 220 gal for an adult. Practical Fishkeeping: at least 215 cm long, over 2 m for an adult.
  recommendedMinTankGallons: 220,
  recommendedFootprint: { minLengthIn: 84, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 4.5,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12.
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'pellet_large', 'flake', 'nori', 'vegetable', 'algae_wafer'],
  feedingStyle: 'picker',
  feedingSpeed: 0.65,
  feedingAggression: 0.6,
  hungerHours: 14,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.8,
  aggression: 0.45,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.05, note: 'One per tank, and no other large angelfish. Add it last, as a juvenile.' },
  sameSpeciesRule: {
    maleMale: 'lethal',
    femaleFemale: 'fight',
    mixed: 'harassment',
    juvenile: 'tension',
    note: 'Adults attack their own kind and other large angels; they usually tolerate juveniles, whose colours are different.',
  },

  // Sponges, tunicates and other encrusting life; in a reef tank fleshy LPS, zoanthids, clam mantles and feather dusters.
  predatorTags: ['sessile_invert', 'coral_polyp', 'clam', 'worm', 'copepod'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'mostly_safe',
  frySafe: 'caution',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',
  coralRisk: 0.55,
  anemoneRelationship: 'harms_anemone',

  hidesNeeded: 2,
  coverPreference: 0.45,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs caves and ledges big enough to turn in, and room to cruise.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 25,
    clutchSize: { min: 10000, max: 70000 },
    incubationHours: 8,
    fryRearingHours: 600,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns in pairs at dusk, releasing floating eggs with no care. Bali Aquarich rears it commercially (sold by Biota since 2023), but not in home aquaria, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // FishBase: 14 years reported; Quality Marine: at least 15 → the game's 500-day ceiling.
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.15 },

  hardiness: 0.6,
  difficulty: 'advanced',
  baseValue: 300,
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most are wild-collected and frequently exported; captive-bred juveniles from Bali Aquarich (via Biota) have been sold since 2023 and come pellet-trained.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2009)',
    note: 'Least Concern and widespread. Wild imports often refuse food and carry flukes; captive-bred fish settle in more easily.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Locality labels only (Red Sea, Maldives and Christmas Island "Orangetail" fish); young are navy with white and blue rings and change to the adult stripes at 8–12 cm.')],
    phenotypes: [
      { id: 'wild', name: 'Emperor Angelfish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#ffcf2e', finColor: '#ff9a14', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#1f4fa8',
      bodyColor2: '#16337a',
      bellyColor: '#2a5cb8',
      finColor: '#f7a21b',
      finColor2: '#3fa9f5',
      accentColor: '#f4c430',
      eyeColor: '#2a1a10',
      pattern: 'lined',
      patternScale: 1.6,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.2,
      metallic: 0,
      translucency: 0.05,
      finType: 'angelfish_large',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Deep, compressed angelfish with a gill-cover spine and a rounded tail. Adult: royal blue body crossed by many narrow yellow stripes, a blue-black mask through the eye edged in pale blue, a pale blue-white face and mouth, a black shoulder band from the pectoral base edged sapphire in front and yellow behind, a yellow-orange tail and rear dorsal, and a deep blue anal fin with electric-blue lines. Juvenile: navy-black with concentric white and electric-blue rings closing into a full white ring at the rear, and a white dorsal margin. The art draws the juvenile from the creature’s life stage.',
  },
  visualMorphs: ['Emperor Angelfish (no morphs; ringed juvenile, striped adult)'],

  behaviorSet: 'angelfish_dwarf',
  behaviorTraits: { cruiseSpeed: 0.7, burstSpeed: 4, turnRate: 2, hoverTendency: 0.45, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.65, nocturnal: 0, pickRadiusMul: 1.1 },
  specialBehaviors: ['rock_pick', 'drum_thump', 'cave_patrol'],

  encyclopedia: {
    summary: 'A big, regal angelfish whose young are navy with white rings and turn into blue-and-gold striped adults with a black mask.',
    nativeHabitat: 'Coral-rich lagoon, channel and seaward reefs 1–100 m deep; young under ledges on patch reefs, adults around caves and overhangs.',
    socialStructure: 'Adults live in pairs or small harems; young are solitary. Every fish starts female and the largest becomes the male.',
    tankNeeds: 'A seven-foot tank of 220 gallons or more with plenty of caves and ledges, good filtration for a big messy eater, and a varied diet.',
    compatibilityNotes: 'Keep one, with no other large angels. Not safe with fleshy corals, zoanthids, clams or feather dusters; an SPS-only reef is the usual compromise.',
    breedingOverview: 'Spawns in pairs at dusk with floating eggs. Reared commercially in Bali since 2023, but not bred in home aquaria.',
    conservationNote: 'Least Concern (IUCN 2009). Choose captive-bred fish when you can — they feed better from the start.',
    funFact: 'It drums: a run of fast, audible thumps like a drum roll, often when it is disturbed.',
    inGameBehavior: 'Cruises slowly between caves, picking at the rock and turning a big blue-and-gold flank to anyone who comes near.',
    feedingNote: 'Feed a varied mix two or three times a day: angelfish pellets or flake with spirulina, thawed mysis and shrimp, and seaweed clipped to the rock. An autofeeder can add pellets; the seaweed goes on by hand.',
    keeperTip: 'Add it last, and young: a juvenile settles in far more easily than a wild adult, and grows up into the tank.',
  },
  sourceReferences: [
    { id: 'fishbase-pomacanthus-imperator', title: 'FishBase — Pomacanthus imperator (Emperor angelfish)', url: 'https://www.fishbase.se/summary/Pomacanthus-imperator.html', tier: 1, facts: ['40 cm SL', 'depth 1–100 m', 'sponges and tunicates', 'pairs', '14 years reported', 'IUCN Least Concern (2009)', 'juvenile white dorsal margin'] },
    { id: 'foa-pomacanthus-imperator', title: 'Fishes of Australia — Pomacanthus imperator', url: 'https://fishesofaustralia.net.au/Home/species/653', tier: 1, facts: ['38 cm TL', 'juveniles under ledges on patch reefs, adults at caves'] },
    { id: 'am-pomacanthus-imperator', title: 'Australian Museum — Emperor Angelfish', url: 'https://australian.museum/learn/animals/fishes/emperor-angelfish-pomacanthus-imperator/', tier: 1, facts: ['38 cm', 'blue with yellow stripes', 'juvenile concentric rings'] },
    { id: 'oca-pomacanthus-imperator', title: 'Oregon Coast Aquarium — Emperor angelfish', url: 'https://aquarium.org/?p=22368', tier: 1, facts: ['protogynous', 'colour change at 8–12 cm', 'dusk spawning, planktonic eggs'] },
    { id: 'liveaquaria-emperor-angelfish', title: 'LiveAquaria — Emperor Angelfish', url: 'https://www.liveaquaria.com/product/411/?pcatid=411', tier: 2, facts: ['220 gal', '72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12', 'semi-aggressive', 'reef with caution: nips corals and clams', 'from ~$162 juvenile'] },
    { id: 'qm-emperor-angelfish', title: 'Quality Marine — Emperor Angelfish', url: 'https://www.qualitymarine.com/news/emperor-angelfish/', tier: 2, facts: ['adults attack their own kind and large angels', 'drumming', 'transition: rings break into stripes', 'at least 15 years', 'HLLE prone'] },
    { id: 'reefbuilders-cb-emperor-2023', title: 'Reef Builders (2023) — Captive bred emperor angelfish are now available', url: 'https://reefbuilders.com/2023/06/15/captive-bred-emperor-angelfish-are-now-available/', tier: 2, facts: ['Bali Aquarich, sold by Biota since June 2023', 'pellet-trained', '$225'] },
  ],
  confidenceNotes: [
    'Maximum size differs by source and measure (30–40 cm, FishBase’s figure is SL); the game uses 35 cm.',
    'Reef safety: LiveAquaria says reef with caution, Practical Fishkeeping says not reef-safe except in SPS-only tanks; the game marks it caution with a high coral risk.',
    'Older care sheets say it has never been bred; that is out of date since Bali Aquarich’s 2023 captive-bred release.',
    'Sexual dimorphism is slight and the game keeps adults the same colour; the juvenile’s rings are drawn until the fish is grown.',
  ],
  exceptionRules: [
    { other: 'coral_beauty', verdictFloor: 'conditional', reason: 'A big angel bullies smaller angelfish, especially ones added after it. Add the dwarf angel first, in a very large tank.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:clam', verdictFloor: 'high_risk', reason: 'Picks at clam mantles until the clam dies.', incidentRisk: 0.15 },
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A large, bold feeder that outcompetes and may pick at slow seahorses.', incidentRisk: 0.08 },
  ],
  special: {
    outgrowsSmallTanks: true,
  },
  visualLane: 'fish',
};
