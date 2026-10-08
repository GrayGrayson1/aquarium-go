/**
 * lane:ui-panels (chunk 2; 0.5 spec §7, §20.2; MKT-002 to MKT-005, MKT-011, MKT-012, MKT-015, ACC-003) — the Shop's
 * Prismatic only and Rare genes chips: the address and the count follow them, the empty state clears them, they
 * survive a section switch; a maximised Market shows three columns; buying returns to the tank view with a toast, and
 * Back to the bought offer shows the gone state with its new button. On a phone: Supplies rows give the description
 * the full width, and the fit badge sits on the Destination tank header.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, probe } from './helpers';

const hash = (page: Page) => page.evaluate(() => location.hash);
const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const lastToast = (page: Page) => page.evaluate(() => (window as unknown as { __AQ: { ui(): { toasts: { text: string; label?: string; detail?: string; kind: string }[] } } }).__AQ.ui().toasts.at(-1) ?? null);

/** A Royal Blue Butterfly Halfmoon betta: a rare morph (and a named strain), so the Rare genes chip keeps it. */
const RARE_BETTA = { color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'] };

async function shopGame(page: Page) {
  await openApp(page);
  await quickGame(page, 'betta', { money: 5000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0); // paused: a restock mid-test would change the counts
  // an empty shelf, so the counts are this test's own offers
  await page.evaluate(() => (window as unknown as { __AQ: { mutate(fn: (g: { market: { stock: unknown[] } }) => void): void } }).__AQ.mutate((g) => void (g.market.stock = [])));
}

test.describe('Shop filters (desktop 1440×900)', () => {
  test('Prismatic only and Rare genes: the address, the count, the empty state and Clear filters', async ({ page }) => {
    await shopGame(page);
    expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'neon_tetra')).ok).toBe(true);
    expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'betta', { sex: 'female', alleles: RARE_BETTA })).ok).toBe(true);
    await tid(page, 'dock-market').click();
    await expect.poll(() => hash(page)).toBe('#/shop');
    await expect(tid(page, 'shop-filter-count')).toHaveText('2 of 2');

    await tid(page, 'shop-filter-rare').click();
    await expect(tid(page, 'shop-filter-rare')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => hash(page)).toBe('#/shop?rare=1');
    await expect(tid(page, 'shop-filter-count')).toHaveText('1 of 2');
    // which line depends on the Genetics Lab (a ?dev=1 session may count it researched); both are the §16 copy
    const lab = await tid(page, 'shop-filter-hint').evaluate((el) => el.classList.contains('is-lab'));
    await expect(tid(page, 'shop-filter-hint')).toHaveText(lab ? 'Genetics Lab: animals carrying rare hidden genes are included.' : 'Showing rare traits you can see. Hidden carriers appear once you research the Genetics Lab.');
    // shop-offer-<i> keeps indexing the stock, not the filtered list (the betta was added last, at the front)
    await expect(tid(page, 'shop-offer-0')).toContainText('Royal Blue Butterfly Halfmoon Betta');
    await expect(tid(page, 'shop-offer-1')).toHaveCount(0);

    await tid(page, 'shop-filter-prismatic').click();
    await expect.poll(() => hash(page)).toBe('#/shop?prismatic=1&rare=1');
    await expect(tid(page, 'shop-filter-count')).toHaveText('0 of 2');
    await expect(tid(page, 'shop-empty')).toContainText('No Prismatic animals right now');
    await expect(tid(page, 'shop-empty')).toContainText('About 1 in 4,096 stocked animals shimmers. New stock arrives through the day.');

    // the filters survive a section switch, and a bare #/shop re-applies them
    await tid(page, 'panel-market').getByRole('tab', { name: 'Supplies' }).click();
    await tid(page, 'panel-market').getByRole('tab', { name: 'Shop' }).click();
    await expect(tid(page, 'shop-filter-prismatic')).toHaveAttribute('aria-pressed', 'true');
    await goHash(page, '#/shop');
    await expect.poll(() => hash(page)).toBe('#/shop?prismatic=1&rare=1');

    await tid(page, 'shop-clear-filters').click();
    await expect.poll(() => hash(page)).toBe('#/shop');
    await expect(tid(page, 'shop-filter-count')).toHaveText('2 of 2');
    await expect(tid(page, 'shop-filter-hint')).toHaveCount(0);

    // a Prismatic animal leads the shelf and passes Prismatic only
    expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail', { prismatic: true })).ok).toBe(true);
    await tid(page, 'shop-filter-prismatic').click();
    await expect(tid(page, 'shop-filter-count')).toHaveText('1 of 3');
    await expect(tid(page, 'shop-offer-0').getByTestId('prismatic-badge')).toBeVisible();
    // chips are tall enough to tap (ACC-003)
    const h = await tid(page, 'shop-filter-prismatic').evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(36);
  });

  test('a maximised Market shows three columns of offers', async ({ page }) => {
    await shopGame(page);
    for (let i = 0; i < 4; i++) await aq(page, 'dev.addShopOffer', 'neon_tetra');
    await tid(page, 'dock-market').click();
    const cols = () => page.locator('.ag-offergrid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(await cols()).toBe(2);
    await tid(page, 'panel-market').getByRole('button', { name: 'Expand panel' }).click();
    await expect.poll(cols).toBe(3);
  });

  test('buying returns to the tank view with a toast; Back to the offer shows the gone state and its button', async ({ page }) => {
    await shopGame(page);
    expect((await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail', { price: 12 })).ok).toBe(true);
    const id = await probe<string>(page, 'g.market.stock[0].id');
    await tid(page, 'dock-market').click();
    await tid(page, 'shop-offer-0').click();
    await expect.poll(() => hash(page)).toBe(`#/shop/fish/${id}`);
    await expect(tid(page, 'offer-genes')).toBeVisible();
    await expect(tid(page, 'offer-temperament')).toBeVisible();
    // the destination tiles are one radio group, one of them checked
    await expect(page.getByRole('radiogroup', { name: 'Destination tank' }).getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(tid(page, 'compat-verdict')).toContainText('Excellent match');
    const buy = tid(page, 'buy-offer');
    const box = (await buy.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    await buy.click();
    await expect(tid(page, 'panel-market')).toBeHidden();
    await expect.poll(() => hash(page)).toBe('#/');
    expect(await lastToast(page)).toMatchObject({ kind: 'success', label: 'Bought', detail: 'Find them in Livestock.' });
    const tank = await probe<string>(page, 'g.tanks[g.tankOrder[0]].name');
    expect((await lastToast(page))!.text).toMatch(new RegExp(` is settling into ${tank}$`));

    await page.goBack();
    await expect.poll(() => hash(page)).toBe(`#/shop/fish/${id}`);
    await expect(tid(page, 'panel-market').getByText('This offer has gone')).toBeVisible();
    await tid(page, 'offer-gone-stock').click();
    await expect.poll(() => hash(page)).toBe('#/shop');
    await expect(tid(page, 'shop-filter-count')).toBeVisible();
  });
});

test.describe('phone 390×844 (touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('Supplies rows give the description the full width; the fit badge sits on the Destination tank header', async ({ page }) => {
    await shopGame(page);
    await goHash(page, '#/market/supplies');
    await expect(tid(page, 'panel-market').locator('[data-food-row]').first()).toBeVisible();
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('[data-food-row]')].slice(0, 4).map((row) => {
        const r = row.getBoundingClientRect();
        const desc = row.querySelector('.pn-grow > .pn-small') as HTMLElement | null;
        const side = row.querySelector('.pn-supply__side') as HTMLElement;
        const d = desc?.getBoundingClientRect();
        const btn = side.querySelector('button, .pn-tiny:last-child')!.getBoundingClientRect();
        return { overflow: row.scrollWidth - row.clientWidth, rowLeft: r.left, rowRight: r.right, descLeft: d?.left ?? 0, descWidth: d?.width ?? 0, rowWidth: r.width, btnRight: btn.right, sideTop: side.getBoundingClientRect().top, descBottom: d?.bottom ?? 0 };
      }),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.overflow).toBeLessThanOrEqual(0);
      // the description starts at the row's left padding, under the swatch, not beside it
      expect(r.descLeft - r.rowLeft).toBeLessThan(20);
      expect(r.descWidth).toBeGreaterThan(r.rowWidth * 0.8);
      // the info and action line comes after it, with the action at the right
      expect(r.sideTop).toBeGreaterThanOrEqual(r.descBottom - 1);
      expect(r.rowRight - r.btnRight).toBeLessThan(24);
    }

    await aq(page, 'dev.addShopOffer', 'mystery_snail', { price: 12 });
    const id = await probe<string>(page, 'g.market.stock[0].id');
    await goHash(page, `#/shop/fish/${id}`);
    const head = tid(page, 'panel-market').locator('.pn-shead').filter({ hasText: 'Destination tank' });
    await expect(head.locator('.ag-fitbadge')).toContainText('Excellent match');
    await expect(tid(page, 'panel-market').locator('.pn-buybar .ag-fitbadge')).toHaveCount(0);
    await expect(tid(page, 'buy-offer')).toHaveText(/Buy$/);
  });
});
