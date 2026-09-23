/**
 * Equipment layout (where each installed device physically sits, tank-local metres) and the bubble / flow /
 * waterfall emitters derived from it for the waterfx lane. OWNER: lane "aquascape".
 * TankEquipment renders props at exactly these positions, so bubbles leave the real uplift tube / airstone.
 */
import type { Tank, EquipmentInstance, EquipmentDef } from '@/types';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { tankDims, standHeight } from '@/sim/tankSpace';
import { substrateHeightAt } from '@/sim/aquascape/terrain';

export interface EquipmentEmitter {
  kind: 'bubbles' | 'flow' | 'waterfall';
  pos: [number, number, number];
  /** Direction for flow/waterfall (tank-local unit vector). */
  dir?: [number, number, number];
  /** Bubbles per second or relative flow strength. */
  rate: number;
  size: number;
  equipmentId: string;
}

export type EquipmentVisual =
  | 'sponge_filter'
  | 'hob_filter'
  | 'canister'
  | 'sump'
  | 'heater_tube'
  | 'chiller_box'
  | 'fan_clip'
  | 'light_bar'
  | 'airstone'
  | 'powerhead'
  | 'wavemaker'
  | 'skimmer'
  | 'skimmer_sump'
  | 'refugium'
  | 'uv_sterilizer'
  | 'ato_sensor'
  | 'autofeeder'
  | 'co2_kit'
  | 'lid'
  | 'unknown';

export interface EquipmentPlacement {
  eq: EquipmentInstance;
  def?: EquipmentDef;
  visual: EquipmentVisual;
  /** Index among devices of the same visual in this tank. */
  n: number;
  /** Number of devices of the same visual. */
  of: number;
  pos: [number, number, number];
  rotY: number;
  /** Visual-specific size hints (metres). */
  size: number;
  running: boolean;
}

export function equipmentVisual(eq: EquipmentInstance, def?: EquipmentDef): EquipmentVisual {
  const id = eq.defId;
  const v = def?.visual ?? '';
  const kind = def?.kind ?? '';
  if (id === 'skimmer_insump') return 'skimmer_sump';
  if (id === 'wavemaker' || kind === 'wavemaker') return 'wavemaker';
  if (v === 'sponge_filter' || id.includes('sponge')) return 'sponge_filter';
  if (v === 'hob_filter' || id.includes('hob') && kind !== 'skimmer') return id.startsWith('skimmer') ? 'skimmer' : 'hob_filter';
  if (v === 'canister' || id.includes('canister')) return 'canister';
  if (v === 'sump' || id.includes('sump')) return 'sump';
  if (v === 'heater_tube' || kind === 'heater' || id.startsWith('heater')) return 'heater_tube';
  if (v === 'chiller_box' || kind === 'chiller' || id.startsWith('chiller')) return 'chiller_box';
  if (v === 'fan_clip' || kind === 'fan') return 'fan_clip';
  if (v === 'light_bar' || kind === 'light' || id.startsWith('light')) return 'light_bar';
  if (v === 'airstone' || kind === 'airstone') return 'airstone';
  if (v === 'powerhead' || kind === 'powerhead') return 'powerhead';
  if (v === 'skimmer' || kind === 'skimmer') return 'skimmer';
  if (v === 'refugium' || kind === 'refugium') return 'refugium';
  if (v === 'uv_sterilizer' || kind === 'uv') return 'uv_sterilizer';
  if (v === 'ato_sensor' || kind === 'ato') return 'ato_sensor';
  if (v === 'autofeeder' || kind === 'autofeeder') return 'autofeeder';
  if (v === 'co2_kit' || kind === 'co2') return 'co2_kit';
  if (v === 'lid' || kind === 'lid') return 'lid';
  return 'unknown';
}

