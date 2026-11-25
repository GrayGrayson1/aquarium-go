/**
 * chunk 22 (ADR-0058) — the guide's and the shared shop's friction, end to end (the play test of the first-hour guide
 * and of a shared shop, findings G-1 to G-8 in the chunk's brief):
 * - G-1: the guide's feed step puts the food down as it moves on, so a phone shows the next step's card (the prompt
 *   "Tap the water to drop …" hid it);
 * - G-2: a card the guide's own button opened ("Meet them", "Open the tank card") goes away a moment after its step
 *   is done (the animal's card after 8 s, the tank card after 3.5 s), so the next step's words show instead of its
 *   pill, with the done line; a card the player is using stays, by touch or by keyboard (the review of chunk 22,
 *   S1(a)), and one closed with focus inside it hands focus to the guide's button; a card the player closed and
 *   opened again is theirs (S1(b));
 * - G-3: the last step ends as Research opens: on a phone, where Research covers the finale, it turns to Quests;
 * - G-4: the axolotl's "Room to grow" brings Build's 40-gallon breeder into view, and the spotlight rings it;
 * - G-5: on a computer, with Build open beside the tank, the placing prompt starts right of the guide card;
 * - G-6 to G-8, in a shared shop on the stub server: a member who may not pause sees the speed buttons locked (a
 *   press still says why); the phone's pill says the shop is shared; the spending refusal's "Ask for money" opens Shop
 *   money.
 */
import { test, expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { aq, clickTank, openApp, quickGame, tid } from './helpers';

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

/** The guide card's step (null while it is folded into its pill, or gone). */
const cardStep = (page: Page) => page.evaluate(() => document.querySelector('section[data-testid="tutorial-card"]')?.getAttribute('data-step') ?? null);
const ui = (page: Page) => aq<{ tool: string; panel: string | null; selectedCreatureId: string | null }>(page, 'ui');

/** A new game with the guide on its first step (Tester's betta unless `starter`). */
async function guideGame(page: Page, starter = 'betta'): Promise<void> {
  await openApp(page);
  await aq(page, 'newGame', starter, 'Tester', 12345);
  await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen === 'game');
  await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'meet');
}

/** Move the guide on, step by step, to `id` (each step done by the sim's own advance). */
async function toStep(page: Page, id: string): Promise<void> {
  for (let i = 0; i < 14; i++) {
    const now = await cardStep(page);
    if (now === id) return;
    await aq(page, 'act', 'tutorialAdvance');
    await expect.poll(async () => { const s = await cardStep(page); return !!s && s !== now; }).toBe(true);
  }
  await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', id);
}

/** chunk 22 (G-2): how long the guide leaves the card its button opened, after the step (TutorialCoach's GUIDE_CARD_MS). */
const CARD_MS = { creature: 8000, tank: 3500 };

/**
 * Watch the page for a moment that may be brief (a done line shows for about 4 s): `pred` is checked every 100 ms in
 * the page from now on, and `seen` polls whether it has held at least once. (Polling the screen afterwards would race
 * the line's own timer on a busy machine.)
 */
async function watch(page: Page, key: string, pred: string): Promise<() => Promise<boolean>> {
  await page.evaluate(
    ([k, src]) => {
      const w = window as unknown as { __seen?: Record<string, boolean> };
      w.__seen ??= {};
      w.__seen[k] = false;
      // eslint-disable-next-line no-new-func
      const f = new Function(`return (${src});`) as () => boolean;
      const id = window.setInterval(() => {
        try {
          if (f()) {
            w.__seen![k] = true;
            window.clearInterval(id);
          }
        } catch {
          /* not yet */
        }
      }, 100);
    },
    [key, pred] as const,
  );
  return () => page.evaluate((k) => !!(window as unknown as { __seen?: Record<string, boolean> }).__seen?.[k], key);
}

/** The guide card shows `step` with a done line containing `text`, on screen (not hidden behind a prompt). */
const doneShown = (step: string, text: string) =>
  `(() => { const d = document.querySelector('section[data-testid="tutorial-card"][data-step="${step}"] .ag-coach__done'); const h = document.querySelector('.ag-hud__coach'); return !!d && d.textContent.includes(${JSON.stringify(text)}) && !!h && getComputedStyle(h).visibility === 'visible'; })()`;

/**
 * `sel` stays on screen for `ms` of the page's own time (a card the guide must leave alone, past its timer): checked
 * every 100 ms in the page, so a page that stalls for a moment (WebKit on a busy machine) neither fails it nor cuts the
 * time short, then asserted once.
 */
