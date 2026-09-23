/**
 * Market › frags & cuttings (lane "frags"): the picker, value breakdown and review for a 'frag' listing, plus the
 * listing-card visual. Used by CreateListing and Listings.
 */
import { useState } from 'react';
import clsx from 'clsx';
import { Check, Info, Sprout, Scissors } from 'lucide-react';
import type { DecorInstance, GameState, Listing, ListingSnapshot } from '@/types';
import { Button, Money, formatMoney } from '@/ui/kit';
import { getDecorDef } from '@/data/catalog/decor';
import { fragLabel, isCoralDef } from '@/sim/aquascape';
import { fragValue, fragBundleValue, FRAG_HEALED_HOURS, MAX_FRAGS_PER_LISTING } from '@/sim/economy';
import { safe } from '../common/hooks';
import { Chip, EmptyState, KV, Bar, Callout } from '../common/parts';
import { formatSpan, plural } from '../common/format';
import { FragSwatch } from '../build/FragAction';
import '../build/frags.css';

const healedAt = (g: GameState, f: DecorInstance) => f.frag?.plantedHour !== undefined && g.clock.hour - f.frag.plantedHour >= FRAG_HEALED_HOURS;

/** Up to three overlapping frag swatches (listing cards, review). */
export function FragStack({ items, size = 64 }: { items: DecorInstance[]; size?: number }) {
  const shown = items.slice(0, 3);
  const step = Math.round(size * 0.34);
  return (
    <span className="fr-stack" style={{ width: size + (shown.length - 1) * step, height: size }} aria-hidden>
      {shown.map((f, i) => (
        <span key={f.id} style={{ left: i * step, zIndex: 3 - i }}>
          <FragSwatch defId={f.defId} growth={f.growth} size={i === 0 ? size : Math.round(size * 0.84)} />
        </span>
      ))}
    </span>
  );
}

export function FragListingVisual({ l, size = 92 }: { l: Listing; size?: number }) {
  const items = l.fragItems ?? [];
  if (!items.length) return null;
  return (
    <span className="pn-listing__thumb" data-testid={`frag-listing-visual-${l.id}`}>
      <FragStack items={items} size={Math.round(size * 0.82)} />
    </span>
  );
}

/** Choose frags/cuttings from storage (any mix: a single frag, a frag pack, a bundle of cuttings). */
export function FragPicker({ g, ids, setIds }: { g: GameState; ids: string[]; setIds: (v: string[]) => void }) {
  const pool = g.inventory.frags ?? [];
  const chosen = pool.filter((f) => ids.includes(f.id));
  const total = safe(() => fragBundleValue(g, chosen).expected, 0);
  const toggle = (id: string, on: boolean) => setIds(on ? [...ids, id].slice(0, MAX_FRAGS_PER_LISTING) : ids.filter((x) => x !== id));
  const sorted = [...pool].sort((a, b) => Number(isCoralDef(getDecorDef(b.defId))) - Number(isCoralDef(getDecorDef(a.defId))) || a.defId.localeCompare(b.defId));
  return (
    <section className="pn-col pn-gap-3" data-testid="frag-picker">
      <h3 className="pn-wizard__h">Which frags and cuttings?</h3>
      {pool.length === 0 ? (
        <EmptyState icon={<Scissors size={24} />} title="No frags in storage">
          Grown corals and plants can be propagated: open Build → Decor and use “Take frag” or “Take cutting” on a piece that has grown in.
        </EmptyState>
      ) : (
        <>
          <div className="pn-row pn-gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIds(sorted.slice(0, MAX_FRAGS_PER_LISTING).map((f) => f.id))}>
              Select {pool.length > MAX_FRAGS_PER_LISTING ? `first ${MAX_FRAGS_PER_LISTING}` : 'all'}
            </Button>
            {ids.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setIds([])}>
                Clear
              </Button>
            )}
          </div>
          <ul className="fr-pick" role="list">
            {sorted.map((f) => {
              const on = ids.includes(f.id);
              const healed = healedAt(g, f);
              const coral = isCoralDef(getDecorDef(f.defId));
              const v = safe(() => fragValue(g, f).expected, 0);
              return (
                <li key={f.id}>
                  <label className={clsx('fr-pickrow', on && 'is-on')} data-testid={`frag-pick-${f.id}`}>
                    <input type="checkbox" className="pn-sr" checked={on} onChange={(e) => toggle(f.id, e.target.checked)} />
                    <span className="fr-check" aria-hidden>
                      {on && <Check size={13} />}
                    </span>
                    <FragSwatch defId={f.defId} growth={f.growth} size={44} />
                    <span className="pn-grow pn-col" style={{ gap: 2, minWidth: 0 }}>
                      <b className="pn-serif pn-ellipsis">{fragLabel(f)}</b>
                      <span className="pn-tiny pn-muted pn-ellipsis">
                        {coral ? (healed ? 'Healed on its plug' : 'Fresh cut') : healed ? 'Rooted' : 'Fresh cutting'} · {Math.round((f.growth ?? 0) * 100)}% grown · health {Math.round(f.health ?? 90)}
                      </span>
                    </span>
                    <Money value={v} cents={v < 10} />
                  </label>
                </li>
              );
            })}
          </ul>
          {chosen.length > 0 && (
            <div className="pn-small pn-dim">
              {plural(chosen.length, 'piece')} selected · worth about <Money value={total} />
            </div>
          )}
          {chosen.length >= MAX_FRAGS_PER_LISTING && <div className="pn-tiny pn-muted">A listing holds up to {MAX_FRAGS_PER_LISTING} frags or cuttings.</div>}
        </>
      )}
    </section>
  );
}

