/**
 * Personality: species-appropriate tags correlated with the temperament/curiosity potentials, and the behaviour
 * modifiers the AI lane uses. OWNER: lane "lifecycle".
 *
 * A shy betta and a bold betta still both behave like bettas: tags only shift behaviour within species limits.
 */
import type { Creature, Genome, PersonalityTag, SpeciesDefinition } from '@/types';
import type { Rng } from '../rng';
import { findSpecies } from '@/data/species';

export const ALL_TAGS: PersonalityTag[] = [
  'bold',
  'shy',
  'explorer',
  'food_obsessed',
  'glass_curious',
  'nest_builder',
  'homebody',
  'social',
  'solitary',
  'night_owl',
  'showoff',
  'easily_startled',
  'patient_feeder',
  'competitive_feeder',
  'decor_inspector',
];

/** Allowed tags per behaviour set (species boundaries). */
const BY_BEHAVIOR: Partial<Record<string, PersonalityTag[]>> = {
  axolotl: ['homebody', 'food_obsessed', 'glass_curious', 'night_owl', 'patient_feeder', 'decor_inspector', 'bold', 'shy', 'explorer', 'easily_startled'],
  betta: ['showoff', 'glass_curious', 'nest_builder', 'bold', 'shy', 'explorer', 'food_obsessed', 'decor_inspector', 'homebody', 'competitive_feeder', 'patient_feeder'],
  pea_puffer: ['explorer', 'glass_curious', 'food_obsessed', 'bold', 'shy', 'decor_inspector', 'competitive_feeder', 'easily_startled', 'homebody'],
  clownfish: ['bold', 'shy', 'homebody', 'glass_curious', 'explorer', 'food_obsessed', 'competitive_feeder', 'nest_builder', 'social', 'showoff'],
  seahorse: ['homebody', 'patient_feeder', 'glass_curious', 'shy', 'explorer', 'social', 'decor_inspector', 'easily_startled', 'bold', 'food_obsessed'],
  shrimp_dwarf: ['bold', 'shy', 'explorer', 'food_obsessed', 'homebody', 'decor_inspector'],
  shrimp_cleaner: ['bold', 'shy', 'explorer', 'food_obsessed', 'homebody', 'glass_curious', 'night_owl'],
  snail: ['explorer', 'homebody', 'food_obsessed', 'night_owl', 'decor_inspector', 'shy'],
  hermit_crab: ['explorer', 'homebody', 'food_obsessed', 'night_owl', 'decor_inspector', 'bold', 'shy'],
  crayfish: ['bold', 'shy', 'explorer', 'food_obsessed', 'homebody', 'night_owl', 'decor_inspector', 'competitive_feeder'],
  sessile: ['homebody', 'night_owl'],
  schooling_small: ['social', 'bold', 'shy', 'explorer', 'food_obsessed', 'easily_startled', 'competitive_feeder', 'patient_feeder', 'glass_curious'],
  chromis: ['social', 'bold', 'shy', 'explorer', 'food_obsessed', 'easily_startled', 'competitive_feeder', 'glass_curious'],
  livebearer: ['social', 'bold', 'shy', 'explorer', 'food_obsessed', 'competitive_feeder', 'showoff', 'glass_curious'],
  surface_dweller: ['social', 'explorer', 'bold', 'shy', 'food_obsessed', 'glass_curious', 'easily_startled'],
  bottom_forager: ['social', 'explorer', 'food_obsessed', 'shy', 'bold', 'patient_feeder', 'decor_inspector', 'night_owl'],
  algae_grazer: ['homebody', 'shy', 'explorer', 'night_owl', 'decor_inspector', 'food_obsessed', 'bold'],
  loach_eel: ['shy', 'night_owl', 'homebody', 'explorer', 'social', 'decor_inspector', 'food_obsessed'],
  hillstream: ['explorer', 'homebody', 'food_obsessed', 'bold', 'shy', 'decor_inspector', 'glass_curious'],
  gourami: ['showoff', 'nest_builder', 'shy', 'bold', 'glass_curious', 'explorer', 'patient_feeder', 'food_obsessed', 'social'],
  frog_aquatic: ['food_obsessed', 'homebody', 'bold', 'shy', 'explorer', 'social', 'patient_feeder', 'night_owl'],
  goldfish: ['food_obsessed', 'glass_curious', 'social', 'bold', 'explorer', 'competitive_feeder', 'showoff', 'decor_inspector'],
  cichlid_discus: ['shy', 'bold', 'social', 'showoff', 'nest_builder', 'patient_feeder', 'glass_curious', 'easily_startled', 'food_obsessed'],
  reef_basslet: ['homebody', 'bold', 'shy', 'showoff', 'nest_builder', 'glass_curious', 'explorer'],
  dartfish: ['shy', 'easily_startled', 'homebody', 'social', 'patient_feeder', 'bold', 'explorer'],
  goby_burrow: ['homebody', 'bold', 'shy', 'glass_curious', 'decor_inspector', 'nest_builder'],
  goby_perch: ['homebody', 'shy', 'bold', 'patient_feeder'],
  cardinal_hover: ['social', 'homebody', 'patient_feeder', 'shy', 'bold', 'night_owl'],
  tang: ['explorer', 'bold', 'competitive_feeder', 'food_obsessed', 'showoff', 'glass_curious', 'social'],
  angelfish_dwarf: ['bold', 'shy', 'explorer', 'decor_inspector', 'showoff', 'glass_curious', 'food_obsessed', 'homebody'],
  rabbitfish: ['shy', 'easily_startled', 'food_obsessed', 'explorer', 'homebody', 'bold'],
  dragonet: ['patient_feeder', 'shy', 'explorer', 'homebody', 'decor_inspector', 'showoff'],
  mantis_shrimp: ['bold', 'glass_curious', 'homebody', 'food_obsessed', 'explorer', 'decor_inspector', 'night_owl'],
  lionfish: ['bold', 'homebody', 'glass_curious', 'food_obsessed', 'patient_feeder', 'showoff', 'night_owl'],
  grouper: ['bold', 'food_obsessed', 'glass_curious', 'homebody', 'competitive_feeder', 'explorer'],
};

