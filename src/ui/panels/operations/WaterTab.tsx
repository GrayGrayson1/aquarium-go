/**
 * Operations › Water (DESIGN-S3D §7.2; AUTO-032): the three meters (fresh reserve, salt water reserve, salt mix), where
 * the water goes in a day, the schedule, and the machines (desktop; phones link to Build › Facility). The salt meters
 * read "Not needed" while nothing uses salt water (ADR-0026 decision 12). OWNER: lane "automation" (chunk 5).
 */
import type { ReactNode } from 'react';
import { ChevronRight, Droplet, Droplets, FlaskConical, Filter, GitBranch, Package, CalendarClock, Wrench, Waves, Hand } from 'lucide-react';
import type { GameState } from '@/types';
import { Button, formatMoney } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { formatClock, dayOf } from '@/sim/time';
import { WATER_ROOM } from '@/data/catalog/machines';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { batchGal, batchSaltKg, changerOf, freshCap, heldSystems, isHeld, prepRate, saltCap, saltWaterNeeded, saltWaterPerDay, SALT_KG_PER_GAL, waterFlows, type SupplyProblem } from '@/sim/automation';
import { nextStockCheck } from '@/sim/staff/work';
import type { OpsSnapshot } from '@/ui/common/ops';
import { Status, NewChip, Kicker, OpsBar } from './parts';
import { nextMixHour, saltBuyLabel, whenText } from './issues';
import { buySaltBag } from './actions';
import type { OpsNav } from './OperationsPanel';

const g0 = (v: number) => Math.floor(Math.max(0, v)); // gallons on screen are rounded down (§9.2)
const g1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
const SALT_SHELF_KG = 35; // the salt mix bar's scale (§7.2)

function Meter({ icon, label, status, value, bar, hint, testId, children }: { icon: ReactNode; label: string; status: ReactNode; value: ReactNode; bar: ReactNode; hint: ReactNode; testId: string; children?: ReactNode }) {
  return (
    <section className="ops-card" data-testid={testId}>
      <div className="ops-card__head">
        {icon}
        <span className="ops-row__title">{label}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <NewChip />
          {status}
        </span>
      </div>
      <div className="ops-meter__value ops-num">{value}</div>
      {bar}
      <span className="ops-muted">{hint}</span>
      {children}
    </section>
  );
}

