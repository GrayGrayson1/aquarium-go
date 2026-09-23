/**
 * Scene composition: environment, facility room, every tank (with LOD), camera, post.
 * OWNER: lane "waterfx" (render lead) — keep the composition contract: FacilityWorld + TankInstance per tank + CameraRig + PostFX.
 *
 * LOD policy:
 *  - tank view: focused tank = lod 0; other tanks = lod 2 and only drawn when within ~7 m (they glow softly in the
 *    background; hidden ones keep ticking because their group is merely invisible).
 *  - facility view: the 4 tanks nearest the camera = lod 1 (full glass/surface materials), the rest lod 2.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useGame, getGame } from '@/state/game';
import { useRenderTank } from './shared/renderSelectors';
import { ProgramKeeper, ShaderWarmup } from './shared/warmup';
import { useUI } from '@/state/ui';
import { tankWorldTransform } from '@/sim/tankSpace';
import { TankInstance } from './tank/TankInstance';
import { FacilityWorld } from './facility/FacilityWorld';
import { CameraRig } from './camera/CameraRig';
import { cameraFX } from './camera/cameraFX';
import { PostFX } from './post/PostFX';
import { useRenderPerf } from './shared/quality';
import { AmbientDepths } from './shared/AmbientDepths';
import { RenderBridge, RoomEnvironment, SceneAmbience } from './shared/environment';

export { RenderBridge, RoomEnvironment, SceneAmbience };
import type { RenderLod } from './lod';

const NEAR_LOD1 = 4;
const TANK_VIEW_RADIUS = 7;

function PerfWatch() {
  const setDegrade = useRenderPerf((s) => s.setDegrade);
  return (
    <PerformanceMonitor
      ms={400}
      iterations={8}
      flipflops={4}
      bounds={(r) => [Math.min(42, r * 0.7), Math.min(57, r * 0.95)]}
      onDecline={() => {
        if (document.visibilityState === 'visible') setDegrade(useRenderPerf.getState().degrade - 1);
      }}
      onIncline={() => setDegrade(useRenderPerf.getState().degrade + 1)}
    />
  );
}

function sameLods(a: Record<string, RenderLod>, b: Record<string, RenderLod>) {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/**
 * `inTankView` as it was before the current camera flight: flips only once the fly-to has landed, so LOD swaps and
 * far-tank hiding happen off-screen / far away instead of popping mid-flight.
 */
function useSettledView(inTankView: boolean): boolean {
  const [settled, setSettled] = useState(inTankView);
  const since = useRef({ want: inTankView, frames: 0, seq: cameraFX.transitionSeq });
  useFrame(() => {
    const s = since.current;
    if (s.want !== inTankView) {
      s.want = inTankView;
      s.frames = 0;
      s.seq = cameraFX.transitionSeq;
    }
    if (settled === inTankView) return;
    s.frames++;
    // give the rig a couple of frames to start its flight, then wait for it to land (or bail out after ~3 s)
    const started = cameraFX.transitionSeq !== s.seq;
    if ((s.frames > 3 && !cameraFX.transitioning && (started || s.frames > 8)) || s.frames > 200) setSettled(inTankView);
  });
  return settled;
}

/** Facility view: the NEAR_LOD1 tanks nearest the camera get lod 1. Re-evaluated ~3×/s, re-renders only on change. */
function useFacilityLods(hasGame: boolean, active: boolean): Record<string, RenderLod> {
  const [lods, setLods] = useState<Record<string, RenderLod>>({});
  const acc = useRef(0);
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    if (!active || !hasGame) return;
    acc.current += dt;
    if (acc.current < 0.33 && Object.keys(lods).length) return;
    acc.current = 0;
    const g = getGame();
    if (!g) return;
    const ranked = g.tankOrder
      .filter((id) => g.tanks[id])
      .map((id) => {
        const p = tankWorldTransform(g.tanks[id]).position;
        return { id, d: Math.hypot(p[0] - camera.position.x, p[2] - camera.position.z) };
      })
      .sort((a, b) => a.d - b.d);
    const next: Record<string, RenderLod> = {};
    ranked.forEach((r, i) => (next[r.id] = i < NEAR_LOD1 ? 1 : 2));
    if (!sameLods(next, lods)) setLods(next);
  });
  return lods;
}

