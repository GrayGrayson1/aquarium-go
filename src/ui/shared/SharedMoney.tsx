/**
 * chunk 14 (ADR-0050) — the money pool's screens, every word from ADR-0050's previews: the strip's Money button, the
 * Shop money sheet (the pool, what you can spend, asking for money, your requests, and for approvers the requests to
 * answer and Give money), and the owner's per-member spending row in the members list. Every action is a command
 * (src/sim/pool.ts); every copy shows the same pool. OWNER: lane "social".
 */
import { useEffect, useId, useState } from 'react';
import { Wallet } from 'lucide-react';
import type { GameState, PoolTier } from '@/types';
import { useGame } from '@/state/game';
import { allowanceLeft, asksFor, canSpend, mayApprove, openAsks, poolMember, spendsFreely, ASK_NOTE_MAX, MAX_ASKS_EACH, POOL_AMOUNT_MAX } from '@/sim/pool';
import { act } from '../panels/common/act';
import { Button, Modal, Toggle } from '../kit';
import { useShared } from './store';
import { SHARED_WORDS as W } from './words';

/** The allowance the members list offers before the owner types one (the preview's). */
export const DEFAULT_ALLOWANCE = 200;

/** Whole dollars as typed ("$5,000", "5000"): 1 to 10,000,000, else null. */
export function parseDollars(text: string): number | null {
  const t = text.replace(/[$,\s]/g, '');
  if (!/^\d{1,8}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= POOL_AMOUNT_MAX ? n : null;
}

const actorOf = (you: { id: string; owner: boolean }) => ({ id: you.id, owner: you.owner });

/** The strip's button: "Money", "Money: {can} to spend", and "({n})" for an approver with requests waiting. */
export function moneyLabel(g: GameState, you: { id: string; owner: boolean }): string {
  const a = actorOf(you);
  const label = spendsFreely(g, a) ? W.money : W.moneyToSpend(canSpend(g, a));
  const n = asksFor(g, a).length;
  return n ? W.moneyWaiting(label, n) : label;
}

export function SharedMoneyButton({ onOpen }: { onOpen: () => void }) {
  const g = useGame((s) => s.game);
  const you = useShared((s) => s.you);
  if (!g || !you) return null;
  return (
    <Button size="sm" variant="ghost" className="ag-shared-strip__money" onClick={onOpen} data-testid="shared-money">
      <Wallet size={14} aria-hidden /> {moneyLabel(g, you)}
    </Button>
  );
}

/** The Shop money sheet (its body unmounts when it closes, so a half-typed request starts afresh next time). */
export function SharedMoneySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={W.moneyTitle} testId="shared-money-sheet" width={460}>
      <SharedMoneyBody />
    </Modal>
  );
}