export function WaterTab({ g, snap, nav, small }: { g: GameState; snap: OpsSnapshot; nav: OpsNav; small: boolean }) {
  const room = g.facility.water;
  if (!room) return null;
  const now = g.clock.hour;
  const needed = saltWaterNeeded(g);
  const rate = prepRate(room);
  const fCap = freshCap(room);
  const sCap = saltCap(room);
  const batch = batchGal(room);
  const batchKg = batchSaltKg(batch);
  const fullBy = now + (fCap - room.fresh) / rate;
  const saltItem = snap.problems.find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === 'salt');
  const held = heldSystems(g);
  const kgDay = saltWaterPerDay(g) * SALT_KG_PER_GAL;
  const f = nextStockCheck(g);
  const flows = waterFlows(g);
  const freshDay = flows.fresh.changes + flows.fresh.mixer + flows.fresh.topOff;
  const saltDay = flows.salt.changes + flows.salt.hatchery;
  const changers = g.tankOrder.map((id) => g.tanks[id]).filter((t) => t && changerOf(t));
  const share = changers.length ? Math.round((changerOf(changers[0])!.fraction ?? 0.1) * 100) : 10;
  const onHours = [...new Set(changers.map((t) => t.lighting?.onHour ?? 8))].sort((a, b) => a - b);
  const mixHeld = isHeld(g, 'salt');
  const mixing = room.mix && room.mix.gal > 1e-6 ? (now < room.mix.readyHour ? 'mixing' : 'waiting') : 'idle';
  const freshStatus = room.fresh < 1 ? <Status tone="danger">Empty</Status> : room.fresh >= fCap - 0.5 ? <Status tone="good">Full</Status> : <Status tone="aqua" icon="running">Filling</Status>;
  const saltStatus = !needed ? (
    <Status tone="neutral">Not needed</Status>
  ) : saltItem?.state === 'out' && saltItem.shortDay !== undefined ? (
    <Status tone="danger">Short Day {saltItem.shortDay}</Status>
  ) : (
    <Status tone="good">OK</Status>
  );
  const mixStatus = !needed ? (
    <Status tone="neutral">Not needed</Status>
  ) : !saltItem ? (
    <Status tone="good">OK</Status>
  ) : saltItem.state === 'out' ? (
    <Status tone="danger">Out</Status>
  ) : saltItem.state === 'arriving' ? (
    <Status tone="watch" icon="time">Due {formatClock(saltItem.arrives ?? now)}</Status>
  ) : (
    <Status tone="watch">Low</Status>
  );
  const mixHint = !needed
    ? 'No tank or hatchery uses salt water. Mixing starts when one does.'
    : saltItem?.why === 'no_manager'
      ? `Uses ${g1(kgDay)} kg a day · No one reorders salt mix. Buy it, or hire a stock manager.`
      : saltItem?.state === 'arriving'
        ? `Uses ${g1(kgDay)} kg a day · ${f?.m.name.split(' ')[0] ?? 'Your stock manager'} reorders ${whenText(saltItem.arrives ?? now, now)}`
        : saltItem && f
          ? `Uses ${g1(kgDay)} kg a day · ${f.m.name.split(' ')[0]}’s ${formatMoney(f.budget)} budget won’t cover it today`
          : `Uses ${g1(kgDay)} kg a day`;
  const meters = (
    <>
      <Meter
        testId="water-meter-fresh"
        icon={<Droplet size={16} aria-hidden style={{ color: 'var(--c-blue)' }} />}
        label="Fresh reserve"
        status={freshStatus}
        value={
          <>
            {g0(room.fresh)}
            <small>/ {fCap} gal</small>
          </>
        }
        bar={<OpsBar value={room.fresh / fCap} label={`Fresh reserve ${g0(room.fresh)} of ${fCap} gal`} />}
        hint={room.fresh < 1 ? `Top-offs stop until prep refills it · ${g0(rate * 4)} gal by ${formatClock(now + 4)}` : room.fresh >= fCap - 0.5 ? `Full · the prep station makes ${rate} gal an hour` : `Refilling ${rate} gal an hour · full by ${formatClock(fullBy)}`}
      />
      <Meter
        testId="water-meter-salt"
        icon={<Waves size={16} aria-hidden style={{ color: 'var(--c-aqua)' }} />}
        label="Salt water reserve"
        status={saltStatus}
        value={
          <>
            {g0(room.salt)}
            <small>/ {sCap} gal</small>
          </>
        }
        bar={<OpsBar value={room.salt / sCap} kind="salt" label={`Salt water reserve ${g0(room.salt)} of ${sCap} gal`} />}
        hint={
          !needed
            ? 'No tank or hatchery uses salt water. Mixing starts when one does.'
            : mixing === 'mixing'
              ? `${g0(room.mix!.gal)} gal mixing · ready ${formatClock(room.mix!.readyHour)}`
              : mixing === 'waiting'
                ? `${g0(room.mix!.gal)} gal ready in the mixing tank`
                : `Next batch ${formatClock(nextMixHour(now))}: ${g0(batch)} gal, ready 12 hours later`
        }
      />
      <Meter
        testId="water-meter-saltmix"
        icon={<Package size={16} aria-hidden style={{ color: 'var(--c-gold)' }} />}
        label="Salt mix"
        status={mixStatus}
        value={`${g1(g.inventory.salt)} kg`}
        bar={<OpsBar value={g.inventory.salt / SALT_SHELF_KG} kind={saltItem?.state === 'out' ? 'danger' : saltItem ? 'watch' : 'gold'} label={`Salt mix ${g1(g.inventory.salt)} kg`} />}
        hint={mixHint}
      >
        {needed && saltItem && (
          <Button className="ops-buy" data-testid="water-buy-salt" onClick={() => buySaltBag(40)}>
            {saltBuyLabel}
          </Button>
        )}
      </Meter>
    </>
  );
  const flowCard = (
    <section className="ops-card" data-testid="water-flows">
      <Kicker icon={<GitBranch size={14} aria-hidden />}>Where the water goes · a day</Kicker>
      <span className="ops-row__title">Fresh water · {g1(freshDay)} gal</span>
      <Stack parts={[flows.fresh.changes, flows.fresh.mixer, flows.fresh.topOff]} colors={['var(--c-blue)', 'var(--c-aqua-2)', 'rgba(200,235,245,.7)']} />
      <Legend color="var(--c-blue)" text={`Water changes · ${flows.fresh.tanks} freshwater ${flows.fresh.tanks === 1 ? 'tank' : 'tanks'}`} value={flows.fresh.changes} />
      {needed && <Legend color="var(--c-aqua-2)" text="To the salt mixer" value={flows.fresh.mixer} />}
      <Legend color="rgba(200,235,245,.7)" text={`Top-off · ${flows.fresh.atos} Auto Top-${flows.fresh.atos === 1 ? 'Off' : 'Offs'}`} value={flows.fresh.topOff} />
      {needed && (
        <>
          <span className="ops-row__title">Salt water · {g1(saltDay)} gal</span>
          <Stack parts={[flows.salt.changes, flows.salt.hatchery]} colors={['var(--c-aqua)', 'var(--c-violet)']} />
          <Legend color="var(--c-aqua)" text={`Water changes · ${flows.salt.tanks} salt ${flows.salt.tanks === 1 ? 'tank' : 'tanks'}`} value={flows.salt.changes} />
          {flows.salt.hatchery > 0 && <Legend color="var(--c-violet)" text="Brine shrimp hatchery" value={flows.salt.hatchery} />}
        </>
      )}
    </section>
  );
  const schedule = (
    <section className="ops-card" data-testid="water-schedule">
      <Kicker icon={<CalendarClock size={14} aria-hidden />}>Schedule</Kicker>
      <div className="ops-rows">
        <Sched label="Water changes" value={`${share}% at ${onHours.length === 1 ? formatClock(onHours[0]) : 'lights-on'}`} sub={`at each tank’s lights-on · ${changers.length} ${changers.length === 1 ? 'tank' : 'tanks'}`} />
        <Sched label="Glass scrape" value="Once a week" sub="spread across the week" />
        <Sched label="Top-off" value="As needed" sub={`${flows.fresh.atos} Auto Top-${flows.fresh.atos === 1 ? 'Off' : 'Offs'}`} />
        {needed && <Sched label="Salt mixing" value={`${g0(batch)} gal batches below 60%`} sub={`${batchKg.toFixed(1)} kg each · ${WATER_ROOM.mixHours.map((h) => formatClock(h)).join(' and ')}`} />}
      </div>
    </section>
  );
  const awcs = changers.length;
  const machines = small ? (
    <div className="ops-card">
      <div className="ops-row">
        <Wrench size={16} aria-hidden className="ops-muted" />
        <span className="ops-row__main ops-row__sub">Machines and upgrades are in Build › Facility.</span>
        <button type="button" className="ops-link" onClick={() => go({ kind: 'panel', panel: 'build', tab: 'facility', target: 'room:water' })}>
          Open <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  ) : (
    <section className="ops-card" data-testid="water-machines">
      <Kicker
        icon={<Wrench size={14} aria-hidden />}
        end={
          <button type="button" className="ops-link" onClick={() => go({ kind: 'panel', panel: 'build', tab: 'facility', target: 'room:water' })}>
            Upgrade in Build <ChevronRight size={14} aria-hidden />
          </button>
        }
      >
        Machines
      </Kicker>
      <div className="ops-rows">
        <Machine icon={<Filter size={16} aria-hidden />} name="Water Prep Station" sub={`${rate} gal an hour · $${WATER_ROOM.prepUpkeep.toFixed(2)}/day`} status={<Status tone="good" icon="running">Running</Status>} />
        <Machine icon={<Droplets size={16} aria-hidden />} name="Reservoir" sub={`${fCap} gal fresh · ${sCap} gal salt`} status={<Status tone="good">OK</Status>} />
        <Machine
          icon={<FlaskConical size={16} aria-hidden />}
          name="Salt Mixing Station"
          sub={`${g0(batch)} gal batches · 12 h · $${WATER_ROOM.mixerUpkeep.toFixed(2)}/day`}
          status={
            mixHeld ? (
              <Status tone="watch" icon="held">Held</Status>
            ) : !needed ? (
              <Status tone="neutral">Idle · not needed</Status>
            ) : mixing === 'mixing' ? (
              <Status tone="aqua" icon="running">Ready {formatClock(room.mix!.readyHour)}</Status>
            ) : (
              <Status tone="neutral" icon="time">Next {formatClock(nextMixHour(now))}</Status>
            )
          }
        />
        <Machine
          icon={<Waves size={16} aria-hidden />}
          name={`Auto Water Changer × ${awcs}`}
          sub={`${share}% each morning · $${(getEquipmentDef('auto_water_changer')?.upkeep ?? 0.06).toFixed(2)}/day each`}
          status={isHeld(g, 'water') ? <Status tone="watch" icon="held">Held</Status> : <Status tone="good" icon="running">Running</Status>}
        />
      </div>
    </section>
  );
  const note = held.length > 0 && (
    <div className="ops-card ops-manual">
      <div className="ops-row">
        <Hand size={16} aria-hidden />
        <span className="ops-row__main">Manual mode: {held.filter((h) => h === 'water' || h === 'salt').map((h) => (h === 'water' ? 'water changes' : 'salt mixing')).join(' and ') || 'other systems'} on hold.</span>
        <button type="button" className="ops-link" onClick={() => nav.view('manual')}>
          Open <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
  return small ? (
    <>
      {note}
      {meters}
      {flowCard}
      {schedule}
      {machines}
    </>
  ) : (
    <>
      {note}
      <div className="ops-cols">
        <div className="ops-col">
          {meters}
          {schedule}
        </div>
        <div className="ops-col">
          {flowCard}
          {machines}
        </div>
      </div>
    </>
  );
}

