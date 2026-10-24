/**
 * lane:social (chunk 6; ADR-0005 decision 3; SOC-011 A1–A3, SOC-004 A1, NAV-020) — the production build as players get
 * it (the `prod` projects: the Pages build under /aquarium-go/, built without VITE_E2E_DEV_URL, so no developer
 * tools). Chunk 8 (ADR-0038, REL-025): Social is for players now, where a project is configured; every e2e build runs
 * it on the local stub (VITE_SOCIAL_STUB in Playwright's E2E_ENV), so this checks the players' Social without reaching
 * a server: the dock has its 11 items (Social between Shows and Build) and clears the camera chips from 1400 to
 * 1600 px; #/social addresses open Social, signed out, with no prototype hint; an invite link opens its invite, typed in
 * the game or opened in a fresh page; Settings › Account is there; the More sheet has the Social tile. SOC-011's
 * dev-only checks this file made before are superseded on purpose (REL-025).
 * chunk 7 (REL-019, ADR-0037 decision 3, B-190) — and ?dev=1 does nothing there: no write calls on window.__AQ, no
 * registry fixture, no sandbox, no wrench button; a starter showcase still opens. Chunk 15 (ADR-0051): nor the scenario
 * lab (?lab=1, ?scenario=, ?recipe=), whose code is never even fetched.
 */
import { test, expect, type Page } from '@playwright/test';
import { dockClear, onboardViaUI, tid } from './helpers';

const ready = (page: Page) => page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 60_000 });
const go = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);

