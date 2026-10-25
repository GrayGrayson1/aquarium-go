import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Sand-sifting starfish (comb star) — Astropecten polyacanthus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#sand-sifting-starfish
 */
export const sandSiftingStarfish: SpeciesDefinition = {
  id: 'sand_sifting_starfish',
  commonName: 'Sand-sifting Starfish',
  scientificName: 'Astropecten polyacanthus',
  category: 'invertebrate',
  group: 'sea_star',
  genus: 'Astropecten',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — the Red Sea and South Africa to Hawaii, on silty sand in harbours, bays and estuaries 0–222 m deep',
  isStarter: false,

  // Wikipedia: arm span to 20 cm; SeaLifeBase 12 cm; LiveAquaria 8 in.
  adultSizeCm: 15,
  // LiveAquaria: a large tank with sand several inches deep; ReefApp 400 L for the related Archaster. It strips a small sand bed.
  recommendedMinTankGallons: 100,
  recommendedFootprint: { minLengthIn: 48, minWidthIn: 18 },
  activeSwimmer: false,
  bioload: 0.3,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; sensitive to swings and copper; drip-acclimate.
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.022, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['detritus', 'biofilm', 'copepod_live', 'mysis', 'pellet_sinking'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.05,
  feedingAggression: 0,
  hungerHours: 30,

  activityZone: ['substrate', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank: a second usually starves.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Two compete for the same buried food and one starves.' },

  // swallows small buried animals whole: snails, small clams and crustaceans, worms
  predatorTags: ['snail_small', 'clam', 'worm', 'copepod', 'shrimp_fry'],
  preyTags: ['starfish'],
  maxLikelyPreySizeCm: 1.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'caution',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.1,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['bare', 'gravel', 'large_pebbles', 'fine_gravel'], note: 'Lives buried in a deep sand bed (several inches) by day and roams it at night; it empties a small sand bed of life and then starves.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    clutchSize: { min: 10000, max: 100000 },
    incubationHours: 24,
    fryRearingHours: 600,
    cooldownDays: 60,
    conditions: { needsPartner: true, minTankGallons: 200 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes with drifting larvae; no captive-bred stock exists, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // No lifespan found (no long-term aquarium successes are reported) → ~140 game-days.
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 140, sexVisibleAtDays: 140, hatchSizeCm: 0.05 },

  hardiness: 0.35,
  difficulty: 'advanced',
  baseValue: 24,
  rarity: 'common',
  visitorAppeal: 0.5,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems — and it needs a big, deep sand bed.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All are wild-collected; trade “sand sifters” mix this species with Archaster typicus.',
  conservation: { status: 'Not evaluated (IUCN)', note: 'Not assessed. Sand stars are heavily fished for the trade and most starve in tanks too small to feed them.' },

  genetics: {
    loci: [intensityLocus('No colour forms. The top ranges from dark purplish or greenish-blue to brownish-grey, with cream and grey paxillae; the underside orange.')],
    phenotypes: [
      { id: 'wild', name: 'Sand-sifting Starfish', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#3e2e48', accentColor: '#e0d4b8' }),
    ],
    baseVisual: {
      bodyColor: '#4a3b52',
      bodyColor2: '#8a8276',
      bellyColor: '#d9822b',
      finColor: '#6b4a2e',
      finColor2: '#ede3cf',
      accentColor: '#d8ccb2',
      eyeColor: '#101010',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0.05,
      finType: 'starfish',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the sea-star renderer: body/body2 = the dark purplish top and its grey patches; accent = the cream paxillae (the darker central star); belly = the orange underside; the marginal spines fringe the arms with brown bases (fin) and pale tips (fin2). Five broad, flat arms with blunt, slightly upturned tips.',
  },
  visualMorphs: ['Sand-sifting Starfish (no morphs)'],

  behaviorSet: 'starfish_sand',
  behaviorTraits: { cruiseSpeed: 0.05, burstSpeed: 0.12, turnRate: 0.5, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0.95, glassSurfing: 0, curiosity: 0, nocturnal: 0.85, pickRadiusMul: 1.2 },
  specialBehaviors: ['sand_bury', 'sand_sift', 'night_roam'],

  encyclopedia: {
    summary: 'A long-armed sea star with a fringe of spines that ploughs through the sand bed at night and hides in it by day.',
    nativeHabitat: 'Silty sand in harbours, bays and estuaries across the Indo-Pacific, from the shallows to over 200 m.',
    socialStructure: 'Solitary; separate sexes.',
    tankNeeds: 'A big, mature tank (100 gallons or more, six months old) with a deep, living sand bed; supplement its food once the sand runs short.',
    compatibilityNotes: 'Harmless to corals and fish, but it eats small snails, clams and worms in the sand and can strip a small sand bed bare. Puffers and triggers eat sea stars.',
    breedingOverview: 'Spawns into the water with drifting larvae; not bred in captivity.',
    conservationNote: 'Not assessed by the IUCN. Most sold die of starvation in small tanks.',
    funFact: 'It carries tetrodotoxin, the pufferfish poison — and passes it on to the snails that eat it.',
    inGameBehavior: 'Lies hidden under the sand by day; after dark it surfaces and slides slowly across the bed, sinking in again to feed.',
    feedingNote: 'Eats small animals and detritus it finds in the sand. In anything but a big, mature sand bed, tuck a piece of mysis or a sinking pellet under it a couple of times a week.',
    keeperTip: 'Add it only to a tank at least six months old with a large, deep sand bed, and feed it once the sand runs low.',
  },
  sourceReferences: [
    { id: 'worms-astropecten-polyacanthus', title: 'WoRMS — Astropecten polyacanthus Müller & Troschel, 1842', url: 'https://www.marinespecies.org/rest/AphiaRecordsByName/Astropecten%20polyacanthus?like=false&marine_only=true', tier: 1, facts: ['accepted name'] },
    { id: 'sealifebase-astropecten-polyacanthus', title: 'SeaLifeBase — Astropecten polyacanthus', url: 'https://www.sealifebase.se/summary/Speciessummary.php?id=86687', tier: 1, facts: ['Red Sea to Hawaii', '0–222 m', 'eats bivalves and gastropods whole', 'buried by day, active at night', 'IUCN not evaluated'] },
    { id: 'noguchi-1982-ttx', title: 'Noguchi et al. (1982) Tetrodotoxin in the starfish Astropecten polyacanthus. Nippon Suisan Gakkaishi', url: 'https://www.jstage.jst.go.jp/article/suisan1932/48/8/48_8_1173/_article', tier: 1, facts: ['carries tetrodotoxin', 'passes to trumpet snails that eat it'] },
    { id: 'liveaquaria-sand-sifting-star', title: 'LiveAquaria — Sand Sifting Sea Star', url: 'https://www.liveaquaria.com/products/sand-sifting-sea-star', tier: 2, facts: ['8 in', 'large tank, deep sand', 'starves when detritus runs out', 'eats small shrimp and molluscs', 'avoid puffers', '~$24'] },
    { id: 'echinoblog-sand-stars', title: 'Echinoblog (C. Mah) — Telling apart sand stars: Archaster vs. Astropecten', url: 'https://echinoblog.blogspot.com/2011/04/telling-apart-sand-stars-archaster-vs.html', tier: 2, facts: ['Astropecten: long sharp marginal spines, pointed tube feet', 'Archaster sold under the same name'] },
  ],
  confidenceNotes: [
    'Trade naming is muddled: “sand-sifting stars” are often Archaster typicus; the game uses Astropecten polyacanthus, the comb star.',
    'LiveAquaria rates it easy, but no long-term successes are reported (Reeflex); the game makes it hard and gives it a big minimum tank.',
    'No per-gallon stocking rule is published, and advice on numbers conflicts (Reef Builders: one or several in a big bed; forums: a second starves); the game keeps one per tank.',
  ],
  exceptionRules: [
    { other: 'tag:snail_small', verdictFloor: 'conditional', reason: 'Swallows small snails it finds in the sand.', incidentRisk: 0.03 },
  ],
  special: { burrower: true, needsAlgaeOrBiofilm: true, medicationSensitive: true, requiresMatureDays: 20 },
  visualLane: 'special',
};