/** Pairs that can never appear together on one individual. */
const EXCLUSIVE: [PersonalityTag, PersonalityTag][] = [
  ['bold', 'shy'],
  ['bold', 'easily_startled'],
  ['showoff', 'shy'],
  ['social', 'solitary'],
  ['explorer', 'homebody'],
  ['patient_feeder', 'competitive_feeder'],
  ['patient_feeder', 'food_obsessed'],
];

export function excludes(a: PersonalityTag, b: PersonalityTag): boolean {
  return EXCLUSIVE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Tags this species can ever carry (species boundaries + generic biology filters). */
export function allowedTags(species: SpeciesDefinition): PersonalityTag[] {
  const cat = species.category;
  let base = BY_BEHAVIOR[species.behaviorSet];
  if (!base) {
    if (cat === 'coral' || cat === 'anemone') base = ['homebody', 'night_owl'];
    else if (cat === 'invertebrate') base = ['bold', 'shy', 'explorer', 'food_obsessed', 'homebody', 'decor_inspector'];
    else base = ALL_TAGS;
  }
  const social = species.social.kind;
  return base.filter((t) => {
    if (t === 'social' && (social === 'solitary' || social === 'solitary_or_pair')) return false;
    if (t === 'solitary' && (social === 'school' || social === 'shoal' || social === 'colony' || social === 'group')) return false;
    // Slow/target-fed animals never out-compete others at feeding time.
    if (t === 'competitive_feeder' && (species.feedingSpeed < 0.25 || species.feedingStyle === 'target_fed' || species.behaviorSet === 'seahorse')) return false;
    if (t === 'night_owl' && species.behaviorTraits.nocturnal < 0.15 && !BY_BEHAVIOR[species.behaviorSet]?.includes('night_owl')) return false;
    return true;
  });
}

/** Hard correlation gates with the heritable tendencies (temperament t, curiosity c; 0..100). */
function gateOk(tag: PersonalityTag, t: number, c: number): boolean {
  switch (tag) {
    case 'bold':
      return t >= 50;
    case 'showoff':
      return t >= 45;
    case 'competitive_feeder':
      return t >= 40;
    case 'shy':
      return t <= 50;
    case 'easily_startled':
      return t <= 55;
    case 'patient_feeder':
      return t <= 65;
    case 'explorer':
      return c >= 45;
    case 'glass_curious':
      return c >= 45;
    case 'decor_inspector':
      return c >= 40;
    case 'homebody':
      return c <= 60;
    default:
      return true;
  }
}

function tagWeight(tag: PersonalityTag, t: number, c: number, species: SpeciesDefinition): number {
  const tn = t / 50; // 0..2
  const cn = c / 50;
  switch (tag) {
    case 'bold':
      return tn * tn;
    case 'shy':
      return (2 - tn) * (2 - tn);
    case 'easily_startled':
      return Math.pow(2 - tn, 1.5) * 0.8;
    case 'showoff':
      return tn * 1.1 * (0.5 + species.territoriality);
    case 'competitive_feeder':
      return tn * (0.4 + species.feedingSpeed);
    case 'patient_feeder':
      return (2 - tn) * (1.2 - species.feedingSpeed * 0.8);
    case 'explorer':
      return cn * cn;
    case 'glass_curious':
      return cn * (0.4 + species.behaviorTraits.curiosity) * (0.6 + tn * 0.3);
    case 'decor_inspector':
      return cn * 0.8;
    case 'homebody':
      return (2 - cn) * (0.6 + species.territoriality);
    case 'night_owl':
      return 0.4 + species.behaviorTraits.nocturnal * 1.5;
    case 'nest_builder':
      return species.breeding.conditions.needsNestSite || species.breeding.system === 'bubble_nest' ? 1 : 0.4;
    case 'social':
      return species.social.idealGroup > 1 ? 1.1 : 0.6;
    case 'food_obsessed':
      return 0.9;
    default:
      return 0.7;
  }
}

/** Roll 1–3 species-appropriate personality tags, correlated with temperament/curiosity. */
export function rollPersonalityTags(species: SpeciesDefinition, genome: Genome, rng: Rng): PersonalityTag[] {
  const t = genome.potentials?.temperament ?? 50;
  const c = genome.potentials?.curiosity ?? 50;
  const allowed = allowedTags(species);
  const r = rng.next();
  const want = allowed.length <= 2 ? 1 : r < 0.3 ? 1 : r < 0.8 ? 2 : 3;
  const out: PersonalityTag[] = [];
  let pool = allowed.filter((tag) => gateOk(tag, t, c));
  if (!pool.length) pool = allowed.slice();
  for (let i = 0; i < want && pool.length; i++) {
    const tag = rng.weighted(pool, (x) => Math.max(0.01, tagWeight(x, t, c, species)));
    out.push(tag);
    pool = pool.filter((x) => x !== tag && !excludes(x, tag));
  }
  if (!out.length) out.push(allowed[0] ?? 'homebody');
  return out;
}

/** Behaviour modifiers derived from personality + potentials (0..1). The AI lane consumes these. */
export interface PersonalityModifiersShape {
  boldness: number;
  curiosity: number;
  activity: number;
  sociability: number;
  feedingDrive: number;
  startle: number;
  nocturnal: number;
  displayDrive: number;
}

const c01 = (v: number) => (Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0.5);

export function computePersonalityModifiers(c: Pick<Creature, 'speciesId' | 'personality' | 'genome'>): PersonalityModifiersShape {
  const sp = findSpecies(c.speciesId);
  const tags = new Set(c.personality ?? []);
  const has = (t: PersonalityTag) => (tags.has(t) ? 1 : 0);
  const t = (c.genome?.potentials?.temperament ?? 50) / 100;
  const cu = (c.genome?.potentials?.curiosity ?? 50) / 100;
  const spCur = sp?.behaviorTraits.curiosity ?? 0.5;
  const spNoc = sp?.behaviorTraits.nocturnal ?? 0;
  const terr = sp?.territoriality ?? 0.3;
  const idealGroup = sp?.social.idealGroup ?? 1;
  const boldness = 0.15 + 0.7 * t + 0.2 * has('bold') - 0.25 * has('shy') - 0.1 * has('easily_startled') + 0.08 * has('showoff') + 0.05 * has('glass_curious');
  const curiosity = 0.5 * spCur + 0.5 * cu + 0.15 * has('explorer') + 0.2 * has('glass_curious') + 0.1 * has('decor_inspector') - 0.15 * has('homebody') - 0.05 * has('shy');
  const activity = 0.45 + (cu - 0.5) * 0.3 + (t - 0.5) * 0.1 + 0.15 * has('explorer') - 0.15 * has('homebody') + 0.05 * has('showoff');
  const sociability = (idealGroup > 1 ? 0.6 : 0.35) + 0.3 * has('social') - 0.3 * has('solitary') - 0.05 * has('shy');
  const feedingDrive = 0.5 + 0.3 * has('food_obsessed') + 0.2 * has('competitive_feeder') - 0.2 * has('patient_feeder') + (t - 0.5) * 0.2;
  const startle = 0.5 - (t - 0.5) * 0.7 + 0.3 * has('easily_startled') + 0.15 * has('shy') - 0.2 * has('bold') - 0.05 * has('glass_curious');
  const nocturnal = spNoc + 0.35 * has('night_owl');
  const displayDrive = 0.15 + terr * 0.35 + t * 0.2 + 0.4 * has('showoff') + 0.1 * has('nest_builder');
  return {
    boldness: c01(boldness),
    curiosity: c01(curiosity),
    activity: c01(activity),
    sociability: c01(sociability),
    feedingDrive: c01(feedingDrive),
    startle: c01(startle),
    nocturnal: c01(nocturnal),
    displayDrive: c01(displayDrive),
  };
}

/** Multiplier on feeding competition weight from personality. */
export function feedingPersonalityMul(tags: readonly PersonalityTag[]): number {
  let m = 1;
  if (tags.includes('competitive_feeder')) m *= 1.45;
  if (tags.includes('food_obsessed')) m *= 1.3;
  if (tags.includes('patient_feeder')) m *= 0.7;
  if (tags.includes('shy')) m *= 0.9;
  if (tags.includes('bold')) m *= 1.1;
  return m;
}

/** How strongly glass taps/tap pressure stress this individual (never negative — tapping is never a reward). */
export function tapSensitivityMul(tags: readonly PersonalityTag[]): number {
  let m = 1;
  if (tags.includes('easily_startled')) m *= 1.7;
  if (tags.includes('shy')) m *= 1.4;
  if (tags.includes('bold')) m *= 0.55;
  if (tags.includes('glass_curious')) m *= 0.6;
  return Math.max(0.25, m);
}

// lane:qa-play — labels in sentence case with "Show-off", matching the UI chips (src/ui/common/format.ts PERSONALITY)
export const PERSONALITY_INFO: Record<PersonalityTag, { label: string; blurb: string }> = {
  bold: { label: 'Bold', blurb: 'Rarely hides and holds its ground.' },
  shy: { label: 'Shy', blurb: 'Keeps close to cover, especially with busy tank mates.' },
  explorer: { label: 'Explorer', blurb: 'Patrols every corner of the tank.' },
  food_obsessed: { label: 'Food obsessed', blurb: 'Always first to notice feeding time.' },
  glass_curious: { label: 'Glass curious', blurb: 'Comes to the front glass to watch you.' },
  nest_builder: { label: 'Nest builder', blurb: 'Tends and tidies a favourite spot.' },
  homebody: { label: 'Homebody', blurb: 'Has a favourite spot and rarely strays far.' },
  social: { label: 'Social', blurb: 'Seeks company of its own kind.' },
  solitary: { label: 'Solitary', blurb: 'Prefers its own space.' },
  night_owl: { label: 'Night owl', blurb: 'Most active after the lights go down.' },
  showoff: { label: 'Show-off', blurb: 'Flares and displays at the slightest excuse.' },
  easily_startled: { label: 'Easily startled', blurb: 'Darts away at sudden movement — handle gently.' },
  patient_feeder: { label: 'Patient feeder', blurb: 'Waits its turn; watch that it gets enough.' },
  competitive_feeder: { label: 'Competitive feeder', blurb: 'Muscles in at feeding time.' },
  decor_inspector: { label: 'Decor inspector', blurb: 'Investigates every new rock and plant.' },
};
