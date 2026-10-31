import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Flame hawkfish — Neocirrhites armatus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#flame-hawkfish
 */
export const flameHawkfish: SpeciesDefinition = {
  id: 'flame_hawkfish',
  commonName: 'Flame Hawkfish',
  scientificName: 'Neocirrhites armatus',
  category: 'fish',
  group: 'hawkfish',
  genus: 'Neocirrhites',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western and central Pacific — the Ryukyus to the Line Islands and the Great Barrier Reef, in branching corals on surge-swept reef fronts',
  isStarter: false,

  // FishBase 9 cm TL; aquarium fish 3–4 in.
  adultSizeCm: 9,
  // LiveAquaria and Quality Marine 30 gal; Quality Marine articles 40 gal.
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.9,

  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'pellet_sinking', 'flake'],
  feedingStyle: 'ambush',
  feedingSpeed: 0.75,
  feedingAggression: 0.55,
  hungerHours: 14,

  activityZone: ['decor', 'lower', 'middle'],
  temperament: 'semi_aggressive',
  territoriality: 0.7,
  aggression: 0.35,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, note: 'One per tank; it defends its favourite perches.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'courtship_ok', juvenile: 'fight', note: 'Intolerant of its own kind outside a pair.' },

  // small shrimp, crabs, snails and fish it can swallow
  predatorTags: ['shrimp_dwarf', 'shrimp_fry', 'fish_tiny', 'fry', 'snail_small', 'copepod'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 3,

  shrimpSafe: 'unsafe',
  snailSafe: 'caution',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.03,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Wants high perches: rock tips and coral branches to sit on and watch from.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 100, max: 1000 },
    incubationHours: 8,
    fryRearingHours: 400,
    cooldownDays: 2,
    conditions: { needsPartner: true, minTankGallons: 55 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Pairs spawn at dusk, scattering floating eggs with no care. It has spawned in captivity (University of Florida since 2022) but no larvae have been raised, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // Quality Marine: 10+ years → ~400 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 400, sexVisibleAtDays: 400, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 80,
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  unlock: { requires: [] },
  captiveBredAvailable: false,
  wildCaughtNote: 'All are wild-collected.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2015)', note: 'Least Concern. Its colour fades in captivity without a varied, enriched diet.' },

  genetics: {
    loci: [intensityLocus('No colour forms. Brilliant red; it fades toward orange in captivity on a poor diet.')],
    phenotypes: [
      { id: 'wild', name: 'Flame Hawkfish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#e4101a', finColor: '#e01a1a' }),
    ],
    baseVisual: {
      bodyColor: '#e3191f',
      bodyColor2: '#f04a25',
      bellyColor: '#f7735a',
      finColor: '#e52a22',
      finColor2: '#b01218',
      accentColor: '#1a0e10',
      eyeColor: '#1a0a08',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.8,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.05,
      finType: 'hawkfish',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Deep, compressed “football” body, high-set eyes, a spiny dorsal with tufted spine tips, thick lower pectoral rays for perching. Brilliant red with a black ring round the eye and a black band along the back at the dorsal base (accent).',
  },
  visualMorphs: ['Flame Hawkfish (no morphs)'],

  behaviorSet: 'hawkfish',
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 6, turnRate: 3.5, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.8, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.7, nocturnal: 0 },
  specialBehaviors: ['rock_perch', 'perch_pounce'],

  encyclopedia: {
    summary: 'A pocket-sized red hawk that sits on the highest rock, watches everything and pounces on its food.',
    nativeHabitat: 'Surge-swept reef fronts 1–10 m deep, living inside branching Pocillopora and Stylophora corals.',
    socialStructure: 'Pairs or small harems in the wild; every fish starts female.',
    tankNeeds: 'A tank of 30 gallons or more with high perches, strong, well-oxygenated flow and a varied, vitamin-rich meaty diet.',
    compatibilityNotes: 'Coral-safe, but it eats small shrimp, crabs and fish it can swallow, and may bother small gobies and blennies. One per tank.',
    breedingOverview: 'Pairs spawn at dusk with floating eggs; no captive-raised fish yet.',
    conservationNote: 'Least Concern (IUCN 2015). Wild-collected.',
    funFact: 'Like all hawkfish it has no swim bladder — so it perches rather than hovers.',
    inGameBehavior: 'Sits propped on a rock tip turning its eyes, then swoops down on food and back up to its perch.',
    feedingNote: 'A small predator: thawed mysis and brine shrimp and small meaty pellets once or twice a day. An autofeeder with pellets suits it; vitamin-enriched frozen food keeps it red.',
    keeperTip: 'Feed it varied, vitamin-enriched seafood — on a plain diet its red fades to orange.',
  },
  sourceReferences: [
    { id: 'fishbase-neocirrhites-armatus', title: 'FishBase — Neocirrhites armatus (Flame hawkfish)', url: 'https://www.fishbase.se/summary/Neocirrhitus-armatus.html', tier: 1, facts: ['9 cm TL', 'depth 1–10 m', 'lives in branching corals', 'small crustaceans', 'fades in captivity', 'IUCN Least Concern (2015)'] },
    { id: 'fishbase-repro-neocirrhites', title: 'FishBase — Reproduction of Neocirrhites armatus (citing Sadovy & Donaldson 1995)', url: 'https://www.fishbase.se/Reproduction/5832', tier: 1, facts: ['protogynous', 'pelagic batch spawner, no care', 'pairs or harems'] },
    { id: 'liveaquaria-flame-hawkfish', title: 'LiveAquaria — Flame Hawkfish', url: 'https://www.liveaquaria.com/products/flame-hawkfish', tier: 2, facts: ['30 gal', 'no small shrimp', 'careful with small gobies and blennies', '~$80'] },
    { id: 'qm-flame-hawkfish-revisited', title: 'Quality Marine — Revisited: the flame hawkfish', url: 'https://www.qualitymarine.com/news/revisited-flame-hawkfish/', tier: 2, facts: ['40 gal', 'one per tank', 'may eat snails and crabs', 'spawns at dusk', '10+ years', 'varied diet keeps the red'] },
  ],
  confidenceNotes: [
    'Name: WoRMS spells the genus Neocirrhites; Neocirrhitus is a misspelling still used in the trade.',
    'Depth differs by source (FishBase 1–10 m, Wikipedia 10–25 m).',
    'Lifespan (10+ years) comes from a retailer without a citation.',
  ],
  exceptionRules: [
    { other: 'tag:shrimp_dwarf', verdictFloor: 'high_risk', reason: 'Small shrimp are its favourite prey.', incidentRisk: 0.15 },
    { other: 'tag:fish_tiny', verdictFloor: 'high_risk', reason: 'Pounces on fish small enough to swallow.', incidentRisk: 0.1 },
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A quick pouncing feeder that takes food before a seahorse can and pesters slow fish.', incidentRisk: 0.06 },
  ],
  special: { highOxygen: true, socialSexChange: true },
  visualLane: 'fish',
};
