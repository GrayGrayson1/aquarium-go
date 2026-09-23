/**
 * Wrench button for the top bar (only when dev mode is on). OWNER: lane "ui-shell".
 * lane:perf — lives apart from DevPanel.tsx so the dev tools themselves stay in their own lazily loaded chunk.
 */
import clsx from 'clsx';
import { Wrench } from 'lucide-react';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';

/** Wrench button (lives in the top bar) — only when dev mode is on. */
export function DevToggle() {
  const devMode = useSettings((s) => s.devMode);
  const open = useUI((s) => s.panel === 'dev');
  if (!devMode) return null;
  return (
    <button
      type="button"
      className={clsx('ag-hudpill ag-devbtn', open && 'is-on')}
      aria-label="Developer tools"
      title="Developer tools"
      data-testid="dev-toggle"
      onClick={() => {
        sfx(open ? 'close' : 'open');
        useUI.getState().set({ panel: open ? null : 'dev' });
      }}
    >
      <Wrench size={17} />
    </button>
  );
}
