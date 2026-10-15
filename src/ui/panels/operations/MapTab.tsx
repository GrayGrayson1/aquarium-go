/**
 * Operations › Map (DESIGN-S3D §7.5; INTAKE C-46, C-47, C-64; AUTO-040): a schematic of the facility — rooms as
 * labelled areas, tanks as tiles, the water and food that flow between them — with four layers (All · Water · Food ·
 * Animals; the layer is in the address and a change replaces it). Desktop: every room, machine and tank is a button;
 * selecting one shows its details beside the map (selecting it again clears it). Phones: room-level, each area opens
 * a sheet. Flows and lines are named in words, never told apart by colour alone. Early (no Water room) there are no
 * layers. OWNER: lane "automation" (chunk 5).
 */
import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronRight, Map as MapIcon, Plus } from 'lucide-react';
import type { GameState, Tank } from '@/types';
import { Button, Modal, formatMoney } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import type { MapLayer } from '@/ui/nav/routes';
import { formatClock } from '@/sim/time';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { FOOD_ROOM, BRINE, INFUSORIA } from '@/data/catalog/machines';
import { isAutofeederFood } from '@/data/catalog/foods';
import { isMarineClass } from '@/sim/water/constants';
import { changerOf, cultureState, doserNeeds, doserOf, freshCap, isHeld, manualModeOn, prepRate, saltCap, saltWaterNeeded, tankChangeNeed, weekMoney, type SupplyProblem } from '@/sim/automation';
import { findLine, lineStatus, productionLines, quarantineKit } from '@/sim/production';
import { lineView } from '@/sim/production/view';
import { WATER_CLASS_LABEL } from '../common/format';
import { Seg } from '../common/parts';
import { opsMemo, type OpsSnapshot, type OpsTier } from '@/ui/common/ops';
import { AddQuarantine } from '../livestock/Production';
import { Kicker, OpsBar } from './parts';
import { nextMixHour } from './issues';
import { markDecided } from './actions';
import { areaTiles, mapAreas, type MapAreas } from './mapModel';
import type { OpsNav } from './OperationsPanel';

type Sel = null | { kind: 'room'; id: RoomId } | { kind: 'tank'; id: string } | { kind: 'machine'; id: string };
type RoomId = 'water' | 'supplies' | 'food' | 'breeding' | 'quarantine' | 'gallery' | 'market';

const ROOM_NAME: Record<RoomId, string> = { water: 'Water room', supplies: 'Supplies shelf', food: 'Live food room', breeding: 'Breeding', quarantine: 'Quarantine & keepers', gallery: 'Gallery', market: 'Market' };
const g1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
const gallons = (t: Tank) => TANK_TIER_BY_ID[t.tierId]?.gallons ?? 0;
const GALLERY_TILES = 8;

