/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6, §8.2; ADR-0040, ADR-0041; REL-029, REL-031) — the online save and
 * Settings › Account against the local stub, which plays "another device" through its dev hooks (`social.setCloud`,
 * `social.cloud`, `social.cloudSyncNow`, `social.cloudCheck`): signed in, the game goes online; a newer copy online
 * opens "A newer save is online" and Load makes it the game, this device's copy kept as "Previous autosave"; both
 * changed → Keep this device's puts this device's copy online; a different aquarium has its own title; a newer build's
 * online save blocks sending and the Account line says so; Account signed out and in, Sign out, and Delete my account
 * (the stub is cleared, the game stays). No test here reaches a real server (VITE_SOCIAL_STUB, REL-025). Chunk 9 (B2,
 * REL-035): a second tab hears of a sign-out and a sign-in as someone else in the first, without a reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, collectErrors } from './helpers';

type Meta = { revision: number; saveId: string; schemaVersion: number; savedAt: number; hour: number; shopName: string; day: number; money: number };
type Cloud = { meta: Meta; encoding: string; text: string } | null;

const go = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const toast = (page: Page, text: string | RegExp) => page.locator('[data-testid="toast"]').filter({ hasText: text });
const cloud = (page: Page) => aq<Cloud>(page, 'social.cloud');
const box = (page: Page) => tid(page, 'cloud-prompt');

async function signIn(page: Page, email = 'you@example.com'): Promise<void> {
  await go(page, '#/social');
  await tid(page, 'social-email').fill(email);
  await tid(page, 'social-password').fill('password1');
  await tid(page, 'social-signin').click();
  await expect(tid(page, 'panel-social').getByText(`Signed in as ${email}`)).toBeVisible();
  await tid(page, 'panel-close').click();
}

/**
 * Another device writes the online save: this game's export text with `patch` applied to its state (the same aquarium
 * unless `saveId` is given), one revision on from what the stub holds; then this device checks.
 */
async function otherDevice(page: Page, patch: { shopName?: string; money?: number; hours?: number; saveId?: string; schemaBump?: number }): Promise<void> {
  await page.evaluate(async (p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = (window as any).__AQ;
    const c = await A.social.cloud();
    const o = JSON.parse(A.exportText());
    if (p.shopName) o.state.shopName = o.meta.shopName = p.shopName;
    if (p.money !== undefined) o.state.finance.money = p.money;
    if (p.hours) o.state.clock.hour += p.hours;
    if (p.saveId) o.state.saveId = o.meta.saveId = p.saveId;
    const meta = {
      revision: (c?.meta.revision ?? 0) + 1,
      saveId: o.state.saveId,
      schemaVersion: o.state.schemaVersion + (p.schemaBump ?? 0),
      savedAt: Date.now() - 60_000,
      hour: o.state.clock.hour,
      shopName: o.state.shopName,
      day: Math.floor(o.state.clock.hour / 24) + 1,
      money: o.state.finance.money,
    };
    A.social.setCloud(meta, JSON.stringify(o));
    await A.social.cloudCheck();
  }, patch);
}

