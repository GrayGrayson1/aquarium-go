/**
 * All 2D UI. OWNER: lane "ui-shell".
 * Screens: title → starter reveal → naming → game HUD. Settings + dev tools + toasts are global.
 * The root never blocks the 3D canvas: it is pointer-events: none and only its controls receive input.
 */
import { useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { useDevMode } from '@/state/devTools';
import { registerDisplayFont } from './common/fonts';
import { ErrorBoundary } from './common/ErrorBoundary';
import { TitleScreen } from './screens/TitleScreen';
import { StarterReveal } from './screens/StarterReveal';
import { NamingScreen } from './screens/NamingScreen';
import { GameHUD } from './hud/GameHUD';
import { Toasts } from './hud/Toasts';
import { SettingsPanel } from './settings/SettingsPanel';
import { BootCard } from './nav/BootCard';
import { startRouter, useNav } from './nav/router';
import { applyPlatformStorage } from './platformBoot';
import './styles/shell.css';
import './styles/screens.css';
import './styles/hud.css';
import './styles/cards.css';
import './styles/genetics.css'; // lane:genetics
import './styles/nav.css'; // lane:ui-shell (chunk 1)

registerDisplayFont();
// lane:ui-shell (chunk 1, PLAT-003) — a platform with its own save backends (a native wrapper) hands them to persistence
// before anything reads a save; the web platform has none, so this does nothing on the web
applyPlatformStorage();

/** lane:perf — dev tools are code-split: players never download them unless dev mode is switched on. */
const DevPanel = lazy(() => import('./dev/DevPanel').then((m) => ({ default: m.DevPanel })));

/** Mirror accessibility settings onto <html> (text scale, contrast, reduced motion). */
function useDocumentSettings() {
  const textScale = useSettings((s) => s.textScale);
  const contrast = useSettings((s) => s.highContrast);
  const reduced = useSettings((s) => s.reducedMotion);
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--text-scale', String(Math.max(0.85, Math.min(1.4, textScale || 1))));
    if (contrast) el.setAttribute('data-contrast', 'high');
    else el.removeAttribute('data-contrast');
    el.setAttribute('data-reduced-motion', reduced ? 'true' : 'false');
  }, [textScale, contrast, reduced]);
}

export function UIRoot() {
  useDocumentSettings();
  // lane:ui-shell (chunk 1) — the hash router: links, Back/Forward, and the boot from a link or a reload (§6.4)
  useEffect(() => startRouter(), []);
  const booting = useNav((s) => !!s.boot);
  const screen = useUI((s) => s.screen);
  const reduced = useSettings((s) => s.reducedMotion);
  const devMode = useDevMode(); // lane:core (PLAT-005) — only where the developer tools are allowed
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className="ag-ui" data-screen={screen}>
        <AnimatePresence mode="wait">
          {(screen === 'title' || screen === 'boot') && (
            <ErrorBoundary key="title" name="title">
              {screen === 'title' && !booting ? <TitleScreen /> : null}
            </ErrorBoundary>
          )}
          {screen === 'starter' && (
            <ErrorBoundary key="starter" name="starter">
              <StarterReveal />
            </ErrorBoundary>
          )}
          {screen === 'naming' && (
            <ErrorBoundary key="naming" name="naming">
              <NamingScreen />
            </ErrorBoundary>
          )}
        </AnimatePresence>
        {screen === 'game' && (
          <ErrorBoundary name="hud">
            <GameHUD />
          </ErrorBoundary>
        )}
        <ErrorBoundary name="boot">
          <BootCard />
        </ErrorBoundary>
        <ErrorBoundary name="settings">
          <SettingsPanel />
        </ErrorBoundary>
        <ErrorBoundary name="dev">
          {devMode && (
            <Suspense fallback={null}>
              <DevPanel />
            </Suspense>
          )}
        </ErrorBoundary>
        <Toasts />
      </div>
    </MotionConfig>
  );
}