export function MapTab({ g, snap, tier, layer, onLayer, small, nav }: { g: GameState; snap: OpsSnapshot; tier: OpsTier; layer: MapLayer; onLayer: (l: MapLayer) => void; small: boolean; nav: OpsNav }) {
  const [sel, setSel] = useState<Sel>(null);
  const [sheet, setSheet] = useState<RoomId | null>(null);
  // the first Esc clears a selection, the next closes the panel (INTAKE §4; PanelHost skips a handled Escape)
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.ag-modal-backdrop, [data-pn-modal]')) return;
      e.preventDefault();
      setSel(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [sel]);
  const [addingQt, setAddingQt] = useState<string | null>(null);
  const areas = mapAreas(g);
  const layers = tier.water;
  const L: MapLayer = layers ? layer : 'all';
  const pick = (s: Sel) => {
    if (small) {
      if (s?.kind === 'room') setSheet(s.id);
      return;
    }
    setSel((cur) => (cur && s && cur.kind === s.kind && cur.id === s.id ? null : s));
  };
  const isSel = (kind: 'room' | 'tank' | 'machine', id: string) => !!sel && sel.kind === kind && sel.id === id;
  const pausedLine = snap.problems.find((p) => p.kind === 'line');
  const ctx: Ctx = { g, areas, L, pick, isSel, small, snap };
  const plan = (
    <div className="ops-map__plan" style={small ? { gridTemplateColumns: 'minmax(0,1fr)' } : undefined}>
      <WaterArea ctx={ctx} />
      <SuppliesArea ctx={ctx} />
      <FoodArea ctx={ctx} />
      <Pipes ctx={ctx} />
      <BreedingArea ctx={ctx} />
      <QuarantineArea ctx={ctx} addQt={pausedLine && pausedLine.kind === 'line' ? () => setAddingQt(pausedLine.lineId) : undefined} />
      <GalleryArea ctx={ctx} />
      <MarketArea ctx={ctx} />
    </div>
  );
  const control = layers ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: small ? 'flex-start' : 'flex-end' }}>
      {!small && <span className="ops-muted">Show</span>}
      <Seg<MapLayer>
        label="Map layer"
        value={L}
        onChange={onLayer}
        items={[
          { id: 'all', label: 'All', testId: 'map-layer-all' },
          { id: 'water', label: 'Water', testId: 'map-layer-water' },
          { id: 'food', label: 'Food', testId: 'map-layer-food' },
          { id: 'animals', label: 'Animals', testId: 'map-layer-animals' },
        ]}
      />
    </div>
  ) : null;
  const addQtLine = addingQt ? findLine(g, addingQt) : undefined;
  return (
    <>
      {control}
      {small ? (
        <>
          {plan}
          <span className="ops-muted">Tap a room to see what’s in it.</span>
          {!layers && <span className="ops-muted">Layers for water, food and animals appear when the Water room opens.</span>}
        </>
      ) : (
        <div className="ops-map">
          {plan}
          <div className="ops-col">
            <Details ctx={ctx} sel={sel} nav={nav} />
            <Key g={g} L={L} />
          </div>
        </div>
      )}
      {sheet && (
        <Modal open onClose={() => setSheet(null)} title={ROOM_NAME[sheet]} testId="map-room-sheet">
          <RoomDetails ctx={ctx} room={sheet} nav={nav} />
        </Modal>
      )}
      {addQtLine && <AddQuarantine g={g} line={addQtLine} onClose={() => setAddingQt(null)} onAdded={() => markDecided(addQtLine.id)} />}
    </>
  );
}

interface Ctx {
  g: GameState;
  areas: MapAreas;
  L: MapLayer;
  pick: (s: Sel) => void;
  isSel: (kind: 'room' | 'tank' | 'machine', id: string) => boolean;
  small: boolean;
  snap: OpsSnapshot;
}

/** A labelled area: on desktop its title selects it; on phones the whole area is one button (≥ 44 px). */
function Area({ ctx, id, title, dashed, dim, children, style }: { ctx: Ctx; id: RoomId; title: ReactNode; dashed?: boolean; dim?: boolean; children?: ReactNode; style?: React.CSSProperties }) {
  const cls = clsx('ops-area', dashed && 'ops-area--dashed', dim && 'ops-area--dim', ctx.isSel('room', id) && 'is-selected');
  if (ctx.small)
    return (
      <button type="button" className={cls} style={style} data-testid={`map-room-${id}`} aria-label={`${ROOM_NAME[id]}: see what’s in it`} onClick={() => ctx.pick({ kind: 'room', id })}>
        <span className="ops-area__title">{title}</span>
        {children}
      </button>
    );
  return (
    <section className={cls} style={style} data-testid={`map-room-${id}`}>
      <button type="button" className="ops-link ops-area__title" style={{ padding: 0, minHeight: 0 }} aria-pressed={ctx.isSel('room', id)} onClick={() => ctx.pick({ kind: 'room', id })}>
        {title}
      </button>
      {children}
    </section>
  );
}

