import type { SpeciesDefinition } from '@/types';

/**
 * German blue ram — Mikrogeophagus ramirezi. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#german-blue-ram
 * Phenotypes describe the fish's colours; the art adds the female's rose-pink belly and the male's taller dorsal.
 */
export const germanBlueRam: SpeciesDefinition = {
  id: 'german_blue_ram',
  commonName: 'German Blue Ram',
  scientificName: 'Mikrogeophagus ramirezi',
  category: 'fish',
  group: 'cichlid',
  genus: 'Mikrogeophagus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'The llanos of the Orinoco basin in Venezuela and Colombia — warm, soft, slow water in seasonally flooded savanna',
  isStarter: false,

  // FishBase 4.2 cm SL; Aquarium Co-Op 5–6 cm total; males a little larger.
  adultSizeCm: 5.5,
  // Seriously Fish / PFK: 60×30 cm (~15 gal) for one pair; Aquarium Co-Op a pair in a 20 gal community.
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.8,

  // FishBase / Seriously Fish 27–30 °C (Aquarium Co-Op: ideally 29–30 °C; PFK: never below 25 °C); pH 5–7; soft water.
  tempC: { min: 25, max: 31, idealMin: 27, idealMax: 30 },
  pH: { min: 4.5, max: 7.5, idealMin: 5.5, idealMax: 6.8 },
  salinitySG: null,
  gh: { min: 1, max: 10 },
  kh: { min: 0, max: 8 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['pellet_sinking', 'bloodworm', 'brine_shrimp', 'daphnia', 'mysis', 'copepod_live', 'flake'],
  feedingStyle: 'bottom',
  feedingSpeed: 0.3,
  feedingAggression: 0.2,
  hungerHours: 14,

  activityZone: ['lower', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0.55,
  aggression: 0.2,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'pair', minGroup: 1, idealGroup: 2, note: 'Best as one male–female pair; a pair defends a patch of floor a couple of feet across.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males do not tolerate other males; a pair turns feisty when crowded or guarding eggs.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod', 'worm'],
  preyTags: ['fish_small', 'fish_slow'],
  maxLikelyPreySizeCm: 0.7,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_sand', 'planted_soil'], avoid: ['gravel', 'large_pebbles'], note: 'Sifts soft sand for food and spits out what it doesn’t want; flat stones and wood give a pair a place to spawn. Never add it to a new tank.' },

  breeding: {
    system: 'substrate_spawner',
    difficulty: 0.6,
    maturityDays: 12,
    clutchSize: { min: 150, max: 300 },
    incubationHours: 16,
    fryRearingHours: 120,
    cooldownDays: 8,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 27, needsConditioningFood: ['bloodworm', 'brine_shrimp', 'daphnia'], minTankGallons: 10 },
    predationWithoutNursery: 0.7,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'A pair cleans a flat stone, leaf or a pit in the sand and lays about 150–300 eggs, which they guard and fan. The eggs hatch in two or three days at 29 °C and the fry swim free about five days later, then the parents herd them in a school. Eggs fungus unless the water is very soft and clean, and new pairs often eat their first two or three spawns.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'both',
  // Up to 3–4 years (Aquarium Co-Op; Tetra) → ~140 game-days; commercial strains are short-lived.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 140, sexVisibleAtDays: 10, hatchSizeCm: 0.2 },

  hardiness: 0.45,
  difficulty: 'intermediate',
  baseValue: 12,
  rarity: 'common',
  visitorAppeal: 0.8,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Mass-bred in large numbers (sometimes with hormones); wild fish are rarely sold.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2020)', note: 'Least Concern in the wild; trade strains are farm-bred and often weak. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'color',
        name: 'Colour form',
        mode: 'mendelian',
        alleles: [
          { id: 'E', name: 'Electric blue', dominance: 3, frequency: 0.15 },
          { id: 'W', name: 'Wild colour', dominance: 2, frequency: 0.7 },
          { id: 'g', name: 'Gold', dominance: 1, frequency: 0.15 },
        ],
        note: 'Electric blue and gold are xanthic-type strains whose inheritance is unpublished (forum claims: electric blue incompletely dominant, gold recessive); simplified to dominant electric blue and recessive gold.',
      },
      {
        id: 'balloon',
        name: 'Balloon body',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Normal body', dominance: 2, frequency: 0.85 },
          { id: 'b', name: 'Balloon', dominance: 1, frequency: 0.15 },
        ],
        note: 'The balloon is a short, high-bodied (deformed) strain; its inheritance is unpublished, so the game makes it recessive.',
      },
    ],
    phenotypes: [
      { id: 'electric_blue', name: 'Electric Blue Ram', layer: 'base', rarity: 0.25, when: [{ locus: 'color', allele: 'E', count: 'any' }], visual: { bodyColor: '#2f7fe0', bodyColor2: '#4a86d8', bellyColor: '#5a9ae8', finColor: '#2f6fd0', finColor2: '#4aa0f0', accentColor: '#7fd8ff', iridescence: 0.8, metallic: 0.5 }, note: 'Metallic blue all over, the black markings faint.' },
      { id: 'gold', name: 'Gold Ram', layer: 'base', rarity: 0.25, when: [{ locus: 'color', allele: 'g', count: 'hom' }], visual: { bodyColor: '#f2c230', bodyColor2: '#f29a2a', bellyColor: '#f6d870', finColor: '#f0c040', finColor2: '#e86a2a', accentColor: '#f8e8a0', iridescence: 0.35 } },
      { id: 'german_blue', name: 'German Blue Ram', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'balloon', name: 'Balloon', layer: 'overlay', rarity: 0.2, when: [{ locus: 'balloon', allele: 'b', count: 'hom' }], visual: { finType: 'balloon', bodyDepth: 1.15 } },
    ],
    baseVisual: {
      bodyColor: '#b4bc94',
      bodyColor2: '#f2a832',
      bellyColor: '#e8b880',
      finColor: '#8aa8c0',
      finColor2: '#d8402a',
      accentColor: '#44d0f4',
      eyeColor: '#d32f2f',
      pattern: 'speckled',
      patternScale: 0.75,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.55,
      metallic: 0.25,
      translucency: 0.25,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'Colour slots for the ram art: body = the violet-grey to yellow-green flank; body2 = the golden-orange head and chest; accent = the electric-blue spangles over body and fins; fin = the fins, fin2 = their red edges and the pelvic fins; eye = the red iris (crossed by the black eye bar, which the art draws). The black flank blotch and black first dorsal spines are drawn on every form.',
  },
  visualMorphs: ['German Blue', 'Electric Blue', 'Gold', 'Balloon'],

  behaviorSet: 'cichlid_dwarf',
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 5, turnRate: 3, hoverTendency: 0.55, schoolingTightness: 0.15, restOnBottom: 0.2, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['sand_sift', 'hover_pick', 'pair_bond', 'territory_guard', 'fry_herd'],

  encyclopedia: {
    summary: 'A jewel of a dwarf cichlid: golden head, red eye, black eye bar and a body flecked with electric-blue spangles.',
    nativeHabitat: 'Warm, soft, slow water over sand and leaf litter in the seasonally flooded llanos of Venezuela and Colombia.',
    socialStructure: 'Lives in pairs; a pair holds a small patch of floor and raises its young together.',
    tankNeeds: 'A mature tank of 20 gallons or more at 27–30 °C, with soft, slightly acidic, very clean water, soft sand, plants and flat stones.',
    compatibilityNotes: 'Peaceful and a poor competitor at feeding time. Good with small, calm fish that like warm water (cardinal tetras, rasboras, corydoras of warm-water kinds); avoid other cichlids and boisterous feeders.',
    breedingOverview: 'A pair lays a few hundred eggs on a stone or in a sand pit and both parents guard them; the parents herd their fry in a little school.',
    conservationNote: 'Least Concern (IUCN 2020). Trade strains are farm-bred.',
    funFact: 'Its genus name means “small earth-eater”: it takes mouthfuls of sand and spits them out through its gills to sift out food.',
    inGameBehavior: 'Hovers just above the sand, then darts down to sift a mouthful; a pair patrols its patch and chases off fish that come close.',
    feedingNote: 'Feeds on the bottom: sinking pellets and frozen bloodworm, brine shrimp, daphnia or mysis, two or three small meals a day. Slow to compete — make sure food reaches the floor. An autofeeder with sinking pellets suits it.',
    keeperTip: 'Keep it warm (27–30 °C) and add it only to a tank that has been running for a few months; it falls ill fast in poor water.',
  },
  sourceReferences: [
    { id: 'fishbase-mikrogeophagus-ramirezi', title: 'FishBase — Mikrogeophagus ramirezi (Ram)', url: 'https://www.fishbase.se/summary/Mikrogeophagus-ramirezi.html', tier: 1, facts: ['4.2 cm SL', 'Orinoco llanos', '27–30 °C, pH 5.0–6.0', 'IUCN Least Concern (2020)'] },
    { id: 'seriouslyfish-mikrogeophagus-ramirezi', title: 'Seriously Fish — Mikrogeophagus ramirezi', url: 'https://www.seriouslyfish.com/species/mikrogeophagus-ramirezi/', tier: 2, facts: ['60×30 cm for a pair', '27–30 °C, pH 4–7, 1–10 dGH', 'sifts substrate', 'both parents guard', 'strains gold, electric blue, balloon', 'never add to an immature tank'] },
    { id: 'aquariumcoop-ram-cichlids', title: 'Aquarium Co-Op — Ram cichlids', url: 'https://aquariumcoop.com/blogs/aquarium/ram-cichlids', tier: 2, facts: ['ideally 29–30 °C', 'pair in a 20 gal', 'up to 4 years', 'females have blue spangles in the black spot', 'new pairs eat first spawns'] },
    { id: 'pfk-breed-ram', title: 'Practical Fishkeeping — How to breed the ram', url: 'https://www.practicalfishkeeping.co.uk/features/how-to-breed-the-ram-mikrogeophagus-ramirezi/', tier: 2, facts: ['about 200 eggs', 'free-swimming about 8 days after spawning', 'males with extended 3rd–4th dorsal rays', 'pink belly in females'] },
    { id: 'tetra-ram-cichlid', title: 'Tetra — Ram cichlid', url: 'https://blog.tetra.net/en-en/ram-cichlid-mikrogeophagus-ramirezi/', tier: 2, facts: ['black eye bar, black flank spot', 'orange head shading to blue', 'lower water, in pairs', 'up to 3 years'] },
  ],
  confidenceNotes: [
    'No published inheritance for the colour strains; electric blue and gold follow forum claims, simplified.',
    'Sources disagree on brood care (both parents in Seriously Fish and PFK, the female in FishBase); the game has both guard.',
    'Advised temperatures run from 22–26 °C (LiveAquaria) to 29–30 °C (Aquarium Co-Op); the game follows FishBase and Seriously Fish (27–30 °C).',
  ],
  exceptionRules: [
    { other: 'tag:cichlid', verdictFloor: 'conditional', reason: 'Other cichlids compete for the floor and can bully a pair of rams.', incidentRisk: 0.04, mitigatedBy: ['tank_size', 'sight_breaks'] },
  ],
  special: { requiresMatureDays: 30, needsSinkingFood: true },
  visualLane: 'fish',
};
