/**
 * Audio engine mount point (ambience, music, sfx, party-mode analysis). OWNER: lane "audio".
 * Renders nothing. Pre-builds the (silent) AudioContext at idle time, installs the user-gesture unlock,
 * mounts the audio director and exposes `window.__AQ_AUDIO` for scripted QA.
 */
import { useEffect } from 'react';
import { prewarmAudio, unlockAudio, isRunning, gestureHeard } from './engine';
import { startDirector } from './director';
import { installAudioDebug } from './debug';

const GESTURES = ['pointerdown', 'keydown', 'touchend', 'mousedown'] as const;

/** Run `fn` once the main thread is idle (bounded by `timeoutMs`); returns a cancel function. */
function whenIdle(fn: () => void, timeoutMs: number): () => void {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, Math.min(timeoutMs, 800));
  return () => window.clearTimeout(id);
}

export function AudioRoot() {
  useEffect(() => {
    const stop = startDirector();
    installAudioDebug();
    // the context + bus graph (and, via the director, buffer generation) off the first click's critical path
    const cancelPrewarm = whenIdle(prewarmAudio, 2500);
    // A permanent, cheap capture listener: the first gesture resumes the context; any later one brings it back
    // after an OS interruption (iOS: a call, Siri, another app's audio) that leaves it suspended/'interrupted'.
    const onGesture = () => {
      if (!gestureHeard() || !isRunning()) unlockAudio();
    };
    for (const g of GESTURES) window.addEventListener(g, onGesture, { capture: true, passive: true });
    return () => {
      cancelPrewarm();
      for (const g of GESTURES) window.removeEventListener(g, onGesture, true);
      stop();
    };
  }, []);
  return null;
}

export default AudioRoot;
