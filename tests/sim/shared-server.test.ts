// @vitest-environment node
/**
 * Chunk 12 (SHARED-SHOPS.md §5, §9.1; SHARE-003 to SHARE-009, SHARE-014 to SHARE-018): the shared-shop server in this
 * process on the stub's accounts and storage (`SHOPS_STUB`'s server/stub.ts, the same rules as the migration's
 * functions), rooms in this thread and a clock the test moves, members on Node's own WebSocket. The room's own
 * rules (steps, permissions, photos, the undo) are in shared-room.test.ts; lockstep across copies in
 * shared-lockstep.test.ts; workers (each shop its own caches) in the e2e suite, against the built server.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { gunzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import { SHARED_BUILD, FRAME_PHOTO } from '@/types/shared';
import { SCHEMA_VERSION } from '@/persistence/schema';
import { decodeRecord } from '@/persistence/serialize';
import { StubWorld } from '../../server/stub';
import { buildVerdict, olderVersion, JOINS_PER_HOUR, MAX_MEMBERS, EMPTY_ROOM_MS, MEMBER_CHECK_MS } from '../../server/app';
import { BYTES_CAP, WIRE_FACTOR, monthOf, reopensOn } from '../../server/usage';
import { LEASE_RENEW_MS, SAVE_EVERY_MS, unpackBody } from '../../server/host';
import { Member, ORIGIN, pump, rig, shopText, sleep, type Rig } from './support/sharedServer';

const OWNER = 'stub:o:Owner:owner';
const A = 'stub:a:Ann';
const B = 'stub:b:Ben';
const CLUB = 'club_1';

let r: Rig | null = null;
afterEach(async () => {
  await r?.stop();
  r = null;
});

/** A rig whose club has a shop (saved `savedAgo` ms ago, emptied `leftAgo` ms ago, or running then if null). */
async function shop(opts: { members?: string[]; leftAgo?: number | null; savedAgo?: number; edit?: (g: GameState) => void; schema?: number } = {}): Promise<Rig> {
  const world = new StubWorld();
  const x = await rig({ world });
  const t = x.time.wall();
  world.addClub(CLUB, opts.members ?? ['u_o', 'u_a', 'u_b'], { text: shopText({ edit: opts.edit, savedAt: t - (opts.savedAgo ?? 0) }), savedAt: t - (opts.savedAgo ?? 0), leftAt: opts.leftAgo === undefined ? t - 60_000 : opts.leftAgo === null ? null : t - opts.leftAgo });
  if (opts.schema) world.clubs.get(CLUB)!.shop!.meta.schema_version = opts.schema;
  r = x;
  return x;
}

const welcome = (m: Member) => m.texts('welcome').at(-1)!;
const closingOf = (m: Member) => m.texts('closing').at(-1);

describe('chunk 12: the build identity and the caps’ arithmetic', () => {
  it('builds with the same hash play together; otherwise the older side reloads and the newer waits', () => {
    const server = { hash: 'abc', version: '0.6.0' };
    expect(buildVerdict({ hash: 'abc', version: '0.5.0' }, server)).toBeNull();
    expect(buildVerdict({ hash: 'def', version: '0.5.6' }, server)).toBe('build');
    expect(buildVerdict({ hash: 'def', version: '0.6.1' }, server)).toBe('updating');
    expect(buildVerdict({ hash: 'def', version: '0.6.0' }, server)).toBe('updating');
    expect(olderVersion('0.5.10', '0.5.9')).toBe(false);
    expect(olderVersion('junk', '0.5.9')).toBe(true);
    expect(SHARED_BUILD.hash).toMatch(/^[0-9a-f]{16}$/); // stamped by vite.sharedBuild.ts (vitest.config.ts)
  });

  it('months are UTC, and closed shops open on the 1st', () => {
    const lastMinute = Date.UTC(2026, 9, 31, 23, 59, 0);
    expect(monthOf(lastMinute)).toBe('2026-10');
    expect(reopensOn(lastMinute)).toBe('2026-11-01');
    expect(reopensOn(Date.UTC(2026, 11, 5))).toBe('2027-01-01');
  });
});

