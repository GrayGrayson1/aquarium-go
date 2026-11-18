// @vitest-environment node
/**
 * Audit 2026-11-17 (J18 and its review): the game writes the curly apostrophe (’). A static guard over the text of every
 * string in the simulation and the game data (string literals and each part of a template literal, read by the
 * TypeScript parser, so comments and code are never matched): no straight apostrophe in a word ("can't", "Ember's",
 * "${name}'s", "buyers' tanks"). Older saves' log lines keep theirs; code that reads log text accepts both
 * (MONEY_NEWS in src/ui/hud/eventLinks.ts).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = join(__dirname, '..', '..');
const DIRS = ['src/sim', 'src/data'];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** A straight apostrophe inside a word, after an interpolation ("}'s" starts a template's next part), or after a plural. */
const IN_WORD = /[A-Za-z0-9]'[A-Za-z]|[a-z]s'(?=[\s,.;:!?)—–]|$)/;
const AFTER_SLOT = /^'(?:s|t|re|ll|ve|d|m)\b/;

function straightApostrophes(path: string): string[] {
  const src = readFileSync(path, 'utf8');
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = [];
  const visit = (n: ts.Node) => {
    let text: string | null = null;
    let afterSlot = false;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) text = n.text;
    else if (ts.isTemplateHead(n)) text = n.text;
    else if (ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      text = n.text;
      afterSlot = true;
    }
    if (text !== null && (IN_WORD.test(text) || (afterSlot && AFTER_SLOT.test(text)))) {
      // import paths and module names never hold words
      if (!(n.parent && (ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent)))) {
        hits.push(`${relative(ROOT, path)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}: ${text.slice(0, 80)}`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
}

describe('J18: the sim’s and the data’s sentences use the curly apostrophe', () => {
  it('no straight apostrophe in a word in any string in src/sim or src/data', () => {
    const hits = DIRS.flatMap((d) => files(join(ROOT, d))).flatMap(straightApostrophes);
    expect(hits).toEqual([]);
  });

  it('the guard sees the shapes the first sweep missed', () => {
    const probe = (code: string) => {
      const sf = ts.createSourceFile('probe.ts', code, ts.ScriptTarget.Latest, true);
      const out: string[] = [];
      const visit = (n: ts.Node) => {
        if ((ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && AFTER_SLOT.test(n.text)) out.push(n.text);
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && IN_WORD.test(n.text)) out.push(n.text);
        ts.forEachChild(n, visit);
      };
      visit(sf);
      return out.length > 0;
    };
    expect(probe('const a = `${name}\'s tank`;')).toBe(true); // "}'s"
    expect(probe('const b = x ? "weren\'t" : "wasn\'t";')).toBe(true); // double-quoted, no space
    expect(probe("const c = 'the room\\'s stock';")).toBe(true); // escaped in single quotes
    expect(probe('const d = `${n} buyers\' tanks`;')).toBe(true); // a plural's apostrophe
    expect(probe('const e = `${name}’s tank`; // it\'s a comment')).toBe(false);
  });
});
