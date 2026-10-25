import type { PhenotypeRule, SpeciesDefinition } from '@/types';

/**
 * Freshwater angelfish — Pterophyllum scalare. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#freshwater-angelfish
 *
 * The colour genes are the hobby's real ones (Norton's crossing experiments, summarised by The Angelfish Society):
 * the Dark series D > M > Gm > g with wild type (+) between Gm and g, the Zebra/Stripeless locus, Smokey and Veil.
 * Stripes and smokey only show on fish whose body carries the wild bars (a wild-type allele at the Dark locus and no
 * marble), so marble, gold and black fish hide them; blushing (two stripeless copies) also clears the fins.
 */
type Cond = PhenotypeRule['when'][number];

/**
 * A stripe or smokey rule, written twice: once for silver fish (a wild Dark allele showing: wild/wild or wild/gold)
 * and once (id suffix _lace) for black lace (dark/wild). Marble, gold and black fish hide these genes.
 */
function barred(id: string, name: string, rarity: number, when: Cond[], visual: PhenotypeRule['visual'], note?: string): PhenotypeRule[] {
  const silver: Cond[] = [{ locus: 'dark', allele: 'W', count: 'any' }, { locus: 'dark', allele: 'D', count: 'none' }, { locus: 'dark', allele: 'M', count: 'none' }, { locus: 'dark', allele: 'Gm', count: 'none' }];
  const lace: Cond[] = [{ locus: 'dark', allele: 'D', count: 'het' }, { locus: 'dark', allele: 'W', count: 'het' }];
  const rule = (rid: string, base: Cond[]): PhenotypeRule => ({ id: rid, name, layer: 'overlay', rarity, when: [...when, ...base], visual, ...(note ? { note } : {}) });
  return [rule(id, silver), rule(`${id}_lace`, lace)];
}

