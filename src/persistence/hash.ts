/**
 * Stable state hashing for determinism checks. OWNER: lane "core".
 * Keys are sorted, and wall-clock / identity fields that legitimately differ between runs are excluded.
 */
import type { GameState } from '@/types';
import { cyrb53 } from './serialize';

/** Top-level fields excluded from the hash (real-time stamps + per-run ids + transient flags). */
export const HASH_EXCLUDED_KEYS = ['createdRealMs', 'lastSavedRealMs', 'lastTickRealMs', 'saveId', 'offlineGrace'] as const;

function canonical(value: unknown, out: string[]): void {
  if (value === null || value === undefined) {
    out.push('null');
    return;
  }
  switch (typeof value) {
    case 'number':
      out.push(Number.isFinite(value) ? (Object.is(value, -0) ? '0' : String(value)) : `"${String(value)}"`);
      return;
    case 'string':
      out.push(JSON.stringify(value));
      return;
    case 'boolean':
      out.push(value ? 'true' : 'false');
      return;
    case 'object': {
      if (Array.isArray(value)) {
        out.push('[');
        for (let i = 0; i < value.length; i++) {
          if (i) out.push(',');
          canonical(value[i], out);
        }
        out.push(']');
        return;
      }
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort();
      out.push('{');
      keys.forEach((k, i) => {
        if (i) out.push(',');
        out.push(JSON.stringify(k), ':');
        canonical(obj[k], out);
      });
      out.push('}');
      return;
    }
    default:
      out.push('null');
  }
}

/** Canonical JSON (sorted keys) of the state without volatile fields. */
export function canonicalState(state: GameState): string {
  const copy: Record<string, unknown> = { ...(state as unknown as Record<string, unknown>) };
  for (const k of HASH_EXCLUDED_KEYS) delete copy[k];
  const out: string[] = [];
  canonical(copy, out);
  return out.join('');
}

/** Stable 53-bit hash (hex) of the simulation-relevant state. */
export function stateHash(state: GameState): string {
  return cyrb53(canonicalState(state));
}
