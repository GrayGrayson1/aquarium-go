/**
 * Light shafts, particulate, bubbles, surface agitation and event ripple rings. OWNER: lane "waterfx".
 * Bubble/flow sources come from `equipmentEmitters(tank)` (aquascape lane); a default airstone is used when it
 * returns nothing. Ripples react to runtime visual events (feed, tap, bubble bursts, smashes).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import { runtime } from '@/runtime/tankRuntime';
import { useSettings } from '@/state/settings';
import { equipmentEmitters, type EquipmentEmitter } from '../decor/emitters';
import { addSurfaceRipple, MAX_AGITATORS, useTankFX } from '../shared/underwater';
import { useQualityBudget } from '../shared/quality';
import { waterLook } from '../shared/waterLook';
import { useStableDims } from './TankShell';
import { useTankRenderState } from './tankRenderState';
import { LightShafts } from './fx/LightShafts';
import { Particulate } from './fx/Particulate';
import { Bubbles, type BubbleSource } from './fx/Bubbles';
import { ArcherJets } from './fx/ArcherJets'; // lane:brackish

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function safeEmitters(tank: Tank): EquipmentEmitter[] {
  try {
    const e = equipmentEmitters(tank);
    return Array.isArray(e) ? e : [];
  } catch {
    return [];
  }
}

export function TankWaterFX({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const rs = useTankRenderState();
  const budget = useQualityBudget();
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const d = useStableDims(tank);
  const seed = useMemo(() => hashId(tank.id), [tank.id]);
  const look = waterLook(tank.waterClass);

  // emitters: recomputed when the tank changes, but kept referentially stable while their VALUES are unchanged — the
  // sim hands us a new tank (and equipment array) every tick, and a new emitter list would rebuild the bubble/flow
  // setup and the particulate material (a shader recompile several times a second in the hero tank)
  const emittersNow = useMemo(() => safeEmitters(tank), [tank.equipment, d]); // eslint-disable-line react-hooks/exhaustive-deps
  const emitterKey = JSON.stringify(emittersNow);
  const emitters = useMemo(() => emittersNow, [emitterKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const { sources, agitators, flow } = useMemo(() => {
    const src: BubbleSource[] = [];
    const ag: [number, number, number, number][] = [];
    const flowV = new THREE.Vector3();
    const inside = (x: number, lim: number) => Math.max(-lim + 0.01, Math.min(lim - 0.01, x));
    for (const e of emitters) {
      const [x, y, z] = e.pos;
      const cx = inside(x, d.L / 2);
      const cz = inside(z, d.W / 2);
      if (e.kind === 'bubbles') {
        src.push({ x: cx, y: Math.max(d.substrateY + 0.005, Math.min(d.waterY - 0.02, y)), z: cz, rate: Math.max(1, e.rate), size: Math.max(0.0008, e.size || 0.002), spread: 0.006 + (e.size || 0.002) * 2 });
        ag.push([cx, cz, 0.03 + Math.min(0.05, e.rate * 0.0015), Math.min(1.2, 0.25 + e.rate * 0.02)]);
      } else if (e.kind === 'waterfall') {
        src.push({ x: cx, y: d.waterY - 0.012, z: cz, rate: Math.max(8, e.rate * 20), size: 0.0009, spread: 0.02, push: 0.25 });
        ag.push([cx, cz, 0.05 + Math.min(0.06, e.rate * 0.02), Math.min(1.6, 0.6 + e.rate * 0.4)]);
      } else if (e.kind === 'flow') {
        const dir = e.dir ?? [1, 0, 0];
        flowV.x += dir[0] * e.rate * 0.004;
        flowV.z += dir[2] * e.rate * 0.004;
        if (y > d.waterY - 0.08) ag.push([cx, cz, 0.06, Math.min(0.8, e.rate * 0.3)]);
      }
    }
    if (emitters.length === 0) {
      // default airstone tucked in a back corner
      const x = -d.L / 2 + Math.min(0.07, d.L * 0.12);
      const z = -d.W / 2 + Math.min(0.05, d.W * 0.18);
      src.push({ x, y: d.substrateY + 0.012, z, rate: 11 + d.L * 6, size: 0.0022, spread: 0.008 });
      ag.push([x, z, 0.035, 0.5]);
    }
    flowV.clampLength(0, 0.02);
    if (flowV.lengthSq() < 1e-8) flowV.set(0.0018, 0, 0.0006);
    return { sources: src, agitators: ag.slice(0, MAX_AGITATORS), flow: flowV };
  }, [emitters, d]);

  // push agitators into the uniform array
  useMemo(() => {
    const arr = fx.uAgitators.value;
    for (let i = 0; i < arr.length; i++) {
      const a = agitators[i];
      if (a) arr[i].set(a[0], a[1], a[2], a[3]);
      else arr[i].set(0, 0, 0.05, 0);
    }
    fx.uWaveAmp.value = 1 + Math.min(1.5, flow.length() * 60);
  }, [agitators, flow, fx]);

  const shaftStrength = useMemo(() => ({ value: 1 }), []);
  const lastEventT = useRef(performance.now() / 1000);
  const tankId = tank.id;

  useFrame(() => {
    shaftStrength.value = rs.shafts * look.shafts * 0.16 * (1 + rs.beat * 0.8 * rs.party);
    // react to new visual events for this tank (allocation-free scan of the ring buffer)
    const evs = runtime.events;
    let maxT = lastEventT.current;
    for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i];
      if (e.t <= lastEventT.current) break;
      if (e.tankId !== tankId) continue;
      if (e.t > maxT) maxT = e.t;
      const [x, , z] = e.pos;
      const s = e.strength ?? 1;
      switch (e.kind) {
        case 'feed':
          addSurfaceRipple(fx, x, z, 0.9 * s);
          break;
        case 'tap':
          addSurfaceRipple(fx, x, d.W / 2 - 0.015, 0.55 * s);
          break;
        case 'bubble_burst':
          addSurfaceRipple(fx, x, z, 0.35 * s);
          break;
        case 'smash':
        case 'startle':
          if (e.pos[1] > d.waterY - 0.06) addSurfaceRipple(fx, x, z, 0.5 * s);
          break;
        default:
          break;
      }
    }
    lastEventT.current = maxT;
  });

  const volumeFactor = Math.min(3, Math.max(0.5, (d.L * d.W * d.waterY) / 0.022));
  // only the hero tank (lod 0) runs particulate, shafts and bubbles; far tanks stay cheap
  const particleCount = lod !== 0 ? 0 : Math.round(520 * budget.particles * Math.sqrt(volumeFactor));
  const shaftCount = !budget.shafts || lod !== 0 ? 0 : Math.round(Math.min(12, 4 + d.L * 4));
  const bubbleMax = lod !== 0 ? 0 : Math.round(220 * budget.bubbles);

  return (
    <group>
      {shaftCount > 0 && <LightShafts d={d} fx={fx} count={shaftCount} strength={shaftStrength} seed={seed} />}
      {particleCount > 0 && <Particulate d={d} fx={fx} count={particleCount} flow={flow} seed={seed} />}
      {bubbleMax > 0 && sources.length > 0 && <Bubbles d={d} fx={fx} sources={sources} max={bubbleMax} reducedMotion={reducedMotion} />}
      {lod === 0 && <ArcherJets tankId={tank.id} d={d} fx={fx} reducedMotion={reducedMotion} /> /* lane:brackish — archerfish jets + their flies */}
    </group>
  );
}
