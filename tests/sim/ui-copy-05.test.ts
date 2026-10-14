/**
 * lane:ui-shell (chunk 1; DES-003, DES-004; 0.5 spec §16; ADR-0019) — the 0.5 navigation, links-and-boot and
 * locked-panel strings render exactly as the copy deck and the owner's answers write them (curly apostrophes, the
 * ellipsis character, the › separator). Components are server-rendered, as in ui-prismatic. Chunk 3 adds the
 * Automation (DES-007) and Notifications (DES-009; ADR-0022 decision 4) strings; curly apostrophes throughout (§16).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useGame } from '@/state/game';
import { newGame } from '@/sim/newGame';
import { TabBar } from '@/ui/hud/TabBar';
import { MoreSheetBody } from '@/ui/hud/MoreSheet';
import { BootCardView, bootLine, awayText } from '@/ui/nav/BootCard';
import { BROKEN_LINK, NOT_FOUND } from '@/ui/nav/router';
import { routeLabel, parseRoute } from '@/ui/nav/routes';
import { moreGuideCopy } from '@/ui/tutorial/TutorialCoach';
import { CopyLinkButton } from '@/ui/panels/market/OfferLink';
import { VisitorsPanel } from '@/ui/panels/visitors/VisitorsPanel';
import { ShowsPanel } from '@/ui/panels/shows/ShowsPanel';
import { tooNewMessage } from '@/persistence/migrations';
import type { GameState, Tank } from '@/types';
import type { NotifyPermission } from '@/platform';
import { useUI } from '@/state/ui';
import { installEquipment, setEquipment } from '@/sim/care';
import { advanceWorld } from '@/sim/world';
import { addStaffDirect } from '@/sim/staff';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { AutomationSection, AutoCleanNote, buyAutoClean } from '@/ui/cards/Automation';
import { EquipRow } from '@/ui/panels/market/Supplies';
import { autofeedPausedText } from '@/ui/common/notify';
import { AlertsPopover } from '@/ui/hud/AlertsPopover';
import { NotificationsTab } from '@/ui/settings/NotificationsTab';
import { useNotifyPermission } from '@/ui/notify/deliver';
import { useNotifyPrefs } from '@/ui/notify/prefs';

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);
/** The visible text of rendered markup (tags dropped, entities a test could meet decoded). */
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

describe('§16 Navigation', () => {
  it('the tab bar reads Tanks · Livestock · Market · Build · More', () => {
    const out = html(createElement(TabBar));
    expect(out).toContain('data-testid="nav-tabbar"');
    expect([...out.matchAll(/class="ag-tabbar__label">([^<]+)</g)].map((m) => m[1])).toEqual(['Tanks', 'Livestock', 'Market', 'Build', 'More']);
  });

  describe('the More sheet', () => {
    it('is titled More, with the five tiles and the Settings row', () => {
      const out = html(createElement(MoreSheetBody, { isLocked: () => false, dots: {} }));
      expect(out).toMatch(/<h2[^>]*>More<\/h2>/);
      expect([...out.matchAll(/class="ag-more__label">([^<]+)</g)].map((m) => m[1])).toEqual(['Visitors', 'Shows', 'Research', 'Finances', 'Encyclopedia']);
      expect(out).toContain('<span class="ag-more__rowtitle">Settings</span>');
      expect(out).toContain('<span class="ag-more__rowsub">Saves, sound, notifications</span>');
    });
  });

  it('the guide on phones: “Guide · Research” / “Research now lives under More. Tap More, then Research.”', () => {
    expect(moreGuideCopy('Research')).toEqual({ label: 'Guide · Research', text: 'Research now lives under More. Tap More, then Research.' });
  });
});

