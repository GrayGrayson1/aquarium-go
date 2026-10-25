/**
 * The scenario lab's root (chunk 15, ADR-0051), mounted by App.tsx only where the developer tools are allowed: the lab
 * screen when it's open (its own chunk), and, while a scenario plays, a badge saying so ("not saved") with Start again
 * and the way back to the lab.
 */
import { lazy, Suspense, useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { useLab, openLab } from '@/state/lab';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSharedMode } from '@/state/sharedMode';
import { restartScenario } from './session';
import './lab.css';

const ScenarioLab = lazy(() => import('./ScenarioLab'));

function ScenarioBadge({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  const restart = () => {
    if (busy) return;
    setBusy(true);
    restartScenario()
      .catch((e: unknown) => useUI.getState().toast((e as Error).message, 'warning'))
      .finally(() => setBusy(false));
  };
  return (
    <div className="ag-labbadge" data-testid="lab-badge" role="status">
      <FlaskConical size={14} aria-hidden />
      <span className="ag-labbadge__text">
        Scenario: <b>{name}</b> <span className="ag-labbadge__muted">· not saved</span>
      </span>
      <button type="button" className="ag-labbadge__btn" onClick={restart} disabled={busy} data-testid="lab-restart" title="Build this scenario again from its recipe">
        <RotateCcw size={13} aria-hidden /> Start again
      </button>
      <button type="button" className="ag-labbadge__btn" onClick={openLab} data-testid="lab-badge-open">
        Lab
      </button>
    </div>
  );
}

export default function LabRoot() {
  const open = useLab((s) => s.open);
  const scenario = useLab((s) => s.scenario);
  const saveId = useGame((s) => s.game?.saveId);
  const screen = useUI((s) => s.screen);
  const shared = useSharedMode((s) => s.club !== null);
  return (
    <>
      {open && !shared && (
        <Suspense fallback={null}>
          <ScenarioLab />
        </Suspense>
      )}
      {!open && scenario && saveId === scenario.saveId && screen === 'game' && <ScenarioBadge name={scenario.name} />}
    </>
  );
}
