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

/** After one of these characters, or at the start, a "/" begins a regular expression literal rather than a division. */
const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/** Does a "/" here start a regex literal? The usual tokenizer rule: look at the last code character kept so far. */
function regexCanStart(out: string): boolean {
  let k = out.length - 1;
  while (k >= 0 && /\s/.test(out[k])) k--;
  const last = k < 0 ? '' : out[k];
  if (REGEX_AFTER.has(last)) return true;
  if (!/[\w$]/.test(last)) return false;
  let w = k;
  while (w >= 0 && /[\w$]/.test(out[w])) w--;
  return REGEX_AFTER_WORD.has(out.slice(w + 1, k + 1));
}

/** End (exclusive, flags included) of the regex literal that starts at `i`, or -1 when none closes on this line. */
function regexEnd(src: string, i: number): number {
  let inClass = false;
  for (let j = i + 1; j < src.length; j++) {
    const ch = src[j];
    if (ch === '\n') return -1;
    if (ch === '\\') j++;
    else if (inClass) inClass = ch !== ']';
    else if (ch === '[') inClass = true;
    else if (ch === '/') {
      let k = j + 1;
      while (k < src.length && /[a-z]/i.test(src[k])) k++;
      return k;
    }
  }
  return -1;
}

/**
 * Strip comments from code starting at `i`; inside a template's `${…}` (`inExpr`), stop at its closing brace. Returns
 * the kept text and where it stopped. String, template and regex literals are kept verbatim, so neither a quote inside
 * a regex (`/['"]/`), a "//" inside one (`/\/\//`), nor a nested template (`${a ? `x` : ''}`) can make the scan
 * mistake code for a comment or the other way round (B-005).
 */
function strip(src: string, i: number, inExpr: boolean): [string, number] {
  let out = '';
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      out += ' ';
    } else if (c === '/' && regexCanStart(out)) {
      const end = regexEnd(src, i);
      out += end < 0 ? c : src.slice(i, end);
      i = end < 0 ? i + 1 : end;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === '`') {
      out += c;
      i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') {
          out += src.slice(i, i + 2);
          i += 2;
        } else if (src[i] === '$' && src[i + 1] === '{') {
          const [code, end] = strip(src, i + 2, true);
          out += `\${${code}}`;
          i = end + 1;
        } else {
          out += src[i];
          i++;
        }
      }
      if (i < src.length) out += '`';
      i++;
    } else {
      if (inExpr && c === '}' && depth === 0) return [out, i];
      if (inExpr && c === '{') depth++;
      if (inExpr && c === '}') depth--;
      out += c;
      i++;
    }
  }
  return [out, i];
}

/** Remove comments without touching string, template and regex literals (a "//" in a URL string is code). */
export function stripComments(src: string): string {
  return strip(src, 0, false)[0];
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

describe('CONST-004: determinism guard: src/sim and src/data', () => {
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

  it('the comment stripper keeps regex and nested template literals whole (B-005)', () => {
    // A quote or a "//" inside a regex literal, or a nested template, must neither hide code nor keep a comment.
    expect(stripComments("const q = /['\"]/g; // Date.now()\nf();")).toBe("const q = /['\"]/g; \nf();");
    expect(stripComments('const r = /\\/\\//; Math.random();')).toBe('const r = /\\/\\//; Math.random();');
    expect(stripComments("function f(s) { return /'/.test(s); } // Date.now()")).toBe("function f(s) { return /'/.test(s); } ");
    expect(stripComments("const t = `a ${b ? `http://x` : 'y'} c`; Math.random(); // Date.now()")).toBe("const t = `a ${b ? `http://x` : 'y'} c`; Math.random(); ");
    expect(stripComments('const e = `${a /* Date.now() */ + { k: 1 }.k}`;')).toBe('const e = `${a   + { k: 1 }.k}`;');
    // and a division is still a division
    expect(stripComments('const half = a / 2; // Date.now()\nconst q = (b) / c; /* Math.random() */')).toBe('const half = a / 2; \nconst q = (b) / c;  ');
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
