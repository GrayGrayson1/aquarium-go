/**
 * Per-frame (non-persisted) staff figures for the facility view. OWNER: lane "staff".
 *
 * The simulation (src/sim/staff) decides who works here, which tanks each aquarist looks after, when a keeper fed a
 * tank and when a docent gives a talk; this runtime turns that into people on the floor. During working hours
 * (7 AM – 8 PM) staff walk in through the entrance and:
 *  - aquarists patrol their tanks along A* paths on the facility nav grid, stop at a SERVICE spot beside or behind
 *    each tank (never in the visitors' viewing strip) and feed over the rim; a real keeper feeding (state.staff.feeds)
 *    sends that keeper to the tank next;
 *  - docents stand at a front corner of one of their exhibits, turned toward the viewing area, and talk with their
 *    hands (bigger gestures during a scheduled talk, which also moves them to that talk's exhibit);
 *  - the stock manager works from the counter / reception with a clipboard and now and then checks a tank.
 * Purely cosmetic: randomness here is Math.random; the game state is only read.
 */
import type { GameState, StaffMember, StaffRole, Tank } from '@/types';
import { getFacilityLevel } from '@/data/facilities';
import { stateReachability, findPath, isWalkable, tankFootprint, type Reachability } from '@/sim/facility/layout';
import { standHeight, tankDims } from '@/sim/tankSpace';
import { hourOfDay } from '@/sim/time';
import { roundVisits, VISIT_HOURS } from '@/sim/staff'; // lane:staff2 — the 9 PM round

export type StaffPose = 'walk' | 'feed' | 'talk' | 'idle' | 'clipboard';

export interface StaffAgent {
  id: string;
  role: StaffRole;
  name: string;
  seed: number;
  x: number;
  z: number;
  /** Facing angle: forward = (sin θ, cos θ). */
  heading: number;
  speed: number;
  walkSpeed: number;
  phase: number;
  sway: number;
  path: { x: number; z: number }[];
  pathIdx: number;
  mode: 'walk' | 'work' | 'leave';
  /** Pose once arrived. */
  pose: StaffPose;
  tankId: string | null;
  /** World point to face while working. */
  faceX: number;
  faceZ: number;
  /** Height the eyes/arm aim at (tank top for keepers, exhibit middle for docents). */
  lookY: number;
  /** Point the working hand reaches for (world; keepers: just inside the rim nearest them, aimY = rim height). */
  aimX: number;
  aimZ: number;
  aimY: number;
  /** Which arm does the work (+1 = the figure's left, −1 = its right). */
  arm: 1 | -1;
  timer: number;
  patrolIdx: number;
  /** Tank a real keeper feed just happened in (walk there next). */
  priorityTankId: string | null;
  /** Docent: talk currently being given (sim talk hour), so a new talk re-targets once. */
  talkHour: number;
  /** 0..1 presence (fades in at the door, out on leaving). */
  alpha: number;
  gone: boolean;
  /** Seconds since the current work pose began (gesture timing). */
  workT: number;
}

export const staffRuntime = {
  agents: new Map<string, StaffAgent>(),
  time: 0,
  reach: null as Reachability | null,
  reachT: -1,
  level: '',
  saveId: '',
  lastFeedSeq: -1,
};

/** Hours of the working day staff are on the floor. */
export const STAFF_ON_HOURS: [number, number] = [7, 20];

/**
 * lane:staff2 — a keeper with fast-metabolism tanks (discus, chromis, guppies…) stays on after 8 PM to give them their
 * 9 PM snack, and leaves once that round is done. Game hour-of-day the late shift ends (0 = no late round), cached per
 * keeper per game hour (the schedule reads the tanks' residents).
 */
