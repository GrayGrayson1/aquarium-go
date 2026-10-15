// @vitest-environment node
/**
 * chunk 6 (DES-013; DESIGN-S3D SPEC §11 and §14; ADR-0035 decisions 3 and 4) — S3-D's copy, server-rendered from game
 * states the way the player reaches them:
 * - A: the design's words chunk 6 built, the 18 strings chunk 5 left out and the rewordings (ADR-0035 decision 3), each
 *   with its inventory row (A85 = Part A row 85 of the DES-013 inventory) and the SPEC line it comes from;
 * - B: the short strings chunk 5 shipped that no design words, approved as shipped (ADR-0035 decision 4);
 * - C: every SPEC §14 test id (as INTAKE §10.1 corrects it) appears in one of these renders or is read by an e2e spec,
 *   and docs/TEST_IDS.md lists it;
 * - D: no rendered S3-D text uses a straight apostrophe (the 0.5 copy rule).
 * The other S3-D strings keep their own tests: operations.spec.ts and the automation-* and production-ui unit tests.
 * Strings behind a click or a state a render can't reach (a selected map tile, New line's later steps) are checked in
 * their source, and say so.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { newGame } from '@/sim/newGame';
import { unlock } from '@/sim/facility';
import { installEquipment } from '@/sim/care';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { holdAll, installWaterRoom, saltCap, upgradePrep, waitForLine, waterRoom } from '@/sim/automation';
import { LivestockPanel } from '@/ui/panels/livestock/LivestockPanel';
import { addQuarantineTank } from '@/sim/production';
import { opsSnapshot, opsTier, tierLadder, type OpsSnapshot } from '@/ui/common/ops';
import { Overview } from '@/ui/panels/operations/Overview';
import { WaterTab } from '@/ui/panels/operations/WaterTab';
import { FeedTab } from '@/ui/panels/operations/FeedTab';
import { LinesTab } from '@/ui/panels/operations/LinesTab';
import { MapTab } from '@/ui/panels/operations/MapTab';
import { ProblemsView } from '@/ui/panels/operations/Problems';
import { ManualView } from '@/ui/panels/operations/Manual';
import { LockedPage } from '@/ui/panels/operations/Locked';
import { AutomationSection } from '@/ui/hud/AlertsAutomation';
import { AlertsPopover } from '@/ui/hud/AlertsPopover';
import { AutomationChips, TanksPanel } from '@/ui/panels/tanks/TanksPanel';
import { AutomationSection as TankAutomation } from '@/ui/cards/Automation';
import { OperationsPanel } from '@/ui/panels/operations/OperationsPanel';
import { MoreSheetBody } from '@/ui/hud/MoreSheet';
import { Dock } from '@/ui/hud/Dock';
import { TopBar } from '@/ui/hud/TopBar';
import { RoomViewChip } from '@/ui/hud/RoomChips';
import { NotificationsTab } from '@/ui/settings/NotificationsTab';
import { NewLine } from '@/ui/panels/livestock/ProductionSetup';
import { ProductionTab } from '@/ui/panels/livestock/Production';
import { StaffTab } from '@/ui/panels/visitors/StaffTab';
import { ResearchPanel } from '@/ui/panels/research/ResearchPanel';
import { RoomPage, Rooms, YourFacility } from '@/ui/panels/build/FacilityRooms';
import { CulturesSection, DryFoodSection, LiveFoodSection, SaltRow } from '@/ui/panels/market/SuppliesAutomation';
import { buySaltBag } from '@/ui/panels/operations/actions';
import { facility, run } from './support/automation';
import { lineFarm } from './support/production';

const ROOT = join(__dirname, '..', '..');
const nav = { tab: () => {}, view: () => {} };
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Put the game in the store (server rendering reads a store's initial state too). */
function use(g: GameState): void {
  useGame.setState({ game: g });
  Object.assign(useGame.getInitialState(), useGame.getState());
}

/** Set UI state for a server render (it reads the store's initial state too). */
function ui(patch: Partial<ReturnType<typeof useUI.getState>>): void {
  useUI.setState(patch);
  Object.assign(useUI.getInitialState(), patch);
}

const UI0 = { ...useUI.getInitialState() };
afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
  useUI.setState({ focusedTankId: UI0.focusedTankId, panel: UI0.panel, view: UI0.view });
  Object.assign(useUI.getInitialState(), { focusedTankId: UI0.focusedTankId, panel: UI0.panel, view: UI0.view });
});

