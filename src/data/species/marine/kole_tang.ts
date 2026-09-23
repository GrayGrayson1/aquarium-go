import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Kole bristletooth tang (yellow-eye tang) — Ctenochaetus strigosus. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#kole-tang
 */
export const koleTang: SpeciesDefinition = {
  id: 'kole_tang',
  commonName: 'Kole Bristletooth Tang',
  scientificName: 'Ctenochaetus strigosus',
  category: 'fish',
  group: 'tang',
  genus: 'Ctenochaetus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Endemic to the Hawaiian Islands and Johnston Atoll',
  isStarter: false,

  // FishBase max 15.4 cm SL (~18 cm TL); LiveAquaria 7 in.
  adultSizeCm: 18,
  // LiveAquaria 70 gal; other guides 75–125. The game uses 90 gal with a four-foot footprint as a conservative middle.
  recommendedMinTankGallons: 90,
  recommendedFootprint: { minLengthIn: 48, minWidthIn: 18 },
  activeSwimmer: true,
  bioload: 2.4,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025. FishBase 21–27 °C (Hawaiian waters run cooler).
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'bright',
  diet: 'detritivore',
  foods: ['biofilm', 'detritus', 'nori', 'algae_wafer', 'pellet_small', 'mysis'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.7,
  feedingAggression: 0.45,
  hungerHours: 12,

  activityZone: ['all', 'glass', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.3,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.1, note: 'Keep one per tank. It is aggressive toward other tangs, especially other bristletooths.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'fight',
    mixed: 'harassment',
    juvenile: 'tension',
    note: 'Two kole tangs, or a kole and another Ctenochaetus, fight over grazing ground.',
  },

  predatorTags: [],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Brushes film algae and detritus from rock, sand and glass with comb-like teeth — a natural glass cleaner.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 22,
    clutchSize: { min: 10000, max: 40000 },
    incubationHours: 8,
    fryRearingHours: 560,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns in pairs in open water, releasing floating eggs with a long pelagic larval stage. Not bred in home aquaria.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // Long-lived like other surgeonfish; ~10+ years in aquaria → 420 game-days.
  lifecycle: { juvenileDays: 16, adultDays: 22, lifespanDays: 420, sexVisibleAtDays: 420, hatchSizeCm: 0.15 },

  hardiness: 0.75,
  difficulty: 'intermediate',
  baseValue: 95,
  rarity: 'uncommon',
  visitorAppeal: 0.6,
  unlock: { requires: ['marine_large'], hint: 'Unlocks with large open-water marine fish — needs a four-foot tank or bigger.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected only — and since it lives only around Hawaiʻi, supply has been scarce since Hawaiian aquarium collection was largely halted in 2017.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2010)',
    note: 'A Hawaiian endemic. Aquarium collection there has been mostly stopped since 2017; 2025 draft rules that could reopen it (including kole quotas) are contested.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Juveniles are yellow-gold with fine stripes and spots and darken to brown as they mature; adults vary in how blue or burgundy the brown looks.')],
    phenotypes: [
      { id: 'wild', name: 'Kole Tang', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#b4cff0', patternContrast: 0.75 }),
    ],
    baseVisual: {
      bodyColor: '#5b4a3e',
      bodyColor2: '#4d3b4a',
      bellyColor: '#6a5a4e',
      finColor: '#3e3230',
      finColor2: '#6a5a74',
      accentColor: '#9fb8d2',
      eyeColor: '#f3c53a',
      pattern: 'lined',
      patternScale: 0.8,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0,
      translucency: 0.08,
      finType: 'tang_bristletooth',
      finLength: 1,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Oval surgeonfish body, chocolate brown with a blue-to-burgundy cast and many fine pale-blue horizontal lines; tiny pale spots on the head; a bright golden ring around the eye (eyeColor). Fins darker brown. Juveniles are yellow-gold. Small scalpel spine at the tail base.',
  },
  visualMorphs: ['Kole Tang (no morphs; juvenile colour change)'],

  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 5.5, turnRate: 2.5, hoverTendency: 0.3, schoolingTightness: 0, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['comb_graze', 'glass_graze', 'patrol_lap', 'scalpel_flare'],

  encyclopedia: {
    summary: 'A gold-eyed Hawaiian surgeonfish that combs the rock with bristle-like teeth, sweeping up film algae and detritus.',
    nativeHabitat: 'Coral, rock and rubble reefs from 1 to over 100 m deep around the Hawaiian Islands and Johnston Atoll.',
    socialStructure: 'Mostly solitary; spawns in pairs.',
    tankNeeds: 'A four-foot or larger tank (90+ gallons) with plenty of mature rock to graze, strong flow and regular seaweed.',
    compatibilityNotes: 'Reef-safe and harmless to invertebrates. Aggressive toward other tangs, so keep one per tank unless the tank is very large. Competes for food with slow feeders.',
    breedingOverview: 'Spawns in pairs in open water; the long drifting larval stage has not been reared commercially.',
    conservationNote: 'Least Concern (IUCN 2010). A Hawaiian endemic whose collection has been mostly halted since 2017.',
    funFact: '"Bristletooth" is literal: its flexible, comb-like teeth brush sediment and diatoms off surfaces rather than biting algae.',
    inGameBehavior: 'Works over rock, sand and even the front glass in steady passes, flicking its gold-ringed eyes at you as it cleans.',
  },
  sourceReferences: [
    { id: 'fishbase-ctenochaetus-strigosus', title: 'FishBase — Ctenochaetus strigosus', url: 'https://www.fishbase.se/summary/Ctenochaetus-strigosus.html', tier: 1, facts: ['max 15.4 cm SL', 'depth 1–113 m', '21–27 °C', 'endemic to Hawaii and Johnston Island', 'combs detritus with comb-like teeth', 'solitary, spawns in pairs', 'IUCN Least Concern (2010)'] },
    { id: 'liveaquaria-kole-tang', title: 'LiveAquaria — Kole Yellow Eye Tang', url: 'https://www.liveaquaria.com/product/345/?pcatid=345', tier: 2, facts: ['min tank 70 gal', 'max 7 in', 'semi-aggressive', 'aggressive toward other tangs — one per tank', 'eats detritus and film algae', 'juveniles yellow-gold, adults brown with blue/burgundy hue', '72–78 °F, SG 1.020–1.025', 'price ~$93'] },
    { id: 'civilbeat-2025-hawaii-aquarium', title: 'Honolulu Civil Beat — Aquarium Fishing Could Return To Hawaiʻi Under Proposed New Rules (Oct 2025)', url: 'https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/', tier: 2, facts: ['collection largely halted since 2017', 'draft rules include kole tang quotas'] },
  ],
  confidenceNotes: [
    'Tank size conflict: LiveAquaria says 70 gal; several guides recommend 75–125 gal. The game uses 90 gal with a 48-inch footprint.',
    'Trade identity: because the true kole is Hawaiian, some "yellow-eye" tangs sold elsewhere are related Ctenochaetus species; values here apply to C. strigosus.',
    'No evidence of commercial captive breeding was found in this research.',
    'Lifespan (~10+ years) is inferred from other surgeonfish; no species-specific ageing study was found.',
  ],
  exceptionRules: [
    { other: 'yellow_tang', verdictFloor: 'conditional', reason: 'Tangs fight other tangs. A kole and a yellow tang can share a very large tank (180+ gal) if added together with rockwork breaking sight lines.', incidentRisk: 0.08, mitigatedBy: ['tank_size', 'sight_breaks'] },
  ],
  special: {
    outgrowsSmallTanks: true,
    needsAlgaeOrBiofilm: true,
  },
  visualLane: 'fish',
};
