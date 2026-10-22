// @vitest-environment node
/**
 * Chunk 14 (ADR-0050; SHARE-023): the money pool's screens and words, apart from the server.
 *
 * - Every new line exactly as the owner approved it (ADR-0050's previews), and the forms the previews imply.
 * - The shared dispatcher: a purchase over a member's money settles with what it cost and what they had; a pool
 *   command refused as `forbidden` with the failure words (pause and speed keep theirs).
 * - Pop-ups: a request to those who can answer it, an answer, a gift or a tier change to the member it's about, never
 *   for one's own action.
 * - The strip's Money label and the Shop money sheet's lines for each tier; the owner's spending row.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import type { Command, CommandResult } from '@/sim/commands';
import { newGame } from '@/sim/newGame';
import { POOL_LINES, RUNNING_COST_TEXT } from '@/sim/pool';
import { useGame } from '@/state/game';
import { SharedDispatcher } from '@/ui/shared/dispatch';
import { SharedActivity } from '@/ui/shared/activity';
import { SHARED_WORDS as W } from '@/ui/shared/words';
import { useShared, INITIAL_VISIT } from '@/ui/shared/store';
import { MemberSpending, SharedMoneyBody, moneyLabel, parseDollars } from '@/ui/shared/SharedMoney';

const shop = (): GameState => {
  const g = newGame({ starterId: 'betta', starterName: 'Blue', shopName: 'Reef Club', seed: 12 });
  g.finance.money = 12_400;
  return g;
};
const text = (html: string) => html.replace(/<[^>]+>/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);

afterEach(() => {
  useGame.getState().setGame(null);
  Object.assign(useGame.getInitialState(), { game: null });
  useShared.setState({ ...INITIAL_VISIT });
  Object.assign(useShared.getInitialState(), { ...INITIAL_VISIT });
});

describe('chunk 14: the words, as approved (ADR-0050 decision 6)', () => {
  it('the alerts lines', () => {
    expect(POOL_LINES.asked(5000, 'Prismatic betta')).toBe('Asked for $5,000: Prismatic betta.');
    expect(POOL_LINES.asked(5000)).toBe('Asked for $5,000.');
    expect(POOL_LINES.asked(5000, 'Prismatic betta!')).toBe('Asked for $5,000: Prismatic betta!');
    expect(POOL_LINES.approved('Mia', 5000)).toBe('Approved Mia’s $5,000.');
    expect(POOL_LINES.declined('Mia', 5000)).toBe('Declined Mia’s request for $5,000.');
    expect(POOL_LINES.gave('Mia', 500)).toBe('Gave Mia $500 to spend.');
    expect(POOL_LINES.cancelled(5000)).toBe('Cancelled the request for $5,000.');
    expect(POOL_LINES.free('Mia')).toBe('Set Mia to spend freely.');
    expect(POOL_LINES.allowance('Mia', 200)).toBe('Set Mia’s allowance to $200 a game day.');
    expect(POOL_LINES.ask('Mia')).toBe('Set Mia to ask first.');
    expect(POOL_LINES.approver('Mia')).toBe('Let Mia approve requests.');
    expect(POOL_LINES.notApprover('Mia')).toBe('Mia can no longer approve requests.');
    expect(W.alertsLine('Olive', POOL_LINES.allowance('Mia', 200))).toBe('Olive: Set Mia’s allowance to $200 a game day.');
  });

  it('the refusals, the pop-ups, the strip and the sheet', () => {
    expect(W.overspend(300, 120)).toBe('That costs $300, and you can spend $120. Ask for more in Money.');
    expect(W.overspend(4.5, 0)).toBe('That costs $4.50, and you can spend $0. Ask for more in Money.');
    // whole dollars from $100: never "costs $300, and you can spend $300"
    expect(W.overspend(300.75, 300.5)).toBe('That costs $301, and you can spend $300. Ask for more in Money.');
    expect(RUNNING_COST_TEXT).toBe('Staff and the stock budget keep spending the pool, so only members who spend freely can change them.');
    expect(W.asksPopup('Mia', 5000, 'Prismatic betta')).toBe('Mia asks for $5,000: Prismatic betta.');
    expect(W.approvedYour('Olive', 5000)).toBe('Olive approved your $5,000.');
    expect(W.declinedYour('Olive', 5000)).toBe('Olive declined your request for $5,000.');
    expect(W.gaveYou('Olive', 500)).toBe('Olive gave you $500 to spend.');
    expect(W.waitingInMoney(2)).toBe('2 requests are waiting in Money.');
    expect(W.waitingInMoney(1)).toBe('1 request is waiting in Money.');
    expect(W.moneyToSpend(320)).toBe('Money: $320 to spend');
    expect(W.moneyWaiting(W.money, 2)).toBe('Money (2)');
    expect(W.pool(12_400)).toBe('Pool: $12,400. Everything the shop earns goes here.');
    expect(W.youCanSpend(320)).toBe('You can spend $320.');
    expect(W.allowanceLeft(120, 200)).toBe('Allowance: $120 of $200 left today.');
    expect(W.approvedForYou(200)).toBe('Approved for you: $200.');
    expect(W.waiting(5000, 'Prismatic betta')).toBe('$5,000: Prismatic betta · Waiting');
    expect(W.asks('Mia', 5000, 'Prismatic betta')).toBe('Mia asks for $5,000: Prismatic betta');
    expect([W.moneyTitle, W.askForMoney, W.howMuch, W.whatFor, W.sendRequest, W.cancel, W.yourRequests, W.requests, W.approve, W.decline, W.giveMoney, W.give]).toEqual([
      'Shop money',
      'Ask for money',
      'How much?',
      'What for? (optional)',
      'Send request',
      'Cancel',
      'Your requests',
      'Requests',
      'Approve',
      'Decline',
      'Give money',
      'Give',
    ]);
    expect([W.spending, W.spendsFreely, W.allowance, W.eachGameDay, W.asksFirst, W.canApprove]).toEqual(['Spending:', 'Spends freely', 'Allowance', 'each game day', 'Asks first', 'Can approve requests and give money']);
  });

  it('amounts as typed: whole dollars from 1 to 10,000,000', () => {
    expect(parseDollars('$5,000')).toBe(5000);
    expect(parseDollars(' 200 ')).toBe(200);
    for (const bad of ['', '0', '-5', '1.5', 'ten', '10000001', '1e3']) expect(parseDollars(bad), bad).toBeNull();
  });
});

describe('chunk 14: the shared dispatcher’s refusals', () => {
  function rig() {
    const sent: { id: number; c: Command }[] = [];
    let next = 1;
    const disp = new SharedDispatcher({
      sender: () => ({ you: 'm', send: (c) => (sent.push({ id: next, c }), next++) }),
      mayPause: () => false,
      ownerName: () => 'Olive',
      note: () => {},
      now: () => 0,
      after: () => () => {},
    });
    useGame.getState().setGame(shop());
    const send = (c: Command) => {
      const box: { got?: CommandResult | null } = {};
      disp.dispatch(c, (r) => (box.got = r));
      return box;
    };
    return { disp, sent, send };
  }

  it('a purchase over the member’s money settles with what it cost and what they had', () => {
    const r = rig();
    const buy = r.send({ k: 'buyFood', food: 'flakes', packs: 1 });
    r.disp.reject(r.sent[0].id, 'spend', { cost: 300, can: 120 });
    expect(buy.got).toEqual({ ok: false, message: 'That costs $300, and you can spend $120. Ask for more in Money.' });
  });

  it('the stock budget dragged by a member who doesn’t spend freely: every value held back settles with the refusal', () => {
    let t = 0;
    const timers: { at: number; fn: () => void; live: boolean }[] = [];
    const sent: { id: number; c: Command }[] = [];
    let next = 1;
    const disp = new SharedDispatcher({
      sender: () => ({ you: 'm', send: (c) => (sent.push({ id: next, c }), next++) }),
      mayPause: () => false,
      ownerName: () => 'Olive',
      note: () => {},
      now: () => t,
      after: (ms, fn) => {
        const x = { at: t + ms, fn, live: true };
        timers.push(x);
        return () => void (x.live = false);
      },
    });
    useGame.getState().setGame(shop());
    const got: (CommandResult | null)[] = [];
    for (const amount of [100, 200, 300, 400]) {
      disp.dispatch({ k: 'setStockBudget', amount }, (r) => got.push(r));
      t += 50;
    }
    for (const x of timers.filter((x) => x.live && x.at <= t + 500)) {
      t = Math.max(t, x.at);
      x.live = false;
      x.fn();
    }
    // the first value went at once, the last after the wait; the two between rode on the last
    expect(sent.map((s) => (s.c as { amount: number }).amount)).toEqual([100, 400]);
    const refused: CommandResult = { ok: false, message: RUNNING_COST_TEXT };
    for (const s of sent) disp.settleStep({ n: s.id, h: 0, cmds: [{ by: 'm', who: 'Mia', id: s.id, c: s.c }] }, [refused]);
    expect(got).toHaveLength(4);
    for (const r of got) expect(r).toEqual(refused);
  });

  it('a pool command refused as forbidden fails with chunk 13’s words; pause and speed keep theirs', () => {
    const r = rig();
    const tier = r.send({ k: 'setSpending', member: 's', name: 'Sam', tier: 'ask' });
    const answer = r.send({ k: 'answerAsk', ask: 'ask_1', yes: true });
    r.disp.reject(r.sent[0].id, 'forbidden');
    r.disp.reject(r.sent[1].id, 'forbidden');
    expect(tier.got).toEqual({ ok: false, message: W.failed });
    expect(answer.got).toEqual({ ok: false, message: W.failed });
  });
});

describe('chunk 14: pop-ups (ADR-0050 question 2)', () => {
  function rig(you: string, owner = false) {
    const g = shop();
    g.pool = { members: { a: { name: 'Ann', tier: 'ask', approve: true }, m: { name: 'Mia', tier: 'ask' } } };
    const popups: string[] = [];
    const act = new SharedActivity({ you: () => you, owner: () => owner, state: () => g, popup: (t) => popups.push(t), focusedTank: () => null });
    act.reset();
    return { g, act, popups };
  }
  const ask: Command = { k: 'askMoney', amount: 5000, note: 'Prismatic betta' };
  const ok = (message: string, pool?: CommandResult['pool']): CommandResult => ({ ok: true, message, ...(pool ? { pool } : {}) });

  it('a request pops up for the owner and the approvers, not for the others, nor for the asker', () => {
    for (const [you, owner, want] of [
      ['o', true, ['Mia asks for $5,000: Prismatic betta.']],
      ['a', false, ['Mia asks for $5,000: Prismatic betta.']],
      ['s', false, []],
      ['m', false, []],
    ] as const) {
      const r = rig(you, owner);
      r.act.step({ n: 1, h: 0, cmds: [{ by: 'm', who: 'Mia', id: 1, c: ask }] }, [ok(POOL_LINES.asked(5000, 'Prismatic betta'))]);
      expect(r.popups, you).toEqual(want);
    }
  });

  it('an answer, a gift and a tier change pop up for the member they are about', () => {
    const r = rig('m');
    r.act.step({ n: 1, h: 0, cmds: [{ by: 'o', who: 'Olive', id: 1, c: { k: 'answerAsk', ask: 'ask_1', yes: true } }] }, [ok('Approved Mia’s $5,000.', { member: 'm', amount: 5000, yes: true })]);
    r.act.step({ n: 2, h: 0, cmds: [{ by: 'a', who: 'Ann', id: 1, c: { k: 'answerAsk', ask: 'ask_2', yes: false } }] }, [ok('Declined Mia’s request for $40.', { member: 'm', amount: 40, yes: false })]);
    r.act.step({ n: 3, h: 0, cmds: [{ by: 'o', who: 'Olive', id: 2, c: { k: 'giveMoney', member: 'm', name: 'Mia', amount: 500 } }] }, [ok('Gave Mia $500 to spend.', { member: 'm', amount: 500 })]);
    r.act.step({ n: 4, h: 0, cmds: [{ by: 'o', who: 'Olive', id: 3, c: { k: 'setSpending', member: 'm', name: 'Mia', tier: 'allowance', allowance: 200 } }] }, [ok('Set Mia’s allowance to $200 a game day.', { member: 'm' })]);
    // about someone else: nothing here
    r.act.step({ n: 5, h: 0, cmds: [{ by: 'o', who: 'Olive', id: 4, c: { k: 'giveMoney', member: 's', name: 'Sam', amount: 5 } }] }, [ok('Gave Sam $5 to spend.', { member: 's', amount: 5 })]);
    expect(r.popups).toEqual(['Olive approved your $5,000.', 'Ann declined your request for $40.', 'Olive gave you $500 to spend.', 'Olive: Set Mia’s allowance to $200 a game day.']);
  });
});

describe('chunk 14: the strip and the Shop money sheet', () => {
  const show = (g: GameState, you: { id: string; name: string; owner: boolean }, members = [{ id: 'o', name: 'Olive', here: true, pause: true }]) => {
    useGame.getState().setGame(g);
    Object.assign(useGame.getInitialState(), useGame.getState());
    useShared.setState({ you: { ...you, pause: you.owner }, members });
    Object.assign(useShared.getInitialState(), useShared.getState());
  };

  it('the label: Money for a free spender; what a member can spend; the requests waiting for an approver', () => {
    const g = shop();
    expect(moneyLabel(g, { id: 'm', owner: false })).toBe('Money');
    g.pool = { members: { m: { name: 'Mia', tier: 'allowance', allowance: 200, left: 120, day: 0, extra: 200 } } };
    expect(moneyLabel(g, { id: 'm', owner: false })).toBe('Money: $320 to spend');
    g.pool.asks = [
      { id: 'ask_1', by: 'm', name: 'Mia', amount: 5000, hour: 1 },
      { id: 'ask_2', by: 'm', name: 'Mia', amount: 40, hour: 2 },
    ];
    expect(moneyLabel(g, { id: 'o', owner: true })).toBe('Money (2)');
    expect(moneyLabel(g, { id: 'm', owner: false })).toBe('Money: $320 to spend');
  });

  it('a member on an allowance: the pool, what they can spend, both parts, their request and Ask', () => {
    const g = shop();
    g.pool = { members: { m: { name: 'Mia', tier: 'allowance', allowance: 200, left: 120, day: 0, extra: 200 } }, asks: [{ id: 'ask_1', by: 'm', name: 'Mia', amount: 5000, note: 'Prismatic betta', hour: 1 }] };
    show(g, { id: 'm', name: 'Mia', owner: false });
    const lines = text(renderToStaticMarkup(createElement(SharedMoneyBody)));
    expect(lines).toEqual([
      'Pool: $12,400. Everything the shop earns goes here.',
      'You can spend $320.',
      'Allowance: $120 of $200 left today.',
      'Approved for you: $200.',
      'Ask for money',
      'Your requests',
      '$5,000: Prismatic betta · Waiting',
      'Cancel',
    ]);
    const asking = text(renderToStaticMarkup(createElement(SharedMoneyBody, { initialAsking: true })));
    expect(asking).toEqual(expect.arrayContaining(['How much?', 'What for? (optional)', 'Send request', 'Cancel']));
    expect(asking).not.toContain('Ask for money');
  });

  it('the owner: the pool, the requests to answer and Give money; nothing about their own spending', () => {
    const g = shop();
    g.pool = { members: { m: { name: 'Mia', tier: 'ask' } }, asks: [{ id: 'ask_1', by: 'm', name: 'Mia', amount: 5000, note: 'Prismatic betta', hour: 1 }] };
    show(g, { id: 'o', name: 'Olive', owner: true }, [{ id: 'm', name: 'Mia', here: true, pause: false }]);
    const lines = text(renderToStaticMarkup(createElement(SharedMoneyBody)));
    expect(lines).toEqual(['Pool: $12,400. Everything the shop earns goes here.', 'Requests', 'Mia asks for $5,000: Prismatic betta', 'Approve', 'Decline', 'Give money', 'Mia', 'Give']);
  });

  it('a member who spends freely sees the pool only; Asks first with nothing approved can spend $0', () => {
    const g = shop();
    show(g, { id: 's', name: 'Sam', owner: false });
    expect(text(renderToStaticMarkup(createElement(SharedMoneyBody)))).toEqual(['Pool: $12,400. Everything the shop earns goes here.']);
    g.pool = { members: { s: { name: 'Sam', tier: 'ask' } } };
    show(g, { id: 's', name: 'Sam', owner: false });
    expect(text(renderToStaticMarkup(createElement(SharedMoneyBody)))).toEqual(['Pool: $12,400. Everything the shop earns goes here.', 'You can spend $0.', 'Ask for money']);
  });

  it('the owner’s spending row: the three tiers, the amount and each game day, and the approver switch', () => {
    const g = shop();
    g.pool = { members: { m: { name: 'Mia', tier: 'allowance', allowance: 150, left: 150, day: 0 } } };
    show(g, { id: 'o', name: 'Olive', owner: true });
    const html = renderToStaticMarkup(createElement(MemberSpending, { id: 'm', name: 'Mia' }));
    expect(text(html)).toEqual(['Spending:', 'Spends freely', 'Allowance', 'each game day', 'Asks first', 'Can approve requests and give money']);
    expect(html).toMatch(/data-testid="shared-allowance-m"[^>]*value="150"|value="150"[^>]*data-testid="shared-allowance-m"/);
    expect(html).toMatch(/<input type="radio"[^>]*checked=""[^>]*\/><span>Allowance/);
  });
});