/** Every render this file makes, for the id and apostrophe checks (C, D). */
const corpus: string[] = [];
function html(el: ReactElement): string {
  const out = renderToStaticMarkup(el);
  corpus.push(out);
  return out;
}
const render = (el: ReactElement) => text(html(el));

/** The Operations surfaces for this game (desktop, or phone with `small`). */
function ops(g: GameState, small = false, snapOverride?: Partial<OpsSnapshot>) {
  use(g);
  const snap = { ...opsSnapshot(g), ...snapOverride } as OpsSnapshot;
  const tier = opsTier(g);
  return {
    overview: () => render(createElement(Overview, { g, snap, tier, nav, small })),
    water: () => render(createElement(WaterTab, { g, snap, nav, small })),
    feed: () => render(createElement(FeedTab, { g, nav, small })),
    lines: () => render(createElement(LinesTab, { g, small })),
    map: (layer: 'all' | 'water' | 'food' | 'animals' = 'all') => render(createElement(MapTab, { g, snap, tier, layer, onLayer: () => {}, small, nav })),
    problems: () => render(createElement(ProblemsView, { g, snap, nav })),
    manual: () => render(createElement(ManualView, { g, snap, nav })),
    bell: () => render(createElement(AutomationSection, { game: g })),
  };
}

const desk = (g: GameState) => unlock(g, 'operations_desk', { silent: true });

/** Salt low between one and two batches (6 kg), with a $1 budget: no reorder comes (Day 4, 8:30 AM). */
function saltLow(kg = 6) {
  const f = facility({ fresh: 2, marine: 4, salt: kg, rosa: 1, hour: 24 * 3 + 8.5 });
  desk(f.g);
  return f;
}

/** A waiting line (its grow-out tank holds a free-swimming brood at the next stage in 6 h), with the Desk. */
function waitingLine(level: GameState['facility']['level'] = 'showroom') {
  const f = lineFarm(17);
  f.g.facility.level = level;
  desk(f.g);
  const line = f.g.production!.lines.find((l) => l.id === f.lineId)!;
  const m = f.g.creatures[line.pair.motherId];
  const d = f.g.creatures[line.pair.fatherId];
  for (const cl of Object.values(f.g.clutches)) cl.count = 0; // the fixture's brood in the breed tank
  createClutch(f.g, { sp: getSpecies('betta'), tank: f.tanks.raise, mother: m, father: d, hour: f.g.clock.hour - 24, stage: 'fry', count: 14, visual: 'fry_cloud', nextStageHour: f.g.clock.hour + 6 });
  return { ...f, line };
}

// ───────────────────────────── A: the design's words chunk 6 built (ADR-0035 decision 3) ─────────────────────────────

