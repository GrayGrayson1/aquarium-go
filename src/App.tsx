/**
 * Application shell. OWNER: core.
 * URL flags (dev): ?showcase=<starterId> | ?fixture=<name> jump straight into a tank; ?dev=1 enables the debug panel;
 * ?sandbox=<name> renders src/dev/sandboxes/<name>.tsx instead of the game.
 */
import { useEffect, useState, lazy, Suspense, type ComponentType } from 'react';
import { Scene } from './render/Scene';
import { UIRoot } from './ui/UIRoot';
import { GameLoop } from './game/GameLoop';
import { AudioRoot } from './audio/AudioRoot';
import { useGame } from './state/game';
import { useUI } from './state/ui';
import { useSettings } from './state/settings';
// lane:perf2 — the fixture registry is loaded on demand (its own chunk); starter showcases are built directly.
import { makeShowcase } from './dev/fixtures/showcase';
import { loadFixtureRegistry, isStarterFixture, holdReady } from './dev/fixtures/lazy';
import type { GameState } from './types';
import { ErrorBoundary } from './app/ErrorBoundary';

const sandboxModules = import.meta.glob('./dev/sandboxes/*.tsx');

// lane:perf2 — a non-starter ?fixture= needs the lazy registry: start fetching it now and hold __AQ.ready until the
// boot below has applied it (e2e/QA scripts wait for `ready` and then read the fixture's state).
const URL_QUERY = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
const URL_FIXTURE = URL_QUERY ? (URL_QUERY.get('fixture') ?? URL_QUERY.get('showcase')) : null;
const releaseUrlBoot = URL_FIXTURE && !isStarterFixture(URL_FIXTURE) ? holdReady() : null;
if (releaseUrlBoot) void loadFixtureRegistry().catch(() => undefined);

function useUrlBoot() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('dev') === '1') useSettings.getState().update({ devMode: true });
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
