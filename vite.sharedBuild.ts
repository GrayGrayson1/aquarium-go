/**
 * Shared shops' build identity (SHARED-SHOPS.md §5.1; chunk 12): a hash of everything every copy of a shop runs to stay
 * in step — the simulation, the data, the types (the protocol's messages among them) and the pure persistence files
 * (the fingerprint, the save's encoding, migrations and repair, the schema) — in a fixed order with normalised line
 * endings. vite.config.ts stamps it into the game, vite.server.config.ts into the server and vitest.config.ts into the
 * tests, as `__SHARED_BUILD_HASH__` (src/types/shared.ts SHARED_BUILD). Builds with the same hash play together,
 * whatever else differs (the interface, the docs, a server-only fix); a file outside these changes nothing.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

/** Folders covered whole, and single files, relative to the repo. */
export const SHARED_BUILD_DIRS = ['src/sim', 'src/data', 'src/types'];
export const SHARED_BUILD_FILES = [
  'src/persistence/hash.ts',
  'src/persistence/serialize.ts',
  'src/persistence/migrations.ts',
  'src/persistence/schema.ts',
  'src/persistence/types.ts',
  // the replica decides which steps apply and which full-detail list is in force (chunk 12's review, note 11)
  'src/game/sharedLoop.ts',
];

const SOURCE = /\.(ts|tsx|json)$/;
const TEST = /\.test\.tsx?$/;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (SOURCE.test(name) && !TEST.test(name)) out.push(p);
  }
}

/** The covered files, as repo-relative paths with `/`, sorted. */
export function sharedBuildFiles(root: string): string[] {
  const out: string[] = [];
  for (const d of SHARED_BUILD_DIRS) walk(join(root, d), out);
  for (const f of SHARED_BUILD_FILES) out.push(join(root, f));
  return [...new Set(out.map((p) => relative(root, p).split(sep).join('/')))].sort();
}

/** The hash (16 hex characters): each covered file's path and text, line endings normalised. */
export function sharedBuildHash(root: string, read: (rel: string) => string = (rel) => readFileSync(join(root, rel), 'utf8')): string {
  const h = createHash('sha256');
  for (const rel of sharedBuildFiles(root)) {
    h.update(rel);
    h.update('\0');
    h.update(read(rel).replace(/\r\n?/g, '\n'));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

/**
 * Defines `__SHARED_BUILD_HASH__` for a build, and `__APP_VERSION__` when given one (the server's build; the game's own
 * stamp defines it there, and the tests run unstamped).
 */
export function sharedBuild(root: string, version?: string): Plugin {
  return {
    name: 'aquarium-go:shared-build',
    config() {
      const define: Record<string, string> = { __SHARED_BUILD_HASH__: JSON.stringify(sharedBuildHash(root)) };
      if (version) define.__APP_VERSION__ = JSON.stringify(version);
      return { define };
    },
  };
}
