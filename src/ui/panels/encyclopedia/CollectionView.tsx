/**
 * Encyclopedia › Collection (chunk 21, feature A): the whole collection and its holes. The header's percentage and
 * counts, "Nearly there", "Recently found", filters, and a card per species (its picture or silhouette, its morphs
 * seen, and when open the missing ones as grey outlines with a hint, a tier and how to find each). OWNER: lane
 * "encyclopedia". Every number and rule comes from ./collection.ts (pure, unit-tested); this file only draws them.
 * Address: `#/encyclopedia/collection`, and `#/encyclopedia/collection/{speciesId}` with that card open (one at a time).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, CircleCheck, Clock, Search, Target } from 'lucide-react';
import type { GameState, SpeciesDefinition } from '@/types';
import { findSpecies } from '@/data/species';
import { Button } from '@/ui/kit';
import { Bar, Chip, EmptyState, SectionHead, Tile } from '../common/parts';
import { SpeciesPortrait } from '../common/Portrait';
import { useReducedMotion } from '../common/hooks';
import { ENV_LABEL, RARITY_LABEL, RARITY_TONE } from '../common/format';
import { noMorphsNote } from './morphs';
import {
  collectionCards,
  collectionSummary,
  formatPercent,
  morphSwatch,
  nearlyThere,
  recentFinds,
  speciesMorphs,
  type EnvFilter,
  type NearlyThere,
  type RecentFind,
  type SpeciesProgress,
  type StatusFilter,
} from './collection';
import './collection.css';

/** What an undiscovered species' card says about getting one (the Encyclopedia's own rule, EncyclopediaPanel). */
export type Availability = { text: string; offerId?: string; available: boolean };

export interface CollectionViewProps {
  g: GameState;
  /** The open card's species (one at a time; the address follows it). */
  open: string | null;
  onOpen: (speciesId: string | null) => void;
  /** Bumped when a link asks for the open card (an address, the species page): it is scrolled into view. */
  reveal: number;
  availability: (sp: SpeciesDefinition) => Availability;
  onSpeciesPage: (speciesId: string) => void;
  onOffer: (offerId: string) => void;
}

const STATUS_FILTERS: [StatusFilter, string][] = [
  ['all', 'All'],
  ['in_progress', 'In progress'],
  ['complete', 'Complete'],
  ['not_started', 'Not started'],
];
const ENV_FILTERS: [EnvFilter, string][] = [
  ['all', 'Any water'],
  ['freshwater', 'Freshwater'],
  ['marine', 'Marine'],
  ['brackish', 'Brackish'],
];

const num = (n: number) => n.toLocaleString('en-US');

