import type { SpeciesDefinition } from '@/types';

/**
 * Tuxedo urchin (blue and red tuxedo pincushion urchin) — Mespilia globulus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#tuxedo-urchin
 */
export const tuxedoUrchin: SpeciesDefinition = {
  id: 'tuxedo_urchin',
  commonName: 'Tuxedo Urchin',
  scientificName: 'Mespilia globulus',
  category: 'invertebrate',
  group: 'urchin',
  genus: 'Mespilia',
  environment: 'marine',
  waterClasses: ['marine_live_rock', 'reef'],
  nativeRegion: 'Tropical Indo-Pacific — southern China and the Philippines to the Indo-Australian Archipelago, on shallow reefs, rubble and seagrass',
  isStarter: false,

  // SeaLifeBase 5 cm test; Digimorph 6–8 cm; LiveAquaria 3 in. Spines to ~2 cm.
  adultSizeCm: 7,
  // LiveAquaria and ORA: 20 gal minimum; it needs enough coralline and film algae to graze.
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 0.25,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; no high nitrate; sensitive to copper.
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['biofilm', 'nori', 'algae_wafer', 'vegetable', 'detritus'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.03,
  feedingAggression: 0,
  hungerHours: 24,

  activityZone: ['glass', 'decor', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'Usually one; several only with plenty of algae and shelter.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Ignores its own kind; urchins only compete for algae.' },

  predatorTags: [],
  preyTags: ['starfish'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'caution',
  reefSafe: 'mostly_safe',
  coralRisk: 0.05,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Grazes coralline and film algae on rock and glass by night; it picks up loose frags and shells and can loosen rockwork.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 16,
    clutchSize: { min: 10000, max: 100000 },
    incubationHours: 24,
    fryRearingHours: 110,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 40 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Separate sexes; spawns into the water (a warm spell can trigger it) and the larvae settle in about two weeks. ORA has sold captive-bred tuxedos since 2019, but the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // No lifespan found; matures at 4–6 months → ~160 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 16, lifespanDays: 160, sexVisibleAtDays: 160, hatchSizeCm: 0.05 },

  hardiness: 0.7,
  difficulty: 'beginner',
  baseValue: 35,
  rarity: 'common',
  visitorAppeal: 0.7,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Many are wild-collected; ORA sells captive-bred ones in both colours.',
  conservation: { status: 'Not evaluated (IUCN)', note: 'Not assessed. Captive-bred tuxedo urchins are available, and the species is now a lab model animal.' },

  genetics: {
    loci: [
      {
        id: 'red',
        name: 'Red form',
        mode: 'mendelian',
        alleles: [
          { id: 'b', name: 'Blue', dominance: 2, frequency: 0.7 },
          { id: 'r', name: 'Red', dominance: 1, frequency: 0.3 },
        ],
        note: 'Blue and red tuxedos are one species, differing in the red pigment of the spines and test (Matar et al.). How it is inherited is unpublished; the game models red as a simple recessive.',
      },
    ],
    phenotypes: [
      { id: 'red', name: 'Red Tuxedo Urchin', layer: 'base', rarity: 0.15, when: [{ locus: 'red', allele: 'r', count: 'hom' }], visual: { bodyColor2: '#9e2b20', accentColor: '#c0402a', finColor2: '#d8604a' } },
      { id: 'blue', name: 'Blue Tuxedo Urchin', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#15181f',
      bodyColor2: '#1e1e28',
      bellyColor: '#3a3a42',
      finColor: '#d8d0c0',
      finColor2: '#5a5a66',
      accentColor: '#2456a6',
      eyeColor: '#101010',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.25,
      metallic: 0,
      translucency: 0.05,
      finType: 'urchin',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the urchin renderer: accent = the ten bare velvety bands (blue, or red-brown in the red form); body = the test between them; body2 = the short spines; fin2 = spine tips; belly = the oral side; fin = the debris it carries.',
  },
  visualMorphs: ['Blue Tuxedo Urchin', 'Red Tuxedo Urchin'],

  behaviorSet: 'urchin',
  behaviorTraits: { cruiseSpeed: 0.02, burstSpeed: 0.03, turnRate: 0.3, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0, nocturnal: 0.75, pickRadiusMul: 1.2 },
  specialBehaviors: ['coralline_graze', 'debris_carry', 'glass_graze'],

  encyclopedia: {
    summary: 'A round little urchin striped like a dinner jacket, which wears bits of shell and algae as a hat.',
    nativeHabitat: 'Shallow reefs, rubble and seagrass across the tropical Indo-Pacific.',
    socialStructure: 'Solitary; it pays its own kind no attention.',
    tankNeeds: 'A mature, brightly lit tank of 20 gallons or more with plenty of coralline and film algae, stable water and no copper.',
    compatibilityNotes: 'Peaceful and mostly reef-safe, but it grazes coralline algae, picks up loose frags and can loosen rockwork. Eaten by triggers, puffers and big wrasses.',
    breedingOverview: 'Spawns into the water; ORA raises captive-bred tuxedos.',
    conservationNote: 'Not assessed by the IUCN. Captive-bred ones are available.',
    funFact: 'It goes from egg to settled baby urchin in about two weeks — fast enough to make it a genetics lab animal.',
    inGameBehavior: 'Creeps over the glass and rock at night with a shell or two balanced on its spines, and parks in a crevice by day.',
    feedingNote: 'Grazes coralline, film and diatom algae; in a tank short of algae, clip on a little seaweed.',
    keeperTip: 'Add it only when coralline algae is plentiful — you can’t feed coralline from a jar.',
  },
  sourceReferences: [
    { id: 'worms-mespilia-globulus', title: 'WoRMS — Mespilia globulus (Linnaeus, 1758)', url: 'https://www.marinespecies.org/rest/AphiaRecordsByName/Mespilia%20globulus?like=false&marine_only=true', tier: 1, facts: ['accepted name'] },
    { id: 'matar-tuxedo-urchin', title: 'Matar et al. — the tuxedo urchin as a model animal (eLife reviewed preprint)', url: 'https://elifesciences.org/reviewed-preprints/112682', tier: 1, facts: ['red and blue forms are one species', 'larvae settle ~14 days', 'mature at 4–6 months'] },
    { id: 'digimorph-mespilia', title: 'Digimorph (UT Austin) — Mespilia globulus', url: 'https://digimorph.geo.utexas.edu/specimens/Mespilia_globulus/', tier: 1, facts: ['6–8 cm', 'covers itself with debris', 'common in aquarium stores'] },
    { id: 'liveaquaria-tuxedo-urchin', title: 'LiveAquaria — Tuxedo Urchin', url: 'https://www.liveaquaria.com/products/tuxedo-urchin', tier: 2, facts: ['20 gal', '72–78 °F, pH 8.1–8.4, SG 1.023–1.025', 'no high nitrate or copper', 'nocturnal grazer', '~$40'] },
    { id: 'qm-tuxedo-coralline', title: 'Quality Marine — Tuxedo urchins and coralline algae', url: 'https://www.qualitymarine.com/news/tuxedo-urchins-and-coralline-algae/', tier: 2, facts: ['grazes coralline', 'needs a mature tank', 'loosens rockwork', 'losing spines = poor water'] },
  ],
  confidenceNotes: [
    'Size differs by source (5–8 cm test); the game uses 7 cm across the spines.',
    'Sources disagree on five or ten bare bands; the game draws ten (Wikipedia, the commonest description).',
    'The red form’s inheritance is unpublished; modelled as a recessive.',
  ],
  exceptionRules: [],
  special: { needsAlgaeOrBiofilm: true, medicationSensitive: true, requiresMatureDays: 20 },
  visualLane: 'special',
};
