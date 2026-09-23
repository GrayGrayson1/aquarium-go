/**
 * window.__AQ_AUDIO — scripted introspection for QA (headless browsers cannot listen). OWNER: lane "audio".
 *   __AQ_AUDIO.info()          → engine state, bus gains, voices, mood, ambience layer levels, party state
 *   __AQ_AUDIO.meter()         → { rms, peak } of the master output right now
 *   __AQ_AUDIO.sfx(id, opts)   → play a sound
 *   __AQ_AUDIO.unlock()        → create/resume the AudioContext (needs a user gesture in real browsers)
 *   __AQ_AUDIO.party(mic?) / .stopParty()
 *   __AQ_AUDIO.mood(m | null)  → force a music mood
 */
import { engineInfo, meterReading, unlockAudio } from './engine';
import { directorInfo, forceMood } from './director';
import { partyDebug, startPartyMode, stopPartyMode } from './party';
import { sfx, SFX_IDS, type SfxId, type SfxOpts } from './sfx';
import { getAudioStatus } from './store';
import type { MusicMood } from './theory';

declare global {
  interface Window {
    __AQ_AUDIO?: Record<string, unknown>;
  }
}

export function audioDebugInfo() {
  return {
    engine: engineInfo(),
    status: getAudioStatus(),
    director: directorInfo(),
    party: partyDebug(),
  };
}

export function installAudioDebug(): void {
  if (typeof window === 'undefined') return;
  window.__AQ_AUDIO = {
    info: audioDebugInfo,
    meter: meterReading,
    sfx: (id: SfxId, opts?: SfxOpts) => sfx(id, opts),
    sfxIds: SFX_IDS,
    unlock: unlockAudio,
    party: (mic = false) => startPartyMode({ mic }),
    stopParty: () => stopPartyMode(),
    mood: (m: MusicMood | null) => forceMood(m),
  };
}
