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
  ui: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'audio'],
  app: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'ui', 'audio'],
  dev: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'ui', 'audio', 'app'],
  root: ['types', 'data', 'sim', 'state', 'persistence', 'game', 'runtime', 'ai', 'render', 'ui', 'audio', 'app', 'dev'],
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

const layerOf = (abs: string): string => {
  const top = relative(SRC, abs).split(/[\\/]/)[0];
  return top in ALLOWED && top !== 'root' ? top : 'root';
};

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

/** One scan of src: read every source file concurrently, then resolve imports against the file list (no more I/O). */
async function violations(): Promise<string[]> {
  const files = await allFiles(SRC);
  const known = new Set(files);
  const sources = files.filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const codes = await Promise.all(sources.map((f) => readFile(f, 'utf8')));
  const found = new Set<string>();
  sources.forEach((file, i) => {
    const from = layerOf(file);
    const code = codes[i].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
    for (const spec of valueImports(code)) {
      const target = resolveSpec(known, file, spec);
      if (!target || !target.startsWith(SRC)) continue;
      const to = layerOf(target);
      if (to === from || ALLOWED[from].includes(to)) continue;
      found.add(`${relative(ROOT, file).split('\\').join('/')} -> ${to}`);
    }
  });
  return [...found].sort();
}

describe('architecture lock: layer import directions', () => {
  let now: string[] = [];
  beforeAll(async () => {
    now = await violations();
  }, 300_000);

  it('parses value imports and skips type-only ones', () => {
    const code = "import type { A } from '@/types';\nimport { b, type C } from '@/sim/x';\nexport { d } from './d';\nimport '@/ui/side';\nconst m = await import('@/render/lazy');";
    expect(valueImports(code)).toEqual(['@/sim/x', './d', '@/ui/side', '@/render/lazy']);
  });

  it('no new cross-layer value import breaks the layering', () => {
    const added = now.filter((v) => !BASELINE.includes(v));
    expect(added, 'new layering violations (fix the import, or record an ADR and update ALLOWED)').toEqual([]);
  });

  it('the baseline only lists violations that still exist', () => {
    expect(BASELINE.filter((v) => !now.includes(v)), 'remove fixed entries from BASELINE').toEqual([]);
  });
});
