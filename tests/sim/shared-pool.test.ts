// @vitest-environment node
/**
 * Chunk 14 (ADR-0050; PLAN.md chunk 14; SHARE-019 to SHARE-022, SHARE-024): the money pool and its tiers, through the
 * server's room and every member's replica, so each case also proves the copies stay in step (fingerprints and
 * `stateHash` after every exchange).
 *
 * - who may send what (`allowed`) for every tier and kind;
 * - a purchase over a member's money is refused before any copy sees it, with what it cost and what they had;
 * - a request asked, approved, declined, cancelled and spent; two approvers on one request (the first wins);
 * - an allowance topped up on a new game day and used before the approved money; quick purchases running it out;
 *   a gift used once;
 * - staff and the stock budget refused on every copy for a member who doesn't spend freely, care allowed;
 * - the owner flag comes from the server, never the browser; the pool's save repair.
 */
import { describe, it, expect } from 'vitest';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import type { ServerMessage, SharedYou } from '@/types/shared';
import { FIXTURES } from '@/dev/fixtures';
import { encodeRecord, decodeRecord } from '@/persistence/serialize';
import { stateHash } from '@/persistence/hash';
import { repairState } from '@/persistence/migrations';
import { deepClone } from '@/sim/clone';
import { dayIndex } from '@/sim/economy/util';
import { applyCommand, COMMAND_KINDS, type Command, type CommandResult } from '@/sim/commands';
import { allowanceLeft, canSpend, poolMember, CARE_KINDS, MAX_ASKS, MAX_EXTRA, POOL_FAILED_TEXT, RUNNING_COST_KINDS, RUNNING_COST_TEXT } from '@/sim/pool';
import { SharedReplica } from '@/game/sharedLoop';
import { Room, allowed, type Outgoing, type RoomIo } from '../../server/room';

const shop = (name = 'playthrough_betta'): GameState => decodeRecord(encodeRecord(FIXTURES[name](), 'shared', 0).text).state;
const OWNER: SharedYou = { id: 'o', name: 'Olive', owner: true, pause: true };
const MIA: SharedYou = { id: 'm', name: 'Mia', owner: false, pause: false };
const SAM: SharedYou = { id: 's', name: 'Sam', owner: false, pause: false };

type Steps = Extract<ServerMessage, { t: 'steps' }>;
type Reject = Extract<ServerMessage, { t: 'reject' }>;

/** A room with a replica per member; frames delivered at once; every command's result kept per sender. */
function harness(state: GameState) {
  let t = 0;
  let wall = Date.UTC(2026, 9, 21, 12);
  const frames: Outgoing[] = [];
  const io: RoomIo = { send: (o) => frames.push(o), gzip: (s) => gzipSync(s), later: (_, fn) => fn(), now: () => t, wall: () => wall };
  const room = new Room(state, io, { club: 'c1' });
  io.returned = (ms) => void room.catchUp(ms);
  const peers = new Map<string, { replica: SharedReplica; got: Outgoing[]; welcome: Extract<ServerMessage, { t: 'welcome' }> | null; bad: number; results: Map<number, CommandResult> }>();
  const deliver = () => {
    while (frames.length) {
      const f = frames.shift()!;
      for (const to of f.to) {
        const p = peers.get(to);
        if (!p) continue;
        p.got.push(f);
        if (f.kind === 'welcome') p.welcome = JSON.parse(f.text!);
        else if (f.kind === 'snapshot') {
          const body = Buffer.from(f.bin!.subarray(1));
          p.replica.load(JSON.parse(f.bin![0] === 1 ? gunzipSync(body).toString('utf8') : body.toString('utf8')) as GameState, p.welcome!.n, p.welcome!.full);
        } else if (f.kind === 'steps') p.replica.apply((JSON.parse(f.text!) as Steps).s);
      }
    }
  };
  const join = (you: SharedYou) => {
    const p = { replica: new SharedReplica((fn) => fn()), got: [] as Outgoing[], welcome: null as Extract<ServerMessage, { t: 'welcome' }> | null, bad: 0, results: new Map<number, CommandResult>() };
    p.replica.onCheck = (_, ok) => void (ok || p.bad++);
    // each of this member's commands settles from the step that carries it, as the shared dispatcher's do
    p.replica.onApplied = (step, results) =>
      (step.cmds ?? []).forEach((sc, i) => {
        if (sc.by === you.id && sc.id !== undefined && results[i]) p.results.set(sc.id, results[i]);
      });
    peers.set(you.id, p);
    room.join(you);
    deliver();
    return p;
  };
  let nextId = 1;
  /** A member sends a command; its result as their copy computed it, or its reject. */
  const cmd = (who: string, c: Command): { res?: CommandResult; reject?: Reject } => {
    const id = nextId++;
    room.handle(who, { t: 'cmd', id, c });
    room.flush();
    deliver();
    const p = peers.get(who)!;
    const reject = p.got.filter((f) => f.kind === 'reject').map((f) => JSON.parse(f.text!) as Reject).find((r) => r.id === id);
    return { res: p.results.get(id), reject };
  };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) {
      t += 250;
      wall += 250;
      room.tick();
      deliver();
    }
  };
  /** Every copy the same as the room's, and no fingerprint ever missed. */
  const settle = () => {
    room.flush();
    deliver();
    for (const [id, p] of peers) {
      expect(p.replica.n, id).toBe(room.n);
      expect(stateHash(p.replica.state!), id).toBe(stateHash(room.state));
      expect(p.bad, id).toBe(0);
    }
  };
  const copy = (who: string) => peers.get(who)!.replica.state!;
  return { room, join, cmd, tick, settle, copy, peers };
}

