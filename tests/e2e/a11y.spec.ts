/**
 * chunk 6 (ACC-005, B-178; 0.5 spec §18; ADR-0024 decision 4, ADR-0035 decision 1) — a keyboard-only pass at 1440×900
 * and High contrast:
 * - the keyboard reaches the dock, opens a panel, moves along its tabs with the arrow keys and closes it again, every
 *   focused control showing a ring of at least 2 px; Escape closes one layer at a time (a dialog, then its panel);
 * - the way to Settings › Play & access › High contrast is all keyboard, and the switch says its state;
 * - under High contrast the panel sheet, the HUD and the toasts are solid (no blur, nothing of the room showing
 *   through); toasts are announced (a polite live region);
 * - the alerts drawer's close button and a bottom sheet's panel switcher put focus where §18 says.
 * WebKit moves focus to buttons with Tab only when Safari's "Press Tab to highlight each item" is on; Option+Tab always
 * does, so WebKit presses that.
 */
import { test, expect, type Page } from '@playwright/test';
import { openApp, quickGame, aq, tid } from './helpers';

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return { id: el.dataset.testid ?? null, role: el.getAttribute('role'), tag: el.tagName, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
  });

async function tabTo(page: Page, key: string, testId: string, max = 80): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    if ((await focused(page))?.id === testId) return;
  }
  throw new Error(`${key} never reached ${testId}`);
}

test.describe('accessibility (ACC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await quickGame(page, 'betta');
    await aq(page, 'act', 'tutorialSkip');
    await aq(page, 'dev.setSpeed', 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); // start from the page, not a control
  });

  test('keyboard only: the dock, a panel and its tabs, with visible focus; Escape closes one layer at a time', async ({ page, browserName }) => {
    const TAB = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await tabTo(page, TAB, 'dock-market');
    expect((await focused(page))?.ring, 'the dock item shows its focus ring').toBe(true);
    await page.keyboard.press('Enter');
    await expect(tid(page, 'panel-market')).toBeVisible();
    // focus moves to the panel's title (§18), then along the tabs with the arrow keys
    await expect.poll(async () => (await focused(page))?.tag).toBe('H2');
    const tabs = tid(page, 'panel-market').getByRole('tab');
    await tabs.first().focus();
    expect((await focused(page))?.ring, 'a tab shows its focus ring').toBe(true);
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-market')).toHaveCount(0);
    await expect.poll(async () => (await focused(page))?.id).toBe('dock-market'); // focus returns to the opener

    // a dialog over a panel: Escape closes the dialog first, then the panel
    await page.evaluate(() => void (location.hash = '#/social/trading'));
    await tid(page, 'social-email').fill('you@example.com');
    await tid(page, 'social-password').fill('password1');
    await tid(page, 'social-password').press('Enter'); // the form submits from the keyboard
    await tid(page, 'social-offer-trade').focus();
    await page.keyboard.press('Enter');
    await expect(tid(page, 'social-soon')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tid(page, 'social-soon')).toHaveCount(0);
    await expect(tid(page, 'panel-social')).toBeVisible();
    await expect(tid(page, 'social-offer-trade')).toBeFocused(); // focus came back to the button that opened it
    await page.keyboard.press('Escape');
    await expect(tid(page, 'panel-social')).toHaveCount(0);
  });

  test('the way to High contrast is all keyboard, the switch says its state, and High contrast is solid', async ({ page, browserName }) => {
    const TAB = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await tabTo(page, TAB, 'hud-settings');
    expect((await focused(page))?.ring, 'the gear shows its focus ring').toBe(true);
    await page.keyboard.press('Enter');
    await expect(tid(page, 'panel-settings')).toBeVisible();
    // opened from the keyboard, the sheet moves focus into itself (its close button, 60 ms after opening): wait for
    // that before moving on. Once in WebKit the test's focus() came first, the sheet's move overtook it, and Enter
    // landed on the close button.
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="panel-settings"]'))).toBe(true);
    const display = tid(page, 'settings-tab-display');
    await display.focus();
    await expect(display).toBeFocused();
    await page.keyboard.press('Enter');
    const sw = page.getByRole('switch', { name: 'High contrast' });
    await sw.focus();
    expect((await focused(page))?.ring, 'the switch shows its focus ring').toBe(true);
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await page.keyboard.press('Escape');

    // solid: no blur, and opaque backgrounds on the sheet, the HUD's pills and a toast
    await page.evaluate(() => void (location.hash = '#/shop'));
    await expect(tid(page, 'panel-market')).toBeVisible();
    await page.evaluate(() => (window as unknown as { __AQ: { setUI(p: object): void; ui(): { toast(t: string): void } } }).__AQ.ui().toast('A toast to check'));
    const surfaces = await page.evaluate(() => {
      const alpha = (c: string) => {
        const m = /rgba?\(([^)]+)\)/.exec(c);
        return m ? Number(m[1].split(',')[3] ?? 1) : c === 'transparent' ? 0 : 1;
      };
      const read = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const bf = cs.backdropFilter || (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter || 'none';
        const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => alpha(m[0]));
        return { blur: bf, color: alpha(cs.backgroundColor), stops };
      };
      return { sheet: read('[data-testid="panel-market"]'), pill: read('.ag-hudpill'), toast: read('.ag-toast') };
    });
    expect(surfaces.sheet?.blur).toBe('none');
    expect(surfaces.sheet?.stops.length ? Math.min(...surfaces.sheet.stops) : surfaces.sheet?.color).toBe(1);
    expect(surfaces.pill?.blur).toBe('none');
    expect(surfaces.pill?.color).toBe(1);
    expect(surfaces.toast?.blur).toBe('none');
    expect(surfaces.toast?.color).toBe(1);
  });

  test('the alerts drawer’s close button closes it and hands focus back to the bell', async ({ page }) => {
    await tid(page, 'hud-alerts').click();
    await expect(tid(page, 'alerts-close')).toBeVisible();
    await expect(tid(page, 'alerts-close')).toHaveAccessibleName('Close alerts');
    await tid(page, 'alerts-close').click();
    await expect(tid(page, 'alerts-close')).toHaveCount(0);
    await expect(tid(page, 'hud-alerts')).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => focused(page).then((f) => f?.id)).toBe('hud-alerts');
  });

  test('a bottom sheet’s panel switcher (721–1000 px portrait) moves focus to the new panel’s title (§18)', async ({ page }) => {
    // chunk 6: the first-focus guard (focus already inside the sheet stays put) left it on the switcher
    await page.setViewportSize({ width: 900, height: 1100 });
    await tid(page, 'dock-market').click();
    await expect(tid(page, 'panel-market')).toHaveAttribute('data-occlude', 'bottom');
    await tid(page, 'sheet-switch-tanks').click();
    await expect(tid(page, 'panel-tanks')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('[data-testid="panel-tanks"] .pn-head__title') ?? false)).toBe(true);
  });

  test('toasts are announced: the toast stack is a polite live region', async ({ page }) => {
    const region = page.locator('.ag-toasts');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await page.evaluate(() => (window as unknown as { __AQ: { ui(): { toast(t: string): void } } }).__AQ.ui().toast('Announced'));
    await expect(region.locator('[data-testid="toast"]').filter({ hasText: 'Announced' })).toBeVisible();
  });
});
