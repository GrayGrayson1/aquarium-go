/**
 * Small reactive store with audio status for the UI (settings panel / party-mode toggle). OWNER: lane "audio".
 * Updated only on status changes (never per frame).
 */
import { create } from 'zustand';
import type { MusicMood } from './theory';

export type PartyStatus =
  /** Party mode is not running. */
  | 'off'
  /** Waiting for the user's microphone permission. */
  | 'requesting_mic'
  /** Built-in generative groove is playing and being analysed. */
  | 'builtin'
  /** Listening to the microphone. */
  | 'microphone'
  /** Mic was requested but the user (or browser) denied it → fell back to the built-in groove. */
  | 'mic_denied'
  /** No microphone / getUserMedia unsupported → fell back to the built-in groove. */
  | 'mic_unavailable'
  /** Audio is unavailable (no Web Audio or not yet unlocked): visuals are driven by a silent virtual beat. */
  | 'silent';

export interface AudioStatus {
  /** Web Audio exists in this browser. */
  supported: boolean;
  /** AudioContext has been created and resumed by a user gesture. */
  unlocked: boolean;
  contextState: 'none' | AudioContextState | 'interrupted';
  partyStatus: PartyStatus;
  /** Human-readable note for the UI ("Microphone blocked — playing the built-in groove"). */
  partyMessage: string | null;
  mood: MusicMood;
}

export const useAudioStore = create<AudioStatus>(() => ({
  supported: typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext),
  unlocked: false,
  contextState: 'none',
  partyStatus: 'off',
  partyMessage: null,
  mood: 'off',
}));

export function setAudioStatus(patch: Partial<AudioStatus>): void {
  const cur = useAudioStore.getState();
  let changed = false;
  for (const k of Object.keys(patch) as (keyof AudioStatus)[]) {
    if (cur[k] !== patch[k]) {
      changed = true;
      break;
    }
  }
  if (changed) useAudioStore.setState(patch);
}

export const getAudioStatus = () => useAudioStore.getState();