/** A food this shop can buy, and what one pack costs (measured on a copy, as the game prices it). */
function foodPack(g: GameState): { food: string; price: number } {
  for (const food of Object.keys(g.inventory.foods)) {
    const d = deepClone(g);
    const m0 = d.finance.money;
    if (applyCommand(d, { k: 'buyFood', food, packs: 1 }).ok) return { food, price: Math.round((m0 - d.finance.money) * 100) / 100 };
  }
  throw new Error('no food to buy');
}

/** Owner, Mia and Sam in a room; Mia set to a tier by the owner. */
function three(tier?: { tier: 'allowance'; allowance: number } | { tier: 'ask' | 'free' }, prep?: (g: GameState) => void) {
  const g = shop();
  g.finance.money = 50_000;
  prep?.(g);
  const h = harness(g);
  h.join(OWNER);
  h.join(MIA);
  h.join(SAM);
  if (tier) {
    const r = h.cmd('o', { k: 'setSpending', member: 'm', name: 'Mia', ...tier } as Command);
    expect(r.res?.ok, r.res?.message).toBe(true);
  }
  return h;
}

describe('chunk 14: who may send what (allowed, ADR-0050 decisions 1 and 4)', () => {
  it('tiers and approvers for the owner; answers and gifts for the owner and approvers; everything else for every tier', () => {
    const g = shop();
    g.pool = { members: { a: { name: 'Ann', tier: 'ask', approve: true }, f: { name: 'Fay', tier: 'allowance', allowance: 50 }, k: { name: 'Kit', tier: 'ask' } } };
    const owner = { id: 'o', owner: true, pause: true };
    const approver = { id: 'a', owner: false, pause: false };
    const plain = [{ id: 'f', owner: false, pause: false }, { id: 'k', owner: false, pause: false }, { id: 'new', owner: false, pause: false }];
    const sample = (k: string): Command => ({ k }) as Command;
    for (const k of COMMAND_KINDS) {
      const c = sample(k);
      const expectFor = (m: { id: string; owner: boolean; pause: boolean }): boolean => {
        if (k === 'tutorialNext' || k === 'tutorialSkip') return false;
        if (k === 'setSpeed') return m.owner || m.pause;
        if (k === 'setSpending' || k === 'setApprover') return m.owner;
        if (k === 'answerAsk' || k === 'giveMoney') return m.owner || m.id === 'a';
        return true;
      };
      for (const m of [owner, approver, ...plain]) expect(allowed(m, c, g), `${k} for ${m.id}`).toBe(expectFor(m));
    }
  });

  it('a member who sends a tier, an answer or a gift without the permission is refused, and nothing changes anywhere', () => {
    const h = three({ tier: 'ask' });
    const ask = h.cmd('m', { k: 'askMoney', amount: 300 });
    expect(ask.res?.ok).toBe(true);
    const id = h.room.state.pool!.asks![0].id;
    const n = h.room.n;
    for (const c of [
      { k: 'setSpending', member: 's', name: 'Sam', tier: 'ask' },
      { k: 'setApprover', member: 'm', name: 'Mia', on: true },
      { k: 'answerAsk', ask: id, yes: true },
      { k: 'giveMoney', member: 'm', name: 'Mia', amount: 100 },
    ] as Command[])
      expect(h.cmd('s', c).reject?.why, c.k).toBe('forbidden');
    expect(h.room.n).toBe(n);
    h.settle();
  });

  it('the owner flag is the server’s: a member’s step never carries it, the owner’s always does', () => {
    const h = three();
    h.cmd('o', { k: 'setSpending', member: 'm', name: 'Mia', tier: 'ask' });
    h.cmd('m', { k: 'askMoney', amount: 10 });
    const sent = h.peers.get('s')!.got.filter((f) => f.kind === 'steps').flatMap((f) => (JSON.parse(f.text!) as Steps).s.flatMap((s) => s.cmds ?? []));
    expect(sent.map((c) => [c.by, c.owner ?? false])).toEqual([
      ['o', true],
      ['m', false],
    ]);
    // even run directly, a tier change without the owner flag changes nothing
    const g = shop();
    const before = stateHash(g);
    const r = applyCommand(g, { k: 'setSpending', member: 'x', name: 'X', tier: 'ask' }, { id: 'm', name: 'Mia', at: 0 });
    expect(r).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(stateHash(g)).toBe(before);
  });
});