test.describe('the online save (the stub, desktop 1440×900)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
    await aq(page, 'dev.setSpeed', 0); // nothing moves on its own (no catch-up surprises in the money)
    // no autosave landing mid-test: only the test's own saves count as this device's play (manual saves still go online)
    await page.evaluate(() => (window as unknown as { __AQ: { settings(): { update(p: { autosave: boolean }): void } } }).__AQ.settings().update({ autosave: false }));
  });

  test('signed in, the game goes online; a newer copy online → Load → that copy is the game, this one “Previous autosave”', async ({ page }) => {
    const errors = collectErrors(page);
    const mine = await page.evaluate(() => (window as unknown as { __AQ: { state(): { saveId: string; shopName: string } } }).__AQ.state());
    await signIn(page);
    await aq(page, 'social.cloudSyncNow');
    const sent = await cloud(page);
    expect(sent?.meta).toMatchObject({ saveId: mine.saveId, shopName: mine.shopName, day: 1 });
    const r0 = sent!.meta.revision; // 1 or 2: signing in sends at once, and cloudSyncNow may send once more
    expect(JSON.parse(sent!.text).state.saveId).toBe(mine.saveId); // an export file's text
    expect(['gzip-base64', 'json']).toContain(sent!.encoding);

    await otherDevice(page, { shopName: 'Elsewhere Reef', money: 99_999, hours: 30 });
    await expect(box(page).getByRole('heading', { name: 'A newer save is online' })).toBeVisible();
    await expect(tid(page, 'cloud-card-device')).toHaveText(new RegExp(`^On this device · ${mine.shopName} · Day 1 · \\$[\\d,]+ · saved .+$`));
    await expect(tid(page, 'cloud-card-online')).toHaveText(/^Online · Elsewhere Reef · Day 2 · \$99,999 · saved 1 min ago$/);
    await expect(box(page)).toContainText('If you load the online save, this device’s copy stays in Settings › Saves as Previous autosave.');
    // it doesn't close without a choice
    await expect(box(page).locator('[aria-label="Close"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(box(page)).toBeVisible();

    await tid(page, 'cloud-load').click();
    await expect(box(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __AQ: { state(): { shopName: string } } }).__AQ.state().shopName)).toBe('Elsewhere Reef');
    const now = await page.evaluate(() => (window as unknown as { __AQ: { state(): { saveId: string; finance: { money: number } } } }).__AQ.state());
    expect(now.saveId).toBe(mine.saveId);
    expect(now.finance.money).toBe(99_999);
    // this device's copy is in Settings › Saves as "Previous autosave"
    await tid(page, 'hud-settings').click();
    await tid(page, 'settings-tab-saves').click();
    await expect(tid(page, 'panel-settings').getByText('Previous autosave')).toBeVisible();
    // and the next send goes over the loaded revision
    await aq(page, 'social.cloudSyncNow');
    expect((await cloud(page))?.meta).toMatchObject({ revision: r0 + 2, shopName: 'Elsewhere Reef' });
    expect(errors).toEqual([]);
  });

  test('both changed → “Your aquarium changed on two devices” → Keep this device’s puts this copy online', async ({ page }) => {
    await signIn(page);
    await aq(page, 'social.cloudSyncNow');
    const r0 = (await cloud(page))!.meta.revision;
    await aq(page, 'save', 'auto'); // this device saves after it synced
    await otherDevice(page, { shopName: 'Other Device', hours: 5 });
    await expect(box(page).getByRole('heading', { name: 'Your aquarium changed on two devices' })).toBeVisible();
    await expect(tid(page, 'cloud-keep')).toHaveText('Keep this device’s');
    await expect(tid(page, 'cloud-load')).toHaveText('Load online save');
    await tid(page, 'cloud-keep').click();
    await expect(box(page)).toHaveCount(0);
    await expect.poll(async () => (await cloud(page))?.meta.revision).toBe(r0 + 2);
    const held = await cloud(page);
    expect(JSON.parse(held!.text).state.shopName).not.toBe('Other Device');
    expect(held!.meta.shopName).not.toBe('Other Device');
  });

  test('a different aquarium online has its own title', async ({ page }) => {
    await signIn(page);
    await aq(page, 'social.cloudSyncNow');
    await otherDevice(page, { saveId: 'save_elsewhere_1', shopName: 'Far Away' });
    await expect(box(page).getByRole('heading', { name: 'Your account has a different aquarium online' })).toBeVisible();
    await expect(tid(page, 'cloud-card-online')).toContainText('Online · Far Away · Day 1');
  });

  test('a newer build’s online save: nothing is sent, and Settings › Account says so (PERSIST-014)', async ({ page }) => {
    await signIn(page);
    await aq(page, 'social.cloudSyncNow');
    await otherDevice(page, { schemaBump: 1, shopName: 'From The Future' });
    await expect(box(page)).toHaveCount(0);
    const held = await cloud(page);
    await aq(page, 'save', 'auto');
    await aq(page, 'social.cloudSyncNow');
    expect(await cloud(page)).toEqual(held); // nothing sent over it
    await go(page, '#/settings/account');
    await expect(tid(page, 'account-online')).toHaveText('Your online save comes from a newer version of Aquarium Go. Refresh the page to update.');
  });
});

