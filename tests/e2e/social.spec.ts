/**
 * lane:social (chunk 6; 0.5 spec §13, §21 Phase 4's bar; SOC-003 to SOC-010, DES-010; ADR-0028, ADR-0034) — the Social
 * stub in dev mode (ADR-0005 decision 3; the production checks are in prod-mode.spec.ts): #/social/join/HIGHLAND-4821
 * signed out, then signed in, then joined; expired and already-used invites; the sign-in errors; a boot from the link;
 * the tabs and their routes; the trade note, Add friend, the leaderboards; the network error while the game keeps
 * running; skeletons, still under reduced motion; the dock's dot.
 * Chunk 8 (ADR-0039 to ADR-0041; REL-028, REL-030; ONLINE-STAGE1.md §8.2): sign-up needs a working code, a name and
 * the age box, and lands in that club; the privacy note opens and closes; a friend request accepted; the owner creates
 * a club and copies its invite link (the stub's owner hook); the join text and trades note as approved.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid, devUrl, collectErrors } from './helpers';

const toast = (page: Page, text: string | RegExp) => page.locator('[data-testid="toast"]').filter({ hasText: text });
const hash = (page: Page) => page.evaluate(() => location.hash);
const go = (page: Page, h: string) => page.evaluate((x) => void (location.hash = x), h);
const panel = (page: Page) => tid(page, 'panel-social');

async function signIn(page: Page, email = 'you@example.com', password = 'password1'): Promise<void> {
  await tid(page, 'social-email').fill(email);
  await tid(page, 'social-password').fill(password);
  await tid(page, 'social-signin').click();
  await expect(panel(page).getByText(`Signed in as ${email}`)).toBeVisible();
}

test.describe('Social (dev mode, desktop 1440×900)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
  });

  test('#/social/join/HIGHLAND-4821 works signed out, then signed in, then joined', async ({ page }) => {
    const errors = collectErrors(page);
    await go(page, '#/social/join/HIGHLAND-4821');
    await expect(panel(page)).toBeVisible();
    // signed out: the aqua invite callout above the sign-in form (§13.3), no tabs
    await expect(tid(page, 'social-invite-callout')).toHaveText('You’re invited to Highland Betta ClubSign in or create an account to join. Your game stays on this device either way.');
    await expect(panel(page).getByText('Bring your aquarium online')).toBeVisible();
    await expect(panel(page).getByRole('tablist')).toHaveCount(0);
    expect(await hash(page)).toBe('#/social/join/HIGHLAND-4821');

    // the validation error (§13.2), announced
    await tid(page, 'social-email').fill('you@example');
    await tid(page, 'social-password').fill('short');
    await tid(page, 'social-signin').click();
    await expect(tid(page, 'social-error')).toHaveText('Enter your email and a password of at least 8 characters.');
    await expect(tid(page, 'social-error')).toHaveAttribute('role', 'alert');

    // signed in: the toast, then the join card, Clubs highlighted (the approved screen phone-join)
    await signIn(page);
    await expect(toast(page, 'Signed in')).toContainText('you@example.com');
    await expect(toast(page, 'Signed in')).toContainText('Your aquarium still saves on this device.');
    const card = tid(page, 'social-join-card');
    await expect(card.getByRole('heading', { name: 'Join Highland Betta Club?' })).toBeVisible();
    await expect(card).toContainText('Invite HIGHLAND-4821 · 128 members · club show on Saturday');
    await expect(card).toContainText('Members see each other’s aquariums and share a leaderboard.'); // chunk 8 (ADR-0040 decision 4)
    await expect(tid(page, 'social-not-now')).toHaveText('Not now');
    await expect(tid(page, 'social-tab-clubs')).toHaveAttribute('aria-selected', 'true');
    expect(await hash(page)).toBe('#/social/join/HIGHLAND-4821');

    // joined: Social › Clubs and the celebration
    await tid(page, 'social-join-club').click();
    await expect.poll(() => hash(page)).toBe('#/social/clubs');
    const welcome = toast(page, 'You joined Highland Betta Club');
    await expect(welcome).toContainText('Welcome');
    await expect(welcome).toContainText('Club show on Saturday — entries close Friday.');
    const month = await page.evaluate(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()]);
    await expect(tid(page, 'social-club-highland-betta').first()).toContainText(`128 members · you joined in ${month}`);
    await expect(tid(page, 'social-club-highland-betta').first()).toContainText('Club show on Saturday · 12 entries so far');

    // the same invite again: already used, with Open club
    await go(page, '#/social/join/HIGHLAND-4821');
    await expect(tid(page, 'social-invite-member')).toContainText('You’re in Highland Betta Club');
    await expect(tid(page, 'social-invite-member')).toContainText('This invite has already been used on your account.');
    await tid(page, 'social-invite-member').getByRole('button', { name: 'Open club' }).click();
    await expect.poll(() => hash(page)).toBe('#/social/clubs');

    // membership lives on the device, outside the save
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aquarium-go.social.v1') ?? 'null'))).toMatchObject({ email: 'you@example.com', joinedClubIds: ['highland-betta'] });
    // the club strip's Enter opens Shows (§13.4)
    await tid(page, 'social-club-highland-betta').first().getByRole('button', { name: 'Enter' }).click();
    await expect.poll(() => hash(page)).toBe('#/shows');
    await expect(tid(page, 'panel-shows')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('expired codes, the invite field and Not now', async ({ page }) => {
    await go(page, '#/social/join/NOPE-0000');
    const expired = tid(page, 'social-invite-expired');
    await expect(expired).toContainText('This invite has expired');
    await expect(expired).toContainText('Ask the club for a new code, or browse clubs you can join right away.');
    await expired.getByRole('button', { name: 'Find clubs' }).click();
    await expect.poll(() => hash(page)).toBe('#/social/clubs');
    // signed out, Clubs is the sign-in form; its invite field rejects an unknown code and opens a good one
    await tid(page, 'social-invite-code').fill('REEF-1234');
    await tid(page, 'social-invite-join').click();
    await expect(tid(page, 'social-error')).toHaveText('That invite code didn’t match a club. Check it and try again.');
    await tid(page, 'social-invite-code').fill('highland-4821');
    await tid(page, 'social-invite-join').click();
    await expect.poll(() => hash(page)).toBe('#/social/join/HIGHLAND-4821');
    await expect(tid(page, 'social-invite-callout')).toBeVisible();
    await signIn(page);
    await tid(page, 'social-not-now').click();
    await expect.poll(() => hash(page)).toBe('#/social');
    await expect(tid(page, 'social-overview')).toBeVisible();
    // signed in, an expired code is the same empty state
    await go(page, '#/social/join/OLD-1999');
    await expect(tid(page, 'social-invite-expired')).toBeVisible();
  });

  test('the tabs, their routes, the trade note, Add friend, leaderboards and Sign out', async ({ page }) => {
    await aq(page, 'dev.setSpeed', 0);
    await go(page, '#/social');
    await signIn(page);
    // Overview: four cards; header links open the tabs
    await expect(tid(page, 'social-your-club')).toContainText('No club yet');
    await expect(tid(page, 'social-trading-card').getByRole('button', { name: 'View' })).toHaveCount(3);
    await expect(tid(page, 'social-friends-card').locator('img')).toHaveCount(3);
    await expect(tid(page, 'social-leaderboard')).toContainText('This week’s leaderboard');
    for (const [tab, h] of [['clubs', '#/social/clubs'], ['trading', '#/social/trading'], ['friends', '#/social/friends'], ['leaderboards', '#/social/leaderboards'], ['overview', '#/social']] as const) {
      await tid(page, `social-tab-${tab}`).click();
      await expect.poll(() => hash(page)).toBe(h);
    }
    for (const [h, tab] of [['#/social/trading', 'trading'], ['#/social/leaderboards', 'leaderboards'], ['#/social/friends', 'friends'], ['#/social/clubs', 'clubs']] as const) {
      await go(page, h);
      await expect(tid(page, `social-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
    }

    // Clubs: search, no match, Join → Joined with a toast
    await tid(page, 'social-search').fill('reefs galore');
    await expect(tid(page, 'social-nomatch')).toHaveText('No clubs match “reefs galore”. Check the spelling, or paste an invite code.');
    await tid(page, 'social-search').fill('nano');
    await expect(page.locator('[data-testid^="social-club-join-"]')).toHaveCount(1);
    await tid(page, 'social-club-join-nano-tank').click();
    await expect(tid(page, 'social-club-join-nano-tank')).toHaveText('Joined');
    await expect(toast(page, 'You joined Nano Tank Collective')).toBeVisible();
    // chunk 6: "Your club" lists it at once (it said "No club yet" until the tab remounted)
    await expect(page.locator('.so-card--plain [data-testid="social-club-nano-tank"]')).toBeVisible();
    // pasting a code and pressing Enter opens the invite
    await tid(page, 'social-search').fill('HIGHLAND-4821');
    await tid(page, 'social-search').press('Enter');
    await expect.poll(() => hash(page)).toBe('#/social/join/HIGHLAND-4821');

    // Trading: the coral hero; Offer a trade and View open the coming-soon note and change nothing
    await go(page, '#/social/trading');
    const before = await page.evaluate(() => (window as unknown as { __AQ: { query?: unknown; game(): unknown } }).__AQ.game());
    await tid(page, 'social-offer-trade').click();
    const note = tid(page, 'social-soon');
    await expect(note).toContainText('Trades open later');
    await expect(note).toContainText('Trading isn’t open yet. Nothing was offered, and your animals stay in your aquarium.'); // chunk 8 (ADR-0040 decision 4)
    await tid(page, 'social-soon-close').click();
    await expect(note).toHaveCount(0);
    await tid(page, 'social-trading').getByRole('button', { name: 'View' }).first().click();
    await expect(note).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(note).toHaveCount(0);
    await expect(panel(page)).toBeVisible(); // Escape closed one layer
    expect(await page.evaluate(() => (window as unknown as { __AQ: { game(): unknown } }).__AQ.game())).toEqual(before);

    // Friends: three columns on a desktop, the note, Add friend's error and its toast
    await go(page, '#/social/friends');
    const tiles = tid(page, 'social-friend-grid').locator('li');
    await expect(tiles).toHaveCount(6);
    const xs = await tiles.evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))]);
    expect(xs).toHaveLength(3);
    await expect(tid(page, 'social-friends')).toContainText('Visits are read-only snapshots: friends see your tanks as they were when you last went online.');
    await tid(page, 'social-friend-code').fill('hello');
    await tid(page, 'social-add-friend').click();
    await expect(tid(page, 'social-error')).toHaveText('That friend code didn’t match anyone. Check it and try again.');
    await tid(page, 'social-friend-code').fill('myaqua-7q2');
    await tid(page, 'social-add-friend').click();
    const sent = toast(page, 'Request sent');
    await expect(sent).toContainText('MYAQUA-7Q2');
    await expect(sent).toContainText('Their aquarium shows here once they accept.');

    // Leaderboards: a radio group of three; the top four and the player's own row
    await go(page, '#/social/leaderboards');
    const lb = tid(page, 'social-leaderboard');
    await expect(lb.getByRole('radiogroup')).toBeVisible();
    await expect(tid(page, 'social-lb-collection_value')).toHaveAttribute('aria-checked', 'true');
    await expect(lb.locator('.so-lb__row').first()).toContainText('Ada Okafor$214,900');
    await expect(tid(page, 'social-lb-me')).toContainText('You · My Aquarium');
    await tid(page, 'social-lb-prismatics').click();
    await expect(lb.locator('.so-lb__row').first()).toContainText('Priya Nair4 Prismatic');
    await tid(page, 'social-lb-prismatics').focus(); // the checked option is the one Tab reaches
    await page.keyboard.press('ArrowRight'); // arrow keys move the choice, as in any radio group (§18)
    await expect(tid(page, 'social-lb-show_wins')).toHaveAttribute('aria-checked', 'true');
    await expect(tid(page, 'social-lb-show_wins')).toBeFocused();
    await expect(lb.locator('.so-lb__row').first()).toContainText('Sam Duarte9 wins');
    await expect(tid(page, 'social-lb-me')).toContainText('0 wins');

    // the overview has two columns when the desktop panel is maximised
    await go(page, '#/social');
    await panel(page).getByRole('button', { name: 'Expand panel' }).click();
    const cols = tid(page, 'social-overview').locator('.so-col');
    await expect(cols).toHaveCount(2);
    await expect.poll(() => cols.evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size)).toBe(1);

    // Sign out returns Social to the signed-out view. The overview's cards load first (the stub answers in 300–600 ms):
    // their content replacing the skeletons moves Sign out down, and a click mid-swap missed it (WebKit, 0.9.0's pass)
    await expect(tid(page, 'social-your-club')).toContainText('Nano Tank Collective');
    await expect(tid(page, 'social-trading-card').getByRole('button', { name: 'View' })).toHaveCount(3);
    await expect(tid(page, 'social-friends-card').locator('img')).toHaveCount(3);
    await expect(tid(page, 'social-lb-me')).toBeVisible();
    await tid(page, 'social-signout').click();
    await expect(panel(page).getByText('Bring your aquarium online')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('aquarium-go.social.v1'))).toBeNull();
  });

  test('a boot from the invite link shows “Then: Social › Club invite”, then the invite', async ({ page, context }) => {
    expect(await aq<boolean>(page, 'autosave')).toBe(true);
    const fresh = await context.newPage();
    await fresh.addInitScript(() => {
      const w = window as unknown as { __dest?: string | null };
      new MutationObserver(() => {
        const d = document.querySelector('[data-testid="boot-deeplink-dest"]');
        if (d && w.__dest === undefined) w.__dest = d.textContent;
      }).observe(document, { childList: true, subtree: true });
    });
    await fresh.goto(devUrl('/#/social/join/HIGHLAND-4821'), { waitUntil: 'domcontentloaded' });
    await fresh.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 30_000 });
    expect(await fresh.evaluate(() => (window as unknown as { __dest?: string }).__dest)).toBe('Then: Social › Club invite');
    await expect(tid(fresh, 'social-invite-callout')).toBeVisible();
  });

  test('the network error, while the game keeps running', async ({ page }) => {
    await aq(page, 'social.offline', true);
    await go(page, '#/social');
    await expect(tid(page, 'social-error')).toHaveText('Can’t reach Aquarium Go online right now. Your game is fine — try again in a moment.');
    await expect(tid(page, 'social-error')).toHaveAttribute('role', 'alert');
    await aq(page, 'social.offline', false);
    await signIn(page);
    await aq(page, 'social.offline', true);
    await tid(page, 'social-tab-trading').click();
    await expect(tid(page, 'social-trading').getByTestId('social-error')).toBeVisible();
    await aq(page, 'dev.setSpeed', 3);
    const h0 = await page.evaluate(() => (window as unknown as { __AQ: { summary(): { hour: number } } }).__AQ.summary().hour);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __AQ: { summary(): { hour: number } } }).__AQ.summary().hour), { timeout: 20_000 }).toBeGreaterThan(h0);
    await aq(page, 'social.offline', false);
  });

  test('skeleton rows shimmer while loading, and hold still under reduced motion', async ({ page }) => {
    await go(page, '#/social');
    await signIn(page);
    // the rows live only while the stub answers (300–600 ms): record each tab's first one as it appears, as WebKit's
    // polls can miss a transient element (the release pass for 0.5.5 did; SESSION_HANDOFF.md, "WebKit")
    await page.evaluate(() => {
      const w = window as unknown as { __skel: Record<string, string> };
      w.__skel = {};
      new MutationObserver(() => {
        for (const el of document.querySelectorAll('.so-skel__row')) {
          const tab = el.closest('[data-testid="social-friends"], [data-testid="social-trading"]')?.getAttribute('data-testid');
          if (tab && !(tab in w.__skel)) w.__skel[tab] = getComputedStyle(el).animationName;
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    const skel = (tab: string) => page.evaluate((t) => (window as unknown as { __skel: Record<string, string> }).__skel[t] ?? null, tab);
    await tid(page, 'social-tab-friends').click();
    await expect.poll(() => skel('social-friends')).toBe('so-shimmer');
    await page.evaluate(() => document.documentElement.setAttribute('data-reduced-motion', 'true'));
    await tid(page, 'social-tab-trading').click();
    await expect.poll(() => skel('social-trading')).toBe('none');
  });

  test('chunk 8: sign-up needs a working code, a name and the age box; the privacy note opens and closes', async ({ page }) => {
    const errors = collectErrors(page);
    await go(page, '#/social/join/HIGHLAND-4821');
    await expect(tid(page, 'social-invite-callout')).toBeVisible();
    await expect(tid(page, 'social-forgot')).toHaveText('Forgot your password? Ask whoever invited you.');
    // "Create account" opens sign-up mode, the invite link's code filled in
    await tid(page, 'social-signup').click();
    await expect(tid(page, 'social-signup-form')).toBeVisible();
    await expect(tid(page, 'social-signup-code')).toHaveValue('HIGHLAND-4821');
    await expect(tid(page, 'social-name')).toHaveAttribute('placeholder', 'e.g. Sam');
    await expect(tid(page, 'social-signup-code')).toHaveAttribute('placeholder', 'From your invite link');
    await expect(tid(page, 'social-signin')).toHaveCount(0);
    await expect(tid(page, 'social-invite-code')).toHaveCount(0);
    // Back to sign in, and back again
    await tid(page, 'social-back-signin').click();
    await expect(tid(page, 'social-signin')).toBeVisible();
    await tid(page, 'social-signup').click();

    // each missing piece has its approved message (ADR-0040 decision 3)
    await tid(page, 'social-email').fill('sam@example.com');
    await tid(page, 'social-password').fill('password1');
    await tid(page, 'social-signup-submit').click();
    await expect(tid(page, 'social-error')).toHaveText('Enter a name of 1 to 30 characters.');
    await tid(page, 'social-name').fill('Sam');
    await tid(page, 'social-signup-submit').click();
    await expect(tid(page, 'social-error')).toHaveText('Tick the box to confirm your age.');
    await expect(page.getByText('I’m 13 or older, or I’m a parent or guardian signing up for my child.')).toBeVisible();
    await tid(page, 'social-age').check();
    await tid(page, 'social-signup-code').fill('NOPE-0000');
    await tid(page, 'social-signup-submit').click();
    await expect(tid(page, 'social-error')).toHaveText('That invite code didn’t work. Ask whoever invited you for their link.');
    await expect(tid(page, 'social-error')).toHaveAttribute('role', 'alert');

    // the privacy note (ADR-0039 decision 3), and Close
    await tid(page, 'social-privacy-link').click();
    const note = tid(page, 'social-privacy');
    await expect(note.getByRole('heading', { name: 'Your account and your data' })).toBeVisible();
    await expect(note).toContainText('Without an account, nothing leaves your device.');
    await expect(note).toContainText('Supabase, in the United States');
    await expect(note.locator('li')).toHaveCount(4);
    await expect(note).toContainText('Settings › Account › Delete my account removes all of it at once. Questions? Ask whoever invited you.');
    await tid(page, 'social-privacy-close').click();
    await expect(note).toHaveCount(0);
    await expect(tid(page, 'social-signup-form')).toBeVisible(); // the form is as it was

    // the right code: the account is made, in that club, on the Overview
    await tid(page, 'social-signup-code').fill('highland-4821');
    await tid(page, 'social-signup-submit').click();
    await expect(toast(page, 'Account created')).toContainText('sam@example.com');
    await expect.poll(() => hash(page)).toBe('#/social');
    await expect(panel(page).getByText('Signed in as sam@example.com')).toBeVisible();
    await expect(tid(page, 'social-your-club')).toContainText('Highland Betta Club');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aquarium-go.social.v1') ?? 'null'))).toMatchObject({ email: 'sam@example.com', displayName: 'Sam', joinedClubIds: ['highland-betta'] });
    // the password is nowhere on the device (SOC-002)
    expect(await page.evaluate(() => Object.values(localStorage).some((v) => v.includes('password1')))).toBe(false);
    expect(errors).toEqual([]);
  });

  test('chunk 8: a friend request accepted, and the friend’s aquarium shows without likes', async ({ page }) => {
    await go(page, '#/social');
    await signIn(page);
    await aq(page, 'social.pushFriendRequest', 'Sam');
    await tid(page, 'social-tab-friends').click();
    const requests = tid(page, 'social-friend-requests');
    await expect(requests).toContainText('Friend requests');
    await expect(requests).toContainText('Sam added you');
    await requests.getByRole('button', { name: 'Accept' }).click();
    await expect(requests).toHaveCount(0);
    const grid = tid(page, 'social-friend-grid');
    await expect(grid.locator('li').first()).toContainText('Sam');
    await expect(grid.locator('li').first()).not.toContainText('likes');
    await expect(grid.locator('li')).toHaveCount(7);
  });

  test('chunk 8: the owner creates a club and copies its invite link', async ({ page, context, browserName }) => {
    // WebKit grants no clipboard permissions (nav.spec.ts): record what the app writes there
    if (browserName === 'webkit')
      await page.evaluate(() => {
        const w = window as unknown as { __copied?: string };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => ((w.__copied = t), Promise.resolve()), readText: () => Promise.resolve(w.__copied ?? '') } });
      });
    else await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await go(page, '#/social/clubs');
    await signIn(page);
    await expect(tid(page, 'social-create-club')).toHaveCount(0); // not the owner
    await aq(page, 'social.setOwner', true);
    const form = tid(page, 'social-create-club');
    await expect(form).toContainText('Create a club');
    await expect(form).toContainText('Club name');
    await expect(form).toContainText('What it’s about (optional)');
    await tid(page, 'social-club-name').fill('A');
    await tid(page, 'social-create-club-submit').click();
    await expect(form.getByTestId('social-error')).toHaveText('Enter a club name of 2 to 40 characters.');
    await tid(page, 'social-club-name').fill('Aquarium Go Friends');
    await tid(page, 'social-club-blurb').fill('Friends and family of Aquarium Go');
    await tid(page, 'social-create-club-submit').click();
    const created = toast(page, 'Club created');
    await expect(created).toContainText('Copy its invite link to bring friends in.');
    const row = page.locator('[data-testid^="social-invite-link-AQUARIUM-"]').first();
    await expect(row).toContainText(/Invite link AQUARIUM-[A-HJ-NP-Z]{4}/); // the club's word and four letters (ADR-0042)
    const code = ((await row.getAttribute('data-testid')) ?? '').replace('social-invite-link-', '');
    await row.getByTestId('social-copy-link').click();
    await expect(toast(page, 'Link copied')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(new RegExp(`/#/social/join/${code}$`));
    expect(copied).not.toContain('dev=1'); // an invite link never carries the dev flag
    // the link opens the club's invite (already a member: it's the owner's own)
    await go(page, `#/social/join/${code}`);
    await expect(tid(page, 'social-invite-member')).toContainText('You’re in Aquarium Go Friends');
  });

  test('the dock’s Social dot: New until first opened, back for new trades', async ({ page }) => {
    const dot = tid(page, 'dock-badge-social');
    await expect(dot).toBeVisible();
    await expect(tid(page, 'dock-social')).toHaveAttribute('aria-label', 'Social — New');
    await tid(page, 'dock-social').click();
    await expect(panel(page)).toBeVisible();
    await signIn(page);
    await tid(page, 'dock-social').click(); // closes it
    await expect(panel(page)).toHaveCount(0);
    await expect(dot).toHaveCount(0);
    await aq(page, 'social.pushTrade');
    await expect(dot).toBeVisible();
    await expect(tid(page, 'dock-social')).toHaveAttribute('aria-label', 'Social — New trades and club news');
    await tid(page, 'dock-social').click();
    await expect(panel(page)).toBeVisible();
    await tid(page, 'panel-close').click();
    await expect(dot).toHaveCount(0);
  });
});
