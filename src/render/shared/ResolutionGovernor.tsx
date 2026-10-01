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
import { budgetDpr, deviceKey, LatenessProbe, readPerfMemory, ScaleController, writePerfMemory } from './resolution';
import { detectGpu } from './gpuTier';
import { useWarmup } from './warmup';

const SOFTWARE_HINT_KEY = 'aquarium-go.hint.hwaccel';
/** Ignore frame times for this long after the warm-up veil lifts or the tab comes back (first frames are uneven). */
const QUIET_MS = 1500;
/** Interval of the main-thread probe timer (ms): ~125 near-free wake-ups a second. */
const PROBE_MS = 8;

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
    const prev = ctl.current;
    ctl.current = new ScaleController(start);
    if (prev) ctl.current.carryOver(prev);
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

  // main-thread time of each frame (all useFrame work + render submission), to tell CPU-bound from GPU-bound…
  const work = useRef({ t0: 0, ms: 0 });
  // …plus main-thread time spent OUTSIDE the frame loop (React commits, the sim tick, portrait rendering, GC), seen as
  // the lateness of a short timer chain (lane:tankrender — a UI burst used to look GPU-bound and blur the picture)
  const probe = useRef(new LatenessProbe());
  useEffect(() => {
    const a = addEffect(() => {
      work.current.t0 = performance.now();
    });
    // R05-02 — a message posted at the frame's end runs after the browser's rendering update (compositing, the WebGL
    // present), which the probe must not take for outside work
    const channel = new MessageChannel();
    channel.port1.onmessage = (e: MessageEvent<number>) => probe.current.frameDone(e.data, performance.now());
    const b = addAfterEffect(() => {
      if (work.current.t0) {
        const t1 = performance.now();
        work.current.ms = t1 - work.current.t0;
        probe.current.frame(work.current.t0, t1);
        channel.port2.postMessage(t1);
      }
    });
    let timer = 0;
    let at = performance.now();
    const ping = () => {
      const now = performance.now();
      if (!document.hidden) probe.current.tick(at, PROBE_MS, now);
      at = now;
      timer = window.setTimeout(ping, PROBE_MS);
    };
    timer = window.setTimeout(ping, PROBE_MS);
    return () => {
      a();
      b();
      channel.port1.close();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      last.current = 0;
      quietUntil.current = performance.now() + QUIET_MS;
      ctl.current?.reset();
      probe.current.reset();
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
    const ext = probe.current.take();
    if (useWarmup.getState().warming) {
      quietUntil.current = now + QUIET_MS;
      c.reset();
      return;
    }
    if (now < quietUntil.current) return;
    const d = c.frame(now - prev, work.current.ms, ext);
    if (!d) return;
    const m = mem.current!;
    if (d.kind === 'scale') {
      useRenderPerf.getState().setScale(d.scale);
      m.scale[tierRef.current] = d.scale;
      writePerfMemory(m);
    } else if (d.kind === 'drop') {
      // last resort (recompiles programs): once per session, only on Auto, never back up mid-session; remembered for
      // the next visit only once 'drop_helped' confirms it, and always explained
      const cur = useRenderPerf.getState().degrade;
      if (!auto || cur <= -2) return;
      useRenderPerf.getState().setDegrade(cur - 1);
      useUI.getState().toast('Eased the graphics a notch to keep the aquarium smooth. Settings › Graphics has the manual choice.', 'info');
    } else if (d.kind === 'drop_helped') {
      const cur = useRenderPerf.getState().degrade;
      if (!auto || cur >= 0) return;
      m.degrade = cur;
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
      const w = ctl.current?.lastWindow;
      return { tier: tierRef.current, dpr: s.dpr, scale: s.scale, degrade: s.degrade, auto: useSettings.getState().qualityAuto !== false, frameMs: w ? Math.round(w.ms * 10) / 10 : 0, busy: w ? Math.round(w.busy * 100) / 100 : 0, extTotal: Math.round(probe.current.total), extFloor: Math.round(probe.current.floor * 10) / 10, extPost: Math.round(probe.current.post * 10) / 10 };
    };
  }, []);
  return null;
}