function Machine({ ctx, id, name, sub, warn, children }: { ctx: Ctx; id: string; name: string; sub: ReactNode; warn?: boolean; children?: ReactNode }) {
  const body = (
    <>
      <span className="ops-tank__name">{name}</span>
      <span className="ops-tank__sub" style={warn ? { color: 'var(--c-danger)' } : undefined}>
        {sub}
      </span>
      {children}
    </>
  );
  if (ctx.small)
    return (
      <span className="ops-machine" aria-hidden={false}>
        {body}
      </span>
    );
  return (
    <button type="button" className={clsx('ops-machine', ctx.isSel('machine', id) && 'is-selected')} aria-pressed={ctx.isSel('machine', id)} onClick={() => ctx.pick({ kind: 'machine', id })}>
      {body}
    </button>
  );
}

/** A tank tile: what it shows depends on the layer; the Animals layer names its lines in text (C-64). */
function TankTile({ ctx, t }: { ctx: Ctx; t: Tank }) {
  const { g, L } = ctx;
  const lines = ctx.areas.lineTanks.get(t.id) ?? [];
  const animals = Object.values(g.creatures).filter((c) => c.tankId === t.id && (c.status === 'alive' || c.status === 'listed')).length;
  const young = Object.values(g.clutches).filter((cl) => cl.tankId === t.id && cl.count > 0).reduce((a, cl) => a + cl.count, 0);
  const marine = isMarineClass(t.waterClass) || t.waterClass === 'brackish';
  const need = tankChangeNeed(g, t);
  const doser = doserOf(t);
  const feeder = t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder');
  const kept = (g.staff?.roster ?? []).some((m) => m.role === 'aquarist' && m.tankIds.includes(t.id));
  const waiting = productionLines(g).some((l) => l.waiting && l.tanks.raise === t.id);
  let sub: string;
  if (L === 'water') sub = need ? `${g1(need.fresh + need.salt)} gal a day${t.equipment.some((e) => e.defId === 'ato') ? ' · top-off' : ''}` : 'By hand';
  else if (L === 'food') sub = doser ? `Doser · ${doserNeeds(g, t).reduce((a, n) => a + n.servings, 0) * 3} a day` : feeder ? 'Autofeeder' : kept ? 'Keepers’ rounds' : 'By hand';
  else if (L === 'animals') sub = `${animals + young} ${animals + young === 1 ? 'animal' : 'animals'}${lines.length ? ` · ${lines.join(' · ')}` : ''}${waiting ? ' · waits' : ''}`;
  else sub = waiting ? 'Full · waits' : young ? `${young} young` : `${gallons(t)} gal`;
  const label = `${t.name}: ${WATER_CLASS_LABEL[t.waterClass] ?? t.waterClass}, ${gallons(t)} gal${lines.length ? `, ${lines.join(' and ')} ${lines.length === 1 ? 'line' : 'lines'}` : ''}. ${sub}`;
  const cls = clsx('ops-tank', marine && 'ops-tank--marine', waiting && 'ops-tank--warn', L === 'food' && doser && 'ops-tank--violet', ctx.isSel('tank', t.id) && 'is-selected');
  if (ctx.small)
    return (
      <span className={cls} data-testid={`map-tank-${t.id}`} aria-label={label}>
        <span className="ops-tank__name">{t.name}</span>
        <span className="ops-tank__sub">{sub}</span>
      </span>
    );
  return (
    <button type="button" className={cls} data-testid={`map-tank-${t.id}`} aria-label={label} aria-pressed={ctx.isSel('tank', t.id)} onClick={() => ctx.pick({ kind: 'tank', id: t.id })}>
      <span className="ops-tank__name">{t.name}</span>
      <span className="ops-tank__sub">{sub}</span>
    </button>
  );
}