describe('chunk 14: spending the pool (ADR-0050 decisions 2, 3)', () => {
  it('everyone starts spending freely: a purchase goes through as in 0.6.0 and the pool stays out of the save', () => {
    const h = three();
    const { food, price } = foodPack(h.room.state);
    const m0 = h.room.state.finance.money;
    const r = h.cmd('m', { k: 'buyFood', food, packs: 1 });
    expect(r.res?.ok).toBe(true);
    expect(h.room.state.finance.money).toBeCloseTo(m0 - price, 2);
    expect(h.room.state.pool).toBeUndefined();
    expect(canSpend(h.room.state, { id: 'm' })).toBe(Infinity);
    h.settle();
  });

  it('a purchase over what a member can spend is refused before any copy sees it, saying what it cost and what they had', () => {
    const h = three({ tier: 'ask' });
    const { food, price } = foodPack(h.room.state);
    const n = h.room.n;
    const hash = stateHash(h.room.state);
    const r = h.cmd('m', { k: 'buyFood', food, packs: 1 });
    expect(r.res).toBeUndefined();
    expect(r.reject).toEqual({ t: 'reject', id: expect.any(Number), why: 'spend', cost: price, can: 0 });
    expect(h.room.n).toBe(n);
    expect(stateHash(h.room.state)).toBe(hash);
    expect(h.room.stats.overspends).toBe(1);
    h.settle();
    for (const id of ['o', 'm', 's']) expect(stateHash(h.copy(id))).toBe(hash);
  });

  it('care is for every tier, whatever it costs (a dose, a repair), and comes from the pool, not the member’s money', () => {
    // a worn heater to repair, in the shop as stored
    const worn = { tank: '', equip: '' };
    const h = three({ tier: 'ask' }, (g) => {
      for (const t of g.tankOrder)
        for (const e of g.tanks[t].equipment)
          if (!worn.equip) {
            e.condition = 0.3;
            Object.assign(worn, { tank: t, equip: e.id });
          }
    });
    expect(worn.equip).not.toBe('');
    expect([...CARE_KINDS].sort()).toEqual(['cleanTank', 'dose', 'feedTank', 'repairEquipment', 'topOff', 'waterChange']);
    const tank = h.room.state.tankOrder[0];
    const record = () => JSON.stringify(poolMember(h.room.state, 'm'));
    const mine = record();
    for (const c of [
      { k: 'dose', tank, additive: 'bacteria' },
      { k: 'dose', tank, additive: 'conditioner' },
      { k: 'repairEquipment', tank: worn.tank, equip: worn.equip },
    ] as Command[]) {
      const m0 = h.room.state.finance.money;
      const r = h.cmd('m', c);
      expect(r.reject, c.k).toBeUndefined();
      expect(r.res?.ok, `${c.k}: ${r.res?.message}`).toBe(true);
      expect(h.room.state.finance.money, c.k).toBeLessThan(m0);
      expect(record(), c.k).toBe(mine);
    }
    expect(h.cmd('m', { k: 'waterChange', tank, fraction: 0.2 }).res?.ok).toBe(true);
    expect(h.cmd('m', { k: 'cleanTank', tank, what: 'glass' }).res?.ok).toBe(true);
    h.settle();
  });

  it('staff and the stock budget only for members who spend freely', () => {
    const h = three({ tier: 'ask' });
    const before = stateHash(h.room.state);
    for (const c of [
      { k: 'setStockBudget', amount: 900 },
      { k: 'setStockOrders', on: true },
      { k: 'hireStaff', candidate: 'nobody' },
      { k: 'fireStaff', staff: 'nobody' },
    ] as Command[]) {
      expect(RUNNING_COST_KINDS.has(c.k)).toBe(true);
      const r = h.cmd('m', c);
      expect(r.res, c.k).toMatchObject({ ok: false, message: RUNNING_COST_TEXT });
    }
    // refused by the shop's own rule: every copy got the same refusal and nothing changed
    expect(stateHash(h.room.state)).toBe(before);
    // Sam spends freely: the budget is his to set
    expect(h.cmd('s', { k: 'setStockBudget', amount: 900 }).res?.message).not.toBe(RUNNING_COST_TEXT);
    h.settle();
  });

  it('a sale is never spending: it goes into the pool whatever the seller’s tier', () => {
    const h = three({ tier: 'ask' });
    const fish = Object.values(h.room.state.creatures).find((c) => c.status === 'alive' && !c.isStarter && !c.favorite)!;
    const m0 = h.room.state.finance.money;
    const r = h.cmd('m', { k: 'quickSell', creatures: [fish.id] });
    expect(r.res?.ok, r.res?.message).toBe(true);
    expect(h.room.state.finance.money).toBeGreaterThan(m0);
    expect(poolMember(h.room.state, 'm')).toMatchObject({ tier: 'ask' });
    expect(poolMember(h.room.state, 'm')!.extra).toBeUndefined();
    h.settle();
  });
});

