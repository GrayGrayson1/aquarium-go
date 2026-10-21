// @vitest-environment node
/**
 * lane:core (S0 "Architecture Lock"; master §5, §34 architecture-drift alarm) — the layering in docs/ARCHITECTURE.md
 * as a test. Every value import between top-level src/ layers must follow ALLOWED. The edges that already break it
 * when this lock was installed (2026-10-05) are listed in BASELINE; they may be removed, but any new one fails.
 * Type-only imports are free (they vanish at build time). Zero dependencies: imports are parsed with regexes.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
/** Chunk 10 (SHARED-SHOPS.md §5.1): the shared-shop server, a top-level folder outside src. */
const SERVER = join(ROOT, 'server');

/** layer → layers it may import values from (itself is always allowed). */
const ALLOWED: Record<string, string[]> = {
  types: [],
  data: ['types'],
  sim: ['types', 'data'],
  state: ['types'],
  persistence: ['types', 'data', 'sim', 'state', 'game'],
  game: ['types', 'data', 'sim', 'state', 'persistence'],
  runtime: ['types', 'data', 'sim'],
  audio: ['types', 'data', 'sim', 'state', 'runtime'],
  ai: ['types', 'data', 'sim', 'state', 'runtime'],
  render: ['types', 'data', 'sim', 'state', 'runtime', 'ai', 'audio'],
  // 0.5 design §14: a thin seam over browser APIs; no runtime imports from persistence, sim, state or ui.
  platform: ['types'],
  // lane:social (chunk 6, 0.5 design §13.6): the SocialService and its local stub; social data never enters the save,
  // and the sim is read only for the player's own leaderboard row (src/social/standing.ts)
  social: ['types', 'data', 'sim'],
  ui: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'audio', 'platform', 'social'],
  app: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'ui', 'audio', 'platform', 'social'],
  dev: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'ui', 'audio', 'platform', 'social', 'app'],
  root: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'ui', 'audio', 'platform', 'social', 'app', 'dev'],
};

/** Violations present when the lock was installed: "src/file -> layer". Shrink this list; never grow it. */
const BASELINE: string[] = [
  'src/ai/TankAI.tsx -> render',
  'src/ai/core/motionScan.ts -> render',
  'src/game/StaleTabBanner.tsx -> ui',
  'src/render/facility/RoomTankDots.tsx -> ui',
  'src/render/interaction/TankInteraction.tsx -> ui',
  'src/sim/newGame.ts -> persistence',
  'src/state/settings.ts -> render',
  'src/ui/dev/DevPanel.tsx -> dev',
  'src/ui/panels/dev/fixtures.ts -> dev',
  'src/ui/screens/onboarding.ts -> dev',
];

/** Every file under src (for import resolution) — read asynchronously so a slow disk never blocks the worker. */
async function allFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) if (e.isFile()) out.push(join(e.parentPath, e.name));
  return out;
}

/**
 * A file's layer: its top-level directory under src, or "root" for a file directly in src. A directory is never the
 * root layer, not even one named "root" (code-architecture-game-2 m5): a directory ALLOWED doesn't list is unknown.
 */
const layerOf = (abs: string): string => {
  const parts = relative(SRC, abs).split(/[\\/]/);
  if (parts.length === 1) return 'root';
  return parts[0] === 'root' ? 'root/' : parts[0];
};

/** Top-level src directories holding source files that ALLOWED has no row for (each one needs a row and an ADR). */
export function unknownLayers(files: string[]): string[] {
  const dirs = new Set<string>();
  for (const f of files) {
    const layer = layerOf(f);
    if (layer !== 'root' && !Object.hasOwn(ALLOWED, layer)) dirs.add(relative(SRC, f).split(/[\\/]/)[0]);
  }
  return [...dirs].sort();
}

function resolveSpec(files: Set<string>, from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null; // a package
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (files.has(c)) return c;
  }
  return base;
}

