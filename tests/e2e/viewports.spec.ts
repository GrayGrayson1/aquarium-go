/**
 * chunk 6 (DES-012; 0.5 spec §5.2, §5.4, §5.6) — the whole game at phone portrait and landscape, both sides of
 * MOBILE_QUERY (720 / 721 px), the desktop dock breakpoints (1180, 1400, 1520) and 1440×900: every panel opens with no
 * horizontal page scroll, inside the viewport, its close button and tab strip on screen; and the tab bar replaces the
 * dock exactly where MOBILE_QUERY matches (phones held sideways included). The walk is split per viewport (WebKit
 * drops a page's hash changes after about 200 in quick succession, nav-routes-matrix.spec.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);

const VIEWPORTS: { name: string; width: number; height: number; phone: boolean }[] = [
  { name: 'phone portrait 390×844', width: 390, height: 844, phone: true },
  { name: 'phone landscape 844×390', width: 844, height: 390, phone: true },
  { name: '720 px (MOBILE_QUERY)', width: 720, height: 900, phone: true },
  { name: '721 px (desktop)', width: 721, height: 900, phone: false },
  { name: '1180 px', width: 1180, height: 800, phone: false },
  { name: '1400 px', width: 1400, height: 900, phone: false },
  { name: '1520 px', width: 1520, height: 900, phone: false },
  { name: '1440×900', width: 1440, height: 900, phone: false },
];

/** Every panel (and the tank card), by its address. */
const SCREENS = [
  '#/tanks', '#/tanks/{tank}', '#/livestock', '#/livestock/production', '#/shop', '#/market/supplies', '#/market/listings', '#/build',
  '#/build/facility', '#/visitors', '#/visitors/staff', '#/shows', '#/research', '#/finances', '#/encyclopedia', '#/settings',
  '#/settings/notifications', '#/operations', '#/operations/map', '#/social', '#/log',
];

/** Horizontal overflow of the page, and where the open sheet, its close button and its tab strip sit. */
const measure = (page: Page) =>
  page.evaluate(() => {
    const vw = window.innerWidth;
    const page = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) };
    };
    // (the sheets are position: fixed, so offsetParent is always null: size and style say whether one is shown)
    const shown = (e: Element) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const sheet = [...document.querySelectorAll('[data-testid^="panel-"], [data-testid="tank-card"]')].find((e) => !e.getAttribute('data-testid')!.startsWith('panel-close') && shown(e)) ?? null;
    return {
      vw,
      vh: window.innerHeight,
      page,
      sheet: box(sheet),
      id: sheet?.getAttribute('data-testid') ?? null,
      close: box(sheet?.querySelector('[data-testid="panel-close"], [aria-label^="Close"]') ?? null),
      tabs: box(sheet?.querySelector('[role="tablist"]') ?? null),
    };
  });

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, ...(vp.phone && vp.width <= 844 ? { hasTouch: true, isMobile: true } : {}) });

    test('the tab bar or the dock, and every screen inside the viewport with no horizontal scroll', async ({ page }) => {
      test.setTimeout(240_000);
      await openApp(page);
      await quickGame(page, 'betta', { money: 5000 });
      await aq(page, 'act', 'tutorialSkip');
      // MOBILE_QUERY: the tab bar replaces the dock exactly there
      if (vp.phone) {
        await expect(tid(page, 'nav-tabbar')).toBeVisible();
        await expect(page.locator('.ag-dock')).toHaveCount(0);
      } else {
        await expect(page.locator('nav.ag-dock')).toBeVisible();
        await expect(tid(page, 'nav-tabbar')).toHaveCount(0);
      }
      const tank = await page.evaluate(() => (window as unknown as { __AQ: { game(): { tankOrder: string[] } } }).__AQ.game().tankOrder[0]);
      const problems: string[] = [];
      for (const screen of SCREENS) {
        const h = screen.replace('{tank}', tank);
        await goHash(page, '#/');
        // the last screen's sheet slides out first (an exit animation): measure only the new one
        await expect.poll(async () => (await measure(page)).id, { message: `${h}: the last sheet closes` }).toBeNull();
        await goHash(page, h);
        await expect
          .poll(async () => (await measure(page)).id, { message: `${h} opens a sheet` })
          .not.toBeNull();
        // ... and once it has settled (the same box twice in a row, after its opening spring)
        let m = await measure(page);
        for (let i = 0; i < 30; i++) {
          await page.waitForTimeout(100);
          const next = await measure(page);
          const same = JSON.stringify(next) === JSON.stringify(m);
          m = next;
          if (same) break;
        }
        const out = (b: { left: number; right: number } | null) => !!b && (b.left < -1 || b.right > m.vw + 1);
        if (m.page > m.vw + 1) problems.push(`${h}: the page scrolls sideways (${m.page} px in ${m.vw})`);
        if (out(m.sheet)) problems.push(`${h}: ${m.id} spills out (${m.sheet!.left}–${m.sheet!.right} of ${m.vw})`);
        if (!m.close) problems.push(`${h}: ${m.id} has no close button`);
        else if (out(m.close) || m.close.bottom > m.vh + 1 || m.close.top < -1) problems.push(`${h}: ${m.id}'s close button is off screen`);
        if (out(m.tabs)) problems.push(`${h}: ${m.id}'s tabs spill out (${m.tabs!.left}–${m.tabs!.right} of ${m.vw})`);
      }
      expect(problems).toEqual([]);
    });
  });
}
