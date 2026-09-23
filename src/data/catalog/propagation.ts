/**
 * Frags & cuttings: how each living decor piece is propagated by the keeper. OWNER: lane "frags".
 *
 * Keyed by the decor `visual` so any def that reuses a visual (a new brackish plant, a colour variant) inherits
 * sensible rules; a def can override any field with `DecorDef.propagation` (e.g. the bubble-tip anemone says no).
 * Numbers are game abstractions: growth is 0..1 of a "full" colony/planting, recovery is in game hours, and
 * `valueFraction` is what a fresh frag fetches relative to the colony's shop price.
 *
 * The one-line `how` texts describe real hobby practice (bone cutters and frag glue for stony corals, rubber bands
 * for leathers, trimming stem plants above a node, dividing rhizomes, splitting carpet mats).
 */
import type { DecorDef, DecorPropagation } from '@/types';
import { getDecorDef } from './decor';

type Rule = DecorPropagation;

const CORAL_BASE = { can: true, action: 'Take frag', noun: 'frag', minGrowth: 0.7, cost: 0.22, recoveryHours: 48, startGrowth: 0.12, valueFraction: 0.4 } as const;
// Plant cuttings start around a shop-bought planting's growth (≈0.3) so their first leaves are already out.
const PLANT_BASE = { can: true, action: 'Take cutting', noun: 'cutting bundle', minGrowth: 0.6, cost: 0.2, recoveryHours: 24, startGrowth: 0.32, valueFraction: 0.35 } as const;

