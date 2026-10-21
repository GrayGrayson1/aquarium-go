// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §4.2, §4.3, §8; SHARE-006, SHARE-013, SHARE-017): the shared dispatcher on its own, with
 * a fake sender and clock. A command settles from the step that carries this player's `{by, id}`, in `cmds` order,
 * never from someone else's; a reject settles it with its approved words; a dropped connection settles what it
 * carried as not applied; a known guide flag and a refused pause never reach the server; a dragged control sends at
 * most about four values a second and ends on its last, every held-back value settling with the one sent after it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Command, CommandResult } from '@/sim/commands';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { COALESCE_MS, SharedDispatcher, coalesceKey } from '@/ui/shared/dispatch';
import { SHARED_WORDS } from '@/ui/shared/words';

class Rig {
  t = 0;
  sent: { id: number; c: Command }[] = [];
  open = true;
  pause = false;
  notes: string[] = [];
  private timers: { at: number; fn: () => void; live: boolean }[] = [];
  private nextId = 1;
  readonly disp = new SharedDispatcher({
    sender: () => ({
      you: 'u_a',
      send: (c) => {
        if (!this.open) return null;
        const id = this.nextId++;
        this.sent.push({ id, c });
        return id;
      },
    }),
    mayPause: () => this.pause,
    ownerName: () => 'Sam',
    note: (t) => this.notes.push(t),
    now: () => this.t,
    after: (ms, fn) => {
      const x = { at: this.t + ms, fn, live: true };
      this.timers.push(x);
      return () => {
        x.live = false;
      };
    },
  });
  advance(ms: number): void {
    const end = this.t + ms;
    for (;;) {
      const due = this.timers.filter((x) => x.live && x.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.t = due.at;
      due.live = false;
      due.fn();
    }
    this.t = end;
  }
  dispatch(c: Command): { got: CommandResult | null | undefined } {
    const box: { got: CommandResult | null | undefined } = { got: undefined };
    expect(this.disp.dispatch(c, (r) => (box.got = r))).toBeUndefined();
    return box;
  }
}

const ok = (message: string): CommandResult => ({ ok: true, message });

beforeEach(() => useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Blue', seed: 5 })));
afterEach(() => useGame.getState().setGame(null));

describe('chunk 13: the shared dispatcher', () => {
  it("settles a command from the step that carries this player's id, in cmds order, and not from another's", () => {
    const r = new Rig();
    const a = r.dispatch({ k: 'renameTank', tank: 't1', name: 'A' });
    const b = r.dispatch({ k: 'renameTank', tank: 't2', name: 'B' });
    const [ia, ib] = r.sent.map((s) => s.id);
    // another member's command with the same id settles nothing here
    r.disp.settleStep({ n: 1, h: 0, cmds: [{ by: 'u_b', id: ia, c: { k: 'renameTank', tank: 't1', name: 'X' } }] }, [ok('x')]);
    expect(a.got).toBeUndefined();
    r.disp.settleStep(
      {
        n: 2,
        h: 0,
        cmds: [
          { by: 'u_a', id: ib, c: r.sent[1].c },
          { by: 'u_a', id: ia, c: r.sent[0].c },
        ],
      },
      [ok('second'), ok('first')],
    );
    expect(b.got).toEqual(ok('second'));
    expect(a.got).toEqual(ok('first'));
  });

  it("a reject settles with §8's words: too many actions, a failure on the server, pause without permission", () => {
    const r = new Rig();
    const rate = r.dispatch({ k: 'renameTank', tank: 't1', name: 'A' });
    const failed = r.dispatch({ k: 'renameTank', tank: 't2', name: 'B' });
    const forbidden = r.dispatch({ k: 'renameTank', tank: 't3', name: 'C' });
    r.disp.reject(r.sent[0].id, 'rate');
    r.disp.reject(r.sent[1].id, 'malformed');
    r.disp.reject(r.sent[2].id, 'forbidden');
    expect(rate.got).toEqual({ ok: false, message: SHARED_WORDS.tooFast });
    expect(failed.got).toEqual({ ok: false, message: SHARED_WORDS.failed });
    expect(forbidden.got).toEqual({ ok: false, message: SHARED_WORDS.notAllowed('Sam') });
    expect(SHARED_WORDS.tooFast).toBe('Slow down a little: that was a lot of actions at once.');
    expect(SHARED_WORDS.notAllowed('Sam')).toBe('Only Sam and the people they choose can pause or change the speed.');
  });

  it('pause and speed without permission are refused here and never sent; with it they go', () => {
    const r = new Rig();
    expect(r.dispatch({ k: 'setSpeed', speed: 0 }).got).toEqual({ ok: false, message: SHARED_WORDS.notAllowed('Sam') });
    expect(r.sent).toEqual([]);
    r.pause = true;
    r.dispatch({ k: 'setSpeed', speed: 3 });
    expect(r.sent.map((s) => s.c)).toEqual([{ k: 'setSpeed', speed: 3 }]);
  });

  it('a guide flag the shop already has settles at once and is never sent (the server would answer nothing)', () => {
    const r = new Rig();
    useGame.getState().mutate((d) => {
      d.progress.tutorial.flags.opened_market = true;
    });
    expect(r.dispatch({ k: 'raiseFlag', name: 'opened_market' }).got).toEqual({ ok: true, message: '', noResult: true });
    r.dispatch({ k: 'raiseFlag', name: 'opened_shows' });
    expect(r.sent.map((s) => s.c)).toEqual([{ k: 'raiseFlag', name: 'opened_shows' }]);
  });

  it('a dropped connection settles what it carried as not applied; a command with no connection settles at once', () => {
    const r = new Rig();
    const a = r.dispatch({ k: 'renameTank', tank: 't1', name: 'A' });
    r.disp.dropped();
    expect(a.got).toBeNull();
    r.open = false;
    expect(r.dispatch({ k: 'renameTank', tank: 't1', name: 'B' }).got).toBeNull();
    // and no game at all
    useGame.getState().setGame(null);
    expect(r.dispatch({ k: 'renameTank', tank: 't1', name: 'C' }).got).toBeNull();
  });

  it("a setting another member changed in the last 30 seconds says so on this player's screen", () => {
    const r = new Rig();
    const a = r.dispatch({ k: 'renameTank', tank: 't1', name: 'A' });
    r.disp.settleStep({ n: 1, h: 0, cmds: [{ by: 'u_a', id: r.sent[0].id, c: r.sent[0].c }] }, [{ ok: true, message: 'Renamed.', noteBy: 'Sam' }]);
    expect(a.got?.ok).toBe(true);
    expect(r.notes).toEqual([SHARED_WORDS.changedThat('Sam')]);
    expect(SHARED_WORDS.changedThat('Sam')).toBe('Sam already changed that.');
  });

  it('a dragged control sends at most about 4 values a second and always its last; held-back values settle with it', () => {
    const r = new Rig();
    const boxes = [10, 11, 12, 13, 14].map((amount) => {
      const box = r.dispatch({ k: 'setStockBudget', amount });
      r.advance(40);
      return box;
    });
    // the first went at once; the rest wait for the window, and only the newest is sent
    expect(r.sent.map((s) => (s.c as { amount: number }).amount)).toEqual([10]);
    r.advance(COALESCE_MS);
    expect(r.sent.map((s) => (s.c as { amount: number }).amount)).toEqual([10, 14]);
    r.disp.settleStep({ n: 1, h: 0, cmds: [{ by: 'u_a', id: r.sent[0].id, c: r.sent[0].c }] }, [ok('ten')]);
    r.disp.settleStep({ n: 2, h: 0, cmds: [{ by: 'u_a', id: r.sent[1].id, c: r.sent[1].c }] }, [ok('fourteen')]);
    expect(boxes.map((b) => b.got?.message)).toEqual(['ten', 'fourteen', 'fourteen', 'fourteen', 'fourteen']);
    // a quiet control sends at once again
    r.advance(1000);
    r.dispatch({ k: 'setStockBudget', amount: 20 });
    expect(r.sent).toHaveLength(3);
  });

  it('only continuous controls are coalesced, one key per control', () => {
    expect(coalesceKey({ k: 'setStockBudget', amount: 3 })).not.toBeNull();
    expect(coalesceKey({ k: 'setAdmission', price: 3 })).not.toBeNull();
    expect(coalesceKey({ k: 'setEquipment', tank: 't', equip: 'e1', setting: 0.5 })).toBe(coalesceKey({ k: 'setEquipment', tank: 't', equip: 'e1', setting: 0.7 }));
    expect(coalesceKey({ k: 'setEquipment', tank: 't', equip: 'e1', setting: 0.5 })).not.toBe(coalesceKey({ k: 'setEquipment', tank: 't', equip: 'e2', setting: 0.5 }));
    expect(coalesceKey({ k: 'setEquipment', tank: 't', equip: 'e1', on: true })).toBeNull();
    expect(coalesceKey({ k: 'setLighting', tank: 't', intensity: 0.5 })).not.toBe(coalesceKey({ k: 'setLighting', tank: 't', onHour: 8 }));
    expect(coalesceKey({ k: 'setLighting', tank: 't', preset: 'daylight' as never })).toBeNull();
    expect(coalesceKey({ k: 'feedTank', tank: 't', food: 'f' })).toBeNull();
  });
});