function Stack({ parts, colors }: { parts: number[]; colors: string[] }) {
  const total = parts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="ops-stack" aria-hidden>
      {parts.map((p, i) => (p > 0 ? <span key={i} style={{ width: `${(p / total) * 100}%`, background: colors[i] }} /> : null))}
    </div>
  );
}

function Legend({ color, text, value }: { color: string; text: string; value: number }) {
  return (
    <div className="ops-legend">
      <span className="ops-legend__dot" style={{ background: color }} aria-hidden />
      <span>{text}</span>
      <span className="ops-legend__val">{g1(value)} gal</span>
    </div>
  );
}

function Sched({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="ops-row">
      <span className="ops-row__main ops-muted">{label}</span>
      <div style={{ textAlign: 'right' }}>
        <div className="ops-row__title">{value}</div>
        <div className="ops-row__sub">{sub}</div>
      </div>
    </div>
  );
}

function Machine({ icon, name, sub, status }: { icon: ReactNode; name: string; sub: string; status: ReactNode }) {
  return (
    <div className="ops-row">
      <span className="ops-chip">{icon}</span>
      <div className="ops-row__main">
        <span className="ops-row__title">{name}</span>
        <span className="ops-row__sub">{sub}</span>
      </div>
      {status}
    </div>
  );
}