const lateShift = new Map<string, { hour: number; end: number }>();
function lateShiftEnd(g: GameState, m: StaffMember): number {
  if (m.role !== 'aquarist') return 0;
  const hour = Math.floor(g.clock.hour);
  const hit = lateShift.get(m.id);
  if (hit && hit.hour === hour) return hit.end;
  let end = 0;
  try {
    const v = roundVisits(g, m, 'late');
    if (v.length) end = v[v.length - 1].at + VISIT_HOURS + 0.25;
  } catch {
    end = 0;
  }
  if (lateShift.size > 64) lateShift.clear();
  lateShift.set(m.id, { hour, end });
  return end;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function entrancePoints(g: GameState, r: Reachability | null): { inX: number; inZ: number; outX: number; outZ: number } {
  const def = getFacilityLevel(g.facility.level);
  const W = g.facility.width;
  const D = g.facility.depth;
  const ex = def.entrance.x * (W / def.width);
  const ez = def.entrance.z * (D / def.depth);
  const inX = r?.grid.entrancePoint.x ?? ex;
  const inZ = r?.grid.entrancePoint.z ?? ez;
  switch (def.entrance.side) {
    case 'right':
      return { inX, inZ, outX: W / 2 + 0.9, outZ: ez };
    case 'left':
      return { inX, inZ, outX: -W / 2 - 0.9, outZ: ez };
    default:
      return { inX, inZ, outX: ex, outZ: D / 2 + 1.0 };
  }
}

function reachOf(g: GameState): Reachability | null {
  const rt = staffRuntime;
  if (!rt.reach || rt.time - rt.reachT > 0.5) {
    try {
      const r = stateReachability(g);
      if (r !== rt.reach) {
        rt.reach = r;
        // layout changed: re-plan anyone walking
        for (const a of rt.agents.values()) if (a.mode !== 'work' && a.path.length) repath(a, r);
      }
    } catch {
      rt.reach = null;
    }
    rt.reachT = rt.time;
  }
  return rt.reach;
}

function repath(a: StaffAgent, r: Reachability): void {
  const goal = a.path[a.path.length - 1];
  if (!goal) return;
  const p = findPath(r.grid, { x: a.x, z: a.z }, goal);
  if (p && p.length) {
    p.push(goal);
    a.path = p;
    a.pathIdx = 0;
  }
}

/** World point from tank-local floor coords (x across the front, z toward the viewer). */
function tankLocal(t: Tank, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(t.placement.rotY);
  const s = Math.sin(t.placement.rotY);
  // local x axis in world = (cos, −sin); local z (front) = (sin, cos)
  return { x: t.placement.x + lx * c + lz * s, z: t.placement.z - lx * s + lz * c };
}

/** Height of the tank's top rim (metres above the floor). */
export function tankTopY(t: Tank): number {
  try {
    return standHeight(t.tierId) + tankDims(t).H;
  } catch {
    return 1.3;
  }
}

/** Nearest walkable point within `maxR` of (x, z) (rings of samples), or null. */
function snapWalkable(r: Reachability, x: number, z: number, maxR = 0.6): { x: number; z: number } | null {
  if (isWalkable(r.grid, x, z)) return { x, z };
  for (let rad = 0.12; rad <= maxR + 1e-6; rad += 0.12) {
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    const n = rad < 0.3 ? 8 : 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const px = x + Math.cos(a) * rad;
      const pz = z + Math.sin(a) * rad;
      if (!isWalkable(r.grid, px, pz)) continue;
      const d = Math.hypot(px - x, pz - z);
      if (d < bestD) {
        bestD = d;
        best = { x: px, z: pz };
      }
    }
    if (best) return best;
  }
  return null;
}

type Spot = { x: number; z: number; faceX: number; faceZ: number; arm: 1 | -1 };

/** Is another staff member standing at (or walking to) a spot within arm's reach of (x, z)? */
function taken(x: number, z: number, self: StaffAgent): boolean {
  for (const o of staffRuntime.agents.values()) {
    if (o === self || o.mode === 'leave') continue;
    const end = o.mode === 'walk' && o.path.length ? o.path[o.path.length - 1] : o;
    if (Math.hypot(end.x - x, end.z - z) < 0.62) return true;
  }
  return false;
}

/**
 * Where a keeper stands to work on a tank: beside it or behind it where there is room (out of the visitors' viewing
 * strip), otherwise just off a front corner, reaching over the rim near that end. Picks the nearest workable spot.
 */
