/**
 * chunk 13 — the shared dispatcher (SHARED-SHOPS.md §4.2): installed on the game store while a shared shop is open, in
 * place of the solo one. A player action becomes a `cmd` to the server; `dispatch` returns undefined, and the action's
 * `done` (the `act` helpers' toast, sound and follow-up) gets the command's result once the step that carries it has
 * been applied to this copy, the same result every copy computed. Also:
 *
 * - a `reject` settles as not applied, with its words (§8: too many actions, a failure on the server, or pause and speed
 *   without permission);
 * - a command no step settled when its connection dropped settles as not applied (a fresh snapshot shows the shop as it
 *   is), as does one sent while the shop isn't connected;
 * - a command sent before this copy asked for the shop again (out of step, or behind) was applied in the steps that
 *   snapshot covers, which this copy skipped: it settles when the snapshot lands, as done with no result of its own;
 * - a `raiseFlag` the shop already has settles at once and isn't sent (the server would answer nothing);
 * - pause and speed without permission aren't sent;
 * - a control that sends many values (a slider dragged, an amount typed) sends at most about 4 a second, the last one
 *   always, and every value it held back settles with the result of the one sent after it;
 * - a setting another member changed in the last 30 seconds says so on the sender's screen ("{name} already changed
 *   that.").
 *
 * OWNER: lane "social".
 */
import type { Command, CommandResult } from '@/sim/commands';
import { settingKey } from '@/sim/commands';
import type { Dispatch } from '@/state/game';
import { useGame } from '@/state/game';
import type { RejectReason } from '@/types/shared';
import type { SharedStep } from '@/sim/sharedStep';
import { SHARED_WORDS as W } from './words';

/** What the dispatcher needs from the connection. */
export interface SharedSender {
  /** The command's id, or null when the shop isn't connected. */
  send(c: Command): number | null;
  /** The account id the server knows this player by. */
  readonly you: string;
}

export interface SharedDispatchDeps {
  sender: () => SharedSender | null;
  /** May this player pause and change the speed (§5.4)? */
  mayPause: () => boolean;
  /** The owner's name for the refusal ("Only {owner} and the people they choose…"). */
  ownerName: () => string;
  /** Show a line (the setting note). */
  note: (text: string) => void;
  now: () => number;
  after: (ms: number, fn: () => void) => () => void;
}

type Done = (r: CommandResult | null) => void;

/** §4.2: at most about 4 values a second per control. */
export const COALESCE_MS = 250;

/** A control that sends many values: the settings a slider or a typed amount changes, one key per control. */
export function coalesceKey(cmd: Command): string | null {
  let continuous = false;
  switch (cmd.k) {
    case 'setAdmission':
    case 'setStockBudget':
      continuous = true;
      break;
    case 'setEquipment':
      continuous = cmd.setting !== undefined && cmd.on === undefined;
      break;
    case 'setLighting':
      continuous = cmd.preset === undefined && cmd.moonlight === undefined;
      break;
  }
  if (!continuous) return null;
  const key = settingKey(cmd);
  return key && `${key}:${Object.keys(cmd).sort().join(',')}`;
}

const notApplied = (message: string): CommandResult => ({ ok: false, message });

/** Applied in steps this copy skipped (a re-sync's snapshot holds it), so its own result isn't known here. */
export const APPLIED_UNSEEN: CommandResult = { ok: true, message: '', noResult: true };

/** Call each `done`; one that throws doesn't keep the rest from their result. */
function settleAll(dones: readonly Done[], res: CommandResult | null): void {
  for (const d of dones) {
    try {
      d(res);
    } catch (e) {
      console.warn('[shared] a follow-up failed', e);
    }
  }
}

export class SharedDispatcher {
  /** Commands sent and not yet settled, by id; each with the held-back values it stands for. */
  private readonly pending = new Map<number, Done[]>();
  /** Per control: when it last sent, and the newest value waiting to go. */
  private readonly controls = new Map<string, { sentAt: number; waiting: { cmd: Command; done: Done[] } | null; cancel: (() => void) | null }>();
  /** Commands pending when this copy asked for the shop again: the snapshot that answers it holds them. */
  private beforeResync: Set<number> | null = null;

  constructor(private readonly deps: SharedDispatchDeps) {}

