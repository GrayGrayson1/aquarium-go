import type { SpeciesDefinition } from '@/types';

/**
 * Flame angelfish — Centropyge loriculus (the trade's "C. loricula"). Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#flame-angelfish
 */
export const flameAngelfish: SpeciesDefinition = {
  id: 'flame_angelfish',
  commonName: 'Flame Angelfish',
  scientificName: 'Centropyge loriculus',
  category: 'fish',
  group: 'dwarf_angelfish',
  genus: 'Centropyge',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Tropical Pacific — Oceania and Hawaii, most common in the Marshall, Line and Cook Islands',
  isStarter: false,

  // FishBase 15 cm TL; Australian Museum ~10 cm; aquarium fish 3.5–4 in.
  adultSizeCm: 10,
  // LiveAquaria and Quality Marine 70 gal; Biota 65 gal.
  recommendedMinTankGallons: 70,
  recommendedFootprint: { minLengthIn: 48, minWidthIn: 18 },
  activeSwimmer: false,
  bioload: 1.2,

  // LiveAquaria / Quality Marine: 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12. Very copper-sensitive.
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['nori', 'algae_wafer', 'vegetable', 'mysis', 'brine_shrimp', 'pellet_small', 'flake', 'biofilm'],
  feedingStyle: 'picker',
  feedingSpeed: 0.65,
  feedingAggression: 0.45,
  hungerHours: 12,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.75,
  aggression: 0.35,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'harem', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.15, note: 'One per tank; a pair only in a large tank, added together. Rival males fight.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'tension', note: 'Harems of three to seven in the wild; in a tank two males fight to the death.' },

  predatorTags: ['coral_polyp', 'clam', 'sessile_invert'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'mostly_safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'caution',
  coralRisk: 0.3,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.55,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs mature live rock with caves to dart between and film algae to peck.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 100, max: 1000 },
    incubationHours: 8,
    fryRearingHours: 480,
    cooldownDays: 2,
    conditions: { needsPartner: true, minTankGallons: 100 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns at dusk with floating eggs. The Oceanic Institute first reared it in 2002 and Biota offers small, sporadic lots; it is not bred in home aquaria, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // 5–7+ years (Wikipedia, LiveAquaria; weakly sourced) → ~240 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 240, sexVisibleAtDays: 14, hatchSizeCm: 0.15 },

  hardiness: 0.65,
  difficulty: 'intermediate',
  baseValue: 110,
  rarity: 'uncommon',
  visitorAppeal: 0.9,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most are wild-collected and frequently exported; Biota occasionally sells captive-bred ones (about $275).',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Least Concern. Locality forms differ in colour, but the populations show no genetic split even 5,700 km apart.' },

  genetics: {
    loci: [
      {
        id: 'bars',
        name: 'Bar pattern (locality)',
        mode: 'mendelian',
        alleles: [
          { id: 'B', name: 'Black bars', dominance: 2, frequency: 0.9 },
          { id: 'm', name: 'Marquesan (bars reduced)', dominance: 1, frequency: 0.1, rare: true },
        ],
        note: 'Marquesan flame angels have the black bars reduced or absent. It is a locality form; its inheritance is unknown and the game models it as a simple recessive (the species is not bred in the game).',
      },
      {
        id: 'intensity',
        name: 'Colour intensity (natural variation)',
        mode: 'additive',
        alleles: [
          { id: 'std', name: 'Typical', dominance: 1, frequency: 0.8 },
          { id: 'rich', name: 'Rich', dominance: 1, frequency: 0.2 },
        ],
        note: 'Locality fish range from orange (most of Oceania) to red (Hawaii) and blood red (Tahiti).',
      },
    ],
    phenotypes: [
      { id: 'marquesan', name: 'Marquesan Flame Angel', layer: 'base', rarity: 0.55, when: [{ locus: 'bars', allele: 'm', count: 'hom' }], visual: { patternContrast: 0.15 } },
      { id: 'wild', name: 'Flame Angelfish', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'rich_colour', name: 'Blood red', layer: 'overlay', rarity: 0.1, when: [{ locus: 'intensity', allele: 'rich', count: 'hom' }], visual: { bodyColor: '#d61c0e', bodyColor2: '#f04a14' }, note: 'Individual variation, not a named trade morph.' },
    ],
    baseVisual: {
      bodyColor: '#e8340f',
      bodyColor2: '#ff6a13',
      bellyColor: '#ff8a2a',
      finColor: '#ff7a1a',
      finColor2: '#141014',
      accentColor: '#141014',
      eyeColor: '#1a1210',
      pattern: 'bars',
      patternScale: 0.6,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.05,
      finType: 'angel_dwarf',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Short, deep, compressed dwarf angel. Red-orange body, more orange mid-flank (body2); 4–5 thin black vertical bars on the upper flank (accent); the rear of the dorsal and anal fins banded purple-blue and black with a blue edge (fin2 = the black edge, the blue drawn by the art). Males (the larger fish) show more blue in the rear fins; the art reads the creature’s sex.',
  },
  visualMorphs: ['Flame Angelfish', 'Marquesan Flame Angel'],

  behaviorSet: 'angelfish_dwarf',
  behaviorTraits: { cruiseSpeed: 0.9, burstSpeed: 5, turnRate: 3, hoverTendency: 0.55, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.03, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['rock_pick', 'cave_dart'],

  encyclopedia: {
    summary: 'A blazing red-orange dwarf angel barred with black, the brightest fish many reefs will ever hold.',
    nativeHabitat: 'Clear lagoons and seaward reefs from the surge zone down to about 60 m, never far from shelter.',
    socialStructure: 'Harems of three to seven in the wild; every fish starts female and the dominant one becomes the male.',
    tankNeeds: 'A 70-gallon or larger tank with mature live rock, caves to dart between and several small meals a day. No copper.',
    compatibilityNotes: 'Reef-safe with caution: it may nip fleshy LPS, soft corals and clam mantles. One per tank, and no other dwarf angels unless the tank is very large.',
    breedingOverview: 'Spawns at dusk with floating eggs; reared only by research and specialist farms.',
    conservationNote: 'Least Concern (IUCN 2009). Captive-bred fish are rare but do exist.',
    funFact: 'Red Hawaiian, barless Marquesan and orange fish look like different species, yet their genes show no split across 5,700 km of ocean.',
    inGameBehavior: 'Darts between the caves pecking at the rock, flashing its black bars and blue-tipped fins.',
    feedingNote: 'Grazes film algae and picks small animals off the rock; give spirulina and seaweed with mysis and small pellets, a few small meals a day. An autofeeder can add pellets; the seaweed goes on by hand.',
    keeperTip: 'Add it last, to a mature tank with plenty of rock to graze.',
  },
  sourceReferences: [
    { id: 'fishbase-centropyge-loriculus', title: 'FishBase — Centropyge loriculus (Flame angel)', url: 'https://www.fishbase.se/summary/Centropyge-loricula.html', tier: 1, facts: ['15 cm TL', 'depth 0–60 m', 'harems of 3–7', 'algae diet', 'frequently exported', 'IUCN Least Concern (2009)'] },
    { id: 'am-flame-angelfish', title: 'Australian Museum — Flame Angelfish', url: 'https://australian.museum/Flame-Angelfish-Centropyge-loriculus', tier: 1, facts: ['~10 cm', 'red-orange with black bars', 'blue and black banded fin rear'] },
    { id: 'liveaquaria-flame-angel', title: 'LiveAquaria — Flame Angelfish', url: 'https://www.liveaquaria.com/product/444/?pcatid=444', tier: 2, facts: ['70 gal', '72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12', 'semi-aggressive', 'reef with caution', 'copper-sensitive', 'locality colours', '~$110'] },
    { id: 'biota-flame-angel', title: 'Biota — Flame Angelfish (captive-bred)', url: 'https://shop.thebiotagroup.com/products/flame-angelfish', tier: 2, facts: ['65–70 gal', 'protogynous', 'territorial to dwarf angels', 'captive-bred lots ~$275'] },
    { id: 'reefbuilders-morse-code-flame', title: 'Reef Builders (2020) — Morse code flame angelfish', url: 'https://reefbuilders.com/2020/04/24/morse-code-flame-angelfish', tier: 2, facts: ['Marquesan form with reduced bars', 'broken bars on one aberrant fish'] },
  ],
  confidenceNotes: [
    'Name: WoRMS and the Catalog of Fishes spell it loriculus; the trade writes loricula.',
    'Protogyny is documented across Centropyge, not yet for this species in a peer-reviewed study.',
    'The Marquesan form is a locality look; modelled as a recessive because its inheritance is unknown.',
    'Lifespan is weakly sourced (5–7+ years).',
  ],
  exceptionRules: [
    { other: 'tag:dwarf_angelfish', verdictFloor: 'conditional', reason: 'Dwarf angels fight each other. Two can share only a very large tank, added together.', incidentRisk: 0.07, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:clam', verdictFloor: 'high_risk', reason: 'Picks at clam mantles.', incidentRisk: 0.1 },
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A quick, bold feeder that may pick at a seahorse and takes its food.', incidentRisk: 0.06 },
  ],
  special: { socialSexChange: true },
  visualLane: 'fish',
};
