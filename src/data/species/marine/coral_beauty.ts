import type { SpeciesDefinition } from '@/types';

/**
 * Coral beauty angelfish (twospined angelfish) — Centropyge bispinosa. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#coral-beauty-angelfish
 */
export const coralBeauty: SpeciesDefinition = {
  id: 'coral_beauty',
  commonName: 'Coral Beauty Angelfish',
  scientificName: 'Centropyge bispinosa',
  category: 'fish',
  group: 'dwarf_angelfish',
  genus: 'Centropyge',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific — East Africa to the Tuamotus, north to the Izu Islands, south to Lord Howe Island (absent from the Red Sea and Hawaiʻi)',
  isStarter: false,

  // FishBase max 11.5 cm TL; LiveAquaria/ORA ~4 in.
  adultSizeCm: 10,
  recommendedMinTankGallons: 70,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 18 },
  activeSwimmer: false,
  bioload: 1.5,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['nori', 'algae_wafer', 'mysis', 'brine_shrimp', 'pellet_small', 'flake'],
  feedingStyle: 'picker',
  feedingSpeed: 0.7,
  feedingAggression: 0.5,
  hungerHours: 12,

  activityZone: ['lower', 'decor', 'middle'],
  temperament: 'semi_aggressive',
  territoriality: 0.6,
  aggression: 0.3,
  finNipper: 0.1,
  hasLongFins: false,
  social: { kind: 'harem', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.15, note: 'Keep one per tank. Wild fish live in harems of 3–7, but in aquaria they fight other dwarf angels unless the tank is very large.' },
  sameSpeciesRule: {
    maleMale: 'fight',
    femaleFemale: 'tension',
    mixed: 'harassment',
    juvenile: 'tension',
    note: 'Two coral beauties, or a coral beauty and another Centropyge, usually fight. A harem is possible only in large tanks with one male.',
  },

  predatorTags: ['coral_polyp', 'clam', 'sessile_invert'],
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 0.5,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'caution',
  reefSafe: 'caution',
  coralRisk: 0.35,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.6,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Needs plenty of live rock to graze and caves to dart between.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 18,
    clutchSize: { min: 200, max: 1000 },
    incubationHours: 8,
    fryRearingHours: 400,
    cooldownDays: 3,
    conditions: { needsPartner: true, minTankGallons: 180 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'A male spawns with each female of his harem at dusk, releasing floating eggs. The larvae are pelagic and need hatchery culture — ORA and Biota now rear coral beauties commercially, but home breeding is not modelled.',
  },
  sexSystem: 'protogynous',
  parentalCare: 'none',
  // LiveAquaria/retail: 7–10 years with good care → ~340 game-days.
  lifecycle: { juvenileDays: 13, adultDays: 18, lifespanDays: 340, sexVisibleAtDays: 340, hatchSizeCm: 0.15 },

  hardiness: 0.75,
  difficulty: 'intermediate',
  baseValue: 90,
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  unlock: { requires: ['reef'], hint: 'Unlocks with reef systems — a colourful fish that needs careful coral choices.' },
  captiveBredAvailable: true,
  wildCaughtNote: 'Wild-collected fish (~$60) are still common; captive-bred ORA and Biota coral beauties (~$90) adapt better and eat prepared foods.',
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2009)',
    note: 'Common and widespread. Captive-bred fish from ORA and Biota are available and tend to be hardier.',
  },

  genetics: {
    loci: [
      {
        id: 'orange',
        name: 'Orange flank extent',
        mode: 'additive',
        alleles: [
          { id: 'std', name: 'Typical', dominance: 1, frequency: 0.8 },
          { id: 'hi', name: 'High orange', dominance: 1, frequency: 0.2 },
        ],
        note: 'The amount of orange on the flanks varies by locality in the wild, and ORA has line-bred a "high orange" coral beauty. Modelled as additive.',
      },
    ],
    phenotypes: [
      { id: 'high_orange', name: 'High Orange', layer: 'base', rarity: 0.35, when: [{ locus: 'orange', allele: 'hi', count: 'hom' }], visual: { bodyColor: '#e8761e', bodyColor2: '#3a2fa0', bellyColor: '#f39a38', pattern: 'bars' } },
      { id: 'standard', name: 'Coral Beauty', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#2d33a8',
      bodyColor2: '#ee7e22',
      bellyColor: '#f39a38',
      finColor: '#3440b6',
      finColor2: '#62b8ff',
      accentColor: '#241a4e',
      eyeColor: '#2a2448',
      pattern: 'bars',
      patternScale: 1,
      patternContrast: 0.75,
      patternSeed: 0,
      iridescence: 0.2,
      metallic: 0,
      translucency: 0.1,
      finType: 'angel_dwarf',
      finLength: 1,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.25,
    notes: 'Compact, oval dwarf angel. Deep royal blue-violet head, back and fins; the flank glows orange to golden-yellow crossed by many thin dark-blue vertical bars; dorsal, anal and tail fins edged in electric blue. Two spines on the gill cover. For the High Orange morph, the orange flank expands and body/body2 swap emphasis.',
  },
  visualMorphs: ['Coral Beauty', 'High Orange'],

  behaviorSet: 'angelfish_dwarf',
  behaviorTraits: { cruiseSpeed: 0.8, burstSpeed: 5, turnRate: 3, hoverTendency: 0.5, schoolingTightness: 0, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['rock_pick', 'cave_hop', 'dominance_display', 'coral_nip'],

  encyclopedia: {
    summary: 'A jewel-toned dwarf angelfish — royal blue with a glowing orange heart — that spends its day picking at the rock.',
    nativeHabitat: 'Coral-rich lagoons and seaward reef slopes from the shallows to 60 m across the Indo-Pacific, usually close to shelter.',
    socialStructure: 'Lives in harems of 3–7: one male and several females. All start female; the dominant fish becomes male.',
    tankNeeds: 'A 70-gallon or larger tank with lots of live rock to graze and caves to dart through. Feed algae-based foods plus meaty items.',
    compatibilityNotes: 'Reef-safe only with caution: it may nip LPS and soft corals, zoanthids and clam mantles. Fights other dwarf angels. A quick, bold feeder that outcompetes seahorses.',
    breedingOverview: 'Spawns at dusk within a harem, releasing floating eggs. Commercial farms (ORA, Biota) now raise the larvae; home breeding is impractical.',
    conservationNote: 'Least Concern (IUCN 2009). Captive-bred coral beauties are available and adapt well.',
    funFact: 'Dwarf angels are sex-changers: if a harem loses its male, the top female becomes male. In a related species males have even been seen changing back to females.',
    inGameBehavior: 'Flits between caves, pecks constantly at the rockwork, flares its fins at rivals — and may take a curious bite out of a coral.',
  },
  sourceReferences: [
    { id: 'fishbase-centropyge-bispinosa', title: 'FishBase — Centropyge bispinosa (Twospined angelfish)', url: 'https://www.fishbase.se/summary/Centropyge-bispinosa.html', tier: 1, facts: ['max 11.5 cm TL', 'depth 0–60 m', 'harems of 3–7', 'feeds on algae', 'secretive', 'IUCN Least Concern (2009)'] },
    { id: 'liveaquaria-coral-beauty', title: 'LiveAquaria — Coral Beauty Angelfish', url: 'https://www.liveaquaria.com/products/coral-beauty-angelfish', tier: 2, facts: ['min tank 70 gal', 'reef compatible with caution', 'prone to nip stony and soft corals', 'semi-aggressive', '72–78 °F, SG 1.020–1.025', 'price ~$60'] },
    { id: 'ora-coral-beauty', title: 'ORA — Coral Beauty Angelfish (captive-bred)', url: 'https://www.orafarm.com/product/coral-beauty-angelfish/', tier: 2, facts: ['captive-bred "high orange" variant', 'known to nip corals and clams — add to reefs with caution', 'max ~4 in', 'easy to feed'] },
    { id: 'sakai-2003-centropyge', title: 'Sakai et al. (2003) Sexually dichromatic protogynous angelfish Centropyge ferrugata males can change back to females. Zoological Science 20: 627–633', url: 'https://pubmed.ncbi.nlm.nih.gov/12777833/', tier: 1, facts: ['Centropyge are protogynous and haremic', 'largest female changes sex when the male disappears', 'males can reverse sex change'] },
  ],
  confidenceNotes: [
    'Reef safety: LiveAquaria and ORA agree it may nip corals and clams (two sources) — reefSafe "caution", coralRisk 0.35.',
    'Protogyny is documented for Centropyge (Sakai et al. 2003 on C. ferrugata); applied to C. bispinosa by genus. The Sakai abstract was read via search index.',
    'Captive-bred pricing (~$90) is an estimate from retailer listings; wild fish ~$60.',
    'Breeding is excluded (not_in_game): pelagic larvae require hatchery culture.',
  ],
  exceptionRules: [],
  special: {},
  visualLane: 'fish',
};