/** Deterministic physical layout of installed equipment. */
export function equipmentLayout(tank: Tank): EquipmentPlacement[] {
  const d = tankDims(tank);
  const out: EquipmentPlacement[] = [];
  const groups = new Map<EquipmentVisual, { eq: EquipmentInstance; def?: EquipmentDef }[]>();
  for (const eq of tank.equipment) {
    const def = getEquipmentDef(eq.defId);
    const v = equipmentVisual(eq, def);
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v)!.push({ eq, def });
  }
  const backZ = -d.W / 2;
  // lane:qa-visual — equipment is tucked into the two REAR CORNERS the way aquarists hide it, never mid-glass:
  //   right rear corner ("service corner"): filter returns (HOB / canister / sump overflow), heaters right beside
  //     them (under the HOB outflow), then HOB skimmer, CO2 diffuser, ATO sensor and refugium working inward;
  //   left rear corner ("flow corner"): sponge filters, airstones, powerheads high up, sump return, feeder and fan.
  // A sump hides its heaters in the sump (as real sump systems do), so none stand in the display.
  // Cursors track how far each cluster has grown inward from its side glass (metres from the glass).
  const count = (v: EquipmentVisual) => groups.get(v)?.length ?? 0;
  const sumps = count('sump');
  const hasSump = sumps > 0;
  // one sump drains through a corner overflow box; several (big exhibits) share a low coast-to-coast weir along the
  // top of the back glass (far less visual weight than a row of black towers) with their returns in both corners
  const c2c = sumps > 1;
  const heaterLen = Math.min(0.3, Math.max(0.14, d.waterY * 0.62));
  // right corner: sump overflow box (0.11 m) or canister outlet + spray bar (~0.09 m) own the glass edge
  let right = hasSump && !c2c ? 0.125 : count('canister') > 0 ? 0.09 : 0.012;
  const heaterX0 = d.L / 2 - Math.max(0.042, right + 0.034);
  const heaters = hasSump ? 0 : count('heater_tube');
  // the heater tops lean ~0.024 m inward (tilted tube) + a cap 0.013 m wide
  if (heaters > 0) right = Math.max(right, d.L / 2 - (heaterX0 - (heaters - 1) * 0.045) + 0.04);
  // canister: the outlet spray bar owns the glass edge (above); its intake strainer drops just inside the heaters
  const canisterIntakeIn = Math.max(0.13, right + 0.03);
  if (count('canister') > 0) right = canisterIntakeIn + 0.03;
  // HOB filters: intake tube sits 0.03 m left of the hang-on box (matches the AI collider in ai/registry.ts)
  const hobIntake0 = d.L / 2 - Math.max(0.105, right + 0.02);
  if (count('hob_filter') > 0) right = d.L / 2 - (hobIntake0 - (count('hob_filter') - 1) * 0.17) + 0.03;
  const skimmerX0 = d.L / 2 - (right + 0.035);
  if (count('skimmer') > 0) right += 0.035 + count('skimmer') * 0.1;
  const co2X0 = d.L / 2 - (right + 0.025);
  // left corner
  const spongeScale = Math.min(1.6, Math.max(0.8, d.H / 0.3));
  const spongeR = 0.034 * spongeScale;
  const left = 0.012 + count('sponge_filter') * (2 * spongeR + 0.02);
  const airX0 = -d.L / 2 + left + 0.022;
  for (const [visual, list] of groups) {
    list.forEach(({ eq, def }, n) => {
      const of = list.length;
      const running = eq.on && !eq.failed;
      const P = (pos: [number, number, number], rotY = 0, size = 1) => out.push({ eq, def, visual, n, of, pos, rotY, size, running });
      switch (visual) {
        case 'sponge_filter': {
          const x = -d.L / 2 + 0.014 + spongeR + n * (2 * spongeR + 0.02);
          const z = backZ + spongeR + 0.012;
          P([x, substrateHeightAt(tank, x, z) - 0.004, z], 0, spongeScale);
          break;
        }
        case 'hob_filter':
          P([hobIntake0 - n * 0.17 + 0.03, d.H, backZ], 0, eq.defId.includes('large') ? 1.25 : 1);
          break;
        case 'canister': {
          // pos = the intake strainer. n = 0 plumbs into the service corner; a second canister mirrors into the
          // left corner. TankEquipment draws the outlet at the same side's glass edge.
          const side = n % 2 === 0 ? 1 : -1;
          P([side * (d.L / 2 - (side > 0 ? canisterIntakeIn : 0.13)), d.waterY * 0.3, backZ + 0.024], side > 0 ? 0 : Math.PI, 1);
          break;
        }
        case 'sump': {
          // pos = this sump's return nozzle (TankEquipment draws the overflow: the right-corner box for a single sump,
          // the coast-to-coast weir once for several). Returns alternate left / right corner, stepping inward.
          const side = c2c && n % 2 === 1 ? 1 : -1;
          const k = c2c ? Math.floor(n / 2) : n;
          P([side * (d.L / 2 - 0.1 - k * 0.12), d.waterY - (c2c ? 0.085 : 0.05), backZ + (c2c ? 0.075 : 0.05)], 0, 1);
          break;
        }
        case 'heater_tube': {
          if (hasSump) break; // heaters live in the sump
          const x = heaterX0 - n * 0.045;
          P([x, d.substrateY + 0.03 + heaterLen / 2, backZ + 0.018], 0, heaterLen);
          break;
        }
        case 'chiller_box':
          P([d.L / 2 + 0.2 + n * 0.3, -standHeight(tank.tierId), backZ + 0.05], 0, 1);
          break;
        case 'fan_clip':
          P([-d.L / 2 + 0.2 + n * 0.12, d.H, backZ], 0, 1);
          break;
        case 'light_bar': {
          const seg = d.L / of;
          P([-d.L / 2 + seg * (n + 0.5), d.H + 0.028, -d.W * 0.04], 0, seg * 0.94);
          break;
        }
        case 'airstone': {
          const x = airX0 + n * 0.05;
          const z = backZ + 0.035;
          P([x, substrateHeightAt(tank, x, z) + 0.004, z], 0, 1);
          break;
        }
        case 'powerhead':
          // (inward of / under a second canister's plumbing or a coast-to-coast weir)
          P([-d.L / 2 + (c2c ? 0.36 : count('canister') > 1 ? 0.2 : 0.055) + n * 0.12, d.waterY - (c2c ? 0.105 : 0.075), backZ + 0.022], 0, eq.defId.includes('large') ? 1.35 : 1);
          break;
        case 'wavemaker':
          // high on the back glass beside the service corner (clear of the sump's overflow box)
          P([d.L / 2 - (hasSump ? 0.24 : 0.06) - n * 0.14, d.waterY - (c2c ? 0.11 : 0.09), backZ + 0.024], Math.PI, 1.35);
          break;
        case 'skimmer':
          P([skimmerX0 - n * 0.1, d.H, backZ], 0, 1);
          break;
        case 'refugium':
          // hangs outside the back glass; keep it behind the service corner too
          P([d.L / 2 - Math.max(0.12, right + 0.1) - n * 0.22, d.H, backZ], 0, 1);
          break;
        case 'uv_sterilizer':
          P([d.L * 0.36, d.H * 0.55, backZ - 0.07], 0, 1);
          break;
        case 'ato_sensor':
          if (hasSump) break; // the top-off sensor sits in the sump's return chamber
          P([d.L / 2 - 0.022 - n * 0.03, d.waterY, backZ + 0.004], 0, 1);
          break;
        case 'autofeeder':
          P([-d.L / 2 + 0.1 + n * 0.08, d.H, backZ + 0.03], 0, 1);
          break;
        case 'co2_kit':
          P([co2X0 - n * 0.05, d.substrateY + Math.max(0.05, d.waterY * 0.22), backZ + 0.02], 0, 1);
          break;
        default:
          break; // lid / sump skimmer / unknown: no in-tank prop
      }
    });
  }
  return out;
}

