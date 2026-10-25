import type { SpeciesDefinition } from '@/types';

/**
 * Zebra danio — Danio rerio. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#zebra-danio
 * Colour forms are the trade's real ones with published genes: long-fin (dominant, kcnh2a), leopard (recessive,
 * connexin 41.8) and golden (recessive, slc24a5). GloFish, a trademarked genetically modified line, is not in the game.
 */
export const zebraDanio: SpeciesDefinition = {
  id: 'zebra_danio',
  commonName: 'Zebra Danio',
  scientificName: 'Danio rerio',
  category: 'fish',
  group: 'cyprinid',
  genus: 'Danio',
  environment: 'freshwater',
  waterClasses: ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'India and Bangladesh — slow or still floodplain pools, rice paddies and ditches over silt, under overhanging plants',
  isStarter: false,

  // FishBase 3.8 cm SL; Seriously Fish 50 mm SL; Aquarium Co-Op 5–6 cm.
  adultSizeCm: 5,
  // Aquarium Co-Op 20 gal long; Seriously Fish 90×30 cm; LiveAquaria 10 gal. Fast swimmers that need length.
  recommendedMinTankGallons: 20,
  recommendedFootprint: { minLengthIn: 30, minWidthIn: 12 },
  activeSwimmer: true,
  bioload: 0.45,

  // FishBase / Aquarium Co-Op 18–24 °C, Seriously Fish 18–25 °C; it can go unheated. pH 6.0–8.0; 5–20 dGH.
  tempC: { min: 16, max: 28, idealMin: 19, idealMax: 24 },
  pH: { min: 6, max: 8, idealMin: 6.5, idealMax: 7.5 },
  salinitySG: null,
  gh: { min: 5, max: 20 },
  kh: { min: 3, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'daphnia', 'brine_shrimp'],
  feedingStyle: 'surface',
  feedingSpeed: 0.85,
  feedingAggression: 0.5,
  hungerHours: 12,

  activityZone: ['upper', 'middle'],
  temperament: 'peaceful',
  territoriality: 0.1,
  aggression: 0.08,
  finNipper: 0.2,
  hasLongFins: false,
  social: { kind: 'school', minGroup: 6, idealGroup: 10, note: 'A busy shoaling fish: keep eight to ten or more — small groups chase and nip.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males chase each other and defend spawning spots; a bigger shoal spreads it out.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod'],
  preyTags: ['fish_small'],
  maxLikelyPreySizeCm: 0.6,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 0,
  coverPreference: 0.35,
  substrateRules: { preferred: ['sand', 'fine_gravel', 'gravel', 'planted_soil', 'fine_sand'], avoid: [], note: 'Needs open swimming room along the front and a lid; the eggs fall through gravel or marbles out of reach of the adults.' },

  breeding: {
    system: 'egg_scatter_cover',
    difficulty: 0.2,
    maturityDays: 9,
    clutchSize: { min: 30, max: 120 },
    incubationHours: 10,
    fryRearingHours: 40,
    cooldownDays: 3,
    conditions: { needsPartner: true, needsCover: true, minTankGallons: 5 },
    predationWithoutNursery: 0.85,
    nurseryRequired: true,
    maxRaisedPerClutch: 12,
    notes: 'Spawns at dawn, often after a cool water change, scattering non-sticky eggs that fall to the bottom; adults eat them, so breeders use mesh, marbles or fine plants. Lab pairs average about 40 eggs a clutch every three days (hobby clutches of 100 or more). The eggs hatch in a day or so and the fry need infusoria, then baby brine shrimp. Easy.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // Domesticated fish average 3.5 years, oldest 5.5 (FishBase) → ~160 game-days.
  lifecycle: { juvenileDays: 9, adultDays: 11, lifespanDays: 160, sexVisibleAtDays: 8, hatchSizeCm: 0.3 },

  hardiness: 0.95,
  difficulty: 'beginner',
  baseValue: 2,
  rarity: 'common',
  visitorAppeal: 0.5,
  unlock: { requires: [], hint: 'Available from the start.' },
  captiveBredAvailable: true,
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Common in the wild and farmed in vast numbers; also one of science’s most studied animals. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'longfin',
        name: 'Long-fin',
        mode: 'mendelian',
        alleles: [
          { id: 'L', name: 'Long-fin', dominance: 2, frequency: 0.25 },
          { id: 'W', name: 'Short fins', dominance: 1, frequency: 0.75 },
        ],
        note: 'Dominant (lof, over-expression of the kcnh2a potassium-channel gene; Stewart et al. 2021). It was first found by hobbyists. Whether two copies grow longer fins is unverified.',
      },
      {
        id: 'leopard',
        name: 'Leopard',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Stripes', dominance: 2, frequency: 0.75 },
          { id: 'l', name: 'Leopard spots', dominance: 1, frequency: 0.25 },
        ],
        note: 'Recessive: the spotted “leopard danio” is a single recessive gene (Lee et al. 1998), connexin 41.8 (Watanabe et al. 2006) — not a separate species.',
      },
      {
        id: 'golden',
        name: 'Golden',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Full pigment', dominance: 2, frequency: 0.8 },
          { id: 'g', name: 'Golden', dominance: 1, frequency: 0.2 },
        ],
        note: 'Recessive golden (slc24a5; Lamason et al. 2005): fewer, smaller melanosomes, so the stripes wash out to tan. Whether the trade golden carries the lab allele is not established.',
      },
    ],
    phenotypes: [
      { id: 'golden', name: 'Golden', layer: 'base', rarity: 0.2, when: [{ locus: 'golden', allele: 'g', count: 'hom' }], visual: { bodyColor: '#f0e2a8', bodyColor2: '#c9b27a', bellyColor: '#f2ecd8', finColor: '#e8dcb0', finColor2: '#c9b27a', accentColor: '#b0884e', patternContrast: 0.75, iridescence: 0.3 } },
      { id: 'wild', name: 'Wild Type', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'leopard', name: 'Leopard', layer: 'overlay', rarity: 0.15, when: [{ locus: 'leopard', allele: 'l', count: 'hom' }], visual: { pattern: 'spots' } },
      { id: 'longfin', name: 'Long-fin', layer: 'overlay', rarity: 0.1, when: [{ locus: 'longfin', allele: 'L', count: 'any' }], visual: { finType: 'longfin', finLength: 1.6 } },
    ],
    baseVisual: {
      bodyColor: '#e8d27a',
      bodyColor2: '#3b3a7a',
      bellyColor: '#d9d4b8',
      finColor: '#dcd2a6',
      finColor2: '#3b3a7a',
      accentColor: '#2b3f8c',
      eyeColor: '#141414',
      pattern: 'lined',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.45,
      metallic: 0.3,
      translucency: 0.3,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.15,
    notes: 'Colour slots for the danio art: body = the gold-silver stripes between the blue ones; accent = the five blue-black horizontal stripes running on through the tail and anal fin (rows of spots in leopards); belly = the silvery belly; fin = the fins, fin2 = their stripes. Long-fin fish (finLength above 1.25) have long flowing fins and tail.',
  },
  visualMorphs: ['Wild Type', 'Leopard', 'Long-fin', 'Golden'],

  behaviorSet: 'schooling_small',
  behaviorTraits: { cruiseSpeed: 2, burstSpeed: 12, turnRate: 5, hoverTendency: 0.05, schoolingTightness: 0.55, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.15, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['fast_shoal', 'dart_feed', 'surface_pick', 'courtship_chase', 'flash_turn'],

  encyclopedia: {
    summary: 'A tough, quick little fish with five blue-black stripes from gill to tail, always on the move in a busy shoal.',
    nativeHabitat: 'Floodplain pools, rice paddies and ditches of India and Bangladesh, where it moves into flooded fields to spawn in the monsoon.',
    socialStructure: 'Lives in active shoals; males chase each other and defend spawning spots.',
    tankNeeds: 'A long tank of 20 gallons or more with open swimming room, a gentle current and a lid; happy at room temperature or a little warmer (19–24 °C).',
    compatibilityNotes: 'Peaceful with fish of its size, but small groups nip slow, long-finned fish such as bettas and fancy guppies. Too fast for shy, slow feeders.',
    breedingOverview: 'Scatters its eggs at dawn and eats them if it can; marbles or mesh on the bottom save them. One of the easiest egg-layers to breed.',
    conservationNote: 'Least Concern (IUCN 2009). One of the most studied animals in biology.',
    funFact: 'Wild zebra danios have been found in July water anywhere from 24.6 to 38.6 °C — and the leopard danio is just a zebra with one recessive gene.',
    inGameBehavior: 'Races up and down the tank in a shoal, darting to the surface for food and chasing in short bursts.',
    feedingNote: 'Takes almost anything: flake and micro pellets once or twice a day, with frozen bloodworm, daphnia or brine shrimp now and then. An autofeeder with flake suits it.',
    keeperTip: 'Keep eight to ten or more and fit a lid — small groups are what cause fin-nipping, and they jump.',
  },
  sourceReferences: [
    { id: 'fishbase-danio-rerio', title: 'FishBase — Danio rerio (Zebra danio)', url: 'https://www.fishbase.se/summary/Danio-rerio.html', tier: 1, facts: ['3.8 cm SL', 'five stripes onto the tail', 'two pairs of barbels', '18–24 °C, pH 6.0–8.0', 'average 3.5 years, oldest 5.5', 'IUCN Least Concern (2009)'] },
    { id: 'seriouslyfish-danio-rerio', title: 'Seriously Fish — Danio rerio', url: 'https://www.seriouslyfish.com/species/danio-rerio/', tier: 2, facts: ['90×30 cm', '18–25 °C', 'groups of 8–10', 'leopard is D. rerio', 'eggs non-adhesive', 'GloFish excluded'] },
    { id: 'aquariumcoop-zebra-danio', title: 'Aquarium Co-Op — Zebra danio', url: 'https://www.aquariumcoop.com/blogs/aquarium/zebra-danio', tier: 2, facts: ['20 gal long', 'may nip if the school is small', 'avoid bettas', '100+ eggs'] },
    { id: 'stewart-2021-longfin', title: 'Stewart et al. (2021) Long-fin is a dominant gain of function in kcnh2a. Development 148', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8217709', tier: 1, facts: ['long-fin dominant', 'hobbyist origin'] },
    { id: 'watanabe-2006-leopard', title: 'Watanabe et al. (2006) The leopard gene is connexin 41.8. EMBO Reports 7:893', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1559663', tier: 1, facts: ['leopard recessive null allele', 'spots in homozygotes'] },
    { id: 'lamason-2005-golden', title: 'Lamason et al. (2005) SLC24A5 and the golden zebrafish. Science 310:1782', url: 'https://www.bio.davidson.edu/genomics/309redesigned/papers_current/sequencing/genomes/2005ionchannel_pigmentation.pdf', tier: 1, facts: ['golden recessive', 'lighter stripes'] },
    { id: 'lessman-2014-clutch', title: 'Lessman (2014) Zebrafish clutch size and spawning interval', url: 'https://digitalcommons.memphis.edu/facpubs/504', tier: 1, facts: ['39.6 embryos per clutch', 'every 2.86 days'] },
  ],
  confidenceNotes: [
    'Whether the trade’s leopard and golden danios carry the same alleles as the lab lines is likely but not proven.',
    'Albino danios exist but the art cannot yet show the pink eye, so the game leaves the albino out.',
  ],
  exceptionRules: [
    { other: 'tag:long_fins', verdictFloor: 'conditional', reason: 'Zebra danios nip slow, long-finned fish, especially in small groups; a shoal of eight or more mostly keeps to itself.', incidentRisk: 0.04, mitigatedBy: ['tank_size'] },
  ],
  special: { escapeArtist: true },
  visualLane: 'fish',
};
