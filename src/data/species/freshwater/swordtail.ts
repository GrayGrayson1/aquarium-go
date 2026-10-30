import type { SpeciesDefinition } from '@/types';

/**
 * Swordtail (green swordtail) — Xiphophorus hellerii. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#swordtail
 *
 * Only mature males grow the sword (the art draws it). Colour genes are simplified and autosomal, as for the platy:
 * red and the melanin forms (black, tuxedo) are dominant here; albino is recessive and hides the black; wagtail (the
 * platy's comet gene plus Gordon's modifier E, bred in by backcrossing) is treated as one dominant trait; lyretail and
 * hi-fin are dominant (Scotto 2020; the Simpson strain).
 */
export const swordtail: SpeciesDefinition = {
  id: 'swordtail',
  commonName: 'Swordtail',
  scientificName: 'Xiphophorus hellerii',
  category: 'fish',
  group: 'livebearer',
  genus: 'Xiphophorus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Central America from Veracruz, Mexico, to north-western Honduras — fast, rocky streams, springs and rivers from sea level to about 1,500 m',
  isStarter: false,

  // FishBase: males 14 cm, females 16 cm TL at most; Tetra: males about 10 cm without the sword.
  adultSizeCm: 11,
  // FishBase 80 cm minimum; Seriously Fish 120×30 cm (~29 gal); Tetra 100 L or more.
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 1.6,

  // FishBase 22–28 °C, Seriously Fish 16–28 °C, Tetra 20–27 °C; pH 7.0–8.5; 10–30 dGH; Garnelio KH 5–20.
  tempC: { min: 18, max: 28, idealMin: 22, idealMax: 26 },
  pH: { min: 7, max: 8.5, idealMin: 7.2, idealMax: 8.2 },
  salinitySG: null,
  gh: { min: 10, max: 30 },
  kh: { min: 5, max: 20 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'brine_shrimp', 'daphnia', 'mysis', 'vegetable'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.7,
  feedingAggression: 0.45,
  hungerHours: 14,

  activityZone: ['middle', 'upper'],
  temperament: 'peaceful',
  territoriality: 0.2,
  aggression: 0.15,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'harem', minGroup: 3, idealGroup: 4, note: 'One male with three or more females; two males sort out a pecking order and the loser is chased.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males form a dominance order and chase rivals; with too few females they wear them out with courting.' },

  // adults eat fry and can eat small shrimp (Garnelio)
  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'shrimp_dwarf', 'copepod'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'caution',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.45,
  substrateRules: { preferred: ['sand', 'fine_gravel', 'gravel', 'planted_soil', 'fine_sand'], avoid: [], note: 'Open swimming room with a gentle current, plants along the back for the fry, and a tight lid — it is a strong jumper.' },

  breeding: {
    system: 'livebearer',
    difficulty: 0.15,
    maturityDays: 14,
    clutchSize: { min: 20, max: 150 },
    incubationHours: 224,
    fryRearingHours: 48,
    cooldownDays: 2,
    conditions: { needsPartner: true, needsCover: true, minTempC: 22, minTankGallons: 20 },
    predationWithoutNursery: 0.6,
    nurseryRequired: false,
    maxRaisedPerClutch: 10,
    notes: 'Internal fertilisation; females store sperm for months and give birth to 20–150 fry (6–9 mm) about every four weeks. Adults eat fry, so dense plants or a breeding box save them. A lyretail male’s gonopodium is too long to use, so breeders pair lyretail females with normal-finned males. Swordtails cross freely with platies, but the game keeps the two apart.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 3–5 years (Garnelio; Tetra) → ~160 game-days. Maturity 3 months (Wikipedia) to 8–12 (FishBase).
  lifecycle: { juvenileDays: 14, adultDays: 16, lifespanDays: 160, sexVisibleAtDays: 12, hatchSizeCm: 0.8 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 4,
  rarity: 'common',
  visitorAppeal: 0.65,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2018)', note: 'Common in the wild and feral on every continent but Antarctica. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'color',
        name: 'Body colour',
        mode: 'mendelian',
        alleles: [
          { id: 'R', name: 'Red', dominance: 2, frequency: 0.6 },
          { id: 'W', name: 'Wild green', dominance: 1, frequency: 0.4 },
        ],
        note: 'Red is the most popular form; some wild stocks carry red stripes or red males (XGSC), and some trade lines came from crosses with platies. Simplified to one dominant gene.',
      },
      {
        id: 'melanin',
        name: 'Black forms',
        mode: 'mendelian',
        alleles: [
          { id: 'Bk', name: 'Black', dominance: 3, frequency: 0.08 },
          { id: 'Tx', name: 'Tuxedo', dominance: 2, frequency: 0.15 },
          { id: 'W', name: 'No black', dominance: 1, frequency: 0.77 },
        ],
        note: 'Black came from wild platies in the 1930s (“seminigra”); the tuxedo arrived from Sri Lanka in 1956 (Aquarium Glaser). Both simplified to dominant alleles of one gene.',
      },
      {
        id: 'wagtail',
        name: 'Wagtail',
        mode: 'mendelian',
        alleles: [
          { id: 'Wg', name: 'Wagtail', dominance: 2, frequency: 0.15 },
          { id: 'W', name: 'Plain fins', dominance: 1, frequency: 0.85 },
        ],
        note: 'The platy’s comet gene plus the modifier E, moved into swordtails by backcrossing (Gordon 1946); the game treats the pair as one dominant trait.',
      },
      {
        id: 'albino',
        name: 'Albino',
        mode: 'mendelian',
        alleles: [
          { id: 'A', name: 'Pigmented', dominance: 2, frequency: 0.9 },
          { id: 'a', name: 'Albino', dominance: 1, frequency: 0.1 },
        ],
        note: 'Recessive; the stock-centre albino line came from an albino platy crossed into swordtails (XGSC). No melanin, so no black forms show.',
      },
      {
        id: 'lyre',
        name: 'Lyretail',
        mode: 'mendelian',
        alleles: [
          { id: 'Ly', name: 'Lyretail', dominance: 2, frequency: 0.12 },
          { id: 'W', name: 'Normal fins', dominance: 1, frequency: 0.88 },
        ],
        note: 'Dominant over normal fins in the first generation (Scotto 2020): every fin but the pelvics grows long.',
      },
      {
        id: 'hifin',
        name: 'Hi-fin',
        mode: 'mendelian',
        alleles: [
          { id: 'H', name: 'Hi-fin', dominance: 2, frequency: 0.12 },
          { id: 'W', name: 'Normal dorsal', dominance: 1, frequency: 0.88 },
        ],
        note: 'The Simpson strain’s tall dorsal, dominant (Scotto 2020); two copies are reportedly lethal, which the game does not model.',
      },
    ],
    phenotypes: [
      { id: 'albino', name: 'Albino', layer: 'base', rarity: 0.25, when: [{ locus: 'albino', allele: 'a', count: 'hom' }, { locus: 'color', allele: 'R', count: 'none' }], visual: { eyeColor: '#c0282d', bodyColor: '#f3d9cf', bodyColor2: '#e8c8b8', bellyColor: '#f8ece4', finColor: '#f0d8c8', finColor2: '#f8c8a0', accentColor: '#e8b0a0' } },
      { id: 'black', name: 'Black', layer: 'base', rarity: 0.2, when: [{ locus: 'melanin', allele: 'Bk', count: 'any' }, { locus: 'albino', allele: 'A', count: 'any' }], visual: { bodyColor: '#141414', bodyColor2: '#0e0e0e', bellyColor: '#2a2a2a', accentColor: '#141414' }, note: 'Near-black body; the fins and sword keep some colour.' },
      { id: 'red', name: 'Red', layer: 'base', rarity: 0, when: [{ locus: 'color', allele: 'R', count: 'any' }], visual: { bodyColor: '#cc1f1a', bodyColor2: '#a8121a', bellyColor: '#e85a4a', finColor: '#d8402a', finColor2: '#f07a3a', accentColor: '#a8121a' } },
      { id: 'green', name: 'Green', layer: 'base', rarity: 0, when: [{ locus: 'color', allele: 'W', count: 'hom' }], visual: {} },
      { id: 'fallback', name: 'Green', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'tuxedo', name: 'Tuxedo', layer: 'overlay', rarity: 0.15, when: [{ locus: 'melanin', allele: 'Tx', count: 'any' }, { locus: 'melanin', allele: 'Bk', count: 'none' }, { locus: 'albino', allele: 'A', count: 'any' }], visual: { bodyMark: 'tuxedo' } },
      { id: 'wagtail', name: 'Wagtail', layer: 'overlay', rarity: 0.15, when: [{ locus: 'wagtail', allele: 'Wg', count: 'any' }, { locus: 'albino', allele: 'A', count: 'any' }], visual: { finColor: '#111111', finColor2: '#1a1a1a' } },
      { id: 'albino_red', name: 'Albino', layer: 'overlay', rarity: 0.25, when: [{ locus: 'albino', allele: 'a', count: 'hom' }, { locus: 'color', allele: 'R', count: 'any' }], visual: { eyeColor: '#c0282d', bellyColor: '#f0a090' } },
      { id: 'hifin_lyre', name: 'Hi-fin Lyretail', layer: 'overlay', rarity: 0.25, when: [{ locus: 'hifin', allele: 'H', count: 'any' }, { locus: 'lyre', allele: 'Ly', count: 'any' }], visual: { finType: 'hifin_lyretail' } },
      { id: 'lyretail', name: 'Lyretail', layer: 'overlay', rarity: 0.15, when: [{ locus: 'lyre', allele: 'Ly', count: 'any' }, { locus: 'hifin', allele: 'H', count: 'none' }], visual: { finType: 'lyretail' } },
      { id: 'hifin', name: 'Hi-fin', layer: 'overlay', rarity: 0.15, when: [{ locus: 'hifin', allele: 'H', count: 'any' }, { locus: 'lyre', allele: 'Ly', count: 'none' }], visual: { finType: 'hifin' } },
    ],
    baseVisual: {
      bodyColor: '#6f8e5a',
      bodyColor2: '#4f6b45',
      bellyColor: '#e6e3c8',
      finColor: '#8a9a70',
      finColor2: '#f2b233',
      accentColor: '#a2452e',
      eyeColor: '#2a2418',
      pattern: 'solid',
      patternScale: 1,
      patternContrast: 0.6,
      patternSeed: 0,
      iridescence: 0.25,
      metallic: 0.1,
      translucency: 0.3,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the swordtail art (the platy plan’s longer build): body/body2 = the olive-green flank and darker back; belly = the pale belly; accent = the red-brown zigzag line along the flank; fin = the fins, fin2 = their edges and the sword’s bright upper edge (yellow to orange; the art adds its black lower edge). bodyMark tuxedo = the black rear flank; finType hifin, lyretail or hifin_lyretail.',
  },
  visualMorphs: ['Red', 'Green', 'Black', 'Tuxedo', 'Wagtail', 'Albino', 'Lyretail', 'Hi-fin'],

  behaviorSet: 'livebearer',
  behaviorTraits: { cruiseSpeed: 1.3, burstSpeed: 9, turnRate: 3.4, hoverTendency: 0.15, schoolingTightness: 0.25, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.1, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['male_display', 'courtship_chase', 'rival_chase', 'give_birth', 'fry_hide', 'jump'],

  encyclopedia: {
    summary: 'A lively livebearer whose males carry a long “sword” on the lower edge of the tail — red, green, black or tuxedo.',
    nativeHabitat: 'Fast, rocky streams, springs and rivers of Mexico and Central America; adults like the current, the young stay at the quiet edges.',
    socialStructure: 'Males form a pecking order and court the females constantly.',
    tankNeeds: 'A long tank of 30 gallons or more with hard, alkaline water, a gentle current, plants and a tight lid.',
    compatibilityNotes: 'A good community fish with others its size; keep one male with three or more females. Adults eat fry and can catch small shrimp; too boisterous for tiny or delicate fish.',
    breedingOverview: 'Gives birth to 20–150 fry about once a month; females store sperm for months.',
    conservationNote: 'Least Concern (IUCN 2018).',
    funFact: 'Darwin used it to explain sexual selection: the sword slows the male down and draws predators, but females prefer males with long ones.',
    inGameBehavior: 'Swims briskly in the middle and upper water; males flash their swords at females and chase rival males.',
    feedingNote: 'An easy omnivore: flake or small pellets once or twice a day with some vegetable food and frozen treats. An autofeeder with flake suits it.',
    keeperTip: 'Fit a tight lid — swordtails are strong jumpers.',
  },
  sourceReferences: [
    { id: 'fishbase-xiphophorus-hellerii', title: 'FishBase — Xiphophorus hellerii (Green swordtail)', url: 'https://www.fishbase.se/summary/Xiphophorus-hellerii.html', tier: 1, facts: ['males 14 cm, females 16 cm TL', '22–28 °C, pH 7.0–8.0', 'gestation 24–30 days, 20–200 young', 'one male to several females', 'IUCN Least Concern (2018)'] },
    { id: 'seriouslyfish-xiphophorus-hellerii', title: 'Seriously Fish — Xiphophorus hellerii', url: 'https://www.seriouslyfish.com/species/xiphophorus-hellerii/', tier: 2, facts: ['120×30 cm', 'fast rocky streams', 'sword is the lower caudal lobe, males only', 'males form hierarchies'] },
    { id: 'tetra-swordtail', title: 'Tetra — Swordtail', url: 'https://blog.tetra.net/en-en/swordtail-xiphophorus-helleri/', tier: 2, facts: ['males about 10 cm without the sword', 'strong jumpers', 'up to 5 years'] },
    { id: 'txst-2021-sword', title: 'Texas State University (2021) — How the swordtail grows its sword (kcnh8)', url: 'https://news.txst.edu/research-and-innovation/2021/swordtail-fish-genetics.html', tier: 1, facts: ['sword grows at puberty', 'females prefer long swords', 'Darwin'] },
    { id: 'gordon-1946-comet', title: 'Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88', url: 'https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt', tier: 1, facts: ['wagtail = comet + E, backcrossed into swordtails'] },
    { id: 'glaser-lyra-swordtail', title: 'Aquarium Glaser — Xiphophorus hellerii Wien Lyra', url: 'https://www.aquariumglaser.de/en/fish-archives/xiphophorus_hellerii_wien_lyra_en', tier: 2, facts: ['lyretail males’ gonopodium too long to use', 'part of each brood lyretail'] },
  ],
  confidenceNotes: [
    'The colour genes are simplified: in wild stocks sword colour and some red patterns are sex-linked (XGSC).',
    'Maturity is given as about 3 months (Wikipedia) and 8–12 months (FishBase); the game uses about 4 months.',
    'Female-to-male sex change is reported in some conditions (FishBase); the game does not model it.',
    'Swordtails and platies hybridise freely; the game does not cross species.',
  ],
  exceptionRules: [
    { other: 'tag:shrimp_dwarf', verdictFloor: 'conditional', reason: 'Adult swordtails eat shrimplets and can catch small adult shrimp.', incidentRisk: 0.04, mitigatedBy: ['cover'] },
  ],
  special: { escapeArtist: true },
  visualLane: 'fish',
};
