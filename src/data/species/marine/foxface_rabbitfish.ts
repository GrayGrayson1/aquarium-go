import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Foxface rabbitfish — Siganus vulpinus. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#foxface-rabbitfish
 */
export const foxfaceRabbitfish: SpeciesDefinition = {
  id: 'foxface_rabbitfish',
  commonName: 'Foxface Rabbitfish',
  scientificName: 'Siganus vulpinus',
  category: 'fish',
  group: 'rabbitfish',
  genus: 'Siganus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Eastern Indian Ocean and western Pacific — Indonesia and the Philippines to the Marshall Islands, Kiribati, New Caledonia and the Great Barrier Reef',
  isStarter: false,

  // FishBase max 25 cm SL, common 20 cm TL; LiveAquaria 9 in.
  adultSizeCm: 22,
  // LiveAquaria 125 gal.
  recommendedMinTankGallons: 125,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 18 },
  activeSwimmer: true,
  bioload: 3.2,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 27 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['nori', 'vegetable', 'algae_wafer', 'pellet_small', 'mysis'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.75,
  feedingAggression: 0.45,
  hungerHours: 12,

  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.35,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.08, note: 'One per tank, or a pair in a very large tank. Peaceful except toward other rabbitfish.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Adults live alone or in pairs; juveniles school. Unpaired adults and other rabbitfish species squabble.',
  },

  predatorTags: ['coral_polyp'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'unsafe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.15,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs open swimming room plus rock or branching coral to shelter in at night.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    clutchSize: { min: 10000, max: 100000 },
    incubationHours: 8,
    fryRearingHours: 480,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Rabbitfish spawn in open water and have pelagic larvae. Other Siganus species are farmed for food, but the foxface is not bred for the aquarium trade.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // ~10+ years in aquaria → 420 game-days.
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 420, sexVisibleAtDays: 420, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 105,
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  unlock: { requires: ['marine_large'], hint: 'Research Big-water Marine — it needs a six-foot tank.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All foxface in the trade are wild-collected (mainly Indonesia and the Philippines).',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2015)',
    note: 'Common on coral-rich reefs. Wild-collected for the trade; its hardiness means well-kept fish live for many years.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Its colour changes behaviourally — dark mottling when frightened or asleep — rather than genetically.')],
    phenotypes: [
      { id: 'wild', name: 'Foxface', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#ffd614', accentColor: '#140f0b' }),
    ],
    baseVisual: {
      bodyColor: '#f8d21c',
      bodyColor2: '#f0bd12',
      bellyColor: '#fbe36a',
      finColor: '#f7cf1f',
      finColor2: '#e9b30e',
      accentColor: '#211811',
      eyeColor: '#1a1512',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.08,
      finType: 'rabbitfish',
      finLength: 1,
      bodyDepth: 1.1,
      gillFullness: 0,
    },
    variation: 0.1,
    notes: 'Deep, laterally compressed body, bright yellow all over except a "fox mask": a dark chocolate band from the snout through the eye (accent) and a dark chest/throat patch, separated by a white blaze. Small pointed snout, tall spiny dorsal fin. When frightened or at night it turns blotchy dark brown and white (mottle state, not a morph).',
  },
  visualMorphs: ['Foxface (no morphs; behavioural mottling)'],

  behaviorSet: 'rabbitfish',
  behaviorTraits: { cruiseSpeed: 0.9, burstSpeed: 5, turnRate: 2.2, hoverTendency: 0.5, schoolingTightness: 0.1, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['macroalgae_graze', 'mottle_camouflage', 'spine_raise', 'pair_swim', 'hide_head_down'],

  encyclopedia: {
    summary: 'A bright yellow grazer with a fox-like masked face — and venomous spines that make even predators think twice.',
    nativeHabitat: 'Coral-rich lagoons and seaward reefs to 30 m in the eastern Indian Ocean and western Pacific, often among staghorn coral.',
    socialStructure: 'Adults live alone or in pairs; juveniles sometimes gather in large schools grazing algae at the base of corals.',
    tankNeeds: 'A six-foot tank (125+ gallons) with room to swim, rock to shelter in and plenty of seaweed and vegetable foods. It happily eats nuisance macroalgae.',
    compatibilityNotes: 'Peaceful with most fish and invertebrates. Mostly reef-safe when well fed, though hungry fish may nibble some LPS and soft corals. Fights other rabbitfish. Too boisterous a feeder for seahorses.',
    breedingOverview: 'Spawns in open water with drifting larvae. Not bred for the aquarium trade.',
    conservationNote: 'Least Concern (IUCN 2015). All aquarium foxface are wild-caught, so long-term care matters.',
    funFact: 'Rabbitfish venom has been compared to stonefish venom. When threatened the foxface raises its spines, turns blotchy brown and angles its body to point them at the threat.',
    inGameBehavior: 'Grazes the rock and any seaweed you offer, raises its dorsal spines when startled, and fades to a mottled night pattern while resting head-down among the rocks.',
    feedingNote: 'A daytime grazer. Clip in seaweed sheets every day, plus algae wafers, blanched vegetables or gel food, with some small pellets and mysis, two or three times a day. An autofeeder can add pellets, but the seaweed goes on by hand.',
    keeperTip: 'Move it in a container, not a net — its venomous spines snag in mesh — and keep your hands clear of it during tank maintenance.',
  },
  sourceReferences: [
    { id: 'fishbase-siganus-vulpinus', title: 'FishBase — Siganus vulpinus (Foxface)', url: 'https://www.fishbase.se/summary/Siganus-vulpinus.html', tier: 1, facts: ['max 25 cm SL, common 20 cm TL', 'depth 1–30 m', 'coral-rich reefs, often among staghorn coral', 'singly or pairs; juveniles school', 'feeds on algae', 'stout venomous spines', 'IUCN Least Concern (2015)'] },
    { id: 'liveaquaria-foxface', title: 'LiveAquaria — Foxface Lo', url: 'https://www.liveaquaria.com/product/687/?pcatid=687', tier: 2, facts: ['min tank 125 gal', 'max 9 in', 'reef compatible with caution — may nip LPS and soft corals if underfed', 'venomous dorsal spines', 'eats undesirable algae', 'peaceful except with other rabbitfish', 'price ~$110'] },
    { id: 'wikipedia-foxface', title: 'Wikipedia — Foxface rabbitfish (summarising FishBase and Australian Museum)', url: 'https://en.wikipedia.org/wiki/Foxface_rabbitfish', tier: 3, facts: ['changes to dark brown when threatened', 'duller mottled pattern at night or under stress', 'rabbitfish venom similar to stonefish venom'] },
  ],
  confidenceNotes: [
    'Reef safety: LiveAquaria says "with caution" (nips LPS/soft corals when hungry); the brief and hobby experience call it mostly reef-safe. Modelled as mostly_safe with coralRisk 0.15.',
    'Venom: FishBase confirms venomous spines; keeper safety flagged via special.venomous.',
    'No commercial captive breeding found. Lifespan (~10+ years) is a care-sheet estimate.',
  ],
  exceptionRules: [
    { other: 'yellow_tang', verdictFloor: 'usually_compatible', reason: 'Two yellow, disc-shaped herbivores may chase each other at first, but usually settle in a large tank.', incidentRisk: 0.02, mitigatedBy: ['tank_size'] },
  ],
  special: {
    venomous: true,
    outgrowsSmallTanks: true,
  },
  visualLane: 'fish',
};
