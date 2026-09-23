import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';

/**
 * Yellow clown goby (Okinawa goby) — Gobiodon okinawae. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#yellow-clown-goby
 */
export const clownGoby: SpeciesDefinition = {
  id: 'clown_goby',
  commonName: 'Yellow Clown Goby',
  scientificName: 'Gobiodon okinawae',
  category: 'fish',
  group: 'goby',
  genus: 'Gobiodon',
  environment: 'marine',
  waterClasses: ['reef', 'marine_live_rock'],
  nativeRegion: 'Western Pacific — southern Japan to the Rowley Shoals and southern Great Barrier Reef; Palau and the Marshall Islands',
  isStarter: false,

  // FishBase max 3.5 cm TL; LiveAquaria 1.5 in.
  adultSizeCm: 3.5,
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.3,

  // LiveAquaria/Biota: 72–78 °F, pH 8.1–8.4, SG 1.020–1.025. FishBase lists 20–25 °C for the wild range.
  tempC: { min: 21, max: 28, idealMin: 23.5, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'low',
  lightPreference: 'bright',
  diet: 'carnivore',
  foods: ['mysis', 'brine_shrimp', 'baby_brine', 'pellet_small', 'copepod_live'],
  feedingStyle: 'picker',
  feedingSpeed: 0.35,
  feedingAggression: 0.1,
  hungerHours: 12,

  activityZone: ['decor', 'middle', 'lower'],
  temperament: 'peaceful',
  territoriality: 0.4,
  aggression: 0.02,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 2, maxPer10Gallons: 1, note: 'Wild fish live in small groups within one coral colony. In small aquaria keep one or a pair; unrelated adults may fight over the best branch.' },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'tension',
    mixed: 'courtship_ok',
    juvenile: 'ok',
    note: 'Pairs are faithful and can even change sex to form a pair. Two unpaired adults may squabble over a coral in small tanks.',
  },

  predatorTags: ['copepod', 'coral_polyp'],
  preyTags: ['fish_small'],
  maxLikelyPreySizeCm: 0.4,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'mostly_safe',
  plantSafe: 'safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.2,
  anemoneRelationship: 'avoids',

  hidesNeeded: 1,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs branching coral (ideally Acropora) or branching rock to perch in.' },

  breeding: {
    system: 'egg_layer_generic',
    difficulty: 0.7,
    maturityDays: 12,
    clutchSize: { min: 100, max: 500 },
    // Eggs hatch in roughly 3–5 days (hobby breeding reports) → ~4 × 8.
    incubationHours: 32,
    fryRearingHours: 280,
    cooldownDays: 7,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 24, minTankGallons: 10 },
    predationWithoutNursery: 0.98,
    nurseryRequired: true,
    maxRaisedPerClutch: 6,
    notes: 'The pair clears a patch on the underside of a coral branch and lays eggs there (the coral tissue under the eggs recedes but usually regrows). The eggs are guarded until they hatch into planktonic larvae. Commercially bred by Biota and others.',
  },
  // Gobiodon are bi-directional sex changers; modelled as protogynous (young start female).
  sexSystem: 'protogynous',
  parentalCare: 'both',
  // ~3–5 years → ~140 game-days.
  lifecycle: { juvenileDays: 9, adultDays: 12, lifespanDays: 140, sexVisibleAtDays: 14, hatchSizeCm: 0.2 },

  hardiness: 0.7,
  difficulty: 'intermediate',
  baseValue: 45,
  rarity: 'uncommon',
  visitorAppeal: 0.65,
  unlock: { requires: ['reef'], hint: 'Unlocks with reef systems — it lives among branching corals.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Both wild-collected (~$25) and captive-bred (Biota, Proaquatix; ~$60–90) fish are sold.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2018)',
    note: 'Depends on healthy Acropora thickets, which are vulnerable to bleaching. Captive-bred clown gobies are available — choose them.',
  },

  genetics: {
    loci: [intensityLocus('No morphs. Individuals vary from lemon to canary yellow.')],
    phenotypes: [
      { id: 'wild', name: 'Yellow Clown Goby', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ bodyColor: '#ffd000', finColor: '#fcd20c' }),
    ],
    baseVisual: {
      bodyColor: '#f7d418',
      bodyColor2: '#e8bf12',
      bellyColor: '#fae36a',
      finColor: '#f4cf1c',
      finColor2: '#f9e27a',
      accentColor: '#f9e27a',
      eyeColor: '#3a3320',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.2,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.15,
      finType: 'goby_clown',
      finLength: 1,
      bodyDepth: 1.1,
      gillFullness: 0,
    },
    variation: 0.12,
    notes: 'Tiny, blunt-headed, deep-bodied goby, uniformly bright yellow with a slightly glossy, scaleless-looking skin and large dark eyes. Fused pelvic fins form a sucker-like disc for gripping branches. No morphs.',
  },
  visualMorphs: ['Yellow Clown Goby (no morphs; individual variation)'],

  behaviorSet: 'goby_perch',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 4, turnRate: 3, hoverTendency: 0.4, schoolingTightness: 0, restOnBottom: 0.3, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['coral_perch', 'branch_hop', 'toxic_mucus', 'pair_share_coral'],

  encyclopedia: {
    summary: 'A tiny, glossy yellow goby that sits among coral branches like a living ornament.',
    nativeHabitat: 'Staghorn Acropora thickets in lagoons 2–15 m deep, where groups of 5–15 hover among the branches.',
    socialStructure: 'Pairs are faithful and share a coral. Like other Gobiodon, individuals can change sex in either direction to form a pair.',
    tankNeeds: 'A 10-gallon or larger reef with branching coral to perch in, gentle flow and several small meaty meals a day.',
    compatibilityNotes: 'Peaceful with fish and invertebrates. May nip Acropora polyps if underfed, especially on small colonies, and eggs laid on a branch cause local tissue loss. Bullied by boisterous fish.',
    breedingOverview: 'Pairs lay eggs under a coral branch and guard them. Captive-bred clown gobies are produced commercially.',
    conservationNote: 'Least Concern (IUCN 2018), but its home corals are vulnerable to bleaching. Captive-bred fish are available.',
    funFact: 'Its skin mucus is laced with a toxin: predators that grab a clown goby often spit it out alive.',
    inGameBehavior: 'Perches in coral branches, hops from branch to branch, and darts out to pick passing food before returning to its favourite spot.',
  },
  sourceReferences: [
    { id: 'fishbase-gobiodon-okinawae', title: 'FishBase — Gobiodon okinawae (Okinawa goby)', url: 'https://www.fishbase.se/summary/Gobiodon-okinawae.html', tier: 1, facts: ['max 3.5 cm TL', 'depth 2–15 m', 'coral-commensal among staghorn Acropora', 'aggregations of 5–15', 'IUCN Least Concern (2018)'] },
    { id: 'liveaquaria-clown-goby', title: 'LiveAquaria — Clown Goby, Yellow', url: 'https://www.liveaquaria.com/product/1441/?pcatid=1441', tier: 2, facts: ['min 10 gal', 'max 1.5 in', 'may nip small SPS polyps', 'eggs under coral branch cause tissue recession', 'keep singly — fights own kind in small tanks', '72–78 °F, SG 1.020–1.025', 'price ~$25'] },
    { id: 'biota-clown-goby', title: 'The Biota Group — Yellow Clown Goby (captive-bred)', url: 'https://shop.thebiotagroup.com/products/yellow-clown-goby', tier: 2, facts: ['captive-bred', 'social, more active in small groups', 'may nip Acropora polyps if underfed', 'small colonies at higher risk', 'price ~$90'] },
    { id: 'gratzer-2015-gobiodon-toxins', title: 'Gratzer et al. (2015) Skin toxins in coral-associated Gobiodon species affect predator preference and prey survival. Marine Ecology (PMC4459215)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4459215', tier: 1, facts: ['toxic skin mucus deters predators', 'captured gobies expelled alive', 'strong Acropora association', 'bi-directional sex change'] },
  ],
  confidenceNotes: [
    'Social conflict: FishBase and Biota describe small groups; LiveAquaria advises one per small tank. Modelled as tension between unpaired adults, fine as a pair.',
    'The toxin and bi-directional sex change are documented for the genus (G. histrio and others); G. okinawae itself was not tested by Gratzer et al.',
    'Incubation and clutch size come from hobby breeding reports (moderate confidence).',
    'Temperature: FishBase gives 20–25 °C for the wild range; care sheets use 72–78 °F. Ideal band set to 23.5–26.5 °C.',
  ],
  exceptionRules: [],
  special: {
    hostNote: 'Perches in branching SPS coral, ideally Acropora. It can live without coral but is less settled; it may nip polyps of small colonies.',
  },
  visualLane: 'fish',
};
