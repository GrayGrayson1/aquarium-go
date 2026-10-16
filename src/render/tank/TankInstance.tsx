/**
 * Composition of one aquarium in world space. OWNER: core (composition only).
 * Each layer is owned by a lane; all layers render in TANK-LOCAL space (see src/types/runtime.ts).
 */
import { memo } from 'react';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import { tankWorldTransform } from '@/sim/tankSpace';
import { TankShell } from './TankShell';
import { TankWaterFX } from './TankWaterFX';
import { TankLights } from './TankLights';
import { TankDecor } from '../decor/TankDecor';
import { TankEquipment } from '../decor/TankEquipment';
import { TankCreatures } from '../creatures/TankCreatures';
import { BreedingVisuals } from '../creatures/breeding/BreedingVisuals';
import { TankAI } from '@/ai/TankAI';
import { TankInteraction } from '../interaction/TankInteraction';
import { FoodParticles } from '../interaction/FoodParticles';
import { TankFXProvider } from './TankFXProvider';

export const TankInstance = memo(function TankInstance({ tank, lod, focused, hidden = false }: { tank: Tank; lod: RenderLod; focused: boolean; /** chunk 6 (B-180): beyond the tank-view radius (SceneRoot), so its AI is throttled. */ hidden?: boolean }) {
  const { position, rotY } = tankWorldTransform(tank);
  return (
    <group position={position} rotation={[0, rotY, 0]} name={`tank:${tank.id}`}>
      <TankFXProvider tank={tank}>
      <TankLights tank={tank} lod={lod} />
      <TankDecor tank={tank} lod={lod} />
      <TankEquipment tank={tank} lod={lod} />
      <TankAI tank={tank} lod={lod} hidden={hidden} />
      <TankCreatures tank={tank} lod={lod} />
      <BreedingVisuals tank={tank} lod={lod} />
      <FoodParticles tank={tank} lod={lod} />
      <TankWaterFX tank={tank} lod={lod} />
      <TankShell tank={tank} lod={lod} />
      {focused && <TankInteraction tank={tank} />}
      </TankFXProvider>
    </group>
  );
});
