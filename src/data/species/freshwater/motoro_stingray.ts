import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Motoro stingray — Potamotrygon motoro. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#motoro-stingray
 * The owner kept it with plain notes (ADR-0053 round 2): venomous, and banned or restricted in several US states. Its
 * size is the disc's width. Live-bearing (ray_viviparous): 1–8 pups after about two and a half months, independent from
 * birth. No trade forms with documented inheritance ("pearl" rays are another species, P. jabuti).
 */
export const motoroStingray: SpeciesDefinition = {
  id: 'motoro_stingray',
  commonName: 'Motoro Stingray',
  scientificName: 'Potamotrygon motoro',
  category: 'fish',
  group: 'stingray',
  genus: 'Potamotrygon',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical'],
  nativeRegion: 'South America: the Amazon, Orinoco and Paraná–Paraguay–Uruguay basins, over the sandy beds of rivers and lakes',
  isStarter: false,

  // the disc's width: FishBase and Seriously Fish about 50 cm (the tail adds about as much again)
  adultSizeCm: 50,
  // Seriously Fish: 240×90×75 cm (96×36×30 in) for an adult or a pair; Aquatics Unlimited 36 in wide, 90 in+ long →
  // the 500 (the 240 and 300 are only 24 in deep)
  recommendedMinTankGallons: 500,
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 36 },
  activeSwimmer: false,
  bioload: 10,

  // FishBase, Seriously Fish, Fishkeeper 24–26 °C; Aquatics Unlimited 23–28.
  tempC: { min: 22, max: 30, idealMin: 24, idealMax: 27 },
  pH: { min: 5.5, max: 7.6, idealMin: 6.2, idealMax: 7.2 },
  salinitySG: null,
  gh: { min: 1, max: 12 },
  kh: { min: 1, max: 8 },

  flowPreference: 'moderate',
  lightPreference: 'dim',
  diet: 'carnivore',
  foods: ['seafood', 'earthworm', 'pellet_large', 'mysis', 'bloodworm', 'brine_shrimp', 'pellet_sinking', 'snail_live'],
  feedingStyle: 'bottom',
  feedingSpeed: 0.6,
  feedingAggression: 0.5,
  hungerHours: 12,

  activityZone: ['bottom', 'substrate'],
  temperament: 'predatory',
  territoriality: 0.1,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 2, note: 'Alone, as a pair, or one male with several females; never two males.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males bite the edge of the female’s disc while courting; she should be the bigger of the two and needs a rest after two or three litters.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'snail', 'snail_small', 'worm', 'amphibian'],
  // a grown ray is nobody's prey (a bichir's bottom-fish rule is about fish that fit); slow, so busy fish stress it
  preyTags: ['fish_large', 'fish_slow'],
  maxLikelyPreySizeCm: 8,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'caution',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 0,
  coverPreference: 0.1,
  substrateRules: { preferred: ['fine_sand', 'sand', 'bare'], avoid: ['gravel', 'fine_gravel', 'large_pebbles', 'aragonite'], note: 'Soft river sand several inches deep to bury in, nothing sharp or rough, and an open floor. Aragonite would push the pH up.' },

  breeding: {
    system: 'ray_viviparous',
    difficulty: 0.8,
    // about 3 years at a 30–35 cm disc (USFWS) → the game's cap
    maturityDays: 25,
    // 1–8 pups in aquaria (Seriously Fish, Fishkeeper)
    clutchSize: { min: 1, max: 8 },
    // 9–12 weeks (Seriously Fish), 2–3 months (Fishkeeper): the middle, about 75 days × 8
    incubationHours: 600,
    // pups live on their yolk for up to a week (Seriously Fish) and are independent from birth
    fryRearingHours: 56,
    cooldownDays: 15,
    conditions: { needsPartner: true, minTempC: 24, needsConditioningFood: ['earthworm', 'seafood', 'mysis'], minTankGallons: 500 },
    predationWithoutNursery: 0.1,
    nurseryRequired: false,
    maxRaisedPerClutch: 8,
    notes: 'Live-bearing: the embryos feed on a milk the uterus makes. After about two and a half months in an aquarium the female gives birth to one to eight pups, each a small copy of its parents and independent from birth. The male bites her disc while courting, so pairs need watching, and she should rest after two or three litters.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // up to 15 years in captivity (ADW) → the game's cap; newborns about 10 cm long (ADW); young males' claspers are small
  // but visible close up (Seriously Fish)
  lifecycle: { juvenileDays: 25, adultDays: 30, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 9.7 },

  hardiness: 0.45,
  difficulty: 'expert',
  // Aquatics Unlimited $299.99–499.99 (4–6 in juveniles)
  baseValue: 400,
  rarity: 'rare',
  visitorAppeal: 0.97,
  unlock: { requires: ['elasmobranchs'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Bred regularly in captivity, at large scale in Asia; Brazil allows no ray exports, and wild fish come from Peru and Colombia under CITES permits.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2024); CITES Appendix III (Brazil and Colombia, since 2017)',
    note: 'Venomous: the barbed spine on its tail can deliver a very painful sting, even when shed. It is banned or permit-only in several US states (Arizona, California, Georgia, Mississippi, Nevada, Oklahoma and Texas; conditional in Florida). Released rays have settled in rivers far from home.',
  },

  genetics: {
    loci: [intensityLocus('Spotting varies a great deal between rays; trade names (orange, blue, marbled) have no documented inheritance.')],
    phenotypes: [
      { id: 'wild', name: 'Motoro Stingray', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#f08a1c', patternContrast: 1 }, 'Bright-eyed'),
    ],
    baseVisual: {
      bodyColor: '#6b5a46',
      bodyColor2: '#5a4a3a',
      bellyColor: '#ebe7de',
      finColor: '#5f5040',
      finColor2: '#141210',
      accentColor: '#e8962a',
      eyeColor: '#3a3226',
      pattern: 'spots',
      patternScale: 0.8,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0,
      finType: 'ray',
      finLength: 1,
      bodyDepth: 0.3,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Colour slots for the ray art: body = the grey-brown disc; accent = the orange-yellow centres of the eyespots, fin2 = their black rings; belly = the white underside. A round disc whose edge ripples, eyes on top, and a tail with a barbed spine.',
  },
  visualMorphs: ['Motoro Stingray'],

  behaviorSet: 'stingray',
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 3, turnRate: 1.2, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.8, hitching: 0, burrowing: 0.6, glassSurfing: 0.15, curiosity: 0.7, nocturnal: 0.6 },
  specialBehaviors: ['sand_bury', 'disc_glide', 'glass_climb_beg', 'pin_food', 'sting_shed', 'night_forage'],

  encyclopedia: {
    summary: 'A freshwater stingray: a round, grey-brown disc covered in orange eyespots ringed with black, that glides over the sand and buries itself with only its eyes showing.',
    nativeHabitat: 'Sandy beds of the rivers and lakes of the Amazon, Orinoco and Paraná basins, where it digs for snails, worms, crustaceans and small fish.',
    socialStructure: 'Lives alone or in a loose pair; a male can share a tank with several females, never with another male.',
    tankNeeds: 'A tank of 500 gallons or more with a wide floor (three feet front to back), deep soft sand, nothing sharp, very clean, soft, warm water and a tight lid. For experts only.',
    compatibilityNotes: 'Eats any small fish, shrimp, snail or frog on the bottom. Good with big fish that keep off the floor, such as arowanas, bichirs and big, calm cichlids; never plecos, which latch onto its disc, or a fahaka.',
    breedingOverview: 'Live-bearing: one to eight independent pups after about two and a half months. The male bites the female’s disc while courting.',
    conservationNote: 'Least Concern (IUCN 2024) and listed by CITES. Venomous, and banned or restricted in several US states: check the law where you live.',
    funFact: 'It sheds its tail spine every few months, and the dropped spine stays venomous: keepers check the sand before putting a hand in.',
    inGameBehavior: 'Glides over the floor rippling the edge of its disc, buries itself in the sand to rest with only its eyes showing, and comes to the front glass to beg at feeding time.',
    feedingNote: 'Seafood, earthworms and big frozen foods two or three times a day, dropped where it can reach them; no feeder fish.',
    keeperTip: 'Never put a hand in the sand: a buried ray, or a shed spine, can sting.',
  },
  sourceReferences: [
    { id: 'fishbase-potamotrygon-motoro', title: 'FishBase — Potamotrygon motoro (Ocellate river stingray)', url: 'https://www.fishbase.se/summary/Potamotrygon-motoro.html', tier: 1, facts: ['50 cm disc width max', '24–26 °C', 'IUCN Least Concern (2024)'] },
    { id: 'adw-potamotrygon-motoro', title: 'Animal Diversity Web — Potamotrygon motoro', url: 'https://animaldiversity.org/accounts/Potamotrygon_motoro/', tier: 1, facts: ['up to 15 years in captivity', 'young about 97 mm long at birth', 'nourished by uterine milk'] },
    { id: 'usfws-erss-motoro', title: 'USFWS — Ecological Risk Screening Summary: Ocellate river stingray', url: 'https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Ocellate-River-Stingray.pdf', tier: 1, facts: ['mature at about 3 years and a 30–35 cm disc', 'banned or restricted in AZ, CA, GA, MS, NV, OK, TX; conditional in FL', 'risk category High'] },
    { id: 'loboda-2013-motoro', title: 'Loboda & Carvalho 2013 — Revision of Potamotrygon motoro (Neotropical Ichthyology 11)', url: 'https://www.scielo.br/j/ni/a/RTXCjMdVqjkBcw4yQHcxrRj/abstract/?lang=en', tier: 1, facts: ['tricoloured, evenly spaced eyespots wider than the eye'] },
    { id: 'oata-cites-potamotrygon', title: 'OATA — CITES listing of Potamotrygon (2016)', url: 'https://ornamentalfish.org/8902/', tier: 2, facts: ['CITES Appendix III from 3 January 2017: Brazil’s and Colombia’s rays'] },
    { id: 'seriouslyfish-potamotrygon-motoro', title: 'Seriously Fish — Potamotrygon motoro', url: 'https://www.seriouslyfish.com/species/potamotrygon-motoro/', tier: 2, facts: ['about 50 cm across', '240×90×75 cm for an adult or pair', 'soft sand to bury in', '1–8 pups after 9–12 weeks', 'rest the female after 2–3 litters', 'sheds its spine'] },
    { id: 'fishkeeper-motoro', title: 'Fishkeeper (Maidenhead Aquatics) — Motoro stingray', url: 'https://www.fishkeeper.co.uk/fish/freshwater/miscellaneous/motoro-stingray', tier: 2, facts: ['floor area matters more than height', '1–8 pups after 2–3 months'] },
    { id: 'aquaticsunlimited-motoro', title: 'Aquatics Unlimited — Motoro stingray', url: 'https://aquaticsunlimited.com/product/misc-stingray-motoro-potamotrygon-motoro', tier: 2, facts: ['$299.99–499.99 for 4–6 in juveniles', 'a tank 36 in wide and 90 in+ long'] },
  ],
  confidenceNotes: [
    'Gestation: 9–12 weeks (Seriously Fish), 2–3 months (Fishkeeper); the game uses about 75 days. Wild females carry longer.',
    'ADW’s 39 and 44 cm are the disc widths at which males and females mature, not their adult size.',
    'Its US legal status changes; the states named follow USFWS (rules as of 2013–2020).',
  ],
  exceptionRules: [
    { other: 'tag:pleco', verdictFloor: 'high_risk', reason: 'Suckermouth catfish latch onto a ray’s disc and rasp it raw.', incidentRisk: 0.15 },
    { other: 'discus', verdictFloor: 'conditional', reason: 'Some keepers lose discus to rays at night, and discus want warmer water.', incidentRisk: 0.05, mitigatedBy: ['tank_size'] },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'A fahaka bites chunks out of tankmates, and a ray resting on the floor can’t escape.', incidentRisk: 0.4 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'Rays hunt small fish on and near the bottom, mostly at night.', incidentRisk: 0.3 },
    // the small bottom fish (the research's row): its natural prey
    ...['panda_corydoras', 'kuhli_loach', 'otocinclus', 'hillstream_loach'].map((other) => ({ other, verdictFloor: 'high_risk' as const, reason: 'Bottom fish are its natural prey.', incidentRisk: 0.2, mitigatedBy: ['hides' as const] })),
    { other: 'tag:snail', verdictFloor: 'incompatible', reason: 'Rays crunch snails: a favourite food.', incidentRisk: 0.3 },
    { other: 'koi', verdictFloor: 'incompatible', reason: 'Koi need cool, hard, alkaline water; a ray needs warm, soft, acid water.' },
    { other: 'freshwater_angelfish', verdictFloor: 'conditional', reason: 'A ray can catch a sleeping angelfish on the floor at night.', incidentRisk: 0.03, mitigatedBy: ['tank_size'] },
    { other: 'oscar', verdictFloor: 'conditional', reason: 'A big, boisterous cichlid stresses a ray and steals its food: only in a very large tank.', incidentRisk: 0.03, mitigatedBy: ['tank_size', 'target_feeding'] },
    { other: 'clown_loach', verdictFloor: 'conditional', reason: 'Young loaches are prey, and adults compete for food on the floor.', incidentRisk: 0.03, mitigatedBy: ['hides'] },
    { other: 'black_ghost_knifefish', verdictFloor: 'conditional', reason: 'Both forage the floor at night, and a young knifefish is prey.', incidentRisk: 0.03, mitigatedBy: ['tank_size'] },
    { other: 'silver_arowana', verdictFloor: 'usually_compatible', reason: 'The classic pairing: the arowana keeps to the surface, the ray to the floor.', incidentRisk: 0.01 },
    { other: 'ornate_bichir', verdictFloor: 'usually_compatible', reason: 'Bichirs share a big floor with rays; both eat at night, so feed each in its place.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
  ],
  special: { venomous: true, escapeArtist: true, burrower: true, heavyWaste: true, needsSinkingFood: true, outgrowsSmallTanks: true, maleSizeFactor: 0.9 },
  visualLane: 'special',
};