async function staysFor(page: Page, sel: string, ms: number): Promise<void> {
  const key = `stay${Math.random().toString(36).slice(2)}`;
  await page.evaluate(
    ([k, s2, span]) => {
      const w = window as unknown as { __stay?: Record<string, { start: number; gone: boolean }> };
      w.__stay ??= {};
      const rec = { start: performance.now(), gone: false };
      w.__stay[k] = rec;
      const id = window.setInterval(() => {
        const el = document.querySelector(s2);
        const r = el?.getBoundingClientRect();
        if (!el || !r || r.height < 2 || getComputedStyle(el).visibility === 'hidden') rec.gone = true;
        if (performance.now() - rec.start > span + 500) window.clearInterval(id);
      }, 100);
    },
    [key, sel, ms] as const,
  );
  const elapsed = () => page.evaluate((k) => performance.now() - (window as unknown as { __stay: Record<string, { start: number }> }).__stay[k].start, key);
  await expect.poll(elapsed, { timeout: ms + 60_000 }).toBeGreaterThanOrEqual(ms);
  expect(await page.evaluate((k) => (window as unknown as { __stay: Record<string, { gone: boolean }> }).__stay[k].gone, key), `${sel} went within ${ms} ms`).toBe(false);
  await expect(page.locator(sel)).toBeVisible();
}

const box = async (page: Page, sel: string) => page.locator(sel).first().boundingBox();
const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;

test.describe('The guide on a phone (390×844, touch)', () => {
  test.use(PHONE);

  test('G-1: one tap of food finishes the feed step, the food is put down and the next step’s card shows', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'feed');
    await tid(page, 'tool-feed').tap();
    await page.locator('[data-testid^="food-option-"]').first().tap();
    await expect.poll(async () => (await ui(page)).tool).toBe('feed');
    await expect(page.locator('.ag-toolhint')).toBeVisible();
    const sawDone = await watch(page, 'g1', doneShown('water', 'ate well'));
    // one tap on the water (a tap that lands on no water drops nothing: a little lower then)
    const fed = () => aq<{ tutorial: { step: number } }>(page, 'summary').then((s) => s.tutorial.step > 2);
    for (const fy of [0.42, 0.48, 0.36]) {
      await clickTank(page, true, 0.5, fy);
      if (await expect.poll(fed, { timeout: 4000 }).toBe(true).then(() => true, () => false)) break;
    }
    expect(await fed()).toBe(true);
    // the food is down, its prompt gone, and the water step's card is on screen (the prompt used to hide it)
    await expect.poll(async () => (await ui(page)).tool).toBe('none');
    await expect(page.locator('.ag-toolhint')).toHaveCount(0);
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'water');
    await expect(tid(page, 'tutorial-card')).toBeVisible();
    // and its done line was on screen (it used to show under the prompt, hidden with the card)
    await expect.poll(sawDone).toBe(true);
  });

  test('G-2: the card “Meet them” opened goes away a moment after the step, and the next step’s words show', async ({ page }) => {
    await guideGame(page);
    const sawDone = await watch(page, 'meet', `!document.querySelector('[data-testid="creature-card"]') && ${doneShown('camera', 'Nice to meet you')}`);
    await page.locator('[data-guide-showme]').tap(); // "Meet them": the starter's card
    await expect(tid(page, 'creature-card')).toBeVisible();
    // the step is done at once; under the card the guide is its pill, as before
    await expect(page.locator('.ag-coach-pill')).toContainText('Have a look around');
    // the card is the player's to read for a while (the review, S1(c): 8 s; it can't go sooner than that after this)
    await staysFor(page, '[data-testid="creature-card"]', 5000);
    // then it goes, and the guide shows the next step with the last one's done line
    await expect(tid(page, 'creature-card')).toBeHidden({ timeout: 20_000 });
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'camera');
    await expect.poll(sawDone).toBe(true);
    expect((await ui(page)).selectedCreatureId).toBeNull();
  });

  test('G-2: a card the player is using stays (the pill brings the guide back)', async ({ page }) => {
    await guideGame(page);
    await page.locator('[data-guide-showme]').tap();
    await expect(tid(page, 'creature-card')).toBeVisible();
    await expect(page.locator('.ag-coach-pill')).toBeVisible();
    await expect(page.locator('.ag-coach-pill')).toContainText('Have a look around'); // the step is done
    // a touch on the card once the step is done: the player is reading it, and it stays past the guide's 8 s
    await page.locator('[data-testid="creature-card"] .ag-chead__species').tap();
    await staysFor(page, '[data-testid="creature-card"]', CARD_MS.creature + 2000);
    await expect(page.locator('.ag-coach-pill')).toContainText('Have a look around');
  });

  test('G-2: on a slow phone too (CPU ×5), the card “Meet them” opened goes, its own focus move not counted as use', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chrome DevTools Protocol call: Chromium only');
    test.setTimeout(240_000);
    await guideGame(page);
    // (the confirmation review of chunk 22, 1: the card moves focus to its close button 60 ms after it opens, which a
    // slow phone runs 0.4 to 0.8 s late; that move was counted as the player using the card, and it never went)
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 5 });
    await page.locator('[data-guide-showme]').tap({ timeout: 30_000 }); // "Meet them"
    await expect(tid(page, 'creature-card')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.ag-coach-pill')).toContainText('Have a look around', { timeout: 30_000 });
    await expect(tid(page, 'creature-card')).toBeHidden({ timeout: 60_000 });
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'camera', { timeout: 30_000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('G-3: the last step’s “Open Research” finishes the guide and Research turns to Quests, where the reward is', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'preview');
    await page.locator('[data-guide-showme]').tap(); // "Open Research"
    await expect(tid(page, 'panel-research')).toBeVisible();
    await expect.poll(() => aq<{ tutorial: { done: boolean } }>(page, 'summary').then((s) => s.tutorial.done)).toBe(true);
    await expect(tid(page, 'research-tab-quests')).toHaveAttribute('aria-selected', 'true');
    // the finale waits for Research to close
    await tid(page, 'panel-close').tap();
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'finale');
  });

  test('G-4: the axolotl’s “Room to grow” brings the 40-gallon breeder into view and rings it', async ({ page }) => {
    await guideGame(page, 'axolotl');
    await toStep(page, 'upgrade');
    await page.locator('[data-guide-showme]').tap(); // "Open Build"
    await expect(tid(page, 'panel-build')).toBeVisible();
    const tier = page.locator('[data-testid="panel-build"] [data-tier-id="g40B"]');
    await expect(tier).toBeInViewport({ timeout: 10_000 });
    const ring = tid(page, 'guide-spotlight-ring');
    await expect
      .poll(async () => {
        const r = await ring.boundingBox().catch(() => null);
        const t = await tier.boundingBox();
        return !!r && !!t && r.x <= t.x + 1 && r.y <= t.y + 1 && r.x + r.width >= t.x + t.width - 1 && r.y + r.height >= t.y + t.height - 1;
      }, { timeout: 10_000 })
      .toBe(true);
  });
});

