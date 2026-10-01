import type { SpeciesDefinition } from '@/types';

/**
 * Bumblebee goby — Brachygobius doriae (the trade name covers several near-identical Brachygobius species). Lane brackish.
 * Sources, key values and conflicts: docs/research/brackish.md.
 * Visual mapping: bodyColor = yellow ground, accentColor = the black bands, finColor = smoky fins, finColor2 = dark fin
 * bars. Mature males are brighter yellow; ripe females rounder and duller.
 */
export const bumblebeeGoby: SpeciesDefinition = {
  id: 'bumblebee_goby',
  commonName: 'Bumblebee Goby',
  scientificName: 'Brachygobius doriae',
  category: 'fish',
  group: 'goby',
  genus: 'Brachygobius',
  environment: 'brackish',
  waterClasses: ['brackish', 'freshwater_tropical'],
  nativeRegion: 'South-east Asia — mangroves, estuaries and tidal streams of Borneo, the Malay Peninsula and nearby islands (Indonesia, Malaysia, Brunei, Singapore)',
  isStarter: false,

  // FishBase 4.2 cm TL; Seriously Fish 35 mm SL; trade fish usually 2.5–3.5 cm.
  adultSizeCm: 3.5,
  recommendedMinTankGallons: 10,
  recommendedFootprint: { minLengthIn: 20, minWidthIn: 10 },
  activeSwimmer: false,
  bioload: 0.3,

  // FishBase 22–29 °C, pH 8.0, 9–19 dH; Seriously Fish 22–28 °C, pH 7.0–8.5, 8–20 dGH.
  tempC: { min: 22, max: 29, idealMin: 24, idealMax: 28 },
  pH: { min: 7.0, max: 8.5, idealMin: 7.4, idealMax: 8.2 },
  // Fresh and brackish in the wild; Seriously Fish: salt optional (~2 g/L marine salt). No source gives a firm SG target.
  salinitySG: { min: 1.0, max: 1.012, idealMin: 1.001, idealMax: 1.006 },
  gh: { min: 8, max: 20 },
  kh: { min: 8, max: 18 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['bloodworm', 'brine_shrimp', 'baby_brine', 'daphnia', 'mysis'],
  feedingStyle: 'picker',
  // Slow, picky feeders that lose out to fast community fish (Seriously Fish: best in a species tank).
  feedingSpeed: 0.22,
  feedingAggression: 0.25,
  // Sedentary perchers: they spend the day sitting still, so a meal lasts a while.
  hungerHours: 18,

  activityZone: ['bottom', 'decor', 'lower', 'glass'],
  temperament: 'peaceful',
  territoriality: 0.6,
  aggression: 0.1,
  finNipper: 0.05,
  hasLongFins: false,
  social: {
    kind: 'group',
    minGroup: 3,
    idealGroup: 6,
    note: 'Keep a group of six or more with lots of caves and shells: each goby claims a tiny patch, and a group spreads the squabbles out.',
  },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'ok',
    mixed: 'courtship_ok',
    juvenile: 'ok',
    note: 'Males square up over caves with flared fins and short chases. Plenty of shells and crevices keep it harmless.',
  },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod', 'worm'],
  preyTags: ['fish_tiny', 'fish_benthic'],
  maxLikelyPreySizeCm: 0.4,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 3,
  coverPreference: 0.7,
  substrateRules: { preferred: ['sand', 'fine_sand', 'fine_gravel', 'aragonite'], avoid: [], note: 'Soft sand to perch on, with shells, caves and root tangles for every goby.' },

  breeding: {
    system: 'cave_spawner',
    difficulty: 0.55,
    maturityDays: 9,
    // Seriously Fish 100–200 eggs; FishBase 150–200.
    clutchSize: { min: 100, max: 200 },
    // Seriously Fish: hatch in 7–9 days; Wikipedia: ~7 days, free-swimming 5–7 days later → 8 × 8.
    incubationHours: 64,
    fryRearingHours: 160,
    cooldownDays: 5,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 25, needsConditioningFood: ['bloodworm', 'daphnia', 'brine_shrimp'], minTankGallons: 10 },
    predationWithoutNursery: 0.8,
    nurseryRequired: true,
    maxRaisedPerClutch: 8,
    notes:
      'The male claims a cave or empty shell (keepers use flower pots, tubes or shells), colours up orange and courts a plump female inside. She sticks 100–200 eggs to the cave roof and he guards and fans them until they hatch after about a week. The tiny fry need paramecium or rotifers (infusoria), then baby brine shrimp; adults eat them, so fry are raised in a nursery.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  lifecycle: { juvenileDays: 9, adultDays: 9, lifespanDays: 200, sexVisibleAtDays: 7, hatchSizeCm: 0.2 },

  hardiness: 0.6,
  difficulty: 'intermediate',
  baseValue: 6,
  rarity: 'common',
  visitorAppeal: 0.72,
  unlock: { requires: ['brackish'], hint: 'Unlocks with Brackish Estuaries research (after intermediate freshwater).' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Much of the trade is still wild-collected; aquarium-bred fish are sold by hobby breeders.',
  conservation: {
    status: 'Least Concern (IUCN 2018)',
    note: 'B. doriae is Least Concern, but relatives such as B. xanthozona are Data Deficient, and the mangroves and estuaries they live in are shrinking as coasts are developed. Keep and breed them responsibly, and never release them.',
  },

  genetics: {
    loci: [
      { id: 'bands', name: 'Band width', mode: 'additive', alleles: [{ id: 'narrow', name: 'Narrow bands', dominance: 1, frequency: 0.65 }, { id: 'broad', name: 'Broad bands', dominance: 1, frequency: 0.35 }], note: 'Natural individual variation in how wide the black bands are.' },
      { id: 'hue', name: 'Yellow tone', mode: 'additive', alleles: [{ id: 'lemon', name: 'Lemon', dominance: 1, frequency: 0.7 }, { id: 'gold', name: 'Deep gold', dominance: 1, frequency: 0.3 }], note: 'Some individuals are a deeper honey-gold; colour also brightens in breeding males.' },
    ],
    phenotypes: [
      { id: 'deep_gold', name: 'Deep Gold', layer: 'base', rarity: 0.12, when: [{ locus: 'hue', allele: 'gold', count: 'hom' }], visual: { bodyColor: '#e0a21c', bodyColor2: '#c98a14', bellyColor: '#f0cf7a' }, note: 'Individual variation, not a trade morph.' },
      { id: 'wild', name: 'Wild Type', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'broad_bands', name: 'Broad-banded', layer: 'overlay', rarity: 0.08, when: [{ locus: 'bands', allele: 'broad', count: 'hom' }], visual: { patternScale: 1.25, patternContrast: 1 }, note: 'Individual variation, not a trade morph.' },
    ],
    baseVisual: {
      bodyColor: '#eec52e',
      bodyColor2: '#dca91e',
      bellyColor: '#f4e2a2',
      finColor: '#b9ae8a',
      finColor2: '#1f1a14',
      accentColor: '#16130f',
      eyeColor: '#c8a24a',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.95,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0,
      translucency: 0.4,
      finType: 'goby',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'No domestic morphs. The loci describe natural variation in band width and yellow tone. Four black bands: across the head/eye, behind the pectorals, under the second dorsal fin, and at the tail base.',
  },
  visualMorphs: ['Wild Type', 'Deep Gold', 'Broad-banded'],

  behaviorSet: 'goby_perch',
  behaviorTraits: { cruiseSpeed: 0.8, burstSpeed: 6, turnRate: 4, hoverTendency: 0.5, schoolingTightness: 0, restOnBottom: 0.7, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['perch', 'hop', 'cave_guard', 'territory_flare'],

  encyclopedia: {
    summary: 'A thumbnail-sized goby striped like a bumblebee, which spends its day perched on stones and roots and hopping between them.',
    nativeHabitat: 'Muddy mangrove creeks, tidal rivers and estuaries of South-east Asia, among roots, leaf litter and shells.',
    socialStructure: 'A loose, squabbling group: each goby defends a tiny patch, so groups of six or more with many caves work best.',
    tankNeeds: 'A 10-gallon tank for a small group, warm (24–28 °C), hard, alkaline water with a little salt (SG about 1.001–1.006 — salt is optional, hardness is not), soft sand and plenty of shells, caves and root tangles. Small live or frozen foods are essential; they usually ignore flakes and pellets.',
    compatibilityNotes: 'Best in a species tank: too small, slow and picky to compete with boisterous feeders, easily bullied by puffers and eaten by archerfish. They may pick off the odd shrimplet.',
    breedingOverview: 'A cave spawner: the male guards 100–200 eggs stuck to the roof of a cave or shell until they hatch after about a week. The tiny fry need infusoria, then baby brine shrimp, in a nursery tank.',
    conservationNote: 'Their mangrove and estuary habitats are shrinking. Keep and breed them responsibly, and never release them.',
    funFact: 'Like most gobies, its pelvic fins are fused into a little suction disc — perfect for perching on stones, or even the glass, in a tidal current. There are about ten Brachygobius species, all sold as “bumblebees”.',
    inGameBehavior: 'Perches on stones, roots and glass, hops from spot to spot, flares at rivals, and males guard their cave full of eggs.',
    feedingNote: 'A slow, picky feeder that pounces from its perch. Feed small frozen or live food daily — bloodworms, daphnia, brine shrimp, mysis or baby brine shrimp. It ignores flakes and pellets, so an autofeeder can’t feed it.',
    keeperTip: 'Ask the shop to show them eating frozen food before you buy. Many are wild-caught and only recognise live food at first, and a thin, pinched belly is a warning sign.',
  },
  sourceReferences: [
    { id: 'fishbase-brachygobius-doriae', title: 'FishBase — Brachygobius doriae (bumblebee goby)', url: 'https://www.fishbase.se/summary/Brachygobius-doriae.html', tier: 1, facts: ['4.2 cm TL', 'fresh and brackish water', 'Indonesia, Malaysia, Brunei, Singapore', '22–29 °C, pH 8.0, 9–19 dH', '150–200 eggs', 'IUCN Least Concern (2018)'] },
    { id: 'seriouslyfish-brachygobius-doriae', title: 'Seriously Fish — Brachygobius doriae (bumblebee goby)', url: 'https://www.seriouslyfish.com/species/brachygobius-doriae/', tier: 2, facts: ['35 mm SL', 'mangroves, estuaries and tidal streams over mud', '22–28 °C, pH 7.0–8.5, 8–20 dGH', 'salt optional (~2 g/L)', 'small live foods essential; dried food ignored', 'males territorial; groups of 6+; species tank best', 'male guards 100–200 eggs in a cave; hatch 7–9 days; fry need infusoria then Artemia', 'first band covers the first dorsal; pectoral and pelvic fins black on the inner two-thirds'] },
    { id: 'wikipedia-brachygobius', title: 'Wikipedia — Brachygobius', url: 'https://en.wikipedia.org/wiki/Brachygobius', tier: 2, facts: ['9–10 species, all sold as bumblebee gobies', 'freshwater and slightly brackish', 'about 40 L holds a dozen', 'eggs hatch in about 7 days', 'about 5 years in aquaria'] },
    { id: 'seriouslyfish-brachygobius-sabanus', title: 'Seriously Fish — Brachygobius sabanus', url: 'https://www.seriouslyfish.com/species/brachygobius-sabanus/', tier: 2, facts: ['smaller (27 mm SL)', 'often confused with B. doriae in the trade'] },
  ],
  confidenceNotes: [
    'Identification: the trade name covers B. doriae, B. sabanus and others that are hard to tell apart (fish sold as "B. xanthozonus" almost certainly are not). Values are shared across them.',
    'Salinity: found in fresh and brackish water; Seriously Fish calls salt optional (~2 g/L). The game treats them as brackish-leaning (ideal SG 1.001–1.006) but lets them live in hard fresh water with a small comfort penalty.',
    'Hatch time: 7–9 days (Seriously Fish) vs ~7 days (Wikipedia); 8 days = 64 game-hours used.',
    'Compressed time: maturity (~6 months) = 9 game-days; ~5 year lifespan ≈ 200 game-days.',
  ],
  exceptionRules: [],
  visualLane: 'fish',
};
