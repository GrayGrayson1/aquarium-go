/**
 * Audit 2026-11-17 (D2) — move several animals (a school, a colony, a brood) to one tank in one action. The same
 * checks and the same move as one animal, one after another: `moveCreature`, or `separateCreature` for one in a
 * breeding stage (as the move dialog chooses for a single animal). Every check runs first, so a refused group moves
 * no one. OWNER: lane "lifecycle".
 */
import type { Creature, GameState } from '@/types';
import type { ActionResult } from '../care';
import { findSpecies } from '@/data/species';
import { environmentGate } from '../compat';
import { pluralName } from '../economy/util';
import { settleTanks } from '../settle';
import { moveCreature } from './actions';
import { breedingStatus } from './breeding';
import { separateCreature } from './breeding/actions';
import { gallonsNeededNow, SLIGHTLY_SMALL_TANK } from './growth';
import { tankGallons } from './welfare';

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
  if (list.length === 0) return { ok: false, message: 'Those animals are no longer in your care.' };
  // B-127: every tank involved catches up first, so the checks see the animals as they are now
  settleTanks(state, [...new Set(list.map((c) => c.tankId)), tankId]);
  for (const c of list) {
    if (c.status === 'dead' || c.status === 'sold') return { ok: false, message: `${c.name} can't be moved.` };
    const sp = findSpecies(c.speciesId);
    if (!sp) return { ok: false, message: 'Unknown species.' };
    const gate = environmentGate(sp, tank);
    if (!gate.ok) return { ok: false, message: gate.reason ?? `${c.name} can't live in ${tank.name}.` };
  }
  const movers = list.filter((c) => c.tankId !== tankId);
  if (movers.length === 0) return { ok: true, message: `They are already in ${tank.name}.` };
  const notes: string[] = [];
  let moved = 0;
  for (const c of movers) {
    const breeding = !!breedingStatus(state, c.id);
    const r = breeding ? separateCreature(state, c.id, tankId) : moveCreature(state, c.id, tankId);
    if (!r.ok) {
      notes.push(r.message);
      continue;
    }
    moved++;
    // a parent leaving eggs or a brood: its own words (one per animal), as a single move gives them
    if (breeding && r.message) notes.push(r.message);
  }
  const species = new Set(movers.map((c) => c.speciesId));
  const sp = species.size === 1 ? findSpecies(movers[0].speciesId) : undefined;
  const noun = moved === 1 ? movers.find((c) => c.tankId === tankId)?.name ?? 'one animal' : sp ? pluralName(sp.commonName) : 'animals';
  const small = sp ? tankGallons(tank) < gallonsNeededNow(sp, sp.adultSizeCm) * SLIGHTLY_SMALL_TANK : false;
  const heads = small && sp ? ` Heads up: an adult ${sp.commonName.toLowerCase()} needs at least ${sp.recommendedMinTankGallons} gallons.` : moved > 0 ? ' Give them a little while to settle in.' : '';
  const head = moved === 1 ? `Moved ${noun} to ${tank.name}.` : `Moved ${moved} ${noun} to ${tank.name}.`;
  return { ok: moved > 0, message: `${head}${heads}${notes.length ? ` ${notes.slice(0, 2).join(' ')}` : ''}`.trim() };
}
