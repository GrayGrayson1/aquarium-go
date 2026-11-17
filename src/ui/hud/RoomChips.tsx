/**
 * Room view camera chip: "Reset view" flies back to the whole-room framing (the scene also does it on a double-click
 * of the floor, but that is hard to discover and touch browsers do not always synthesize dblclick). The first time a
 * player opens the room view, a short line beside it says how the view moves: the rows of a big hall run past the
 * frame's edges and nothing on screen said the view pans.
 * While the row runs past the left or right edge of the frame (useFacilityOverflow), a soft fade with a chevron marks
 * that edge: there is more of the hall that way. It is only a cue (no pointer events): drags reach the room under it.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Map as MapIcon, Scan } from 'lucide-react';
import { resetFacilityView } from '@/render/camera/CameraRig';
import { useFacilityOverflow } from '@/render/camera/facilityOverflow';
import { sfx } from '@/audio/sfx';
import { useMedia } from '../common/safe';
import { go } from '../nav/router'; // lane:automation (chunk 5)

const HINT_KEY = 'aquarium-go.room-view-hint';

function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true; // storage blocked (private window): no way to remember it, so do not nag every visit
  }
}

/**
 * Is it really on screen? (audit B12: on a phone the guide card hides the room chips, `display: none`, and the one-time
 * hint was used up there unseen.)
 */
export function onScreen(el: (Pick<Element, 'getClientRects'> & { checkVisibility?: (o?: { visibilityProperty?: boolean; checkVisibilityCSS?: boolean }) => boolean }) | null): boolean {
  if (!el) return false;
  // (hidden by `display: none` or, under an open sheet, `visibility: hidden`; older engines: laid out at all)
  return typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true }) : el.getClientRects().length > 0;
}

export function RoomViewChip() {
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const [hint, setHint] = useState(() => !hintSeen());
  const hintRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hint) return;
    // audit B12: the hint counts as seen (and its 9 s start) only once it is actually on screen
    let t = 0;
    const show = () => {
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        /* per-viewer convenience only */
      }
      t = window.setTimeout(() => setHint(false), 9000);
    };
    let poll = 0;
    if (onScreen(hintRef.current)) show();
    else
      poll = window.setInterval(() => {
        if (!onScreen(hintRef.current)) return;
        window.clearInterval(poll);
        show();
      }, 500);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(t);
    };
  }, [hint]);
  return (
    <div className="ag-roomcam">
      <RoomEdges />
      <AnimatePresence>
        {hint && (
          <motion.div ref={hintRef} className="ag-roomcam__hint" role="note" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {fine ? 'Drag to turn the room · right-drag pans · scroll zooms' : 'Drag to turn the room · two fingers pan and zoom'}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="ag-hudpill ag-camchips" role="group" aria-label="Room view">
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
        {/* lane:automation (chunk 5, DESIGN-S3D §5.6; NAV-023) — a link to Operations › Map, not a toggle; closing the
            Map returns to the room view (the view isn't part of the address) */}
        <button
          type="button"
          className="ag-camchip ag-camchip--map"
          data-testid="room-facility-map"
          onClick={() => {
            sfx('open');
            setHint(false);
            go({ kind: 'panel', panel: 'operations', tab: 'map' });
          }}
        >
          <MapIcon size={15} aria-hidden />
          <span>Facility map</span>
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
