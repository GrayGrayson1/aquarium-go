/**
 * lane:core (chunk 6; B-002, ADR-0029 decision 1) — the banner when the simulation keeps failing: "Something went wrong —
 * your aquarium is paused. Save and reload." with Save (the last good world: a failed step publishes nothing) and
 * Reload. The loop has stopped (src/game/simHealth.ts); another aquarium coming on screen starts it again. OWNER: core.
 */
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { useSimHealth } from '@/game/simHealth';
import { saveNow } from './saves';

export const SIM_FAILURE_TEXT = 'Something went wrong — your aquarium is paused. Save and reload.';

export function SimFailureBanner() {
  const stopped = useSimHealth((s) => s.stopped);
  const inGame = useUI((s) => s.screen === 'game');
  if (!stopped || !inGame) return null;
  return (
    <div className="ag-simfail" role="alert" data-testid="sim-failure">
      <TriangleAlert size={18} aria-hidden className="ag-simfail__icon" />
      <span className="ag-simfail__text">{SIM_FAILURE_TEXT}</span>
      <span className="ag-simfail__actions">
        <Button size="sm" onClick={() => void saveNow('auto', true)} data-testid="sim-failure-save">
          Save
        </Button>
        <Button size="sm" variant="primary" onClick={() => location.reload()} data-testid="sim-failure-reload">
          Reload
        </Button>
      </span>
    </div>
  );
}
