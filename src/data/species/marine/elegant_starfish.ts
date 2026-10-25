import type { SpeciesDefinition } from '@/types';

/**
 * Elegant starfish (red Fromia sea star) — Fromia milleporella. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#elegant-starfish
 */
export const elegantStarfish: SpeciesDefinition = {
  id: 'elegant_starfish',
  commonName: 'Elegant Starfish',
  scientificName: 'Fromia milleporella',
  category: 'invertebrate',
  group: 'sea_star',
  genus: 'Fromia',
  environment: 'marine',
  waterClasses: ['marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — East Africa and the Red Sea to Polynesia, on reef flats rich in coralline algae',
  isStarter: false,

  // Typical 7–9 cm across (Florent’s Reef Guide, Reeflex); up to ~15 cm (Wikipedia); retailers say 6 in.
  adultSizeCm: 9,
  // Fenner (TFH): at least 100 gal, running for 6 months or more; Reeflex: 200 L.
  recommendedMinTankGallons: 100,
  recommendedFootprint: { minLengthIn: 48, minWidthIn: 18 },
  activeSwimmer: false,
  bioload: 0.15,

  // LiveAquaria / Quality Marine: 72–78 °F, pH 8.1–8.4, SG 1.023–1.025, dKH 8–12. Very intolerant of sudden changes.
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.022, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'detritivore',
  foods: ['biofilm', 'detritus', 'pellet_sinking', 'mysis', 'flake'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.02,
  feedingAggression: 0,
  hungerHours: 36,

  activityZone: ['glass', 'decor', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'Usually kept alone; a large, mature tank can feed two.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Ignores its own kind; two only compete for the same film of food.' },

  predatorTags: [],
  preyTags: ['starfish'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Lives on mature live rock and glass, grazing the thin film of algae and microbes; it starves in a new or spotless tank.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    clutchSize: { min: 1000, max: 100000 },
    incubationHours: 24,
    fryRearingHours: 600,
    cooldownDays: 60,
    conditions: { needsPartner: true, minTankGallons: 200 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes that look alike; spawns into the water with planktonic larvae. Extremely difficult to breed in aquaria, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // No lifespan found; most aquarium Fromia fail within two years → ~160 game-days for one that thrives.
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 160, sexVisibleAtDays: 160, hatchSizeCm: 0.05 },

  hardiness: 0.35,
  difficulty: 'advanced',
  baseValue: 30,
  rarity: 'uncommon',
  visitorAppeal: 0.7,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems — and it needs a big, long-established tank to find enough food.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All are wild-collected, mostly from Melanesia and South and East Asia.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Most aquarium sea stars die within months; buy one only for a large, mature tank.',
  },

  genetics: {
    loci: [
      {
        id: 'tips',
        name: 'Arm tips',
        mode: 'mendelian',
        alleles: [
          { id: 'plain', name: 'Red tips', dominance: 2, frequency: 0.8 },
          { id: 'black', name: 'Black tips', dominance: 1, frequency: 0.2 },
        ],
        note: 'The trade sells a "Red & Black" form with black arm tips beside plain red stars. How it is inherited is unknown (and the game does not breed sea stars); modelled as a simple recessive.',
      },
    ],
    phenotypes: [
      { id: 'red_black', name: 'Red & Black Fromia', layer: 'base', rarity: 0.25, when: [{ locus: 'tips', allele: 'black', count: 'hom' }], visual: { accentColor: '#2a1a1a' } },
      { id: 'red', name: 'Red Fromia', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#c41e24',
      bodyColor2: '#a8181e',
      bellyColor: '#eba08a',
      finColor: '#c41e24',
      finColor2: '#a8181e',
      accentColor: '#b01a20',
      eyeColor: '#1a1414',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0.08,
      finType: 'starfish',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the sea-star renderer: body/body2 = red to orange-red upper surface (flat, finely granular, with small black pores); belly = paler underside; accent = the arm tips (black in the Red & Black form). Five tapering arms on a small disc.',
  },
  visualMorphs: ['Red Fromia', 'Red & Black Fromia'],

  behaviorSet: 'starfish',
  behaviorTraits: { cruiseSpeed: 0.02, burstSpeed: 0.03, turnRate: 0.3, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0, nocturnal: 0.7, pickRadiusMul: 1.2 },
  specialBehaviors: ['film_graze', 'glass_glide', 'arm_regrow'],

  encyclopedia: {
    summary: 'A small, smooth, scarlet sea star — sold as the elegant or red Fromia — that glides over rock and glass grazing an invisible film of food.',
    nativeHabitat: 'Inshore reef flats 0–30 m deep across the Indo-Pacific, where coralline algae coat the rock.',
    socialStructure: 'Solitary; the sexes look alike.',
    tankNeeds: 'A big, mature reef (100 gallons or more, running six months or longer) with lots of live rock, rock-steady salinity and no copper. Drip-acclimate it slowly and never lift it into the air.',
    compatibilityNotes: 'Completely reef-safe. Eaten by harlequin shrimp, puffers and triggers, and pulled apart by large crabs and hermits.',
    breedingOverview: 'Spawns into the water with drifting larvae; not bred in aquaria.',
    conservationNote: 'Not assessed by the IUCN. Wild-collected; most die in captivity, so only a tank that can feed it should have one.',
    funFact: 'It can regrow a damaged arm — and a whitish discharge from the arm tips is normal, not a sign of decay.',
    inGameBehavior: 'Creeps across the glass and rock so slowly you have to look twice, leaving a cleaner trail behind it.',
    feedingNote: 'Lives on the film of algae, microbes and detritus on mature rock and glass. Now and then tuck a tiny piece of shrimp or a sinking pellet under an arm.',
    keeperTip: 'Ask the shop to hold a new star for a week, and refuse any with white patches.',
  },
  sourceReferences: [
    { id: 'worms-fromia-milleporella', title: 'WoRMS — Fromia milleporella (Lamarck, 1816)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=213299', tier: 1, facts: ['accepted name', 'Goniasteridae', 'Indo-Pacific', '0–30 m'] },
    { id: 'nausicaa-harlequin-shrimp', title: 'Nausicaá — Harlequin shrimp', url: 'https://nausicaa.fr/en/my-visit/animals/harlequin-shrimp', tier: 1, facts: ['harlequin shrimp eat Fromia'] },
    { id: 'tfh-fenner-fromia', title: 'TFH Magazine (Fenner) — Marbled or tile sea stars', url: 'https://tfhmagazine.com/articles/saltwater/marbled-or-tile-sea-stars', tier: 2, facts: ['100 gal, running 6+ months', 'mostly detritivores', 'drip-acclimate 1 h+', 'most sea stars survive under a month; Fromia sturdier', 'arm-tip discharge normal', 'hold at the dealer a week'] },
    { id: 'liveaquaria-red-sea-star', title: 'LiveAquaria — Red Sea Star (Fromia milleporella)', url: 'https://www.liveaquaria.com/product/578/', tier: 2, facts: ['72–78 °F, pH 8.1–8.4, SG 1.023–1.025, dKH 8–12', 'very intolerant of sudden changes; no copper', 'Red & Black form', 'extremely difficult to breed', 'price ~$24'] },
    { id: 'qm-red-fromia', title: 'Quality Marine — Red Fromia', url: 'https://www.qualitymarine.com/quality-marine/invertebrates/stars/fromia/red-fromia-59026', tier: 2, facts: ['algal film and detritus diet', 'shrimp, krill or pellet supplements', 'regenerates arms', 'wild-collected'] },
  ],
  confidenceNotes: [
    'Name: no source pins "elegant starfish" to one species (Wikipedia gives it to F. nodosa). The trade sells red Fromia as F. milleporella, which the game uses.',
    'Survival record is poor: Reeflex rates it unproven long-term and keepers report starvation after a year or two; the game makes it hard (needs a mature tank, low hardiness).',
    'Day or night activity is disputed (LiveAquaria diurnal, others nocturnal); the game makes it a little busier at night.',
    'The Red & Black form’s inheritance is unknown; modelled as a simple recessive.',
  ],
  exceptionRules: [
    { other: 'tag:crustacean', verdictFloor: 'usually_compatible', reason: 'Large crabs and hermits can pick at and pull apart a sea star.', incidentRisk: 0.01 },
  ],
  special: {
    requiresMatureDays: 20,
    needsAlgaeOrBiofilm: true,
    medicationSensitive: true,
  },
  visualLane: 'special',
};
