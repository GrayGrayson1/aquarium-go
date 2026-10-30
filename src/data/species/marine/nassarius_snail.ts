import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Nassarius snail (bruised nassa) — Phrontis vibex, sold as Nassarius vibex. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#nassarius-snail
 */
export const nassariusSnail: SpeciesDefinition = {
  id: 'nassarius_snail',
  commonName: 'Nassarius Snail',
  scientificName: 'Phrontis vibex',
  category: 'invertebrate',
  group: 'snail',
  genus: 'Phrontis',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Atlantic — Cape Cod to Florida, the Gulf states, the West Indies and Brazil, buried in intertidal sand and mud',
  isStarter: false,

  // Bailey-Matthews Shell Museum up to 15 mm; SeaLifeBase 2.0 cm.
  adultSizeCm: 1.5,
  // Stock by how much you feed, not by volume (Reef Cleaners); roughly one per 4–5 gal.
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.05,

  // LiveAquaria (all four clean-up snails): 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; sensitive to copper and high nitrate.
  tempC: { min: 20, max: 29, idealMin: 23, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['detritus', 'pellet_sinking', 'pellet_small', 'mysis', 'brine_shrimp', 'bloodworm'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.5,
  feedingAggression: 0,
  hungerHours: 40,

  activityZone: ['substrate', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 5, note: 'Match the number to your feeding — overstocked Nassarius starve.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Entirely peaceful with its own kind.' },

  predatorTags: [],
  preyTags: ['snail'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.2,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Lives buried in the sand with only its siphon showing and races out when food lands; needs a sand bed (in bare tanks it huddles at the base of the rock).' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 12,
    clutchSize: { min: 100, max: 2000 },
    incubationHours: 24,
    fryRearingHours: 120,
    cooldownDays: 20,
    conditions: { needsPartner: true, minTankGallons: 20 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Lays small egg capsules on hard surfaces; the larvae hatch as swimming veligers. Extremely difficult to raise in aquaria, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // "Several years" (Animal Diversity Web) → ~160 game-days.
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 160, sexVisibleAtDays: 160, hatchSizeCm: 0.05 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 3,
  rarity: 'common',
  visitorAppeal: 0.4,
  unlock: { requires: [] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected on Atlantic sand flats.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Common and always available.',
  },

  genetics: {
    loci: [intensityLocus('No colour forms. Shells white, yellowish or light tan, mottled darker, sometimes with dark bands.')],
    phenotypes: [
      { id: 'wild', name: 'Nassarius', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#3e2e22', bodyColor: '#b8a07a' }),
    ],
    baseVisual: {
      bodyColor: '#c9b38f',
      bodyColor2: '#7a5e45',
      bellyColor: '#d8d2c4',
      finColor: '#d8d2c4',
      finColor2: '#f1ebdd',
      accentColor: '#4e3b2e',
      eyeColor: '#101010',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.05,
      finType: 'snail_nassarius',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Colour slots for the snail renderer: body/body2 = tan shell and its mottling; accent = the dark band; fin2 = the glossy callus around the aperture; fin/belly = pale speckled foot (unsourced). A small, stubby, latticed ovate shell; a long siphon held up from the front.',
  },
  visualMorphs: ['Nassarius (no morphs)'],

  behaviorSet: 'snail_sand',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 1.2, turnRate: 1.2, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0.95, glassSurfing: 0, curiosity: 0.3, nocturnal: 0.7, pickRadiusMul: 1.6 },
  specialBehaviors: ['sand_bury', 'siphon_scent', 'food_rush'],

  encyclopedia: {
    summary: 'A tiny sand-dwelling scavenger that lives buried with just its siphon up — and boils out of the sand the moment food lands.',
    nativeHabitat: 'Intertidal sand and mud flats and back bays from Cape Cod to Brazil, usually buried.',
    socialStructure: 'Many live together in the sand and converge on any carcass.',
    tankNeeds: 'A sand bed to bury in and a tank that is fed: it eats leftovers, not algae. Stable water, no copper.',
    compatibilityNotes: 'Reef-safe and peaceful. Wrasses and hermit crabs may eat it.',
    breedingOverview: 'Lays small egg capsules on hard surfaces; the young are rarely raised.',
    conservationNote: 'Not assessed by the IUCN. Common in the trade.',
    funFact: 'It can smell a carcass from far away, and the whole sand bed seems to boil as dozens race toward it.',
    inGameBehavior: 'Stays hidden in the sand until you feed, then pops up and races across the bed to the food.',
    feedingNote: 'A scavenger of meaty leftovers — sinking pellets, mysis, brine shrimp. It has a slow metabolism: in a fed tank it needs nothing extra; otherwise drop in a pellet once or twice a week.',
    keeperTip: 'Match the number of Nassarius to how much you feed, not to the size of the tank.',
  },
  sourceReferences: [
    { id: 'worms-phrontis-vibex', title: 'WoRMS — Phrontis vibex (Say, 1822)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=877061', tier: 1, facts: ['accepted name', 'Nassarius vibex unaccepted (Galindo et al. 2016)'] },
    { id: 'adw-nassarius-vibex', title: 'Animal Diversity Web — Nassarius vibex', url: 'https://animaldiversity.org/accounts/Nassarius_vibex/', tier: 1, facts: ['Cape Cod to Brazil', '10–20 mm', 'eats carrion', 'usually buried', 'several years'] },
    { id: 'bmsm-phrontis-vibex', title: 'Bailey-Matthews National Shell Museum — Phrontis vibex', url: 'https://shells.shellmuseum.org/shell/phrontis-vibex/', tier: 1, facts: ['up to 15 mm', '7–12 axial ribs crossed by spiral cords', 'smells carcasses from afar', 'shell colours'] },
    { id: 'reefcleaners-nassarius', title: 'Reef Cleaners — Nassarius vibex', url: 'https://www.reefcleaners.org/nassarius-vibex', tier: 2, facts: ['do not eat algae', 'stock by feeding', 'gather at the rock base in bare tanks', '~$0.80 each'] },
    { id: 'liveaquaria-nassarius', title: 'LiveAquaria — Nassarius Snail', url: 'https://www.liveaquaria.com/products/nassarius-snail', tier: 2, facts: ['buried with only the siphon showing', '72–78 °F, SG 1.023–1.025', 'reef safe', 'extremely difficult to breed'] },
  ],
  confidenceNotes: [
    'Name: WoRMS moved it to Phrontis vibex; the trade still sells it as Nassarius vibex (and other species as "Nassarius sp." or "Tongan").',
    'Whether the sexes are separate was not confirmed for this species (it is the norm for its group).',
    'Stocking figures come from retailers and forums only.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Mantis shrimp smash snails.', incidentRisk: 0.4 },
  ],
  special: { burrower: true, medicationSensitive: true },
  visualLane: 'special',
};
