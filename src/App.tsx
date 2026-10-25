/**
 * Application shell. OWNER: core.
 * URL flags: ?showcase=<starterId> jumps straight into a starter's demo tank (never saved); where the developer tools
 * are allowed (a dev build; src/state/devTools.ts, ADR-0005 decision 2, REL-019), ?fixture=<name> boots a registry
 * fixture and ?sandbox=<name> renders src/dev/sandboxes/<name>.tsx instead of the game; chunk 15 (ADR-0051): ?lab=1 opens
 * the scenario lab, ?scenario=<preset> and ?recipe=<text> build a scenario. The live site ignores ?dev=1 and all of these.
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
import { devToolsAllowed, urlLabParams, urlSandboxName } from './state/devTools';
import { useLab } from './state/lab';

const sandboxModules = import.meta.glob('./dev/sandboxes/*.tsx');

// lane:perf2 — a non-starter ?fixture= needs the lazy registry: start fetching it now and hold __AQ.ready until the
// boot below has applied it (e2e/QA scripts wait for `ready` and then read the fixture's state).
// lane:core (PLAT-005, ADR-0005 decision 2) — a registry fixture is a developer tool (a rich world Settings › Saves
// could keep): it boots only where the tools are allowed (src/state/devTools.ts: a dev build, or a ?dev=1 session of the
// e2e-flagged production build; never the live site). A starter showcase is a plain demo world, never saved.
const URL_FIXTURE = typeof location !== 'undefined' ? urlFixtureName() : null;
const releaseUrlBoot = URL_FIXTURE && !isStarterFixture(URL_FIXTURE) ? holdReady() : null;
if (releaseUrlBoot) void loadFixtureRegistry().catch(() => undefined);

// chunk 15 (ADR-0051) — the scenario lab, only where the developer tools are allowed: its addresses, and the lab itself
// (its own chunk, with the scenario's badge in the game). A scenario address holds __AQ.ready like a fixture. The
// players' build (no VITE_E2E_DEV_URL) leaves the lab's code out altogether: LAB_BUILD is false there at build time.
const LAB_BUILD = import.meta.env.DEV || import.meta.env.VITE_E2E_DEV_URL === '1';
const URL_LAB = LAB_BUILD && typeof location !== 'undefined' ? urlLabParams() : null;
const URL_SCENARIO = !!(URL_LAB && (URL_LAB.scenario || URL_LAB.recipe));
const releaseLabBoot = URL_SCENARIO ? holdReady() : null;
const LAB = LAB_BUILD && typeof location !== 'undefined' && devToolsAllowed();
const LabRoot = LAB_BUILD ? lazy(() => import('./dev/lab/LabRoot')) : () => null;

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
    if (LAB_BUILD && URL_LAB && URL_SCENARIO) {
      import('./dev/lab/session')
        .then((m) => m.bootFromAddress(URL_LAB))
        .then((ok) => {
          if (!ok) toTitle();
        })
        .catch((e: unknown) => {
          console.error('[aquarium-go] could not build the scenario:', e);
          toTitle();
        })
        .finally(() => releaseLabBoot?.());
      return;
    }
    if (URL_LAB?.lab) useLab.setState({ open: true });
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
  const sandbox = urlSandboxName(); // chunk 7 (REL-019): a developer tool, so not on the live site
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
      {LAB && (
        <ErrorBoundary name="scenario lab" fallback={null}>
          <Suspense fallback={null}>
            <LabRoot />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

export const LazySuspense = ({ children }: { children: React.ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;
export { lazy };
