/**
 * Market › Shop — livestock offers, offer detail with destination tank + ALWAYS-on compatibility preview, buy.
 * 0.5 (chunk 2, spec §7): Prismatic only / Rare genes filters with a count, morph-named cards with strain and gene
 * chips, and in the detail the Genes and Temperament sections, the morph line, per-tile verdicts, the fit badge and
 * the build-a-tank path. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { Clock, BadgeCheck, ShoppingBag, Store, Lock, Mars, Venus, CircleDashed, Users, Plus, Info, TriangleAlert, Leaf, Sparkles, Dna, BellRing, CircleX, Hammer } from 'lucide-react';
import type { CompatVerdict, Creature, GameState, ShopOffer, Tank, CompatReport, SpeciesDefinition } from '@/types';
import { Button, Money, StatusBadge, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { buyOffer, offerPickPrice } from '@/sim/economy';
import { describePersonality, isPrismatic, isLotOffer, oneInLabel, morphDisplayName, catalogEntry, geneticsRevealLevel } from '@/sim/life';
import { PRISMATIC } from '@/data/rarity'; // lane:genetics
import { PrismaticBadge } from '@/ui/common/Prismatic'; // lane:genetics
import { previewAddition, environmentGate } from '@/sim/compat';
import { fitsEnvironment } from '@/sim/compat/salinity'; // lane:brackish
import { useNav } from '@/ui/nav/router'; // lane:ui-shell (chunk 1)
import { SubView } from '../common/PanelLayout';
import { safe, useIsPhone } from '../common/hooks';
import { act } from '../common/act';
import { rememberOfferReturn } from './offerReturn'; // lane:qa-play
import { useShopFilters, offerMatches, filtersActive } from './shopFilters'; // lane:ui-shell (chunk 1)
import { useSeenStock } from './seenStock'; // lane:notify (0.5 §5.2)
import { CopyLinkButton, OfferLinkRow, useOfferLink } from './OfferLink'; // lane:ui-shell (chunk 1)
import { expressedNewGenes, labPartners, rareCarried, speciesPlural, strainOrMorphTier } from './offerGenetics';
import { buyState, NO_TANK_BADGE, NO_TANK_CALLOUT, tileTempReason } from './buyState';
import { OfferGenes } from './OfferGenes';
import { OfferTemperament } from './OfferTemperament';
import { Chip, Card, EmptyState, Callout, SectionHead, Checkbox } from '../common/parts';
import { CreaturePortrait } from '../common/Portrait';
import { CompatPreview } from '../common/CompatPreview';
import { PotentialBands, CareChips } from '../common/Profile';
import { orderedTanks, speciesOf, livingInTank, gallonsOf, EMPTY_COMPAT, speciesUnlocked } from '../common/derive';
import { PERSONALITY_LABEL, PERSONALITY_TONE, WATER_CLASS_LABEL, ENV_LABEL, untilTime, plural, SEX_LABEL, RARITY_LABEL, RARITY_TONE, VERDICT_RANK, VERDICT_LABEL, verdictStatus } from '../common/format';
import './offer-genes.css';

type EnvFilter = 'all' | 'freshwater' | 'marine' | 'brackish' | 'fits'; // lane:brackish: + 'brackish'

/** At most this many destination tiles get an eager compatibility preview (PERF-001, spec §22 risk 6). */
const TILE_PREVIEWS = 6;