describe('chunk 12: joining (§5.3)', () => {
  it('a member joins with a welcome and the shop; the owner may pause, a member may not yet', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    const a = await x.join(A, CLUB);
    expect(welcome(o).you).toEqual({ id: 'u_o', name: 'Owner', owner: true, pause: true });
    expect(welcome(a).you).toEqual({ id: 'u_a', name: 'Ann', owner: false, pause: false });
    expect(welcome(a).shop).toEqual({ club: CLUB, name: 'Club Shop' });
    expect(welcome(a).full).toEqual([]);
    expect(a.snapshot()!.shopName).toBe('Club Shop');
    expect(a.snapshot()!.progress.tutorial.done).toBe(true); // no guide (ADR-0045 decision 5)
    await pump(x.time, () => o.texts('members').some((m) => m.members.length === 2), { step: 100, what: 'the members list' });
    expect(o.texts('members').at(-1)!.members.map((m) => [m.id, m.here, m.pause])).toEqual([
      ['u_o', true, true],
      ['u_a', true, false],
    ]);
  });

  it('refuses a wrong origin, a token Supabase doesn’t know, a non-member and a club with no shop', async () => {
    const x = await shop({ members: ['u_o', 'u_a'] });
    const far = await Member.connect(x.port, 'https://example.com');
    expect(far.opened).toBe(false); // the upgrade is refused (403)
    const bad = await Member.connect(x.port);
    bad.hello('not-a-token', CLUB);
    await pump(x.time, () => bad.closed !== null, { step: 50 });
    expect(bad.closed).toMatchObject({ code: 1008 });
    // said in a message first: Render's proxy doesn't pass the server's close frames on (measured on the live service)
    expect(bad.texts('bye')).toEqual([{ t: 'bye', why: 'sign-in' }]);
    const outsider = await x.join(B, CLUB);
    expect(closingOf(outsider)?.why).toBe('removed');
    x.world.addClub('club_2', ['u_a']);
    const none = await x.join(A, 'club_2');
    expect(closingOf(none)?.why).toBe('gone');
  });

  it('an older build is told to reload, a newer one that the shop is updating', async () => {
    const world = new StubWorld();
    const x = (r = await rig({ world, build: { hash: SHARED_BUILD.hash, version: '0.6.0' } }));
    world.addClub(CLUB, ['u_a'], { text: shopText() });
    for (const [version, why] of [
      ['0.5.6', 'build'],
      ['0.6.1', 'updating'],
    ] as const) {
      const m = await Member.connect(x.port);
      m.hello(A, CLUB, { hash: 'another', version });
      await pump(x.time, () => m.closed !== null, { step: 50 });
      expect(closingOf(m)?.why).toBe(why);
    }
  });

  it(`at most ${MAX_MEMBERS} at once: the next is told the shop is full`, async () => {
    const ids = Array.from({ length: MAX_MEMBERS + 1 }, (_, i) => `u_m${i}`);
    const x = await shop({ members: ids });
    const ms: Member[] = [];
    for (let i = 0; i < MAX_MEMBERS; i++) ms.push(await x.join(`stub:m${i}:M${i}`, CLUB));
    expect(ms.every((m) => m.closed === null)).toBe(true);
    const late = await x.join(`stub:m${MAX_MEMBERS}:Late`, CLUB);
    expect(closingOf(late)?.why).toBe('full');
  });

  it('a second tab takes over: the first is told, the member stays one', async () => {
    const x = await shop();
    const first = await x.join(A, CLUB);
    const o = await x.join(OWNER, CLUB);
    const second = await x.join(A, CLUB);
    await pump(x.time, () => first.closed !== null, { step: 50 });
    expect(closingOf(first)?.why).toBe('elsewhere');
    expect(second.closed).toBeNull();
    await pump(x.time, () => (o.texts('members').at(-1)?.members.length ?? 0) === 2, { step: 100 });
    // the second tab's commands are the member's
    second.send({ t: 'cmd', id: 1, c: { k: 'raiseFlag', name: 'opened_market' } });
    await pump(x.time, () => o.commands().length > 0, { step: 50 });
    expect(o.commands()[0]).toMatchObject({ by: 'u_a', who: 'Ann' });
  });

  it(`joins and reconnects are limited per player (${JOINS_PER_HOUR} an hour)`, async () => {
    const x = await shop();
    for (let i = 0; i < JOINS_PER_HOUR; i++) {
      const m = await x.join(A, CLUB);
      expect(m.closed, `join ${i}`).toBeNull();
      m.close();
      await pump(x.time, () => m.closed !== null);
    }
    const over = await x.join(A, CLUB);
    expect(closingOf(over)?.why).toBe('outofstep');
  });

  it('a refreshed token must name the same player', async () => {
    const x = await shop();
    const a = await x.join(A, CLUB);
    a.send({ t: 'token', token: A });
    await sleep(30);
    expect(a.closed).toBeNull();
    a.send({ t: 'token', token: B });
    await pump(x.time, () => a.closed !== null, { step: 50 });
    expect(a.closed).toMatchObject({ code: 1008 });
  });

  it('a member away 10 minutes is told so and disconnected (the browser reconnects when they’re back)', async () => {
    const x = await shop();
    const a = await x.join(A, CLUB);
    a.send({ t: 'away' });
    await sleep(20);
    x.time.advance(10 * 60_000 + 2000);
    await pump(x.time, () => a.closed !== null, { step: 500, what: 'the drop' });
    expect(a.texts('bye')).toEqual([{ t: 'bye', why: 'away' }]);
    expect(a.closed).toMatchObject({ code: 4000 });
  });

  it('a member taken out of the club is closed at the next check', async () => {
    const x = await shop();
    const a = await x.join(A, CLUB);
    x.world.clubs.get(CLUB)!.members!.delete('u_a');
    x.time.advance(MEMBER_CHECK_MS + 30_000);
    await pump(x.time, () => a.closed !== null, { step: 50, what: 'the removal' });
    expect(closingOf(a)?.why).toBe('removed');
  });
});