function serviceSpot(t: Tank, r: Reachability, from: { x: number; z: number }, self?: StaffAgent): Spot | null {
  const fp = tankFootprint(t.tierId, t.placement);
  const cands: { lx: number; lz: number; arm: 1 | -1; fx: number; fz: number; pen: number }[] = [];
  for (const side of [-1, 1] as const) {
    // beside the tank, a little toward the back
    cands.push({ lx: side * (fp.hx + 0.3), lz: -fp.hz * 0.25, arm: side === 1 ? 1 : -1, fx: side * fp.hx * 0.6, fz: -fp.hz * 0.2, pen: 0 });
    // behind a back corner
    cands.push({ lx: side * fp.hx * 0.55, lz: -(fp.hz + 0.3), arm: side === 1 ? 1 : -1, fx: side * fp.hx * 0.55, fz: 0, pen: 0.2 });
    // off a front corner (tanks in a row against a wall)
    cands.push({ lx: side * (fp.hx + 0.1), lz: fp.hz + 0.3, arm: side === 1 ? 1 : -1, fx: side * fp.hx * 0.7, fz: 0, pen: 1.2 });
  }
  let best: Spot | null = null;
  let bestD = Infinity;
  for (const c of cands) {
    const want = tankLocal(t, c.lx, c.lz);
    const p = snapWalkable(r, want.x, want.z, 0.55);
    if (p && self && taken(p.x, p.z, self)) continue;
    if (!p) continue;
    const d = Math.hypot(p.x - from.x, p.z - from.z) * 0.15 + Math.hypot(p.x - want.x, p.z - want.z) * 2 + c.pen;
    if (d < bestD) {
      bestD = d;
      const f = tankLocal(t, c.fx, c.fz);
      best = { x: p.x, z: p.z, faceX: f.x, faceZ: f.z, arm: c.arm };
    }
  }
  return best;
}

/** Docent spot: just off a front corner of the exhibit, turned toward the viewing area. */
function docentSpot(t: Tank, r: Reachability, prefer: number, self?: StaffAgent): Spot | null {
  const fp = tankFootprint(t.tierId, t.placement);
  for (const side of [prefer, -prefer]) {
    for (const [ox, oz] of [
      [0.3, 0.35],
      [0.1, 0.55],
      [0.5, 0.2],
    ]) {
      const want = tankLocal(t, side * (fp.hx + ox), fp.hz + oz);
      const p = snapWalkable(r, want.x, want.z, 0.5);
      if (p && self && taken(p.x, p.z, self)) continue;
      if (!p) continue;
      // face the crowd in front of the glass (diagonally), so both the tank and the visitors are "in the conversation"
      const f = tankLocal(t, side * fp.hx * 0.1, fp.hz + 2.2);
      // the arm nearer the tank sweeps toward it
      return { x: p.x, z: p.z, faceX: f.x, faceZ: f.z, arm: side > 0 ? -1 : 1 };
    }
  }
  return null;
}

function counterSpot(g: GameState, r: Reachability): { x: number; z: number; faceX: number; faceZ: number } | null {
  const def = getFacilityLevel(g.facility.level);
  const prop = def.props.find((p) => p.kind === 'counter' || p.kind === 'reception');
  if (prop) {
    const c = Math.cos(prop.rotY);
    const s = Math.sin(prop.rotY);
    for (const [lx, lz] of [
      [0, -(prop.d / 2 + 0.35)],
      [prop.w / 2 + 0.35, 0],
      [-(prop.w / 2 + 0.35), 0],
      [0, prop.d / 2 + 0.35],
    ]) {
      const x = prop.x + lx * c + lz * s;
      const z = prop.z - lx * s + lz * c;
      if (isWalkable(r.grid, x, z)) return { x, z, faceX: prop.x, faceZ: prop.z };
    }
  }
  // no counter: a quiet spot a couple of metres into the room from the entrance
  const ep = r.grid.entrancePoint;
  const dx = -ep.x;
  const dz = -ep.z;
  const l = Math.hypot(dx, dz) || 1;
  for (const k of [2.2, 1.6, 2.8, 1.2]) {
    const x = ep.x + (dx / l) * k + (-dz / l) * 0.8;
    const z = ep.z + (dz / l) * k + (dx / l) * 0.8;
    if (isWalkable(r.grid, x, z)) return { x, z, faceX: 0, faceZ: 0 };
  }
  return null;
}

function walkTo(a: StaffAgent, r: Reachability, x: number, z: number): boolean {
  const p = findPath(r.grid, { x: a.x, z: a.z }, { x, z });
  if (!p) return false;
  p.push({ x, z });
  a.path = p;
  a.pathIdx = 0;
  a.mode = 'walk';
  return true;
}

