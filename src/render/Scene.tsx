/** The single WebGL canvas. OWNER: lane "waterfx". Handles WebGL context loss by remounting the canvas. */
import { SceneRoot } from './SceneRoot';
import { SceneCanvas } from './shared/SceneCanvas';

export { SceneCanvas };
export type { SceneCanvasProps } from './shared/SceneCanvas';

export function Scene() {
  return (
    <SceneCanvas>
      <SceneRoot />
    </SceneCanvas>
  );
}
