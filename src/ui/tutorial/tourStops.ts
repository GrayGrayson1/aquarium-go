/**
 * chunk 19 (ADR-0055 decision 7, QOL-008) — the tour's stops ("Show me around"): one per area of the screen and per
 * destination open to the player, in the order a newcomer meets them. Each stop says where to point (CSS selectors,
 * best first, as the guide's spotlight takes them) and what to open first (`open`: a panel the stop shows from the
 * inside; `close`: the tank view, clear of panels). Destinations still locked are left out; a phone points at its tab
 * bar and More instead of the dock. Pure (tests/sim/qol-guide.test.ts). The words are drafted for the owner (ADR-0055
 * decision 8). OWNER: lane "ui-shell".
 */

export interface TourStop {
  id: string;
  title: string;
  body: string;
  /** Selectors, best first; none: a card in the middle of the screen. */
  target: string[];
  /** Open this panel before pointing (its tabs are the target). */
  open?: 'market' | 'build' | 'livestock' | 'operations' | 'research' | 'visitors' | 'shows' | 'finances' | 'encyclopedia' | 'social';
  /** Open the phone's More sheet before pointing. */
  more?: boolean;
}

export interface TourContext {
  mobile: boolean;
  /** Unlock keys the player has (the dock's locked destinations stay out). */
  unlocked: (key: string) => boolean;
  /** Social exists in this build. */
  social: boolean;
}

const panelTabs = (panel: string) => [`[data-testid="panel-${panel}"] .pn-head__toolbar`, `[data-testid="panel-${panel}"] .pn-head`];

export function tourStops(ctx: TourContext): TourStop[] {
  const out: TourStop[] = [];
  const add = (s: TourStop) => out.push(s);
  add({ id: 'welcome', title: 'Welcome to your aquarium', body: 'A quick look at where everything is. Skip whenever you like; you can take the tour again from Settings.', target: [] });
  add({ id: 'time', title: 'Time and speed', body: 'Pause, play or speed time up. Your animals live by the clock: day and night, feeding and growing.', target: ['[data-tutorial-id="speed-controls"]'] });
  add({ id: 'money', title: 'Money and reputation', body: 'What you have to spend, and (the star) how well known your aquarium is. Reputation opens bigger tanks, new species and more.', target: ctx.mobile ? ['[data-tutorial-id="hud-money"]'] : ['.ag-topbar__right .ag-rep-pill', '[data-tutorial-id="hud-money"]'] });
  add({ id: 'alerts', title: 'Alerts', body: 'The bell lists what needs you: a tank in trouble, a sale, a show result. Each line takes you there.', target: ['[data-testid="hud-alerts"]'] });
  add({ id: 'find', title: 'Find anything', body: ctx.mobile ? 'Search every animal, item, research project and screen, from More.' : 'Search every animal, item, research project and screen. On a keyboard, press / or ⌘K.', target: ctx.mobile ? ['[data-testid="dock-more"]'] : ['[data-testid="hud-find"]'] });
  add({ id: 'tanks', title: 'Your tanks', body: 'Switch between tanks, open the tank card (water, equipment, residents, value) or step back to see the whole room.', target: ['.ag-tankbar'] });
  add({ id: 'tools', title: 'Tank tools', body: 'Feed, target-feed, tap the glass, take photos and set the lights. Watch hides everything so you can just enjoy the view.', target: ['.ag-toolrail'] });
  if (!ctx.mobile) add({ id: 'camera', title: 'Camera', body: 'Front, Orbit, Follow an animal or a Close-up. Drag to look around; scroll or pinch to zoom.', target: ['[data-tutorial-id="camera-modes"]'] });
  add({ id: 'market', title: 'Market', body: 'Shop for animals, Supplies for food and gear, My listings to sell your own, History & demand for prices.', target: panelTabs('market'), open: 'market' });
  add({ id: 'build', title: 'Build', body: 'New tanks, decor, equipment, substrate and a bigger venue. Pick a piece of decor and place it right in the tank; Build stays open for the next one.', target: panelTabs('build'), open: 'build' });
  add({ id: 'livestock', title: 'Livestock', body: 'Every animal you own, their young, and production lines that breed for you.', target: panelTabs('livestock'), open: 'livestock' });
  add({ id: 'operations', title: 'Operations', body: 'Your aquarium’s running at a glance: water, feeding, breeding lines and anything that needs you.', target: panelTabs('operations'), open: 'operations' });
  add({ id: 'research', title: 'Research', body: 'Study to unlock species, gear and rooms. The Unlock map shows what comes next and how to get it; Quests give rewards.', target: panelTabs('research'), open: 'research' });
  if (ctx.unlocked('visitors')) add({ id: 'visitors', title: 'Visitors and staff', body: 'Open your doors to paying visitors, and hire keepers to help.', target: panelTabs('visitors'), open: 'visitors' });
  if (ctx.unlocked('shows')) add({ id: 'shows', title: 'Shows', body: 'Enter your best animals in club shows for prizes and reputation.', target: panelTabs('shows'), open: 'shows' });
  add({ id: 'finances', title: 'Finances', body: 'Where the money comes from and where it goes, day by day.', target: panelTabs('finances'), open: 'finances' });
  add({ id: 'encyclopedia', title: 'Encyclopedia', body: 'Everything about every species you have met: care, behaviour, breeding and colour forms.', target: panelTabs('encyclopedia'), open: 'encyclopedia' });
  if (ctx.social) add({ id: 'social', title: 'Social', body: 'Your account, clubs, friends and trading, and shared shops your club plays together.', target: panelTabs('social'), open: 'social' });
  add({ id: 'settings', title: 'Settings', body: 'Sound, saves, notifications and accessibility. Take this tour again from here.', target: ctx.mobile ? ['[data-testid="more-settings"]'] : ['[data-testid="hud-settings"]'], more: ctx.mobile });
  add({ id: 'done', title: 'You’re all set', body: 'Enjoy your aquarium. Anything you can’t find, Find anything will.', target: [] });
  return out;
}
