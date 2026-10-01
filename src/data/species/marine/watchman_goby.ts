import type { SpeciesDefinition } from '@/types';

/**
 * Yellow watchman goby (yellow prawn-goby) — Cryptocentrus cinctus. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#yellow-watchman-goby
 */
export const watchmanGoby: SpeciesDefinition = {
  id: 'watchman_goby',
  commonName: 'Yellow Watchman Goby',
  scientificName: 'Cryptocentrus cinctus',
  category: 'fish',
  group: 'goby',
  genus: 'Cryptocentrus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Pacific — Yaeyama Islands (Japan) to Singapore and the southern Great Barrier Reef; Palau and Chuuk',
  isStarter: false,

  // FishBase max 10 cm SL; LiveAquaria/Aquatics Unlimited ~4 in.
  adultSizeCm: 10,
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1,

  // FishBase 22–28 °C; retailers 72–78 °F, SG 1.020–1.025, pH 8.1–8.4.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_sinking', 'pellet_small'],
  feedingStyle: 'bottom',
  feedingSpeed: 0.55,
  feedingAggression: 0.35,
  hungerHours: 14,

  activityZone: ['bottom', 'substrate', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.6,
  aggression: 0.1,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.4, note: 'One per tank, or a mated pair sharing a burrow. Defends its burrow from other bottom-dwelling gobies.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'courtship_ok',
    juvenile: 'tension',
    note: 'Unpaired watchman gobies squabble over burrows; a male–female pair can share one.',
  },

  predatorTags: ['copepod', 'worm', 'shrimp_fry'],
  preyTags: ['fish_medium', 'fish_benthic'],
  maxLikelyPreySizeCm: 1.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0.03,
  anemoneRelationship: 'avoids',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'fine_sand', 'aragonite'], avoid: ['bare', 'large_pebbles'], note: 'Needs a sand bed several centimetres deep with rubble to build a burrow under rock. Its digging can bury corals placed on the sand.' },

  breeding: {
    system: 'cave_spawner',
    difficulty: 0.8,
    maturityDays: 14,
    clutchSize: { min: 200, max: 1000 },
    // Eggs laid inside the burrow and guarded; hatch in about 4–5 days (hobby/aquaculture reports) → ~4.5 × 8.
    incubationHours: 36,
    fryRearingHours: 300,
    cooldownDays: 7,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 24, minTankGallons: 30 },
    predationWithoutNursery: 0.99,
    nurseryRequired: true,
    maxRaisedPerClutch: 5,
    notes: 'Pairs spawn inside their burrow, where the eggs are guarded until they hatch into planktonic larvae. Some farms now produce captive-bred watchman gobies, but larval rearing is still demanding.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // ~5 years in aquaria → ~200 game-days.
  lifecycle: { juvenileDays: 11, adultDays: 14, lifespanDays: 200, sexVisibleAtDays: 16, hatchSizeCm: 0.25 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 45,
  rarity: 'common',
  visitorAppeal: 0.7,
  unlock: { requires: ['marine_basics'], hint: 'Research Marine Systems to unlock beginner marine fish.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most are wild-collected, but tank-raised yellow and grey watchman gobies are sold (e.g. Aquatics Unlimited).',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2020)',
    note: 'Common in sandy lagoons across the western Pacific. Tank-raised fish are available and should be preferred.',
  },

  genetics: {
    loci: [
      {
        id: 'phase',
        name: 'Colour phase',
        mode: 'mendelian',
        alleles: [
          { id: 'Y', name: 'Yellow', dominance: 2, frequency: 0.8 },
          { id: 'g', name: 'Grey', dominance: 1, frequency: 0.2 },
        ],
        note: 'FishBase describes two natural colour phases — yellow, or whitish-grey with 4–5 dusky bars — and both are sold (sometimes from captive stock). The real basis is unknown; modelled as a simple recessive grey.',
      },
    ],
    phenotypes: [
      { id: 'grey', name: 'Grey Watchman', layer: 'base', rarity: 0.25, when: [{ locus: 'phase', allele: 'g', count: 'hom' }], visual: { bodyColor: '#c9c6bb', bodyColor2: '#8f8a7e', bellyColor: '#e2ded3', finColor: '#b9b4a6', pattern: 'bars', patternContrast: 0.55, accentColor: '#4fb0f0' } },
      { id: 'yellow', name: 'Yellow Watchman', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#f2c52a',
      bodyColor2: '#e0a91a',
      bellyColor: '#f7da6a',
      finColor: '#f0c02c',
      finColor2: '#3aa3e6',
      accentColor: '#4fb0f0',
      eyeColor: '#c99a2a',
      pattern: 'spots',
      patternScale: 0.8,
      patternContrast: 0.8,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.1,
      finType: 'goby_watchman',
      finLength: 1,
      bodyDepth: 0.95,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'Stocky, big-headed goby with high-set eyes and a downturned "frowning" mouth. Lemon-yellow body; bright electric-blue spots on the head, cheeks and fins; faint darker saddles. The grey phase is pale grey-white with 4–5 dusky bars and the same blue spots.',
  },
  visualMorphs: ['Yellow Watchman', 'Grey Watchman'],

  behaviorSet: 'goby_burrow',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 5, turnRate: 3, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.9, hitching: 0, burrowing: 0.6, glassSurfing: 0, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['burrow_sentry', 'burrow_dig', 'shrimp_partner', 'tail_flick_warning', 'perch_on_rock', 'pounce_feed'],

  encyclopedia: {
    summary: 'A frowning yellow sentinel that perches at the mouth of its burrow — and in the wild shares it with a nearly blind pistol shrimp.',
    nativeHabitat: 'Sandy and silty bottoms of lagoons and sheltered bays, 1–25 m deep, living in burrows dug by alpheid pistol shrimp.',
    socialStructure: 'Lives alone or as a mated pair, often in partnership with one or two pistol shrimp.',
    tankNeeds: 'A 30-gallon or larger tank with a deep sand bed, rubble and rock to burrow under, and a tight lid — startled gobies can jump.',
    compatibilityNotes: 'Peaceful and reef-safe, but guards its burrow from other bottom gobies. May eat very small shrimp. Its digging can bury corals placed on the sand.',
    breedingOverview: 'Pairs spawn inside the burrow and guard the eggs. The larvae drift as plankton; tank-raised fish are produced in small numbers.',
    conservationNote: 'Least Concern (IUCN 2020). Tank-raised fish are available and a good choice.',
    funFact: 'Outside the burrow, the pistol shrimp keeps one antenna on the goby. When danger approaches, the goby flicks its tail — a touch-signal that sends the shrimp diving back into the burrow.',
    inGameBehavior: 'Perches at its burrow entrance on its pelvic fins, scans the tank with swivelling eyes, pounces on sinking food, and bolts headfirst into its hole when startled.',
    feedingNote: 'Pounces on food sinking past its burrow: thawed mysis and brine shrimp plus small or sinking pellets, once or twice a day. An autofeeder works if its pellets sink before faster fish grab them all.',
    keeperTip: 'Set rockwork directly on the glass before adding sand. A burrowing goby, and any pistol shrimp partner, can dig the sand out from under rocks and topple them.',
  },
  sourceReferences: [
    { id: 'fishbase-cryptocentrus-cinctus', title: 'FishBase — Cryptocentrus cinctus (Yellow prawn-goby)', url: 'https://www.fishbase.se/summary/Cryptocentrus-cinctus.html', tier: 1, facts: ['max 10 cm SL', 'sandy lagoons 1–25 m', '22–28 °C', 'yellow or whitish colour phases with 4–5 dusky bars', 'lives in burrows with alpheid shrimps', 'IUCN Least Concern (2020)'] },
    { id: 'aquatics-unlimited-cb-watchman', title: 'Aquatics Unlimited — Watchman Goby Gray/Yellow, captive bred', url: 'https://aquaticsunlimited.com/product/goby-tank-raised-watchman-gray-yellow-cryptocentrus-cinctus/', tier: 2, facts: ['tank-raised yellow and grey forms', 'adult ~4 in', 'min 30 gal', '72–78 °F', 'pairs with tiger pistol shrimp Alpheus bellulus', 'lid recommended', 'price $45–60'] },
    { id: 'manera-2025-goby-shrimp', title: 'Manera et al. (2025) Boat noise alters individual behaviors but not communication between partners in a fish–shrimp mutualism. Behavioral Ecology (PMC12527286)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12527286/', tier: 1, facts: ['shrimp excavate and maintain the shared burrow', 'goby acts as sentinel', 'tactile fin-flick warnings detected by shrimp antennae'] },
    { id: 'karplus-1979-tactile', title: 'Karplus (1979) The tactile communication between Cryptocentrus steinitzi and Alpheus purpurilenticularis. Z. Tierpsychologie', url: 'https://onlinelibrary.wiley.com/doi/10.1111/j.1439-0310.1979.tb00286.x', tier: 1, facts: ['warning tail flicks transmitted via antenna contact', 'no warnings without contact'] },
  ],
  confidenceNotes: [
    'High confidence: size, burrow mutualism with alpheid shrimp, colour phases, IUCN status.',
    'Incubation (~4–5 days) and clutch size are drawn from general goby aquaculture reports (moderate confidence).',
    'Karplus (1979) is cited from its abstract (search index); the mutualism details are confirmed by the open-access Manera et al. (2025).',
    'The pistol shrimp partner is not in the launch roster; the partnership is recorded in special.hostNote.',
  ],
  exceptionRules: [],
  special: {
    burrower: true,
    escapeArtist: true,
    hostNote: 'Optional partner: a pistol shrimp such as the tiger pistol shrimp (Alpheus bellulus) or Randall’s pistol shrimp (A. randalli) digs and maintains the burrow while the goby stands guard. Not required for good health.',
  },
  visualLane: 'fish',
};
