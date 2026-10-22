// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §3.3, §7.6, §8; ADR-0049): what the server adds for the game's screens. The welcome names
 * the shop's owner, for the approved pause refusal ("Only {owner} and the people they choose…"), whether the shop was
 * just created or woken from storage; steps carry the server's clock, so a browser can tell it has fallen behind; the
 * stub's clubs open to every stub player on demand (the game's local Social stub has clubs of its own) and its shops
 * are listed for the local stub's club cards (`GET /stub/shops`, the stub only).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { SHARED_BUILD } from '@/types/shared';
import { StubWorld } from '../../server/stub';
import { createShopServer } from '../../server/app';
import { readConfig } from '../../server/config';
import { Member, pump, rig, shopText, type Rig } from './support/sharedServer';

const OWNER = 'stub:o:Olive:owner';
const ANN = 'stub:a:Ann';

let r: Rig | null = null;
afterEach(async () => {
  await r?.stop();
  r = null;
});

const welcome = (m: Member) => m.texts('welcome').at(-1)!;

describe('chunk 13: the welcome names the owner', () => {
  it('a shop the owner just created: every member is told who the owner is', async () => {
    const world = new StubWorld();
    const x = (r = await rig({ world }));
    world.addClub('club_new', ['u_o', 'u_a']);
    const o = await Member.connect(x.port);
    o.send({ t: 'create', token: OWNER, build: SHARED_BUILD, club: 'club_new', name: 'Reef Friends', starter: 'betta', starterName: 'Pip', seed: 7 });
    await pump(x.time, () => o.bins().length > 0, { step: 50, what: 'the new shop' });
    expect(welcome(o).shop).toEqual({ club: 'club_new', name: 'Reef Friends', owner: 'Olive' });
    const a = await x.join(ANN, 'club_new');
    expect(welcome(a).shop.owner).toBe('Olive');
  });

  it('a shop woken from storage names the one who made it; one with no recorded owner names nobody', async () => {
    const world = new StubWorld();
    const x = (r = await rig({ world }));
    const t = x.time.wall();
    world.addClub('club_1', ['u_o', 'u_a'], { text: shopText({ savedAt: t }), savedAt: t, leftAt: null });
    const a = await x.join(ANN, 'club_1');
    expect(welcome(a).shop.owner).toBeUndefined(); // the test shop has no `created_by`
    await r.stop();
    const world2 = new StubWorld();
    const y = (r = await rig({ world: world2 }));
    world2.addClub('club_2', ['u_o', 'u_a'], { text: shopText({ savedAt: y.time.wall() }), savedAt: y.time.wall(), leftAt: null });
    world2.clubs.get('club_2')!.shop!.meta.created_by = 'u_o';
    // the owner's name is known to the stub once the owner has signed in
    await world2.auth.verify(OWNER);
    const b = await y.join(ANN, 'club_2');
    expect(welcome(b).shop.owner).toBe('Olive');
  });
});

describe("chunk 13: steps carry the server's clock (§7.6)", () => {
  it('each steps message says when it was sent, moving on with the server', async () => {
    const world = new StubWorld();
    const x = (r = await rig({ world }));
    const t = x.time.wall();
    world.addClub('club_1', null, { text: shopText({ savedAt: t }), savedAt: t, leftAt: null });
    const a = await x.join(ANN, 'club_1');
    await pump(x.time, () => a.texts('steps').length >= 3, { step: 250, what: 'three steps messages' });
    const ats = a.texts('steps').map((m) => m.at);
    expect(ats.every((v) => typeof v === 'number')).toBe(true);
    for (let i = 1; i < ats.length; i++) expect(ats[i]!).toBeGreaterThanOrEqual(ats[i - 1]!);
    expect(ats.at(-1)! - ats[0]!).toBeGreaterThan(0);
  });
});

describe("chunk 13: the stub meets the game's local Social stub", () => {
  it('with openClubs, a club nobody added is open to every stub player, and the owner can make its shop', async () => {
    const world = new StubWorld();
    world.openClubs = true;
    const x = (r = await rig({ world }));
    const o = await Member.connect(x.port);
    o.send({ t: 'create', token: OWNER, build: SHARED_BUILD, club: 'highland-betta', name: 'Highland Shop', starter: 'betta', starterName: 'Blue', seed: 3 });
    await pump(x.time, () => o.bins().length > 0, { step: 50, what: 'the new shop' });
    const a = await x.join(ANN, 'highland-betta');
    expect(a.snapshot()!.shopName).toBe('Highland Shop');
    expect(world.listShops()).toEqual([{ club: 'highland-betta', name: 'Highland Shop', day: 1, money: expect.any(Number), playedAt: expect.any(Number) }]);
  });

  it('without it (the unit tests), a club nobody added has no members', async () => {
    const world = new StubWorld();
    await world.auth.verify(ANN);
    expect(await world.store.member('u_a', 'highland-betta')).toBeNull();
    world.openClubs = true;
    expect(await world.store.member('u_a', 'highland-betta')).toMatchObject({ name: 'Ann', owner: false, shop: false });
    expect(await world.store.member('u_a', 'not a club!')).toBeNull();
  });

  it('GET /stub/shops lists the shops, on the stub only', async () => {
    const world = new StubWorld();
    world.addClub('club_1', null, { text: shopText({ name: 'Club Shop' }), savedAt: 5, leftAt: null });
    const stub = createShopServer({ config: { ...readConfig({}), stub: true, port: 0 }, store: world.store, auth: world.auth, stubShops: () => world.listShops(), log: () => {} });
    const live = createShopServer({ config: { ...readConfig({}), stub: false, port: 0 }, store: world.store, auth: world.auth, stubShops: () => world.listShops(), log: () => {} });
    try {
      const p1 = await stub.listen(0);
      const p2 = await live.listen(0);
      const got = await fetch(`http://127.0.0.1:${p1}/stub/shops`).then((res) => res.json());
      expect(got).toEqual([{ club: 'club_1', name: 'Club Shop', day: 1, money: expect.any(Number), playedAt: 5 }]);
      expect((await fetch(`http://127.0.0.1:${p2}/stub/shops`)).status).toBe(404);
    } finally {
      await stub.close();
      await live.close();
    }
  });
});