test.describe('Settings › Account (the stub)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
  });

  test('signed out, signed in, Sign out, and Delete my account (the stub cleared, the game stays)', async ({ page }) => {
    const errors = collectErrors(page);
    await go(page, '#/settings/account');
    await expect(tid(page, 'settings-tab-account')).toHaveAttribute('aria-selected', 'true');
    await expect(tid(page, 'account-signed-out')).toHaveText('Sign in from Social to save your aquarium online and see friends.');
    await tid(page, 'account-open-social').click();
    await expect(tid(page, 'panel-social')).toBeVisible();
    await tid(page, 'social-email').fill('sam@example.com');
    await tid(page, 'social-password').fill('password1');
    await tid(page, 'social-signin').click();
    await expect(tid(page, 'panel-social').getByText('Signed in as sam@example.com')).toBeVisible();

    await go(page, '#/settings/account');
    await expect(tid(page, 'account-who')).toHaveText('Signed in as sam@example.com');
    await expect(tid(page, 'account-name')).toHaveText(/^Name friends see: sam · Friend code SAM-[A-Z0-9]{3}$/);
    await expect(tid(page, 'account-online')).toHaveText(/^Saved online (just now|1 min ago)$/, { timeout: 20_000 }); // the loop sent it
    // the privacy note from here too
    await tid(page, 'account-privacy').click();
    await expect(tid(page, 'social-privacy')).toContainText('Your account and your data');
    await tid(page, 'social-privacy-close').click();

    // Sign out: the line again; the device keeps its game
    await tid(page, 'account-signout').click();
    await expect(tid(page, 'account-signed-out')).toBeVisible();

    // in again, then Delete my account: asked first; Cancel keeps it
    await tid(page, 'account-open-social').click();
    await tid(page, 'social-email').fill('sam@example.com');
    await tid(page, 'social-password').fill('password1');
    await tid(page, 'social-signin').click();
    await expect(tid(page, 'panel-social').getByText('Signed in as sam@example.com')).toBeVisible();
    await aq(page, 'social.cloudSyncNow');
    expect(await cloud(page)).not.toBeNull();
    await go(page, '#/settings/account');
    await tid(page, 'account-delete').click();
    const confirm = tid(page, 'account-delete-confirm');
    await expect(confirm.getByRole('heading', { name: 'Delete your account?' })).toBeVisible();
    await expect(confirm).toContainText('This removes your account, online save, friends and clubs from Aquarium Go’s server. The game on this device stays.');
    await tid(page, 'account-delete-cancel').click();
    await expect(confirm).toHaveCount(0);
    await expect(tid(page, 'account-who')).toBeVisible();
    await tid(page, 'account-delete').click();
    await tid(page, 'account-delete-yes').click();
    const done = toast(page, 'Account deleted');
    await expect(done).toContainText('Your game is still on this device.');
    await expect(tid(page, 'account-signed-out')).toBeVisible();
    expect(await page.evaluate(() => [localStorage.getItem('aquarium-go.social.v1'), localStorage.getItem('aquarium-go.social.cloud.v1')])).toEqual([null, null]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aquarium-go.cloud.v1') ?? '{"accounts":{}}').accounts)).toEqual({});
    // the game is still here
    await expect(tid(page, 'hud-money')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __AQ: { summary(): { hasGame: boolean } } }).__AQ.summary().hasGame)).toBe(true);
    expect(errors).toEqual([]);
  });
});

test.describe('chunk 9 (B2, REL-035): two tabs, one device', () => {
  test('signing out and in as someone else in one tab: the other tab follows, without a reload', async ({ page, context }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'autosave');
    await signIn(page, 'you@example.com');
    const other = await context.newPage();
    const otherErrors = collectErrors(other);
    await openApp(other);
    expect((await aq<{ ok: boolean }>(other, 'continueGame')).ok).toBe(true); // a second tab on the same aquarium
    await expect(tid(other, 'hud-money')).toBeVisible();
    await go(other, '#/settings/account');
    await expect(tid(other, 'account-who')).toHaveText('Signed in as you@example.com');

    // tab 1: Sign out, then sign in as someone else
    await go(page, '#/settings/account');
    await tid(page, 'account-signout').click();
    await expect(tid(page, 'account-signed-out')).toBeVisible();
    await expect(tid(other, 'account-signed-out')).toBeVisible(); // tab 2 heard the sign-out
    await signIn(page, 'kim@example.com');
    await expect(tid(other, 'account-who')).toHaveText('Signed in as kim@example.com'); // and who is signed in now
    expect(errors).toEqual([]);
    expect(otherErrors).toEqual([]);
  });
});