const NO_TANKS: string[] = [];

/**
 * One tank's slot. lane:perf — subscribes to its own tank only (via useRenderTank, which ignores sim bookkeeping), so a
 * sim tick re-renders just the tanks whose drawn state changed instead of the whole scene.
 */
function TankSlot({ id, lod, focused, near }: { id: string; lod: RenderLod; focused: boolean; near: [number, number, number] | null }) {
  const tank = useRenderTank(id);
  if (!tank) return null;
  let visible = true;
  if (near) {
    const p = tankWorldTransform(tank).position;
    visible = Math.hypot(p[0] - near[0], p[2] - near[2]) < TANK_VIEW_RADIUS;
  }
  return (
    <group visible={visible}>
      <TankInstance tank={tank} lod={lod} focused={focused} />
    </group>
  );
}

export function SceneRoot() {
  // lane:perf — narrow subscriptions: SceneRoot re-renders only when the tank list, the hero or its position change,
  // never on a plain sim tick (it used to subscribe to the whole game and rebuild everything 4×/s)
  const hasGame = useGame((s) => !!s.game);
  const tankOrder = useGame((s) => s.game?.tankOrder ?? NO_TANKS);
  const focused = useUI((s) => s.focusedTankId);
  const view = useUI((s) => s.view);
  const screen = useUI((s) => s.screen);
  const inTankView = view === 'tank' || screen !== 'game';
  const settledTankView = useSettledView(inTankView);
  const facilityLods = useFacilityLods(hasGame, !inTankView);
  // the hero keeps full detail until a fly-out has landed; far tanks stay visible until a fly-in has landed
  const heroFull = inTankView || settledTankView;
  const tankViewSettled = inTankView && settledTankView;
  const heroId = useGame((s) => {
    const g = s.game;
    return g ? (focused && g.tanks[focused] ? focused : g.tankOrder[0] ?? null) : null;
  });
  const heroPosKey = useGame((s) => {
    const t = heroId ? s.game?.tanks[heroId] : null;
    return t ? tankWorldTransform(t).position.join(',') : '';
  });
  const heroPos = useMemo(() => (heroPosKey ? (heroPosKey.split(',').map(Number) as [number, number, number]) : null), [heroPosKey]);
  // lane:perf — a newly loaded world (new game, save, fixture) re-runs the shader warm-up
  const worldKey = useGame((s) => (s.game ? `${s.game.saveId}|${s.game.createdRealMs}` : ''));

  return (
    <>
      <color attach="background" args={['#05090d']} />
      <RoomEnvironment />
      <SceneAmbience />
      <RenderBridge />
      <PerfWatch />
      {/* lane:perf — compiled programs survive LOD swaps, so switching tanks/views never recompiles (warmup.tsx) */}
      <ProgramKeeper />
      {hasGame ? (
        <>
          <FacilityWorld />
          {tankOrder.map((id) => {
            const isHero = id === heroId;
            const isFocus = inTankView && isHero;
            let lod: RenderLod;
            if (isHero && heroFull) lod = 0;
            else if (tankViewSettled) lod = 2;
            else lod = facilityLods[id] ?? 2;
            const near = tankViewSettled && !isHero ? heroPos : null;
            return <TankSlot key={id} id={id} lod={lod} focused={isFocus && screen === 'game'} near={near} />;
          })}
          {/* lane:perf — last child of the world: compiles every material in parallel behind a veil (see warmup.tsx) */}
          <ShaderWarmup key={worldKey} />
        </>
      ) : (
        <AmbientDepths />
      )}
      <CameraRig />
      <PostFX />
    </>
  );
}
