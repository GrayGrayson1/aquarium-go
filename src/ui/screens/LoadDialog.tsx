/**
 * Save-slot picker (title "Load" + settings). OWNER: lane "ui-shell".
 */
import { useEffect, useState } from 'react';
import { FolderOpen, Trash, Fish, Box, Calendar } from 'lucide-react';
import { Modal, Button, Empty, formatMoney } from '../kit';
import { listSlots, loadIntoGame, deleteSlot, timeAgo, slotLabel, watchSaves, type SaveMeta } from '../common/saves';
import { speciesName } from '../common/format';
import { Portrait } from '../common/Portrait';
import { useUI } from '@/state/ui';
import { toastMark, reportLoadFailure } from './loadFeedback'; // lane:guide

/**
 * `promotes`: the slot's "Previous …" entry (a different aquarium in its backup). Deleting the slot moves that one into
 * it, so the delete confirm says so instead of letting the list reshuffle unannounced.
 */
export function SaveRow({ s, onLoad, onDelete, busy, promotes }: { s: SaveMeta; onLoad?: () => void; onDelete?: () => void; busy?: boolean; promotes?: SaveMeta }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="ag-saverow">
      <Portrait speciesId={s.starterId} shape="circle" className="ag-saverow__art" />
      <div className="ag-grow">
        <div className="ag-saverow__title">
          {s.shopName} <span className="ag-saverow__slot">{slotLabel(s.slot)}</span>
        </div>
        <div className="ag-saverow__meta">
          <span><Calendar size={12} aria-hidden /> Day {s.day}</span>
          {/* lane:qa-play — was "1 · Betta": say what the number counts */}
          <span><Fish size={12} aria-hidden /> {s.creatures} animal{s.creatures === 1 ? '' : 's'} · {speciesName(s.starterId)} starter</span>
          <span><Box size={12} aria-hidden /> {s.tanks} tank{s.tanks === 1 ? '' : 's'}</span>
          <span>{formatMoney(s.money)}</span>
          <span className="ag-muted">{timeAgo(s.savedAt)}</span>
        </div>
        {confirm && promotes && (
          <div className="ag-saverow__meta" role="note" data-testid="save-delete-promotes" style={{ color: 'var(--c-ink-2)' }}>
            {promotes.shopName} ({promotes.shopName === s.shopName && `${speciesName(promotes.starterId)} starter, `}{slotLabel(promotes.slot)}) {s.slot === 'auto' ? 'becomes the autosave' : `moves into ${slotLabel(s.slot)}`}.
          </div>
        )}
      </div>
      <div className="ag-row" style={{ gap: 6 }}>
        {onDelete &&
          (confirm ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Keep</Button>
              <Button size="sm" variant="danger" onClick={() => { setConfirm(false); onDelete(); }}>Delete</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" aria-label={`Delete ${s.shopName}`} onClick={() => setConfirm(true)}>
              <Trash size={14} />
            </Button>
          ))}
        {onLoad && !confirm && (
          <Button size="sm" variant="primary" onClick={onLoad} disabled={busy}>
            <FolderOpen size={14} /> Load
          </Button>
        )}
      </div>
    </div>
  );
}

export function LoadDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged?: () => void }) {
  const [saves, setSaves] = useState<SaveMeta[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    listSlots().then(setSaves);
    return watchSaves(() => listSlots().then(setSaves));
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Load an aquarium" subtitle="Saves live in this browser." width={620} testId="load-dialog">
      {saves == null ? (
        <div className="ag-muted">Looking for saves…</div>
      ) : saves.length === 0 ? (
        <Empty icon={<FolderOpen size={20} />}>No saved aquariums yet.</Empty>
      ) : (
        <div className="ag-savelist">
          {saves.map((s) => (
            <SaveRow
              key={s.slot}
              s={s}
              busy={busy}
              promotes={s.previousOf ? undefined : saves.find((p) => p.previousOf === s.slot)}
              onLoad={async () => {
                setBusy(true);
                const mark = toastMark(); // lane:guide — one message per failure (see ./loadFeedback)
                const g = await loadIntoGame(s.slot);
                setBusy(false);
                if (g) {
                  useUI.getState().set({ panel: null });
                  onClose();
                } else reportLoadFailure(mark);
              }}
              onDelete={async () => {
                await deleteSlot(s.slot);
                // lane:guide — deleteSlot swallows storage errors; if the same save is still listed, say so
                const after = await listSlots();
                setSaves(after);
                onChanged?.();
                if (after.some((x) => x.slot === s.slot && x.savedAt === s.savedAt && x.shopName === s.shopName)) useUI.getState().toast('That save couldn’t be deleted — the browser refused the change. Please try again.', 'warning');
              }}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