describe('§16 Links and boot', () => {
  it('the broken-link toast', () => {
    expect(BROKEN_LINK).toEqual({ title: 'That link doesn’t go anywhere', detail: 'Opened your aquarium instead.' });
  });

  it('the loading card: “Loading your save · catching up {duration}…”, or just “Loading your save…”', () => {
    expect(bootLine(3 * 3_600_000 + 12 * 60_000)).toBe('Loading your save · catching up 3 h 12 min…');
    expect(bootLine(40 * 60_000)).toBe('Loading your save · catching up 40 min…');
    expect(bootLine(5 * 3_600_000)).toBe('Loading your save · catching up 5 h…');
    expect(bootLine(3 * 86_400_000)).toBe('Loading your save · catching up 3 days…');
    expect(bootLine(30_000)).toBe('Loading your save…');
    expect(bootLine(null)).toBe('Loading your save…');
    expect(awayText(59_999)).toBeNull();
  });

  it('the card renders its line and “Then: {destination}” with the › separator', () => {
    const card = (boot: Parameters<typeof BootCardView>[0]['boot']) => html(createElement(BootCardView, { boot }));
    const out = text(card({ dest: routeLabel(parseRoute('#/livestock/eggs')!.route), awayMs: 3 * 3_600_000 + 12 * 60_000 }));
    expect(out).toContain('Loading your save · catching up 3 h 12 min…');
    expect(out).toContain('Then: Livestock › Eggs & fry');
    expect(card({ dest: null, awayMs: 1000 })).toContain('data-testid="boot-deeplink"');
    expect(card({ dest: null, awayMs: 1000 })).not.toContain('boot-deeplink-dest');
    expect(card(null)).toBe('');
  });

  it('Copy link / Copy link to this offer / Link copied', () => {
    const link = (state: 'idle' | 'copied') => ({ state, url: null, copy: async () => undefined });
    expect(text(html(createElement(CopyLinkButton, { link: link('idle'), phone: false })))).toBe('Copy link');
    expect(text(html(createElement(CopyLinkButton, { link: link('copied'), phone: false })))).toBe('Link copied Link copied'); // the button, and its announcement
    expect(html(createElement(CopyLinkButton, { link: link('idle'), phone: true }))).toContain('aria-label="Copy link to this offer"');
  });
});

describe('§16 Locked panels (§5.7)', () => {
  beforeAll(() => useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Copy', seed: 9 })));
  afterAll(() => useGame.getState().setGame(null));

  it('Visitors before the Specialty Shop', () => {
    const out = text(html(createElement(VisitorsPanel)));
    expect(out).toContain('Visitors open with a Specialty Shop');
    expect(out).toContain('Upgrade to a specialty shop to welcome paying visitors. Links to this page keep working — they show this until it unlocks.');
    expect(out).toContain('Open Build › Facility');
  });

  it('Shows before the guide is done', () => {
    const out = text(html(createElement(ShowsPanel)));
    expect(out).toContain('Shows unlock after the guide');
    expect(out).toContain('Finish the guide or reach 20 reputation to enter club shows.');
  });
});

describe('ADR-0019 decision 4: links to things that no longer exist, and a newer save', () => {
  it('reads as the owner approved', () => {
    expect(NOT_FOUND.tank).toMatchObject({ title: 'That tank isn’t in your aquarium', detail: 'Showing your tanks instead.' });
    expect(NOT_FOUND.creature).toMatchObject({ title: 'That animal isn’t in your aquarium', detail: 'Showing your livestock instead.' });
    expect(NOT_FOUND.listing).toMatchObject({ title: 'That listing isn’t here any more', detail: 'Showing your listings instead.' });
    expect(NOT_FOUND.species).toMatchObject({ title: 'There’s no page for that species', detail: 'Showing every species instead.' });
    expect(NOT_FOUND.line).toMatchObject({ title: 'This line isn’t here any more', detail: 'See your lines' }); // ADR-0026 decision 9
    expect(tooNewMessage(2)).toMatch(/newer version of Aquarium Go .* Refresh the page to get the latest version\.$/);
  });
});

// ───────────────────────────── chunk 3: Automation (DES-007) and Notifications (DES-009) ─────────────────────────────

function automationWorld(o: { feeder?: boolean; changer?: boolean; feederOn?: boolean; keeper?: boolean } = {}): { g: GameState; tank: Tank } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
  g.isShowcase = false;
  g.finance.money = 1000;
  g.progress.unlocked.push('gear_autofeeder');
  g.inventory.foods = { flake_tropical: 40 };
  const tank = g.tanks[g.tankOrder[0]];
  tank.name = 'Ember’s Tank';
  tank.equipment = tank.equipment.filter((e) => !['autofeeder', 'water_changer'].includes(getEquipmentDef(e.defId)?.kind ?? ''));
  for (const c of Object.values(g.creatures)) if (c.tankId === tank.id) c.name = 'Ember';
  if (o.feeder) installEquipment(g, tank.id, 'autofeeder', { purchased: true });
  if (o.feeder && o.feederOn === false) setEquipment(g, tank.id, tank.equipment.find((e) => e.defId === 'autofeeder')!.id, { on: false });
  if (o.changer) installEquipment(g, tank.id, 'auto_water_changer', { purchased: true });
  if (o.keeper) addStaffDirect(g, { name: 'Ana Test', role: 'aquarist', skill: 2, trait: 'meticulous', tankIds: [tank.id] });
  return { g, tank };
}
const automation = (o: Parameters<typeof automationWorld>[0] = {}) => {
  const { g, tank } = automationWorld(o);
  return text(html(createElement(AutomationSection, { g, tank, fits: new Map() })));
};