describe('DES-013 A: the design words chunk 6 built (ADR-0035 decision 3)', () => {
  it('Problems › salt, low between one and two batches (A85, A88, A89; SPEC §7.6, §11 "Low salt")', () => {
    const t = ops(saltLow().g).problems();
    expect(t).toContain('6 kg: enough for the 10:00 AM batch, then none. Rosa’s $1 budget won’t stretch to a sack today: food comes first.'); // A85
    expect(t).toContain('Day 4 10:00 AM: the batch uses 4.1 kg; the 1.9 kg left won’t make another.'); // A88
    expect(t).toMatch(/Day \d+ 8:00 AM: the salt tanks run short of salt water unless salt arrives\./); // A89 (the salt tanks' lights-on)
  });

  it('Problems › salt, one batch left: "uses the last {kg} kg" (A88)', () => {
    expect(ops(saltLow(4.1).g).problems()).toContain('10:00 AM The batch uses the last 4.1 kg.');
  });

  it('Problems › out of salt: the reason and the days the changes still go ahead (A91, A99; SPEC §7.6)', () => {
    const f = saltLow(4.1);
    run(f.g, 3); // the 10 AM batch takes the last salt
    const t = ops(f.g).problems();
    expect(t).toContain('Rosa couldn’t reorder salt mix — today’s $1 stock budget is spent. Salt mixing stops after the batch in the tank.'); // A91
    expect(t).toMatch(/Day 5( · \d+)* Morning water changes go ahead as normal\./); // A99 ("Day 39 · 40")
  });

  it('Water: the batch that drew from the fresh reserve, and "Order at {time}" (B6, B15; SPEC §7.2)', () => {
    const f = saltLow(4.1);
    run(f.g, 3);
    expect(ops(f.g).water()).toContain('The 10:00 AM batch drew 30 gal · full by'); // B6
    // salt isn't short, but the next shelf check buys some (the forecast, with the plan the stock manager would make)
    const g = facility({ fresh: 2, marine: 2, salt: 40, rosa: 600, hour: 24 * 3 + 8.5 }).g;
    use(g);
    const snap = opsSnapshot(g);
    expect(snap.problems.some((p) => p.kind === 'supply' && p.supply === 'salt')).toBe(false);
    const f2 = snap.forecast!;
    const forecast = { ...f2, plan: { ...f2.plan, buys: [...f2.plan.buys, { kind: 'salt' as const, kg: 40, price: 120, label: '40 kg salt mix' }] } };
    expect(ops(g, false, { forecast }).water()).toContain('Salt mix New Order at 9:00 AM'); // B15
  });

  it('Map: salt low "· Low · 1 batch", arriving "due {time}" (B86, B88; SPEC §7.5)', () => {
    expect(ops(saltLow().g).map()).toContain('Salt mix 6 kg · Low · 1 batch'); // B86
    const g = facility({ fresh: 2, marine: 4, salt: 6, rosa: 600, hour: 24 * 3 + 8.5 }).g;
    expect(ops(g).map()).toMatch(/Salt mix 6 kg · due (9:00 AM|Day \d+)/); // B88
  });

  it('Map: a waiting line\'s pair, its full grow-out tank and the quarantine tank it waits for (B91, B92, B93)', () => {
    const f = waitingLine();
    f.line.waiting = true;
    const t = ops(f.g).map();
    expect(t).toContain('Breed Tank Pair waits'); // B91
    expect(t).toMatch(/Grow-out Full · \d+\/\d+/); // B92
    expect(t).toContain(`Quarantine Next: ${f.line.name.replace(/ line$/, '')}`); // B93
  });

  it('Map, early: the rooms not built yet with their requirements, locked line slots, Auto-feed on, the phone Tier 2 row (B100, B102, B104, B105, B108)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    g.isShowcase = false;
    const tank = g.tanks[g.tankOrder[0]];
    installEquipment(g, tank.id, 'autofeeder', { purchased: true });
    g.inventory.foods = { ...g.inventory.foods, micro_pellets: 34 };
    const t = ops(g).map();
    expect(t).toMatch(/Water room Specialty Shop · \d+ of 100 reputation/); // B100: the tier's live requirements (ADR-0026 C8 rows)
    expect(t).toContain('Research Central Water Supply · $900 · 1 day');
    expect(t).toMatch(/· (\d+ · )?Autofeeder/); // B102: each Autofeeder food with its stock
    expect(t).toContain('Line slot 2 · Specialty Shop'); // B104
    expect(t).toMatch(/\d+ gal · Auto-feed on/); // B105
    const phone = ops(g, true).map();
    expect(phone).toContain('Layers for water, food and animals appear when the Water room opens.');
    expect(phone).toMatch(/Tier 2 Water room Next up Fresh and salt water reserves for every tank/); // B108
  });

  it('Map: "Open tank card" in a selected tank\'s details (B96; a click away, so its source)', () => {
    expect(readFileSync(join(ROOT, 'src/ui/panels/operations/MapTab.tsx'), 'utf8')).toMatch(/>\s*Open tank card\s*</);
  });

  it('the tier ladder: "{n} line now · {m} at a {Level}" (A80; SPEC §11 "Tier ladder")', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    g.isShowcase = false;
    expect(tierLadder(g).find((t) => t.tier === 4)!.reqs[0].text).toBe('1 line now · 2 at a Specialty Shop');
  });

  it('Lines: "· next stage in {h} h", early "Listed now {n} · best bid {$}", the phone\'s "Line on" (B53, B59, B65, B66)', () => {
    const f = waitingLine('hobby_room');
    const now = f.g.clock.hour;
    const young = Object.values(f.g.creatures).filter((c) => c.id !== f.line.pair.motherId && c.id !== f.line.pair.fatherId).slice(0, 1);
    f.g.market.listings.push({
      id: 'lst_copy', kind: 'creature', title: 'Betta', creatureIds: young.map((c) => c.id), reserve: 10, createdHour: now, endsHour: now + 72, status: 'active',
      bids: [{ id: 'bid_copy', buyerId: 'b1', amount: 31, message: '', createdHour: now, expiresHour: now + 24, status: 'open' }],
      interest: 0.5, snapshot: {} as never,
    });
    (f.line.batches ??= []).push({ id: 'b_copy', creatureIds: young.map((c) => c.id), sortedHour: now - 200, listingIds: ['lst_copy'] } as never);
    const t = ops(f.g).lines();
    expect(t).toMatch(/14 [a-z -]+ in Grow-out · day \d+ of \d+ · next stage in 6 h/); // B53, B65
    expect(t).toMatch(/Listed now \d+ · best bid \$31/); // B66
    expect(ops(f.g, true).lines()).toContain('Line on'); // B59
  });

  it('Problems › the line card: "{m} × {f} are ready to spawn", "{u} of {c} places · sorting on Day {d}"; decided (A108, A110, A114)', () => {
    const f = waitingLine();
    f.line.waiting = true;
    const m = f.g.creatures[f.line.pair.motherId].name;
    const d = f.g.creatures[f.line.pair.fatherId].name;
    const t = ops(f.g).problems();
    expect(t).toContain(`${m} × ${d} are ready to spawn`); // A108
    expect(t).toMatch(/\d+ of \d+ places · sorting on Day \d+/); // A110
    expect(waitForLine(f.g, f.lineId).ok).toBe(true);
    expect(ops(f.g).problems()).toContain(`${f.line.name} · you chose to wait Resumes Day`); // A114
    const g2 = waitingLine();
    g2.line.waiting = true;
    g2.g.clock.hour += 1; // bought during the pause, after the line was made
    const r = addQuarantineTank(g2.g, g2.lineId, false);
    expect(r.ok, r.message).toBe(true);
    expect(waitForLine(g2.g, g2.lineId).ok).toBe(true);
    if (g2.line.waiting) expect(ops(g2.g).problems()).toContain(`${g2.line.name} · ${r.tankName} added`); // A114
  });

  it('the 40 kg sack\'s toast: "The salt mixer can start its next batch." (A154; SPEC §11 "Toasts")', () => {
    const g = saltLow().g;
    use(g);
    expect(buySaltBag(40)).toBe(true);
    const last = useUI.getState().toasts.at(-1)!;
    expect(last).toMatchObject({ text: '40 kg of marine salt mix', detail: 'The salt mixer can start its next batch.' });
    expect(last.label).toBe('Bought · $120');
    expect(buySaltBag(5)).toBe(true);
    expect(useUI.getState().toasts.at(-1)!.detail).toMatch(/^[\d.]+ kg in stock · enough for \d+ batch(es)?\.$/);
  });

  it('Feed: each doser tank\'s young and its servings of each food (B40; SPEC §7.3)', () => {
    const f = facility({ fresh: 1, marine: 0, food: true, rosa: null, hour: 24 * 3 + 8.5 });
    const t = f.fresh[0];
    installEquipment(f.g, t.id, 'live_food_doser', { purchased: true });
    const sp = getSpecies('betta');
    const cl = createClutch(f.g, { sp, tank: t, mother: null as never, father: null as never, hour: f.g.clock.hour - 120, stage: 'fry', count: 26, visual: 'fry_cloud', nextStageHour: f.g.clock.hour + 200 });
    cl.stageSinceHour = f.g.clock.hour - 120;
    expect(ops(f.g).feed()).toMatch(/Fresh 1 betta [a-z -]+ · \d+ (brine|infusoria)/);
  });

  it('Build › Live food room: Each day "makes, uses, takes" (B124; SPEC §8.4)', () => {
    const g = facility({ fresh: 1, marine: 1, food: true, rosa: null }).g;
    use(g);
    expect(render(createElement(RoomPage, { g, room: 'food', onBack: () => {} }))).toMatch(/Each day Makes \d+ baby brine and \d+ infusoria · uses \d+ baby brine and \d+ infusoria · takes \d+ scoops? of eggs/);
  });

  it('the bell: manual mode in one line, the Desk\'s main action for a held-up line, "All {n} tanks look healthy." (C37, C39, C42)', () => {
    const held = saltLow().g;
    holdAll(held);
    expect(ops(held).bell()).toMatch(/Manual mode since \d+:\d\d [AP]M · 5 of 5 systems held Open/); // C37
    const f = waitingLine();
    f.line.waiting = true;
    expect(ops(f.g).bell()).toMatch(/Add a quarantine tank · \$\d+/); // C39 (phone: "Add QT tank · $95", useIsMobile)
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    use(g);
    expect(render(createElement(AlertsPopover))).toMatch(/All tanks look healthy\./); // one tank keeps the 0.5 words
    expect(readFileSync(join(ROOT, 'src/ui/hud/AlertsPopover.tsx'), 'utf8')).toContain('`All ${game.tankOrder.length} tanks look healthy.`'); // C42
  });

  it('Tanks: the tank in view keeps its Tank card button (C19; SPEC §8.1)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    use(g);
    ui({ focusedTankId: g.tankOrder[0] });
    expect(render(createElement(TanksPanel))).toContain('In view Tank card Manage');
  });

  it('Production: the doser\'s first foods, and the held-up note\'s Fix (C59, C62; SPEC §8.6)', () => {
    const f = waitingLine();
    installEquipment(f.g, f.tanks.raise.id, 'live_food_doser', { purchased: true });
    use(f.g);
    const t = render(createElement(ProductionTab, { g: f.g, sel: f.lineId, onSelect: () => {} }));
    expect(t).toMatch(/14 [a-z -]+ · baby brine and infusoria from the doser/); // C62
    f.line.waiting = true;
    expect(render(createElement(ProductionTab, { g: f.g, sel: f.lineId, onSelect: () => {} }))).toMatch(/are kept apart until there’s room\. Fix/); // C59
  });

  it('Staff: the stock manager\'s line and On shift (C91; SPEC §8.7)', () => {
    const g = facility({ fresh: 1, marine: 1, rosa: 150 }).g;
    use(g);
    const t = render(createElement(StaffTab, { g }));
    expect(t).toContain('Stock manager · skill 3 · checks the shelves at 9 AM and 3 PM');
    expect(t).toContain('On shift');
  });

  it('Research: "New" on each Facility project (C109; SPEC §8.8)', () => {
    const g = facility({ fresh: 1, marine: 1, rosa: null }).g;
    use(g);
    const t = render(createElement(ResearchPanel));
    for (const name of ['Central Water Supply', 'Live Food Cultures', 'Operations Desk']) expect(t).toContain(`${name} New`);
  });

  it('New line: "Breed" · "Raise" · "Quarantine" · "Keepers", capitals by style (C79; step 2 is a click away, so its source)', () => {
    const src = readFileSync(join(ROOT, 'src/ui/panels/livestock/ProductionSetup.tsx'), 'utf8');
    for (const w of ['Breed', 'Raise', 'Quarantine', 'Keepers']) expect(src).toContain(`word: '${w}'`);
    expect(src).not.toMatch(/'(BREED|RAISE|QUARANTINE|KEEPERS)'/);
    expect(readFileSync(join(ROOT, 'src/ui/panels/livestock/production.css'), 'utf8')).toMatch(/\.pr-tankrow__label \{[^}]*text-transform: uppercase/);
  });
});

