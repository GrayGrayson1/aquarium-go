/**
 * Per-frame creature AI for a tank (writes src/runtime/tankRuntime). OWNER: lane "behavior".
 * Thin R3F wrapper around the pure core in ./core: mirrors the sim (creatures, stats, decor, clock, food) and steps
 * every agent before render (negative useFrame priority). Active for lod ≤ 1; far tanks (lod 2) tick cheaply.
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Clutch, Creature, Tank, VisualEventKind } from '@/types';
import type { RenderLod } from '../render/lod';
import { useGame, getGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { runtime, pushVisualEvent, nowSeconds } from '@/runtime/tankRuntime';
import { audioReactive } from '@/runtime/audioReactive';
import { findSpecies } from '@/data/species';
import { getDecorDef } from '@/data/catalog/decor';
import { personalityModifiers } from '@/sim/life';
import { tutorialAdvance } from '@/sim/facility';
import { createWorld, disposeWorld, stepWorld, syncWorld, type AIWorld } from './core/world';
import { AI_FRAME_BUDGET_MS, planAiSteps, type AiSteps } from './core/steps';
import { syncFoodWithSim } from './core/food';
import { aiWorlds, equipmentSolids, foodSpecForTags, tankFlow } from './registry';
import { equipmentLayout } from '@/render/decor/emitters';

const OBSERVE_THROTTLE_S = 30;

// scripted QA access (screenshots / dev console): window.__AQ_AI.worlds.get(tankId)
/** Rolling AI cost (ms per frame, all tanks) for QA. */
export const aiStats = { ms: 0, agents: 0, frames: 0 };
/**
 * AI time spent in the current rendered frame across all tanks (ms), and in the last one. Every TankAI's useFrame runs
 * in the same tick (same clock time), so the first one to see a new time closes the last frame's account.
 */
const aiFrame = { stamp: -1, ms: 0, lastMs: 0 };
const _steps: AiSteps = { n: 1, h: 0 };
if (typeof window !== 'undefined') (window as unknown as { __AQ_AI?: unknown }).__AQ_AI = { worlds: aiWorlds, stats: aiStats };
const lastObserved = new Map<string, number>();
/** Recently observed signature behaviours (debug panel / QA). */
export const observedLog: { name: string; creatureId: string; tankId: string; t: number }[] = [];

function makeHooks(tankId: string, world: () => AIWorld | null) {
  return {
    event(kind: VisualEventKind, pos: { x: number; y: number; z: number }, creatureId?: string, strength?: number) {
      pushVisualEvent({ kind, tankId, pos: [pos.x, pos.y, pos.z], creatureId, t: nowSeconds(), strength });
    },
    observed(name: string, creatureId: string) {
      const now = nowSeconds();
      const key = name;
      if (now - (lastObserved.get(key) ?? -1e9) < OBSERVE_THROTTLE_S) return;
      lastObserved.set(key, now);
      observedLog.push({ name, creatureId, tankId, t: now });
      if (observedLog.length > 40) observedLog.shift();
      const g = getGame();
      if (!g || g.progress?.tutorial?.done) return;
      const ui = useUI.getState();
      if (ui.focusedTankId !== tankId || !world()) return;
      try {
        useGame.getState().mutate((d) => tutorialAdvance(d, `observed:${name}`));
      } catch (e) {
        console.warn('tutorialAdvance failed', e);
      }
    },
  };
}

function safePersonality(c: Creature) {
  try {
    return personalityModifiers(c);
  } catch {
    return null;
  }
}

