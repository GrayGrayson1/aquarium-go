/**
 * Render resolution: a per-tier pixel budget plus an adaptive render scale. OWNER: lane "pc-perf".
 *
 * Why: the canvas used to render at the screen's full resolution (DPR clamped to the tier's range, never below 1).
 * On a 4K monitor at 100 % scaling that is 8.3 MP with 4× MSAA, bloom and shadows — ~2.5× the pixels of anything the
 * game was tuned on, and the old PerformanceMonitor could only react by toggling features (shadows, MSAA, the
 * composer), each of which recompiles dozens of shader programs: a multi-second freeze on Windows/Direct3D, repeated
 * whenever it flip-flopped.
 *
 * Now:
 *  1. Pixel budget: the drawing buffer is capped per tier (QUALITY[q].maxMP). A big screen renders at a lower internal
 *     resolution and the browser scales the canvas up smoothly; the DOM UI stays at native resolution.
 *  2. Adaptive scale (ScaleController): from the measured frame time, the render scale moves in small steps between
 *     SCALE_MIN and 1. A step down is kept only if it actually helped (i.e. the frame was GPU-bound); a step up is a
 *     probe that is reverted if frames get slower, with exponential back-off. Changing resolution never recompiles a
 *     shader.
 *  3. Last resort: only when the scale is at its floor and frames are still slow does the tier drop one step (a
 *     feature change that recompiles programs) — at most once per session, never back up mid-session, and only while
 *     Settings › Graphics is on Auto. The settled scale is remembered per device (localStorage), so the next visit
 *     starts there; a drop is remembered only once the following seconds show it actually helped (lane:tankrender —
 *     a drop forced by a passing main-thread burst used to be persisted at once and made every later visit uglier);
 *     a session with clear headroom at full scale lets the next visit try one step higher.
 *
 * Main-thread work outside the frame loop (React commits, the sim tick, portrait rendering, GC) is measured with a
 * LatenessProbe and counted as CPU time, so a UI burst is diagnosed as CPU-bound and never answered with a blurrier
 * picture (lane:tankrender — only the frame loop's own span used to count, so bursts looked GPU-bound).
 */
import type { QualityLevel } from '@/types';

/** Lowest adaptive render scale (fraction of the budgeted DPR). */
export const SCALE_MIN = 0.6;
/** Never render below this many device pixels per CSS pixel. */
export const DPR_FLOOR = 0.5;
/** Frame-time goal (ms): 60 fps. High-refresh screens simply run faster; nothing waits for them. */
export const TARGET_MS = 1000 / 60;
/** Window mean above this = too slow (≈ 51 fps). */
export const SLOW_MS = 19.5;
/** Window mean below this = comfortably at target. */
export const GOOD_MS = 17.6;
/** Frames longer than this are hitches (CPU work, a GC), not throughput: excluded from the resolution decision. */
const HITCH_MS = 100;
/** Share of the frame interval spent in main-thread frame work above which a slow frame counts as CPU-bound. */
const CPU_BOUND = 0.6;
/** Measurement window. */
const WINDOW_MS = 1000;

/**
 * Device pixel ratio for the canvas: the tier's DPR range, then the tier's megapixel budget, then the adaptive scale.
 * Rounded to 1/40 so tiny scale changes don't cause needless buffer reallocations.
 */
export function budgetDpr(deviceDpr: number, range: [number, number], maxMP: number, cssW: number, cssH: number, scale = 1): number {
  const base = Math.min(range[1], Math.max(range[0], deviceDpr || 1));
  const area = Math.max(1, cssW * cssH);
  const cap = Math.sqrt((maxMP * 1e6) / area);
  const dpr = Math.max(DPR_FLOOR, Math.min(base, cap) * Math.max(SCALE_MIN, Math.min(1, scale)));
  return Math.round(dpr * 40) / 40;
}

export type ScaleDecision = { kind: 'scale'; scale: number; reason: 'down' | 'up' | 'revert' } | { kind: 'drop' } | { kind: 'drop_helped' } | { kind: 'headroom' } | null;

/** Windows after a drop that must be on time before the drop is remembered for the next visit. */
const DROP_CONFIRM_WINDOWS = 3;
/** Slow windows after a drop that write it off as not the answer (the machine is simply struggling right now). */
const DROP_GIVE_UP_WINDOWS = 3;

type Phase = 'steady' | 'settle' | 'verify';

/**
 * Frame-time → render-scale controller (pure; driven by ResolutionGovernor, unit-tested).
 * Feed every frame's interval with `frame(dtMs)`; act on the returned decision.
 */
