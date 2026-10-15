/**
 * chunk 6 (B-180) — every tank's creatures and clutches, built once per game version and shared by all TankAIs: each
 * used to scan every creature and clutch itself on every store version (about 0.64 ms on a 15-tank facility). Pure;
 * the lists keep the game's own order. OWNER: lane "behavior".
 */
import type { Clutch, Creature, GameState } from '@/types';

export interface TankIndex {
  creatures: Map<string, Creature[]>;
  clutches: Map<string, Clutch[]>;
}

export function indexByTank(game: Pick<GameState, 'creatures' | 'clutches'>): TankIndex {
  const creatures = new Map<string, Creature[]>();
  const clutches = new Map<string, Clutch[]>();
  for (const id in game.creatures) {
    const c = game.creatures[id];
    if (!c.tankId) continue;
    const list = creatures.get(c.tankId);
    if (list) list.push(c);
    else creatures.set(c.tankId, [c]);
  }
  for (const id in game.clutches) {
    const c = game.clutches[id];
    const list = clutches.get(c.tankId);
    if (list) list.push(c);
    else clutches.set(c.tankId, [c]);
  }
  return { creatures, clutches };
}
