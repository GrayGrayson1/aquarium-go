/**
 * Pure music theory + generative rules for the ambient score and the party groove. OWNER: lane "audio".
 * Chords are pitch sets in semitones relative to the mood's key root; progressions are small Markov chains so the
 * music keeps evolving without repeating a fixed loop.
 */
import type { Rand } from './dsp';

export type MusicMood = 'off' | 'title' | 'tank' | 'facility' | 'night' | 'market' | 'party';

export interface ChordDef {
  name: string;
  /** Pad voicing (semitones from key root). */
  tones: number[];
  /** Bass root (semitones from key root, usually negative octave). */
  root: number;
  /** Weighted transitions to other chord names. */
  next: [string, number][];
}

export interface MoodConfig {
  mood: MusicMood;
  /** MIDI note of the key root. */
  key: number;
  bpm: number;
  /** Beats per chord (before random stretching). */
  chordBeats: number;
  chords: ChordDef[];
  /** Melody scale (semitones within an octave). */
  scale: number[];
  /** MIDI range for melody plucks. */
  melodyRange: [number, number];
  /** Probability that an 8th-note step inside a phrase sounds. */
  pluckDensity: number;
  /** Rest between phrases, in 8th-note steps [min, max]. */
  phraseRest: [number, number];
  /** Notes per phrase [min, max]. */
  phraseLen: [number, number];
  pluckVoice: 'felt' | 'kalimba';
  pluckLevel: number;
  padLevel: number;
  /** Pad low-pass cutoff range (Hz) swept slowly by an LFO. */
  padCutoff: [number, number];
  /** Octave offset applied to pad voicings. */
  padOctave: number;
  /** Seconds between glass chime flourishes [min, max]; 0 disables. */
  chimeEvery: [number, number];
  droneLevel: number;
  /** Soft rhythmic bass pulse on beats (facility mood). */
  pulse: number;
  /** Delay (echo) feedback on plucks. */
  echo: number;
}

// Chord vocabulary (relative to key root = 0).
const LYDIAN: ChordDef[] = [
  { name: 'I', tones: [0, 7, 11, 14, 16], root: -12, next: [['II', 3], ['vi', 2], ['iii', 1], ['V', 1]] },
  { name: 'II', tones: [2, 6, 9, 14, 18], root: -10, next: [['I', 4], ['vi', 1], ['V', 1]] },
  { name: 'vi', tones: [-3, 4, 7, 11, 14], root: -15, next: [['II', 2], ['iii', 1], ['I', 2], ['V', 1]] },
  { name: 'iii', tones: [4, 7, 11, 14, 18], root: -8, next: [['vi', 2], ['II', 2], ['I', 1]] },
  { name: 'V', tones: [7, 11, 14, 18, 21], root: -5, next: [['I', 3], ['II', 1], ['vi', 1]] },
];

const WARM_MAJOR: ChordDef[] = [
  { name: 'I', tones: [0, 4, 7, 11, 14], root: -12, next: [['vi', 2], ['IV', 3], ['iii', 1]] },
  { name: 'vi', tones: [-3, 4, 7, 11, 12], root: -15, next: [['IV', 3], ['ii', 2], ['I', 1]] },
  { name: 'IV', tones: [5, 9, 12, 16, 19], root: -7, next: [['I', 3], ['V', 2], ['ii', 1]] },
  { name: 'ii', tones: [2, 5, 9, 12, 16], root: -10, next: [['V', 3], ['IV', 1]] },
  { name: 'iii', tones: [4, 7, 11, 14], root: -8, next: [['vi', 2], ['IV', 2]] },
  { name: 'V', tones: [7, 12, 14, 19, 21], root: -5, next: [['I', 3], ['vi', 2]] }, // Vsus4-ish, never harsh
];

const DORIAN_NIGHT: ChordDef[] = [
  { name: 'i', tones: [0, 7, 10, 14, 15], root: -12, next: [['IV', 3], ['VII', 2], ['v', 1]] },
  { name: 'IV', tones: [5, 9, 12, 14, 16], root: -7, next: [['i', 3], ['VII', 1]] },
  { name: 'VII', tones: [-2, 5, 9, 14, 17], root: -14, next: [['i', 2], ['IV', 1], ['v', 1]] },
  { name: 'v', tones: [7, 10, 14, 17], root: -5, next: [['i', 2], ['IV', 1]] },
];

