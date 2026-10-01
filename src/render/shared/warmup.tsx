/**
 * Shader warm-up behind a soft veil. OWNER: lane "perf".
 *
 * Why: the first frame of a freshly mounted aquarium compiled ~50 shader programs synchronously (0.6–3.5 s of frozen
 * screen on a cold start, measured). Now, when the game world mounts (new game, load, fixture, context restore):
 *  1. prime   — (first world of the page only) a couple of frames with the world hidden: the post-processing and
 *               environment programs (few, cheap) compile while the GPU process is idle;
 *  2. compile — `renderer.compileAsync` submits every world material with KHR_parallel_shader_compile. Until they
 *               are linked the world stays hidden, so no draw touches a pending program (that synchronous wait was
 *               the freeze); frames keep flowing with only the already-built post passes, and the UI keeps animating;
 *  3. reveal  — the world is drawn for a few frames behind the veil (the handful of shadow-depth programs compile
 *               here), then <WarmupVeil/> fades away with a compositor-driven CSS transition.
 * Later worlds (a new game started from the title screen's showcase tank, a loaded save) usually need no new programs
 * at all: then nothing is hidden and the veil SceneRoot raised for the build fades at once. The hold is capped
 * (WARM_MAX_MS) so a slow driver can never keep the tank hidden.
 */
import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { getRenderQuality } from './quality';
import { RENDERER_TONE_MAPPING } from '../post/PostFX';

/** Longest the world stays hidden waiting for compiles. */
const WARM_MAX_MS = 2500;
/** Frames drawn with the world hidden before compiling it. */
const PRIME_FRAMES = 2;
/** Frames drawn behind the veil after the programs are ready. */
const REVEAL_FRAMES = 3;
/**
 * lane:tankrender — creating a program (GLSL translation) costs the main thread a couple of ms each, and a tier change
 * or a big facility brings 50–60 of them: the world's objects are submitted a few at a time, this much per frame, so
 * the veil covers a series of short frames instead of one 100–300 ms freeze.
 */
const COMPILE_BUDGET_MS = 24;
/** Main-thread budget for the synchronous first pass of a later world (a load, a tier change) before the veil goes up. */
const SYNC_BUDGET_MS = 20;
/** Programs put into service (uniform/attribute lookups) per frame, still behind the veil. */
const TOUCH_PER_FRAME = 32;
/** …and at most this much main-thread time per frame for it (ms). */
const TOUCH_BUDGET_MS = 16;


interface WarmupStore {
  /** The veil is up. */
  warming: boolean;
  /** lane:tankrender — the veil's DOM has committed the current `warming` (SceneRoot waits for it before a build). */
  veilUp: boolean;
  /** Last warm-up: duration (ms), programs after the async compile, programs after the reveal frames (QA). */
  lastMs: number;
  programsWarm: number;
  programsAfter: number;
  set: (p: Partial<Omit<WarmupStore, 'set'>>) => void;
}

export const useWarmup = create<WarmupStore>((set) => ({ warming: false, veilUp: false, lastMs: 0, programsWarm: 0, programsAfter: 0, set: (p) => set(p) }));
if (typeof window !== 'undefined') {
  const w = window as unknown as { __AQ_WARM?: typeof useWarmup; __AQ?: Record<string, unknown> };
  // e2e / QA: `__AQ.warming()` is true while the veil is up (merged into the scripted API, never replacing it)
  w.__AQ = Object.assign(w.__AQ ?? {}, { warming: () => useWarmup.getState().warming });
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('perf')) w.__AQ_WARM = useWarmup;
}

type Phase = 'prime' | 'compiling' | 'reveal' | 'done';

/** Worlds warmed since the page loaded (the first one also has to build the post-processing programs). */
let warmedWorlds = 0;

/** Drawables per compile call: small enough that a frame's budget check runs often, large enough to amortise the call. */
const CHUNK = 24;

/**
 * Compile-only stand-in for a batch of drawables: three's compile() collects materials with traverse() and lights with
 * traverseVisible(), and when the object is not the target scene it counts the object's own lights a second time —
 * which would build light-count variants nothing ever draws. The lights are gathered from the real scene instead.
 */
function materialsOnly(objs: THREE.Object3D[]): THREE.Object3D {
  return { traverse: (cb: (o: THREE.Object3D) => void) => objs.forEach(cb), traverseVisible: () => {} } as unknown as THREE.Object3D;
}

