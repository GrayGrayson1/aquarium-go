import type { SpeciesDefinition } from '@/types';
import { ladderRules } from './_genetics';

/**
 * Platy (southern platyfish) — Xiphophorus maculatus. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#platy
 *
 * Real platy colour genes are many and often sex-linked (Kallman; the Xiphophorus Genetic Stock Center); the game keeps
 * them autosomal, as it does for the guppy. The tail spots are Gordon's and Kallman's allelic series (moon, comet,
 * crescent, twin; one fish shows the highest-ranked of its two, except moon with twin, the trade's "Mickey Mouse"),
 * wagtail is comet plus the modifier E (Gordon 1946), tuxedo is the nigra gene, and gold is the recessive st.
 */
export const platy: SpeciesDefinition = {
  id: 'platy',
  commonName: 'Platy',
  scientificName: 'Xiphophorus maculatus',
  category: 'fish',
  group: 'livebearer',
  genus: 'Xiphophorus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'The Atlantic slope of Mexico, Guatemala and Belize, from Veracruz to northern Belize — warm springs, canals and ditches with weedy banks',
  isStarter: false,

  // FishBase: males 4 cm TL, females 6 cm TL; aquarium fish 5–7 cm (Aquarium Co-Op).
  adultSizeCm: 5,
  // Seriously Fish 60×30 cm (~15 gal); Aquarium Co-Op 10–20 gal.
  recommendedMinTankGallons: 15,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 0.7,

  // FishBase 18–25 °C, Seriously Fish 20–26 °C, Aquarium Co-Op 21–28 °C; pH 7.0–8.2; hard water (10–30 dGH). No sourced KH.
  tempC: { min: 18, max: 28, idealMin: 22, idealMax: 26 },
  pH: { min: 6.8, max: 8.5, idealMin: 7.2, idealMax: 8.2 },
  salinitySG: null,
  gh: { min: 9, max: 30 },
  kh: { min: 4, max: 20 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'brine_shrimp', 'daphnia', 'vegetable', 'biofilm'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.6,
  feedingAggression: 0.4,
  hungerHours: 14,

  activityZone: ['middle', 'lower', 'upper'],
  temperament: 'peaceful',
  territoriality: 0.05,
  aggression: 0.05,
  finNipper: 0.03,
  hasLongFins: false,
  social: { kind: 'group', minGroup: 3, idealGroup: 6, note: 'Keep at least three, with two or more females to each male so no female is chased all day.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males tolerate each other and court the females almost nonstop.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_small'],
  maxLikelyPreySizeCm: 0.7,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.5,
  substrateRules: { preferred: ['sand', 'fine_gravel', 'gravel', 'planted_soil', 'fine_sand'], avoid: [], note: 'Plants and floating cover give the fry somewhere to hide; it grazes soft algae off the leaves.' },

  breeding: {
    system: 'livebearer',
    difficulty: 0.1,
    maturityDays: 10,
    clutchSize: { min: 20, max: 80 },
    incubationHours: 224,
    fryRearingHours: 48,
    cooldownDays: 2,
    conditions: { needsPartner: true, needsCover: true, minTempC: 22, minTankGallons: 10 },
    predationWithoutNursery: 0.6,
    nurseryRequired: false,
    maxRaisedPerClutch: 10,
    notes: 'Internal fertilisation through the male’s gonopodium. Females store sperm for months and drop a brood of 20–80 fry about every four weeks; the fry are born free-swimming and take fine flake or baby brine shrimp at once. Adults eat fry, so dense plants or a breeding box save them. Platies cross freely with swordtails — most trade platies have swordtail genes — but the game keeps the two species apart.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // Up to 3–4 years (Aquarium Co-Op) → ~140 game-days. Mature at 3–4 months (FishBase).
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 140, sexVisibleAtDays: 8, hatchSizeCm: 0.7 },

  hardiness: 0.9,
  difficulty: 'beginner',
  baseValue: 3,
  rarity: 'common',
  visitorAppeal: 0.6,
  unlock: { requires: [], hint: 'Available from the start.' },
  captiveBredAvailable: true,
  conservation: { status: 'Data Deficient (IUCN Red List, assessed 2018)', note: 'Its wild status is unknown; aquarium platies are farm-bred hybrids. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'color',
        name: 'Body colour',
        mode: 'mendelian',
        alleles: [
          { id: 'R', name: 'Red', dominance: 4, frequency: 0.35 },
          { id: 'B', name: 'Blue', dominance: 3, frequency: 0.1 },
          { id: 'W', name: 'Wild grey', dominance: 2, frequency: 0.25 },
          { id: 'st', name: 'Gold', dominance: 1, frequency: 0.3 },
        ],
        note: 'Gold is the real autosomal recessive st (Gordon 1946). Red is several sex-linked genes in wild stocks and its make-up in trade fish is “virtually unknown”; blue is autosomal with disputed dominance. Simplified to one ladder.',
      },
      {
        id: 'tailspot',
        name: 'Tail spot',
        mode: 'mendelian',
        alleles: [
          { id: 'M', name: 'Moon', dominance: 5, frequency: 0.15 },
          { id: 'Co', name: 'Comet', dominance: 4, frequency: 0.2 },
          { id: 'C', name: 'Crescent', dominance: 3, frequency: 0.1 },
          { id: 'T', name: 'Twin spot', dominance: 2, frequency: 0.1 },
          { id: 'W', name: 'No tail spot', dominance: 1, frequency: 0.45 },
        ],
        note: 'One gene with many dominant alleles, so a fish carries at most two patterns (Kallman & Atz 1967). The game draws the highest-ranked one; moon with twin is the “Mickey Mouse” (a hobby reading — a breeder calls it “moon complete”).',
      },
      {
        id: 'spread',
        name: 'Black spread (E)',
        mode: 'mendelian',
        alleles: [
          { id: 'E', name: 'Spread', dominance: 2, frequency: 0.35 },
          { id: 'W', name: 'No spread', dominance: 1, frequency: 0.65 },
        ],
        note: 'Gordon’s modifier E: invisible on its own, but with the comet tail spot it spreads black through every fin — the wagtail.',
      },
      {
        id: 'nigra',
        name: 'Nigra (tuxedo)',
        mode: 'mendelian',
        alleles: [
          { id: 'N', name: 'Nigra', dominance: 2, frequency: 0.15 },
          { id: 'W', name: 'No nigra', dominance: 1, frequency: 0.85 },
        ],
        note: 'Dominant (sex-linked in wild stocks): a black band over the rear flank on red and gold fish — the tuxedo (hobby source). On wild grey it darkens most of the body; the game draws the tuxedo band on every colour.',
      },
      {
        id: 'hifin',
        name: 'Hi-fin',
        mode: 'mendelian',
        alleles: [
          { id: 'H', name: 'Hi-fin', dominance: 2, frequency: 0.12 },
          { id: 'W', name: 'Normal dorsal', dominance: 1, frequency: 0.88 },
        ],
        note: 'Dominant, from the “Simpson” swordtail in the early 1960s; two copies are reportedly lethal, which the game does not model.',
      },
      {
        id: 'speckle',
        name: 'Salt and pepper',
        mode: 'mendelian',
        alleles: [
          { id: 'Sp', name: 'Speckled', dominance: 2, frequency: 0.08 },
          { id: 'W', name: 'Plain', dominance: 1, frequency: 0.92 },
        ],
        note: 'Fine black speckling of the spot-sided (Sp) type, dominant (hobby source).',
      },
    ],
    phenotypes: [
      ...ladderRules('color', 'base', [
        { allele: 'R', id: 'red', name: 'Red', rarity: 0, visual: { bodyColor: '#d3271c', bodyColor2: '#b01e14', bellyColor: '#e8604a', finColor: '#d8402a', finColor2: '#e8603a' } },
        { allele: 'B', id: 'blue', name: 'Blue', rarity: 0.2, visual: { bodyColor: '#7f93a6', bodyColor2: '#5c7590', bellyColor: '#c8d2dc', finColor: '#8aa0b4', finColor2: '#5c8fc9', iridescence: 0.6, metallic: 0.3 } },
        { allele: 'W', id: 'wild', name: 'Wild Grey', rarity: 0.1, visual: {} },
        { allele: 'st', id: 'gold', name: 'Gold', rarity: 0.1, recessive: true, visual: { bodyColor: '#f2c45a', bodyColor2: '#e0a83a', bellyColor: '#f8e2a8', finColor: '#f0c860', finColor2: '#f8d880' } },
      ]),
      { id: 'fallback', name: 'Wild Grey', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'mickey', name: 'Mickey Mouse', layer: 'overlay', rarity: 0.2, when: [{ locus: 'tailspot', allele: 'M', count: 'het' }, { locus: 'tailspot', allele: 'T', count: 'het' }], visual: { tailSpot: 'mickey' } },
      { id: 'moon', name: 'Moon', layer: 'overlay', rarity: 0.05, when: [{ locus: 'tailspot', allele: 'M', count: 'any' }, { locus: 'tailspot', allele: 'T', count: 'none' }], visual: { tailSpot: 'moon' } },
      { id: 'wagtail', name: 'Wagtail', layer: 'overlay', rarity: 0.15, when: [{ locus: 'tailspot', allele: 'Co', count: 'any' }, { locus: 'tailspot', allele: 'M', count: 'none' }, { locus: 'spread', allele: 'E', count: 'any' }], visual: { tailSpot: 'comet', finColor: '#111111', finColor2: '#1a1a1a' }, note: 'Comet with E: black fins, often a black lip.' },
      { id: 'comet', name: 'Comet', layer: 'overlay', rarity: 0.05, when: [{ locus: 'tailspot', allele: 'Co', count: 'any' }, { locus: 'tailspot', allele: 'M', count: 'none' }, { locus: 'spread', allele: 'E', count: 'none' }], visual: { tailSpot: 'comet' } },
      { id: 'crescent', name: 'Crescent', layer: 'overlay', rarity: 0.05, when: [{ locus: 'tailspot', allele: 'C', count: 'any' }, { locus: 'tailspot', allele: 'M', count: 'none' }, { locus: 'tailspot', allele: 'Co', count: 'none' }], visual: { tailSpot: 'crescent' } },
      { id: 'twin', name: 'Twin-spot', layer: 'overlay', rarity: 0.05, when: [{ locus: 'tailspot', allele: 'T', count: 'any' }, { locus: 'tailspot', allele: 'M', count: 'none' }, { locus: 'tailspot', allele: 'Co', count: 'none' }, { locus: 'tailspot', allele: 'C', count: 'none' }], visual: { tailSpot: 'twin' } },
      { id: 'tuxedo', name: 'Tuxedo', layer: 'overlay', rarity: 0.15, when: [{ locus: 'nigra', allele: 'N', count: 'any' }], visual: { bodyMark: 'tuxedo' } },
      { id: 'salt_pepper', name: 'Salt-and-pepper', layer: 'overlay', rarity: 0.2, when: [{ locus: 'speckle', allele: 'Sp', count: 'any' }], visual: { pattern: 'speckled', accentColor: '#1a1a1a', patternContrast: 0.7 } },
      { id: 'hifin', name: 'Hi-fin', layer: 'overlay', rarity: 0.15, when: [{ locus: 'hifin', allele: 'H', count: 'any' }], visual: { finType: 'hifin' } },
    ],
    baseVisual: {
      bodyColor: '#8a8f7a',
      bodyColor2: '#6e735e',
      bellyColor: '#d9d6c4',
      finColor: '#a8a890',
      finColor2: '#c8c0a0',
      accentColor: '#1a1a1a',
      eyeColor: '#2a2418',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.2,
      metallic: 0.1,
      translucency: 0.3,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the platy art: body/body2 = the flank and back; belly = the belly; fin = the fins, fin2 = their edges (black on wagtails); accent = the speckles of salt-and-pepper fish. tailSpot = the tail-base marking (mickey, moon, crescent, comet, twin); bodyMark tuxedo = the black rear flank; finType hifin = the tall flag of a dorsal. The art draws males smaller with a gonopodium and females rounder with a gravid spot.',
  },
  visualMorphs: ['Red', 'Gold', 'Blue', 'Wild Grey', 'Mickey Mouse', 'Moon', 'Comet', 'Wagtail', 'Tuxedo', 'Hi-fin'],

  behaviorSet: 'livebearer',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 7, turnRate: 3.2, hoverTendency: 0.25, schoolingTightness: 0.2, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.08, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['courtship_chase', 'surface_pick', 'give_birth', 'fry_hide', 'algae_pick'],

  encyclopedia: {
    summary: 'A cheerful, hardy little livebearer in every colour from red and gold to blue, many with a black mark on the tail.',
    nativeHabitat: 'Warm springs, canals and weedy ditches of eastern Mexico, Guatemala and Belize, over silt.',
    socialStructure: 'Lives in loose groups; males court the females constantly.',
    tankNeeds: 'A planted tank of 15 gallons or more with hard, slightly alkaline water around 22–26 °C.',
    compatibilityNotes: 'Very peaceful: good with almost any small community fish, snails and adult shrimp. Adults eat fry and shrimplets.',
    breedingOverview: 'Gives birth to 20–80 free-swimming fry about once a month; females store sperm, so one can keep dropping broods without a male.',
    conservationNote: 'Data Deficient in the wild (IUCN 2018). Aquarium platies are farm-bred hybrids.',
    funFact: 'Platy × swordtail hybrids that inherit the platy’s spotted pattern can grow melanoma — which made the platy one of the first animal models for cancer.',
    inGameBehavior: 'Potters about the middle of the tank picking at plants, with males chasing the females and flicking their fins.',
    feedingNote: 'An easy omnivore: flake or small pellets once or twice a day with some vegetable food; it picks soft algae off the leaves too. An autofeeder with flake suits it.',
    keeperTip: 'Keep at least two females per male, and add floating plants if you want some fry to make it.',
  },
  sourceReferences: [
    { id: 'fishbase-xiphophorus-maculatus', title: 'FishBase — Xiphophorus maculatus (Southern platyfish)', url: 'https://www.fishbase.se/summary/Xiphophorus-maculatus.html', tier: 1, facts: ['males 4 cm, females 6 cm TL', '18–25 °C, pH 7.0–8.0', 'gestation 24–30 days, 20–80 young', 'mature 3–4 months', 'IUCN Data Deficient (2018)'] },
    { id: 'seriouslyfish-xiphophorus-maculatus', title: 'Seriously Fish — Xiphophorus maculatus', url: 'https://www.seriouslyfish.com/species/xiphophorus-maculatus/', tier: 2, facts: ['60×30 cm', '20–26 °C, hard water', 'very peaceful', 'hybrid ancestry'] },
    { id: 'aquariumcoop-platy', title: 'Aquarium Co-Op — Care guide for platy fish', url: 'https://www.aquariumcoop.com/blogs/aquarium/platy-care-guide', tier: 2, facts: ['10–20 gal', '2 females per male', '3–4 years', '$2–4'] },
    { id: 'kallman-atz-1967-tailspots', title: 'Kallman & Atz (1967) The tail-spot patterns of the platyfish. Zoologica 51:107–135', url: 'https://archive.org/stream/biostor-194013/biostor-194013_djvu.txt', tier: 1, facts: ['one allelic series of dominant tail-spot alleles', 'at most two patterns per fish'] },
    { id: 'gordon-1946-comet', title: 'Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88', url: 'https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt', tier: 1, facts: ['wagtail = comet + E', 'golden st recessive'] },
    { id: 'xgsc-stocks', title: 'Xiphophorus Genetic Stock Center (Texas State University) — stock list', url: 'https://imls.txst.edu/stocks.html', tier: 1, facts: ['sex-linked pigment genes', 'W, X and Y sex chromosomes'] },
    { id: 'wiedermann-platy-genetics', title: 'Wiedermann — Practical Platy Genetics (hobby guide)', url: 'https://ephieslivebearers.weebly.com/uploads/5/7/7/9/57793349/practical_platy_genetics_1.0.pdf', tier: 3, facts: ['tuxedo = nigra on gold', 'hi-fin dominant', 'Mickey Mouse = moon + twin'] },
  ],
  confidenceNotes: [
    'Many platy colour genes are sex-linked in wild stocks; the game treats them as ordinary genes, as it does for the guppy.',
    'The genetics of trade red, tuxedo, salt-and-pepper, hi-fin and Mickey Mouse come from a hobby guide; Mickey Mouse is “moon complete” to one breeder and moon plus twin to the guide (the game uses the guide).',
    'Platies and swordtails hybridise freely; the game does not cross species.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
};
