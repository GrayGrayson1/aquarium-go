import type { SpeciesDefinition } from '@/types';

/**
 * Ocellaris clownfish — Amphiprion ocellaris. Seed record by core; verified and extended by lane species-marine.
 * Research notes, sources and conflicts: docs/research/marine.md#ocellaris-clownfish
 */
export const ocellarisClownfish: SpeciesDefinition = {
  id: 'ocellaris_clownfish',
  commonName: 'Ocellaris Clownfish',
  scientificName: 'Amphiprion ocellaris',
  category: 'fish',
  group: 'anemonefish',
  genus: 'Amphiprion',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Eastern Indian Ocean and western Pacific — Andaman Sea and north-west Australia through Southeast Asia to the Philippines, Taiwan and the Ryukyu Islands',
  isStarter: true,
  starterIdentity: 'The Reef Partner',
  starterBlurb: 'Your doorway to saltwater. A hardy captive-bred reef fish with a hierarchy, a partner to find — and a secret about sex.',

  // FishBase max 11 cm TL; ADW average 8 cm; captive-bred adults usually 7–9 cm (females largest).
  adultSizeCm: 9,
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1.4,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025. Reef keepers usually run 1.024–1.026.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 27 },
  pH: { min: 7.8, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['pellet_small', 'flake', 'mysis', 'brine_shrimp', 'nori', 'copepod_live'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.65,
  feedingAggression: 0.4,
  hungerHours: 16,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.3,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'pair_hierarchy', minGroup: 1, idealGroup: 2, maxPer10Gallons: 1, note: 'Kept singly or as a bonded pair. Larger groups need very large tanks and still sort themselves into a strict pecking order.' },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'fight',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Two juveniles form a hierarchy: the dominant fish becomes female. Two established females fight.',
  },

  predatorTags: ['copepod', 'worm'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0.05,
  anemoneRelationship: 'host_seeker',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [] },

  breeding: {
    system: 'clownfish_substrate',
    difficulty: 0.6,
    maturityDays: 16,
    // ADW: 100–1,000 eggs per spawn depending on the female's age.
    clutchSize: { min: 100, max: 1000 },
    // ADW 6–8 days; LiveAquaria 6–11 days depending on temperature → ~8 real days × 8.
    incubationHours: 64,
    fryRearingHours: 200,
    cooldownDays: 14,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 25, minTankGallons: 20 },
    predationWithoutNursery: 0.95,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'A bonded pair cleans a flat surface near its host or favourite rock and lays adhesive orange eggs. The male fans, mouths and guards them and eats any that die; they hatch after dark about a week later. Larvae drift as plankton for 8–12 days and need a separate rearing tank with rotifers, then baby brine shrimp.',
  },
  sexSystem: 'protandrous',
  parentalCare: 'male',
  // Lifespan: FishBase notes 12 years in captivity (20+ reported by hobbyists) → capped at 500 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 16, lifespanDays: 500, sexVisibleAtDays: 12, hatchSizeCm: 0.35 },

  hardiness: 0.8,
  difficulty: 'beginner',
  baseValue: 30,
  rarity: 'common',
  visitorAppeal: 1,
  unlock: { requires: ['marine_basics'], hint: 'Starter species — otherwise research Marine Systems, or reach 150 reputation as a seasoned keeper.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2021)',
    note: 'Heavy collection for the aquarium trade has thinned some local populations, and host anemones suffer in reef-bleaching events. Captive-bred clownfish are raised by the thousands, and Aquarium Go stocks captive-bred fish.',
  },

  genetics: {
    loci: [
      {
        id: 'snow',
        name: 'White expansion (Sn)',
        mode: 'codominant',
        alleles: [
          { id: 'wt', name: 'Normal bars', dominance: 1, frequency: 0.85 },
          { id: 'sn', name: 'Expanded white', dominance: 1, frequency: 0.15 },
        ],
        note: 'Game simplification of several real white-bar mutations. In captive lines, Snowflake (irregular, jagged white bars) behaves as a dominant mutation whose homozygote is undocumented, while the Gladiator/DaVinci line gives near all-white Platinum/Wyoming White fish when homozygous (Klann et al. 2021). The game merges them into one codominant locus: one copy = Snowflake-type bars, two copies = Platinum.',
      },
      {
        id: 'mel',
        name: 'Black form',
        mode: 'mendelian',
        alleles: [
          { id: 'O', name: 'Orange', dominance: 1, frequency: 0.85 },
          { id: 'B', name: 'Black', dominance: 2, frequency: 0.15 },
        ],
        note: 'Black ("Darwin") ocellaris come from a wild melanistic population in northern Australia with many more melanophores. Captive lines breed true; the exact genetics are unconfirmed, so the game models it as a simple dominant.',
      },
      {
        id: 'misbar',
        name: 'Misbar',
        mode: 'mendelian',
        alleles: [
          { id: 'N', name: 'Full bars', dominance: 2, frequency: 0.9 },
          { id: 'mb', name: 'Misbar', dominance: 1, frequency: 0.1 },
        ],
        note: 'Missing or incomplete bars can be caused by rearing conditions as well as by genes. Modelled as recessive.',
      },
    ],
    phenotypes: [
      { id: 'platinum', name: 'Platinum', layer: 'base', rarity: 0.55, when: [{ locus: 'snow', allele: 'sn', count: 'hom' }], visual: { bodyColor: '#f4f1ea', bodyColor2: '#e8e1d2', bellyColor: '#fbf9f4', accentColor: '#ffffff', finColor: '#f1ece3', pattern: 'solid' } },
      { id: 'snowflake', name: 'Snowflake', layer: 'base', rarity: 0.35, when: [{ locus: 'snow', allele: 'sn', count: 'het' }], visual: { pattern: 'marble', patternScale: 1.3, patternContrast: 0.95 } },
      { id: 'black', name: 'Black Ocellaris', layer: 'base', rarity: 0.25, when: [{ locus: 'mel', allele: 'B', count: 'any' }], visual: { bodyColor: '#17120f', bodyColor2: '#2a160c', bellyColor: '#3a1c0d', finColor: '#1c1511', finColor2: '#050505', eyeColor: '#b3571e' } },
      { id: 'orange', name: 'Orange Ocellaris', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'misbar', name: 'Misbar', layer: 'overlay', rarity: 0.2, when: [{ locus: 'misbar', allele: 'mb', count: 'hom' }], visual: { patternScale: 0.7, patternContrast: 0.8 } },
    ],
    baseVisual: {
      bodyColor: '#f26a1b',
      bodyColor2: '#dc4f16',
      bellyColor: '#f7883c',
      finColor: '#f26a1b',
      finColor2: '#111111',
      accentColor: '#fbfaf4',
      eyeColor: '#e0762c',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 1,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.1,
      finType: 'clownfish',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Three white bars (head, mid-body, tail base) edged in thin black on a bright orange body; fins tipped black. Captive "designer" lines are simplified to three loci. All morphs are real, commercially bred forms.',
  },
  visualMorphs: ['Orange Ocellaris', 'Black Ocellaris', 'Snowflake', 'Platinum', 'Misbar'],

  behaviorSet: 'clownfish',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 5, turnRate: 3, hoverTendency: 0.45, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.7, nocturnal: 0 },
  specialBehaviors: ['pair_swim', 'host_zone', 'nest_prepare', 'egg_fan', 'hierarchy_display', 'sex_change', 'waddle_swim'],

  encyclopedia: {
    summary: 'The iconic anemonefish: a waddling orange-and-white reef fish that lives in a strict social hierarchy.',
    nativeHabitat: 'Sheltered lagoons and outer reef slopes 1–15 m deep, living among the stinging tentacles of magnificent, giant and Mertens’ carpet anemones.',
    socialStructure: 'A dominant breeding female, a smaller breeding male and non-breeding juniors. If the female dies, the male becomes female and the largest junior steps up.',
    tankNeeds: 'Stable marine water (SG ~1.023–1.026, 24–27 °C), moderate flow, live rock and a territory in a 20-gallon or larger tank. An anemone is optional — many clownfish adopt a coral, a rock or even a powerhead instead.',
    compatibilityNotes: 'Reef-safe and peaceful with most community fish, but can defend its chosen spot. Keep only one pair per tank, and keep it away from fish big enough to swallow it.',
    breedingOverview: 'Pairs lay adhesive eggs on rock beside their host. The male fans and cleans the eggs until they hatch at night about a week later; the larvae need a separate rearing tank.',
    conservationNote: 'Listed as Least Concern by the IUCN (2021), though collection has thinned some local populations. Captive-bred clownfish take pressure off wild reefs — choose them.',
    funFact: 'All clownfish start life as males. If the female of a group disappears, her mate changes sex to become the new female.',
    inGameBehavior: 'Waddles near its favourite spot, bonds with a partner, nestles into an anemone once you unlock one, and tends a patch of eggs.',
    feedingNote: 'An easy mid-water omnivore: marine pellets and flakes make the staple, with thawed mysis or brine shrimp and a little seaweed for variety. Feed small amounts once or twice a day; an autofeeder with pellets or flakes suits it.',
    keeperTip: 'Buy two small juveniles together, or one clearly smaller than the other — the bigger fish becomes the female. Adding a third clownfish to a settled pair usually ends in fighting.',
  },
  sourceReferences: [
    { id: 'fishbase-amphiprion-ocellaris', title: 'FishBase — Amphiprion ocellaris (Clown anemonefish)', url: 'https://www.fishbase.se/summary/Amphiprion-ocellaris.html', tier: 1, facts: ['max 11 cm TL', 'depth 1–15 m', 'protandrous hermaphrodite', 'three natural host anemones', 'males guard and aerate eggs', 'IUCN Least Concern (assessed 2021)', 'reached 12 years in captivity'] },
    { id: 'adw-amphiprion-ocellaris', title: 'Animal Diversity Web — Amphiprion ocellaris', url: 'https://animaldiversity.org/accounts/Amphiprion_ocellaris/', tier: 1, facts: ['dominance hierarchy', 'protandry', 'male nest care', '100–1,000 eggs', 'incubation 6–8 days', 'planktonic larvae 8–12 days', 'omnivore'] },
    { id: 'mba-clownfish', title: 'Monterey Bay Aquarium — Clownfish', url: 'https://www.montereybayaquarium.org/animals/animals-a-to-z/clownfish', tier: 1, facts: ['all clownfish start male', 'protective mucus in anemone', 'prefer captive-raised fish'] },
    { id: 'liveaquaria-cb-ocellaris', title: 'LiveAquaria — Proaquatix Captive-Bred Ocellaris Clownfish', url: 'https://www.liveaquaria.com/product/3409/?pcatid=3409', tier: 2, facts: ['min tank 20 gal', '72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025', 'eggs hatch in 6–11 days', 'captive-bred price ~$30', 'reef compatible'] },
    { id: 'klann-2021-anemonefish-pigment', title: 'Klann et al. (2021) Variation on a theme: pigmentation variants and mutants of anemonefish. EvoDevo (PMC8214269)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8214269/', tier: 1, facts: ['Snowflake irregular white bars', 'Gladiator het → Platinum/Wyoming White hom', 'Black ocellaris from a wild melanistic population', 'misbar environmental and genetic', 'genetic states unconfirmed'] },
  ],
  confidenceNotes: [
    'High confidence: protandry, male egg care, host anemones, IUCN Least Concern (FishBase lists the 2021 assessment).',
    'Temperature: LiveAquaria lists 72–78 °F; reef practice runs 24–27 °C. Tolerated range widened to 22–28 °C to reflect both.',
    'Designer-morph genetics are simplified: Snowflake and Platinum are separate real mutations merged into one locus (see locus note).',
    'Incubation (64 game-hours) is ~8 real days × 8, inside the 6–11 day range reported by ADW and LiveAquaria.',
  ],
  exceptionRules: [
    {
      other: 'lined_seahorse',
      verdictFloor: 'conditional',
      reason: 'Clownfish are faster feeders and can turn territorial, stressing slow seahorses. It can work in a roomy tank with target feeding and no anemone.',
      incidentRisk: 0.04,
      mitigatedBy: ['target_feeding', 'tank_size'],
    },
  ],
  special: {
    hostNote: 'Optional host: in the wild the magnificent, giant carpet and Mertens’ carpet anemones. In aquaria many adopt a bubble-tip anemone or a soft coral. No anemone is needed to keep them healthy.',
  },
  visualLane: 'fish',
  positiveInteractions: [
    { other: 'cleaner_shrimp', text: 'Visits the cleaner shrimp’s station to have parasites and dead skin picked off.' },
  ],
};