function WaterArea({ ctx }: { ctx: Ctx }) {
  const { g, L } = ctx;
  const room = g.facility.water;
  if (!room)
    return (
      <Area ctx={ctx} id="water" title="Water room" dashed style={{ gridColumn: ctx.small ? undefined : 'span 2' }}>
        <span className="ops-tank__sub">Specialty Shop · research Central Water Supply</span>
      </Area>
    );
  const needed = saltWaterNeeded(g);
  const salt = ctx.snap.problems.find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === 'salt');
  const held = isHeld(g, 'salt');
  const mixer = held ? 'Held' : !needed ? 'Not needed' : salt?.state === 'out' ? 'No salt left' : room.mix && room.mix.readyHour > g.clock.hour ? `Mixing · ready ${formatClock(room.mix.readyHour)}` : `Next ${formatClock(nextMixHour(g.clock.hour))}`;
  return (
    <Area ctx={ctx} id="water" title="Water room" dim={L === 'animals'} style={{ gridColumn: ctx.small ? undefined : 'span 2' }}>
      <div className="ops-area__tiles" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Machine ctx={ctx} id="prep" name="Prep station" sub={`${prepRate(room)} gal an hour`} />
        <Machine ctx={ctx} id="mixer" name="Salt mixer" sub={mixer} warn={salt?.state === 'out' && !held} />
        <Machine ctx={ctx} id="fresh" name="Fresh reserve" sub={`${Math.floor(room.fresh)} / ${freshCap(room)} gal`}>
          <OpsBar value={room.fresh / freshCap(room)} label="Fresh reserve" />
        </Machine>
        <Machine ctx={ctx} id="salt" name="Salt reserve" sub={!needed ? 'Not needed' : salt?.state === 'out' && salt.shortDay ? `Runs short Day ${salt.shortDay}` : `${Math.floor(room.salt)} / ${saltCap(room)} gal`} warn={salt?.state === 'out'}>
          <OpsBar value={room.salt / saltCap(room)} kind="salt" label="Salt reserve" />
        </Machine>
      </div>
    </Area>
  );
}

function SuppliesArea({ ctx }: { ctx: Ctx }) {
  const { g, L } = ctx;
  const salt = ctx.snap.problems.find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === 'salt');
  const feeders = g.tankOrder.filter((id) => g.tanks[id]?.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder')).length;
  const dry = Object.entries(g.inventory.foods).filter(([id]) => isAutofeederFood(id)).reduce((a, [, n]) => a + Math.floor(n), 0);
  return (
    <Area ctx={ctx} id="supplies" title="Supplies" dim={L === 'animals' || L === 'water'}>
      {(g.facility.water || g.inventory.salt > 0) && (
        <Machine ctx={ctx} id="saltmix" name="Salt mix" sub={`${g1(g.inventory.salt)} kg${salt ? ` · ${salt.state === 'out' ? 'Out' : salt.state === 'arriving' ? 'Due' : 'Low'}` : ''}`} warn={salt?.state === 'out'} />
      )}
      <Machine ctx={ctx} id="dry" name="Dry food" sub={`${dry} servings · ${feeders} ${feeders === 1 ? 'Autofeeder' : 'Autofeeders'}`} />
      {g.facility.food && <Machine ctx={ctx} id="eggs" name="Brine shrimp eggs" sub={`${Math.floor(g.inventory.brineShrimpEggs ?? 0)} scoops`} />}
      {!g.staff?.roster.some((m) => m.role === 'stock_manager') && <span className="ops-tank__sub">You restock from the Market</span>}
    </Area>
  );
}

function FoodArea({ ctx }: { ctx: Ctx }) {
  const { g, L } = ctx;
  const room = g.facility.food;
  if (!room)
    return (
      <Area ctx={ctx} id="food" title="Live food room" dashed style={{ gridColumn: ctx.small ? undefined : 'span 2' }}>
        <span className="ops-tank__sub">Research Live Food Cultures</span>
      </Area>
    );
  const next = (kind: 'cone' | 'jar') => {
    const list = kind === 'cone' ? room.cones : room.jars;
    const hours = list.map((_, i) => cultureState(g, room, kind, i).readyHour).filter((h): h is number => h !== null).sort((a, b) => a - b);
    return hours[0] !== undefined ? ` · next ${formatClock(hours[0])}` : '';
  };
  return (
    <Area ctx={ctx} id="food" title="Live food room" dim={L === 'water' || L === 'animals'} style={{ gridColumn: ctx.small ? undefined : 'span 2' }}>
      <div className="ops-area__tiles" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Machine ctx={ctx} id="jars" name={`Infusoria jars · ${room.jars.length}`} sub={`${Math.round((room.jars.length * FOOD_ROOM.jarYield * 24) / FOOD_ROOM.jarHours)} a day${next('jar')}`} />
        <Machine ctx={ctx} id="cones" name={`Brine shrimp hatchery · ${room.cones.length}`} sub={`${room.cones.length * FOOD_ROOM.coneYield} a day${next('cone')}`} />
      </div>
    </Area>
  );
}

