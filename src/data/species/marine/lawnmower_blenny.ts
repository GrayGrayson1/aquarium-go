import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Lawnmower blenny (jewelled rockskipper) — Salarias fasciatus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#lawnmower-blenny
 */
export const lawnmowerBlenny: SpeciesDefinition = {
  id: 'lawnmower_blenny',
  commonName: 'Lawnmower Blenny',
  scientificName: 'Salarias fasciatus',
  category: 'fish',
  group: 'blenny',
  genus: 'Salarias',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — the Red Sea and East Africa to Samoa and New Caledonia, on algae-rich reef flats 0–8 m deep',
  isStarter: false,

  // FishBase / Fishes of Australia 14 cm TL; aquarium fish ~5 in.
  adultSizeCm: 13,
  // LiveAquaria and Quality Marine 30 gal; Reef Builders 40 gal.
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1.1,

  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'herbivore',
  foods: ['biofilm', 'detritus', 'nori', 'algae_wafer', 'vegetable', 'mysis', 'pellet_small'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.4,
  feedingAggression: 0.3,
  hungerHours: 14,

  activityZone: ['bottom', 'decor', 'glass'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.2,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank; it fights other blennies and fish of its shape.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Two lawnmowers fight over grazing ground.' },

  predatorTags: [],
  preyTags: ['fish_medium', 'fish_benthic'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'caution',
  reefSafe: 'mostly_safe',
  coralRisk: 0.05,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.55,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Perches on rock and grazes the film and turf algae all day; it starves in a new or spotless tank.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 200, max: 2000 },
    incubationHours: 32,
    fryRearingHours: 400,
    cooldownDays: 6,
    conditions: { needsPartner: true, minTankGallons: 40 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Lays adhesive eggs in a crevice, guarded by the male (spring to early summer in Okinawa). Biota released the first captive-bred fish in 2023; not bred in home aquaria, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // Hobby sources 2–6 years → ~160 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 160, sexVisibleAtDays: 160, hatchSizeCm: 0.2 },

  hardiness: 0.7,
  difficulty: 'intermediate',
  baseValue: 30,
  rarity: 'common',
  visitorAppeal: 0.75,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Most are wild-collected; Biota sells small captive-bred lots (since 2023).',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Least Concern and common on shallow reef flats.' },

  genetics: {
    loci: [intensityLocus('No colour forms. Olive-tan to brown with darker bars, white spots and small blue spots toward the rear; it shifts colour to match its perch.')],
    phenotypes: [
      { id: 'wild', name: 'Lawnmower Blenny', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#ffffff', patternContrast: 0.85 }),
    ],
    baseVisual: {
      bodyColor: '#8a8458',
      bodyColor2: '#5e5233',
      bellyColor: '#c9c4a3',
      finColor: '#9c9670',
      finColor2: '#7a7454',
      accentColor: '#f2f2e6',
      eyeColor: '#c8b060',
      pattern: 'mottled',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.08,
      finType: 'blenny',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Elongate combtooth blenny with a blunt head, a wide low mouth, high bulging eyes with branched cirri over them, a long dorsal fin joined to the tail base, and short pelvics it perches on. Olive-tan mottled with darker bars (body2), white spots (accent), dark streaks on the front body; translucent olive fins with dark spots.',
  },
  visualMorphs: ['Lawnmower Blenny (no morphs)'],

  behaviorSet: 'blenny',
  behaviorTraits: { cruiseSpeed: 0.5, burstSpeed: 4, turnRate: 3, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 0.9, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.75, nocturnal: 0 },
  specialBehaviors: ['rock_perch', 'perch_hop', 'turf_graze', 'eye_swivel'],

  encyclopedia: {
    summary: 'A comical, big-eyed blenny that props itself on the rock and mows the film algae all day.',
    nativeHabitat: 'Algae-rich reef flats, lagoons and rubble 0–8 m deep; it can breathe air for short spells.',
    socialStructure: 'Solitary; it pairs only to spawn.',
    tankNeeds: 'A mature tank of 30 gallons or more with lots of rock carrying film and turf algae, and a lid (it jumps).',
    compatibilityNotes: 'Peaceful with most fish and safe with shrimp, crabs and snails, but it fights other blennies and similar-shaped fish. One per tank. It may nip small-polyp stony corals.',
    breedingOverview: 'Lays eggs in a crevice that the male guards; captive-bred fish became available in 2023.',
    conservationNote: 'Least Concern (IUCN 2009). Captive-bred lots exist.',
    funFact: 'It has little or no swim bladder, which is why it hops from perch to perch instead of hovering.',
    inGameBehavior: 'Sits propped on its fins on the rock, rolling its eyes about, then hops to another spot to graze.',
    feedingNote: 'Grazes film and turf algae and detritus all day. In a tank without much algae, clip on seaweed daily and offer algae wafers; captive-bred fish also take mysis and small pellets. The seaweed goes on by hand.',
    keeperTip: 'Add it only to a mature tank with steady algae growth — some wild fish never take prepared food.',
  },
  sourceReferences: [
    { id: 'fishbase-salarias-fasciatus', title: 'FishBase — Salarias fasciatus (Jewelled blenny)', url: 'https://www.fishbase.se/summary/Salarias-fasciatus.html', tier: 1, facts: ['14 cm TL', 'depth 0–8 m', 'scrapes algae', 'solitary', 'facultative air-breather', 'IUCN Least Concern (2009)'] },
    { id: 'foa-salarias-fasciatus', title: 'Fishes of Australia — Salarias fasciatus', url: 'https://fishesofaustralia.net.au/home/species/4759', tier: 1, facts: ['14 cm', 'combs detritus from turf algae', 'colour pattern'] },
    { id: 'awata-2010-salarias', title: 'Awata et al. (2010) Reproductive behaviour of Salarias fasciatus. Ichthyological Research 57:161–168', url: 'https://agris.fao.org/search/en/records/64724de253aa8c896305af08', tier: 1, facts: ['males guard the eggs', 'breeds April–June in Okinawa', 'males have longer anal spines'] },
    { id: 'liveaquaria-lawnmower-blenny', title: 'LiveAquaria — Lawnmower Blenny', url: 'https://www.liveaquaria.com/products/sailfin-algae-blenny', tier: 2, facts: ['30 gal', 'perches on rock', 'one per tank', 'may nip SPS and clams', '~$30'] },
    { id: 'reefbuilders-lawnmower-2015', title: 'Reef Builders (2015) — The lawnmower blenny', url: 'https://reefbuilders.com/2015/05/08/the-lawnmower-blenny-a-funny-fascinating-fish-of-unpredictable-utility', tier: 2, facts: ['40 gal', 'needs a mature tank', 'some never accept prepared food', 'cirri over the eyes'] },
  ],
  confidenceNotes: [
    'Reef safety: LiveAquaria warns of SPS and clam nipping; other sources call it reef-safe. The game marks it mostly safe.',
    'Sources disagree on whether the dorsal fin is notched.',
    'Lifespan (2–6 years) comes from hobby sources only.',
    'Diet: Fishes of Australia calls it mainly a detritivore (it combs detritus from turf algae); the game files it as a grazing herbivore whose foods include detritus.',
  ],
  exceptionRules: [
    { other: 'tag:blenny', verdictFloor: 'high_risk', reason: 'Fights other blennies over grazing ground and perches.', incidentRisk: 0.1, mitigatedBy: ['tank_size', 'sight_breaks'] },
  ],
  special: { needsAlgaeOrBiofilm: true, escapeArtist: true },
  visualLane: 'fish',
};
