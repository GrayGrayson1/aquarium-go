/**
 * fishart tank sandbox (lane "fishart", dev only): a real tank from a fixture/showcase world, rendered with the real
 * TankCreatures layer. Other lanes' tank layers are loaded dynamically behind error guards, so a lane that is
 * mid-edit cannot take this view down.
 *
 * URL: /src/dev/sandboxes/fishart-standalone.html?s=tank&fixture=betta [&cam=front|close|top] [&zoom=1] [&sel=1]
 *      or ?sandbox=fishart-tank&fixture=...
 */
import { Component, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { runtime } from '@/runtime/tankRuntime';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Tank } from '@/types';
import type { RenderLod } from '@/render/lod';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { FIXTURES } from '@/dev/fixtures';
import { tankDims, tankWorldTransform } from '@/sim/tankSpace';
import { TankCreatures } from '@/render/creatures/TankCreatures';
import { TankFXContext, createTankFXUniforms } from '@/render/shared/underwater';

const q = new URLSearchParams(location.search);
type Layer = ComponentType<{ tank: Tank; lod: RenderLod }>;

class Guard extends Component<{ children: ReactNode; name: string }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(e: unknown) {
    console.warn(`[fishart-tank] layer ${this.props.name} failed`, e);
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

function useLayers() {
  const [layers, setLayers] = useState<{ name: string; C: Layer }[] | null>(null);
  const [Provider, setProvider] = useState<ComponentType<{ tank: Tank; children: ReactNode }> | null>(null);
  useEffect(() => {
    const load = async <T,>(name: string, f: () => Promise<T>): Promise<T | null> => {
      try {
        return await f();
      } catch (e) {
        console.warn(`[fishart-tank] could not load ${name}`, e);
        return null;
      }
    };
    (async () => {
      const skip = (q.get('skip') ?? '').split(',');
      const specs: [string, () => Promise<Record<string, unknown>>, string][] = [
        ['lights', () => import('@/render/tank/TankLights'), 'TankLights'],
        ['decor', () => import('@/render/decor/TankDecor'), 'TankDecor'],
        ['equipment', () => import('@/render/decor/TankEquipment'), 'TankEquipment'],
        ['ai', () => import('@/ai/TankAI'), 'TankAI'],
        ['food', () => import('@/render/interaction/FoodParticles'), 'FoodParticles'],
        ['water', () => import('@/render/tank/TankWaterFX'), 'TankWaterFX'],
        ['shell', () => import('@/render/tank/TankShell'), 'TankShell'],
      ];
      const out: { name: string; C: Layer }[] = [];
      for (const [name, f, exp] of specs) {
        if (skip.includes(name)) continue;
        const m = await load(name, f);
        const C = m?.[exp] as Layer | undefined;
        if (C) out.push({ name, C });
      }
      const pm = await load('fxprovider', () => import('@/render/tank/TankFXProvider'));
      if (pm?.TankFXProvider) setProvider(() => pm.TankFXProvider as ComponentType<{ tank: Tank; children: ReactNode }>);
      setLayers(out);
    })();
  }, []);
  return { layers, Provider };
}

function Cam({ tank }: { tank: Tank }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const d = tankDims(tank);
    const { position } = tankWorldTransform(tank);
    const cam = q.get('cam') ?? 'front';
    const zoom = Number(q.get('zoom') ?? 1);
    const dist = Math.max(0.5, d.L * 1.15) / zoom;
    const tx = position[0] + Number(q.get('cx') ?? 0);
    const ty = position[1] + d.waterY * Number(q.get('cy') ?? 0.5);
    if (cam === 'top') camera.position.set(tx, position[1] + d.H + dist, position[2] + 0.01);
    else if (cam === 'close') camera.position.set(tx + dist * 0.2, ty + dist * 0.05, position[2] + d.W / 2 + dist * 0.45);
    else camera.position.set(tx, ty + dist * 0.06, position[2] + d.W / 2 + dist);
    camera.lookAt(tx, ty, position[2]);
  }, [camera, tank]);
  return null;
}