describe('chunk 12: who may do what (§5.4)', () => {
  it('pause refused without permission, allowed once the owner grants it, and the grant is stored', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    const a = await x.join(A, CLUB);
    a.send({ t: 'cmd', id: 5, c: { k: 'setSpeed', speed: 3 } });
    await pump(x.time, () => a.texts('reject').length > 0, { step: 50 });
    expect(a.texts('reject')[0]).toEqual({ t: 'reject', id: 5, why: 'forbidden' });
    a.send({ t: 'grant', user: 'u_a', pause: true }); // only the owner grants: ignored
    o.send({ t: 'grant', user: 'u_a', pause: true });
    await pump(x.time, () => a.texts('members').some((m) => m.members.find((p) => p.id === 'u_a')?.pause === true), { step: 100, what: 'the grant' });
    expect(x.world.clubs.get(CLUB)!.shop!.meta.pausers).toEqual(['u_a']);
    a.send({ t: 'cmd', id: 6, c: { k: 'setSpeed', speed: 3 } });
    await pump(x.time, () => o.commands().some((c) => c.c.k === 'setSpeed'), { step: 50 });
    expect(o.commands().find((c) => c.c.k === 'setSpeed')).toMatchObject({ by: 'u_a', id: 6 });
  });

  it('only the owner creates a shop, once; the new shop is a new game with no guide, its starter the one previewed', async () => {
    const world = new StubWorld();
    const x = (r = await rig({ world }));
    world.addClub('club_new', ['u_o', 'u_a']);
    const notOwner = await Member.connect(x.port);
    notOwner.send({ t: 'create', token: A, build: SHARED_BUILD, club: 'club_new', name: 'Ann’s shop', starter: 'betta', starterName: 'Fin' });
    await pump(x.time, () => notOwner.closed !== null, { step: 50 });
    expect(notOwner.closed).toMatchObject({ code: 1008 });
    expect(world.clubs.get('club_new')!.shop).toBeNull();
    const o = await Member.connect(x.port);
    o.send({ t: 'create', token: OWNER, build: SHARED_BUILD, club: 'club_new', name: 'Reef Friends', starter: 'axolotl', starterName: 'Pip', seed: 7 });
    await pump(x.time, () => o.bins().length > 0, { step: 50, what: 'the new shop' });
    const g = o.snapshot()!;
    expect(g.shopName).toBe('Reef Friends');
    expect(g.saveId).toBe('shared_club_new');
    expect(g.progress.tutorial).toMatchObject({ done: true, skipped: true });
    expect(Object.values(g.creatures).find((c) => c.isStarter)).toMatchObject({ speciesId: 'axolotl', name: 'Pip' });
    expect(world.clubs.get('club_new')!.shop!.meta).toMatchObject({ shop_name: 'Reef Friends', created_by: 'u_o', revision: 1 });
    // a second create joins the shop that exists
    const again = await Member.connect(x.port);
    again.send({ t: 'create', token: OWNER, build: SHARED_BUILD, club: 'club_new', name: 'Other', starter: 'betta', starterName: '' });
    await pump(x.time, () => again.bins().length > 0, { step: 50 });
    expect(again.snapshot()!.shopName).toBe('Reef Friends');
  });
});

