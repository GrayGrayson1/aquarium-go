// @vitest-environment node
/**
 * chunk 6 (REL-016; AGENTS.md "The store boundary"; docs/ARCHITECTURE.md) — the trust boundary a future server would
 * sit behind, checked in the source:
 * - game state is written only through the store: useGame.mutate, mutateFast and setGame (no other module calls
 *   useGame.setState, and nothing assigns into the live game object it reads with getGame() or useGame.getState());
 * - the render frame loop never writes game state (no mutate inside a useFrame callback; input handlers may);
 * - the UI reaches Social data only through the SocialService (src/social/index.ts), never the stub's internals;
 * - notifications, the clipboard and the share sheet only through src/platform.
 * core-architecture-boundaries.test.ts keeps the layer imports. The list of state changes a future server would have
 * to authorise is docs/agent/TRUST_BOUNDARY.md, and it names every sim function those layers call through the store.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

function files(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const SOURCES = files(SRC).map((p) => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf8') }));
/** Comments out of the way (the rules are about code). */
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const hits = (re: RegExp, allowed: (path: string) => boolean = () => false) =>
  SOURCES.filter((f) => !allowed(f.path)).flatMap((f) =>
    code(f.text)
      .split('\n')
      .filter((l) => re.test(l))
      .map((l) => `${f.path}: ${l.trim().slice(0, 120)}`),
  );

/** The text of every `useFrame(...)` call's arguments, by matching brackets. */
function useFrameBodies(text: string): string[] {
  const out: string[] = [];
  let i = text.indexOf('useFrame(');
  while (i >= 0) {
    let depth = 0;
    let j = i + 'useFrame'.length;
    for (; j < text.length; j++) {
      if (text[j] === '(') depth++;
      else if (text[j] === ')' && --depth === 0) break;
    }
    out.push(text.slice(i, j + 1));
    i = text.indexOf('useFrame(', j);
  }
  return out;
}

describe('REL-016: the mutation boundary and the trust boundary', () => {
  it('only the game store sets its state; nothing assigns into the live game it hands out', () => {
    expect(hits(/useGame\.setState\(/, (p) => p === 'src/state/game.ts')).toEqual([]);
    expect(hits(/(getGame\(\)!?|useGame\.getState\(\)\.game!?)(\.[\w$]+|\[[^\]]+\])+\s*(=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/)).toEqual([]);
    expect(hits(/Object\.assign\(\s*(getGame\(\)|useGame\.getState\(\)\.game)/)).toEqual([]);
  });

  it('the render frame loop never writes game state (input handlers may)', () => {
    const bad = SOURCES.filter((f) => f.path.startsWith('src/render/') || f.path.startsWith('src/ai/')).flatMap((f) =>
      useFrameBodies(code(f.text))
        .filter((b) => /\b(mutate|mutateFast|setGame|dispatch)\(/.test(b))
        .map((b) => `${f.path}: ${b.slice(0, 80)}`),
    );
    expect(bad).toEqual([]);
  });

  it('chunk 11 (SHARED-SHOPS.md §4.2): player actions are commands; outside the dispatcher, the marks, the loop, the shared replica, persistence and the dev tools nothing writes the store', () => {
    const writers = (p: string) =>
      p === 'src/state/game.ts' || // the store itself
      p === 'src/game/dispatch.ts' || // the solo dispatcher: every player action, as a command
      p === 'src/ui/common/marks.ts' || // each player's own "seen" marks (§3.2 rule 8)
      p === 'src/game/GameLoop.tsx' ||
      p === 'src/game/fastMutate.ts' ||
      p === 'src/game/sharedLoop.ts' ||
      p === 'src/persistence/session.ts' || // load, and the flush before a save
      p === 'src/persistence/offline.ts' || // the hidden-tab catch-up (mutateFast only: checked below)
      p.startsWith('src/dev/') ||
      p.startsWith('src/ui/dev/') || // dev tools aren't commands (§4.1)
      p.startsWith('src/sim/'); // takes the state as an argument; can't reach the store
    expect(hits(/\.mutate\b|\bmutateGame\b|\bmutateFast\b/, writers)).toEqual([]);
    // the catch-up's file writes only through mutateFast: the welcome-back card's resume is a command
    expect(hits(/\.mutate\b|\bmutateGame\b/, (p) => p !== 'src/persistence/offline.ts')).toEqual([]);
  });

  it('the UI reaches Social only through the SocialService (src/social/index.ts)', () => {
    expect(hits(/from ['"]@\/social\/(?!index)/, (p) => p.startsWith('src/social/'))).toEqual([]);
  });

  it('notifications, the clipboard and the share sheet only through src/platform', () => {
    const platform = (p: string) => p.startsWith('src/platform/');
    expect(hits(/new Notification\(|Notification\.requestPermission|navigator\.clipboard|navigator\.share\b/, platform)).toEqual([]);
  });

  it('the checks can fail', () => {
    expect(/useGame\.setState\(/.test('useGame.setState({ game: g })')).toBe(true);
    expect(/(getGame\(\)!?|useGame\.getState\(\)\.game!?)(\.[\w$]+|\[[^\]]+\])+\s*(=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/.test('getGame()!.finance.money += 5')).toBe(true);
    expect(useFrameBodies('useFrame((s, d) => { if (x) useGame.getState().mutate((g) => g); }, -1); foo()')[0]).toMatch(/mutate\(/);
    expect(/\.mutate\b|\bmutateGame\b|\bmutateFast\b/.test('const mutate = useGame.getState().mutate;')).toBe(true);
  });

  it('docs/agent/TRUST_BOUNDARY.md lists the state changes a future server would authorise', () => {
    const doc = readFileSync(join(ROOT, 'docs', 'agent', 'TRUST_BOUNDARY.md'), 'utf8');
    for (const heading of ['Purchases', 'Sales and listings', 'Production lines', 'Staff', 'Research', 'Shows', 'Social']) expect(doc).toContain(`## ${heading}`);
    // every sim function a player action calls is named there (the fresh review found four missing). Since chunk 11
    // every player action is a command (SHARED-SHOPS.md §4.1), and applyAction (src/sim/commands/apply.ts) makes each
    // of those calls, `fn(state, …)`
    const apply = SOURCES.find((f) => f.path === 'src/sim/commands/apply.ts')!;
    const called = new Set<string>();
    for (const m of code(apply.text).matchAll(/\b(\w+)\(state[,)]/g)) called.add(m[1]);
    expect(called.size).toBeGreaterThan(70);
    expect([...called].filter((n) => !doc.includes(`\`${n}\``)).sort()).toEqual([]);
  });
});
