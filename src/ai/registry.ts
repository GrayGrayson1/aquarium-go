/**
 * Live AI worlds (one per mounted tank) + helpers the interaction layer uses to talk to the AI.
 * OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { FoodDef, FoodTag, Tank } from '@/types';
import type { AIWorld } from './core/world';
import { addStimulus } from './core/world';
import { noteLocalFeeding, shapeFor, spawnFood, type FoodSpec } from './core/food';
import { FOODS, getFoodDef } from '@/data/catalog/foods';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { tankDims } from '@/sim/tankSpace';

export const aiWorlds = new Map<string, AIWorld>();

export function getAIWorld(tankId: string): AIWorld | undefined {
  return aiWorlds.get(tankId);
}

export function foodSpecOf(def: FoodDef): FoodSpec {
  return { foodId: def.id, delivery: def.delivery, color: def.color, tags: def.tags, nutrition: def.nutrition };
}

export function foodSpecById(foodId: string): FoodSpec {
  const def = getFoodDef(foodId);
  if (def) return foodSpecOf(def);
  return { foodId, delivery: 'slow_sink', color: '#b0643a', tags: [], nutrition: 20 };
}

/** Best food def for a set of tags (sim food arriving from an autofeeder / panel button). */
export function foodSpecForTags(tags: FoodTag[]): FoodSpec | null {
  if (!tags.length) return null;
  let best: FoodDef | undefined;
  let bestScore = -1;
  for (const f of FOODS) {
    let s = 0;
    for (const t of f.tags) if (tags.includes(t)) s++;
    if (s > bestScore) {
      bestScore = s;
      best = f;
    }
  }
  return best && bestScore > 0 ? foodSpecOf(best) : null;
}

/** Water movement 0..1 from installed filters / powerheads / wavemakers relative to tank volume. */
export function tankFlow(tank: Tank): number {
  let gph = 0;
  for (const e of tank.equipment ?? []) {
    if (!e.on || e.failed) continue;
    const def = getEquipmentDef(e.defId);
    if (!def) continue;
    const f = def.stats.flowGph ?? 0;
    const k = def.kind === 'powerhead' || def.kind === 'wavemaker' ? 1.3 : def.kind === 'filter' ? 1 : 0.3;
    gph += f * k * (e.setting !== undefined && def.kind !== 'filter' ? Math.max(0.2, Math.min(1, e.setting)) : 1);
  }
  const gal = Math.max(1, tankDims(tank).gallons);
  const turnover = gph / gal;
  return Math.max(0.05, Math.min(1, turnover / 20));
}

const _v = new THREE.Vector3();

/** Glass tap at a tank-local point: startle wave (bold fish inspect, shy fish dart for cover). */
export function aiTap(tankId: string, local: [number, number, number], strength: number, spam: boolean): void {
  const w = aiWorlds.get(tankId);
  if (!w) return;
  addStimulus(w, 'tap', _v.set(local[0], local[1], local[2]), strength, spam);
}

/**
 * Spawn a feeding's visible particles at a tank-local point (floating food lands on the surface).
 * Returns the number of particles spawned.
 */
export function aiFeed(tankId: string, foodId: string, local: [number, number, number], opts: { targetCreatureId?: string; servings?: number } = {}): number {
  const w = aiWorlds.get(tankId);
  if (!w) return 0;
  const spec = foodSpecById(foodId);
  const sh = shapeFor(spec.tags, spec.delivery);
  const servings = Math.max(1, opts.servings ?? 1);
  const count = opts.targetCreatureId ? Math.max(1, Math.min(4, Math.round(sh.perServing / 4))) : Math.min(40, Math.round(sh.perServing * Math.sqrt(servings)));
  const n = spawnFood(w, spec, _v.set(local[0], local[1], local[2]), { count, targetCreatureId: opts.targetCreatureId });
  noteLocalFeeding(w, spec, n, servings);
  return n;
}

/**
 * In-tank equipment as solid props for the AI (derived from the equipment renderer's deterministic layout; the
 * geometry mirrors render/decor/TankEquipment.tsx — keep the two in step).
 */
