/**
 * Audit 2026-11-17 (D2) — move several animals (a school, a colony, a brood) to one tank in one action. The same
 * checks and the same move as one animal, one after another: `moveCreature`, or `separateCreature` for one in a
 * breeding stage (as the move dialog chooses for a single animal). Every check runs first, so a refused group moves
 * no one; an animal lost or sold since the group was picked stays out and is counted. One message: the plain move
 * once, then every distinct thing a single move would add (courtship interrupted, eggs left behind…). OWNER: lane
 * "lifecycle".
 */
import type { Creature, GameState } from '@/types';
import type { ActionResult } from '../care';
import { findSpecies } from '@/data/species';
import { environmentGate } from '../compat';
import { pluralName } from '../economy/util';
import { settleTanks } from '../settle';
import { moveCreature, moveHeadsUp, plainMoveMessage } from './actions';
import { breedingStatus } from './breeding';
import { separateCreature } from './breeding/actions';

export function moveCreatures(state: GameState, creatureIds: readonly string[], tankId: string): ActionResult {
  const tank = Object.hasOwn(state.tanks, tankId) ? state.tanks[tankId] : undefined;
  if (!tank) return { ok: false, message: 'That tank no longer exists.' };
  const seen = new Set<string>();
  const list: Creature[] = [];
  for (const id of creatureIds) {
    if (seen.has(id) || !Object.hasOwn(state.creatures, id)) continue;
    seen.add(id);
    list.push(state.creatures[id]);
  }
  // B-127: every tank involved catches up first, so the checks see the animals as they are now
  settleTanks(state, [...new Set(list.map((c) => c.tankId)), tankId]);
  // review: an animal lost or sold since the group was picked stays out (and is counted), rather than refusing the rest
  const living = list.filter((c) => c.status !== 'dead' && c.status !== 'sold');
  const lost = new Set(creatureIds).size - living.length;
  if (living.length === 0) return { ok: false, message: 'Those animals are no longer in your care.' };
  for (const c of living) {
    const sp = findSpecies(c.speciesId);
    if (!sp) return { ok: false, message: 'Unknown species.' };
    const gate = environmentGate(sp, tank);
    if (!gate.ok) return { ok: false, message: gate.reason ?? `${c.name} can’t live in ${tank.name}.` };
  }
  const movers = living.filter((c) => c.tankId !== tankId);
  if (movers.length === 0) return { ok: true, message: `They are already in ${tank.name}.` };
  const species = new Set(movers.map((c) => c.speciesId));
  const sp = species.size === 1 ? findSpecies(movers[0].speciesId) : undefined;
  const heads = sp ? moveHeadsUp(sp, tank) : null;
  // what a single move adds beyond the plain move (courtship interrupted, eggs left or staying behind, a brood carried):
  // every distinct one, without the space warning the group gives once
  const notes: string[] = [];
  const failed: string[] = [];
  const moved: Creature[] = [];
  for (const c of movers) {
    const csp = findSpecies(c.speciesId)!;
    const breeding = !!breedingStatus(state, c.id);
    const r = breeding ? separateCreature(state, c.id, tankId) : moveCreature(state, c.id, tankId);
    if (!r.ok) {
      failed.push(r.message);
      continue;
    }
    moved.push(c);
    let note = (r.message ?? '').trim();
    if (note === plainMoveMessage(c.name, csp, tank)) continue;
    const own = moveHeadsUp(csp, tank);
    if (own && note.endsWith(own.trim())) note = note.slice(0, -own.trim().length).trim();
    if (note && !notes.includes(note)) notes.push(note);
  }
  if (moved.length === 0) return { ok: false, message: failed[0] ?? 'Those animals could not be moved.' };
  const one = moved.length === 1;
  const noun = one ? moved[0].name : sp ? pluralName(sp.commonName) : 'animals';
  const head = one ? `Moved ${noun} to ${tank.name}.` : `Moved ${moved.length} ${noun} to ${tank.name}.`;
  const settle = heads ?? (one ? ' Give it a little while to settle in.' : ' Give them a little while to settle in.');
  const left = lost === 0 ? '' : lost === 1 ? ' One of them is no longer in your care.' : ` ${lost} of them are no longer in your care.`;
  const extra = [...notes, ...failed].map((n) => ` ${n}`).join('');
  return { ok: true, message: `${head}${settle}${left}${extra}` };
}
