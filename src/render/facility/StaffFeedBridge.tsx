/**
 * Keeper feeding made visible in the tank. When an aquarist feeds a tank (the sim records it in state.staff.feeds),
 * the food drops in through the same pipeline as a player's feed (`aiFeed` → food particles the animals chase and
 * eat), from the back-left of the surface where a keeper standing beside the tank would sprinkle it; tong feeds land
 * just in front of the target animal's snout. Runs before the AI's own sim sync (useFrame priority −2 < −1) so the AI
 * calibrates to these particles instead of inventing fallback ones. In tank view, the focused tank's keeper feed also
 * gets a quiet feed sound and, at most every ~45 s, a short toast. Nothing is drawn here. OWNER: lane "staff".
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { aiFeed, aiWorlds } from '@/ai/registry';
import { runtime, pushVisualEvent, nowSeconds } from '@/runtime/tankRuntime';
import { tankDims } from '@/sim/tankSpace';
import { sfx } from '@/audio/sfx';

const TOAST_GAP_S = 45;
/** Feeds older than this (game hours) are not replayed (e.g. after catching up a long step). */
const MAX_AGE_H = 0.75;

export function StaffFeedBridge() {
  const last = useRef(-1);
  const lastToast = useRef(-1e9);
  useFrame(() => {
    const g = getGame();
    const feeds = g?.staff?.feeds;
    if (!g || !feeds || !feeds.length) {
      if (!g) last.current = -1;
      return;
    }
    const max = feeds[feeds.length - 1].seq;
    if (last.current < 0 || max < last.current) {
      // first look (or a different save): don't replay old feeds
      last.current = max;
      return;
    }
    if (max === last.current) return;
    const ui = useUI.getState();
    const now = nowSeconds();
    for (const f of feeds) {
      if (f.seq <= last.current) continue;
      if (g.clock.hour - f.hour > MAX_AGE_H) continue;
      const tank = g.tanks[f.tankId];
      if (!tank || !aiWorlds.get(f.tankId)) continue;
      let local: [number, number, number];
      try {
        const d = tankDims(tank);
        const rt = f.targetCreatureId ? runtime.creatures.get(f.targetCreatureId) : undefined;
        if (rt && rt.tankId === f.tankId) {
          // tongs / pipette: just in front of the snout (same offsets as the player's target feed)
          const cp = Math.cos(rt.pitch);
          const fx = cp * Math.cos(rt.yaw);
          const fz = -cp * Math.sin(rt.yaw);
          const sea = rt.speciesId.includes('seahorse');
          const reach = rt.lengthM * (sea ? 0.55 : 0.8);
          local = [
            Math.max(-d.L / 2 + 0.01, Math.min(d.L / 2 - 0.01, rt.pos.x + fx * reach)),
            Math.max(d.substrateY + 0.01, Math.min(d.waterY - 0.01, rt.pos.y + Math.sin(rt.pitch) * reach + rt.lengthM * (sea ? 0.3 : 0.05))),
            Math.max(-d.W / 2 + 0.01, Math.min(d.W / 2 - 0.01, rt.pos.z + fz * reach)),
          ];
        } else {
          // broadcast: sprinkled in at the back-left third of the surface
          const jitter = ((f.seq * 0.618034) % 1) - 0.5;
          local = [-d.L * 0.25 + jitter * d.L * 0.12, d.waterY - 0.002, -d.W * 0.15 + jitter * d.W * 0.1];
        }
      } catch {
        continue;
      }
      aiFeed(f.tankId, f.foodId, local, { servings: Math.max(1, f.servings), targetCreatureId: f.targetCreatureId });
      const focused = ui.view === 'tank' && ui.focusedTankId === f.tankId;
      if (!focused) continue;
      pushVisualEvent({ kind: 'feed', tankId: f.tankId, pos: local, creatureId: f.targetCreatureId, t: now, strength: 0.5 });
      sfx('feed', { volume: 0.35 });
      if (now - lastToast.current >= TOAST_GAP_S) {
        lastToast.current = now;
        const who = g.staff?.roster.find((m) => m.id === f.staffId);
        const first = who ? who.name.split(' ')[0] : 'Your aquarist';
        ui.toast(`${first} fed ${tank.name}`, 'info');
      }
    }
    last.current = max;
  }, -2);
  return null;
}
