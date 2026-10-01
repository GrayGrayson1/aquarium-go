/**
 * Market › My Listings — active listings with snapshot, interest meter, time left, reserve/buy-now and bids
 * (accept / decline / counter / wait / withdraw), changed/invalidated states and a celebratory sold state.
 * OWNER: lane "ui-panels".
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Gavel, Plus, Clock, TriangleAlert, OctagonAlert, PartyPopper, Undo2, Check, X, MessageSquareQuote, Hourglass, ChevronDown, Tag, Flame, Eye, Sparkles } from 'lucide-react';
import type { Bid, BuyerProfile, GameState, Listing } from '@/types';
import { Button, Money, Modal, formatMoney } from '@/ui/kit';
import { acceptBid, declineBid, counterBid, withdrawListing, holdBidForCounter, saleWarnings, suggestCounter } from '@/sim/economy';
import { act, edit } from '../common/act';
import { safe } from '../common/hooks';
import { Chip, EmptyState, Bar, Callout, SectionHead, NumberField } from '../common/parts';
import { CreaturePortrait } from '../common/Portrait';
import { TankThumb } from '../common/TankThumb';
import { BuyerAvatar } from '../common/Avatar';
import { useSheet } from '../common/PanelLayout';
import { livingInTank } from '../common/derive';
import { ARCHETYPE_LABEL, LISTING_KIND_LABEL, untilTime, relTime, plural, realIn, realAgo, speedNote, nameList } from '../common/format';
import { FragListingVisual } from './FragListing'; // lane:frags

export function ListingsTab({ g, focusId, onCreate }: { g: GameState; focusId: string | null; onCreate: () => void }) {
  const active = g.market.listings.filter((l) => l.status === 'active').sort((a, b) => openBids(b) - openBids(a) || a.endsHour - b.endsHour);
  const ended = g.market.listings
    .filter((l) => l.status !== 'active')
    .sort((a, b) => closedHour(g, b) - closedHour(g, a))
    .slice(0, 10);

  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-sellhero">
        <div className="pn-grow">
          <div className="pn-sellhero__title">Sell to collectors, breeders & aquariums</div>
          <div className="pn-small pn-dim">List one animal, a group, a breeding pair, juveniles, frags and cuttings — or a whole working aquarium. Buyers bid over time; you choose.</div>
        </div>
        <Button variant="coral" size="lg" onClick={onCreate} data-testid="listing-create">
          <Plus size={17} /> New listing
        </Button>
      </div>

      <section>
        <SectionHead title={`Active · ${active.length}`} icon={<Gavel size={14} />} />
        {active.length === 0 ? (
          <EmptyState icon={<Tag size={24} />} title="Nothing listed right now">
            When you list something, bids from NPC buyers arrive here. Waiting can bring a better offer — but never a guaranteed one.
          </EmptyState>
        ) : (
          <div className="pn-col pn-gap-3">
            {active.map((l) => (
              <ListingCard key={l.id} g={g} l={l} defaultOpen={l.id === focusId || openBids(l) > 0} focus={l.id === focusId} />
            ))}
          </div>
        )}
      </section>

      {ended.length > 0 && (
        <section>
          <SectionHead title="Recently ended" icon={<Clock size={14} />} />
          <div className="pn-col pn-gap-3">
            {ended.map((l) => (
              <ListingCard key={l.id} g={g} l={l} defaultOpen={false} focus={l.id === focusId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const openBids = (l: Listing) => l.bids.filter((b) => b.status === 'open').length;

/**
 * lane:fix-panels — when a listing actually closed. A sale ends a listing early, but `endsHour` keeps the scheduled
 * end, so the sold card said "Sold just now" for days. `closedHour` is the sim's word when it has one; otherwise the
 * sale is dated by its market-history entry or the animal's own "sold" note, and never later than now.
 */
