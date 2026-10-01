/**
 * Livestock panel — every animal with filters/sorting, portraits, personality, health, value, tank, listed badge;
 * eggs & fry with stage + ETA and move-to-nursery; bulk list / quick sell. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { SlidersHorizontal, Fish, Search, Star, Tag, Egg, HandCoins, Heart, Mars, Venus, CircleDashed, ArrowRightLeft, Sparkles, X, Baby, HeartPulse, Check } from 'lucide-react';
import type { Creature, GameState } from '@/types';
import { Button, Money, Modal, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { quickSell, quickSellQuote, saleWarnings } from '@/sim/economy';
import { breedingStatus } from '@/sim/life';
import { isCarried } from '@/sim/life/breeding/clutch';
import { toggleFavorite, moveClutch } from '@/sim/life/actions';
import { useShell } from '../../common/shellStore';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { usePanelGame, safe } from '../common/hooks';
import { act, edit } from '../common/act';
import { Chip, Seg, Select, EmptyState, Bar, Checkbox, Callout, SectionHead, KV, LoadMore, usePaged } from '../common/parts';
import { CreaturePortrait, CreatureGlyph } from '../common/Portrait';
import { OffspringOdds } from '../common/Offspring';
import { orderedTanks, ownedCreatures, valueOf, isListed, speciesOf, creatureCondition, conditionWord, ageDaysOf, formatAge, wellbeing, morphName } from '../common/derive';
import { PERSONALITY_LABEL, PERSONALITY_TONE, LIFE_STAGE_LABEL, CLUTCH_STAGE_LABEL, WATER_CLASS_LABEL, plural, untilTime, pct, nameList } from '../common/format';

type Tab = 'animals' | 'young' | 'past';
type StatusFilter = 'all' | 'attention' | 'listed' | 'favorites' | 'juveniles';
type SortKey = 'value' | 'age' | 'name' | 'health';

export function LivestockPanel() {
  const g = usePanelGame(900);
  const target = useUI((s) => s.panelTarget);
  const selectedId = useUI((s) => s.selectedCreatureId);
  const [tab, setTab] = useState<Tab>('animals');
  const [q, setQ] = useState('');
  const [tankF, setTankF] = useState<string>('all');
  const [speciesF, setSpeciesF] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('value');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmSell, setConfirmSell] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('tank:')) setTankF(target.slice(5));
    else if (target === 'young' || target === 'clutches') setTab('young');
    else if (target.startsWith('creature:')) useUI.getState().set({ selectedCreatureId: target.slice(9) });
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  const data = useMemo(() => {
    if (!g) return null;
    const alive = ownedCreatures(g);
    const values = new Map<string, number>();
    for (const c of alive) values.set(c.id, valueOf(g, c));
    const tanks = orderedTanks(g);
    const tankName = new Map(tanks.map((t) => [t.id, t.name]));
    const speciesIds = [...new Set(alive.map((c) => c.speciesId))];
    const clutches = Object.values(g.clutches);
    const past = Object.values(g.creatures).filter((c) => c.status === 'dead' || c.status === 'sold');
    // lane:fix-panels — residents of a tank listed as a whole aquarium are spoken for too (the sim refuses to list or
    // sell them separately), even though their own status stays 'alive'
    const listedTanks = new Set(g.market.listings.filter((l) => l.status === 'active' && l.kind === 'tank' && l.tankId).map((l) => l.tankId as string));
    const listed = new Set(alive.filter((c) => isListed(g, c.id) || (c.tankId && listedTanks.has(c.tankId))).map((c) => c.id));
    // Detailed welfare for a reasonable number of animals; very large collections use the quick summary.
    const well = new Map<string, { status: 'good' | 'watch' | 'danger'; headline: string; note?: string }>();
    for (const c of alive) {
      if (alive.length <= 160) {
        const w = wellbeing(g, c);
        well.set(c.id, { status: w.status, headline: w.headline, note: w.notes[0] });
      } else well.set(c.id, { status: creatureCondition(c), headline: conditionWord(c) });
    }
    return { alive, values, tanks, tankName, speciesIds, clutches, past, well, listed };
  }, [g]);

  const list = useMemo(() => {
    if (!g || !data) return [];
    const needle = q.trim().toLowerCase();
    let arr = data.alive.filter((c) => {
      if (tankF !== 'all' && c.tankId !== tankF) return false;
      if (speciesF !== 'all' && c.speciesId !== speciesF) return false;
      if (status === 'attention' && (data.well.get(c.id)?.status ?? creatureCondition(c)) === 'good') return false;
      if (status === 'listed' && !data.listed.has(c.id)) return false;
      if (status === 'favorites' && !c.favorite && !c.isStarter) return false;
      if (status === 'juveniles' && !(c.lifeStage === 'juvenile' || c.lifeStage === 'fry' || c.lifeStage === 'larva')) return false;
      if (needle) {
        const sp = speciesOf(c.speciesId);
        const hay = `${c.name} ${sp?.commonName ?? ''} ${c.morphName} ${c.personality.join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    arr = [...arr].sort((a, b) => {
      if (sort === 'value') return (data.values.get(b.id) ?? 0) - (data.values.get(a.id) ?? 0);
      if (sort === 'age') return a.bornHour - b.bornHour;
      if (sort === 'health') return a.stats.health - b.stats.health;
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [g, data, q, tankF, speciesF, status, sort]);

  if (!g || !data) return null;

  const pickedList = [...picked].map((id) => g.creatures[id]).filter((c): c is Creature => !!c && c.status === 'alive' && !data.listed.has(c.id));
  const pickedValue = pickedList.reduce((a, c) => a + (data.values.get(c.id) ?? 0), 0);
  const pickedStarter = pickedList.find((c) => c.isStarter);
  const quote = confirmSell ? safe(() => quickSellQuote(g, pickedList.map((c) => c.id)), null) : null;
  // lane:fix-panels — the sim's own sale warnings (starter, brood, bonded pair, favourite, sick) shown before the
  // instant sale too, not only in the auction wizard; `quote.warnings` when the quote has them, else the helper
  const sellWarnings: string[] = confirmSell ? (quote?.ok && quote.warnings ? quote.warnings : safe(() => saleWarnings(g, pickedList.map((c) => c.id)), [])) : [];
  const attention = data.alive.filter((c) => (data.well.get(c.id)?.status ?? creatureCondition(c)) !== 'good').length;
  const togglePick = (id: string, on: boolean) => {
    if (on && data.listed.has(id)) return; // lane:fix-panels — a listed animal can't be sold twice; its box is disabled too
    const n = new Set(picked);
    if (on) n.add(id);
    else n.delete(id);
    setPicked(n);
  };

  const listPicked = () => {
    const ids = pickedList.map((c) => c.id);
    if (!ids.length) return;
    // lane:fix-panels — the same rules the listing sim applies (one species; a pair is a male and a female, or any two
    // of a sex-changing species), so the wizard opens on a step it can accept instead of a disabled Next
    const species = new Set(pickedList.map((c) => c.speciesId));
    if (species.size > 1) {
      useUI.getState().toast('Pick animals of one species to list them together — or list them one at a time.', 'warning');
      return;
    }
    const sp = speciesOf(pickedList[0].speciesId);
    const sexed = pickedList.filter((c) => c.sex !== 'unknown');
    const pairOk = ids.length === 2 && (sp?.sexSystem === 'gonochoristic' ? sexed.length === 2 && pickedList[0].sex !== pickedList[1].sex : ['protandrous', 'protogynous', 'simultaneous_hermaphrodite'].includes(sp?.sexSystem ?? ''));
    const young = pickedList.every((c) => c.lifeStage !== 'adult' && c.lifeStage !== 'elder');
    const kind = ids.length === 1 ? 'creature' : young ? 'juveniles' : pairOk ? 'pair' : 'group';
    useUI.getState().set({ panel: 'market', panelTarget: `list:${kind}:${ids.join(',')}` });
  };

  return (
    <PanelLayout
      title="Livestock"
      icon={<Fish size={20} />}
      subtitle={`${plural(data.alive.length, 'animal')} · ${plural(data.clutches.length, 'clutch', 'clutches')} growing${attention ? ` · ${attention} need attention` : ''}`}
      scrollKey={tab}
      toolbar={
        <div className="pn-col pn-gap-2" style={{ width: '100%' }}>
          <Seg<Tab>
            label="Livestock view"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'animals', label: <>Animals <span className="pn-seg__count">{data.alive.length}</span></> },
              { id: 'young', label: <>Eggs & fry <span className={clsx('pn-seg__count', data.clutches.length > 0 && 'pn-seg__count--hot')}>{data.clutches.length}</span></> },
              { id: 'past', label: 'Past residents' },
            ]}
          />
          {tab === 'animals' && (
            <>
              <div className={clsx('pn-filters', filtersOpen && 'is-open')}>
                <label className="pn-search">
                  <Search size={15} />
                  <input className="pn-input" placeholder="Search animals" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search livestock by name, species, morph or trait" />
                </label>
                <button type="button" className={clsx('pn-chip pn-chip--btn pn-filtertoggle', (filtersOpen || tankF !== 'all' || speciesF !== 'all' || sort !== 'value') && 'is-on')} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
                  <SlidersHorizontal size={14} /> Filters
                </button>
                <Select<string> className="pn-select--compact" label="Tank" value={tankF} onChange={setTankF} options={[{ id: 'all', label: 'All tanks' }, ...data.tanks.map((t) => ({ id: t.id, label: t.name }))]} />
                <Select<string> className="pn-select--compact" label="Species" value={speciesF} onChange={setSpeciesF} options={[{ id: 'all', label: 'All species' }, ...data.speciesIds.map((id) => ({ id, label: speciesOf(id)?.commonName ?? id }))]} />
                <Select<SortKey> className="pn-select--compact" label="Sort by" value={sort} onChange={setSort} options={[{ id: 'value', label: 'By value' }, { id: 'age', label: 'Oldest first' }, { id: 'name', label: 'By name' }, { id: 'health', label: 'Lowest health' }]} />
              </div>
              <div className="pn-chips pn-chips--scroll">
                {(
                  [
                    ['all', 'Everyone'],
                    ['attention', `Needs attention${attention ? ` (${attention})` : ''}`],
                    ['favorites', 'Favourites'],
                    ['juveniles', 'Juveniles'],
                    ['listed', 'Listed for sale'],
                  ] as [StatusFilter, string][]
                ).map(([id, label]) => (
                  <Chip key={id} onClick={() => setStatus(id)} pressed={status === id}>
                    {label}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </div>
      }
      footer={
        tab === 'animals' && pickedList.length > 0 ? (
          <>
            <span className="pn-grow pn-small">
              <b>{pickedList.length}</b> selected · worth about <Money value={pickedValue} />
            </span>
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
              <X size={14} /> Clear
            </Button>
            <Button size="sm" onClick={() => setConfirmSell(true)}>
              <HandCoins size={14} /> Quick sell
            </Button>
            <Button size="sm" variant="coral" onClick={listPicked}>
              <Tag size={14} /> List for sale
            </Button>
          </>
        ) : undefined
      }
    >
      {tab === 'animals' && (
        <AnimalList
          g={g}
          list={list}
          values={data.values}
          tankName={data.tankName}
          well={data.well}
          listedIds={data.listed}
          picked={picked}
          onPick={togglePick}
          selectedId={selectedId}
          totalAlive={data.alive.length}
          resetKey={`${q}|${tankF}|${speciesF}|${status}|${sort}`}
          onReset={() => {
            setQ('');
            setTankF('all');
            setSpeciesF('all');
            setStatus('all');
          }}
        />
      )}
      {tab === 'young' && <YoungView g={g} />}
      {tab === 'past' && <PastView g={g} past={data.past} />}

      <Modal
        open={confirmSell}
        onClose={() => setConfirmSell(false)}
        title="Quick sell to the local shop?"
        subtitle="Instant cash, no auction"
        actions={
          <>
            <Button onClick={() => setConfirmSell(false)}>Keep them</Button>
            <Button
              variant="coral"
              silent
              onClick={() => {
                const ids = pickedList.map((c) => c.id);
                const r = act((d) => quickSell(d, ids), { sound: 'coin' });
                if (r?.ok) setPicked(new Set());
                setConfirmSell(false);
              }}
            >
              <HandCoins size={15} /> Sell {plural(pickedList.length, 'animal')}
            </Button>
          </>
        }
      >
        <div className="pn-col pn-gap-3">
          {quote && quote.ok ? (
            <>
              <div className="pn-pricehero">
                <span className="pn-tiny pn-muted">The local fish store offers</span>
                <span className="pn-pricehero__v">
                  <Money value={quote.total} />
                </span>
                <span className="pn-small pn-muted">Market value about {formatMoney(pickedValue)}</span>
              </div>
              {quote.perCreature.length > 1 && (
                <div>
                  {quote.perCreature.map((p) => (
                    <KV key={p.id} label={p.name}>
                      {formatMoney(p.offer)}
                    </KV>
                  ))}
                </div>
              )}
              <p className="pn-p">Instant cash, no waiting. Listing them on the market takes longer but usually earns more.</p>
            </>
          ) : quote && !quote.ok ? (
            <Callout tone="watch" icon={<HandCoins size={16} />}>
              {quote.message}
            </Callout>
          ) : (
            <p className="pn-p">
              The local shop buys {nameList(pickedList.map((c) => c.name))} right away — usually for well under their market value of about <b>{formatMoney(pickedValue)}</b>. Listing them on the market takes longer but often earns more.
            </p>
          )}
          {sellWarnings.length > 0
            ? sellWarnings.map((w) => (
                <Callout key={w} tone={sellWarningTone(w)} icon={sellWarningIcon(w)}>
                  {w}
                </Callout>
              ))
            : pickedStarter && (
                <Callout tone="watch" icon={<Heart size={16} />} title={`${pickedStarter.name} is your starter`}>
                  Your very first companion is in this selection. Selling means saying goodbye for good.
                </Callout>
              )}
        </div>
      </Modal>
    </PanelLayout>
  );
}

function AnimalList({ g, list, values, tankName, well, listedIds, picked, onPick, selectedId, totalAlive, resetKey, onReset }: { g: GameState; list: Creature[]; values: Map<string, number>; tankName: Map<string, string>; well: Map<string, { status: 'good' | 'watch' | 'danger'; headline: string; note?: string }>; listedIds: Set<string>; picked: Set<string>; onPick: (id: string, on: boolean) => void; selectedId: string | null; totalAlive: number; resetKey: string; onReset: () => void }) {
  const { phone, close } = useSheet();
  // lane:fix-panels — rows mount a page at a time (every row asks for a portrait render; 337 at once stuttered the tank)
  const { shown, more } = usePaged(list.length, resetKey);
  if (totalAlive === 0)
    return (
      <EmptyState icon={<Fish size={26} />} title={Object.keys(g.creatures).length ? 'No animals right now' : 'No animals yet'} /* lane:qa-play: "yet" read oddly after a loss or a sale */ action={<Button variant="primary" onClick={() => useUI.getState().set({ panel: 'market', panelTarget: 'tab:shop' })}>Visit the market</Button>}>
        Browse the market for captive-bred animals that suit your tanks.
      </EmptyState>
    );
  if (list.length === 0)
    return (
      <EmptyState icon={<Search size={24} />} title="Nobody matches" action={<Button onClick={onReset}>Clear filters</Button>}>
        Try a different search or filter.
      </EmptyState>
    );
  return (
    <ul className="pn-lsrows" role="list">
      {list.slice(0, shown).map((c) => {
        const w = well.get(c.id) ?? { status: creatureCondition(c), headline: conditionWord(c) };
        const cond = w.status;
        const listed = listedIds.has(c.id);
        const status = activeBreeding(safe(() => breedingStatus(g, c.id), null));
        const open = () => {
          useUI.getState().set({ selectedCreatureId: c.id, ...(c.tankId ? { focusedTankId: c.tankId, view: 'tank' as const } : {}) });
          // lane:qa-play — on desktop too: the creature card never shows while a panel is open (one docked card, see
          // hud/cardDock.ts), so "Open X's card" used to only highlight the row. Livestock reopens from the dock.
          close();
        };
        return (
          <li key={c.id} className={clsx('pn-lsrow', selectedId === c.id && 'is-selected', picked.has(c.id) && 'is-picked')}>
            <Checkbox checked={picked.has(c.id)} onChange={(v) => onPick(c.id, v)} label={`Select ${c.name}`} hideLabel disabled={listed} title={listed ? 'Already listed for sale — withdraw the listing first' : undefined} />
            <button type="button" className="pn-lsrow__main" onClick={open} aria-label={`Open ${c.name}’s card`}>
              <CreaturePortrait creature={c} size={phone ? 48 : 56} ring={c.isStarter ? 'gold' : c.favorite ? 'aqua' : null} />
              <span className="pn-lsrow__id">
                <span className="pn-lsrow__name">
                  <span className="pn-lsrow__nametext" title={c.name}>
                    {c.name}
                  </span>
                  <SexIcon sex={c.sex} />
                  {c.isStarter && <Sparkles size={13} className="pn-gold" aria-label="Starter" />}
                </span>
                <span className="pn-lsrow__species pn-ellipsis" title={`${morphName(c)} · ${c.lifeStage === 'adult' ? formatAge(ageDaysOf(g, c)) : LIFE_STAGE_LABEL[c.lifeStage]}`}>
                  {morphName(c)} · {c.lifeStage === 'adult' ? formatAge(ageDaysOf(g, c)) : LIFE_STAGE_LABEL[c.lifeStage]}
                </span>
                <span className="pn-chips pn-lsrow__chips">
                  {c.personality.slice(0, 3).map((p) => (
                    <Chip key={p} tone={PERSONALITY_TONE[p] ?? 'neutral'}>
                      {PERSONALITY_LABEL[p] ?? p}
                    </Chip>
                  ))}
                  {listed && (
                    <Chip tone="gold" icon={<Tag size={11} />}>
                      Listed
                    </Chip>
                  )}
                  {status && (
                    <Chip tone="violet" icon={<Baby size={11} />} title={status.detail}>
                      {status.label}
                    </Chip>
                  )}
                </span>
              </span>
              <span className="pn-lsrow__health">
                <span className={clsx('pn-lsrow__cond', `pn-tone-${cond}`)} title={w.note}>
                  <HeartPulse size={12} aria-hidden /> {w.headline}
                </span>
                <Bar value={c.stats.health} label={`${c.name} health`} thin />
              </span>
              <span className="pn-lsrow__value">
                <Money value={values.get(c.id) ?? 0} />
                {/* with a single tank the tank name says nothing new — leave the room to the animal's name */}
                {(tankName.size > 1 || !c.tankId) && (
                  <span className="pn-lsrow__tank pn-ellipsis" title={c.tankId ? tankName.get(c.tankId) ?? undefined : undefined}>
                    {c.tankId ? tankName.get(c.tankId) ?? 'Unknown tank' : 'In transit'}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              className={clsx('pn-fav', (c.favorite || c.isStarter) && 'is-on')}
              aria-pressed={!!c.favorite}
              aria-label={c.favorite ? `Unfavourite ${c.name}` : `Favourite ${c.name}`}
              title={c.favorite ? 'Favourite' : 'Mark as favourite'}
              onClick={() => edit((d) => toggleFavorite(d, c.id))}
            >
              <Star size={17} />
            </button>
          </li>
        );
      })}
      {list.length > shown && (
        <li role="presentation">
          <LoadMore remaining={list.length - shown} onMore={more} noun="animal" />
        </li>
      )}
    </ul>
  );
}

/** lane:fix-panels — tone/icon for a sim sale warning in the quick-sell dialog (brood loss is the irreversible one). */
function sellWarningTone(w: string): 'watch' | 'danger' | 'gold' {
  const t = w.toLowerCase();
  if (t.includes('carrying') || t.includes('guarding') || t.includes('spawning') || t.includes('expecting')) return 'danger';
  if (t.includes('first animal')) return 'gold';
  return 'watch';
}
function sellWarningIcon(w: string) {
  const t = w.toLowerCase();
  if (t.includes('carrying') || t.includes('guarding') || t.includes('spawning') || t.includes('expecting')) return <Egg size={16} />;
  if (t.includes('first animal')) return <Sparkles size={16} />;
  if (t.includes('pair') || t.includes('favourite')) return <Heart size={16} />;
  return <HeartPulse size={16} />;
}

/** Only surface breeding states worth attention (hide idle / too young / not bred here). */
function activeBreeding<T extends { label: string } | null>(s: T): T | null {
  if (!s) return null;
  return /^(not breeding|not bred here|too young|conditioning)/i.test(s.label) ? null : s;
}

function SexIcon({ sex }: { sex: Creature['sex'] }) {
  if (sex === 'male') return <Mars size={13} className="pn-sex pn-sex--m" aria-label="Male" />;
  if (sex === 'female') return <Venus size={13} className="pn-sex pn-sex--f" aria-label="Female" />;
  return <CircleDashed size={12} className="pn-sex" aria-label="Sex not yet visible" />;
}

function YoungView({ g }: { g: GameState }) {
  const { close } = useSheet();
  const tanks = orderedTanks(g);
  const clutches = Object.values(g.clutches).sort((a, b) => a.nextStageHour - b.nextStageHour);
  const breeders = Object.values(g.creatures)
    .filter((c) => c.status === 'alive')
    .map((c) => ({ c, s: activeBreeding(safe(() => breedingStatus(g, c.id), null)) }))
    .filter((x): x is { c: Creature; s: NonNullable<ReturnType<typeof breedingStatus>> } => !!x.s);
  const young = Object.values(g.creatures).filter((c) => c.status === 'alive' && (c.lifeStage === 'juvenile' || c.lifeStage === 'fry'));

  if (clutches.length === 0 && breeders.length === 0)
    return (
      <EmptyState icon={<Egg size={26} />} title="No eggs or fry right now">
        Healthy, well-fed animals in the right conditions will court and spawn. Watch for bubble nests, egg clusters and pregnant pouches — they’ll appear here with a countdown.
        {young.length > 0 && <div style={{ marginTop: 8 }}>You’re raising {plural(young.length, 'juvenile')} — find them in Animals → Juveniles.</div>}
      </EmptyState>
    );

  return (
    <div className="pn-stack pn-stack--lg">
      {breeders.length > 0 && (
        <section>
          <SectionHead title="Breeding activity" icon={<Heart size={14} />} />
          <div className="pn-col pn-gap-2">
            {breeders.map(({ c, s }) => (
              <div key={c.id} className="pn-card pn-breedrow">
                <CreaturePortrait creature={c} size={44} />
                <div className="pn-grow">
                  <div className="pn-row pn-gap-2">
                    <b className="pn-serif">{c.name}</b>
                    <span className="pn-muted pn-small">{speciesOf(c.speciesId)?.commonName}</span>
                  </div>
                  <div className="pn-small pn-dim">
                    {s.label}
                    {s.detail ? ` — ${s.detail}` : ''}
                  </div>
                  {typeof s.progress === 'number' && (
                    <div style={{ marginTop: 8 }}>
                      <Bar value={s.progress * 100} tone="gold" label={`${c.name} breeding progress`} thin />
                    </div>
                  )}
                  {c.repro.partnerId && g.creatures[c.repro.partnerId] && c.sex !== 'male' && <OffspringOdds a={c} b={g.creatures[c.repro.partnerId]} max={3} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {clutches.length > 0 && (
        <section>
          <SectionHead title="Clutches" icon={<Egg size={14} />} />
          <div className="pn-col pn-gap-3">
            {clutches.map((cl) => {
              const tank = g.tanks[cl.tankId];
              const sp = speciesOf(cl.speciesId);
              const guard = cl.guardedById ? g.creatures[cl.guardedById] : undefined;
              const since = cl.stageSinceHour ?? cl.laidHour;
              const total = Math.max(1, cl.nextStageHour - since);
              const prog = Math.max(0, Math.min(1, (g.clock.hour - since) / total));
              const losses = cl.losses ? Object.entries(cl.losses).filter(([, n]) => n >= 1) : [];
              const suits = (t: (typeof tanks)[number]) => t.id !== cl.tankId && (sp ? sp.waterClasses.includes(t.waterClass) : t.environment === tank?.environment);
              const inNursery = tank?.purpose === 'nursery';
              const nurseries = tanks.filter((t) => suits(t) && t.purpose === 'nursery');
              // without a nursery, only an empty tank (no tank mates to eat them) is a real alternative — never a busy display
              const others = tanks.filter((t) => suits(t) && t.purpose !== 'nursery' && !Object.values(g.creatures).some((c) => c.tankId === t.id && c.status === 'alive'));
              const adults = tank ? Object.values(g.creatures).filter((c) => c.tankId === tank.id && c.status === 'alive' && c.id !== cl.guardedById).length : 0;
              // lane:fix-panels — a brood in a pouch or under a berried tail travels with its parent: the sim refuses
              // to move the clutch on its own, so offer to move the carrier instead of a button that always fails
              const carried = isCarried(cl);
              return (
                <div key={cl.id} className="pn-card pn-clutch">
                  <div className="pn-row pn-gap-3 pn-row--top">
                    <span className="pn-clutch__glyph">
                      <CreatureGlyph speciesId={cl.speciesId} size={46} />
                      <span className="pn-clutch__count">{cl.count}</span>
                    </span>
                    <div className="pn-grow">
                      <div className="pn-card__title" style={{ fontSize: 16 }}>
                        {sp?.commonName ?? cl.speciesId} · {CLUTCH_STAGE_LABEL[cl.stage]}
                      </div>
                      <div className="pn-card__sub">
                        {plural(cl.count, cl.stage === 'eggs' ? 'egg' : 'young', cl.stage === 'eggs' ? 'eggs' : 'young')} in {tank?.name ?? 'a tank'}
                        {guard ? ` · guarded by ${guard.name}` : ''}
                      </div>
                    </div>
                    <div className="pn-clutch__eta">
                      <span className="pn-tiny pn-muted">Next stage</span>
                      <b className="pn-num-t">{cl.nextStageHour <= g.clock.hour ? 'any moment' : untilTime(cl.nextStageHour, g.clock.hour)}</b>
                    </div>
                  </div>
                  <div className="pn-row pn-gap-3" style={{ marginTop: 12 }}>
                    <div className="pn-grow">
                      <Bar value={prog * 100} tone="aqua" label="Stage progress" />
                    </div>
                    <span className="pn-small pn-dim pn-num-t">Survival {pct(cl.survival)}</span>
                  </div>
                  {(cl.stage === 'larvae' || cl.stage === 'fry') && typeof cl.fed === 'number' && (
                    <div className="pn-metric" style={{ marginTop: 10 }}>
                      <div className="pn-metric__row">
                        <span>Fed with suitable first foods</span>
                        <span className="pn-metric__val">{pct(cl.fed)}</span>
                      </div>
                      <Bar value={cl.fed * 100} label="Fry feeding" thin />
                    </div>
                  )}
                  {losses.length > 0 && (
                    <div className="pn-tiny pn-muted" style={{ marginTop: 8 }}>
                      Lost so far: {losses.map(([k, n]) => `${Math.round(n)} to ${k}`).join(', ')}
                      {cl.initialCount ? ` (from ${cl.initialCount})` : ''}
                    </div>
                  )}
                  {cl.infertile && (
                    <Callout tone="watch" icon={<Egg size={15} />}>
                      These eggs can’t hatch here — they’ll dissolve naturally over time.
                    </Callout>
                  )}
                  {!cl.infertile && !carried && tank && tank.purpose !== 'nursery' && adults > 0 && (
                    <Callout tone="watch" icon={<Egg size={15} />}>
                      Tank mates may eat eggs and fry. A nursery tank protects them.
                    </Callout>
                  )}
                  <div className="pn-row pn-gap-2 pn-row--wrap" style={{ marginTop: 10 }}>
                    {carried ? (
                      <>
                        <span className="pn-small pn-muted">
                          {guard ? `Safe with ${guard.name} until they’re released` : 'Carried by the parent until they’re released'}
                          {guard && !inNursery && nurseries.length > 0 ? ` — move ${guard.name} to a nursery so the young hatch somewhere safe.` : '.'}
                        </span>
                        {guard && !inNursery && nurseries.length > 0 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              // the carrier's card with its Move dialog open (the card never shows over a panel)
                              useUI.getState().set({ selectedCreatureId: guard.id, ...(guard.tankId ? { focusedTankId: guard.tankId, view: 'tank' as const } : {}) });
                              close();
                              useShell.getState().set({ moveCreatureId: guard.id });
                            }}
                          >
                            <ArrowRightLeft size={14} /> Move {guard.name}
                          </Button>
                        )}
                      </>
                    ) : inNursery ? (
                      <>
                        <span className="pn-small pn-tone-good pn-row pn-gap-1">
                          <Check size={14} aria-hidden /> Growing up safely in {tank && /nursery/i.test(tank.name) ? tank.name : `the ${tank?.name ?? ''} nursery`}
                          {nurseries.length > 0 ? ' · or move them to:' : '.'}
                        </span>
                        {nurseries.slice(0, 2).map((t) => (
                          <Button key={t.id} size="sm" onClick={() => act((d) => moveClutch(d, cl.id, t.id), { sound: 'splash' })}>
                            <ArrowRightLeft size={14} /> {t.name}
                          </Button>
                        ))}
                      </>
                    ) : nurseries.length > 0 ? (
                      nurseries.slice(0, 3).map((t) => (
                        <Button key={t.id} size="sm" variant="primary" onClick={() => act((d) => moveClutch(d, cl.id, t.id), { sound: 'splash' })}>
                          <ArrowRightLeft size={14} /> Move to {t.name}
                        </Button>
                      ))
                    ) : (
                      <span className="pn-small pn-muted">
                        No suitable nursery yet. Mark a spare {sp ? sp.waterClasses.map((w) => WATER_CLASS_LABEL[w].toLowerCase()).join(' or ') : tank?.environment ?? ''} tank as <b>Nursery</b> in Tanks{others.length ? ', or move them to an empty tank:' : '.'}
                      </span>
                    )}
                    {!carried && !inNursery && nurseries.length === 0 &&
                      others.slice(0, 2).map((t) => (
                        <Button key={t.id} size="sm" onClick={() => act((d) => moveClutch(d, cl.id, t.id), { sound: 'splash' })}>
                          <ArrowRightLeft size={14} /> {t.name}
                        </Button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function PastView({ g, past }: { g: GameState; past: Creature[] }) {
  const { shown, more } = usePaged(past.length, past.length);
  if (past.length === 0)
    return (
      <EmptyState icon={<Heart size={24} />} title="No past residents">
        Animals you sell — and any you lose — are remembered here.
      </EmptyState>
    );
  const sorted = [...past].sort((a, b) => (b.history.at(-1)?.hour ?? 0) - (a.history.at(-1)?.hour ?? 0));
  return (
    <ul className="pn-lsrows" role="list">
      {sorted.slice(0, shown).map((c) => {
        const sp = speciesOf(c.speciesId);
        const last = c.history.at(-1);
        return (
          <li key={c.id} className="pn-lsrow pn-lsrow--past">
            <span className="pn-lsrow__main pn-lsrow__main--static">
              <CreaturePortrait creature={c} size={44} />
              <span className="pn-lsrow__id">
                <span className="pn-lsrow__name">
                  <span className="pn-lsrow__nametext" title={c.name}>
                    {c.name}
                  </span>
                </span>
                <span className="pn-lsrow__species">
                  {sp?.commonName ?? c.speciesId}
                  {c.morphName && c.morphName.toLowerCase() !== 'wild type' ? ` · ${c.morphName}` : ''}
                </span>
                <span className="pn-small pn-muted">{c.status === 'sold' ? last?.text ?? 'Sold to a new home.' : c.deathCause ? `Lost — ${c.deathCause}` : 'Passed away.'}</span>
              </span>
              <Chip tone={c.status === 'sold' ? 'gold' : 'neutral'}>{c.status === 'sold' ? 'Rehomed' : 'In memory'}</Chip>
            </span>
          </li>
        );
      })}
      {sorted.length > shown && (
        <li role="presentation">
          <LoadMore remaining={sorted.length - shown} onMore={more} noun="resident" />
        </li>
      )}
    </ul>
  );
}
