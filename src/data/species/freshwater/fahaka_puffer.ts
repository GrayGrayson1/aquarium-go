import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from '../marine/_shared';

/**
 * Fahaka puffer — Tetraodon lineatus. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#fahaka-puffer
 * No named colour forms. Lives alone: it bites chunks out of fish of any size.
 */
export const fahakaPuffer: SpeciesDefinition = {
  id: 'fahaka_puffer',
  commonName: 'Fahaka Puffer',
  scientificName: 'Tetraodon lineatus',
  category: 'fish',
  group: 'puffer',
  genus: 'Tetraodon',
  environment: 'freshwater',
  // wild fish enter brackish water, but it is best kept in fresh (LiveAquaria; Seriously Fish: no salt)
  waterClasses: ['freshwater_tropical'],
  nativeRegion: 'North and West Africa: the Nile, Lake Chad, Lake Turkana and the Senegal, Gambia, Geba and Volta basins, in the open water and weedy edges of large rivers',
  isStarter: false,

  // FishBase / Seriously Fish 43 cm; LiveAquaria 15 in; Pufferfish Enthusiasts Worldwide 40–45 cm.
  adultSizeCm: 40,
  // Seriously Fish 120×60 cm for one; LiveAquaria 120 gal; PEW 60×24 in minimum, six feet better → the 180.
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: false,
  // derived: a messy shell-crusher (PEW: half the water changed every week)
  bioload: 9,

  // FishBase / Seriously Fish 24–26 °C; PEW 24–28; LiveAquaria 22–28.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 27 },
  pH: { min: 6.5, max: 8, idealMin: 6.8, idealMax: 7.5 },
  salinitySG: null,
  gh: { min: 5, max: 16 },
  kh: { min: 5, max: 15 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',
  // PEW: 55 % shell-on crayfish and crab, 25 % snails, 10 % insects; mussels only now and then (thiaminase)
  foods: ['shellfish', 'snail_live', 'earthworm', 'insect', 'seafood', 'pellet_large', 'mysis'],
  feedingStyle: 'ambush',
  feedingSpeed: 0.75,
  feedingAggression: 0.95,
  hungerHours: 24,

  activityZone: ['middle', 'lower', 'bottom', 'decor'],
  temperament: 'aggressive',
  territoriality: 0.9,
  aggression: 0.95,
  finNipper: 0.9,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank. It bites chunks out of other fish and fights its own kind even in very large tanks.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'lethal', mixed: 'breeding_only_temporary', juvenile: 'fight', note: 'A pair puts up with each other only while spawning; young fish pick off the weaker ones early.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_slow', 'fish_benthic', 'long_fins', 'fry', 'eggs', 'snail', 'snail_small', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'clam', 'worm', 'amphibian', 'amphibian_larva', 'gills_external'],
  preyTags: ['fish_large'],
  // derived: it bites bigger fish rather than swallowing them (speciesOnly covers those)
  maxLikelyPreySizeCm: 8,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['fine_sand'], avoid: ['gravel', 'large_pebbles', 'bare'], note: 'Fine sand a few centimetres deep to wallow and bury in. Give it its adult tank from the start.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    // about 12 months (Seriously Fish); Lm 18.2 cm (FishBase)
    maturityDays: 20,
    clutchSize: { min: 2000, max: 5000 },
    // 72–96 h (Seriously Fish) → 3.5 days × 8
    incubationHours: 28,
    fryRearingHours: 56,
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawning has been reported in very large aquaria: the pair scatters several thousand sinking eggs that hatch in three or four days, gives them no care and fights again afterwards, and the fry kill one another. Most fish sold are wild-caught young. The game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 10 years, between FishBase's 5 (wild data) and PEW's 20+ in captivity; no visible sex differences
  lifecycle: { juvenileDays: 18, adultDays: 20, lifespanDays: 400, sexVisibleAtDays: 400, hatchSizeCm: 0.2 },

  hardiness: 0.7,
  difficulty: 'advanced',
  // LiveAquaria $24.99 (½–1¼ in)
  baseValue: 25,
  rarity: 'uncommon',
  visitorAppeal: 0.9,
  unlock: { requires: ['fw_large'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Most are wild-caught young from African rivers.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2019)', note: 'Widespread in African rivers. Like most puffers it carries tetrodotoxin in its organs: harmless to keep, never to eat.' },

  genetics: {
    loci: [intensityLocus('No named forms; individuals vary in how bold the pale stripes along the flank are.')],
    phenotypes: [
      { id: 'wild', name: 'Fahaka', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#ecd890', patternContrast: 0.8, finColor: '#d8b450' }, 'Bold-striped'),
    ],
    baseVisual: {
      bodyColor: '#7a6c44',
      bodyColor2: '#5e5434',
      bellyColor: '#efe9dc',
      finColor: '#c9a85a',
      finColor2: '#a8883a',
      accentColor: '#e2cf86',
      eyeColor: '#c8b048',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0.05,
      translucency: 0.1,
      finType: 'puffer',
      finLength: 1,
      bodyDepth: 1.1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Colour slots for the fahaka art: body = the olive-brown back; belly = the off-white underside; accent = the pale stripes running along the flank from the tail to the pectoral fin; fin = the yellowish fins. The puffer body is drawn with a beak mouth.',
  },
  visualMorphs: ['Fahaka'],

  behaviorSet: 'pea_puffer',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 3, turnRate: 2.2, hoverTendency: 0.9, schoolingTightness: 0, restOnBottom: 0.3, hitching: 0, burrowing: 0.4, glassSurfing: 0.1, curiosity: 0.9, nocturnal: 0.1 },
  specialBehaviors: ['beg_at_glass', 'owner_recognition', 'shell_crush', 'sand_wallow', 'inflate', 'reflection_lunge', 'independent_eye_scan'],

  encyclopedia: {
    summary: 'A big, characterful African puffer with independently swivelling eyes and a beak that crunches snails and crabs: the "water dog" that learns its keeper.',
    nativeHabitat: 'The open water and weedy edges of big rivers and lakes across North and West Africa, from the Nile to the Senegal.',
    socialStructure: 'Solitary. It does not share its tank with anything.',
    tankNeeds: 'A six-foot tank of 180 gallons or more to itself, fine sand to wallow in, powerful filtration and big weekly water changes: it is messy.',
    compatibilityNotes: 'Keep it alone. It eats snails, shrimp and small fish and bites chunks out of fish too big to eat, slow or fast.',
    breedingOverview: 'Spawning has been reported only in very large aquaria, with the fry killing one another; the game does not breed it.',
    conservationNote: 'Least Concern (IUCN 2019).',
    funFact: 'Its teeth never stop growing: crunching shells wears the beak down, and a puffer fed only soft food needs a vet to trim it.',
    inGameBehavior: 'Hovers and watches, swivelling its eyes, wallows in the sand, begs at the glass and puffs up if badly frightened.',
    feedingNote: 'Shell-on shellfish (crab legs, crayfish, cockles), snails and earthworms, with the odd cricket; mussels only now and then.',
    keeperTip: 'Feed hard, shelled food every week or two, or the beak overgrows.',
  },
  sourceReferences: [
    { id: 'fishbase-tetraodon-lineatus', title: 'FishBase — Tetraodon lineatus (Fahaka pufferfish)', url: 'https://www.fishbase.se/summary/Tetraodon-lineatus.html', tier: 1, facts: ['43 cm TL', 'Lm 18.2 cm', 'max reported age 5 years', '24–26 °C', 'Nile, Chad, Senegal, Gambia, Volta', 'eats molluscs', 'IUCN Least Concern (2019)'] },
    { id: 'seriouslyfish-tetraodon-lineatus', title: 'Seriously Fish — Tetraodon lineatus', url: 'https://www.seriouslyfish.com/species/tetraodon-lineatus/', tier: 2, facts: ['430 mm SL', '120×60×60 cm for one', 'no salt', '24–26 °C, pH 6.5–7.5', 'feed shells to wear down its teeth', 'best kept alone', 'eggs hatch in 72–96 h'] },
    { id: 'liveaquaria-fahaka-puffer', title: 'LiveAquaria — Fahaka Puffer', url: 'https://www.liveaquaria.com/products/fahaka-puffer', tier: 2, facts: ['15 in', '120 gal', 'best in freshwater', 'best kept alone', 'light horizontal stripes', '$24.99 (½–1¼ in)'] },
    { id: 'vettimes-puffer-beak', title: 'Vet Times — A puffer’s overgrown beak trimmed under anaesthetic', url: 'https://www.vettimes.com/news/vets/small-animal-vets/great-barrier-teeth-goldie-grinning-again-after-delicate-dental', tier: 2, facts: ['puffer beaks are kept short by hard food', 'an overgrown beak is cut back under anaesthetic'] },
    { id: 'pew-fahaka-care', title: 'Pufferfish Enthusiasts Worldwide — Fahaka puffer care sheet', url: 'https://www.pufferfishenthusiastsworldwide.com/post/fahaka-puffer-care-sheet', tier: 3, facts: ['60×24×24 in minimum, 6 ft better', 'fine sand to wallow and bury in', 'diet 55 % shell-on crustaceans, 25 % snails', 'mussels carry thiaminase', 'mostly wild-caught'] },
  ],
  confidenceNotes: [
    'Lifespan: FishBase gives a wild maximum of 5 years, hobby keepers report 20 or more; the game uses 10.',
    'Tank: Seriously Fish 120×60 cm, LiveAquaria 120 gal, PEW six feet better; the game uses the 180-gallon tank.',
    'Breeding in aquaria is reported but undated and rare; the game does not breed it.',
  ],
  exceptionRules: [
    { other: 'tag:fish_large', verdictFloor: 'incompatible', reason: 'A fahaka bites chunks out of large fish too.', incidentRisk: 0.3 },
  ],
  special: { speciesOnly: true, burrower: true, heavyWaste: true, outgrowsSmallTanks: true },
  visualLane: 'fish',
};