/** Module specifiers of value imports and re-exports (type-only ones skipped), including dynamic import(). */
export function valueImports(code: string): string[] {
  const specs: string[] = [];
  const stat = /\b(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of code.matchAll(stat)) if (!m[2]) specs.push(m[4]);
  for (const m of code.matchAll(/(?:^|[;\s])import\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

/**
 * One scan of src: read every source file concurrently, then resolve imports against the file list (no more I/O).
 * Files in an unknown top-level directory are left to the unknown-layer check, which fails on them.
 */
async function scan(): Promise<{ violations: string[]; unknown: string[] }> {
  const files = await allFiles(SRC);
  const known = new Set(files);
  const sources = files.filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const codes = await Promise.all(sources.map((f) => readFile(f, 'utf8')));
  const found = new Set<string>();
  sources.forEach((file, i) => {
    const from = layerOf(file);
    if (!Object.hasOwn(ALLOWED, from)) return;
    const code = codes[i].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
    for (const spec of valueImports(code)) {
      const target = resolveSpec(known, file, spec);
      if (!target || !target.startsWith(SRC)) continue;
      const to = layerOf(target);
      if (to === from || ALLOWED[from].includes(to)) continue;
      found.add(`${relative(ROOT, file).split('\\').join('/')} -> ${to}`);
    }
  });
  return { violations: [...found].sort(), unknown: unknownLayers(sources) };
}

describe('CONST-004: architecture lock: layer import directions', () => {
  let now: string[] = [];
  let unknown: string[] = [];
  beforeAll(async () => {
    ({ violations: now, unknown } = await scan());
  }, 300_000);

  it('parses value imports and skips type-only ones', () => {
    const code = "import type { A } from '@/types';\nimport { b, type C } from '@/sim/x';\nexport { d } from './d';\nimport '@/ui/side';\nconst m = await import('@/render/lazy');";
    expect(valueImports(code)).toEqual(['@/sim/x', './d', '@/ui/side', '@/render/lazy']);
  });

  it('a file in a top-level directory that ALLOWED has no row for is reported, never taken for the src root', () => {
    const files = [join(SRC, 'main.tsx'), join(SRC, 'sim', 'x.ts'), join(SRC, 'router', 'routes.ts'), join(SRC, 'root', 'y.ts'), join(SRC, 'router', 'a', 'b.ts')];
    expect(unknownLayers(files)).toEqual(['root', 'router']);
  });

  it('every top-level src directory is a layer in ALLOWED', () => {
    expect(unknown, 'a new top-level src directory needs a row in ALLOWED and docs/ARCHITECTURE.md (an ADR)').toEqual([]);
  });

  it('no new cross-layer value import breaks the layering', () => {
    const added = now.filter((v) => !BASELINE.includes(v));
    expect(added, 'new layering violations (fix the import, or record an ADR and update ALLOWED)').toEqual([]);
  });

  it('the baseline only lists violations that still exist', () => {
    expect(BASELINE.filter((v) => !now.includes(v)), 'remove fixed entries from BASELINE').toEqual([]);
  });
});

/**
 * Chunk 10 (SHARED-SHOPS.md §5.1): the server runs the simulation in Node, so everything it reaches through value
 * imports must be the types, the data, the simulation or the pure persistence modules (the fingerprint, the save's
 * encoding, migrations and repair, the schema): never the stores, the game loop, the interface or React. Its packages:
 * `ws` (ADR-0045 decision 2) and Node's own; the simulation's own packages come with it.
 */
const SERVER_LAYERS = new Set(['types', 'data', 'sim']);
const SERVER_PERSISTENCE = new Set(['hash.ts', 'serialize.ts', 'migrations.ts', 'schema.ts', 'types.ts']);
/**
 * Chunk 12 (SHARED-SHOPS.md §5.8): the server's public settings live in code, so it reads the Supabase project's address
 * and publishable key from the one file that holds them (and the shop server's address beside them). That file imports
 * nothing (checked below), so allowing it brings nothing else with it.
 */
const SERVER_ALSO = new Set(['social/project.ts']);

async function serverClosure(): Promise<{ reached: string[]; serverPackages: string[] }> {
  const srcFiles = await allFiles(SRC);
  const serverFiles = (await allFiles(SERVER)).filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f));
  const known = new Set([...srcFiles, ...serverFiles]);
  const seen = new Set<string>();
  const serverPackages = new Set<string>();
  const queue = [...serverFiles];
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const code = (await readFile(f, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
    for (const spec of valueImports(code)) {
      if (!spec.startsWith('@/') && !spec.startsWith('.')) {
        if (f.startsWith(SERVER)) serverPackages.add(spec);
        continue;
      }
      const t = resolveSpec(known, f, spec);
      if (t && known.has(t) && /\.tsx?$/.test(t)) queue.push(t);
    }
  }
  return { reached: [...seen].filter((f) => f.startsWith(SRC)).map((f) => relative(SRC, f).split('\\').join('/')), serverPackages: [...serverPackages].sort() };
}

describe('chunk 10: the shared-shop server reaches only what every copy runs (SHARED-SHOPS.md §5.1)', () => {
  it('only the types, the data, the simulation and the pure persistence modules', async () => {
    const { reached } = await serverClosure();
    expect(reached.length).toBeGreaterThan(50);
    expect(reached).toContain('sim/sharedStep.ts');
    const outside = reached.filter((r) => {
      if (SERVER_ALSO.has(r)) return false;
      const [layer, ...rest] = r.split('/');
      if (SERVER_LAYERS.has(layer)) return false;
      return !(layer === 'persistence' && rest.length === 1 && SERVER_PERSISTENCE.has(rest[0]));
    });
    expect(outside).toEqual([]);
  }, 300_000);

  it('chunk 12: the settings file it may also read imports nothing', async () => {
    for (const f of SERVER_ALSO) expect(await readFile(join(SRC, f), 'utf8'), f).not.toMatch(/^\s*(import|export\s.*\sfrom)\s/m);
  });

  it('its own packages are ws and Node’s modules', async () => {
    const { serverPackages } = await serverClosure();
    expect(serverPackages.filter((p) => p !== 'ws' && !p.startsWith('node:'))).toEqual([]);
    expect(serverPackages).toContain('ws');
  }, 300_000);
});