export function TankAI({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const worldRef = useRef<AIWorld | null>(null);
  const state = useRef({ version: -1, accum: 0, frame: 0, creaturesKey: '' });
  const creaturesBuf = useRef<Creature[]>([]);
  const clutchBuf = useRef<Clutch[]>([]);

  if (!worldRef.current) {
    const tankId = tank.id;
    const food = runtime.food.get(tankId) ?? [];
    runtime.food.set(tankId, food);
    worldRef.current = createWorld(tankId, {
      resolveDecor: getDecorDef,
      extras: (t) => equipmentSolids(equipmentLayout(t), t),
      flowOf: tankFlow,
      personality: safePersonality,
      species: findSpecies,
      registry: runtime.creatures,
      food,
      hooks: makeHooks(tankId, () => worldRef.current),
    });
  }

  useEffect(() => {
    const w = worldRef.current!;
    aiWorlds.set(tank.id, w);
    return () => {
      disposeWorld(w);
      if (aiWorlds.get(tank.id) === w) aiWorlds.delete(tank.id);
      runtime.food.delete(tank.id);
    };
  }, [tank.id]);

  useFrame((frameState, delta) => {
    const w = worldRef.current;
    if (!w) return;
    const store = useGame.getState();
    const game = store.game;
    if (!game) return;
    const t = game.tanks[tank.id] ?? tank;
    const s = state.current;
    // ── mirror the sim when it changes (≈4 Hz) ──
    if (store.version !== s.version) {
      s.version = store.version;
      const cs = creaturesBuf.current;
      cs.length = 0;
      for (const id in game.creatures) {
        const c = game.creatures[id];
        if (c.tankId === t.id) cs.push(c);
      }
      const cl = clutchBuf.current;
      cl.length = 0;
      for (const id in game.clutches) {
        const c = game.clutches[id];
        if (c.tankId === t.id) cl.push(c);
      }
      syncWorld(w, { tank: t, creatures: cs, clutches: cl, hour: game.clock.hour, refreshInfo: true });
      syncFoodWithSim(w, t.water?.foodInWater ?? 0, foodSpecForTags, t.water?.foodByTag);
    }
    // ── per-frame environment inputs ──
    const ui = useUI.getState();
    const env = w.env;
    env.focused = ui.view === 'tank' && ui.focusedTankId === t.id;
    const p = runtime.pointer;
    env.pointerActive = !!(p.active && p.tankId === t.id);
    if (env.pointerActive) {
      env.pointer.set(p.local[0], p.local[1], p.local[2]);
      env.pointerMoveT = w.time - Math.max(0, nowSeconds() - p.lastMoveT);
    }
    env.reducedMotion = useSettings.getState().reducedMotion;
    env.party = ui.partyMode ? 1 : 0;
    env.beat = ui.partyMode ? audioReactive.beat : 0;
    env.level = ui.partyMode ? audioReactive.level : 0;
    // ── step ──
    const dt = Math.min(Math.max(delta, 0), 0.1);
    const stamp = frameState.clock.elapsedTime;
    if (stamp !== aiFrame.stamp) {
      aiFrame.stamp = stamp;
      aiFrame.lastMs = aiFrame.ms;
      aiFrame.ms = 0;
    }
    const t0 = performance.now();
    if (lod <= 1) {
      // a long frame is split into two even substeps so fast fish never tunnel through decor — at most two, and just
      // one (the excess time dropped) once the AI is over its frame budget, so a slow frame never buys more AI work
      // (see core/steps)
      planAiSteps(delta, aiFrame.ms > AI_FRAME_BUDGET_MS || aiFrame.lastMs > AI_FRAME_BUDGET_MS, _steps);
      for (let i = 0; i < _steps.n; i++) stepWorld(w, _steps.h);
    } else {
      // far tanks: cheap, lower-rate update. lane:pc-perf — paced by time, not frame count: every 4th frame used to
      // drop whatever exceeded 50 ms, so far animals swam at 75 % speed at 60 Hz, 37 % at 30 Hz and 100 % at 144 Hz.
      // Now one 50 ms step whenever 50 ms have accrued (the carry is capped, so a long frame never queues catch-up).
      s.accum = Math.min(s.accum + dt, 0.1);
      if (s.accum >= 0.05) {
        stepWorld(w, 0.05);
        s.accum -= 0.05;
      }
    }
    const spent = performance.now() - t0;
    aiFrame.ms += spent;
    if (env.focused) {
      aiStats.ms = aiStats.ms * 0.95 + spent * 0.05;
      aiStats.agents = w.agents.length;
      aiStats.frames++;
    }
    // selection highlight
    const sel = ui.selectedCreatureId;
    for (const a of w.agents) a.rt.selected = a.id === sel;
    if (env.focused) runtime.frame++;
  }, -1);

  return null;
}
