/**
 * Operations › Lines (DESIGN-S3D §7.4; AUTO-014): every production line by species, its status, stage track, what it's
 * doing, this week's sales, its switch and its route strip; the tanks lines share; what's coming up (desktop); and the
 * locked line slots early on. The rules stay in Livestock › Production (§2 decision 6). The numbers are chunk 4's
 * (src/sim/production/view.ts). OWNER: lane "automation" (chunk 5).
 */
import { CalendarDays, ChevronRight, Factory, Lock, Box } from 'lucide-react';
import type { GameState, ProductionLine } from '@/types';
import { Button, Toggle, formatMoney, Badge } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { findSpecies } from '@/data/species';
import { FACILITY_LEVELS, PRODUCTION_LINE_SLOTS } from '@/data/facilities';
import { lineSlots, productionLines, youngPlaces, youngSizeCm } from '@/sim/production';
import { lineView, type LineView, type StageId } from '@/sim/production/view';
import { isHeld } from '@/sim/automation';
import { CreaturePortrait } from '../common/Portrait';
import { EmptyState } from '../common/parts';
import { RouteStrip, StatusWord } from '../livestock/Production';
import { Status, Kicker } from './parts';
import { doLineSwitch } from './actions';

const STAGES: { id: StageId; label: string }[] = [
  { id: 'breed', label: 'Breed' },
  { id: 'raise', label: 'Raise' },
  { id: 'sort', label: 'Sort' },
  { id: 'quarantine', label: 'QT' },
  { id: 'sell', label: 'Sell' },
];

const production = () => go({ kind: 'panel', panel: 'livestock', tab: 'production' });

/** Within two days, the brood's next stage gets its hours (DES-013: "· next stage in 6 h"); a longer wait shows as "day x of y". */
const NEXT_STAGE_SHOWN_H = 48;

/** "12 juveniles in Grow-out B · day 15 of 19 · next stage in 6 h", or what the line waits for. */
function doing(g: GameState, line: ProductionLine, v: LineView): string {
  if (v.raising.count > 0) {
    const days = v.raising.dayOf !== undefined && v.raising.ofDays ? ` · day ${v.raising.dayOf} of ${v.raising.ofDays}` : '';
    const h = v.raising.nextStageIn;
    return `${v.raising.count} ${v.raising.word} in ${v.raise?.name ?? 'the raise tank'}${days}${h !== undefined && h <= NEXT_STAGE_SHOWN_H ? ` · next stage in ${h} h` : ''}`;
  }
  if (v.quarantined.count > 0) return `${v.quarantined.count} ${v.quarantined.word} in ${v.quarantine?.name ?? 'quarantine'}${v.quarantined.listsDay ? ` · lists Day ${v.quarantined.listsDay}` : ''}`;
  if (v.next.days !== undefined) return `Next clutch in ${v.next.days} ${v.next.days === 1 ? 'day' : 'days'}`;
  return `${v.mother?.name ?? 'The pair'} and ${v.father?.name ?? 'its partner'} are getting ready`;
}

