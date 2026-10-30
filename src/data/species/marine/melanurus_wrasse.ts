import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Melanurus wrasse (tail-spot wrasse) — Halichoeres melanurus. Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#melanurus-wrasse
 */
export const melanurusWrasse: SpeciesDefinition = {
  id: 'melanurus_wrasse',
  commonName: 'Melanurus Wrasse',
  scientificName: 'Halichoeres melanurus',
  category: 'fish',
  group: 'wrasse',
  genus: 'Halichoeres',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Western Pacific — Bali and Western Australia to Micronesia and Samoa, north to Japan, south to the Great Barrier Reef',
  isStarter: false,

  // FishBase 14 cm TL; Fishes of Australia 11 cm; hobby sources 4.5–5 in (~12 cm).
  adultSizeCm: 12,
  // LiveAquaria / Quality Marine 50 gal; Top Shelf 55 gal.
  recommendedMinTankGallons: 50,
  recommendedFootprint: { minLengthIn: 48, minWidthIn: 13 },
  activeSwimmer: true,
  bioload: 1.1,

  // Quality Marine: 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; Top Shelf 74–80 °F.
  tempC: { min: 21, max: 28, idealMin: 23, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'bright',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'pellet_sinking', 'flake', 'copepod_live'],
  feedingStyle: 'picker',
  feedingSpeed: 0.75,
  feedingAggression: 0.45,
  hungerHours: 10,

  activityZone: ['lower', 'middle', 'decor', 'substrate'],
  temperament: 'peaceful',
  territoriality: 0.35,
  aggression: 0.2,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'harem', minGroup: 1, idealGroup: 3, note: 'Keep one, or one male with two to four females added together.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'ok',
    mixed: 'courtship_ok',
    juvenile: 'ok',
    note: 'One male holds a small harem; two males fight. If the male is lost, the dominant female turns male within a few weeks.',
  },

  // Fireworms, flatworms and pest snails — and also small shrimp, feather dusters and tube worms.
  predatorTags: ['copepod', 'worm', 'snail_small', 'shrimp_fry', 'shrimp_dwarf', 'sessile_invert'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 2,

  shrimpSafe: 'caution',
  snailSafe: 'mostly_safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.45,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['bare', 'gravel', 'large_pebbles'], note: 'Sleeps buried in the sand and dives into it when frightened: give it at least 3 in of fine sand, never crushed coral.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 14,
    clutchSize: { min: 300, max: 3000 },
    incubationHours: 8,
    fryRearingHours: 180,
    cooldownDays: 2,
    conditions: { needsPartner: true, minTankGallons: 50 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'The male displays from a high point at sunset and spawns with each female in turn; the floating eggs get no care. The University of Florida and Rising Tide reared it in 2015 (settlement at 22 days), but it is not bred commercially, so the game does not breed it.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // No Tier 1 lifespan; hobby guides 5–7 years → ~240 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 240, sexVisibleAtDays: 14, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 55,
  rarity: 'common',
  visitorAppeal: 0.7,
  unlock: { requires: [] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Trade fish are wild-collected; captive rearing has been done only in research.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2008)',
    note: 'Least Concern and common on shallow western Pacific reefs. Aquarium fish are wild-collected.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Females and young are pinstriped orange and blue with black eyespots; terminal males turn mauve with green-blue stripes, pink-orange head bands and blue bars, and lose the front eyespot first as they change.')],
    phenotypes: [
      { id: 'wild', name: 'Melanurus Wrasse', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#f7952a', bodyColor: '#3477c8', patternContrast: 0.95 }),
    ],
    baseVisual: {
      bodyColor: '#2f6fc0',
      bodyColor2: '#24549a',
      bellyColor: '#7fb0dc',
      finColor: '#f0b23a',
      finColor2: '#3e80c9',
      accentColor: '#f2a33a',
      eyeColor: '#d8402a',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.08,
      metallic: 0,
      translucency: 0.05,
      finType: 'wrasse',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Slim, spindle-shaped wrasse with a nearly straight head profile, a small terminal mouth, a long low dorsal fin and a squared tail. Females: alternating orange-yellow and blue stripes, a yellow-green head, a small black spot at the front of the dorsal fin, a large ringed eyespot mid-dorsal and a small one at the top of the tail base. Males: mauve body, green-blue stripes, pinkish-orange wavy bands on a yellow-green head, narrow blue bars above, a yellow pectoral base with black scales behind it and a black tail tip. The art draws the male colours from the creature’s sex.',
  },
  visualMorphs: ['Melanurus Wrasse (no morphs; striped females, mauve males)'],

  behaviorSet: 'wrasse',
  behaviorTraits: { cruiseSpeed: 1.5, burstSpeed: 6, turnRate: 4, hoverTendency: 0.25, schoolingTightness: 0, restOnBottom: 0, hitching: 0, burrowing: 0.9, glassSurfing: 0.03, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['sand_sleep', 'sand_dive', 'pest_hunt', 'rock_pick'],

  encyclopedia: {
    summary: 'A busy, pinstriped reef wrasse that hunts pests over the rock all day and sleeps buried in the sand at night.',
    nativeHabitat: 'Shallow coral reefs and rocky shores 1–15 m deep, alone or in small groups.',
    socialStructure: 'A male with a small harem of females. Every fish starts female; the dominant one turns male if the group has none.',
    tankNeeds: 'A 50-gallon or larger tank with live rock to hunt over, at least 3 in of fine sand to sleep in, and a tight lid.',
    compatibilityNotes: 'Safe with corals and peaceful with other fish, and a famous hunter of flatworms, fireworms and pyramid snails — but it also eats small shrimp, feather dusters and tube worms.',
    breedingOverview: 'Spawns at sunset after the male displays, scattering floating eggs with no care. Reared in research in 2015, not commercially.',
    conservationNote: 'Least Concern (IUCN 2008). Aquarium fish are wild-collected.',
    funFact: 'When a female starts turning male, the black spot at the front of her dorsal fin is the first thing to fade.',
    inGameBehavior: 'Zips low over rock and sand pecking at tiny prey, dives into the sand when frightened, and vanishes into it at lights-out.',
    feedingNote: 'A meaty picker: thawed mysis and enriched brine shrimp with small pellets or flake, two or three times a day; it also hunts live copepods and pests in the rock. An autofeeder with pellets suits it.',
    keeperTip: 'Give it 3 in of fine sand and a tight lid, and don’t trust it with small ornamental shrimp.',
  },
  sourceReferences: [
    { id: 'fishbase-halichoeres-melanurus', title: 'FishBase — Halichoeres melanurus (Tail-spot wrasse)', url: 'https://www.fishbase.se/summary/Halichoeres-melanurus.html', tier: 1, facts: ['14 cm TL', 'depth 1–15 m', 'eats polychaetes, copepods, isopods and forams', 'alone or in small groups', 'IUCN Least Concern (2008)'] },
    { id: 'foa-halichoeres-melanurus', title: 'Fishes of Australia — Halichoeres melanurus', url: 'https://fishesofaustralia.net.au/home/species/235', tier: 1, facts: ['11 cm TL', 'female stripes and eyespots', 'male mauve with green-blue stripes and blue bars', 'black scales behind the pectoral'] },
    { id: 'was-2015-halichoeres-larviculture', title: 'University of Florida (World Aquaculture Society abstract) — larviculture of Halichoeres melanurus', url: 'https://www.was.org/MeetingAbstracts/ShowAbstract/42634', tier: 1, facts: ['pelagic eggs ~660 µm', 'spawns at sunset', 'settlement 22 days post-hatch', 'front dorsal spot fades first in sex change'] },
    { id: 'tfh-halichoeres-melanurus', title: 'Tropical Fish Hobbyist — Halichoeres melanurus', url: 'https://tfhmagazine.com/articles/saltwater/halichoeres-melanurus', tier: 2, facts: ['very hardy', 'sleeps buried in sand', 'at least 3 in of fine sand', 'protogynous harem; female turns male within weeks', 'eats pest flatworms and snails'] },
    { id: 'liveaquaria-melanurus-wrasse', title: 'LiveAquaria — Melanurus Wrasse', url: 'https://www.liveaquaria.com/product/2285/', tier: 2, facts: ['50 gal', 'peaceful', 'eats fireworms, pyramid snails and flatworms', 'may eat feather dusters, tube worms and shrimp', '2–3 in of sand', 'jumps', 'price ~$52'] },
  ],
  confidenceNotes: [
    'Adult size varies by source (11–14 cm); the game uses 12 cm.',
    'Reef safety is a judgement call: safe with corals in every source, but it eats small shrimp and some sessile invertebrates (LiveAquaria, Top Shelf), so the game marks it mostly safe.',
    'Lifespan has no Tier 1 figure (hobby guides 5–7 years).',
    'Juvenile colours rest on retailer text and a Reef Life Survey description; the game draws them as duller pinstripes with two dorsal eyespots.',
  ],
  exceptionRules: [
    { other: 'tag:shrimp_dwarf', verdictFloor: 'conditional', reason: 'Picks off small ornamental shrimp (sexy shrimp, dwarf shrimp) and their young.', incidentRisk: 0.05, mitigatedBy: ['cover'] },
    { other: 'lined_seahorse', verdictFloor: 'conditional', reason: 'A fast, busy feeder that gets to food before a seahorse; workable only with target feeding.', incidentRisk: 0.03, mitigatedBy: ['target_feeding'] },
  ],
  special: {
    burrower: true,
    escapeArtist: true,
    socialSexChange: true,
  },
  visualLane: 'fish',
};