// ───────────────────────────── B: approved as shipped (ADR-0035 decision 4) ─────────────────────────────

describe('DES-013 B: the strings chunk 5 shipped that the owner approved as shipped (ADR-0035 decision 4)', () => {
  it('Overview, Water and Problems', () => {
    const off = facility({ fresh: 2, marine: 2, salt: 40, rosa: 150, hour: 24 * 3 + 8.5 }).g;
    desk(off);
    off.staff!.ordersOff = true;
    const o = ops(off);
    expect(o.overview()).toContain('Orders switched off');
    const w = o.water();
    expect(w).toContain('Full · the prep station makes 6 gal an hour');
    expect(w).toMatch(/Next batch 10:00 AM: \d+ gal, ready 12 hours later/);
    const low = saltLow();
    expect(ops(low.g).problems()).toContain('Salt mix · 6 kg in stock');
    const two = facility({ fresh: 0, marine: 16, salt: 8.5, rosa: 1, hour: 24 * 3 + 8.5 });
    desk(two.g);
    expect(ops(two.g).problems()).toMatch(/10:00 AM The batch uses 4\.1 kg\./); // two batches, but under two days' use
    run(low.g, 3);
    expect(ops(low.g).water()).toMatch(/\d+ gal mixing · ready 10:00 PM/);
    const offLow = saltLow();
    offLow.g.staff!.ordersOff = true;
    expect(ops(offLow.g).problems()).toContain('Rosa’s orders');
    holdAll(off);
    expect(ops(off).water()).toMatch(/Manual mode: .+ on hold\. Open/);
  });

  it('Feed, Lines and the Map key', () => {
    const f = facility({ fresh: 1, marine: 1, food: true, eggs: 0, veg: 0, rosa: null, hour: 24 * 3 + 8.5 });
    desk(f.g);
    const feed = ops(f.g).feed();
    expect(feed).toContain('Empty · needs vegetables');
    const phone = ops(f.g, true).feed();
    expect(phone).toContain('Eggs and vegetables for the cultures are in Market › Supplies.');
    const lf = lineFarm(17);
    installWaterRoom(lf.g);
    const lines = ops(lf.g).lines();
    expect(lines).toMatch(/Nothing dated yet\.|Day \d+/);
    expect(ops(f.g).map('all')).toContain('Fresh water Salt water (striped) Live food (dashed) Labels: gallons of water changes a day');
    expect(ops(lf.g).map('animals')).toContain('Each tank names its lines; “waits” where a line is held up.');
    expect(ops(lf.g).map()).toMatch(/\d+ sold \$[\d,]+ this week/);
    expect(html(createElement(MapTab, { g: lf.g, snap: opsSnapshot(lf.g), tier: opsTier(lf.g), layer: 'all', onLayer: () => {}, small: true, nav }))).toContain('aria-label="Breeding: see what’s in it"');
  });

  it('Build: "The top level" and "Stock budget up to {$}"', () => {
    const g = facility({ fresh: 1, marine: 1, rosa: 150 }).g;
    use(g);
    const t = render(createElement(YourFacility, { g }));
    expect(t).toMatch(/Stock budget up to \$[\d,]+/);
    g.facility.level = 'grand_hall';
    expect(render(createElement(YourFacility, { g }))).toContain('The top level');
  });
});

