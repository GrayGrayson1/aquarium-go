import type { SpeciesDefinition } from '@/types';

/**
 * Figure-eight puffer — Dichotomyctere ocellatus (syn. Tetraodon biocellatus). Lane brackish.
 * Sources, key values and conflicts: docs/research/brackish.md.
 * Visual mapping: bodyColor = dark olive ground on the back, accentColor = the yellow-green vermiculation and the
 * looping "figure-eight" ocelli, bellyColor = the white belly, eyeColor = the gold-green iris.
 */
export const figureEightPuffer: SpeciesDefinition = {
  id: 'figure_eight_puffer',
  commonName: 'Figure-eight Puffer',
  scientificName: 'Dichotomyctere ocellatus',
  category: 'fish',
  group: 'puffer',
  genus: 'Dichotomyctere',
  environment: 'brackish',
  waterClasses: ['brackish'],
  nativeRegion: 'South-east Asia — lowland rivers and coastal waters of Indochina (lower Mekong), Peninsular Malaysia, Borneo and Indonesia',
  isStarter: false,

  // FishBase 8 cm TL; Seriously Fish 80 mm SL; Puffer Forum ~7.5 cm.
  adultSizeCm: 8,
  // Puffer Forum: 15 gal for one + 10 per extra; Seriously Fish base 75×30 cm (~18 gal).
  recommendedMinTankGallons: 15,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 1.6,

  // FishBase/SF 22–26 °C (wild, fresh), Wikipedia 24–28 °C; pH 6.5–7.5 (FishBase, wild) to ~8 in brackish (PF).
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 27 },
  pH: { min: 6.8, max: 8.4, idealMin: 7.3, idealMax: 8.2 },
  // SF: can be kept fresh but lives longer at ~1.005; Wikipedia/PF: low-end brackish 1.005–1.008 (see confidenceNotes).
  salinitySG: { min: 1.002, max: 1.012, idealMin: 1.004, idealMax: 1.008 },
  gh: { min: 8, max: 25 },
  kh: { min: 8, max: 18 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['snail_live', 'bloodworm', 'mysis', 'brine_shrimp', 'daphnia', 'earthworm'],
  feedingStyle: 'hunter',
  feedingSpeed: 0.6,
  feedingAggression: 0.6,
  hungerHours: 20,

  activityZone: ['middle', 'lower', 'decor', 'glass'],
  temperament: 'semi_aggressive',
  territoriality: 0.55,
  aggression: 0.5,
  finNipper: 0.75,
  hasLongFins: false,
  social: {
    kind: 'solitary_or_pair',
    minGroup: 1,
    idealGroup: 1,
    maxPer10Gallons: 0.8,
    note: 'Happiest alone. Puffers raised together can share a big, well-broken-up tank (about 10 extra gallons each); crowded puffers nip one another.',
  },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'harassment',
    juvenile: 'ok',
    note: 'Aggressive toward their own kind. Fish raised together may share a big tank with plenty of space and sight breaks, but a single puffer is the safe choice.',
  },

  predatorTags: ['snail', 'snail_small', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'fry', 'eggs', 'worm', 'copepod', 'long_fins'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 2,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'unsafe',
  coralRisk: 0.3,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_sand', 'aragonite', 'fine_gravel'], avoid: [], note: 'Soft sand; roots, rocks and plants to break sight lines.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 16,
    // Not bred in captivity; thought to be a substrate spawner with male guarding (Seriously Fish). Values are placeholders.
    clutchSize: { min: 100, max: 300 },
    incubationHours: 48,
    fryRearingHours: 160,
    cooldownDays: 30,
    conditions: { needsPartner: true },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes:
      'Not bred in captivity. It is thought to spawn on a hard surface with the male guarding the eggs, but there is no aquarium method, so the game does not model breeding. Every figure-eight puffer in the trade is wild-caught; the shop sells long-captive, settled fish.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  lifecycle: { juvenileDays: 14, adultDays: 16, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.3 },

  hardiness: 0.55,
  difficulty: 'intermediate',
  baseValue: 14,
  rarity: 'uncommon',
  visitorAppeal: 0.88,
  unlock: { requires: ['brackish'], hint: 'Unlocks with Brackish Estuaries research (after intermediate freshwater).' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Not bred in captivity, so every figure-eight puffer in the trade is wild-collected. Choose settled fish that are already eating.',
  conservation: {
    status: 'Data Deficient (IUCN 2019)',
    note: 'There is too little data to judge how wild populations are doing, and every trade fish is wild-caught. Buy only settled, feeding fish from careful sellers, keep them for life, and never release one.',
  },

  genetics: {
    loci: [
      { id: 'ocelli', name: 'Ocellus boldness', mode: 'additive', alleles: [{ id: 'fine', name: 'Fine vermiculation', dominance: 1, frequency: 0.65 }, { id: 'bold', name: 'Bold rings', dominance: 1, frequency: 0.35 }], note: 'Natural individual variation in how thick and bright the yellow lines are.' },
      { id: 'hue', name: 'Ground tone', mode: 'additive', alleles: [{ id: 'olive', name: 'Olive', dominance: 1, frequency: 0.75 }, { id: 'gold', name: 'Golden', dominance: 1, frequency: 0.25 }], note: 'Lighter, golden-toned fish occur; colour also darkens with stress and lightens when content.' },
    ],
    phenotypes: [
      { id: 'golden', name: 'Golden', layer: 'base', rarity: 0.12, when: [{ locus: 'hue', allele: 'gold', count: 'hom' }], visual: { bodyColor: '#4a4522', bodyColor2: '#3a361c', accentColor: '#f2d24e' }, note: 'Individual variation, not a trade morph.' },
      { id: 'wild', name: 'Wild Type', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'bold_rings', name: 'Bold-ringed', layer: 'overlay', rarity: 0.1, when: [{ locus: 'ocelli', allele: 'bold', count: 'hom' }], visual: { patternScale: 1.25, patternContrast: 1 }, note: 'Individual variation, not a trade morph.' },
    ],
    baseVisual: {
      bodyColor: '#343720',
      bodyColor2: '#282a18',
      bellyColor: '#f4f2e8',
      finColor: '#d6d4a4',
      finColor2: '#eeeccc',
      accentColor: '#d8d24a',
      eyeColor: '#6fbf8a',
      pattern: 'reticulated',
      patternScale: 1,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.2,
      metallic: 0,
      translucency: 0.45,
      finType: 'puffer',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.28,
    notes: 'No established domestic morphs. The loci describe natural individual variation (line boldness, ground tone), labelled honestly. Sexes look alike.',
  },
  visualMorphs: ['Wild Type', 'Golden', 'Bold-ringed'],

  behaviorSet: 'pea_puffer',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 5, turnRate: 3.8, hoverTendency: 0.75, schoolingTightness: 0, restOnBottom: 0.08, hitching: 0, burrowing: 0, glassSurfing: 0.08, curiosity: 0.95, nocturnal: 0 },
  specialBehaviors: ['hover', 'independent_eye_scan', 'stalk', 'hunt_snail', 'glass_inspect', 'follow_finger', 'beg'],

  encyclopedia: {
    summary: 'A charismatic little estuary puffer with a white belly, a gold-and-olive back scrawled with figure-eight rings, and a face that follows you everywhere.',
    nativeHabitat: 'Slow lowland rivers, floodplains and tidal river mouths of South-east Asia, where fresh water meets the first traces of the sea.',
    socialStructure: 'Best kept alone. Puffers raised together can share a big tank, but crowded puffers nip each other.',
    tankNeeds: 'About 15 gallons for one, plus 10 per extra puffer. Warm (24–27 °C), hard, alkaline, low-end brackish water (SG about 1.004–1.008), and very clean — puffers are sensitive to ammonia and nitrite. Feed snails and other hard-shelled foods so its ever-growing beak stays worn down.',
    compatibilityNotes: 'Not a community fish. It eats snails and shrimp, nips fins (especially sailfin mollies and other long-finned fish), and competes hard at feeding. A species tank is the safe choice.',
    breedingOverview: 'Not bred in captivity. It is thought to lay eggs on a hard surface that the male guards, but nobody has a reliable method, so breeding is not part of the game.',
    conservationNote: 'Data Deficient: nobody knows how wild populations are faring, and every trade fish is wild-caught. Choose settled, feeding fish, keep them for life, and never release one.',
    funFact: 'Its “beak” is four fused teeth that never stop growing. Crunching snail shells keeps them trimmed. The name biocellatus means “two eyespots”, after the dark rings on each side.',
    inGameBehavior: 'Hovers and scans with swivelling eyes, stalks snails, begs at the glass, and follows your finger along the front of the tank.',
    feedingNote: 'A greedy hunter of meaty food: live snails to wear down its beak, plus thawed bloodworms, mysis, brine shrimp, daphnia and chopped earthworms. It won’t take flakes or pellets, so an autofeeder can’t feed it. Feed small meals daily.',
    keeperTip: 'Puffers beg at the glass whenever you walk past — don’t be fooled. Overfed puffers grow fat and foul the water; a gently rounded belly after a meal is enough.',
  },
  sourceReferences: [
    { id: 'fishbase-dichotomyctere-ocellatus', title: 'FishBase — Dichotomyctere ocellatus (eyespot pufferfish)', url: 'https://www.fishbase.se/summary/Dichotomyctere-ocellatus.html', tier: 1, facts: ['8 cm TL', 'Indochina, Malaysia and Indonesia', '22–26 °C, pH 6.5–7.5, 5–12 dH (wild)', 'listed as freshwater', 'eats snails and benthic invertebrates', 'aggressive toward its own species', 'IUCN Data Deficient (2019)'] },
    { id: 'seriouslyfish-tetraodon-biocellatus', title: 'Seriously Fish — Tetraodon biocellatus (figure eight puffer)', url: 'https://www.seriouslyfish.com/species/tetraodon-biocellatus/', tier: 2, facts: ['80 mm SL', 'rivers and coastal waters, often brackish', 'can be kept fresh but lives longer at SG ~1.005', 'base 75×30 cm', 'snails and shell-on foods wear the beak', 'nips slow or long-finned fish', 'not bred in captivity; thought to be a guarding substrate spawner'] },
    { id: 'wikipedia-dichotomyctere-ocellatus', title: 'Wikipedia — Dichotomyctere ocellatus', url: 'https://en.wikipedia.org/wiki/Dichotomyctere_ocellatus', tier: 2, facts: ['24–28 °C', 'low-end brackish SG 1.005–1.008', 'lower Mekong, Peninsular Malaysia, Borneo', 'up to 15 years', 'greenish-yellow pattern on the back'] },
    { id: 'pufferforum-figure-eight', title: 'The Puffer Forum Library — The Figure Eight Puffer (Pufferpunk)', url: 'https://www.thepufferforum.com/forum/library/puffers-in-focus/fig8/', tier: 3, facts: ['15 gal for one + 10 per extra', 'low-end brackish; brackish-kept fish live longest (18+ years recorded)', 'all specimens wild-caught', 'two black eyespots each side; figure-8 not always clear', 'personable, but a fin-nipper'] },
  ],
  confidenceNotes: [
    'Salinity is the classic disagreement: FishBase lists it as a freshwater fish, Seriously Fish says it can be kept fresh but lives longer at SG ~1.005, and Wikipedia and the Puffer Forum recommend low-end brackish (1.005–1.008). The game follows the brackish consensus (ideal 1.004–1.008) and needs at least a trace of salt (1.002) — a game simplification.',
    'pH: FishBase gives 6.5–7.5 for wild fresh water; brackish keepers run ~8. The game tolerates 6.8–8.4 (ideal 7.3–8.2).',
    'Lifespan: up to 15 years (Wikipedia), 18+ recorded (Puffer Forum); 480 game-days ≈ 12 years compressed.',
    'Breeding: not bred in captivity — encoded as not_in_game; the clutch values are placeholders.',
    'The Golden and Bold-ringed variants are natural individual variation, not trade morphs.',
  ],
  exceptionRules: [
    { other: 'tag:snail', verdictFloor: 'high_risk', reason: 'Figure-eight puffers hunt and crush snails — that is what their beak is for.', incidentRisk: 0.65 },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'high_risk', reason: 'Figure-eight puffers eat small shrimp.', incidentRisk: 0.55, mitigatedBy: ['cover'] },
    { other: 'tag:shrimp_large', verdictFloor: 'high_risk', reason: 'Even larger shrimp get picked apart by a figure-eight puffer.', incidentRisk: 0.35, mitigatedBy: ['cover'] },
    { other: 'tag:long_fins', verdictFloor: 'high_risk', reason: 'Figure-eight puffers nip long, flowing fins such as a sailfin molly’s dorsal.', incidentRisk: 0.35, mitigatedBy: ['sight_breaks', 'tank_size'] },
    { other: 'bumblebee_goby', verdictFloor: 'conditional', reason: 'Bumblebee gobies are small, slow and territorial; a puffer may nip or harass them in a small tank.', incidentRisk: 0.12, mitigatedBy: ['hides', 'tank_size'] },
  ],
  visualLane: 'fish',
};
