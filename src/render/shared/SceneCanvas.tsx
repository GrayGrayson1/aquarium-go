/**
 * The project's Canvas with renderer defaults (ACES tone mapping, sRGB, soft PCF shadows, DPR by quality) and WebGL
 * context-loss recovery (the canvas is remounted when the context is lost for good). OWNER: lane "waterfx".
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { QUALITY, useRenderPerf, useRenderQuality } from './quality';
import { budgetDpr } from './resolution';
import { ResolutionGovernor } from './ResolutionGovernor';
import { RENDERER_TONE_MAPPING } from '../post/PostFX';
import { WarmupVeil } from './warmup';

/** Calls `onReady` once the (re)built scene has drawn a few frames, i.e. its shaders are compiled and on screen. */
function FirstFrames({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    n.current++;
    if (n.current >= 4) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

export interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
}

/** Canvas with the project's renderer defaults (tone mapping, colour space, shadows, DPR by quality, context-loss recovery). */
export function SceneCanvas({ children, className = 'scene-canvas' }: SceneCanvasProps) {
  const quality = useRenderQuality();
  // lane:pc-perf — one number from the ResolutionGovernor (pixel budget × adaptive scale); before it has run, the same
  // budget computed from the window size, so the first frame already respects it
  const governed = useRenderPerf((s) => s.dpr);
  const B = QUALITY[quality];
  const dpr = governed > 0 ? governed : budgetDpr(typeof window !== 'undefined' ? window.devicePixelRatio : 1, B.dpr, B.maxMP, typeof window !== 'undefined' ? window.innerWidth : 1280, typeof window !== 'undefined' ? window.innerHeight : 720);
  const [canvasKey, setCanvasKey] = useState(0);
  const [lost, setLost] = useState(false);
  // after a context loss the rebuilt scene compiles every shader again (~1–2 s of plain black canvas): keep the
  // soft "Restoring graphics…" veil up until the new scene has actually drawn
  const [restoring, setRestoring] = useState(false);
  const onReady = useCallback(() => setRestoring(false), []);
  const timer = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  /** The canvas whose context events we act on (a disposed canvas is force-lost by R3F — that must not count). */
  const current = useRef<HTMLCanvasElement | null>(null);

  const remount = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    // detach from the old canvas BEFORE it is disposed: R3F force-loses its context on unmount, and treating that as
    // a new loss would remount again every 2.5 s forever
    cleanup.current?.();
    cleanup.current = null;
    current.current = null;
    setLost(false);
    setRestoring(true);
    setCanvasKey((k) => k + 1);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      cleanup.current?.();
    },
    [],
  );

  return (
    <>
      <Canvas
        key={canvasKey}
        className={className}
        dpr={dpr}
        shadows="percentage"
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: false, alpha: false }}
        camera={{ fov: 38, near: 0.02, far: 200, position: [0, 1.2, 2] }}
        onCreated={({ gl }) => {
          gl.toneMapping = RENDERER_TONE_MAPPING;
          gl.toneMappingExposure = 1.05;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const el = gl.domElement;
          current.current = el;
          const onLost = (e: Event) => {
            if (el !== current.current) return;
            e.preventDefault();
            setLost(true);
            // if the browser doesn't hand the context back promptly, rebuild everything
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(remount, 2500);
          };
          const onRestored = () => {
            if (el === current.current) remount();
          };
          cleanup.current?.();
          el.addEventListener('webglcontextlost', onLost, false);
          el.addEventListener('webglcontextrestored', onRestored, false);
          cleanup.current = () => {
            el.removeEventListener('webglcontextlost', onLost);
            el.removeEventListener('webglcontextrestored', onRestored);
          };
        }}
      >
        <ResolutionGovernor />
        <Suspense fallback={null}>
          {children}
          {restoring && <FirstFrames onReady={onReady} />}
        </Suspense>
      </Canvas>
      {/* lane:perf — covers the canvas (under the HUD) while a new world's shaders compile, then fades */}
      <WarmupVeil />
      {(lost || restoring) && (
        <div
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'radial-gradient(ellipse at 50% 40%, #0b2a36 0%, #03080c 70%)',
            color: 'rgba(230,245,250,0.85)',
            fontFamily: 'Inter Variable, system-ui, sans-serif',
            fontSize: 14,
            letterSpacing: 0.3,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          Restoring graphics…
        </div>
      )}
    </>
  );
}

