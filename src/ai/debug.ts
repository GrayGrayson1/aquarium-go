/** AI introspection for the dev panel. OWNER: lane "behavior". */
import { aiWorlds } from './registry';
import { observedLog } from './TankAI';

const r2 = (v: number) => Math.round(v * 100) / 100;
const v3 = (v: { x: number; y: number; z: number }) => [r2(v.x), r2(v.y), r2(v.z)];

/** Current behaviour, target, state timers and modifiers of a creature (null if it is not animated right now). */
export function getAIDebug(creatureId: string): Record<string, unknown> | null {
  for (const w of aiWorlds.values()) {
    const a = w.byId.get(creatureId);
    if (!a) continue;
    return {
      behavior: a.behavior,
      activity: a.act,
      previous: a.prevAct,
      phase: a.actPhase,
      timeInActivity: r2(a.actT),
      plannedDuration: a.actDur > 1e8 ? 'until done' : r2(a.actDur),
      lastInterrupt: a.lastInterrupt || null,
      pose: a.rt.pose,
      gait: a.rt.gait,
      locomotion: a.loco,
      behaviorSet: a.setId,
      target: a.ctrl.hasGoal ? v3(a.ctrl.goal) : null,
      lookAt: a.ctrl.hasLook ? v3(a.ctrl.look) : null,
      position: v3(a.rt.pos),
      speedBL: r2(a.rt.speedBL),
      activeness: r2(a.activeness),
      hunger: r2(a.hunger),
      stress: r2(a.stress),
      illness: r2(a.ill),
      visualSatiety: r2(a.satiety),
      fright: r2(a.fright),
      reproStage: a.stage,
      home: a.hasHome ? v3(a.home) : null,
      anchor: a.anchorKey,
      nextAirBreathIn: a.set.airBreath ? r2(Math.max(0, a.breathNext - w.time)) : null,
      personality: [...a.tags],
      modifiers: Object.fromEntries(Object.entries(a.mods).map(([k, v]) => [k, r2(v as number)])),
      zone: [r2(a.zoneY0), r2(a.zoneY1)],
      tank: w.tankId,
    };
  }
  return null;
}

/** Signature behaviours recently seen (tutorial hooks) — newest last. */
export function getObservedBehaviors(): { name: string; creatureId: string; tankId: string; t: number }[] {
  return observedLog.slice();
}

/** Summary of every animated creature in a tank: activity histogram (QA / dev panel). */
export function getAITankSummary(tankId: string): Record<string, unknown> | null {
  const w = aiWorlds.get(tankId);
  if (!w) return null;
  const acts: Record<string, number> = {};
  for (const a of w.agents) acts[a.act] = (acts[a.act] ?? 0) + 1;
  return { creatures: w.agents.length, food: w.food.length, activities: acts, time: r2(w.time), daylight: r2(w.env.daylight), flow: r2(w.env.flow), colliders: w.env.colliders.length, anchors: w.env.anchors.length };
}