describe('chunk 12: a room’s life (§5.2)', () => {
  it('saves every 3 minutes of play, and when nobody is there any more (recording when)', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    o.send({ t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 1 } });
    const puts = () => x.world.calls.shopPut ?? 0;
    await pump(x.time, () => puts() >= 1, { step: 1000, timeout: 5000, what: 'the 3-minute save' });
    expect(x.time.mono).toBeGreaterThanOrEqual(SAVE_EVERY_MS - 2000);
    const row = x.world.clubs.get(CLUB)!.shop!;
    expect(row.meta.left_at).toBeNull();
    expect(row.encoding).toBe('gzip-base64');
    const saved = decodeRecord(unpackBody(row)).state;
    expect(saved.clock.hour).toBeGreaterThan(0);
    o.send({ t: 'away' });
    const awayAt = x.time.wall();
    await pump(x.time, () => puts() >= 2, { step: 50, what: 'the save on emptying' });
    const left = x.world.clubs.get(CLUB)!.shop!.meta.left_at!;
    expect(left).toBeGreaterThanOrEqual(awayAt);
    expect(left).toBeLessThanOrEqual(x.time.wall());
  });

  it('a wake catches up nothing under 5 minutes, 12 game hours at most after longer, from saved_at after a crash', async () => {
    for (const [leftAgo, savedAgo, hours] of [
      [3 * 60_000, 3 * 60_000, 0],
      [10 * 60_000, 10 * 60_000, 12],
      [null, 7 * 60_000, 12], // a crash: no left_at, the last save 7 minutes ago
    ] as const) {
      const x = await shop({ leftAgo, savedAgo, edit: (g) => (g.clock.speed = 1) });
      const hourBefore = decodeRecord(unpackBody(x.world.clubs.get(CLUB)!.shop!)).state.clock.hour;
      const o = await x.join(OWNER, CLUB);
      const w = welcome(o);
      if (hours) expect(w.catchUp, String(leftAgo)).toMatchObject({ hours, capped: true });
      else expect(w.catchUp).toBeUndefined();
      expect(o.snapshot()!.clock.hour - hourBefore).toBeCloseTo(hours, 5);
      await r!.stop();
      r = null;
    }
  });

  it('a paused shop catches up nothing, however long it stood', async () => {
    const x = await shop({ leftAgo: 3 * 3600_000, edit: (g) => (g.clock.speed = 0) });
    const o = await x.join(OWNER, CLUB);
    expect(welcome(o).catchUp).toBeUndefined();
  });

  it('back into a still-loaded room after a while: under 5 minutes it resumes, after longer it catches up, everyone gets the shop again', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    const a = await x.join(A, CLUB);
    o.send({ t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 1 } });
    await pump(x.time, () => o.commands().length > 0, { step: 50 });
    o.send({ t: 'away' });
    a.send({ t: 'away' });
    await sleep(20);
    x.time.advance(3 * 60_000);
    a.send({ t: 'here' });
    await sleep(30);
    x.time.advance(500);
    expect(a.texts('welcome')).toHaveLength(1); // no catch-up
    a.send({ t: 'away' });
    await sleep(20);
    x.time.advance(7 * 60_000); // over 5 minutes, under the 10 an away member stays connected
    a.send({ t: 'input' });
    await pump(x.time, () => a.texts('welcome').length === 2 && o.texts('welcome').length === 2, { step: 50, what: 'the catch-up snapshots' });
    expect(a.texts('welcome')[1].catchUp).toMatchObject({ hours: 12, capped: true });
  });

  it('an empty room saves and ends after 15 minutes, releasing its lease', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    o.close();
    await pump(x.time, () => o.closed !== null);
    x.time.advance(EMPTY_ROOM_MS + 31_000);
    await pump(x.time, () => x.app.rooms().length === 0, { step: 1000, what: 'the room to end' });
    expect(x.world.clubs.get(CLUB)!.shop!.lease).toBeNull();
  });

  it('the lease keeps one server per shop, renewed every 30 seconds; a save after losing it stops the room', async () => {
    const world = new StubWorld();
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    const takes = () => x.world.calls.shopTake ?? 0;
    const before = takes();
    x.time.advance(LEASE_RENEW_MS * 3 + 10);
    await pump(x.time, () => takes() >= before + 3, { what: 'renewals' });
    // a second server sharing the database finds the shop held
    const y = await rig({ world: x.world, time: x.time });
    try {
      const other = await y.join(A, CLUB);
      expect(closingOf(other)?.why).toBe('updating');
    } finally {
      await y.stop();
    }
    // another server took it over (this one missed its renewals): the next renewal stops this room without saving
    const lease = x.world.clubs.get(CLUB)!.shop!.lease!;
    lease.holder = 'someone-else';
    lease.until = x.time.wall() + 90_000;
    const puts = x.world.calls.shopPut ?? 0;
    x.time.advance(LEASE_RENEW_MS + 10);
    await pump(x.time, () => o.closed !== null, { step: 100, what: 'the room to stop' });
    expect(closingOf(o)?.why).toBe('restart');
    expect(x.world.calls.shopPut ?? 0).toBe(puts);
    void world;
  });

  it('SIGTERM saves every shop and tells its members the server restarted', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    o.send({ t: 'cmd', id: 1, c: { k: 'raiseFlag', name: 'opened_market' } });
    await pump(x.time, () => o.commands().length > 0, { step: 50 });
    const puts = x.world.calls.shopPut ?? 0;
    const done = x.app.shutdown();
    await pump(x.time, () => o.closed !== null, { step: 50, what: 'the shutdown' });
    await done;
    expect(x.world.calls.shopPut).toBe(puts + 1);
    expect(closingOf(o)).toMatchObject({ why: 'restart' });
    expect(decodeRecord(unpackBody(x.world.clubs.get(CLUB)!.shop!)).state.progress.tutorial.flags.opened_market).toBe(true);
  });

  it('a shop saved by a newer build is refused (updating) and never written over', async () => {
    const x = await shop({ schema: SCHEMA_VERSION + 1 });
    const body = x.world.clubs.get(CLUB)!.shop!.body;
    const o = await x.join(OWNER, CLUB);
    expect(closingOf(o)?.why).toBe('updating');
    expect(x.world.clubs.get(CLUB)!.shop!.body).toBe(body);
    expect(x.world.calls.shopPut ?? 0).toBe(0);
  });
});

