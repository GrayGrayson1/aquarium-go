import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Florida fighting conch — Strombus pugilis (the Florida form long called S. alatus). Lane species-marine, chunk 16.
 * Sources, key facts and conflicts: docs/research/marine.md#fighting-conch
 */
export const fightingConch: SpeciesDefinition = {
  id: 'fighting_conch',
  commonName: 'Fighting Conch',
  scientificName: 'Strombus pugilis',
  category: 'invertebrate',
  group: 'conch',
  genus: 'Strombus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Atlantic — North Carolina to Florida, the Gulf of Mexico and the Caribbean, on shallow seagrass beds and sand flats',
  isStarter: false,

  // SeaLifeBase max 11.2 cm shell; Davis & Cantillo Villa 7–10 cm; ~4 in in the trade.
  adultSizeCm: 9,
  // Sources disagree (15, 20 and 90 gal); the game uses 30 gal with an open sand bed 2–3 in deep.
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.4,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025. Sensitive to high nitrate; no copper.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'detritivore',
  foods: ['detritus', 'biofilm', 'nori', 'algae_wafer', 'pellet_sinking'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.05,
  feedingAggression: 0,
  hungerHours: 24,

  activityZone: ['substrate', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0.15,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One suits most tanks; several only in a large tank with a big sand bed, as males can be territorial.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Males spar with their snouts over females — the "fighting" in the name.' },

  predatorTags: [],
  preyTags: ['snail'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.02,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.1,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: ['bare', 'gravel', 'large_pebbles'], note: 'Needs an open sand bed at least 2–3 in deep to plough and to bury in; it bulldozes loose frags.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 25,
    clutchSize: { min: 76000, max: 485000 },
    incubationHours: 28,
    fryRearingHours: 670,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 100 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes with internal fertilisation; females lay long sand-coated egg strings in summer, and the larvae drift and feed for about three weeks. Harbor Branch raised them for the aquarium trade, but not in home aquaria, so the game does not breed them.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // Matures at 1–2 years, after which the shell stops growing (the lip flares). No lifespan found → ~160 game-days.
  lifecycle: { juvenileDays: 16, adultDays: 25, lifespanDays: 160, sexVisibleAtDays: 160, hatchSizeCm: 0.12 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 25,
  rarity: 'common',
  visitorAppeal: 0.6,
  unlock: { requires: [] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Mostly wild-collected in Florida (a licence is needed to take a live one). Harbor Branch supplied captive-raised conchs to the trade in the 2000s.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed and not protected like the queen conch. Taking a live shell in Florida needs a fishing licence, and Lee County bans it.',
  },

  genetics: {
    loci: [intensityLocus('No named forms. Shells range from orange and tan to brown, black, purple or white; albinos and knobless shells are uncommon.')],
    phenotypes: [
      { id: 'wild', name: 'Fighting Conch', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#c4672a', accentColor: '#4a2012' }),
    ],
    baseVisual: {
      bodyColor: '#b0602a',
      bodyColor2: '#e3c79c',
      bellyColor: '#c0703a',
      finColor: '#7a7570',
      finColor2: '#545049',
      accentColor: '#5a2a1a',
      eyeColor: '#e0a030',
      pattern: 'mottled',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.05,
      finType: 'conch',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.3,
    notes: 'Colour slots for the conch renderer: body/body2 = shell and its pale mottling; accent = dark zigzag streaks; belly = the glazed orange aperture and lip; fin/fin2 = grey soft body; eye = the ringed iris. A solid shell with a short spire of knobbed whorls, a big body whorl and a flared lip; a sickle-shaped operculum on a narrow foot; long eyestalks.',
  },
  visualMorphs: ['Fighting Conch (no morphs; shell colour varies)'],

  behaviorSet: 'conch',
  behaviorTraits: { cruiseSpeed: 0.06, burstSpeed: 0.4, turnRate: 0.6, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0.6, glassSurfing: 0, curiosity: 0.2, nocturnal: 0.65, pickRadiusMul: 1.2 },
  specialBehaviors: ['sand_plough', 'operculum_hop', 'half_bury', 'eyestalk_peek'],

  encyclopedia: {
    summary: 'A heavy, knobbed sea snail that ploughs the sand with a long snout, peers about on long eyestalks and moves by vaulting on its claw-like door.',
    nativeHabitat: 'Shallow seagrass beds and sand flats from the Carolinas to the Gulf and the Caribbean, moving deeper in winter.',
    socialStructure: 'Solitary for most of the year; gathers in summer to mate and lay eggs.',
    tankNeeds: 'An open sand bed at least 2–3 in deep, detritus and diatoms to sift, stable water and no copper. Feed extra in a small or new tank.',
    compatibilityNotes: 'Reef-safe but bulldozes loose frags. Large hermits may kill it for its shell; triggers, puffers and some wrasses eat snails; crabs and shrimp nip its eyes and snout.',
    breedingOverview: 'Females lay long, sand-coated egg strings; the larvae drift for about three weeks. Raised in aquaculture, not in home tanks.',
    conservationNote: 'Not assessed by the IUCN. Florida requires a licence to collect a live conch.',
    funFact: 'The "fighting" is males sparring with their snouts over a female — and the way it thrashes its foot when picked up.',
    inGameBehavior: 'Lurches across the sand on its claw, ploughing as it goes, and settles half-buried with only its shell and eyestalks showing.',
    feedingNote: 'Sifts the sand for detritus, diatoms and algae, mostly at night. In a small or new tank add a sinking pellet or a bit of seaweed now and then.',
    keeperTip: 'Glue down your frags and guard the overflow — conchs wander and bulldoze anything loose.',
  },
  sourceReferences: [
    { id: 'worms-strombus-pugilis', title: 'WoRMS — Strombus pugilis Linnaeus, 1758 (S. alatus a synonym)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=419695', tier: 1, facts: ['accepted name', 'S. alatus a junior synonym (Irwin et al. 2024)'] },
    { id: 'sealifebase-strombus-alatus', title: 'SeaLifeBase — Strombus alatus', url: 'https://sealifebase.se/summary/Strombus-alatus', tier: 1, facts: ['max 11.2 cm', 'depth 0–183 m', 'leaps with a sickle-shaped operculum', 'IUCN not evaluated'] },
    { id: 'was-2019-conch-aquaculture', title: 'Davis & Cantillo Villa (2019) — conch aquaculture, World Aquaculture', url: 'https://www.was.org/Magazine/2019/04/33/', tier: 1, facts: ['7–10 cm', 'internal fertilisation, sperm storage', 'egg strings', 'veligers settle ~21 days', 'Harbor Branch produced 50,000–100,000 a year'] },
    { id: 'liveaquaria-fighting-conch', title: 'LiveAquaria — Florida Fighting Conch', url: 'https://www.liveaquaria.com/product/2174/', tier: 2, facts: ['easy care', '72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025', 'needs an open sand bed', 'sensitive to nitrate', 'price ~$30'] },
    { id: 'topshelf-fighting-conch', title: 'Top Shelf Aquatics — Fighting Conch', url: 'https://topshelfaquatics.com/pages/saltwater-invertebrates/fighting-conch', tier: 2, facts: ['buries leaving the eyes showing', '2–3 in of sand', 'bulldozes frags', 'hermits, triggers, puffers and wrasses are threats'] },
  ],
  confidenceNotes: [
    'Name: Irwin et al. (2024) sank S. alatus into S. pugilis; the trade still sells it as S. alatus.',
    'Minimum tank: 15, 20 or 90 gallons by source; the game uses 30 with an open sand bed.',
    'Lifespan: no figure found; it matures at 1–2 years and the game gives it ~4 years.',
    'SeaLifeBase calls it a broadcast spawner, which contradicts internal fertilisation and egg strings; the game follows the aquaculture source.',
  ],
  exceptionRules: [
    { other: 'tag:hermit_crab', verdictFloor: 'usually_compatible', reason: 'Large hermits can kill a conch for its shell; small reef hermits are little risk to an adult.', incidentRisk: 0.01 },
  ],
  special: {
    burrower: true,
    needsAlgaeOrBiofilm: true,
    medicationSensitive: true,
  },
  visualLane: 'special',
};
