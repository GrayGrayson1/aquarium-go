/**
 * chunk 6 (DES-011; 0.5 spec §17 "Geometry") — each §17 geometry row measured on its screen, within ± 2 px (the
 * tolerance §20 gives the phone sheet's top): the desktop panel and tank card, the Settings sheet, filter chips, the
 * segmented control (the tank card's Meals a day), the offer's gene row, temperament meter, destination tiles and buy bar, toasts and the loading
 * card at 1440×900; the tab bar, the panel sheet and its grabber, the tank card and the phone's gene row and price at
 * 390×844. (The switch is automation.spec.ts's; More's top is mobile-tabbar.spec.ts's.)
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

const TOL = 2;
const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
const box = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } as Box;
  });
const css = (page: Page, sel: string, props: string[]) =>
  page.locator(sel).first().evaluate((e, ps) => {
    const cs = getComputedStyle(e);
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);
const px = (v: string) => parseFloat(v);

/** Collects every mismatch, so one run reports them all. */
function checker() {
  const misses: string[] = [];
  return {
    misses,
    near(what: string, got: number, want: number, tol = TOL) {
      if (!(Math.abs(got - want) <= tol)) misses.push(`${what}: ${got.toFixed(1)} (want ${want})`);
    },
    atLeast(what: string, got: number, want: number) {
      if (!(got >= want - 0.5)) misses.push(`${what}: ${got.toFixed(1)} (want at least ${want})`);
    },
    is(what: string, got: string, want: string) {
      if (got !== want) misses.push(`${what}: ${got} (want ${want})`);
    },
  };
}

async function game(page: Page) {
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'betta')).ok).toBe(true);
}

