import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Silver mono — Monodactylus argenteus. Lane brackish, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/brackish.md#silver-mono
 * No trade forms. Young are yellow-finned with two black bars on the head (the art's young colours); adults are silver
 * diamonds. Juveniles live in near-fresh estuaries and adults move to sea water, so one salinity range spans both.
 */
export const silverMono: SpeciesDefinition = {
  id: 'silver_mono',
  commonName: 'Silver Mono',
  scientificName: 'Monodactylus argenteus',
  category: 'fish',
  group: 'moony',
  genus: 'Monodactylus',
  environment: 'brackish',
  waterClasses: ['brackish', 'marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The Indo-West Pacific, from the Red Sea and East Africa to Samoa, in mangrove estuaries, harbours and the lower reaches of rivers',
  isStarter: false,

  // FishBase 27 cm SL; Fishes of Australia 25 cm SL; 10 in in aquaria (LiveAquaria, Aquatics Unlimited).
  adultSizeCm: 25,
  // the game's choice for a school of five or six fast, 25 cm fish: above the sources (Aquatics Unlimited 150+ gal as
  // they grow, LiveAquaria 130, a shop blog about 106 gal for five)
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 3,

  // FishBase 24–28 °C; Aquatics Unlimited 24–29; LiveAquaria 22–26.
  tempC: { min: 22, max: 30, idealMin: 24, idealMax: 28 },
  pH: { min: 7, max: 8.5, idealMin: 7.6, idealMax: 8.3 },
  // the game's synthesis of a life that moves from near-fresh estuaries (juveniles) to sea water (adults, SG 1.018–1.025)
  salinitySG: { min: 1.003, max: 1.025, idealMin: 1.01, idealMax: 1.022 },
  gh: { min: 10, max: 25 },
  kh: { min: 8, max: 14 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'brine_shrimp', 'mysis', 'bloodworm', 'nori', 'vegetable'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.85,
  feedingAggression: 0.6,
  hungerHours: 20,

  activityZone: ['middle', 'upper'],
  temperament: 'semi_aggressive',
  territoriality: 0.3,
  aggression: 0.25,
  finNipper: 0.1,
  hasLongFins: false,
  social: { kind: 'school', minGroup: 5, idealGroup: 7, note: 'A school of five or more, all added together; a lone or paired mono is nervous and gets its fins torn.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'ok', juvenile: 'ok', note: 'The school keeps a pecking order and adults jostle; bigger numbers spread it out.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod', 'worm', 'fish_tiny'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 2.5,

  shrimpSafe: 'caution',
  snailSafe: 'safe',
  frySafe: 'unsafe',
  plantSafe: 'caution',
  reefSafe: 'mostly_safe',
  coralRisk: 0.1,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Open swimming space with some roots or rock to swim round; aragonite sand helps keep the pH up.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    // Lm 13 cm (FishBase); the age isn't documented
    maturityDays: 18,
    // 4,040 eggs in the one hatchery report (ICAR-CIBA 2019)
    clutchSize: { min: 3000, max: 10000 },
    // 18–20 h at about 28 °C (ICAR-CIBA)
    incubationHours: 6,
    fryRearingHours: 240,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Not bred in home aquariums. A government hatchery in India first bred it in 2019, with a hormone injection, in sea water, rearing the larvae on rotifers and copepods. Trade fish are wild-caught juveniles.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 8–12 years (a shop blog) → 400; the sexes look alike; larvae 1.6 mm (ICAR-CIBA)
  lifecycle: { juvenileDays: 18, adultDays: 20, lifespanDays: 400, sexVisibleAtDays: 400, hatchSizeCm: 0.16 },

  hardiness: 0.8,
  difficulty: 'intermediate',
  // Aquatics Unlimited $29.99; LiveAquaria $65.99
  baseValue: 30,
  rarity: 'uncommon',
  visitorAppeal: 0.82,
  unlock: { requires: ['brackish'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Almost all monos sold are wild-collected juveniles.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2016)', note: 'Common in estuaries across the Indo-Pacific; the loss of mangroves is the main threat to estuary fish.' },

  genetics: {
    loci: [intensityLocus('No trade forms; individuals vary in how much yellow stays on the fins.')],
    phenotypes: [
      { id: 'wild', name: 'Silver Mono', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ finColor: '#f0cc4a', patternContrast: 1 }, 'Gold-finned'),
    ],
    baseVisual: {
      bodyColor: '#d8dde0',
      bodyColor2: '#b7c0c6',
      bellyColor: '#eef1f2',
      finColor: '#e6c24a',
      finColor2: '#1a1a1a',
      accentColor: '#1c1c1c',
      eyeColor: '#2a2a2a',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.5,
      patternSeed: 0,
      iridescence: 0.35,
      metallic: 0.65,
      translucency: 0.1,
      finType: 'mono',
      finLength: 1.3,
      bodyDepth: 1.15,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the mono art: body = the bright silver; fin = the yellow of the dorsal and anal fins, fin2 = their black tips; accent = the two black bars through the eye and behind the gill cover, bold in young fish and faint in adults. A tall diamond with long dorsal and anal lobes and tiny pelvic fins.',
  },
  visualMorphs: ['Silver Mono'],

  behaviorSet: 'chromis',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 7, turnRate: 3, hoverTendency: 0.35, schoolingTightness: 0.7, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.1, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['tight_school', 'flash_turn', 'startle_jump', 'surface_feed'],

  encyclopedia: {
    summary: 'A bright silver diamond of a fish with yellow-tipped fins that flashes about in a tight school.',
    nativeHabitat: 'Mangrove estuaries, harbours and river mouths across the Indo-Pacific: the young in near-fresh water, the adults out to sea.',
    socialStructure: 'A school with a pecking order: five or more, added together.',
    tankNeeds: 'A six-foot tank of 180 gallons or more for a school, brackish water for young fish that is raised to sea water as they grow, open swimming room and a lid.',
    compatibilityNotes: 'The classic partner of the spotted scat; good with archerfish and mollies while young. Too fast and boisterous for tiny gobies, and it can share a fish-only marine tank as an adult.',
    breedingOverview: 'Not bred in home aquariums; a hatchery in India first managed it in 2019.',
    conservationNote: 'Least Concern (IUCN 2016).',
    funFact: 'Its genus name means “one finger”: its pelvic fins have shrunk to tiny stubs.',
    inGameBehavior: 'Flashes round the middle of the tank in a tight school, turning together and bolting at a fright.',
    feedingNote: 'Flakes, small pellets, frozen brine shrimp and mysis, with greens such as seaweed; twice a day for young fish.',
    keeperTip: 'Raise the salinity slowly as the school grows: young monos live in near-fresh water, adults in the sea.',
  },
  sourceReferences: [
    { id: 'fishbase-monodactylus-argenteus', title: 'FishBase — Monodactylus argenteus (Silver moony)', url: 'https://www.fishbase.se/summary/Monodactylus-argenteus.html', tier: 1, facts: ['27 cm SL max', 'marine, brackish and fresh', '24–28 °C', 'Lm 13 cm', 'IUCN Least Concern (2016)'] },
    { id: 'foa-monodactylus-argenteus', title: 'Fishes of Australia — Monodactylus argenteus', url: 'https://fishesofaustralia.net.au/home/species/581', tier: 1, facts: ['25 cm SL', 'juveniles enter fresh streams', 'young with two black bars and yellow fins'] },
    { id: 'ciba-2019-mono-breeding', title: 'Thomas et al. (ICAR-CIBA) 2019 — First captive breeding of the silver moony (WAS Asian-Pacific Aquaculture)', url: 'https://was.org/Meeting/Program/PaperDetail/153808', tier: 1, facts: ['hormone-induced spawning in sea water', '4,040 eggs', 'hatch in about 18 h at 28 °C'] },
    { id: 'liveaquaria-mono', title: 'LiveAquaria — Mono Argentus', url: 'https://www.liveaquaria.com/product/996/?pcatid=996', tier: 2, facts: ['10 in', '130 gal minimum', 'adults at SG 1.020–1.025', 'small fish can live in fresh water', '$65.99'] },
    { id: 'aquaticsunlimited-mono', title: 'Aquatics Unlimited — Mono argentus', url: 'https://aquaticsunlimited.com/product/brackish-mono-argentus-monodactylus-argenteus/', tier: 2, facts: ['90 gal for a small group, 150+ as they grow', 'keep at least six, added together', '$29.99'] },
    { id: 'gensou-mono', title: 'Gensou — Silver mono care', url: 'https://gensou.sg/?p=33043', tier: 3, facts: ['juveniles fresh to SG 1.005, adults 1.018–1.025', 'a school of five or more, ideally seven', '8–12 years'] },
  ],
  confidenceNotes: [
    'Salinity: one range spans the young’s near-fresh water and the adults’ sea water; its bounds are the game’s synthesis of the sources, not a figure from any of them.',
    'Tank: 180 gallons is the game’s choice for a school of 25 cm fish, above every source (130–150 gal).',
    'Lifespan (8–12 years) comes from a shop blog (Tier 3).',
  ],
  exceptionRules: [
    { other: 'figure_eight_puffer', verdictFloor: 'conditional', reason: 'The puffer nips fins and wants lower salinity than grown monos.', incidentRisk: 0.05 },
    { other: 'bumblebee_goby', verdictFloor: 'high_risk', reason: 'A tiny goby is outcompeted, may be eaten, and wants near-fresh water.', incidentRisk: 0.1, mitigatedBy: ['hides'] },
    { other: 'tag:fish_tiny', verdictFloor: 'high_risk', reason: 'A school of adult monos eats fish small enough to swallow.', incidentRisk: 0.15 },
  ],
  special: { escapeArtist: true, outgrowsSmallTanks: true },
  visualLane: 'fish',
};