/** The flows between the rooms and the tank areas, labelled in words (fresh, salt, live food: C-47). */
function Pipes({ ctx }: { ctx: Ctx }) {
  const { g, areas, L } = ctx;
  if (!g.facility.water && !g.facility.food) return null;
  const held = manualModeOn(g);
  const sum = (tanks: Tank[]) => {
    let fresh = 0;
    let salt = 0;
    for (const t of tanks) {
      const n = tankChangeNeed(g, t);
      if (n) {
        fresh += n.fresh;
        salt += n.salt;
      }
    }
    return { fresh, salt };
  };
  const rows: { area: string; f: number; s: number }[] = (['breeding', 'quarantine', 'gallery'] as const).map((a) => ({ area: ROOM_NAME[a], ...((x) => ({ f: x.fresh, s: x.salt }))(sum(areas[a])) }));
  const saltOut = ctx.snap.problems.some((p) => p.kind === 'supply' && p.supply === 'salt' && p.state === 'out');
  const show = L === 'all' || L === 'water' || L === 'food';
  if (!show) return null;
  return (
    <div style={{ gridColumn: ctx.small ? undefined : '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }} aria-hidden>
      {g.facility.water &&
        L !== 'food' &&
        rows.map((r) => (
          <div key={r.area} className="ops-pipe">
            <span style={{ minWidth: 150 }}>
              {r.area} · {g1(r.f)} fresh + {g1(r.s)} salt
            </span>
            <span className={clsx('ops-pipe__line', held && isHeld(g, 'water') ? 'ops-pipe__line--held' : 'ops-pipe__line--fresh')} />
            <span className={clsx('ops-pipe__line', held && isHeld(g, 'water') ? 'ops-pipe__line--held' : saltOut ? 'ops-pipe__line--short' : 'ops-pipe__line--salt')} />
          </div>
        ))}
      {g.facility.food && L !== 'water' && (
        <div className="ops-pipe">
          <span style={{ minWidth: 150 }}>Live food · to the dosers</span>
          <span className={clsx('ops-pipe__line', held && isHeld(g, 'food') ? 'ops-pipe__line--held' : 'ops-pipe__line--food')} />
        </div>
      )}
    </div>
  );
}

function BreedingArea({ ctx }: { ctx: Ctx }) {
  const { g, areas, L } = ctx;
  const lines = productionLines(g);
  return (
    <Area ctx={ctx} id="breeding" title={`Breeding · ${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`} dim={L === 'water' && !areas.breeding.some((t) => changerOf(t))} style={{ gridColumn: ctx.small ? undefined : 'span 3' }}>
      {lines.map((l) => {
        const st = lineStatus(l);
        const word = isHeld(g, 'lines') ? 'Held' : st === 'running' ? 'Running' : st === 'paused_by_you' ? 'Paused by you' : 'Paused';
        return (
          <div key={l.id} className="ops-tank__sub" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: `var(--c-${['coral', 'blue', 'aqua', 'gold', 'violet', 'good', 'watch', 'ink-2'][lines.indexOf(l) % 8]})` }} aria-hidden />
            <span style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{l.name.replace(/ line$/, '')}</span> · {word}
          </div>
        );
      })}
      <div className="ops-area__tiles">
        {areas.breeding.map((t) => (
          <TankTile key={t.id} ctx={ctx} t={t} />
        ))}
      </div>
    </Area>
  );
}