function Track({ v, held }: { v: LineView; held: boolean }) {
  const at = STAGES.findIndex((s) => s.id === v.active);
  return (
    <div className="ops-track" aria-label={`Stage: ${STAGES[at]?.label ?? ''}`}>
      {STAGES.map((s, i) => (
        <span key={s.id} className={`ops-track__seg${i < at ? ' is-done' : ''}${i === at ? ' is-on' : ''}${i === at && held ? ' is-held' : ''}`}>
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function LinesTab({ g, small }: { g: GameState; small: boolean }) {
  const lines = productionLines(g);
  const slots = lineSlots(g);
  if (!lines.length)
    return (
      <>
        <EmptyState
          icon={<Factory size={26} />}
          title="No production line yet"
          action={
            <Button variant="primary" onClick={() => go({ kind: 'panel', panel: 'livestock', tab: 'production', target: 'line:new' })}>
              Set up a line
            </Button>
          }
        >
          Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you.
        </EmptyState>
        <LockedSlots used={0} slots={slots} />
      </>
    );
  const held = isHeld(g, 'lines');
  const bySpecies = new Map<string, ProductionLine[]>();
  for (const l of lines) bySpecies.set(l.speciesId, [...(bySpecies.get(l.speciesId) ?? []), l]);
  const rows = [...bySpecies.entries()].map(([speciesId, list], i) => {
    const sp = findSpecies(speciesId);
    return (
      <section key={speciesId} className="ops-card">
        <Kicker
          end={
            i === 0 ? (
              <button type="button" className="ops-link" onClick={production}>
                Rules in Production <ChevronRight size={14} aria-hidden />
              </button>
            ) : undefined
          }
        >
          {sp?.commonName ?? speciesId} · {list.length} {list.length === 1 ? 'line' : 'lines'}
        </Kicker>
        <div className="ops-rows">
          {list.map((line) => (
            <LineRow key={line.id} g={g} line={line} held={held} small={small} early={slots <= 1} />
          ))}
        </div>
      </section>
    );
  });
  return (
    <>
      {rows}
      <div className={small ? undefined : 'ops-cols'}>
        <SharedTanks g={g} lines={lines} slots={slots} />
        {!small && <ComingUp g={g} lines={lines} />}
      </div>
      {slots <= 1 && <LockedSlots used={lines.length} slots={slots} />}
    </>
  );
}

function LineRow({ g, line, held, small, early }: { g: GameState; line: ProductionLine; held: boolean; small: boolean; early: boolean }) {
  const v = lineView(g, line);
  if (!v) return null;
  const sp = v.sp;
  const stuck = v.status !== 'running' || held;
  const week = `${v.week.sold} sold · ${formatMoney(v.week.revenue)}`;
  return (
    <div className="ops-line" data-testid={`line-row-${line.id}`}>
      <div className="ops-line__pair" aria-hidden>
        {v.mother && <CreaturePortrait creature={v.mother} size={36} />}
        {v.father && <CreaturePortrait creature={v.father} size={36} />}
      </div>
      <div className="ops-row__main">
        <span className="ops-row__title" style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
          {line.name}
        </span>
        <span className="ops-row__sub">
          {sp.commonName} · {v.mother?.name ?? '?'} × {v.father?.name ?? '?'}
        </span>
        {!small && <Track v={v} held={stuck} />}
        <span className={stuck ? 'ops-amber' : 'ops-row__sub'}>{v.status === 'paused_by_you' ? 'Paused by you · animals stay where they are' : doing(g, line, v)}</span>
        {early && v.selling.listed > 0 && (
          <span className="ops-row__sub ops-num" data-testid={`line-listed-${line.id}`}>
            Listed now {v.selling.listed}
            {v.selling.bestBid ? ` · best bid ${formatMoney(v.selling.bestBid)}` : ''}
          </span>
        )}
      </div>
      <div className="ops-line__right">
        <span data-testid={`line-status-${line.id}`}>
          {held ? (
            <Status tone="watch" icon="held">
              Held
            </Status>
          ) : (
            <StatusWord v={v} />
          )}
        </span>
        {!small && <span className="ops-muted ops-num">{week}</span>}
        {!small && <Toggle checked={line.running} onChange={(on) => doLineSwitch(line.id, on)} label={`Run the ${line.name}`} testId={`line-toggle-${line.id}`} />}
        {small && <span className="ops-muted ops-num">This week {week}</span>}
        {small && (
          <span className="ops-line__switch">
            <span aria-hidden>Line on</span>
            <Toggle checked={line.running} onChange={(on) => doLineSwitch(line.id, on)} label={`Run the ${line.name}`} testId={`line-toggle-${line.id}`} />
          </span>
        )}
      </div>
      <div className="ops-line__route" data-testid={`line-route-${line.id}`}>
        <RouteStrip g={g} line={line} v={v} />
      </div>
    </div>
  );
}

/** Tanks the lines use, with the places taken (young of the line at their raised size), and who shares them. */
function SharedTanks({ g, lines, slots }: { g: GameState; lines: ProductionLine[]; slots: number }) {
  const now = g.clock.hour;
  const tanks = new Map<string, ProductionLine[]>();
  for (const l of lines) for (const id of [l.tanks.raise, ...l.tanks.quarantine]) if (g.tanks[id]) tanks.set(id, [...(tanks.get(id) ?? []), l]);
  const rows = [...tanks.entries()].map(([id, users]) => {
    const t = g.tanks[id];
    const line = users[0];
    const sp = findSpecies(line.speciesId);
    const young = Object.values(g.creatures).filter((c) => c.tankId === id && c.status === 'alive' && users.some((u) => c.lineage.motherId === u.pair.motherId)).length;
    const pending = Object.values(g.clutches).filter((cl) => cl.tankId === id && cl.count > 0).reduce((a, cl) => a + cl.count, 0);
    const free = sp ? youngPlaces(g, t, sp, now, youngSizeCm(g, line, sp)) : 0;
    const used = young + (sp ? Math.min(pending, sp.breeding.maxRaisedPerClutch) : 0);
    const cap = used + free;
    const full = cap > 0 && free <= 0;
    const shared = users.length > 1 ? `Used by the ${users.map((u) => u.name.replace(/ line$/, '')).join(' and ')} lines` : null;
    return { id, t, used, cap, full, shared, sp };
  });
  return (
    <section className="ops-card" data-testid="lines-capacity">
      <Kicker icon={<Box size={14} aria-hidden />} end={<Badge tone="aqua">{`${lines.length} of ${slots} line ${slots === 1 ? 'slot' : 'slots'}`}</Badge>}>
        Shared tanks
      </Kicker>
      <div className="ops-rows">
        {rows.map((r) => (
          <div key={r.id} className="ops-row">
            <div className="ops-row__main">
              <span className="ops-row__title">{r.t.name}</span>
              {r.shared && <span className="ops-row__sub">{r.shared}</span>}
            </div>
            {r.full ? (
              <Status tone="watch">
                Full · {r.used}/{r.cap}
              </Status>
            ) : (
              <span className="ops-num ops-muted">
                {r.used}/{r.cap}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Coming up (desktop): the dated events the lines' views know about. */
function ComingUp({ g, lines }: { g: GameState; lines: ProductionLine[] }) {
  const today = Math.floor(g.clock.hour / 24) + 1;
  const events: { day: number; text: string }[] = [];
  for (const line of lines) {
    const v = lineView(g, line);
    if (!v) continue;
    const short = line.name.replace(/ line$/, '');
    if (v.quarantined.listsDay) events.push({ day: v.quarantined.listsDay, text: `${short} lists ${v.quarantined.count}` });
    if (v.next.days !== undefined && v.status === 'running') events.push({ day: today + v.next.days, text: `${short} spawns` });
    if (v.status === 'waiting' && v.next.restartDay) events.push({ day: v.next.restartDay, text: `${short} restarts` });
  }
  events.sort((a, b) => a.day - b.day || (a.text < b.text ? -1 : 1));
  return (
    <section className="ops-card" data-testid="lines-upcoming">
      <Kicker icon={<CalendarDays size={14} aria-hidden />}>Coming up</Kicker>
      <div className="ops-rows">
        {events.slice(0, 6).map((e, i) => (
          <div key={i} className="ops-row">
            <span className="ops-num" style={{ minWidth: 64, fontWeight: 620 }}>
              Day {e.day}
            </span>
            <span className="ops-row__main">{e.text}</span>
          </div>
        ))}
        {!events.length && <span className="ops-muted">Nothing dated yet.</span>}
      </div>
    </section>
  );
}

/** The next line slots still locked and the level that opens each (the Lines tab and the early map). */
export function lockedSlotRows(used: number, slots: number, max = 3): { n: number; level: string }[] {
  const rows: { n: number; level: string }[] = [];
  let n = Math.max(slots, used) + 1;
  for (const lvl of FACILITY_LEVELS) {
    const s = PRODUCTION_LINE_SLOTS[lvl.id];
    while (n <= s && rows.length < max) rows.push({ n: n++, level: lvl.name });
  }
  return rows;
}

/** The line slots still locked, as dashed rows ("Line slot 2 · Specialty Shop"). */
function LockedSlots({ used, slots }: { used: number; slots: number }) {
  const rows = lockedSlotRows(used, slots);
  if (!rows.length) return null;
  return (
    <div className="ops-col">
      {rows.map((r) => (
        <div key={r.n} className="ops-card ops-card--dashed">
          <div className="ops-row">
            <Lock size={14} aria-hidden className="ops-muted" />
            <span className="ops-row__main ops-muted">
              {r.n === 2 ? `Line slot ${r.n}` : r.n} · {r.level}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
