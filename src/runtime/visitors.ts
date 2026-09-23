/**
 * Per-frame (non-persisted) visitor agents for the facility view. OWNER: lane "facility".
 *
 * The simulation (src/sim/facility/visitors.ts) decides how many people are inside, their archetype mix, and the
 * reactions they have; this runtime turns that into walking people: they enter through the door, follow A* paths
 * on the facility nav grid between exhibits, pause to look (kids press close to the glass), sometimes rest on a
 * bench, and sparkle when a real "wow" reaction lands on the tank they are watching. Purely cosmetic randomness.
 */
import * as THREE from 'three';
import type { GameState } from '@/types';
import { getFacilityLevel } from '@/data/facilities';
import { FIXTURE_DEFS } from '@/data/facilities';
import { stateReachability, findPath, isWalkable, tankFootprint, type Reachability } from '@/sim/facility/layout';
import { isOpenAt } from '@/sim/facility/visitors';
import { standHeight, tankDims } from '@/sim/tankSpace';

export type AgentState = 'walk' | 'view' | 'sit' | 'leave';

export interface VisitorAgent {
  id: number;
  x: number;
  z: number;
  /** Facing angle: forward = (sin θ, cos θ). */
  heading: number;
  speed: number;
  walkSpeed: number;
  path: { x: number; z: number }[];
  pathIdx: number;
  state: AgentState;
  targetTankId: string | null;
  /** Where to face when arrived (world point), e.g. the tank centre. */
  faceX: number;
  faceZ: number;
  lookY: number;
  timer: number;
  visitsLeft: number;
  phase: number;
  height: number;
  build: number;
  kid: boolean;
  skin: THREE.Color;
  hair: THREE.Color;
  top: THREE.Color;
  bottom: THREE.Color;
  hairStyle: 0 | 1 | 2;
  bag: boolean;
  wowT: number;
  gesture: number;
  sway: number;
  friend: boolean;
  /** 0..1 fade in/out. */
  alpha: number;
  despawn: boolean;
  seat?: { x: number; z: number; rot: number; fixtureId: string };
  exitX: number;
  exitZ: number;
}

export interface Sparkle {
  x: number;
  y: number;
  z: number;
  t: number;
  vx: number;
  vz: number;
  size: number;
}

export const visitorRuntime = {
  agents: [] as VisitorAgent[],
  sparkles: [] as Sparkle[],
  time: 0,
  nextId: 1,
  spawnCooldown: 0,
  reach: null as Reachability | null,
  reachT: -1,
  lastReactionKey: '',
  seen: new Set<string>(),
  lastLevel: '',
  warmed: false,
};

function pickMix(mix: Record<string, number> | undefined): string {
  let tot = 0;
  for (const v of Object.values(mix ?? {})) tot += v;
  if (!mix || tot <= 0) return 'family';
  let k = Math.random() * tot;
  for (const [id, v] of Object.entries(mix)) {
    k -= v;
    if (k <= 0) return id;
  }
  return 'family';
}