function goWork(a: StaffAgent, g: GameState, r: Reachability, t: Tank | null, spot: { x: number; z: number; faceX: number; faceZ: number; arm?: 1 | -1 } | null, pose: StaffPose, seconds: number, lookY: number): boolean {
  if (!spot) return false;
  a.tankId = t?.id ?? null;
  a.pose = pose;
  a.faceX = spot.faceX;
  a.faceZ = spot.faceZ;
  a.lookY = lookY;
  a.arm = spot.arm ?? a.arm;
  a.timer = seconds;
  if (t) {
    // the point of the water surface they reach to: the rim point nearest their spot, a hand's width inside
    const d = tankDims(t);
    const c = Math.cos(t.placement.rotY);
    const s = Math.sin(t.placement.rotY);
    const dx = spot.x - t.placement.x;
    const dz = spot.z - t.placement.z;
    const lx = Math.max(-d.L / 2 + 0.07, Math.min(d.L / 2 - 0.07, dx * c - dz * s));
    const lz = Math.max(-d.W / 2 + 0.07, Math.min(d.W / 2 - 0.07, dx * s + dz * c));
    const p = tankLocal(t, lx, lz);
    a.aimX = p.x;
    a.aimZ = p.z;
    a.aimY = tankTopY(t);
    if (pose === 'feed') {
      a.faceX = p.x;
      a.faceZ = p.z;
    }
  } else {
    a.aimX = spot.faceX;
    a.aimZ = spot.faceZ;
    a.aimY = lookY;
  }
  if (Math.hypot(spot.x - a.x, spot.z - a.z) < 0.15) {
    a.mode = 'work';
    a.workT = 0;
    a.path = [];
    return true;
  }
  return walkTo(a, r, spot.x, spot.z);
}

function activeTalk(g: GameState, id: string): { hour: number; tankId: string } | null {
  const h = g.clock.hour;
  for (const t of g.staff?.talks ?? []) if (t.staffId === id && h >= t.hour && h < t.untilHour && g.tanks[t.tankId]) return t;
  return null;
}

function nextTask(a: StaffAgent, m: StaffMember, g: GameState, r: Reachability): void {
  const tanks = m.tankIds.map((id) => g.tanks[id]).filter((t): t is Tank => !!t);
  if (m.role === 'aquarist') {
    let t: Tank | null = null;
    if (a.priorityTankId && g.tanks[a.priorityTankId]) t = g.tanks[a.priorityTankId];
    a.priorityTankId = null;
    if (!t && tanks.length) t = tanks[a.patrolIdx++ % tanks.length];
    if (!t) {
      // nothing assigned: look in on any tank now and then
      const ids = g.tankOrder.filter((id) => g.tanks[id]);
      t = ids.length ? g.tanks[ids[Math.floor(Math.random() * ids.length)]] : null;
      if (t && goWork(a, g, r, t, serviceSpot(t, r, a, a), 'idle', rand(5, 9), tankTopY(t) - 0.2)) return;
      a.mode = 'work';
      a.pose = 'idle';
      a.timer = rand(4, 8);
      return;
    }
    if (goWork(a, g, r, t, serviceSpot(t, r, a, a), 'feed', rand(3.5, 5), tankTopY(t))) return;
    // unreachable service spot: skip it this lap
    a.mode = 'work';
    a.pose = 'idle';
    a.timer = 1;
    return;
  }
  if (m.role === 'docent') {
    const talk = activeTalk(g, m.id);
    let t: Tank | null = talk ? g.tanks[talk.tankId] : null;
    if (talk) a.talkHour = talk.hour;
    if (!t && tanks.length) t = tanks[a.patrolIdx++ % tanks.length];
    if (!t) {
      const ids = g.tankOrder.filter((id) => g.tanks[id]);
      t = ids.length ? g.tanks[ids[0]] : null;
    }
    if (t) {
      const d = tankDims(t);
      const prefer = (a.seed & 1) === 0 ? 1 : -1;
      if (goWork(a, g, r, t, docentSpot(t, r, prefer, a), 'talk', talk ? rand(14, 22) : rand(16, 30), standHeight(t.tierId) + d.H * 0.5)) return;
    }
    a.mode = 'work';
    a.pose = 'idle';
    a.timer = rand(4, 8);
    return;
  }
  // stock manager: mostly at the counter with a clipboard, now and then checking a tank's supplies cupboard
  if (Math.random() < 0.3 && g.tankOrder.length) {
    const ids = g.tankOrder.filter((id) => g.tanks[id]);
    const t = g.tanks[ids[Math.floor(Math.random() * ids.length)]];
    if (t && goWork(a, g, r, t, serviceSpot(t, r, a, a), 'clipboard', rand(3, 5), tankTopY(t) - 0.3)) return;
  }
  const c = counterSpot(g, r);
  if (c && goWork(a, g, r, null, c, 'clipboard', rand(9, 16), 1.1)) return;
  a.mode = 'work';
  a.pose = 'clipboard';
  a.timer = rand(6, 10);
}

