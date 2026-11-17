/**
 * Audit 2026-11-17, the review of I2: an in-app Reload that would lose play (Autosave off) asks here first: "Save now
 * and reload" or "Reload anyway" (src/ui/common/reload.ts). OWNER: lane "ui-shell".
 */
import { Button, Modal } from '../kit';
import { RELOAD_WORDS as R, reloadAnyway, saveThenReload, useReloadAsk } from './reload';

export function ReloadConfirm() {
  const { open, failed, busy } = useReloadAsk();
  const close = () => useReloadAsk.setState({ open: false, failed: false, busy: false });
  const save = async () => {
    useReloadAsk.setState({ busy: true });
    if (!(await saveThenReload())) useReloadAsk.setState({ failed: true, busy: false });
  };
  return (
    <Modal
      open={open}
      onClose={close}
      testId="reload-confirm"
      labelledBy="reload-confirm-text"
      width={440}
      actions={
        <>
          <Button variant="ghost" disabled={busy} onClick={reloadAnyway} data-testid="reload-confirm-anyway">
            {R.reloadAnyway}
          </Button>
          {!failed && (
            <Button variant="primary" disabled={busy} onClick={() => void save()} data-testid="reload-confirm-save">
              {R.saveAndReload}
            </Button>
          )}
        </>
      }
    >
      <p style={{ margin: 0 }} id="reload-confirm-text">
        {failed ? R.saveFailed : R.offLine}
      </p>
    </Modal>
  );
}
