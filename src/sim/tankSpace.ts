/**
 * Tank geometry helpers — the single source of truth for tank dimensions in metres.
 * OWNER: core. Used by sim, AI and all renderers so visuals and colliders agree.
 * See src/types/runtime.ts for the tank-local coordinate convention.
 */
import type { Tank, DecorInstance, DecorDef, DecorAnchorTemplate } from '@/types';
import { getTankTier } from '@/data/catalog/tanks';

export const IN_TO_M = 0.0254;
/** Gap between water surface and the top rim (metres). */
export const RIM_GAP_M = 0.025;

export interface TankDims {
  /** Interior length (x), metres */
  L: number;
  /** Interior depth front-to-back (z), metres */
  W: number;
  /** Interior height (y), metres */
  H: number;
  /** Water surface height (y). */
  waterY: number;
  /** Top of substrate (y). */
  substrateY: number;
  /** Glass thickness in metres. */
  glass: number;
  gallons: number;
}

export function tankDims(tank: Pick<Tank, 'tierId' | 'substrate'> & { water?: { level: number } }): TankDims {
  const tier = getTankTier(tank.tierId);
  const L = tier.dimsIn.l * IN_TO_M;
  const W = tier.dimsIn.w * IN_TO_M;
  const H = tier.dimsIn.h * IN_TO_M;
  const level = tank.water?.level ?? 1;
  const fullWater = H - RIM_GAP_M;
  return {
    L,
    W,
    H,
    waterY: fullWater * Math.max(0.6, Math.min(1, level)),
    substrateY: Math.max(0, (tank.substrate?.depthCm ?? 0) / 100),
    glass: tier.glassMm / 1000,
    gallons: tier.gallons,
  };
}

/** Swimmable bounds with a margin from glass (metres). Creatures must stay within these. */
export function swimBounds(d: TankDims, marginM = 0.012) {
  return {
    minX: -d.L / 2 + marginM,
    maxX: d.L / 2 - marginM,
    minY: d.substrateY + marginM * 0.5,
    maxY: d.waterY - marginM * 0.5,
    minZ: -d.W / 2 + marginM,
    maxZ: d.W / 2 - marginM,
  };
}

export interface WorldAnchor {
  decorId: string;
  kind: DecorAnchorTemplate['kind'];
  pos: [number, number, number];
  capacity: number;
}

export interface DecorCollider {
  decorId: string;
  /** Axis-aligned ellipsoid-ish collider: centre + radii (tank-local metres). */
  center: [number, number, number];
  radius: [number, number, number];
}

/** Transform a decor anchor template into tank-local coordinates. */
export function decorAnchors(inst: DecorInstance, def: DecorDef): WorldAnchor[] {
  const c = Math.cos(inst.rotY);
  const s = Math.sin(inst.rotY);
  return def.anchors.map((a) => {
    const [ox, oy, oz] = a.offset;
    const x = inst.x + (ox * c + oz * s) * inst.scale;
    const z = inst.z + (-ox * s + oz * c) * inst.scale;
    return { decorId: inst.id, kind: a.kind, pos: [x, inst.y + oy * inst.scale, z], capacity: a.capacity };
  });
}

/** Collider approximating the decor's occupied volume. Visual generators must stay inside `def.size`. */
export function decorCollider(inst: DecorInstance, def: DecorDef): DecorCollider {
  const w = def.size.w * inst.scale;
  const d = def.size.d * inst.scale;
  const h = def.size.h * inst.scale;
  // rotate footprint: use the max half-extent for x/z when rotated
  const c = Math.abs(Math.cos(inst.rotY));
  const s = Math.abs(Math.sin(inst.rotY));
  const rx = (w * c + d * s) / 2;
  const rz = (w * s + d * c) / 2;
  return { decorId: inst.id, center: [inst.x, inst.y + h / 2, inst.z], radius: [rx, h / 2, rz] };
}

/** Rough water volume in litres (for chemistry). */
export const gallonsToLitres = (g: number) => g * 3.785;

/** Height of the tank's interior floor above the facility floor, by stand style (metres). */
export function standHeight(tierId: string): number {
  const tier = getTankTier(tierId);
  switch (tier.standStyle) {
    case 'desk':
      return 0.74;
    case 'cabinet':
      return 0.76;
    case 'rack':
      return 0.6;
    case 'built_in':
      return 0.8;
    case 'plinth':
      return 0.55;
  }
}

/**
 * World transform of a tank's local space: tank-local origin (interior floor centre) sits at
 * (placement.x, standHeight, placement.z) rotated by placement.rotY about +Y. The tank's front (+z local)
 * faces world +z when rotY = 0.
 */
export function tankWorldTransform(tank: Pick<Tank, 'tierId' | 'placement'>): { position: [number, number, number]; rotY: number } {
  return { position: [tank.placement.x, standHeight(tank.tierId), tank.placement.z], rotY: tank.placement.rotY };
}