export const PROPAGATION_BY_VISUAL: Record<string, Rule> = {
  // ── Corals ──
  coral_zoanthid: {
    ...CORAL_BASE,
    minGrowth: 0.65,
    valueFraction: 0.36,
    recoveryHours: 36,
    how: 'Cut a few polyps away on a sliver of rock, glue them to a plug and let them heal in gentle flow. Wear gloves and eye protection — zoanthids can carry palytoxin.',
  },
  coral_mushroom: {
    ...CORAL_BASE,
    minGrowth: 0.6,
    cost: 0.2,
    recoveryHours: 36,
    valueFraction: 0.38,
    how: 'Take one disc off at the foot (or slice one in half) and hold it on a plug in a rubble cup; each piece heals into a new mushroom.',
  },
  coral_gsp: {
    ...CORAL_BASE,
    minGrowth: 0.6,
    cost: 0.2,
    recoveryHours: 24,
    startGrowth: 0.14,
    valueFraction: 0.34,
    how: 'Peel a strip of the purple mat off the rock and rubber-band it to a plug; it grips within days.',
  },
  coral_leather: {
    ...CORAL_BASE,
    valueFraction: 0.35,
    how: 'Slice a wedge from the edge of the cap, rubber-band it to a plug and give it about a week to attach. A little mucus afterwards is normal.',
  },
  coral_hammer: {
    ...CORAL_BASE,
    minGrowth: 0.75,
    cost: 0.25,
    recoveryHours: 60,
    startGrowth: 0.1,
    valueFraction: 0.42,
    how: 'Cut between the heads of a branching colony with bone cutters, glue the skeleton to a plug and keep the flow gentle while the tissue heals.',
  },
  coral_torch: {
    ...CORAL_BASE,
    minGrowth: 0.75,
    cost: 0.25,
    recoveryHours: 60,
    startGrowth: 0.1,
    valueFraction: 0.45,
    how: 'Cut a branch below one head with bone cutters, glue the skeleton to a plug and keep the flow gentle while the tissue heals.',
  },
  coral_frogspawn: {
    ...CORAL_BASE,
    minGrowth: 0.75,
    cost: 0.25,
    recoveryHours: 60,
    startGrowth: 0.1,
    valueFraction: 0.42,
    how: 'Cut between the heads of a branching colony with bone cutters, glue the skeleton to a plug and keep the flow gentle while the tissue heals.',
  },
  coral_acropora: {
    ...CORAL_BASE,
    minGrowth: 0.75,
    cost: 0.22,
    recoveryHours: 60,
    startGrowth: 0.1,
    valueFraction: 0.46,
    how: 'Snip a branch tip with clean cutters and glue it to a plug. It heals only in strong light, good flow and very clean water.',
  },
  coral_gorgonian: {
    ...CORAL_BASE,
    cost: 0.2,
    valueFraction: 0.32,
    how: 'Cut a branch tip, peel a little tissue back from the base and glue the bare core into a plug.',
  },
  anemone_bta: {
    ...CORAL_BASE,
    can: false,
    action: 'Take frag',
    noun: 'split',
    how: 'Anemones reproduce by splitting on their own.',
    why: 'Bubble-tip anemones split on their own when they are well settled. Cutting one can kill it, so leave it be.',
  },

  // ── Freshwater plants ──
  plant_rotala: { ...PLANT_BASE, recoveryHours: 18, how: 'Trim the tops just above a leaf node and replant them; the stem left behind branches out below the cut.' },
  plant_ludwigia: { ...PLANT_BASE, recoveryHours: 18, how: 'Trim the tops just above a leaf node and replant them; the stem left behind branches out below the cut.' },
  plant_water_sprite: {
    ...PLANT_BASE,
    action: 'Take plantlets',
    noun: 'bundle of plantlets',
    recoveryHours: 18,
    cost: 0.18,
    how: 'Pinch off the baby plantlets that sprout along older leaves and plant them, or trim a stem top.',
  },
  plant_floating: {
    ...PLANT_BASE,
    action: 'Scoop portion',
    noun: 'portion',
    minGrowth: 0.55,
    recoveryHours: 12,
    startGrowth: 0.35,
    valueFraction: 0.3,
    how: 'Scoop a handful from the surface mat. Floaters double quickly, and thinning them lets light reach the plants below.',
  },
  plant_vallisneria: {
    ...PLANT_BASE,
    action: 'Separate runner',
    noun: 'runner plantlet',
    minGrowth: 0.65,
    cost: 0.18,
    how: 'Snip a runner between two daughter plants and replant the baby with its own roots.',
  },
  plant_sword: {
    ...PLANT_BASE,
    action: 'Separate runner',
    noun: 'plantlet',
    minGrowth: 0.7,
    cost: 0.18,
    recoveryHours: 36,
    startGrowth: 0.32,
    how: 'Let a runner plantlet grow a few roots, then cut it free and plant it in rich substrate.',
  },
  plant_crypt: {
    ...PLANT_BASE,
    action: 'Separate runner',
    noun: 'plantlet',
    minGrowth: 0.65,
    cost: 0.18,
    recoveryHours: 36,
    startGrowth: 0.32,
    valueFraction: 0.38,
    how: 'Tease out a daughter plant that came up on a runner, roots and all, and replant it. A little "melt" after the move is normal.',
  },
  plant_java_fern: {
    ...PLANT_BASE,
    action: 'Divide rhizome',
    noun: 'rhizome division',
    minGrowth: 0.65,
    cost: 0.22,
    recoveryHours: 36,
    valueFraction: 0.4,
    how: 'Cut the rhizome with sharp scissors, keep at least three leaves on each piece and tie it to wood or rock. Never bury the rhizome.',
  },
  plant_anubias: {
    ...PLANT_BASE,
    action: 'Divide rhizome',
    noun: 'rhizome division',
    minGrowth: 0.65,
    cost: 0.22,
    recoveryHours: 48,
    valueFraction: 0.42,
    how: 'Cut the rhizome, keep a few leaves on each piece and tie or glue it to hardscape. Never bury the rhizome.',
  },
  plant_moss: {
    ...PLANT_BASE,
    action: 'Trim portion',
    noun: 'portion',
    minGrowth: 0.55,
    recoveryHours: 18,
    startGrowth: 0.32,
    how: 'Trim a clump from the outside of the mat and tie it onto wood or stone; it regrows from any fragment.',
  },
  plant_monte_carlo: {
    ...PLANT_BASE,
    action: 'Split',
    noun: 'portion of carpet',
    how: 'Lift a small mat with its roots and press it into the substrate elsewhere; it runs outward from there.',
  },
  plant_hairgrass: {
    ...PLANT_BASE,
    action: 'Split',
    noun: 'portion',
    how: 'Pull a clump of a few plantlets with their runners and replant it as small tufts.',
  },
  plant_marimo: {
    ...PLANT_BASE,
    action: 'Split ball',
    noun: 'half ball',
    minGrowth: 0.85,
    cost: 0.3,
    recoveryHours: 72,
    startGrowth: 0.4,
    valueFraction: 0.4,
    how: 'Gently tear the ball in half and roll each half back into shape. They regrow very slowly.',
  },

  // ── Brackish ──
  plant_mangrove: {
    ...PLANT_BASE,
    can: false,
    noun: 'propagule',
    how: 'Red mangroves spread by propagules, the long seedlings a mature tree drops.',
    why: 'Red mangroves grow from propagules, the long seedlings a mature tree drops. A young seedling in a tank won’t give you cuttings.',
  },

  // ── Marine macroalgae ──
  macro_chaeto: {
    ...PLANT_BASE,
    action: 'Harvest portion',
    noun: 'portion',
    recoveryHours: 12,
    startGrowth: 0.35,
    valueFraction: 0.3,
    how: 'Pull a handful from the ball. Harvesting chaeto regularly exports nutrients and keeps it growing.',
  },
  macro_gracilaria: {
    ...PLANT_BASE,
    action: 'Trim portion',
    noun: 'portion',
    startGrowth: 0.32,
    how: 'Snip off a branch cluster; ogo tumbles and regrows from any healthy piece.',
  },
};