describe('§16 Automation (DES-007)', () => {
  afterAll(() => {
    useGame.getState().setGame(null);
    useUI.setState({ toasts: [] });
  });

  it('the section and both rows without their devices', () => {
    const out = automation();
    expect(out).toMatch(/^Automation /);
    expect(out).toContain('Auto-feed Drops a measured portion of dry food on a schedule. Needs an Autofeeder Buy · $35');
    expect(out).toContain('Auto-clean Small daily water changes and a weekly glass scrape. Needs an Auto Water Changer Buy · $120');
  });

  it('Auto-feed on, and paused (with and without a keeper; the em dash kept)', () => {
    expect(automation({ feeder: true })).toMatch(/Auto-feed Runs your Autofeeder · Tropical Flakes · 40 servings left · about \d+ days? Meals a day/);
    expect(automation({ feeder: true, feederOn: false })).toContain('Runs your Autofeeder · Tropical Flakes · 40 servings left · paused Paused — feed Ember by hand.');
    expect(automation({ feeder: true, feederOn: false, keeper: true })).toContain('Paused — feed Ember by hand, or a keeper will on their rounds.');
  });

  it('Auto-clean installed, and the Water tab callout', () => {
    expect(automation({ changer: true })).toContain('Auto-clean Runs your Auto Water Changer · 10% each morning · glass once a week · $0.06/day');
    const { tank } = automationWorld({ changer: true });
    expect(text(html(createElement(AutoCleanNote, { tank })))).toBe('Auto-clean is on The Auto Water Changer swaps 10% each morning and scrapes the glass once a week. You can still do it by hand.');
  });

  it('the Installed and Not enough money toasts', () => {
    const poor = automationWorld();
    poor.g.finance.money = 50;
    useGame.getState().setGame(poor.g);
    buyAutoClean(poor.tank.id);
    expect(useUI.getState().toasts.at(-1)).toMatchObject({ label: 'Not enough money', text: 'The Auto Water Changer costs $120.' });
    const rich = automationWorld();
    useGame.getState().setGame(rich.g);
    buyAutoClean(rich.tank.id);
    expect(useUI.getState().toasts.at(-1)).toMatchObject({ label: 'Installed', text: 'Auto Water Changer on Ember’s Tank', detail: 'Auto-clean is on. Switch it off any time on the tank card.' });
  });

  it('the out-of-salt notice, the alert row, the equipment description and the Build/Supplies line', () => {
    const { g, tank } = automationWorld({ changer: true });
    tank.waterClass = 'marine_fowlr';
    tank.environment = 'marine';
    g.inventory.salt = 0;
    g.clock.hour = 24 * 3 + 7;
    tank.lighting.onHour = 8;
    advanceWorld(g, 2, { forceFull: true });
    expect(g.log.map((e) => e.text)).toContain('Ember’s Tank: the Auto Water Changer is out of salt. Buy marine salt to keep it running.');
    expect(autofeedPausedText({ name: 'Ember' })).toBe('Auto-feed is paused — feed Ember by hand.');
    const def = getEquipmentDef('auto_water_changer')!;
    expect(def.description).toBe('Swaps a small share of the water every morning from a conditioned reservoir and scrapes the front glass once a week. Marine and brackish tanks draw on your salt stock for the new water.');
    expect(text(html(createElement(EquipRow, { g, e: def, fits: true, installed: false, tankId: tank.id })))).toContain('Unlocks the Auto-clean switch on the tank card · upkeep $0.06/day');
  });
});

