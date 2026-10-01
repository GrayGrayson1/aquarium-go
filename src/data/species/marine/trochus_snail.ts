import type { SpeciesDefinition } from '@/types';

/**
 * Trochus snail — Trochus sp. (banded trochus, often sold as T. histrio). Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#trochus-snail
 */
export const trochusSnail: SpeciesDefinition = {
  id: 'trochus_snail',
  commonName: 'Trochus Snail',
  scientificName: 'Trochus sp.',
  category: 'invertebrate',
  group: 'snail',
  genus: 'Trochus',
  environment: 'marine',
  waterClasses: ['marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific reef flats and rocky shallows; trade animals are mostly captive-bred',
  isStarter: false,

  // LiveAquaria lists ~1 in; care guides report 1–3 in (2.5–7.5 cm) depending on the species sold.
  adultSizeCm: 3,
  recommendedMinTankGallons: 5,
  recommendedFootprint: { minLengthIn: 16, minWidthIn: 8 },
  activeSwimmer: false,
  bioload: 0.1,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025. BRS: 75–80 °F, SG 1.023–1.026.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.8, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.022, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'herbivore',
  foods: ['biofilm', 'algae_wafer', 'nori'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.05,
  feedingAggression: 0,
  hungerHours: 18,

  activityZone: ['glass', 'decor', 'bottom'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 4, note: 'Roughly one snail per 2–3 gallons in an algae-producing tank.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Entirely peaceful with its own kind.' },

  predatorTags: [],
  preyTags: ['snail'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 0,
  coverPreference: 0.2,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Grazes rock and glass; needs a mature tank with film algae or supplemental seaweed.' },

  breeding: {
    system: 'egg_layer_generic',
    difficulty: 0.35,
    maturityDays: 12,
    clutchSize: { min: 200, max: 2000 },
    // Broadcast spawners: eggs hatch within about a day → ~1 day × 8.
    incubationHours: 8,
    // Short, non-feeding larval stage; juveniles settle within about a week (AlgaeBarn).
    fryRearingHours: 56,
    cooldownDays: 10,
    conditions: { needsPartner: true, minTempC: 24, minTankGallons: 10 },
    predationWithoutNursery: 0.98,
    nurseryRequired: false,
    maxRaisedPerClutch: 6,
    notes: 'Males and females release sperm and eggs into the water column (a milky cloud, often at night). Because the larval stage is very short, a few tiny snails can settle and grow on the glass and rock without any help — Trochus is one of the few reef snails that reproduces in home aquaria.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 10, adultDays: 14, lifespanDays: 140, sexVisibleAtDays: 140, hatchSizeCm: 0.05 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 7,
  rarity: 'common',
  visitorAppeal: 0.15,
  unlock: { requires: ['marine_basics'], hint: 'Research Marine Systems to unlock beginner marine fish and clean-up crew.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed. Captive-bred Trochus are widely available and adapt better than wild-collected snails — choose them.',
  },

  genetics: {
    loci: [
      {
        id: 'band',
        name: 'Shell banding',
        mode: 'additive',
        alleles: [
          { id: 'fine', name: 'Fine stripes', dominance: 1, frequency: 0.7 },
          { id: 'bold', name: 'Bold stripes', dominance: 1, frequency: 0.3 },
        ],
        note: 'Shell stripe boldness varies naturally between individuals and species sold as "Trochus". Not a commercial morph.',
      },
    ],
    phenotypes: [
      { id: 'wild', name: 'Banded Trochus', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'bold_band', name: 'Boldly banded', layer: 'overlay', rarity: 0.05, when: [{ locus: 'band', allele: 'bold', count: 'hom' }], visual: { patternContrast: 1, patternScale: 1.3 }, note: 'Individual variation.' },
    ],
    baseVisual: {
      bodyColor: '#e6d8c1',
      bodyColor2: '#c9b79a',
      bellyColor: '#8f9885',
      finColor: '#7f8b77',
      finColor2: '#d9cdb6',
      accentColor: '#9a3a2c',
      eyeColor: '#161616',
      pattern: 'bars',
      patternScale: 1,
      patternContrast: 0.8,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0,
      translucency: 0,
      finType: 'snail_trochus',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the snail renderer: body/body2 = cream to tan conical shell; accent = red-brown oblique stripes; belly/fin = mottled grey-green foot and tentacles; fin2 = pale shell base. Worn shell tips show a pearly iridescent layer.',
  },
  visualMorphs: ['Banded Trochus (natural variation)'],

  behaviorSet: 'snail',
  behaviorTraits: { cruiseSpeed: 0.03, burstSpeed: 0.05, turnRate: 0.5, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.1, nocturnal: 0.5, pickRadiusMul: 1.5 },
  specialBehaviors: ['glass_graze', 'self_right', 'broadcast_spawn'],

  encyclopedia: {
    summary: 'A striped, cone-shelled grazer that keeps glass and rock free of film algae — and can flip itself back over.',
    nativeHabitat: 'Rocky reef flats and shallow hard bottoms across the Indo-Pacific, grazing algae films.',
    socialStructure: 'Solitary grazers that tolerate each other completely; they gather to spawn.',
    tankNeeds: 'A mature tank with film algae and diatoms (or supplemental seaweed), stable salinity and no copper. About one snail per 2–3 gallons.',
    compatibilityNotes: 'Completely reef-safe. At risk from puffers, triggers, mantis shrimp and, occasionally, shell-hunting hermit crabs.',
    breedingOverview: 'Broadcast spawns a milky cloud of eggs and sperm. The larval stage is so short that babies can appear on the glass without any help.',
    conservationNote: 'Not assessed by the IUCN. Captive-bred snails are easy to find — choose them over wild-collected ones.',
    funFact: 'Unlike Tectus and Astraea snails, a Trochus knocked on its back can twist its foot around and right itself.',
    inGameBehavior: 'Slides slowly over glass and rock leaving clean trails, rights itself if it tumbles, and sometimes spawns at night.',
    feedingNote: 'Rasps film algae, diatoms and cyanobacteria off glass and rock. If the tank runs low on algae, add an algae wafer or a scrap of seaweed sheet a few times a week. An autofeeder with wafers is only a top-up.',
    keeperTip: 'Drip-acclimate new snails over about an hour. They cope with sudden salinity changes far worse than fish, and a rushed transfer is a common cause of early losses.',
  },
  sourceReferences: [
    { id: 'liveaquaria-banded-trochus', title: 'LiveAquaria — Banded Trochus Snail', url: 'https://www.liveaquaria.com/product/564/?pcatid=564', tier: 2, facts: ['eats film algae, cyanobacteria, diatoms', 'rights itself when knocked over (unlike Tectus)', 'breeds easily in aquaria', 'not easily eaten by crabs', 'copper intolerant', '1 per 2–3 gal', '72–78 °F, SG 1.023–1.025'] },
    { id: 'brs-trochus-care', title: 'Bulk Reef Supply — How To Care For Trochus Snails', url: 'https://www.bulkreefsupply.com/content/post/how-to-care-for-trochus-snails', tier: 2, facts: ['herbivore grazing glass, rock, sand', 'rights itself', 'spawns in aquaria', '75–80 °F, SG 1.023–1.026', 'avoid puffers'] },
    { id: 'sealifebase-trochus-histrio', title: 'SeaLifeBase — Trochus histrio (Actor top)', url: 'https://www.sealifebase.se/summary/Trochus-histrio.html', tier: 1, facts: ['max 5 cm shell height', 'intertidal and shallow sublittoral to 30 m, on rocks near reefs', 'western Pacific', 'archaeogastropods are gonochoric broadcast spawners with trochophore then veliger larvae', 'IUCN Not Evaluated'] },
    { id: 'algaebarn-trochus', title: 'AlgaeBarn — Using the Trochus Snail', url: 'https://www.algaebarn.com/blog/clean-up-crew/utilizing-the-trochus-snail-trochus-spp/', tier: 3, facts: ['captive-bred', 'larvae settle within the week they were spawned'] },
  ],
  confidenceNotes: [
    'Taxonomy: "Trochus sp." in the trade covers several species (often labelled T. histrio). Values are for the typical small banded trochus.',
    'Larval duration: AlgaeBarn says juveniles settle within the week; LiveAquaria says larvae "mature over several months" (probably meaning growth to visible size). The game uses a short larval phase and slow growth.',
    'Clutch size is a broad placeholder for a broadcast spawner (not measured for aquarium Trochus).',
  ],
  exceptionRules: [
    { other: 'hermit_crab', verdictFloor: 'usually_compatible', reason: 'Blue-leg hermits sometimes kill snails for their shells, but the Trochus shell shape makes it a less tempting target. Spare shells reduce the risk further.', incidentRisk: 0.015 },
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'Smashing mantis shrimp crack snail shells with ease — snails are staple prey.', incidentRisk: 0.5 },
  ],
  special: {
    needsAlgaeOrBiofilm: true,
    medicationSensitive: true,
  },
  visualLane: 'special',
};
