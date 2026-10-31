import type { SpeciesDefinition } from '@/types';

/**
 * Koi — Cyprinus rubrofuscus. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#koi
 * The variety model (design §8): the documented genes are real (the scale gene S, metallic D, the Bekko black, and
 * butterfly fins, Lf); the red pattern, the Utsuri/Showa black, the ground colours, Tancho and Ginrin are line-bred in
 * truth and modelled as stand-in loci, labelled so. Named varieties come out as phenotypes and strains. Left out: leather
 * and linear scales (the N gene's lethal NN), ghost koi (a cross with wild carp) and Kumonryu (changes with the seasons).
 * Colour slots: body = the ground, accent = the red (hi), body2 = the black (sumi); on the black-ground varieties (Showa, Utsuri) body is the black and body2 or accent the white.
 */
export const koi: SpeciesDefinition = {
  id: 'koi',
  commonName: 'Koi',
  scientificName: 'Cyprinus rubrofuscus',
  category: 'fish',
  group: 'carp',
  genus: 'Cyprinus',
  environment: 'freshwater',
  waterClasses: ['freshwater_cool'],
  nativeRegion: 'Domestic: bred in Niigata, Japan, from the 1820s from Amur carp, whose wild range runs from the Amur to the Red River in East Asia',
  isStarter: false,

  // 60–90 cm typical; jumbo show fish pass 100 cm (PFK); FishBase's carp reaches 129 cm TL.
  adultSizeCm: 70,
  // about 250 gal per adult (PetMD, California Fish Vet) × the smallest group of 3; long enough to turn a 70 cm fish
  recommendedMinTankGallons: 800,
  recommendedFootprint: { minLengthIn: 144, minWidthIn: 36 },
  activeSwimmer: true,
  // derived: koi make a great deal of waste (PetMD); the comet goldfish, 25 cm, is 8
  bioload: 20,

  // carp 3–35 °C (FishBase); 15–25 °C best, immunity weak below 10 °C (Wikipedia); 18–24 °C (PetMD)
  tempC: { min: 4, max: 32, idealMin: 15, idealMax: 24 },
  pH: { min: 6.5, max: 8.8, idealMin: 7, idealMax: 8 },
  salinitySG: null,
  gh: { min: 5, max: 20 },
  kh: { min: 4, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['pellet_floating', 'pellet_large', 'pellet_sinking', 'pellet_small', 'vegetable', 'earthworm', 'bloodworm', 'daphnia', 'algae_wafer'],
  feedingStyle: 'scavenger',
  feedingSpeed: 0.85,
  feedingAggression: 0.75,
  hungerHours: 20,

  activityZone: ['all'],
  temperament: 'peaceful',
  territoriality: 0.05,
  aggression: 0.1,
  finNipper: 0.1,
  hasLongFins: false,
  social: { kind: 'group', minGroup: 2, idealGroup: 3, note: 'Sociable: vets advise five or more, but that takes a pond; three adults are the most an 800- to 1,000-gallon tank holds.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Peaceful. In spring several males chase a ripe female hard, and she may jump or be bruised.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'snail', 'snail_small', 'worm', 'copepod', 'crustacean'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 6,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'unsafe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 0,
  coverPreference: 0.15,
  substrateRules: { preferred: ['bare', 'large_pebbles', 'sand'], avoid: ['fine_gravel', 'gravel'], note: 'Sifts the bottom all day and digs feeding pits; gravel it can mouth is a choking risk, and plants are uprooted or eaten.' },

  breeding: {
    system: 'egg_scatter_cover',
    difficulty: 0.6,
    // older than 3 years (Kodama); carp 3–5 years (ADW) → the game's cap
    maturityDays: 25,
    // about 300,000 from a 45 cm carp (ADW)
    clutchSize: { min: 50000, max: 300000 },
    // about 4 days (FishBase); 3 days at 25 °C (Kodama, ADW)
    incubationHours: 32,
    fryRearingHours: 140,
    cooldownDays: 30,
    conditions: { needsPartner: true, needsCover: true, minTempC: 18, needsConditioningFood: ['earthworm', 'pellet_large', 'daphnia'], minTankGallons: 500 },
    predationWithoutNursery: 0.95,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'In late spring, warming water after a cold winter starts the spawning chase: two or three males drive a female through spawning ropes or plants, and she scatters sticky eggs by the hundred thousand. The parents eat them, so the ropes go to a nursery. The eggs hatch in three or four days. Breeders cull hard: few fry show their parents’ colours.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // 25–50+ years (PetMD) → the game's cap; sexing unreliable until about 20–30 cm
  lifecycle: { juvenileDays: 25, adultDays: 30, lifespanDays: 500, sexVisibleAtDays: 22, hatchSizeCm: 0.5 },

  hardiness: 0.85,
  difficulty: 'intermediate',
  // a game value between domestic juveniles ($10–25, That Pet Place, Pond Informer) and large domestic koi ($350–2,500);
  // Japanese show koi sell for thousands at auction (Kodama), which the strains' tiers carry
  baseValue: 200,
  rarity: 'common',
  visitorAppeal: 0.95,
  unlock: { requires: ['fw_coldwater', 'fw_large'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Every koi is farm-bred; Japan, Israel, the US and Southeast Asia all breed them.',
  conservation: { status: 'Domestic (the wild Amur carp, C. rubrofuscus: Least Concern, IUCN 2020)', note: 'Released koi revert to wild colour within a few generations and damage habitats as carp do: never release one. Koi herpesvirus has no cure, so quarantine new fish for four to six weeks.' },

  genetics: {
    loci: [
      {
        id: 'scale',
        name: 'Scales',
        mode: 'mendelian',
        alleles: [
          { id: 'S', name: 'Fully scaled', dominance: 2, frequency: 0.8 },
          { id: 's', name: 'Doitsu (mirror)', dominance: 1, frequency: 0.2 },
        ],
        note: 'Real: the carp’s scale gene S (fgfr1a1); ss gives the doitsu (mirror) koi with a row of big scales by the dorsal fin (Casas et al. 2013). The second scale gene, N, is left out: NN dies as an embryo, and leather koi have fin and tooth defects.',
      },
      {
        id: 'metal',
        name: 'Metallic',
        mode: 'mendelian',
        alleles: [
          { id: 'D', name: 'Metallic', dominance: 2, frequency: 0.15 },
          { id: 'd', name: 'Non-metallic', dominance: 1, frequency: 0.85 },
        ],
        note: 'Real: one dominant gene, D (Katasonov 1973; Gomelsky et al. 2023).',
      },
      {
        id: 'bekko',
        name: 'Bekko black',
        mode: 'mendelian',
        alleles: [
          { id: 'Bk', name: 'Bekko sumi', dominance: 2, frequency: 0.15 },
          { id: 'bk', name: 'No sumi', dominance: 1, frequency: 0.85 },
        ],
        note: 'The Sanke black: probably one gene with a dominant black allele (Bar et al. 2013, citing earlier crosses). Shows only on a white ground: Taisho Sanke, Shiro Bekko and Aka Sanke.',
      },
      {
        id: 'hi',
        name: 'Red (hi)',
        mode: 'codominant',
        alleles: [
          { id: 'h', name: 'No red', dominance: 1, frequency: 0.4 },
          { id: 'H', name: 'Red', dominance: 1, frequency: 0.6 },
        ],
        note: 'A stand-in: the red pattern is set by many genes (Dasgupta 2003; David 2004). None, one or two copies give no red, a red pattern on white, or heavy red.',
      },
      {
        id: 'ground',
        name: 'Ground colour',
        mode: 'mendelian',
        alleles: [
          { id: 'U', name: 'Utsuri black', dominance: 6, frequency: 0.15 },
          { id: 'C', name: 'Chagoi brown', dominance: 5, frequency: 0.1 },
          { id: 'G', name: 'Sora grey', dominance: 4, frequency: 0.05 },
          { id: 'W', name: 'White', dominance: 3, frequency: 0.5 },
          { id: 'Y', name: 'Ki yellow', dominance: 2, frequency: 0.12 },
          { id: 'A', name: 'Asagi blue', dominance: 1, frequency: 0.08 },
        ],
        note: 'A stand-in for the line-bred ground colours: black patterns over red and white, brown and grey (wild melanin) over white, blue recessive. Two known crosses get their own looks: Asagi × white is Goshiki, Chagoi × yellow is Karashi.',
      },
      {
        id: 'tancho',
        name: 'Tancho',
        mode: 'mendelian',
        alleles: [
          { id: 'T', name: 'Normal red', dominance: 2, frequency: 0.88 },
          { id: 't', name: 'Tancho', dominance: 1, frequency: 0.12 },
        ],
        note: 'A stand-in: Tancho (red only as a spot on the head) is line-bred and its inheritance undocumented; modelled recessive.',
      },
      {
        id: 'ginrin',
        name: 'Ginrin',
        mode: 'mendelian',
        alleles: [
          { id: 'R', name: 'Plain scales', dominance: 2, frequency: 0.8 },
          { id: 'r', name: 'Ginrin', dominance: 1, frequency: 0.2 },
        ],
        note: 'A stand-in: sparkling Ginrin scales are line-bred and their inheritance undocumented; modelled recessive.',
      },
      {
        id: 'fin',
        name: 'Fins',
        mode: 'mendelian',
        alleles: [
          // a rare form (the owner, ADR-0053 round 2): about 1 in 80 of the shop's koi
          { id: 'Lf', name: 'Butterfly (long fins)', dominance: 2, frequency: 0.006 },
          { id: 'lf', name: 'Standard fins', dominance: 1, frequency: 0.994 },
        ],
        note: 'Real: long fins are one dominant gene, Lf (Gomelsky, Schneider & Alsaqufi 2011: long × short gave 1:1, long × long 3:1). Butterfly koi came from crossing koi with Indonesian long-finned carp from 1982 (Saitama Prefecture).',
      },
    ],
    phenotypes: [
      // ── metallic (Ogon) koi: one solid metallic colour ──
      { id: 'platinum_ogon', name: 'Platinum Ogon', layer: 'base', rarity: 0.15, when: [{ locus: 'metal', allele: 'D', count: 'any' }, { locus: 'ground', allele: 'W', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'A', count: 'none' }, { locus: 'hi', allele: 'H', count: 'none' }], visual: { bodyColor: '#e9ebee', bodyColor2: '#e9ebee', bellyColor: '#f2f3f5', finColor: '#eef0f2', finColor2: '#f4f5f6', accentColor: '#e9ebee', pattern: 'solid', metallic: 0.95, iridescence: 0.3 } },
      { id: 'yamabuki_ogon', name: 'Yamabuki Ogon', layer: 'base', rarity: 0.15, when: [{ locus: 'metal', allele: 'D', count: 'any' }, { locus: 'ground', allele: 'Y', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'W', count: 'none' }], visual: { bodyColor: '#f0bd2a', bodyColor2: '#f0bd2a', bellyColor: '#f4cc55', finColor: '#f4cc55', finColor2: '#f8dc80', accentColor: '#f0bd2a', pattern: 'solid', metallic: 0.9, iridescence: 0.3 } },
      { id: 'hariwake', name: 'Hariwake', layer: 'base', rarity: 0.2, when: [{ locus: 'metal', allele: 'D', count: 'any' }, { locus: 'ground', allele: 'W', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'A', count: 'none' }, { locus: 'hi', allele: 'H', count: 'het' }], visual: { bodyColor: '#e9ebee', bodyColor2: '#e9ebee', bellyColor: '#f2f3f5', finColor: '#eef0f2', finColor2: '#f4f5f6', accentColor: '#f0a028', pattern: 'koi', metallic: 0.9 } },
      { id: 'orenji_ogon', name: 'Orenji Ogon', layer: 'base', rarity: 0.2, when: [{ locus: 'metal', allele: 'D', count: 'any' }, { locus: 'ground', allele: 'W', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'A', count: 'none' }, { locus: 'hi', allele: 'H', count: 'hom' }], visual: { bodyColor: '#ef7a1e', bodyColor2: '#ef7a1e', bellyColor: '#f39a4a', finColor: '#f39a4a', finColor2: '#f6b070', accentColor: '#ef7a1e', pattern: 'solid', metallic: 0.9 } },
      // ── the two known crosses ──
      { id: 'goshiki', name: 'Goshiki', layer: 'base', rarity: 0.35, when: [{ locus: 'ground', allele: 'A', count: 'het' }, { locus: 'ground', allele: 'W', count: 'het' }], visual: { bodyColor: '#5e6670', bodyColor2: '#2c333b', bellyColor: '#8a929a', finColor: '#cfd4d8', finColor2: '#e8eaec', accentColor: '#b8321e', pattern: 'koi' }, note: 'Asagi × Kohaku (Kodama: first bred in 1918): red on a dark, netted ground.' },
      { id: 'karashi', name: 'Karashi', layer: 'base', rarity: 0.3, when: [{ locus: 'ground', allele: 'C', count: 'het' }, { locus: 'ground', allele: 'Y', count: 'het' }, { locus: 'metal', allele: 'D', count: 'none' }], visual: { bodyColor: '#d4ad44', bodyColor2: '#d4ad44', bellyColor: '#e2c46a', finColor: '#d0a848', finColor2: '#8a4a2a', accentColor: '#b08a30', pattern: 'reticulated', patternContrast: 0.7 }, note: 'Kigoi × Chagoi (POND Trade): matte mustard yellow with a fine scale net.' },
      // ── black-ground (Utsuri) koi ──
      { id: 'hi_utsuri', name: 'Hi Utsuri', layer: 'base', rarity: 0.3, when: [{ locus: 'ground', allele: 'U', count: 'any' }, { locus: 'hi', allele: 'H', count: 'hom' }], visual: { bodyColor: '#141414', bodyColor2: '#141414', bellyColor: '#2a2422', finColor: '#2a2420', finColor2: '#d8481c', accentColor: '#d8481c', pattern: 'koi', bodyMark: 'utsuri' } },
      { id: 'showa', name: 'Showa', layer: 'base', rarity: 0.25, when: [{ locus: 'ground', allele: 'U', count: 'any' }, { locus: 'hi', allele: 'H', count: 'het' }], visual: { bodyColor: '#141414', bodyColor2: '#f6f3ec', bellyColor: '#2a2624', finColor: '#f2eee6', finColor2: '#141414', accentColor: '#d4321c', pattern: 'koi', bodyMark: 'showa' }, note: 'Black ground with red and white patches; the black wraps the head and belly.' },
      { id: 'shiro_utsuri', name: 'Shiro Utsuri', layer: 'base', rarity: 0.2, when: [{ locus: 'ground', allele: 'U', count: 'any' }, { locus: 'hi', allele: 'H', count: 'none' }], visual: { bodyColor: '#141414', bodyColor2: '#141414', bellyColor: '#2a2826', finColor: '#e8e6e0', finColor2: '#141414', accentColor: '#f4f2ec', pattern: 'koi', bodyMark: 'utsuri' } },
      // ── one-colour (muji) and netted koi ──
      { id: 'chagoi', name: 'Chagoi', layer: 'base', rarity: 0.1, when: [{ locus: 'ground', allele: 'C', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }], visual: { bodyColor: '#8b6a44', bodyColor2: '#8b6a44', bellyColor: '#a88a62', finColor: '#7d5e3c', finColor2: '#6a4e30', accentColor: '#5a4128', pattern: 'reticulated', patternContrast: 0.75 } },
      { id: 'soragoi', name: 'Soragoi', layer: 'base', rarity: 0.2, when: [{ locus: 'ground', allele: 'G', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }], visual: { bodyColor: '#8f989f', bodyColor2: '#8f989f', bellyColor: '#aab2b8', finColor: '#8a9298', finColor2: '#7a8288', accentColor: '#5e676e', pattern: 'reticulated', patternContrast: 0.75 } },
      { id: 'asagi', name: 'Asagi', layer: 'base', rarity: 0.2, when: [{ locus: 'ground', allele: 'A', count: 'hom' }], visual: { bodyColor: '#7d93a8', bodyColor2: '#c9d6df', bellyColor: '#d65a2a', finColor: '#c8d0d6', finColor2: '#d65a2a', accentColor: '#405568', pattern: 'reticulated', patternContrast: 0.85 }, note: 'A pale blue head, a netted blue-grey back, and red-orange cheeks, belly and pectoral bases.' },
      { id: 'kigoi', name: 'Kigoi', layer: 'base', rarity: 0.25, when: [{ locus: 'ground', allele: 'Y', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'W', count: 'none' }, { locus: 'metal', allele: 'D', count: 'none' }], visual: { bodyColor: '#e8c43c', bodyColor2: '#e8c43c', bellyColor: '#f0d468', finColor: '#ecd060', finColor2: '#f2dc84', accentColor: '#e8c43c', pattern: 'solid' } },
      // ── white-ground koi with the Bekko black (sumi): small black patches on the back, never on the head ──
      { id: 'aka_sanke', name: 'Aka Sanke', layer: 'base', rarity: 0.3, when: [{ locus: 'ground', allele: 'W', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'A', count: 'none' }, { locus: 'bekko', allele: 'Bk', count: 'any' }, { locus: 'metal', allele: 'D', count: 'none' }, { locus: 'hi', allele: 'H', count: 'hom' }], visual: { bodyColor: '#cc3a1a', bodyColor2: '#151515', bellyColor: '#e06a44', finColor: '#e07050', finColor2: '#151515', accentColor: '#cc3a1a', pattern: 'koi' } },
      { id: 'taisho_sanke', name: 'Taisho Sanke', layer: 'base', rarity: 0.2, when: [{ locus: 'ground', allele: 'W', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'A', count: 'none' }, { locus: 'bekko', allele: 'Bk', count: 'any' }, { locus: 'metal', allele: 'D', count: 'none' }, { locus: 'hi', allele: 'H', count: 'het' }], visual: { bodyColor: '#f6f3ec', bodyColor2: '#151515', bellyColor: '#faf8f4', finColor: '#f6f3ec', finColor2: '#151515', accentColor: '#d4321c', pattern: 'koi' }, note: 'Red and black on white (first shown in the Taisho era, Kodama).' },
      { id: 'shiro_bekko', name: 'Shiro Bekko', layer: 'base', rarity: 0.2, when: [{ locus: 'ground', allele: 'W', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'C', count: 'none' }, { locus: 'ground', allele: 'G', count: 'none' }, { locus: 'ground', allele: 'A', count: 'none' }, { locus: 'bekko', allele: 'Bk', count: 'any' }, { locus: 'metal', allele: 'D', count: 'none' }, { locus: 'hi', allele: 'H', count: 'none' }], visual: { bodyColor: '#f4f1eb', bodyColor2: '#151515', bellyColor: '#f8f6f2', finColor: '#f4f1eb', finColor2: '#151515', accentColor: '#f4f1eb', pattern: 'koi' } },
      // ── white-ground koi: the red decides ──
      { id: 'aka', name: 'Aka Muji', layer: 'base', rarity: 0.2, when: [{ locus: 'ground', allele: 'W', count: 'any' }, { locus: 'hi', allele: 'H', count: 'hom' }], visual: { bodyColor: '#cc3a1a', bodyColor2: '#f4f1eb', bellyColor: '#e06a44', finColor: '#e07050', finColor2: '#f0e0d8', accentColor: '#cc3a1a', pattern: 'solid' } },
      { id: 'kohaku', name: 'Kohaku', layer: 'base', rarity: 0.1, when: [{ locus: 'ground', allele: 'W', count: 'any' }, { locus: 'hi', allele: 'H', count: 'het' }], visual: { bodyColor: '#f6f3ec', bodyColor2: '#f6f3ec', bellyColor: '#faf8f4', finColor: '#f6f3ec', finColor2: '#ffffff', accentColor: '#d4321c', pattern: 'koi' } },
      { id: 'shiro_muji', name: 'Shiro Muji', layer: 'base', rarity: 0.05, when: [], visual: { bodyColor: '#f4f1eb', bodyColor2: '#f4f1eb', bellyColor: '#f8f6f2', finColor: '#f4f1eb', finColor2: '#ffffff', accentColor: '#f4f1eb', pattern: 'solid' } },
      // ── overlays ──
      { id: 'tancho', name: 'Tancho', layer: 'overlay', rarity: 0.45, when: [{ locus: 'tancho', allele: 't', count: 'hom' }, { locus: 'ground', allele: 'W', count: 'hom' }, { locus: 'hi', allele: 'H', count: 'het' }, { locus: 'metal', allele: 'D', count: 'none' }], visual: { bodyMark: 'tancho' }, note: 'All the red gone but one round spot on the top of the head.' },
      { id: 'doitsu', name: 'Doitsu', layer: 'overlay', rarity: 0.1, when: [{ locus: 'scale', allele: 's', count: 'hom' }], visual: { scaleType: 'doitsu' } },
      { id: 'ginrin', name: 'Ginrin', layer: 'overlay', rarity: 0.2, when: [{ locus: 'ginrin', allele: 'r', count: 'hom' }], visual: { iridescence: 0.65, metallic: 0.4 } },
      { id: 'metallic_u', name: 'Metallic', layer: 'overlay', rarity: 0.1, when: [{ locus: 'metal', allele: 'D', count: 'any' }, { locus: 'ground', allele: 'U', count: 'any' }], visual: { metallic: 0.85 } },
      { id: 'metallic', name: 'Metallic', layer: 'overlay', rarity: 0.1, when: [{ locus: 'metal', allele: 'D', count: 'any' }, { locus: 'ground', allele: 'U', count: 'none' }, { locus: 'ground', allele: 'W', count: 'none' }, { locus: 'ground', allele: 'Y', count: 'none' }], visual: { metallic: 0.85 } },
      { id: 'butterfly', name: 'Butterfly', layer: 'overlay', rarity: 0.15, when: [{ locus: 'fin', allele: 'Lf', count: 'any' }], visual: { finType: 'butterfly', finLength: 1.9 }, note: 'Fins about twice as long (Saitama Prefecture); not judged by the Japanese koi association.' },
    ],
    strains: [
      { id: 'tancho_kohaku', name: 'Tancho Kohaku', requires: ['kohaku', 'tancho'], tier: 'rare', note: 'Pure white with one round red spot on the head, like the crane of its name.' },
      { id: 'tancho_sanke', name: 'Tancho Sanke', requires: ['taisho_sanke', 'tancho'], tier: 'very_rare', note: 'A Sanke whose red is only the spot on the head.' },
      { id: 'shusui', name: 'Shusui', requires: ['asagi', 'doitsu'], tier: 'rare', note: 'The doitsu Asagi: a line of big blue scales down the back on smooth skin.' },
      { id: 'kin_showa', name: 'Kin Showa', requires: ['showa', 'metallic_u'], tier: 'rare', note: 'A metallic Showa.' },
    ],
    baseVisual: {
      bodyColor: '#5b5a34',
      bodyColor2: '#8c7a42',
      bellyColor: '#d8cfa4',
      finColor: '#6a5f3c',
      finColor2: '#a0503a',
      accentColor: '#d4321c',
      eyeColor: '#c9a23a',
      pattern: 'koi',
      patternScale: 1,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.15,
      metallic: 0.1,
      translucency: 0.1,
      finType: 'koi',
      finLength: 1,
      bodyDepth: 0.95,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Every koi matches a variety rule; the base visual (an olive wild carp) is only a fallback. Colour slots: body = the ground, accent = the red (hi), body2 = the black (sumi), and on the black-ground Showa and Utsuri body = the black, body2 = the white; bodyMark marks those and Tancho’s head spot; scaleType "doitsu" draws the mirror scales.',
  },
  visualMorphs: ['Kohaku', 'Taisho Sanke', 'Showa', 'Tancho Kohaku', 'Shiro Utsuri', 'Hi Utsuri', 'Shiro Bekko', 'Asagi', 'Doitsu', 'Goshiki', 'Platinum Ogon', 'Yamabuki Ogon', 'Chagoi', 'Soragoi', 'Karashi', 'Butterfly'],

  behaviorSet: 'goldfish',
  behaviorTraits: { cruiseSpeed: 0.5, burstSpeed: 5, turnRate: 1.5, hoverTendency: 0.25, schoolingTightness: 0.3, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.9, nocturnal: 0 },
  specialBehaviors: ['substrate_sift', 'beg_at_glass', 'follow_finger', 'hand_feed', 'graze_plants', 'surface_skim', 'spawning_chase', 'jump_escape'],

  encyclopedia: {
    summary: 'The living jewel of the pond: a big, long-lived carp bred in Japan for two centuries into red, white, black, blue and gold varieties.',
    nativeHabitat: 'A domestic fish: the wild Amur carp it comes from lives in the rivers of East Asia, from the Amur to the Red River.',
    socialStructure: 'Peaceful and sociable; koi cruise together in loose groups.',
    tankNeeds: 'A twelve-foot tank of 800 gallons or more for three adults, cool, clean water (15–24 °C), very strong filtration for their heavy waste, a bare or pebble floor and a lid.',
    compatibilityNotes: 'Cool-water only: never with tropical fish. Koi share well with comet goldfish, but eat small fish, shrimp and snails and outcompete slow fancy goldfish.',
    breedingOverview: 'Once a year, in spring, males chase a female through spawning ropes and she scatters huge numbers of sticky eggs, which the parents eat. Breeders keep only the few young that show good colour.',
    conservationNote: 'Domestic. Never release koi: they revert to wild carp and damage rivers and lakes.',
    funFact: 'Koi are judged from above, as they are seen in a pond, and the best Japanese show koi have sold at auction for over a million US dollars.',
    inGameBehavior: 'Cruises the tank in a slow group, sifts the bottom, and crowds the front glass to beg when you come near.',
    feedingNote: 'Koi sticks or pellets once or twice a day, more in warm water and less in cold, with greens now and then.',
    keeperTip: 'Plan the tank for the adult: a 10 cm koi grows to 60 cm or more and can live for decades.',
  },
  sourceReferences: [
    { id: 'cof-cyprinus-rubrofuscus', title: 'Catalog of Fishes — Cyprinus rubrofuscus', url: 'https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=28864', tier: 1, facts: ['koi’s wild ancestor treated as C. rubrofuscus Lacepède 1803'] },
    { id: 'fishbase-cyprinus-rubrofuscus', title: 'FishBase — Cyprinus rubrofuscus', url: 'https://www.fishbase.se/summary/Cyprinus-rubrofuscus.html', tier: 1, facts: ['Amur to Red River drainages', 'IUCN Least Concern (2020)'] },
    { id: 'fishbase-cyprinus-carpio', title: 'FishBase — Cyprinus carpio (Common carp)', url: 'https://www.fishbase.se/summary/Cyprinus-carpio.html', tier: 1, facts: ['3–35 °C, pH 6.5–9.0', '129 cm TL max', 'breeds at 15–20 °C', 'eggs hatch in about 4 days'] },
    { id: 'adw-cyprinus-carpio', title: 'Animal Diversity Web — Cyprinus carpio', url: 'https://animaldiversity.org/accounts/Cyprinus_carpio/', tier: 1, facts: ['about 300,000 eggs from a 45 cm female', 'hatch in about 3 days at 25–32 °C', 'mature at 3–5 years', 'eats benthic animals and plants'] },
    { id: 'casas-2013-carp-scales', title: 'Casas et al. 2013 — Scale genes of the common carp (PLoS ONE 8: e83053)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3875451/', tier: 1, facts: ['two scale genes, S and N', 'mirror ss/nn, leather ss/Nn, NN lethal', 'koi-derived nudes: fin loss, missing teeth, poor swimming'] },
    { id: 'bar-2013-koi-black', title: 'Bar et al. 2013 — Black pigment in koi (Frontiers in Genetics 4: 6)', url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3554881/fullTextXML', tier: 1, facts: ['the Bekko black is most likely one gene with a dominant black allele', 'the Utsuri black is probably multigenic'] },
    { id: 'gomelsky-2023-koi-metallic', title: 'Gomelsky, Novelo & Warner 2023 — Inheritance in ornamental koi (North American Journal of Aquaculture 85: 48)', url: 'https://academic.oup.com/naja/article/85/1/48/7808805', tier: 1, facts: ['metallic is one dominant gene, D', 'white koi need recessives at two duplicate melanin genes'] },
    { id: 'gomelsky-2011-koi-longfin', title: 'Gomelsky, Schneider & Alsaqufi 2011 — Inheritance of long fins in ornamental koi carp (North American Journal of Aquaculture 73: 49–52)', tier: 1, facts: ['long fins are one dominant gene, Lf', 'long × short 1:1, long × long 3:1'] },
    { id: 'saitama-hirenaga', title: 'Saitama Prefecture Fisheries Research Institute — Hirenaga nishikigoi', url: 'https://www.pref.saitama.lg.jp/b0915/kenkyuseika/hirenaga.html', tier: 1, facts: ['butterfly koi from crossing koi with Indonesian long-finned carp, from 1982', 'fins about twice as long'] },
    { id: 'andrian-2024-koi', title: 'Andrian et al. 2024 — Koi variety production (Veterinary World 17: 1846)', url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11422636/fullTextXML', tier: 1, facts: ['Kohaku, Sanke and Showa the most cultivated', 'breeders cull most of each spawn'] },
    { id: 'petmd-koi', title: 'PetMD — Koi fish care sheet', url: 'https://www.petmd.com/fish/koi-fish-care-sheet', tier: 2, facts: ['up to 3 ft', '25–50+ years', 'about 250 gallons per adult', 'heavy waste'] },
    { id: 'cafishvet-koi-goldfish', title: 'California Fish Vet — Can koi and goldfish be kept together?', url: 'https://cafishvet.com/koi/can-koi-and-goldfish-be-kept-together/', tier: 2, facts: ['koi live with goldfish', 'about 250 gallons per koi'] },
    { id: 'kodama-varieties', title: 'Kodama Koi Farm — Koi varieties', url: 'https://www.kodamakoifarm.com/?p=30694', tier: 2, facts: ['Asagi, Shusui, Goshiki (Asagi × Kohaku, 1918), Taisho Sanke, Ogon, Tancho'] },
    { id: 'kodama-breeding', title: 'Kodama Koi Farm — How to breed koi', url: 'https://www.kodamakoifarm.com/how-to-breed-koi', tier: 2, facts: ['spring, once a year', 'parents older than 3 years', 'one female to two or three males', 'spawning ropes; parents eat the eggs'] },
    { id: 'pondtrade-muji', title: 'POND Trade — Monochrome muji', url: 'https://www.pondtrademag.com/language-of-koi-monochrome-muji-is-pure-perfection/', tier: 2, facts: ['Chagoi brown and friendly', 'Soragoi blue-grey', 'Karashi from Kigoi × Chagoi'] },
  ],
  confidenceNotes: [
    'Real genes: the scale gene S, metallic D and butterfly fins (Lf). The Bekko black is probably a dominant gene (cited by Bar et al. 2013).',
    'Stand-ins (line-bred in truth, inheritance undocumented): the red pattern (many genes), the Utsuri black, the ground colours, Tancho and Ginrin. Most named varieties don’t breed true; breeders cull most of a spawn.',
    'Left out: leather and linear scales (the N gene, lethal when doubled), ghost koi (a cross with wild carp) and Kumonryu (changes colour with the seasons).',
    'Scientific name: Catalog of Fishes treats koi as C. rubrofuscus; FishBase still files koi under C. carpio.',
    'Tank: three adults in 800 gallons follows vets’ 250 gallons per koi; show keepers and pond guides want far more.',
  ],
  exceptionRules: [
    { other: 'fancy_goldfish', verdictFloor: 'high_risk', reason: 'Koi are fast, greedy feeders: slow fancy goldfish miss meals and can be swallowed while small.', incidentRisk: 0.08, mitigatedBy: ['target_feeding', 'tank_size'] },
    { other: 'comet_goldfish', verdictFloor: 'usually_compatible', reason: 'Koi and single-tailed goldfish share ponds, but koi win at feeding and eat small comets.', incidentRisk: 0.02, mitigatedBy: ['tank_size'] },
    { other: 'axolotl', verdictFloor: 'high_risk', reason: 'A mouthing carp picks at external gills, and its heavy waste fouls the clean water axolotls need.', incidentRisk: 0.15 },
    { other: 'tag:fish_small', verdictFloor: 'high_risk', reason: 'Koi eat any fish that fits in the mouth.', incidentRisk: 0.2, mitigatedBy: ['cover'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'incompatible', reason: 'Koi eat dwarf shrimp.', incidentRisk: 0.5 },
    { other: 'tag:snail', verdictFloor: 'high_risk', reason: 'Carp eat snails.', incidentRisk: 0.2 },
    // the big tropical fish (design §11: koi live only in cool water)
    { other: 'oscar', verdictFloor: 'incompatible', reason: 'Koi are cool-water fish (15–24 °C); oscars need warm, tropical water.', incidentRisk: 0.05 },
    { other: 'clown_loach', verdictFloor: 'incompatible', reason: 'Koi are cool-water fish (15–24 °C); clown loaches need warm, tropical water.', incidentRisk: 0.05 },
    { other: 'black_ghost_knifefish', verdictFloor: 'incompatible', reason: 'Koi are cool-water fish (15–24 °C); black ghost knifefish need warm, tropical water.', incidentRisk: 0.05 },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'Koi are cool-water fish (15–24 °C); fahaka puffers need warm, tropical water.', incidentRisk: 0.05 },
    { other: 'ornate_bichir', verdictFloor: 'incompatible', reason: 'Koi are cool-water fish (15–24 °C); ornate bichirs need warm, tropical water.', incidentRisk: 0.05 },
    { other: 'silver_arowana', verdictFloor: 'incompatible', reason: 'Koi are cool-water fish (15–24 °C); silver arowanas need warm, tropical water.', incidentRisk: 0.05 },
  ],
  special: { coolWater: true, heavyWaste: true, outgrowsSmallTanks: true, escapeArtist: true },
  visualLane: 'fish',
};