function spawn(g: GameState, m: StaffMember, r: Reachability): StaffAgent {
  const e = entrancePoints(g, r);
  const seed = Number.isFinite(m.avatarSeed) ? m.avatarSeed >>> 0 : hashSeed(m.id);
  const a: StaffAgent = {
    id: m.id,
    role: m.role,
    name: m.name,
    seed,
    x: e.outX + rand(-0.3, 0.3),
    z: e.outZ + rand(-0.2, 0.2),
    heading: Math.atan2(e.inX - e.outX, e.inZ - e.outZ),
    speed: 0,
    walkSpeed: rand(1.0, 1.2),
    phase: Math.random() * 6.28,
    sway: Math.random() * 6.28,
    path: [],
    pathIdx: 0,
    mode: 'walk',
    pose: 'idle',
    tankId: null,
    faceX: 0,
    faceZ: 0,
    lookY: 1.2,
    aimX: 0,
    aimZ: 0,
    aimY: 1.2,
    arm: -1,
    timer: 0,
    patrolIdx: seed % 7,
    priorityTankId: null,
    talkHour: -1,
    alpha: 0,
    gone: false,
    workT: 0,
  };
  return a;
}

/** Put staff straight at work (first frame of a save / fixture): nobody should be seen queueing at the door. */
function placeAtWork(a: StaffAgent, m: StaffMember, g: GameState, r: Reachability): void {
  // plan from inside the doorway (the spawn point is outside the room, off the nav grid)
  const e0 = entrancePoints(g, r);
  a.x = e0.inX;
  a.z = e0.inZ;
  nextTask(a, m, g, r);
  const end = a.path[a.path.length - 1];
  if (a.mode === 'walk' && end) {
    a.x = end.x;
    a.z = end.z;
    a.path = [];
    a.mode = 'work';
    a.workT = Math.random() * 3;
    a.heading = Math.atan2(a.faceX - a.x, a.faceZ - a.z);
  } else {
    // no spot: stand just inside the entrance
    const e = entrancePoints(g, r);
    a.x = e.inX;
    a.z = e.inZ;
  }
  a.alpha = 1;
}

function leave(g: GameState, a: StaffAgent, r: Reachability | null): void {
  a.mode = 'leave';
  a.tankId = null;
  const e = entrancePoints(g, r);
  let p: { x: number; z: number }[] | null = null;
  if (r) p = findPath(r.grid, { x: a.x, z: a.z }, r.grid.entrancePoint);
  a.path = [...(p ?? []), { x: e.inX, z: e.inZ }, { x: e.outX, z: e.outZ }];
  a.pathIdx = 0;
}

function turnToward(a: StaffAgent, target: number, k: number): void {
  let d = target - a.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  a.heading += d * Math.min(1, k);
}

export interface StaffStepOptions {
  reducedMotion: boolean;
  speed: number;
}

