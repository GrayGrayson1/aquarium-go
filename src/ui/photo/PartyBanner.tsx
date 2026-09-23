/**
 * Party mode banner: an honest disclaimer ("real fish don't dance"), microphone opt-in and a stop button.
 * The audio lane's director follows ui.partyMode / settings.partyUseMicrophone. OWNER: lane "ui-shell".
 */
import { AnimatePresence, motion } from 'motion/react';
import { PartyPopper, Mic, MicOff, X } from 'lucide-react';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { usePartyStatus } from '../common/audioApi';
import { togglePartyMode } from '../hud/ToolRail';

export function PartyBanner() {
  const party = useUI((s) => s.partyMode);
  const hud = useUI((s) => s.hudHidden);
  const photo = useUI((s) => s.photoMode);
  const mic = useSettings((s) => s.partyUseMicrophone);
  const { status, message } = usePartyStatus();
  const listening = status === 'microphone';
  return (
    <AnimatePresence>
      {party && !hud && !photo && (
        <motion.div className="ag-party" role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
          <span className="ag-party__icon" aria-hidden>
            <PartyPopper size={16} />
          </span>
          <div className="ag-grow">
            <div className="ag-party__title">Party mode</div>
            <div className="ag-party__note">Just for fun: lights dance to music. Real fish don’t dance.</div>
            {message && <div className="ag-party__note ag-muted">{message}</div>}
          </div>
          <button
            type="button"
            className="ag-party__btn"
            aria-pressed={mic}
            title={mic ? 'Stop using the microphone' : 'Use your microphone (asks permission)'}
            onClick={() => {
              sfx('click');
              useSettings.getState().update({ partyUseMicrophone: !mic });
            }}
          >
            {mic ? <Mic size={15} /> : <MicOff size={15} />}
            <span>{listening ? 'Listening' : mic ? 'Mic on' : 'Use mic'}</span>
          </button>
          <button type="button" className="ag-party__close" aria-label="Stop party mode" onClick={() => togglePartyMode(false)}>
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
