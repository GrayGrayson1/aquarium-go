/**
 * Motion-quality scan (QA / tests only — not used at runtime): runs the creature AI headlessly with browser-like
 * uneven frame times (16–33 ms by default; `frameMs` for long, janky frames), stepped exactly as TankAI does
 * (steps.ts), the sim synced at ~4 Hz, and counts "vibration": ~1 s windows in which an animal's position or heading
 * reverses direction frame to frame 6+ times. Measures the raw AI transform or, with `drawn`, what the renderer draws
 * after its pose filter. OWNER: lane "behavior".
 */
import type { GameState } from '@/types';
import { getDecorDef } from '@/data/catalog/decor';
import { findSpecies } from '@/data/species';
import { personalityModifiers } from '@/sim/life';
import { advanceWorld } from '@/sim/world';
import { equipmentSolids, tankFlow } from '../registry';
import { equipmentLayout } from '@/render/decor/emitters';
import { filterPose, makePoseFilter, type PoseFilter } from '@/render/creatures/core/poseFilter';
import { createWorld, stepWorld, syncWorld, type AIWorld } from './world';
import { planAiSteps, type AiSteps } from './steps';

export interface MotionScenario {
  name: string;
  build: () => GameState;
  /** How many tanks (in tankOrder) to scan. */
  maxTanks: number;
}

export interface SpeciesMotionStats {
  windows: number;
  jitterWindows: number;
  /** Activity/locomotion of the jittery windows. */
  acts: Map<string, number>;
  example: string;
}

export interface MotionScanResult {
  bySpecies: Map<string, SpeciesMotionStats>;
  windows: number;
  jitterWindows: number;
}

/** Per-frame probe for debugging scripts (called after every AI step, for every live agent). */
export type MotionTrace = (info: { scenario: string; tankId: string; t: number; dt: number; w: AIWorld; a: AIWorld['agents'][number] }) => void;

export interface MotionScanOptions {
  secs: number;
  drawn?: boolean;
  /** Rendered frame times drawn uniformly from this range (ms); default 16.7–33.3 (a browser between 60 and 30 fps). */
  frameMs?: [number, number];
  /** The AI is over its frame budget: long frames get one step and drop the excess (see steps.ts) instead of two. */
  overBudget?: boolean;
  onFrame?: MotionTrace;
}

export function scanMotion(scenarios: MotionScenario[], opts: MotionScanOptions): MotionScanResult {
  const bySpecies = new Map<string, SpeciesMotionStats>();
  for (const sc of scenarios) {
    const g = sc.build();
    for (const tid of g.tankOrder.slice(0, sc.maxTanks)) scanTank(g, tid, sc.name, opts, bySpecies);
  }
  let windows = 0;
  let jitterWindows = 0;
  for (const st of bySpecies.values()) {
    windows += st.windows;
    jitterWindows += st.jitterWindows;
  }
  return { bySpecies, windows, jitterWindows };
}

interface Sample {
  x: number;
  y: number;
  z: number;
  yaw: number;
  act: string;
}

function scanTank(g: GameState, tid: string, name: string, opts: MotionScanOptions, out: Map<string, SpeciesMotionStats>): void {
  const secs = opts.secs;
  const drawn = !!opts.drawn;
  const w: AIWorld = createWorld(tid, {
    resolveDecor: getDecorDef,
    extras: (t) => equipmentSolids(equipmentLayout(t), t),
    flowOf: tankFlow,
    personality: (c) => personalityModifiers(c),
    species: findSpecies,
    registry: new Map(),
    food: [],
    hooks: {},
  });
  const sync = () => {
    const cs = Object.values(g.creatures)
      .filter((c) => c.tankId === tid)
      .map((c) => ({ ...c }));
    const cl = Object.values(g.clutches).filter((c) => c.tankId === tid);
    syncWorld(w, { tank: g.tanks[tid], creatures: cs, clutches: cl, hour: g.clock.hour, refreshInfo: true });
  };
  sync();
  w.env.focused = true;
  let seed = 7 + tid.length;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hist = new Map<string, Sample[]>();
  const filters = new Map<string, PoseFilter>();
  let t = 0;
  let simAcc = 0;
  const [f0, f1] = opts.frameMs ?? [1000 / 60, 1000 / 30];
  const steps: AiSteps = { n: 1, h: 0 };
  while (t < secs) {
    const dt = (f0 + rand() * (f1 - f0)) / 1000;
    // exactly as TankAI steps a focused tank
    planAiSteps(dt, !!opts.overBudget, steps);
    for (let i = 0; i < steps.n; i++) stepWorld(w, steps.h);
    t += dt;
    simAcc += dt;
    if (simAcc >= 0.25) {
      advanceWorld(g, simAcc * 0.1, { focusTankId: tid });
      simAcc = 0;
      sync();
    }
    for (const a of w.agents) {
      if (a.dead) continue;
      if (opts.onFrame) opts.onFrame({ scenario: name, tankId: tid, t, dt, w, a });
      let h = hist.get(a.id);
      if (!h) hist.set(a.id, (h = []));
      const act = `${a.act}/${a.loco}`;
      if (drawn) {
        let f = filters.get(a.id);
        if (!f) filters.set(a.id, (f = makePoseFilter()));
        filterPose(f, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z, a.rt.yaw, a.rt.pitch, a.rt.roll, a.L, t, dt);
        h.push({ x: f.x, y: f.y, z: f.z, yaw: f.yaw, act });
      } else h.push({ x: a.rt.pos.x, y: a.rt.pos.y, z: a.rt.pos.z, yaw: a.rt.yaw, act });
      if (h.length < 40) continue;
      // one ~1 s window, then slide on by half of it
      let st = out.get(a.sp.id);
      if (!st) out.set(a.sp.id, (st = { windows: 0, jitterWindows: 0, acts: new Map(), example: '' }));
      const eps = Math.max(2e-5, a.L * 4e-4);
      let revs = 0;
      let yawRevs = 0;
      for (let i = 2; i < h.length; i++) {
        const vx = h[i].x - h[i - 1].x;
        const vy = h[i].y - h[i - 1].y;
        const vz = h[i].z - h[i - 1].z;
        const ux = h[i - 1].x - h[i - 2].x;
        const uy = h[i - 1].y - h[i - 2].y;
        const uz = h[i - 1].z - h[i - 2].z;
        const sv = Math.hypot(vx, vy, vz);
        const su = Math.hypot(ux, uy, uz);
        if (sv > eps && su > eps && (vx * ux + vy * uy + vz * uz) / (sv * su) < -0.3) revs++;
        const da = wrap(h[i].yaw - h[i - 1].yaw);
        const db = wrap(h[i - 1].yaw - h[i - 2].yaw);
        if (Math.abs(da) > 0.006 && Math.abs(db) > 0.006 && Math.sign(da) !== Math.sign(db)) yawRevs++;
      }
      st.windows++;
      if (revs >= 6 || yawRevs >= 6) {
        st.jitterWindows++;
        const last = h[h.length - 1].act;
        st.acts.set(last, (st.acts.get(last) ?? 0) + 1);
        if (!st.example) st.example = `${name} ${tid} ${a.id} t=${t.toFixed(1)}s ${last} reversals=${revs} heading reversals=${yawRevs} at ${[a.rt.pos.x, a.rt.pos.y, a.rt.pos.z].map((n) => n.toFixed(3)).join(',')}`;
      }
      h.splice(0, 20);
    }
  }
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