export class ScaleController {
  scale: number;
  readonly min: number;
  private sum = 0;
  private n = 0;
  private span = 0;
  /** Main-thread ms spent inside frames this window (-1 = not measured). */
  private work = 0;
  /** Main-thread ms of every frame this window, hitches included (a burst-ridden window is CPU-bound as a whole). */
  private workAll = 0;
  /** Main-thread ms outside the frame loop this window (LatenessProbe), attributed to the window, not a frame. */
  private ext = 0;
  private phase: Phase = 'steady';
  private pending: { dir: 'up' | 'down'; before: number; prev: number } | null = null;
  private good = 0;
  /** Good windows required before the next probe up (doubles after a failed probe). */
  private backoff = 3;
  /** Windows during which no further step down is tried (a step down didn't help: CPU-bound). */
  private hold = 0;
  /** Next hold length: doubles each time a step down turns out useless (a 30/50 Hz display, a CPU-bound page). */
  private holdLen = 20;
  private slowAtFloor = 0;
  /** Consecutive slow windows (a single slow second — a GC, a panel opening — is not a trend). */
  private slowRun = 0;
  private headroomWindows = 0;
  dropped = false;
  /** QA: the last closed window's mean frame time (ms) and main-thread share. */
  readonly lastWindow = { ms: 0, busy: 0 };
  /** After a drop: windows on time / still slow, until the drop is confirmed or written off. */
  private dropGood = 0;
  private dropSlow = 0;
  private dropVerdict: 'none' | 'pending' | 'done' = 'none';

  constructor(start = 1, min = SCALE_MIN) {
    this.min = min;
    this.scale = Math.max(min, Math.min(1, start));
  }

  /** Discard the current window (after a hitch source such as a warm-up, a tab switch or a resize). */
  reset(): void {
    this.sum = this.n = this.span = this.work = this.workAll = this.ext = 0;
  }

  /** A tier change starts a fresh controller: carry over what must not restart (the once-per-session drop). */
  carryOver(prev: ScaleController): void {
    this.dropped = prev.dropped;
    this.dropVerdict = prev.dropVerdict;
    this.dropGood = prev.dropGood;
    this.dropSlow = prev.dropSlow;
  }

  /**
   * `workMs`: main-thread time spent producing this frame (scene updates + render submission), when known. A frame
   * that is mostly main-thread work is CPU-bound, and a lower resolution would only blur it. `extMs`: main-thread time
   * spent outside the frame loop since the previous frame (LatenessProbe); it belongs to the window as a whole.
   */
  frame(dtMs: number, workMs = 0, extMs = 0): ScaleDecision {
    if (!(dtMs > 0)) return null;
    this.span += dtMs;
    this.workAll += Math.max(0, Math.min(dtMs, workMs));
    this.ext += Math.max(0, extMs);
    if (dtMs <= HITCH_MS) {
      this.sum += dtMs;
      this.n++;
      this.work += Math.max(0, Math.min(dtMs, workMs));
    }
    if (this.span < WINDOW_MS || this.n < 12) {
      if (this.span > WINDOW_MS * 4) this.reset(); // mostly hitches: no throughput information
      return null;
    }
    const m = this.sum / this.n;
    const busy = Math.max(this.work / this.sum, Math.min(1, (this.workAll + this.ext) / this.span));
    this.lastWindow.ms = m;
    this.lastWindow.busy = busy;
    this.reset();
    return this.window(m, busy);
  }

  private set(next: number, reason: 'down' | 'up' | 'revert'): ScaleDecision {
    next = Math.round(Math.max(this.min, Math.min(1, next)) * 100) / 100;
    if (next === this.scale) return null;
    this.scale = next;
    return { kind: 'scale', scale: next, reason };
  }

