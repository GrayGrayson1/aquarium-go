/**
 * Creates per-tank underwater uniforms, keeps them updated every frame, and provides them via TankFXContext.
 * Drives the fixture light from the day/night schedule (lighting.onHour/offHour, sunrise/sunset ramps, moonlight)
 * × preset × intensity, water tint/fog from water class + clarity + algae, and party mode.
 * OWNER: lane "waterfx" (initial version by core).
 */
import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Tank } from '@/types';
import { tankDims } from '@/sim/tankSpace';
import { getGame } from '@/state/game';
import { getUI } from '@/state/ui';
import { audioReactive } from '@/runtime/audioReactive';
import { createTankFXUniforms, TankFXContext } from '../shared/underwater';
import { computeTankLight, createLightState, resolveWaterFog, waterLook } from '../shared/waterLook';
import { useQualityBudget } from '../shared/quality';
import { createTankRenderState, TankRenderStateContext } from './tankRenderState';

const _party = new THREE.Color();

export function TankFXProvider({ tank, children }: { tank: Tank; children: ReactNode }) {
  const fx = useMemo(() => createTankFXUniforms(), []);
  const rs = useMemo(() => createTankRenderState(tank.id), [tank.id]);
  const target = useMemo(() => createLightState(), []);
  const group = useRef<THREE.Group>(null);
  const tankRef = useRef(tank);
  tankRef.current = tank;
  const first = useRef(true);
  const budget = useQualityBudget();

  const d = tankDims(tank);
  fx.uWaterBox.value.set(d.L / 2, d.waterY, d.W / 2);
  const look = waterLook(tank.waterClass);
  // fog/tint from class + chemistry (rounded so we only recompute on meaningful change)
  const clarityQ = Math.round((tank.water?.clarity ?? 1) * 50) / 50;
  const algaeQ = Math.round(tank.water?.algae ?? 0);
  const fog = useMemo(
    () => resolveWaterFog(tank.waterClass, { clarity: clarityQ, algae: algaeQ }, fx.uWaterTint.value),
    [tank.waterClass, clarityQ, algaeQ, fx],
  );
  fx.uFogDensity.value = fog.density;
  fx.uAbsorb.value.set(fog.absorb[0], fog.absorb[1], fog.absorb[2]);
  // caustic cells per metre, a touch larger in big tanks (deeper water → broader focus)
  fx.uCausticScale.value = look.causticScale / Math.max(0.75, Math.pow(Math.max(0.3, d.H) / 0.3, 0.35));
  fx.uCausticChroma.value = budget.causticChroma ? 1 : 0;
  fx.uScatter.value = look.scatter;
  rs.shafts = fog.shafts;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    fx.uTime.value = t;
    rs.time = t;
    fx.uCamPos.value.copy(state.camera.position);
    if (group.current) {
      group.current.updateWorldMatrix(true, false);
      fx.uTankInv.value.copy(group.current.matrixWorld).invert();
    }
    // ── fixture light (schedule + smoothing) ──
    const tk = tankRef.current;
    const hour = getGame()?.clock.hour ?? 12;
    computeTankLight(tk.lighting, hour, target);
    const k = first.current ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 2.5);
    first.current = false;
    rs.light.color.lerp(target.color, k);
    rs.light.level += (target.level - rs.light.level) * k;
    rs.light.day += (target.day - rs.light.day) * k;
    rs.light.moon += (target.moon - rs.light.moon) * k;
    rs.light.actinic += (target.actinic - rs.light.actinic) * k;
    // ── party mode (cosmetic) ──
    const partyOn = getUI().partyMode ? 1 : 0;
    rs.party += (partyOn - rs.party) * (1 - Math.exp(-Math.min(dt, 0.1) * 2));
    if (rs.party < 0.001) rs.party = 0;
    const ar = audioReactive;
    rs.partyHue = ar.enabled && ar.source !== 'none' ? ar.hue : (t * 0.07) % 1;
    // without music the party still breathes with a gentle synthetic pulse
    const synth = ar.enabled && ar.source !== 'none' ? 0 : Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.8)), 6) * 0.6;
    rs.beat = rs.party > 0 ? Math.max(ar.beat ?? 0, synth) : 0;
    fx.uParty.value = rs.party;
    fx.uPartyHue.value = rs.partyHue;
    rs.lampColor.copy(rs.light.color);
    if (rs.party > 0) {
      _party.setHSL(rs.partyHue, 0.9, 0.55);
      const lum = Math.max(0.5, rs.light.level);
      _party.multiplyScalar(lum * 1.4 * (1 + rs.beat * 0.8 + (ar.bass ?? 0) * 0.4));
      rs.lampColor.lerp(_party, rs.party * 0.92);
    }
    fx.uLightColor.value.copy(rs.lampColor);
    fx.uDay.value = rs.light.day;
    fx.uCausticIntensity.value = fog.caustic * (0.35 + 0.65 * rs.light.day + rs.light.moon * 0.1) * (1 + rs.beat * 0.5 * rs.party);
  }, -1);

  return (
    <group ref={group}>
      <TankFXContext.Provider value={fx}>
        <TankRenderStateContext.Provider value={rs}>{children}</TankRenderStateContext.Provider>
      </TankFXContext.Provider>
    </group>
  );
}
