/**
 * Livestock › Production: production lines (DESIGN-S3D §8.6, building on 0.5 §11.1; ADR-0025, ADR-0030). OWNER: lane
 * "ui-panels". The line picker strip and slot caption, one line's header card, tiles, five stages and Line rules, and
 * the dialogs (End line, Add a quarantine tank, Sort, choosing another pair or tank). Setting up a line is in
 * ProductionSetup.tsx. The numbers come from src/sim/production/view.ts; the words are the designs' and ADR-0030's.
 */
import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Box, ChevronRight, CirclePlay, Egg, Factory, Gavel, Heart, ListFilter, Pause, ShieldCheck, Sprout, TrendingUp, TriangleAlert } from 'lucide-react';
import type { GameState, ProductionLine } from '@/types';
import { Badge, Button, Modal, Toggle, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings'; // Audit 2026-11-17 (J1)
import { convertTempText } from '@/ui/common/format'; // Audit 2026-11-17 (J1)
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { foodTagNames, joinFoodNames } from '@/data/catalog/foods'; // Audit 2026-11-17 (J3)
import { fmtTemp, spPlural } from '@/sim/life/breeding/common';
import { morphDisplayName } from '@/sim/life/genetics';
import {
  facilityLevelName,
  findLine,
  lineNoticeText,
  lineSlots,
  nextSlotLevel,
  pairTraits,
  productionLines,
  quarantineKit,
  type LineStage,
} from '@/sim/production';
import { lineColour, lineView, slotsCaption, type LineView, type StageId } from '@/sim/production/view';
import { doserOf } from '@/sim/automation';
import { act } from '../common/act';
import { Bar, EmptyState, Seg, Tile } from '../common/parts';
import { CreaturePortrait } from '../common/Portrait';
import { LIST_AUTOMATICALLY, NewLine, PairPicker, SortSheet, TankPicker } from './ProductionSetup';
import { go } from '@/ui/nav/router'; // lane:automation (chunk 5)
import './production.css';

const NUMBER_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight' };

/** lane:automation (chunk 5) — the Production tab's dot: a line held up (waiting for room, not yet decided) or broken. */
export function productionDot(g: GameState): 'watch' | null {
  return productionLines(g).some((l) => (l.waiting && g.automation?.lineWait?.[l.id] === undefined) || !!l.broken) ? 'watch' : null;
}

const gallons = (g: GameState, tankId: string | undefined) => (tankId ? TANK_TIER_BY_ID[g.tanks[tankId]?.tierId ?? '']?.gallons : undefined);

/** The Production tab: the slot caption, the line strip (with "+ New line" while a slot is free), then the view. */
export function ProductionTab({ g, sel, onSelect }: { g: GameState; sel: string | null; onSelect: (id: string | null) => void }) {
  const lines = productionLines(g);
  const slots = lineSlots(g);
  const free = lines.length < slots;
  const next = nextSlotLevel(g);
  const caption = slotsCaption(lines.length, slots, facilityLevelName(g), next?.name ?? null);
  const creating = sel === 'new' && free;
  const current = creating ? undefined : (sel ? findLine(g, sel) : undefined) ?? lines[0];
  const strip = lines.length >= 2 || (lines.length >= 1 && free);
  return (
    <div className="pr-tab">
      {strip && (
        <Seg<string>
          label="Production lines"
          reveal
          value={creating ? 'new' : current?.id ?? 'new'}
          onChange={(id) => onSelect(id)}
          testIdPrefix="production-line-"
          items={[
            ...lines.map((l) => ({ id: l.id, label: lines.length === 1 ? l.name : l.name.replace(/ line$/, '') })),
            ...(free ? [{ id: 'new', label: '+ New line', testId: 'production-add-line' }] : []),
          ]}
        />
      )}
      <p className="pr-slots" data-testid="production-slots">
        {caption}
      </p>
      {creating ? (
        <NewLine g={g} onStarted={(id) => onSelect(id)} />
      ) : current ? (
        <>
          <LineDetail g={g} line={current} onEnded={() => onSelect(null)} />
          {/* lane:automation (chunk 5, DESIGN-S3D §8.6; one line's wording ADR-0033) — the overview of every line is Operations' */}
          <button type="button" className="pn-link" data-testid="production-ops-link" onClick={() => go({ kind: 'panel', panel: 'operations', tab: 'lines' })}>
            Status, bottlenecks and routes for {lines.length === 1 ? 'your line' : `all ${NUMBER_WORDS[lines.length] ?? lines.length} lines`} are in Operations › Lines. <ChevronRight size={14} aria-hidden />
          </button>
        </>
      ) : (
        <EmptyState
          icon={<Factory size={26} />}
          title="No production line yet"
          action={
            <Button variant="primary" data-testid="production-setup" onClick={() => onSelect('new')}>
              Set up a line
            </Button>
          }
        >
          Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you.
        </EmptyState>
      )}
    </div>
  );
}

/**
 * Who feeds what the raise tank holds (Audit 2026-11-17, H2): a brood gets its first foods from a live-food doser, on
 * its keeper's rounds or by hand (an Autofeeder feeds animals, never fry); juveniles waiting there eat from the
 * Autofeeder too.
 */
function raiseFeeding(g: GameState, v: LineView): string {
  const brood = v.raising.dayOf !== undefined;
  if (v.raise && doserOf(v.raise)) return 'baby brine and infusoria from the doser';
  if (!brood && v.raising.feeding) return `${v.raising.feeding.food} ${v.raising.feeding.meals}× a day from the Autofeeder`;
  const keeper = v.raise ? (g.staff?.roster ?? []).find((m) => m.role === 'aquarist' && m.tankIds.includes(v.raise!.id)) : undefined;
  if (keeper) return brood ? `first foods on ${keeper.name.split(' ')[0]}’s rounds` : `fed on ${keeper.name.split(' ')[0]}’s rounds`;
  return brood ? 'first foods by hand, or from a keeper or a live-food doser' : 'fed by hand';
}

/**
 * Audit 2026-11-17 (H4): why a due pair isn't spawning, from the biggest drag on its readiness ("Breed Tank is too warm
 * for spawning (28 °C; they spawn below 26 °C)"); null when nothing holds it back. The tile and Operations › Lines say it.
 */
export function notReadyText(v: LineView): string | null {
  const n = v.next.notReady;
  if (!n) return null;
  const t = n.tank.name;
  const cond = v.sp.breeding.conditions;
  const temp = fmtTemp(n.tank.water.tempC);
  const inUnit = (text: string) => convertTempText(text, useSettings.getState().tempUnit) ?? text; // Audit 2026-11-17 (J1)
  switch (n.drag) {
    case 'too_warm':
      return inUnit(`${t} is too warm for spawning (${temp}; they spawn below ${cond.maxTempC} °C)`);
    case 'too_cool':
      return inUnit(`${t} is too cool for spawning (${temp}; they spawn above ${cond.minTempC} °C)`);
    case 'temp_range':
      return inUnit(`${t} is ${temp}, outside their safe range (${v.sp.tempC.min}–${v.sp.tempC.max} °C)`);
    case 'crowded':
      return `${t} is crowded`;
    case 'small_tank':
      return `${t} is too small for spawning (they need ${cond.minTankGallons} gal)`;
    case 'water':
      return `${t}’s water isn’t quite right for them`;
    case 'hunger':
      return `${n.who.name} is hungry`;
    case 'stress':
      return `${n.who.name} is stressed`;
    case 'health':
    case 'illness':
      return `${n.who.name} is unwell`;
    case 'comfort':
      return `${n.who.name} isn’t settled in ${t}`;
    case 'conditioning': {
      const foods = foodTagNames(cond.needsConditioningFood ?? [], { shelfOnly: true }); // Audit 2026-11-17 (J3): shop words
      return `they need rich food (${joinFoodNames(foods) || 'live food'}) to get into condition`;
    }
  }
  return null;
}

/** The line's status word (Running, Paused by you, Paused); Operations › Lines shows it too. */
export function StatusWord({ v }: { v: LineView }) {
  if (v.status === 'running')
    return (
      <Badge tone="good">
        <CirclePlay size={12} aria-hidden /> Running
      </Badge>
    );
  return (
    <Badge tone="watch">
      <Pause size={12} aria-hidden /> {v.status === 'paused_by_you' ? 'Paused by you' : 'Paused'}
    </Badge>
  );
}

function TankPill({ g, tankId, name }: { g: GameState; tankId?: string; name?: string }) {
  const gal = gallons(g, tankId);
  return (
    <span className="pr-pill">
      <Box size={12} aria-hidden /> {name ?? (tankId ? g.tanks[tankId]?.name : undefined) ?? '—'}
      {gal ? ` · ${gal} gal` : ''}
    </span>
  );
}

function Stage({ id, n, icon, title, active, children, pill, onOpen, label }: { id: StageId; n: number; icon: ReactNode; title: string; active: boolean; children: ReactNode; pill: ReactNode; onOpen?: () => void; label?: string }) {
  const body = (
    <>
      <div className="pr-stage__top">
        <span className={clsx('pr-stage__n', active && 'is-on')} aria-hidden>
          {n}
        </span>
        <span className="pr-stage__icon" aria-hidden>
          {icon}
        </span>
        <h4 className="pr-stage__title">{title}</h4>
      </div>
      {pill}
      <div className="pr-stage__body">{children}</div>
    </>
  );
  if (onOpen)
    return (
      <div className={clsx('pr-stage', active && 'is-active', 'pr-stage--btn')} data-testid={`production-stage-${id}`} role="button" tabIndex={0} aria-label={label} aria-current={active ? 'step' : undefined} onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpen();
      }} onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen();
        }
      }}>
        {body}
      </div>
    );
  return (
    <div className={clsx('pr-stage', active && 'is-active')} data-testid={`production-stage-${id}`} aria-current={active ? 'step' : undefined}>
      {body}
    </div>
  );
}