test.describe('§17 geometry, desktop 1440×900', () => {
  test('panel, tank card, Settings, chips, segmented, offer detail, toast, loading card', async ({ page }) => {
    await game(page);
    const c = checker();
    const vw = 1440;
    const vh = 900;
    // Desktop panel: top 76, bottom 96, right 16, width clamp(460px, 40vw, 600px) = 576 at 1440, r 24
    await goHash(page, '#/shop');
    await expect(tid(page, 'panel-market')).toBeVisible();
    await page.waitForTimeout(600);
    const panel = await box(page, '[data-testid="panel-market"]');
    c.near('panel top', panel.top, 76);
    c.near('panel bottom inset', vh - panel.bottom, 96);
    c.near('panel right inset', vw - panel.right, 16);
    c.near('panel width', panel.width, 576);
    c.near('panel radius', px((await css(page, '[data-testid="panel-market"]', ['border-top-left-radius']))['border-top-left-radius']), 24);
    // Filter chips: min-height 36, p 6×14, r 999, 12.5/600
    const chip = await css(page, '[data-testid="shop-filter-prismatic"]', ['min-height', 'padding-top', 'padding-left', 'border-top-left-radius', 'font-size', 'font-weight']);
    c.atLeast('chip min-height', px(chip['min-height']), 36);
    c.near('chip padding top', px(chip['padding-top']), 6, 0.5);
    c.near('chip padding side', px(chip['padding-left']), 14, 0.5);
    c.atLeast('chip radius', px(chip['border-top-left-radius']), 18);
    c.near('chip font size', px(chip['font-size']), 12.5, 0.1);
    c.is('chip font weight', chip['font-weight'], '600');
    // Offer detail: gene row (min-height 50, 96px first column), temperament (track 6, thumb 12), destination tile
    // (min-height 76, r 16, p 12×14), buy bar price 24/650
    await page.locator('[data-testid="shop-offer-0"]').click();
    await expect(tid(page, 'offer-genes')).toBeVisible();
    const gene = page.locator('[data-testid^="offer-gene-"]').first();
    const geneCss = await gene.evaluate((e) => {
      const cs = getComputedStyle(e);
      return { minH: cs.minHeight, cols: cs.gridTemplateColumns, h: e.getBoundingClientRect().height };
    });
    c.atLeast('gene row height', geneCss.h, 50);
    c.near('gene row first column', px(geneCss.cols.split(' ')[0]), 96, 0.5);
    const track = await box(page, '.ag-temper__track');
    const thumb = await box(page, '.ag-temper__thumb');
    c.near('temperament track', track.height, 6, 0.5);
    c.near('temperament thumb', thumb.width, 12, 0.5);
    const tile = await css(page, '[data-testid="panel-market"] [role="radio"]', ['min-height', 'border-top-left-radius', 'padding-top', 'padding-left']);
    c.atLeast('destination tile min-height', px(tile['min-height']), 76);
    c.near('destination tile radius', px(tile['border-top-left-radius']), 16, 0.5);
    c.near('destination tile padding top', px(tile['padding-top']), 12, 0.5);
    c.near('destination tile padding side', px(tile['padding-left']), 14, 0.5);
    const price = await css(page, '.pn-buybar__price', ['font-size', 'font-weight']);
    c.near('buy bar price size', px(price['font-size']), 24, 0.1);
    c.is('buy bar price weight', price['font-weight'], '650');
    // Toast: r 14, p 8 6 8 8, icon chip 30
    await page.evaluate(() => (window as unknown as { __AQ: { ui(): { toast(t: string): void } } }).__AQ.ui().toast('Measured'));
    await expect(page.locator('.ag-toast').first()).toBeVisible();
    const toast = await css(page, '.ag-toast', ['border-top-left-radius', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']);
    c.near('toast radius', px(toast['border-top-left-radius']), 14, 0.5);
    c.near('toast padding top', px(toast['padding-top']), 8, 0.5);
    c.near('toast padding right', px(toast['padding-right']), 6, 0.5);
    c.near('toast padding bottom', px(toast['padding-bottom']), 8, 0.5);
    c.near('toast padding left', px(toast['padding-left']), 8, 0.5);
    c.near('toast icon chip', (await box(page, '.ag-toast__icon')).width, 30, 0.5);
    // Desktop tank card: left 16, top 144, bottom 104, width 404
    const tank = await page.evaluate(() => (window as unknown as { __AQ: { game(): { tankOrder: string[] } } }).__AQ.game().tankOrder[0]);
    await aq(page, 'act', 'installEquipment', tank, 'autofeeder', { purchased: true });
    await goHash(page, '#/');
    await goHash(page, `#/tanks/${tank}/equipment`);
    await expect(tid(page, 'tank-card')).toBeVisible();
    await page.waitForTimeout(600);
    const card = await box(page, '[data-testid="tank-card"]');
    // Segmented (the tank card's Meals a day): container p 3, r 999; items min 32×28, 11.5/650
    const meal = tid(page, 'tank-auto-feed-meals-1');
    await expect(meal).toBeVisible();
    const segCss = await meal.evaluate((e) => {
      const p = getComputedStyle(e.parentElement!);
      const i = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return { pad: p.paddingTop, radius: p.borderTopLeftRadius, w: r.width, h: r.height, size: i.fontSize, weight: i.fontWeight };
    });
    c.near('segmented padding', px(segCss.pad), 3, 0.5);
    c.atLeast('segmented radius', px(segCss.radius), 14);
    c.atLeast('segment width', segCss.w, 32);
    c.atLeast('segment height', segCss.h, 28);
    c.near('segment font size', px(segCss.size), 11.5, 0.1);
    c.is('segment font weight', segCss.weight, '650');
    c.near('tank card left', card.left, 16);
    c.near('tank card top', card.top, 144);
    c.near('tank card bottom inset', vh - card.bottom, 104);
    c.near('tank card width', card.width, 404);
    // Settings sheet: right 16, top 82, width 404
    await goHash(page, '#/');
    await goHash(page, '#/settings');
    await expect(tid(page, 'panel-settings')).toBeVisible();
    await page.waitForTimeout(600);
    const settings = await box(page, '[data-testid="panel-settings"]');
    c.near('Settings right inset', vw - settings.right, 16);
    c.near('Settings top', settings.top, 82);
    c.near('Settings width', settings.width, 404);
    // Loading card: 300 wide, r 24, progress 6 tall (its CSS, on a copy: the real one shows only while a save loads)
    const boot = await page.evaluate(() => {
      const wrap = document.createElement('div');
      wrap.className = 'ag-boot';
      wrap.innerHTML = '<div class="ag-boot__card"><div class="ag-boot__bar"><span></span></div></div>';
      document.body.appendChild(wrap);
      const cardEl = wrap.querySelector('.ag-boot__card')!;
      const out = { w: cardEl.getBoundingClientRect().width, r: getComputedStyle(cardEl).borderTopLeftRadius, bar: wrap.querySelector('.ag-boot__bar')!.getBoundingClientRect().height };
      wrap.remove();
      return out;
    });
    c.near('loading card width', boot.w, 300, 0.5);
    c.near('loading card radius', px(boot.r), 24, 0.5);
    c.near('loading bar height', boot.bar, 6, 0.5);
    expect(c.misses).toEqual([]);
  });
});

test.describe('§17 geometry, phone 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('tab bar, panel sheet, tank card, gene row and price', async ({ page }) => {
    await game(page);
    const c = checker();
    const vw = 390;
    const vh = 844;
    // Phone tab bar: inside the HUD, 10 from the edges; h 64, r 18, p 4, gap 2; icons 22
    const bar = await box(page, '[data-testid="nav-tabbar"]');
    c.near('tab bar left', bar.left, 10);
    c.near('tab bar right inset', vw - bar.right, 10);
    c.near('tab bar bottom inset', vh - bar.bottom, 10);
    c.near('tab bar height', bar.height, 64);
    const barCss = await css(page, '[data-testid="nav-tabbar"]', ['border-top-left-radius', 'padding-top', 'column-gap']);
    c.near('tab bar radius', px(barCss['border-top-left-radius']), 18, 0.5);
    c.near('tab bar padding', px(barCss['padding-top']), 4, 0.5);
    c.near('tab bar gap', px(barCss['column-gap']), 2, 0.5);
    c.near('tab bar icon', (await box(page, '[data-testid="nav-tabbar"] svg')).width, 22, 0.5);
    // Phone panel sheet: top 64 (no notch), r 22 22 0 0, header p 8 16 12, grabber 42×5
    await goHash(page, '#/shop');
    await expect(tid(page, 'panel-market')).toBeVisible();
    await page.waitForTimeout(700);
    const sheet = await box(page, '[data-testid="panel-market"]');
    c.near('sheet top', sheet.top, 64);
    const sheetCss = await css(page, '[data-testid="panel-market"]', ['border-top-left-radius', 'border-bottom-left-radius']);
    c.near('sheet top radius', px(sheetCss['border-top-left-radius']), 22, 0.5);
    c.near('sheet bottom radius', px(sheetCss['border-bottom-left-radius']), 0, 0.5);
    const head = await css(page, '[data-testid="panel-market"] .pn-head', ['padding-top', 'padding-left', 'padding-bottom']);
    c.near('sheet header padding top', px(head['padding-top']), 8, 0.5);
    c.near('sheet header padding side', px(head['padding-left']), 16, 0.5);
    c.near('sheet header padding bottom', px(head['padding-bottom']), 12, 0.5);
    const grab = await box(page, '[data-testid="panel-market"] .pn-grab');
    c.near('grabber width', grab.width, 42, 0.5);
    c.near('grabber height', grab.height, 5, 0.5);
    // the phone's gene row (92px first column) and price (22)
    await page.locator('[data-testid="shop-offer-0"]').click();
    await expect(tid(page, 'offer-genes')).toBeVisible();
    const cols = await page.locator('[data-testid^="offer-gene-"]').first().evaluate((e) => getComputedStyle(e).gridTemplateColumns);
    c.near('phone gene row first column', px(cols.split(' ')[0]), 92, 0.5);
    c.near('phone buy bar price', px((await css(page, '.pn-buybar__price', ['font-size']))['font-size']), 22, 0.1);
    // Toast on a phone: §17's geometry (the text stays one line until tapped)
    await page.evaluate(() => (window as unknown as { __AQ: { ui(): { toast(t: string): void } } }).__AQ.ui().toast('Measured'));
    await expect(page.locator('.ag-toast').first()).toBeVisible();
    const toast = await css(page, '.ag-toast', ['border-top-left-radius', 'padding-top', 'padding-right', 'padding-left']);
    c.near('phone toast radius', px(toast['border-top-left-radius']), 14, 0.5);
    c.near('phone toast padding top', px(toast['padding-top']), 8, 0.5);
    c.near('phone toast padding right', px(toast['padding-right']), 6, 0.5);
    c.near('phone toast padding left', px(toast['padding-left']), 8, 0.5);
    c.near('phone toast icon chip', (await box(page, '.ag-toast__icon')).width, 30, 0.5);
    // Phone tank card: top 118 (below the tank bar)
    const tank = await page.evaluate(() => (window as unknown as { __AQ: { game(): { tankOrder: string[] } } }).__AQ.game().tankOrder[0]);
    await goHash(page, '#/');
    await goHash(page, `#/tanks/${tank}`);
    await expect(tid(page, 'tank-card')).toBeVisible();
    await page.waitForTimeout(700);
    c.near('phone tank card top', (await box(page, '[data-testid="tank-card"]')).top, 118);
    expect(c.misses).toEqual([]);
  });
});
