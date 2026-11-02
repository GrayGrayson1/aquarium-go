/**
 * chunk 19 (ADR-0055 decision 4, QOL-005) — the view pad while decorating: turn around the tank, look from higher or
 * lower, zoom, and jump to Front · Above · Left · Right or back (Reset). It takes the tool rail's place (the rail's
 * feeding and photo tools have nothing to do while a piece is in hand): a column at the right on a computer (left of
 * an open Build sheet), two rows above the tab bar on a phone. Holding a step button repeats it. The camera itself is
 * src/render/camera/decorCam.ts. The words are drafted for the owner (ADR-0055 decision 8). OWNER: lane "ui-shell".
 */
import { useEffect, useRef, type ComponentType } from 'react';
import { RotateCcw, RotateCw, ChevronsUp, ChevronsDown, ZoomIn, ZoomOut, type LucideProps } from 'lucide-react';
import { useUI } from '@/state/ui';
import { useMedia } from '../common/safe';
import { sfx } from '@/audio/sfx';
import { nudgeDecorCam, setDecorPreset, DECOR_STEP, type DecorPreset } from '@/render/camera/decorCam';

/** The decorating tools: the pad (and the decorating camera) is on while one of them is. */
export const isDecorating = (tool: string, view: string): boolean => view === 'tank' && (tool === 'decor_place' || tool === 'decor_move');

const REPEAT_MS = 140;

function StepButton({ icon: Icon, label, testId, onStep }: { icon: ComponentType<LucideProps>; label: string; testId: string; onStep: () => void }) {
  const timer = useRef(0);
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = 0;
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      className="ag-decorpad__btn"
      aria-label={label}
      title={label}
      data-testid={testId}
      onPointerDown={(e) => {
        if (e.button > 0) return;
        stop();
        timer.current = window.setInterval(onStep, REPEAT_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={() => {
        // a click (keyboard, or a quick tap) is one step; the hold above repeats it
        sfx('click', { volume: 0.35 });
        onStep();
      }}
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}

const PRESETS: [DecorPreset, string, string][] = [
  ['front', 'Front', 'Front view'],
  ['above', 'Above', 'View from above'],
  ['left', 'Left', 'View from the left'],
  ['right', 'Right', 'View from the right'],
  ['reset', 'Reset', 'Reset to the starting view'], // (the name holds the visible word: WCAG 2.5.3)
];

/** Where the pad is two rows under the tank (qol.css): phones upright (not held sideways, reviewer B9)… */
export const PAD_BAND = '(max-width: 720px) and (orientation: portrait), (max-width: 720px) and (min-height: 501px)';
/** …and a 721–1080 px window while Build's side sheet is open beside it (reviewer B10). */
export const MID_BAND = '(min-width: 721px) and (max-width: 1080px) and (min-height: 501px)';

export function DecorCamPad() {
  const on = useUI((s) => isDecorating(s.tool, s.view));
  const sideSheet = useUI((s) => !!s.panel);
  // the camera frames the tank clear of the pad (src/render/camera/viewport.ts): a column at the right, else a band below
  const band = useMedia(PAD_BAND);
  const mid = useMedia(MID_BAND);
  if (!on) return null;
  const below = band || (mid && sideSheet);
  return (
    <div className="ag-decorpad" role="toolbar" aria-label="Decorating view" data-testid="decor-cam-pad" data-occlude={below ? 'bottom' : 'right'} data-layout={below ? 'band' : 'column'}>
      <div className="ag-decorpad__steps">
        <StepButton icon={RotateCcw} label="Turn left" testId="decor-cam-turn-left" onStep={() => nudgeDecorCam({ yaw: -DECOR_STEP.yaw / 2 })} />
        <StepButton icon={RotateCw} label="Turn right" testId="decor-cam-turn-right" onStep={() => nudgeDecorCam({ yaw: DECOR_STEP.yaw / 2 })} />
        <StepButton icon={ChevronsUp} label="Look from higher" testId="decor-cam-higher" onStep={() => nudgeDecorCam({ pitch: DECOR_STEP.pitch / 2 })} />
        <StepButton icon={ChevronsDown} label="Look from lower" testId="decor-cam-lower" onStep={() => nudgeDecorCam({ pitch: -DECOR_STEP.pitch / 2 })} />
        <StepButton icon={ZoomIn} label="Zoom in" testId="decor-cam-in" onStep={() => nudgeDecorCam({ zoom: 1 / Math.sqrt(DECOR_STEP.zoom) })} />
        <StepButton icon={ZoomOut} label="Zoom out" testId="decor-cam-out" onStep={() => nudgeDecorCam({ zoom: Math.sqrt(DECOR_STEP.zoom) })} />
      </div>
      <div className="ag-decorpad__views">
        {PRESETS.map(([id, word, label]) => (
          <button
            key={id}
            type="button"
            className="ag-decorpad__view"
            aria-label={label}
            title={label}
            data-testid={`decor-view-${id}`}
            onClick={() => {
              sfx('camera', { volume: 0.35 });
              setDecorPreset(id);
            }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
