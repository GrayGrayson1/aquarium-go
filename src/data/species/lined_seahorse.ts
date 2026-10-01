import type { SpeciesDefinition } from '@/types';

/**
 * Lined seahorse — Hippocampus erectus. Seed record by core; verified and extended by lane species-marine.
 * Research notes, sources and conflicts: docs/research/marine.md#lined-seahorse
 */
export const linedSeahorse: SpeciesDefinition = {
  id: 'lined_seahorse',
  commonName: 'Lined Seahorse',
  scientificName: 'Hippocampus erectus',
  category: 'fish',
  group: 'syngnathid',
  genus: 'Hippocampus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Atlantic — Nova Scotia to Venezuela and Brazil, including the Gulf of Mexico and Caribbean',
  isStarter: true,
  starterIdentity: 'The Gentle Oddball',
  starterBlurb: 'Graceful, slow and utterly strange. Hitching tails, courtship dances — and fathers who give birth.',

  // FishBase max 17.8 cm SL; ADW ~5 in (12.7 cm). Captive adults typically 12–15 cm.
  adultSizeCm: 15,
  // Care guides: 30 gal (18"+ tall) for a pair, +10–15 gal per extra pair. The 29-gal tall tank is the practical equivalent.
  recommendedMinTankGallons: 29,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1.6,

  // Giwojna: best ~23–24 °C, avoid spikes above 27 °C. BRS 72–78 °F; Chewy 70–78 °F. FishBase 10–27 °C (wild range).
  tempC: { min: 20, max: 27, idealMin: 22, idealMax: 25 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.3 },
  salinitySG: { min: 1.02, max: 1.026, idealMin: 1.022, idealMax: 1.025 },
  gh: null,
  kh: { min: 7, max: 11 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'copepod_live'],
  feedingStyle: 'target_fed',
  feedingSpeed: 0.12,
  feedingAggression: 0.05,
  hungerHours: 12,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.1,
  aggression: 0.02,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'pair', minGroup: 1, idealGroup: 2, note: 'Social and often kept in pairs or small groups; mated pairs greet each other every morning.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males may compete for females with snapping and tail-wrestling, rarely harmful.' },

  predatorTags: ['copepod', 'shrimp_fry'],
  preyTags: ['fish_slow'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0,
  anemoneRelationship: 'prey_risk',

  hidesNeeded: 0,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs many hitching posts: macroalgae, seagrass, gorgonian-style branches, smooth decor.' },

  breeding: {
    system: 'seahorse_pouch',
    difficulty: 0.7,
    maturityDays: 20,
    // ADW: the female deposits 250–650 eggs depending on size.
    clutchSize: { min: 250, max: 650 },
    // FishBase/ADW: gestation 20–21 days (temperature dependent) → ~20.5 × 8.
    incubationHours: 164,
    fryRearingHours: 240,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTempC: 22, minTankGallons: 29 },
    predationWithoutNursery: 0.97,
    nurseryRequired: true,
    maxRaisedPerClutch: 8,
    notes: 'Pairs perform a daily greeting and a courtship dance, then the female transfers her eggs into the male’s brood pouch. He carries and nourishes the embryos for about three weeks, then gives birth to tiny independent young. The fry eat constantly and need live food such as copepods and baby brine shrimp.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male_pouch',
  // ADW: captive specimens average 4.7 years → ~190–200 game-days.
  lifecycle: { juvenileDays: 16, adultDays: 18, lifespanDays: 200, sexVisibleAtDays: 12, hatchSizeCm: 0.7 },

  hardiness: 0.45,
  difficulty: 'advanced',
  baseValue: 95,
  rarity: 'uncommon',
  visitorAppeal: 1,
  unlock: { requires: ['marine_seahorse'], hint: 'Starter species — otherwise research Seahorse Husbandry once marine fish are unlocked.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Vulnerable (IUCN Red List, assessed 2016); CITES Appendix II',
    note: 'Wild seahorses are threatened by shrimp-trawl bycatch, the dried-seahorse trade and loss of seagrass habitat. International trade is regulated under CITES. Aquarium Go stocks captive-bred animals only — they are hardier and already eat frozen food.',
  },

  genetics: {
    loci: [
      {
        id: 'hue',
        name: 'Colour tendency',
        mode: 'mendelian',
        alleles: [
          { id: 'dark', name: 'Dark', dominance: 3, frequency: 0.5 },
          { id: 'orange', name: 'Orange', dominance: 2, frequency: 0.2 },
          { id: 'yellow', name: 'Yellow', dominance: 1, frequency: 0.2 },
          { id: 'red', name: 'Red', dominance: 1, frequency: 0.1 },
        ],
        note: 'Seahorses change colour with mood, surroundings and courtship; captive breeders select lines that tend toward yellow, orange or red. Simplified into a heritable tendency.',
      },
      {
        id: 'pinto',
        name: 'Pinto',
        mode: 'mendelian',
        alleles: [
          { id: 'N', name: 'Normal', dominance: 2, frequency: 0.95 },
          { id: 'p', name: 'Pinto', dominance: 1, frequency: 0.05 },
        ],
        note: 'Patchy white "pinto" forms appear in captive lines; inheritance uncertain — modelled as recessive.',
      },
    ],
    phenotypes: [
      { id: 'yellow', name: 'Yellow', layer: 'base', rarity: 0.3, when: [{ locus: 'hue', allele: 'yellow', count: 'hom' }], visual: { bodyColor: '#e7c040', bodyColor2: '#c59a24', bellyColor: '#f0d676', accentColor: '#fff4c8' } },
      { id: 'red', name: 'Red', layer: 'base', rarity: 0.45, when: [{ locus: 'hue', allele: 'red', count: 'hom' }], visual: { bodyColor: '#b3372a', bodyColor2: '#7c2118', bellyColor: '#cf5a45', accentColor: '#f6d6c8' } },
      { id: 'orange', name: 'Orange', layer: 'base', rarity: 0.25, when: [{ locus: 'hue', allele: 'orange', count: 'any' }, { locus: 'hue', allele: 'dark', count: 'none' }], visual: { bodyColor: '#e0782c', bodyColor2: '#b0501c', bellyColor: '#eea060', accentColor: '#fde3c8' } },
      { id: 'dark', name: 'Classic Dark', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'pinto', name: 'Pinto', layer: 'overlay', rarity: 0.5, when: [{ locus: 'pinto', allele: 'p', count: 'hom' }], visual: { pattern: 'mottled', patternContrast: 0.9, accentColor: '#f7f3ea' } },
    ],
    baseVisual: {
      bodyColor: '#5a4636',
      bodyColor2: '#382a20',
      bellyColor: '#86705a',
      finColor: '#e3d9c2',
      finColor2: '#f3ecdc',
      accentColor: '#efe6d2',
      eyeColor: '#b89a4a',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.65,
      finType: 'seahorse',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.35,
    notes: 'Named for the fine white lines along the neck and back. Colour forms are real captive-bred colour lines, but inheritance is simplified.',
  },
  visualMorphs: ['Classic Dark', 'Orange', 'Yellow', 'Red', 'Pinto'],

  behaviorSet: 'seahorse',
  behaviorTraits: { cruiseSpeed: 0.12, burstSpeed: 0.45, turnRate: 0.7, hoverTendency: 1, schoolingTightness: 0, restOnBottom: 0, hitching: 0.95, burrowing: 0, glassSurfing: 0, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['hitch', 'vertical_swim', 'slow_feed', 'snick_feed', 'courtship_dance', 'color_brighten', 'pouch_pump', 'birth', 'independent_eye_scan'],

  encyclopedia: {
    summary: 'An upright, slow-swimming fish that anchors itself with a grasping tail — and whose males become pregnant.',
    nativeHabitat: 'Seagrass beds, sponge gardens, mangrove roots and rubble in the western Atlantic, from the shallows to about 30 m.',
    socialStructure: 'Peaceful and social. Mated pairs meet every morning for a greeting dance that renews their bond.',
    tankNeeds: 'A tall, calm marine tank (30 gallons for a pair) with many hitching posts, gentle flow, cool-tropical water around 22–25 °C and meticulous water quality. Target-feed frozen mysis two or three times a day.',
    compatibilityNotes: 'Only very peaceful, slow tank mates such as small gobies, cardinalfish, dragonets and clean-up crew. Fast or pushy feeders starve seahorses; anemones, fire coral and strongly stinging corals can burn their skin; giant clams can clamp their tails.',
    breedingOverview: 'Courtship dances end with the female depositing her eggs in the male’s brood pouch. About three weeks later he gives birth to hundreds of tiny seahorses.',
    conservationNote: 'Vulnerable on the IUCN Red List and trade-regulated under CITES Appendix II. Captive-bred seahorses are hardier, already eat frozen food and leave wild populations alone.',
    funFact: 'Seahorses have no stomach to speak of — food passes through quickly, so they must eat often. Newborn fry can spend ten hours a day hunting.',
    inGameBehavior: 'Wraps its tail around plants and branches, drifts upright, flutters its tiny dorsal fin, scans with independently swivelling eyes, and snicks up food you place nearby.',
    feedingNote: 'A slow, deliberate feeder. Thawed frozen mysis is its staple, plus frozen brine shrimp and live copepods. It won’t take flakes or pellets, so an autofeeder can’t feed it — target-feed 2–3 times a day so faster fish don’t steal it.',
    keeperTip: 'Set a feeding dish by a favourite hitching post. Seahorses learn to wait there, and you can siphon out uneaten mysis after about 15 minutes, before it fouls the water.',
  },
  sourceReferences: [
    { id: 'fishbase-hippocampus-erectus', title: 'FishBase — Hippocampus erectus (Lined seahorse)', url: 'https://www.fishbase.se/summary/Hippocampus-erectus.html', tier: 1, facts: ['max 17.8 cm SL', 'western Atlantic range', 'IUCN Vulnerable (assessed 2016)', 'CITES Appendix II', 'gestation 20–21 days', 'reared in captivity'] },
    { id: 'adw-hippocampus-erectus', title: 'Animal Diversity Web — Hippocampus erectus', url: 'https://animaldiversity.org/accounts/Hippocampus_erectus/', tier: 1, facts: ['prehensile tail', 'very slow swimmer', 'daily greeting dance', 'male pregnancy 20–21 days', '250–650 eggs', 'captive lifespan ~4.7 years', 'fry feed up to 10 h a day'] },
    { id: 'tfh-giwojna-seahorse-reef', title: 'Pete Giwojna — A Seahorse Reef, Part One: Reef Compatibility of Hippocampus spp. (TFH Magazine)', url: 'https://www.tfhmagazine.com/articles/saltwater/a-seahorse-reef-part-1-reef-compatibility-of-hippocampus-spp', tier: 2, facts: ['exclude anemones and fire coral', 'Euphyllia/Catalaphyllia stings stronger than most anemones', 'soft corals are good choices', 'avoid Tridacna clams', 'best at 23–24 °C, avoid >27 °C'] },
    { id: 'brs-seahorse-care', title: 'Bulk Reef Supply — Ultimate Seahorse Care Guide', url: 'https://www.bulkreefsupply.com/content/post/seahorse-aquarium-how-to', tier: 2, facts: ['30 gal per pair, +10 per extra seahorse', 'tank 18"+ tall', '72–78 °F, SG 1.020–1.025', 'low to medium flow', 'avoid stinging corals and aggressive fish', 'feed 2–3 times a day', 'prefer captive-bred'] },
    { id: 'chewy-seahorse-care', title: 'Chewy Education — How To Care for a Pet Seahorse (reviewed)', url: 'https://www.chewy.com/education/fish/saltwater-fish/how-to-care-for-a-pet-seahorse', tier: 2, facts: ['30 gal per pair', '70–78 °F', 'minimal current, feed mode', 'avoid angelfish, damselfish, tangs, anemones'] },
  ],
  confidenceNotes: [
    'High confidence: male pregnancy, 20–21 day gestation, slow feeding, low-flow needs, IUCN Vulnerable + CITES II.',
    'Tank mates: sources agree on excluding fast/aggressive feeders, tangs, angelfish and anemones. They disagree on SPS corals (Giwojna: weak stings, acceptable; other keepers avoid them) — the game flags only anemones, fire coral and strongly stinging LPS.',
    'Birth size conflict: ADW gives ~5/8 in (1.6 cm) at birth, while breeder reports are smaller; the seed value of 0.7 cm is kept.',
    'Colour genetics are simplified: colour in seahorses is partly environmental and mood-driven.',
  ],
  exceptionRules: [
    { other: 'tag:tang', verdictFloor: 'high_risk', reason: 'Tangs are fast, pushy grazers that sweep up food before a seahorse can reach it, and they need strong flow. This animal is likely to outcompete the seahorse at feeding.', incidentRisk: 0.08, mitigatedBy: ['target_feeding'] },
    { other: 'coral_beauty', verdictFloor: 'high_risk', reason: 'Dwarf angelfish are quick, bold feeders and may pick at a seahorse’s skin and skin filaments.', incidentRisk: 0.08, mitigatedBy: ['target_feeding', 'tank_size'] },
    { other: 'foxface_rabbitfish', verdictFloor: 'high_risk', reason: 'A large, fast grazer with venomous spines. It dominates feeding and needs far more flow and space than seahorses tolerate.', incidentRisk: 0.06, mitigatedBy: ['target_feeding'] },
    { other: 'green_chromis', verdictFloor: 'conditional', reason: 'Chromis are fast midwater feeders that grab food before seahorses reach it. Workable only with dedicated target feeding.', incidentRisk: 0.04, mitigatedBy: ['target_feeding'] },
    { other: 'ocellaris_clownfish', verdictFloor: 'conditional', reason: 'Clownfish are faster feeders and can become territorial. Works in a roomy tank without an anemone, with target feeding.', incidentRisk: 0.04, mitigatedBy: ['target_feeding', 'tank_size'] },
    { other: 'dwarf_lionfish', verdictFloor: 'incompatible', reason: 'A venomous ambush predator that eats small fish and shrimp; young seahorses are prey and adults are harassed.', incidentRisk: 0.3 },
    { other: 'miniatus_grouper', verdictFloor: 'incompatible', reason: 'A large predator that eats fish it can swallow — including seahorses.', incidentRisk: 0.5 },
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'A mantis shrimp will strike and kill a slow seahorse that rests near its burrow.', incidentRisk: 0.5 },
    { other: 'tag:stinging_cnidarian', verdictFloor: 'incompatible', reason: 'Anemones, fire coral and strongly stinging corals burn seahorse skin when they perch on them.', incidentRisk: 0.2 },
  ],
  special: {
    stingSensitive: true,
  },
  visualLane: 'special',
  positiveInteractions: [
    { other: 'trochus_snail', text: 'Grazing snails keep film algae off the glass without competing for the seahorse’s food.' },
  ],
};