/** The world's drawables in batches of CHUNK. */
function drawableChunks(scene: THREE.Scene): THREE.Object3D[][] {
  const out: THREE.Object3D[][] = [];
  let cur: THREE.Object3D[] = [];
  scene.traverse((o) => {
    const d = o as THREE.Mesh;
    if (!(d.isMesh || (d as unknown as THREE.Points).isPoints || (d as unknown as THREE.Line).isLine || (d as unknown as THREE.Sprite).isSprite)) return;
    cur.push(o);
    if (cur.length === CHUNK) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
}

/**
 * Put inside the Canvas as the LAST child of the game world (after every tank), keyed by the loaded world, so it runs
 * once per new world after all layers have added their objects.
 */
export function ShaderWarmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const cam = useRef(camera);
  cam.current = camera;
  const st = useRef({
    phase: 'done' as Phase,
    frames: 0,
    t0: 0,
    timer: 0,
    alive: false,
    /** Batches of world drawables still to submit, and the link promises of those submitted. */
    queue: [] as THREE.Object3D[][],
    pending: [] as Promise<unknown>[],
    /** Materials submitted this warm-up (each once); once linked, their programs are put into service a few per frame. */
    materials: [] as THREE.Material[],
    seenMaterials: new Set<THREE.Material>(),
    touchedPrograms: new Set<object>(),
    touch: -1,
    /**
     * lane:tankrender — the world mounted behind a raised veil (a load, a new game: SceneRoot raises it for the build,
     * or the first world's prime): nothing is on screen and the build already froze one long frame, so it compiles in
     * one pass and is revealed as soon as its programs link. The frame-sliced path (tier changes, where the world was
     * on screen a moment ago) made a throttled phone wait twice as long for the tank.
     */
    veiled: false,
    rt: null as THREE.WebGLRenderTarget | null,
  });

  const reveal = () => {
    const s = st.current;
    if (!s.alive || s.phase !== 'compiling') return;
    window.clearTimeout(s.timer);
    s.queue.length = 0;
    s.pending.length = 0;
    s.materials.length = 0;
    s.seenMaterials.clear();
    s.touchedPrograms.clear();
    s.touch = -1;
    s.rt?.dispose();
    s.rt = null;
    scene.visible = true;
    s.phase = 'reveal';
    s.frames = 0;
  };

  /**
   * Every program is linked: put them into service a few per frame (three fetches a program's uniform and attribute
   * locations on its first draw — dozens of synchronous GL calls each, which made the first visible frame a
   * 120–230 ms freeze after a tier change), then reveal.
   */
  const touchSome = () => {
    const s = st.current;
    if (!s.alive || s.phase !== 'compiling' || s.touch < 0) return;
    // lane:tankrender — counted in programs, not materials: a big world has hundreds of materials sharing a few dozen
    // programs, and walking them 12 a frame kept the veil up until the WARM_MAX_MS cap
    const t0 = performance.now();
    let fresh = 0;
    try {
      for (; s.touch < s.materials.length && fresh < TOUCH_PER_FRAME; s.touch++) {
        const p = (gl.properties.get(s.materials[s.touch]) as { currentProgram?: { getUniforms(): unknown; getAttributes(): unknown } }).currentProgram;
        if (!p || s.touchedPrograms.has(p)) continue;
        s.touchedPrograms.add(p);
        p.getUniforms();
        p.getAttributes();
        if (++fresh % 4 === 0 && performance.now() - t0 > TOUCH_BUDGET_MS) {
          s.touch++;
          break;
        }
      }
    } catch {
      s.touch = s.materials.length;
    }
    if (s.touch >= s.materials.length) reveal();
  };

  /**
   * Submit the world's drawables for (parallel) compilation, `budgetMs` of main-thread time at a time; the world stays
   * hidden until every submitted program is linked. Returns true once everything has been submitted.
   */
  const compileSome = (budgetMs: number): boolean => {
    const s = st.current;
    const t0 = performance.now();
    const low = getRenderQuality() === 'low';
    // with post-processing the world renders into the composer's buffer (no tone mapping, linear output): compile
    // against a stand-in target so the program variants match what the first real frame asks for. Without it (low)
    // the renderer tone-maps, but the composer that just unmounted only hands tone mapping back in a later effect:
    // set it now so the variants match here too (36 programs used to be compiled again on the first visible frame)
    if (low) gl.toneMapping = RENDERER_TONE_MAPPING;
    else if (!s.rt) s.rt = new THREE.WebGLRenderTarget(1, 1);
    const prevRt = gl.getRenderTarget();
    const prevVisible = scene.visible;
    try {
      // compile() gathers lights from VISIBLE objects, so the world is visible while it runs, hidden again after
      scene.visible = true;
      gl.setRenderTarget(low ? null : s.rt);
      do {
        // unbounded (a veiled world): everything left in one call, so the lights are gathered once
        const batch = budgetMs === Infinity ? s.queue.splice(0).flat() : s.queue.shift();
        if (!batch?.length) break;
        s.pending.push(gl.compileAsync(materialsOnly(batch), cam.current, scene));
        for (const o of batch) {
          const m = (o as THREE.Mesh).material;
          for (const x of Array.isArray(m) ? m : m ? [m] : []) {
            if (s.seenMaterials.has(x)) continue;
            s.seenMaterials.add(x);
            s.materials.push(x);
          }
        }
      } while (performance.now() - t0 < budgetMs);
    } catch {
      s.queue.length = 0;
    } finally {
      gl.setRenderTarget(prevRt);
      scene.visible = prevVisible;
    }
    if (s.queue.length) return false;
    Promise.all(s.pending).then(
      () => {
        if (!s.alive || s.phase !== 'compiling') return;
        if (s.veiled) reveal();
        else s.touch = 0;
      },
      reveal,
    );
    useWarmup.getState().set({ programsWarm: gl.info.programs?.length ?? 0 });
    return true;
  };

  /** Start compiling: hides the world, queues its drawables and submits the first `budgetMs` worth. */
  const compile = (budgetMs: number): boolean => {
    const s = st.current;
    s.phase = 'compiling';
    s.queue = drawableChunks(scene);
    s.pending = [];
    s.materials = [];
    s.seenMaterials.clear();
    s.touchedPrograms.clear();
    s.touch = -1;
    s.timer = window.setTimeout(reveal, WARM_MAX_MS);
    const done = compileSome(budgetMs);
    if (s.phase === 'compiling') scene.visible = false;
    return done;
  };

  useLayoutEffect(() => {
    const s = st.current;
    s.alive = true;
    s.frames = 0;
    s.t0 = performance.now();
    if (warmedWorlds++ === 0) {
      // first world of the page: prime the post passes first (see the header), world hidden behind the veil
      s.phase = 'prime';
      s.veiled = true;
      scene.visible = false;
      useWarmup.getState().set({ warming: true });
    } else {
      // later worlds (new game from the title screen, loads, tier changes): the post passes exist, so compile at once,
      // and only hide the world (and raise the veil) if it brings programs that are not compiled yet — a new game
      // usually brings none; a tier change or a big save brings dozens, submitted over the next frames
      const before = gl.info.programs?.length ?? 0;
      s.veiled = useWarmup.getState().warming;
      const done = compile(s.veiled ? Infinity : SYNC_BUDGET_MS);
      if (s.phase === 'compiling') {
        if (done && (gl.info.programs?.length ?? 0) === before) {
          window.clearTimeout(s.timer);
          s.rt?.dispose();
          s.rt = null;
          scene.visible = true;
          s.phase = 'done';
          // the veil SceneRoot raised for the build (if any) fades now
          if (useWarmup.getState().warming) useWarmup.getState().set({ warming: false, lastMs: performance.now() - s.t0 });
        } else useWarmup.getState().set({ warming: true });
      }
    }
    return () => {
      s.alive = false;
      window.clearTimeout(s.timer);
      s.queue.length = 0;
      s.pending.length = 0;
      s.materials.length = 0;
      s.seenMaterials.clear();
      s.touchedPrograms.clear();
      s.rt?.dispose();
      s.rt = null;
      scene.visible = true;
      s.phase = 'done';
      useWarmup.getState().set({ warming: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame(() => {
    const s = st.current;
    if (s.phase === 'prime') {
      if (++s.frames >= PRIME_FRAMES) compile(s.veiled ? Infinity : COMPILE_BUDGET_MS);
    } else if (s.phase === 'compiling') {
      if (s.queue.length) compileSome(s.veiled ? Infinity : COMPILE_BUDGET_MS);
      else if (s.touch >= 0) touchSome();
    } else if (s.phase === 'reveal') {
      if (++s.frames < REVEAL_FRAMES) return;
      s.phase = 'done';
      useWarmup.getState().set({ warming: false, lastMs: performance.now() - s.t0, programsAfter: gl.info.programs?.length ?? 0 });
    }
  });
  return null;
}

/**
 * Keeps compiled shader programs alive for the whole session (lane:perf).
 *
 * three destroys a program as soon as the last material using it is disposed. Every tank ↔ room switch and every
 * change of hero tank disposes and recreates materials (LOD swaps), so the same ~12 programs were compiled again,
 * synchronously, on each switch (100–300 ms hitches at the start of the camera flight). Built-in-material programs
 * (standard/physical/depth… — including our onBeforeCompile patches) have stable cache keys, so holding one extra use
 * on each makes every later switch reuse them. Custom ShaderMaterial programs are keyed by per-session shader-stage
 * ids that change when their source is re-registered, so they are left alone here (pinning those would only leak);
 * the water/FX materials keep their own programs alive by being parked instead of disposed (programPark.ts).
 * The set is bounded by the number of material variants, not by play time.
 */
export function ProgramKeeper() {
  const gl = useThree((s) => s.gl);
  const pinned = useRef(new WeakSet<object>());
  const n = useRef(0);
  useFrame(() => {
    if (++n.current % 30 !== 0) return;
    const list = gl.info.programs as unknown as { cacheKey: string; usedTimes: number }[] | null;
    if (!list) return;
    for (const p of list) {
      if (pinned.current.has(p) || /^\d/.test(p.cacheKey)) continue;
      pinned.current.add(p);
      p.usedTimes++;
    }
  });
  return null;
}

/** DOM veil over the canvas (under the HUD) while the aquarium warms up; fades out with CSS (compositor-driven). */
export function WarmupVeil() {
  const warming = useWarmup((s) => s.warming);
  useLayoutEffect(() => {
    useWarmup.getState().set({ veilUp: warming });
  }, [warming]);
  return (
    <div
      aria-hidden
      data-testid="warmup-veil"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, #0b2a36 0%, #03080c 70%)',
        opacity: warming ? 1 : 0,
        transition: warming ? 'none' : 'opacity 420ms ease-out',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