/** "How is this valued?" for frags: the bundle factors plus each piece's value and its own factors. */
export function FragValueDetails({ g, ids }: { g: GameState; ids: string[] }) {
  const [open, setOpen] = useState(false);
  const items = (g.inventory.frags ?? []).filter((f) => ids.includes(f.id));
  if (!items.length) return null;
  const bundle = safe(() => fragBundleValue(g, items), null);
  const first = safe(() => fragValue(g, items[0]), null);
  return (
    <div className="pn-card pn-card--flat">
      <button type="button" className="pn-link" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Info size={14} /> {open ? 'Hide' : 'How is this valued?'}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {items.slice(0, 8).map((f) => (
            <KV key={f.id} label={fragLabel(f)}>
              {formatMoney(safe(() => fragValue(g, f).expected, 0), { cents: true })}
            </KV>
          ))}
          {items.length === 1 && first && (
            <>
              <KV label="Share of a colony’s price" hint={`A fresh ${isCoralDef(getDecorDef(items[0].defId)) ? 'frag' : 'cutting'} of this piece`}>
                {formatMoney(first.base, { cents: true })}
              </KV>
              {first.factors.map((f) => (
                <KV key={f.label} label={f.label} hint={f.note}>
                  ×{f.mult.toFixed(2)}
                </KV>
              ))}
            </>
          )}
          {bundle?.factors.map((f) => (
            <KV key={f.label} label={f.label} hint={f.note}>
              ×{f.mult.toFixed(2)}
            </KV>
          ))}
          <p className="pn-tiny pn-muted" style={{ margin: '8px 0 0' }}>
            Coral frags fetch more than plant cuttings, and LPS and SPS more than soft corals. Healed, grown-out frags are worth more. Many recent frag sales soften prices for a few days.
          </p>
        </div>
      )}
    </div>
  );
}

/** Review block for a frag listing. */
export function FragReview({
  g,
  ids,
  photo,
  title,
  setTitle,
  reserve,
  buyNow,
  duration,
  durationReal,
  expected,
  snapshot,
  warnings,
}: {
  g: GameState;
  ids: string[];
  photo: string | null;
  title: string;
  setTitle: (t: string) => void;
  reserve: number;
  buyNow?: number;
  duration: number;
  durationReal?: string;
  expected: number;
  snapshot?: ListingSnapshot;
  warnings: string[] | null;
}) {
  const items = (g.inventory.frags ?? []).filter((f) => ids.includes(f.id));
  const health = snapshot?.healthScore ?? 90;
  const beauty = snapshot?.beautyScore ?? 60;
  const kinds = new Map<string, number>();
  for (const f of items) kinds.set(f.defId, (kinds.get(f.defId) ?? 0) + 1);
  return (
    <section className="pn-col pn-gap-4" data-testid="frag-review">
      <h3 className="pn-wizard__h">Review your listing</h3>
      <div className="pn-card pn-review">
        <div className="pn-review__visual">{photo ? <img src={photo} alt="Listing photo" /> : <FragStack items={items} size={96} />}</div>
        <div className="pn-col pn-gap-2 pn-grow">
          <label className="pn-field">
            <span className="pn-field__label">Listing title</span>
            <input className="pn-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="pn-chips">
            {[...kinds.entries()].slice(0, 4).map(([id, n]) => (
              <Chip key={id} tone={isCoralDef(getDecorDef(id)) ? 'aqua' : 'good'} icon={<Sprout size={11} />}>
                {n} × {fragLabel({ defId: id })}
              </Chip>
            ))}
            {kinds.size > 4 && <Chip>+{kinds.size - 4} more</Chip>}
          </div>
        </div>
      </div>
      <div className="pn-grid pn-grid--2">
        <div className="pn-card pn-card--flat">
          <div className="pn-metric">
            <div className="pn-metric__row">
              <span>Condition</span>
              <span className="pn-metric__val">{Math.round(health)}/100</span>
            </div>
            <Bar value={health} label="Condition" />
          </div>
          <div className="pn-metric" style={{ marginTop: 12 }}>
            <div className="pn-metric__row">
              <span>Appearance</span>
              <span className="pn-metric__val">{Math.round(beauty)}/100</span>
            </div>
            <Bar value={beauty} tone="aqua" label="Appearance" />
          </div>
        </div>
        <div className="pn-card pn-card--flat">
          <KV label="Provenance">{snapshot?.lineageSummary ?? 'Aquacultured in your shop'}</KV>
          <KV label="Care difficulty">{snapshot?.careDifficulty ?? '—'}</KV>
          <KV label="Duration">
            {formatSpan(duration)}
            {durationReal && <span className="pn-tiny pn-muted"> · {durationReal}</span>}
          </KV>
        </div>
      </div>
      <div className="pn-card pn-card--flat">
        <KV label="Reserve">
          <Money value={reserve} />
        </KV>
        <KV label="Buy now">{buyNow ? <Money value={buyNow} /> : 'Off'}</KV>
        <KV label="Expected fair value">
          <Money value={expected} />
        </KV>
      </div>
      {(warnings ?? []).map((w, i) => (
        <Callout key={i} tone={/fresh cut/i.test(w) ? 'watch' : 'info'} icon={<Info size={16} />}>
          {w}
        </Callout>
      ))}
    </section>
  );
}