/** Server rendering reads a store's initial state: copy the live state in first. */
function syncNotifyStores(): void {
  Object.assign(useNotifyPermission.getInitialState(), useNotifyPermission.getState());
  Object.assign(useNotifyPrefs.getInitialState(), useNotifyPrefs.getState());
}

describe('§16 Notifications (DES-009; ADR-0022 decision 4)', () => {
  const tab = (permission: NotifyPermission) => {
    useNotifyPermission.setState({ permission });
    syncNotifyStores();
    return html(createElement(NotificationsTab));
  };
  afterAll(() => {
    useNotifyPermission.setState({ permission: 'unsupported' });
    syncNotifyStores();
  });

  it('the status callout in each permission state (web wording; no iPhone line)', () => {
    expect(text(tab('default'))).toMatch(/^Notifications are off Get a nudge for rare stock, hungry animals and sales while Aquarium Go is open, even when you’re in another window\. Turn on /);
    expect(text(tab('granted'))).toMatch(/^Notifications are on This browser shows alerts while Aquarium Go is open, even in another window\. Close the tab and they stop\. /);
    expect(text(tab('denied'))).toMatch(/^Blocked in your browser To turn them on, allow notifications for this site in your browser’s site settings, then come back\. /);
    const unsupported = text(tab('unsupported'));
    expect(unsupported).toMatch(/^This browser can’t show notifications Alerts still appear in the game\. /);
    expect(unsupported).not.toMatch(/Home Screen|iPhone/);
    for (const p of ['default', 'granted', 'denied', 'unsupported'] as const) expect(text(tab(p))).not.toMatch(/when the game is closed|while the game is closed/);
  });

  it('the test row, the five categories with their subtitles, and quiet hours', () => {
    const off = text(tab('default'));
    expect(off).toContain('This browser Test notification Turn notifications on to try this Send test');
    const on = text(tab('granted'));
    expect(on).toContain('Test notification Arrives in a couple of seconds Send test');
    expect(on).toContain(
      'Notify me about Rare stock Prismatic animals and rare strains in the shop Animal care Hungry or sick animals, empty autofeeders Market New bids, sales and auctions ending Breeding Eggs laid and fry hatched Shows Results from shows you entered',
    );
    expect(on).toContain('Quiet hours 10:00 PM – 8:00 AM Urgent animal care still comes through');
  });

  it('the Alerts drawer footer, only before the browser has been asked', () => {
    useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Copy', seed: 9 }));
    Object.assign(useGame.getInitialState(), useGame.getState());
    useNotifyPermission.setState({ permission: 'default' });
    syncNotifyStores();
    const out = html(createElement(AlertsPopover));
    expect(text(/<div class="ag-alerts-cta"[\s\S]*?<\/div>/.exec(out)?.[0] ?? '')).toBe('Get alerts like these as system notifications, not just in here. Turn on');
    useNotifyPermission.setState({ permission: 'granted' });
    syncNotifyStores();
    expect(html(createElement(AlertsPopover))).not.toContain('alerts-notify-cta');
    useGame.getState().setGame(null);
    Object.assign(useGame.getInitialState(), { game: null });
  });
});