describe('chunk 12: photos (§4.4; SHARE-018)', () => {
  /** The smallest JPEG the server takes: its first bytes, then filler. */
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7)]);
  const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;

  it('a listing’s photo is stored once, forwarded as its reference and served to a member who asks', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    const a = await x.join(A, CLUB);
    const fish = Object.values(o.snapshot()!.creatures).find((c) => c.isStarter)!;
    a.send({ t: 'cmd', id: 3, c: { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 10, buyNow: 40, hours: 24, photo: dataUrl } });
    await pump(x.time, () => o.commands().some((c) => c.c.k === 'createListing'), { step: 50, what: 'the listing' });
    const sent = o.commands().find((c) => c.c.k === 'createListing')!;
    expect(sent.c.photo).toMatch(/^p:[0-9a-f]{64}$/);
    const hash = (sent.c.photo as string).slice(2);
    await pump(x.time, () => x.world.clubs.get(CLUB)!.photos.has(hash), { what: 'the stored photo' });
    expect(x.world.clubs.get(CLUB)!.photos.get(hash)).toMatchObject({ mime: 'image/jpeg', data: jpeg.toString('base64') });
    o.send({ t: 'photo', hash });
    await pump(x.time, () => o.bins(FRAME_PHOTO).length > 0, { step: 50, what: 'the photo frame' });
    const f = o.bins(FRAME_PHOTO)[0];
    expect(Buffer.from(f.subarray(1, 65)).toString('ascii')).toBe(hash);
    expect(f[65]).toBe(2); // image/jpeg
    expect(Buffer.from(f.subarray(66)).equals(jpeg)).toBe(true);
    // a hash no listing refers to gets nothing
    o.send({ t: 'photo', hash: 'f'.repeat(64) });
    await sleep(30);
    x.time.advance(200);
    expect(o.bins(FRAME_PHOTO)).toHaveLength(1);
  });

  it('refuses a picture that isn’t a JPEG or WebP, and a reference a member made up', async () => {
    const x = await shop();
    const a = await x.join(A, CLUB);
    const fish = Object.values(a.snapshot()!.creatures).find((c) => c.isStarter)!;
    const png = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).toString('base64')}`;
    a.send({ t: 'cmd', id: 1, c: { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 10, hours: 24, photo: png } });
    a.send({ t: 'cmd', id: 2, c: { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 10, hours: 24, photo: `p:${'a'.repeat(64)}` } });
    // the same listing with a real picture goes through: the refusals were the pictures'
    const jpegUrl = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(40, 1)]).toString('base64')}`;
    a.send({ t: 'cmd', id: 3, c: { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 10, hours: 24, photo: jpegUrl } });
    await pump(x.time, () => a.texts('reject').length === 2 && a.commands().length === 1, { step: 50 });
    expect(a.texts('reject').map((m) => [m.id, m.why])).toEqual([
      [1, 'malformed'],
      [2, 'malformed'],
    ]);
    expect(a.commands()[0].id).toBe(3);
  });

  it('a stored photo no listing refers to is pruned after a save, once it is old; a listing’s photo stays', async () => {
    const x = await shop();
    x.world.clubs.get(CLUB)!.photos.set('a'.repeat(64), { mime: 'image/jpeg', data: 'AAAA', at: x.time.wall() - 3600_000 });
    const o = await x.join(OWNER, CLUB);
    const fish = Object.values(o.snapshot()!.creatures).find((c) => c.isStarter)!;
    o.send({ t: 'cmd', id: 1, c: { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 10, hours: 240, photo: dataUrl } });
    o.send({ t: 'cmd', id: 2, c: { k: 'setSpeed', speed: 1 } });
    await pump(x.time, () => o.commands().length === 2, { step: 50 });
    const kept = (o.commands()[0].c.photo as string).slice(2);
    // five saves (every 3 minutes of play) prune once
    await pump(x.time, () => (x.world.calls.photosDelete ?? 0) > 0, { step: 2000, timeout: 10_000, what: 'the prune' });
    expect([...x.world.clubs.get(CLUB)!.photos.keys()]).toEqual([kept]);
  });
});