type Fixing = null | { kind: 'pair' } | { kind: 'tank'; stage: LineStage; replace?: string };

const daysLeft = (n: number | undefined) => `${n ?? 0} ${n === 1 ? 'day' : 'days'} left`;

/** The Sell stage's foot: "12 juvenile bettas listed · Buy now $18 each", or this week's sales (Audit 2026-11-17, H1). */
function sellFoot(v: LineView): string {
  const s = v.selling;
  if (s.listed > 0) {
    const price = s.each !== undefined ? ` · Buy now ${s.listings > 1 ? 'from ' : ''}${formatMoney(s.each)}${s.listed > 1 ? ' each' : ''}` : '';
    return `${s.title ?? `${s.listed} ${s.listed === 1 ? v.sp.commonName.toLowerCase() : spPlural(v.sp)}`} listed${price}`;
  }
  if (v.week.sold > 0) return `Sold ${v.week.sold} ${v.week.sold === 1 ? v.sp.commonName.toLowerCase() : spPlural(v.sp)} this week · ${formatMoney(v.week.revenue)}`;
  return 'Nothing listed';
}

/** One line: header card, the note while it's held up, four tiles, five stages, Line rules. */
export function LineDetail({ g, line, onEnded }: { g: GameState; line: ProductionLine; onEnded?: () => void }) {
  const [ending, setEnding] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [addingQt, setAddingQt] = useState(false);
  const [fixing, setFixing] = useState<Fixing>(null);
  const v = lineView(g, line);
  if (!v) return null;
  const several = productionLines(g).length >= 2;
  const plural = spPlural(v.sp);
  const morph = line.breedFor ? morphDisplayName(v.sp, line.breedFor).replace(new RegExp(`\\s*${v.sp.commonName}$`, 'i'), '') : '';
  const pairNames = `${v.mother?.name ?? '—'} × ${v.father?.name ?? '—'}`;
  const subline = several ? `${v.sp.commonName} · ${pairNames} · breeds, raises and sells while you play` : `Breeds, raises and sells ${morph ? `${morph} ` : ''}${plural} while you play.`;
  const raiseName = v.raise?.name ?? 'the raise tank';
  const keepName = v.keep?.name ?? 'the keep tank';
  const broken = line.broken;
  // a batch waiting for a quarantine tank: "Add a quarantine tank" (ADR-0030 decision 3), in the note while the line
  // waits for room, else on the Quarantine stage
  const waitsForQuarantine = !broken && (line.batches ?? []).some((b) => !b.tankId && !b.released);
  const kit = waitsForQuarantine ? quarantineKit(g, line.id) : null;
  const addQt = kit && (
    <Button size="sm" variant="primary" data-testid="production-add-qt" onClick={() => setAddingQt(true)}>
      Add a quarantine tank · {formatMoney(kit.price)}
    </Button>
  );
  const traits = new Map(pairTraits(g, line).map((t) => [t.id, t.name]));
  const fixTank = (stage: LineStage) => broken && !broken.moved && broken.ref === stage;
  const fixPair = broken && (broken.ref === 'mother' || broken.ref === 'father');

  const toggleRunning = (on: boolean) => {
    const name = line.name;
    act({ k: 'setLineRunning', line: line.id, on }, { quiet: true, after: (r) => r?.ok && !on && useUI.getState().toast(`${name} paused`, 'info', { detail: 'Animals stay where they are; nothing new is bred or listed.' }) });
  };

  const next = (() => {
    if (v.status === 'paused_by_you') return { value: '—', hint: 'Paused by you' };
    if (v.status === 'paused') return { value: '—', hint: 'Paused' };
    if (v.status === 'waiting') return v.next.fullTank ? { value: '—', hint: `Waits until ${v.next.fullTank.name} has room` } : { value: v.next.restartDay ? `Day ${v.next.restartDay}` : '—', hint: `${raiseName} is full` };
    const why = notReadyText(v);
    if (why) return { value: 'Not ready', hint: why.charAt(0).toUpperCase() + why.slice(1) }; // Audit 2026-11-17 (H4)
    if (v.next.days === undefined) return { value: '—', hint: 'Pair conditioning' };
    return { value: `~${v.next.days} ${v.next.days === 1 ? 'day' : 'days'}`, hint: `${v.breed?.name ?? 'Breed tank'} · day ${v.next.dayOf} of ${v.next.cycle}` };
  })();
  const growing = v.raising.count > 0
    ? { value: `${v.raising.count} ${v.raising.word}`, hint: v.raising.dayOf !== undefined ? `${raiseName} · day ${v.raising.dayOf} of ${v.raising.ofDays}` : `${raiseName}${v.raising.full ? ' · full' : ''}` }
    : { value: '—', hint: raiseName };
  const quarantine = v.quarantined.count > 0
    ? { value: String(v.quarantined.count), hint: line.rules.autoList ? `Lists Day ${v.quarantined.listsDay}` : daysLeft(v.quarantined.daysLeft) }
    : v.quarantined.busyTank
      ? { value: '—', hint: `${v.quarantined.busyTank.name} is busy to Day ${v.quarantined.busyUntilDay}` }
      : v.quarantined.uncycledTank
        ? { value: '—', hint: `${v.quarantined.uncycledTank.name} isn’t cycled yet` }
      : v.quarantined.unsold > 0
        ? { value: `${v.quarantined.unsold} unsold`, hint: v.quarantined.fullTank ? `${v.quarantined.fullTank.name} is full` : v.quarantine?.name ?? 'Quarantine' }
      : { value: '—', hint: v.quarantine?.name ?? 'Quarantine' };

  return (
    <div className="pr-line" data-testid={`production-view-${line.id}`}>
      <div className={clsx('pr-head', v.status !== 'running' && 'is-held')}>
        <span className="pr-head__pair" aria-hidden>
          {v.mother && <CreaturePortrait creature={v.mother} size={40} ring={null} />}
          {v.father && <CreaturePortrait creature={v.father} size={40} ring={null} />}
        </span>
        <div className="pr-head__titles">
          <div className="pr-head__row">
            <h3 className="pr-head__name">{line.name}</h3>
            <StatusWord v={v} />
          </div>
          <p className="pr-head__sub">{subline}</p>
        </div>
        <Toggle checked={line.running} onChange={toggleRunning} label={`${line.name} running`} testId="production-toggle" />
        <Button size="sm" variant="ghost" className="pr-head__end" data-testid="production-end-line" onClick={() => setEnding(true)}>
          End line
        </Button>
      </div>

      {broken && (
        <div className="pr-note" role="status" data-testid="production-note">
          <TriangleAlert size={16} aria-hidden />
          <span>{lineNoticeText(g, line)}</span>
        </div>
      )}
      {!broken && line.waiting && (
        <div className="pr-note" role="status" data-testid="production-note">
          <TriangleAlert size={16} aria-hidden />
          <span>
            {raiseName} is full, so {v.mother?.name ?? 'the pair'} and {v.father?.name ?? 'its partner'} are kept apart until there’s room.{' '}
            <button type="button" className="pn-link" data-testid="production-note-fix" onClick={() => go(g.progress.unlocked.includes('operations_desk') ? { kind: 'panel', panel: 'operations', tab: 'overview', target: 'view:issues' } : { kind: 'panel', panel: 'operations', tab: 'lines' })}>
              Fix
            </button>
          </span>
          {addQt}
        </div>
      )}

      <div className="pn-grid pn-grid--tiles pr-tiles">
        <Tile label="Next clutch" icon={<Egg size={14} />} value={next.value} hint={next.hint} />
        <Tile label="Growing out" icon={<Sprout size={14} />} value={growing.value} hint={growing.hint} />
        <Tile label="Quarantine" icon={<ShieldCheck size={14} />} value={quarantine.value} hint={quarantine.hint} />
        <Tile
          label="This week"
          icon={<TrendingUp size={14} />}
          value={formatMoney(v.week.revenue)}
          hint={
            <>
              {v.week.sold} sold
              <span className="pr-net" data-testid="production-week-net">
                {formatMoney(v.week.net)} after food and power
              </span>
            </>
          }
        />
      </div>

      <div className="pr-stages">
        <Stage id="breed" n={1} icon={<Heart size={16} />} title="Breed" active={v.active === 'breed'} pill={<TankPill g={g} tankId={line.tanks.breed} />}>
          <p>
            {pairNames} · spawns about every {v.next.cycle} days
          </p>
          {v.next.dayOf !== undefined && (
            <>
              <Bar value={(100 * v.next.dayOf) / v.next.cycle} tone="aqua" thin label={`Day ${v.next.dayOf} of ${v.next.cycle}`} />
              <p className="pr-stage__foot">
                Day {v.next.dayOf} of {v.next.cycle}
              </p>
            </>
          )}
          {(fixPair || (broken?.moved && broken.ref !== 'rest')) && (
            <Button size="sm" data-testid="production-fix-pair" onClick={() => setFixing({ kind: 'pair' })}>
              Choose another pair
            </Button>
          )}
          {fixTank('breed') && <FixTank onClick={() => setFixing({ kind: 'tank', stage: 'breed' })} />}
        </Stage>
        <Stage id="raise" n={2} icon={<Sprout size={16} />} title="Raise" active={v.active === 'raise'} pill={<TankPill g={g} tankId={line.tanks.raise} />}>
          <p>
            {v.raising.count > 0
              ? `${v.raising.count} ${v.raising.word} · ${raiseFeeding(g, v)}`
              : 'Waiting for the next clutch'}
          </p>
          {v.raising.dayOf !== undefined && v.raising.ofDays && (
            <>
              <Bar value={(100 * v.raising.dayOf) / v.raising.ofDays} tone="aqua" thin label={`Day ${v.raising.dayOf} of ${v.raising.ofDays}`} />
              <p className="pr-stage__foot">
                Day {v.raising.dayOf} of {v.raising.ofDays}
              </p>
            </>
          )}
          {fixTank('raise') && <FixTank onClick={() => setFixing({ kind: 'tank', stage: 'raise' })} />}
        </Stage>
        <Stage id="sort" n={3} icon={<ListFilter size={16} />} title="Sort" active={v.active === 'sort'} pill={<TankPill g={g} tankId={line.tanks.raise} />} onOpen={() => setSorting(true)} label="Sort">
          <div className="pr-chips">
            {line.rules.keepPrismatic && <span className="pn-chip pn-chip--violet">Keep Prismatic</span>}
            {line.rules.keep.map((r, i) => (
              <span key={i} className="pn-chip pn-chip--aqua">
                Keep best {r.count} {r.traitIds.map((t) => traits.get(t) ?? t).join(' ')}
              </span>
            ))}
            <span className="pn-chip">Sell the rest</span>
          </div>
          {fixTank('keep') && <FixTank onClick={() => setFixing({ kind: 'tank', stage: 'keep' })} />}
        </Stage>
        <Stage id="quarantine" n={4} icon={<ShieldCheck size={16} />} title="Quarantine" active={v.active === 'quarantine'} pill={<TankPill g={g} tankId={v.quarantine?.id ?? line.tanks.quarantine[0]} />}>
          {v.quarantined.count > 0 ? (
            <>
              <p>
                {v.quarantined.count} {v.quarantined.word}
              </p>
              <Bar value={100 * (v.quarantined.holdFraction ?? 0)} tone="gold" thin label={daysLeft(v.quarantined.daysLeft)} />
              <p className="pr-stage__foot">{daysLeft(v.quarantined.daysLeft)}</p>
            </>
          ) : v.quarantined.unsold > 0 ? (
            <p>{v.quarantined.unsold} unsold · sell or move them</p>
          ) : (
            <p>Free</p>
          )}
          {!line.waiting && addQt}
          {fixTank('quarantine') && <FixTank onClick={() => setFixing({ kind: 'tank', stage: 'quarantine', replace: broken?.id })} />}
        </Stage>
        <Stage id="sell" n={5} icon={<Gavel size={16} />} title="Sell" active={v.active === 'sell'} pill={<TankPill g={g} name="Market" />}>
          {/* Audit 2026-11-17 (H1): the owner's "Sell by itself" — a buy-now price, a little lower each time it's listed again */}
          <p>Buy now at fair value −10% · a little cheaper each time it’s listed again</p>
          <p className="pr-stage__foot">{sellFoot(v)}</p>
        </Stage>
      </div>

      <RouteStrip g={g} line={line} v={v} />

      <section className="pr-rules" aria-label="Line rules">
        <h4 className="pr-section">Line rules</h4>
        <Rule title="Pause when a tank is full" sub={`Stops spawning when ${raiseName} reaches its stocking limit.`} checked={line.rules.pauseWhenFull} testId="production-rule-pauseWhenFull" lineName={line.name} onChange={(on) => act({ k: 'setLineRule', line: line.id, rule: 'pauseWhenFull', on }, { quiet: true })} />
        <Rule title="Never sell Prismatic animals" sub={`A Prismatic youngster always moves to ${keepName} instead.`} checked={line.rules.keepPrismatic} testId="production-rule-keepPrismatic" lineName={line.name} onChange={(on) => act({ k: 'setLineRule', line: line.id, rule: 'keepPrismatic', on }, { quiet: true })} />
        <Rule title="List automatically" sub={LIST_AUTOMATICALLY} checked={line.rules.autoList} testId="production-rule-autoList" lineName={line.name} onChange={(on) => act({ k: 'setLineRule', line: line.id, rule: 'autoList', on }, { quiet: true })} />
      </section>

      <Modal
        open={ending}
        onClose={() => setEnding(false)}
        title={`End the ${line.name}?`}
        testId="production-end-confirm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setEnding(false)}>
              Keep the line
            </Button>
            <Button
              variant="danger"
              data-testid="production-end-confirm-yes"
              onClick={() => {
                const name = line.name;
                setEnding(false);
                act(
                  { k: 'endLine', line: line.id },
                  {
                    quiet: true,
                    after: (r) => {
                      if (!r?.ok) return;
                      useUI.getState().toast(`${name} ended`, 'info', { detail: 'Its animals stay where they are.' });
                      onEnded?.(); // the address leaves the ended line (a reload would find nothing there)
                    },
                  },
                );
              }}
            >
              End line
            </Button>
          </>
        }
      >
        <p>Its animals stay in the tanks they're in, the line slot frees up, and its numbers stay in its history.</p>
      </Modal>
      {addingQt && <AddQuarantine g={g} line={line} onClose={() => setAddingQt(false)} />}
      {sorting && <SortSheet g={g} line={line} onClose={() => setSorting(false)} />}
      {fixing?.kind === 'pair' && <PairPicker g={g} line={line} onClose={() => setFixing(null)} />}
      {fixing?.kind === 'tank' && <TankPicker g={g} line={line} stage={fixing.stage} replace={fixing.replace} onClose={() => setFixing(null)} />}
    </div>
  );
}

