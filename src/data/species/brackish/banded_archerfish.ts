import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Banded archerfish — Toxotes jaculatrix. Lane brackish. The estuary showpiece.
 * Sources, key values and conflicts: docs/research/brackish.md.
 * Visual mapping: bodyColor = silvery-white flank, bodyColor2 = olive-grey back, accentColor = the black wedge-shaped
 * bands, finColor/finColor2 = dusky rear dorsal/anal with a dark edge, eyeColor = the large forward-looking eye.
 */
export const bandedArcherfish: SpeciesDefinition = {
  id: 'banded_archerfish',
  commonName: 'Banded Archerfish',
  scientificName: 'Toxotes jaculatrix',
  category: 'fish',
  group: 'archerfish',
  genus: 'Toxotes',
  environment: 'brackish',
  waterClasses: ['brackish'],
  nativeRegion: 'Indo-West Pacific — mangrove estuaries and lower rivers from India to the Philippines, Indonesia, Papua New Guinea, the Solomon Islands, Vanuatu and northern Australia',
  isStarter: false,

  // FishBase 30 cm TL, commonly 20 cm; aquarium adults usually 15–20 cm.
  adultSizeCm: 20,
  // Seriously Fish: 120 × 60 cm base (~430 L) for adults → a 125-gallon tank.
  recommendedMinTankGallons: 125,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 18 },
  activeSwimmer: true,
  bioload: 4,

  // FishBase/Seriously Fish 25–30 °C; Seriously Fish pH 7.0–8.0, 20–30 dGH.
  tempC: { min: 24, max: 31, idealMin: 25, idealMax: 29 },
  pH: { min: 7.0, max: 8.5, idealMin: 7.4, idealMax: 8.2 },
  // Mainly brackish mangrove estuaries, only rarely fresh (Australian Museum); brackish recommended at every age (SF).
  // In-game cap 1.018: they may enter the sea to spawn, but are kept as a brackish exhibit, not a marine one.
  salinitySG: { min: 1.002, max: 1.018, idealMin: 1.005, idealMax: 1.012 },
  gh: { min: 10, max: 25 },
  kh: { min: 8, max: 18 },

  flowPreference: 'low',
  lightPreference: 'bright',
  diet: 'carnivore',
  foods: ['pellet_large', 'pellet_small', 'mysis', 'bloodworm', 'brine_shrimp', 'earthworm', 'flake'],
  feedingStyle: 'surface',
  feedingSpeed: 0.8,
  feedingAggression: 0.55,
  hungerHours: 24,

  activityZone: ['surface', 'upper'],
  temperament: 'semi_aggressive',
  territoriality: 0.3,
  aggression: 0.3,
  finNipper: 0.1,
  hasLongFins: false,
  social: {
    kind: 'shoal',
    minGroup: 3,
    idealGroup: 5,
    note: 'A loose shoal. Kept singly or in pairs they turn quarrelsome; a group of four or five settles them down.',
  },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'tension',
    mixed: 'ok',
    juvenile: 'ok',
    note: 'Some jostling over food and the best spot under the surface; groups settle it.',
  },

  predatorTags: ['fish_tiny', 'fish_small', 'shrimp_dwarf', 'shrimp_fry', 'fry', 'eggs', 'worm'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 4,

  shrimpSafe: 'unsafe',
  snailSafe: 'safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.05,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'fine_sand', 'aragonite', 'fine_gravel'], avoid: [], note: 'Open water under the surface, with roots or branches overhanging it.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    // Wikipedia: 20,000–150,000 eggs; thought to migrate to sea water to spawn (Seriously Fish). Not bred in the hobby.
    clutchSize: { min: 20000, max: 150000 },
    incubationHours: 12,
    fryRearingHours: 240,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes:
      'Archerfish are not bred in the hobby. They are thought to move into sea water to spawn, scattering 20,000–150,000 eggs, and first breed at about 10 cm. The game does not model breeding.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 16, adultDays: 20, lifespanDays: 300, sexVisibleAtDays: 300, hatchSizeCm: 0.2 },

  hardiness: 0.7,
  difficulty: 'advanced',
  baseValue: 45,
  rarity: 'rare',
  visitorAppeal: 0.97,
  unlock: { requires: ['brackish'], hint: 'Unlocks with Brackish Estuaries research (after intermediate freshwater). Needs a 125-gallon tank.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Not bred for the trade: every archerfish sold is wild-collected. Choose settled fish that already take floating foods.',
  conservation: {
    status: 'Least Concern (IUCN 2011)',
    note: 'Widespread in Indo-Pacific mangroves, which are being cleared for aquaculture and development (ADW). Protecting mangroves protects archerfish.',
  },

  genetics: {
    loci: [intensityLocus('Natural variation in band darkness and the yellow tint on the back.')],
    phenotypes: [
      { id: 'wild', name: 'Banded', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ patternContrast: 1, bodyColor2: '#8a8a5a' }, 'Bold-banded'),
    ],
    baseVisual: {
      bodyColor: '#e4e6de',
      bodyColor2: '#8c9072',
      bellyColor: '#f6f6f0',
      finColor: '#a8a88a',
      finColor2: '#1a1a18',
      accentColor: '#141414',
      eyeColor: '#b9a24a',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.92,
      patternSeed: 0,
      iridescence: 0.35,
      metallic: 0.45,
      translucency: 0.3,
      finType: 'archer',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'No domestic morphs. Four to five black wedge-shaped bands along the upper flank; individual variation only in band intensity and the yellowish back tint.',
  },
  visualMorphs: ['Banded', 'Bold-banded'],

  behaviorSet: 'archerfish',
  behaviorTraits: { cruiseSpeed: 0.9, burstSpeed: 6, turnRate: 2.6, hoverTendency: 0.55, schoolingTightness: 0.25, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.85, nocturnal: 0, pickRadiusMul: 1.1 },
  specialBehaviors: ['spit_shot', 'surface_scan', 'jump_feed', 'follow_finger'],

  encyclopedia: {
    summary: 'The sharpshooter of the mangroves: an archerfish knocks insects off overhanging leaves with a precise jet of water spat from its mouth.',
    nativeHabitat: 'Mangrove estuaries, tidal creeks and lower rivers from India to northern Australia, cruising just under the surface beneath overhanging branches.',
    socialStructure: 'A loose shoal. Keep four or five in a big tank — kept singly or in pairs, archerfish turn quarrelsome.',
    tankNeeds: 'A 125-gallon tank or bigger with a tall, tight lid (they jump) and an air gap above the water to aim into. Warm (25–29 °C), hard, brackish water (SG about 1.005–1.012), gentle flow, and floating foods, insects and pellets.',
    compatibilityNotes: 'Peaceful toward fish too big to swallow, but anything that fits in its mouth — small gobies, livebearer fry, shrimp — will be eaten. Good with larger, calm brackish fish.',
    breedingOverview: 'Not bred in the hobby. Wild fish are thought to move into sea water to spawn tens of thousands of eggs. Breeding is not part of the game.',
    conservationNote: 'Not threatened, but mangroves are disappearing fast. Every archerfish in the trade is wild-collected, so buy only from careful, reputable sources.',
    funFact: 'An archerfish shapes a tube with its tongue against a groove in the roof of its mouth, corrects for refraction as it aims, and can knock an insect off a leaf more than a metre up. The jet speeds up as it flies, so the water gathers into one heavy drop at the target.',
    inGameBehavior: 'Cruises just under the surface, eyes the air, and now and then tilts up and fires a jet of water at a fly above the tank — then snaps it up as it falls.',
    feedingNote: 'A surface feeder that grabs floating food: flakes and pellets, plus thawed mysis, bloodworms or brine shrimp and chopped earthworms. It rarely picks food off the bottom. Feed once or twice a day; an autofeeder suits it.',
    keeperTip: 'Stick a cricket or a scrap of food to the glass or a leaf above the waterline: archerfish learn to shoot it down, which is great exercise and fun to watch.',
  },
  sourceReferences: [
    { id: 'fishbase-toxotes-jaculatrix', title: 'FishBase — Toxotes jaculatrix (banded archerfish)', url: 'https://www.fishbase.se/summary/Toxotes-jaculatrix.html', tier: 1, facts: ['30 cm TL, commonly 20 cm', 'India to the Philippines, New Guinea and northern Australia', 'mainly brackish mangrove estuaries; moves up rivers', '25–30 °C', 'surface feeder on insects; shoots them down (~150 cm)', 'IUCN Least Concern (2011)'] },
    { id: 'australian-museum-banded-archerfish', title: 'The Australian Museum — Banded archerfish, Toxotes jaculatrix', url: 'https://australian.museum/learn/animals/fishes/banded-archerfish-toxotes-jaculatrix/', tier: 1, facts: ['silvery-white with 4–5 black bars on the upper half', 'only rarely in fresh water', 'tongue and palate groove form the jet', 'large fish shoot 2–3 m'] },
    { id: 'adw-toxotes-jaculatrix', title: 'Animal Diversity Web — Toxotes jaculatrix', url: 'https://animaldiversity.org/accounts/Toxotes_jaculatrix/', tier: 1, facts: ['averages 25 cm', 'schools; aggressive when alone', 'shooting range ~125 cm', 'mangrove loss as a threat'] },
    { id: 'vailati-2012-archerfish', title: 'Vailati, Zinnato & Cerbino 2012, PLoS ONE — How archer fish achieve a powerful impact', url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047867', tier: 1, facts: ['the jet accelerates from ~2 to 4 m/s so the water gathers into one drop', 'impact ~200 mN, several times prey grip', '~3000 W/kg at impact'] },
    { id: 'seriouslyfish-toxotes-jaculatrix', title: 'Seriously Fish — Toxotes jaculatrix (banded archerfish)', url: 'https://www.seriouslyfish.com/species/toxotes-jaculatrix/', tier: 2, facts: ['120 × 60 cm base for adults', 'pH 7.0–8.0, 20–30 dGH', 'juveniles can be kept fresh; brackish recommended at every stage', 'groups of 4–5 reduce aggression', 'eats small fish; takes floating foods', 'not bred in the hobby; thought to spawn in sea water'] },
    { id: 'wikipedia-archerfish', title: 'Wikipedia — Archerfish', url: 'https://en.wikipedia.org/wiki/Archerfish', tier: 2, facts: ['mean shooting angle ~74°', 'adults almost always hit first shot; juveniles learn by watching', 'moves to the landing spot within ~100 ms', '5–8 years in captivity', 'tall lid needed — they jump'] },
  ],
  confidenceNotes: [
    'Salinity: juveniles can be kept fresh (Seriously Fish) but adults live mainly in brackish estuaries; the game uses a brackish range (ideal SG 1.005–1.012) for all ages.',
    'Size: FishBase 30 cm TL vs Seriously Fish 300 mm SL; aquarium adults are usually 15–20 cm, so 20 cm is used. Tank size follows Seriously Fish (120 × 60 cm base → 125 gal).',
    'Spitting: real range is 1.25–3 m at a steep ~74° angle; the game keeps the jet inside the tank’s air gap and treats it as a signature behaviour, not a hunting mechanic.',
    'Bar count: 4–5 (Australian Museum) vs 4–6 (Wikipedia).',
    'Compressed time: 5–8 year captive lifespan ≈ 300 game-days.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'high_risk', reason: 'Archerfish swallow any fish small enough to fit in their mouths.', incidentRisk: 0.4 },
    { other: 'bumblebee_goby', verdictFloor: 'high_risk', reason: 'A bumblebee goby is exactly the size of an archerfish snack.', incidentRisk: 0.35, mitigatedBy: ['hides', 'cover'] },
  ],
  special: { escapeArtist: true, outgrowsSmallTanks: true },
  visualLane: 'fish',
};
