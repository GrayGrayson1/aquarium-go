/**
 * Build — buy & place tanks (every tier 5→1000 gal), decor for the focused tank (with rearrange), equipment
 * (install/remove/settings), substrate & backdrop, facility upgrade. OWNER: lane "ui-panels".
 *
 * Deep links: 'tab:tanks' | 'tab:decor' | 'tab:equipment' | 'tab:substrate' | 'tab:facility' | 'equipment:<tankId>' | 'decor:<tankId>'
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Hammer, Layers, Mountain, Wrench, Palette, Building2, Lock, Move, MapPin, Sprout, Flower2, Shell, Gem, Puzzle, Waves, Check, Power, Trash2, Package, TriangleAlert, Info, Zap, Sparkles, Thermometer, Snowflake, Fan, Lightbulb, Wind, Droplets, Droplet, Utensils, Sun, Leaf, Box } from 'lucide-react';
import type { BackdropKind, DecorCategory, DecorDef, GameState, SubstrateKind, TankTier, WaterClass } from '@/types';
import { Button, Money, formatMoney, Toggle, Slider, StatusBadge } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { DECOR } from '@/data/catalog/decor';
import { EQUIPMENT, getEquipmentDef } from '@/data/catalog/equipment';
import { SUBSTRATES } from '@/data/catalog/substrates';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { findSpecies } from '@/data/species';
import { tutorialChain, habitatPicks } from '@/data/quests';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { getFacilityLevel } from '@/data/facilities';
import { buyTank, tankKitPrice, kitEquipmentFor, kitSwapNote, type KitEquipment } from '@/sim/economy';
import { findFreeSpot } from '@/sim/facility';
import { removeEquipment, setEquipment, installEquipment, repairEquipment } from '@/sim/care';
import { removeDecor } from '@/sim/aquascape';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { formatTemp } from '@/ui/common/format';
import { usePanelGame, safe, useIsPhone, useTempText } from '../common/hooks';
import { act } from '../common/act';
import { Chip, Seg, Select, EmptyState, SectionHead, Callout, Bar, Checkbox, Tile } from '../common/parts';
import { FacilityUpgradeCard } from '../common/FacilityUpgrade';
import { EquipRow } from '../market/Supplies';
import { takeOfferReturn, clearOfferReturn, peekOfferReturn } from '../market/offerReturn'; // lane:qa-play
import { getGame } from '@/state/game'; // lane:qa-play
import { orderedTanks, gallonsOf, unlocked, livingInTank } from '../common/derive';
import { setBackdrop, changeSubstrate, substrateCost } from '../common/tankOps';
import { FragTake, FragTag, FragStorage } from './FragAction'; // lane:frags
import { equipmentFit, tankGearIssues } from '@/sim/care/fit'; // lane:fit
import { FitBadge, FitLine } from '@/ui/common/FitNote'; // lane:fit
import { WATER_CLASS_LABEL, WATER_CLASS_BLURB, WATER_CLASS_TINT, PLAYABLE_WATER_CLASSES, titleCase, plural, nameList } from '../common/format';
import { useNavTab } from '@/ui/nav/router'; // lane:ui-shell (chunk 1)

type Tab = 'tanks' | 'decor' | 'equipment' | 'substrate' | 'facility';
const BUILD_TABS: readonly Tab[] = ['tanks', 'decor', 'equipment', 'substrate', 'facility'];

/**
 * The section and decor category Build was last left on, per aquarium: reopening it to pick a different piece used to
 * start over at Tanks / All. Deep links (the guide, unlock toasts) still choose their own section.
 */
let lastBuild: { saveId: string; tab: Tab; cat: DecorCategory | 'all' } | null = null;
const remembered = () => {
  const id = getGame()?.saveId;
  return id && lastBuild?.saveId === id ? lastBuild : null;
};

export function BuildPanel() {
  const g = usePanelGame(900);
  const phone = useIsPhone(); // lane:w2-ui
  const target = useUI((s) => s.panelTarget);
  const focused = useUI((s) => s.focusedTankId);
  const [tab, setTab] = useState<Tab>(() => remembered()?.tab ?? 'tanks');
  const [tankId, setTankId] = useState<string | null>(focused);
  const [decorCat, setDecorCat] = useState<DecorCategory | 'all'>(() => remembered()?.cat ?? 'all');
  useEffect(() => () => clearOfferReturn(), []); // lane:qa-play — leaving Build forgets a pending "back to the offer"
  useEffect(() => {
    const saveId = getGame()?.saveId;
    if (saveId) lastBuild = { saveId, tab, cat: decorCat };
  }, [tab, decorCat]);

  useNavTab('build', tab); // lane:ui-shell (chunk 1)

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('tab:')) setTab(BUILD_TABS.includes(target.slice(4) as Tab) ? (target.slice(4) as Tab) : 'tanks');
    else if (target.startsWith('decor-cat:')) {
      setTab('decor');
      setDecorCat(target.slice(10) as DecorCategory);
    }
    else if (target.startsWith('equipment:')) {
      setTab('equipment');
      setTankId(target.slice(10));
    } else if (target.startsWith('decor:')) {
      setTab('decor');
      setTankId(target.slice(6));
    }
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  useEffect(() => {
    if (focused) setTankId(focused);
  }, [focused]);

  if (!g) return null;
  const tanks = orderedTanks(g);
  const tank = (tankId && g.tanks[tankId]) || tanks[0];
  const needsTank = tab === 'decor' || tab === 'equipment' || tab === 'substrate';

  return (
    <PanelLayout
      title="Build"
      icon={<Hammer size={20} />}
      subtitle={`${getFacilityLevel(g.facility.level).name} · ${plural(tanks.length, 'tank')} · ${formatMoney(g.finance.money)} to spend`}
      scrollKey={tab}
      toolbar={
        <div className="pn-col pn-gap-2" style={{ width: '100%' }}>
          {/* lane:w2-ui — five tabs didn't fit a phone or the 1280 side sheet ("Fa…"): compact tabs, icons dropped on phones */}
          <Seg<Tab>
            label="Build section"
            tabs
            value={tab}
            onChange={setTab}
            size="sm"
            className="pn-seg--tight"
            testIdPrefix="build-tab-"
            items={[
              { id: 'tanks', label: <>{!phone && <Layers size={14} />} Tanks</> },
              { id: 'decor', label: <>{!phone && <Mountain size={14} />} Decor</> },
              { id: 'equipment', label: <>{!phone && <Wrench size={14} />} Equipment</> },
              { id: 'substrate', label: <>{!phone && <Palette size={14} />} Substrate</> },
              { id: 'facility', label: <>{!phone && <Building2 size={14} />} Facility</> },
            ]}
          />
          {needsTank && tanks.length > 0 && (
            <div className="pn-row pn-gap-2">
              <span className="pn-small pn-muted">For</span>
              <Select<string> label="Tank" value={tank?.id ?? ''} onChange={(id) => { setTankId(id); useUI.getState().set({ focusedTankId: id }); }} options={tanks.map((t) => ({ id: t.id, label: `${t.name} · ${gallonsOf(t)} gal` }))} />
              {tank && <Chip>{WATER_CLASS_LABEL[tank.waterClass]}</Chip>}
            </div>
          )}
        </div>
      }
    >
      {tab === 'tanks' && <TanksTab g={g} />}
      {needsTank && !tank && (
        <EmptyState icon={<Layers size={24} />} title="No tanks yet" action={<Button variant="primary" onClick={() => setTab('tanks')}>Choose a tank</Button>}>
          Buy an aquarium first.
        </EmptyState>
      )}
      {tab === 'decor' && tank && <DecorTab g={g} tankId={tank.id} cat={decorCat} setCat={setDecorCat} />}
      {tab === 'equipment' && tank && <EquipmentTab g={g} tankId={tank.id} />}
      {tab === 'substrate' && tank && <SubstrateTab g={g} tankId={tank.id} />}
      {tab === 'facility' && <FacilityTab g={g} />}
    </PanelLayout>
  );
}

