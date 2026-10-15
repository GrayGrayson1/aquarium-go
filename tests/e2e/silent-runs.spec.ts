/**
 * chunk 6 — the e2e runs are silent. The servers playwright.config.ts starts build the game with VITE_E2E_MUTE, and
 * the audio engine treats that as Settings › Mute (WebKit has no mute switch and played the runs out loud on the
 * owner's Mac). A build-time flag, so a player's browser is never muted by it; the Sound settings stay untouched.
 */
import { test, expect } from '@playwright/test';
import { openApp, quickGame, tid } from './helpers';

type Audio = { __AQ_AUDIO: { info: () => { engine: { created: boolean; buses: { master: number } | null } }; sfx: (id: string) => void; meter: () => { peak: number } } };

test('after a click and a sound the master gain is 0 and the output is silent; Settings still says sound on', async ({ page }) => {
  await openApp(page);
  await quickGame(page, 'betta');
  await tid(page, 'hud-alerts').click(); // a real gesture: the audio context starts
  await page.evaluate(() => (window as unknown as Audio).__AQ_AUDIO.sfx('open'));
  await expect.poll(() => page.evaluate(() => (window as unknown as Audio).__AQ_AUDIO.info().engine.created)).toBe(true);
  const info = await page.evaluate(() => (window as unknown as Audio).__AQ_AUDIO.info().engine);
  expect(info.buses?.master).toBe(0);
  expect((await page.evaluate(() => (window as unknown as Audio).__AQ_AUDIO.meter())).peak).toBe(0);
  const muted = await page.evaluate(() => {
    const raw = localStorage.getItem('aquarium-go.settings.v1');
    return raw ? (JSON.parse(raw) as { muted?: boolean }).muted ?? false : false;
  });
  expect(muted).toBe(false);
});