test.describe('The guide on a computer (1440×900)', () => {
  test('G-2: the tank card “Open the tank card” opened goes once the reading is read, and the habitat step shows', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'water');
    const sawDone = await watch(page, 'water', `!document.querySelector('[data-testid="tank-card"]') && ${doneShown('habitat', 'The water is in good shape.')}`);
    await page.locator('[data-guide-showme]').click(); // "Open the tank card"
    await expect(tid(page, 'tank-card')).toBeVisible();
    await expect(page.locator('.ag-coach-pill')).toBeVisible(); // the card folds the guide
    await expect(tid(page, 'tank-card')).toBeHidden({ timeout: 15_000 });
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'habitat');
    await expect.poll(sawDone).toBe(true);
  });

  test('G-2 (S1(a)): a keyboard player who moves in the tank card keeps it once the step is done', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'water');
    await page.locator('[data-guide-showme]').focus();
    await page.keyboard.press('Enter'); // "Open the tank card", from the keyboard
    await expect(tid(page, 'tank-card')).toBeVisible();
    const focusInCard = () => page.evaluate(() => !!document.activeElement?.closest('[data-testid="tank-card"]'));
    await expect.poll(focusInCard).toBe(true); // the card takes focus as it opens
    await expect(page.locator('.ag-coach-pill')).toContainText('A leaf to lounge on'); // the reading counted: done
    await page.keyboard.press('Tab'); // on through the card
    expect(await focusInCard()).toBe(true);
    await staysFor(page, '[data-testid="tank-card"]', CARD_MS.tank + 2000);
  });

  test('G-2: a keyboard player who moves in the tank card before the step is done keeps it too', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'water');
    await page.locator('[data-guide-showme]').focus();
    await page.keyboard.press('Enter'); // "Open the tank card"
    await expect(tid(page, 'tank-card')).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="tank-card"]'))).toBe(true);
    // (the confirmation review, 2) two Tabs while the reading is still to count (2.5 s), then nothing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect((await aq<{ tutorial: { step: number } }>(page, 'summary')).tutorial.step).toBe(3); // still the water step
    await expect(page.locator('.ag-coach-pill')).toContainText('A leaf to lounge on'); // the reading counted: done
    await staysFor(page, '[data-testid="tank-card"]', CARD_MS.tank + 2000);
  });

  test('G-2: a tap on the reading the step asks for is the step, not use: the card still goes', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'water');
    const sawDone = await watch(page, 'reading', `!document.querySelector('[data-testid="tank-card"]') && ${doneShown('habitat', 'The water is in good shape.')}`);
    await page.locator('[data-guide-showme]').click(); // "Open the tank card"
    await expect(tid(page, 'tank-card')).toBeVisible();
    await page.locator('[data-testid="tank-card"] [data-param="temp"]').first().click(); // the betta's: the temperature
    // (the re-check: on a slow machine the click can land after the reading has counted, and then it is use; say so)
    expect((await aq<{ tutorial: { step: number } }>(page, 'summary')).tutorial.step, 'the click landed while the water step was still to do').toBe(3);
    await expect(page.locator('.ag-coach-pill')).toContainText('A leaf to lounge on');
    await expect(tid(page, 'tank-card')).toBeHidden({ timeout: 15_000 });
    await expect.poll(sawDone).toBe(true);
  });

  test('G-2 (S1(a)): a card put away with focus inside it hands focus to the guide’s button, not the page', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'water');
    await page.locator('[data-guide-showme]').focus();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'tank-card')).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="tank-card"]'))).toBe(true);
    // no key once the step is done: the card goes, and focus lands on the guide card's own button ("Open Build")
    await expect(tid(page, 'tank-card')).toBeHidden({ timeout: 15_000 });
    await expect(tid(page, 'tutorial-card')).toHaveAttribute('data-step', 'habitat');
    await expect
      .poll(() => page.evaluate(() => { const a = document.activeElement; return a === document.body ? 'body' : a?.closest('section[data-testid="tutorial-card"]') ? (a.textContent ?? '').trim() : a?.tagName ?? 'none'; }))
      .toBe('Open Build');
  });

  test('G-2 (S1(b)): a tank card the player closed and opened again is theirs: the guide leaves it', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'water');
    await page.locator('[data-guide-showme]').click(); // "Open the tank card"
    await expect(tid(page, 'tank-card')).toBeVisible();
    // closed with T before the reading counts, then opened again from the tank bar
    await page.keyboard.press('t');
    await expect(tid(page, 'tank-card')).toBeHidden();
    expect((await aq<{ tutorial: { step: number } }>(page, 'summary')).tutorial.step).toBe(3); // still the water step
    await tid(page, 'tank-card-toggle').click();
    await expect(tid(page, 'tank-card')).toBeVisible();
    await expect(page.locator('.ag-coach-pill')).toContainText('A leaf to lounge on'); // the reading counted: done
    await staysFor(page, '[data-testid="tank-card"]', CARD_MS.tank + 2000);
  });

  test('G-5: with Build open beside the tank, the placing prompt starts right of the guide card', async ({ page }) => {
    await guideGame(page);
    await toStep(page, 'habitat');
    await page.locator('[data-guide-showme]').click(); // "Open Build", on its decor
    await expect(tid(page, 'panel-build')).toBeVisible();
    await page.locator('[data-testid="panel-build"] .pn-decor.is-suggested').first().click();
    await expect.poll(async () => (await ui(page)).tool).toBe('decor_place');
    const hint = page.locator('.ag-toolhint');
    await expect(hint).toBeVisible();
    await expect(page.locator('.ag-hud__coach .ag-coach')).toBeVisible();
    await expect
      .poll(async () => {
        const h = await box(page, '.ag-toolhint');
        const c = await box(page, '.ag-hud__coach .ag-coach');
        const p = await box(page, '[data-testid="panel-build"]');
        return !!h && !!c && !!p && !overlap(h, c) && h.x + h.width <= p.x + 1;
      })
      .toBe(true);
  });
});

