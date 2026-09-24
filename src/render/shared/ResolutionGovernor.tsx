/**
 * Drives the canvas resolution from the pixel budget and the measured frame time (see resolution.ts). Mounted once
 * inside the Canvas by SceneCanvas. OWNER: lane "pc-perf". Replaces drei's PerformanceMonitor, which could only toggle
 * shader-recompiling features up and down.
 */
import { useEffect, useRef } from 'react';
import { addAfterEffect, addEffect, useFrame, useThree } from '@react-three/fiber';
import { useSettings } from '@/state/settings';
import { useUI } from '@/state/ui';
import { QUALITY, useRenderPerf, useRenderQuality } from './quality';
import { budgetDpr, deviceKey, readPerfMemory, ScaleController, writePerfMemory } from './resolution';
import { detectGpu } from './gpuTier';
import { useWarmup } from './warmup';

const SOFTWARE_HINT_KEY = 'aquarium-go.hint.hwaccel';
/** Ignore frame times for this long after the warm-up veil lifts or the tab comes back (first frames are uneven). */
const QUIET_MS = 1500;

export function ResolutionGovernor() {
  const size = useThree((s) => s.size);
  const tier = useRenderQuality();
  const auto = useSettings((s) => s.qualityAuto !== false);
  const scale = useRenderPerf((s) => s.scale);
  const B = QUALITY[tier];
  const mem = useRef<ReturnType<typeof readPerfMemory> | null>(null);
  const ctl = useRef<ScaleController | null>(null);
  const tierRef = useRef(tier);
  const quietUntil = useRef(0);
  const last = useRef(0);
  const headroomSaved = useRef(false);

  if (!mem.current) mem.current = readPerfMemory(deviceKey(detectGpu()?.renderer));
  if (!ctl.current || tierRef.current !== tier) {
    // a tier change (Settings, or the last-resort drop) starts from what this device settled on for that tier
    const start = mem.current.scale[tier] ?? (ctl.current ? ctl.current.scale : 1);
    const dropped = ctl.current?.dropped ?? false;
    ctl.current = new ScaleController(start);
    ctl.current.dropped = dropped;
    tierRef.current = tier;
  }
  useEffect(() => {
    const c = ctl.current;
    if (c && useRenderPerf.getState().scale !== c.scale) useRenderPerf.getState().setScale(c.scale);
  }, [tier]);

  // pixel budget → canvas DPR (SceneCanvas passes it to <Canvas dpr>, so both always agree)
  const dpr = budgetDpr(typeof window !== 'undefined' ? window.devicePixelRatio : 1, B.dpr, B.maxMP, size.width, size.height, scale);
  useEffect(() => {
    if (useRenderPerf.getState().dpr !== dpr) useRenderPerf.getState().setDpr(dpr);
    quietUntil.current = Math.max(quietUntil.current, performance.now() + 400);
    ctl.current?.reset();
  }, [dpr]);

  // one friendly hint when the browser draws without the graphics card
  useEffect(() => {
    const gpu = detectGpu();
    if (gpu?.cls !== 'software') return;
    try {
      if (localStorage.getItem(SOFTWARE_HINT_KEY)) return;
      localStorage.setItem(SOFTWARE_HINT_KEY, '1');
    } catch {
      /* storage unavailable: still hint once this session */
    }
    const t = window.setTimeout(
      () => useUI.getState().toast('Your browser is drawing the aquarium without the graphics card, so it may stutter. Turning on “Use graphics acceleration when available” in the browser settings helps a lot.', 'warning'),
      2500,
    );
    return () => window.clearTimeout(t);
  }, []);

  // main-thread time of each frame (all useFrame work + render submission), to tell CPU-bound from GPU-bound
  const work = useRef({ t0: 0, ms: 0 });
  useEffect(() => {
    const a = addEffect(() => {
      work.current.t0 = performance.now();
    });
    const b = addAfterEffect(() => {
      if (work.current.t0) work.current.ms = performance.now() - work.current.t0;
    });
    return () => {
      a();
      b();
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      last.current = 0;
      quietUntil.current = performance.now() + QUIET_MS;
      ctl.current?.reset();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useFrame(() => {
    const now = performance.now();
    const prev = last.current;
    last.current = now;
    const c = ctl.current;
    if (!c || !prev || document.hidden) return;
    if (useWarmup.getState().warming) {
      quietUntil.current = now + QUIET_MS;
      c.reset();
      return;
    }
    if (now < quietUntil.current) return;
    const d = c.frame(now - prev, work.current.ms);
    if (!d) return;
    const m = mem.current!;
    if (d.kind === 'scale') {
      useRenderPerf.getState().setScale(d.scale);
      m.scale[tierRef.current] = d.scale;
      writePerfMemory(m);
    } else if (d.kind === 'drop') {
      // last resort (recompiles programs): once per session, only on Auto, never back up mid-session
      const cur = useRenderPerf.getState().degrade;
      if (!auto || cur <= -2) return;
      useRenderPerf.getState().setDegrade(cur - 1);
      m.degrade = cur - 1;
      writePerfMemory(m);
    } else if (d.kind === 'headroom') {
      // two minutes at full scale and 60 fps: let the next visit try one step richer (never mid-session)
      if (headroomSaved.current || m.degrade >= 0) return;
      headroomSaved.current = true;
      m.degrade = Math.min(0, m.degrade + 1);
      writePerfMemory(m);
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(import.meta.env.DEV || new URLSearchParams(location.search).has('perf'))) return;
    (window as unknown as { __AQ_PERF?: () => unknown }).__AQ_PERF = () => {
      const s = useRenderPerf.getState();
      return { tier: tierRef.current, dpr: s.dpr, scale: s.scale, degrade: s.degrade, auto: useSettings.getState().qualityAuto !== false };
    };
  }, []);
  return null;
}
