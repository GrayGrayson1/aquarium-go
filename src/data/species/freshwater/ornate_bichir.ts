import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Ornate bichir — Polypterus ornatipinnis. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#ornate-bichir
 * No named colour forms. Young have feathery external gills (the art draws them on small fish); males have a broad,
 * paddle-like anal fin.
 */
export const ornateBichir: SpeciesDefinition = {
  id: 'ornate_bichir',
  commonName: 'Ornate Bichir',
  scientificName: 'Polypterus ornatipinnis',
  category: 'fish',
  group: 'bichir',
  genus: 'Polypterus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Central and East Africa: the Congo River system and tributaries of Lakes Tanganyika and Edward, in calm swamps and rivers',
  isStarter: false,

  // 60 cm TL is the maximum (FishBase, Seriously Fish, LiveAquaria); aquarium fish are usually smaller (Seriously Fish).
  adultSizeCm: 50,
  // LiveAquaria 180 gal; Seriously Fish 180×60×60 cm (floor space matters more than depth).
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: false,
  bioload: 7,

  // Seriously Fish 25–28 °C; FishBase 26–28; LiveAquaria 25–28.3.
  tempC: { min: 24, max: 29, idealMin: 25, idealMax: 28 },
  pH: { min: 6, max: 8, idealMin: 6.5, idealMax: 7.5 },
  salinitySG: null,
  gh: { min: 5, max: 25 },
  kh: { min: 1, max: 12 },

  flowPreference: 'low',
  lightPreference: 'dim',
  diet: 'carnivore',
  // Seriously Fish: prawn, earthworm, mussel, lancefish; usually refuses dried food, though some take pellets
  foods: ['earthworm', 'seafood', 'bloodworm', 'pellet_large', 'pellet_sinking', 'mysis'],
  feedingStyle: 'bottom',
  feedingSpeed: 0.25,
  feedingAggression: 0.35,
  hungerHours: 30,

  activityZone: ['bottom', 'lower', 'surface'],
  temperament: 'predatory',
  territoriality: 0.4,
  aggression: 0.3,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, note: 'One, unless the tank is very large; other bichirs can share a big floor.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'tension', note: 'Aggressive to its own kind in small tanks; young bichirs fight and eat each other while they are tiny.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_benthic', 'fish_slow', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'worm', 'amphibian', 'amphibian_larva'],
  preyTags: ['fish_large', 'fish_benthic'],
  maxLikelyPreySizeCm: 12,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_sand'], avoid: [], note: 'Sand, a large floor and plenty of hiding places. Leave an air gap and open water at the top (it must gulp air) under a tight, sealed lid.' },

  breeding: {
    system: 'egg_scatter_cover',
    difficulty: 0.85,
    // 4–6 years (hobby breeders) → the game's cap
    maturityDays: 25,
    // hobby breeders: over 300 eggs, 20–30 fry raised from one spawn (Tier 3)
    clutchSize: { min: 30, max: 300 },
    // 3–4 days (Seriously Fish) → 3.5 days × 8
    incubationHours: 28,
    fryRearingHours: 160,
    cooldownDays: 30,
    conditions: { needsPartner: true, needsCover: true, minTempC: 26, needsConditioningFood: ['earthworm', 'bloodworm'], minTankGallons: 180 },
    predationWithoutNursery: 0.9,
    nurseryRequired: true,
    maxRaisedPerClutch: 8,
    notes: 'The male chases and nudges the female, cups his anal fin to catch her eggs, fertilises them and scatters them into plants. The adults then eat eggs, so they come out. The eggs hatch in three or four days into tadpole-like larvae with feathery gills, which live on their yolk before taking baby brine shrimp. In the wild a soft-water rainy season sets it off; in tanks it is hard and slow.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // at least 20 years (FishBase), 30 (PFK owner report) → the game's cap; the male's anal fin shows at maturity
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 25, hatchSizeCm: 0.5 },

  hardiness: 0.85,
  difficulty: 'intermediate',
  // LiveAquaria $59.99
  baseValue: 60,
  rarity: 'uncommon',
  visitorAppeal: 0.8,
  unlock: { requires: ['fw_large'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Captive-bred fish are sold, but many are still wild-caught: quarantine new arrivals.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'A living relative of fishes from over 200 million years ago.' },

  genetics: {
    loci: [intensityLocus('No named colour forms; individuals vary in how bright the yellow net is between the black.')],
    phenotypes: [
      { id: 'wild', name: 'Ornate Bichir', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#e8c84a', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#5a4a32',
      bodyColor2: '#3e3222',
      bellyColor: '#e6d898',
      finColor: '#4a3e2c',
      finColor2: '#efe6c8',
      accentColor: '#d9b94a',
      eyeColor: '#c9a040',
      pattern: 'reticulated',
      patternScale: 0.6,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0.05,
      translucency: 0.05,
      finType: 'bichir',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the bichir art: body = the brownish-grey ground; accent = the yellow net between the black blotches, finest on the head; belly = the pale underside; fin = the fins, fin2 = their pale spots that alternate with dark into bars. An eel-like armoured body with a row of small dorsal finlets and big fan-like pectoral fins on fleshy bases.',
  },
  visualMorphs: ['Ornate Bichir'],

  behaviorSet: 'bichir',
  behaviorTraits: { cruiseSpeed: 0.2, burstSpeed: 3, turnRate: 1.5, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.85, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.3, nocturnal: 0.8 },
  specialBehaviors: ['fin_prop_rest', 'air_gulp', 'scent_hunt', 'eel_swim', 'night_prowl', 'escape_attempt'],

  encyclopedia: {
    summary: 'A living fossil: an armoured, eel-like hunter with a row of little dorsal finlets, a yellow-and-black net pattern and a lung for breathing air.',
    nativeHabitat: 'Calm swamps and rivers of the Congo basin and the lakes Tanganyika and Edward, where it hunts by smell at night.',
    socialStructure: 'Mostly solitary; it tolerates other big fish but squabbles with its own kind in a small tank.',
    tankNeeds: 'A six-foot tank of 180 gallons or more with a big sandy floor, caves and plants, open water at the top for air and a tight lid: it squeezes out of gaps.',
    compatibilityNotes: 'It swallows any fish or shrimp that fits, mostly at night. Good with other big, peaceful fish such as arowanas, black ghosts and adult oscars.',
    breedingOverview: 'The male catches the female’s eggs in his cupped anal fin and scatters them into plants. It is hard and slow to breed in a tank.',
    conservationNote: 'Least Concern (IUCN 2009).',
    funFact: 'Its young have feathery external gills like an axolotl’s, and bichirs can drown if kept from the surface: they breathe air with a lung.',
    inGameBehavior: 'Lies on the bottom propped on its big front fins, rises now and then to gulp air, and prowls the floor at night nosing for food.',
    feedingNote: 'Earthworms, seafood and frozen foods, fed in the evening; it is slow and gets outcompeted, so make sure some reaches it.',
    keeperTip: 'Seal every gap in the lid, including round the pipes: bichirs are escape artists.',
  },
  sourceReferences: [
    { id: 'fishbase-polypterus-ornatipinnis', title: 'FishBase — Polypterus ornatipinnis (Ornate bichir)', url: 'https://www.fishbase.se/summary/Polypterus-ornatipinnis.html', tier: 1, facts: ['60 cm TL', 'lives at least 20 years', '26–28 °C', 'adults mainly eat fish, hunting at night', 'the male catches the eggs in his cupped anal fin', 'IUCN Least Concern'] },
    { id: 'standen-2014-polypterus-walking', title: 'McGill University — Standen et al. 2014 (Nature): fish that walk on their fins', url: 'https://mcgill.ca/newsroom/node/21059', tier: 1, facts: ['Polypterus walks on its pectoral fins'] },
    { id: 'seriouslyfish-polypterus-ornatipinnis', title: 'Seriously Fish — Polypterus ornatipinnis', url: 'https://www.seriouslyfish.com/species/polypterus-ornatipinnis/', tier: 2, facts: ['600 mm SL', '180×60×60 cm', '25–28 °C, pH 6.0–8.0', 'nocturnal, very poor eyesight, hunts by smell', 'breathes air: may drown without the surface', 'escapes through gaps', 'eggs hatch in 3–4 days'] },
    { id: 'liveaquaria-ornate-bichir', title: 'LiveAquaria — Ornate Bichir', url: 'https://www.liveaquaria.com/products/ornate-bichir', tier: 2, facts: ['24 in', '180 gal', 'swallows any fish or invertebrate that fits', 'captive-bred', 'prone to jumping', '$59.99'] },
    { id: 'pfk-how-long-will-my-fish-live', title: 'Practical Fishkeeping — How long will my fish live?', url: 'https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/', tier: 2, facts: ['an ornate bichir kept 30 years (owner report)'] },
  ],
  confidenceNotes: [
    'Clutch size and age at maturity come from hobby breeders (Tier 3); the hatch time is Seriously Fish’s and the behaviour FishBase’s.',
    'Sources differ on its own kind (Seriously Fish lists other bichirs as tankmates, LiveAquaria calls it aggressive to them); the game keeps one per tank by default.',
    'In the wild a soft-water rainy season triggers spawning; the game has no such cue, so breeding is simply hard.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'A bichir swallows small fish at night.', incidentRisk: 0.4 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'A bichir swallows small fish at night.', incidentRisk: 0.3 },
    // small bottom fish are covered by the size rules above; this one is for bottom fish too big to swallow
    { other: 'tag:fish_benthic', verdictFloor: 'conditional', reason: 'A bichir finds bottom fish resting on the floor at night and takes any that fit.', incidentRisk: 0.08, mitigatedBy: ['hides'] },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Medium fish are within reach of an adult bichir.', incidentRisk: 0.08, mitigatedBy: ['tank_size'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'incompatible', reason: 'A bichir eats shrimp.', incidentRisk: 0.3 },
    { other: 'tag:amphibian', verdictFloor: 'incompatible', reason: 'A bichir eats frogs.', incidentRisk: 0.3 },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'The fahaka bites chunks out of tankmates and must live alone.', incidentRisk: 0.3 },
    { other: 'oscar', verdictFloor: 'conditional', reason: 'Size-matched adults share a big tank, but an oscar eats a young bichir and takes the food first: feed the bichir after dark.', incidentRisk: 0.03, mitigatedBy: ['target_feeding', 'tank_size'] },
    { other: 'silver_arowana', verdictFloor: 'usually_compatible', reason: 'Different zones: the arowana holds the surface, the bichir the floor; feed the bichir after dark.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
    { other: 'comet_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; a bichir needs tropical water.', incidentRisk: 0.1 },
    { other: 'fancy_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; a bichir needs tropical water.', incidentRisk: 0.1 },
  ],
  special: { airBreather: true, escapeArtist: true, outgrowsSmallTanks: true },
  visualLane: 'fish',
};