test('the players’ build has Social: the dock, the More sheet, its addresses, an invite link and Settings › Account, with no dev hint', async ({ page, context, baseURL }) => {
  expect(baseURL).toMatch(/\/aquarium-go\/$/);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await ready(page);
  // no write tools here: this is the players' build
  expect(await page.evaluate(() => typeof (window as unknown as { __AQ: { newGame?: unknown } }).__AQ.newGame)).toBe('undefined');
  await onboardViaUI(page, 'betta', 'Prod');

  // the dock: 11 items, Social between Shows and Build, Operations right after Build, clear of the camera chips (§5.4)
  await expect(tid(page, 'dock-social')).toBeVisible();
  for (const width of [1400, 1440, 1519, 1520, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const r = await dockClear(page);
    expect(r.labels, `${width}px`).toEqual(['Tanks', 'Livestock', 'Market', 'Visitors', 'Shows', 'Social', 'Build', 'Operations', 'Research', 'Finances', 'Encyclopedia']);
    expect(r.gap, `${width}px`).toBeGreaterThan(0);
    expect(r.scrolls, `${width}px`).toBe(false);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // Social as a signed-out player sees it: the sign-in screen, the forgot-password line, no prototype hint
  await go(page, '#/social');
  await expect(tid(page, 'panel-social')).toBeVisible();
  await expect(tid(page, 'panel-social').getByText('Bring your aquarium online')).toBeVisible();
  await expect(tid(page, 'social-forgot')).toHaveText('Forgot your password? Ask whoever invited you.');
  await expect(page.getByText('Prototype: any email with an @')).toHaveCount(0);
  for (const h of ['#/social/clubs', '#/social/leaderboards']) {
    await go(page, h);
    await expect(tid(page, 'panel-social')).toBeVisible();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(h);
  }
  // an invite link opens its invite
  await go(page, '#/social/join/HIGHLAND-4821');
  await expect(tid(page, 'social-invite-callout')).toContainText('You’re invited to Highland Betta Club');
  // Settings › Account
  await go(page, '#/settings/account');
  await expect(tid(page, 'settings-tab-account')).toHaveAttribute('aria-selected', 'true');
  await expect(tid(page, 'account-signed-out')).toHaveText('Sign in from Social to save your aquarium online and see friends.');
  await page.keyboard.press('Escape');

  // the phone More sheet: six tiles, Social after Shows
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, '#/');
  await tid(page, 'dock-more').click();
  await expect(tid(page, 'more-sheet').locator('.ag-more__label')).toHaveText(['Visitors', 'Shows', 'Social', 'Research', 'Finances', 'Encyclopedia']);
  await expect(tid(page, 'more-social')).toBeVisible();

  // a fresh page opened on an invite link boots with "Then: Social › Club invite", then shows the invite
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await tid(page, 'hud-settings').click();
  await tid(page, 'settings-tab-general').click();
  await tid(page, 'settings-save').click(); // a save to continue from (Save now)
  await expect(page.locator('[data-testid="toast"]').filter({ hasText: 'Game saved' }).first()).toBeVisible();
  const fresh = await context.newPage();
  const pills: string[] = [];
  await fresh.exposeFunction('__pill', (t: string) => void pills.push(t));
  await fresh.addInitScript(() => {
    new MutationObserver(() => {
      const d = document.querySelector('[data-testid="boot-deeplink-dest"]');
      if (d) (window as unknown as { __pill(t: string): void }).__pill(d.textContent ?? '');
    }).observe(document, { childList: true, subtree: true });
  });
  await fresh.goto('./#/social/join/HIGHLAND-4821', { waitUntil: 'domcontentloaded' });
  await ready(fresh);
  await expect(tid(fresh, 'social-invite-callout')).toBeVisible();
  expect(pills).toContain('Then: Social › Club invite');
});

test('the live site ignores ?dev=1: no write tools, fixtures or sandboxes; starter showcases still open', async ({ page, baseURL }) => {
  expect(baseURL).toMatch(/\/aquarium-go\/$/);
  type Win = { __AQ: Record<string, unknown> & { summary(): { screen: string } } };
  const keys = () => page.evaluate(() => Object.keys((window as unknown as Win).__AQ));

  // whatever the stored settings say (PLAT-005 A1): the Developer tools switch is stored as on
  await page.addInitScript(() => localStorage.setItem('aquarium-go.settings.v1', JSON.stringify({ devMode: true })));
  await page.goto('./?dev=1', { waitUntil: 'domcontentloaded' });
  await ready(page);
  const k = await keys();
  for (const w of ['newGame', 'mutate', 'setGame', 'setUI', 'dev', 'act', 'advance', 'loadFixture', 'save', 'deleteSave', 'importText', 'scenario']) expect(k, w).not.toContain(w);
  expect(k).toContain('summary');
  expect(await page.evaluate(() => (window as unknown as { __AQ: { settings(): { devMode: boolean } } }).__AQ.settings().devMode)).toBe(true);
  await onboardViaUI(page, 'betta', 'Prod');
  // no wrench button, and Settings › About has no Developer section
  await expect(tid(page, 'dev-toggle')).toHaveCount(0);
  await tid(page, 'hud-settings').click();
  await tid(page, 'settings-tab-about').click();
  await expect(tid(page, 'settings-version')).toBeVisible();
  await expect(tid(page, 'panel-settings').getByText('Developer tools')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // a registry fixture is a developer tool: the title screen instead
  await page.goto('./?dev=1&fixture=big_facility', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(tid(page, 'title-new-game')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Win).__AQ.summary().screen)).toBe('title');

  // so is a sandbox: the game renders, not the sandbox page
  await page.goto('./?dev=1&sandbox=audio-lab', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(tid(page, 'title-new-game')).toBeVisible();
  await expect(page.getByText('Loading sandbox')).toHaveCount(0);

  // chunk 15 (ADR-0051): the scenario lab is a developer tool: its addresses open the title screen, with no lab
  const recipe = Buffer.from(JSON.stringify({ version: 1, name: 'Nope', tanks: [{ name: 'T' }] })).toString('base64url');
  for (const q of ['./?dev=1&lab=1', './?dev=1&scenario=sandbox', `./?dev=1&recipe=${recipe}`]) {
    await page.goto(q, { waitUntil: 'domcontentloaded' });
    await ready(page);
    await expect(tid(page, 'title-new-game'), q).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as Win).__AQ.summary().screen), q).toBe('title');
    await expect(tid(page, 'lab-root')).toHaveCount(0);
    await expect(tid(page, 'title-lab')).toHaveCount(0); // the stored Developer tools switch is on, and still no lab
  }
  const fetched = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name));
  expect(fetched.filter((n) => /LabRoot|ScenarioLab|scenario/i.test(n))).toEqual([]);

  // a starter showcase is a plain demo world, never saved: it still opens
  await page.goto('./?showcase=betta', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(tid(page, 'hud-money')).toBeVisible();
});
