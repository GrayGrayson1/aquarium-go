/**
 * Build › Facility's rooms (DESIGN-S3D §8.4; INTAKE C-7; AUTO-045): the "Your facility" card, the Water room and Live
 * food room rows (dashed with their requirements before they exist), and each room's page with its machines and
 * upgrades (`#/build/facility/water`, `/food`). Operations runs the rooms day to day; they're bought and upgraded here.
 * OWNER: lane "automation" (chunk 5).
 */
import { ChevronRight, Droplets, Egg, Filter, FlaskConical, Lock, Sparkles, Syringe, ArrowLeft } from 'lucide-react';
import type { GameState } from '@/types';
import { Badge, Button, formatMoney } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { getFacilityLevel, nextFacilityLevelDef } from '@/data/facilities';
import { STOCK_BUDGET } from '@/data/staff';
import { FOOD_ROOM, WATER_ROOM } from '@/data/catalog/machines';
import { addCulture, addReservoir, doserOf, freshCap, isHeld, prepRate, saltCap, saltWaterNeeded, upgradePrep } from '@/sim/automation';
import { lineSlots, productionLines } from '@/sim/production';
import { tierLadder } from '@/ui/common/ops';
import { act } from '../common/act';

export type RoomId = 'water' | 'food';

const toOps = (tab: 'overview' | 'water' | 'feed') => go({ kind: 'panel', panel: 'operations', tab });

function Status({ tone, children }: { tone: 'good' | 'watch' | 'neutral'; children: React.ReactNode }) {
  return <Badge tone={tone === 'neutral' ? 'neutral' : tone}>{children}</Badge>;
}

/** "Your facility": the level, what's next, line slots and the stock budget cap. */
export function YourFacility({ g }: { g: GameState }) {
  const lvl = getFacilityLevel(g.facility.level);
  const next = nextFacilityLevelDef(g.facility.level);
  const slots = lineSlots(g);
  const cap = STOCK_BUDGET[g.facility.level]?.max ?? 0;
  return (
    <div className="pn-card" style={{ padding: 16 }} data-testid="build-your-facility">
      <div className="pn-row pn-gap-2">
        <div className="pn-grow">
          <div className="pn-muted pn-tiny">Your facility</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{lvl.name}</div>
          <div className="pn-small pn-muted">{next ? `Next: ${next.name}` : 'The top level'}</div>
        </div>
        <div style={{ textAlign: 'right' }} className="pn-small">
          <div>
            {productionLines(g).length} of {slots} line {slots === 1 ? 'slot' : 'slots'}
          </div>
          <div className="pn-muted">Stock budget up to {formatMoney(cap)}</div>
        </div>
      </div>
    </div>
  );
}

