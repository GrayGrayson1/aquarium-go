import type { SpeciesDefinition } from '@/types';

/**
 * Oscar — Astronotus ocellatus. Lane species-fw, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/freshwater.md#oscar
 * Every trade form is A. ocellatus, a farm strain; tiger and red are line-bred (simplified to one codominant locus).
 */
export const oscar: SpeciesDefinition = {
  id: 'oscar',
  commonName: 'Oscar',
  scientificName: 'Astronotus ocellatus',
  category: 'fish',
  group: 'cichlid',
  genus: 'Astronotus',
  environment: 'freshwater',
  // not planted: it uproots and shreds plants (PFK, Aquarium Co-Op, LiveAquaria)
  waterClasses: ['freshwater_tropical'],
  // Catalog of Fishes: A. ocellatus is the Amazon basin's oscar; the Orinoco's is A. mikoljii since 2022
  nativeRegion: 'The Amazon basin (Brazil, Bolivia, Colombia, French Guiana and Peru), in quiet, shallow, mud- or sand-bottomed water',
  isStarter: false,

  // Seriously Fish 35 cm SL; FishBase 40–45.7 cm TL; aquarium adults 25–30 cm (PFK, Aquarium Co-Op).
  adultSizeCm: 35,
  // PFK: adults need 180×60×60 cm (6×2×2 ft); Seriously Fish: 150×60 cm is just large enough for one.
  recommendedMinTankGallons: 180,
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: false,
  // derived: a messy 35 cm cichlid (the comet goldfish, 25 cm, is 8)
  bioload: 10,

  // FishBase / PFK / LiveAquaria 22–25 °C; Aquarium Co-Op 23–27; Seriously Fish 20–28; lethal near 12–13 °C (USGS, PFK).
  tempC: { min: 20, max: 30, idealMin: 22, idealMax: 26 },
  pH: { min: 6, max: 8, idealMin: 6.5, idealMax: 7.5 },
  salinitySG: null,
  gh: { min: 5, max: 20 },
  kh: { min: 3, max: 15 },

  flowPreference: 'low',
  lightPreference: 'dim',
  diet: 'omnivore',
  // PFK: 85–90 % meaty foods; Seriously Fish: no beef heart or chicken, feeder fish not recommended
  foods: ['pellet_large', 'pellet_floating', 'pellet_sinking', 'seafood', 'earthworm', 'insect', 'snail_live', 'bloodworm', 'vegetable'],
  feedingStyle: 'hunter',
  feedingSpeed: 0.85,
  feedingAggression: 0.8,
  hungerHours: 24,

  activityZone: ['middle', 'lower', 'bottom'],
  temperament: 'predatory',
  territoriality: 0.6,
  aggression: 0.45,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, note: 'One, or a pair that formed by itself from a group of young. Oscars grow less tolerant of their own kind with age, and a pair bullies a third.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'ok', note: 'Young cluster together; adults jaw-lock over mates and territory, and a new oscar of similar size added to a resident is attacked.' },

  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_benthic', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'snail', 'snail_small', 'worm', 'amphibian', 'amphibian_larva'],
  preyTags: ['fish_large'],
  // derived: PFK says it avoids fish over 75 % of its size; anything that fits its mouth is food
  maxLikelyPreySizeCm: 10,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'unsafe',
  reefSafe: 'unsafe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.2,
  substrateRules: { preferred: ['sand', 'fine_sand', 'large_pebbles'], avoid: [], note: 'Deep sand and a few large, heavy rocks. It digs pits and piles the sand at one end, so use heavy rounded decor and (PFK) a guarded or external heater.' },

  breeding: {
    // a pair spawns on a stone it cleans and both guard (chunk 17's own module: the corydoras' has the wrong habits)
    system: 'cichlid_substrate',
    difficulty: 0.55,
    // ADW: mature at about 10–14 months
    maturityDays: 22,
    // ADW 300–3,000 (small females 300–500); LiveAquaria 1,000–2,000
    clutchSize: { min: 300, max: 3000 },
    // ADW 2–3 days, FishBase 3–4 days → 3 days × 8
    incubationHours: 24,
    fryRearingHours: 150,
    cooldownDays: 12,
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 26, needsConditioningFood: ['earthworm', 'seafood'], minTankGallons: 180 },
    predationWithoutNursery: 0.6,
    nurseryRequired: false,
    maxRaisedPerClutch: 12,
    notes: 'A pair cleans a flat rock and lays hundreds to thousands of sticky eggs; both parents guard them and the female fans them. The wrigglers are moved to pits in the sand for about a week, and the parents guard the free-swimming young for weeks. The fry take baby brine shrimp, and parents may eat fry left with them too long.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'both',
  // 10–20 years (Seriously Fish, Aquarium Co-Op) → the game's cap; larvae 3.25 mm (ADW); sexes alike but for the breeding tube
  lifecycle: { juvenileDays: 20, adultDays: 22, lifespanDays: 500, sexVisibleAtDays: 22, hatchSizeCm: 0.33 },

  hardiness: 0.85,
  difficulty: 'intermediate',
  // LiveAquaria $36.99 (1–3 in); Aquarium Co-Op $7–15; LiveAquaria long-fin $24.99
  baseValue: 35,
  rarity: 'common',
  visitorAppeal: 0.85,
  unlock: { requires: ['fw_large'] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Trade oscars are mass-bred on farms in Eastern Europe and the Far East.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2020)', note: 'Established as an invasive fish in south Florida, Hawaii and Puerto Rico from fish-farm stock and released pets (USGS). Never release one.' },

  genetics: {
    loci: [
      {
        id: 'red',
        name: 'Red marbling',
        mode: 'codominant',
        alleles: [
          { id: 'w', name: 'Wild marbling', dominance: 1, frequency: 0.45 },
          { id: 'R', name: 'Red line', dominance: 1, frequency: 0.55 },
        ],
        note: 'Tiger and red are line-bred farm strains (the red is genetically distinct and fades without carotenoids, Syam et al. 2019); one codominant locus is a simplification: one copy Tiger, two Red.',
      },
      {
        id: 'albino',
        name: 'Albino',
        mode: 'mendelian',
        alleles: [
          { id: '+', name: 'Normal pigment', dominance: 2, frequency: 0.75 },
          { id: 'a', name: 'Albino', dominance: 1, frequency: 0.25 },
        ],
        note: 'The albino oscar lacks melanin (Wang et al. 2022); its inheritance is unpublished. Recessive is the hobby’s report and the usual pattern for fish albinism.',
      },
      {
        id: 'lutino',
        name: 'Lutino',
        mode: 'mendelian',
        alleles: [
          { id: '+', name: 'Normal', dominance: 2, frequency: 0.93 },
          { id: 'l', name: 'Lutino', dominance: 1, frequency: 0.07, rare: true },
        ],
        note: 'The lemon or lutino oscar is a recent farm form; its inheritance is unknown (one hobby claim of recessive).',
      },
      {
        id: 'fin',
        name: 'Fin length',
        mode: 'mendelian',
        alleles: [
          { id: 'L', name: 'Long-fin', dominance: 2, frequency: 0.1 },
          { id: 's', name: 'Standard fins', dominance: 1, frequency: 0.9 },
        ],
        note: 'Long-fin oscars are a recent ornamental line whose inheritance is unknown: no crossing counts were found. Modelled as dominant, the game’s choice rather than evidence.',
      },
    ],
    phenotypes: [
      { id: 'lutino', name: 'Lutino', layer: 'base', rarity: 0.55, when: [{ locus: 'lutino', allele: 'l', count: 'hom' }], visual: { bodyColor: '#f2d64a', bodyColor2: '#f0c63a', bellyColor: '#f8e690', finColor: '#f2e08a', finColor2: '#f0d060', accentColor: '#f6c040', eyeColor: '#3a2a1a', pattern: 'solid', patternContrast: 0.15 }, note: 'Solid lemon yellow; the marbling is hidden.' },
      { id: 'albino_red', name: 'Albino Red', layer: 'base', rarity: 0.35, when: [{ locus: 'albino', allele: 'a', count: 'hom' }, { locus: 'red', allele: 'R', count: 'hom' }], visual: { bodyColor: '#e8673a', bodyColor2: '#f08a52', bellyColor: '#f6c8a8', finColor: '#f2e2d2', finColor2: '#e8a080', accentColor: '#f4f0e6', eyeColor: '#d8303a', pattern: 'marble', patternContrast: 0.45 }, note: 'A red body with white marbling and red eyes.' },
      { id: 'albino_tiger', name: 'Albino Tiger', layer: 'base', rarity: 0.25, when: [{ locus: 'albino', allele: 'a', count: 'hom' }, { locus: 'red', allele: 'R', count: 'het' }], visual: { bodyColor: '#f2ece0', bodyColor2: '#f6f0e8', bellyColor: '#faf6ee', finColor: '#f2e8dc', finColor2: '#ecd8c4', accentColor: '#e8673a', eyeColor: '#d8303a', pattern: 'marble', patternContrast: 0.75 }, note: 'White with bold orange-red marbling and red eyes.' },
      { id: 'albino', name: 'Albino', layer: 'base', rarity: 0.2, when: [{ locus: 'albino', allele: 'a', count: 'hom' }], visual: { bodyColor: '#f2ece0', bodyColor2: '#f6f0e8', bellyColor: '#faf6ee', finColor: '#f2e8dc', finColor2: '#ecd8c4', accentColor: '#f0a060', eyeColor: '#d8303a', pattern: 'mottled', patternContrast: 0.35 } },
      { id: 'red', name: 'Red', layer: 'base', rarity: 0.12, when: [{ locus: 'red', allele: 'R', count: 'hom' }], visual: { bodyColor: '#c4442a', bodyColor2: '#2a2620', bellyColor: '#d8603a', finColor: '#241f1a', finColor2: '#3a2c24', accentColor: '#e05a2c', pattern: 'marble', patternContrast: 0.55 }, note: 'Dark head and fins, the flanks mostly copper-red.' },
      { id: 'tiger', name: 'Tiger', layer: 'base', rarity: 0, when: [{ locus: 'red', allele: 'R', count: 'het' }], visual: { bodyColor: '#1e1c18', bodyColor2: '#2a2620', bellyColor: '#3a2c22', accentColor: '#e0562a', pattern: 'marble', patternContrast: 0.9 }, note: 'Black with bold orange-red marbling: the commonest trade form.' },
      { id: 'wild', name: 'Wild', layer: 'base', rarity: 0.05, when: [], visual: {} },
      { id: 'longfin', name: 'Long-fin', layer: 'overlay', rarity: 0.25, when: [{ locus: 'fin', allele: 'L', count: 'any' }], visual: { finType: 'longfin', finLength: 1.5 } },
    ],
    baseVisual: {
      bodyColor: '#3b3a2c',
      bodyColor2: '#56502f',
      bellyColor: '#6f6040',
      finColor: '#2e2c24',
      finColor2: '#3e3a2c',
      accentColor: '#d4562c',
      eyeColor: '#b8432a',
      pattern: 'mottled',
      patternScale: 1,
      patternContrast: 0.7,
      patternSeed: 0,
      iridescence: 0.1,
      metallic: 0.1,
      translucency: 0.05,
      finType: 'standard',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the oscar art: body = the dark ground; body2 = the back and head; accent = the orange-red blotches or marbling, and the ring of the eyespot at the tail base; fin = the fins; eye = the iris. Every form keeps the black eyespot ringed with the accent colour on the tail base.',
  },
  visualMorphs: ['Wild', 'Tiger', 'Red', 'Albino', 'Albino Tiger', 'Albino Red', 'Lutino', 'Long-fin'],

  behaviorSet: 'cichlid_large',
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 5, turnRate: 1.8, hoverTendency: 0.55, schoolingTightness: 0, restOnBottom: 0.25, hitching: 0, burrowing: 0.2, glassSurfing: 0.05, curiosity: 0.95, nocturnal: 0.1 },
  specialBehaviors: ['beg_at_glass', 'owner_recognition', 'dig_pit', 'move_decor', 'sulk_on_bottom', 'play_dead', 'lateral_display', 'jaw_lock'],

  encyclopedia: {
    summary: 'The big, dark, marbled cichlid with a famous personality: it learns its keeper, begs at the glass and redecorates its tank.',
    nativeHabitat: 'Quiet, shallow, mud- and sand-bottomed water in the Amazon basin, where it hunts small fish, crayfish, worms and insect larvae.',
    socialStructure: 'Lives alone or in a bonded pair that forms by itself from a group of young.',
    tankNeeds: 'A six-foot tank of 180 gallons or more for one adult (a pair wants more), deep sand, a few heavy rocks, a guarded heater, strong filtration and a tight lid: it jumps.',
    compatibilityNotes: 'Eats anything that fits in its mouth: no small fish, shrimp, snails or frogs. Big, robust fish of its own size can share a large tank; never with a fahaka puffer.',
    breedingOverview: 'A pair cleans a flat rock and lays hundreds to thousands of eggs. Both parents guard them and move the young to pits they dig in the sand.',
    conservationNote: 'Least Concern (IUCN 2020). It has become an invasive species in Florida, Hawaii and Puerto Rico: never release one.',
    funFact: 'Wild oscars sometimes lie on their side on the bottom as if dead, then snap up the small fish that come to investigate.',
    inGameBehavior: 'Patrols the middle and lower water, digs at the sand, begs at the glass when you come near and sulks on the bottom after a fright.',
    feedingNote: 'Floating carnivore sticks or large pellets as a staple, with seafood, earthworms and the odd cricket. Never beef heart or chicken, and no feeder fish.',
    keeperTip: 'Plan the big tank before you buy the little one: an oscar grows two-thirds of its size in its first year.',
  },
  sourceReferences: [
    { id: 'fishbase-astronotus-ocellatus', title: 'FishBase — Astronotus ocellatus (Oscar)', url: 'https://www.fishbase.se/summary/Astronotus-ocellatus.html', tier: 1, facts: ['45.7 cm TL max', '22–25 °C, pH 6.0–8.0', 'quiet mud- and sand-bottomed waters', 'both parents guard eggs', 'hatch 3–4 days', 'IUCN Least Concern (2020)'] },
    { id: 'adw-astronotus-ocellatus', title: 'Animal Diversity Web — Astronotus ocellatus', url: 'https://animaldiversity.org/accounts/Astronotus_ocellatus/', tier: 1, facts: ['adults 30–40 cm', 'mature at 10–14 months', '300–3,000 eggs', 'hatch 2–3 days', 'monogamous', 'jaw-locking'] },
    { id: 'usgs-nas-oscar', title: 'USGS Nonindigenous Aquatic Species — Oscar', url: 'https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=436', tier: 1, facts: ['established in south Florida, Hawaii and Puerto Rico', 'lower lethal temperature 12 °C'] },
    { id: 'wang-2022-albino-oscar', title: 'Wang et al. 2022 — Skin transcriptome of albino oscars (Comp. Biochem. Physiol. D)', url: 'https://pubmed.ncbi.nlm.nih.gov/34864613/', tier: 1, facts: ['albino oscars have little melanin and immature melanosomes', 'no inheritance data'] },
    { id: 'syam-2019-oscar-strains', title: 'Syam et al. 2019 — Genetic distinctness of oscar strains (WAS Asian-Pacific Aquaculture)', url: 'https://was.org/Meeting/Program/PaperDetail/153650', tier: 1, facts: ['albino, common and red oscars are genetically distinct strains', 'the red fades without carotenoids'] },
    { id: 'seriouslyfish-astronotus-ocellatus', title: 'Seriously Fish — Astronotus ocellatus', url: 'https://www.seriouslyfish.com/species/astronotus-ocellatus/', tier: 2, facts: ['350 mm SL', '150×60 cm just large enough for one adult', '20–28 °C, pH 6.0–7.5', 'no beef heart or chicken', 'juveniles dark with pale bands', 'forms tiger, red, albino', '10–20 years'] },
    { id: 'pfk-night-of-the-oscars', title: 'Practical Fishkeeping — Night of the Oscars', url: 'https://www.practicalfishkeeping.co.uk/features/night-of-the-oscars/', tier: 2, facts: ['adults need 180×60×60 cm', 'digs pits and uproots plants', 'leaps: needs a cover', 'plays possum', 'tankmates stingrays and arowana', 'lutino and long-fin forms'] },
    { id: 'aquariumcoop-oscar', title: 'Aquarium Co-Op — Oscar fish care guide', url: 'https://www.aquariumcoop.com/blogs/aquarium/oscar-fish-care-guide', tier: 2, facts: ['recognises its owner and begs', 'sulks after water changes', 'lemon and long-fin varieties', '$7–9 small, $15+ larger'] },
    { id: 'liveaquaria-tiger-oscar', title: 'LiveAquaria — Tiger Oscar', url: 'https://www.liveaquaria.com/products/tiger-oscar', tier: 2, facts: ['12 in', 'spawns at 79–86 °F', '1,000–2,000 eggs', '$36.99 (1–3 in)'] },
  ],
  confidenceNotes: [
    'Tiger and red are line-bred strains (polygenic in truth); one codominant locus is the game’s simplification.',
    'Albino, lutino and long-fin inheritance is unpublished: albino and lutino recessive follow hobby reports; long-fin dominant is the game’s choice.',
    'Size: 35 cm (Seriously Fish SL); FishBase gives up to 45.7 cm TL, aquarium adults 25–30 cm.',
    'Tank: sources run from 70–75 gal (LiveAquaria, Aquarium Co-Op) to 6×2 ft (PFK); the game uses PFK’s footprint, the 180-gallon tank.',
    'Range: since 2022 the Orinoco oscar is a separate species (A. mikoljii, Catalog of Fishes); trade oscars may carry genes from more than one Astronotus.',
    'Left out: dyed and injected fish (blueberry, strawberry), the balloon (a deformity) and the unverified blue.',
  ],
  exceptionRules: [
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'An oscar swallows small fish whole.', incidentRisk: 0.5 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'An oscar swallows small fish whole.', incidentRisk: 0.35 },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Medium fish are at the edge of what an adult oscar can swallow.', incidentRisk: 0.1, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'incompatible', reason: 'Oscars eat shrimp.', incidentRisk: 0.5 },
    { other: 'tag:crustacean', verdictFloor: 'high_risk', reason: 'Oscars eat crayfish, crabs and shrimp.', incidentRisk: 0.2 },
    { other: 'tag:snail', verdictFloor: 'high_risk', reason: 'Oscars crush and eat snails.', incidentRisk: 0.15 },
    { other: 'tag:amphibian', verdictFloor: 'incompatible', reason: 'Oscars eat frogs and salamanders.', incidentRisk: 0.4 },
    { other: 'discus', verdictFloor: 'high_risk', reason: 'Discus need warmer, cleaner and calmer water than an oscar tank gives.', incidentRisk: 0.05 },
    { other: 'comet_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; an oscar needs tropical water and eats them while they are small.', incidentRisk: 0.1 },
    { other: 'fancy_goldfish', verdictFloor: 'incompatible', reason: 'Goldfish are cool-water fish; an oscar needs tropical water and eats them while they are small.', incidentRisk: 0.1 },
    { other: 'clown_loach', verdictFloor: 'conditional', reason: 'Adult clown loaches are too big to eat, but young ones fit an oscar’s mouth; loaches also fare poorly beside big, dominant fish.', incidentRisk: 0.04, mitigatedBy: ['tank_size', 'hides'] },
    { other: 'black_ghost_knifefish', verdictFloor: 'conditional', reason: 'A digging, boisterous oscar can damage a knifefish’s skin; only a large knifefish, with sight breaks.', incidentRisk: 0.03, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'The fahaka bites chunks out of tankmates and must live alone.', incidentRisk: 0.3 },
  ],
  special: { outgrowsSmallTanks: true, heavyWaste: true, escapeArtist: true },
  visualLane: 'fish',
};
