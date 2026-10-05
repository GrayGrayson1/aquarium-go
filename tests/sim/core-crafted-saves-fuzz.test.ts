// @vitest-environment node
/**
 * lane:core (S0 review SD-1/SD-2, PERSIST-004) — seeded fuzz of crafted saves. Every id-valued field of two rich
 * fixtures is set to an inherited Object name ("__proto__", "constructor", "toString", …), and every object gains an
 * own key with such a name; each save then goes through the real import path (decodeRecord → migrateSave →
 * repairState), an offline catch-up and a day of world steps. None may pollute a built-in prototype, throw, or leave
 * the repair pass with work to do on a second run. The seed picks which name each site gets, so a failure reproduces.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { FIXTURES } from '@/dev/fixtures';
import { decodeRecord } from '@/persistence/serialize';
import { repairState } from '@/persistence/migrations';
import { simulateOffline } from '@/persistence/offline';
import { advanceWorld } from '@/sim/world';

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Path = (string | number)[];

const NAMES = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'prototype'];
/** Fields that hold an id (or, under `*Ids`/`tankOrder`/…, a list of ids): the same net as the review's probe. */
const ID_FIELD = /(Id|Ids|^id$|^ids$|Key$|^level$|^role$|^trait$)/;
const ID_LIST_PARENT = /(Ids|ids|tankOrder|unlocked|completed|discoveredSpecies|achievements)$/;
const ID_LIKE = /^[a-z]+_[0-9a-z_]+$/;

const PROTOS: [string, object][] = [
  ['Object', Object.prototype],
  ['Array', Array.prototype],
  ['Function', Function.prototype],
  ['String', String.prototype],
  ['Number', Number.prototype],
];
const ORIGINAL = new Map<string, PropertyDescriptor | undefined>();
for (const [n, P] of PROTOS) for (const k of Reflect.ownKeys(P)) ORIGINAL.set(`${n}.${String(k)}`, Object.getOwnPropertyDescriptor(P, k));

function pollution(): string[] {
  const out: string[] = [];
  for (const [n, P] of PROTOS) {
    for (const k of Reflect.ownKeys(P)) {
      const o = ORIGINAL.get(`${n}.${String(k)}`);
      const d = Object.getOwnPropertyDescriptor(P, k)!;
      if (!o) out.push(`new ${n}.${String(k)}`);
      else if (!Object.is(o.value, d.value) || o.get !== d.get || o.set !== d.set) out.push(`changed ${n}.${String(k)}`);
    }
  }
  return out;
}

function cleanPollution(): void {
  for (const [n, P] of PROTOS) {
    for (const k of Reflect.ownKeys(P)) {
      const o = ORIGINAL.get(`${n}.${String(k)}`);
      if (!o) delete (P as Json)[k];
      else Object.defineProperty(P, k, o);
    }
  }
}

afterEach(cleanPollution);

/** mulberry32: a small seeded generator, so the fuzz is reproducible (Math.random would not be). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function walk(v: Json, path: Path, visit: (v: Json, path: Path) => void): void {
  visit(v, path);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i], visit));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], [...path, k], visit);
}

/** One representative per field shape (ids and list indexes folded), so the fuzz covers every kind of site once. */
function shape(path: Path): string {
  return path.map((p) => (typeof p === 'number' ? '[]' : ID_LIKE.test(p) ? '{}' : p)).join('.');
}

function getAt(root: Json, path: Path): Json {
  let v = root;
  for (const p of path) v = v[p];
  return v;
}

/** Load `text` like an imported save, catch up 3 real hours and step a game day. Returns what went wrong, if anything. */
function play(text: string): string | null {
  let st: Json;
  try {
    st = decodeRecord(text, 'fuzz').state;
  } catch (e) {
    const p = pollution();
    if (p.length) return `pollution during load: ${p.join(', ')}`;
    if ((e as { code?: string }).code) return null; // a clean refusal is a fine outcome
    return `load threw: ${(e as Error).message}`;
  }
  let p = pollution();
  if (p.length) return `pollution after load: ${p.join(', ')}`;
  const again = structuredClone(st);
  const second = repairState(again);
  if (second.length) return `repair not idempotent: ${second.slice(0, 2).join(' | ')}`;
  try {
    simulateOffline(st, 3 * 3600_000);
    const focus = st.tankOrder[0] ?? null;
    for (let h = 0; h < 24; h += 0.5) advanceWorld(st, 0.5, { focusTankId: focus });
  } catch (e) {
    p = pollution();
    return p.length ? `pollution while running: ${p.join(', ')}` : `world threw: ${(e as Error).message.slice(0, 160)}`;
  }
  p = pollution();
  if (p.length) return `pollution after running: ${p.join(', ')}`;
  if (!Number.isFinite(st.finance.money) || !Number.isFinite(st.clock.hour)) return 'non-finite money or clock';
  return null;
}

describe.each(['shows-demo', 'frags_market'])('crafted-save fuzz on %s', (fixture) => {
  const base = JSON.parse(JSON.stringify(FIXTURES[fixture]())) as Json;

  it('the unmodified fixture loads and runs cleanly', () => {
    expect(play(JSON.stringify(base))).toBeNull();
  });

  it('every id field set to an inherited name is repaired', { timeout: 120_000 }, () => {
    const rnd = seeded(20261005);
    const seen = new Set<string>();
    const sites: Path[] = [];
    walk(base, [], (v, path) => {
      if (typeof v !== 'string' || !path.length) return;
      const last = path[path.length - 1];
      const parent = path[path.length - 2];
      const isId = typeof last === 'string' ? ID_FIELD.test(last) : typeof parent === 'string' && ID_LIST_PARENT.test(parent);
      if (!isId || seen.has(shape(path))) return;
      seen.add(shape(path));
      sites.push(path);
    });
    expect(sites.length).toBeGreaterThan(20);
    const failures: string[] = [];
    for (const path of sites) {
      const name = NAMES[Math.floor(rnd() * NAMES.length)];
      const s = structuredClone(base);
      getAt(s, path.slice(0, -1))[path[path.length - 1]] = name;
      const bad = play(JSON.stringify(s));
      cleanPollution();
      if (bad) failures.push(`${shape(path)} = ${JSON.stringify(name)}: ${bad}`);
    }
    expect(failures).toEqual([]);
  });

  it('an own inherited-name key on any object is repaired', { timeout: 120_000 }, () => {
    const rnd = seeded(51);
    const seen = new Set<string>();
    const nodes: Path[] = [];
    walk(base, [], (v, path) => {
      if (!v || typeof v !== 'object' || Array.isArray(v) || seen.has(shape(path))) return;
      seen.add(shape(path));
      nodes.push(path);
    });
    expect(nodes.length).toBeGreaterThan(20);
    const failures: string[] = [];
    for (const path of nodes) {
      const name = NAMES[Math.floor(rnd() * NAMES.length)];
      const s = structuredClone(base);
      const obj = path.length ? getAt(s, path) : s;
      const sample = Object.values(obj)[0];
      Object.defineProperty(obj, name, { value: sample === undefined ? {} : structuredClone(sample), enumerable: true, writable: true, configurable: true });
      const bad = play(JSON.stringify(s));
      cleanPollution();
      if (bad) failures.push(`${shape(path) || '(root)'}.${name}: ${bad}`);
    }
    expect(failures).toEqual([]);
  });
});
