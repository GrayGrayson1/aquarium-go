// @vitest-environment node
/**
 * lane:core (S0 review; docs/agent/OPERATIONS.md §11 determinism contract) — a static guard: the simulation and the
 * game data never read the wall clock, an unseeded random source, crypto, or the player's locale. The only accepted
 * entropy is the new-game seed and creation time in src/sim/newGame.ts. Comments are ignored.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'Math.random()', re: /\bMath\.random\s*\(/g },
  { name: 'Date.now()', re: /\bDate\.now\s*\(/g },
  { name: 'performance.now()', re: /\bperformance\.now\s*\(/g },
  { name: 'new Date()', re: /\bnew\s+Date\s*\(/g },
  { name: 'crypto', re: /\bcrypto\./g },
  { name: 'Intl', re: /\bIntl\./g },
  { name: 'toLocaleString() without a locale', re: /\.toLocaleString\(\s*\)/g },
  { name: 'toLocaleDateString/TimeString', re: /\.toLocale(?:Date|Time)String\(/g },
  { name: 'localeCompare without a locale', re: /\.localeCompare\(\s*[^,()]+\)/g },
];

/** file → pattern name → allowed count. */
const ALLOWED: Record<string, Record<string, number>> = {
  'src/sim/newGame.ts': { 'Date.now()': 2, 'Math.random()': 1 },
};

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

describe('determinism guard: src/sim and src/data', () => {
  const files = [...sourceFiles(join(ROOT, 'src', 'sim')), ...sourceFiles(join(ROOT, 'src', 'data'))];

  it('scans the simulation and data sources', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('use no wall clock, unseeded randomness, crypto or locale-dependent formatting and sorting', () => {
    const problems: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).split('\\').join('/');
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const { name, re } of FORBIDDEN) {
        const n = (code.match(re) ?? []).length;
        const allowed = ALLOWED[rel]?.[name] ?? 0;
        if (n > allowed) problems.push(`${rel}: ${name} ×${n}${allowed ? ` (allowed ${allowed})` : ''}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
