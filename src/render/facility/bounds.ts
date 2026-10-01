/** Camera bounds for the facility overview (used by the waterfx lane's CameraRig). OWNER: lane "facility". */
import type { FacilityLevelId, FacilityState, GameState } from '@/types';
import { getFacilityLevel } from '@/data/facilities';
import { tankDims, tankWorldTransform } from '@/sim/tankSpace';
import { ROOM_STYLES } from './styles';

export function facilityCameraBounds(fac: FacilityState): { minX: number; maxX: number; minZ: number; maxZ: number; minDist: number; maxDist: number; target: [number, number, number] } {
  const lvl = getFacilityLevel(fac.level);
  const w = Math.max(2, fac.width);
  const d = Math.max(2, fac.depth);
  const big = Math.max(w, d);
  // keep the orbit target inside the room, slightly toward the back wall where the tanks live
  const inset = Math.min(0.6, big * 0.08);
  const targetY = lvl.order === 0 ? 0.95 : Math.min(2.6, 1.15 + lvl.order * 0.28);
  return {
    minX: -w / 2 + inset,
    maxX: w / 2 - inset,
    minZ: -d / 2 + inset,
    maxZ: d / 2 - inset,
    // the rig frames the room at max(minDist × 1.8, diagonal × 0.62): small rooms need a little extra room to breathe
    minDist: Math.max(1.2, Math.min(4.6, big * 0.68)),
    maxDist: big * 1.15 + 3,
    target: [0, targetY, -d * 0.04],
  };
}

/** Suggested overview pose (for cameras that want a nice default framing). */
export function facilityOverviewPose(fac: FacilityState): { position: [number, number, number]; target: [number, number, number] } {
  const b = facilityCameraBounds(fac);
  const diag = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ);
  const dist = Math.min(b.maxDist, Math.max(b.minDist * 1.8, diag * 0.62));
  const pitch = 0.62;
  return {
    position: [b.target[0], b.target[1] + Math.sin(pitch) * dist, b.target[2] + Math.cos(pitch) * dist],
    target: b.target,
  };
}

/**
 * Default overview framing that makes the EXHIBITS the subject (not the floor): look-at point just in front of the
 * size-weighted exhibit line, the world width that should fill the free viewport there, and a low-ish pitch so the
 * glowing tanks sit in the middle band of the frame while the floor recedes. Big halls frame the heart of the
 * exhibit wall rather than squeezing every tank in (the player pans/zooms from there). OWNER: render.
 */
export interface ExhibitFrame {
  target: [number, number, number];
  /** World width (m) to fit across the free viewport at the target depth. */
  width: number;
  /** The whole exhibit row + air (m): what `width` compresses in big halls; wide screens may fit it (lane:facrender). */
  fullWidth: number;
  /** World height (m) of the exhibit band to fit vertically. */
  height: number;
  yaw: number;
  pitch: number;
  /** Vertical field of view (degrees) for the overview lens. */
  fov: number;
}

export function facilityExhibitFrame(g: Pick<GameState, 'facility' | 'tanks' | 'tankOrder'>): ExhibitFrame {
  const fac = g.facility;
  const lvl = getFacilityLevel(fac.level);
  const hobby = lvl.order === 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let wSum = 0;
  let fz = 0;
  let fy = 0;
  let topY = 0;
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    const d = tankDims(t);
    const { position, rotY } = tankWorldTransform(t);
    const c = Math.abs(Math.cos(rotY));
    const s = Math.abs(Math.sin(rotY));
    const hx = (d.L * c + d.W * s) / 2;
    const hz = (d.L * s + d.W * c) / 2;
    minX = Math.min(minX, position[0] - hx);
    maxX = Math.max(maxX, position[0] + hx);
    // weight by display length: the big exhibits define where the eye should go
    const w = Math.max(0.3, d.L);
    wSum += w;
    fz += (position[2] + hz) * w;
    fy += (position[1] + d.H * 0.55) * w;
    topY = Math.max(topY, position[1] + d.H);
  }
  const b = facilityCameraBounds(fac);
  if (!(wSum > 0)) {
    return { target: b.target, width: Math.max(3, fac.width * 0.7), fullWidth: Math.max(3, fac.width * 0.7), height: 2, yaw: 0, pitch: hobby ? 0.42 : 0.4, fov: 36 };
  }
  const cx = (minX + maxX) / 2;
  const span = maxX - minX;
  // small rooms: the whole exhibit row + air; big halls: compress so the tanks stay large
  const width = Math.max(hobby ? 2.6 : 4.2, span <= 8 ? span + 1.4 : 8 + (span - 8) * 0.3 + 1.4);
  const frontZ = fz / wSum;
  const target: [number, number, number] = [
    Math.max(b.minX, Math.min(b.maxX, cx)),
    // public rooms: aim a little above the tanks so the architecture frames them and the floor recedes
    Math.max(0.7, Math.min(2.6, fy / wSum + (lvl.order >= 3 ? 0.35 : 0))),
    Math.max(b.minZ, Math.min(b.maxZ, frontZ + (hobby ? 0.35 : Math.min(1.6, 0.4 + width * 0.04)))),
  ];
  // shops look over the visitors' heads at the wall of tanks; halls are big enough to go lower and more cinematic
  const hall = lvl.order >= 3;
  const pitch = hobby ? 0.3 : hall ? 0.22 : 0.42;
  return { target, width, fullWidth: Math.max(width, span + 1.4), height: Math.max(1.4, topY + 0.6), yaw: 0, pitch, fov: hall ? 30 : 36 };
}

