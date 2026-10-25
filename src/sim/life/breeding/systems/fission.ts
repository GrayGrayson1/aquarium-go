/**
 * Fission (chunk 16, ADR-0052): a living anemone that has settled in, is well fed and healthy splits in two by itself
 * now and then, the new half a clone of the old (Scott et al. 2014: 89–94 % of halves survive; Reef Builders: one
 * split can lead to a dozen). No partner and no eggs: the keeper can't pair them, so the module isn't pair-breedable
 * and the step runs on its own (`asexual`). It keeps no state of its own: the last split is read from the animal's
 * history, so saves gain no field, and it draws on the step's `ctx.rng` only in a tank where an anemone is ready.
 * OWNER: lane "breeding".
 */
import type { Creature, SpeciesDefinition, Tank } from '@/types';
import type { BreedingModule, RearingPlan, StepEnv } from '../types';
import { createCreature, addCreature } from '@/sim/life';
import { addHistory, gallonsOf, isMature, livingIn, plannedUnits, say, spName, stockingOf } from '../common';
import { findSpecies } from '@/data/species';
import { deepClone } from '@/sim/clone';

const NONE: RearingPlan = {
  phases: [],
  eggTags: [],
  youngTags: [],
  parentsEatEggs: false,
  guardEggs: false,
  guardianEatsFry: false,
  planktonic: false,
  hatchAtNight: false,
  larvaeViable: false,
  starveSeverity: 1,
  coverShelter: 0,
  yolkFrac: 0,
};

/** How long an anemone must have been in this tank before it splits (it settles first): game days. */
export const FISSION_SETTLED_DAYS = 14;
/** Well fed and in good health: hunger at most this, health at least this. */
export const FISSION_MAX_HUNGER = 35;
export const FISSION_MIN_HEALTH = 70;
/** Once ready, it splits on average this many game hours later. */
const FISSION_MEAN_WAIT_H = 6 * 24;
/** At most one anemone per this many gallons. */
const GALLONS_PER_ANEMONE = 30;

/** Game hours since this animal came into this tank (bought, moved, or split off). */
function hoursInTank(c: Creature, hour: number): number {
  let since = Number.isFinite(c.acquiredHour) ? c.acquiredHour : c.bornHour;
  for (const e of c.history ?? []) if (e.kind === 'moved' && e.hour > since) since = e.hour;
  return hour - since;
}

/** When it last split (its own split, or the one it came from), or -Infinity. */
function lastSplitHour(c: Creature): number {
  let h = -Infinity;
  for (const e of c.history ?? []) if ((e.kind === 'bred' || e.kind === 'born') && e.text.startsWith('Split') && e.hour > h) h = e.hour;
  return h;
}

/** Why this anemone won't split now, or null when it is ready. */
export function fissionBlocker(state: StepEnv['state'], tank: Tank, sp: SpeciesDefinition, c: Creature, hour: number): string | null {
  if (!isMature(c, sp, hour)) return `${c.name} is still growing — anemones split once they are full grown.`;
  if (hoursInTank(c, hour) < FISSION_SETTLED_DAYS * 24) return `${c.name} hasn’t settled in yet: an anemone splits only after a couple of weeks in one tank.`;
  if ((c.stats.health ?? 0) < FISSION_MIN_HEALTH) return `${c.name} isn’t healthy enough to split.`;
  if ((c.stats.hunger ?? 100) > FISSION_MAX_HUNGER) return `${c.name} is hungry — only a well-fed anemone splits.`;
  if (hour - lastSplitHour(c) < sp.breeding.cooldownDays * 24) return `${c.name} split not long ago.`;
  const anemones = livingIn(state, tank.id).filter((x) => findSpecies(x.speciesId)?.category === 'anemone').length;
  if (anemones >= Math.max(1, Math.floor(gallonsOf(tank) / GALLONS_PER_ANEMONE))) return `${tank.name} has as many anemones as it can hold — they would sting each other.`;
  const stock = stockingOf(state, tank, hour);
  if (stock.used + plannedUnits(sp, c.sizeCm, true) > stock.cap + 1e-9) return `${tank.name} is full — there’s no room for another anemone.`;
  return null;
}

function split(env: StepEnv, parent: Creature): void {
  const { state, tank, species: sp, hour, ctx } = env;
  const clone = createCreature(state, ctx.rng, sp.id, {
    sex: parent.sex,
    // the new half is small and grows back: the game ages it as a half-grown young anemone (size follows age)
    ageDays: sp.lifecycle.juvenileDays * 0.6,
    genome: deepClone(parent.genome), // not structuredClone: a solo command's settle runs this inside an Immer draft
    tankId: tank.id,
    captiveBred: true,
    motherId: parent.id,
    fatherId: null,
    generation: parent.lineage?.generation ?? 1,
    lineId: parent.lineage?.lineId,
    breederName: 'Your shop',
    purchasePrice: 0,
  });
  // a clone looks like its parent
  clone.appearance = { ...parent.appearance };
  clone.morphName = parent.morphName;
  clone.reproRole = parent.reproRole;
  clone.lineage = { ...(parent.lineage ?? {}), motherId: parent.id, fatherId: null, breederName: 'Your shop' } as Creature['lineage'];
  clone.acquiredHour = hour;
  clone.history = [{ hour, kind: 'born', text: `Split from ${parent.name} — a clone of it.` }];
  addCreature(state, clone, tank.id);
  parent.repro.totalOffspringRaised += 1;
  addHistory(parent, 'bred', `Split in two — ${clone.name} is its clone.`, hour);
  say(state, ctx, { kind: 'breeding', text: `${parent.name} has split in two! The new ${spName(sp)}, ${clone.name}, is its clone.`, tankId: tank.id, creatureId: clone.id, toast: true });
}

export const fissionModule: BreedingModule = {
  id: 'fission',
  breedable: false,
  asexual: true,
  plan: NONE,
  explain: (sp) => `A settled, well-fed ${spName(sp)} splits in two by itself now and then — no partner needed, and each half is a clone.`,
  step(env) {
    const { state, tank, species: sp, members, hour, dt, ctx } = env;
    for (const c of members) {
      if (c.status !== 'alive' || c.tankId !== tank.id) continue;
      if (fissionBlocker(state, tank, sp, c, hour)) continue;
      if (ctx.rng.next() < Math.min(1, dt / FISSION_MEAN_WAIT_H)) {
        split(env, c);
        return; // one split per tank per step: the next one re-checks the room
      }
    }
  },
  check: (cc) => {
    cc.reasons.push(`${cc.sp.commonName} doesn’t pair up — a settled, well-fed one splits in two by itself.`);
  },
  force: () => 'Anemones split by themselves once settled and well fed; they can’t be paired.',
};
