/**
 * lane:ui-panels (chunk 4; DESIGN-S3D §6, §8.6, §8.6.1; 0.5 §11.1; ADR-0025, ADR-0030; PROD-003, PROD-019, PROD-021,
 * DES-008, ACC-004) — Livestock › Production in a real browser: the empty state, setting up a line through its three
 * steps (Start line opens it at its address and toasts), the line's switch and its toast, the Sort sheet, End line's
 * confirmation, the not-found links (an unknown line, "new" with no free slot), and the phone's stepper.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AQ = { __AQ: { game(): any; ui(): { toasts: { text: string; label?: string; detail?: string; kind: string }[] } } };
const goHash = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const hash = (page: Page) => page.evaluate(() => location.hash);
const lastToast = (page: Page) => page.evaluate(() => (window as unknown as AQ).__AQ.ui().toasts.at(-1) ?? null);

/** A paused game with three more tanks and an adult female betta beside the starter male. */
async function lineGame(page: Page): Promise<void> {
  await openApp(page);
  await quickGame(page, 'betta', { money: 20000 });
  await aq(page, 'act', 'tutorialSkip');
  await aq(page, 'dev.setSpeed', 0);
  for (const name of ['Grow-out Tub', 'Quarantine', 'Quiet Corner']) {
    const r = await aq(page, 'act', 'buyTank', 'g20L', 'freshwater_tropical', undefined, { seeded: true, name });
    expect(r.ok).toBe(true);
  }
  const keep = await page.evaluate(() => (window as unknown as AQ).__AQ.game().tankOrder.at(-1) as string);
  const spawned = await aq(page, 'dev.spawnSpecies', 'betta', keep, { sex: 'female', ageDays: 40 });
  expect(spawned.ok).toBe(true);
}

/** Set up the first line through the UI; returns its id. */
async function setUpLine(page: Page): Promise<string> {
  await goHash(page, '#/livestock/production');
  await expect(tid(page, 'livestock-tab-production')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('No production line yet')).toBeVisible();
  await expect(tid(page, 'production-slots')).toHaveText('0 of 1 line slot · more at Specialty Shop');
  await tid(page, 'production-setup').click();
  await expect.poll(() => hash(page)).toBe('#/livestock/production/new');
  await expect(tid(page, 'production-new-step-1')).toHaveAttribute('aria-current', 'step');
  await page.locator('[data-testid^="production-new-pair-"]').first().click();
  await tid(page, 'production-new-next').click();
  await expect(tid(page, 'production-new-step-2')).toHaveAttribute('aria-current', 'step');
  for (const s of ['breed', 'raise', 'quarantine', 'keepers']) await expect(tid(page, `production-new-tank-${s}`)).toContainText('Fits');
  await tid(page, 'production-new-next').click();
  await expect(tid(page, 'production-new-step-3')).toHaveAttribute('aria-current', 'step');
  await expect(tid(page, 'production-new-name')).toHaveValue('Betta line');
  await expect(tid(page, 'production-new-breed-for')).toBeVisible(); // chunk 6 (DES-013): "Breed for" and Back (§14)
  await expect(tid(page, 'production-new-back')).toBeVisible();
  await tid(page, 'production-start-line').click();
  await expect.poll(async () => (await lastToast(page))?.text).toBe('Betta line started');
  const id = await page.evaluate(() => (window as unknown as AQ).__AQ.game().production.lines[0].id as string);
  await expect.poll(() => hash(page)).toBe(`#/livestock/production/${id}`);
  return id;
}