function closedHour(g: GameState, l: Listing): number {
  if (l.closedHour != null) return l.closedHour;
  if (l.status === 'sold') {
    const h = g.market.history.find((x) => x.title === l.title && x.price === l.soldFor);
    if (h) return h.hour;
    for (const id of l.creatureIds) {
      const ev = g.creatures[id]?.history.find((e) => e.kind === 'sold');
      if (ev) return ev.hour;
    }
  }
  return Math.min(l.endsHour, g.clock.hour);
}

function interestWord(v: number): string {
  if (v >= 0.8) return 'Hot';
  if (v >= 0.55) return 'High';
  if (v >= 0.3) return 'Moderate';
  if (v > 0.08) return 'Low';
  return 'Quiet';
}

function ListingVisual({ g, l, size = 92 }: { g: GameState; l: Listing; size?: number }) {
  if (l.snapshot.photo) return <img className="pn-listing__photo" src={l.snapshot.photo} alt={`Photo of ${l.title}`} style={{ width: size * 1.4, height: size }} />;
  if (l.kind === 'frag' && l.fragItems?.length) return <FragListingVisual l={l} size={size} />; // lane:frags
  if (l.kind === 'tank' && l.tankId && g.tanks[l.tankId]) {
    return (
      <span className="pn-listing__thumb">
        <TankThumb tank={g.tanks[l.tankId]} residents={livingInTank(g, l.tankId)} width={size * 1.4} height={size * 0.94} />
      </span>
    );
  }
  const cs = l.creatureIds.map((id) => g.creatures[id]).filter(Boolean).slice(0, 3);
  if (cs.length === 0) return <span className="pn-listing__thumb pn-listing__thumb--empty"><Tag size={22} /></span>;
  return (
    <span className="pn-listing__stack" style={{ width: size + (cs.length - 1) * 22, height: size }}>
      {cs.map((c, i) => (
        <span key={c.id} style={{ left: i * 22, zIndex: 3 - i }}>
          <CreaturePortrait creature={c} size={i === 0 ? size : size * 0.78} />
        </span>
      ))}
    </span>
  );
}

