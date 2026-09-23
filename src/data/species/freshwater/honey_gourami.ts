import type { SpeciesDefinition } from '@/types';
import { ladderRules } from './_genetics';

/**
 * Honey gourami — Trichogaster chuna. Lane species-fw. Sources: docs/research/freshwater.md.
 * Phenotypes describe the MALE. Females: silvery grey-brown (#b8a58a) with a brown mid-lateral stripe (#7a5c3a).
 * Breeding males darken the throat, face and belly to blue-black (accentColor) — a behaviour-driven colour change.
 */
export const honeyGourami: SpeciesDefinition = {
  id: 'honey_gourami',
  commonName: 'Honey Gourami',
  scientificName: 'Trichogaster chuna',
  category: 'fish',
  group: 'labyrinth_fish',
  genus: 'Trichogaster',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Ganges and Brahmaputra lowlands — north-eastern India, Bangladesh and Nepal',
  isStarter: false,

  adultSizeCm: 5,
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.6,

  tempC: { min: 22, max: 29, idealMin: 24, idealMax: 27 },
  pH: { min: 6.0, max: 8.0, idealMin: 6.5, idealMax: 7.5 },
  salinitySG: null,
  gh: { min: 2, max: 15 },
  kh: { min: 2, max: 10 },

  flowPreference: 'very_low',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'brine_shrimp', 'daphnia', 'baby_brine'],
  feedingStyle: 'surface',
  feedingSpeed: 0.35,
  feedingAggression: 0.2,
  hungerHours: 16,

  activityZone: ['surface', 'upper', 'middle'],
  temperament: 'peaceful',
  territoriality: 0.3,
  aggression: 0.08,
  finNipper: 0.03,
  hasLongFins: false,
  social: { kind: 'group', minGroup: 1, idealGroup: 4, note: 'Fine alone or as a pair; a group of four to six shows more natural behaviour and a gentle pecking order.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males squabble over nest sites in cramped tanks; plants and floating cover defuse it.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_small', 'fish_slow'],
  maxLikelyPreySizeCm: 0.6,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.75,
  substrateRules: { preferred: ['planted_soil', 'sand', 'fine_gravel', 'fine_sand'], avoid: [], note: 'Heavy planting and floating plants recreate its sluggish, weedy home and give nest sites.' },

  breeding: {
    system: 'bubble_nest',
    difficulty: 0.35,
    maturityDays: 10,
    clutchSize: { min: 100, max: 300 },
    incubationHours: 10,
    fryRearingHours: 100,
    cooldownDays: 8,
    conditions: { needsPartner: true, needsSurfaceCalm: true, needsCover: true, minTempC: 25, needsConditioningFood: ['bloodworm', 'brine_shrimp', 'daphnia'], minTankGallons: 10 },
    predationWithoutNursery: 0.7,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'The male colours up (honey-orange body, blue-black throat) and builds a bubble nest under a broad leaf or in a calm corner. After spawning he places the eggs in the nest and guards them; the female should then be removed. Eggs hatch in 24–36 hours, fry hang from the nest for a day or two, then need infusoria and later baby brine shrimp.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  lifecycle: { juvenileDays: 10, adultDays: 14, lifespanDays: 170, sexVisibleAtDays: 8, hatchSizeCm: 0.2 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 6,
  rarity: 'common',
  visitorAppeal: 0.6,
  unlock: { requires: ['fw_basic'], hint: 'Unlocks with beginner freshwater fish & invertebrates.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Least Concern (IUCN 2009)',
    note: 'Common in the wild; trade fish are mostly farm-bred colour forms. Never release aquarium fish.',
  },

  genetics: {
    loci: [
      {
        id: 'color',
        name: 'Colour form',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Wild honey-silver', dominance: 3, frequency: 0.06 },
          { id: 'G', name: 'Gold', dominance: 2, frequency: 0.64 },
          { id: 'R', name: 'Red / sunset', dominance: 1, frequency: 0.3 },
        ],
        note: 'Gold and red ("sunset") are captive-bred xanthic forms; their inheritance is undocumented and simplified to a ladder that keeps market stock mostly gold.',
      },
    ],
    phenotypes: [
      ...ladderRules('color', 'base', [
        { allele: 'W', id: 'wild', name: 'Wild Honey', rarity: 0.2, visual: { bodyColor: '#d98e3a', bodyColor2: '#b8a58a', bellyColor: '#e8d8b8', finColor: '#dcae6a', finColor2: '#f2d27a' } },
        { allele: 'G', id: 'gold', name: 'Gold Honey', rarity: 0, visual: {} },
        { allele: 'R', id: 'red', name: 'Red Honey (Sunset)', rarity: 0.2, visual: { bodyColor: '#e8561f', bodyColor2: '#c94014', bellyColor: '#f08a5a', finColor: '#e8602a', finColor2: '#f5a05a' } },
      ]),
      { id: 'fallback', name: 'Gold Honey', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#f2b632',
      bodyColor2: '#e09a20',
      bellyColor: '#f7d98a',
      finColor: '#f4c24a',
      finColor2: '#fbe08a',
      accentColor: '#1b2238',
      eyeColor: '#2a1c12',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.4,
      patternSeed: 0,
      iridescence: 0.25,
      metallic: 0.1,
      translucency: 0.3,
      finType: 'gourami',
      finLength: 1,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Male colours shown. Wild males are dull orange-honey with yellow fin edges; gold is warm yellow-gold all over; red/sunset is saturated red-orange. In breeding colour the male’s throat, face and lower front body turn blue-black (accentColor). Females are silvery grey-brown with a brown stripe. Long thread-like pelvic fins ("feelers") are part of the gourami body plan.',
  },
  visualMorphs: ['Gold Honey', 'Red Honey (Sunset)', 'Wild Honey'],

  behaviorSet: 'gourami',
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 5, turnRate: 2.5, hoverTendency: 0.6, schoolingTightness: 0.1, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['surface_breathe', 'feeler_touch', 'bubble_nest', 'breeding_colour', 'hover', 'water_spit'],

  encyclopedia: {
    summary: 'A small, gentle gourami that glows honey-gold, explores with thread-like feelers and builds bubble nests.',
    nativeHabitat: 'Sluggish, heavily vegetated ponds, ditches and flooded fields of the Ganges and Brahmaputra plains.',
    socialStructure: 'Peaceful and a little shy. Fine alone or in small groups; males get territorial when nesting.',
    tankNeeds: 'Warm (about 24–27 °C), very gentle flow, floating plants, a calm surface to breathe from, and cover to feel secure.',
    compatibilityNotes: 'Great with small peaceful fish, corydoras and snails. Avoid fin-nippers and pushy fast feeders. Keeping one with a male betta is risky — both are labyrinth fish that claim the surface. Eats shrimplets.',
    breedingOverview: 'The male builds a bubble nest, turns honey-and-black, and guards the eggs and fry alone.',
    conservationNote: 'Least Concern. Never release aquarium fish.',
    funFact: 'In the wild it is said to spit droplets of water to knock insects off overhanging leaves — like a tiny archerfish.',
    inGameBehavior: 'Hovers near the surface touching things with its feelers, gulps air, and builds a bubble nest in a calm corner when content.',
  },
  sourceReferences: [
    { id: 'seriouslyfish-trichogaster-chuna', title: 'Seriously Fish — Trichogaster chuna', url: 'https://www.seriouslyfish.com/species/trichogaster-chuna/', tier: 2, facts: ['55 mm SL', '22–27 °C, pH 6.0–7.5, GH 2–15', 'India, Bangladesh, Nepal', 'groups of 4–6', 'avoid fin-nippers and boisterous feeders', 'bubble nest; eggs hatch 24–36 h', 'male/female colours', 'water-spitting'] },
    { id: 'fishbase-trichogaster-chuna', title: 'FishBase — Trichogaster chuna', url: 'https://www.fishbase.se/summary/Trichogaster-chuna.html', tier: 1, facts: ['22–28 °C, pH 6.0–8.0, dH 5–19', 'IUCN Least Concern (2009)'] },
    { id: 'aquarium-coop-honey-gourami', title: 'Aquarium Co-Op — Honey gourami care guide', url: 'https://www.aquariumcoop.com/blogs/aquarium/honey-gourami', tier: 2, facts: ['74–82 °F', '5–10 gal for one, 20 gal for three', 'labyrinth organ', 'bettas only if non-aggressive', 'eats baby shrimp', 'gold and red forms', '$5–10'] },
    { id: 'liveaquaria-honey-gourami', title: 'LiveAquaria — Honey Dwarf Gourami', url: 'https://www.liveaquaria.com/product/992/?pcatid=992', tier: 2, facts: ['72–78 °F, pH 6.0–8.0, KH 4–10', '10 gal', 'needs surface access', 'territorial when spawning'] },
    { id: 'ufifas-fa054', title: 'UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida', url: 'https://ask.ifas.ufl.edu/publication/FA054', tier: 1, facts: ['labyrinth fish breathe air', 'bubble-nest builders; male guards eggs'] },
    { id: 'aqulator-honey-betta', title: 'Aqulator — Can honey gouramis live with bettas?', url: 'https://www.aqulator.com/articles/can-honey-gourami-live-with-bettas/', tier: 3, facts: ['male betta and honey gourami may fight over the surface/nest sites'] },
  ],
  confidenceNotes: [
    'FishBase’s 13.7 cm TL maximum is almost certainly an error; other sources agree on ~5.5 cm.',
    'Upper temperature: LiveAquaria 25.5 °C vs others 28 °C; the game tolerates up to 29 °C with 24–27 °C ideal.',
    'Lifespan is poorly sourced (hobby: 2–5+ years); 170 game-days ≈ 4 years.',
    'Colour-form genetics are undocumented; the ladder is a playable simplification.',
  ],
  exceptionRules: [
    { other: 'betta', verdictFloor: 'conditional', reason: 'Two labyrinth fish that both claim the surface: a male betta and a honey gourami may fight over nest sites.', incidentRisk: 0.1, mitigatedBy: ['tank_size', 'sight_breaks', 'cover'] },
  ],
  special: { airBreather: true },
  visualLane: 'fish',
};
