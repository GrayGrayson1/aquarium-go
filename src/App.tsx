/**
 * Application shell. OWNER: core.
 * URL flags (dev): ?showcase=<starterId> | ?fixture=<name> jump straight into a tank; ?dev=1 allows the developer
 * tools for this session only (src/state/devTools.ts, ADR-0005 decision 2); ?sandbox=<name> renders
 * src/dev/sandboxes/<name>.tsx instead of the game.
 */
import { useEffect, useState, lazy, Suspense, type ComponentType } from 'react';
import { Scene } from './render/Scene';
import { UIRoot } from './ui/UIRoot';
import { GameLoop } from './game/GameLoop';
import { AudioRoot } from './audio/AudioRoot';
import { useGame } from './state/game';
import { useUI } from './state/ui';
// lane:perf2 — the fixture registry is loaded on demand (its own chunk); starter showcases are built directly.
import { makeShowcase } from './dev/fixtures/showcase';
import { loadFixtureRegistry, isStarterFixture, holdReady } from './dev/fixtures/lazy';
import type { GameState } from './types';
import { urlFixtureName } from './game/useAutosave';
import { ErrorBoundary } from './app/ErrorBoundary';

const sandboxModules = import.meta.glob('./dev/sandboxes/*.tsx');

// lane:perf2 — a non-starter ?fixture= needs the lazy registry: start fetching it now and hold __AQ.ready until the
// boot below has applied it (e2e/QA scripts wait for `ready` and then read the fixture's state).
// lane:core (PLAT-005, ADR-0005 decision 2) — a registry fixture is a developer tool (a rich world Settings › Saves
// could keep): it boots only in a dev build or a ?dev=1 session. A starter showcase is a plain demo world, never saved.
const URL_FIXTURE = typeof location !== 'undefined' ? urlFixtureName() : null;
const releaseUrlBoot = URL_FIXTURE && !isStarterFixture(URL_FIXTURE) ? holdReady() : null;
if (releaseUrlBoot) void loadFixtureRegistry().catch(() => undefined);

function useUrlBoot() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    // lane:core (PLAT-005) — ?dev=1 is read by src/state/devTools.ts for this session; it is never saved to settings
    const fx = URL_FIXTURE;
    const toTitle = () => {
      if (useUI.getState().screen === 'boot') useUI.getState().set({ screen: 'title' });
    };
    const boot = (g: GameState) => {
      useGame.getState().setGame(g);
      const view = (q.get('view') as 'tank' | 'facility') ?? 'tank';
      useUI.getState().set({ screen: 'game', view, focusedTankId: g.tankOrder[0] ?? null });
    };
    if (fx && isStarterFixture(fx)) {
      boot(makeShowcase(fx));
      return;
    }
    if (fx) {
      loadFixtureRegistry()
        .then((reg) => {
          const build = reg[fx];
          if (build) boot(build());
          else toTitle();
        })
        .catch((e: unknown) => {
          console.error(`[aquarium-go] could not load fixture ${fx}:`, e);
          toTitle();
        })
        .finally(() => releaseUrlBoot?.());
      return;
    }
    toTitle();
  }, []);
}

export default function App() {
  useUrlBoot();
  const sandbox = new URLSearchParams(location.search).get('sandbox');
  const [Sandbox, setSandbox] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (!sandbox) return;
    const loader = sandboxModules[`./dev/sandboxes/${sandbox}.tsx`];
    if (loader) loader().then((m) => setSandbox(() => (m as { default: ComponentType }).default));
  }, [sandbox]);
  if (sandbox) return Sandbox ? <Sandbox /> : <div style={{ color: 'white' }}>Loading sandbox {sandbox}…</div>;
  return (
    <div className="app-root">
      <ErrorBoundary name="aquarium view">
        <Scene />
      </ErrorBoundary>
      <ErrorBoundary name="interface">
        <UIRoot />
      </ErrorBoundary>
      <GameLoop />
      <ErrorBoundary name="audio" fallback={null}>
        <AudioRoot />
      </ErrorBoundary>
    </div>
  );
}

export const LazySuspense = ({ children }: { children: React.ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;
export { lazy };