/** The two rooms: built ones open their page; locked ones show what they need. */
export function Rooms({ g, onOpen }: { g: GameState; onOpen: (r: RoomId) => void }) {
  const ladder = tierLadder(g);
  const row = (id: RoomId, name: string, icon: React.ReactNode, built: boolean, status: React.ReactNode) => {
    const tier = ladder.find((t) => t.key === (id === 'water' ? 'water' : 'food'))!;
    return (
      <div
        key={id}
        className="pn-card"
        role={built ? 'button' : undefined}
        tabIndex={built ? 0 : undefined}
        style={{ padding: 14, cursor: built ? 'pointer' : undefined, borderStyle: built ? undefined : 'dashed' }}
        data-testid={`build-facility-room-${id}`}
        onClick={built ? () => onOpen(id) : undefined}
        onKeyDown={(e) => built && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(id))}
      >
        <div className="pn-row pn-gap-2">
          {icon}
          <span className="pn-grow" style={{ fontWeight: 620 }}>
            {name} <Badge tone="aqua">New</Badge>
          </span>
          {built ? status : <Status tone="neutral">Locked</Status>}
          {built && <ChevronRight size={16} aria-hidden />}
        </div>
        {!built && (
          <ul className="ops-reqs" style={{ marginTop: 8 }}>
            {tier.reqs.map((r, i) => (
              <li key={i} className={r.met ? 'is-met' : undefined}>
                {r.met ? '✓' : <Lock size={12} aria-label="Missing" />} <span>{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  const water = g.facility.water;
  const food = g.facility.food;
  return (
    <div className="pn-col pn-gap-2">
      <div className="pn-small pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Rooms
      </div>
      {row('water', 'Water room', <Droplets size={17} aria-hidden />, !!water, isHeld(g, 'water') || isHeld(g, 'salt') ? <Status tone="watch">Held</Status> : <Status tone="good">Running</Status>)}
      {row('food', 'Live food room', <Egg size={17} aria-hidden />, !!food, isHeld(g, 'food') ? <Status tone="watch">Held</Status> : <Status tone="good">Running</Status>)}
      <button type="button" className="pn-link" onClick={() => toOps('overview')}>
        Buy and upgrade machines here. Operations runs them day to day. <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
}

function Machine({ icon, name, sub, action, status }: { icon: React.ReactNode; name: string; sub: string; action?: React.ReactNode; status?: React.ReactNode }) {
  return (
    <div className="pn-row pn-gap-2" style={{ padding: '10px 0', borderTop: '1px solid var(--pn-card-line)' }}>
      <span className="ops-chip">{icon}</span>
      <div className="pn-grow">
        <div style={{ fontWeight: 620 }}>{name}</div>
        <div className="pn-small pn-muted">{sub}</div>
      </div>
      {status}
      {action}
    </div>
  );
}

/** A room's page: back to Facility, the header, the link row to Operations, its machines and upgrades. */
export function RoomPage({ g, room, onBack }: { g: GameState; room: RoomId; onBack: () => void }) {
  const back = (
    <button type="button" className="pn-link" data-testid="build-room-back" onClick={onBack}>
      <ArrowLeft size={14} aria-hidden /> Facility
    </button>
  );
  if (room === 'water') {
    const w = g.facility.water;
    if (!w) return <LockedRoom g={g} room={room} back={back} />;
    const lvl = w.prepLevel;
    const nextPrep = WATER_ROOM.prepPrices[lvl];
    const needed = saltWaterNeeded(g);
    return (
      <div className="pn-stack" data-testid="build-room-water">
        {back}
        <div className="pn-card" style={{ padding: 16 }}>
          <div className="pn-row pn-gap-2">
            <Droplets size={20} aria-hidden />
            <span className="pn-grow" style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
              Water room
            </span>
            <Badge tone="aqua">New</Badge>
          </div>
          <button type="button" className="pn-link" onClick={() => toOps('water')}>
            Levels, schedules and daily use are in Operations › Water. Open <ChevronRight size={14} aria-hidden />
          </button>
          <div className="pn-small">
            Fresh reserve {Math.floor(w.fresh)} / {freshCap(w)} gal · Salt water reserve {needed ? `${Math.floor(w.salt)} / ${saltCap(w)} gal` : 'not needed'}
          </div>
        </div>
        <div className="pn-card" style={{ padding: '6px 16px' }}>
          <Machine
            icon={<Filter size={16} aria-hidden />}
            name="Water Prep Station"
            sub={`${prepRate(w)} gal an hour · $${WATER_ROOM.prepUpkeep.toFixed(2)}/day`}
            action={
              nextPrep !== undefined ? (
                <Button size="sm" data-testid="build-upgrade-prep" onClick={() => act((d) => upgradePrep(d))}>
                  Faster · {formatMoney(nextPrep)}
                </Button>
              ) : (
                <span className="pn-small pn-muted">Fastest</span>
              )
            }
          />
          <Machine
            icon={<Droplets size={16} aria-hidden />}
            name="Reservoirs"
            sub={`${freshCap(w)} gal fresh · ${saltCap(w)} gal salt`}
            action={
              w.reservoirs < WATER_ROOM.maxReservoirs ? (
                <Button size="sm" data-testid="build-add-reservoir" onClick={() => act((d) => addReservoir(d))}>
                  +{WATER_ROOM.reservoirFresh} gal · {formatMoney(WATER_ROOM.reservoirPrice)}
                </Button>
              ) : (
                <span className="pn-small pn-muted">No more space</span>
              )
            }
          />
          <Machine
            icon={<FlaskConical size={16} aria-hidden />}
            name="Salt Mixing Station"
            sub={`${WATER_ROOM.batchGal} gal batches · 12 h · $${WATER_ROOM.mixerUpkeep.toFixed(2)}/day`}
            status={isHeld(g, 'salt') ? <Status tone="watch">Held</Status> : !needed ? <Status tone="neutral">Idle · not needed</Status> : w.mix && w.mix.readyHour > g.clock.hour ? <Status tone="good">Mixing</Status> : <Status tone="neutral">Idle</Status>}
          />
        </div>
      </div>
    );
  }
  const f = g.facility.food;
  if (!f) return <LockedRoom g={g} room={room} back={back} />;
  const dosers = g.tankOrder.filter((id) => g.tanks[id] && doserOf(g.tanks[id])).length;
  const brine = f.cones.length * FOOD_ROOM.coneYield;
  const inf = Math.round((f.jars.length * FOOD_ROOM.jarYield * 24) / FOOD_ROOM.jarHours);
  return (
    <div className="pn-stack" data-testid="build-room-food">
      {back}
      <div className="pn-card" style={{ padding: 16 }}>
        <div className="pn-row pn-gap-2">
          <Egg size={20} aria-hidden />
          <span className="pn-grow" style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
            Live food room
          </span>
          <Badge tone="aqua">New</Badge>
        </div>
        <button type="button" className="pn-link" onClick={() => toOps('feed')}>
          Cultures, stock and the dosers are in Operations › Feed. Open <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      <div className="pn-card" style={{ padding: '6px 16px' }}>
        <Machine
          icon={<Egg size={16} aria-hidden />}
          name="Brine Shrimp Hatchery"
          sub={`${f.cones.length} ${f.cones.length === 1 ? 'cone' : 'cones'} · ${brine} servings a day`}
          action={
            f.cones.length < FOOD_ROOM.maxCones ? (
              <Button size="sm" data-testid="build-add-cone" onClick={() => act((d) => addCulture(d, 'cone'))}>
                Add a cone · {formatMoney(FOOD_ROOM.conePrice)}
              </Button>
            ) : undefined
          }
        />
        <Machine
          icon={<Sparkles size={16} aria-hidden />}
          name="Infusoria jars"
          sub={`${f.jars.length} ${f.jars.length === 1 ? 'jar' : 'jars'} · ${inf} servings a day`}
          action={
            f.jars.length < FOOD_ROOM.maxJars ? (
              <Button size="sm" data-testid="build-add-jar" onClick={() => act((d) => addCulture(d, 'jar'))}>
                Add a jar · {formatMoney(FOOD_ROOM.jarPrice)}
              </Button>
            ) : undefined
          }
        />
        <Machine icon={<Syringe size={16} aria-hidden />} name={`Live-food dosers × ${dosers}`} sub="Placed from a tank card’s Equipment" />
      </div>
      <div className="pn-card" style={{ padding: 16 }}>
        <div className="pn-small pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Each day
        </div>
        <div className="pn-small">
          Makes {brine} baby brine and {inf} infusoria · takes {f.cones.length} {f.cones.length === 1 ? 'scoop' : 'scoops'} of eggs, {f.cones.length * FOOD_ROOM.coneSaltGal} gal of salt water and about {Math.round((f.jars.length / 3) * 10) / 10} servings of vegetables
        </div>
      </div>
    </div>
  );
}

/** A room not built yet (§7.8's card, INTAKE C-48): what it needs. */
function LockedRoom({ g, room, back }: { g: GameState; room: RoomId; back: React.ReactNode }) {
  const tier = tierLadder(g).find((t) => t.key === (room === 'water' ? 'water' : 'food'))!;
  return (
    <div className="pn-stack">
      {back}
      <div className="ops-locked" data-testid={`build-room-locked-${room}`}>
        <div className="pn-row pn-gap-2">
          {room === 'water' ? <Droplets size={20} aria-hidden /> : <Egg size={20} aria-hidden />}
          <span style={{ fontWeight: 650, fontSize: 17 }}>{room === 'water' ? 'The Water room isn’t built yet' : 'The Live food room isn’t built yet'}</span>
        </div>
        <div className="pn-row pn-gap-2">
          <Badge tone="neutral">
            <Lock size={11} aria-hidden /> Tier {tier.tier}
          </Badge>
          <Badge tone="aqua">New</Badge>
        </div>
        <span className="pn-small">{tier.desc}.</span>
        <span className="pn-small pn-muted">Links to this page keep working; they show this until it opens.</span>
        <ul className="ops-reqs">
          {tier.reqs.map((r, i) => (
            <li key={i} className={r.met ? 'is-met' : undefined}>
              {r.met ? '✓' : <Lock size={12} aria-label="Missing" />} <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
