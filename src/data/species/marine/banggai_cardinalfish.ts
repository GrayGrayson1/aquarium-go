import type { SpeciesDefinition } from '@/types';

/**
 * Banggai cardinalfish — Pterapogon kauderni. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#banggai-cardinalfish
 */
export const banggaiCardinalfish: SpeciesDefinition = {
  id: 'banggai_cardinalfish',
  commonName: 'Banggai Cardinalfish',
  scientificName: 'Pterapogon kauderni',
  category: 'fish',
  group: 'cardinalfish',
  genus: 'Pterapogon',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Endemic to the Banggai Archipelago, central Sulawesi, Indonesia (introduced elsewhere via the trade)',
  isStarter: false,

  // FishBase max 8.6 cm TL; NOAA up to 3.4 in.
  adultSizeCm: 8,
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.9,

  // Top Shelf: 75–80 °F, pH 8.1–8.4, dKH 8–12, SG 1.024–1.026.
  tempC: { min: 22, max: 29, idealMin: 24, idealMax: 27 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'copepod_live'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.35,
  feedingAggression: 0.2,
  hungerHours: 14,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.35,
  aggression: 0.05,
  finNipper: 0,
  hasLongFins: true,
  social: { kind: 'pair', minGroup: 1, idealGroup: 2, note: 'Juveniles group happily, but adults pair off and males defend small territories. A bonded pair is ideal in most tanks.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'courtship_ok',
    juvenile: 'ok',
    note: 'Groups of young fish get along; as they mature, males fight and pairs push other adults out of their space.',
  },

  predatorTags: ['copepod', 'shrimp_fry', 'worm'],
  preyTags: ['fish_medium', 'long_fins'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Likes to hover among branching structures — in the wild long-spined urchins, anemones and seagrass.' },

  breeding: {
    system: 'mouthbrooder',
    difficulty: 0.35,
    maturityDays: 16,
    // Vagelli 1999: clutch of ~40 large (3 mm) eggs.
    clutchSize: { min: 20, max: 60 },
    // Vagelli 1999: eggs incubated ~19 days in the male's mouth; young released as 8 mm juveniles → ~20 × 8.
    incubationHours: 160,
    // No planktonic stage: released juveniles are tracked almost at once.
    fryRearingHours: 48,
    cooldownDays: 8,
    conditions: { needsPartner: true, minTempC: 24, minTankGallons: 30 },
    predationWithoutNursery: 0.6,
    nurseryRequired: false,
    maxRaisedPerClutch: 20,
    notes: 'After courtship the female passes a ball of about 40 large eggs to the male, who broods them in his mouth and does not eat for roughly three weeks. He releases fully formed juveniles with no drifting larval stage — the reason this is one of the easiest marine fish to breed. Released young are eaten by tank mates unless moved to a nursery.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male_mouth',
  // NOAA: 2.5–3 years typical, up to 5 → ~160 game-days in good captive care.
  lifecycle: { juvenileDays: 12, adultDays: 16, lifespanDays: 160, sexVisibleAtDays: 16, hatchSizeCm: 0.8 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 35,
  rarity: 'uncommon',
  visitorAppeal: 0.8,
  unlock: { requires: ['marine_basics'], hint: 'Unlocks with beginner marine fish.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Endangered (IUCN Red List, 2007); Threatened under the US Endangered Species Act (2016)',
    note: 'Found naturally only around the Banggai Islands, where collection for the aquarium trade and destructive fishing devastated populations. Captive-bred Banggais are easy to find — never buy wild-caught.',
  },

  genetics: {
    loci: [
      {
        id: 'spots',
        name: 'Spotting density',
        mode: 'additive',
        alleles: [
          { id: 'mod', name: 'Moderate spotting', dominance: 1, frequency: 0.75 },
          { id: 'heavy', name: 'Heavy spotting', dominance: 1, frequency: 0.25 },
        ],
        note: 'Bar and spot patterns differ between individuals (NOAA). Modelled as an additive spotting tendency; not a named trade morph.',
      },
    ],
    phenotypes: [
      { id: 'wild', name: 'Banggai Cardinal', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'heavy_spot', name: 'Heavily spotted', layer: 'overlay', rarity: 0.15, when: [{ locus: 'spots', allele: 'heavy', count: 'hom' }], visual: { patternContrast: 1, patternScale: 1.25 }, note: 'Individual variation.' },
    ],
    baseVisual: {
      bodyColor: '#d9dcdc',
      bodyColor2: '#b9bfc2',
      bellyColor: '#eceeee',
      finColor: '#1a1a1a',
      finColor2: '#f2f2f2',
      accentColor: '#121212',
      eyeColor: '#e2c64a',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 1,
      patternSeed: 0,
      iridescence: 0.2,
      metallic: 0.35,
      translucency: 0.15,
      finType: 'banggai',
      finLength: 1.3,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Silvery body with three bold black vertical bars (through the eye, from the first dorsal to the pelvics, and from the second dorsal to the anal fin), a black-edged forked tail, long trailing fins, and pearly white spots scattered over the rear bar, fins and tail. Gold eye. Pattern varies individually.',
  },
  visualMorphs: ['Banggai Cardinal', 'Heavily spotted'],

  behaviorSet: 'cardinal_hover',
  behaviorTraits: { cruiseSpeed: 0.25, burstSpeed: 3, turnRate: 1.5, hoverTendency: 0.95, schoolingTightness: 0.3, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.5, nocturnal: 0.2 },
  specialBehaviors: ['hover_still', 'urchin_shelter', 'mouthbrood', 'juvenile_release', 'pair_display'],

  encyclopedia: {
    summary: 'A striking silver-and-black cardinalfish that hovers almost motionless — and whose fathers raise their young in their mouths.',
    nativeHabitat: 'Calm, shallow bays 1–2 m deep around the Banggai Islands, hovering over seagrass and sand among the spines of sea urchins and the tentacles of anemones.',
    socialStructure: 'Young fish live in groups; adults form pairs, and males defend small territories.',
    tankNeeds: 'A peaceful 30-gallon or larger tank with gentle flow and branching structures to hover among. Eats frozen mysis and small pellets readily.',
    compatibilityNotes: 'Peaceful and reef-safe. Adult males fight each other. Its long fins can attract nippers, and fast feeders can outcompete it.',
    breedingOverview: 'The male mouthbroods about 40 large eggs for roughly three weeks, then releases fully formed babies with no larval stage — one of the easiest marine fish to breed.',
    conservationNote: 'Endangered on the IUCN Red List and listed as Threatened under the US Endangered Species Act. Captive-bred fish protect the tiny wild range.',
    funFact: 'Released babies swim straight to the nearest urchin or anemone and hide among its spines or tentacles — they never drift as plankton.',
    inGameBehavior: 'Hangs still in mid-water near decor, pairs up, and — once bred — a male with bulging cheeks holds his brood until a cloud of tiny cardinals appears.',
  },
  sourceReferences: [
    { id: 'fishbase-pterapogon-kauderni', title: 'FishBase — Pterapogon kauderni (Banggai cardinalfish)', url: 'https://www.fishbase.se/summary/Pterapogon-kauderni.html', tier: 1, facts: ['max 8.6 cm TL', 'depth 1–2 m', 'hover over urchins, retreat among spines', 'juveniles use anemones', 'male mouthbrooding, 8 mm young released', 'no planktonic stage', 'IUCN Endangered (2007)'] },
    { id: 'noaa-banggai', title: 'NOAA Fisheries — Banggai Cardinalfish', url: 'https://www.fisheries.noaa.gov/species/banggai-cardinalfish', tier: 1, facts: ['ESA Threatened (2016)', 'up to 3.4 in', 'lifespan 2.5–3 years, up to 5', 'male mouthbrooding, fully formed juveniles', 'threats: ornamental trade and destructive fishing', 'individual bar patterns'] },
    { id: 'vagelli-1999', title: 'Vagelli (1999) The reproductive biology and early ontogeny of the mouthbrooding Banggai cardinalfish. Environmental Biology of Fishes', url: 'https://link.springer.com/article/10.1023/A:1007514625811', tier: 1, facts: ['clutch ~40 eggs, 3 mm', '~19 day oral incubation', 'released at 8 mm SL', 'no planktonic interval', '30 mm TL at four months'] },
    { id: 'topshelf-cb-banggai', title: 'Top Shelf Aquatics — Captive-Bred Banggai Cardinalfish', url: 'https://topshelfaquatics.com/products/captive-bred-banggai-cardinalfish', tier: 2, facts: ['captive-bred, ~$40', 'min 30 gal', 'adults territorial toward own species once pairs form', 'multiple pairs need 100+ gal', 'reef safe', '75–80 °F, SG 1.024–1.026'] },
  ],
  confidenceNotes: [
    'High confidence: endemism, mouthbrooding and direct development, IUCN Endangered, ESA Threatened.',
    'Brooding time: Vagelli (1999) reports ~19 days of oral incubation; some hobby sources quote up to ~30 days including post-hatch holding. The game uses ~20 real days.',
    'Vagelli (1999) abstract read via search index; the Springer page requires sign-in.',
    'Clutch size range (20–60) brackets the ~40-egg mean.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
};