export function equipmentSolids(layout: { eq: { id: string }; visual: string; pos: [number, number, number]; size: number; n?: number; of?: number }[], tank: Tank): import('./core/env').ExtraSolid[] {
  const d = tankDims(tank);
  const out: import('./core/env').ExtraSolid[] = [];
  const backZ = -d.W / 2;
  for (const p of layout) {
    const [x, y, z] = p.pos;
    const s = p.size || 1;
    const id = `eq:${p.eq.id}`;
    switch (p.visual) {
      case 'heater_tube': {
        // glass tube (pos = centre, size = length) drawn leaning 0.16 rad inward: two stacked boxes follow the tilt
        // (one upright box left the top third of the tube outside the collider)
        const t = Math.sin(0.16);
        const c = Math.cos(0.16);
        const hx = 0.017 + (t * s) / 8;
        const hy = (c * s) / 4 + 0.012;
        out.push({ id, cx: x + (t * s) / 4, cy: y - (c * s) / 4, cz: z, hx, hy, hz: 0.017, hitch: [[x + 0.018 + t * s * 0.2, y - s * 0.2, z + 0.012]] });
        out.push({ id: `${id}:top`, cx: x - (t * s) / 4, cy: y + (c * s) / 4, cz: z, hx, hy, hz: 0.017, hitch: [[x - 0.018 - t * s * 0.15, y + s * 0.15, z + 0.012]] });
        break;
      }
      case 'sponge_filter':
        out.push({ id, cx: x, cy: y + 0.06 * s, cz: z, hx: 0.032 * s, hy: 0.065 * s, hz: 0.032 * s, hitch: [[x, y + 0.13 * s, z + 0.012]] });
        break;
      case 'hob_filter': {
        // intake tube hanging from the back rim
        const top = d.waterY;
        const bottom = d.waterY * 0.45;
        out.push({ id, cx: x - 0.03, cy: (top + bottom) / 2, cz: -d.W / 2 + 0.03, hx: 0.013, hy: (top - bottom) / 2, hz: 0.013, hitch: [[x - 0.03 + 0.014, bottom + (top - bottom) * 0.3, -d.W / 2 + 0.045]] });
        break;
      }
      case 'powerhead':
      case 'wavemaker':
        out.push({ id, cx: x, cy: y, cz: z + 0.015, hx: 0.04 * s, hy: 0.032 * s, hz: 0.03 * s });
        break;
      case 'airstone':
        out.push({ id, cx: x, cy: y + 0.008, cz: z, hx: 0.018, hy: 0.01, hz: 0.012 });
        break;
      case 'co2_kit':
        out.push({ id, cx: x, cy: y, cz: z + 0.01, hx: 0.018, hy: 0.025, hz: 0.015 });
        break;
      case 'sump': {
        // the overflow: a corner box for a single sump, a low coast-to-coast weir along the back glass for several
        // (drawn once, with the first). The return nozzles are small: no solid.
        const c2c = (p.of ?? 1) > 1;
        if (c2c && (p.n ?? 0) !== 0) break;
        const h = c2c ? 0.075 : d.H * 0.62;
        const bw = c2c ? d.L * 0.86 : 0.11;
        const bd = c2c ? 0.055 : 0.11;
        const top = c2c ? d.waterY + 0.02 : d.H - 0.004;
        const cx = c2c ? 0 : d.L / 2 - 0.058;
        const cz = backZ + bd / 2 + 0.003;
        const sid = c2c ? `eq:overflow:${p.eq.id}` : id;
        out.push({ id: sid, cx, cy: top - h / 2, cz, hx: bw / 2, hy: h / 2, hz: bd / 2, hitch: c2c ? [] : [[cx - 0.02, d.waterY - 0.12, cz + bd / 2 + 0.012], [cx + 0.03, d.waterY - 0.22, cz + bd / 2 + 0.012]] });
        break;
      }
      case 'canister': {
        // intake strainer + tube up the back glass (pos = strainer), and the outlet's spray bar at the glass edge
        const side = x >= 0 ? 1 : -1;
        const zIn = backZ + 0.024;
        const bottom = y - 0.035;
        out.push({ id, cx: x, cy: (bottom + d.waterY) / 2, cz: zIn, hx: 0.012, hy: (d.waterY - bottom) / 2, hz: 0.012, hitch: [[x + side * 0.014, y + 0.02, zIn + 0.014]] });
        const ox = side * (d.L / 2 - 0.05);
        out.push({ id: `${id}:outlet`, cx: ox - side * 0.02, cy: d.waterY - 0.03, cz: zIn + 0.002, hx: 0.027, hy: 0.03, hz: 0.011 });
        break;
      }
      case 'skimmer': {
        // hang-on skimmer: its feed pump hangs in the water on a riser from the rim
        out.push({ id, cx: x, cy: d.waterY - 0.08, cz: backZ + 0.02, hx: 0.0225, hy: 0.025, hz: 0.015, hitch: [[x, d.waterY - 0.08, backZ + 0.02 + 0.015 + 0.012]] });
        const riserBottom = d.waterY - 0.055;
        out.push({ id: `${id}:riser`, cx: x + 0.012, cy: (riserBottom + d.waterY) / 2, cz: backZ + 0.014, hx: 0.0065, hy: (d.waterY - riserBottom) / 2 + 0.004, hz: 0.0065 });
        break;
      }
      default:
        break;
    }
  }
  return out;
}