describe('chunk 12: the caps and the meters (§5.7; SHARE-014)', () => {
  it('the meters count what is sent, times the wire factor, and go to the database', async () => {
    const x = await shop();
    await x.join(OWNER, CLUB);
    await x.app.usage.flush();
    const row = x.world.usage.get(monthOf(x.time.wall()))!;
    expect(row.bytes_out).toBeGreaterThan(0);
    const sent = Object.values(x.app.usage.sent).reduce((s, v) => s + v, 0);
    expect(row.bytes_out).toBeCloseTo(sent * WIRE_FACTOR, -2);
  });

  it('at the data cap rooms save and close until the 1st, and joins are refused', async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    x.world.bytesCap = 1; // the next count reaches it
    await x.app.usage.flush();
    await pump(x.time, () => o.closed !== null, { step: 100, what: 'the cap to close the room' });
    expect(closingOf(o)).toEqual({ t: 'closing', why: 'cap', until: '2026-11-01' });
    const late = await x.join(A, CLUB);
    expect(closingOf(late)).toEqual({ t: 'closing', why: 'cap', until: '2026-11-01' });
    expect(BYTES_CAP).toBe(2_000_000_000);
  });

  it('at the hours cap likewise, with its own reason', async () => {
    const x = await shop();
    x.world.secondsCap = 60;
    x.time.advance(120_000);
    await x.app.usage.flush();
    const late = await x.join(A, CLUB);
    expect(closingOf(late)?.why).toBe('hours');
  });
});

describe('chunk 12: limits (§5.3)', () => {
  it(`over 10 commands a second are refused as too many; a message over 16 KB closes the connection`, async () => {
    const x = await shop();
    const o = await x.join(OWNER, CLUB);
    for (let i = 0; i < 12; i++) o.send({ t: 'cmd', id: 100 + i, c: { k: 'raiseFlag', name: `opened_x${i}` } });
    await pump(x.time, () => o.texts('reject').length >= 2, { what: 'the rate rejects' });
    expect(o.texts('reject').map((m) => m.why)).toEqual(['rate', 'rate']);
    o.send({ t: 'view', tank: 'x'.repeat(17 * 1024) });
    await pump(x.time, () => o.closed !== null);
    expect(o.closed).toMatchObject({ code: 1008 });
  });

  it('a snapshot that unpacks is the shop: gzip unless the browser asked for plain', async () => {
    const x = await shop();
    const p = await x.join(A, CLUB, { plain: true });
    expect(p.bins(2)).toHaveLength(1);
    const g = await x.join(OWNER, CLUB);
    expect(JSON.parse(gunzipSync(Buffer.from(g.bins(1)[0].subarray(1))).toString('utf8')).shopName).toBe('Club Shop');
    void ORIGIN;
  });
});
