import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Clown triggerfish — Balistoides conspicillum. Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#clown-triggerfish
 * No trade forms. Young are black with big white spots all over and a yellow snout; adults keep the spots on the lower
 * half, with a yellow net on the back. One of the most aggressive fish kept: one per tank, added last.
 */
export const clownTriggerfish: SpeciesDefinition = {
  id: 'clown_triggerfish',
  commonName: 'Clown Triggerfish',
  scientificName: 'Balistoides conspicillum',
  category: 'fish',
  group: 'triggerfish',
  genus: 'Balistoides',
  environment: 'marine',
  // not reef: it eats invertebrates and turns over corals while hunting
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The Indo-Pacific, from East Africa to Samoa, north to southern Japan and south to northern Australia, on outer reef slopes',
  isStarter: false,

  // FishBase and Fishes of Australia 50 cm TL; LiveAquaria 20 in.
  adultSizeCm: 45,
  // LiveAquaria and Quality Marine: 300 gal
  recommendedMinTankGallons: 300,
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 8,

  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  // LiveAquaria: squid, krill, clams and hard-shelled shrimp to wear down its ever-growing teeth
  foods: ['shellfish', 'seafood', 'pellet_large', 'mysis', 'pellet_sinking', 'snail_live', 'pellet_small'],
  feedingStyle: 'hunter',
  feedingSpeed: 0.9,
  feedingAggression: 0.9,
  hungerHours: 20,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'aggressive',
  territoriality: 0.9,
  aggression: 0.9,
  finNipper: 0.45,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.03, note: 'One per tank, added last and young; it grows more aggressive with age.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'lethal', mixed: 'harassment', juvenile: 'fight', note: 'Never two, unless a known pair in an enormous tank.' },

  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'snail', 'snail_small', 'starfish', 'clam', 'worm', 'sessile_invert', 'copepod', 'fish_tiny', 'fish_small', 'fish_benthic', 'fish_slow', 'fry', 'eggs'],
  preyTags: ['fish_large'],
  // judgement: it bites prey apart rather than swallowing it whole
  maxLikelyPreySizeCm: 8,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'caution',
  reefSafe: 'unsafe',
  coralRisk: 0.45,
  anemoneRelationship: 'harms_anemone',

  hidesNeeded: 1,
  coverPreference: 0.3,
  substrateRules: { preferred: ['sand', 'aragonite', 'fine_sand'], avoid: [], note: 'Sand with rubble to blow and dig in, rock fixed in place (it rearranges decor), and one crevice to lock itself into at night.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 22,
    clutchSize: { min: 10000, max: 100000 },
    incubationHours: 8,
    fryRearingHours: 380,
    cooldownDays: 30,
    conditions: { needsPartner: true, needsNestSite: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Pairs spawn over rubble and sand and guard sticky eggs on the bottom; the larvae drift in the plankton for weeks. Biota in Palau raised them in a hatchery in 2015, but nobody has raised them at home, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'both',
  lifecycle: { juvenileDays: 20, adultDays: 24, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'advanced',
  // LiveAquaria $149.99 (½–1 in)
  baseValue: 150,
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  unlock: { requires: ['predators'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Nearly all are wild-caught young; hatchery batches from Palau reached the US in 2015 but are not a steady supply.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2022)', note: 'Widespread; the young are the ones collected for the trade.' },

  genetics: {
    loci: [intensityLocus('No trade forms; the colours fade if it is underfed.')],
    phenotypes: [
      { id: 'wild', name: 'Clown Triggerfish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#ffffff', bodyColor2: '#e2cf4a' }),
    ],
    baseVisual: {
      bodyColor: '#111214',
      bodyColor2: '#d8c040',
      bellyColor: '#f2f2ec',
      finColor: '#1a1a1a',
      finColor2: '#e6dc86',
      accentColor: '#f6f6f0',
      eyeColor: '#1a1410',
      pattern: 'spots',
      patternScale: 1.6,
      patternContrast: 1,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0,
      finType: 'triggerfish',
      finLength: 1,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the triggerfish art: body = the black; accent = the big white spots on the lower half; body2 = the yellow net on the back round the dorsal fin; fin2 = the pale yellow band in the tail. The art draws the yellow band across the snout and the orange lips. Young are drawn with bigger spots all over and a yellow snout.',
  },
  visualMorphs: ['Clown Triggerfish'],

  behaviorSet: 'triggerfish',
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 5, turnRate: 3, hoverTendency: 0.55, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0.1, glassSurfing: 0.05, curiosity: 0.85, nocturnal: 0 },
  specialBehaviors: ['balistiform_swim', 'spine_lock_wedge', 'rock_flip', 'sand_jet', 'urchin_flip', 'grunt', 'territory_charge', 'glass_beg', 'equipment_bite'],

  encyclopedia: {
    summary: 'A black triggerfish covered in big white spots, with a yellow net on its back and bright orange lips: the reef’s most striking, and most aggressive, fish.',
    nativeHabitat: 'Outer reef slopes of the Indo-Pacific, where it hunts urchins, crabs, snails and clams.',
    socialStructure: 'Solitary and territorial.',
    tankNeeds: 'An eight-foot tank of 300 gallons or more with huge filtration, sand and rubble, rock fixed in place, a crevice to sleep in and no reef animals.',
    compatibilityNotes: 'It eats every crab, shrimp, snail, urchin, starfish and clam, and attacks small and slow fish. Only big, robust fish have a chance, with the trigger added last and young.',
    breedingOverview: 'Pairs guard their eggs on the sea floor; a Palau hatchery raised them in 2015, but nobody has at home.',
    conservationNote: 'Least Concern (IUCN 2022).',
    funFact: 'At night it wedges itself into a crevice and locks its first dorsal spine upright with the second, the “trigger” of its name, so nothing can pull it out.',
    inGameBehavior: 'Sculls about on its dorsal and anal fins with its body held stiff, blows jets of water at the sand, and wedges into the rock at night.',
    feedingNote: 'Shell-on shellfish, squid and other seafood: hard shells wear down its ever-growing teeth.',
    keeperTip: 'Mind your hands and your heater: it bites both.',
  },
  sourceReferences: [
    { id: 'fishbase-balistoides-conspicillum', title: 'FishBase — Balistoides conspicillum (Clown triggerfish)', url: 'https://www.fishbase.se/summary/Balistoides-conspicillum.html', tier: 1, facts: ['50 cm TL', 'eats urchins, crabs, crustaceans, molluscs and tunicates', 'IUCN Least Concern (2022)'] },
    { id: 'foa-balistoides-conspicillum', title: 'Fishes of Australia — Balistoides conspicillum', url: 'https://fishesofaustralia.net.au/Home/species/761', tier: 1, facts: ['50 cm TL', 'young black with big white spots, a yellow snout and a yellow back patch'] },
    { id: 'australianmuseum-triggerfishes', title: 'Australian Museum — Why are they called triggerfishes?', url: 'https://australian.museum/learn/animals/fishes/why-are-they-called-triggerfishes/', tier: 1, facts: ['the first dorsal spine locks upright to wedge into the reef'] },
    { id: 'liveaquaria-clown-triggerfish', title: 'LiveAquaria — Clown Triggerfish', url: 'https://www.liveaquaria.com/products/clown-triggerfish', tier: 2, facts: ['20 in', '300 gal', 'not reef compatible', 'hard-shelled food wears down its teeth', '$149.99'] },
    { id: 'qualitymarine-clown-triggerfish', title: 'Quality Marine — Clown Triggerfish', url: 'https://www.qualitymarine.com/quality-marine/fish/triggers/balistoides/clown-conspicillum-32009/', tier: 2, facts: ['300 gal or larger', 'eats small fish, stars, crabs, shrimp, snails and urchins', 'blows water to flip urchins'] },
    { id: 'tfh-balistoides-conspicillum', title: 'TFH Magazine — Balistoides conspicillum', url: 'https://tfhmagazine.com/articles/saltwater/balistoides-conspicillum', tier: 2, facts: ['almost all end up kept alone', 'bites hands, heaters and tubing'] },
    { id: 'reefbuilders-2015-clown-trigger', title: 'Reef Builders 2015 — Biota’s cultured clown triggerfish', url: 'https://reefbuilders.com/2015/04/06/quality-marine-receives-biota-marines-cultured-balistoides-conspicillum', tier: 2, facts: ['hatched and raised by Biota in Palau'] },
  ],
  confidenceNotes: [
    'No lifespan source beyond hobby reports; the game uses 12 years.',
    'Its prey size is a judgement: it bites prey apart rather than swallowing it.',
  ],
  exceptionRules: [
    { other: 'tag:crustacean', verdictFloor: 'incompatible', reason: 'Crabs, hermits and shrimp are its natural food: it crushes them.', incidentRisk: 0.5 },
    { other: 'tag:shrimp_large', verdictFloor: 'incompatible', reason: 'Cleaner and peppermint shrimp are eaten.', incidentRisk: 0.5 },
    { other: 'tag:snail', verdictFloor: 'incompatible', reason: 'It crushes snail shells with its teeth.', incidentRisk: 0.5 },
    { other: 'tag:starfish', verdictFloor: 'incompatible', reason: 'It flips urchins with jets of water and bites them from below, and eats starfish.', incidentRisk: 0.4 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'One of the most aggressive fish kept: small fish are killed and eaten.', incidentRisk: 0.35 },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'It attacks mid-sized reef fish; only large, robust fish have a chance.', incidentRisk: 0.15, mitigatedBy: ['tank_size', 'hides'] },
    { other: 'tag:fish_large', verdictFloor: 'conditional', reason: 'Even large fish are harassed: add the trigger last, young, to a very big tank.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:fish_slow', verdictFloor: 'incompatible', reason: 'It bites slow, weak swimmers.', incidentRisk: 0.3 },
    { other: 'tag:clam', verdictFloor: 'incompatible', reason: 'It eats clams.', incidentRisk: 0.4 },
    { other: 'clown_triggerfish', verdictFloor: 'incompatible', reason: 'Never two clown triggerfish: they fight to the death.', incidentRisk: 0.3 },
  ],
  special: { outgrowsSmallTanks: true, heavyWaste: true },
  visualLane: 'fish',
};