function ListingCard({ g, l, defaultOpen, focus }: { g: GameState; l: Listing; defaultOpen: boolean; focus: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [withdraw, setWithdraw] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focus]);
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const now = g.clock.hour;
  const bids = [...l.bids].sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.amount - a.amount);
  const best = l.bids.filter((b) => b.status === 'open').reduce((m, b) => Math.max(m, b.amount), 0);
  const nOpen = openBids(l);
  const fair = l.lastValuation ?? l.snapshot.valuation;

  if (l.status === 'sold') {
    const buyer = g.market.buyers.find((b) => b.id === l.soldTo);
    const winning = l.bids.find((b) => b.status === 'accepted');
    const buyerName = buyer?.name ?? winning?.buyerName;
    const buyerArch = buyer?.archetype ?? winning?.archetype;
    return (
      <div ref={ref} data-testid={`listing-${l.id}`} className="pn-card pn-sold">
        <div className="pn-sold__shine" aria-hidden />
        <div className="pn-row pn-gap-3">
          <ListingVisual g={g} l={l} size={64} />
          <div className="pn-grow">
            <div className="pn-row pn-gap-2">
              <PartyPopper size={16} className="pn-gold" aria-hidden />
              <span className="pn-sold__label">Sold</span>
              <span className="pn-tiny pn-muted">{relTime(closedHour(g, l), now)}</span>
            </div>
            <div className="pn-card__title pn-ellipsis">{l.title}</div>
            <div className="pn-small pn-dim">
              {buyerName ? (
                <>
                  To <b>{buyerName}</b>
                  {buyerArch ? ` · ${ARCHETYPE_LABEL[buyerArch]}` : ''}
                </>
              ) : (
                'To a happy new home'
              )}
            </div>
            {l.outcome && <div className="pn-tiny pn-muted" style={{ marginTop: 4 }}>{l.outcome}</div>}
          </div>
          <div className="pn-sold__price">
            <Money value={l.soldFor ?? 0} />
            {l.snapshot.valuation > 0 && l.soldFor != null && (
              <span className={clsx('pn-tiny', l.soldFor >= l.snapshot.valuation ? 'pn-tone-good' : 'pn-muted')}>
                {l.soldFor >= l.snapshot.valuation ? '+' : ''}
                {Math.round(((l.soldFor - l.snapshot.valuation) / Math.max(1, l.snapshot.valuation)) * 100)}% vs fair value
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const ended = l.status !== 'active';
  return (
    <div ref={ref} data-testid={`listing-${l.id}`} className={clsx('pn-card pn-listing', ended && 'is-ended', l.status === 'invalidated' && 'pn-card--danger', focus && 'is-selected')}>
      <div className="pn-listing__top">
        <ListingVisual g={g} l={l} />
        <div className="pn-grow pn-col pn-gap-1">
          <div className="pn-row pn-gap-2 pn-row--wrap">
            <Chip>{LISTING_KIND_LABEL[l.kind]}</Chip>
            {l.status === 'active' ? (
              // past its end a listing only stays open while a bid is still being answered
              <Chip tone={l.endsHour - now < 4 ? 'watch' : 'neutral'} icon={<Hourglass size={11} />}>
                {l.endsHour <= now ? 'Bidding closed' : `Ends ${untilTime(l.endsHour, now)}`}
              </Chip>
            ) : (
              <Chip tone={l.status === 'invalidated' ? 'danger' : 'neutral'}>{l.status === 'expired' ? 'Expired' : l.status === 'withdrawn' ? 'Withdrawn' : 'Cancelled'}</Chip>
            )}
            {nOpen > 0 && (
              <Chip tone="coral" icon={<Flame size={11} />}>
                {plural(nOpen, 'open bid')}
              </Chip>
            )}
          </div>
          <div className="pn-card__title pn-ellipsis">{l.title}</div>
          <div className="pn-small pn-muted pn-ellipsis">{l.snapshot.summary}</div>
        </div>
      </div>

      <div className="pn-listing__stats">
        <div className="pn-metric">
          <div className="pn-metric__row">
            <span>Buyer interest</span>
            <span className="pn-metric__val">{interestWord(l.interest)}</span>
          </div>
          <Bar value={l.interest * 100} tone="coral" label="Buyer interest" />
        </div>
        <div className="pn-listing__nums">
          <div>
            <span className="pn-tiny pn-muted">Reserve</span>
            <Money value={l.reserve} />
          </div>
          {l.buyNow != null && l.buyNow > 0 && (
            <div>
              <span className="pn-tiny pn-muted">Buy now</span>
              <Money value={l.buyNow} />
            </div>
          )}
          <div>
            <span className="pn-tiny pn-muted">Fair value</span>
            <Money value={fair} />
          </div>
          <div>
            <span className="pn-tiny pn-muted">Best bid</span>
            {best > 0 ? <Money value={best} /> : <span className="pn-muted">—</span>}
          </div>
        </div>
      </div>

      {l.changedSinceListing && l.status === 'active' && (
        <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Changed since listing">
          {l.changedSinceListing} Buyers bid on what they saw — expect lower offers or withdrawals.
        </Callout>
      )}
      {l.status === 'active' && l.blocked && (
        <Callout tone="danger" icon={<OctagonAlert size={16} />} title="No buyer can complete this sale">
          {l.blocked}
        </Callout>
      )}
      {l.status === 'invalidated' && (
        <Callout tone="danger" icon={<OctagonAlert size={16} />} title="Listing cancelled">
          {l.outcome ?? l.changedSinceListing ?? 'The listed contents are no longer available.'} {l.advice ?? 'Open bids were returned to buyers.'}
        </Callout>
      )}
      {(l.status === 'expired' || l.status === 'withdrawn') && (l.outcome || l.advice) && (
        <Callout tone="info" icon={<Clock size={16} />}>
          {l.outcome} {l.advice}
        </Callout>
      )}

      {l.bids.length > 0 && (
        <div className="pn-listing__bidsbar">
          <button type="button" className="pn-link" onClick={() => setOpen(!open)} aria-expanded={open}>
            <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            {open ? 'Hide bids' : `Show ${plural(l.bids.length, 'bid')}`}
          </button>
        </div>
      )}

      {open && l.bids.length > 0 && (
        <ul className="pn-bids">
          {bids.map((b) => (
            <BidRow key={b.id} g={g} l={l} b={b} buyer={g.market.buyers.find((x) => x.id === b.buyerId)} />
          ))}
          {l.status === 'active' && nOpen > 0 && (
            <li className="pn-bids__wait">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <Hourglass size={14} /> Wait for more offers
              </Button>
              <span className="pn-tiny pn-muted">Waiting may bring a better bid — or buyers may lose interest.</span>
            </li>
          )}
        </ul>
      )}
      {l.status === 'active' && l.bids.length === 0 && (
        <p className="pn-small pn-muted" style={{ margin: '4px 0 0' }}>
          <Eye size={13} style={{ verticalAlign: '-2px' }} /> Buyers are looking. Bids usually arrive within a few hours.
        </p>
      )}

      {l.status === 'active' && (
        <div className="pn-row pn-gap-2" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <Button size="sm" variant="ghost" onClick={() => setWithdraw(true)}>
            <Undo2 size={14} /> Withdraw listing
          </Button>
        </div>
      )}

      <Modal
        open={withdraw}
        onClose={() => setWithdraw(false)}
        title="Withdraw this listing?"
        actions={
          <>
            <Button onClick={() => setWithdraw(false)}>Keep it listed</Button>
            <Button
              variant="danger"
              onClick={() => {
                act((d) => withdrawListing(d, l.id), { sound: 'close', kind: 'info' });
                setWithdraw(false);
              }}
            >
              <Undo2 size={15} /> Withdraw
            </Button>
          </>
        }
      >
        <p className="pn-p">
          {nOpen > 0 ? `${plural(nOpen, 'open bid')} will be declined. ` : ''}Everything returns to your collection. Withdrawing often can make buyers a little wary.
        </p>
      </Modal>
    </div>
  );
}

function BidRow({ g, l, b, buyer }: { g: GameState; l: Listing; b: Bid; buyer?: BuyerProfile }) {
  const { phone } = useSheet();
  const [countering, setCounteringRaw] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  // Opening the counter form asks the buyer to wait (sim: holdBidForCounter — no expiry, no change of heart for
  // ≈ 2 real minutes). Every (re-)open renews the hold; while the form stays open it is quietly topped up.
  const setCountering = (on: boolean) => {
    if (on) {
      const r = act((d) => holdBidForCounter(d, l.id, b.id), { quiet: true, sound: null });
      if (!r?.ok) return;
    }
    setCounteringRaw(on);
  };
  const speed = g.clock.speed;
  // The hold is measured in game hours scaled by the speed at the time it was set, so a jump from 1× to 10× would
  // shrink it tenfold in real time: renew it on every speed change as well as every 15 s.
  useEffect(() => {
    if (!countering) return;
    edit((d) => void holdBidForCounter(d, l.id, b.id));
    const id = window.setInterval(() => edit((d) => void holdBidForCounter(d, l.id, b.id)), 15_000);
    return () => window.clearInterval(id);
  }, [countering, l.id, b.id, speed]);
  const cap = l.buyNow && l.buyNow > 0 ? l.buyNow : Math.max(l.reserve, l.snapshot.valuation) * 1.25;
  // lane:fix-integrate-ui — the sim's suggestion (S03-03): a number most buyers of this kind can still say yes to
  const { amount: suggested, hint } = suggestCounter(l, b);
  const [counter, setCounter] = useState(suggested);
  const now = g.clock.hour;
  const name = buyer?.name ?? b.buyerName ?? 'A buyer';
  const archetype = buyer?.archetype ?? b.archetype;
  const isOpen = b.status === 'open' && l.status === 'active';
  const belowReserve = b.amount < l.reserve;
  const over = l.snapshot.valuation > 0 ? (b.amount - l.snapshot.valuation) / l.snapshot.valuation : 0;
  // lane:fix-panels — the one tap that can't be undone gets a confirm when it matters: the starter, a whole
  // aquarium (or the last one), or a bid under the reserve / well under fair value. Ordinary bids stay one tap.
  const starter = (l.kind === 'tank' && l.tankId ? livingInTank(g, l.tankId) : l.creatureIds.map((id) => g.creatures[id]).filter(Boolean)).find((c) => c?.isStarter);
  const lastTank = l.kind === 'tank' && g.tankOrder.length <= 1;
  // the sim's sale warnings (brood, bonded pair, favourite, sick); a brood or a pair makes the sale worth a second look
  const warnings = isOpen ? safe(() => saleWarnings(g, l.kind === 'tank' && l.tankId ? livingInTank(g, l.tankId).map((c) => c.id) : l.creatureIds), []).filter((w) => !/first animal/i.test(w)) : [];
  const serious = warnings.filter((w) => !/favourite|unwell/i.test(w));
  const weighty = !!starter || l.kind === 'tank' || belowReserve || over <= -0.15 || serious.length > 0;
  const accept = () => act((d) => acceptBid(d, l.id, b.id), { sound: 'sold', quiet: true });

  const details = (
    <>
      {b.message && (
        <div className="pn-bid__msg">
          <MessageSquareQuote size={13} aria-hidden /> <span className="pn-quote">“{b.message}”</span>
        </div>
      )}
      {b.response && (
        <div className="pn-bid__reply">
          <span className="pn-tiny pn-muted">Reply to your counter:</span> <span className="pn-quote">“{b.response}”</span>
        </div>
      )}
      {b.note && <div className="pn-tiny pn-muted">{b.note}</div>}
      <div className="pn-tiny pn-muted">
        {isOpen ? realAgo(now - b.createdHour, speed) : relTime(b.createdHour, now)}
        {isOpen && (b.holdUntilHour ?? 0) > now ? (
          <span className="pn-tone-aqua"> · held while you write your counter</span>
        ) : (
          // lane:w2-ui — bid lifetimes are real time (3–6 min at 1×): one format, like the Shows deadlines
          isOpen && <> · {b.expiresHour <= now ? 'expiring now' : `expires in ${realIn(b.expiresHour - now, speed)}${speedNote(speed)}`}</>
        )}
        {b.status === 'countered' && b.counterAmount != null && <> · you asked {formatMoney(b.counterAmount)} — awaiting reply</>}
      </div>
    </>
  );
  const amount = (
    <div className="pn-bid__amount" style={phone ? { marginLeft: 'auto' } : undefined}>
      <Money value={b.amount} />
      {belowReserve ? <span className="pn-tiny pn-tone-watch">Below reserve</span> : over >= 0.05 ? <span className="pn-tiny pn-tone-good">+{Math.round(over * 100)}% fair value</span> : <span className="pn-tiny pn-muted">{over >= -0.05 ? 'Around fair value' : `${Math.round(over * 100)}% fair value`}</span>}
    </div>
  );

  return (
    <li className={clsx('pn-bid', !isOpen && 'is-closed', `pn-bid--${b.status}`)}>
      {/* lane:fix-panels — on phones the amount joins the name line and the quote/expiry get the full card width
          (they were squeezed into a 142px column beside an 82px amount column) */}
      <div className="pn-bid__row">
        <BuyerAvatar seed={buyer?.avatarSeed ?? seedFrom(b.buyerId)} archetype={archetype} size={44} name={name} />
        <div className="pn-grow pn-col pn-gap-1">
          <div className="pn-row pn-gap-2 pn-row--wrap">
            <b className="pn-bid__name">{name}</b>
            {archetype && <Chip>{ARCHETYPE_LABEL[archetype]}</Chip>}
            {b.status !== 'open' && <Chip tone={b.status === 'accepted' ? 'good' : b.status === 'countered' ? 'aqua' : 'neutral'}>{b.status === 'countered' ? 'Countered' : titleStatus(b.status)}</Chip>}
            {phone && amount}
          </div>
          {!phone && details}
        </div>
        {!phone && amount}
      </div>
      {phone && <div className="pn-col pn-gap-1">{details}</div>}
      {isOpen && !countering && (
        <div className="pn-bid__actions">
          <Button size="sm" variant="primary" data-testid="bid-accept" silent onClick={() => (weighty ? setConfirmAccept(true) : accept())}>
            <Check size={14} /> Accept {formatMoney(b.amount)}
          </Button>
          <Button size="sm" data-testid="bid-counter" onClick={() => { setCounter(suggested); setCountering(true); }}>
            <Gavel size={14} /> Counter
          </Button>
          <Button size="sm" variant="ghost" data-testid="bid-decline" silent onClick={() => act((d) => declineBid(d, l.id, b.id), { sound: 'close', kind: 'info' })}>
            <X size={14} /> Decline
          </Button>
        </div>
      )}
      {isOpen && countering && (
        <div className="pn-bid__counter">
          <div className="pn-col pn-gap-1">
            <span className="pn-tiny pn-muted">Your counter-offer</span>
            <NumberField value={counter} onChange={setCounter} min={Math.ceil(b.amount + 1)} max={Math.max(cap * 3, b.amount * 3)} step={1} bigStep={counter < 200 ? 5 : 25} prefix="$" label="Counter amount" />
            <span className="pn-tiny pn-muted">
              Suggested {formatMoney(suggested)}. {hint}
            </span>
          </div>
          <div className="pn-row pn-gap-2">
            <Button size="sm" onClick={() => setCountering(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              silent
              onClick={() => {
                const r = act((d) => counterBid(d, l.id, b.id, Math.round(counter)), { sound: 'bid' });
                if (r?.ok) setCountering(false);
              }}
            >
              <Gavel size={14} /> Send {formatMoney(counter)}
            </Button>
          </div>
        </div>
      )}
      <Modal
        open={confirmAccept}
        onClose={() => setConfirmAccept(false)}
        title={`Sell to ${name} for ${formatMoney(b.amount)}?`}
        subtitle={l.title}
        actions={
          <>
            <Button onClick={() => setConfirmAccept(false)}>Not yet</Button>
            <Button
              variant="coral"
              data-testid="bid-accept-confirm"
              silent
              onClick={() => {
                setConfirmAccept(false);
                accept();
              }}
            >
              <Check size={15} /> Accept {formatMoney(b.amount)}
            </Button>
          </>
        }
      >
        <div className="pn-col pn-gap-3">
          <p className="pn-p">This closes the auction and hands everything over right away — there’s no undo.</p>
          {starter && (
            <Callout tone="watch" icon={<Sparkles size={16} />} title={`${starter.name} is your starter`}>
              Your very first companion goes with this sale.
            </Callout>
          )}
          {l.kind === 'tank' && (
            <Callout tone={lastTank ? 'danger' : 'watch'} icon={<TriangleAlert size={16} />} title={lastTank ? 'This is your last aquarium' : 'Whole aquarium'}>
              The tank, its gear and decor{l.creatureIds.length ? ` and ${nameList(l.creatureIds.map((id) => g.creatures[id]?.name ?? '').filter(Boolean))}` : ''} all go to {name}.
            </Callout>
          )}
          {warnings.map((w) => (
            <Callout key={w} tone={/carrying|guarding|spawning|expecting/i.test(w) ? 'danger' : 'watch'} icon={<TriangleAlert size={16} />}>
              {w}
            </Callout>
          ))}
          {belowReserve && (
            <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Below your reserve">
              You asked for at least {formatMoney(l.reserve)}.
            </Callout>
          )}
          {!belowReserve && over <= -0.15 && (
            <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Well under fair value">
              {formatMoney(b.amount)} is {Math.round(-over * 100)}% under the {formatMoney(l.snapshot.valuation)} this is worth. Counter, or wait for a better offer.
            </Callout>
          )}
        </div>
      </Modal>
    </li>
  );
}

function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function titleStatus(s: Bid['status']): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

