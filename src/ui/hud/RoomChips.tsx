/**
 * Room view camera chip: "Reset view" flies back to the whole-room framing (the scene also does it on a double-click
 * of the floor, but that is hard to discover and touch browsers do not always synthesize dblclick). The first time a
 * player opens the room view, a short line beside it says how the view moves: the rows of a big hall run past the
 * frame's edges and nothing on screen said the view pans.
 * While the row runs past the left or right edge of the frame (useFacilityOverflow), a soft fade with a chevron marks
 * that edge: there is more of the hall that way. It is only a cue (no pointer events): drags reach the room under it.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Scan } from 'lucide-react';
import { resetFacilityView } from '@/render/camera/CameraRig';
import { useFacilityOverflow } from '@/render/camera/facilityOverflow';
import { sfx } from '@/audio/sfx';
import { useMedia } from '../common/safe';

const HINT_KEY = 'aquarium-go.room-view-hint';

function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true; // storage blocked (private window): no way to remember it, so do not nag every visit
  }
}

export function RoomViewChip() {
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const [hint, setHint] = useState(() => !hintSeen());
  useEffect(() => {
    if (!hint) return;
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* per-viewer convenience only */
    }
    const t = window.setTimeout(() => setHint(false), 9000);
    return () => window.clearTimeout(t);
  }, [hint]);
  return (
    <div className="ag-roomcam">
      <RoomEdges />
      <AnimatePresence>
        {hint && (
          <motion.div className="ag-roomcam__hint" role="note" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {fine ? 'Drag to turn the room · right-drag pans · scroll zooms' : 'Drag to turn the room · two fingers pan and zoom'}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="ag-hudpill ag-camchips">
        <button
          type="button"
          className="ag-camchip"
          data-testid="camera-room-reset"
          title={fine ? 'Back to the whole room (or double-click the floor)' : 'Back to the whole room'}
          onClick={() => {
            sfx('click');
            setHint(false);
            resetFacilityView();
          }}
        >
          <Scan size={15} aria-hidden />
          <span>Reset view</span>
        </button>
      </div>
    </div>
  );
}

function RoomEdges() {
  const left = useFacilityOverflow((s) => s.left);
  const right = useFacilityOverflow((s) => s.right);
  return <RoomEdgeCues left={left} right={right} />;
}

/** Edge cues for an exhibit row that runs past the frame on that side (see the header). */
export function RoomEdgeCues({ left, right }: { left: boolean; right: boolean }) {
  return (
    <AnimatePresence>
      {left && (
        <motion.div key="l" className="ag-roomedge ag-roomedge--left" data-testid="room-edge-left" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <ChevronLeft size={24} />
        </motion.div>
      )}
      {right && (
        <motion.div key="r" className="ag-roomedge ag-roomedge--right" data-testid="room-edge-right" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <ChevronRight size={24} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