export const freshwaterAngelfish: SpeciesDefinition = {
  id: 'freshwater_angelfish',
  commonName: 'Freshwater Angelfish',
  scientificName: 'Pterophyllum scalare',
  category: 'fish',
  group: 'cichlid',
  genus: 'Pterophyllum',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Amazon basin — Peru, Colombia and Brazil, plus Amapá, French Guiana and Guyana, in swamps and flooded ground thick with plants',
  isStarter: false,

  // FishBase 15 cm TL (its size field says 10.5); Seriously Fish and Aquarium Co-Op 15 cm long, 20 cm tall with fins.
  adultSizeCm: 15,
  // Aquarium Co-Op: a 29 gal holds at most 4 adults, a 20 gal high a pair; Seriously Fish ~53 gal for a group. Tall tanks.
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 3,

  // FishBase / Seriously Fish / PFK 24–30 °C; pH 6.0–8.0 (6.0–7.4 SF); 0–15 dGH. No sourced KH.
  tempC: { min: 23, max: 30, idealMin: 25, idealMax: 28 },
  pH: { min: 6, max: 8, idealMin: 6.5, idealMax: 7.4 },
  salinitySG: null,
  gh: { min: 1, max: 15 },
  kh: { min: 1, max: 10 },

  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'brine_shrimp', 'daphnia', 'mysis'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.5,
  feedingAggression: 0.4,
  hungerHours: 20,

  activityZone: ['middle', 'upper'],
  temperament: 'semi_aggressive',
  territoriality: 0.5,
  aggression: 0.35,
  finNipper: 0.05,
  hasLongFins: true,
  social: { kind: 'group', minGroup: 1, idealGroup: 5, note: 'Fine alone or as a pair; buy about six young and let pairs form. A spawning pair claims a corner and chases the rest.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'ok', note: 'Squabbles with its own kind; a pair guarding eggs drives the others away.' },

  // an ambush hunter of small fish and invertebrates: adults eat neons, nano fish and dwarf shrimp
  predatorTags: ['fish_tiny', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_medium', 'fish_slow', 'long_fins'],
  maxLikelyPreySizeCm: 3.5,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_sand', 'fine_gravel', 'planted_soil'], avoid: [], note: 'Tall plants and upright wood; a pair lays its eggs on a vertical surface — a broad leaf, slate or the glass. Use a tank at least 20 inches tall.' },

  breeding: {
    system: 'substrate_spawner',
    difficulty: 0.45,
    // 6–12 months to maturity (Wikipedia) → ~22 game-days
    maturityDays: 22,
    clutchSize: { min: 100, max: 1000 },
    incubationHours: 18,
    fryRearingHours: 150,
    cooldownDays: 8,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 26, needsConditioningFood: ['bloodworm', 'brine_shrimp'], minTankGallons: 20 },
    predationWithoutNursery: 0.65,
    nurseryRequired: true,
    maxRaisedPerClutch: 12,
    notes: 'A pair cleans a vertical surface — a broad leaf, slate, a pipe or the glass — and lays up to about 1,000 adhesive eggs, which both parents fan and guard. They hatch in about two days at 27–28 °C; the wrigglers hang on for about a week, then swim free and take newly hatched brine shrimp for about three weeks. Young pairs often eat their first few spawns, and pairs respawn every 7–10 days when the eggs are taken away.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'both',
  // 8–12 years (Aquarium Co-Op) → 400 game-days; the sexes look alike except for the breeding papilla at spawning age.
  lifecycle: { juvenileDays: 18, adultDays: 22, lifespanDays: 400, sexVisibleAtDays: 22, hatchSizeCm: 0.3 },

  hardiness: 0.75,
  difficulty: 'beginner',
  baseValue: 12,
  rarity: 'common',
  visitorAppeal: 0.85,
  unlock: { requires: [], hint: 'Available from the start — it needs a tall tank.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Almost all are mass-bred in the Far East and Eastern Europe; wild fish are rarely sold.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2020)', note: 'Common in the wild; trade fish are farm-bred. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'dark',
        name: 'Dark series',
        mode: 'mendelian',
        alleles: [
          { id: 'D', name: 'Dark', dominance: 5, frequency: 0.08 },
          { id: 'M', name: 'Marble', dominance: 4, frequency: 0.15 },
          { id: 'Gm', name: 'Gold Marble', dominance: 3, frequency: 0.08 },
          { id: 'W', name: 'Wild', dominance: 2, frequency: 0.55 },
          { id: 'g', name: 'Gold', dominance: 1, frequency: 0.14 },
        ],
        note: 'One gene with five alleles (Norton: dark × marble gave black lace and marble, never wild type). D, M and Gm each show with one copy and look different again with the wild allele (black lace, silver marble, silver gold marble); gold is recessive to everything.',
      },
      {
        id: 'stripe',
        name: 'Zebra / Stripeless',
        mode: 'codominant',
        alleles: [
          { id: 'W', name: 'Wild', dominance: 1, frequency: 0.75 },
          { id: 'Z', name: 'Zebra', dominance: 2, frequency: 0.1 },
          { id: 'S', name: 'Stripeless', dominance: 2, frequency: 0.15 },
        ],
        note: 'Zebra (extra bars) looks the same with one or two copies; stripeless is partly dominant — one copy is ghost, two is blushing — and a zebra/stripeless fish is a spotted clown (Norton; TAS).',
      },
      {
        id: 'smokey',
        name: 'Smokey',
        mode: 'codominant',
        alleles: [
          { id: 'W', name: 'Wild', dominance: 1, frequency: 0.92 },
          { id: 'Sm', name: 'Smokey', dominance: 2, frequency: 0.08 },
        ],
        note: 'Partly dominant: one copy darkens the rear half (smokey), two make chocolate (Norton’s wild × smokey crosses split 1:1). Gold hides it (TAS).',
      },
      {
        id: 'veil',
        name: 'Veil',
        mode: 'codominant',
        alleles: [
          { id: 'W', name: 'Standard fins', dominance: 1, frequency: 0.75 },
          { id: 'V', name: 'Veil', dominance: 2, frequency: 0.25 },
        ],
        note: 'Partly dominant: one copy is veil, two superveil, whose long fins can sag (TAS; Norton).',
      },
    ],
    phenotypes: [
      // Dark series (first match wins)
      { id: 'black', name: 'Black', layer: 'base', rarity: 0.35, when: [{ locus: 'dark', allele: 'D', count: 'hom' }], visual: { bodyColor: '#141414', bodyColor2: '#1c1c1e', bellyColor: '#202022', finColor: '#18181a', finColor2: '#2a2a32', accentColor: '#0a0a0a', pattern: 'solid', iridescence: 0.45 }, note: 'Double dark: near carbon-black, a blue sheen on the gill covers; slower-growing.' },
      { id: 'black_lace', name: 'Black Lace', layer: 'base', rarity: 0.15, when: [{ locus: 'dark', allele: 'D', count: 'het' }, { locus: 'dark', allele: 'W', count: 'het' }], visual: { bodyColor: '#7c8084', bodyColor2: '#8a8460', bellyColor: '#9a9ea0', finColor: '#5a5e62', finColor2: '#16161a', accentColor: '#141414' }, note: 'One dark copy over wild: light charcoal with the wild bars and lacy dark-edged fins.' },
      { id: 'hybrid_black', name: 'Hybrid Black', layer: 'base', rarity: 0.2, when: [{ locus: 'dark', allele: 'D', count: 'any' }], visual: { bodyColor: '#1e1e1c', bodyColor2: '#2a2622', bellyColor: '#2c2a26', finColor: '#201e1c', finColor2: '#302c28', accentColor: '#0e0e0e', pattern: 'solid' }, note: 'One dark copy over marble, gold marble or gold: a deep creamy black that does not breed true.' },
      { id: 'silver_marble', name: 'Silver Marble', layer: 'base', rarity: 0.15, when: [{ locus: 'dark', allele: 'M', count: 'het' }, { locus: 'dark', allele: 'W', count: 'het' }], visual: { bodyColor: '#c4c8ca', bodyColor2: '#b0a880', accentColor: '#3a3a3c', pattern: 'marble', patternContrast: 0.75 } },
      { id: 'marble', name: 'Marble', layer: 'base', rarity: 0.15, when: [{ locus: 'dark', allele: 'M', count: 'any' }], visual: { bodyColor: '#e8e8e4', bodyColor2: '#d8c890', bellyColor: '#f0f0ec', finColor: '#d8dad8', finColor2: '#1a1a1c', accentColor: '#141414', pattern: 'marble', patternContrast: 0.95 }, note: 'White and black marbling; more white the further down the series the second allele is.' },
      { id: 'silver_gold_marble', name: 'Silver Gold Marble', layer: 'base', rarity: 0.2, when: [{ locus: 'dark', allele: 'Gm', count: 'het' }, { locus: 'dark', allele: 'W', count: 'het' }], visual: { bodyColor: '#cfd0c4', bodyColor2: '#d8b060', accentColor: '#2a2a2a', pattern: 'marble', patternContrast: 0.65 } },
      { id: 'gold_marble', name: 'Gold Marble', layer: 'base', rarity: 0.2, when: [{ locus: 'dark', allele: 'Gm', count: 'any' }], visual: { bodyColor: '#e8d9a8', bodyColor2: '#e89a2c', bellyColor: '#f2e8c8', finColor: '#ece4c8', finColor2: '#2a2a2a', accentColor: '#151515', pattern: 'marble', patternContrast: 0.8, eyeColor: '#a0502a' } },
      { id: 'gold', name: 'Gold', layer: 'base', rarity: 0.2, when: [{ locus: 'dark', allele: 'g', count: 'hom' }], visual: { bodyColor: '#e8d9a8', bodyColor2: '#e89a2c', bellyColor: '#f2e8c8', finColor: '#ece4c8', finColor2: '#f0d898', accentColor: '#c8a860', pattern: 'solid', eyeColor: '#8a5a2a' }, note: 'Light gold with a yellow-orange crown, gold even as tiny fry; no stripes and no red eye.' },
      { id: 'silver', name: 'Silver', layer: 'base', rarity: 0, when: [], visual: {} },
      // Zebra / Stripeless and smokey — only on fish that show the wild bars: silver (wild/wild, wild/gold) and black lace
      ...barred('clown', 'Clown', 0.35, [{ locus: 'stripe', allele: 'Z', count: 'any' }, { locus: 'stripe', allele: 'S', count: 'any' }], { pattern: 'spots', patternContrast: 0.85 }, 'Zebra with stripeless: a spotted body.'),
      ...barred('zebra', 'Zebra', 0.15, [{ locus: 'stripe', allele: 'Z', count: 'any' }, { locus: 'stripe', allele: 'S', count: 'none' }], { pattern: 'bars' }, 'Three to five extra vertical bars.'),
      ...barred('ghost', 'Ghost', 0.1, [{ locus: 'stripe', allele: 'S', count: 'het' }, { locus: 'stripe', allele: 'Z', count: 'none' }], { pattern: 'solid' }, 'One stripeless copy: the body bars are gone.'),
      ...barred('blushing_bars', 'Blushing', 0, [{ locus: 'stripe', allele: 'S', count: 'hom' }], { pattern: 'solid' }),
      { id: 'blushing', name: 'Blushing', layer: 'overlay', rarity: 0.2, when: [{ locus: 'stripe', allele: 'S', count: 'hom' }], visual: { bellyColor: '#ecd2d0', finColor2: '#e8e2e0', translucency: 0.5 }, note: 'Two stripeless copies: no bars or fin striations, and see-through gill covers that show pink in the young.' },
      { id: 'koi_white', name: 'Blushing', layer: 'overlay', rarity: 0, when: [{ locus: 'stripe', allele: 'S', count: 'hom' }, { locus: 'dark', allele: 'Gm', count: 'any' }, { locus: 'dark', allele: 'W', count: 'none' }], visual: { bodyColor: '#f2f2ee', bellyColor: '#f6f4f0' }, note: 'Gold marble blushing (koi): the body turns white under the black marbling and orange crown.' },
      ...barred('smokey', 'Smokey', 0.15, [{ locus: 'smokey', allele: 'Sm', count: 'het' }], { pattern: 'mottled', bodyColor2: '#2e2824', accentColor: '#1e1a18', patternContrast: 0.8 }, 'A dark rear half starting about mid-dorsal, black-tipped dorsal and anal fins, a black mouth.'),
      ...barred('chocolate', 'Chocolate', 0.3, [{ locus: 'smokey', allele: 'Sm', count: 'hom' }], { pattern: 'mottled', bodyColor: '#5a4a3e', bodyColor2: '#3a2e26', accentColor: '#1a1410', patternContrast: 0.8 }),
      // Fins
      { id: 'veil', name: 'Veil', layer: 'overlay', rarity: 0.1, when: [{ locus: 'veil', allele: 'V', count: 'het' }], visual: { finType: 'veil', finLength: 1.4 } },
      { id: 'superveil', name: 'Superveil', layer: 'overlay', rarity: 0.25, when: [{ locus: 'veil', allele: 'V', count: 'hom' }], visual: { finType: 'superveil', finLength: 1.75 } },
    ],
    strains: [
      { id: 'koi', name: 'Koi', requires: ['gold_marble', 'blushing'], note: 'Gold marble blushing: white with black marbling and an orange crown (TAS).' },
      { id: 'zebra_lace', name: 'Zebra Lace', requires: ['black_lace', 'zebra_lace'], note: 'Black lace with the zebra gene (TAS).' },
    ],
    baseVisual: {
      bodyColor: '#c9cdd0',
      bodyColor2: '#bdb38a',
      bellyColor: '#e2e4e2',
      finColor: '#c9cdd0',
      finColor2: '#2a2a2c',
      accentColor: '#1a1a1a',
      eyeColor: '#b22222',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.3,
      metallic: 0.3,
      translucency: 0.35,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'Colour slots for the angelfish art: body/belly = the silver ground; body2 = the crown on top of the head (gold to orange on gold and koi forms) and the back’s olive sheen; accent = the bars and marbling; fin = the sheer fins, fin2 = their dark edges and striations; eye = the iris (red in wild-type fish). Pattern: bands = the wild silver’s four bars, bars = zebra, marble = marble and koi, mottled = smokey and chocolate, spots = clown, solid = stripeless, gold and black.',
  },
  visualMorphs: ['Silver', 'Black Lace', 'Black', 'Marble', 'Gold Marble', 'Gold', 'Zebra', 'Ghost', 'Smokey', 'Veil'],

  behaviorSet: 'cichlid_discus',
  behaviorTraits: { cruiseSpeed: 0.45, burstSpeed: 4.5, turnRate: 1.6, hoverTendency: 0.6, schoolingTightness: 0.25, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['group_hover', 'pair_bond', 'cone_clean', 'stress_bar_flash', 'ambush_strike'],

  encyclopedia: {
    summary: 'The tall, arrow-shaped cichlid of countless aquariums: silver with black bars, gliding among tall plants on long, swept-back fins.',
    nativeHabitat: 'Swamps and flooded ground thick with plants across the Amazon basin and the Guianas, in clear or silty water.',
    socialStructure: 'Lives in loose groups until pairs form; a pair claims a spawning site and defends it hard.',
    tankNeeds: 'A tall tank (20 inches or more) of 30 gallons or more, warm soft water around 25–28 °C, gentle flow, tall plants and upright wood.',
    compatibilityNotes: 'Peaceful most of the time, but adults eat neon tetras, nano fish and dwarf shrimp, and breeding pairs chase tankmates. Fin-nippers such as tiger barbs pick at its long fins. Good with larger tetras, corydoras and plecos.',
    breedingOverview: 'A pair lays hundreds of eggs on a leaf, slate or the glass and both parents fan and guard them; young pairs often eat their first spawns.',
    conservationNote: 'Least Concern (IUCN 2020). Trade fish are farm-bred.',
    funFact: 'Leopard angelfish fry in Joanne Norton’s experiments only grew their spots when raised on short days of eight hours’ light or less.',
    inGameBehavior: 'Glides slowly in mid-water among the plants, hangs still in small groups, and darts out to snap up food — or a small fish.',
    feedingNote: 'An easy eater: flake and small pellets once or twice a day, with frozen bloodworm, brine shrimp, daphnia or mysis a few times a week. An autofeeder with flake or small pellets suits it.',
    keeperTip: 'Raise a group of six young together and let them pair off — and choose tankmates too big to fit in its mouth.',
  },
  sourceReferences: [
    { id: 'fishbase-pterophyllum-scalare', title: 'FishBase — Pterophyllum scalare (Freshwater angelfish)', url: 'https://www.fishbase.se/summary/Pterophyllum-scalare.html', tier: 1, facts: ['15 cm TL (size field 10.5)', '24–30 °C, pH 6.0–8.0, dH 5–13', 'swamps with dense vegetation', '7 bars in young, 4 in adults', 'IUCN Least Concern (2020)', 'both parents guard'] },
    { id: 'seriouslyfish-pterophyllum-scalare', title: 'Seriously Fish — Pterophyllum scalare', url: 'https://www.seriouslyfish.com/species/pterophyllum-scalare/', tier: 2, facts: ['150 mm SL, 20 cm tall', '100×40×50 cm tank', 'eats small fish', 'eggs on vertical surfaces', 'easy', 'farm-bred'] },
    { id: 'aquariumcoop-angelfish', title: 'Aquarium Co-Op — Angelfish care guide', url: 'https://www.aquariumcoop.com/blogs/aquarium/angelfish-care-guide', tier: 2, facts: ['29 gal for 4 adults', 'avoid nano fish and dwarf shrimp', 'up to 1,000 eggs', '8–12 years', '$5–20'] },
    { id: 'pfk-keeping-breeding-angelfish', title: 'Practical Fishkeeping — Keeping and breeding angelfish', url: 'https://www.practicalfishkeeping.co.uk/features/keeping-and-breeding-angelfish-in-the-aquarium/', tier: 2, facts: ['tank 50 cm tall', 'hatch within 48 h at 27–28 °C', 'free-swimming about day 7', 'baby brine for ~3 weeks'] },
    { id: 'tas-phenotype-library', title: 'The Angelfish Society — Phenotype library (2007)', url: 'https://www.theangelfishsociety.org/phenotype_library_2007/Dark_Intro.html', tier: 2, facts: ['Dark series D > M > Gm > g', 'zebra, stripeless, smokey, veil', 'koi = gold marble blushing', 'gold hides smokey'] },
    { id: 'norton-1982-angelfish-genetics', title: 'Norton (1982) Angelfish genetics, part I. FAMA (reprinted at finarama.com)', url: 'https://www.finarama.com/genetics/1982prt1.htm', tier: 2, facts: ['crossing counts', 'black lace one dose, black two', 'zebra same in one or two doses', 'smokey 1:1'] },
  ],
  confidenceNotes: [
    'The colour genetics rest on Joanne Norton’s crossing experiments in FAMA (hobby magazine, not peer-reviewed), as summarised by TAS; no peer-reviewed paper was found.',
    'Sources disagree on leopard (TAS: chocolate with zebra; Norton: zebra with smokey, and only under short days); the game names no leopard form.',
    'Stripeless is partly dominant in Norton and TAS but called recessive in the Finarama timeline; the game follows Norton.',
    'Aquarium angelfish may carry genes from more than one wild Pterophyllum species.',
  ],
  exceptionRules: [
    { other: 'neon_tetra', verdictFloor: 'high_risk', reason: 'Adult angelfish hunt neon tetras and other fish small enough to swallow.', incidentRisk: 0.12, mitigatedBy: ['cover'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'high_risk', reason: 'Angelfish eat dwarf shrimp.', incidentRisk: 0.15, mitigatedBy: ['cover'] },
  ],
  visualLane: 'fish',
};
