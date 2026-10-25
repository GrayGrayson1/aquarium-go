import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Lyretail anthias (sea goldie) — Pseudanthias squamipinnis. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#lyretail-anthias
 */
export const lyretailAnthias: SpeciesDefinition = {
  id: 'lyretail_anthias',
  commonName: 'Lyretail Anthias',
  scientificName: 'Pseudanthias squamipinnis',
  category: 'fish',
  group: 'anthias',
  genus: 'Pseudanthias',
  environment: 'marine',
  waterClasses: ['marine_live_rock', 'reef'],
  nativeRegion: 'Indo-West Pacific — the Red Sea and East Africa to Niue, north to Japan and south to Australia',
  isStarter: false,

  // FishBase / Fishes of Australia: males 15 cm TL, females 7 cm TL; sex change at about 5 cm. The game uses a middle size.
  adultSizeCm: 12,
  // LiveAquaria 125 gal; Quality Marine 125 gal; a harem needs a six-foot tank (hobby guides 150 gal / 150 cm).
  recommendedMinTankGallons: 125,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 18 },
  activeSwimmer: true,
  bioload: 1.3,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12. FishBase: 22–28 °C in the wild.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'high',
  lightPreference: 'moderate',
  diet: 'planktivore',
  foods: ['mysis', 'brine_shrimp', 'baby_brine', 'copepod_live', 'flake', 'pellet_small'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.75,
  feedingAggression: 0.45,
  // Plankton pickers: several small feedings a day (hobby guides: at least three or four).
  hungerHours: 8,

  activityZone: ['upper', 'middle'],
  temperament: 'semi_aggressive',
  territoriality: 0.4,
  aggression: 0.2,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'harem', minGroup: 1, idealGroup: 5, note: 'Keep one, or one male with four to six females. Two males fight. Buy females — the group makes its own male.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'ok',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Females live together peacefully; the male chases and displays at them. A second male is driven off or fought.',
  },

  predatorTags: ['copepod'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Hovers above the rock in the current; needs holes and ledges to dart into when frightened, and a lid (it jumps).' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 100, max: 1000 },
    incubationHours: 8,
    fryRearingHours: 480,
    cooldownDays: 2,
    conditions: { needsPartner: true, minTankGallons: 125 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'The male spawns with one female after another at dusk, releasing floating eggs with no care. The larvae spend about two months in the plankton; only a few have ever been reared (Marineland Antibes and ORA, 2019), so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // No Tier 1 lifespan; hobby guides 5–6 years in aquaria → ~220 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 220, sexVisibleAtDays: 14, hatchSizeCm: 0.15 },

  hardiness: 0.6,
  difficulty: 'intermediate',
  baseValue: 55,
  rarity: 'common',
  visitorAppeal: 0.8,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All trade anthias are wild-collected; captive rearing is still experimental.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2015)',
    note: 'Least Concern and widespread, forming huge shoals over Indo-Pacific reefs. All aquarium fish are wild-caught.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Colour varies by locality (Red Sea males are a deeper burgundy with yellow tail edges); females are golden orange and males purplish pink.')],
    phenotypes: [
      { id: 'wild', name: 'Lyretail Anthias', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#f58a1c', accentColor: '#7a48c4', patternContrast: 0.95 }),
    ],
    baseVisual: {
      bodyColor: '#f39a2b',
      bodyColor2: '#e07f22',
      bellyColor: '#ffc56e',
      finColor: '#f7a845',
      finColor2: '#f2c230',
      accentColor: '#8b5cc4',
      eyeColor: '#e5a23a',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.25,
      metallic: 0.05,
      translucency: 0.1,
      finType: 'anthias_lyretail',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Spindle-shaped, flattened fish with a big eye and a deeply forked lyre tail. Females (and young) golden orange with a violet-edged streak from below the eye to the pectoral base; males purplish pink with a red patch on the pectoral fin, a blue anal fin, longer tail lobes and a long third dorsal spine. The art draws the male colours from the creature’s sex.',
  },
  visualMorphs: ['Lyretail Anthias (no morphs; orange females, magenta males)'],

  behaviorSet: 'chromis',
  behaviorTraits: { cruiseSpeed: 1.2, burstSpeed: 6, turnRate: 3.2, hoverTendency: 0.65, schoolingTightness: 0.35, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.03, curiosity: 0.4, nocturnal: 0 },
  specialBehaviors: ['hover_in_current', 'plankton_pick', 'harem_display', 'sex_change'],

  encyclopedia: {
    summary: 'The classic reef shoal fish: golden-orange females and a magenta male hovering in the current above the rock.',
    nativeHabitat: 'Clear lagoons, channels and outer slopes 0–55 m deep, in big plankton-feeding groups over coral heads.',
    socialStructure: 'Harems of one male with several females inside larger shoals. If the male is lost, the dominant female becomes the new male.',
    tankNeeds: 'A six-foot tank (125 gallons or more) with open water above plenty of rock, strong flow, a tight lid and several small feedings every day.',
    compatibilityNotes: 'Reef-safe and safe with invertebrates. Keep one male per tank; a second is fought. Feeds fast, so slow feeders like seahorses lose out.',
    breedingOverview: 'Spawns nightly at dusk, scattering floating eggs; the long larval stage has only been reared experimentally.',
    conservationNote: 'Least Concern (IUCN 2015). All aquarium anthias are wild-caught.',
    funFact: 'A group that loses its male makes a new one in two to four weeks; a group of females kept with no male at all can take most of a year.',
    inGameBehavior: 'Hovers in a loose group facing the current, darting up to pick food from the water and back down into the rock when startled.',
    feedingNote: 'Picks plankton from the water all day: thawed mysis and enriched brine shrimp, baby brine and copepods, with small flake or pellets. Feed small amounts at least three times a day — an autofeeder helps.',
    keeperTip: 'Feed little and often — at least three times a day. A hungry anthias fades and thins fast.',
  },
  sourceReferences: [
    { id: 'fishbase-pseudanthias-squamipinnis', title: 'FishBase — Pseudanthias squamipinnis (Sea goldie)', url: 'https://www.fishbase.se/summary/Pseudanthias-squamipinnis.html', tier: 1, facts: ['males 15 cm, females 7 cm TL', 'depth 0–55 m', '22–28 °C', 'zooplankton feeder', 'protogynous', 'IUCN Least Concern (2015)'] },
    { id: 'fishbase-repro-pseudanthias-squamipinnis', title: 'FishBase — Reproduction of Pseudanthias squamipinnis', url: 'https://fishbase.se/Reproduction/6568', tier: 1, facts: ['sex change at ~5 cm', 'dominant female changes in 2–4 weeks when the male is removed', 'all-female groups 170–280 days', 'pelagic batch spawner, no care'] },
    { id: 'foa-pseudanthias-squamipinnis', title: 'Fishes of Australia — Pseudanthias squamipinnis', url: 'https://fishesofaustralia.net.au/home/species/4402', tier: 1, facts: ['females golden orange with violet streak eye to pectoral', 'males purplish pink, red pectoral patch, blue anal fin', 'juveniles start female'] },
    { id: 'liveaquaria-lyretail-anthias', title: 'LiveAquaria — Lyretail Anthias', url: 'https://www.liveaquaria.com/product/54/?pcatid=54', tier: 2, facts: ['125 gal', '72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12', 'semi-aggressive', 'one male per tank', 'feed mysis, brine and flake through the day', 'price ~$45–70'] },
    { id: 'thatpetplace-lyretail-anthias', title: 'That Pet Place — Lyretail Anthias', url: 'https://www.thatpetplace.com/Pseudanthias-squamipinnis-lyretail-anthias-239115', tier: 2, facts: ['one male to six or more females', 'several feedings a day', 'reef safe'] },
  ],
  confidenceNotes: [
    'Name: the Catalog of Fishes now limits P. squamipinnis to the Red Sea and western Indian Ocean and calls Pacific fish P. cheirospilos; FishBase, WoRMS and the hobby still use one species, as the game does.',
    'Tank size varies by source from 55 to 150 gallons; the game uses 125 with a six-foot footprint (LiveAquaria, Quality Marine).',
    'Lifespan has no Tier 1 figure (hobby guides 5–7 years).',
    'Sex change runs in the game without breeding (special.socialSexChange): a group of two or more adult females with no male makes one, faster than the real 2–4 weeks.',
  ],
  exceptionRules: [
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'Anthias snatch food from the water long before a slow seahorse can reach it.', incidentRisk: 0.05, mitigatedBy: ['target_feeding'] },
  ],
  special: {
    escapeArtist: true,
    socialSexChange: true,
  },
  visualLane: 'fish',
};