  private window(m: number, busy = 0): ScaleDecision {
    if (this.hold > 0) this.hold--;
    if (this.dropVerdict === 'pending') {
      // did the feature drop fix it? remember it only then (a drop forced by a passing burst must not stick)
      if (m > SLOW_MS) {
        if (++this.dropSlow >= DROP_GIVE_UP_WINDOWS) this.dropVerdict = 'done';
      } else if (++this.dropGood >= DROP_CONFIRM_WINDOWS) {
        this.dropVerdict = 'done';
        return { kind: 'drop_helped' };
      }
    }
    if (this.phase === 'settle') {
      // the window right after a resize carries its reallocation hitch: skip it
      this.phase = 'verify';
      return null;
    }
    if (this.phase === 'verify' && this.pending) {
      const p = this.pending;
      this.pending = null;
      this.phase = 'steady';
      if (p.dir === 'up') {
        if (m > SLOW_MS || m > p.before * 1.1) {
          this.backoff = Math.min(96, this.backoff * 2);
          this.good = 0;
          return this.set(p.prev, 'revert');
        }
        this.backoff = Math.max(3, Math.round(this.backoff / 2));
        return null;
      }
      // down: keep only if it helped (GPU-bound); otherwise this device is CPU-bound — restore and hold off. A window
      // that is mostly main-thread work cannot credit the resolution for whatever it gained.
      if (m < p.before * 0.94 && busy <= CPU_BOUND) return null;
      this.hold = this.holdLen;
      this.holdLen = Math.min(240, this.holdLen * 2);
      return this.set(p.prev, 'revert');
    }
    if (m > SLOW_MS) {
      this.good = 0;
      this.headroomWindows = 0;
      this.slowRun++;
      // CPU-bound (the frame is mostly main-thread work): resolution can't help; treat like a useless step
      if (busy > CPU_BOUND && this.hold === 0) this.hold = 5;
      if (this.scale > this.min + 1e-6 && this.hold === 0 && (this.slowRun >= 2 || m > TARGET_MS * 1.6)) {
        // GPU cost ∝ pixels ∝ scale²: aim for the target in one or two steps, never more than −25 % per step
        const f = Math.min(0.93, Math.max(0.75, Math.sqrt(TARGET_MS / m)));
        const prev = this.scale;
        const d = this.set(this.scale * f, 'down');
        if (d) {
          this.pending = { dir: 'down', before: m, prev };
          this.phase = 'settle';
          return d;
        }
      }
      // still slow with resolution at its floor (or resolution shown not to help: CPU-bound, where fewer features
      // still saves work) → ask once for the last resort
      const atFloor = this.scale <= this.min + 1e-6 && m > TARGET_MS * 1.3;
      const cpuBound = this.hold > 0 && m > TARGET_MS * 1.5;
      if ((atFloor || cpuBound) && !this.dropped) {
        if (++this.slowAtFloor >= (atFloor ? 5 : 10)) {
          this.slowAtFloor = 0;
          this.dropped = true;
          this.dropVerdict = 'pending';
          return { kind: 'drop' };
        }
      }
      return null;
    }
    this.slowAtFloor = 0;
    this.slowRun = 0;
    if (m < GOOD_MS) {
      this.good++;
      if (this.scale >= 1 - 1e-6) {
        if (++this.headroomWindows === 120) return { kind: 'headroom' };
        return null;
      }
      if (this.good >= this.backoff) {
        this.good = 0;
        const prev = this.scale;
        const d = this.set(this.scale + 0.1, 'up');
        if (d) {
          this.pending = { dir: 'up', before: m, prev };
          this.phase = 'settle';
        }
        return d;
      }
    } else {
      this.good = 0;
    }
    return null;
  }
}

// ───────────────────────────── main-thread probe ─────────────────────────────

/** A timer this late (ms) was held back by other work; below it is scheduling jitter. */
const LATE_MIN_MS = 1.5;
/** Frame spans remembered for the overlap correction (a probe interval spans at most a couple of frames). */
const SPAN_RING = 6;

/**
 * Main-thread time spent outside the frame loop, estimated from how late a chain of short timers fires: a timer due at
 * T that runs at T + x was held back x ms by other tasks (React commits, the sim tick, portrait rendering, GC, layout).
 * The frame loop's own spans are reported with `frame()` and subtracted, so nothing is counted twice; GPU-bound
 * frames (the main thread idles while the compositor waits) add nothing. Pure; driven by ResolutionGovernor.
 */
export class LatenessProbe {
  private spans: [number, number][] = [];
  private acc = 0;
  /** QA: external ms accumulated since construction. */
  total = 0;

  /** A frame-loop span (start, end in ms). */
  frame(t0: number, t1: number): void {
    if (t1 <= t0) return;
    this.spans.push([t0, t1]);
    if (this.spans.length > SPAN_RING) this.spans.shift();
  }

  /** A probe timer scheduled at `at` for `due` ms later ran at `now`: accumulate the external busy time it saw. */
  tick(at: number, due: number, now: number): number {
    let late = now - (at + due);
    if (late < LATE_MIN_MS) return 0;
    for (const [t0, t1] of this.spans) late -= Math.max(0, Math.min(t1, now) - Math.max(t0, at));
    const ext = Math.max(0, late);
    this.acc += ext;
    this.total += ext;
    return ext;
  }

  /** External busy time accumulated since the last take (ms). */
  take(): number {
    const v = this.acc;
    this.acc = 0;
    return v;
  }

  reset(): void {
    this.acc = 0;
    this.spans.length = 0;
  }
}

// ───────────────────────────── per-device memory ─────────────────────────────

const KEY = 'aquarium-go.perf.v1';

interface PerfMemory {
  device: string;
  /** Feature steps dropped by the last-resort rule (0, -1, -2), used while quality is on Auto. */
  degrade: number;
  /** Settled adaptive scale per effective tier. */
  scale: Partial<Record<QualityLevel, number>>;
}

/** Identifies "this GPU on this screen": a new monitor or GPU starts fresh. */
export function deviceKey(renderer = ''): string {
  try {
    const s = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '?';
    const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
    return `${renderer.slice(0, 80)}|${s}@${Math.round(dpr * 100) / 100}`;
  } catch {
    return renderer;
  }
}

export function readPerfMemory(device: string): PerfMemory {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const m = JSON.parse(raw) as PerfMemory;
      if (m && m.device === device) {
        const degrade = Math.max(-2, Math.min(0, Math.round(Number(m.degrade) || 0)));
        return { device, degrade, scale: typeof m.scale === 'object' && m.scale ? m.scale : {} };
      }
    }
  } catch {
    /* storage unavailable */
  }
  return { device, degrade: 0, scale: {} };
}

export function writePerfMemory(m: PerfMemory): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}