// ───────────── G-6 to G-8: a shared shop on the stub server (never the live one) ─────────────
// As tests/e2e/shared-shop.spec.ts: two contexts signed in to the local Social stub, on the stub shop server the full
// Playwright config starts. A club of its own per browser project, the one shared-shop.spec's deletion case plays last
// (its first step opens a shop that is already there).

const SOCIAL_KEY = 'aquarium-go.social.v1';
const clubFor = (info: TestInfo): string => (info.project.name === 'webkit' ? 'nano-tank' : 'reef-starter');
type Visit = { you: { id: string } | null; members: { id: string; here: boolean; pause: boolean }[]; shopName: string };
const contexts: BrowserContext[] = [];

async function player(browser: Browser, name: string, club: string, opts: { owner?: boolean; phone?: boolean } = {}): Promise<Page> {
  const ctx = await browser.newContext(opts.phone ? PHONE : { viewport: { width: 1440, height: 900 } });
  contexts.push(ctx);
  const record = { email: `${name.toLowerCase()}@example.com`, displayName: name, joinedClubIds: [club], joinedMonths: { [club]: '2026-10' }, ...(opts.owner ? { owner: true } : {}) };
  await ctx.addInitScript(
    ([key, value]) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value);
        localStorage.setItem('aquarium-go.notify.v1', JSON.stringify({ quietHours: false }));
        // (a phone's HUD fades after a few quiet seconds, and its speed buttons with it)
        localStorage.setItem('aquarium-go.ui-prefs.v1', JSON.stringify({ calmHud: false }));
      } catch {
        /* ignore */
      }
    },
    [SOCIAL_KEY, JSON.stringify(record)] as const,
  );
  const page = await ctx.newPage();
  await openApp(page);
  await quickGame(page, 'betta');
  await aq(page, 'act', 'tutorialSkip');
  return page;
}

