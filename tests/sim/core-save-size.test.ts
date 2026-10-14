/**
 * lane:core (chunk 4; PERSIST-005, BACKLOG B-171) — the save-size budget. A maximum-scale game (a Grand Hall with 40
 * tanks and 500 animals with long histories — half again the late-game fixture big_facility's 337 — eight production lines with batches, a full market and capped logs) encodes
 * within SAVE_BUDGET_CHARS, what the smallest common localStorage quota holds, so the page-close mirror keeps working.
 * Listing photos are the one thing that can push a save past it: the mirror's copy leaves them out (the regular save
 * keeps them).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Listing } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { starterAquascape } from '@/sim/aquascape';
import { devOpenMarket } from '@/sim/economy';
import { unlock } from '@/sim/facility';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { createLine } from '@/sim/production';
import { encodeRecord, SAVE_BUDGET_CHARS } from '@/persistence';

/** A listing photo at the size the game captures (640 px JPEG, quality 0.82: about 90k characters as a data URL). */
const PHOTO = `data:image/jpeg;base64,${'A'.repeat(90_000)}`;

function maximumScale(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Scale', seed: 7 });
  g.isShowcase = false;
  g.facility.level = 'grand_hall';
  devOpenMarket(g);
  for (const k of Object.keys(UNLOCK_KEYS)) unlock(g, k, { silent: true });
  const rng = simRng(g);
  const tanks: string[] = [];
  for (let i = 0; i < 40; i++) {
    const t = createTank(g, i % 4 ? 'g75' : 'g180', 'freshwater_planted', { cycled: true, placement: { x: i * 1.5, z: 0, rotY: 0 }, name: `Gallery ${i + 1}` });
    t.water.tempC = 26;
    t.decor = starterAquascape(g, 'generic', t);
    tanks.push(t.id);
  }
  const species = ['neon_tetra', 'betta', 'panda_corydoras', 'fancy_guppy', 'pea_puffer', 'honey_gourami'];
  for (let i = 0; i < 500; i++) {
    const c = addCreature(g, createCreature(g, rng, species[i % species.length], { ageDays: 30 + (i % 50), sex: i % 2 ? 'male' : 'female' }), tanks[i % tanks.length]);
    for (let k = 0; k < 20; k++) c.history.push({ hour: k * 6, kind: 'note', text: `${c.name} explored the plants near the front glass and ate well at feeding time.` });
  }
  // eight production lines (betta and gourami pairs), each with a quarantined batch
  for (let n = 0; n < 8; n++) {
    const sp = n % 2 ? 'honey_gourami' : 'betta';
    const base = n * 5;
    const m = addCreature(g, createCreature(g, rng, sp, { sex: 'male', ageDays: 40 }), tanks[base]);
    const f = addCreature(g, createCreature(g, rng, sp, { sex: 'female', ageDays: 40 }), tanks[base + 3]);
    const r = createLine(g, { motherId: f.id, fatherId: m.id, tanks: { breed: tanks[base], raise: tanks[base + 1], quarantine: tanks[base + 2], keep: tanks[base + 3] }, breedFor: `Morph ${n}` });
    expect(r.ok, r.message).toBe(true);
    const line = g.production!.lines.find((l) => l.id === r.lineId)!;
    const kids = Object.values(g.creatures).filter((c) => c.tankId === tanks[base + 2]).slice(0, 12).map((c) => c.id);
    line.batches = [{ id: `b${n}`, creatureIds: kids, sortedHour: 10, tankId: tanks[base + 2], quarantinedHour: 10 }];
    line.noticed = { [`full:clutch_${n}`]: 9 };
  }
  // a full market: 24 active listings and 40 closed ones, capped history, ledger and log
  const alive = Object.values(g.creatures).filter((c) => c.status === 'alive');
  for (let i = 0; i < 64; i++) {
    const c = alive[i];
    const l: Listing = {
      id: `lst_scale${i}`,
      kind: 'creature',
      title: `${c.name} — a fine ${c.speciesId.replace(/_/g, ' ')}`,
      creatureIds: [c.id],
      reserve: 40,
      createdHour: 10,
      endsHour: 58,
      status: i < 24 ? 'active' : 'sold',
      bids: Array.from({ length: 6 }, (_, k) => ({ id: `bid_${i}_${k}`, buyerId: `buyer_${k}`, amount: 40 + k, message: 'A healthy one — I’d love to add it to my planted tank.', createdHour: 11, expiresHour: 14, status: 'open' as const, buyerName: `Buyer ${k}`, archetype: 'experienced_keeper' as const })),
      interest: 0.5,
      snapshot: { valuation: 50, healthScore: 95, beautyScore: 60, careDifficulty: 'Beginner', lineageSummary: 'Bred in your shop · generation 2', summary: 'One animal · juvenile · Health 95', creatureIds: [c.id] },
    };
    g.market.listings.push(l);
  }
  for (let i = 0; i < 200; i++) g.market.history.push({ hour: i, kind: 'creature', title: `Sale ${i} of a healthy young fish`, price: 40, buyer: 'Maya Chen' });
  for (let i = 0; i < 400; i++) g.finance.ledger.push({ hour: i, amount: -12.5, category: 'food', memo: `${i % 3} × Tropical flakes` });
  for (let i = 0; i < 300; i++) g.log.push({ id: `ev_scale${i}`, hour: i, kind: 'info', text: 'Gallery 12 is looking its best: the plants have filled in and the water is crystal clear.' });
  return g;
}

describe('PERSIST-005: the save-size budget', () => {
  it('a maximum-scale game encodes within the budget', () => {
    const g = maximumScale();
    const { text } = encodeRecord(g, 'auto');
    expect(Object.values(g.creatures).length).toBeGreaterThanOrEqual(500);
    expect(g.production!.lines.length).toBe(8);
    expect(text.length).toBeLessThanOrEqual(SAVE_BUDGET_CHARS);
  });

  it('with a photo on every active listing it passes the budget, and the mirror’s copy (no photos) fits again', () => {
    const g = maximumScale();
    for (const l of g.market.listings) if (l.status === 'active') l.snapshot.photo = PHOTO;
    const full = encodeRecord(g, 'auto').text;
    expect(full.length).toBeGreaterThan(SAVE_BUDGET_CHARS);
    const mirror = encodeRecord(g, 'auto', Date.now(), { maxDataUrl: 0 });
    expect(mirror.text.length).toBeLessThanOrEqual(SAVE_BUDGET_CHARS);
    expect(mirror.stats.strippedDataUrls).toBe(24);
    expect(mirror.text).not.toContain('data:image/jpeg');
    // the game state itself keeps every photo
    expect(g.market.listings.filter((l) => l.snapshot.photo === PHOTO).length).toBe(24);
  });
});
