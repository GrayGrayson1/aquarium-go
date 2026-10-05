/**
 * Prismatic individuals — the ultra-rare, game-only shimmer. OWNER: lane "genetics".
 *
 * Rarity is an INDIVIDUAL property (`Creature.rareVariant`), never a gene: a Prismatic parent only raises its young's
 * odds (see PRISMATIC in src/data/rarity.ts), so it can never be bred true. It is rolled exactly once — when a seller
 * stocks the animal (generateOffer) or it is born in the shop (mintJuveniles) — from the creature's own generator
 * (save seed + creature id). That never shifts the simulation's random stream, and reopening the shop, rendering a
 * card or reloading a save can never reroll it.
 */
import type { Creature, GameState, RareVariant, RareVariantOrigin } from '@/types';
import { PRISMATIC, type PrismaticConfig } from '@/data/rarity';
import { mulberry32, hashString } from '../rng';

export type PrismaticSource = 'shop' | 'bred';

export interface PrismaticRollContext {
  source: PrismaticSource;
  /** Bred only: how many of the parents are Prismatic (0–2). */
  rareParents?: number;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export function isPrismatic(c: Pick<Creature, 'rareVariant'> | null | undefined): boolean {
  return c?.rareVariant?.kind === 'prismatic';
}

/** Chance (0..1) that one animal from this source is Prismatic. Pure. */
export function prismaticChance(ctx: PrismaticRollContext, cfg: PrismaticConfig = PRISMATIC): number {
  if (!cfg.enabled) return 0;
  if (ctx.source === 'shop') return clamp01(cfg.shopChance);
  const n = Math.max(0, Math.min(2, Math.floor(ctx.rareParents ?? 0)));
  const mult = n === 2 ? cfg.twoParentMultiplier : n === 1 ? cfg.oneParentMultiplier : 1;
  return clamp01(Math.min(cfg.bredBaseChance * mult, cfg.bredMaxChance));
}

/** Chance that a youngster of this pair is Prismatic (breeding forecasts). */
export function prismaticChanceForPair(a: Pick<Creature, 'rareVariant'> | null | undefined, b: Pick<Creature, 'rareVariant'> | null | undefined, cfg: PrismaticConfig = PRISMATIC): number {
  return prismaticChance({ source: 'bred', rareParents: (isPrismatic(a) ? 1 : 0) + (isPrismatic(b) ? 1 : 0) }, cfg);
}

/** "1 in 4,096" */
export function oneInLabel(chance: number): string {
  if (!(chance > 0)) return 'never';
  return `1 in ${Math.max(1, Math.round(1 / chance)).toLocaleString('en-US')}`;
}

function originOf(ctx: PrismaticRollContext): RareVariantOrigin {
  if (ctx.source === 'shop') return 'shop';
  return (ctx.rareParents ?? 0) > 0 ? 'bred' : 'spontaneous';
}

function seedFrom(next: () => number): number {
  return (Math.floor(next() * 0x7ffffffe) + 1) >>> 0;
}

/**
 * Roll once: Prismatic when `next() < chance` (so `next() === chance` fails). The visual seed is the generator's next
 * draw. `next` is injected so tests can pin the boundary; the game passes prismaticRngFor().
 */
export function rollRareVariant(ctx: PrismaticRollContext, cfg: PrismaticConfig, next: () => number): RareVariant | undefined {
  const chance = prismaticChance(ctx, cfg);
  if (!(next() < chance)) return undefined;
  return { kind: 'prismatic', origin: originOf(ctx), visualSeed: seedFrom(next) };
}

/**
 * The creature's own Prismatic generator, seeded by the save seed, the sim stream's CURRENT state (read, never advanced)
 * and the creature id. The sim stream never moves, results replay exactly from a save, and the outcome can't be
 * precomputed from the seed and id alone.
 */
export function prismaticRngFor(state: Pick<GameState, 'seed' | 'rngState'>, creatureId: string): () => number {
  const r = mulberry32(hashString(`prismatic:${state.seed ?? 0}:${state.rngState ?? 0}:${creatureId}`));
  return () => r.next();
}

/**
 * A group offer that includes a Prismatic is sold as one lot: no picking the jewel out of a group at the group's
 * per-animal price (offerPickPrice prices partial picks by count alone).
 */
export function isLotOffer(o: { creatures: readonly Pick<Creature, 'rareVariant'>[] }): boolean {
  return o.creatures.length > 1 && o.creatures.some((c) => isPrismatic(c));
}

// ───────────────────────────── dev forcing (never saved) ─────────────────────────────

const forced: Record<PrismaticSource, number> = { shop: 0, bred: 0 };

/** Dev/QA: the next `n` animals from this source come out Prismatic. Module state — not part of any save. */
export function forcePrismatic(source: PrismaticSource, n = 1): void {
  forced[source] = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
}

export function forcedPrismaticPending(source: PrismaticSource): number {
  return forced[source];
}

// ───────────────────────────── assignment ─────────────────────────────

const HISTORY: Record<RareVariantOrigin, string> = {
  shop: 'Prismatic! Its scales throw rainbow light — sellers see one in thousands.',
  bred: 'Born Prismatic! The shimmer ran in the family — a Prismatic parent made it likelier, never certain.',
  spontaneous: 'Born Prismatic! A spontaneous shimmer neither parent shows — a once-in-thousands surprise.',
};

/**
 * Roll (once) whether a newly stocked or newly born animal is Prismatic, and record it on the creature. Returns the
 * variant, or undefined for an ordinary animal. An animal that already has a variant keeps it (never rerolled).
 */
export function assignPrismatic(
  state: GameState,
  c: Creature,
  source: PrismaticSource,
  parents: readonly (Pick<Creature, 'rareVariant'> | null | undefined)[] = [],
  cfg: PrismaticConfig = PRISMATIC,
): RareVariant | undefined {
  if (c.rareVariant) return c.rareVariant;
  const ctx: PrismaticRollContext = { source, rareParents: source === 'bred' ? parents.filter((p) => isPrismatic(p)).length : 0 };
  const next = prismaticRngFor(state, c.id);
  let rv: RareVariant | undefined;
  if (forced[source] > 0) {
    forced[source]--;
    next(); // keep the seed draw where a natural roll would take it
    rv = { kind: 'prismatic', origin: originOf(ctx), visualSeed: seedFrom(next) };
  } else rv = rollRareVariant(ctx, cfg, next);
  if (!rv) return undefined;
  c.rareVariant = rv;
  if (!Array.isArray(c.history)) c.history = [];
  c.history.push({ hour: state.clock.hour, kind: 'milestone', text: HISTORY[rv.origin] });
  return rv;
}

// ───────────────────────────── persistence ─────────────────────────────

const ORIGINS: readonly RareVariantOrigin[] = ['shop', 'bred', 'spontaneous'];

/**
 * A loaded `rareVariant`, made safe: unknown kinds are dropped (undefined), an unknown origin becomes 'shop' and a
 * missing/broken seed is derived from the creature id (deterministic — no RNG, so repeated loads agree).
 */
export function sanitizeRareVariant(v: unknown, creatureId: string): RareVariant | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  if (o.kind !== 'prismatic') return undefined;
  const origin = ORIGINS.includes(o.origin as RareVariantOrigin) ? (o.origin as RareVariantOrigin) : 'shop';
  const raw = typeof o.visualSeed === 'number' && Number.isFinite(o.visualSeed) ? Math.abs(Math.floor(o.visualSeed)) >>> 0 : 0;
  const visualSeed = raw || hashString(`prismatic-seed:${creatureId}`) || 1;
  return { kind: 'prismatic', origin, visualSeed };
}
