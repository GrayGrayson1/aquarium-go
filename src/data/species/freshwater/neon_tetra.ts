import type { SpeciesDefinition } from '@/types';
import { ladderRules } from './_genetics';

/**
 * Neon tetra — Paracheirodon innesi. Lane species-fw. Sources: docs/research/freshwater.md.
 * Visual mapping (lateral_stripe): accentColor = iridescent blue stripe, bodyColor2 = red rear-lower body, bodyColor = back.
 */
export const neonTetra: SpeciesDefinition = {
  id: 'neon_tetra',
  commonName: 'Neon Tetra',
  scientificName: 'Paracheirodon innesi',
  category: 'fish',
  group: 'tetra',
  genus: 'Paracheirodon',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Western and northern Amazon basin — blackwater and clearwater streams of south-eastern Colombia, eastern Peru and western Brazil',
  isStarter: false,

  adultSizeCm: 3.5,
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: true,
  bioload: 0.5,

  tempC: { min: 20, max: 28, idealMin: 22, idealMax: 25 },
  pH: { min: 5.0, max: 7.5, idealMin: 6.0, idealMax: 7.0 },
  salinitySG: null,
  gh: { min: 1, max: 12 },
  kh: { min: 1, max: 8 },

  flowPreference: 'low',
  lightPreference: 'dim',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'brine_shrimp', 'daphnia', 'baby_brine'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.6,
  feedingAggression: 0.3,
  hungerHours: 14,

  activityZone: ['middle', 'lower'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0.02,
  finNipper: 0.05,
  hasLongFins: false,
  // lane:fix-water S16-06 — eight is what its 10-gallon recommended tank holds at a sensible load (0.5 bioload each);
  // a dozen there is overstocked, so the old ideal of 12 had the card and the stocking model disagree.
  social: { kind: 'school', minGroup: 6, idealGroup: 8, note: 'Needs a school — at least six, and eight or more for confident, natural behaviour (a dozen suits a 20-gallon tank).' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_tiny'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.7,
  substrateRules: { preferred: ['planted_soil', 'sand', 'fine_sand', 'fine_gravel'], avoid: [], note: 'Dark substrate, dense planting and shaded areas show off the colours and calm the school.' },

  breeding: {
    system: 'egg_scatter_cover',
    difficulty: 0.75,
    maturityDays: 10,
    clutchSize: { min: 60, max: 130 },
    incubationHours: 10,
    fryRearingHours: 40,
    cooldownDays: 7,
    conditions: { needsPartner: true, needsCover: true, minTempC: 24, needsConditioningFood: ['bloodworm', 'brine_shrimp', 'daphnia'], minTankGallons: 5 },
    predationWithoutNursery: 0.9,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'Spawns in very soft, acidic water (pH ~5.5–6.5, GH < 4) with dim light, scattering light-sensitive eggs over fine plants. Adults eat the eggs, so spawning happens in a separate dark tank. Eggs hatch in about 24–36 hours; fry swim freely 3–4 days later and need infusoria, then microworms or baby brine shrimp. Difficult in home aquaria — most neons are farm-raised.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 200, sexVisibleAtDays: 9, hatchSizeCm: 0.3 },

  hardiness: 0.55,
  difficulty: 'beginner',
  baseValue: 3,
  rarity: 'common',
  visitorAppeal: 0.7,
  unlock: { requires: ['fw_basic'], hint: 'Unlocks with beginner freshwater fish & invertebrates.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Least Concern (IUCN 2021)',
    note: 'Millions are farmed every month, mostly in South-East Asia, so trade pressure on wild fish is low. Never release aquarium fish.',
  },

  genetics: {
    loci: [
      {
        id: 'form',
        name: 'Colour form',
        mode: 'mendelian',
        alleles: [
          { id: 'N', name: 'Normal', dominance: 3, frequency: 0.9 },
          { id: 'dh', name: 'Diamond head', dominance: 2, frequency: 0.04 },
          { id: 'g', name: 'Gold', dominance: 1, frequency: 0.04 },
          { id: 'a', name: 'Albino', dominance: 1, frequency: 0.03 },
        ],
        note: 'Inheritance of the domestic neon forms is not formally documented; modelled as recessive so they stay rare and must be line-bred.',
      },
      {
        id: 'fins',
        name: 'Fin length',
        mode: 'mendelian',
        alleles: [
          { id: 's', name: 'Standard fins', dominance: 1, frequency: 0.95 },
          { id: 'L', name: 'Long fins', dominance: 2, frequency: 0.03 },
        ],
        note: 'Long-fin mutations in other small fish (e.g. zebrafish) are dominant; treated the same way here.',
      },
    ],
    phenotypes: [
      ...ladderRules('form', 'base', [
        { allele: 'a', id: 'albino', name: 'Albino', rarity: 0.4, recessive: true, visual: { bodyColor: '#f3e3de', bodyColor2: '#e98a8a', bellyColor: '#f8eeea', accentColor: '#cfe6ee', eyeColor: '#c83a4e', iridescence: 0.25, patternContrast: 0.35 } },
        { allele: 'g', id: 'gold', name: 'Gold', rarity: 0.35, recessive: true, visual: { bodyColor: '#e9d8a6', bodyColor2: '#d8434a', bellyColor: '#f4ecd6', accentColor: '#bfe0e6', iridescence: 0.35, metallic: 0.3, patternContrast: 0.45 } },
        { allele: 'dh', id: 'diamond_head', name: 'Diamond Head', rarity: 0.3, recessive: true, visual: { bodyColor: '#d8e4ec', metallic: 0.5 } },
      ]),
      { id: 'standard', name: 'Neon', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'long_fin', name: 'Long-fin', layer: 'overlay', rarity: 0.25, when: [{ locus: 'fins', allele: 'L', count: 'any' }], visual: { finType: 'tetra_longfin', finLength: 1.45 } },
    ],
    baseVisual: {
      bodyColor: '#7b7d62',
      bodyColor2: '#d8232a',
      bellyColor: '#e8ecef',
      finColor: '#e6ecef',
      finColor2: '#f2f5f7',
      accentColor: '#1fb8e8',
      eyeColor: '#12161a',
      pattern: 'lateral_stripe',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.9,
      metallic: 0.2,
      translucency: 0.45,
      finType: 'tetra',
      finLength: 1,
      bodyDepth: 0.95,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Standard neon: electric blue-turquoise stripe from eye to adipose fin over an olive back, red on the rear half of the lower body only (cardinals are red along the full length), silvery belly, clear fins. Domestic forms: diamond head (metallic silvery head/back), gold (pale cream-gold, ghostly stripe, red kept), albino (pink-white, red eyes) and long-fin. The stripe fades to dull grey at night and brightens at dawn.',
  },
  visualMorphs: ['Neon', 'Diamond Head', 'Gold', 'Albino', 'Long-fin'],

  behaviorSet: 'schooling_small',
  behaviorTraits: { cruiseSpeed: 1.5, burstSpeed: 10, turnRate: 4, hoverTendency: 0.2, schoolingTightness: 0.8, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.35, nocturnal: 0 },
  specialBehaviors: ['tight_school', 'night_colour_fade', 'midwater_hover', 'dart_feed', 'flash_turn'],

  encyclopedia: {
    summary: 'The classic glowing schooling fish: a tiny tetra whose electric blue stripe shines above a slash of red.',
    nativeHabitat: 'Shaded, soft blackwater and clearwater streams of the western Amazon, under forest canopy.',
    socialStructure: 'A true schooling fish. Alone or in pairs it hides and fades; a big school glides and turns together.',
    tankNeeds: 'A planted tank of 10 gallons or more with dim areas, stable soft-to-moderate water around 22–25 °C, and a school of at least six. Sensitive to unstable, freshly set-up tanks.',
    compatibilityNotes: 'Perfect with other small peaceful fish, shrimp and snails. Anything with a big enough mouth — angelfish, goldfish, axolotls — will eat neons. Prefers cooler water than discus.',
    breedingOverview: 'Scatters eggs over fine plants in very soft, acidic, dark water. Adults eat the eggs, and breeding at home is a challenge.',
    conservationNote: 'Least Concern; nearly all are farm-raised. Never release aquarium fish.',
    funFact: 'Its stripe works like a light switch: guanine crystals re-angle to fade the colour at night and turn it back on at dawn.',
    inGameBehavior: 'Schools tightly in mid-water, flashes in unison when startled, darts for food, and dims its stripe after lights-out.',
  },
  sourceReferences: [
    { id: 'seriouslyfish-paracheirodon-innesi', title: 'Seriously Fish — Paracheirodon innesi', url: 'https://www.seriouslyfish.com/species/paracheirodon-innesi/', tier: 2, facts: ['max 30 mm SL', '21–25 °C, pH 4.0–7.5, GH 1–12', 'breeding 26.5–29 °C, pH 5.5–6.5, GH 1–5', 'school of 8–10+', 'eggs hatch 24–36 h; fry free-swimming 3–4 days later', 'diamond head, gold, albino and long-fin forms', 'females rounder'] },
    { id: 'fishbase-paracheirodon-innesi', title: 'FishBase — Paracheirodon innesi', url: 'https://www.fishbase.se/summary/Paracheirodon-innesi.html', tier: 1, facts: ['2.5 cm SL', '20–26 °C, pH 5.0–7.0', 'blackwater/clearwater Solimões tributaries', 'omnivore', 'IUCN Least Concern (2021)'] },
    { id: 'liveaquaria-neon-tetra', title: 'LiveAquaria — Neon Tetra', url: 'https://www.liveaquaria.com/products/neon-tetra', tier: 2, facts: ['68–78 °F, pH 5.5–7.0, KH 4–8', '10 gal minimum', 'dense planting with low light', 'groups of 6+'] },
    { id: 'petmd-tetra-care-sheet', title: 'PetMD — Tetra Care Sheet (Maria Zayas, DVM)', url: 'https://www.petmd.com/fish/tetra-fish-care-sheet', tier: 2, facts: ['10+ gal', 'groups of at least 5–6', 'lifespan 2–4 y, some to 10'] },
    { id: 'aquarium-coop-neon-vs-cardinal', title: 'Aquarium Co-Op — Neon tetras vs cardinal tetras', url: 'https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras', tier: 2, facts: ['neons prefer cooler water than cardinals', 'red only on the rear half vs full length in cardinals', 'mostly captive-raised; $1–2'] },
    { id: 'adw-paracheirodon-axelrodi', title: 'Animal Diversity Web — Paracheirodon axelrodi (genus predators)', url: 'https://animaldiversity.org/accounts/Paracheirodon_axelrodi/', tier: 1, facts: ['Paracheirodon tetras are preyed on by angelfish', 'adults eat eggs'] },
    { id: 'wikipedia-neon-tetra', title: 'Wikipedia — Neon tetra', url: 'https://en.wikipedia.org/wiki/Neon_tetra', tier: 3, facts: ['stripe fades at night (guanine crystals)', 'maturity ~12 weeks', 'named after William T. Innes (1936)', '~2 million sold monthly in the US'] },
  ],
  confidenceNotes: [
    'Size: 2.5–3 cm SL vs ~4 cm TL; the game uses 3.5 cm total length.',
    'Clutch size lacks a solid Tier 1 figure (FishBase: "relatively few"); 60–130 is a hobby estimate.',
    'Lifespan: 2–3 years is typical for farmed fish, with reports up to 10; 200 game-days ≈ 5 years.',
    'Genetics of diamond head, gold and albino forms are undocumented; modelled as recessives.',
    'Compressed time: ~1–1.5 day hatch ≈ 10 game-hours; maturity (~3–5 months) = 10 game-days.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
  positiveInteractions: [
    { other: 'panda_corydoras', text: 'A classic pairing: neons school in mid-water while corydoras work the sand below, using different parts of the tank.' },
  ],
};