export function ShopTab({ g, offerId, setOfferId }: { g: GameState; offerId: string | null; setOfferId: (id: string | null) => void }) {
  // lane:ui-shell (chunk 1) — the filters live in the session's shop filters, which the address carries (#/shop?env=…)
  const filters = useShopFilters((s) => s.filters);
  const setFilters = useShopFilters.getState().setFilters;
  const tanks = orderedTanks(g);
  const offer = offerId ? g.market.stock.find((o) => o.id === offerId) : undefined;
  // lane:notify (0.5 §5.2) — an open Shop has shown the player its stock: the Market's rare-stock dot goes out
  const stockKey = g.market.stock.map((o) => o.id).join(',');
  useEffect(() => {
    useSeenStock.getState().markSeen(g.market.stock.map((o) => o.id));
  }, [stockKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyed by offer: moving straight from one offer to another starts with fresh picks, tank choice and risk box
  if (offerId && offer) return <OfferDetail key={offer.id} g={g} offer={offer} onBack={() => setOfferId(null)} />;
  if (offerId && !offer)
    return (
      <SubView onBack={() => setOfferId(null)} backLabel="Back to shop">
        <FromNotificationBanner />
        <EmptyState
          icon={<Clock size={24} />}
          title="This offer has gone"
          action={
            <Button onClick={() => setOfferId(null)} data-testid="offer-gone-stock">
              <Store size={15} aria-hidden /> See what’s in stock
            </Button>
          }
        >
          Another shop snapped it up, or it expired. New stock arrives regularly.
        </EmptyState>
      </SubView>
    );

  const inStock = g.market.stock.filter((o) => !!speciesOf(o.speciesId));
  const stock = inStock.filter((o) => offerMatches(g, o, filters));
  const lab = geneticsRevealLevel(g, {}) >= 1;
  const clear = () => useShopFilters.getState().clearFilters();

  return (
    <div className="pn-stack">
      <div className="pn-row pn-row--wrap pn-gap-2">
        <div className="pn-chips pn-chips--scroll">
          {(
            [
              ['all', 'All stock'],
              ['fits', 'Fits my tanks'],
              ['freshwater', 'Freshwater'],
              ['marine', 'Marine'],
              ...(g.progress.unlocked.includes('brackish') ? ([['brackish', 'Brackish']] as [EnvFilter, string][]) : []), // lane:brackish
            ] as [EnvFilter, string][]
          ).map(([id, label]) => (
            <Chip key={id} onClick={() => setFilters({ env: id })} pressed={filters.env === id}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      {/* 0.5 §7.2 — the second row: Prismatic only, Rare genes and the count */}
      <div className="ag-shopfilters">
        <Chip onClick={() => setFilters({ prismatic: !filters.prismatic })} pressed={filters.prismatic} className="ag-chip-prismatic" icon={<Sparkles size={13} aria-hidden />} testId="shop-filter-prismatic">
          Prismatic only
        </Chip>
        <Chip onClick={() => setFilters({ rare: !filters.rare })} pressed={filters.rare} className="ag-chip-rare" icon={<Dna size={13} aria-hidden />} testId="shop-filter-rare">
          Rare genes
        </Chip>
        <span className="ag-shopfilters__count" data-testid="shop-filter-count" aria-live="polite">
          {stock.length} of {inStock.length}
        </span>
      </div>
      {filters.rare && (
        <p className={clsx('ag-shophint', lab ? 'is-lab' : 'is-locked')} data-testid="shop-filter-hint">
          {lab ? <Dna size={13} aria-hidden /> : <Lock size={13} aria-hidden />}
          {lab ? 'Genetics Lab: animals carrying rare hidden genes are included.' : 'Showing rare traits you can see. Hidden carriers appear once you research the Genetics Lab.'}
        </p>
      )}
      {stock.length === 0 ? (
        <div data-testid="shop-empty">
          {inStock.length === 0 ? (
            <EmptyState icon={<Store size={26} />} title="The shelves are being restocked">
              Breeders deliver new captive-bred animals throughout the day. Check back soon.
            </EmptyState>
          ) : filters.prismatic && !inStock.some((o) => o.creatures.some(isPrismatic)) ? (
            <EmptyState icon={<Sparkles size={26} className="ag-violet" />} title="No Prismatic animals right now" action={<ClearFilters onClick={clear} />}>
              About {oneInLabel(PRISMATIC.shopChance)} stocked animals shimmers. New stock arrives through the day.
            </EmptyState>
          ) : (
            <EmptyState icon={<Store size={26} />} title="Nothing matches that filter" action={filtersActive(filters) ? <ClearFilters onClick={clear} /> : undefined}>
              Try another filter to see more animals.
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="pn-grid pn-grid--2 pn-grid--auto-wide ag-offergrid">
          {/* lane:genetics — a Prismatic offer leads the shelf (stable: shop order is otherwise untouched) */}
          {[...stock].sort((a, b) => Number(b.creatures.some(isPrismatic)) - Number(a.creatures.some(isPrismatic))).map((o) => (
            <OfferCard key={o.id} g={g} offer={o} index={g.market.stock.indexOf(o)} onOpen={() => setOfferId(o.id)} tanks={tanks} />
          ))}
        </div>
      )}
      {stock.length > 0 && (
        <p className="pn-small pn-muted" style={{ textAlign: 'center' }}>
          <Leaf size={12} style={{ verticalAlign: '-2px' }} aria-hidden /> Captive-bred animals are hardier and kinder to wild reefs and rivers.
        </p>
      )}
    </div>
  );
}

function ClearFilters({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} data-testid="shop-clear-filters">
      Clear filters
    </Button>
  );
}

function SexMark({ c }: { c: Creature }) {
  if (c.sex === 'male') return <Mars size={13} className="pn-sex pn-sex--m" aria-label="Male" />;
  if (c.sex === 'female') return <Venus size={13} className="pn-sex pn-sex--f" aria-label="Female" />;
  return <CircleDashed size={12} className="pn-sex" aria-label="Unsexed" />;
}

/** The card and hero title: the morph display name ("Royal Blue Butterfly Halfmoon Betta"); groups "10 × …". */
function offerTitle(sp: SpeciesDefinition | undefined, offer: ShopOffer, lead: Creature | undefined): string {
  const name = sp ? safe(() => morphDisplayName(sp, lead?.morphName ?? ''), sp.commonName) : offer.speciesId;
  return offer.kind === 'group' ? `${offer.creatures.length} × ${name}` : name;
}

/** The strain chip(s): "{Strain}" + "{Tier} strain", or "{Tier} morph" (none for Common). */
function StrainChips({ sp, c, joined }: { sp: SpeciesDefinition; c: Creature; joined?: boolean }) {
  const s = safe(() => strainOrMorphTier(sp, c), null);
  if (!s) return null;
  const tone = RARITY_TONE[s.tier];
  if (!s.strain) return <Chip tone={tone}>{RARITY_LABEL[s.tier]} morph</Chip>;
  if (joined)
    return (
      <Chip tone={tone} icon={<Dna size={11} aria-hidden />}>
        {s.strain} · {RARITY_LABEL[s.tier]} strain
      </Chip>
    );
  return (
    <>
      <Chip tone={tone} icon={<Dna size={11} aria-hidden />}>
        {s.strain}
      </Chip>
      <Chip tone={tone}>{RARITY_LABEL[s.tier]} strain</Chip>
    </>
  );
}

/** "New gene · Cambodian" for a 0.5 gene the animal shows (remove in 0.6). */
function NewGeneChips({ sp, c }: { sp: SpeciesDefinition; c: Creature }) {
  return (
    <>
      {safe(() => expressedNewGenes(sp, c.genome), [] as string[]).map((n) => (
        <Chip key={n} tone="aqua" icon={<Dna size={11} aria-hidden />}>
          New gene · {n}
        </Chip>
      ))}
    </>
  );
}

function OfferCard({ g, offer, index, onOpen, tanks }: { g: GameState; offer: ShopOffer; index: number; onOpen: () => void; tanks: Tank[] }) {
  const sp = speciesOf(offer.speciesId);
  const lead = offer.creatures[0];
  const fits = tanks.some((t) => !!sp && fitsEnvironment(sp, t.environment)); // lane:brackish
  const expSoon = offer.expiresHour - g.clock.hour < 6;
  const affordable = g.finance.money >= offer.price;
  const locked = sp ? !speciesUnlocked(g, sp) : false;
  // lane:genetics — a Prismatic in the offer (any member of a group) is the face of the card
  const shimmer = offer.creatures.find((c) => isPrismatic(c));
  const face = shimmer ?? lead;
  const title = offerTitle(sp, offer, lead);
  const group = offer.kind === 'group';
  const firstTrait = lead?.personality[0];
  // after the Genetics Lab: hidden carriers of rare alleles ("Carries Cambodian")
  const carries = sp && lead && geneticsRevealLevel(g, lead) >= 1 ? safe(() => rareCarried(sp, lead.genome), []) : [];
  // the notes under the price, as they read on the card (B-178: status in the card's name)
  const status = [!fits && sp ? `Needs a ${ENV_LABEL[sp.environment].toLowerCase()} tank` : '', fits && !affordable ? 'Can’t afford yet' : '', locked ? 'Locked' : ''].filter(Boolean).join(', ');
  return (
    <Card className={clsx('pn-offer', 'ag-offercard', shimmer && 'ag-prismatic-card')} onClick={onOpen} testId={`shop-offer-${index}`} label={`${shimmer ? 'Prismatic ' : ''}${title}, ${formatMoney(offer.price)}${status ? `, ${status}` : ''}`}>
      <div className="pn-offer__top">
        {face ? <CreaturePortrait creature={face} size={68} alt={face.name} /> : null}
        <div className="pn-grow">
          <div className="pn-offer__name ag-offercard__title">
            <span className="pn-ellipsis">{title}</span>
            {lead && !group && <SexMark c={lead} />}
          </div>
          {lead && (
            <div className="ag-offercard__sub pn-ellipsis">
              {group ? `Group of ${offer.creatures.length} · ${lead.sizeCm.toFixed(1)} cm` : `${SEX_LABEL[lead.sex]} · ${lead.sizeCm.toFixed(1)} cm${firstTrait ? ` · ${PERSONALITY_LABEL[firstTrait] ?? firstTrait}` : ''}`}
            </div>
          )}
        </div>
      </div>
      <div className="pn-chips">
        {shimmer && <PrismaticBadge />}
        {sp && lead && <StrainChips sp={sp} c={lead} />}
        {sp && lead && <NewGeneChips sp={sp} c={lead} />}
        {carries.slice(0, 2).map((t) => (
          <Chip key={`${t.locusId}:${t.allele}`} tone="violet" icon={<Dna size={11} aria-hidden />}>
            Carries {t.name}
            <Sparkles size={10} aria-hidden />
          </Chip>
        ))}
        {offer.tier && offer.tier !== 'standard' && <TierChip tier={offer.tier} />}
      </div>
      <div className="pn-offer__foot">
        <div className="pn-grow pn-col pn-gap-1">
          <span className="pn-small pn-dim pn-ellipsis">{offer.seller}</span>
          <span className={clsx('pn-tiny', expSoon ? 'pn-tone-watch' : 'pn-muted')}>
            <Clock size={11} style={{ verticalAlign: '-1px' }} aria-hidden /> {offer.expiresHour <= g.clock.hour + 0.25 ? 'Leaving soon' : `Leaves ${untilTime(offer.expiresHour, g.clock.hour)}`}
          </span>
        </div>
        <div className="pn-offer__price">
          <Money value={offer.price} />
          {!fits && <span className="pn-tiny pn-tone-watch">Needs a {sp ? ENV_LABEL[sp.environment].toLowerCase() : ''} tank</span>}
          {fits && !affordable && <span className="pn-tiny pn-tone-watch">Can’t afford yet</span>}
          {locked && (
            <span className="pn-tiny pn-muted">
              <Lock size={10} aria-hidden /> Locked
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/** A destination tile's fit, from the same preview the selected tank's CompatPreview uses. */
interface TileFit {
  verdict: CompatVerdict;
  reason: string | null;
}

/**
 * lane:notify (chunk 3) — "Opened from your notification" belongs to the screen the tap opened: the first offer view
 * (or gone-offer view) to see the router's flag keeps it and clears it, so a later offer never shows the banner.
 */
function useFromNotification(): boolean {
  const flag = useNav((s) => s.fromNotification);
  const [mine, setMine] = useState(flag);
  useEffect(() => {
    if (!flag) return;
    setMine(true);
    useNav.setState({ fromNotification: false });
  }, [flag]);
  return mine;
}

function FromNotificationBanner() {
  const fromNotification = useFromNotification();
  if (!fromNotification) return null;
  return (
    <div className="ag-fromnotify" data-testid="offer-from-notification">
      <BellRing size={14} aria-hidden /> Opened from your notification
    </div>
  );
}

function OfferDetail({ g, offer, onBack }: { g: GameState; offer: ShopOffer; onBack: () => void }) {
  const link = useOfferLink(offer.id); // lane:ui-shell (chunk 1, §6.6)
  const phone = useIsPhone();
  const sp = speciesOf(offer.speciesId);
  const tanks = orderedTanks(g);
  const focused = useUI((s) => s.focusedTankId);
  const suitable = tanks.filter((t) => sp && fitsEnvironment(sp, t.environment)); // lane:brackish
  const [tankId, setTankId] = useState<string | null>(() => {
    const f = tanks.find((t) => t.id === focused && sp && fitsEnvironment(sp, t.environment));
    return f?.id ?? suitable[0]?.id ?? tanks[0]?.id ?? null;
  });
  const [picked, setPicked] = useState<Set<number>>(() => new Set(offer.creatures.map((_, i) => i)));
  const [ack, setAck] = useState(false);
  const [active, setActive] = useState(0);
  const tilesRef = useRef<HTMLDivElement>(null);
  const tank = tankId ? g.tanks[tankId] : undefined;
  const chosen = offer.creatures.filter((_, i) => picked.has(i));
  // The same quote buyOffer charges (lane:fix-econ, S13-11): a partial pick is never priced above the whole group.
  const { unit: unitPrice, price } = offerPickPrice(offer, chosen.length);
  const lead = offer.creatures[active] ?? offer.creatures[0];
  const lot = isLotOffer(offer); // lane:genetics — a group with a Prismatic is bought whole
  const shimmer = offer.creatures.some((c) => isPrismatic(c));
  const labOwned = geneticsRevealLevel(g, lead) >= 1; // lane:genetics (0.5 §9.1) — the one reveal rule
  const candidate = useMemo(() => {
    if (!sp || chosen.length === 0) return null;
    const sexes = new Set(chosen.map((c) => c.sex));
    return { speciesId: sp.id, count: chosen.length, sex: sexes.size === 1 ? chosen[0].sex : undefined, sizeCm: Math.max(...chosen.map((c) => c.sizeCm)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp?.id, picked]);

  const gate = useMemo(() => (sp && tank ? safe(() => environmentGate(sp, tank), { ok: sp.environment === tank.environment }) : { ok: false, reason: 'Choose a destination tank.' }), [sp, tank]);
  const report: CompatReport | null = useMemo(() => {
    if (!tank || !gate.ok || !candidate) return null;
    return safe(() => previewAddition(g, tank.id, candidate), EMPTY_COMPAT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, tank?.id, gate.ok, candidate]);
  // 0.5 §7.5 item 1 — every suitable tile's verdict: the first few eagerly (PERF-001), plus the selected one
  const tileFits = useMemo(() => {
    const out = new Map<string, TileFit>();
    if (!candidate) return out;
    const ids = suitable.slice(0, TILE_PREVIEWS).map((t) => t.id);
    if (tankId && !ids.includes(tankId) && suitable.some((t) => t.id === tankId)) ids.push(tankId);
    for (const id of ids) {
      const r = id === tank?.id && report ? report : safe(() => previewAddition(g, id, candidate), null);
      if (!r) continue;
      const temp = r.reasons.find((x) => x.category === 'temperature' && (x.severity === 'warning' || x.severity === 'critical') && tileTempReason(x.text));
      out.set(id, { verdict: r.verdict, reason: temp ? tileTempReason(temp.text) : null });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, candidate, tankId, report]);

  if (!sp) return null;
  const risky = !!report && VERDICT_RANK[report.verdict] >= VERDICT_RANK.high_risk;
  const locked = !speciesUnlocked(g, sp);
  const afford = g.finance.money >= price;
  const tooSmall = tank ? gallonsOf(tank) < sp.recommendedMinTankGallons : false;
  const noSuitable = suitable.length === 0;
  const state = buyState({ locked, picked: chosen.length, noSuitableTank: noSuitable, environment: sp.environment, affordable: afford, gateOk: !!tank && gate.ok, risky, acknowledged: ack, price });
  const coolSpecies = !!sp.special?.coolWater || sp.waterClasses.includes('freshwater_cool');

  const openBuildTanks = (waterClass = sp.waterClasses.find((w) => tanks.some((t) => t.waterClass === w)) ?? sp.waterClasses[0]) => {
    // lane:qa-play — Quick buy comes back to this offer; lane:fix-panels — Build opens on water the animal can live in
    rememberOfferReturn(offer.id, waterClass);
    useUI.getState().set({ panel: 'build', panelTarget: 'tab:tanks' });
  };

  const buy = () => {
    if (!tank || state.action !== 'buy') return;
    const idx = offer.kind === 'group' && picked.size !== offer.creatures.length ? [...picked].sort((a, b) => a - b) : undefined;
    const prismatic = chosen.some((c) => isPrismatic(c));
    const name = safe(() => morphDisplayName(sp, (chosen.find((c) => isPrismatic(c)) ?? chosen[0] ?? lead).morphName), sp.commonName);
    const r = act((d) => buyOffer(d, offer.id, tank.id, idx), { sound: 'coin', quiet: true });
    if (r?.ok) {
      // 0.5 §7.5 item 6 — back to the tank view on the new home, with the find named
      useUI.getState().set({ panel: null, panelTarget: null, focusedTankId: tank.id });
      useUI.getState().toast(`${name} is settling into ${tank.name}`, prismatic ? 'celebrate' : 'success', { label: prismatic ? 'Prismatic find' : 'Bought', detail: 'Find them in Livestock.' });
    }
  };

  /** ACC-003 — the destination tiles are one radio group: arrow keys move the choice. */
  const onTilesKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step || !tanks.length) return;
    e.preventDefault();
    const i = Math.max(0, tanks.findIndex((t) => t.id === tankId));
    const next = tanks[(i + step + tanks.length) % tanks.length];
    setTankId(next.id);
    setAck(false);
    tilesRef.current?.querySelector<HTMLButtonElement>(`[data-tank="${next.id}"]`)?.focus();
  };

  const fitBadge = noSuitable ? (
    <span className="ag-fitbadge" data-fit="none">
      <StatusBadge status="watch" label={NO_TANK_BADGE[sp.environment]} />
    </span>
  ) : report && gate.ok ? (
    <span className="ag-fitbadge" data-fit={report.verdict}>
      <StatusBadge status={verdictStatus(report.verdict)} label={VERDICT_LABEL[report.verdict]} />
    </span>
  ) : null;
  const strainLeadChips = <StrainChips sp={sp} c={lead} joined />;

  return (
    <SubView onBack={onBack} backLabel="Back to shop" title={<span className="pn-ellipsis">{offer.seller}</span>} actions={<CopyLinkButton link={link} phone={phone} />}>
      <OfferLinkRow link={link} />
      <FromNotificationBanner />
      <div className="pn-offerhero">
        <CreaturePortrait creature={lead} size={148} className="pn-offerhero__portrait" alt={lead.name} />
        <div className="pn-grow pn-col pn-gap-2">
          <div>
            <h3 className="pn-offerhero__name">{offer.kind === 'group' ? `${offer.creatures.length} ${sp.commonName}` : offerTitle(sp, offer, lead)}</h3>
            <div className="pn-offerhero__sci">{sp.scientificName}</div>
          </div>
          <div className="pn-chips">
            <PrismaticBadge creature={lead} />
            {offer.tier && offer.tier !== 'standard' && <TierChip tier={offer.tier} />}
            {strainLeadChips}
            <NewGeneChips sp={sp} c={lead} />
            <Chip>
              {SEX_LABEL[lead.sex]} · {lead.sizeCm.toFixed(1)} cm
            </Chip>
            {lead.captiveBred ? (
              <Chip tone="good" icon={<BadgeCheck size={11} aria-hidden />}>
                Captive-bred
              </Chip>
            ) : (
              <Chip tone="watch">Wild-caught</Chip>
            )}
            {lead.personality.map((p) => (
              <Chip key={p} tone={PERSONALITY_TONE[p] ?? 'neutral'}>
                {PERSONALITY_LABEL[p]}
              </Chip>
            ))}
          </div>
          <CareChips sp={sp} />
          {safe(() => describePersonality(lead), '') && <p className="pn-small pn-dim" style={{ margin: 0 }}>{safe(() => describePersonality(lead), '')}</p>}
          {offer.note && <p className="pn-quote" style={{ margin: 0 }}>“{offer.note}”</p>}
        </div>
      </div>

      {offer.kind === 'group' && offer.creatures.length > 1 && (
        <section>
          <SectionHead title={lot ? `Sold as one lot · ${offer.creatures.length} animals` : `Choose individuals · ${chosen.length} of ${offer.creatures.length}`} icon={<Users size={14} />} />
          <div className="pn-pickgrid">
            {offer.creatures.map((c, i) => (
              <div key={c.id} className={clsx('pn-pick', picked.has(i) && 'is-on', active === i && 'is-active')}>
                <button type="button" className="pn-pick__btn" onClick={() => setActive(i)} aria-label={`Inspect individual ${i + 1}`}>
                  <CreaturePortrait creature={c} size={52} />
                  <span className="pn-tiny pn-dim">
                    {SEX_LABEL[c.sex]} · {c.sizeCm.toFixed(1)} cm
                  </span>
                </button>
                <Checkbox
                  checked={picked.has(i)}
                  label={`Include individual ${i + 1}`}
                  hideLabel
                  disabled={lot}
                  title={lot ? 'Sold as one lot — this group includes a Prismatic' : undefined}
                  onChange={(v) => {
                    const n = new Set(picked);
                    if (v) n.add(i);
                    else n.delete(i);
                    setPicked(n);
                  }}
                />
              </div>
            ))}
          </div>
          {sp.social.minGroup > 1 && chosen.length < sp.social.minGroup && (
            <Callout tone="watch" icon={<Users size={15} />}>
              {sp.commonName} feel safest in groups of {sp.social.minGroup} or more.
            </Callout>
          )}
        </section>
      )}

      {/* 0.5 §7.4 items 4-7 — Genes, Temperament, the Prismatic callout, the morph line */}
      <OfferGenes sp={sp} creature={lead} labOwned={labOwned} partners={labOwned ? labPartners(g, sp.id, lead.sex) : []} />
      <OfferTemperament sp={sp} lead={lead} groupSize={offer.kind === 'group' ? offer.creatures.length : 1} labOwned={labOwned} />

      {shimmer && (
        <Callout tone="gold" icon={<Sparkles size={15} />} title="Prismatic — an ultra-rare individual">
          About {oneInLabel(PRISMATIC.shopChance)} animals a seller stocks shimmers like this, and it is valued about {PRISMATIC.valueMultiplier}× an ordinary animal. The shimmer is permanent. It isn’t a gene: its young are likelier, never certain, to share it.
          {lot ? ' This group is sold as one lot.' : ''}
        </Callout>
      )}

      <MorphLine sp={sp} c={lead} />

      <section>
        <SectionHead title={offer.kind === 'group' ? 'Selected individual' : 'Individual profile'} icon={<Info size={14} />} />
        <div className="pn-card pn-card--flat">
          <PotentialBands p={lead.genome.potentials} sp={sp} temperament={false} />
          <p className="pn-tiny pn-muted" style={{ marginTop: 10, marginBottom: 0 }}>
            Potentials describe what this animal may grow into and pass on. They shape market value, not worth.
          </p>
        </div>
      </section>

      <section>
        <SectionHead title="Destination tank">{phone && fitBadge}</SectionHead>
        {tanks.length === 0 ? (
          <Callout tone="watch" icon={<TriangleAlert size={16} />} action={<Button size="sm" onClick={() => useUI.getState().set({ panel: 'build', panelTarget: 'tab:tanks' })}>Buy a tank</Button>}>
            You need an aquarium first.
          </Callout>
        ) : (
          <div className="pn-desttanks" role="radiogroup" aria-label="Destination tank" ref={tilesRef} onKeyDown={onTilesKey}>
            {tanks.map((t) => {
              const ok = fitsEnvironment(sp, t.environment); // lane:brackish
              const n = livingInTank(g, t.id).length;
              const fit = tileFits.get(t.id);
              const on = t.id === tankId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on || (!tankId && t === tanks[0]) ? 0 : -1}
                  data-tank={t.id}
                  className={clsx('pn-desttank', on && 'is-on', !ok && 'is-bad')}
                  onClick={() => {
                    setTankId(t.id);
                    setAck(false);
                  }}
                >
                  <span className="pn-desttank__name pn-ellipsis">{t.name}</span>
                  <span className="pn-tiny pn-muted pn-ellipsis">
                    {gallonsOf(t)} gal · {WATER_CLASS_LABEL[t.waterClass]}
                  </span>
                  {noSuitable ? (
                    <span className="pn-tiny pn-tone-danger ag-tilefit">
                      <CircleX size={12} aria-hidden /> {ENV_LABEL[t.environment]}
                    </span>
                  ) : !ok ? (
                    <span className="pn-tiny pn-tone-danger">Wrong water</span>
                  ) : (
                    <>
                      <span className="pn-tiny pn-muted">{plural(n, 'resident')}</span>
                      {fit && (
                        <span className="ag-tilefit" data-verdict={fit.verdict}>
                          <StatusBadge status={verdictStatus(fit.verdict)} label={`${VERDICT_LABEL[fit.verdict]}${fit.reason ? ` — ${fit.reason}` : ''}`} />
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
            <button type="button" className="pn-desttank pn-desttank--new" onClick={() => openBuildTanks()}>
              <Plus size={16} aria-hidden />
              <span className="pn-tiny">New tank</span>
            </button>
          </div>
        )}
        {noSuitable && tanks.length > 0 && (
          <Callout tone="danger" icon={<TriangleAlert size={16} />}>
            {NO_TANK_CALLOUT[sp.environment]}
          </Callout>
        )}
      </section>

      {tank && (
        <section className="pn-col pn-gap-2">
          <CompatPreview report={report} gate={gate} title={`Compatibility with ${tank.name}`} focusSpeciesId={sp?.id} /* lane:qa-play */ labels={VERDICT_LABEL /* ADR-0020: long labels in the offer detail */} />
          {gate.ok && tooSmall && (
            <Callout tone="watch" icon={<TriangleAlert size={15} />}>
              {sp.commonName} need at least {sp.recommendedMinTankGallons} gallons as adults; {tank.name} is {gallonsOf(tank)} gallons.
            </Callout>
          )}
          {!sp.waterClasses.includes(tank.waterClass) && gate.ok && (
            <Callout
              tone="watch"
              icon={<Info size={15} />}
              action={
                coolSpecies ? (
                  <button type="button" className="pn-link ag-coollink" onClick={() => openBuildTanks('freshwater_cool')}>
                    Set up a cool-water tank
                  </button>
                ) : undefined
              }
            >
              {sp.commonName} usually live in {sp.waterClasses.map((w) => WATER_CLASS_LABEL[w].toLowerCase()).join(' or ')} setups.
            </Callout>
          )}
        </section>
      )}

      <div className="pn-buybar">
        {risky && gate.ok && (
          <div className="pn-buybar__ack">
            <CheckboxAck checked={ack} onChange={setAck} />
          </div>
        )}
        <div className="pn-buybar__row">
          <div className="pn-buybar__sum">
            <span className="pn-buybar__price">
              <Money value={price} />
            </span>
            <span className={clsx('pn-tiny', afford ? 'pn-muted' : 'pn-tone-danger')}>
              {offer.kind === 'group' ? `${groupPriceNote(chosen.length, offer.creatures.length, unitPrice, price)} · ` : ''}
              {afford ? `${formatMoney(g.finance.money - price)} left after` : `You need ${formatMoney(price - g.finance.money)} more`}
            </span>
          </div>
          {!phone && fitBadge}
          {state.action === 'build' ? (
            <Button size="lg" className="ag-btn--buildtank" onClick={() => openBuildTanks()} data-testid="offer-build-tank">
              <Hammer size={17} aria-hidden /> {phone ? state.phone : state.desktop}
            </Button>
          ) : (
            <Button variant="primary" size="lg" disabled={state.action !== 'buy'} onClick={buy} data-testid="buy-offer" silent>
              <ShoppingBag size={17} aria-hidden /> {phone ? state.phone : state.desktop}
            </Button>
          )}
        </div>
        {locked && <span className="pn-tiny pn-muted">{sp.unlock.hint}</span>}
      </div>
    </SubView>
  );
}

/** "{Tier} morph · about 1 in {n} market {species plural}" (0.5 §7.4 item 7), from the catalog. */
function MorphLine({ sp, c }: { sp: SpeciesDefinition; c: Creature }) {
  const e = safe(() => catalogEntry(sp, c.morphName), undefined);
  // only the degenerate case is left out: a morph most market animals show would read "about 1 in 1"
  if (!e || !(e.frequency > 0) || oneInLabel(e.frequency) === '1 in 1') return null;
  return (
    <p className="ag-morphline" data-testid="offer-morph-line">
      <Sparkles size={13} aria-hidden /> {RARITY_LABEL[e.tier]} morph · about {oneInLabel(e.frequency)} market {speciesPlural(sp)}
    </p>
  );
}

/**
 * How a group's price adds up: the whole group can be cheaper than its per-animal price ("All 6 · $5 group discount"),
 * a partial pick is simply "4 × $9.17 each".
 */
function groupPriceNote(n: number, total: number, unit: number, price: number): string {
  const listSum = unit * n;
  if (n === total && listSum - price >= 0.5) return `All ${n} · ${formatMoney(listSum - price)} group discount`;
  return `${n} × ${formatMoney(unit, { cents: Math.abs(unit - Math.round(unit)) > 0.004 })} each`;
}

function TierChip({ tier }: { tier: NonNullable<ShopOffer['tier']> }) {
  if (tier === 'breeder') return <Chip tone="aqua">Breeder line</Chip>;
  if (tier === 'rare') return <Chip tone="violet">Rare find</Chip>;
  if (tier === 'special') return <Chip tone="gold" icon={<Sparkles size={11} aria-hidden />}>Today only</Chip>;
  return null;
}

function CheckboxAck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <Checkbox checked={checked} onChange={onChange} label="I understand the risks and want to go ahead" />;
}