const NOT_LIVING: Rule = { can: false, action: 'Take frag', noun: 'frag', how: '', why: 'Only living plants and corals can be propagated.', minGrowth: 1, cost: 0, recoveryHours: 0, startGrowth: 0, valueFraction: 0 };

/** Propagation rules for a decor def (data flags on the def win over the visual's defaults). */
export function propagationFor(def: DecorDef | undefined): Rule {
  if (!def) return NOT_LIVING;
  const living = def.category === 'plant' || def.category === 'coral' || def.category === 'anemone';
  if (!living) return NOT_LIVING;
  const base: Rule =
    PROPAGATION_BY_VISUAL[def.visual] ??
    (def.category === 'plant'
      ? { ...PLANT_BASE, how: 'Trim a healthy piece and replant it; most aquarium plants regrow from cuttings.' }
      : def.category === 'anemone'
        ? PROPAGATION_BY_VISUAL.anemone_bta
        : { ...CORAL_BASE, how: 'Cut a small piece with clean cutters, glue it to a plug and let it heal in gentle flow.' });
  return def.propagation ? { ...base, ...def.propagation } : base;
}

/** The noun with its article: "a frag", "a rhizome division", "a half ball". */
export function fragNounWithArticle(rule: Pick<Rule, 'noun'>): string {
  return `${/^[aeio]/i.test(rule.noun) ? 'an' : 'a'} ${rule.noun}`;
}

const SHORT_NOUN: Record<string, string> = {
  'cutting bundle': 'cuttings',
  'bundle of plantlets': 'plantlets',
  'runner plantlet': 'plantlet',
  'rhizome division': 'division',
  'portion of carpet': 'portion',
};

/** Corals and anemones (frags) vs plants and macroalgae (cuttings). */
export function isCoralDef(def: DecorDef | undefined): boolean {
  return !!def && (def.category === 'coral' || def.category === 'anemone');
}

/** "Hammer Coral frag", "Rotala Rotundifolia cuttings", "Java Fern division". */
export function fragLabel(item: { defId: string }): string {
  const def = getDecorDef(item.defId);
  if (!def) return 'Frag';
  const rule = propagationFor(def);
  return `${def.name} ${isCoralDef(def) ? 'frag' : SHORT_NOUN[rule.noun] ?? rule.noun}`;
}
