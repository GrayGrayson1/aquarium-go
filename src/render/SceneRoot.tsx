/**
 * Scene composition: environment, facility room, every tank (with LOD), camera, post.
 * OWNER: lane "waterfx" (render lead) — keep the composition contract: FacilityWorld + TankInstance per tank + CameraRig + PostFX.
 *
 * LOD policy:
 *  - tank view: focused tank = lod 0; other tanks = lod 2 and only drawn when within ~7 m (they glow softly in the
 *    background; hidden ones keep ticking because their group is merely invisible).
 *  - facility view: the 4 tanks nearest the camera = lod 1 (full glass/surface materials), the rest lod 2 — with
 *    hysteresis (facilityLods in lod.ts), so dragging the camera does not flip the tanks at the cut-off.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGame, getGame } from '@/state/game';
import { useRenderTank } from './shared/renderSelectors';
import { ProgramKeeper, ShaderWarmup, useWarmup } from './shared/warmup';
import { useUI } from '@/state/ui';
import { tankWorldTransform } from '@/sim/tankSpace';
import { TankInstance } from './tank/TankInstance';
import { FacilityWorld } from './facility/FacilityWorld';
import { CameraRig } from './camera/CameraRig';
import { cameraFX } from './camera/cameraFX';
import { PostFX } from './post/PostFX';
import { AmbientDepths } from './shared/AmbientDepths';
import { useRenderQuality } from './shared/quality';
import { RenderBridge, RoomEnvironment, SceneAmbience } from './shared/environment';

export { RenderBridge, RoomEnvironment, SceneAmbience };
import { facilityLods, type RenderLod } from './lod';

const NEAR_LOD1 = 4;
const TANK_VIEW_RADIUS = 7;

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
  const since = useRef({ want: inTankView, frames: 0, secs: 0, seq: cameraFX.transitionSeq });
  useFrame((_, dt) => {
    const s = since.current;
    if (s.want !== inTankView) {
      s.want = inTankView;
      s.frames = 0;
      s.secs = 0;
      s.seq = cameraFX.transitionSeq;
    }
    if (settled === inTankView) return;
    s.frames++;
    s.secs += Math.min(dt, 0.1);
    // give the rig a couple of frames to start its flight, then wait for it to land (or bail out after ~3 s of frame time,
    // lane:pc-perf — was 200 frames: 1.4 s at 144 Hz)
    const started = cameraFX.transitionSeq !== s.seq;
    if ((s.frames > 3 && !cameraFX.transitioning && (started || s.frames > 8)) || s.secs > 3.3) setSettled(inTankView);
  });
  return settled;
}

/** Facility view: the NEAR_LOD1 tanks nearest the camera get lod 1 (with hysteresis). Re-evaluated ~3×/s, re-renders only on change. */
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
    const next = facilityLods(
      ranked.map((r) => r.id),
      lods,
      NEAR_LOD1,
    );
    if (!sameLods(next, lods)) setLods(next);
  });
  return lods;
}

const NO_TANKS: string[] = [];

/**
 * lane:tankrender (G4-02/G4-07) — building a world (every tank's geometry, textures, creatures) is one synchronous
 * commit: 0.3–1.4 s for the title showcase, up to ~4 s for a big save on a phone. It used to run before anything could
 * show the warm-up veil, so the title screen or the pressed Continue button just froze. Now a new world first raises
 * the veil and lets it paint, and only then is built — under the veil, which ShaderWarmup lowers once the
 * world's shaders are ready, as one continuous transition. Returns the world key that may be built.
 */
function useVeiledBuild(hasGame: boolean, worldKey: string): string {
  const [built, setBuilt] = useState('');
  const pending = hasGame && built !== worldKey;
  useLayoutEffect(() => {
    if (!pending) return;
    useWarmup.getState().set({ warming: true });
    // wait for the veil's DOM commit (WarmupVeil reports it), then one more frame so it has been painted; never more
    // than a handful of frames, so a missing veil can never hold the world back
    let raf = 0;
    let frames = 0;
    let shown = false;
    const tick = () => {
      if (shown || ++frames > 8) {
        setBuilt(worldKey);
        return;
      }
      shown = useWarmup.getState().veilUp;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pending, worldKey]);
  return built;
}

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
    // lane:pc-perf — a hidden tank's subtree also skips three's per-frame matrix updates (they ran for every object,
    // visible or not: ~2,400 of the 3,800 objects in the 1,000 gal view)
    <group visible={visible} matrixWorldAutoUpdate={visible}>
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
  // lane:pc-perf — …and so does a tier change (Settings, or the governor's last-resort drop): its new programs compile
  // in parallel behind the veil instead of freezing the first frame (seconds on Windows/Direct3D)
  const renderQuality = useRenderQuality();
  const builtKey = useVeiledBuild(hasGame, worldKey);
  const showWorld = hasGame && builtKey === worldKey;

  return (
    <>
      <color attach="background" args={['#05090d']} />
      <RoomEnvironment />
      <SceneAmbience />
      <RenderBridge />
      {/* lane:pc-perf — frame-time adaptation lives in SceneCanvas's ResolutionGovernor (resolution first, features last) */}
      {/* lane:perf — compiled programs survive LOD swaps, so switching tanks/views never recompiles (warmup.tsx) */}
      <ProgramKeeper />
      {showWorld ? (
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
          <ShaderWarmup key={`${worldKey}|${renderQuality}`} />
        </>
      ) : hasGame ? null : (
        <AmbientDepths />
      )}
      <CameraRig />
      <PostFX />
    </>
  );
}