function QuarantineArea({ ctx, addQt }: { ctx: Ctx; addQt?: () => void }) {
  const { g, areas } = ctx;
  const kit = addQt ? quarantineKit(g, (ctx.snap.problems.find((p) => p.kind === 'line') as { lineId: string } | undefined)?.lineId ?? '') : null;
  return (
    <Area ctx={ctx} id="quarantine" title="Quarantine & keepers" style={{ gridColumn: ctx.small ? undefined : 'span 3' }}>
      <div className="ops-area__tiles">
        {areas.quarantine.map((t) => (
          <TankTile key={t.id} ctx={ctx} t={t} />
        ))}
        {addQt && kit && !ctx.small && (
          <button type="button" className="ops-tank ops-card--dashed" data-testid="map-add-qt" onClick={addQt} style={{ borderStyle: 'dashed', background: 'transparent' }}>
            <span className="ops-tank__name">
              <Plus size={12} aria-hidden /> Add a quarantine tank
            </span>
            <span className="ops-tank__sub">{formatMoney(kit.price)}</span>
          </button>
        )}
      </div>
    </Area>
  );
}

function GalleryArea({ ctx }: { ctx: Ctx }) {
  const { g, areas } = ctx;
  const { shown, more } = areaTiles(areas.gallery, ctx.small ? 4 : GALLERY_TILES, areas.lineTanks);
  return (
    <Area ctx={ctx} id="gallery" title={`Gallery · ${areas.gallery.length} ${areas.gallery.length === 1 ? 'tank' : 'tanks'}`} style={{ gridColumn: ctx.small ? undefined : 'span 4' }}>
      <div className="ops-area__tiles">
        {shown.map((t) => (
          <TankTile key={t.id} ctx={ctx} t={t} />
        ))}
        {more > 0 && !ctx.small && (
          <button type="button" className="ops-tank" onClick={() => go({ kind: 'panel', panel: 'tanks' })} data-testid="map-more">
            <span className="ops-tank__name">+{more} more</span>
            <span className="ops-tank__sub">In the Tanks panel</span>
          </button>
        )}
        {more > 0 && ctx.small && <span className="ops-tank__sub">+{more} more</span>}
      </div>
    </Area>
  );
}

function MarketArea({ ctx }: { ctx: Ctx }) {
  const { g } = ctx;
  const w = opsMemo('week', g, () => weekMoney(g));
  const listed = g.market.listings.filter((l) => l.status === 'active');
  const best = Math.max(0, ...listed.flatMap((l) => l.bids.map((b) => b.amount)));
  return (
    <Area ctx={ctx} id="market" title="Market" style={{ gridColumn: ctx.small ? undefined : 'span 2' }}>
      <span className="ops-meter__value ops-num" style={{ fontSize: 20 }}>
        {w.sold} sold
      </span>
      <span className="ops-tank__sub">{formatMoney(w.sales)} this week</span>
      <span className="ops-tank__sub">
        {listed.length} listed{best > 0 ? ` · Best bid ${formatMoney(best)}` : ''}
        {ctx.L === 'animals' && productionLines(g).some((l) => l.rules.autoList) ? ' · auto-listed' : ''}
      </span>
    </Area>
  );
}

// ───────────────────────────── details (desktop) and room sheets (phone) ─────────────────────────────

function Details({ ctx, sel, nav }: { ctx: Ctx; sel: Sel; nav: OpsNav }) {
  return (
    <section className="ops-card" data-testid="map-details">
      {!sel ? (
        <span className="ops-muted">Select a room, machine or tank to see its details.</span>
      ) : sel.kind === 'tank' ? (
        <TankDetails ctx={ctx} id={sel.id} />
      ) : sel.kind === 'room' ? (
        <RoomDetails ctx={ctx} room={sel.id} nav={nav} />
      ) : (
        <MachineDetails ctx={ctx} id={sel.id} nav={nav} />
      )}
    </section>
  );
}