// ───────────────────────── Tanks ─────────────────────────

function TanksTab({ g }: { g: GameState }) {
  const { close } = useSheet();
  const marineOk = unlocked(g, 'marine_basics');
  const wcLocked = (w: WaterClass) => (w === 'brackish' ? !unlocked(g, 'brackish') : !w.startsWith('fresh') && (!marineOk || (w === 'reef' && !unlocked(g, 'reef')))); // lane:brackish
  // lane:fix-panels (P2-03) — arriving from a shop offer's "New tank": start on the water that animal needs
  const [wc, setWc] = useState<WaterClass>(() => {
    const wanted = peekOfferReturn()?.waterClass;
    return wanted && !wcLocked(wanted) ? wanted : ((g.tanks[g.tankOrder[0]]?.waterClass as WaterClass) ?? 'freshwater_tropical');
  });
  const [seeded, setSeeded] = useState(true);
  const env = wc.startsWith('fresh') ? 'freshwater' : wc === 'brackish' ? 'brackish' : 'marine'; // lane:brackish
  const [a, b] = WATER_CLASS_TINT[wc];

  const place = (tier: TankTier) => {
    const set = useUI.getState().set as (p: Record<string, unknown>) => void;
    set({ tool: 'tank_place', placingTankTierId: tier.id, placingWaterClass: wc, placingSeeded: seeded, view: 'facility', panel: null, panelTarget: null });
    useUI.getState().toast(`Choose a spot for your ${tier.name}. Press Esc to cancel.`, 'info');
  };
  const quick = (tier: TankTier) => {
    const spot = safe(() => findFreeSpot(g, tier.id), null);
    const r = act((d) => buyTank(d, tier.id, wc, spot ?? undefined, { seeded }), { sound: 'coin', kind: 'celebrate' });
    if (r?.ok && r.tankId) {
      // lane:qa-play — came here from a shop offer's "New tank": go back to that offer, new tank as destination
      const back = takeOfferReturn();
      if (back && getGame()?.market.stock.some((o) => o.id === back)) {
        useUI.getState().set({ focusedTankId: r.tankId, panel: 'market', panelTarget: `offer:${back}` });
        return;
      }
      useUI.getState().set({ focusedTankId: r.tankId });
      close();
    }
  };

  return (
    <div className="pn-stack pn-stack--lg">
      <section>
        <SectionHead title="1 · Water type" icon={<Waves size={14} />} />
        <div className="pn-wcgrid" role="radiogroup" aria-label="Water type">
          {PLAYABLE_WATER_CLASSES.map((w) => {
            const locked = wcLocked(w);
            const [ta, tb] = WATER_CLASS_TINT[w];
            return (
              <button key={w} type="button" role="radio" aria-checked={wc === w} disabled={locked} className={clsx('pn-wc', wc === w && 'is-on')} onClick={() => setWc(w)} title={locked ? 'Locked' : WATER_CLASS_BLURB[w]}>
                <span className="pn-wc__swatch" style={{ background: `linear-gradient(180deg, ${ta}, ${tb})` }} aria-hidden />
                <span className="pn-wc__label">{WATER_CLASS_LABEL[w]}</span>
                {locked && <Lock size={12} className="pn-muted" aria-label="Locked" />}
              </button>
            );
          })}
        </div>
        <p className="pn-small pn-muted" style={{ margin: '10px 0 0' }}>
          {WATER_CLASS_BLURB[wc]}
          {!marineOk && ' Marine systems unlock with research.'}
          {!unlocked(g, 'brackish') && unlocked(g, 'fw_intermediate') && ' Brackish estuaries unlock with research.'}
        </p>
      </section>

      <section>
        <SectionHead title="2 · Size" icon={<Layers size={14} />}>
          <Checkbox checked={seeded} onChange={setSeeded} label="Seeded filter media" />
        </SectionHead>
        {seeded ? (
          <p className="pn-small pn-muted" style={{ marginTop: 0 }}>
            Mature media from an established filter gives the new tank a head start on cycling — safer for the first animals.
          </p>
        ) : (
          <Callout tone="watch" icon={<Info size={15} />}>
            A brand-new tank needs to cycle: beneficial bacteria take time to grow before animals can move in safely.
          </Callout>
        )}
        <div className="pn-tiers">
          {TANK_TIERS.map((tier) => {
            const isUnlocked = unlocked(g, tier.unlock);
            // lane:fix-integrate-ui — the kit this player actually gets (locked gear swapped for unlocked units), priced as buyTank charges it (S16-03)
            const kit = safe(() => tankKitPrice(tier.id, wc, seeded, g), { total: tier.price, tank: tier.price, equipment: 0, substrate: 0, seeded: 0 });
            const swap = isUnlocked ? safe(() => kitSwapLine(kitEquipmentFor(g, tier.id, wc)), null) : null;
            const afford = g.finance.money >= kit.total;
            const hint = tier.unlock ? UNLOCK_RULE_BY_KEY[tier.unlock]?.hint ?? UNLOCK_KEYS[tier.unlock as keyof typeof UNLOCK_KEYS] : '';
            return (
              <div key={tier.id} className={clsx('pn-tier', !isUnlocked && 'is-locked')}>
                <TierSilhouette tier={tier} tintA={a} tintB={b} locked={!isUnlocked} />
                <div className="pn-grow pn-col" style={{ gap: 4 }}>
                  <div className="pn-row pn-gap-2 pn-row--wrap">
                    <span className="pn-tier__gal">{tier.gallons.toLocaleString('en-US')}</span>
                    <span className="pn-tier__unit">gal</span>
                    <span className="pn-tier__name">{tier.name}</span>
                  </div>
                  <div className="pn-tiny pn-muted">
                    {tier.dimsIn.l} × {tier.dimsIn.w} × {tier.dimsIn.h} in · {titleCase(tier.material)} · {tier.glassMm} mm
                  </div>
                  {isUnlocked ? (
                    <>
                      <div className="pn-small pn-dim">{tier.blurb}</div>
                      {swap && (
                        <div className="pn-tiny pn-tone-watch" title={swap.full}>
                          <Info size={11} style={{ verticalAlign: '-1px' }} /> {swap.short}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="pn-small pn-muted">
                      <Lock size={11} style={{ verticalAlign: '-1px' }} /> {hint}
                    </div>
                  )}
                </div>
                <div className="pn-tier__side">
                  <Money value={kit.total} />
                  <span className="pn-tiny pn-muted" title={`Tank ${formatMoney(kit.tank)} · equipment ${formatMoney(kit.equipment)} · substrate ${formatMoney(kit.substrate)}${kit.seeded ? ` · seeded media ${formatMoney(kit.seeded)}` : ''}`}>
                    complete kit · ~{formatMoney(tier.baseUpkeep, { cents: true })}/day
                  </span>
                  {isUnlocked ? (
                    <div className="pn-tier__btns">
                      <Button size="sm" variant="primary" disabled={!afford} data-testid={`build-tank-${tier.id}`} onClick={() => place(tier)} title="Choose where it goes on the floor">
                        <MapPin size={13} /> {afford ? 'Buy & place' : 'Too pricey'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={!afford} onClick={() => quick(tier)} title="Buy now and place it automatically">
                        Quick buy
                      </Button>
                    </div>
                  ) : (
                    <Chip icon={<Lock size={11} />}>Locked</Chip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="pn-tiny pn-muted" style={{ marginTop: 10 }}>
          {/* lane:w2-ui — was "heater/lighting for freshwater water" */}
          Kits include the tank, a stand, substrate, and a filter, heater and lighting suited to a {WATER_CLASS_LABEL[wc].toLowerCase()} tank. Floor space is your only limit —{' '}
          {/* lane:qa-r3 — a tank can only leave through a whole-aquarium auction: don't suggest selling one before that opens */}
          {unlocked(g, 'tank_auctions') ? 'auction a tank as a whole aquarium (Market › My listings) to free its spot, or move to a bigger venue in Build › Facility.' : 'a bigger venue (Build › Facility) adds room. Whole-aquarium auctions, which free a tank’s spot, open later.'}
        </p>
      </section>
    </div>
  );
}

/** lane:fix-integrate-ui — the kit card's one-liner for locked default gear (S16-03); the sim's full note is the tooltip. */
function kitSwapLine(kit: KitEquipment): { short: string; full: string } | null {
  if (!kit.swaps.length) return null;
  const parts = kit.swaps.map((sw) => {
    const to = sw.to ? getEquipmentDef(sw.to) : undefined;
    return to ? `${sw.count > 1 ? `${sw.count} × ` : ''}${to.name}` : `no ${getEquipmentDef(sw.from)?.name ?? sw.from}`;
  });
  const keys = [...new Set(kit.swaps.map((sw) => getEquipmentDef(sw.from)?.unlock).filter((k): k is NonNullable<typeof k> => !!k))];
  const unlocks = keys.map((k) => (UNLOCK_KEYS as Record<string, string>)[k] ?? k.replace(/_/g, ' '));
  return { short: `Ships with ${nameList(parts)}${unlocks.length ? ` until you unlock ${nameList(unlocks)}` : ''}.`, full: kitSwapNote(kit) };
}

function TierSilhouette({ tier, tintA, tintB, locked }: { tier: TankTier; tintA: string; tintB: string; locked: boolean }) {
  // Proportional front view: width by length, height by height; a deep tank gets a thicker top edge.
  const maxL = 144;
  const w = 20 + (tier.dimsIn.l / maxL) * 64;
  const h = 14 + (tier.dimsIn.h / 36) * 36;
  const depth = Math.min(10, 2 + (tier.dimsIn.w / 48) * 8);
  const W = 88;
  const H = 60;
  const x = (W - w) / 2;
  const y = H - h - 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="pn-tier__sil" aria-hidden>
      <defs>
        <linearGradient id={`ts-${tier.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={locked ? '#223038' : tintA} stopOpacity={0.75} />
          <stop offset="1" stopColor={locked ? '#10181d' : tintB} stopOpacity={0.95} />
        </linearGradient>
      </defs>
      <path d={`M${x} ${y} L ${x + depth} ${y - depth * 0.6} L ${x + w + depth} ${y - depth * 0.6} L ${x + w} ${y} Z`} fill={locked ? '#1a252b' : tintA} opacity={0.35} />
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill={`url(#ts-${tier.id})`} stroke="rgba(200,235,245,0.35)" strokeWidth={0.8} />
      <rect x={x} y={y + h} width={w} height={6} rx={1} fill={locked ? '#1a1f22' : '#2a2320'} />
      {!locked && <rect x={x + 2} y={y + h - 3} width={w - 4} height={2.4} rx={1} fill="#d9ccb0" opacity={0.6} />}
    </svg>
  );
}

// ───────────────────────── Decor ─────────────────────────

const CAT_META: Record<DecorCategory, { label: string; icon: React.ReactNode }> = {
  hardscape: { label: 'Rock & wood', icon: <Mountain size={14} /> },
  plant: { label: 'Plants', icon: <Sprout size={14} /> },
  coral: { label: 'Corals', icon: <Flower2 size={14} /> },
  anemone: { label: 'Anemones', icon: <Shell size={14} /> },
  ornament: { label: 'Ornaments', icon: <Gem size={14} /> },
  enrichment: { label: 'Enrichment', icon: <Puzzle size={14} /> },
  substrate_feature: { label: 'Sand features', icon: <Waves size={14} /> },
};

/**
 * While the guide's "habitat" step is active, the decor it suggests for the starter (src/data/quests.ts habitatPicks)
 * — e.g. a terracotta cave, anubias and java fern for an axolotl — so the Build panel can show them first.
 */
function habitatSuggestion(g: GameState): { ids: string[]; forName: string; stepTitle: string } | null {
  const t = g.progress.tutorial;
  if (!t || t.done || t.skipped || g.isShowcase) return null;
  const starterId = t.starterId || g.starterId;
  const step = safe(() => tutorialChain(starterId)[t.step], undefined);
  if (!step || step.id !== 'habitat') return null;
  const ids = safe(() => habitatPicks(starterId), [] as string[]);
  if (!ids.length) return null;
  const starter = Object.values(g.creatures).find((c) => c.isStarter && c.status !== 'dead');
  return { ids, forName: starter?.name ?? 'your first animal', stepTitle: step.title };
}

function DecorTab({ g, tankId, cat: catIn, setCat }: { g: GameState; tankId: string; cat: DecorCategory | 'all'; setCat: (c: DecorCategory | 'all') => void }) {
  const { close } = useSheet();
  const tank = g.tanks[tankId];
  const fits = useMemo(() => DECOR.filter((d) => d.environments.includes(tank.environment) && (!d.waterClasses?.length || d.waterClasses.includes(tank.waterClass))), [tank.environment, tank.waterClass]);
  const cats = useMemo(() => (Object.keys(CAT_META) as DecorCategory[]).filter((c) => fits.some((d) => d.category === c)), [fits]);
  // a guide deep link may ask for a category this tank has no items in
  const cat = catIn === 'all' || cats.includes(catIn) ? catIn : 'all';
  const suggestion = habitatSuggestion(g);
  const suggested = suggestion ? suggestion.ids.map((id) => fits.find((d) => d.id === id)).filter((d): d is DecorDef => !!d) : [];
  const suggestedIds = new Set(suggested.map((d) => d.id));
  // suggested pieces sit in their own row at the top (whatever the category), so they are not repeated below
  const list = fits.filter((d) => (cat === 'all' || d.category === cat) && !suggestedIds.has(d.id)).sort((a, b) => Number(!unlocked(g, a.unlock)) - Number(!unlocked(g, b.unlock)) || a.price - b.price);
  const stored = g.inventory.decor.filter((d) => {
    const def = DECOR.find((x) => x.id === d.defId);
    return def && def.environments.includes(tank.environment);
  });
  const residents = livingInTank(g, tankId);

  const choose = (def: DecorDef) => {
    // the tool hint above the dock explains placement (click/tap the floor · R rotates · Esc cancels)
    useUI.getState().set({ tool: 'decor_place', placingDecorDefId: def.id, placingFragId: null, view: 'tank', focusedTankId: tankId, panel: null, panelTarget: null });
  };

  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-row pn-gap-2 pn-row--wrap">
        <Button variant="default" onClick={() => { useUI.getState().set({ tool: 'decor_move', view: 'tank', focusedTankId: tankId, panel: null, panelTarget: null }); close(); }} disabled={tank.decor.length === 0}>
          <Move size={15} /> Rearrange decor
        </Button>
        <span className="pn-small pn-muted">
          {plural(tank.decor.length, 'piece')} in {tank.name} · beauty {Math.round(tank.cache.beauty)}
        </span>
      </div>

      {suggestion && suggested.length > 0 && (
        <section className="pn-suggest" aria-label={`Suggested for ${suggestion.forName}`}>
          <SectionHead title={`Suggested for ${suggestion.forName}`} icon={<Sparkles size={14} />} />
          <p className="pn-small pn-muted pn-suggest__why">Good first picks for the guide’s “{suggestion.stepTitle}” step. Choose one, then place it in the tank.</p>
          <div className="pn-decorgrid">
            {suggested.map((d) => (
              <DecorCard key={d.id} g={g} d={d} onChoose={() => choose(d)} longFins={residents.some((c) => (c.appearance?.finLength ?? 1) > 1.2)} suggested />
            ))}
          </div>
        </section>
      )}

      {stored.length > 0 && (
        <section>
          <SectionHead title="In storage" icon={<Package size={14} />} />
          <div className="pn-chips">
            {stored.map((d) => {
              const def = DECOR.find((x) => x.id === d.defId)!;
              return (
                <Chip key={d.id} onClick={() => choose(def)} icon={CAT_META[def.category]?.icon}>
                  {def.name} · place free
                </Chip>
              );
            })}
          </div>
        </section>
      )}

      {/* lane:frags — frags & cuttings waiting to be planted or sold */}
      <FragStorage g={g} tankId={tankId} />

      <section>
        {/* a handful of categories: wrap onto a second row rather than cutting "Enrichment" off at the edge */}
        <div className="pn-chips" style={{ marginBottom: 12 }}>
          <Chip onClick={() => setCat('all')} pressed={cat === 'all'}>
            Everything
          </Chip>
          {cats.map((c) => (
            <Chip key={c} onClick={() => setCat(c)} pressed={cat === c} icon={CAT_META[c].icon}>
              {CAT_META[c].label}
            </Chip>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState icon={<Mountain size={24} />} title="Nothing here for this water">
            {tank.environment === 'freshwater' ? 'Corals and anemones need a marine reef tank.' : 'Try another category.'}
          </EmptyState>
        ) : (
          <div className="pn-decorgrid">
            {list.map((d) => (
              <DecorCard key={d.id} g={g} d={d} onChoose={() => choose(d)} longFins={residents.some((c) => (c.appearance?.finLength ?? 1) > 1.2)} />
            ))}
          </div>
        )}
      </section>

      {tank.decor.length > 0 && (
        <section>
          <SectionHead title={`In ${tank.name}`} icon={<Sparkles size={14} />} />
          <ul className="pn-placed">
            {tank.decor.map((inst) => {
              const def = DECOR.find((x) => x.id === inst.defId);
              return (
                <li key={inst.id} className="pn-placed__row">
                  <DecorSwatch d={def} size={34} />
                  <span className="pn-grow pn-col" style={{ gap: 2 }}>
                    <span className="pn-small">{def?.name ?? titleCase(inst.defId)}</span>
                    {typeof inst.health === 'number' && (
                      <span className="pn-tiny pn-muted">
                        Health {Math.round(inst.health)}
                        {typeof inst.growth === 'number' ? ` · grown ${Math.round(inst.growth * 100)}%` : ''}
                      </span>
                    )}
                    {/* lane:frags — frag status + take a frag/cutting */}
                    <FragTag g={g} tank={tank} inst={inst} />
                    <FragTake g={g} tank={tank} inst={inst} />
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => act((d) => removeDecor(d, tankId, inst.id, false), { sound: 'place' })}>
                    To storage
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act((d) => removeDecor(d, tankId, inst.id, true), { sound: 'coin' })}>
                    Sell
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function DecorSwatch({ d, size = 56 }: { d?: DecorDef; size?: number }) {
  const cat = d?.category ?? 'hardscape';
  const pal = d?.palette?.length ? d.palette : cat === 'plant' ? ['#5aa84f', '#2f6b2c'] : cat === 'coral' ? ['#f08aa8', '#8a3a7a'] : cat === 'anemone' ? ['#f2b6c8', '#c86a8a'] : ['#8a8f94', '#4a4f55'];
  const a = pal[0];
  const b = pal[1] ?? pal[0];
  const visual = d?.visual ?? '';
  const wood = /wood|driftwood|branch|root|cholla|spider|manzanita/.test(visual) || /wood|root|branch/i.test(d?.name ?? '');
  const id = `ds-${(d?.id ?? 'x').replace(/[^a-z0-9]/gi, '')}`;
  let art: React.ReactNode;
  if (cat === 'plant') {
    art = (
      <g strokeLinecap="round" fill="none">
        {[-14, -7, 0, 7, 14].map((dx, i) => (
          <path key={i} d={`M${28 + dx * 0.3} 50 C ${28 + dx * 0.6} 36, ${28 + dx} 28, ${28 + dx * 1.3} ${14 + Math.abs(dx) * 0.7}`} stroke={i % 2 ? b : a} strokeWidth={3.2} />
        ))}
        <ellipse cx={20} cy={30} rx={4} ry={7} fill={a} opacity={0.8} transform="rotate(-25 20 30)" />
        <ellipse cx={36} cy={26} rx={4} ry={8} fill={b} opacity={0.85} transform="rotate(25 36 26)" />
      </g>
    );
  } else if (cat === 'coral') {
    art = (
      <g stroke={a} strokeWidth={4} strokeLinecap="round" fill="none">
        <path d="M28 50 L28 34 L20 24 L17 14 M28 34 L36 24 L39 15 M20 24 L25 16 M36 24 L32 16" />
        <g fill={b} stroke="none">
          <circle cx={17} cy={13} r={3} />
          <circle cx={39} cy={14} r={3} />
          <circle cx={25} cy={15} r={2.6} />
          <circle cx={32} cy={15} r={2.6} />
        </g>
      </g>
    );
  } else if (cat === 'anemone') {
    art = (
      <g strokeLinecap="round" fill="none">
        {Array.from({ length: 9 }).map((_, i) => {
          const ang = -Math.PI * 0.92 + (i / 8) * Math.PI * 0.84;
          return <path key={i} d={`M28 42 Q ${28 + Math.cos(ang) * 10} ${36 + Math.sin(ang) * 14} ${28 + Math.cos(ang) * 18} ${40 + Math.sin(ang) * 24}`} stroke={i % 2 ? a : b} strokeWidth={3.4} />;
        })}
        <ellipse cx={28} cy={46} rx={9} ry={4} fill={b} />
      </g>
    );
  } else if (cat === 'hardscape' && wood) {
    art = (
      <g stroke={a} strokeLinecap="round" fill="none">
        <path d="M10 48 C 18 40, 24 38, 30 30 C 34 24, 40 18, 46 12" strokeWidth={5} />
        <path d="M24 38 C 20 30, 16 26, 12 20 M34 26 C 38 30, 42 32, 48 32" strokeWidth={3} stroke={b} />
      </g>
    );
  } else if (cat === 'hardscape' || cat === 'substrate_feature') {
    art = (
      <g>
        <path d="M8 50 C 10 38, 18 26, 28 24 C 38 24, 46 36, 48 50 Z" fill={`url(#${id})`} />
        <path d="M30 50 C 32 42, 38 38, 44 38 C 50 40, 52 46, 52 50 Z" fill={b} opacity={0.9} />
        <path d="M18 34 C 22 30, 26 28, 30 29" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} fill="none" />
      </g>
    );
  } else if (cat === 'enrichment') {
    art = (
      <g>
        <path d="M14 44 C 12 30, 24 16, 42 14 C 44 30, 34 44, 14 44 Z" fill={a} />
        <path d="M14 44 C 22 34, 30 26, 42 14" stroke={b} strokeWidth={1.6} fill="none" />
      </g>
    );
  } else {
    art = (
      <g>
        <path d="M16 50 L16 32 C 16 22, 40 22, 40 32 L40 50 Z" fill={`url(#${id})`} />
        <path d="M23 50 L23 36 C 23 31, 33 31, 33 36 L33 50 Z" fill="#061017" opacity={0.7} />
      </g>
    );
  }
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} className="pn-decorswatch" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12323c" />
          <stop offset="1" stopColor="#081a20" />
        </linearGradient>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={56} height={56} rx={14} fill={`url(#${id}-bg)`} />
      <rect x={0} y={49} width={56} height={7} fill="#3a3128" opacity={0.7} />
      {art}
    </svg>
  );
}

function DecorCard({ g, d, onChoose, longFins, suggested = false }: { g: GameState; d: DecorDef; onChoose: () => void; longFins: boolean; suggested?: boolean }) {
  const isUnlocked = unlocked(g, d.unlock);
  const afford = g.finance.money >= d.price;
  const h = d.habitat;
  const hint = d.unlock ? UNLOCK_RULE_BY_KEY[d.unlock]?.hint ?? UNLOCK_KEYS[d.unlock as keyof typeof UNLOCK_KEYS] : '';
  return (
    <button type="button" className={clsx('pn-decor', !isUnlocked && 'is-locked', suggested && 'is-suggested')} data-testid={`build-decor-${d.id}`} disabled={!isUnlocked || !afford} onClick={onChoose} aria-label={`${d.name}, ${formatMoney(d.price)}${suggested ? ', suggested by the guide' : ''}${isUnlocked ? '' : ', locked'}`}>
      {suggested && (
        <span className="pn-decor__suggest">
          <Sparkles size={10} aria-hidden /> Suggested
        </span>
      )}
      <DecorSwatch d={d} />
      <span className="pn-decor__name">{d.name}</span>
      <span className="pn-decor__meta">
        <Money value={d.price} />
        <span className="pn-tiny pn-muted">· beauty {d.beauty}</span>
      </span>
      <span className="pn-chips pn-decor__chips">
        {h.hides >= 1 ? <Chip>{Math.round(h.hides) > 1 ? `${Math.round(h.hides)} hiding spots` : 'Hiding spot'}</Chip> : h.hides >= 0.25 ? <Chip>Shelter</Chip> : null}
        {h.cover > 0.05 && <Chip>Cover</Chip>}
        {h.hitching > 0 && <Chip tone="aqua">Hitching</Chip>}
        {h.grazing > 0.05 && <Chip>Grazing</Chip>}
        {h.nitrateUptake > 0 && <Chip tone="good">Eats nitrate</Chip>}
        {h.enrichment > 0.1 && <Chip tone="violet">Enrichment</Chip>}
        {d.anchors.some((a) => a.kind === 'host') && <Chip tone="coral">Host</Chip>}
        {d.hazards?.sharp && <Chip tone={longFins ? 'danger' : 'watch'} icon={<TriangleAlert size={10} />}>{longFins ? 'Tears long fins' : 'Sharp edges'}</Chip>}
        {d.hazards?.ingestible && <Chip tone="watch" icon={<TriangleAlert size={10} />}>Swallowable</Chip>}
      </span>
      {!isUnlocked && (
        <span className="pn-decor__lock">
          <Lock size={12} /> {hint}
        </span>
      )}
    </button>
  );
}

// ───────────────────────── Equipment ─────────────────────────

// Temperatures are stored in °C; fmt shows them in the player's unit (Settings › Temperature).
const SETTING_META: Record<string, { label: string; min: number; max: number; step: number; fmt: (v: number, unit: 'C' | 'F') => string }> = {
  heater: { label: 'Target', min: 18, max: 32, step: 0.5, fmt: (v, unit) => formatTemp(v, unit) },
  chiller: { label: 'Target', min: 12, max: 26, step: 0.5, fmt: (v, unit) => formatTemp(v, unit) },
  light: { label: 'Intensity', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  powerhead: { label: 'Flow', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  wavemaker: { label: 'Flow', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  filter: { label: 'Flow', min: 0.2, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
};

const EQUIP_ICON: Record<string, typeof Power> = {
  filter: Waves,
  heater: Thermometer,
  chiller: Snowflake,
  fan: Fan,
  light: Lightbulb,
  airstone: Wind,
  powerhead: Waves,
  wavemaker: Waves,
  skimmer: Droplets,
  ato: Droplet,
  co2: Sprout,
  autofeeder: Utensils,
  uv: Sun,
  refugium: Leaf,
  lid: Box,
};

function EquipIcon({ kind }: { kind?: string }) {
  const I = (kind && EQUIP_ICON[kind]) || Power;
  return <I size={16} aria-hidden />;
}

function EquipmentTab({ g, tankId }: { g: GameState; tankId: string }) {
  const { unit: tempUnit } = useTempText();
  const tank = g.tanks[tankId];
  const gal = gallonsOf(tank);
  const installed = tank.equipment;
  const storage = g.inventory.equipment.filter((e) => getEquipmentDef(e.defId)?.environments.includes(tank.environment));
  const shop = EQUIPMENT.filter((e) => e.environments.includes(tank.environment)).map((e) => ({ e, fits: gal >= e.gallonsRange.min * 0.6 && gal <= e.gallonsRange.max * 1.4, installed: installed.some((x) => x.defId === e.id) }));
  const upkeep = installed.reduce((a, e) => a + (getEquipmentDef(e.defId)?.upkeep ?? 0), 0);
  // lane:fit — installed gear that isn't helping these animals, and how a stored unit would fit this tank
  const gearFit = new Map(safe(() => tankGearIssues(g, tankId), []).map((i) => [i.equipmentId, i.verdict]));
  const storedFit = (defId: string) => safe(() => equipmentFit(g, tankId, defId), null);
  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-grid pn-grid--tiles">
        <Tile icon={<Wrench size={14} />} tone="aqua" label="Installed" value={installed.length} hint={`${installed.filter((e) => e.on && !e.failed).length} running`} />
        <Tile icon={<Zap size={14} />} tone="coral" label="Upkeep" value={<Money value={upkeep} cents={upkeep < 10} />} hint="per day" />
        <Tile icon={<TriangleAlert size={14} />} tone={installed.some((e) => e.failed) ? 'danger' : 'good'} label="Faults" value={installed.filter((e) => e.failed).length} hint={installed.some((e) => e.failed) ? 'needs attention' : 'all good'} />
      </div>
      <section>
        <SectionHead title="Installed" icon={<Wrench size={14} />} />
        {installed.length === 0 ? (
          <EmptyState icon={<Wrench size={22} />} title="Nothing installed">
            Every tank needs filtration, and most need a heater and a light.
          </EmptyState>
        ) : (
          <div className="pn-col pn-gap-2">
            {installed.map((inst) => {
              const def = getEquipmentDef(inst.defId);
              const meta = def ? SETTING_META[def.kind] : undefined;
              return (
                <div key={inst.id} className={clsx('pn-equip', inst.failed && 'is-failed', !inst.on && 'is-off')}>
                  <div className="pn-row pn-gap-3">
                    <span className="pn-equip__icon">
                      <EquipIcon kind={def?.kind} />
                    </span>
                    <div className="pn-grow">
                      <div className="pn-row pn-gap-2 pn-row--wrap">
                        <b>{def?.name ?? titleCase(inst.defId)}</b>
                        {def && <Chip tone={def.tier === 3 ? 'gold' : def.tier === 2 ? 'aqua' : 'neutral'}>Tier {def.tier}</Chip>}
                        {inst.failed ? <StatusBadge status="danger" label="Failed" /> : !inst.on ? <StatusBadge status="watch" label="Off" /> : null}
                      </div>
                      <div className="pn-tiny pn-muted">
                        {def ? `${titleCase(def.kind)} · ${formatMoney(def.upkeep, { cents: def.upkeep < 10 })}/day` : ''}
                        {def?.stats.flowGph ? ` · ${def.stats.flowGph} gph` : ''}
                        {def?.stats.power ? ` · ${def.stats.power} W` : ''}
                      </div>
                      <FitLine verdict={gearFit.get(inst.id)} testId={`build-equip-fit-${inst.id}`} />
                    </div>
                    <Toggle checked={inst.on} onChange={(v) => act((d) => setEquipment(d, tankId, inst.id, { on: v }), { sound: 'click', quiet: true }) /* lane:qa-r3: a caution (gear that can't help, filter off) still toasts */} label={`${def?.name ?? 'Equipment'} power`} />
                  </div>
                  <div className="pn-equip__row">
                    <div className="pn-metric pn-grow">
                      <div className="pn-metric__row">
                        <span>Condition</span>
                        <span className="pn-metric__val">{Math.round(inst.condition * 100)}%</span>
                      </div>
                      <Bar value={inst.condition * 100} label="Condition" thin />
                    </div>
                    {meta && typeof inst.setting === 'number' && (
                      <div className="pn-equip__setting">
                        <div className="pn-metric__row">
                          <span>{meta.label}</span>
                          <span className="pn-metric__val">{meta.fmt(inst.setting, tempUnit)}</span>
                        </div>
                        <Slider value={inst.setting} min={meta.min} max={meta.max} step={meta.step} onChange={(v) => act((d) => setEquipment(d, tankId, inst.id, { setting: v }), { sound: null, quiet: true, cautionKey: `equip:${inst.id}` })} label={`${def?.name} ${meta.label}`} />
                      </div>
                    )}
                    {(inst.failed || inst.condition < 0.6) && def && (
                      <Button size="sm" variant={inst.failed ? 'coral' : 'default'} silent onClick={() => act((d) => repairEquipment(d, tankId, inst.id), { sound: 'confirm' })}>
                        <Wrench size={14} /> Repair · {formatMoney(Math.max(5, Math.round(def.price * 0.35)))}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => act((d) => removeEquipment(d, tankId, inst.id), { sound: 'place' })}>
                      <Trash2 size={14} /> Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {storage.length > 0 && (
        <section>
          <SectionHead title="In storage" icon={<Package size={14} />} />
          <div className="pn-col pn-gap-2">
            {storage.map((e) => {
              const def = getEquipmentDef(e.defId);
              const fit = storedFit(e.defId);
              return (
                <div key={e.id} className="pn-supply">
                  <div className="pn-grow">
                    <div className="pn-row pn-gap-2 pn-row--wrap">
                      <b>{def?.name ?? e.defId}</b>
                      <FitBadge verdict={fit} />
                    </div>
                    <div className="pn-tiny pn-muted">Condition {Math.round(e.condition * 100)}%</div>
                    <FitLine verdict={fit} />
                  </div>
                  <Button size="sm" disabled={!!fit?.blocked} title={fit?.blocked ? fit.text : undefined} onClick={() => act((d) => installEquipment(d, tankId, e.defId, { instanceId: e.id, fromInventory: true }), { sound: 'place', kind: fit && fit.level !== 'ok' && !fit.general && !fit.soft ? 'warning' : undefined })}>
                    <Check size={14} /> {fit?.blocked ? fit.label : 'Install'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionHead title="Buy equipment" icon={<Package size={14} />} />
        {shop.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="Catalogue coming soon" />
        ) : (
          <div className="pn-col pn-gap-2">
            {shop.map(({ e, fits, installed: inst }) => (
              <EquipRow key={e.id} g={g} e={e} fits={fits} installed={inst} tankId={tankId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ───────────────────────── Substrate & backdrop ─────────────────────────

const BACKDROPS: { id: BackdropKind; label: string; css: string }[] = [
  { id: 'black', label: 'Black', css: 'linear-gradient(180deg, #151515, #050505)' },
  { id: 'deep_blue', label: 'Deep blue', css: 'linear-gradient(180deg, #0f3a6e, #061a33)' },
  { id: 'frosted', label: 'Frosted', css: 'linear-gradient(180deg, #d8e6ea, #9fb6bd)' },
  { id: 'rock_3d', label: '3D rock', css: 'radial-gradient(circle at 30% 40%, #6b645c, #2f2a25 70%)' },
  { id: 'none', label: 'Clear', css: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 6px, transparent 6px 12px)' },
];

/** Grain texture scaled by particle size (sand = fine speckle, gravel = pebbles, soil = crumbs). */
function grainBackground(col: string, grainMm: number): string {
  if (grainMm <= 0) return `linear-gradient(160deg, ${col}, rgba(0,0,0,0.5)), ${col}`;
  const cell = Math.max(3, Math.min(14, 2.5 + grainMm * 2.2));
  const dot = Math.max(0.8, cell * 0.32);
  return [
    `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.28) ${dot * 0.5}px, transparent ${dot}px) 0 0 / ${cell}px ${cell}px`,
    `radial-gradient(circle at 70% 65%, rgba(0,0,0,0.3) ${dot * 0.6}px, transparent ${dot * 1.2}px) ${cell / 2}px ${cell / 3}px / ${cell * 1.3}px ${cell * 1.1}px`,
    `linear-gradient(170deg, rgba(255,255,255,0.12), rgba(0,0,0,0.28))`,
    col,
  ].join(', ');
}

function SubstrateTab({ g, tankId }: { g: GameState; tankId: string }) {
  const tank = g.tanks[tankId];
  const options = SUBSTRATES.filter((s) => s.environments.includes(tank.environment));
  const residents = livingInTank(g, tankId);
  const avoid = new Set<SubstrateKind>();
  const prefer = new Set<SubstrateKind>();
  for (const c of residents) {
    const s = findSpecies(c.speciesId);
    s?.substrateRules.avoid.forEach((k) => avoid.add(k));
    s?.substrateRules.preferred.forEach((k) => prefer.add(k));
  }
  return (
    <div className="pn-stack pn-stack--lg">
      <section>
        <SectionHead title="Substrate" icon={<Palette size={14} />} />
        {options.length === 0 ? (
          <EmptyState icon={<Palette size={22} />} title="Substrates coming soon" />
        ) : (
          <div className="pn-subgrid">
            {options.map((s) => {
              const current = tank.substrate.kind === s.kind;
              const locked = !unlocked(g, s.unlock);
              const cost = safe(() => substrateCost(tank.tierId, s.kind), 0);
              return (
                <div key={s.kind} className={clsx('pn-sub', current && 'is-on', locked && 'is-locked')}>
                  <div className="pn-sub__swatches">
                    {s.colors.slice(0, 4).map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={clsx('pn-sub__swatch', current && tank.substrate.color === col && 'is-on')}
                        style={{ background: grainBackground(col, s.grainMm) }}
                        aria-label={`${s.name} in ${col}`}
                        disabled={locked || (!current && g.finance.money < cost)}
                        onClick={() => act((d) => changeSubstrate(d, tankId, s.kind, col), { sound: 'splash' })}
                      />
                    ))}
                  </div>
                  <div className="pn-row pn-gap-2 pn-row--wrap">
                    <b>{s.name}</b>
                    {current && <Chip tone="aqua">In use</Chip>}
                    {avoid.has(s.kind) && <Chip tone="danger" icon={<TriangleAlert size={10} />}>Unsafe for residents</Chip>}
                    {!avoid.has(s.kind) && prefer.has(s.kind) && <Chip tone="good">Residents love it</Chip>}
                  </div>
                  <div className="pn-tiny pn-muted">
                    {s.description} · {s.grainMm} mm grain
                  </div>
                  <div className="pn-tiny">{current ? 'Tap a colour to recolour (free)' : locked ? <><Lock size={10} /> Locked</> : <>Replace for <b>{formatMoney(cost)}</b></>}</div>
                </div>
              );
            })}
          </div>
        )}
        <p className="pn-tiny pn-muted" style={{ marginTop: 10 }}>
          Swapping substrate stirs up the water for a while. Burrowers need deep sand; axolotls must never have gravel they can swallow.
        </p>
      </section>

      <section>
        <SectionHead title="Backdrop" icon={<Layers size={14} />} />
        <div className="pn-backdrops" role="radiogroup" aria-label="Backdrop">
          {BACKDROPS.map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={tank.backdrop === b.id} className={clsx('pn-backdrop', tank.backdrop === b.id && 'is-on')} onClick={() => act((d) => setBackdrop(d, tankId, b.id), { sound: 'click', quiet: true })}>
              <span className="pn-backdrop__sw" style={{ background: b.css }} aria-hidden />
              <span className="pn-small">{b.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ───────────────────────── Facility ─────────────────────────

function FacilityTab({ g }: { g: GameState }) {
  const lvl = getFacilityLevel(g.facility.level);
  const tanks = orderedTanks(g);
  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-grid pn-grid--tiles">
        <Tile icon={<Building2 size={14} />} tone="gold" label="Venue" value={<span style={{ fontSize: 17 }}>{lvl.name}</span>} hint={`${g.facility.width} × ${g.facility.depth} m`} />
        <Tile icon={<Layers size={14} />} tone="aqua" label="Tanks" value={tanks.length} hint={`${tanks.reduce((a, t) => a + gallonsOf(t), 0).toLocaleString('en-US')} gallons`} />
        <Tile icon={<Zap size={14} />} tone="coral" label="Rent" value={<Money value={lvl.dailyRent} />} hint="per day" />
      </div>
      <Button onClick={() => useUI.getState().set({ view: 'facility', panel: null, panelTarget: null })}>
        <MapPin size={15} /> View the floor
      </Button>
      <FacilityUpgradeCard g={g} />
    </div>
  );
}
