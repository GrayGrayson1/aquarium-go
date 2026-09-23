import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Skunk cleaner shrimp — Lysmata amboinensis. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#skunk-cleaner-shrimp
 */
export const cleanerShrimp: SpeciesDefinition = {
  id: 'cleaner_shrimp',
  commonName: 'Skunk Cleaner Shrimp',
  scientificName: 'Lysmata amboinensis',
  category: 'invertebrate',
  group: 'marine_shrimp',
  genus: 'Lysmata',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific and Red Sea coral reefs, usually in caves and under ledges 5–40 m deep',
  isStarter: false,

  // Body 5–6 cm (Wikipedia/LiveAquaria), plus long white antennae.
  adultSizeCm: 6,
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.3,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025 (invertebrates want full-strength seawater).
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.022, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'pellet_sinking', 'flake', 'detritus'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.55,
  feedingAggression: 0.35,
  hungerHours: 16,

  activityZone: ['lower', 'bottom', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.2,
  aggression: 0.02,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'pair', minGroup: 1, idealGroup: 2, note: 'Lives in pairs at cleaning stations in the wild. Fine alone; pairs or small groups work in roomier tanks.' },
  sameSpeciesRule: {
    maleMale: 'ok',
    femaleFemale: 'ok',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Simultaneous hermaphrodites, so any two adults can pair. Crowded groups may squabble over a single station or food.',
  },

  predatorTags: ['copepod', 'worm'],
  preyTags: ['shrimp_large', 'crustacean'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0.02,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs caves and overhangs in live rock to set up a station and to hide while moulting.' },

  breeding: {
    system: 'shrimp_larval_marine',
    difficulty: 0.95,
    maturityDays: 18,
    // Wikipedia/aquaculture reports: 200–500 eggs carried under the abdomen.
    clutchSize: { min: 200, max: 500 },
    // Eggs are carried ~2 weeks between moults → ~12 real days × 8 (moderate confidence).
    incubationHours: 96,
    // Larval life ~5–6 months through ~14 zoeal stages — the whole reason commercial culture is so hard.
    fryRearingHours: 480,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTempC: 24, minTankGallons: 20 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 3,
    notes: 'Every adult is both male and female. After moulting, one shrimp mates in the female role and carries green eggs under its tail; they hatch at night about two weeks later. The larvae drift for five to six months through about 14 stages and almost never survive in a home aquarium, so in-tank broods are usually just plankton for the fish.',
  },
  sexSystem: 'simultaneous_hermaphrodite',
  parentalCare: 'female',
  // ~2–3 years typical in aquaria → ~100 game-days.
  lifecycle: { juvenileDays: 14, adultDays: 18, lifespanDays: 110, sexVisibleAtDays: 14, hatchSizeCm: 0.2 },

  hardiness: 0.6,
  difficulty: 'beginner',
  baseValue: 40,
  rarity: 'common',
  visitorAppeal: 0.85,
  unlock: { requires: ['marine_basics'], hint: 'Unlocks with beginner marine fish and clean-up crew.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Almost all skunk cleaner shrimp in the trade are wild-collected: the 5–6 month larval stage defeats most commercial hatcheries.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed by the IUCN. Because captive breeding is so difficult, trade animals come from wild reefs — keep them well so each one lives its full life.',
  },

  genetics: {
    loci: [intensityLocus('No colour morphs exist. Individuals vary a little in how deep the red bands are.')],
    phenotypes: [
      { id: 'wild', name: 'Skunk Cleaner', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor2: '#c01f1c', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#e9a23b',
      bodyColor2: '#c9322a',
      bellyColor: '#f2c46d',
      finColor: '#e0452f',
      finColor2: '#ffffff',
      accentColor: '#fbfbf7',
      eyeColor: '#3a1a14',
      pattern: 'lateral_stripe',
      patternScale: 1,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.35,
      finType: 'shrimp_lysmata',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.1,
    notes: 'Golden-orange flanks, a broad red band along each side of the back, and a crisp white stripe running from the antennae to the tail fan (which carries white spots). Long white antennae. No morphs — one base phenotype plus small individual variation.',
  },
  visualMorphs: ['Skunk Cleaner (no morphs; individual variation)'],

  behaviorSet: 'shrimp_cleaner',
  behaviorTraits: { cruiseSpeed: 0.4, burstSpeed: 3, turnRate: 2, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.7, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.6, nocturnal: 0.35 },
  specialBehaviors: ['cleaning_station', 'leg_rock_signal', 'antenna_wave', 'client_mouth_clean', 'hand_clean', 'molt'],

  encyclopedia: {
    summary: 'The reef’s medic: a red-and-white striped shrimp that runs a cleaning station where fish queue up to be groomed.',
    nativeHabitat: 'Caves, ledges and coral outcrops on Indo-Pacific and Red Sea reefs, where pairs hold a fixed station that fish visit.',
    socialStructure: 'Usually lives in pairs. Every adult is a simultaneous hermaphrodite, so any two can mate.',
    tankNeeds: 'A cycled marine tank of 20 gallons or more with rock caves, stable full-strength salinity and iodine for moulting. Never dose copper — it is lethal to shrimp.',
    compatibilityNotes: 'Peaceful and reef-safe. Lionfish, groupers, hawkfish, triggers and mantis shrimp eat it. It will not bother corals, snails or fish.',
    breedingOverview: 'Shrimp carry green eggs under the tail and release larvae at night every few weeks, but the larvae drift for about half a year and almost never survive in aquaria.',
    conservationNote: 'Not assessed by the IUCN. Nearly all are wild-caught because larval rearing is so hard, which makes good care especially important.',
    funFact: 'Cleaners rock their white legs side to side as a "don’t eat me, I’m your cleaner" signal — and do it far more often when the client is a predator.',
    inGameBehavior: 'Holds a station on the rockwork, rocks its legs, and climbs over visiting fish to pick them clean. It will even try to clean your hand.',
  },
  sourceReferences: [
    { id: 'liveaquaria-skunk-cleaner', title: 'LiveAquaria — Scarlet Skunk Cleaner Shrimp', url: 'https://www.liveaquaria.com/product/696/?pcatid=696', tier: 2, facts: ['cleaning stations', 'reef compatible', '72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025', 'intolerant of copper and high nitrate', 'iodine for moulting', 'avoid hawkfish, lionfish, predatory shrimp, crabs', 'price ~$45'] },
    { id: 'caves-2019-leg-rocking', title: 'Caves, Chen & Johnsen (2019) The cleaner shrimp Lysmata amboinensis adjusts its behaviour towards predatory versus non-predatory clients. Biology Letters', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6769148/', tier: 1, facts: ['lives in pairs at cleaning stations', 'simultaneous hermaphrodite', 'leg rocking more often toward predatory clients', 'predators cleaned less often'] },
    { id: 'vaughan-2018-cleaner-biocontrol', title: 'Vaughan, Grutter & Hutson (2018) Cleaner shrimp are a sustainable option to treat parasitic disease in farmed fish. Scientific Reports', url: 'https://www.nature.com/articles/s41598-018-32293-6', tier: 1, facts: ['L. amboinensis removes fish parasites', 'reduces free-living parasite stages'] },
    { id: 'wikipedia-lysmata-amboinensis', title: 'Wikipedia — Lysmata amboinensis (summarising primary literature)', url: 'https://en.wikipedia.org/wiki/Lysmata_amboinensis', tier: 3, facts: ['body 5–6 cm', 'rocking dance', 'starts male then becomes hermaphrodite', '200–500 eggs', 'larvae 14 stages over 5–6 months', 'difficult to culture'] },
    { id: 'sealifebase-lysmata-amboinensis', title: 'SeaLifeBase — Lysmata amboinensis', url: 'https://www.sealifebase.se/summary/Lysmata-amboinensis.html', tier: 1, facts: ['Indo-Pacific', 'depth range', 'IUCN Not Evaluated'] },
  ],
  confidenceNotes: [
    'High confidence: cleaning behaviour, pair living, hermaphroditism, wild-caught trade, copper sensitivity.',
    'Egg-carrying time (~2 weeks) comes from hobby breeding reports rather than a primary paper; moderate confidence.',
    'SeaLifeBase’s generic decapod text says "mostly gonochoric"; the species-specific literature (Caves et al. 2019) confirms simultaneous hermaphroditism, which is used here.',
    'Lifespan in aquaria (~2–3 years) is a care-sheet estimate.',
  ],
  exceptionRules: [
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Mantis shrimp hunt shrimp; a cleaner will be struck and eaten.', incidentRisk: 0.5 },
    { other: 'dwarf_lionfish', verdictFloor: 'high_risk', reason: 'Lionfish readily eat ornamental shrimp. Some cleaners survive by servicing the lionfish, but losses are common.', incidentRisk: 0.15, mitigatedBy: ['hides'] },
    { other: 'miniatus_grouper', verdictFloor: 'high_risk', reason: 'Wild groupers visit cleaning stations, but a hungry grouper in a tank often eats its cleaner.', incidentRisk: 0.12, mitigatedBy: ['hides'] },
  ],
  special: {
    medicationSensitive: true,
  },
  visualLane: 'special',
  positiveInteractions: [
    { other: 'tag:fish_medium', text: 'Runs a cleaning station: mid-sized fish pause and let it pick off parasites and dead skin.' },
    { other: 'tag:fish_large', text: 'Large fish such as tangs and groupers hold still, gills flared, while the shrimp cleans them — even inside the mouth.' },
  ],
};