export function CollectionView({ g, open, onOpen, reveal, availability, onSpeciesPage, onOffer }: CollectionViewProps) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [env, setEnv] = useState<EnvFilter>('all');
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  /**
   * A card to bring into view once it is on screen: to the top when a link, a suggestion or a recent find opened it;
   * just into view when its own header did (another card closing above can move it).
   */
  const pending = useRef<{ id: string; block: ScrollLogicalPosition } | null>(null);

  const p = g.progress;
  const summary = useMemo(() => collectionSummary(g), [p.discoveredSpecies, p.discoveredMorphs, p.discoveredStrains, p.prismaticFinds, g.creatures]); // eslint-disable-line react-hooks/exhaustive-deps
  const cards = useMemo(() => collectionCards(g, { status, env }), [p.discoveredSpecies, p.discoveredMorphs, p.discoveredStrains, p.prismaticFinds, g.creatures, status, env]); // eslint-disable-line react-hooks/exhaustive-deps
  const recent = useMemo(() => recentFinds(g, 5), [p.discoveredAt, p.discoveredStrains, p.prismaticFinds]); // eslint-disable-line react-hooks/exhaustive-deps
  const tips = useMemo(() => nearlyThere(g, 3), [p.discoveredSpecies, p.discoveredMorphs, g.creatures, g.market.stock, Math.floor(g.clock.hour)]); // eslint-disable-line react-hooks/exhaustive-deps

  // a link asked for a card: show every card, so it can't be filtered away, then bring it into view
  useEffect(() => {
    if (!reveal || !open) return;
    pending.current = { id: open, block: 'start' };
    setStatus('all');
    setEnv('all');
  }, [reveal]); // eslint-disable-line react-hooks/exhaustive-deps
  const bringIntoView = () => {
    const want = pending.current;
    if (!want) return;
    const el = root.current?.querySelector<HTMLElement>(`[data-testid="collection-card-${want.id}"]`);
    if (!el) return;
    pending.current = null;
    el.scrollIntoView?.({ block: want.block, behavior: reduced ? 'auto' : 'smooth' });
    el.querySelector<HTMLElement>('.ag-col-card__head')?.focus({ preventScroll: true });
  };
  useEffect(bringIntoView);

  const toggle = (id: string) => {
    if (open === id) onOpen(null);
    else {
      pending.current = { id, block: 'nearest' };
      onOpen(id);
    }
  };
  /** A suggestion or a recent find opens its species' card (kept open if it is), showing every card if it was filtered away. */
  const toggleTo = (id: string) => {
    pending.current = { id, block: 'start' };
    const hidden = !cards.some((c) => c.speciesId === id);
    if (hidden) {
      setStatus('all');
      setEnv('all');
    }
    if (open !== id) onOpen(id);
    else if (!hidden) bringIntoView(); // nothing changes on screen, so no render will do it
  };

  return (
    <div className="ag-col" ref={root} data-testid="collection">
      <section className="ag-col-head" data-testid="collection-summary" aria-labelledby="ag-col-title">
        <div className="ag-col-head__top">
          <div className="ag-col-head__pct" data-testid="collection-percent">
            {formatPercent(summary.percent)}
          </div>
          <div className="pn-grow">
            <h3 className="ag-col-head__title" id="ag-col-title">
              Your collection
            </h3>
            <p className="ag-col-head__note">Each species counts the same: half for finding it, half for the morphs you have seen. A species with no named colour morphs counts in full once found.</p>
          </div>
        </div>
        <Bar value={summary.percent} tone="aqua" label="Your collection" />
        <div className="pn-grid pn-grid--tiles">
          <Tile label="Species" value={num(summary.speciesFound)} hint={`of ${num(summary.speciesTotal)}`} />
          <Tile label="Morphs" value={num(summary.morphsSeen)} hint={`of ${num(summary.morphsTotal)}`} />
          <Tile label="Named strains" value={num(summary.strainsFound)} hint={`of ${num(summary.strainsTotal)}`} />
          <Tile label="Prismatic" value={num(summary.prismatic)} hint={summary.prismatic === 1 ? 'animal found' : 'animals found'} />
        </div>
      </section>

      {tips.length > 0 && (
        <section data-testid="collection-nearly">
          <SectionHead title="Nearly there" icon={<Target size={14} />} />
          <ul className="ag-col-list">
            {tips.map((t) => (
              <li key={`${t.kind}:${t.speciesId}`}>
                <TipRow t={t} onOpen={toggleTo} onOffer={onOffer} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section data-testid="collection-recent">
        <SectionHead title="Recently found" icon={<Clock size={14} />} />
        {recent.length > 0 ? (
          <ul className="ag-col-list">
            {recent.map((r) => (
              <li key={`${r.speciesId}:${r.hour}`}>
                <RecentRow r={r} onOpen={toggleTo} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="pn-small pn-muted ag-col-empty">Your next finds will show here, with the day you found them.</p>
        )}
      </section>

      <section aria-label="Species cards">
        <div className="ag-col-filters">
          <div className="pn-chips" role="group" aria-label="Show">
            {STATUS_FILTERS.map(([id, label]) => (
              <Chip key={id} onClick={() => setStatus(id)} pressed={status === id} testId={`collection-filter-${id}`}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="pn-chips" role="group" aria-label="Water type">
            {ENV_FILTERS.map(([id, label]) => (
              <Chip key={id} onClick={() => setEnv(id)} pressed={env === id} testId={`collection-env-${id}`}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        {cards.length === 0 ? (
          <EmptyState icon={<Search size={22} />} title="Nothing here yet">
            No species match these filters.
          </EmptyState>
        ) : (
          <ul className="ag-col-cards">
            {cards.map((c) => (
              <li key={c.speciesId}>
                <SpeciesCard g={g} p={c} open={open === c.speciesId} onToggle={() => toggle(c.speciesId)} availability={availability} onSpeciesPage={onSpeciesPage} onOffer={onOffer} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TipRow({ t, onOpen, onOffer }: { t: NearlyThere; onOpen: (id: string) => void; onOffer: (offerId: string) => void }) {
  const sp = findSpecies(t.speciesId);
  if (!sp) return null;
  let title: string;
  let text: string;
  if (t.kind === 'pair') {
    title = `${t.names[0]} and ${t.names[1]}`;
    text = `About ${Math.max(1, Math.round(t.chance * 100))}% of their young could be a morph you’re missing: ${t.hint}`;
  } else if (t.kind === 'species') {
    title = sp.commonName;
    text = `${num(t.seen)} of ${num(t.total)} morphs seen · ${num(t.total - t.seen)} to go`;
  } else {
    title = 'Undiscovered species';
    text = 'One is in the shop now.';
  }
  // (a pair's and a species' tip are about found species; the shop's is about one still undiscovered)
  return (
    <button type="button" className="ag-col-row" data-testid={`collection-tip-${t.kind}`} onClick={() => (t.kind === 'shop' ? onOffer(t.offerId) : onOpen(sp.id))}>
      <SpeciesPortrait speciesId={sp.id} size={36} silhouette={t.kind === 'shop'} />
      <span className="ag-col-row__main">
        <span className="ag-col-row__title">{title}</span>
        <span className="ag-col-row__text">{text}</span>
      </span>
      <ChevronRight size={16} className="ag-col-row__chev" aria-hidden />
    </button>
  );
}

/** "New species · New morph: Red Veiltail · Named strain: … · Prismatic: …" */
export function recentWords(r: RecentFind): string {
  const parts: string[] = [];
  if (r.newSpecies) parts.push('New species');
  if (r.morphs.length === 1) parts.push(`New morph: ${r.morphs[0]}`);
  else if (r.morphs.length > 1) parts.push(`New morphs: ${r.morphs.slice(0, 2).join(', ')}${r.morphs.length > 2 ? ` and ${r.morphs.length - 2} more` : ''}`);
  if (r.strains.length) parts.push(`${r.strains.length === 1 ? 'Named strain' : 'Named strains'}: ${r.strains.join(', ')}`);
  if (r.prismatic.length) parts.push(`Prismatic: ${r.prismatic.join(', ')}`);
  return parts.join(' · ');
}

function RecentRow({ r, onOpen }: { r: RecentFind; onOpen: (id: string) => void }) {
  const sp = findSpecies(r.speciesId);
  if (!sp) return null;
  return (
    <button type="button" className="ag-col-row" data-testid="collection-recent-row" onClick={() => onOpen(sp.id)}>
      <SpeciesPortrait speciesId={sp.id} size={36} />
      <span className="ag-col-row__main">
        <span className="ag-col-row__title">{sp.commonName}</span>
        <span className="ag-col-row__text">{recentWords(r)}</span>
      </span>
      <span className="ag-col-row__day">Day {num(r.day)}</span>
    </button>
  );
}

/** The card's one-line summary under its name. */
function metaLine(p: SpeciesProgress, avail: Availability | null): string {
  const env = ENV_LABEL[p.environment];
  if (!p.found) return `${env} · ${avail?.text ?? ''}${p.noMorphs ? '' : ` · ${num(p.morphsTotal)} morphs to find`}`;
  if (p.noMorphs) return `${env} · No named colour morphs`;
  return `${env} · ${num(p.morphsSeen)} of ${num(p.morphsTotal)} morphs`;
}

function SpeciesCard({ g, p, open, onToggle, availability, onSpeciesPage, onOffer }: { g: GameState; p: SpeciesProgress; open: boolean; onToggle: () => void; availability: (sp: SpeciesDefinition) => Availability; onSpeciesPage: (id: string) => void; onOffer: (offerId: string) => void }) {
  const sp = findSpecies(p.speciesId);
  if (!sp) return null;
  const avail = p.found ? null : availability(sp);
  const share = p.morphsTotal ? (100 * p.morphsSeen) / p.morphsTotal : 0;
  const bodyId = `ag-col-body-${sp.id}`;
  return (
    <article className={clsx('ag-col-card', open && 'is-open', !p.found && 'is-unknown', p.status === 'complete' && 'is-complete')} data-testid={`collection-card-${sp.id}`} data-status={p.status} data-found={p.found ? '1' : '0'}>
      <button type="button" className="ag-col-card__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle} data-testid={`collection-toggle-${sp.id}`}>
        <SpeciesPortrait speciesId={sp.id} size={52} silhouette={!p.found} />
        <span className="ag-col-card__main">
          <span className="ag-col-card__name">{p.found ? sp.commonName : 'Undiscovered'}</span>
          <span className="ag-col-card__meta">{metaLine(p, avail)}</span>
          {!p.noMorphs && (
            <span className="ag-col-meter" aria-hidden>
              <span className="ag-col-meter__fill" style={{ width: `${share}%` }} />
            </span>
          )}
        </span>
        {p.status === 'complete' && (
          <span className="ag-col-card__done">
            <CircleCheck size={13} aria-hidden /> Complete
          </span>
        )}
        <ChevronDown size={16} className="ag-col-card__chev" aria-hidden />
      </button>
      {open && (
        <div className="ag-col-card__body" id={bodyId} data-testid={`collection-body-${sp.id}`}>
          {!p.found ? (
            <>
              <p className="pn-small">Find this species to start its card.</p>
              {avail?.text && <p className="pn-small pn-muted">{avail.text}</p>}
              {avail?.offerId && (
                <div>
                  <Button size="sm" variant="primary" onClick={() => onOffer(avail.offerId!)}>
                    See it in the shop
                  </Button>
                </div>
              )}
            </>
          ) : p.noMorphs ? (
            <p className="pn-small">
              No named colour morphs{noMorphsNote(sp) ? `: ${noMorphsNote(sp)}` : ''}. Finding it completes its card.
            </p>
          ) : (
            <MorphLists g={g} sp={sp} p={p} />
          )}
          {p.found && (
            <div>
              <Button size="sm" variant="ghost" onClick={() => onSpeciesPage(sp.id)} data-testid={`collection-species-${sp.id}`}>
                Open species page
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Missing morphs shown at first, and added per "Show more". */
const MISSING_STEP = 12;
const SEEN_STEP = 30;

function MorphLists({ g, sp, p }: { g: GameState; sp: SpeciesDefinition; p: SpeciesProgress }) {
  const { seen, missing } = useMemo(() => speciesMorphs(g, sp), [g.progress.discoveredMorphs, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const [missingShown, setMissingShown] = useState(MISSING_STEP);
  const [seenShown, setSeenShown] = useState(SEEN_STEP);
  const extras = [p.strainsTotal > 0 ? `Named strains: ${num(p.strainsFound)} of ${num(p.strainsTotal)}` : '', p.prismatic > 0 ? `Prismatic finds: ${num(p.prismatic)}` : ''].filter(Boolean);
  const moreMissing = Math.min(MISSING_STEP * 2, missing.length - missingShown);
  return (
    <>
      {missing.length > 0 ? (
        <div>
          <h4 className="ag-col-sub">Still to find · {num(missing.length)}</h4>
          <ul className="ag-col-morphs">
            {missing.slice(0, missingShown).map((m) => (
              <li key={m.morphName} className="ag-col-morph is-missing" data-testid="collection-missing">
                <span className="ag-col-swatch is-missing" aria-hidden />
                <span className="ag-col-morph__main">
                  <span className="ag-col-morph__name">
                    <span className="pn-sr">Not yet seen: </span>
                    {m.hint}
                  </span>
                  <span className="ag-col-morph__how">{m.how}</span>
                </span>
                <Chip tone={RARITY_TONE[m.tier]}>{RARITY_LABEL[m.tier]}</Chip>
              </li>
            ))}
          </ul>
          {moreMissing > 0 && (
            <button type="button" className="ag-linkbtn" onClick={() => setMissingShown((n) => n + MISSING_STEP * 2)}>
              Show {num(moreMissing)} more
            </button>
          )}
        </div>
      ) : (
        <p className="pn-small">Every morph seen. This card is complete.</p>
      )}
      {seen.length > 0 && (
        <div>
          <h4 className="ag-col-sub">Seen · {num(seen.length)}</h4>
          <ul className="ag-col-seen">
            {seen.slice(0, seenShown).map((e) => (
              <li key={e.morphName} className="ag-col-chip" data-testid="collection-seen">
                <span className="ag-col-swatch" style={{ background: morphSwatch(sp, e) }} aria-hidden />
                {e.morphName}
              </li>
            ))}
          </ul>
          {seen.length > seenShown && (
            <button type="button" className="ag-linkbtn" onClick={() => setSeenShown(seen.length)}>
              Show all {num(seen.length)}
            </button>
          )}
        </div>
      )}
      {extras.length > 0 && <p className="pn-tiny pn-muted">{extras.join(' · ')}</p>}
    </>
  );
}