/**
 * The route strip (DESIGN-S3D §7.4, §8.6, §12): the line's colour dot, then its tanks from breed tank to Market joined
 * by chevrons, each with a short tag in the design's words ("14 fry", "3 juveniles", "3 listed"; "Pair waits",
 * "Full · 12/12", "busy to Day 44"). A tank holding the line up has an amber border, a warning icon and its tag (§13:
 * never colour or an icon alone).
 */
export function RouteStrip({ g, line, v }: { g: GameState; line: ProductionLine; v: LineView }) {
  const b = line.broken;
  const gone = (ref: LineStage) => !!b && !b.moved && b.ref === ref;
  const keeperFemale = !!b?.moved && b.ref === 'mother' && !!line.pair.restTankId; // her place is her resting tank, not this one
  const qt = v.quarantine?.id ?? line.tanks.quarantine[0];
  const name = (id: string | undefined) => (id && (g.tanks[id]?.name ?? line.tankNames?.[id])) || '—';
  const held = v.status !== 'running';
  const raiseFull = !!line.waiting && v.raising.full;
  const chips: { key: string; name: string; tag?: string; warn: boolean }[] = [
    { key: 'breed', name: name(line.tanks.breed), tag: gone('breed') ? 'Paused' : held ? 'Pair waits' : undefined, warn: gone('breed') || (!!b?.moved && !keeperFemale) },
    {
      key: 'raise',
      name: name(line.tanks.raise),
      tag: gone('raise') ? 'Paused' : raiseFull && v.raising.places ? `Full · ${v.raising.places.used}/${v.raising.places.cap}` : v.raising.count > 0 ? `${v.raising.count} ${v.raising.word}` : undefined,
      warn: gone('raise') || raiseFull,
    },
    {
      key: 'quarantine',
      name: name(qt),
      tag: gone('quarantine')
        ? 'Paused'
        : v.quarantined.count > 0
          ? `${v.quarantined.count} ${v.quarantined.word}`
          : v.quarantined.busyTank
            ? `busy to Day ${v.quarantined.busyUntilDay}`
            : v.quarantined.uncycledTank
              ? 'isn’t cycled yet'
              : v.quarantined.unsold > 0
                ? `${v.quarantined.unsold} unsold`
                : undefined,
      warn: gone('quarantine') || !!v.quarantined.busyTank || !!v.quarantined.uncycledTank || !!v.quarantined.fullTank,
    },
    { key: 'market', name: 'Market', tag: v.selling.listed > 0 ? `${v.selling.listed} listed` : undefined, warn: false },
  ];
  return (
    <div className="pr-route" data-testid="production-route">
      <span className="pr-route__dot" style={{ background: `var(--c-${lineColour(g, line)})` }} aria-hidden />
      {chips.map((c, i) => (
        <span key={c.key} className="pr-route__step">
          {i > 0 && <ChevronRight size={13} aria-hidden className="pr-route__chev" />}
          <span className={clsx('pr-route__chip', c.warn && 'is-warn')}>
            {c.warn && <TriangleAlert size={12} aria-hidden />}
            {c.name}
            {c.tag && <span className="pr-route__tag">{c.tag}</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

function FixTank({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" data-testid="production-fix-tank" onClick={onClick}>
      Choose another tank
    </Button>
  );
}

function Rule({ title, sub, checked, onChange, testId, lineName }: { title: string; sub: string; checked: boolean; onChange: (on: boolean) => void; testId: string; lineName: string }) {
  return (
    <div className="pr-rule">
      <div className="pr-rule__text">
        <div className="pr-rule__title">{title}</div>
        <div className="pr-rule__sub">{sub}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={`${title} (${lineName})`} testId={testId} />
    </div>
  );
}

/**
 * Add a quarantine tank (ADR-0025 decision 5, ADR-0030 decision 3): the real kit, seeded media optional. Also opened by
 * Operations › Problems (lane:automation, chunk 5), which hears about the purchase through `onAdded`.
 */
export function AddQuarantine({ g, line, onClose, onAdded }: { g: GameState; line: ProductionLine; onClose: () => void; onAdded?: () => void }) {
  const [seeded, setSeeded] = useState(true);
  const kit = quarantineKit(g, line.id);
  if (!kit) return null;
  const tier = TANK_TIER_BY_ID[kit.tierId]?.name ?? kit.tierId;
  const total = seeded ? kit.seededPrice : kit.price;
  const short = line.name.replace(/ line$/, '');
  return (
    <Modal
      open
      onClose={onClose}
      title="Add a quarantine tank"
      testId="production-add-qt-dialog"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="production-add-qt-buy"
            onClick={() => {
              act(
                { k: 'addQuarantineTank', line: line.id, seeded },
                {
                  quiet: true,
                  after: (r) => {
                    if (!r?.ok) return;
                    onAdded?.();
                    onClose();
                    useUI.getState().toast(`${r.tankName} · ${r.tierName}`, 'success', {
                      label: `Set up · ${formatMoney(r.price ?? total)}`,
                      detail: r.restartDay ? `The ${short} juveniles move in on Day ${r.restartDay} and the line restarts.` : 'The juveniles move in once it has cycled.',
                    });
                  },
                },
              );
            }}
          >
            Set up · {formatMoney(total)}
          </Button>
        </>
      }
    >
      <p>
        A {tier} like {kit.like}, for the {line.name}.
      </p>
      <div className="pr-rule">
        <div className="pr-rule__text">
          <div className="pr-rule__title">Seeded filter media · +{formatMoney(kit.seededPrice - kit.price)}</div>
          <div className="pr-rule__sub">Ready for the juveniles at once. Without it the tank has to cycle first.</div>
        </div>
        <Toggle checked={seeded} onChange={setSeeded} label="Seeded filter media" testId="production-add-qt-seeded" />
      </div>
    </Modal>
  );
}