test.describe('Livestock › Production (desktop 1440×900)', () => {
  test('set up a line in three steps; switch it off and on; edit its keep rules; end it', async ({ page }) => {
    await lineGame(page);
    await setUpLine(page);
    await expect(page.getByRole('heading', { name: 'Betta line' })).toBeVisible();
    await expect(tid(page, 'production-slots')).toHaveText('1 of 1 line slot · more at Specialty Shop');
    for (const s of ['breed', 'raise', 'sort', 'quarantine', 'sell']) await expect(tid(page, `production-stage-${s}`)).toBeVisible();

    // the switch (ACC-004): role, name, state; off toasts DESIGN-S3D's line and the badge says so
    const sw = tid(page, 'production-toggle');
    await expect(sw).toHaveAttribute('role', 'switch');
    await expect(sw).toHaveAttribute('aria-label', 'Betta line running');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => lastToast(page)).toMatchObject({ text: 'Betta line paused', detail: 'Animals stay where they are; nothing new is bred or listed.' });
    await expect(page.getByText('Paused by you').first()).toBeVisible();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');

    // the Sort sheet (ADR-0030 decision 6)
    await tid(page, 'production-stage-sort').click();
    await expect(tid(page, 'production-sort')).toBeVisible();
    await expect(tid(page, 'production-sort')).toContainText('Young that match a rule move to Quiet Corner. The rest go to quarantine.');
    await tid(page, 'production-sort-add').click();
    await expect(tid(page, 'production-sort')).toContainText('Keep best');
    await tid(page, 'production-sort').getByRole('button', { name: 'Done' }).click();
    await expect(tid(page, 'production-stage-sort')).toContainText('Keep best 2');

    // End line (ADR-0030 decision 1)
    await tid(page, 'production-end-line').click();
    await expect(tid(page, 'production-end-confirm')).toContainText("Its animals stay in the tanks they're in, the line slot frees up, and its numbers stay in its history.");
    await tid(page, 'production-end-confirm-yes').click();
    await expect.poll(() => lastToast(page)).toMatchObject({ text: 'Betta line ended', detail: 'Its animals stay where they are.' });
    await expect(page.getByText('No production line yet')).toBeVisible();
    await expect.poll(() => hash(page)).toBe('#/livestock/production'); // the address leaves the ended line (the chunk 4 review)
    await expect(tid(page, 'production-slots')).toHaveText('0 of 1 line slot · more at Specialty Shop');
  });

  // DESIGN-S3D §6 (unknown id → not found) with the owner's words (ADR-0026 decision 9); the chunk 4 review: these used to
  // go home with the broken-link toast
  test('an unknown line, and "new" with no free slot, open the lines with the not-found words', async ({ page }) => {
    await lineGame(page);
    const id = await setUpLine(page);
    await goHash(page, '#/livestock/production/nope');
    await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'This line isn’t here any more' })).toBeVisible();
    await expect.poll(() => hash(page)).toBe('#/livestock/production');
    await expect(tid(page, 'livestock-tab-production')).toHaveAttribute('aria-selected', 'true');
    await goHash(page, `#/livestock/production/${id}`);
    await expect(tid(page, 'production-toggle')).toBeVisible();
    await goHash(page, '#/livestock/production/new'); // 1 of 1 line slot is used
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as AQ).__AQ.ui().toasts.filter((t) => t.text === 'This line isn’t here any more').length))).toBe(2);
    await expect.poll(() => hash(page)).toBe('#/livestock/production');
  });
});

test.describe('Livestock › Production (phone 390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('the stepper uses the short words and the line opens', async ({ page }) => {
    await lineGame(page);
    await goHash(page, '#/livestock/production/new');
    await expect(tid(page, 'production-new-step-1')).toHaveText('1Pair');
    await expect(tid(page, 'production-new-step-2')).toHaveText('2Tanks');
    await expect(tid(page, 'production-new-step-3')).toHaveText('3Rules');
    await page.locator('[data-testid^="production-new-pair-"]').first().click();
    await tid(page, 'production-new-next').click();
    await tid(page, 'production-new-next').click();
    await tid(page, 'production-start-line').click();
    await expect.poll(async () => (await lastToast(page))?.text).toBe('Betta line started');
    await expect(tid(page, 'production-toggle')).toBeVisible();
  });
});