// ───────────────────────────── C: SPEC §14 test ids ─────────────────────────────

/** SPEC §14 as INTAKE §10.1 corrects it (C-53: one `ops-early-locked-tools`, `staff-budget-status`, `research-start-<id>`). */
const IDS = [
  'dock-operations', 'dock-badge-operations', 'hud-settings', 'more-operations', 'more-badge-operations', 'hud-manual-mode', 'room-facility-map',
  'camera-room-reset', 'panel-operations', 'ops-tab-<overview|water|feed|lines|map>', 'ops-hold-all', 'ops-sub', 'ops-problems', 'ops-problem-<salt|line>',
  'ops-problems-all', 'ops-all-clear', 'ops-sys-<water-changes|water-room|live-food|feeding|lines|keepers|manual>', 'ops-week', 'ops-today',
  'ops-early-locked-<water|food|lines|tools>', 'ops-ladder', 'ops-locked-<water|feed|issues|manual>', 'ops-issues-back', 'issues-salt', 'issues-line',
  'issues-buy-salt', 'issues-raise-budget', 'issues-add-qt', 'issues-wait', 'issues-none', 'manual-banner', 'manual-resume-all', 'manual-hold-all',
  'manual-row-<water|salt|food|feeders|lines>', 'manual-toggle-<water|salt|food|feeders|lines>', 'manual-rosa', 'manual-rosa-toggle', 'manual-still-open',
  'water-meter-fresh', 'water-meter-salt', 'water-meter-saltmix', 'water-buy-salt', 'water-flows', 'water-schedule', 'water-machines', 'feed-hatchery',
  'feed-jars', 'feed-dosers', 'feed-buy-eggs', 'feed-buy-veg', 'feed-cone-1', 'feed-jar-1', 'lines-capacity', 'lines-upcoming',
  'map-layer-<all|water|food|animals>', 'map-room-<water|supplies|food|breeding|quarantine|gallery|market>', 'map-details', 'map-room-sheet', 'map-add-qt',
  'map-more', 'build-facility-room-<water|food>', 'build-room-back', 'build-your-facility', 'build-room-<water|food>', 'build-room-locked-<water|food>',
  'build-upgrade-prep', 'build-add-reservoir', 'supplies-salt-buy-<5|20|40>', 'supplies-salt-status', 'supplies-buy-eggs',
  'tank-chip-<auto-feed|auto-clean|top-off|doser|line>', 'tank-auto-feed-held', 'tank-auto-clean-held', 'tank-doser-row', 'tank-doser-buy', 'tank-doser-held',
  'alerts-automation', 'alerts-automation-link', 'alerts-automation-manual', 'alerts-item-<salt|eggs|veg|live|fresh|salt_rate|fresh_rate|line>',
  'alerts-item-tab-<water|feed|lines>', 'production-slots', 'production-add-line', 'production-new-step-<1|2|3>',
  'production-new-tank-<breed|raise|quarantine|keepers>', 'production-new-breed-for', 'production-new-name', 'production-new-back', 'production-new-next',
  'production-start-line', 'production-ops-link', 'livestock-production-dot', 'staff-budget-status', 'staff-orders', 'research-start-<id>', 'notify-cat-auto',
];

