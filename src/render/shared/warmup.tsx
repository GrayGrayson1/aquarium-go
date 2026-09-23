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
 * at all: then nothing is hidden and no veil shows. The hold is capped (WARM_MAX_MS) so a slow driver can never keep
 * the tank hidden.
 */
import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { getRenderQuality } from './quality';

/** Longest the world stays hidden waiting for compiles. */
const WARM_MAX_MS = 2500;
/** Frames drawn with the world hidden before compiling it. */
const PRIME_FRAMES = 2;
/** Frames drawn behind the veil after the programs are ready. */
const REVEAL_FRAMES = 3;

interface WarmupStore {
  /** The veil is up. */
  warming: boolean;
  /** Last warm-up: duration (ms), programs after the async compile, programs after the reveal frames (QA). */
  lastMs: number;
  programsWarm: number;
  programsAfter: number;
  set: (p: Partial<Omit<WarmupStore, 'set'>>) => void;
}

export const useWarmup = create<WarmupStore>((set) => ({ warming: false, lastMs: 0, programsWarm: 0, programsAfter: 0, set: (p) => set(p) }));
if (typeof window !== 'undefined') {
  const w = window as unknown as { __AQ_WARM?: typeof useWarmup; __AQ?: Record<string, unknown> };
  // e2e / QA: `__AQ.warming()` is true while the veil is up (merged into the scripted API, never replacing it)
  w.__AQ = Object.assign(w.__AQ ?? {}, { warming: () => useWarmup.getState().warming });
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('perf')) w.__AQ_WARM = useWarmup;
}

type Phase = 'prime' | 'compiling' | 'reveal' | 'done';

/** Worlds warmed since the page loaded (the first one also has to build the post-processing programs). */
let warmedWorlds = 0;

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
  const st = useRef({ phase: 'done' as Phase, frames: 0, t0: 0, timer: 0, alive: false });

  const reveal = () => {
    const s = st.current;
    if (!s.alive || s.phase !== 'compiling') return;
    window.clearTimeout(s.timer);
    scene.visible = true;
    s.phase = 'reveal';
    s.frames = 0;
  };

  /** Submit every world material for (parallel) compilation; hides the world until they are linked. */
  const compile = () => {
    const s = st.current;
    s.phase = 'compiling';
    // with post-processing the world renders into the composer's buffer (no tone mapping, linear output): compile
    // against a stand-in target so the program variants match what the first real frame asks for
    const rt = getRenderQuality() !== 'low' ? new THREE.WebGLRenderTarget(1, 1) : null;
    const prevRt = gl.getRenderTarget();
    try {
      // compile() gathers lights from VISIBLE objects, so the world is visible while it runs, hidden again after
      scene.visible = true;
      gl.setRenderTarget(rt);
      const p = gl.compileAsync(scene, cam.current);
      p.then(reveal, reveal);
      s.timer = window.setTimeout(reveal, WARM_MAX_MS);
    } catch {
      s.phase = 'compiling';
      reveal();
    } finally {
      gl.setRenderTarget(prevRt);
      rt?.dispose();
      if (s.phase === 'compiling') scene.visible = false;
      useWarmup.getState().set({ programsWarm: gl.info.programs?.length ?? 0 });
    }
  };

  useLayoutEffect(() => {
    const s = st.current;
    s.alive = true;
    s.frames = 0;
    s.t0 = performance.now();
    if (warmedWorlds++ === 0) {
      // first world of the page: prime the post passes first (see the header), world hidden behind the veil
      s.phase = 'prime';
      scene.visible = false;
      useWarmup.getState().set({ warming: true });
    } else {
      // later worlds (new game from the title screen, loads): the post passes exist, so compile at once, and only hide
      // the world (and raise the veil) if it brings programs that are not compiled yet — usually it brings none
      const before = gl.info.programs?.length ?? 0;
      compile();
      if (s.phase === 'compiling') {
        if ((gl.info.programs?.length ?? 0) === before) {
          window.clearTimeout(s.timer);
          scene.visible = true;
          s.phase = 'done';
        } else useWarmup.getState().set({ warming: true });
      }
    }
    return () => {
      s.alive = false;
      window.clearTimeout(s.timer);
      scene.visible = true;
      s.phase = 'done';
      useWarmup.getState().set({ warming: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame(() => {
    const s = st.current;
    if (s.phase === 'prime') {
      if (++s.frames >= PRIME_FRAMES) compile();
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
 * ids that change when their source is re-registered, so they are left alone (pinning those would only leak).
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
