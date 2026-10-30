import type { SpeciesDefinition } from '@/types';

/**
 * Bubble-tip anemone as a living animal — Entacmaea quadricolor. Lane species-marine, chunk 16 (ADR-0052). The
 * bubble-tip decor piece (src/data/catalog/decor.ts) stays, so saves keep it; this is the animal.
 * Sources, key facts and conflicts: docs/research/marine.md#bubble-tip-anemone
 */
export const bubbletipAnemone: SpeciesDefinition = {
  id: 'bubbletip_anemone',
  commonName: 'Bubble-tip Anemone',
  scientificName: 'Entacmaea quadricolor',
  category: 'anemone',
  group: 'anemone',
  genus: 'Entacmaea',
  environment: 'marine',
  waterClasses: ['reef', 'marine_live_rock'],
  nativeRegion: 'Indo-Pacific — the northern Red Sea through the Indian Ocean and the Coral Triangle to the Marshall Islands, with its foot in reef crevices 0–200 m deep',
  isStarter: false,

  // Titus et al. 2024: solitary animals to 40 cm across the disc; aquarium animals 12 in (30 cm) or less.
  adultSizeCm: 25,
  // LiveAquaria: 30 gal minimum, a mature (6+ months) and stable reef.
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.4,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; Reef Builders 2025: 78 °F, SG 1.026, Ca 450, Mg 1300–1400.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.022, max: 1.027, idealMin: 1.024, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'photosynthetic',
  foods: ['coral_food', 'mysis', 'brine_shrimp'],
  feedingStyle: 'target_fed',
  feedingSpeed: 0.02,
  feedingAggression: 0,
  hungerHours: 48,

  activityZone: ['decor', 'glass', 'bottom'],
  temperament: 'semi_aggressive',
  territoriality: 0.2,
  aggression: 0.2,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 1, note: 'One, or a group of its own clones; different strains fight with stinging chemicals.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'ok', juvenile: 'ok', note: 'Clones of one animal live side by side; unrelated anemones sting each other.' },

  // a hazard to sting-sensitive animals; it eats small animals that blunder into it
  predatorTags: ['fry', 'copepod', 'fish_tiny'],
  preyTags: ['stinging_cnidarian'],
  maxLikelyPreySizeCm: 2,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'mostly_safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'caution',
  coralRisk: 0.3,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 0,
  coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Settles with its foot deep in a rock crevice and its crown in strong light (150–350 PAR); it wanders until it finds such a spot — guard pump intakes.' },

  breeding: {
    system: 'fission',
    difficulty: 0.3,
    maturityDays: 20,
    clutchSize: { min: 1, max: 1 },
    incubationHours: 24,
    fryRearingHours: 240,
    // Reef Builders: a well-fed anemone can split again within months → ~20 game-days between splits
    cooldownDays: 20,
    conditions: { needsPartner: false, minTankGallons: 30 },
    predationWithoutNursery: 1,
    nurseryRequired: false,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes that broadcast-spawn in the wild; in tanks a well-fed, settled anemone clones itself by splitting in two over about a day, and 89–94 % of halves survive. In the game one that has settled for a couple of weeks, is well fed and healthy, and has room splits now and then into a clone of itself.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // No lifespan found; anemones are long-lived → the game's 500-day ceiling.
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.5 },

  hardiness: 0.55,
  difficulty: 'intermediate',
  baseValue: 60,
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Captive-propagated clones are widespread; wild ones are still collected.',
  conservation: { status: 'Not evaluated (IUCN)', note: 'Not assessed. Choose aquacultured clones — they settle better and spare wild reefs.' },

  genetics: {
    loci: [
      {
        id: 'form',
        name: 'Colour form',
        mode: 'codominant',
        alleles: [
          { id: 'g', name: 'Green', dominance: 1, frequency: 0.6 },
          { id: 'r', name: 'Rose', dominance: 1, frequency: 0.4 },
        ],
        note: 'Green, rose and rainbow are colour forms sold as clones; their basis is not genetic in any published study. The game treats one rose copy as rainbow and two as rose (anemones are not bred in the game).',
      },
    ],
    phenotypes: [
      { id: 'rose', name: 'Rose Bubble-tip Anemone', layer: 'base', rarity: 0.35, when: [{ locus: 'form', allele: 'r', count: 'hom' }], visual: { bodyColor: '#c03a5a', bodyColor2: '#d2456a', accentColor: '#f07a96', finColor2: '#f8d0dc', bellyColor: '#a8233f' } },
      { id: 'rainbow', name: 'Rainbow Bubble-tip Anemone', layer: 'base', rarity: 0.45, when: [{ locus: 'form', allele: 'r', count: 'het' }], visual: { bodyColor: '#e05a2a', bodyColor2: '#5c8a3a', accentColor: '#f07a1e', finColor2: '#b0307a', bellyColor: '#a8233f' } },
      { id: 'green', name: 'Green Bubble-tip Anemone', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#6a7a3a',
      bodyColor2: '#5c8a3a',
      bellyColor: '#a8233f',
      finColor: '#8a6a3e',
      finColor2: '#b0307a',
      accentColor: '#9ab85a',
      eyeColor: '#101010',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.35,
      finType: 'anemone',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the anemone renderer: belly = the red-magenta column; body = the oral disc and tentacle bases; body2 = the tentacle shafts; accent = the bubble (a mottled pale band in green animals); fin2 = the tentacle tips (purple-magenta).',
  },
  visualMorphs: ['Green Bubble-tip Anemone', 'Rose Bubble-tip Anemone', 'Rainbow Bubble-tip Anemone'],

  behaviorSet: 'anemone',
  behaviorTraits: { cruiseSpeed: 0.004, burstSpeed: 0.01, turnRate: 0.1, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0, nocturnal: 0, pickRadiusMul: 1 },
  specialBehaviors: ['wander_settle', 'host_clownfish', 'night_close', 'deflate_cycle'],

  encyclopedia: {
    summary: 'The classic clownfish host: a crown of tentacles that swell into bubbles near the tip, on a bright red column wedged into the rock.',
    nativeHabitat: 'Reef crevices across the Indo-Pacific, from the shallows to 200 m, often in dense clonal fields.',
    socialStructure: 'Solitary large animals or clusters of clones; separate sexes, though females far outnumber males.',
    tankNeeds: 'A mature, stable reef of 30 gallons or more with strong light, moderate flow, rockwork with crevices and guarded pump intakes.',
    compatibilityNotes: 'Stings corals and other anemones and can move onto them; keep corals a few inches away. Hosts clownfish — maroons above all — and stings sensitive animals like seahorses.',
    breedingOverview: 'A well-fed, settled anemone splits in two over about a day, making a clone; one split can lead to a dozen.',
    conservationNote: 'Not assessed by the IUCN. Aquacultured clones are easy to find.',
    funFact: 'It hosts fourteen kinds of clownfish in the wild — about half of all anemonefish.',
    inGameBehavior: 'Creeps about until it finds a crevice in the light, then stays; it closes up at night and puffs back out in the morning, with clownfish nestling in its tentacles.',
    feedingNote: 'Lives mostly on the sugars its symbiotic algae make in the light. Target-feed a few pieces of mysis or brine shrimp a week; skip big chunks.',
    keeperTip: 'Hold it over a crevice for ten minutes so the foot grips, and guard every pump intake.',
  },
  sourceReferences: [
    { id: 'titus-2024-entacmaea', title: 'Titus et al. (2024) Revision of Entacmaea. Zootaxa 5506(1)', url: 'https://par.nsf.gov/servlets/purl/10575794', tier: 1, facts: ['disc to 400 mm', 'foot in crevices', 'tentacle colours, purple tips, white band', 'red column without verrucae', 'solitary or clonal'] },
    { id: 'sealifebase-entacmaea', title: 'SeaLifeBase — Entacmaea quadricolor', url: 'https://www.sealifebase.se/summary/Speciessummary.php?id=129744', tier: 1, facts: ['0–200 m', 'zooxanthellae', 'IUCN not evaluated'] },
    { id: 'scott-2014-entacmaea', title: 'Scott, Hardefeldt & Hall (2014) Asexual propagation of Entacmaea quadricolor. PLoS ONE', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4196916/', tier: 1, facts: ['89–94% of halves survive', 'bleaching above ~400 PAR outdoors'] },
    { id: 'liveaquaria-bta', title: 'LiveAquaria — Bubble Tip Anemone', url: 'https://www.liveaquaria.com/products/green-bubble-tip-anemone', tier: 2, facts: ['30 gal', '72–78 °F, pH 8.1–8.4, SG 1.020–1.025', 'stings corals', 'wanders', 'green ~$48, rose ~$239'] },
    { id: 'reefbuilders-rbta-2023', title: 'Reef Builders (2023) — The indomitable red bubble-tip anemone', url: 'https://reefbuilders.com/2023/02/08/the-indomitable-red-bubble-tip-anemone', tier: 2, facts: ['splits over ~24 h, one split led to a dozen+', '150–200 PAR', 'ocellaris often host it in tanks', 'grip a crevice 10 minutes'] },
  ],
  confidenceNotes: [
    'Colour forms (green, rose, rainbow) are traded clones, not studied genetics; modelled as one codominant locus.',
    'Why the tentacles bulb is unclear (fish, light, flow and feeding have all been proposed); the art keeps them bulbed.',
    'Splitting is modelled as a clone appearing beside a settled, well-fed anemone; the timing (a couple of weeks settled, then about every six months) is a game simplification of the hobby reports.',
  ],
  exceptionRules: [
    { other: 'tag:coral_polyp', verdictFloor: 'conditional', reason: 'Stings corals it touches and can wander onto them; keep corals a few inches away.', incidentRisk: 0.03, mitigatedBy: ['tank_size'] },
  ],
  special: { medicationSensitive: true, requiresMatureDays: 30, hostNote: 'Hosts clownfish, the maroon above all; it can also host ocellaris in a tank.' },
  visualLane: 'special',
  positiveInteractions: [{ other: 'maroon_clownfish', text: 'The maroon’s natural host: a pair settles into its tentacles and defends it.' }, { other: 'ocellaris_clownfish', text: 'Not its wild host, but tank-raised ocellaris often move in.' }],
};
