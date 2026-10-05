// @vitest-environment node
/**
 * lane:core (S0 review; docs/agent/OPERATIONS.md §11 determinism contract) — a static guard: the simulation and the
 * game data never read the wall clock, an unseeded random source, crypto, or the player's locale. The only accepted
 * entropy is the new-game seed and creation time in src/sim/newGame.ts. Comments are ignored.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');

/**
 * Patterns are matched on code with comments removed. They catch references as well as calls (`const now = Date.now`)
 * and optional chaining (`performance?.now`), per the S0 code-architecture review (L3).
 */
const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'Math.random', re: /\bMath\s*\??\.\s*random\b/g },
  { name: 'Date.now', re: /\bDate\s*\??\.\s*now\b/g },
  { name: 'performance.now', re: /\bperformance\s*\??\.\s*now\b/g },
  { name: 'new Date', re: /\bnew\s+Date\b/g },
  { name: 'crypto', re: /\bcrypto\b/g },
  { name: 'Intl', re: /\bIntl\b/g },
  // Any toLocale…() whose first argument isn't a string-literal locale (none, undefined, a variable).
  { name: 'toLocale…() without a literal locale', re: /\.toLocale\w*\(\s*(?!['"`])/g },
];

/** file → pattern name → allowed count. */
const ALLOWED: Record<string, Record<string, number>> = {
  'src/sim/newGame.ts': { 'Date.now': 2, 'Math.random': 1 },
};

async function sourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(join(e.parentPath, e.name));
  }
  return out;
}

/** Remove comments without touching string and template literals (a "//" in a URL string is code, not a comment). */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      out += ' ';
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** The arguments of every `.localeCompare(…)` call, split at top-level commas. */
function localeCompareArgs(code: string): string[][] {
  const calls: string[][] = [];
  for (const m of code.matchAll(/\.localeCompare\(/g)) {
    const args: string[] = [];
    let depth = 0;
    let cur = '';
    for (let i = m.index! + m[0].length; i < code.length; i++) {
      const ch = code[i];
      if (depth === 0 && ch === ')') break;
      if ('([{'.includes(ch)) depth++;
      if (')]}'.includes(ch)) depth--;
      if (depth === 0 && ch === ',') {
        args.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    args.push(cur.trim());
    calls.push(args);
  }
  return calls;
}

describe('determinism guard: src/sim and src/data', () => {
  let sources: { rel: string; code: string }[] = [];

  // Asynchronous reads, so a slow disk never blocks the Vitest worker (S0 review H1).
  beforeAll(async () => {
    const files = [...(await sourceFiles(join(ROOT, 'src', 'sim'))), ...(await sourceFiles(join(ROOT, 'src', 'data')))];
    sources = await Promise.all(
      files.map(async (f) => ({ rel: relative(ROOT, f).split('\\').join('/'), code: stripComments(await readFile(f, 'utf8')) })),
    );
  }, 300_000);

  it('the comment stripper keeps strings and drops comments', () => {
    expect(stripComments("const u = 'https://x'; // Date.now()\n/* Math.random() */ f();")).toBe("const u = 'https://x'; \n  f();");
  });

  it('the patterns catch the forms the review listed', () => {
    const hits = (code: string) => FORBIDDEN.filter(({ re }) => (code.match(re) ?? []).length > 0).map((f) => f.name);
    expect(hits('const t = Date.now;')).toEqual(['Date.now']);
    expect(hits('performance?.now()')).toEqual(['performance.now']);
    expect(hits('Math?.random()')).toEqual(['Math.random']);
    expect(hits('globalThis.crypto?.getRandomValues(a)')).toEqual(['crypto']);
    expect(hits('n.toLocaleString(undefined, { maximumFractionDigits: 1 })')).toEqual(['toLocale…() without a literal locale']);
    expect(hits('s.toLocaleUpperCase()')).toEqual(['toLocale…() without a literal locale']);
    expect(hits("n.toLocaleString('en-US')")).toEqual([]);
    expect(localeCompareArgs("a.localeCompare(String(b), undefined, { numeric: true })")).toEqual([['String(b)', 'undefined', '{ numeric: true }']]);
  });

  it('scans the simulation and data sources', () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it('use no wall clock, unseeded randomness, crypto or locale-dependent formatting and sorting', () => {
    const problems: string[] = [];
    for (const { rel, code } of sources) {
      for (const { name, re } of FORBIDDEN) {
        const n = (code.match(re) ?? []).length;
        const allowed = ALLOWED[rel]?.[name] ?? 0;
        if (n > allowed) problems.push(`${rel}: ${name} ×${n}${allowed ? ` (allowed ${allowed})` : ''}`);
      }
      for (const args of localeCompareArgs(code)) {
        if (!/^['"`]/.test(args[1] ?? '')) problems.push(`${rel}: localeCompare without a literal locale`);
      }
    }
    expect(problems).toEqual([]);
  });
});