/** Advance all staff figures; call once per frame from the renderer. */
export function stepStaffRuntime(dt: number, g: GameState | null, opts: StaffStepOptions): void {
  const rt = staffRuntime;
  const step = Math.min(0.1, Math.max(0, dt));
  rt.time += step;
  if (!g || g.isShowcase || !g.staff) {
    rt.agents.clear();
    rt.lastFeedSeq = -1;
    return;
  }
  // a different venue level or a different save: start fresh, with everyone already at work
  const firstLook = rt.level !== g.facility.level || rt.saveId !== g.saveId;
  if (firstLook) {
    rt.agents.clear();
    rt.reach = null;
    rt.level = g.facility.level;
    rt.saveId = g.saveId;
    rt.lastFeedSeq = -1;
  }
  const r = reachOf(g);
  if (!r) return;
  const roster = g.staff.roster ?? [];
  const hod = hourOfDay(g.clock.hour);
  const onDuty = hod >= STAFF_ON_HOURS[0] && hod < STAFF_ON_HOURS[1];
  const pace = Math.min(1.8, Math.sqrt(Math.max(1, opts.speed || 1)));

  // new keeper feeds → that keeper heads to the tank next
  const feeds = g.staff.feeds ?? [];
  const maxSeq = feeds.length ? feeds[feeds.length - 1].seq : 0;
  if (rt.lastFeedSeq < 0) rt.lastFeedSeq = maxSeq;
  else if (maxSeq > rt.lastFeedSeq) {
    for (const f of feeds) {
      if (f.seq <= rt.lastFeedSeq) continue;
      const a = rt.agents.get(f.staffId);
      if (a && a.mode !== 'leave' && a.tankId !== f.tankId) {
        a.priorityTankId = f.tankId;
        // cut a long idle short
        if (a.mode === 'work' && a.pose !== 'feed') a.timer = Math.min(a.timer, 0.4);
      }
    }
    rt.lastFeedSeq = maxSeq;
  }

  // who should be on the floor
  const ids = new Set<string>();
  for (const m of roster) {
    ids.add(m.id);
    let a = rt.agents.get(m.id);
    const duty = onDuty || (hod >= STAFF_ON_HOURS[1] && hod < lateShiftEnd(g, m)); // lane:staff2
    if (duty && (!a || a.mode === 'leave')) {
      if (!a) {
        a = spawn(g, m, r);
        rt.agents.set(m.id, a);
        if (firstLook || rt.time < 1.5) placeAtWork(a, m, g, r);
        else {
          // clock in: walk in through the door, then pick up the first job
          const e = entrancePoints(g, r);
          a.path = [{ x: e.inX, z: e.inZ }];
          a.pathIdx = 0;
          a.mode = 'walk';
          a.timer = 0;
        }
      } else {
        a.mode = 'work';
        a.timer = 0;
      }
    } else if (!duty && a && a.mode !== 'leave') leave(g, a, r);
    if (a) a.name = m.name;
  }
  for (const [id, a] of rt.agents) if (!ids.has(id) && a.mode !== 'leave') leave(g, a, r);

  for (const a of rt.agents.values()) {
    const m = roster.find((x) => x.id === a.id);
    a.sway += step;
    a.alpha = a.mode === 'leave' && a.pathIdx >= a.path.length - 1 ? Math.max(0, a.alpha - step * 1.5) : Math.min(1, a.alpha + step * 1.5);
    if (a.mode === 'walk' || a.mode === 'leave') {
      const wp = a.path[a.pathIdx];
      if (!wp) {
        if (a.mode === 'leave') a.gone = true;
        else {
          a.mode = 'work';
          a.workT = 0;
        }
        continue;
      }
      const dx = wp.x - a.x;
      const dz = wp.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        a.pathIdx++;
        if (a.pathIdx >= a.path.length) {
          if (a.mode === 'leave') a.gone = true;
          else {
            a.mode = 'work';
            a.workT = 0;
            a.path = [];
          }
        }
        continue;
      }
      const sp = a.walkSpeed * (opts.reducedMotion ? 0.85 : 1) * pace;
      a.speed += (sp - a.speed) * Math.min(1, step * 4);
      const mv = Math.min(dist, a.speed * step);
      a.x += (dx / dist) * mv;
      a.z += (dz / dist) * mv;
      turnToward(a, Math.atan2(dx, dz), step * 6);
      a.phase += a.speed * step * 2.9;
    } else {
      a.speed += (0 - a.speed) * Math.min(1, step * 6);
      a.workT += step;
      if (a.pose === 'talk' || a.pose === 'feed' || a.pose === 'clipboard' || a.pose === 'idle') turnToward(a, Math.atan2(a.faceX - a.x, a.faceZ - a.z), step * 3);
      // docents: a new talk pulls them to that exhibit straight away
      if (m && m.role === 'docent') {
        const talk = activeTalk(g, m.id);
        if (talk && talk.hour !== a.talkHour) a.timer = 0;
      }
      // the tank they were working on is gone (sold / moved)
      if (a.tankId && !g.tanks[a.tankId]) a.timer = 0;
      a.timer -= step * pace;
      if (a.timer <= 0 && m) nextTask(a, m, g, r);
    }
  }
  // gentle separation between staff (visitors keep their own spacing)
  const list = [...rt.agents.values()];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      const min = 0.45;
      if (d2 > 1e-6 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5 * Math.min(1, step * 8);
        const aw = a.mode === 'work' ? 0.3 : 1;
        const bw = b.mode === 'work' ? 0.3 : 1;
        a.x -= dx * push * aw;
        a.z -= dz * push * aw;
        b.x += dx * push * bw;
        b.z += dz * push * bw;
      }
    }
  }
  for (const [id, a] of rt.agents) if (a.gone || !Number.isFinite(a.x) || !Number.isFinite(a.z)) rt.agents.delete(id);
}

export function resetStaffRuntime(): void {
  staffRuntime.agents.clear();
  staffRuntime.reach = null;
  staffRuntime.level = '';
  staffRuntime.saveId = '';
  staffRuntime.lastFeedSeq = -1;
}
