/**
 * Scene-wide environment pieces shared by SceneRoot and sandboxes. OWNER: lane "waterfx".
 *  - RoomEnvironment: procedural PMREM environment from Lightformers (no network downloads).
 *  - SceneAmbience: hemisphere + environment intensity that follow the game clock (rooms darker than tanks).
 *  - RenderBridge: registers gl/scene/camera for capturePhoto().
 */
import { memo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { getGame } from '@/state/game';
import { registerRenderHandles } from '../camera/photo';

/** Procedural room environment for reflections (no network): ceiling panels, a soft window box, warm lamp, floor bounce. */
export const RoomEnvironment = memo(function RoomEnvironment() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.85}>
      <color attach="background" args={['#0a0d12']} />
      {/* ceiling light panels */}
      <Lightformer form="rect" intensity={1.6} color="#fff2e2" scale={[7, 1.1]} position={[0, 6, -1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.2} color="#fff2e2" scale={[7, 1.1]} position={[0, 6, 2.5]} rotation-x={Math.PI / 2} />
      {/* soft window box behind the viewer (reads as a faint reflection on the front glass) */}
      <Lightformer form="rect" intensity={2} color="#e3ecff" scale={[6, 4]} position={[4, 3.4, 8]} target={[0, 1, 0]} />
      {/* warm practical lamp, left */}
      <Lightformer form="rect" intensity={1.4} color="#ffcf9a" scale={[1.6, 3]} position={[-7, 2, 1]} target={[0, 1, 0]} />
      {/* thin strip for crisp specular lines on glass edges and rims */}
      <Lightformer form="rect" intensity={3} color="#ffffff" scale={[10, 0.12]} position={[0, 4.5, 5]} target={[0, 0.8, 0]} />
      <Lightformer form="ring" intensity={1.2} color="#e8f0ff" scale={1.2} position={[-4, 4, 6]} target={[0, 1, 0]} />
      {/* cool fill from the far wall + dim floor bounce */}
      <Lightformer form="rect" intensity={0.35} color="#5b7a99" scale={[14, 5]} position={[0, 2, -9]} target={[0, 1, 0]} />
      <Lightformer form="rect" intensity={0.25} color="#6b5440" scale={[16, 16]} position={[0, -3, 0]} rotation-x={-Math.PI / 2} />
    </Environment>
  );
});

/** Room ambience that follows the clock: brighter by day, dim at night so tanks glow. */
export function SceneAmbience() {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const g = getGame();
    const h = g ? ((g.clock.hour % 24) + 24) % 24 : 20;
    // daylight curve peaking early afternoon; evenings keep a warm lamp level
    const day = Math.max(0, Math.sin(((h - 6) / 14) * Math.PI));
    if (hemi.current) hemi.current.intensity = 0.05 + 0.22 * day;
    scene.environmentIntensity = 0.3 + 0.5 * day;
  });
  return <hemisphereLight ref={hemi} args={['#c4d4e4', '#2b221c', 0.25]} />;
}

export function RenderBridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    registerRenderHandles({ gl, scene, camera });
    // dev-only handle for scripted render diagnostics (draw calls, triangles, scene walks)
    // lane:perf — also available in production builds with `?perf=1` (frame/draw-call measurements of the real bundle)
    if (import.meta.env.DEV || new URLSearchParams(location.search).has('perf')) (window as unknown as { __AQ_R?: unknown }).__AQ_R = { gl, scene, camera };
    return () => registerRenderHandles(null);
  }, [gl, scene, camera]);
  return null;
}

