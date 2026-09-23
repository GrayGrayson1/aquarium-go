/**
 * Creature visual registry. OWNER: lane "fishart".
 * Lanes register factories keyed by species id (or behaviorSet as a fallback key).
 * getCreatureFactory NEVER returns primitive geometry — the fallback is the generic procedural fish.
 */
import type { CreatureFactory } from './types';

const factories = new Map<string, CreatureFactory>();

export function registerCreatureVisual(key: string, factory: CreatureFactory): void {
  factories.set(key, factory);
}

let fallback: CreatureFactory | null = null;
export function registerFallbackVisual(factory: CreatureFactory): void {
  fallback = factory;
}

export function getCreatureFactory(speciesId: string, behaviorSet?: string): CreatureFactory | null {
  return factories.get(speciesId) ?? (behaviorSet ? factories.get(behaviorSet) : undefined) ?? fallback;
}

export function registeredCreatureKeys(): string[] {
  return [...factories.keys()];
}