function TankDetails({ ctx, id }: { ctx: Ctx; id: string }) {
  const { g, areas } = ctx;
  const t = g.tanks[id];
  if (!t) return <span className="ops-muted">Select a room, machine or tank to see its details.</span>;
  const area = areas.breeding.includes(t) ? 'Breeding' : areas.quarantine.includes(t) ? 'Quarantine & keepers' : 'Gallery';
  const line = productionLines(g).find((l) => l.tanks.breed === id || l.tanks.raise === id || l.tanks.quarantine.includes(id) || l.tanks.keep === id);
  const v = line ? lineView(g, line) : null;
  const animals = Object.values(g.creatures).filter((c) => c.tankId === id && (c.status === 'alive' || c.status === 'listed')).length;
  const young = Object.values(g.clutches).filter((cl) => cl.tankId === id && cl.count > 0).reduce((a, cl) => a + cl.count, 0);
  const need = tankChangeNeed(g, t);
  const doser = doserOf(t);
  const feeder = t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder');
  const places = v && line?.tanks.raise === id ? v.raising.places : undefined;
  return (
    <>
      <span className="ops-muted">Selected on the map</span>
      <h3 className="ops-card__title" style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
        {t.name}
      </h3>
      <span className="ops-row__sub">
        {WATER_CLASS_LABEL[t.waterClass] ?? t.waterClass} · {gallons(t)} gal · {area}
        {line ? ` · ${line.name}` : ''}
      </span>
      <div className="ops-rows">
        <Kv k="Animals" v={`${animals} ${animals === 1 ? 'animal' : 'animals'}${young ? ` · ${young} young` : ''}`} />
        {places && <Kv k="Places" v={`${places.used} of ${places.cap}`} />}
        <Kv k="Feeding" v={doser ? 'Live-food doser' : feeder ? 'Autofeeder' : 'By hand or keepers’ rounds'} />
        <Kv k="Water" v={need ? `${g1(need.fresh + need.salt)} gal a day from the Water room` : changerOf(t) ? 'Auto Water Changer' : 'By hand'} />
        {v && <Kv k="Next" v={v.quarantined.listsDay && line?.tanks.quarantine.includes(id) ? `Lists Day ${v.quarantined.listsDay}` : v.next.days !== undefined ? `Next clutch in ${v.next.days} days` : '—'} />}
      </div>
      <div className="ops-card__actions">
        <Button size="sm" onClick={() => go({ kind: 'tankCard', tankId: id, tab: 'water' })}>
          Open tank
        </Button>
        {line && (
          <button type="button" className="ops-link" onClick={() => go({ kind: 'panel', panel: 'livestock', tab: 'production', target: `line:${line.id}` })}>
            {line.name} <ChevronRight size={14} aria-hidden />
          </button>
        )}
      </div>
    </>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="ops-row">
      <span className="ops-row__main ops-muted">{k}</span>
      <span className="ops-row__title" style={{ textAlign: 'right' }}>
        {v}
      </span>
    </div>
  );
}