describe('chunk 14: asking for money (ADR-0050 decision 4)', () => {
  it('asked, approved and spent: the approved money is the member’s until spent, and the pool drops only on the purchase', () => {
    const h = three({ tier: 'ask' });
    const { food, price } = foodPack(h.room.state);
    const pool0 = h.room.state.finance.money;
    const ask = h.cmd('m', { k: 'askMoney', amount: 500, note: '  Prismatic betta  ' });
    expect(ask.res).toMatchObject({ ok: true, message: 'Asked for $500: Prismatic betta.' });
    const a = h.room.state.pool!.asks![0];
    expect(a).toMatchObject({ by: 'm', name: 'Mia', amount: 500, note: 'Prismatic betta' });
    // the alerts line is the command's own, tagged with who asked
    expect(h.room.state.log.at(-1)).toMatchObject({ text: 'Asked for $500: Prismatic betta.', by: 'm', byName: 'Mia' });
    const yes = h.cmd('o', { k: 'answerAsk', ask: a.id, yes: true });
    expect(yes.res).toMatchObject({ ok: true, message: 'Approved Mia’s $500.', pool: { member: 'm', amount: 500, yes: true } });
    expect(h.room.state.pool!.asks).toBeUndefined();
    expect(poolMember(h.room.state, 'm')!.extra).toBe(500);
    expect(h.room.state.finance.money).toBe(pool0);
    expect(h.cmd('m', { k: 'buyFood', food, packs: 1 }).res?.ok).toBe(true);
    expect(h.room.state.finance.money).toBeCloseTo(pool0 - price, 2);
    expect(poolMember(h.room.state, 'm')!.extra).toBeCloseTo(500 - price, 2);
    h.settle();
  });

  it('declined: nothing to spend; cancelled: the request is gone; at most 3 open; no note says just the amount', () => {
    const h = three({ tier: 'ask' });
    h.cmd('m', { k: 'askMoney', amount: 40 });
    expect(h.room.state.log.at(-1)!.text).toBe('Asked for $40.');
    const first = h.room.state.pool!.asks![0].id;
    expect(h.cmd('o', { k: 'answerAsk', ask: first, yes: false }).res).toMatchObject({ ok: true, message: 'Declined Mia’s request for $40.' });
    expect(poolMember(h.room.state, 'm')!.extra).toBeUndefined();
    for (const amount of [1, 2, 3]) expect(h.cmd('m', { k: 'askMoney', amount }).res?.ok).toBe(true);
    expect(h.cmd('m', { k: 'askMoney', amount: 4 }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    const mine = h.room.state.pool!.asks!.map((x) => x.id);
    expect(h.cmd('s', { k: 'cancelAsk', ask: mine[0] }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(h.cmd('m', { k: 'cancelAsk', ask: mine[0] }).res).toMatchObject({ ok: true, message: 'Cancelled the request for $1.' });
    expect(h.room.state.pool!.asks!.map((x) => x.id)).toEqual(mine.slice(1));
    // nobody answers their own request; someone who spends freely has nothing to ask for
    h.cmd('o', { k: 'setApprover', member: 'm', name: 'Mia', on: true });
    expect(h.cmd('m', { k: 'answerAsk', ask: mine[1], yes: true }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(h.cmd('s', { k: 'askMoney', amount: 10 }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    h.settle();
  });

  it('a second click on Approve: the request has changed since they looked; the money comes once', () => {
    const h = three({ tier: 'ask' });
    h.cmd('m', { k: 'askMoney', amount: 90 });
    const id = h.room.state.pool!.asks![0].id;
    expect(h.cmd('o', { k: 'answerAsk', ask: id, yes: true }).res?.ok).toBe(true);
    expect(h.cmd('o', { k: 'answerAsk', ask: id, yes: true }).res).toMatchObject({ ok: false, message: 'That request has changed since you looked.' });
    expect(poolMember(h.room.state, 'm')!.extra).toBe(90);
    h.settle();
  });

  it('the caps the save keeps: approved money tops out, and so do the open requests in all', () => {
    const h = three({ tier: 'ask' }, (g) => {
      g.pool = { members: { m: { name: 'Mia', tier: 'ask', extra: MAX_EXTRA - 10 } } };
    });
    h.cmd('m', { k: 'askMoney', amount: 11 });
    const id = h.room.state.pool!.asks![0].id;
    expect(h.cmd('o', { k: 'answerAsk', ask: id, yes: true }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(h.cmd('o', { k: 'giveMoney', member: 'm', name: 'Mia', amount: 11 }).res).toMatchObject({ ok: false });
    expect(h.cmd('o', { k: 'giveMoney', member: 'm', name: 'Mia', amount: 10 }).res?.ok).toBe(true);
    expect(poolMember(h.room.state, 'm')!.extra).toBe(MAX_EXTRA);
    h.settle();
    // 100 open requests in all: the next is refused, whoever asks
    const g = shop();
    g.pool = { members: { x: { name: 'X', tier: 'ask' } }, asks: Array.from({ length: MAX_ASKS }, (_, i) => ({ id: `ask_${i}`, by: `u${i}`, name: `U${i}`, amount: 1, hour: 1 })) };
    expect(applyCommand(g, { k: 'askMoney', amount: 5 }, { id: 'x', name: 'X', at: 0 })).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(repairState(JSON.parse(JSON.stringify(g)))).toEqual([]);
  });

  it('a gift goes only to a member who doesn’t spend freely (as the screen offers), never to a made-up id', () => {
    const h = three({ tier: 'ask' });
    expect(h.cmd('o', { k: 'giveMoney', member: 's', name: 'Sam', amount: 5 }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(h.cmd('o', { k: 'giveMoney', member: 'nobody_123', name: 'Nobody', amount: 5 }).res).toMatchObject({ ok: false });
    // a record that spends freely (an approver): no gift either
    h.cmd('o', { k: 'setApprover', member: 's', name: 'Sam', on: true });
    expect(poolMember(h.room.state, 's')).toEqual({ name: 'Sam', tier: 'free', approve: true });
    expect(h.cmd('o', { k: 'giveMoney', member: 's', name: 'Sam', amount: 5 }).res).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(poolMember(h.room.state, 's')!.extra).toBeUndefined();
    expect(Object.keys(h.room.state.pool!.members!).sort()).toEqual(['m', 's']);
    h.settle();
  });

  it('two approvers on one request: the first one wins, and the second is told who', () => {
    const h = three({ tier: 'ask' });
    h.cmd('o', { k: 'setApprover', member: 's', name: 'Sam', on: true });
    h.cmd('m', { k: 'askMoney', amount: 250 });
    const id = h.room.state.pool!.asks![0].id;
    expect(h.cmd('s', { k: 'answerAsk', ask: id, yes: true }).res?.ok).toBe(true);
    expect(h.cmd('o', { k: 'answerAsk', ask: id, yes: false }).res).toMatchObject({ ok: false, message: 'Sam already answered that request.' });
    expect(poolMember(h.room.state, 'm')!.extra).toBe(250);
    // the asker cancelling what was just answered is told too
    expect(h.cmd('m', { k: 'cancelAsk', ask: id }).res?.message).toBe('Sam already answered that request.');
    h.settle();
  });
});

describe('chunk 14: allowances and gifts (ADR-0050 decision 5)', () => {
  it('an allowance runs out across quick purchases, the next refused with what it had left', () => {
    const g = shop();
    const { price } = foodPack(g);
    const h = three({ tier: 'allowance', allowance: Math.floor(price * 2.5) });
    const { food } = foodPack(h.room.state);
    expect(h.cmd('m', { k: 'buyFood', food, packs: 1 }).res?.ok).toBe(true);
    expect(h.cmd('m', { k: 'buyFood', food, packs: 1 }).res?.ok).toBe(true);
    const left = allowanceLeft(h.room.state, poolMember(h.room.state, 'm'));
    expect(left).toBeCloseTo(Math.floor(price * 2.5) - 2 * price, 2);
    const third = h.cmd('m', { k: 'buyFood', food, packs: 1 });
    expect(third.reject).toMatchObject({ why: 'spend', cost: price, can: left });
    h.settle();
  });

  it('topped up each game day, never piled up; the allowance is used before the approved money', () => {
    const h = three({ tier: 'allowance', allowance: 100 });
    const { food, price } = foodPack(h.room.state);
    const day0 = dayIndex(h.room.state.clock.hour);
    h.cmd('m', { k: 'buyFood', food, packs: 1 });
    expect(allowanceLeft(h.room.state, poolMember(h.room.state, 'm'))).toBeCloseTo(100 - price, 2);
    // a new game day: back to the whole allowance, not more
    h.cmd('o', { k: 'setSpeed', speed: 10 });
    while (dayIndex(h.room.state.clock.hour) === day0) h.tick(8);
    expect(allowanceLeft(h.room.state, poolMember(h.room.state, 'm'))).toBe(100);
    h.settle();
    // approved money on top: a purchase takes the allowance first
    h.cmd('o', { k: 'setSpeed', speed: 0 });
    h.cmd('o', { k: 'giveMoney', member: 'm', name: 'Mia', amount: 500 });
    expect(canSpend(h.room.state, { id: 'm' })).toBe(600);
    const packs = Math.ceil(150 / price);
    const cost = Math.round(price * packs * 100) / 100;
    expect(h.cmd('m', { k: 'buyFood', food, packs }).res?.ok).toBe(true);
    const m = poolMember(h.room.state, 'm')!;
    expect(allowanceLeft(h.room.state, m)).toBe(0);
    expect(m.extra).toBeCloseTo(600 - cost, 2);
    h.settle();
  });

  it('a gift is used once: spent, the next purchase over what is left is refused', () => {
    const h = three({ tier: 'ask' });
    const { food, price } = foodPack(h.room.state);
    const gift = h.cmd('o', { k: 'giveMoney', member: 'm', name: 'Mia', amount: Math.ceil(price * 1.5) });
    expect(gift.res).toMatchObject({ ok: true, message: `Gave Mia $${Math.ceil(price * 1.5)} to spend.` });
    expect(h.cmd('m', { k: 'buyFood', food, packs: 1 }).res?.ok).toBe(true);
    const left = poolMember(h.room.state, 'm')!.extra!;
    expect(h.cmd('m', { k: 'buyFood', food, packs: 1 }).reject).toMatchObject({ why: 'spend', cost: price, can: left });
    // nobody gives to themselves
    expect(h.cmd('o', { k: 'giveMoney', member: 'o', name: 'Olive', amount: 5 }).res).toMatchObject({ ok: false });
    h.settle();
  });

  it('the tier lines, and a record that says nothing is dropped (the member spends freely)', () => {
    const h = three();
    expect(h.cmd('o', { k: 'setSpending', member: 'm', name: 'Mia', tier: 'allowance', allowance: 200 }).res?.message).toBe('Set Mia’s allowance to $200 a game day.');
    expect(h.cmd('o', { k: 'setSpending', member: 'm', name: 'Mia', tier: 'ask' }).res?.message).toBe('Set Mia to ask first.');
    expect(h.cmd('o', { k: 'setApprover', member: 'm', name: 'Mia', on: true }).res?.message).toBe('Let Mia approve requests.');
    expect(h.cmd('o', { k: 'setApprover', member: 'm', name: 'Mia', on: false }).res?.message).toBe('Mia can no longer approve requests.');
    expect(h.cmd('o', { k: 'setSpending', member: 'm', name: 'Mia', tier: 'free' }).res?.message).toBe('Set Mia to spend freely.');
    expect(h.room.state.pool).toBeUndefined();
    // an allowance needs an amount; a record needs a name (the save repair would drop one without); the owner can't set
    // their own tier
    expect(h.cmd('o', { k: 'setSpending', member: 'm', name: 'Mia', tier: 'allowance' }).res).toMatchObject({ ok: false });
    for (const c of [
      { k: 'setSpending', member: 'm', name: ' ', tier: 'ask' },
      { k: 'setApprover', member: 'm', name: '', on: true },
      { k: 'giveMoney', member: 'm', name: '', amount: 5 },
    ] as Command[])
      expect(h.cmd('o', c).res, c.k).toMatchObject({ ok: false, message: POOL_FAILED_TEXT });
    expect(h.room.state.pool).toBeUndefined();
    expect(h.cmd('o', { k: 'setSpending', member: 'o', name: 'Olive', tier: 'ask' }).res).toMatchObject({ ok: false });
    h.settle();
  });
});

describe('chunk 14: the lockstep holds with the pool (SHARE-024)', () => {
  it('a member who joins mid-way gets the pool in the snapshot and stays in step through fingerprints', () => {
    const h = three({ tier: 'allowance', allowance: 300 });
    const { food } = foodPack(h.room.state);
    h.cmd('m', { k: 'askMoney', amount: 77, note: 'Shrimp' });
    h.cmd('m', { k: 'buyFood', food, packs: 1 });
    h.cmd('o', { k: 'setSpeed', speed: 3 });
    h.tick(20);
    const late = h.join({ id: 'l', name: 'Lee', owner: false, pause: false });
    expect(late.replica.state!.pool).toEqual(h.room.state.pool);
    h.cmd('o', { k: 'answerAsk', ask: h.room.state.pool!.asks![0].id, yes: true });
    h.tick(60); // past a fingerprint (every 10 s)
    h.settle();
    const fps = h.peers.get('l')!.got.filter((f) => f.kind === 'steps').flatMap((f) => (JSON.parse(f.text!) as Steps).s).filter((s) => s.fp);
    expect(fps.length).toBeGreaterThan(0);
  });

  it('two game days at 10× with the pool in play: allowances topped up, requests, gifts, a second joiner; every fingerprint matches', () => {
    // The loop always holds one whole game day (it runs until the second day boundary). At 10× that day is 9 or 10
    // rounds of an $8 pack (at least $72), and the whole run (at most 20 rounds) approves and gives at most $37 (asks
    // of $7 every fifth round, $3 gifts every seventh), so an allowance of $30 must run out in it. With $60 the two
    // sides were within a few dollars, and a refusal came only if the fixture's unfed animals began starving late in the
    // loop (the room drops to 1× for that, so a few more rounds): before chunk 16 one did, after it none did and nothing
    // was refused. At 1× a day holds ten times the rounds, each still $8 against under $2 of asks and gifts.
    const h = three({ tier: 'allowance', allowance: 30 });
    const { food } = foodPack(h.room.state);
    h.cmd('o', { k: 'setApprover', member: 's', name: 'Sam', on: true });
    h.cmd('o', { k: 'setSpeed', speed: 10 });
    const day0 = dayIndex(h.room.state.clock.hour);
    let refused = 0;
    for (let i = 0; dayIndex(h.room.state.clock.hour) < day0 + 2; i++) {
      const r = h.cmd('m', { k: 'buyFood', food, packs: 1 });
      if (r.reject?.why === 'spend') refused++;
      if (i % 5 === 0) h.cmd('m', { k: 'askMoney', amount: 7 });
      const ask = h.room.state.pool?.asks?.[0];
      if (ask && i % 3 === 0) h.cmd(i % 2 ? 's' : 'o', { k: 'answerAsk', ask: ask.id, yes: i % 4 !== 0 });
      if (i % 7 === 0) h.cmd('s', { k: 'giveMoney', member: 'm', name: 'Mia', amount: 3 });
      if (i === 5) h.join({ id: 'l', name: 'Lee', owner: false, pause: false });
      h.tick(10);
    }
    expect(refused).toBeGreaterThan(0);
    expect(h.peers.has('l')).toBe(true);
    h.tick(48);
    h.settle();
    for (const p of h.peers.values()) expect(p.replica.stats.checks).toBeGreaterThan(0);
  });
});

describe('chunk 14: the pool in a save (repairState)', () => {
  it('a good pool needs no repair and keeps its fingerprint; a shop without one is as it was', () => {
    const g = shop();
    const plain = stateHash(g);
    expect(repairState(JSON.parse(JSON.stringify(g)))).toEqual([]);
    g.pool = { members: { m: { name: 'Mia', tier: 'allowance', allowance: 200, left: 50, day: 3, extra: 12.5, approve: true } }, asks: [{ id: 'ask_9', by: 'm', name: 'Mia', amount: 5000, note: 'Prismatic betta', hour: 80 }] };
    const s = JSON.parse(JSON.stringify(g));
    expect(repairState(s)).toEqual([]);
    expect(stateHash(s)).toBe(stateHash(g));
    delete g.pool;
    expect(stateHash(g)).toBe(plain);
  });

  it('unreadable records and requests are dropped, stray fields removed, more than 3 open each cut, an empty pool removed', () => {
    const s: Record<string, unknown> & { pool?: unknown } = JSON.parse(JSON.stringify(shop()));
    s.pool = {
      members: {
        good: { name: 'Ann', tier: 'ask', extra: 5 },
        noName: { tier: 'ask' },
        badTier: { name: 'B', tier: 'boss' },
        noAmount: { name: 'C', tier: 'allowance' },
        stray: { name: 'D', tier: 'free', approve: 'yes', left: 4, colour: 'red' },
        over: { name: 'F', tier: 'allowance', allowance: 50, left: 80, day: 2 },
        __proto__x: { name: 'E', tier: 'ask', left: 10 },
      },
      asks: [1, 2, 3, 4].map((i) => ({ id: `ask_${i}`, by: 'good', name: 'Ann', amount: i, hour: 1 })).concat([{ id: 'bad', by: 'good', name: 'Ann', amount: 0, hour: 1 }]),
      extra: 1,
    };
    const notes = repairState(s);
    expect(notes.length).toBeGreaterThan(0);
    const pool = s.pool as GameState['pool'];
    expect(Object.keys(pool!.members!).sort()).toEqual(['__proto__x', 'good', 'over', 'stray']);
    expect(pool!.members!.stray).toEqual({ name: 'D', tier: 'free' });
    // more left than the allowance: the day's record goes, so the next read is the whole allowance
    expect(pool!.members!.over).toEqual({ name: 'F', tier: 'allowance', allowance: 50 });
    expect(pool!.members!.__proto__x).toEqual({ name: 'E', tier: 'ask' });
    expect(pool!.asks!.map((a) => a.id)).toEqual(['ask_1', 'ask_2', 'ask_3']);
    expect((pool as Record<string, unknown>).extra).toBeUndefined();
    const empty: Record<string, unknown> = JSON.parse(JSON.stringify(shop()));
    empty.pool = { members: { x: 1 } };
    repairState(empty);
    expect(empty.pool).toBeUndefined();
  });
});
