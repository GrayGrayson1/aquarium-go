/**
 * Test support (not a test file): a shop with one betta production line and a free-swimming brood of its pair, fed by
 * Autofeeders so runs need no hand care. Used by tests/sim/automation-invariants.test.ts. Only src/sim, src/data and
 * src/types are imported.
 */
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { installEquipment } from '@/sim/care';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { devOpenMarket } from '@/sim/economy';
import { unlock } from '@/sim/facility';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { createLine } from '@/sim/production';

export interface LineFarm {
  g: GameState;
  lineId: string;
  tanks: { breed: Tank; raise: Tank; qt: Tank; keep: Tank };
}

export function lineFarm(seed = 17): LineFarm {
  const g = newGame({ starterId: 'betta', starterName: 'Line', seed });
  g.isShowcase = false;
  devOpenMarket(g);
  for (const k of Object.keys(UNLOCK_KEYS)) unlock(g, k, { silent: true });
  g.facility.level = 'showroom';
  g.finance.money = 50000;
  g.inventory.foods = { ...g.inventory.foods, flake_tropical: 5000, micro_pellets: 5000 };
  const mk = (name: string, x: number, tier: string) => {
    const t = createTank(g, tier, 'freshwater_tropical', { cycled: true, placement: { x, z: 2, rotY: 0 }, name });
    t.water.tempC = 26;
    installEquipment(g, t.id, 'autofeeder', { purchased: true });
    return t;
  };
  const breed = mk('Breed Tank', -6, 'g10');
  const raise = mk('Grow-out', -3, 'g40B');
  const qt = mk('Quarantine', 0, 'g40B');
  const keep = mk('Quiet Corner', 3, 'g20L');
  const rng = simRng(g);
  const father = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Blaze' }), breed.id);
  const mother = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Cinder' }), keep.id);
  const r = createLine(g, { motherId: mother.id, fatherId: father.id, tanks: { breed: breed.id, raise: raise.id, quarantine: qt.id, keep: keep.id } });
  if (!r.ok || !r.lineId) throw new Error(r.message);
  createClutch(g, { sp: getSpecies('betta'), tank: breed, mother, father, hour: g.clock.hour, stage: 'fry', count: 30, visual: 'fry_cloud', nextStageHour: g.clock.hour + 6 });
  return { g, lineId: r.lineId, tanks: { breed, raise, qt, keep } };
}

/** What the line did, for comparing runs: its brood moves, sorts, quarantines and listings (hours and counts). */
export function lineRecord(g: GameState) {
  const line = g.production!.lines[0];
  const young = (id: string) => g.creatures[id]?.lineage.motherId === line.pair.motherId;
  return {
    routed: line.routed?.length ?? 0,
    sortedThroughHour: line.sortedThroughHour,
    batches: (line.batches ?? []).map((b) => ({ sortedHour: b.sortedHour, tankId: b.tankId, quarantinedHour: b.quarantinedHour, released: !!b.released, n: b.creatureIds.length })),
    listings: g.market.listings.filter((l) => l.creatureIds.some(young)).map((l) => ({ kind: l.kind, createdHour: l.createdHour, n: l.creatureIds.length })),
    young: Object.values(g.creatures).filter((c) => young(c.id)).length,
  };
}
