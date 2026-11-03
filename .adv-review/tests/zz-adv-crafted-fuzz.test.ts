// Adversarial probe (review worktree only): crafted saves beyond the cases core-crafted-saves.test.ts covers.
import { describe, it, expect } from 'vitest';
import { FIXTURES } from '@/dev/fixtures';
import { decodeRecord } from '@/persistence/serialize';
import { advanceWorld } from '@/sim/world';
import { useGame } from '@/state/game';
import { mutateFast, resetFastMutate } from '@/game/fastMutate';

type Json = Record<string, any>;
const EVIL = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf'];
const protoNames = () => [
  ...Object.getOwnPropertyNames(Object.prototype).map((k) => `O.p.${k}`),
  ...Object.getOwnPropertyNames(Object).map((k) => `O.${k}`),
  ...Object.getOwnPropertyNames(Function.prototype).map((k) => `F.p.${k}`),
  ...Object.getOwnPropertyNames(Array.prototype).map((k) => `A.p.${k}`),
  ...Object.getOwnPropertyNames(String.prototype).map((k) => `S.p.${k}`),
].sort();
const BASE_NAMES = protoNames();
function cleanup() {
  for (const [obj, pre] of [[Object.prototype, 'O.p.'], [Object, 'O.'], [Function.prototype, 'F.p.'], [Array.prototype, 'A.p.'], [String.prototype, 'S.p.']] as const) {
    for (const k of Object.getOwnPropertyNames(obj)) if (!BASE_NAMES.includes(`${pre}${k}`)) delete (obj as Json)[k];
  }
}
const polluted = () => protoNames().filter((n) => !BASE_NAMES.includes(n));

const base = (): Json => JSON.parse(JSON.stringify(FIXTURES['shows-hall']()));

/** Every string field named *Id / every first element of a string array named *Ids, as concrete paths. */
function idPaths(o: unknown, path: (string | number)[] = [], out: (string | number)[][] = [], seen = new Set<string>()): (string | number)[][] {
  if (!o || typeof o !== 'object') return out;
  for (const [k, v] of Object.entries(o as Json)) {
    const here = [...path, Array.isArray(o) ? Number(k) : k];
    const shape = here.map((x) => (typeof x === 'number' ? '#' : x)).join('.');
    if (typeof v === 'string' && /Id$/.test(k) && !seen.has(shape)) { seen.add(shape); out.push(here); }
    else if (Array.isArray(v) && /Ids$/.test(k) && v.length && typeof v[0] === 'string' && !seen.has(shape)) { seen.add(shape); out.push([...here, 0]); }
    if (v && typeof v === 'object') idPaths(v, here, out, seen);
  }
  return out;
}
// Map keys of the id-keyed maps are covered separately; collapse them so each field kind is tried once.
function collapse(paths: (string | number)[][]): (string | number)[][] {
  const seen = new Set<string>();
  return paths.filter((p) => {
    const shape = p.map((x, i) => (typeof x === 'number' ? '#' : ['tanks', 'creatures', 'clutches'].includes(String(p[i - 1])) ? '*' : x)).join('.');
    if (seen.has(shape)) return false;
    seen.add(shape);
    return true;
  });
}
const setAt = (o: Json, p: (string | number)[], v: unknown) => { let x = o; for (const k of p.slice(0, -1)) x = x[k]; x[p[p.length - 1]] = v; };

function loadAndRun(text: string): { stage: string; error?: string } {
  let state: Json;
  try { state = decodeRecord(text).state as Json; } catch (e) { return { stage: 'decode-rejected', error: (e as Error).message.slice(0, 80) }; }
  try { advanceWorld(state as never, 6, {}); } catch (e) { return { stage: 'advanceWorld-threw', error: (e as Error).message.slice(0, 100) }; }
  try {
    resetFastMutate();
    useGame.getState().setGame(state as never);
    mutateFast((d) => advanceWorld(d, 2, {}));
    mutateFast((d) => advanceWorld(d, 2, {}));
  } catch (e) { return { stage: 'mutateFast-threw', error: (e as Error).message.slice(0, 100) }; }
  finally { useGame.getState().setGame(null); resetFastMutate(); }
  return { stage: 'ok' };
}

describe('adv: crafted id fields across the whole save', () => {
  it('reports every id field that crashes the loop or pollutes a prototype', () => {
    const paths = collapse(idPaths(base()));
    const rows: string[] = [];
    for (const p of paths) {
      for (const evil of EVIL) {
        const s = base();
        setAt(s, p, evil);
        const r = loadAndRun(JSON.stringify(s));
        const pol = polluted();
        cleanup();
        if (r.stage !== 'ok' || pol.length) rows.push(`${p.join('.')} = ${evil}: ${r.stage}${r.error ? ` (${r.error})` : ''}${pol.length ? ` POLLUTED ${pol.join(',')}` : ''}`);
      }
    }
    console.log(`ADV-ID-FUZZ ${paths.length} field kinds x ${EVIL.length} ids; findings:\n${rows.join('\n') || '(none)'}`);
    expect(paths.length).toBeGreaterThan(5);
  });
});

describe('adv: an own "__proto__" key in every object of the save', () => {
  it('reports pollution or crashes', () => {
    const s = base();
    let n = 0;
    const walk = (o: unknown) => {
      if (!o || typeof o !== 'object') return;
      for (const v of Object.values(o as Json)) walk(v);
      if (!Array.isArray(o)) { Object.defineProperty(o, '__proto__', { value: { advPolluted: 1, simDebtHours: 3 }, enumerable: true, writable: true, configurable: true }); n++; }
    };
    walk(s);
    const text = JSON.stringify(s);
    expect(text.includes('"__proto__":{"advPolluted":1')).toBe(true);
    const r = loadAndRun(text);
    const pol = polluted();
    const viaPlain = ({} as Json).advPolluted;
    cleanup();
    console.log(`ADV-PROTO-EVERYWHERE objects=${n} stage=${r.stage} ${r.error ?? ''} polluted=${pol.join(',') || 'none'} ({}).advPolluted=${viaPlain}`);
  });
});

describe('adv: dead and sold creatures with an inherited-key tankId', () => {
  it('reports what repairState keeps and whether the loop survives', () => {
    const rows: string[] = [];
    for (const status of ['dead', 'sold'] as const) {
      for (const evil of EVIL) {
        const s = base();
        const c = Object.values(s.creatures as Json).find((x: Json) => x.status === 'alive') as Json;
        c.status = status;
        c.tankId = evil;
        let kept: unknown = '(decode failed)';
        try { kept = (decodeRecord(JSON.stringify(s)).state as Json).creatures[c.id]?.tankId; } catch { /* reported below */ }
        cleanup();
        const r = loadAndRun(JSON.stringify(s));
        const pol = polluted();
        cleanup();
        rows.push(`${status} tankId=${evil}: kept=${JSON.stringify(kept)} stage=${r.stage}${r.error ? ` (${r.error})` : ''}${pol.length ? ` POLLUTED ${pol.join(',')}` : ''}`);
      }
    }
    console.log(`ADV-DEAD-TANKID\n${rows.join('\n')}`);
    expect(rows.length).toBe(10);
  });
});
