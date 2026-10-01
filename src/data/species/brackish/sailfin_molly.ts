import type { SpeciesDefinition } from '@/types';
import { ladderRules } from '../freshwater/_genetics';

/**
 * Sailfin molly — Poecilia latipinna and the domestic "molly" strains (many are hybrids with P. sphenops / P. velifera).
 * Lane brackish. Sources, key values and conflicts: docs/research/brackish.md.
 * Phenotype colours describe the MALE. Females are larger and deeper-bodied with a small rounded dorsal (no sail) and a
 * normal anal fin; males carry the tall sailfin dorsal and a gonopodium — renderers derive the female look from sex.
 * Visual mapping: bodyColor = flank ground, bodyColor2 = back/upper flank, accentColor = spots/marbling, finColor =
 * dorsal sail + tail, finColor2 = the sail's edge band.
 */
export const sailfinMolly: SpeciesDefinition = {
  id: 'sailfin_molly',
  commonName: 'Sailfin Molly',
  scientificName: 'Poecilia latipinna',
  category: 'fish',
  group: 'livebearer',
  genus: 'Poecilia',
  environment: 'brackish',
  waterClasses: ['brackish', 'freshwater_tropical'],
  nativeRegion: 'Coastal south-eastern United States and north-eastern Mexico — salt marshes, estuaries and coastal ditches from the Cape Fear drainage (North Carolina) to Veracruz',
  isStarter: false,

  // FishBase 15 cm TL (males), Seriously Fish 125 mm SL; domestic fish usually 8–12 cm.
  adultSizeCm: 11,
  // Seriously Fish 87 L (~23 gal); Aquarium Co-Op 20 gal minimum. Sails need swimming room → 29 gal.
  recommendedMinTankGallons: 29,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 1.6,

  // FishBase 20–28 °C; Seriously Fish 21–26 °C, pH 7.0–8.5, 15–35 dGH; Aquarium Co-Op 24–27 °C.
  tempC: { min: 20, max: 28, idealMin: 23, idealMax: 27 },
  pH: { min: 7.0, max: 8.5, idealMin: 7.4, idealMax: 8.2 },
  // Euryhaline (tolerates up to ~87 ppt in the wild). Salt not required but hard water is; in-game cap 1.018.
  salinitySG: { min: 1.0, max: 1.018, idealMin: 1.002, idealMax: 1.012 },
  gh: { min: 12, max: 30 },
  kh: { min: 8, max: 20 },

  flowPreference: 'low',
  lightPreference: 'bright',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'vegetable', 'algae_wafer', 'biofilm', 'brine_shrimp', 'mysis', 'bloodworm', 'daphnia', 'baby_brine'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.65,
  feedingAggression: 0.35,
  hungerHours: 12,

  activityZone: ['upper', 'middle', 'glass', 'decor'],
  temperament: 'peaceful',
  territoriality: 0.1,
  aggression: 0.08,
  finNipper: 0.05,
  hasLongFins: true,
  social: { kind: 'group', minGroup: 3, idealGroup: 6, note: 'Keep at least three, with two or three females for every male so no female is chased constantly.' },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'ok',
    mixed: 'courtship_ok',
    juvenile: 'ok',
    note: 'Males raise their sails and spar in display; with more males than females the chasing becomes harassment.',
  },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_medium', 'long_fins'],
  maxLikelyPreySizeCm: 0.8,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'mostly_safe',
  coralRisk: 0.05,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.45,
  substrateRules: { preferred: ['sand', 'fine_sand', 'aragonite', 'fine_gravel'], avoid: [], note: 'Any substrate. Algae-covered rocks and roots give them something to graze; fine-leaved cover shelters fry.' },

  breeding: {
    system: 'livebearer',
    difficulty: 0.15,
    maturityDays: 10,
    // FishBase 10–100 young; Florida Museum 10–140.
    clutchSize: { min: 10, max: 100 },
    // Gestation 28 days (FishBase), 3–4 weeks (Florida Museum), up to ~2 months (Seriously Fish) → 30 days × 8.
    incubationHours: 240,
    fryRearingHours: 48,
    cooldownDays: 3,
    conditions: { needsPartner: true, needsCover: true, minTempC: 23, minTankGallons: 20 },
    predationWithoutNursery: 0.55,
    nurseryRequired: false,
    maxRaisedPerClutch: 10,
    notes:
      'Internal fertilisation via the male’s gonopodium; females store sperm for several broods. After about a month a female drops 10–100 large, free-swimming fry that take baby brine shrimp from birth. Domestic strains eat more of their fry than wild-type fish, so floating plants, fine-leaved cover or a nursery raise more of them.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 10, adultDays: 12, lifespanDays: 180, sexVisibleAtDays: 7, hatchSizeCm: 0.8 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 6,
  rarity: 'common',
  visitorAppeal: 0.72,
  unlock: { requires: ['brackish'], hint: 'Unlocks with Brackish Estuaries research (after intermediate freshwater).' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Least Concern (IUCN 2019)',
    note: 'Common at home, but released mollies are established in several western US states, Hawaii, New Zealand and beyond, where they have harmed desert pupfish and native damselflies. Never release aquarium fish.',
  },

  genetics: {
    loci: [
      {
        id: 'melanin',
        name: 'Melanin pattern',
        mode: 'mendelian',
        alleles: [
          { id: 'K', name: 'Black (melanistic)', dominance: 3, frequency: 0.2 },
          { id: 'D', name: 'Dalmatian', dominance: 2, frequency: 0.25 },
          { id: 'w', name: 'Wild pattern', dominance: 1, frequency: 0.55 },
        ],
        note: 'Real molly melanism is polygenic and varies with temperature; simplified to one dominance ladder (black > dalmatian > wild).',
      },
      {
        id: 'gold',
        name: 'Gold (g)',
        mode: 'mendelian',
        alleles: [
          { id: 'G', name: 'Normal pigment', dominance: 2, frequency: 0.65 },
          { id: 'g', name: 'Gold', dominance: 1, frequency: 0.35 },
        ],
        note: 'Gold (orange, dark-eyed) mollies are treated as a simple recessive (a hobby rule of thumb); black and dalmatian patterns mask it.',
      },
      {
        id: 'lyre',
        name: 'Lyretail (Ly)',
        mode: 'mendelian',
        alleles: [
          { id: 'Ly', name: 'Lyretail', dominance: 2, frequency: 0.18 },
          { id: 'n', name: 'Normal tail', dominance: 1, frequency: 0.82 },
        ],
        note: 'Treated as dominant (a common hobby claim); lyretail males with long gonopodia can struggle to mate.',
      },
    ],
    phenotypes: [
      ...ladderRules('melanin', 'base', [
        {
          allele: 'K',
          id: 'black',
          name: 'Black',
          rarity: 0.05,
          visual: { bodyColor: '#15161b', bodyColor2: '#0c0d11', bellyColor: '#26282f', finColor: '#121318', finColor2: '#2a3346', accentColor: '#2d3a52', eyeColor: '#1a1510', pattern: 'solid', patternContrast: 0.2, iridescence: 0.4, metallic: 0.1 },
        },
        {
          allele: 'D',
          id: 'dalmatian',
          name: 'Dalmatian',
          rarity: 0.15,
          visual: { bodyColor: '#efece3', bodyColor2: '#e2ddd0', bellyColor: '#f7f5ef', finColor: '#e9e5da', finColor2: '#1c1c22', accentColor: '#17171c', pattern: 'dalmatian', patternScale: 1, patternContrast: 0.95, iridescence: 0.15 },
        },
      ]),
      {
        id: 'gold',
        name: 'Gold',
        layer: 'base',
        rarity: 0.15,
        when: [
          { locus: 'melanin', allele: 'K', count: 'none' },
          { locus: 'melanin', allele: 'D', count: 'none' },
          { locus: 'gold', allele: 'g', count: 'hom' },
        ],
        visual: { bodyColor: '#f2a73c', bodyColor2: '#e08a26', bellyColor: '#f8d8a0', finColor: '#f0a846', finColor2: '#fbe0a8', accentColor: '#d97a1c', eyeColor: '#2a1c10', pattern: 'solid', patternContrast: 0.3, iridescence: 0.25, metallic: 0.15 },
      },
      { id: 'wild', name: 'Wild Sailfin', layer: 'base', rarity: 0, when: [], visual: {} },
      {
        id: 'lyretail',
        name: 'Lyretail',
        layer: 'overlay',
        rarity: 0.15,
        when: [{ locus: 'lyre', allele: 'Ly', count: 'any' }],
        visual: { finType: 'lyretail', finLength: 1.3 },
      },
    ],
    baseVisual: {
      bodyColor: '#9aa393',
      bodyColor2: '#6d7a6c',
      bellyColor: '#e6e6da',
      finColor: '#8e9a8a',
      finColor2: '#e8a33c',
      accentColor: '#3f5a52',
      eyeColor: '#1e1a14',
      pattern: 'spots',
      patternScale: 0.8,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.5,
      metallic: 0.2,
      translucency: 0.35,
      finType: 'sailfin',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Three simplified loci: melanin (black > dalmatian > wild), recessive gold, and dominant lyretail. Wild sailfins are silver-olive with rows of dark spots and a blue-sheened, orange-edged sail. Balloon mollies (a spinal deformity) are deliberately left out on welfare grounds.',
  },
  visualMorphs: ['Wild Sailfin', 'Black', 'Dalmatian', 'Gold', 'Lyretail', 'Black Lyretail', 'Dalmatian Lyretail'],

  behaviorSet: 'livebearer',
  behaviorTraits: { cruiseSpeed: 1, burstSpeed: 7, turnRate: 3, hoverTendency: 0.3, schoolingTightness: 0.2, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.08, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['male_display', 'sail_display', 'courtship_chase', 'graze_surfaces', 'give_birth', 'fry_hide'],

  encyclopedia: {
    summary: 'A big, easy-going livebearer from coastal marshes. Males raise a tall sail-like dorsal fin to show off, and the whole group grazes algae off every surface.',
    nativeHabitat: 'Salt marshes, estuaries, mangrove edges, coastal ditches and spring runs around the Gulf of Mexico and the south-eastern US Atlantic coast — fresh, brackish and even salty water.',
    socialStructure: 'Peaceful and social. Males display and chase females, so keep two or three females per male.',
    tankNeeds: 'About 29 gallons or more, warm (23–27 °C), hard and alkaline water. Salt isn’t required, but mollies do best slightly brackish (SG about 1.002–1.012). Feed plenty of vegetable matter — too little greenery can stunt a male’s sail — and let some algae grow for grazing.',
    compatibilityNotes: 'Peaceful with other calm fish of similar size. The males’ big sails attract fin-nippers such as figure-eight puffers. Adults eat fry and the odd shrimplet.',
    breedingOverview: 'Livebearers: about a month after mating, a female gives birth to 10–100 large, free-swimming fry. Floating plants or a nursery save more of them.',
    conservationNote: 'Least Concern at home, but released mollies are invasive in many warm countries. Never release aquarium fish.',
    funFact: 'Sailfin mollies have been found in water from fresh to more than twice as salty as the sea (about 87 ppt). Their all-female relative, the Amazon molly, needs a sailfin male to trigger its eggs but uses none of his genes.',
    inGameBehavior: 'Males flare their sails at rivals and females, the group grazes along rocks, roots and glass, and females give birth to fry that dash for cover.',
    feedingNote: 'A grazer that needs plenty of greens: vegetable flakes, algae wafers and blanched vegetables, plus algae it picks off surfaces and the odd frozen treat. Feed a little 2–3 times a day; an autofeeder with flakes or pellets suits it.',
    keeperTip: 'Keep the water hard. In soft water mollies often get “the shimmies”, a side-to-side wobble on the spot; crushed coral or aragonite in the filter helps hold hardness up.',
  },
  sourceReferences: [
    { id: 'fishbase-poecilia-latipinna', title: 'FishBase — Poecilia latipinna (sailfin molly)', url: 'https://www.fishbase.se/summary/Poecilia-latipinna.html', tier: 1, facts: ['15 cm TL (males)', 'Cape Fear drainage (NC) to Veracruz, Mexico', '20–28 °C', 'gestation ~28 days, 10–100 young', 'algae and plants plus small invertebrates', 'IUCN Least Concern (2019); potential pest'] },
    { id: 'usgs-nas-poecilia-latipinna', title: 'USGS NAS — Sailfin molly (Poecilia latipinna) species profile', url: 'https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=858', tier: 1, facts: ['native range', 'established in AZ, CA, CO, MT, NV, TX and Hawaii', 'implicated in declines of desert pupfish and native Hawaiian damselflies'] },
    { id: 'floridamuseum-poecilia-latipinna', title: 'Florida Museum (UF) — Discover Fishes: sailfin molly', url: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/poecilia-latipinna/', tier: 1, facts: ['max 150 mm TL', 'coastal marshes, ditches, estuaries', 'rows of spots merging into stripes', 'gestation 3–4 weeks, 10–140 young, sperm storage', 'melanistic and speckled wild forms'] },
    { id: 'seriouslyfish-poecilia-latipinna', title: 'Seriously Fish — Poecilia latipinna (sailfin molly)', url: 'https://www.seriouslyfish.com/species/poecilia-latipinna/', tier: 2, facts: ['125 mm SL', '21–26 °C, pH 7.0–8.5, 15–35 dGH', 'hard water essential; salt not required', '87 L minimum', 'vegetable matter; low greenery stunts the male sail', 'males spar; two females per male', 'fry take baby brine from birth'] },
    { id: 'aquarium-coop-molly', title: 'Aquarium Co-Op — Care guide for mollies', url: 'https://www.aquariumcoop.com/blogs/aquarium/molly-fish-care', tier: 2, facts: ['24–27 °C', '20 gal minimum', 'hard, mineral-rich water', 'gestation 30–60 days'] },
    { id: 'wikipedia-fancy-molly', title: 'Wikipedia — Fancy molly', url: 'https://en.wikipedia.org/wiki/Fancy_molly', tier: 2, facts: ['black molly from P. sphenops × P. latipinna crosses; high-fins add P. velifera', 'dalmatian/marbled, gold, lyretail and balloon varieties', 'colour and fin shape inherited independently'] },
  ],
  confidenceNotes: [
    'Domestic mollies are hybrids of P. latipinna, P. sphenops and P. velifera (origin disputed); the game uses P. latipinna values for all of them.',
    'Salinity: wild fish live from fresh water to ~87 ppt. The game allows fresh water (SG 1.000) with a small comfort penalty and caps the range at 1.018 so they are not sold for marine tanks.',
    'Gestation: 28 days (FishBase), 3–4 weeks (Florida Museum), up to ~2 months (Seriously Fish); 30 days = 240 game-hours used.',
    'Genetics are simplified and partly unverified: real melanism is polygenic; "gold is recessive" and "lyretail is dominant" are common hobby claims we could not confirm in a primary source. Colour and fin shape are inherited independently (as modelled).',
    'Balloon mollies (a spinal deformity) are deliberately left out on welfare grounds.',
    'Compressed time: 3–5 year lifespan ≈ 180 game-days.',
  ],
  exceptionRules: [],
  positiveInteractions: [{ other: 'tag:snail', text: 'Mollies and snails share algae duty without bothering each other.' }],
  visualLane: 'fish',
};