const MAJOR_PENTA = [0, 2, 4, 7, 9];
const LYDIAN_PENTA = [0, 2, 4, 6, 7, 9, 11];
const MINOR_PENTA = [0, 3, 5, 7, 10];

export const MOODS: Record<Exclude<MusicMood, 'off' | 'party'>, MoodConfig> = {
  // Wonder: D lydian, brighter kalimba, more chimes.
  title: {
    mood: 'title', key: 62, bpm: 76, chordBeats: 8, chords: LYDIAN, scale: LYDIAN_PENTA, melodyRange: [69, 91],
    pluckDensity: 0.55, phraseRest: [6, 14], phraseLen: [4, 8], pluckVoice: 'kalimba', pluckLevel: 0.33,
    padLevel: 0.2, padCutoff: [900, 2200], padOctave: -12, chimeEvery: [9, 20], droneLevel: 0.07, pulse: 0, echo: 0.34,
  },
  // Calm in-tank listening: F lydian/pentatonic, sparse felt piano, long chords.
  tank: {
    mood: 'tank', key: 53, bpm: 66, chordBeats: 10, chords: LYDIAN, scale: MAJOR_PENTA, melodyRange: [65, 86],
    pluckDensity: 0.38, phraseRest: [10, 22], phraseLen: [3, 6], pluckVoice: 'felt', pluckLevel: 0.3,
    padLevel: 0.17, padCutoff: [650, 1500], padOctave: 0, chimeEvery: [22, 48], droneLevel: 0.06, pulse: 0, echo: 0.3,
  },
  // Facility: E-flat warm major with a gentle pulse.
  facility: {
    mood: 'facility', key: 51, bpm: 84, chordBeats: 8, chords: WARM_MAJOR, scale: MAJOR_PENTA, melodyRange: [63, 84],
    pluckDensity: 0.46, phraseRest: [6, 14], phraseLen: [4, 7], pluckVoice: 'felt', pluckLevel: 0.28,
    padLevel: 0.16, padCutoff: [800, 1800], padOctave: 0, chimeEvery: [25, 50], droneLevel: 0.05, pulse: 0.16, echo: 0.26,
  },
  // Night: A dorian, lower, darker, sparser.
  night: {
    mood: 'night', key: 45, bpm: 58, chordBeats: 12, chords: DORIAN_NIGHT, scale: MINOR_PENTA, melodyRange: [57, 76],
    pluckDensity: 0.26, phraseRest: [14, 30], phraseLen: [2, 5], pluckVoice: 'felt', pluckLevel: 0.26,
    padLevel: 0.15, padCutoff: [380, 900], padOctave: 12, chimeEvery: [35, 70], droneLevel: 0.07, pulse: 0, echo: 0.38,
  },
  // Market/visitors panels: light, G lydian, kalimba, a touch quicker.
  market: {
    mood: 'market', key: 55, bpm: 92, chordBeats: 8, chords: LYDIAN, scale: MAJOR_PENTA, melodyRange: [67, 88],
    pluckDensity: 0.52, phraseRest: [4, 10], phraseLen: [4, 8], pluckVoice: 'kalimba', pluckLevel: 0.28,
    padLevel: 0.14, padCutoff: [900, 2000], padOctave: -12, chimeEvery: [18, 40], droneLevel: 0.04, pulse: 0.1, echo: 0.24,
  },
};

export function weightedPick<T>(items: [T, number][], rnd: Rand): T {
  let total = 0;
  for (const [, w] of items) total += w;
  let r = rnd() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1][0];
}

export function nextChord(cfg: MoodConfig, current: ChordDef | null, rnd: Rand): ChordDef {
  if (!current) return cfg.chords[0];
  const name = weightedPick(current.next, rnd);
  return cfg.chords.find((c) => c.name === name) ?? cfg.chords[0];
}

/** All MIDI notes of `scale` (relative to `key`) inside [lo, hi]. */
export function scaleNotes(key: number, scale: number[], lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) {
    const pc = (((m - key) % 12) + 12) % 12;
    if (scale.includes(pc)) out.push(m);
  }
  return out;
}