/** `a-<x|y>` → [a-x, a-y]; `a-<id>` stays a prefix ('a-'). */
const expand = (p: string): string[] => {
  const m = /^(.*)<([^>]+)>(.*)$/.exec(p);
  if (!m) return [p];
  return m[2].includes('|') ? m[2].split('|').map((v) => `${m[1]}${v}${m[3]}`) : [m[1]];
};

function e2eSources(): string {
  const dir = join(ROOT, 'tests', 'e2e');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
}

/** Every surface with S3-D ids or copy, in the states that show them (desktop and phone). */
function renderEverything(): string[] {
  const out: string[] = [];
  const put = (el: ReactElement) => out.push(renderToStaticMarkup(el));
  const all = (g: GameState, small = false) => {
    use(g);
    const snap = opsSnapshot(g);
    const tier = opsTier(g);
    put(createElement(Overview, { g, snap, tier, nav, small }));
    if (tier.water) put(createElement(WaterTab, { g, snap, nav, small }));
    if (tier.food) put(createElement(FeedTab, { g, nav, small }));
    put(createElement(LinesTab, { g, small }));
    for (const layer of ['all', 'water', 'food', 'animals'] as const) put(createElement(MapTab, { g, snap, tier, layer, onLayer: () => {}, small, nav }));
    put(createElement(ProblemsView, { g, snap, nav }));
    put(createElement(ManualView, { g, snap, nav }));
    put(createElement(AutomationSection, { game: g }));
    for (const which of ['water', 'feed', 'issues', 'manual'] as const) put(createElement(LockedPage, { g, which, nav }));
    ui({ panel: 'operations' });
    put(createElement(OperationsPanel));
    ui({ panel: null });
    put(createElement(Rooms, { g, onOpen: () => {} }));
    put(createElement(YourFacility, { g }));
    for (const room of ['water', 'food'] as const) put(createElement(RoomPage, { g, room, onBack: () => {} }));
    for (const C of [SaltRow, LiveFoodSection, CulturesSection, DryFoodSection]) put(createElement(C, { g, flash: null }));
    put(createElement(StaffTab, { g }));
    put(createElement(TanksPanel));
    for (const id of g.tankOrder) {
      const t = g.tanks[id];
      put(createElement(AutomationChips, { g, tank: t }));
      put(createElement(TankAutomation, { g, tank: t, fits: new Map() }));
    }
    put(createElement(ProductionTab, { g, sel: g.production?.lines[0]?.id ?? null, onSelect: () => {} }));
    ui({ panel: 'livestock' });
    put(createElement(LivestockPanel));
    ui({ panel: null });
    put(createElement(NewLine, { g, onStarted: () => {} }));
    put(createElement(ResearchPanel));
    put(createElement(Dock));
    put(createElement(TopBar, {}));
    put(createElement(MoreSheetBody, { isLocked: () => false, dots: { operations: { level: 'watch' } } as never }));
    ui({ view: 'facility' });
    put(createElement(RoomViewChip));
    ui({ view: 'tank' });
  };
  // early (no rooms), before the Desk, a low and an out-of-salt day, eggs and vegetables short, a paused line,
  // manual mode, and a facility with nothing wrong
  const early = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
  early.isShowcase = false;
  all(early);
  all(early, true);
  const before = facility({ fresh: 1, marine: 1, food: true, eggs: 0, veg: 0, rosa: 150, salt: 4.1, hour: 24 * 3 + 8.5 }).g;
  const t0 = before.tanks[before.tankOrder[0]];
  installEquipment(before, t0.id, 'live_food_doser', { purchased: true });
  installEquipment(before, t0.id, 'ato', { purchased: true });
  installEquipment(before, before.tankOrder[1], 'autofeeder', { purchased: true });
  // young the doser has nothing for (no live food, empty cultures): the live-food item
  const cl = createClutch(before, { sp: getSpecies('betta'), tank: t0, mother: null, father: null, hour: before.clock.hour - 120, stage: 'fry', count: 20, visual: 'fry_cloud', nextStageHour: before.clock.hour + 200 });
  cl.stageSinceHour = before.clock.hour - 120;
  all(before);
  desk(before);
  all(before);
  all(before, true);
  holdAll(before);
  all(before);
  all(before, true);
  const saltOut = saltLow(4.1);
  run(saltOut.g, 3);
  all(saltOut.g);
  const line = waitingLine();
  installWaterRoom(line.g);
  line.line.waiting = true;
  all(line.g);
  all(line.g, true);
  const calm = facility({ fresh: 2, marine: 2, salt: 40, rosa: 150, hour: 24 * 3 + 8.5 }).g;
  desk(calm);
  all(calm);
  // a held-up line before the Desk (the bell's tab link), and its Livestock dot
  const noDesk = waitingLine();
  noDesk.line.waiting = true;
  noDesk.g.progress.unlocked = noDesk.g.progress.unlocked.filter((k) => k !== 'operations_desk');
  all(noDesk.g);
  // the fresh reserve empty; a gallery bigger than the map shows (+{n} more)
  const big = facility({ fresh: 10, marine: 0, rosa: null, hour: 24 * 3 + 8.5 }).g;
  waterRoom(big)!.fresh = 0;
  desk(big);
  all(big);
  // the rate warnings (ADR-0033): big salt tanks with the salt reserve full; big fresh tanks with a faster prep station
  const salty = facility({ fresh: 0, marine: 2, salt: 200, rosa: null });
  for (const t of salty.marine) t.tierId = 'g180';
  waterRoom(salty.g)!.salt = saltCap(waterRoom(salty.g)!);
  all(salty.g);
  const thirsty = facility({ fresh: 9, marine: 0, rosa: null });
  for (const t of thirsty.fresh) t.tierId = 'g180';
  upgradePrep(thirsty.g);
  all(thirsty.g);
  use(calm);
  put(createElement(NotificationsTab));
  return out;
}

