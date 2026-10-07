// @vitest-environment node
/**
 * lane:core (CONST-005, the test CONST-001 names) — the dependency pin. The rule is "No new dependencies without asking
 * the owner" (AGENTS.md). package.json's dependencies and devDependencies, and the dependencies and devDependencies of
 * package-lock.json's root package entry (`packages[""]`), must equal the lists recorded below: names and version
 * ranges exactly as they were at the S0 checkpoint. Adding, removing or changing any entry in either file fails this
 * test, and so does any optionalDependencies or peerDependencies entry (another way in).
 *
 * The recorded lists change only together with an ADR in docs/agent/decisions/ that records the owner's approval
 * (CONST-001 A3). The last test shows the comparison failing on modified copies, so this pin can fail.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

/** package.json `dependencies`, and the lockfile root's, as approved. */
const DEPENDENCIES: Record<string, string> = {
  '@fontsource-variable/fraunces': '^5.3.0',
  '@fontsource-variable/inter': '^5.3.0',
  '@react-three/drei': '^10.7.8',
  '@react-three/fiber': '^9.8.0',
  '@react-three/postprocessing': '^3.1.2',
  clsx: '^2.1.1',
  'idb-keyval': '^6.3.0',
  immer: '^11.1.18',
  'lucide-react': '^1.47.0',
  motion: '^13.4.1',
  postprocessing: '^6.39.5',
  react: '^19.3.0',
  'react-dom': '^19.3.0',
  'simplex-noise': '^4.0.3',
  three: '^0.186.0',
  zustand: '^5.0.15',
};

/** package.json `devDependencies`, and the lockfile root's, as approved. */
const DEV_DEPENDENCIES: Record<string, string> = {
  '@playwright/test': '^1.63.0',
  '@types/node': '^26.6.2',
  '@types/react': '^19.3.0',
  '@types/react-dom': '^19.3.0',
  '@types/three': '^0.186.0',
  '@vitejs/plugin-react': '^4.7.0',
  typescript: '^5.9.3',
  vite: '^6.4.3',
  vitest: '^3.2.7',
};

/** Each dependency field and the list it must equal (none may appear in the optional and peer fields). */
const PINNED: [field: string, recorded: Record<string, string>][] = [
  ['dependencies', DEPENDENCIES],
  ['devDependencies', DEV_DEPENDENCIES],
  ['optionalDependencies', {}],
  ['peerDependencies', {}],
];

type Manifest = Record<string, unknown>;

/** How `actual` differs from `recorded`: one line per added, removed or changed entry (empty when they match). */
function drift(recorded: Record<string, string>, actual: unknown): string[] {
  const now = actual && typeof actual === 'object' ? (actual as Record<string, unknown>) : {};
  const out: string[] = [];
  for (const [name, range] of Object.entries(now)) {
    if (!Object.hasOwn(recorded, name)) out.push(`added ${name}@${String(range)}`);
    else if (range !== recorded[name]) out.push(`changed ${name} ${recorded[name]} -> ${String(range)}`);
  }
  for (const [name, range] of Object.entries(recorded)) if (!Object.hasOwn(now, name)) out.push(`removed ${name}@${range}`);
  return out.sort();
}

/** Every difference between the two files and the recorded lists, labelled with where it is. */
function pinProblems(pkg: Manifest, lock: Manifest): string[] {
  const packages = lock.packages && typeof lock.packages === 'object' ? (lock.packages as Record<string, Manifest>) : {};
  const sources: [string, Manifest | undefined][] = [
    ['package.json', pkg],
    ['package-lock.json packages[""]', packages['']],
  ];
  const out: string[] = [];
  for (const [where, manifest] of sources) {
    if (!manifest) {
      out.push(`${where}: missing`);
      continue;
    }
    for (const [field, recorded] of PINNED) for (const line of drift(recorded, manifest[field])) out.push(`${where} ${field}: ${line}`);
  }
  return out;
}

describe('CONST-005: no new dependencies without the owner (the dependency pin)', () => {
  let pkg: Manifest = {};
  let lock: Manifest = {};

  // Asynchronous reads, so a slow disk never blocks the Vitest worker.
  beforeAll(async () => {
    [pkg, lock] = await Promise.all([
      readFile(join(ROOT, 'package.json'), 'utf8').then((t) => JSON.parse(t) as Manifest),
      readFile(join(ROOT, 'package-lock.json'), 'utf8').then((t) => JSON.parse(t) as Manifest),
    ]);
  });

  it("package.json's dependencies and devDependencies equal the recorded lists", () => {
    expect(pkg.dependencies).toEqual(DEPENDENCIES);
    expect(pkg.devDependencies).toEqual(DEV_DEPENDENCIES);
  });

  it('the lockfile root entry lists the same direct dependencies and devDependencies', () => {
    const root = (lock.packages as Record<string, Manifest> | undefined)?.[''];
    expect(root?.dependencies).toEqual(DEPENDENCIES);
    expect(root?.devDependencies).toEqual(DEV_DEPENDENCIES);
  });

  it('neither file differs from the pin in any dependency field (optional and peer included)', () => {
    expect(pinProblems(pkg, lock), 'a dependency change needs the owner\'s approval in an ADR first (AGENTS.md)').toEqual([]);
  });

  it('the comparison fails on an added, a removed or a changed entry in either file (shown on modified copies)', () => {
    expect(drift(DEPENDENCIES, { ...DEPENDENCIES })).toEqual([]);
    expect(drift(DEPENDENCIES, { ...DEPENDENCIES, 'left-pad': '^1.3.0' })).toEqual(['added left-pad@^1.3.0']);
    expect(drift(DEPENDENCIES, { ...DEPENDENCIES, three: '^0.187.0' })).toEqual(['changed three ^0.186.0 -> ^0.187.0']);
    const { zustand: _gone, ...withoutZustand } = DEPENDENCIES;
    expect(drift(DEPENDENCIES, withoutZustand)).toEqual(['removed zustand@^5.0.15']);

    // The same checks on scratch copies of the real files.
    const pkgCopy = structuredClone(pkg) as Manifest & { devDependencies: Record<string, string> };
    pkgCopy.devDependencies['left-pad'] = '^1.3.0';
    expect(pinProblems(pkgCopy, lock)).toEqual(['package.json devDependencies: added left-pad@^1.3.0']);

    const lockCopy = structuredClone(lock) as Manifest & { packages: Record<string, Manifest & { dependencies: Record<string, string> }> };
    delete lockCopy.packages[''].dependencies.immer;
    lockCopy.packages[''].dependencies.react = '^19.4.0';
    expect(pinProblems(pkg, lockCopy)).toEqual([
      'package-lock.json packages[""] dependencies: changed react ^19.3.0 -> ^19.4.0',
      'package-lock.json packages[""] dependencies: removed immer@^11.1.18',
    ]);

    const optionalCopy = { ...structuredClone(pkg), optionalDependencies: { fsevents: '^2.3.3' } };
    expect(pinProblems(optionalCopy, lock)).toEqual(['package.json optionalDependencies: added fsevents@^2.3.3']);

    // And the assertion the pin uses really throws on such a copy.
    expect(() => expect(pinProblems(pkgCopy, lock)).toEqual([])).toThrow();
  });
});
