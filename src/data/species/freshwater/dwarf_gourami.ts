import type { SpeciesDefinition } from '@/types';
import { ladderRules } from './_genetics';

/**
 * Dwarf gourami — Trichogaster lalius. Lane species-fw, chunk 16 (ADR-0052).
 * Sources, key facts and conflicts: docs/research/freshwater.md#dwarf-gourami
 * Phenotypes describe the MALE; the art draws females silvery grey-blue with faint bars.
 */
export const dwarfGourami: SpeciesDefinition = {
  id: 'dwarf_gourami',
  commonName: 'Dwarf Gourami',
  scientificName: 'Trichogaster lalius',
  category: 'fish',
  group: 'labyrinth_fish',
  genus: 'Trichogaster',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'],
  nativeRegion: 'Pakistan, northern India and Bangladesh — sluggish, heavily planted ponds, swamps, rice fields and canals',
  isStarter: false,

  // Aquarium fish about 5–8 cm (IUCN text 5 cm; Aquarium Co-Op 8 cm; FishBase 9.5 cm TL maximum).
  adultSizeCm: 7,
  // Seriously Fish 60×30 cm (~15 gal) for a pair; Aquarium Co-Op and LiveAquaria 10 gal.
  recommendedMinTankGallons: 15,
  recommendedFootprint: { minLengthIn: 24, minWidthIn: 12 },
  activeSwimmer: false,
  bioload: 1,

  // FishBase 25–28 °C, Seriously Fish 22–27 °C, Aquarium Co-Op 22–28 °C; pH 6.0–8.0; 2–18 dGH; LiveAquaria dKH 4–10.
  tempC: { min: 22, max: 29, idealMin: 24, idealMax: 28 },
  pH: { min: 6, max: 8, idealMin: 6.5, idealMax: 7.5 },
  salinitySG: null,
  gh: { min: 2, max: 18 },
  kh: { min: 4, max: 10 },

  flowPreference: 'very_low',
  lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'bloodworm', 'daphnia', 'brine_shrimp', 'biofilm'],
  feedingStyle: 'surface',
  feedingSpeed: 0.4,
  feedingAggression: 0.3,
  hungerHours: 16,

  activityZone: ['upper', 'middle', 'surface'],
  temperament: 'semi_aggressive',
  territoriality: 0.55,
  aggression: 0.25,
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, note: 'One male as a centrepiece, or a male with a female in a bigger tank; two males fight.' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'ok', mixed: 'harassment', juvenile: 'ok', note: 'Males are territorial bullies with each other and can harass females, especially while nesting.' },

  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'shrimp_dwarf', 'copepod'],
  preyTags: ['fish_medium', 'fish_slow'],
  maxLikelyPreySizeCm: 1,

  shrimpSafe: 'caution',
  snailSafe: 'safe',
  frySafe: 'caution',
  plantSafe: 'safe',
  reefSafe: 'safe',
  coralRisk: 0,
  anemoneRelationship: 'not_applicable',

  hidesNeeded: 1,
  coverPreference: 0.75,
  substrateRules: { preferred: ['planted_soil', 'sand', 'fine_gravel', 'fine_sand'], avoid: [], note: 'Heavy planting and floating plants — it builds its bubble nest among them and hides there when shy.' },

  breeding: {
    system: 'bubble_nest',
    difficulty: 0.45,
    maturityDays: 12,
    clutchSize: { min: 300, max: 700 },
    incubationHours: 8,
    fryRearingHours: 110,
    cooldownDays: 8,
    conditions: { needsPartner: true, needsSurfaceCalm: true, needsCover: true, minTempC: 26, needsConditioningFood: ['bloodworm', 'brine_shrimp', 'daphnia'], minTankGallons: 10 },
    predationWithoutNursery: 0.75,
    nurseryRequired: true,
    maxRaisedPerClutch: 10,
    notes: 'The male builds a floating bubble nest woven with plant bits, spawns with the female beneath it and guards the floating eggs (about 600) alone; the female should then be moved. The eggs hatch in 12–36 hours and the fry leave the nest about three days later, when the male should be moved too. The fry are tiny and need infusoria for a week, then baby brine shrimp; breeders lower the water to 15–20 cm at 27–28 °C under a tight lid.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male',
  // 2–4 years (Aquarium Co-Op; Wikipedia 4–6) → ~140 game-days.
  lifecycle: { juvenileDays: 12, adultDays: 14, lifespanDays: 140, sexVisibleAtDays: 10, hatchSizeCm: 0.15 },

  hardiness: 0.55,
  difficulty: 'intermediate',
  baseValue: 9,
  rarity: 'common',
  visitorAppeal: 0.75,
  unlock: { requires: [] },
  captiveBredAvailable: true,
  wildCaughtNote: 'Every fish sold is farm-bred; many imports carry the untreatable dwarf gourami iridovirus, so quarantine new fish.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2010)', note: 'Least Concern; feral populations exist in the USA, Colombia and Singapore. Never release aquarium fish.' },

  genetics: {
    loci: [
      {
        id: 'color',
        name: 'Colour form',
        mode: 'mendelian',
        alleles: [
          { id: 'W', name: 'Wild (red and blue)', dominance: 4, frequency: 0.35 },
          { id: 'N', name: 'Neon blue', dominance: 3, frequency: 0.1 },
          { id: 'P', name: 'Powder blue', dominance: 2, frequency: 0.3 },
          { id: 'F', name: 'Flame', dominance: 1, frequency: 0.25 },
        ],
        note: 'Powder blue, neon (cobalt) and flame (red) are line-bred farm strains of the one species; their inheritance is unpublished, so they are simplified to a ladder that keeps stock a mix of the four.',
      },
    ],
    phenotypes: [
      ...ladderRules('color', 'base', [
        { allele: 'W', id: 'wild', name: 'Wild Dwarf Gourami', rarity: 0, visual: {} },
        { allele: 'N', id: 'neon', name: 'Neon Blue', rarity: 0.2, visual: { bodyColor: '#1f8fe5', bodyColor2: '#1a70c8', bellyColor: '#5aa8e8', finColor: '#c8503a', finColor2: '#40b8f0', accentColor: '#d8402a', patternContrast: 0.25, iridescence: 0.8 } },
        { allele: 'P', id: 'powder_blue', name: 'Powder Blue', rarity: 0.1, visual: { bodyColor: '#5da9e9', bodyColor2: '#4a90d0', bellyColor: '#8ac0ec', finColor: '#4a90d8', finColor2: '#7ac8f0', accentColor: '#4f9ae0', patternContrast: 0.2 }, note: 'All light blue, without the red bars.' },
        { allele: 'F', id: 'flame', name: 'Flame', rarity: 0.15, recessive: true, visual: { bodyColor: '#f04a1e', bodyColor2: '#d8341a', bellyColor: '#f0802a', finColor: '#2f8fd8', finColor2: '#3aa0e8', accentColor: '#c8301a', patternContrast: 0.4 }, note: 'Red-orange body with iridescent blue fins.' },
      ]),
      { id: 'fallback', name: 'Wild Dwarf Gourami', layer: 'base', rarity: 0, when: [], visual: {} },
    ],
    baseVisual: {
      bodyColor: '#3c6fb4',
      bodyColor2: '#2c5a98',
      bellyColor: '#6a8ac0',
      finColor: '#d0603a',
      finColor2: '#3aa0d8',
      accentColor: '#e0452b',
      eyeColor: '#2a1810',
      pattern: 'bars',
      patternScale: 1,
      patternContrast: 0.85,
      patternSeed: 0,
      iridescence: 0.55,
      metallic: 0.25,
      translucency: 0.25,
      finType: 'gourami',
      finLength: 1,
      bodyDepth: 1,
      gillFullness: 0,
    },
    variation: 0.18,
    notes: 'Male colours shown. Wild males are steel blue (body) with slanting red-orange bars (accent) running into the fins; the fins are orange with red spots (fin) edged blue (fin2), which is also the turquoise throat. Powder blue loses the red bars, neon is an intense cobalt with fewer bars, flame is red-orange with blue fins. Females are silvery and plain (drawn by the art).',
  },
  visualMorphs: ['Wild Dwarf Gourami', 'Powder Blue', 'Flame', 'Neon Blue'],

  behaviorSet: 'gourami',
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 5, turnRate: 2.5, hoverTendency: 0.6, schoolingTightness: 0, restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.55, nocturnal: 0 },
  specialBehaviors: ['surface_breathe', 'feeler_touch', 'bubble_nest', 'breeding_colour', 'hover', 'territory_guard'],

  encyclopedia: {
    summary: 'A small, jewel-bright gourami: males in slanting bars of red and turquoise, probing everything with thread-like feelers.',
    nativeHabitat: 'Sluggish, heavily planted ponds, swamps, rice fields and canals of Pakistan, northern India and Bangladesh.',
    socialStructure: 'Males are territorial: keep one male, alone or with a female in a larger tank.',
    tankNeeds: 'A planted tank of 15 gallons or more at 24–28 °C, with floating plants, very gentle flow and a calm surface to breathe from.',
    compatibilityNotes: 'Good with small, peaceful fish that don’t nip, but males bully other gouramis, bettas and showy fish like guppies. Eats shrimplets and sometimes small shrimp.',
    breedingOverview: 'The male builds a bubble nest among floating plants and guards the eggs and young alone.',
    conservationNote: 'Least Concern (IUCN 2010). All trade fish are farm-bred.',
    funFact: 'In old Calcutta they were sold alive in bottles of water — an air-breather can live where other fish can’t.',
    inGameBehavior: 'Drifts slowly near the surface, touching plants and fish with its feelers and gulping air; a male guards the patch around his nest.',
    feedingNote: 'A slow surface feeder: small flake or floating pellets once or twice a day, with frozen bloodworm, daphnia or brine shrimp a few times a week. An autofeeder with flake suits it.',
    keeperTip: 'Quarantine new dwarf gouramis for a few weeks or buy locally bred ones — carriers of the iridovirus can look perfectly healthy.',
  },
  sourceReferences: [
    { id: 'fishbase-trichogaster-lalius', title: 'FishBase — Trichogaster lalius (Dwarf gourami)', url: 'https://www.fishbase.se/summary/Trichogaster-lalius.html', tier: 1, facts: ['9.5 cm TL', '25–28 °C, pH 6.0–8.0', 'about 600 floating eggs', 'hatch 12–24 h', 'IUCN Least Concern (2010)', '2022 synonymy note'] },
    { id: 'usfws-erss-dwarf-gourami', title: 'USFWS — Ecological Risk Screening Summary: Dwarf Gourami', url: 'https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Dwarf-Gourami.pdf', tier: 1, facts: ['male colours (Dorn 1916)', 'DGIV in imports', 'sold in bottles in Calcutta'] },
    { id: 'seriouslyfish-trichogaster-lalius', title: 'Seriously Fish — Trichogaster lalius', url: 'https://www.seriouslyfish.com/species/trichogaster-lalius/', tier: 2, facts: ['60×30×30 cm for a pair', '22–27 °C', 'two males fight', 'bubble nest up to 700 eggs', 'DGIV untreatable', 'colour forms'] },
    { id: 'aquariumcoop-dwarf-gourami', title: 'Aquarium Co-Op — Dwarf gourami', url: 'https://www.aquariumcoop.com/blogs/aquarium/dwarf-gourami', tier: 2, facts: ['10 gal', 'males are territorial bullies', 'eats cherry shrimp', 'powder blue, flame', '2–4 years'] },
    { id: 'pfk-dwarf-gourami', title: 'Practical Fishkeeping — Let’s hear it for the dwarf gourami', url: 'https://www.practicalfishkeeping.co.uk/features/lets-hear-it-for-the-dwarf-gourami/', tier: 2, facts: ['DGIV invariably fatal', 'swims at all levels'] },
  ],
  confidenceNotes: [
    'Its scientific name is disputed: Catalog of Fishes and FishBase have treated it as Trichogaster fasciata since 2022, others keep T. lalius; the game uses T. lalius.',
    'Colour-form inheritance is unpublished; the ladder is a playable simplification.',
    'Sources disagree on shrimp: Seriously Fish lists cherry shrimp as tankmates, Aquarium Co-Op says it eats them; the game says caution.',
    'Lifespan: 2–4 years (Aquarium Co-Op) against 4–6 (Wikipedia).',
  ],
  exceptionRules: [
    { other: 'betta', verdictFloor: 'high_risk', reason: 'Two territorial labyrinth fish that claim the surface: a male betta and a dwarf gourami often fight.', incidentRisk: 0.12, mitigatedBy: ['tank_size', 'sight_breaks'] },
    { other: 'honey_gourami', verdictFloor: 'conditional', reason: 'A male dwarf gourami bullies other gouramis.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks', 'cover'] },
    { other: 'fancy_guppy', verdictFloor: 'conditional', reason: 'Dwarf gourami males can pick on showy, colourful fish like male guppies.', incidentRisk: 0.04, mitigatedBy: ['tank_size', 'sight_breaks'] },
  ],
  special: { airBreather: true },
  visualLane: 'fish',
};