/**
 * lane:qa-visual — world-space extent of the exhibit row (x span of every tank's footprint and the highest glass
 * top). The back-wall shop sign sizes and places itself from this so it always sits just above the tanks, inside
 * the overview framing, instead of floating up under the HUD in a small shop.
 */
export function exhibitExtent(g: Pick<GameState, 'tanks' | 'tankOrder'>): { minX: number; maxX: number; topY: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let topY = 0;
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    const d = tankDims(t);
    const { position, rotY } = tankWorldTransform(t);
    const hx = (d.L * Math.abs(Math.cos(rotY)) + d.W * Math.abs(Math.sin(rotY))) / 2;
    minX = Math.min(minX, position[0] - hx);
    maxX = Math.max(maxX, position[0] + hx);
    topY = Math.max(topY, position[1] + d.H);
  }
  return Number.isFinite(minX) && Number.isFinite(maxX) ? { minX, maxX, topY } : null;
}

/** Air kept between the back-wall sign and a column shaft (the base and capital flare out past the shaft). */
const SIGN_COLUMN_CLEARANCE = 0.45;

/**
 * The back-wall shop sign's placement (centre x/y, width, height), shared by PublicRoom's <Sign> and the dressing
 * that keeps clear of it. It hangs just above the exhibit row and no wider than it (plus some air), and
 * (lane:fix-integrate-ui, G2-07) stays inside the clear bay between back-wall columns, so a long exhibit row in the
 * Grand Hall no longer runs the name behind a pillar.
 */
export function backWallSign(level: FacilityLevelId, W: number, ext: { minX: number; maxX: number; topY: number } | null): { x: number; y: number; w: number; h: number } | null {
  const def = getFacilityLevel(level);
  const style = ROOM_STYLES[level];
  if (!(style.sign.w > 0)) return null;
  const span = ext ? ext.maxX - ext.minX : W;
  let w = Math.min(W * 0.5, style.sign.w, Math.max(2.2, span * (def.order >= 3 ? 1.1 : 0.8)));
  let x = ext ? clamp((ext.minX + ext.maxX) / 2, -W / 2 + w / 2 + 0.3, W / 2 - w / 2 - 0.3) : 0;
  // the clear bay around the sign's centre, between the nearest back-wall columns on either side
  let lo = -W / 2 + 0.3;
  let hi = W / 2 - 0.3;
  for (const p of def.props) {
    if (p.kind !== 'column' || p.z > -def.depth / 2 + 1) continue;
    if (p.x <= x) lo = Math.max(lo, p.x + p.w / 2 + SIGN_COLUMN_CLEARANCE);
    else hi = Math.min(hi, p.x - p.w / 2 - SIGN_COLUMN_CLEARANCE);
  }
  if (hi > lo) {
    w = Math.min(w, hi - lo);
    x = clamp(x, lo + w / 2, hi - w / 2);
  }
  const h = w * 0.22;
  const gap = [0, 0.2, 0.3, 0.5, 0.7, 0.9][def.order] ?? 0.5;
  const y = Math.max(1.5, Math.min(def.wallHeight - h / 2 - 0.15, style.sign.y, ext ? ext.topY + gap + h / 2 : Infinity));
  return { x, y, w, h };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
