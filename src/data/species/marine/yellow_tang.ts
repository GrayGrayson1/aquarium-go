import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Yellow tang — Zebrasoma flavescens. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#yellow-tang
 */
export const yellowTang: SpeciesDefinition = {
  id: 'yellow_tang',
  commonName: 'Yellow Tang',
  scientificName: 'Zebrasoma flavescens',
  category: 'fish',
  group: 'tang',
  genus: 'Zebrasoma',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'North and central Pacific — Hawaiʻi, the Ryukyu, Mariana, Marshall, Marcus and Wake Islands',
  isStarter: false,

  // FishBase max 20 cm TL; LiveAquaria ~8 in.
  adultSizeCm: 20,
  // LiveAquaria 100 gal; Top Shelf 100–150 preferred. Six-foot swimming length required (the 125-gal tier).
  recommendedMinTankGallons: 100,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 18 },
  activeSwimmer: true,
  bioload: 3,

  // LiveAquaria 72–78 °F; Top Shelf 75–80 °F, SG 1.024–1.026; FishBase 24–28 °C.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['nori', 'vegetable', 'algae_wafer', 'pellet_small', 'flake', 'mysis'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.85,
  feedingAggression: 0.6,
  hungerHours: 12,

  activityZone: ['all'],
  temperament: 'semi_aggressive',
  territoriality: 0.65,
  aggression: 0.35,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.1, note: 'Best alone. Groups of three or more only in very large tanks (180+ gal), added at the same time.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'fight',
    mixed: 'harassment',
    juvenile: 'tension',
    note: 'Tangs defend grazing territory against their own kind and other tangs, especially same-genus or same-shaped fish. Scalpel spines make fights dangerous.',
  },

  predatorTags: [],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'caution',
  reefSafe: 'safe',
  coralRisk: 0.02,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs long open swimming lanes plus rockwork with caves for sleeping; grazes algae on live rock.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 22,
    // ADW: ~40,000 pelagic eggs per spawning event.
    clutchSize: { min: 20000, max: 40000 },
    incubationHours: 8,
    // ADW: pelagic larvae settle after ~10 weeks.
    fryRearingHours: 560,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Pairs spawn in open water around the full moon, releasing tens of thousands of floating eggs. Larvae drift for about ten weeks. The Oceanic Institute of Hawaiʻi pioneered captive breeding, but it requires hatchery facilities and is not modelled in home tanks.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // Claisse et al. 2009: wild fish aged up to 41 years; ADW ~10 years typical in captivity. Capped at 480.
  lifecycle: { juvenileDays: 16, adultDays: 22, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.15 },

  hardiness: 0.75,
  difficulty: 'intermediate',
  baseValue: 300,
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  unlock: { requires: ['marine_large'], hint: 'Unlocks with large open-water marine fish — needs at least a six-foot tank.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Hawaiian collection has been largely halted since a 2017 court ruling, so most yellow tangs are now captive-bred (Oceanic Institute/Biota, ~$300) or imported from other Pacific islands (~$120).',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2010)',
    note: 'Once Hawaiʻi’s top aquarium export. Collection off West Hawaiʻi has been mostly stopped since 2017; in 2025 the state proposed rules that could reopen it with quotas, which conservation groups contest. Captive-bred tangs avoid the issue.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Individuals vary from lemon to deep canary yellow; diet affects colour too.')],
    phenotypes: [
      { id: 'wild', name: 'Yellow Tang', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#ffe01a', bodyColor2: '#f9c800' }),
    ],
    baseVisual: {
      bodyColor: '#fde023',
      bodyColor2: '#f6c90e',
      bellyColor: '#fff07a',
      finColor: '#fbd91c',
      finColor2: '#fff3a0',
      accentColor: '#f8f8f0',
      eyeColor: '#1a1a14',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.2,
      patternSeed: 0,
      iridescence: 0.08,
      metallic: 0,
      translucency: 0.1,
      finType: 'tang_sailfin',
      finLength: 1.15,
      bodyDepth: 1.12,
      gillFullness: 0,
    },
    variation: 0.1,
    notes: 'Tall, disc-shaped body with high sail-like dorsal and anal fins and a long, down-pointed snout. Solid lemon yellow; a white scalpel spine at the tail base (accent). At night it turns duskier with a pale lateral stripe and blotch.',
  },
  visualMorphs: ['Yellow Tang (no morphs; individual variation)'],

  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1.2, burstSpeed: 6, turnRate: 2.5, hoverTendency: 0.3, schoolingTightness: 0, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['graze_rock', 'patrol_lap', 'scalpel_flare', 'night_colour', 'cleaner_visit'],

  encyclopedia: {
    summary: 'The bright lemon disc of the reef tank: an active algae-grazing surgeonfish with a scalpel hidden at the base of its tail.',
    nativeHabitat: 'Coral-rich lagoons and seaward reefs 2–46 m deep in the north-central Pacific, especially Hawaiʻi.',
    socialStructure: 'Adults live alone or in loose groups; juveniles are territorial around their shelter.',
    tankNeeds: 'At least a six-foot tank (100+ gallons) with long open swimming lanes, strong flow, live rock to graze and daily seaweed. Add it last so it does not claim the whole tank.',
    compatibilityNotes: 'Reef-safe with corals and invertebrates. Fights other tangs — especially yellow or same-shaped ones — unless the tank is huge. Its speed and appetite can starve slow feeders like seahorses and mandarins.',
    breedingOverview: 'Spawns in open water around the full moon. Captive breeding was cracked by the Oceanic Institute of Hawaiʻi, but it needs a hatchery.',
    conservationNote: 'Least Concern (IUCN 2010). Aquarium collection in Hawaiʻi has been mostly halted since 2017 and remains contested; captive-bred yellow tangs are now available.',
    funFact: 'Yellow tangs can live more than 40 years — scientists aged a wild Hawaiian fish at 41 by counting growth rings in its ear bones.',
    inGameBehavior: 'Patrols the length of the tank in laps, grazes the rock, flares its tail spine at rivals, and fades to a dusky night colour when the lights go out.',
  },
  sourceReferences: [
    { id: 'fishbase-zebrasoma-flavescens', title: 'FishBase — Zebrasoma flavescens (Yellow tang)', url: 'https://www.fishbase.se/summary/Zebrasoma-flavescens.html', tier: 1, facts: ['max 20 cm TL', 'depth 2–46 m', '24–28 °C', 'browses filamentous algae', 'singly or loose groups', 'lunar spawning', 'IUCN Least Concern (2010)', 'top Hawaiian marine export'] },
    { id: 'adw-zebrasoma-flavescens', title: 'Animal Diversity Web — Zebrasoma flavescens', url: 'https://animaldiversity.org/accounts/Zebrasoma_flavescens/', tier: 1, facts: ['up to 30 years wild, ~10 in captivity', '~40,000 eggs per spawn', 'larvae settle after ~10 weeks', 'night colour: darker with white lateral line', 'scalpel-like caudal spine'] },
    { id: 'claisse-2009-yellow-tang-age', title: 'Claisse et al. (2009) Habitat- and sex-specific life history patterns of yellow tang in Hawaii. Marine Ecology Progress Series 389: 245–255', url: 'https://www.int-res.com/abstracts/meps/v389/p245-255', tier: 1, facts: ['oldest wild fish aged 41 years', 'otolith annuli validated'] },
    { id: 'liveaquaria-yellow-tang', title: 'LiveAquaria — Yellow Tang, Hawaii', url: 'https://www.liveaquaria.com/product/6746/?pcatid=6746', tier: 2, facts: ['min tank 100 gal', 'max 8 in', 'semi-aggressive', 'aggressive toward its own species and tangs in general', 'active swimmer in near-constant motion', 'seaweed 3× weekly', 'reef compatible'] },
    { id: 'liveaquaria-yellow-tang-spotlight', title: 'LiveAquaria — Yellow Tangs remain a great choice (species spotlight)', url: 'https://www.liveaquaria.com/blogs/species-spotlight/yellow-tangs-remain-a-great-choice-for-your-marine-aquarium', tier: 2, facts: ['min 100 gal', 'add last', 'captive-bred via Biota and the Oceanic Institute of Hawaii', 'Hawaiian collection restrictions'] },
    { id: 'topshelf-cb-yellow-tang', title: 'Top Shelf Aquatics — Captive-Bred Yellow Tang', url: 'https://topshelfaquatics.com/products/captive-bred-yellow-tang', tier: 2, facts: ['captive-bred ~$330', 'min 100 gal, 100–150 preferred', 'territorial toward other surgeonfish', '75–80 °F, SG 1.024–1.026'] },
    { id: 'civilbeat-2025-hawaii-aquarium', title: 'Honolulu Civil Beat — Aquarium Fishing Could Return To Hawaiʻi Under Proposed New Rules (Oct 2025)', url: 'https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/', tier: 2, facts: ['collection largely halted since a 2017 court ruling', '2025 draft rules would allow quotas for yellow and kole tang'] },
  ],
  confidenceNotes: [
    'Tank size: sources range from 100 gal (LiveAquaria) to 100–150 gal preferred (Top Shelf); many keepers insist on 6 ft. The game requires 100 gal and a 72-inch footprint, which means the 125-gal tier or larger.',
    'Hawaiʻi collection status is in flux (draft rules to reopen were advanced in late 2025). The note describes the situation as of this research (Sept 2026) without claiming a final outcome.',
    'Lifespan: 41 years documented in the wild; the game caps at 480 game-days.',
    'Breeding is excluded (not_in_game): pelagic spawning needs hatchery culture.',
  ],
  exceptionRules: [
    { other: 'kole_tang', verdictFloor: 'conditional', reason: 'Tangs fight other tangs. A yellow and a kole tang can share a very large tank (180+ gal) if added together with plenty of rockwork to break sight lines.', incidentRisk: 0.08, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'foxface_rabbitfish', verdictFloor: 'usually_compatible', reason: 'Another yellow, disc-shaped herbivore: expect some chasing at first, but they usually settle in a large tank.', incidentRisk: 0.02, mitigatedBy: ['tank_size'] },
  ],
  special: {
    outgrowsSmallTanks: true,
  },
  visualLane: 'fish',
};
