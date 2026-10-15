// @vitest-environment node
/**
 * chunk 6 (REL-008) — no unaccounted TODO in the shipped code: every TODO, FIXME, XXX or HACK marker in src must name a
 * requirement id (SOC-009), a backlog row (B-170) or an ADR (ADR-0034); src has none today. The stubs that ship on
 * purpose are listed (and declared by their designs): the local Social service (0.5 spec §13.6, ADR-0005 decision 3)
 * and the trades' coming-soon note (§13.5, ADR-0034 decision 2).
 */
import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(__dirname, '..', '..');
const MARKER = /\b(TODO|FIXME|XXX|HACK)\b/;
const ACCOUNTED = /\b([A-Z]{2,8}-\d{3}|B-\d{3}|ADR-\d{4})\b/;

async function sources(): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(join(ROOT, 'src'), { withFileTypes: true, recursive: true })) {
    if (e.isFile() && /\.(ts|tsx|css)$/.test(e.name)) out.push(join(e.parentPath, e.name));
  }
  return out;
}

/** Marker lines that name nothing to account for them. */
export function unaccounted(text: string): string[] {
  return text.split('\n').filter((l) => MARKER.test(l) && !ACCOUNTED.test(l));
}

describe('REL-008: TODO markers', () => {
  it('every marker in src names a requirement, a backlog row or an ADR', async () => {
    const bad: string[] = [];
    for (const f of await sources()) {
      for (const line of unaccounted(await readFile(f, 'utf8'))) bad.push(`${relative(ROOT, f)}: ${line.trim().slice(0, 120)}`);
    }
    expect(bad).toEqual([]);
  });

  it('the check can fail, and an accounted marker passes', () => {
    expect(unaccounted('// TODO: tidy this')).toHaveLength(1);
    expect(unaccounted('/* HACK until B-170 lands */')).toEqual([]);
    expect(unaccounted('// FIXME (SOC-009): a real backend')).toEqual([]);
  });

  it('the stubs that ship are the declared ones', () => {
    const stub = readFileSync(join(ROOT, 'src/social/localStub.ts'), 'utf8');
    expect(stub).toMatch(/The local Social stub \(0\.5 spec §13\.6\)/);
    const copy = readFileSync(join(ROOT, 'src/ui/panels/social/copy.ts'), 'utf8');
    expect(copy).toMatch(/soonTitle: 'Trades open later'/);
  });
});
