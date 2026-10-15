/**
 * The Facility map's model (DESIGN-S3D §7.5; INTAKE C-46; AUTO-040): which area each tank sits in, and how many tiles
 * an area shows. Pure, so tests/sim/automation-map.test.ts can check it. OWNER: lane "automation" (chunk 5).
 *
 * Areas are grouping only (tanks aren't moved between them): a production line's breed and raise tanks go to
 * Breeding, its quarantine and keep tanks to Quarantine & keepers; then a tank's purpose (breeding and nursery tanks →
 * Breeding, quarantine → Quarantine & keepers); the rest is the Gallery. An area shows as many tiles as fit and ends
 * with "+{n} more" (which opens the Tanks panel); tanks that belong to a line always show.
 */
import type { GameState, Tank } from '@/types';
import { productionLines } from '@/sim/production';

export type AreaId = 'breeding' | 'quarantine' | 'gallery';

export interface MapAreas {
  breeding: Tank[];
  quarantine: Tank[];
  gallery: Tank[];
  /** Tank id → the lines that use it (their names, for the Animals layer's text). */
  lineTanks: Map<string, string[]>;
}

export function mapAreas(g: GameState): MapAreas {
  const out: MapAreas = { breeding: [], quarantine: [], gallery: [], lineTanks: new Map() };
  const role = new Map<string, AreaId>();
  for (const line of productionLines(g)) {
    const add = (id: string | undefined, area: AreaId) => {
      if (!id || !g.tanks[id]) return;
      if (area === 'breeding' || !role.has(id)) role.set(id, area); // a tank that's any line's breed or raise tank is Breeding
      const names = out.lineTanks.get(id) ?? [];
      const short = line.name.replace(/ line$/, '');
      if (!names.includes(short)) names.push(short);
      out.lineTanks.set(id, names);
    };
    add(line.tanks.breed, 'breeding');
    add(line.tanks.raise, 'breeding');
    for (const q of line.tanks.quarantine) add(q, 'quarantine');
    add(line.tanks.keep, 'quarantine');
  }
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    const area = role.get(id) ?? (t.purpose === 'breeding' || t.purpose === 'nursery' ? 'breeding' : t.purpose === 'quarantine' ? 'quarantine' : 'gallery');
    out[area].push(t);
  }
  return out;
}

/** The tiles an area shows within `cap`: line tanks always, then the rest in order; `more` is what's left out. */
export function areaTiles(tanks: Tank[], cap: number, lineTanks: Map<string, string[]>): { shown: Tank[]; more: number } {
  const lined = tanks.filter((t) => lineTanks.has(t.id));
  const rest = tanks.filter((t) => !lineTanks.has(t.id));
  const room = Math.max(0, cap - lined.length);
  const shown = [...lined, ...rest.slice(0, room)];
  // keep the tanks' own order (tankOrder) among what's shown
  const order = new Map(tanks.map((t, i) => [t.id, i]));
  shown.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { shown, more: tanks.length - shown.length };
}
