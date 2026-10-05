/**
 * lane:genetics — Prismatic animals end to end: a Prismatic shop animal is badged, bought, saved and reloaded
 * unchanged, shows its badge on the creature card and in the encyclopedia; a forced Prismatic youngster is born,
 * celebrated and recorded. Rolls are forced through the dev hook (never luck).
 */
import { test, expect } from '@playwright/test';
import { openApp, quickGame, tid, aq, probe, openPanel, waitForState, collectErrors } from './helpers';

const shaderTrouble = (errors: string[]) => errors.filter((e) => /shader|webgl|glsl|program/i.test(e));

test.describe('Prismatic animals', () => {
  test('a Prismatic shop animal is badged, bought, saved and reloaded unchanged', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta', { money: 50_000 });
    // mystery snails live happily with a betta (and exercise the critter shader)
    const added = await aq<{ ok: boolean }>(page, 'dev.addShopOffer', 'mystery_snail', { prismatic: true });
    expect(added.ok).toBe(true);

    await openPanel(page, 'market');
    const card = tid(page, 'shop-offer-0');
    await expect(card.getByTestId('prismatic-badge')).toBeVisible();
    await card.click();
    await expect(page.getByText('Prismatic — an ultra-rare individual').first()).toBeVisible();
    await tid(page, 'buy-offer').click();
    await waitForState(page, `Object.values(g.creatures).some(c => c.rareVariant && c.status === 'alive')`);

    const before = await probe<{ id: string; name: string; rv: unknown; finds: number }>(
      page,
      `(() => { const c = Object.values(g.creatures).find(c => c.rareVariant && c.status === 'alive'); return { id: c.id, name: c.name, rv: c.rareVariant, finds: (g.progress.prismaticFinds || []).length }; })()`,
    );
    expect(before.finds).toBe(1);

    expect((await aq<{ ok: boolean }>(page, 'save', 'slot1')).ok).toBe(true);
    await page.reload();
    await openApp(page);
    expect((await aq<{ ok: boolean }>(page, 'loadAndResume', 'slot1')).ok).toBe(true);
    await waitForState(page, `!!g.creatures[${JSON.stringify(before.id)}]`);
    expect(await probe(page, `g.creatures[${JSON.stringify(before.id)}].rareVariant`)).toEqual(before.rv);
    expect(await probe<number>(page, `(g.progress.prismaticFinds || []).length`)).toBe(1);

    // the creature card carries the badge
    await aq(page, 'setUI', { selectedCreatureId: before.id });
    await expect(tid(page, 'creature-card').getByTestId('prismatic-badge').first()).toBeVisible();

    // …and the encyclopedia records the find
    await aq(page, 'setUI', { selectedCreatureId: null, panel: 'encyclopedia', panelTarget: 'species:mystery_snail' });
    await expect(tid(page, 'enc-prismatic')).toContainText(before.name);
    expect(shaderTrouble(errors)).toEqual([]);
  });

  test('a forced Prismatic youngster is born, celebrated and recorded', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    await openApp(page, '/?fixture=breeding_betta_fry');
    await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen === 'game');
    await aq(page, 'dev.forcePrismatic', 'bred', 50);
    let born = false;
    for (let day = 0; day < 60 && !born; day += 2) {
      await aq(page, 'advance', 48);
      born = await probe<boolean>(page, `Object.values(g.creatures).some(c => c.rareVariant && c.lineage.breederName === 'Your shop')`);
    }
    expect(born).toBe(true);
    const young = await probe<{ id: string; origin: string; celebrated: boolean; recorded: boolean }>(
      page,
      `(() => { const c = Object.values(g.creatures).find(c => c.rareVariant && c.lineage.breederName === 'Your shop');
        return { id: c.id, origin: c.rareVariant.origin, celebrated: g.log.some(e => e.kind === 'celebrate' && e.creatureId === c.id && /Prismatic!/.test(e.text)),
                 recorded: (g.progress.prismaticFinds || []).some(f => f.creatureId === c.id) }; })()`,
    );
    expect(['spontaneous', 'bred']).toContain(young.origin);
    expect(young.celebrated).toBe(true);
    expect(young.recorded).toBe(true);
    await aq(page, 'setUI', { selectedCreatureId: young.id });
    await expect(tid(page, 'creature-card').getByTestId('prismatic-badge').first()).toBeVisible();
    expect(shaderTrouble(errors)).toEqual([]);
  });
});