/** The ids only the live shell shows (PanelHost, a portal, a click away): e2e reads each one. */
const E2E_ONLY = ['panel-operations', 'map-room-sheet', 'map-details', 'manual-toggle-water', 'production-new-step-2', 'production-new-step-3'];

describe('DES-013 C: every SPEC §14 id', () => {
  let rendered = '';
  let e2e = '';
  beforeAll(() => {
    rendered = renderEverything().join('\n');
    e2e = e2eSources();
  });

  it('appears in one of these renders, or an e2e spec reads it', () => {
    const missing: string[] = [];
    for (const pattern of IDS)
      for (const id of expand(pattern)) {
        const inRender = id.endsWith('-') ? rendered.includes(`data-testid="${id}`) : rendered.includes(`data-testid="${id}"`);
        const templ = `${id.slice(0, id.lastIndexOf('-'))}-\${`; // read through a template, e.g. `production-new-tank-${s}`
        const inE2e = e2e.includes(id.endsWith('-') ? id : `'${id}'`) || e2e.includes(`"${id}"`) || e2e.includes(`\`${id}\``) || (!id.endsWith('-') && e2e.includes(templ));
        if (!inRender && !inE2e) missing.push(id);
      }
    expect(missing).toEqual([]);
  });

  it('the ids left to e2e are read there', () => {
    for (const id of E2E_ONLY) expect(e2e, id).toContain(id);
  });

  it('docs/TEST_IDS.md lists each one (or its pattern)', () => {
    const doc = readFileSync(join(ROOT, 'docs', 'TEST_IDS.md'), 'utf8');
    const undocumented = IDS.filter((p) => {
      const lt = p.indexOf('<');
      if (lt < 0) return !doc.includes(`\`${p}\``) && !doc.includes(`${p.slice(0, p.lastIndexOf('-'))}-<`);
      return !doc.includes(p.slice(0, lt) + '<') && !expand(p).every((id) => doc.includes(id));
    });
    expect(undocumented).toEqual([]);
  });

  it('no rendered S3-D text uses a straight apostrophe between letters (the 0.5 copy rule)', () => {
    const straight = [...corpus, rendered].map(text).flatMap((t) => t.match(/[A-Za-z]'[A-Za-z]/g) ?? []);
    expect([...new Set(straight)]).toEqual([]);
  });
});