/** What the sheet shows (apart from the dialog, so it can be drawn on its own). */
export function SharedMoneyBody({ initialAsking = false }: { initialAsking?: boolean }) {
  const g = useGame((s) => s.game);
  const you = useShared((s) => s.you);
  const members = useShared((s) => s.members);
  const [asking, setAsking] = useState(initialAsking);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [giveTo, setGiveTo] = useState('');
  const [give, setGive] = useState('');
  const ids = { amount: useId(), note: useId() };
  if (!g || !you) return null;
  const a = actorOf(you);
  const free = spendsFreely(g, a);
  const rec = poolMember(g, you.id);
  const mine = openAsks(g, you.id);
  const theirs = asksFor(g, a);
  const approver = mayApprove(g, a);
  // Give money: the members who don't spend freely (a gift to someone who does would change nothing they can do)
  const nameOf = (id: string, fallback: string) => members.find((m) => m.id === id)?.name ?? fallback;
  const limited = Object.entries(g.pool?.members ?? {})
    .filter(([id, m]) => id !== you.id && m.tier !== 'free')
    .map(([id, m]) => ({ id, name: nameOf(id, m.name) }));
  const to = limited.find((m) => m.id === giveTo) ?? limited[0];
  const askAmount = parseDollars(amount);
  const giveAmount = parseDollars(give);
  const send = () => {
    if (askAmount === null) return;
    const n = note.trim().slice(0, ASK_NOTE_MAX);
    act({ k: 'askMoney', amount: askAmount, ...(n ? { note: n } : {}) }, {
      sound: 'confirm',
      after: (r) => {
        if (!r?.ok) return;
        setAsking(false);
        setAmount('');
        setNote('');
      },
    });
  };
  return (
    <div className="ag-shared-money" data-testid="shared-money-body">
      <p className="ag-shared-money__pool" data-testid="shared-money-pool">
        {W.pool(g.finance.money)}
      </p>
      {!free && (
        <div className="ag-shared-money__you">
          <p data-testid="shared-money-can">{W.youCanSpend(canSpend(g, a))}</p>
          {rec?.tier === 'allowance' && (
            <p className="ag-shared-money__sub" data-testid="shared-money-allowance">
              {W.allowanceLeft(allowanceLeft(g, rec), rec.allowance ?? 0)}
            </p>
          )}
          {(rec?.extra ?? 0) > 0 && (
            <p className="ag-shared-money__sub" data-testid="shared-money-extra">
              {W.approvedForYou(rec!.extra!)}
            </p>
          )}
          {!asking && mine.length < MAX_ASKS_EACH && (
            <Button size="sm" onClick={() => setAsking(true)} data-testid="shared-ask-open">
              {W.askForMoney}
            </Button>
          )}
          {asking && (
            <form
              className="ag-shared-money__form"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label className="ag-field" htmlFor={ids.amount}>
                <span className="ag-field__label">{W.howMuch}</span>
                <input id={ids.amount} className="ag-input" inputMode="numeric" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$" data-testid="shared-ask-amount" />
              </label>
              <label className="ag-field" htmlFor={ids.note}>
                <span className="ag-field__label">{W.whatFor}</span>
                <input id={ids.note} className="ag-input" maxLength={ASK_NOTE_MAX} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} data-testid="shared-ask-note" />
              </label>
              <div className="ag-row">
                <Button type="submit" size="sm" variant="primary" disabled={askAmount === null} data-testid="shared-ask-send">
                  {W.sendRequest}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)} data-testid="shared-ask-cancel">
                  {W.cancel}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
      {mine.length > 0 && (
        <section className="ag-shared-money__list" aria-label={W.yourRequests}>
          <h3 className="ag-shared-money__head">{W.yourRequests}</h3>
          {mine.map((r) => (
            <div key={r.id} className="ag-shared-money__row" data-testid={`shared-my-ask-${r.id}`}>
              <span>{W.waiting(r.amount, r.note)}</span>
              <Button size="sm" variant="ghost" onClick={() => act({ k: 'cancelAsk', ask: r.id })} data-testid={`shared-my-ask-cancel-${r.id}`}>
                {W.cancel}
              </Button>
            </div>
          ))}
        </section>
      )}
      {approver && theirs.length > 0 && (
        <section className="ag-shared-money__list" aria-label={W.requests}>
          <h3 className="ag-shared-money__head">{W.requests}</h3>
          {theirs.map((r) => (
            <div key={r.id} className="ag-shared-money__row" data-testid={`shared-request-${r.id}`}>
              <span>{W.asks(nameOf(r.by, r.name), r.amount, r.note)}</span>
              <span className="ag-row">
                <Button size="sm" variant="primary" onClick={() => act({ k: 'answerAsk', ask: r.id, yes: true }, { sound: 'coin' })} data-testid={`shared-approve-${r.id}`}>
                  {W.approve}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act({ k: 'answerAsk', ask: r.id, yes: false })} data-testid={`shared-decline-${r.id}`}>
                  {W.decline}
                </Button>
              </span>
            </div>
          ))}
        </section>
      )}
      {approver && limited.length > 0 && to && (
        <section className="ag-shared-money__list" aria-label={W.giveMoney}>
          <h3 className="ag-shared-money__head">{W.giveMoney}</h3>
          <form
            className="ag-shared-money__give"
            onSubmit={(e) => {
              e.preventDefault();
              if (giveAmount === null) return;
              act({ k: 'giveMoney', member: to.id, name: to.name, amount: giveAmount }, { sound: 'coin', after: (r) => r?.ok && setGive('') });
            }}
          >
            <select className="ag-input" aria-label={W.giveMoney} value={to.id} onChange={(e) => setGiveTo(e.target.value)} data-testid="shared-give-member">
              {limited.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input className="ag-input ag-shared-money__amount" aria-label={W.howMuch} inputMode="numeric" autoComplete="off" value={give} onChange={(e) => setGive(e.target.value)} placeholder="$" data-testid="shared-give-amount" />
            <Button type="submit" size="sm" variant="primary" disabled={giveAmount === null} data-testid="shared-give">
              {W.give}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}

/**
 * The owner's spending controls for one member (§8 "Members list", ADR-0050 question 1): Spends freely, Allowance
 * [amount] each game day, or Asks first, and "Can approve requests and give money". The amount field sits beside its
 * choice, not inside it (a tap on a narrow screen lands on the field); a changed amount is sent when the owner leaves
 * the field or presses Enter, never per keystroke, and picks Allowance.
 */
export function MemberSpending({ id, name }: { id: string; name: string }) {
  const g = useGame((s) => s.game);
  const rec = g ? poolMember(g, id) : undefined;
  const tier: PoolTier = rec?.tier ?? 'free';
  const [amount, setAmount] = useState(String(rec?.allowance ?? DEFAULT_ALLOWANCE));
  const [typed, setTyped] = useState(false);
  useEffect(() => {
    if (rec?.allowance !== undefined) setAmount(String(rec.allowance));
  }, [rec?.allowance]);
  const group = useId();
  if (!g) return null;
  const allowance = parseDollars(amount);
  const set = (t: PoolTier) => {
    if (t === 'allowance') {
      if (allowance === null) return;
      setTyped(false);
      if (tier === 'allowance' && rec?.allowance === allowance) return;
      act({ k: 'setSpending', member: id, name, tier: 'allowance', allowance });
    } else if (t !== tier) act({ k: 'setSpending', member: id, name, tier: t });
  };
  const radio = (t: PoolTier, label: string) => (
    <label className="ag-shared-tier__choice" data-testid={`shared-tier-${id}-${t}`}>
      <input type="radio" name={group} checked={tier === t} onChange={() => set(t)} />
      <span>{label}</span>
    </label>
  );
  return (
    <div className="ag-shared-members__money">
      <fieldset className="ag-shared-tiers">
        <legend className="ag-shared-members__label">{W.spending}</legend>
        <div className="ag-shared-tier">{radio('free', W.spendsFreely)}</div>
        <div className="ag-shared-tier">
          {radio('allowance', W.allowance)}
          <input
            className="ag-input ag-shared-tier__amount"
            aria-label={`${name}: ${W.allowance}`}
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTyped(true);
            }}
            onBlur={() => typed && set('allowance')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') set('allowance');
            }}
            data-testid={`shared-allowance-${id}`}
          />
          <span className="ag-shared-members__label">{W.eachGameDay}</span>
        </div>
        <div className="ag-shared-tier">{radio('ask', W.asksFirst)}</div>
      </fieldset>
      <span className="ag-shared-members__switch">
        <span className="ag-shared-members__label" aria-hidden>
          {W.canApprove}
        </span>
        <Toggle checked={!!rec?.approve} onChange={(on) => act({ k: 'setApprover', member: id, name, on })} label={`${name}: ${W.canApprove}`} testId={`shared-approver-${id}`} />
      </span>
    </div>
  );
}