/** Follow camera: frames creature #idx (by runtime or its rendered root) from the front glass side. */
function Follow({ tank, idx }: { tank: Tank; idx: number }) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const cur = useMemo(() => new THREE.Vector3(), []);
  const first = useMemo(() => ({ v: true }), []);
  useFrame(() => {
    const g = useGame.getState().game;
    if (!g) return;
    const ids = Object.values(g.creatures).filter((c) => c.tankId === tank.id).map((c) => c.id);
    const id = ids[idx % Math.max(1, ids.length)];
    let obj: THREE.Object3D | undefined;
    scene.traverse((o) => {
      if (o.userData.creatureId === id) obj = o;
    });
    if (!obj) return;
    obj.getWorldPosition(tgt);
    const L = obj.getWorldScale(cur).x;
    const dist = L * Number(q.get('fd') ?? 2.6);
    const want = cur.set(tgt.x + dist * Number(q.get('fx') ?? 0.25), tgt.y + dist * 0.12, tgt.z + dist);
    if (first.v) {
      camera.position.copy(want);
      first.v = false;
    } else camera.position.lerp(want, 0.08);
    camera.lookAt(tgt);
    void runtime;
  });
  return null;
}

/** Frame-time probe: window.__fishartFps = average fps over the last second. */
function Fps() {
  const acc = useMemo(() => ({ t: 0, n: 0 }), []);
  useFrame((_, dt) => {
    acc.t += dt;
    acc.n++;
    if (acc.t >= 1) {
      (window as unknown as { __fishartFps: number }).__fishartFps = acc.n / acc.t;
      const el = document.getElementById('fishart-fps');
      if (el) el.textContent = `${(acc.n / acc.t).toFixed(0)} fps`;
      acc.t = 0;
      acc.n = 0;
    }
  });
  return null;
}

function FallbackFX({ tank, children }: { tank: Tank; children: ReactNode }) {
  const fx = useMemo(() => createTankFXUniforms(), []);
  const d = tankDims(tank);
  fx.uWaterBox.value.set(d.L / 2, d.waterY, d.W / 2);
  return <TankFXContext.Provider value={fx}>{children}</TankFXContext.Provider>;
}

export default function FishartTank() {
  const fixture = q.get('fixture') ?? 'betta';
  const game = useGame((s) => s.game);
  useEffect(() => {
    const make = FIXTURES[fixture] ?? FIXTURES.betta;
    const g = make();
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: null });
    if (q.get('sel') === '1') {
      const first = Object.values(g.creatures)[0];
      if (first) useUI.getState().set({ selectedCreatureId: first.id });
    }
  }, [fixture]);
  const { layers, Provider } = useLayers();
  const tank = useMemo(() => {
    if (!game) return null;
    if (q.has('tank')) return game.tanks[game.tankOrder[Number(q.get('tank'))]] ?? null;
    // default: the most populated tank
    let best = game.tankOrder[0];
    let n = -1;
    for (const id of game.tankOrder) {
      const k = Object.values(game.creatures).filter((c) => c.tankId === id).length;
      if (k > n) {
        n = k;
        best = id;
      }
    }
    return game.tanks[best] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.tankOrder, game ? Object.keys(game.creatures).length : 0]);
  const P = Provider ?? FallbackFX;
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050b10' }}>
      <Canvas
        dpr={[1, 2]}
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: 38, near: 0.01, far: 100, position: [0, 1.2, 2] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#050b10']} />
        <ambientLight intensity={0.25} />
        <hemisphereLight args={['#bcd7e6', '#2a2118', 0.35]} />
        {tank && layers && (
          <group position={tankWorldTransform(tank).position} rotation={[0, tank.placement.rotY, 0]}>
            <Guard name="provider">
              <P tank={tank}>
                {layers.map(({ name, C }) => (
                  <Guard key={name} name={name}>
                    <Suspense fallback={null}>
                      <C tank={tank} lod={0} />
                    </Suspense>
                  </Guard>
                ))}
                <TankCreatures tank={tank} lod={Number(q.get('lod') ?? 0) as RenderLod} />
              </P>
            </Guard>
          </group>
        )}
        {tank && q.get('cam') !== 'follow' && <Cam tank={tank} />}
        {tank && q.get('cam') === 'follow' && <Follow tank={tank} idx={Number(q.get('idx') ?? 0)} />}
        {q.get('orbit') === '1' && <OrbitControls makeDefault />}
        <Fps />
      </Canvas>
      <div id="fishart-fps" style={{ position: 'fixed', right: 10, top: 8, font: '12px Inter, system-ui', color: '#8fb' }} />
    </div>
  );
}
