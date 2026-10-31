import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';
import { sharkRules } from './_sharks';

/**
 * Epaulette shark — Hemiscyllium ocellatum. Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#epaulette-shark
 * The walking shark: it pushes itself over sand and rock on its paddle-shaped fins. Captive-bred (ORA) and bred in
 * aquariums; lays pairs of egg cases tied to rock (egg_case). The golden and tan "types" have no documented
 * inheritance (ADR-0052 decision 2): the generic intensity locus only.
 */
export const epauletteShark: SpeciesDefinition = {
  id: 'epaulette_shark',
  commonName: 'Epaulette Shark',
  scientificName: 'Hemiscyllium ocellatum',
  category: 'fish',
  group: 'shark',
  genus: 'Hemiscyllium',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The Great Barrier Reef, Australia, on shallow reef flats and in tide pools; look-alike epaulettes from New Guinea are other species',
  isStarter: false,

  // Aquarium of the Pacific: typically 70–90 cm (FishBase 107 cm max)
  adultSizeCm: 90,
  // retail 180–360 gal (LiveAquaria 360); an adult needs its own length front to back to turn → the 500 (the 240 and
  // 300 are only 24 in deep)
  recommendedMinTankGallons: 500,
  recommendedFootprint: { minLengthIn: 108, minWidthIn: 36 },
  activeSwimmer: false,
  bioload: 9,

  // LiveAquaria and Quality Marine 72–78 °F; Wheeler 2021: 31 °C is near its limit
  tempC: { min: 22, max: 30, idealMin: 24, idealMax: 28 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.021, idealMax: 1.025 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['seafood', 'pellet_large', 'mysis'],
  feedingStyle: 'target_fed',
  feedingSpeed: 0.3,
  feedingAggression: 0.3,
  // 2% of body mass three times a week (Wheeler 2025)
  hungerHours: 48,

  activityZone: ['bottom', 'substrate'],
  temperament: 'predatory',
  // "not territorial" (Aquarium of the Pacific)
  territoriality: 0.15,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.04, note: 'Fine alone or as a pair; mature males fight each other and harass females.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Mating is rough: the male grips the female by a fin or her gills, leaving bite marks.' },

  // wild diet: mostly worms and crabs (ReefQuest); its teeth crush hard prey
  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'snail_small', 'fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'eggs'],
  // a grown shark is nobody's prey; its young are, through the groupers' and triggers' rules
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 7,

  shrimpSafe: 'unsafe',
  snailSafe: 'caution',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',
  coralRisk: 0.1,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.35,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['gravel', 'fine_gravel', 'large_pebbles'], note: 'Deep, fine sand to root in (coarse grit cuts its belly), and rock set on the glass: it digs under rockwork.' },

  breeding: {
    system: 'egg_case',
    // breeds readily in aquaria (Aquarium of the Pacific); ORA sells captive-bred pups
    difficulty: 0.55,
    // at least 7 years (IUCN) → the game's cap
    maturityDays: 25,
    // a median of 2 cases per cycle (Wheeler 2025)
    clutchSize: { min: 1, max: 2 },
    // 130 real days × 8 at about 26 °C: 125 days at 27 °C, 101 at 31 (Wheeler 2021), about 140 at 25 (Payne 2012)
    incubationHours: 1040,
    // pups live on their yolk for about a week
    fryRearingHours: 56,
    // a cycle of 19 ± 6 days at 25 °C (Wheeler 2025) → about 6 game days
    cooldownDays: 6,
    conditions: { minTempC: 24, maxTempC: 29, needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 0.5,
    nurseryRequired: false,
    maxRaisedPerClutch: 2,
    notes: 'Lays two leathery cases (about 10 × 4 cm) at night, tied to rock or coral by sticky fibres, every two to three weeks. No parental care. A case hatches after about four months as a 15 cm banded pup that lives on its yolk for a week.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 20–25 years (Aquarium of the Pacific) → the game's cap; hatchlings 14–16 cm (Fishes of Australia)
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 15 },

  hardiness: 0.75,
  difficulty: 'expert',
  // LiveAquaria $895.99; ORA's captive-bred pups about $500
  baseValue: 900,
  rarity: 'very_rare',
  visitorAppeal: 0.98,
  unlock: { requires: ['marine_basics', 'elasmobranchs'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'ORA has sold captive-bred pups since 2016; Australian wild ones are collected under licence in small numbers.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2015)', note: 'Common on the Great Barrier Reef, much of it in marine parks. Warmer seas shorten its incubation and make weaker pups (Wheeler 2021).' },

  genetics: {
    loci: [intensityLocus('Keepers describe golden and tan types, but nobody has shown they breed true: individuals vary.')],
    phenotypes: [
      { id: 'wild', name: 'Epaulette Shark', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#dcc290', accentColor: '#3a2618', patternContrast: 0.9 }),
    ],
    baseVisual: {
      bodyColor: '#d6bf95',
      bodyColor2: '#c2a473',
      bellyColor: '#f2e8d2',
      finColor: '#cbb086',
      finColor2: '#b59866',
      accentColor: '#4b3424',
      eyeColor: '#d8c27a',
      pattern: 'spots',
      patternScale: 1.5,
      patternContrast: 0.8,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0,
      finType: 'shark_benthic',
      finLength: 1,
      bodyDepth: 0.85,
      gillFullness: 0,
      bodyMark: 'epaulette',
    },
    variation: 0.2,
    notes: 'Colour slots for the shark art: body = the cream-gold ground; accent = the widely spaced brown spots; bodyMark "epaulette" = the big black, white-ringed spot above each pectoral fin. A slim shark whose tail is over half its length, with paddle-shaped paired fins it walks on. Young are banded dark across the back and tail.',
  },
  visualMorphs: ['Epaulette Shark'],

  behaviorSet: 'benthic_shark',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 3, turnRate: 2.6, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 0.9, hitching: 0, burrowing: 0.15, glassSurfing: 0.03, curiosity: 0.5, nocturnal: 0.8, pickRadiusMul: 1.6 },
  specialBehaviors: ['fin_walk', 'rest_on_floor', 'ledge_rest', 'night_patrol', 'snout_root', 'suction_strike', 'sand_expel', 'slow_chew', 'rheotaxis_perch', 'tong_feed_learned'],

  encyclopedia: {
    summary: 'The walking shark: a slim, cream-gold shark with a big black “epaulette” spot on each shoulder that walks over sand and rock on its paddle-shaped fins.',
    nativeHabitat: 'Shallow reef flats and tide pools of the Great Barrier Reef, where it walks between pools at low tide.',
    socialStructure: 'Lives alone or in a pair; mature males fight.',
    tankNeeds: 'A 500-gallon tank (three feet front to back), deep fine sand, ledges to rest under, rock set on the glass, a tight lid and strong filtration. Never copper or most medicines: quarantine every tankmate first.',
    compatibilityNotes: 'Eats crabs, shrimp, worms, small snails and sleeping small fish. Good with tangs and peaceful mid-water fish; never triggerfish, puffers, large angelfish or groupers.',
    breedingOverview: 'Breeds in aquariums: a female lays two egg cases every two to three weeks, tied to rock. Each hatches after about four months as a 15 cm banded pup. A female without a male lays empty cases.',
    conservationNote: 'Least Concern (IUCN 2015); captive-bred pups are sold.',
    funFact: 'It survives hours with almost no oxygen in drying tide pools, and walks out of the water from one pool to the next.',
    inGameBehavior: 'Walks over the sand on its fins, rests under ledges by day and roots in the sand for food at dusk.',
    feedingNote: 'Bite-size frozen seafood three times a week from tongs or on the sand; it eats slowly.',
    keeperTip: 'Sharks need iodine and vitamins in their food: real keepers soak the seafood in a shark supplement.',
  },
  sourceReferences: [
    { id: 'fishbase-hemiscyllium-ocellatum', title: 'FishBase — Hemiscyllium ocellatum (Epaulette shark)', url: 'https://www.fishbase.se/summary/Hemiscyllium-ocellatum.html', tier: 1, facts: ['107 cm TL max', 'tide pools and shallow reefs', 'paired eggs', 'survives low oxygen', 'IUCN Least Concern (2015)'] },
    { id: 'foa-hemiscyllium-ocellatum', title: 'Fishes of Australia — Hemiscyllium ocellatum', url: 'https://fishesofaustralia.net.au/home/species/1973', tier: 1, facts: ['Great Barrier Reef endemic', 'two capsules laid among coral at night about every 14 days', 'hatch after about 120 days at 14–16 cm'] },
    { id: 'aop-epaulette-shark', title: 'Aquarium of the Pacific — Epaulette shark', url: 'https://www.aquariumofpacific.org/onlinelearningcenter/species/epaulette_shark', tier: 1, facts: ['typically 70–90 cm', 'not territorial', 'walks on its fins', 'eggs attached to coral or rock by fibrous strands', '20–25 years'] },
    { id: 'wheeler-2021-epaulette', title: 'Wheeler et al. 2021 — Warming shortens epaulette shark incubation (Scientific Reports 11)', url: 'https://researchonline.jcu.edu.au/66857/1/66857.pdf', tier: 1, facts: ['125 days at 27 °C, 110 at 29, 101 at 31', 'weaker hatchlings at 31 °C', 'most hatch in the dark', 'embryos freeze at a threat'] },
    { id: 'wheeler-2025-epaulette', title: 'Wheeler et al. 2025 — Egg-laying cycles of epaulette sharks (Biology Open 14)', url: 'https://journals.biologists.com/bio/article/doi/10.1242/bio.062076', tier: 1, facts: ['females housed alone laid on schedule', 'a cycle of 19 ± 6 days at 25 °C', 'a median of two cases per cycle', 'fed 2% of body mass three times a week'] },
    { id: 'liveaquaria-epaulette', title: 'LiveAquaria — Australian Epaulette Shark', url: 'https://www.liveaquaria.com/products/australian-epaulette-shark', tier: 2, facts: ['360 gal minimum, expert only', '72–78 °F, SG 1.020–1.025', 'sand only', 'never copper', '$895.99'] },
    { id: 'topshelf-epaulette', title: 'Top Shelf Aquatics — Epaulette Shark', url: 'https://topshelfaquatics.com/pages/saltwater-fish/epaulette-shark', tier: 2, facts: ['bottom area matters more than height', 'digs under rockwork', 'avoid triggers, puffers, angelfish', 'eats ornamental shrimp and small sleeping fish'] },
    { id: 'ora-epaulette-2016', title: 'ORA — Captive-bred epaulette sharks (2016)', url: 'https://orafarm.com/?p=7600', tier: 2, facts: ['captive-bred pups sold since November 2016', 'expert only', 'multivitamins in the food'] },
  ],
  confidenceNotes: [
    'Incubation: 120–140 days by source and temperature; the game uses 130 days at about 26 °C, shorter in warmer water.',
    'Females housed alone laid on schedule (Wheeler 2025); the game makes their cases empty. A female kept with a male before can store sperm, which the game does not model.',
    'The 500-gallon tank is the bare minimum for an adult; the 1,000 is comfortable.',
  ],
  exceptionRules: sharkRules({ crushesShells: true }),
  special: { escapeArtist: true, medicationSensitive: true, outgrowsSmallTanks: true, heavyWaste: true, needsSinkingFood: true },
  visualLane: 'fish',
};
