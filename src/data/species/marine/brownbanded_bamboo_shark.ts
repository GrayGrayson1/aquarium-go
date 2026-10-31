import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';
import { sharkRules } from './_sharks';

/**
 * Brown-banded bamboo shark — Chiloscyllium punctatum. Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#brown-banded-bamboo-shark
 * A metre-long bottom shark sold as a black-and-white banded pup; the bands fade to plain brown. Kept at the 1,000 (the
 * owner, ADR-0053 round 2): an adult is at the limit of any home tank. Lays pairs of egg cases (egg_case).
 */
export const brownbandedBambooShark: SpeciesDefinition = {
  id: 'brownbanded_bamboo_shark',
  commonName: 'Brown-banded Bamboo Shark',
  scientificName: 'Chiloscyllium punctatum',
  category: 'fish',
  group: 'shark',
  genus: 'Chiloscyllium',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The Indo-West Pacific, from India to the Philippines and Japan and south to northern Australia, on inshore reefs and in tide pools',
  isStarter: false,

  // Compagno and the Florida Museum 104 cm; LiveAquaria 42 in (FishBase’s 132 cm is a wild record)
  adultSizeCm: 105,
  // retail 180–360 gal; an adult (41 in) needs its own length front to back to turn → only the 1,000 (48 in deep)
  recommendedMinTankGallons: 1000,
  recommendedFootprint: { minLengthIn: 124, minWidthIn: 42 },
  activeSwimmer: false,
  bioload: 14,

  tempC: { min: 20, max: 29, idealMin: 23, idealMax: 27 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.021, idealMax: 1.025 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['seafood', 'pellet_large', 'mysis'],
  feedingStyle: 'target_fed',
  feedingSpeed: 0.3,
  feedingAggression: 0.35,
  // two or three times a week, bite-size pieces or it brings them back up
  hungerHours: 48,

  activityZone: ['bottom', 'substrate'],
  temperament: 'predatory',
  territoriality: 0.2,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.02, note: 'One adult, or at most a pair, in a 1,000-gallon tank; public aquariums keep groups in huge tanks.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Peaceful together in big public tanks; at home there is no floor for more than two.' },

  // crabs, worms, shrimp and small fish (Fishes of Australia); echinoderms (Mote); whole cockles (LiveAquaria)
  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'snail', 'snail_small', 'clam', 'starfish', 'fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'eggs'],
  // a grown shark is nobody's prey; its young are, through the groupers' and triggers' rules
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 10,

  shrimpSafe: 'unsafe',
  snailSafe: 'caution',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',
  // strong enough to topple loose rock
  coralRisk: 0.15,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.3,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['gravel', 'fine_gravel', 'large_pebbles'], note: 'Fine sand to dig in, and rock set on the glass: it shoves loose pieces over.' },

  breeding: {
    system: 'egg_case',
    // easy in public aquaria, no documented home spawning; egg cases are sold to hobbyists
    difficulty: 0.6,
    // about 6.5 years (Fahmi 2021) → the game's cap
    maturityDays: 25,
    // paired eggs (FishBase, Florida Museum)
    clutchSize: { min: 1, max: 2 },
    // 125 real days × 8: 118 days at 25 °C (Onimaru 2018), 153 days at 21–25 °C (Harahush 2007)
    incubationHours: 1000,
    fryRearingHours: 56,
    // in season every one to two weeks (Harahush 2007: 692 eggs from six females over two seasons) → about 3 game days
    cooldownDays: 3,
    conditions: { minTempC: 23, maxTempC: 28, needsPartner: true, minTankGallons: 1000 },
    // Osaka Kaiyukan: about half the eggs eaten by other fish
    predationWithoutNursery: 0.5,
    nurseryRequired: false,
    maxRaisedPerClutch: 2,
    notes: 'Lays pairs of flat leathery cases (about 11 × 5 cm) on the sea floor. Only a third to a half develop even in good aquaria. A case hatches after about four months as a 15 cm black-and-white banded pup.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // about 25 years in aquaria (Florida Museum) → the game's cap; hatchlings 13–17 cm
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 15 },

  hardiness: 0.8,
  difficulty: 'expert',
  // LiveAquaria $199.99 (6.25 in); aquariumfish.com $280.79
  baseValue: 280,
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  unlock: { requires: ['marine_basics', 'elasmobranchs'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Both wild-caught pups and aquarium-bred eggs and pups are sold.',
  conservation: { status: 'Near Threatened (IUCN Red List, assessed 2023)', note: 'Fished for food in India and Thailand and hurt by dynamite and cyanide fishing on reefs.' },

  genetics: {
    loci: [intensityLocus('No colour forms; “black-banded” in the trade is the young.')],
    phenotypes: [
      { id: 'wild', name: 'Brown-banded Bamboo Shark', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#93785a', accentColor: '#1a1410' }),
    ],
    baseVisual: {
      bodyColor: '#8b7458',
      bodyColor2: '#756148',
      bellyColor: '#ebe2d2',
      finColor: '#816b51',
      finColor2: '#6c5940',
      accentColor: '#211b17',
      eyeColor: '#c8b27c',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.15,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0,
      finType: 'shark_benthic',
      finLength: 1,
      bodyDepth: 0.95,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the shark art: body = the plain light brown of an adult; accent = the dark bands of the young (about ten across the body and tail on a pale ground, fading from about a third of adult size); belly = the pale underside. A slim shark with a thick tail, two equal dorsal fins and long nasal barbels.',
  },
  visualMorphs: ['Brown-banded Bamboo Shark'],

  behaviorSet: 'benthic_shark',
  behaviorTraits: { cruiseSpeed: 0.25, burstSpeed: 2.5, turnRate: 1.8, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 0.95, hitching: 0, burrowing: 0.1, glassSurfing: 0.03, curiosity: 0.35, nocturnal: 0.85, pickRadiusMul: 1.8 },
  specialBehaviors: ['rest_on_floor', 'ledge_lie', 'night_patrol', 'snout_root', 'suction_strike', 'fin_shuffle', 'decor_shove', 'tong_feed_learned'],

  encyclopedia: {
    summary: 'A metre-long bottom shark sold as a striking black-and-white banded pup; the bands fade to plain brown as it grows.',
    nativeHabitat: 'Inshore reefs and tide pools from India to Japan and northern Australia, where it lies under ledges by day and digs for crabs and worms at night.',
    socialStructure: 'Lives alone; public aquariums keep groups in huge tanks.',
    tankNeeds: 'Only the 1,000-gallon tank: an adult needs four feet front to back to turn, and even that is the limit of what any home tank can give it. Fine sand, solid rock set on the glass, a tight lid and big filtration. Never copper.',
    compatibilityNotes: 'Eats crabs, shrimp, snails, clams, starfish and small fish. Good with tangs and other large, peaceful fish; never triggerfish or puffers, which nip its fins.',
    breedingOverview: 'Lays pairs of egg cases; only a third to a half develop. Each hatches after about four months as a 15 cm banded pup. A female without a male lays empty cases.',
    conservationNote: 'Near Threatened (IUCN 2023): fished for food and hurt by destructive reef fishing.',
    funFact: 'It can survive up to twelve hours out of water in a drying tide pool.',
    inGameBehavior: 'Lies under a ledge with its head or tail sticking out by day, then noses through the sand for food at night.',
    feedingNote: 'Bite-size frozen seafood two or three times a week; big pieces come back up.',
    keeperTip: 'Bamboo sharks get goitre within months without iodine and vitamins: real keepers soak the seafood in a shark supplement.',
  },
  sourceReferences: [
    { id: 'fishbase-chiloscyllium-punctatum', title: 'FishBase — Chiloscyllium punctatum (Brownbanded bambooshark)', url: 'https://www.fishbase.se/summary/Chiloscyllium-punctatum.html', tier: 1, facts: ['paired eggs', 'tide pools', 'survives up to 12 hours out of water', 'IUCN Near Threatened (2023)'] },
    { id: 'foa-chiloscyllium-punctatum', title: 'Fishes of Australia — Chiloscyllium punctatum', url: 'https://fishesofaustralia.net.au/home/species/3264', tier: 1, facts: ['young broadly banded to about 30 cm; adults plain', 'hatch after about 5 months at 13–17 cm', 'eats crabs, worms, shrimp and small fish'] },
    { id: 'floridamuseum-chiloscyllium', title: 'Florida Museum — Brownbanded bamboo shark', url: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/chiloscyllium-punctatum/', tier: 1, facts: ['104 cm max', 'about 25 years', 'nocturnal; digs through sediment', 'breeds readily in captivity'] },
    { id: 'onimaru-2018-bamboo', title: 'Onimaru et al. 2018 — Developmental table of the brownbanded bamboo shark (Developmental Dynamics)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5947634', tier: 1, facts: ['lays year-round in an aquarium', 'about half the eggs eaten by other fish', 'hatch about 118 days at 25 °C', 'bands at days 66–73'] },
    { id: 'kempster-2013-bamboo', title: 'Kempster, Hart & Collin 2013 — Embryos freeze when they sense a predator (PLoS ONE 8)', url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0052551', tier: 1, facts: ['late embryos pump water with their tails', 'freeze for 19–59 s at predator-like electric fields'] },
    { id: 'wheaton-2025-goitre', title: 'Wheaton et al. 2025 — Thyroid disease in aquarium bamboo sharks (Frontiers in Veterinary Science)', url: 'https://frontiersin.org/articles/10.3389/fvets.2025.1504527/full', tier: 1, facts: ['goitre the commonest thyroid disease', 'goitre two months after supplements stopped', 'high nitrate a cause'] },
    { id: 'liveaquaria-bamboo', title: 'LiveAquaria — Brown-banded cat shark (Diver’s Den)', url: 'https://www.liveaquaria.com/products/cat-shark-brown-banded-expert-only-6-25-wysiwyg', tier: 2, facts: ['360 gal minimum, expert only', 'will eat any crustacean', 'never copper', '$199.99 for 6.25 in'] },
  ],
  confidenceNotes: [
    'Adult size: 104 cm (Compagno), about 1.2 m (Fishes of Australia), 132 cm (FishBase record); the game uses 105 cm.',
    'No home-aquarium spawning is documented; it breeds readily in public aquariums, whose egg cases are sold to hobbyists.',
    'The famous brown-banded “virgin birth” (San Francisco, 2012) was sperm stored for at least 45 months; the game does not model either.',
  ],
  exceptionRules: sharkRules({ crushesShells: true, bambooAdult: true }),
  special: { escapeArtist: true, medicationSensitive: true, outgrowsSmallTanks: true, heavyWaste: true, needsSinkingFood: true },
  visualLane: 'fish',
};