  readonly dispatch: Dispatch = (cmd, done) => {
    const settle: Done = done ?? (() => {});
    const g = useGame.getState().game;
    if (!g) {
      settle(null);
      return undefined;
    }
    if (cmd.k === 'setSpeed' && !this.deps.mayPause()) {
      settle(notApplied(W.notAllowed(this.deps.ownerName())));
      return undefined;
    }
    // §4.3: the shop raises each guide flag once, and the server answers a repeat with nothing at all
    if (cmd.k === 'raiseFlag' && Object.hasOwn(g.progress?.tutorial?.flags ?? {}, cmd.name)) {
      settle({ ok: true, message: '', noResult: true });
      return undefined;
    }
    const key = coalesceKey(cmd);
    if (key) this.coalesce(key, cmd, settle);
    else this.sendNow(cmd, [settle]);
    return undefined;
  };

  /** A step was applied here: settle this player's commands in it, in `cmds` order. */
  settleStep(step: SharedStep, results: readonly CommandResult[]): void {
    const you = this.deps.sender()?.you;
    if (!you || !step.cmds) return;
    step.cmds.forEach((sc, i) => {
      if (sc.by !== you || sc.id === undefined) return;
      const dones = this.pending.get(sc.id);
      if (!dones) return;
      this.pending.delete(sc.id);
      const res = results[i] ?? null;
      if (res?.ok && res.noteBy) this.deps.note(W.changedThat(res.noteBy));
      settleAll(dones, res);
    });
  }

  /** This copy asked for the shop again: everything sent so far reaches the server before that request. */
  resyncAsked(): void {
    this.beforeResync = new Set([...(this.beforeResync ?? []), ...this.pending.keys()]);
  }

  /** A snapshot replaced the copy: what was sent before the re-sync is in it, its steps skipped here. */
  resynced(): void {
    const ids = this.beforeResync;
    this.beforeResync = null;
    if (!ids) return;
    for (const id of ids) {
      const dones = this.pending.get(id);
      if (!dones) continue;
      this.pending.delete(id);
      settleAll(dones, APPLIED_UNSEEN);
    }
  }

  /** The server didn't apply one of this player's commands (§3.3). */
  reject(id: number, why: RejectReason): void {
    const dones = this.pending.get(id);
    if (!dones) return;
    this.pending.delete(id);
    const message = why === 'rate' ? W.tooFast : why === 'forbidden' ? W.notAllowed(this.deps.ownerName()) : W.failed;
    settleAll(dones, notApplied(message));
  }

  /** The connection dropped: what it carried and no step settled may or may not have happened; it settles as not applied. */
  dropped(): void {
    const all = [...this.pending.values()].flat();
    this.pending.clear();
    for (const c of this.controls.values()) {
      c.cancel?.();
      if (c.waiting) all.push(...c.waiting.done);
    }
    this.controls.clear();
    this.beforeResync = null;
    settleAll(all, null);
  }

  /** Leaving the shop: nothing more will settle. */
  close(): void {
    this.dropped();
  }

  private sendNow(cmd: Command, dones: Done[]): void {
    const id = this.deps.sender()?.send(cmd) ?? null;
    if (id === null) {
      settleAll(dones, null);
      return;
    }
    this.pending.set(id, dones);
  }

  private coalesce(key: string, cmd: Command, done: Done): void {
    const now = this.deps.now();
    let c = this.controls.get(key);
    if (!c) {
      c = { sentAt: -Infinity, waiting: null, cancel: null };
      this.controls.set(key, c);
    }
    if (!c.waiting && now - c.sentAt >= COALESCE_MS) {
      c.sentAt = now;
      this.sendNow(cmd, [done]);
      return;
    }
    // hold the newest value; the ones it replaces settle with its result
    c.waiting = { cmd, done: [...(c.waiting?.done ?? []), done] };
    if (c.cancel) return;
    const ctl = c;
    ctl.cancel = this.deps.after(Math.max(0, ctl.sentAt + COALESCE_MS - now), () => {
      ctl.cancel = null;
      const w = ctl.waiting;
      ctl.waiting = null;
      if (!w) return;
      ctl.sentAt = this.deps.now();
      this.sendNow(w.cmd, w.done);
    });
  }
}
