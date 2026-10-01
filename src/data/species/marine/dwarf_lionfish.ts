import type { SpeciesDefinition } from '@/types';

/**
 * Fuzzy dwarf lionfish (shortfin lionfish) — Dendrochirus brachypterus (now Neochirus brachypterus). Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#fuzzy-dwarf-lionfish
 */
export const dwarfLionfish: SpeciesDefinition = {
  id: 'dwarf_lionfish',
  commonName: 'Fuzzy Dwarf Lionfish',
  scientificName: 'Dendrochirus brachypterus',
  category: 'fish',
  group: 'scorpionfish',
  genus: 'Dendrochirus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-West Pacific — India and Sri Lanka east to Tonga, north to Japan, south to Australia',
  isStarter: false,

  // FishBase max 17 cm TL; LiveAquaria 7 in. Most aquarium adults 12–15 cm.
  adultSizeCm: 15,
  // LiveAquaria 50 gal.
  recommendedMinTankGallons: 50,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 18 },
  activeSwimmer: false,
  bioload: 2,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'low',
  lightPreference: 'dim',
  diet: 'carnivore',
  foods: ['mysis', 'pellet_large', 'pellet_sinking'],
  feedingStyle: 'ambush',
  feedingSpeed: 0.3,
  feedingAggression: 0.5,
  hungerHours: 44,

  activityZone: ['lower', 'bottom', 'decor'],
  temperament: 'predatory',
  territoriality: 0.4,
  aggression: 0.35,
  finNipper: 0,
  hasLongFins: true,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.2, note: 'Usually kept alone; a male–female pair can share a large tank. Juveniles sometimes gather in small groups in the wild.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'courtship_ok',
    juvenile: 'ok',
    note: 'Males display and spar with their fins; a pair usually coexists.',
  },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_slow', 'fish_benthic', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'crustacean', 'fry'],
  preyTags: ['fish_large', 'long_fins'],
  maxLikelyPreySizeCm: 7,

  shrimpSafe: 'unsafe',
  snailSafe: 'safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'caution',
  coralRisk: 0,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.5,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Likes caves, overhangs and weedy rock to hang beside, head-down or upside down.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    clutchSize: { min: 2000, max: 15000 },
    incubationHours: 16,
    fryRearingHours: 480,
    cooldownDays: 10,
    conditions: { needsPartner: true, minTankGallons: 75 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Pairs spawn at dusk after an elaborate courtship; the female releases eggs in floating gelatinous masses. The planktonic larvae are rarely raised, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // Roughly 10 years in good captive care → 400 game-days.
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 400, sexVisibleAtDays: 30, hatchSizeCm: 0.15 },

  hardiness: 0.85,
  difficulty: 'intermediate',
  baseValue: 85,
  rarity: 'rare',
  visitorAppeal: 0.95,
  unlock: { requires: ['predators'], hint: 'Research Predator Husbandry (needs a public showroom) — venomous, and it eats small fish and shrimp.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected; captive breeding is rare and not commercial. New fish often need live food before they can be trained onto frozen.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2015)',
    note: 'A native Indo-Pacific reef fish — not the invasive Atlantic lionfish (Pterois volitans / P. miles), which spread after aquarium releases. Never release any aquarium animal.',
  },

  genetics: {
    loci: [
      {
        id: 'tone',
        name: 'Colour tone',
        mode: 'additive',
        alleles: [
          { id: 'brown', name: 'Brown-red', dominance: 1, frequency: 0.75 },
          { id: 'red', name: 'Red', dominance: 1, frequency: 0.25 },
        ],
        note: 'Wild fish range from olive-brown to rich red banding, partly matching their surroundings. Not a trade morph; modelled as an additive tone.',
      },
    ],
    phenotypes: [
      { id: 'wild', name: 'Fuzzy Dwarf Lionfish', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'red_tone', name: 'Red-toned', layer: 'overlay', rarity: 0.1, when: [{ locus: 'tone', allele: 'red', count: 'hom' }], visual: { bodyColor: '#b0402e', finColor: '#c8583e' }, note: 'Natural individual variation.' },
    ],
    baseVisual: {
      bodyColor: '#9a4a34',
      bodyColor2: '#5e2f25',
      bellyColor: '#e7cdb4',
      finColor: '#b86a4c',
      finColor2: '#efe2d0',
      accentColor: '#3a1e18',
      eyeColor: '#a0522d',
      pattern: 'bands',
      patternScale: 0.8,
      patternContrast: 0.75,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.3,
      finType: 'lionfish_dwarf',
      finLength: 1.3,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.22,
    notes: 'Stocky scorpionfish covered in fleshy "fuzzy" skin tabs; broad, fan-like pectoral fins banded in alternating red-brown and cream (fin/fin2), shorter dorsal spines than Pterois. Body mottled red-brown with dark vertical bands (accent). Pale belly.',
  },
  visualMorphs: ['Fuzzy Dwarf Lionfish (natural colour variation)'],

  behaviorSet: 'lionfish',
  behaviorTraits: { cruiseSpeed: 0.2, burstSpeed: 3, turnRate: 1.2, hoverTendency: 0.9, schoolingTightness: 0, restOnBottom: 0.35, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.7, nocturnal: 0.6 },
  specialBehaviors: ['fin_fan_herd', 'ambush_corner', 'hover_stalk', 'spine_display', 'owner_recognition', 'upside_down_perch'],

  encyclopedia: {
    summary: 'A small, frilly scorpionfish that fans its banded fins to herd prey into a corner — beautiful, personable and venomous. Recent studies place it in the genus Neochirus.',
    nativeHabitat: 'Reef flats, lagoons and weedy rock on sandy bottoms 2–80 m deep across the Indo-West Pacific.',
    socialStructure: 'Usually solitary; pairs court at dusk. Juveniles sometimes gather in small groups on isolated coral heads.',
    tankNeeds: 'A 50-gallon or larger tank with caves and overhangs, gentle flow and dim hiding spots. New fish may need live food at first, then are trained onto frozen meaty foods; feed every other day.',
    compatibilityNotes: 'Eats any fish or shrimp that fits in its mouth, so tank mates must be larger than about half its length. Safe with corals and most snails. Keepers must avoid its venomous spines.',
    breedingOverview: 'Pairs release floating gelatinous egg masses at dusk. The larvae are rarely raised in captivity.',
    conservationNote: 'Least Concern (IUCN 2015). It is not the invasive Atlantic lionfish — those are Pterois volitans and P. miles, which spread through the western Atlantic after aquarium releases. Never release aquarium animals.',
    funFact: 'Dwarf lionfish hunt by spreading their huge pectoral fins like a net, slowly herding small fish and shrimp into a corner before a lightning-fast gulp.',
    inGameBehavior: 'Hangs motionless beside rock, stalks food with fins spread, learns to recognise you at feeding time, and flares its spines if disturbed.',
    feedingNote: 'An ambush hunter that strikes at food drifting past. Feed thawed mysis, krill or silversides from a feeding stick every other day. Only some fish ever learn to take large sinking pellets, so don’t rely on an autofeeder.',
    keeperTip: 'Keep your hands well clear of its spines and feed with a stick or tongs. If stung, soak the spot in hot (not scalding) water for at least 30 minutes and get medical advice.',
  },
  sourceReferences: [
    { id: 'fishbase-dendrochirus-brachypterus', title: 'FishBase — Dendrochirus brachypterus (Dwarf lionfish)', url: 'https://www.fishbase.se/summary/Dendrochirus-brachypterus.html', tier: 1, facts: ['max 17 cm TL', 'depth 2–80 m', 'nocturnal hunter of small crustaceans', 'juveniles in small aggregations', 'venomous', 'distinct pairing', 'IUCN Least Concern (2015)'] },
    { id: 'liveaquaria-fuzzy-dwarf-lionfish', title: 'LiveAquaria — Fuzzy Dwarf Lionfish (Shortfin Lionfish)', url: 'https://www.liveaquaria.com/product/227/?pcatid=227', tier: 2, facts: ['min tank 50 gal', 'max 7 in', 'venomous spines', 'reef compatible with caution', 'eats live shrimp, ornamental shrimp and fish', 'may need live feeders at first', 'recognises owner', 'price ~$85'] },
    { id: 'liveaquaria-fuzzy-dwarf-spotlight', title: 'LiveAquaria — The Fuzzy Dwarf Lionfish: A Gorgeous Showstopper (species spotlight)', url: 'https://www.liveaquaria.com/blogs/species-spotlight/the-fuzzy-dwarf-lionfish', tier: 2, facts: ['live feeder shrimp help new fish start eating', 'low metabolism: target feed every other day', 'stings: soak in hot water for at least 30 minutes', 'avoid fin-nipping tank mates', 'min 50 gal, up to 7 in', 'recognises its keeper'] },
    { id: 'noaa-lionfish-facts', title: 'NOAA National Ocean Service — What is a lionfish?', url: 'https://oceanservice.noaa.gov/facts/lionfish-facts.html', tier: 1, facts: ['invasive Atlantic lionfish are Indo-Pacific natives', 'possibly released aquarium pets', 'venomous sting causes extreme pain'] },
    { id: 'chou-2023-neochirus', title: 'Chou, Liu & Liao (2023) Systematics of lionfishes (Scorpaenidae: Pteroini) using molecular and morphological data. Frontiers in Marine Science 10', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1109655/full', tier: 1, facts: ['new genus Neochirus erected with D. brachypterus as type species'] },
  ],
  confidenceNotes: [
    'Taxonomy: Chou et al. (2023) moved this species to Neochirus (N. brachypterus). The roster name Dendrochirus brachypterus is kept for stability; the encyclopedia notes the change.',
    'Frozen-food training (krill, silversides, mysis) is standard husbandry advice; the fetched LiveAquaria pages confirm live-food starts and every-other-day feeding.',
    'Maximum prey size (~7 cm, about half its length) is a husbandry heuristic, not a measured value.',
    'Breeding is excluded (not_in_game); egg-mass numbers are approximate.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'Lionfish swallow any fish that fits in their mouth.', incidentRisk: 0.4 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'Small fish are prey: a dwarf lionfish will herd and swallow them.', incidentRisk: 0.3 },
    { other: 'tag:shrimp_large', verdictFloor: 'high_risk', reason: 'Ornamental shrimp such as cleaners and peppermints are favourite prey.', incidentRisk: 0.2, mitigatedBy: ['hides'] },
    { other: 'tag:fish_benthic', verdictFloor: 'high_risk', reason: 'Small bottom-resting fish such as gobies and dragonets are easy to ambush.', incidentRisk: 0.15, mitigatedBy: ['hides'] },
  ],
  special: {
    venomous: true,
  },
  visualLane: 'fish',
};
