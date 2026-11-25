/**
 * Genetics finds: the named strains and Prismatic animals a player has owned. OWNER: lane "genetics".
 *
 * Recorded beside the existing morph discovery (buying, breeding, the starter). Idempotent, and it emits nothing:
 * callers fold anything new into the messages they already send, so a find never adds log noise or shifts event ids.
 * Chunk 21: each first find is dated in `progress.discoveredAt` (stampDiscovery); no RNG, no event.
 */
import type { Creature, GameState, MorphStrain } from '@/types';
import { findSpecies } from '@/data/species';
import { strainsOf } from './morphCatalog';
import { isPrismatic } from './rareVariants';

/**
 * chunk 21 (the Collection) — date a discovery: the whole game hour `key` (a species id, `${speciesId}:${morphName}` or
 * `${speciesId}:${strainId}`, as in the progress lists) was first recorded. A key already dated keeps its date. Call it
 * wherever a key is pushed onto one of the lists. Pure bookkeeping: no RNG draw, no event.
 */
export function stampDiscovery(state: GameState, key: string): void {
  if (!key || key in Object.prototype) return; // never a name every object inherits ("__proto__", "constructor")
  const at = (state.progress.discoveredAt ??= {});
  if (!Object.hasOwn(at, key)) at[key] = Math.floor(state.clock.hour);
}

export interface NewFinds {
  /** Strains discovered for the first time by this animal. */
  strains: MorphStrain[];
  /** This animal was added to the Prismatic finds. */
  prismatic: boolean;
}

/** Record the strains and Prismatic status of a newly bought or born animal. Safe to call more than once. */
export function recordFinds(state: GameState, c: Creature): NewFinds {
  const out: NewFinds = { strains: [], prismatic: false };
  const sp = findSpecies(c.speciesId);
  if (!sp) return out;
  const p = state.progress;
  const strains = strainsOf(sp, c.genome);
  if (strains.length) {
    const known = (p.discoveredStrains ??= []);
    for (const s of strains) {
      const key = `${sp.id}:${s.id}`;
      if (known.includes(key)) continue;
      known.push(key);
      stampDiscovery(state, key); // chunk 21
      out.strains.push(s);
    }
  }
  if (isPrismatic(c) && c.rareVariant) {
    const finds = (p.prismaticFinds ??= []);
    if (!finds.some((f) => f.creatureId === c.id)) {
      finds.push({ speciesId: c.speciesId, creatureId: c.id, name: c.name, morphName: c.morphName, origin: c.rareVariant.origin, hour: state.clock.hour });
      out.prismatic = true;
    }
  }
  return out;
}

/**
 * Pre-0.4 saves have neither list: derive them from every animal ever kept (creatures are never deleted), oldest
 * first. Only fills a list that is MISSING — a present list is left exactly as it is. No RNG; no animal is rerolled.
 */
export function backfillFinds(state: GameState): void {
  const p = state.progress;
  if (p.discoveredStrains !== undefined && p.prismaticFinds !== undefined) return;
  const all = Object.values(state.creatures).sort((a, b) => (a.acquiredHour ?? 0) - (b.acquiredHour ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (p.discoveredStrains === undefined) {
    const known: string[] = [];
    for (const c of all) {
      const sp = findSpecies(c.speciesId);
      if (!sp) continue;
      for (const s of strainsOf(sp, c.genome)) if (!known.includes(`${sp.id}:${s.id}`)) known.push(`${sp.id}:${s.id}`);
    }
    p.discoveredStrains = known;
  }
  if (p.prismaticFinds === undefined) {
    p.prismaticFinds = all
      .filter((c): c is Creature & { rareVariant: NonNullable<Creature['rareVariant']> } => isPrismatic(c) && !!c.rareVariant)
      .map((c) => ({ speciesId: c.speciesId, creatureId: c.id, name: c.name, morphName: c.morphName, origin: c.rareVariant.origin, hour: c.acquiredHour ?? 0 }));
  }
}
