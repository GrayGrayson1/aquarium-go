/**
 * Audio engine mount point (ambience, music, sfx, party-mode analysis). OWNER: lane "audio".
 * Renders nothing. Installs the one-time user-gesture unlock, mounts the audio director and exposes
 * `window.__AQ_AUDIO` for scripted QA.
 */
import { useEffect } from 'react';
import { unlockAudio, isRunning } from './engine';
import { startDirector } from './director';
import { installAudioDebug } from './debug';

const GESTURES = ['pointerdown', 'keydown', 'touchend', 'mousedown'] as const;

export function AudioRoot() {
  useEffect(() => {
    const stop = startDirector();
    installAudioDebug();
    const onGesture = () => {
      unlockAudio();
      // keep listening until the context is actually running (some browsers need a later gesture)
      setTimeout(() => {
        if (isRunning()) for (const g of GESTURES) window.removeEventListener(g, onGesture, true);
      }, 250);
    };
    for (const g of GESTURES) window.addEventListener(g, onGesture, { capture: true, passive: true });
    return () => {
      for (const g of GESTURES) window.removeEventListener(g, onGesture, true);
      stop();
    };
  }, []);
  return null;
}

export default AudioRoot;
