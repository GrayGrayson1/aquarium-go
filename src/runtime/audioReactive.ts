/**
 * Music-reactive values written by the audio lane each frame; read by render lanes for party mode.
 * OWNER: lane "audio". Always safe to read (zeros when disabled).
 *
 * Written every animation frame by `src/audio/party.ts` while party mode runs:
 *   enabled  – true while party mode is active
 *   source   – 'builtin' (generated groove or silent virtual beat) | 'microphone' | 'none'
 *   level    – 0..1 smoothed loudness (auto-gain normalised)
 *   bass/mid/treble – 0..1 band energies (auto-gain normalised, fast attack / slow release)
 *   beat     – jumps to 1 on each detected beat, then decays exponentially (~7/s)
 *   hue      – 0..1, rotates slowly and jumps a golden-ratio step on beats
 */
import type { AudioReactiveState } from '@/types';

export const audioReactive: AudioReactiveState = {
  enabled: false,
  source: 'none',
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
  hue: 0,
};

/** Zero everything (party mode stopped). */
export function resetAudioReactive(): void {
  audioReactive.enabled = false;
  audioReactive.source = 'none';
  audioReactive.level = 0;
  audioReactive.bass = 0;
  audioReactive.mid = 0;
  audioReactive.treble = 0;
  audioReactive.beat = 0;
  audioReactive.hue = 0;
}
