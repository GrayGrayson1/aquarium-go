import type { SpeciesDefinition } from '@/types';

/**
 * Ramshorn snail (Seminole ramshorn) — Planorbella duryi. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#ramshorn-snail
 * The trade's red, blue and leopard ramshorns are mostly this species (Aquarium Glaser; Buce Plant); the larger
 * European great ramshorn (Planorbarius corneus) is a different snail.
 */
export const ramshornSnail: SpeciesDefinition = {
  id: 'ramshorn_snail',
  commonName: 'Ramshorn Snail',
  scientificName: 'Planorbella duryi',
  category: 'invertebrate',
  group: 'snail',
  genus: 'Planorbella',
  environment: 'freshwater',
  waterClasses: ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Peninsular Florida (and coastal Georgia and South Carolina) — weedy ditches, marshes, ponds and lakes; introduced worldwide through the aquarium trade',
  isStarter: false,

  // Lucid key: up to 25 mm; USFWS adults about 20 mm; aquarium snails often about 1 cm.
  adultSizeCm: 1.5,
  recommendedMinTankGallons: 5,
  recommendedFootprint: { minLengthIn: 12, minWidthIn: 8 },
  activeSwimmer: false,
  bioload: 0.1,

  // The Shrimp Farm 22–28 °C, pH 6.5–8.0; Buce Plant 20–28 °C, pH 7.0–8.2, GH 6–18, KH 3–15; it survives 33 °C and
  // stops laying below 12 °C (USFWS, citing El-Emam & Madsen 1982).
  tempC: { min: 12, max: 32, idealMin: 22, idealMax: 27 },
  pH: { min: 6.5, max: 8.4, idealMin: 7, idealMax: 8.2 },
  salinitySG: null,
  gh: { min: 6, max: 18 },
  kh: { min: 3, max: 15 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'detritivore',
  foods: ['biofilm', 'detritus', 'algae_wafer', 'vegetable', 'nori', 'pellet_sinking', 'flake'],
  feedingStyle: 'grazer',
  feedingSpeed: 0.05,
  feedingAggression: 0,
  hungerHours: 48,

  activityZone: ['glass', 'decor', 'bottom', 'surface'],
  temperament: 'peaceful',
  territoriality: 0,
  aggression: 0,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'colony', minGroup: 1, idealGroup: 5, note: 'Not social; one snail can start a colony, and numbers follow the food.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Completely peaceful with its own kind.' },

  predatorTags: [],
  preyTags: ['snail', 'snail_small'],
  maxLikelyPreySizeCm: 0,

  shrimpSafe: 'safe',
  snailSafe: 'safe',
  frySafe: 'safe',
  plantSafe: 'mostly_safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 0,
  coverPreference: 0.3,
  substrateRules: { preferred: ['sand', 'fine_gravel', 'planted_soil', 'fine_sand'], avoid: [], note: 'Glides over glass, plants and wood. Needs calcium for its shell: soft, acid water pits it. It eats melting leaves, and may nibble soft plants when hungry.' },

  breeding: {
    system: 'snail_egg_clutch',
    difficulty: 0.05,
    maturityDays: 6,
    clutchSize: { min: 6, max: 25 },
    incubationHours: 80,
    fryRearingHours: 72,
    cooldownDays: 2,
    conditions: { needsPartner: true, minTempC: 18, minTankGallons: 2 },
    predationWithoutNursery: 0.3,
    nurseryRequired: false,
    maxRaisedPerClutch: 6,
    notes: 'A hermaphrodite: any two snails can mate and both then lay (one alone can fertilise its own eggs, later and with fewer of them; the game breeds them in twos). It sticks small, clear jelly clutches of up to about 15–25 eggs to the glass and plants under water; they hatch in about 10–12 days at 25–27 °C as tiny crawling snails, with no larval stage. Numbers boom when food is plentiful — feed less to keep them in check.',
  },
  sexSystem: 'simultaneous_hermaphrodite',
  parentalCare: 'none',
  // About 1 year (The Shrimp Farm), up to 2 (Garnelio) → ~50 game-days.
  lifecycle: { juvenileDays: 6, adultDays: 8, lifespanDays: 50, sexVisibleAtDays: 50, hatchSizeCm: 0.1 },

  hardiness: 0.9,
  difficulty: 'beginner',
  baseValue: 2,
  rarity: 'common',
  visitorAppeal: 0.35,
  unlock: { requires: [], hint: 'Available from the start.' },
  captiveBredAvailable: true,
  conservation: { status: 'Not evaluated (IUCN global); NatureServe G5 (secure)', note: 'Common in Florida and introduced widely through aquarium releases. Never release aquarium snails.' },

  genetics: {
    loci: [
      {
        id: 'red',
        name: 'Red (no melanin)',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Brown', dominance: 2, frequency: 0.6 },
          { id: 'r', name: 'Red', dominance: 1, frequency: 0.4 },
        ],
        note: 'The red form lacks melanin, so its red blood shows through (FWGNA calls it the domesticated albino form). Hobby sources call it recessive; in the related Biomphalaria pigment is a single dominant gene (Knight et al. 1999), so recessive red is plausible but unverified.',
      },
      {
        id: 'blue',
        name: 'Blue shell',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Normal shell', dominance: 2, frequency: 0.75 },
          { id: 'b', name: 'Blue', dominance: 1, frequency: 0.25 },
        ],
        note: 'Pastel blue snails are a captive form whose basis is unpublished; hobby sources call it recessive.',
      },
      {
        id: 'leopard',
        name: 'Leopard',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Plain shell', dominance: 2, frequency: 0.75 },
          { id: 'l', name: 'Leopard spots', dominance: 1, frequency: 0.25 },
        ],
        note: 'Leopard spotting can appear on any shell colour (The Shrimp Farm); its inheritance is unpublished, so the game makes it recessive.',
      },
    ],
    phenotypes: [
      { id: 'red', name: 'Red', layer: 'base', rarity: 0.1, when: [{ locus: 'red', allele: 'r', count: 'hom' }], visual: { bodyColor: '#c98a4a', bodyColor2: '#b0703a', bellyColor: '#d8504a', finColor: '#c8362e', finColor2: '#e0605a', accentColor: '#7a3a1e', translucency: 0.35 }, note: 'A red body seen through a golden, see-through shell.' },
      { id: 'blue', name: 'Blue', layer: 'base', rarity: 0.2, when: [{ locus: 'blue', allele: 'b', count: 'hom' }], visual: { bodyColor: '#8fa8bf', bodyColor2: '#7a92aa', bellyColor: '#5a6070', finColor: '#4a4e5a', finColor2: '#6a7080', accentColor: '#4a5a70' } },
      { id: 'brown', name: 'Brown', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'leopard', name: 'Leopard', layer: 'overlay', rarity: 0.15, when: [{ locus: 'leopard', allele: 'l', count: 'hom' }], visual: { pattern: 'spots', patternContrast: 0.75 } },
    ],
    baseVisual: {
      bodyColor: '#6b4a2b',
      bodyColor2: '#4e3420',
      bellyColor: '#3e342c',
      finColor: '#2e2620',
      finColor2: '#5a4a3e',
      accentColor: '#2a1a10',
      eyeColor: '#101010',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.05,
      metallic: 0,
      translucency: 0.3,
      finType: 'snail_ramshorn',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the snail art: body/body2 = the flat, coiled shell (pale translucent brown and finely striated in wild snails); fin = the soft body and foot, belly = its underside; accent = the leopard spots. A red snail’s red body shows through its golden shell.',
  },
  visualMorphs: ['Brown', 'Red', 'Blue', 'Leopard'],

  behaviorSet: 'snail',
  behaviorTraits: { cruiseSpeed: 0.04, burstSpeed: 0.08, turnRate: 0.35, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 0.5, hitching: 0, burrowing: 0, glassSurfing: 0, curiosity: 0.1, nocturnal: 0.3, pickRadiusMul: 1.4 },
  specialBehaviors: ['glide', 'climb_glass', 'float_drift'],

  encyclopedia: {
    summary: 'A little snail with a flat, coiled shell like a ram’s horn, in brown, red, blue or leopard-spotted forms.',
    nativeHabitat: 'Weedy ditches, marshes, ponds and lakes of Florida; now introduced around the world from aquariums.',
    socialStructure: 'Not social; a hermaphrodite, so any two snails can breed (in nature one alone can too, later and with fewer eggs).',
    tankNeeds: 'Any tank of 5 gallons or more with hard, mineral-rich water (pH 7 or above) for its shell.',
    compatibilityNotes: 'Harmless to fish, shrimp and healthy plants. Eaten by puffers, loaches, crayfish and assassin snails.',
    breedingOverview: 'Lays small, clear jelly clutches on the glass and plants; tiny snails hatch in under two weeks, and numbers boom when food is plentiful.',
    conservationNote: 'Not assessed globally; secure in its native range.',
    funFact: 'Ramshorns have red blood: they carry haemoglobin, like us, instead of the copper-based haemocyanin of most snails — which is why the red form is red.',
    inGameBehavior: 'Glides over glass and leaves, sometimes floating at the surface on a bubble of air and dropping when startled.',
    feedingNote: 'Lives on leftovers, film algae, detritus and melting leaves; in a very clean tank give an algae wafer now and then. Overfeeding the fish feeds a snail boom.',
    keeperTip: 'Don’t overfeed, and add calcium if your water is soft — a pitted shell means the water is too acid.',
  },
  sourceReferences: [
    { id: 'lucid-planorbella-duryi', title: 'Lucid key, Australian Freshwater Molluscs — Planorbella duryi', url: 'https://keys.lucidcentral.org/keys/v3/freshwater_molluscs/key/australian_freshwater_molluscs/Media/Html/entities/planorbella_duryi.htm', tier: 1, facts: ['up to 25 mm', 'sinistral, biconcave shell', 'jelly egg masses, direct development', 'algae and detritus'] },
    { id: 'fwgna-helisoma-duryi', title: 'Freshwater Gastropods of North America (Dillon) — Helisoma scalare duryi', url: 'https://fwgna.org/species/planorbidae/h_scalaris_duryi.html', tier: 1, facts: ['Florida range', 'self-fertilises with a delay', 'stores sperm ~150 days', 'red (albino) domestic form', 'floats on an air pocket'] },
    { id: 'usfws-erss-seminole-ramshorn', title: 'USFWS — Ecological Risk Screening Summary: Seminole Ramshorn (2025)', url: 'https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-seminole-ramshorn.pdf', tier: 1, facts: ['valid name Planorbella duryi', 'adults ~20 mm', 'best growth at 26 °C, survives 33 °C', 'no laying below 12 °C'] },
    { id: 'shrimpfarm-ramshorn', title: 'The Shrimp Farm — Ramshorn snail care', url: 'https://www.theshrimpfarm.com/posts/ramshorn-snail-care/', tier: 2, facts: ['22–28 °C, pH 6.5–8.0', 'colour forms', 'safe with shrimp', 'booms when overfed', 'about 1 year'] },
    { id: 'glaser-planorbella-duryi', title: 'Aquarium Glaser — Planorbella duryi', url: 'https://aquariumglaser.de/en/fisharchive/planorbella-duryi-2', tier: 2, facts: ['clutches up to 15 eggs, hatch in 10–12 days', 'one snail can start a colony', 'leaves healthy plants alone'] },
  ],
  confidenceNotes: [
    'Colour-form inheritance is unpublished for this snail; red, blue and leopard are modelled as recessive.',
    'Egg counts per clutch differ (up to 15 in Aquarium Glaser; about 21–26 averaged from Milward-de-Andrade et al. 1978).',
    'Some UK “red ramshorns” are the great ramshorn Planorbarius corneus instead.',
  ],
  exceptionRules: [],
  special: { medicationSensitive: true, airBreather: true },
  visualLane: 'special',
};
