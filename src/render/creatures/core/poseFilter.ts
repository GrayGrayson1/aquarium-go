/**
 * Presentation smoothing for creature transforms: a One-Euro filter (Casiez, Roussel & Vogel, CHI 2012) on position
 * and on yaw/pitch/roll. It smooths hard when a body is (nearly) still and hardly at all when it moves fast. That
 * removes the frame-to-frame micro-oscillation behaviour constraints can still produce in cramped spots (a stone at
 * the nose, the glass at the flank, a hover target inside a plant) without adding visible lag to swimming, darting
 * or turning. Only what is drawn is filtered; the simulation and AI state are untouched. OWNER: lane "fishart".
 */

export interface PoseFilter {
  /** Clock time of the last sample (a gap resets the filter, e.g. after the creature was hidden). */
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  // derivative estimates (body lengths / s and rad / s)
  dx: number;
  dy: number;
  dz: number;
  dyaw: number;
  dpitch: number;
  droll: number;
}

// position: cutoff (Hz) = POS_MIN + POS_BETA × speed in body lengths / s
const POS_MIN = 1.2;
const POS_BETA = 4;
// angles: cutoff (Hz) = ANG_MIN + ANG_BETA × angular speed in rad / s
const ANG_MIN = 1.5;
const ANG_BETA = 1.6;
/** Cutoff of the derivative estimate itself (Hz). */
const D_CUTOFF = 1;
/** A sample gap longer than this (s), or a jump longer than JUMP_BL body lengths in one frame, restarts the filter. */
const GAP = 0.25;
const JUMP_BL = 1.5;

export function makePoseFilter(): PoseFilter {
  return { t: -1e9, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, dx: 0, dy: 0, dz: 0, dyaw: 0, dpitch: 0, droll: 0 };
}

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Feed this frame's raw transform (tank-local metres, radians) for a body of length `L` metres; the filtered
 * transform is written back into `f` (f.x … f.roll). `t` is the render clock, `dt` the frame time.
 */
export function filterPose(f: PoseFilter, x: number, y: number, z: number, yaw: number, pitch: number, roll: number, L: number, t: number, dt: number): void {
  const len = Math.max(L, 1e-3);
  const jump = Math.hypot(x - f.x, y - f.y, z - f.z) > len * JUMP_BL;
  if (t - f.t > GAP || dt <= 0 || jump) {
    f.x = x;
    f.y = y;
    f.z = z;
    f.yaw = yaw;
    f.pitch = pitch;
    f.roll = roll;
    f.dx = f.dy = f.dz = f.dyaw = f.dpitch = f.droll = 0;
    f.t = t;
    return;
  }
  f.t = t;
  const ad = alpha(D_CUTOFF, dt);
  // position (one cutoff for all three axes, from the smoothed speed)
  const vx = (x - f.x) / len / dt;
  const vy = (y - f.y) / len / dt;
  const vz = (z - f.z) / len / dt;
  f.dx += (vx - f.dx) * ad;
  f.dy += (vy - f.dy) * ad;
  f.dz += (vz - f.dz) * ad;
  const ap = alpha(POS_MIN + POS_BETA * Math.hypot(f.dx, f.dy, f.dz), dt);
  f.x += (x - f.x) * ap;
  f.y += (y - f.y) * ap;
  f.z += (z - f.z) * ap;
  // angles (wrapped differences so a heading crossing ±π never spins the long way round)
  const ey = wrap(yaw - f.yaw);
  const ep = wrap(pitch - f.pitch);
  const er = wrap(roll - f.roll);
  f.dyaw += (ey / dt - f.dyaw) * ad;
  f.dpitch += (ep / dt - f.dpitch) * ad;
  f.droll += (er / dt - f.droll) * ad;
  const aa = alpha(ANG_MIN + ANG_BETA * Math.hypot(f.dyaw, f.dpitch, f.droll), dt);
  f.yaw = wrap(f.yaw + ey * aa);
  f.pitch += ep * aa;
  f.roll = wrap(f.roll + er * aa);
}
