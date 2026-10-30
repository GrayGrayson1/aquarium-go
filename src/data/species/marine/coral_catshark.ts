import type { SpeciesDefinition } from '@/types';
import { intensityLocus, intensityOverlay } from './_shared';
import { sharkRules } from './_sharks';

/**
 * Coral catshark — Atelomycterus marmoratus. Lane species-marine, chunk 17 (ADR-0053).
 * Sources, key facts and conflicts: docs/research/marine.md#coral-catshark
 * A slim, black-and-white-spotted bottom shark that wedges into the same crevice every day and hunts at night. Lays
 * leathery egg cases loose on the sand (egg_case). No trade forms: the spotting varies from shark to shark.
 */
export const coralCatshark: SpeciesDefinition = {
  id: 'coral_catshark',
  commonName: 'Coral Catshark',
  scientificName: 'Atelomycterus marmoratus',
  category: 'fish',
  group: 'shark',
  genus: 'Atelomycterus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'The Indo-West Pacific, from Pakistan and India to Southeast Asia, southern China, the Philippines and New Guinea, on shallow coral reefs',
  isStarter: false,

  // FishBase 70 cm TL max; Quality Marine almost 28 in
  adultSizeCm: 70,
  // retail 180–300 gal (Quality Marine, Chewy); Hövel 2010: a tank at least 3 m long, and an adult needs its own length
  // front to back to turn → the 500
  recommendedMinTankGallons: 500,
  recommendedFootprint: { minLengthIn: 118, minWidthIn: 30 },
  activeSwimmer: false,
  bioload: 6,

  tempC: { min: 22, max: 29, idealMin: 24, idealMax: 27 },
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.021, idealMax: 1.025 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['seafood', 'pellet_large', 'mysis'],
  feedingStyle: 'target_fed',
  feedingSpeed: 0.4,
  feedingAggression: 0.45,
  // public-aquarium sharks are fed two or three times a week (Choosri 2023)
  hungerHours: 48,

  activityZone: ['bottom', 'substrate'],
  temperament: 'predatory',
  territoriality: 0.35,
  aggression: 0.35,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.04, note: 'Fine alone, or as a pair in a big tank: Cologne Zoo kept one male with three females.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Two males compete for caves and females.' },

  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'eggs'],
  // a grown shark is nobody's prey; its young are, through the groupers' and triggers' rules
  preyTags: ['fish_large'],
  // judgement: a small mouth, about a tenth of its length
  maxLikelyPreySizeCm: 8,

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',
  coralRisk: 0.1,
  anemoneRelationship: 'neutral',

  // "deep hiding places" (Hövel 2010)
  hidesNeeded: 3,
  coverPreference: 0.4,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['gravel', 'fine_gravel', 'large_pebbles'], note: 'Soft sand only (coarse grit scratches its belly), and rockwork set on the glass so it can’t tumble.' },

  breeding: {
    system: 'egg_case',
    difficulty: 0.65,
    // real age at maturity undocumented (several years) → the game's cap
    maturityDays: 25,
    // one case from each oviduct (FishBase), laid in pairs
    clutchSize: { min: 1, max: 2 },
    // 120 real days × 8: 76 days at 25 °C (Choosri 2023, three eggs), 4–6 months at 26 °C (Hövel 2010)
    incubationHours: 960,
    fryRearingHours: 56,
    // the laying interval is undocumented; about two weeks is assumed (≈ 5 game days)
    cooldownDays: 5,
    conditions: { minTempC: 24, maxTempC: 28, needsPartner: true, minTankGallons: 500 },
    // Osaka Kaiyukan: other fish eat about half the egg cases in a mixed tank
    predationWithoutNursery: 0.5,
    nurseryRequired: false,
    maxRaisedPerClutch: 2,
    notes: 'Females lay one or two slim leathery cases, each with two pinched “waists” and short tendrils, loose on the sand at night. No parental care. A case hatches after about four months as a 10 cm barred miniature of its parents.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  // up to 20 years (Michael 2004) → the game's cap; hatchlings 9–13 cm (Choosri 2023, Hövel 2010); claspers show on
  // young males close up
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 10 },

  hardiness: 0.7,
  difficulty: 'advanced',
  // "Marble shark" $601 (aquariumfish.com), £195–250 (UK), CA$500: about $350 (the US "$177 cat shark" listings are
  // bamboo sharks)
  baseValue: 350,
  rarity: 'rare',
  visitorAppeal: 0.9,
  unlock: { requires: ['marine_basics', 'elasmobranchs'] },
  captiveBredAvailable: false,
  wildCaughtNote: 'Wild-collected in Southeast Asia; zoo-bred young go to other zoos. Indonesian ones may be a look-alike catshark.',
  conservation: { status: 'Near Threatened (IUCN Red List, assessed 2020)', note: 'Caught as bycatch by reef fishers and harmed by blast fishing and coral mining.' },

  genetics: {
    loci: [intensityLocus('No colour forms; the spotting varies a great deal from shark to shark.')],
    phenotypes: [
      { id: 'wild', name: 'Coral Catshark', layer: 'base', rarity: 0, when: [], visual: {} },
      intensityOverlay({ accentColor: '#080808', patternContrast: 1 }),
    ],
    baseVisual: {
      bodyColor: '#5f5a54',
      bodyColor2: '#46423d',
      bellyColor: '#ece8e0',
      finColor: '#57524c',
      finColor2: '#f3f1ec',
      accentColor: '#151413',
      eyeColor: '#c9b98a',
      pattern: 'speckled',
      patternScale: 0.6,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0,
      metallic: 0,
      translucency: 0,
      finType: 'shark_benthic',
      finLength: 1,
      bodyDepth: 0.85,
      gillFullness: 0,
    },
    variation: 0.2,
    notes: 'Colour slots for the shark art: body = the grey-brown back; accent = the black spots and dashes, fin2 = the white spots and the white tips of both dorsal fins; belly = the white underside. A slim, eel-like shark with two dorsal fins set far back. Hatchlings are barred light and dark.',
  },
  visualMorphs: ['Coral Catshark'],

  behaviorSet: 'benthic_shark',
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 3.5, turnRate: 2.4, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 0.85, hitching: 0, burrowing: 0.05, glassSurfing: 0.03, curiosity: 0.3, nocturnal: 0.85, pickRadiusMul: 1.4 },
  specialBehaviors: ['crevice_rest', 'same_refuge_return', 'dusk_patrol', 'still_lunge', 'eel_glide', 'tong_feed_learned'],

  encyclopedia: {
    summary: 'A slim bottom shark covered in black and white spots that wedges into the same crevice every day and comes out to hunt at night.',
    nativeHabitat: 'Shallow coral reefs from India to the Philippines and New Guinea, where it hides in holes and crevices by day.',
    socialStructure: 'Lives alone or shares a refuge; two males compete for caves and females.',
    tankNeeds: 'A ten-foot tank of 500 gallons with soft sand, deep caves, rockwork set on the glass, a tight lid and strong filtration. Never copper or most medicines: quarantine every tankmate first.',
    compatibilityNotes: 'Eats every crab, shrimp and small fish, mostly at night. Good with tangs and other peaceful mid-water fish; never triggerfish, puffers or large angelfish, which pick at it.',
    breedingOverview: 'Lays one or two leathery egg cases on the sand; each hatches after about four months as a 10 cm barred shark. A female without a male lays empty cases.',
    conservationNote: 'Near Threatened (IUCN 2020): caught as bycatch on reefs and hurt by blast fishing.',
    funFact: 'It goes back to the same hiding place day after day, and hatchlings are striped until about three months old.',
    inGameBehavior: 'Lies wedged in a crevice by day, patrols the floor at dusk and lunges at food that lands near its head.',
    feedingNote: 'Bite-size frozen seafood two or three times a week from tongs or dropped by its head; it finds food slowly, by smell.',
    keeperTip: 'Sharks need iodine and vitamins in their food: real keepers soak the seafood in a shark supplement.',
  },
  sourceReferences: [
    { id: 'fishbase-atelomycterus-marmoratus', title: 'FishBase — Atelomycterus marmoratus (Coral catshark)', url: 'https://www.fishbase.se/summary/Atelomycterus-marmoratus.html', tier: 1, facts: ['70 cm TL max', 'uses crevices and holes on reefs', 'one egg case per oviduct', 'IUCN Near Threatened (2020)'] },
    { id: 'bor-2003-atelomycterus', title: 'Bor, van Oijen & Magenta 2003 — Egg capsules of Atelomycterus marmoratus (Zoologische Mededelingen 77)', url: 'https://repository.naturalis.nl/document/44279', tier: 1, facts: ['capsules 50–79 × 18–23 mm with two constricted waists and short tendrils', 'laid by captive females at Liège and São Paulo'] },
    { id: 'choosri-2023-catshark', title: 'Choosri et al. 2023 — Embryonic development of the coral catshark (Rambhai Barni Rajabhat Agric. J. 1)', url: 'https://ph03.tci-thaijo.org/index.php/kaset_rbruj/article/download/457/331/2257', tier: 1, facts: ['hatched in 76 days at 25 °C', 'hatchling 9.2 cm', 'striped pigment at days 70–75', 'broodstock fed twice a week'] },
    { id: 'wikipedia-coral-catshark', title: 'Wikipedia — Coral catshark (citing Hövel et al. 2010, Michael 2004, Compagno 1984)', url: 'https://en.wikipedia.org/wiki/Coral_catshark', tier: 3, facts: ['Cologne Zoo group: a tank at least 3 m long with deep hiding places', 'returns to the same refuge', 'hatch after 4–6 months at 26 °C at 10–13 cm', 'up to 20 years', 'may attack tankmates'] },
    { id: 'qualitymarine-coral-catshark', title: 'Quality Marine — Coral Cat Shark', url: 'https://www.qualitymarine.com/quality-marine/fish/sharks/atelomycterus/coral-cat-marmoratus-29015/', tier: 2, facts: ['180 gal minimum', '72–78 °F, SG 1.020–1.025, pH 8.1–8.4', 'fine sand and caves', 'sensitive to copper'] },
    { id: 'chewy-saltwater-sharks', title: 'Chewy Education — 7 ideal sharks for the saltwater aquarium (Dr Jessie Sanders, DVM)', url: 'https://www.chewy.com/education/fish/saltwater-fish/7-ideal-sharks-for-the-saltwater-aquarium', tier: 2, facts: ['200 gal, 300+ ideal', 'good tankmates: tangs, damsels, anthias', 'avoid triggers, puffers and large angels'] },
    { id: 'qualitymarine-shark-eggs', title: 'Quality Marine — Shark Eggs Part II', url: 'https://www.qualitymarine.com/news/shark-eggs-part-ii/', tier: 2, facts: ['eggs candled with a torch', 'hatchlings may not eat for a week', 'never let air into an egg case'] },
  ],
  confidenceNotes: [
    'Incubation: 76 days at 25 °C in a three-egg trial against 4–6 months at 26 °C at Cologne Zoo; the game uses 120 days.',
    'The laying interval is undocumented: about two weeks is assumed.',
    'Trade “cat sharks” are mostly bamboo sharks; only the “marble shark” and coral catshark listings are this species.',
  ],
  exceptionRules: sharkRules({ crushesShells: false }),
  special: { escapeArtist: true, medicationSensitive: true, outgrowsSmallTanks: true, heavyWaste: true, needsSinkingFood: true },
  visualLane: 'fish',
};