/** Whether a MIDI note is a chord tone (pitch-class match) of `chord` in `key`. */
export function isChordTone(midi: number, key: number, chord: ChordDef): boolean {
  const pc = (((midi - key) % 12) + 12) % 12;
  return chord.tones.some((t) => ((t % 12) + 12) % 12 === pc);
}

/**
 * Phrase-based melody generator: random-walks over scale notes, favours chord tones on strong steps, rests between
 * phrases. Call `step()` once per 8th note; returns a MIDI note or null.
 */
export class MelodyGen {
  private idx: number;
  private notesLeft = 0;
  private restLeft: number;
  private notes: number[];
  constructor(
    private cfg: MoodConfig,
    private rnd: Rand,
  ) {
    this.notes = scaleNotes(cfg.key, cfg.scale, cfg.melodyRange[0], cfg.melodyRange[1]);
    this.idx = Math.floor(this.notes.length * 0.4);
    this.restLeft = 2 + Math.floor(rnd() * 6);
  }

  step(stepIndex: number, chord: ChordDef): { midi: number; velocity: number; last: boolean } | null {
    const { cfg, rnd } = this;
    if (this.notesLeft <= 0) {
      if (this.restLeft > 0) {
        this.restLeft--;
        return null;
      }
      // start a new phrase
      this.notesLeft = cfg.phraseLen[0] + Math.floor(rnd() * (cfg.phraseLen[1] - cfg.phraseLen[0] + 1));
    }
    const strong = stepIndex % 4 === 0;
    const p = cfg.pluckDensity * (strong ? 1.35 : stepIndex % 2 === 0 ? 1 : 0.55);
    if (rnd() > p) return null;
    // random walk with small steps; occasional leap
    const r = rnd();
    const move = r < 0.12 ? -2 : r < 0.42 ? -1 : r < 0.58 ? 0 : r < 0.88 ? 1 : 2;
    let i = Math.max(0, Math.min(this.notes.length - 1, this.idx + move));
    // gravitate back towards the middle of the range
    const mid = this.notes.length / 2;
    if (Math.abs(i - mid) > this.notes.length * 0.38 && rnd() < 0.5) i += i > mid ? -1 : 1;
    // prefer chord tones on strong steps
    if (strong && !isChordTone(this.notes[i], cfg.key, chord)) {
      for (const d of [1, -1, 2, -2]) {
        const j = i + d;
        if (j >= 0 && j < this.notes.length && isChordTone(this.notes[j], cfg.key, chord)) {
          i = j;
          break;
        }
      }
    }
    this.idx = i;
    this.notesLeft--;
    const last = this.notesLeft <= 0;
    if (last) this.restLeft = cfg.phraseRest[0] + Math.floor(rnd() * (cfg.phraseRest[1] - cfg.phraseRest[0] + 1));
    const velocity = (strong ? 0.75 : 0.5) + rnd() * 0.25;
    return { midi: this.notes[i], velocity, last };
  }
}

// ───────────────────────────── Party groove ─────────────────────────────

export const PARTY_BPM = 118;
/** F#m9 – Dmaj9 – Amaj9 – E6/9 in A major (root midi 57 = A3). Semitones relative to A. */
export const PARTY_KEY = 57;
export const PARTY_CHORDS: { root: number; tones: number[] }[] = [
  { root: -3, tones: [-3, 4, 7, 11, 12] }, // F#m9 (F# A C# E G#)
  { root: -7, tones: [-7, 0, 4, 9, 11] }, // Dmaj9
  { root: 0, tones: [0, 4, 7, 11, 14] }, // Amaj9
  { root: -5, tones: [-5, 2, 4, 7, 11] }, // E6/9
];

/** 16-step bass pattern: semitone offset from chord root (null = rest). House-style off-beat octave bass. */
export const PARTY_BASS: (number | null)[] = [null, null, 0, null, null, 12, 0, null, null, null, 0, null, 12, null, 0, 7];
/** Hat velocity per 16th. */
export const PARTY_HATS: number[] = [0.25, 0.4, 0.85, 0.4, 0.25, 0.45, 0.9, 0.4, 0.25, 0.4, 0.85, 0.4, 0.25, 0.5, 0.9, 0.55];
/** Arp pattern: chord-tone index per 16th (octave wraps). */
export const PARTY_ARP: number[] = [0, 2, 4, 1, 3, 5, 2, 4, 0, 3, 5, 2, 4, 6, 3, 1];
