import type { SpeciesDefinition } from '@/types';

/**
 * Maroon clownfish — Amphiprion biaculeatus (formerly Premnas biaculeatus). Lane species-marine, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/marine.md#maroon-clownfish
 */
export const maroonClownfish: SpeciesDefinition = {
  id: 'maroon_clownfish',
  commonName: 'Maroon Clownfish',
  scientificName: 'Amphiprion biaculeatus',
  category: 'fish',
  group: 'anemonefish',
  genus: 'Amphiprion',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Eastern Indian Ocean and western Pacific — India and the Andaman Sea through Indonesia and the Philippines to the Solomons and Queensland',
  isStarter: false,

  // FishBase max 17 cm TL; Fishes of Australia 16 cm TL. Females are 2–3× the size of males (males ~6–7 cm).
  adultSizeCm: 16,
  // LiveAquaria, ORA and Bulk Reef Supply: 30 gal, more with tankmates (an adult female passes 15 cm).
  recommendedMinTankGallons: 30,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1.6,

  // LiveAquaria: 72–78 °F, SG 1.020–1.025, dKH 8–12, pH 8.1–8.4. Very sensitive to copper.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['pellet_small', 'pellet_large', 'mysis', 'brine_shrimp', 'flake', 'nori'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.6,
  feedingAggression: 0.55,
  hungerHours: 14,

  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',
  territoriality: 0.85,
  aggression: 0.5,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'pair_hierarchy', minGroup: 1, idealGroup: 2, maxPer10Gallons: 0.7, note: 'Keep one, or one mated pair. The big female rules the tank; a second pair or another clownfish species is usually attacked.' },
  sameSpeciesRule: {
    maleMale: 'tension',
    femaleFemale: 'lethal',
    mixed: 'courtship_ok',
    juvenile: 'tension',
    note: 'The most territorial anemonefish: two females fight to the death, and the female bullies any fish but her mate.',
  },

  predatorTags: ['copepod', 'worm', 'shrimp_fry'],
  preyTags: ['fish_medium', 'fish_large'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'mostly_safe',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0.02,
  anemoneRelationship: 'host_seeker',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Claims a host — a bubble-tip anemone if there is one, otherwise a rock, coral or powerhead — and defends the ground around it.' },

  breeding: {
    system: 'clownfish_substrate',
    difficulty: 0.45,
    maturityDays: 16,
    // ORA: about 1,500 eggs per spawn is typical, more than 6,000 recorded.
    clutchSize: { min: 400, max: 1500 },
    // like the ocellaris: about a week to hatch (~8 real days × 8)
    incubationHours: 64,
    fryRearingHours: 200,
    cooldownDays: 12,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 24, minTankGallons: 30 },
    predationWithoutNursery: 0.98,
    nurseryRequired: true,
    maxRaisedPerClutch: 12,
    notes: 'Pairs lay adhesive eggs on rock beside their host; the male tends them and the female guards the site fiercely. Widely bred by ORA, ProAquatix and others; the larvae need a rotifer-fed rearing tank.',
  },
  sexSystem: 'protandrous',
  parentalCare: 'male',
  // ORA reports pairs spawning for decades; capped at the game's 500-day ceiling like the ocellaris.
  lifecycle: { juvenileDays: 12, adultDays: 16, lifespanDays: 500, sexVisibleAtDays: 12, hatchSizeCm: 0.35 },

  hardiness: 0.85,
  difficulty: 'beginner',
  baseValue: 40,
  rarity: 'common',
  visitorAppeal: 0.75,
  unlock: { requires: [], hint: 'Needs no research of its own: it comes into the shop once you research Marine Systems.' },
  captiveBredAvailable: true,
  conservation: {
    status: 'Least Concern (IUCN Red List, assessed 2021)',
    note: 'Least Concern. Wild fish are still collected, but captive-bred maroons in every form are easy to find — choose them.',
  },

  genetics: {
    loci: [
      {
        id: 'gold',
        name: 'Gold Stripe (Sumatran form)',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'White stripes', dominance: 2, frequency: 0.7 },
          { id: 'g', name: 'Gold stripes', dominance: 1, frequency: 0.3 },
        ],
        note: 'Gold Stripe maroons are a geographic form from Sumatra and the Andamans; ORA keeps pure Sumatran broodstock and found White × Gold crosses no better than either parent. The game models the gold bars as a simple recessive. Gold-striped fish have white bars when young that turn gold at 9–15 months.',
      },
      {
        id: 'lightning',
        name: 'Lightning',
        mode: 'mendelian',
        alleles: [
          { id: 'N', name: 'Normal bars', dominance: 1, frequency: 0.92 },
          { id: 'L', name: 'Lightning', dominance: 2, frequency: 0.08, rare: true },
        ],
        note: 'A wild mutation from Fisherman Island, Papua New Guinea (2008). Lightning × normal pairs gave about half Lightning twice, which fits one dominant allele, but this is unproven; it is not sex-linked.',
      },
      {
        id: 'nugget',
        name: 'Goldflake / Gold Nugget',
        mode: 'codominant',
        alleles: [
          { id: 'n', name: 'Normal bars', dominance: 1, frequency: 0.9 },
          { id: 'G', name: 'Gold expansion', dominance: 1, frequency: 0.1, rare: true },
        ],
        note: 'ORA reports that Gold Nugget × Gold Nugget gives only Nuggets and likens it to the Platinum Percula mutation. Following Pedersen (CORAL 2016), the game treats one copy as Goldflake (bar extensions and spots) and two as Gold Nugget (solid gold); the hypothesis is untested.',
      },
    ],
    phenotypes: [
      { id: 'gold_nugget', name: 'Gold Nugget', layer: 'base', rarity: 0.6, when: [{ locus: 'nugget', allele: 'G', count: 'hom' }], visual: { bodyColor: '#e2a82e', bodyColor2: '#c98a1e', bellyColor: '#efbf52', accentColor: '#f3c85a', pattern: 'solid', finColor: '#5c0b15', finColor2: '#ff7a2a' } },
      { id: 'gold_stripe', name: 'Gold Stripe Maroon', layer: 'base', rarity: 0.1, when: [{ locus: 'gold', allele: 'g', count: 'hom' }], visual: { accentColor: '#e9b33a' } },
      { id: 'white_stripe', name: 'White Stripe Maroon', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'goldflake', name: 'Goldflake', layer: 'overlay', rarity: 0.3, when: [{ locus: 'nugget', allele: 'G', count: 'het' }], visual: { pattern: 'marble', patternScale: 0.85, patternContrast: 0.9, accentColor: '#e9b33a' } },
      { id: 'lightning', name: 'Lightning', layer: 'overlay', rarity: 0.45, when: [{ locus: 'lightning', allele: 'L', count: 'any' }], visual: { pattern: 'marble', patternScale: 1.35, patternContrast: 1, accentColor: '#f4f2ec' } },
    ],
    baseVisual: {
      bodyColor: '#b0142c',
      bodyColor2: '#7e0d20',
      bellyColor: '#c4283a',
      finColor: '#9a1226',
      finColor2: '#5c0b15',
      accentColor: '#f4f2ec',
      eyeColor: '#7a1a10',
      pattern: 'bands',
      patternScale: 1,
      patternContrast: 1,
      patternSeed: 0,
      iridescence: 0.08,
      metallic: 0,
      translucency: 0.08,
      finType: 'clownfish',
      finLength: 1,
      bodyDepth: 1.05,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'Short, deep, rounded clownfish with a large spine on each cheek. Deep red body (young fish and males bright red, females maroon to nearly black) with three narrow white bars — behind the eye, mid-body and at the tail base — or gold bars in the Sumatran form. Lightning fish carry broken, branching white bars over the flanks.',
  },
  visualMorphs: ['White Stripe Maroon', 'Gold Stripe Maroon', 'Lightning', 'Goldflake', 'Gold Nugget'],

  behaviorSet: 'clownfish',
  behaviorTraits: { cruiseSpeed: 0.9, burstSpeed: 4.5, turnRate: 2.8, hoverTendency: 0.45, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.6, nocturnal: 0 },
  specialBehaviors: ['pair_swim', 'host_zone', 'nest_prepare', 'egg_fan', 'hierarchy_display', 'sex_change', 'waddle_swim'],

  encyclopedia: {
    summary: 'The biggest and boldest clownfish: a deep red anemonefish with spines on its cheeks and a female that rules her patch.',
    nativeHabitat: 'Sheltered lagoons and coastal reefs 1–16 m deep, almost always in the bubble-tip anemone (Entacmaea quadricolor).',
    socialStructure: 'One dominant female, a much smaller breeding male and a few junior males. If she dies, the male becomes female and the largest junior steps up.',
    tankNeeds: 'A 30-gallon or larger tank with live rock and moderate flow, and stable marine water; it is very sensitive to copper. A bubble-tip anemone is welcome but not required.',
    compatibilityNotes: 'Reef-safe, but the most territorial clownfish: keep one, or one pair, and no other clownfish. The female grows big and bullies timid tankmates near her host.',
    breedingOverview: 'Pairs lay adhesive eggs on rock beside the host; the male fans them while the female guards the site. Captive breeders such as ORA raise every colour form.',
    conservationNote: 'Least Concern (IUCN 2021). Captive-bred maroons are common, so wild collection is not needed.',
    funFact: 'A maroon spawn is usually about 1,500 eggs, and more than 6,000 have been recorded from one pair.',
    inGameBehavior: 'Waddles around its host, pairs with a partner, and turns its broad side to any fish that comes too close.',
    feedingNote: 'An easy omnivore: marine pellets or flake as the staple, thawed mysis or brine shrimp, and a little seaweed. Feed two or three times a day; an autofeeder with pellets suits it.',
    keeperTip: 'Never chase it with a net — the cheek spines tangle in the mesh. Catch it in a specimen container instead.',
  },
  sourceReferences: [
    { id: 'fishbase-amphiprion-biaculeatus', title: 'FishBase — Amphiprion biaculeatus (Spinecheek anemonefish)', url: 'https://www.fishbase.se/summary/Amphiprion-biaculeatus.html', tier: 1, facts: ['max 17 cm TL', 'depth 1–16 m', 'hosts Entacmaea quadricolor', 'adhesive eggs, male guards', 'zooplankton and benthic algae', 'IUCN Least Concern (2021)'] },
    { id: 'worms-amphiprion-biaculeatus', title: 'WoRMS — Amphiprion biaculeatus (Bloch, 1790)', url: 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=1605249', tier: 1, facts: ['accepted name', 'Premnas biaculeatus unaccepted', 'Premnas epigrammata a synonym'] },
    { id: 'foa-maroon', title: 'Fishes of Australia — Amphiprion biaculeatus', url: 'https://fishesofaustralia.net.au/home/species/378', tier: 1, facts: ['16 cm TL', 'females 2–3× the size of males', 'three narrow white bars', 'cheek spine crosses the head bar', 'protandrous hierarchy'] },
    { id: 'liveaquaria-maroon', title: 'LiveAquaria — Maroon Clownfish', url: 'https://www.liveaquaria.com/product/105/?pcatid=105', tier: 2, facts: ['30 gal minimum', '72–78 °F, SG 1.020–1.025, dKH 8–12', 'keep one or a pair', 'reef compatible', 'cheek spines catch in nets', 'price ~$40'] },
    { id: 'ora-gold-stripe-maroon', title: 'ORA — Gold Stripe Maroon Clownfish', url: 'https://www.orafarm.com/product/gold-stripe-maroon-clownfish/', tier: 2, facts: ['Sumatran broodstock', 'bars white when young, gold at 9–12 months', '~1,500 eggs per spawn, >6,000 recorded', 'the female guards the nest'] },
    { id: 'coral-pedersen-2016-maroons', title: 'CORAL Magazine — Pedersen (2016) on maroon clownfish lines', url: 'https://coralmagazine.com/?p=1490714', tier: 2, facts: ['Goldflake 2007 (Sustainable Aquatics), ORA 2012', 'Gold Nugget × Gold Nugget gives only Nuggets', 'hypothesis: one copy Goldflake, two copies Gold Nugget'] },
    { id: 'coral-lightning-maroon-2014', title: 'CORAL Magazine (2014) — Lightning Maroon updates', url: 'https://www.coralmagazine.com/2014/06/24/lightning-maroon-updates/', tier: 2, facts: ['wild mutation from Fisherman Island, PNG', 'Lightning × normal gave ~50% Lightning twice', 'not sex-linked'] },
  ],
  confidenceNotes: [
    'Name: WoRMS, the Catalog of Fishes and FishBase now use Amphiprion biaculeatus (Tang et al. 2021 merged Premnas into Amphiprion); much of the hobby still says Premnas.',
    'Colour-form genetics are breeders’ observations, not proven inheritance: Gold Stripe is modelled as a recessive, Lightning as a dominant and the Goldflake/Gold Nugget line as one codominant allele (Pedersen’s untested hypothesis).',
    'Gold Dot and Morse Code are left out: ORA has not said how Gold Dot is inherited, and Morse Code is a pattern seen among non-Lightning siblings, not a line.',
    'Lifespan: no Tier 1 figure; ORA reports pairs spawning for decades, so the game uses its 500-day ceiling as for the ocellaris.',
  ],
  exceptionRules: [
    { other: 'ocellaris_clownfish', verdictFloor: 'high_risk', reason: 'A maroon female attacks other clownfish, and an ocellaris is half her size. Keep one clownfish species per tank.', incidentRisk: 0.12, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A big, territorial, fast-feeding clownfish harasses slow seahorses and takes their food.', incidentRisk: 0.08 },
  ],
  special: {
    maleSizeFactor: 0.45, // Fishes of Australia: females 2–3× the size of males; the female is the 16 cm adult
    hostNote: 'No anemone is needed. In the wild it hosts almost only the bubble-tip anemone; in a tank it will also claim a rock, coral or powerhead.',
  },
  visualLane: 'fish',
};
