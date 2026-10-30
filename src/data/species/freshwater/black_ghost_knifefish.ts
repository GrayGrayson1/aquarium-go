import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Black ghost knifefish — Apteronotus albifrons. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#black-ghost-knifefish
 * No hobby colour genetics; the white form is a real colour sport whose inheritance is undocumented (the owner,
 * ADR-0053 round 2: a rare form with a note).
 */
export const blackGhostKnifefish: SpeciesDefinition = {
  id: 'black_ghost_knifefish',
  commonName: 'Black Ghost Knifefish',
  scientificName: 'Apteronotus albifrons',
  category: 'fish',
  group: 'knifefish',
  genus: 'Apteronotus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Northern and central South America: the Amazon and Orinoco basins and the coastal rivers of north-eastern Brazil, in fast sandy creeks and deep river channels',
  isStarter: false,

  // FishBase / Seriously Fish 50 cm TL; LiveAquaria 18 in; PFK 50–60 cm.
  adultSizeCm: 45,
  // Seriously Fish 180×60 cm for an adult, LiveAquaria 150 gal, PFK a 3 m tank for a full adult: the design keeps 240
  // (96 in long), room to turn a stiff body (TFH).
  recommendedMinTankGallons: 240,
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: false,
  bioload: 5,

  // FishBase / Seriously Fish / PFK 23–28 °C; LiveAquaria 23–27.
  tempC: { min: 23, max: 28, idealMin: 24, idealMax: 27 },
  pH: { min: 6, max: 8, idealMin: 6, idealMax: 7 },
  salinitySG: null,
  // Seriously Fish 5–10 dGH; PFK up to 15
  gh: { min: 5, max: 15 },
  kh: { min: 0, max: 10 },

  flowPreference: 'moderate',
  lightPreference: 'dim',
  diet: 'carnivore',
  foods: ['bloodworm', 'brine_shrimp', 'mysis', 'earthworm', 'seafood', 'pellet_sinking'],
  feedingStyle: 'hunter',
  feedingSpeed: 0.3,
  feedingAggression: 0.2,
  hungerHours: 24,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'Keep one: pairs and trios bully each other until the weakest stops feeding.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Rivals push each other with wide-open mouths and signal with their electric fields.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'copepod'],
  preyTags: ['fish_large'],
  // derived: PFK "very small fish such as neons"
  maxLikelyPreySizeCm: 5,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 2,
  coverPreference: 0.7,
  substrateRules: { preferred: ['fine_gravel', 'sand'], avoid: [], note: 'A clear tube or a cave to hide in by day, smooth decor (its skin is sensitive) and room front to back to turn its stiff body.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    clutchSize: { min: 1, max: 105 },
    incubationHours: 24,
    fryRearingHours: 120,
    cooldownDays: 30,
    conditions: { needsPartner: true, needsCover: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Bred on farms in Indonesia in big outdoor ponds, spawning at night in pairs. In the lab, knifefishes come into breeding condition when the water’s conductivity is lowered and the level rises, like a rainy season, and hide their eggs one at a time in crevices. Home spawnings are anecdotal only, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 16 years (PFK owner report) → the game's cap; the sexes look alike
  lifecycle: { juvenileDays: 20, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.6 },

  hardiness: 0.5,
  difficulty: 'advanced',
  // LiveAquaria $24.99 (2–4 in)
  baseValue: 25,
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  unlock: { requires: ['fw_large'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Farm-bred in Indonesia; wild fish come mostly from the Orinoco (Colombia, Venezuela).',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2020)', note: 'Collected heavily for the trade, but the species is widespread.' },

  genetics: {
    loci: [
      intensityLocus('No hobby colour genetics; individuals vary in how bright the white blaze and tail rings are.'),
      {
        id: 'white',
        name: 'White',
        mode: 'mendelian',
        alleles: [
          { id: '+', name: 'Black', dominance: 2, frequency: 0.97 },
          { id: 'w', name: 'White', dominance: 1, frequency: 0.03, rare: true },
        ],
        note: 'The white form is a colour sport first imported from Indonesia in 2008 and now bred in Europe (Aquarium Glaser); whether it is albino or leucistic and how it is inherited are undocumented. Recessive is an assumption (the owner, ADR-0053 round 2).',
      },
    ],
    phenotypes: [
      { id: 'white', name: 'White', layer: 'base', rarity: 0.45, when: [{ locus: 'white', allele: 'w', count: 'hom' }], visual: { bodyColor: '#ece6da', bodyColor2: '#e4ddd0', bellyColor: '#f2ece2', finColor: '#e8e2d6', finColor2: '#ddd4c4', accentColor: '#fbfaf6', patternContrast: 0.25 }, note: 'Cream-white, the tail rings paler still; the inheritance is the hobby’s report, not proven.' },
      { id: 'wild', name: 'Black Ghost', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#fbfbf8', patternContrast: 1 }, 'Bright-banded'),
    ],
    baseVisual: {
      bodyColor: '#121214',
      bodyColor2: '#1c1c20',
      bellyColor: '#18181b',
      finColor: '#2a2a32',
      finColor2: '#5a5a66',
      accentColor: '#ecebe6',
      eyeColor: '#0e0e10',
      pattern: 'saddle',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0.05,
      translucency: 0.25,
      finType: 'knife',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.1,
    notes: 'Colour slots for the knifefish art: body = the velvet black; accent = the white blaze on the snout (which may run on as a stripe down the back) and the two white rings round the tail; fin = the one long ribbon fin under the body. No dorsal fin and almost no tail fin.',
  },
  visualMorphs: ['Black Ghost', 'White'],

  behaviorSet: 'knifefish',
  behaviorTraits: { cruiseSpeed: 0.25, burstSpeed: 3, turnRate: 1.2, hoverTendency: 0.8, schoolingTightness: 0, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.5, nocturnal: 0.9 },
  specialBehaviors: ['tube_rest', 'reverse_swim', 'electrolocate_probe', 'night_hunt', 'hand_feed', 'gape_contest'],

  encyclopedia: {
    summary: 'A velvet-black, stiff-bodied night fish with a white blaze and two white tail rings that swims forwards, backwards and sideways by rippling one long fin.',
    nativeHabitat: 'Fast, sandy creeks and deep river channels of the Amazon and Orinoco, where it hunts insect larvae in the dark.',
    socialStructure: 'Solitary: two or three in one tank bully each other until the weakest stops feeding.',
    tankNeeds: 'An eight-foot tank of 240 gallons or more, dim light, a tube or cave to hide in by day, smooth decor, clean, well-oxygenated water and no copper medicines.',
    compatibilityNotes: 'Eats tiny fish such as neons, and small shrimp. Good with calm, mid-sized fish (angelfish, discus, bristlenose plecos); keep boisterous cichlids and loaches away from its sensitive skin, and never a fahaka.',
    breedingOverview: 'Bred on Indonesian farms in big ponds; spawning in a home tank is anecdotal, and the game does not breed it.',
    conservationNote: 'Least Concern (IUCN 2020).',
    funFact: 'Its eyes are tiny and it doesn’t hunt by sight: it finds its way and its food with a weak electric field it makes all the time, sensing anything that disturbs it.',
    inGameBehavior: 'Spends the day in its tube or cave, then glides out at dusk, backing up and sliding sideways with its body held straight while the long fin underneath ripples.',
    feedingNote: 'Frozen bloodworm, mysis and seafood, earthworms and sinking pellets after the lights go down; settled fish learn to take food from the hand.',
    keeperTip: 'A clear acrylic tube lets it feel hidden while you can still see it.',
  },
  sourceReferences: [
    { id: 'fishbase-apteronotus-albifrons', title: 'FishBase — Apteronotus albifrons (Black ghost)', url: 'https://www.fishbase.se/summary/Apteronotus-albifrons.html', tier: 1, facts: ['50 cm TL', '23–28 °C, pH 6.0–8.0', 'fast-flowing sandy creeks', 'nocturnal', 'IUCN Least Concern'] },
    { id: 'maulana-2021-black-ghost', title: 'Maulana, Soelistyowati & Furqon 2021 — Spawning of the black ghost (Indonesian Aquaculture Journal 16: 29–34)', url: 'https://doi.org/10.15578/iaj.16.1.2021.29-34', tier: 1, facts: ['farm spawning in pairs at night'] },
    { id: 'kirschbaum-2002-gymnotiforms', title: 'Kirschbaum & Schugardt 2002 — Reproductive strategies and developmental aspects in mormyrid and gymnotiform fishes (J. Physiol. Paris 96: 557–566)', url: 'https://doi.org/10.1016/S0928-4257(03)00011-1', tier: 1, facts: ['breeding triggered by lowering the conductivity and raising the water', 'mature at about a year'] },
    { id: 'seriouslyfish-apteronotus-albifrons', title: 'Seriously Fish — Apteronotus albifrons', url: 'https://www.seriouslyfish.com/species/apteronotus-albifrons/', tier: 2, facts: ['500 mm TL', '180×60 cm minimum for an adult', '23–28 °C, pH 6.0–8.0', 'sensitive to water quality', 'farm-bred in Indonesia'] },
    { id: 'liveaquaria-black-ghost', title: 'LiveAquaria — Black Ghost Knifefish', url: 'https://www.liveaquaria.com/product/857/?pcatid=857', tier: 2, facts: ['18 in', '150 gal', 'ghost tube for daytime viewing', '$24.99 (2–4 in)'] },
    { id: 'pfk-predators-knifefishes', title: 'Practical Fishkeeping — Predators: the knifefishes', url: 'https://www.practicalfishkeeping.co.uk/features/predators-the-knifefishes/', tier: 2, facts: ['a 3 m tank for a full adult', 'nocturnal, caves', 'eats very small fish such as neons'] },
    { id: 'pfk-39-top-tips', title: 'Practical Fishkeeping — 39 top tips for fishkeepers', url: 'https://www.practicalfishkeeping.co.uk/features/articles/39-top-tips-for-fishkeepers', tier: 2, facts: ['black ghost knifefish particularly sensitive to copper'] },
    { id: 'tfh-apteronotus-albifrons', title: 'TFH Magazine — Apteronotus albifrons', url: 'https://www.tfhmagazine.com/articles/freshwater/apteronotus-albifrons', tier: 2, facts: ['stiff body needs room front to back to turn', 'nocturnal'] },
    { id: 'glaser-albifrons-white', title: 'Aquarium Glaser — Apteronotus albifrons WHITE', url: 'https://aquariumglaser.de/en/tag/albifrons-en', tier: 2, facts: ['white colour sport first imported from Indonesia in 2008', 'now bred in Europe'] },
  ],
  confidenceNotes: [
    'The white form’s inheritance is undocumented; recessive is an assumption (the owner chose to include it as a rare form).',
    'Tank: Seriously Fish 180×60 cm, LiveAquaria 150 gal, PFK about 3 m; the game uses the 240-gallon tank (96 in long), room to turn.',
    'Breeding figures are placeholders (the game does not breed it); the egg counts are from a related species.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'A black ghost eats tiny fish such as neons at night.', incidentRisk: 0.3 },
    { other: 'tag:fish_small', verdictFloor: 'high_risk', reason: 'Small fish are within reach of a big black ghost’s mouth.', incidentRisk: 0.12, mitigatedBy: ['hides'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'incompatible', reason: 'A black ghost eats dwarf shrimp.', incidentRisk: 0.3 },
    { other: 'oscar', verdictFloor: 'conditional', reason: 'Boisterous fish damage a black ghost’s sensitive skin.', incidentRisk: 0.03, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'clown_loach', verdictFloor: 'conditional', reason: 'Boisterous loaches compete for its caves and its night-time food.', incidentRisk: 0.02, mitigatedBy: ['hides'] },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'The fahaka attacks tankmates, and a soft-skinned black ghost is an easy target.', incidentRisk: 0.3 },
    { other: 'black_ghost_knifefish', verdictFloor: 'high_risk', reason: 'Two or three black ghosts bully each other until the weakest stops feeding.', incidentRisk: 0.1 },
    { other: 'silver_arowana', verdictFloor: 'usually_compatible', reason: 'Different zones and times: the arowana cruises the surface by day, the black ghost the floor at night; feed it after the lights go off.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
    { other: 'comet_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; a black ghost needs tropical water.', incidentRisk: 0.1 },
    { other: 'fancy_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; a black ghost needs tropical water.', incidentRisk: 0.1 },
  ],
  special: { medicationSensitive: true, highOxygen: true, outgrowsSmallTanks: true },
  visualLane: 'fish',
};
