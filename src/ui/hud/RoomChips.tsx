/**
 * Room view camera chip: "Reset view" flies back to the whole-room framing (the scene also does it on a double-click
 * of the floor, but that is hard to discover and touch browsers do not always synthesize dblclick). The first time a
 * player opens the room view, a short line beside it says how the view moves: the rows of a big hall run past the
 * frame's edges and nothing on screen said the view pans.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Scan } from 'lucide-react';
import { resetFacilityView } from '@/render/camera/CameraRig';
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
