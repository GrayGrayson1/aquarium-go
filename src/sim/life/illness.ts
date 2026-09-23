/**
 * A small, plausible set of illnesses with clear causes and cures. OWNER: lane "lifecycle".
 * Illness never appears at random: it needs stress, poor water, injuries or a specific hazard, and hardiness
 * (species × individual potential) lowers the odds. Recovery follows good conditions (clean stable water, low stress,
 * quarantine helps).
 */
import type { SpeciesDefinition } from '@/types';

export type IllnessKind = 'ich' | 'fin_rot' | 'fungus' | 'swim_bladder' | 'stress_coloration' | 'impaction';

export interface IllnessDef {
  kind: IllnessKind;
  /** Display name (may depend on environment/category). */
  name: (sp: SpeciesDefinition) => string;
  /** One-line symptom description for the creature card. */
  symptom: string;
  /** How to help, in plain language. */
  cure: (sp: SpeciesDefinition) => string;
  /** Health lost per game-hour at severity 100. */
  drainPerHour: number;
  /** Extra stress at severity 100. */
  stress: number;
  /** Severity gained per hour while conditions stay poor. */
  worsenPerHour: number;
  /** Severity lost per hour while conditions are good. */
  healPerHour: number;
}

const idealTemp = (sp: SpeciesDefinition) => `${sp.tempC.idealMin}–${sp.tempC.idealMax} °C`;

export const ILLNESSES: Record<IllnessKind, IllnessDef> = {
  ich: {
    kind: 'ich',
    name: (sp) => (sp.environment === 'marine' ? 'marine white spot' : 'white spot (ich)'),
    symptom: 'Tiny white specks on the body and fins; flashing against decor.',
    cure: (sp) => `Keep the water clean and stable at ${idealTemp(sp)}, reduce stress, and consider a quarantine tank while it recovers.`,
    drainPerHour: 0.45,
    stress: 18,
    worsenPerHour: 1.1,
    healPerHour: 0.9,
  },
  fin_rot: {
    kind: 'fin_rot',
    name: () => 'fin rot',
    symptom: 'Ragged, fraying fin edges.',
    cure: () => 'Do water changes to bring waste down, remove sharp decor and fin-nipping tank mates. Clean water lets fins regrow.',
    drainPerHour: 0.35,
    stress: 10,
    worsenPerHour: 0.9,
    healPerHour: 0.8,
  },
  fungus: {
    kind: 'fungus',
    name: (sp) => (sp.category === 'amphibian' ? 'fungal patches' : 'fungal infection'),
    symptom: 'Fluffy white patches, often on gills or wounds.',
    cure: (sp) => `Keep the water very clean and within ${idealTemp(sp)}. A quiet quarantine tank speeds recovery.`,
    drainPerHour: 0.5,
    stress: 14,
    worsenPerHour: 1,
    healPerHour: 0.8,
  },
  swim_bladder: {
    kind: 'swim_bladder',
    name: () => 'swim-bladder trouble',
    symptom: 'Struggles to hold its level — floating or sinking awkwardly.',
    cure: () => 'Feed smaller portions of soaked or sinking food, skip a meal, and keep the water warm, clean and calm.',
    drainPerHour: 0.15,
    stress: 12,
    worsenPerHour: 0.6,
    healPerHour: 1,
  },
  stress_coloration: {
    kind: 'stress_coloration',
    name: (sp) => (sp.category === 'invertebrate' ? 'stress paleness' : 'stress colouring'),
    symptom: 'Washed-out or darkened colours and clamped fins.',
    cure: () => 'Find the stressor: add hides and cover, calm or rehome pushy tank mates, keep the water stable and avoid tapping the glass.',
    drainPerHour: 0.05,
    stress: 6,
    worsenPerHour: 0.8,
    healPerHour: 1.6,
  },
  impaction: {
    kind: 'impaction',
    name: () => 'impaction',
    symptom: 'Bloated and off its food after swallowing substrate.',
    cure: () => 'Replace gravel with fine sand or a bare bottom, keep the water cool and clean, and offer small soft meals.',
    drainPerHour: 0.55,
    stress: 12,
    worsenPerHour: 0.7,
    healPerHour: 0.7,
  },
};

export function illnessDef(kind: string): IllnessDef | undefined {
  return (ILLNESSES as Record<string, IllnessDef>)[kind];
}

/** Which illnesses a species can plausibly get. */
export function eligibleIllnesses(sp: SpeciesDefinition): IllnessKind[] {
  const out: IllnessKind[] = ['stress_coloration'];
  if (sp.category === 'fish') {
    out.push('ich', 'fin_rot', 'fungus');
    if (sp.behaviorSet === 'goldfish' || sp.id === 'fancy_goldfish' || sp.id === 'betta') out.push('swim_bladder');
  }
  if (sp.category === 'amphibian') {
    out.push('fungus');
    if (sp.behaviorSet === 'axolotl' || sp.substrateRules.avoid.some((k) => k === 'gravel' || k === 'fine_gravel')) out.push('impaction');
  }
  return out;
}
