import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Harlequin rasbora — Trigonostigma heteromorpha. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#harlequin-rasbora
 */
export const harlequinRasbora: SpeciesDefinition = {
  id: 'harlequin_rasbora',
  commonName: 'Harlequin Rasbora',
  scientificName: 'Trigonostigma heteromorpha',
  category: 'fish',
  group: 'cyprinid',
  genus: 'Trigonostigma',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Peninsular Malaysia, Singapore and eastern Sumatra with nearby islands — gentle, tea-stained forest streams and peat swamps',
  isStarter: false,

  // Tan 2020: 35 mm SL wild; FishBase 5 cm TL; Seriously Fish to 45 mm SL in captivity.
  adultSizeCm: 4.5,
  // Seriously Fish 60×30 cm (~15 gal) for 8–10; Aquarium Co-Op and LiveAquaria 10 gal.
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: true,
  bioload: 0.45,

  // FishBase 22–25 °C, Seriously Fish 21–28 °C; pH 5.0–7.5; 1–12 dGH.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26.5 },
  pH: { min: 5, max: 7.5, idealMin: 5.8, idealMax: 7 },
  salinitySG: null,
  gh: { min: 1, max: 12 },
  kh: { min: 1, max: 10 },

  flowPreference: 'low',
  lightPreference: 'dim',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'daphnia', 'brine_shrimp'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.55,
  feedingAggression: 0.25,
  hungerHours: 14,

  activityZone: ['middle', 'upper'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0.02,
  finNipper: 0.02,
  hasLongFins: false,
  social: { kind: 'shoal', minGroup: 6, idealGroup: 10, note: 'A shoaling fish: keep eight to ten or more so the shoal behaves normally.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Males display to each other in a group without harm.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_small'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.65,
  substrateRules: { preferred: ['sand', 'fine_sand', 'planted_soil', 'fine_gravel'], avoid: [], note: 'Dim light and broad-leaved plants such as Cryptocoryne, under whose leaves it lays its eggs.' },

  breeding: {
    system: 'egg_scatter_cover',
    difficulty: 0.6,
    maturityDays: 14,
    clutchSize: { min: 60, max: 120 },
    incubationHours: 10,
    fryRearingHours: 60,
    cooldownDays: 7,
    conditions: { needsPartner: true, needsCover: true, minTempC: 25, needsConditioningFood: ['bloodworm', 'daphnia', 'brine_shrimp'], minTankGallons: 5 },
    predationWithoutNursery: 0.9,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'A pair turns upside down beneath a broad leaf and sticks 6–12 eggs to its underside at each embrace, typically 80–100 in all; the parents give no care and the adults eat eggs. The eggs hatch in a day or two and the fry swim free about a week later, needing infusoria and then baby brine shrimp. Spawning needs very soft, acidic water (pH 5–6) at the warm end of the range.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 5–8 years (Wikipedia, not systematically studied) → ~200 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 200, sexVisibleAtDays: 14, hatchSizeCm: 0.2 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 3,
  rarity: 'common',
  visitorAppeal: 0.55,
  unlock: { requires: [], hint: 'Available from the start.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Mass-farmed in South-East Asia; farmed fish often lack the wild colour.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2019)', note: 'Least Concern, though its peat-swamp home is shrinking. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'gold',
        name: 'Golden',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Wild colour', dominance: 2, frequency: 0.85 },
          { id: 'g', name: 'Golden', dominance: 1, frequency: 0.15 },
        ],
        note: 'Golden (leucistic) harlequins are a selectively bred strain; their inheritance is unpublished, so the game makes golden recessive. Seriously Fish also lists bred blue and black strains, which the game leaves out.',
      },
      intensityLocus('Colour varies with water, diet and source population: coppery orange to pinkish-violet, deepest in soft, tea-stained water.'),
    ],
    phenotypes: [
      { id: 'golden', name: 'Golden Harlequin', layer: 'base', rarity: 0.25, when: [{ locus: 'gold', allele: 'g', count: 'hom' }], visual: { bodyColor: '#f0c890', bodyColor2: '#e8b070', bellyColor: '#f4e6d0', finColor: '#f0a060', finColor2: '#f4c8a0', accentColor: '#4a3a30', patternContrast: 0.75 } },
      { id: 'wild', name: 'Harlequin Rasbora', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#e0602e', bodyColor2: '#8a5a98', finColor: '#e8452a' }),
    ],
    baseVisual: {
      bodyColor: '#e0703a',
      bodyColor2: '#9a6a9a',
      bellyColor: '#d8d2c8',
      finColor: '#e2552a',
      finColor2: '#f0b090',
      accentColor: '#0d0d0d',
      eyeColor: '#e07a2a',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.35,
      metallic: 0.15,
      translucency: 0.3,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the harlequin art: body = the coppery orange flank, body2 = the purplish sheen on the front body; belly = the pale belly; accent = the velvety black wedge (Tan 2020’s “axine”) from below the dorsal fin to the tail base; fin = the orange-red dorsal and tail, fin2 = their clear tips; eye = the orange iris.',
  },
  visualMorphs: ['Harlequin Rasbora', 'Golden'],

  behaviorSet: 'schooling_small',
  behaviorTraits: { cruiseSpeed: 1.3, burstSpeed: 8, turnRate: 3.6, hoverTendency: 0.25, schoolingTightness: 0.6, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.4, nocturnal: 0 },
  specialBehaviors: ['loose_shoal', 'midwater_hover', 'dart_feed', 'male_display'],

  encyclopedia: {
    summary: 'A small, peaceful shoaling fish, coppery orange with a sharp black wedge on its rear half.',
    nativeHabitat: 'Gentle, tea-stained forest streams and peat swamps of Malaysia, Singapore and Sumatra, among Cryptocoryne plants in dim light.',
    socialStructure: 'Lives in loose, cohesive shoals; males display to each other and to females.',
    tankNeeds: 'A planted tank of 10 gallons or more with soft, slightly acidic water, dim light and room for a shoal of eight to ten.',
    compatibilityNotes: 'Very peaceful: good with other small community fish, corydoras, dwarf gouramis and bettas. Adults may take shrimplets.',
    breedingOverview: 'Pairs spawn upside down beneath a broad leaf, sticking their eggs to the underside; no parental care.',
    conservationNote: 'Least Concern (IUCN 2019). Most are farm-bred.',
    funFact: 'Its black wedge only got a formal name — the “axine” — in 2020, in the same study that split off a look-alike species from the Malay east coast.',
    inGameBehavior: 'Swims in a loose shoal in the middle of the tank, turning together and flashing copper and black among the plants.',
    feedingNote: 'Small flake and micro pellets once or twice a day, with frozen daphnia, bloodworm or brine shrimp now and then. An autofeeder with flake suits it.',
    keeperTip: 'Keep eight to ten or more — in a bigger shoal they are bolder and show better colour.',
  },
  sourceReferences: [
    { id: 'fishbase-trigonostigma-heteromorpha', title: 'FishBase — Trigonostigma heteromorpha (Harlequin rasbora)', url: 'https://www.fishbase.se/summary/Trigonostigma-heteromorpha.html', tier: 1, facts: ['5 cm TL', '22–25 °C, pH 5.0–7.0, dH 5–12', 'eggs under leaves', 'IUCN Least Concern (2019)'] },
    { id: 'tan-2020-trigonostigma', title: 'Tan (2020) Trigonostigma truncata, a new species, and the harlequin’s colours. Raffles Bulletin of Zoology 68:421–433', url: 'https://lkcnhm.nus.edu.sg/app/uploads/2020/01/RBZ-2020-0058.pdf', tier: 1, facts: ['35 mm SL', 'range', 'live colours', 'the black “axine”', 'T. truncata split off'] },
    { id: 'seriouslyfish-trigonostigma-heteromorpha', title: 'Seriously Fish — Trigonostigma heteromorpha', url: 'https://www.seriouslyfish.com/species/trigonostigma-heteromorpha/', tier: 2, facts: ['60×30 cm for 8–10', '21–28 °C, pH 5.0–7.5', 'spawns under broad leaves', 'golden, blue and black strains'] },
    { id: 'liveaquaria-harlequin-rasbora', title: 'LiveAquaria — Harlequin Rasbora', url: 'https://www.liveaquaria.com/products/harlequin-rasbora', tier: 2, facts: ['10 gal', 'schools of 8–10', 'males copper-orange, females more golden', 'easy'] },
  ],
  confidenceNotes: [
    'Some fish sold as harlequins may be Trigonostigma truncata (split off in 2020), whose wedge stops short of the tail.',
    'Lifespan (5–8 years) comes from an uncited Wikipedia figure.',
    'Golden strain inheritance is unpublished; modelled as recessive.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
};
