import type { SpeciesDefinition } from '@/types';

/**
 * Peacock mantis shrimp — Odontodactylus scyllarus. Lane species-marine.
 * Sources, key facts and conflicts: docs/research/marine.md#peacock-mantis-shrimp
 */
export const peacockMantisShrimp: SpeciesDefinition = {
  id: 'peacock_mantis_shrimp',
  commonName: 'Peacock Mantis Shrimp',
  scientificName: 'Odontodactylus scyllarus',
  category: 'invertebrate',
  group: 'stomatopod',
  genus: 'Odontodactylus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'Tropical Indian and Pacific Oceans — coral reefs and rubble slopes from East Africa to the central Pacific',
  isStarter: false,

  // MBA/National Aquarium: 2–7 in; LiveAquaria max 6 in; most in the hobby 2–4 in.
  adultSizeCm: 15,
  // BRS: 10 gal minimum; retailers 20+. Conservative choice for a 15 cm adult with a deep-sand burrow: 40 gal breeder.
  recommendedMinTankGallons: 40,
  recommendedFootprint: { minLengthIn: 36, minWidthIn: 18 },
  activeSwimmer: false,
  bioload: 1.4,

  // LiveAquaria: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025. Care guides 22–26 °C.
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.021, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['snail_live', 'mysis', 'pellet_sinking', 'pellet_large'],
  feedingStyle: 'hunter',
  feedingSpeed: 0.7,
  feedingAggression: 0.9,
  hungerHours: 36,

  activityZone: ['bottom', 'substrate', 'decor'],
  temperament: 'predatory',
  territoriality: 1,
  aggression: 0.95,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.25, note: 'Strictly solitary: keep one mantis shrimp and nothing else.' },
  sameSpeciesRule: {
    maleMale: 'lethal',
    femaleFemale: 'lethal',
    mixed: 'breeding_only_temporary',
    juvenile: 'fight',
    note: 'Two mantis shrimp fight over burrows with their clubs; the loser is usually killed.',
  },

  predatorTags: ['snail', 'snail_small', 'crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'clam', 'worm', 'fish_tiny', 'fish_small', 'fish_benthic', 'fish_slow', 'fry', 'eggs'],
  preyTags: ['crustacean'],
  maxLikelyPreySizeCm: 8,

  shrimpSafe: 'unsafe',
  snailSafe: 'unsafe',
  frySafe: 'unsafe',
  plantSafe: 'safe',
  reefSafe: 'unsafe',
  coralRisk: 0.1,
  anemoneRelationship: 'neutral',

  hidesNeeded: 1,
  coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'aragonite', 'fine_sand'], avoid: ['bare'], note: 'Needs a deep bed of mixed sand, coral gravel and rubble (at least 1.5× its body length) plus rock to build a U-shaped burrow.' },

  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,
    clutchSize: { min: 5000, max: 20000 },
    // Females carry/guard the egg mass for ~5–6 weeks (care-guide figure; moderate confidence).
    incubationHours: 320,
    fryRearingHours: 800,
    cooldownDays: 40,
    conditions: { needsPartner: true, needsNestSite: true, minTankGallons: 90 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'After mating the female holds a large egg mass in her burrow, cleaning and aerating it for weeks. The larvae are planktonic for a long time and are not reared commercially, so the game does not breed this species.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'female',
  // Care guides: several years in captivity (2–5 for small stomatopods, longer for large species) → ~6 years.
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 240, sexVisibleAtDays: 20, hatchSizeCm: 0.2 },

  hardiness: 0.85,
  difficulty: 'advanced',
  baseValue: 130,
  rarity: 'very_rare',
  visitorAppeal: 1,
  unlock: { requires: ['predators'], hint: 'Research Predator Husbandry (needs a public showroom) — a species-only tank with thick glass or acrylic.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All peacock mantis shrimp in the trade are wild-collected; some also arrive by accident as hitchhikers in live rock.',
  conservation: {
    status: 'Not evaluated (IUCN)',
    note: 'Not assessed by the IUCN and described by the National Aquarium as not threatened. Every animal is wild-caught — house it for life in a proper species tank.',
  },

  genetics: {
    loci: [
      {
        id: 'hue',
        name: 'Body hue',
        mode: 'additive',
        alleles: [
          { id: 'green', name: 'Green', dominance: 1, frequency: 0.8 },
          { id: 'teal', name: 'Blue-teal', dominance: 1, frequency: 0.2 },
        ],
        note: 'Wild peacock mantis shrimp range from olive-green to bluish-teal between individuals and localities. No trade morphs; modelled as an additive hue tendency.',
      },
    ],
    phenotypes: [
      { id: 'wild', name: 'Peacock Mantis', layer: 'base', rarity: 0, when: [], visual: {} },
      { id: 'teal', name: 'Blue-teal', layer: 'overlay', rarity: 0.1, when: [{ locus: 'hue', allele: 'teal', count: 'hom' }], visual: { bodyColor: '#2f8f86', bodyColor2: '#23667a' }, note: 'Natural individual variation.' },
    ],
    baseVisual: {
      bodyColor: '#3f8f4a',
      bodyColor2: '#2f6d5e',
      bellyColor: '#e7a6b8',
      finColor: '#e8492f',
      finColor2: '#2fb3d8',
      accentColor: '#141414',
      eyeColor: '#45c3c9',
      pattern: 'spots',
      patternScale: 0.7,
      patternContrast: 0.9,
      patternSeed: 0,
      iridescence: 0.35,
      metallic: 0,
      translucency: 0.05,
      finType: 'mantis_smasher',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the mantis renderer: body/body2 = green to teal segmented body; fin = scarlet-orange raptorial clubs and uropod tips; fin2 = turquoise antennal scales and swimmerets; belly = pink walking legs; accent = black leopard spots on the cream front of the carapace; eye = turquoise stalked compound eyes with a midband. Some individuals look more blue-teal.',
  },
  visualMorphs: ['Peacock Mantis (natural colour variation)'],

  behaviorSet: 'mantis_shrimp',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 8, turnRate: 3, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, hitching: 0, burrowing: 0.9, glassSurfing: 0, curiosity: 0.9, nocturnal: 0.2, pickRadiusMul: 1.2 },
  specialBehaviors: ['burrow_dig', 'burrow_peek', 'smash_strike', 'eye_track', 'rubble_rearrange', 'glass_tap', 'antennal_scale_flash'],

  encyclopedia: {
    summary: 'A rainbow-armoured crustacean whose clubs smash snail shells with the force of a small-calibre bullet — and which watches you with the strangest eyes on the reef.',
    nativeHabitat: 'Rubble and sand around Indo-Pacific coral reefs, where it digs U-shaped burrows under rock.',
    socialStructure: 'Solitary and fiercely territorial; pairs meet only to mate.',
    tankNeeds: 'A species-only tank (40 gallons or more for an adult) with a deep sand-and-rubble bed for burrowing, rock to dig under, and a lid. Use acrylic or thick glass — strikes have cracked aquarium panes.',
    compatibilityNotes: 'Species-only. It smashes snails, hermit crabs, crabs and shrimp and will ambush fish that rest near its burrow. Never keep two together.',
    breedingOverview: 'The female guards a large egg mass in her burrow for weeks. The planktonic larvae have not been reared for the trade.',
    conservationNote: 'Not assessed by the IUCN. All are wild-caught (some arrive as live-rock hitchhikers), so give it a proper lifelong home.',
    funFact: 'Its club strike is among the fastest movements in the animal kingdom: it hits hard enough to create collapsing cavitation bubbles, so the prey is struck twice — once by the club and once by the bubble.',
    inGameBehavior: 'Excavates and rearranges its burrow, peeks out with swivelling eyes, tracks your finger on the glass, and cracks open snails with an audible pop.',
    feedingNote: 'A hunter that smashes live snails and crabs, and takes thawed krill, mysis or sinking pellets from tongs. Feed every day or two and remove leftovers it drags into its burrow. It eats autofed sinking pellets, but hand-fed meaty food should be most of its diet.',
    keeperTip: 'Keep your fingers out of its reach: a smashing strike can badly bruise or cut a hand. Feed it and move rock with long tongs, and expect it to hit the tongs.',
  },
  sourceReferences: [
    { id: 'mba-peacock-mantis', title: 'Monterey Bay Aquarium — Peacock Mantis Shrimp', url: 'https://www.montereybayaquarium.org/animals/animals-a-to-z/peacock-mantis-shrimp', tier: 1, facts: ['1–7 in', 'Indian and Pacific Oceans', 'territorial and solitary', 'burrows audibly in rock and seabed', 'strikes comparable to a .22 bullet', 'colour discrimination actually low'] },
    { id: 'national-aquarium-peacock-mantis', title: 'National Aquarium — Peacock Mantis Shrimp', url: 'https://aqua.org/explore/animals/peacock-mantis-shrimp', tier: 1, facts: ['2–7 in', 'eats gastropods, crabs and mollusks, prey larger than itself', 'strike 50× faster than a blink', 'at least 12 photoreceptor types', 'not threatened'] },
    { id: 'patek-caldwell-2005', title: 'Patek & Caldwell (2005) Extreme impact and cavitation forces of a biological hammer: strike forces of the peacock mantis shrimp. J. Exp. Biol. 208: 3655', url: 'https://journals.biologists.com/jeb/article/208/19/3655/15838/Extreme-impact-and-cavitation-forces-of-a', tier: 1, facts: ['impact forces 400–1,501 N', 'cavitation forces up to 504 N', 'two force peaks per strike'] },
    { id: 'patek-2004-nature', title: 'Patek, Korff & Caldwell (2004) Deadly strike mechanism of a mantis shrimp. Nature 428: 819–820', url: 'https://scholars.duke.edu/publication/953838', tier: 1, facts: ['saddle-shaped exoskeletal spring stores strike energy', 'cavitation bubbles form at the club'] },
    { id: 'liveaquaria-clown-mantis', title: 'LiveAquaria — Clown Mantis Shrimp (Odontodactylus scyllarus)', url: 'https://www.liveaquaria.com/products/clown-mantis-shrimp', tier: 2, facts: ['species aquarium, housed alone', 'not reef compatible', 'sandy bottom with rubble for a cave', 'max 6 in', '72–78 °F, SG 1.023–1.025', 'price ~$130'] },
    { id: 'brs-mantis-tank', title: 'Bulk Reef Supply — How to Set Up a Mantis Shrimp Tank', url: 'https://www.bulkreefsupply.com/content/post/md-2020-12-how-to-set-up-a-mantis-shrimp-tank', tier: 2, facts: ['10 gal minimum for one peacock', 'documented breaking glass, rarely targets walls', 'deep mixed-grain substrate and rubble', 'should not be kept with other animals'] },
    { id: 'aquariumbreeder-mantis', title: 'Shrimp and Snail Breeder — Peacock Mantis Shrimp as a Pet', url: 'https://aquariumbreeder.com/mantis-shrimp-as-an-aquarium-pet-care-guide/', tier: 3, facts: ['acrylic preferred; smashers can chip glass', 'female carries eggs ~5–6 weeks', '22–26 °C', 'lifespan several years'] },
  ],
  confidenceNotes: [
    'Tank size conflict: BRS says 10 gal; other guides 20+ gal. The game conservatively uses 40 gal for a 15 cm adult with a deep burrow bed.',
    'Glass damage: BRS and hobby guides report cracked/chipped glass but say it is rare — flagged as glassStrikeRisk (a warning, not an event certainty).',
    'Colour vision: older claims of "super colour vision" are outdated; MBA notes their colour discrimination is actually poor despite 12+ photoreceptor types (Thoen et al. 2014).',
    'Breeding values (egg mass size, brooding time) are approximate and the species is excluded from breeding (not_in_game).',
  ],
  exceptionRules: [
    { other: 'tag:snail', verdictFloor: 'incompatible', reason: 'Peacock mantis shrimp smash snails open — exactly what their clubs evolved for.', incidentRisk: 0.5 },
    { other: 'tag:crustacean', verdictFloor: 'incompatible', reason: 'Crabs, hermit crabs and shrimp are staple prey; shells offer no protection.', incidentRisk: 0.5 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'Small fish that rest near the rockwork are ambushed and killed.', incidentRisk: 0.3 },
    { other: 'tag:fish_benthic', verdictFloor: 'incompatible', reason: 'Bottom-resting fish such as gobies and dragonets are easy targets for a burrowing mantis.', incidentRisk: 0.35 },
    { other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Mid-sized fish can be struck at night or when they come too close to the burrow. A mantis is best kept alone.', incidentRisk: 0.12 },
    { other: 'tag:fish_large', verdictFloor: 'high_risk', reason: 'Too big to eat, but large fish may harass the mantis or be struck by it. This is a species-only animal.', incidentRisk: 0.04 },
  ],
  special: {
    burrower: true,
    speciesOnly: true,
    glassStrikeRisk: true,
    medicationSensitive: true,
  },
  visualLane: 'special',
};
