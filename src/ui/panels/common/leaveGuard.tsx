/**
 * Audit 2026-11-17, B6 — a sub-view holding the player's own work (the listing wizard, once prices are typed or a
 * photo is taken) asks before anything throws it away: Back or Forward (the router asks before applying the address,
 * and Keep editing puts the wizard's address back), and the panel's ×, Escape or a drag, another panel, a card or a
 * link (a store change that would close the panel or send it a new command is put back while the player answers).
 * One guard at a time, with its own words. OWNER: lane "ui-panels".
 */
import { create } from 'zustand';
import { useUI, type PanelId, type UIState } from '@/state/ui';
import { Button, Modal } from '@/ui/kit';

export interface LeaveGuard {
  /** The panel the guarded sub-view lives in. */
  panel: PanelId;
  title: string;
  detail: string;
}

interface LeaveState {
  guard: LeaveGuard | null;
  /** The way out waiting for an answer, and what Keep editing does besides staying (the router: the address). */
  pending: { leave: () => void; keep?: () => void } | null;
}

export const useLeave = create<LeaveState>(() => ({ guard: null, pending: null }));

let unsub: (() => void) | null = null;
let restoring = false;

/** Hold (or, with null, drop) the guard. */
export function setLeaveGuard(g: LeaveGuard | null): void {
  useLeave.setState(g ? { guard: g } : { guard: null, pending: null });
  if (g && !unsub) unsub = useUI.subscribe(onUI);
  if (!g && unsub) {
    unsub();
    unsub = null;
  }
}

/** Run `leave` now, or, while a guard holds, ask first (the latest way out waits). True when it ran. */
export function guardLeave(leave: () => void, keep?: () => void): boolean {
  if (!useLeave.getState().guard) {
    leave();
    return true;
  }
  useLeave.setState({ pending: { leave, keep } });
  return false;
}

/** The player's answer: Leave drops the guard and goes; Keep editing stays. */
export function answerLeave(leave: boolean): void {
  const { pending } = useLeave.getState();
  if (leave) {
    setLeaveGuard(null);
    pending?.leave();
  } else {
    useLeave.setState({ pending: null });
    pending?.keep?.();
  }
}

/** A store change that would close the guarded panel, or send it a command (which closes the sub-view): put it back, ask. */
function onUI(s: UIState, p: UIState): void {
  const g = useLeave.getState().guard;
  if (!g || restoring || p.panel !== g.panel) return;
  // (a bottom sheet stepping aside for a tool it started is not leaving: common/aside.ts)
  const leaving = s.panel !== g.panel && s.panelAside !== g.panel;
  const command = s.panel === g.panel && !!s.panelTarget && s.panelTarget !== p.panelTarget;
  if (!leaving && !command) return;
  const want = { panel: s.panel, panelTarget: s.panelTarget };
  restoring = true;
  try {
    useUI.getState().set({ panel: g.panel, panelTarget: null });
  } finally {
    restoring = false;
  }
  guardLeave(() => useUI.getState().set(want));
}

/** The question, while one waits (rendered by the guarded sub-view). */
export function LeaveConfirm() {
  const guard = useLeave((s) => s.guard);
  const open = useLeave((s) => !!s.pending);
  return (
    <Modal
      open={open && !!guard}
      onClose={() => answerLeave(false)}
      title={guard?.title}
      width={380}
      testId="leave-confirm"
      actions={
        <>
          <Button data-testid="leave-keep" onClick={() => answerLeave(false)}>
            Keep editing
          </Button>
          <Button variant="coral" data-testid="leave-go" onClick={() => answerLeave(true)}>
            Leave
          </Button>
        </>
      }
    >
      <p className="pn-small" style={{ margin: 0 }}>
        {guard?.detail}
      </p>
    </Modal>
  );
}