const SKIN = ['#f1d3bd', '#e8bf9f', '#d9a57f', '#c68b62', '#a8704b', '#8a5638', '#6b4029', '#4f2f1f'];
const HAIR = ['#1b1512', '#2b1d15', '#3d2a1c', '#5a3a22', '#7a4b2a', '#a8693b', '#c79a5c', '#d9c09a', '#8d8d8d', '#d6d2cc'];
const TOPS = ['#2b3a55', '#3c3f45', '#e9e1d0', '#5d6b3c', '#9c4a2f', '#c99a3b', '#2f6b6d', '#4c6d91', '#7a2e3a', '#f2efe8', '#d9a3a0', '#8aa093', '#2e2a28', '#b5673d', '#46578a'];
const BOTTOMS = ['#34455f', '#1f2226', '#b8a37d', '#5c5f63', '#4a3a2c', '#56613f', '#2a3550', '#6d5a4a'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

function spawnPoint(g: GameState): { sx: number; sz: number; ex: number; ez: number } {
  const def = getFacilityLevel(g.facility.level);
  const W = g.facility.width;
  const D = g.facility.depth;
  const ex = def.entrance.x * (W / def.width);
  const ez = def.entrance.z * (D / def.depth);
  switch (def.entrance.side) {
    case 'right':
      return { sx: W / 2 + 0.9, sz: ez, ex, ez };
    case 'left':
      return { sx: -W / 2 - 0.9, sz: ez, ex, ez };
    default:
      return { sx: ex + rand(-0.6, 0.6), sz: D / 2 + 1.0, ex: ex + rand(-0.4, 0.4), ez };
  }
}

function makeAgent(g: GameState, opts: { kid?: boolean; friend?: boolean; archetype?: string } = {}): VisitorAgent {
  const sp = spawnPoint(g);
  const kid = opts.kid ?? (opts.archetype === 'kids' ? Math.random() < 0.8 : opts.archetype === 'family' ? Math.random() < 0.4 : Math.random() < 0.08);
  const adultH = rand(1.56, 1.92);
  const height = kid ? rand(1.0, 1.35) : adultH;
  const student = opts.archetype === 'student' || opts.archetype === 'tourist' || opts.archetype === 'photographer';
  return {
    id: visitorRuntime.nextId++,
    x: sp.sx,
    z: sp.sz,
    heading: Math.atan2(sp.ex - sp.sx, sp.ez - sp.sz),
    speed: 0,
    walkSpeed: kid ? rand(1.1, 1.5) : rand(0.95, 1.3),
    path: [{ x: sp.ex, z: sp.ez }],
    pathIdx: 0,
    state: 'walk',
    targetTankId: null,
    faceX: 0,
    faceZ: 0,
    lookY: 1,
    timer: 0,
    visitsLeft: opts.friend ? 1 : Math.floor(rand(2, 6)),
    phase: Math.random() * 6.28,
    height,
    build: kid ? rand(0.85, 1) : rand(0.88, 1.15),
    kid,
    skin: new THREE.Color(pick(SKIN)),
    hair: new THREE.Color(pick(HAIR)),
    top: new THREE.Color(pick(TOPS)),
    bottom: new THREE.Color(pick(BOTTOMS)),
    hairStyle: (Math.random() < 0.45 ? 0 : Math.random() < 0.6 ? 1 : 2) as 0 | 1 | 2,
    bag: !kid && (student ? Math.random() < 0.6 : Math.random() < 0.15),
    wowT: -99,
    gesture: Math.random(),
    sway: Math.random() * 6.28,
    friend: !!opts.friend,
    alpha: 0,
    despawn: false,
    exitX: sp.sx,
    exitZ: sp.sz,
  };
}

function reach(g: GameState, now: number): Reachability | null {
  if (!visitorRuntime.reach || now - visitorRuntime.reachT > 0.5) {
    try {
      const r = stateReachability(g);
      if (r !== visitorRuntime.reach) {
        visitorRuntime.reach = r;
        // layout changed: re-path everyone who is walking somewhere
        for (const a of visitorRuntime.agents) if (a.state === 'walk' || a.state === 'leave') repath(a, r);
      }
    } catch {
      visitorRuntime.reach = null;
    }
    visitorRuntime.reachT = now;
  }
  return visitorRuntime.reach;
}

function repath(a: VisitorAgent, r: Reachability): void {
  const goal = a.path[a.path.length - 1];
  if (!goal) return;
  const p = findPath(r.grid, { x: a.x, z: a.z }, goal);
  if (p && p.length) {
    a.path = p;
    a.pathIdx = 0;
  }
}

function chooseTarget(g: GameState, a: VisitorAgent, r: Reachability, avoid?: string | null): string | null {
  const ids = g.tankOrder.filter((id) => g.tanks[id] && r.reachable.has(id) && id !== avoid);
  if (!ids.length) return null;
  const crowd = new Map<string, number>();
  for (const o of visitorRuntime.agents) if (o.targetTankId) crowd.set(o.targetTankId, (crowd.get(o.targetTankId) ?? 0) + 1);
  let total = 0;
  const w = ids.map((id) => {
    const t = g.tanks[id];
    const pop = g.visitors.exhibit[id]?.popularity ?? 50;
    const v = (0.25 + (t.cache?.exhibitScore ?? 40) / 100 + pop / 150) / (1 + (crowd.get(id) ?? 0) * 0.6);
    total += v;
    return v;
  });
  let k = Math.random() * total;
  for (let i = 0; i < ids.length; i++) {
    k -= w[i];
    if (k <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

function goToTank(g: GameState, a: VisitorAgent, tankId: string, r: Reachability, from?: { x: number; z: number }): boolean {
  const t = g.tanks[tankId];
  if (!t) return false;
  const fp = tankFootprint(t.tierId, t.placement);
  const fx = Math.sin(t.placement.rotY);
  const fz = Math.cos(t.placement.rotY);
  const lx = Math.cos(t.placement.rotY);
  const lz = -Math.sin(t.placement.rotY);
  let gx = 0;
  let gz = 0;
  let ok = false;
  for (let tries = 0; tries < 6 && !ok; tries++) {
    const lateral = (Math.random() * 2 - 1) * fp.hx * 0.75;
    const dist = a.kid ? rand(0.3, 0.45) : rand(0.5, 0.95);
    gx = t.placement.x + fx * (fp.hz + dist) + lx * lateral;
    gz = t.placement.z + fz * (fp.hz + dist) + lz * lateral;
    ok = isWalkable(r.grid, gx, gz);
  }
  if (!ok) {
    const vp = r.viewpoints[tankId];
    if (!vp) return false;
    gx = vp.x;
    gz = vp.z;
  }
  const p = findPath(r.grid, from ?? { x: a.x, z: a.z }, { x: gx, z: gz });
  if (!p) return false;
  jitterPath(p, r, a);
  // walk to the exact spot at the end
  p.push({ x: gx, z: gz });
  a.path = p;
  a.pathIdx = 0;
  a.state = 'walk';
  a.targetTankId = tankId;
  const d = tankDims(t);
  a.faceX = t.placement.x;
  a.faceZ = t.placement.z;
  a.lookY = standHeight(t.tierId) + d.H * 0.5;
  return true;
}

/** Offset intermediate waypoints sideways a little per person so crowds don't walk in single file. */
function jitterPath(p: { x: number; z: number }[], r: Reachability, a: VisitorAgent): void {
  const off = ((a.id * 0.61803) % 1) * 0.7 - 0.35;
  for (let i = 1; i < p.length - 1; i++) {
    const dx = p[i + 1].x - p[i - 1].x;
    const dz = p[i + 1].z - p[i - 1].z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = p[i].x + (-dz / l) * off;
    const nz = p[i].z + (dx / l) * off;
    if (isWalkable(r.grid, nx, nz)) {
      p[i] = { x: nx, z: nz };
    }
  }
}

function goToBench(g: GameState, a: VisitorAgent, r: Reachability): boolean {
  const benches = g.facility.fixtures.filter((f) => f.kind === 'bench');
  if (!benches.length) return false;
  const b = benches[Math.floor(Math.random() * benches.length)];
  const def = FIXTURE_DEFS.bench;
  const along = (Math.random() * 2 - 1) * (def.w / 2 - 0.3);
  const c = Math.cos(b.rotY);
  const s = Math.sin(b.rotY);
  // seat point and a standing point just in front of the bench (local +z)
  const sx = b.x + c * along;
  const sz = b.z - s * along;
  const standX = sx + s * (def.d / 2 + 0.25);
  const standZ = sz + c * (def.d / 2 + 0.25);
  if (visitorRuntime.agents.some((o) => o.seat && Math.hypot(o.seat.x - sx, o.seat.z - sz) < 0.5)) return false;
  const p = findPath(r.grid, { x: a.x, z: a.z }, { x: standX, z: standZ });
  if (!p) return false;
  a.path = p;
  a.pathIdx = 0;
  a.state = 'walk';
  a.targetTankId = null;
  // sit facing away from the bench's back: the side toward the nearest tanks (local +z)
  a.seat = { x: sx, z: sz, rot: b.rotY, fixtureId: b.id };
  return true;
}

function leave(g: GameState, a: VisitorAgent, r: Reachability | null): void {
  a.state = 'leave';
  a.targetTankId = null;
  a.seat = undefined;
  const sp = spawnPoint(g);
  let p: { x: number; z: number }[] | null = null;
  if (r) p = findPath(r.grid, { x: a.x, z: a.z }, r.grid.entrancePoint);
  a.path = [...(p ?? []), { x: sp.ex, z: sp.ez }, { x: a.exitX, z: a.exitZ }];
  a.pathIdx = 0;
}

function nextActivity(g: GameState, a: VisitorAgent, r: Reachability): void {
  a.visitsLeft--;
  if (a.visitsLeft <= 0 || a.despawn) {
    leave(g, a, r);
    return;
  }
  if (!a.friend && !a.kid && Math.random() < 0.18 && goToBench(g, a, r)) return;
  const t = chooseTarget(g, a, r, a.targetTankId);
  if (!t || !goToTank(g, a, t, r)) leave(g, a, r);
}

export interface VisitorStepOptions {
  maxAgents: number;
  reducedMotion: boolean;
  /** Game speed multiplier (visitors move a bit quicker at high speed). */
  speed: number;
}

/** Advance all agents; call once per frame from the renderer. */
export function stepVisitorRuntime(dt: number, g: GameState | null, opts: VisitorStepOptions): void {
  const rt = visitorRuntime;
  const step = Math.min(0.1, Math.max(0, dt));
  rt.time += step;
  if (!g || g.isShowcase) {
    rt.agents.length = 0;
    rt.sparkles.length = 0;
    return;
  }
  if (rt.lastLevel !== g.facility.level) {
    rt.agents.length = 0;
    rt.sparkles.length = 0;
    rt.reach = null;
    rt.lastLevel = g.facility.level;
  }
  const r = reach(g, rt.time);
  const hour = g.clock.hour;
  const live = g.visitors.live;
  const pace = Math.sqrt(Math.max(1, opts.speed || 1));

  // desired population
  let desired = 0;
  let friendMode = false;
  if (g.facility.level !== 'hobby_room' && isOpenAt(g, hour)) desired = Math.min(opts.maxAgents, Math.round(live?.occupancy ?? 0));
  else if (live?.friend && hour < live.friend.untilHour && g.tanks[live.friend.tankId]) {
    desired = live.friend.party;
    friendMode = true;
  }
  if (g.clock.speed === 0 && desired === 0) desired = rt.agents.filter((a) => !a.despawn).length; // paused: freeze the crowd
  const active = rt.agents.filter((a) => !a.despawn);
  if (active.length > desired) {
    // send the most "finished" visitors home first
    active.sort((p, q) => p.visitsLeft - q.visitsLeft);
    for (let i = 0; i < active.length - desired; i++) {
      active[i].despawn = true;
      if (active[i].state !== 'leave') leave(g, active[i], r);
    }
  }
  // warm start: arriving in an already-busy venue shouldn't look empty for a minute
  if (!friendMode && r && rt.agents.length === 0 && desired >= 4 && !rt.warmed) {
    rt.warmed = true;
    const ids = g.tankOrder.filter((id) => g.tanks[id] && r.reachable.has(id));
    const n = Math.min(desired, Math.round(desired * 0.7));
    for (let i = 0; i < n && ids.length; i++) {
      const a = makeAgent(g, { archetype: pickMix(live?.mix) });
      const tid = ids[Math.floor(Math.random() * ids.length)];
      const vp = r.viewpoints[tid];
      if (!vp) continue;
      a.x = vp.x + rand(-0.6, 0.6);
      a.z = vp.z + rand(-0.3, 0.5);
      if (!isWalkable(r.grid, a.x, a.z)) {
        a.x = vp.x;
        a.z = vp.z;
      }
      if (goToTank(g, a, tid, r)) {
        a.alpha = 1;
        if (Math.random() < 0.6) {
          // already looking
          const end = a.path[a.path.length - 1];
          a.x = end.x;
          a.z = end.z;
          a.path = [];
          a.state = 'view';
          a.timer = rand(1, 10);
          a.heading = Math.atan2(a.faceX - a.x, a.faceZ - a.z);
        }
        rt.agents.push(a);
      }
    }
  }
  if (desired === 0) rt.warmed = false;
  rt.spawnCooldown -= step;
  if (r && r.grid.entrance >= 0 && active.length < desired && rt.spawnCooldown <= 0) {
    const arche = pickMix(live?.mix);
    const kidsFriend = friendMode && live?.friend?.kind === 'kids';
    const a = makeAgent(g, { friend: friendMode, kid: friendMode ? kidsFriend : undefined, archetype: arche });
    // the first leg walks in through the door; then the real target
    const target = friendMode ? live!.friend!.tankId : chooseTarget(g, a, r);
    const entry = [...a.path];
    if (target && goToTank(g, a, target, r, entry[entry.length - 1])) {
      a.path = [...entry, ...a.path];
      a.pathIdx = 0;
      if (friendMode) a.visitsLeft = 1;
      rt.agents.push(a);
      rt.spawnCooldown = friendMode ? 0.6 : rand(0.25, 0.9) / pace;
    } else rt.spawnCooldown = 1;
  }

  // wow reactions → sparkles on people watching that tank
  const reacts = g.visitors.reactions;
  const firstLook = rt.seen.size === 0 && rt.lastReactionKey === '';
  for (let i = Math.max(0, reacts.length - 5); i < reacts.length; i++) {
    const re = reacts[i];
    const sig = `${re.hour.toFixed(4)}|${re.tankId ?? ''}|${re.text}`;
    if (rt.seen.has(sig)) continue;
    rt.seen.add(sig);
    if (firstLook || re.mood !== 'wow' || !re.tankId) continue;
    const watchers = rt.agents.filter((a) => a.targetTankId === re.tankId && (a.state === 'view' || a.state === 'walk'));
    for (const a of watchers.slice(0, 2)) burst(a, opts.reducedMotion);
  }
  rt.lastReactionKey = 'x';
  if (rt.seen.size > 200) rt.seen = new Set([...rt.seen].slice(-60));

  // move agents
  const agents = rt.agents;
  for (const a of agents) {
    a.alpha = Math.min(1, a.alpha + step * 2);
    a.sway += step;
    if (a.state === 'walk' || a.state === 'leave') {
      const wp = a.path[a.pathIdx];
      if (!wp) {
        arrive(g, a, r, opts);
        continue;
      }
      const dx = wp.x - a.x;
      const dz = wp.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) {
        a.pathIdx++;
        if (a.pathIdx >= a.path.length) arrive(g, a, r, opts);
        continue;
      }
      const sp = a.walkSpeed * (opts.reducedMotion ? 0.85 : 1) * Math.min(1.8, pace);
      a.speed += (sp - a.speed) * Math.min(1, step * 4);
      const mv = Math.min(dist, a.speed * step);
      a.x += (dx / dist) * mv;
      a.z += (dz / dist) * mv;
      turnToward(a, Math.atan2(dx, dz), step * 5);
      a.phase += a.speed * step * (a.kid ? 3.6 : 2.9);
    } else {
      a.speed += (0 - a.speed) * Math.min(1, step * 6);
      if (a.state === 'view') {
        const t = a.targetTankId ? g.tanks[a.targetTankId] : null;
        if (!t) {
          // the exhibit vanished (sold / removed) mid-visit
          if (r) nextActivity(g, a, r);
          else leave(g, a, null);
          continue;
        }
        turnToward(a, Math.atan2(a.faceX - a.x, a.faceZ - a.z) + Math.sin(a.sway * 0.4 + a.gesture * 6) * 0.25, step * 2);
        // small spontaneous delight on great exhibits
        if (!opts.reducedMotion && Math.random() < step * 0.04 * ((t.cache?.exhibitScore ?? 40) / 60)) burst(a, false, 2);
      } else if (a.state === 'sit' && a.seat) {
        a.x += (a.seat.x - a.x) * Math.min(1, step * 4);
        a.z += (a.seat.z - a.z) * Math.min(1, step * 4);
        turnToward(a, a.seat.rot, step * 4);
      }
      a.timer -= step * pace;
      if (a.timer <= 0) {
        if (a.state === 'sit') a.seat = undefined;
        if (a.friend && live?.friend && hour < live.friend.untilHour && !a.despawn) {
          a.timer = rand(3, 6);
          a.gesture = Math.random();
        } else if (r) nextActivity(g, a, r);
        else leave(g, a, null);
      }
    }
  }
  // gentle separation so people don't overlap
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.state === 'sit') continue;
    for (let j = i + 1; j < agents.length; j++) {
      const b = agents[j];
      if (b.state === 'sit') continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      const min = 0.42;
      if (d2 > 1e-6 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5 * Math.min(1, step * 8);
        const aw = a.state === 'view' ? 0.3 : 1;
        const bw = b.state === 'view' ? 0.3 : 1;
        a.x -= dx * push * aw;
        a.z -= dz * push * aw;
        b.x += dx * push * bw;
        b.z += dz * push * bw;
      }
    }
  }
  // remove people who have left the building
  rt.agents = agents.filter((a) => !(a.state === 'leave' && a.pathIdx >= a.path.length));
  // sparkles
  rt.sparkles = rt.sparkles.filter((s) => rt.time - s.t < 1.4);
  for (const s of rt.sparkles) {
    if (opts.reducedMotion) continue;
    s.y += step * 0.35;
    s.x += s.vx * step;
    s.z += s.vz * step;
  }
}

function burst(a: VisitorAgent, reduced: boolean, n = 5): void {
  a.wowT = visitorRuntime.time;
  for (let i = 0; i < n; i++) {
    visitorRuntime.sparkles.push({
      x: a.x + rand(-0.12, 0.12),
      y: a.height + rand(0.05, 0.25),
      z: a.z + rand(-0.12, 0.12),
      t: visitorRuntime.time - (reduced ? 0 : rand(0, 0.25)),
      vx: reduced ? 0 : rand(-0.15, 0.15),
      vz: reduced ? 0 : rand(-0.15, 0.15),
      size: rand(0.07, 0.13),
    });
  }
  if (visitorRuntime.sparkles.length > 96) visitorRuntime.sparkles.splice(0, visitorRuntime.sparkles.length - 96);
}

function turnToward(a: VisitorAgent, target: number, k: number): void {
  let d = target - a.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  a.heading += d * Math.min(1, k);
}

function arrive(g: GameState, a: VisitorAgent, r: Reachability | null, opts: VisitorStepOptions): void {
  a.path = [];
  a.pathIdx = 0;
  if (a.state === 'leave') {
    a.pathIdx = 1; // marks for removal
    a.path = [{ x: a.x, z: a.z }];
    return;
  }
  if (a.seat) {
    a.state = 'sit';
    a.timer = rand(6, 14);
    return;
  }
  if (a.targetTankId && g.tanks[a.targetTankId]) {
    a.state = 'view';
    a.timer = a.friend ? rand(5, 9) : rand(4.5, 13) * (a.kid ? 0.7 : 1);
    a.gesture = Math.random();
    return;
  }
  if (r) nextActivity(g, a, r);
  else leave(g, a, null);
  void opts;
}

/** Clear all agents (e.g. when leaving a save). */
export function resetVisitorRuntime(): void {
  visitorRuntime.agents.length = 0;
  visitorRuntime.sparkles.length = 0;
  visitorRuntime.reach = null;
  visitorRuntime.lastReactionKey = '';
  visitorRuntime.seen = new Set();
}