export function equipmentEmitters(tank: Tank): EquipmentEmitter[] {
  const d = tankDims(tank);
  const out: EquipmentEmitter[] = [];
  for (const p of equipmentLayout(tank)) {
    if (!p.running) continue;
    const id = p.eq.id;
    const set = p.eq.setting !== undefined && p.eq.setting <= 1.5 ? Math.max(0.15, p.eq.setting) : 1;
    const gph = (p.def?.stats.flowGph ?? 150) * set;
    switch (p.visual) {
      case 'sponge_filter': {
        const tubeTop = Math.min(d.waterY - 0.012, p.pos[1] + 0.09 * p.size + 0.12);
        out.push({ kind: 'bubbles', pos: [p.pos[0], tubeTop, p.pos[2]], rate: 16 * set, size: 0.0035, equipmentId: id });
        out.push({ kind: 'flow', pos: [p.pos[0], tubeTop, p.pos[2]], dir: [0.2, 0.3, 0.93], rate: 0.25 * set, size: 0.02, equipmentId: id });
        break;
      }
      case 'hob_filter': {
        out.push({ kind: 'waterfall', pos: [p.pos[0], d.waterY + 0.012, -d.W / 2 + 0.012], dir: [0, -0.94, 0.34], rate: gph / 100, size: 0.055 * p.size, equipmentId: id });
        out.push({ kind: 'bubbles', pos: [p.pos[0], d.waterY - 0.025, -d.W / 2 + 0.035], rate: 6 + gph / 40, size: 0.0014, equipmentId: id });
        out.push({ kind: 'flow', pos: [p.pos[0], d.waterY - 0.03, -d.W / 2 + 0.03], dir: [-0.35, -0.2, 0.91], rate: gph / 120, size: 0.05, equipmentId: id });
        break;
      }
      case 'canister': {
        const side = p.pos[0] >= 0 ? 1 : -1; // spray bar at this side's glass edge, jetting along the back glass
        out.push({ kind: 'flow', pos: [side * (d.L / 2 - 0.06), d.waterY - 0.04, -d.W / 2 + 0.03], dir: [-side * 0.96, -0.05, 0.27], rate: gph / 120, size: 0.03, equipmentId: id });
        break;
      }
      case 'sump': {
        const side = p.pos[0] >= 0 ? 1 : -1; // the return (p.pos) jets from its corner toward the middle
        out.push({ kind: 'flow', pos: [p.pos[0], p.pos[1], p.pos[2] - 0.01], dir: [-side * 0.85, -0.05, 0.52], rate: gph / 150, size: 0.03, equipmentId: id });
        break;
      }
      case 'airstone':
        out.push({ kind: 'bubbles', pos: [p.pos[0], p.pos[1] + 0.008, p.pos[2]], rate: 34 * set, size: 0.0022, equipmentId: id });
        break;
      case 'co2_kit':
        out.push({ kind: 'bubbles', pos: [p.pos[0], p.pos[1] + 0.02, p.pos[2] + 0.012], rate: 22, size: 0.0007, equipmentId: id });
        break;
      case 'powerhead':
        out.push({ kind: 'flow', pos: [p.pos[0] + 0.03, p.pos[1], p.pos[2] + 0.01], dir: [0.93, 0, 0.36], rate: gph / 150, size: 0.035 * p.size, equipmentId: id });
        break;
      case 'wavemaker':
        out.push({ kind: 'flow', pos: [p.pos[0] - 0.03, p.pos[1], p.pos[2] + 0.01], dir: [-0.93, 0, 0.36], rate: gph / 150, size: 0.045, equipmentId: id });
        break;
      case 'skimmer':
        out.push({ kind: 'bubbles', pos: [p.pos[0], d.waterY - 0.06, -d.W / 2 + 0.03], rate: 10, size: 0.0009, equipmentId: id });
        break;
      case 'refugium':
        out.push({ kind: 'flow', pos: [p.pos[0], d.waterY - 0.01, -d.W / 2 + 0.015], dir: [0, -0.5, 0.86], rate: 0.4, size: 0.03, equipmentId: id });
        break;
      default:
        break;
    }
  }
  return out;
}