const visit = (page: Page) => aq<Visit>(page, 'shared.visit');

/** Nothing lies over the element's middle (a sheet or card still fading out). */
const onTop = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el?.getBoundingClientRect();
    return !!el && !!r && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  }, sel);

async function inShop(page: Page): Promise<void> {
  await expect(tid(page, 'shared-strip')).toBeVisible({ timeout: 90_000 });
  const ok = tid(page, 'shared-first-time-ok');
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

async function openClubCard(page: Page, club: string): Promise<void> {
  await page.evaluate(() => void (location.hash = '#/social/clubs'));
  await expect(tid(page, `shared-card-${club}`)).toBeVisible({ timeout: 30_000 });
}

/** The owner opens the club's shop, making it first through the new-game screens when there is none yet. */
async function ownerOpens(page: Page, club: string): Promise<void> {
  await openClubCard(page, club);
  const card = tid(page, `shared-card-${club}`);
  await expect(card.getByTestId('shared-create').or(card.getByTestId('shared-open'))).toBeVisible({ timeout: 30_000 });
  if (await card.getByTestId('shared-open').isVisible()) {
    await card.getByTestId('shared-open').click();
  } else {
    await card.getByTestId('shared-create').click();
    await expect(page.getByText('New shared shop').first()).toBeVisible({ timeout: 20_000 });
    await tid(page, 'starter-card-betta').click();
    await tid(page, 'starter-confirm').click();
    await tid(page, 'name-input').fill('Sapphire');
    await tid(page, 'name-confirm').click();
  }
  await inShop(page);
}

async function memberOpens(page: Page, club: string): Promise<void> {
  await openClubCard(page, club);
  const open = tid(page, `shared-card-${club}`).getByTestId('shared-open');
  await expect(open).toBeVisible({ timeout: 30_000 });
  await open.tap();
  await inShop(page);
}

test.describe('A shared shop: a member on a phone (390×844, touch)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterEach(async () => {
    for (const c of contexts.splice(0)) await c.close().catch(() => {});
  });

  test('G-6, G-7, G-8: speed locked for a member, the phone pill says it is shared, and the spending refusal opens Shop money', async ({ browser }, info) => {
    test.setTimeout(360_000);
    const club = clubFor(info);
    const ola = await player(browser, 'Ola', club, { owner: true });
    await ownerOpens(ola, club);
    const ben = await player(browser, 'Ben', club, { phone: true });
    await memberOpens(ben, club);
    const benId = (await visit(ben)).you!.id;
    await expect.poll(async () => (await visit(ola)).members.find((m) => m.id === benId)?.here, { timeout: 20_000 }).toBe(true);
    const shop = (await visit(ben)).shopName;
    expect(shop.length).toBeGreaterThan(0);

    await test.step('G-6: the speed buttons are drawn locked, with the reason; a press still says why', async () => {
      const why = 'Only Ola and the people they choose can pause or change the speed.';
      for (const s of [0, 1, 3, 10]) {
        const b = tid(ben, `hud-speed-${s}`);
        await expect(b).toHaveAttribute('aria-disabled', 'true');
        await expect(b).toHaveAttribute('title', new RegExp(`${why.replace(/\./g, '\\.')}$`));
        await expect(b).toHaveAttribute('aria-label', new RegExp(`${why.replace(/\./g, '\\.')}$`));
      }
      // (Playwright won't press what is marked aria-disabled, so the tap is forced, once nothing lies over the button: a
      // player's tap reaches it)
      await expect.poll(() => onTop(ben, '[data-testid="hud-speed-0"]')).toBe(true);
      await tid(ben, 'hud-speed-0').tap({ force: true });
      await expect(ben.getByText(why)).toBeVisible();
      // the owner's are as before
      await expect(tid(ola, 'hud-speed-0')).not.toHaveAttribute('aria-disabled', 'true');
    });

    await test.step('G-7: the phone pill says it is shared, and fits the top bar at 390 and 360 px', async () => {
      // (no shop or club name fits beside the speed buttons: a short tag, the name in the pill's label)
      await expect(tid(ben, 'shared-pill-tag')).toHaveText('Shared');
      await expect(tid(ben, 'shared-strip')).toHaveAttribute('aria-label', new RegExp(`^Shared shop: ${shop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\. `));
      for (const width of [390, 360]) {
        await ben.setViewportSize({ width, height: 844 });
        await ben.waitForTimeout(400);
        const b = await ben.evaluate(() => {
          const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
          const pill = r('.ag-topbar .ag-shared-pill');
          const speed = r('.ag-topbar .ag-speed');
          // (the buttons themselves: they keep their least width and can run out of the speed pill's box)
          const fast = r('[data-testid="hud-speed-10"]');
          return { pill: pill.right, pillH: pill.height, speedL: Math.min(speed.left, r('[data-testid="hud-speed-0"]').left), speedR: Math.max(speed.right, fast.right), money: r('[data-testid="hud-money"]').left, bell: r('[data-testid="hud-alerts"]').right };
        });
        expect(b.pill, `at ${width}`).toBeLessThanOrEqual(b.speedL);
        expect(b.speedR, `at ${width}`).toBeLessThanOrEqual(b.money);
        expect(b.bell, `at ${width}`).toBeLessThanOrEqual(width);
        expect(b.pillH, `at ${width}`).toBeLessThanOrEqual(48);
      }
      await ben.setViewportSize({ width: 390, height: 844 });
    });

    await test.step('G-8: on Asks first, a purchase is refused with “Ask for money”, which opens Shop money', async () => {
      if (!(await tid(ola, 'shared-menu').isVisible().catch(() => false))) await tid(ola, 'shared-strip').click();
      await tid(ola, `shared-tier-${benId}-ask`).click();
      await expect.poll(async () => (await aq(ben, 'game')).pool?.members?.[benId]?.tier, { timeout: 10_000 }).toBe('ask');
      await ola.keyboard.press('Escape');
      const food = Object.keys((await aq(ben, 'game')).inventory.foods)[0];
      await ben.evaluate((f) => void (location.hash = `#/market/supplies/${f}`), food);
      const row = tid(ben, `supplies-row-${food}`);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await row.getByRole('button', { name: /^Buy/ }).tap();
      const toast = ben.locator('[data-testid="toast"]', { hasText: /^That costs \$[\d,.]+, and you can spend \$0\. Ask for more in Money\./ });
      await expect(toast).toBeVisible({ timeout: 15_000 });
      const ask = toast.getByTestId('toast-action');
      await expect(ask).toHaveText('Ask for money');
      await ask.tap();
      await expect(tid(ben, 'shared-money-sheet')).toBeVisible();
      await expect(tid(ben, 'shared-money-can')).toHaveText('You can spend $0.');
      await ben.keyboard.press('Escape');
      // back to Spends freely, as the shop was
      if (!(await tid(ola, 'shared-menu').isVisible().catch(() => false))) await tid(ola, 'shared-strip').click();
      await tid(ola, `shared-tier-${benId}-free`).click();
      await expect.poll(async () => (await aq(ben, 'game')).pool?.members?.[benId]?.tier ?? 'free', { timeout: 10_000 }).toBe('free');
    });
  });
});