function RoomDetails({ ctx, room, nav }: { ctx: Ctx; room: RoomId; nav: OpsNav }) {
  const { g, areas } = ctx;
  const link = (label: string, onClick: () => void) => (
    <button type="button" className="ops-link" onClick={onClick}>
      {label} <ChevronRight size={14} aria-hidden />
    </button>
  );
  const tanks = room === 'breeding' ? areas.breeding : room === 'quarantine' ? areas.quarantine : room === 'gallery' ? areas.gallery : [];
  return (
    <>
      {!ctx.small && <h3 className="ops-card__title">{ROOM_NAME[room]}</h3>}
      {tanks.length > 0 && (
        <div className="ops-rows">
          {tanks.slice(0, 12).map((t) => (
            <Kv key={t.id} k={t.name} v={`${gallons(t)} gal`} />
          ))}
          {tanks.length > 12 && <span className="ops-muted">+{tanks.length - 12} more</span>}
        </div>
      )}
      {room === 'water' && g.facility.water && (
        <div className="ops-rows">
          <Kv k="Fresh reserve" v={`${Math.floor(g.facility.water.fresh)} / ${freshCap(g.facility.water)} gal`} />
          <Kv k="Salt reserve" v={`${Math.floor(g.facility.water.salt)} / ${saltCap(g.facility.water)} gal`} />
        </div>
      )}
      {room === 'food' && g.facility.food && (
        <div className="ops-rows">
          <Kv k="Live Baby Brine Shrimp" v={`${Math.floor(g.inventory.foods[BRINE] ?? 0)} servings`} />
          <Kv k="Infusoria Culture" v={`${Math.floor(g.inventory.foods[INFUSORIA] ?? 0)} servings`} />
        </div>
      )}
      <div className="ops-card__actions">
        {room === 'water' && g.facility.water && link('Water tab', () => nav.tab('water'))}
        {room === 'water' && g.facility.water && link('Machines in Build', () => go({ kind: 'panel', panel: 'build', tab: 'facility', target: 'room:water' }))}
        {room === 'food' && g.facility.food && link('Feed tab', () => nav.tab('feed'))}
        {room === 'breeding' && link('Lines tab', () => nav.tab('lines'))}
        {room === 'supplies' && link('Market › Supplies', () => go({ kind: 'panel', panel: 'market', tab: 'supplies' }))}
        {room === 'market' && link('My listings', () => go({ kind: 'panel', panel: 'market', tab: 'listings' }))}
        {(room === 'gallery' || room === 'quarantine') && link('Tanks', () => go({ kind: 'panel', panel: 'tanks' }))}
      </div>
    </>
  );
}

function MachineDetails({ ctx, id, nav }: { ctx: Ctx; id: string; nav: OpsNav }) {
  const water = ['prep', 'mixer', 'fresh', 'salt'].includes(id);
  const food = ['jars', 'cones'].includes(id);
  const names: Record<string, string> = { prep: 'Water Prep Station', mixer: 'Salt Mixing Station', fresh: 'Fresh reserve', salt: 'Salt water reserve', jars: 'Infusoria jars', cones: 'Brine Shrimp Hatchery', saltmix: 'Salt mix', dry: 'Dry food', eggs: 'Brine shrimp eggs' };
  return (
    <>
      <h3 className="ops-card__title">{names[id] ?? id}</h3>
      {water && <RoomDetails ctx={{ ...ctx, small: true }} room="water" nav={nav} />}
      {food && <RoomDetails ctx={{ ...ctx, small: true }} room="food" nav={nav} />}
      {!water && !food && <RoomDetails ctx={{ ...ctx, small: true }} room="supplies" nav={nav} />}
    </>
  );
}

/** The Key: what the lines on the map mean (in words), and the held legend in manual mode. */
function Key({ g, L }: { g: GameState; L: MapLayer }) {
  const held = manualModeOn(g);
  return (
    <section className="ops-card">
      <Kicker icon={<MapIcon size={14} aria-hidden />}>Key</Kicker>
      {(L === 'all' || L === 'water') && g.facility.water && (
        <>
          <div className="ops-pipe">
            <span className="ops-pipe__line ops-pipe__line--fresh" style={{ maxWidth: 24 }} /> Fresh water
          </div>
          <div className="ops-pipe">
            <span className="ops-pipe__line ops-pipe__line--salt" style={{ maxWidth: 24 }} /> Salt water (striped)
          </div>
        </>
      )}
      {(L === 'all' || L === 'food') && g.facility.food && (
        <div className="ops-pipe">
          <span className="ops-pipe__line ops-pipe__line--food" style={{ maxWidth: 24 }} /> Live food (dashed)
        </div>
      )}
      {L === 'animals' && <span className="ops-muted">Each tank names its lines; “waits” where a line is held up.</span>}
      {(L === 'all' || L === 'water') && <span className="ops-muted">Labels: gallons of water changes a day</span>}
      {held && <span className="ops-amber">Manual mode: dashed grey pipes are on hold.</span>}
    </section>
  );
}
