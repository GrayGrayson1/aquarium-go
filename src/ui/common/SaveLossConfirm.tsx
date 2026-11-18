/**
 * Audit 2026-11-17, I3 (the owner's decision, "Save it to a free slot"): a switch of aquarium parks what it would push
 * out of every save in a free slot by itself (src/ui/common/saves.ts, keepAutosavedCopies); with every slot full, this
 * box asks before anything is deleted. Cancel leaves everything as it was. OWNER: lane "ui-shell".
 */
import { Button, Modal } from '../kit';
import { lossLine, useSaveLoss } from './saves';

export function SaveLossConfirm() {
  const ask = useSaveLoss((s) => s.ask);
  const many = (ask?.lost.length ?? 0) > 1;
  return (
    <Modal
      open={!!ask}
      onClose={() => ask?.answer(false)}
      title="Every save slot is full"
      width={460}
      testId="save-loss-confirm"
      actions={
        <>
          <Button variant="ghost" onClick={() => ask?.answer(false)} data-testid="save-loss-cancel">
            Cancel
          </Button>
          <Button variant="danger" onClick={() => ask?.answer(true)} data-testid="save-loss-delete">
            Delete and continue
          </Button>
        </>
      }
    >
      {ask?.lost.map((m) => (
        <p key={m.slot} style={{ margin: '0 0 8px' }}>
          {lossLine(m)}
        </p>
      ))}
      <p className="ag-muted" style={{ margin: 0 }}>
        {many ? 'To keep them, cancel and free slots in Settings › Saves first.' : 'To keep it, cancel and free a slot in Settings › Saves first.'}
      </p>
    </Modal>
  );
}
