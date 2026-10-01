/**
 * Protogynous sex change (clown gobies): every fish starts female; when a tank holds two or more mature females and
 * no male, the dominant one — largest, then boldest, then oldest — becomes the male over a few days. The mirror of
 * the clownfish (protandrous) hierarchy, shared by every breeding module. Deterministic: no RNG draws.
 */
import type { Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import { addMastery, bumpCounter } from '@/sim/facility';
import { addHistory, ageDaysAt, isAlive, isMature, say, setStage, stageDue, stageProgress, clamp01 } from './common';

/** Stage string used while a female is turning male (repro.stage is a free string; see BREEDING_STAGE_LABELS). */
export const TRANSITIONING_MALE = 'transitioning_male';
/** How long the change takes (game hours). Gobiodon change in days to a couple of weeks; kept short for play. */
export const PROTOGYNY_CHANGE_H = 72;

function dominance(c: Creature, hour: number): number {
  return c.sizeCm * 10 + (c.genome?.potentials?.temperament ?? 50) * 0.08 + Math.min(40, ageDaysAt(c, hour)) * 0.15;
}

export function stepProtogynous(state: GameState, tank: Tank, sp: SpeciesDefinition, members: Creature[], hour: number, ctx: SimContext): void {
  if (sp.sexSystem !== 'protogynous') return;
  const adults = members.filter((c) => isMature(c, sp, hour));
  const males = adults.filter((c) => c.reproRole === 'male');
  const changing = adults.filter((c) => c.repro.stage === TRANSITIONING_MALE);

  // Ongoing change: finish it, or call it off if a male has joined the tank meanwhile.
  for (const t of changing) {
    if (males.length) {
      setStage(t, 'idle', hour);
      continue;
    }
    t.repro.progress = clamp01(stageProgress(t, hour));
    if (!stageDue(t, hour)) continue;
    t.reproRole = 'male';
    t.sex = 'male';
    setStage(t, 'idle', hour);
    addHistory(t, 'sex_change', 'Became the dominant fish of the group and changed into a male.', hour);
    bumpCounter(state, 'sexChanges');
    addMastery(state, 'breeding', 15);
    say(state, ctx, { kind: 'breeding', text: `${t.name} has become the male of the group — the ${sp.commonName.toLowerCase()} pair can breed now.`, tankId: tank.id, creatureId: t.id, toast: true });
    return; // one change per tank per step
  }
  if (males.length || changing.length || adults.length < 2) return;

  // No male: the dominant healthy female starts changing.
  const ranked = adults
    .filter((c) => c.reproRole === 'female' && isAlive(c) && c.stats.health >= 40 && (c.repro.stage === 'idle' || c.repro.stage === 'conditioning' || c.repro.stage === 'gravid'))
    .sort((a, b) => dominance(b, hour) - dominance(a, hour) || (a.id < b.id ? -1 : 1));
  const top = ranked[0];
  if (!top) return;
  setStage(top, TRANSITIONING_MALE, hour, hour + PROTOGYNY_CHANGE_H);
  addHistory(top, 'milestone', 'Became the dominant fish of the group and began changing sex.', hour);
  say(state, ctx, {
    kind: 'breeding',
    text: `${top.name} is the largest and boldest of the ${sp.commonName.toLowerCase()} group — and is beginning to change from female to male.`,
    tankId: tank.id,
    creatureId: top.id,
    toast: true,
  });
}
