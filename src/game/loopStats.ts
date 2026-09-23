/** Live game-loop diagnostics (dev panel, __AQ.stats()). OWNER: lane "core". Not persisted. */
export interface LoopStats {
  ticks: number;
  /** Real ms spent in the last tick's sim work. */
  lastMs: number;
  /** Exponential moving average of tick cost (ms). */
  avgMs: number;
  maxMs: number;
  /** Game hours requested but not yet simulated (carried to the next tick when over budget). */
  backlogHours: number;
  /** Game hours dropped because the backlog exceeded its cap (sim couldn't keep up). */
  droppedHours: number;
  /** Background tanks flushed early by the smoothing pass (spreads LOD work across ticks). */
  smoothedFlushes: number;
  paused: boolean;
  hidden: boolean;
  errors: number;
  lastError?: string;
  lastAutosaveAt?: number;
  lastAutosaveOk?: boolean;
  autosaves: number;
}

export const loopStats: LoopStats = {
  ticks: 0,
  lastMs: 0,
  avgMs: 0,
  maxMs: 0,
  backlogHours: 0,
  droppedHours: 0,
  smoothedFlushes: 0,
  paused: false,
  hidden: false,
  errors: 0,
  autosaves: 0,
};

export const getLoopStats = (): LoopStats => ({ ...loopStats });
