// @vitest-environment node
/**
 * Chunk 12 (SHARED-SHOPS.md §3.2, §4.3, §4.4, §5.2, §5.4, §11, §9.1): a room's own rules, driven directly — who may
 * pause, the guide flags forwarded once, the starvation guard's slow-down in `post`, a time step that throws undone
 * from the checkpoint (and three in a row stopping the shop), the catch-up into a loaded room, fingerprints spaced by
 * their cost, the snapshot's exactness check, photos, rule 5's stagger, the photo reference in validateCommand and
 * repairState, and the build identity. Every replica must stay in step throughout.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import type { ServerMessage, SharedYou } from '@/types/shared';
import { FIXTURES } from '@/dev/fixtures';
import { encodeRecord, decodeRecord } from '@/persistence/serialize';
import { stateHash } from '@/persistence/hash';
import { validateCommand, type Command } from '@/sim/commands';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { SharedReplica } from '@/game/sharedLoop';
import { Room, allowed, jsonExact, fingerprintEvery, type Outgoing, type RoomIo } from '../../server/room';
import { parsePhoto, photoType, MAX_PHOTO_BYTES } from '../../server/photos';
import { sharedBuildFiles, sharedBuildHash } from '../../vite.sharedBuild';

const ROOT = join(__dirname, '..', '..');
const shop = (name: string): GameState => decodeRecord(encodeRecord(FIXTURES[name](), 'shared', 0).text).state;
const OWNER: SharedYou = { id: 'o', name: 'Olive', owner: true, pause: true };
const MEMBER: SharedYou = { id: 'm', name: 'Milo', owner: false, pause: false };

/** A room with replicas for its members; frames delivered at once, the clock 250 ms a tick. */
function harness(state: GameState, extra: Partial<RoomIo> = {}) {
  let t = 0;
  let wall = Date.UTC(2026, 9, 21, 12);
  const frames: Outgoing[] = [];
  const io: RoomIo = { send: (o) => frames.push(o), gzip: (s) => gzipSync(s), later: (_, fn) => fn(), now: () => t, wall: () => wall, ...extra };
  const room = new Room(state, io, { club: 'c1' });
  // as the host does (server/host.ts): someone back after a while with nobody there may bring a catch-up
  io.returned ??= (ms) => void room.catchUp(ms);
  const peers = new Map<string, { replica: SharedReplica; got: Outgoing[]; welcome: Extract<ServerMessage, { t: 'welcome' }> | null; bad: number }>();
  const deliver = () => {
    while (frames.length) {
      const f = frames.shift()!;
      for (const to of f.to) {
        const p = peers.get(to);
        if (!p) continue;
        p.got.push(f);
        if (f.kind === 'welcome') p.welcome = JSON.parse(f.text!);
        else if (f.kind === 'snapshot') {
          const body = Buffer.from(f.bin!.subarray(1));
          p.replica.load(JSON.parse(f.bin![0] === 1 ? gunzipSync(body).toString('utf8') : body.toString('utf8')) as GameState, p.welcome!.n, p.welcome!.full);
        } else if (f.kind === 'steps') p.replica.apply((JSON.parse(f.text!) as Extract<ServerMessage, { t: 'steps' }>).s);
      }
    }
  };
  const join = (you: SharedYou) => {
    const p = { replica: new SharedReplica((fn) => fn()), got: [] as Outgoing[], welcome: null as Extract<ServerMessage, { t: 'welcome' }> | null, bad: 0 };
    p.replica.onCheck = (_, ok) => void (ok || p.bad++);
    peers.set(you.id, p);
    room.join(you);
    deliver();
    return p;
  };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) {
      t += 250;
      wall += 250;
      room.tick();
      deliver();
    }
  };
  const cmd = (who: string, c: unknown, id = 1) => {
    room.handle(who, { t: 'cmd', id, c: c as Command });
    room.flush();
    deliver();
  };
  const settle = () => {
    room.flush();
    deliver();
    for (const [id, p] of peers) {
      expect(p.replica.n, id).toBe(room.n);
      expect(stateHash(p.replica.state!), id).toBe(stateHash(room.state));
      expect(p.bad, id).toBe(0);
    }
  };
  const steps = (who: string) => peers.get(who)!.got.filter((f) => f.kind === 'steps').flatMap((f) => (JSON.parse(f.text!) as Extract<ServerMessage, { t: 'steps' }>).s);
  const rejects = (who: string) => peers.get(who)!.got.filter((f) => f.kind === 'reject').map((f) => JSON.parse(f.text!) as { id: number; why: string });
  return { room, join, tick, cmd, settle, steps, rejects, deliver, moveWall: (ms: number) => (wall += ms) };
}

describe('chunk 12: who may do what (§5.4)', () => {
  it('pause and speed for the owner and the chosen; the guide’s own steps for nobody; the rest for everyone', () => {
    const member = { owner: false, pause: false };
    expect(allowed(member, { k: 'setSpeed', speed: 0 })).toBe(false);
    expect(allowed({ owner: false, pause: true }, { k: 'setSpeed', speed: 3 })).toBe(true);
    expect(allowed({ owner: true, pause: false }, { k: 'setSpeed', speed: 10 })).toBe(true);
    for (const k of ['tutorialNext', 'tutorialSkip'] as const) expect(allowed({ owner: true, pause: true }, { k } as Command)).toBe(false);
    expect(allowed(member, { k: 'raiseFlag', name: 'opened_market' })).toBe(true);
  });

  it('a refused pause changes nothing anywhere; after the grant it goes through', () => {
    const h = harness(shop('playthrough_betta'));
    h.join(OWNER);
    h.join(MEMBER);
    const n = h.room.n;
    h.cmd('m', { k: 'setSpeed', speed: 10 }, 7);
    expect(h.rejects('m')).toEqual([{ t: 'reject', id: 7, why: 'forbidden' }]);
    expect(h.room.n).toBe(n);
    h.room.setPausers(['m']);
    h.cmd('m', { k: 'setSpeed', speed: 10 }, 8);
    expect(h.room.state.clock.speed).toBe(10);
    h.tick(8);
    h.settle();
  });
});

describe('chunk 12: guide flags (§4.3)', () => {
  it('the shop raises each flag once: a second member opening the market sends nothing', () => {
    const h = harness(shop('playthrough_betta'));
    h.join(OWNER);
    h.join(MEMBER);
    const flag = 'opened_shows';
    expect(h.room.state.progress.tutorial.flags[flag]).toBeUndefined();
    h.cmd('o', { k: 'raiseFlag', name: flag }, 1);
    h.cmd('m', { k: 'raiseFlag', name: flag }, 2);
    const sent = h.steps('m').flatMap((s) => s.cmds ?? []).filter((c) => c.c.k === 'raiseFlag');
    expect(sent.map((c) => c.by)).toEqual(['o']);
    expect(h.room.stats.flagsDropped).toBe(1);
    expect(h.rejects('m')).toEqual([]);
    h.settle();
  });
});

describe('chunk 12: the starvation guard’s slow-down goes in the step’s post (§3.2 rule 6)', () => {
  it('at 10× an animal starting to starve slows the shop to 1× in that step, on every copy', () => {
    const g = shop('playthrough_betta');
    g.clock.speed = 10;
    const fish = Object.values(g.creatures).find((c) => c.status === 'alive')!;
    fish.stats.hunger = 99;
    fish.stats.health = 50;
    const h = harness(g);
    h.join(OWNER);
    h.join(MEMBER);
    h.tick(4);
    expect(h.room.state.clock.speed).toBe(1);
    const posts = h.steps('m').filter((s) => s.post);
    expect(posts).toHaveLength(1);
    expect(posts[0].post).toEqual([{ k: 'setSpeed', speed: 1 }]);
    expect(h.room.stats.slowdowns).toBe(1);
    // a player who speeds up again on purpose isn't fought (once per episode)
    h.cmd('o', { k: 'setSpeed', speed: 10 }, 2);
    h.tick(8);
    expect(h.room.state.clock.speed).toBe(10);
    h.settle();
  });
});

describe('chunk 12: time steps in place, undone from the checkpoint when one throws (§11, §5.2 item 3)', () => {
  it('a step that throws is never sent, the copy goes back to the last good one, and the next steps carry on', () => {
    const h = harness(shop('playthrough_betta'));
    h.join(OWNER);
    const m = h.join(MEMBER);
    h.cmd('o', { k: 'setSpeed', speed: 10 });
    h.tick(45); // past a fingerprint: a checkpoint, then steps since it
    const n = h.room.n;
    const finance = h.room.state.finance;
    (h.room.state as unknown as { finance: null }).finance = null; // the live copy broken by a bug: the next step throws
    h.tick(1);
    expect(h.room.stats.undone).toBe(1);
    expect(h.room.n).toBe(n);
    expect(h.room.state.finance).toEqual(finance); // back as it was after step n
    h.tick(20);
    expect(h.room.n).toBeGreaterThan(n);
    expect(m.replica.stalled).toBeNull();
    h.settle();
  });

  it('three in a row stop the shop (`fault`); with a host, it saves the last good copy first', () => {
    const g = shop('playthrough_betta');
    g.clock.speed = 1;
    (g as unknown as { finance: null }).finance = null; // broken from the start: the checkpoint too
    let faulted = 0;
    const withHost = harness(g, { fault: () => void faulted++ });
    withHost.join(OWNER);
    withHost.tick(3);
    expect(faulted).toBe(1);
    withHost.tick(5);
    expect(faulted).toBe(1); // halted: no more steps
    const g2 = shop('playthrough_betta');
    g2.clock.speed = 1;
    (g2 as unknown as { finance: null }).finance = null;
    const alone = harness(g2);
    const o = alone.join(OWNER);
    alone.tick(3);
    expect(o.got.filter((f) => f.kind === 'closing').map((f) => JSON.parse(f.text!).why)).toEqual(['fault']);
  });
});

describe('chunk 12: the catch-up into a loaded room (§5.2 item 5)', () => {
  it('nobody there for 7 minutes: the next one back brings 12 game hours (capped), and everyone gets the shop again', () => {
    const g = shop('playthrough_betta');
    g.clock.speed = 1;
    const h = harness(g);
    const o = h.join(OWNER);
    const m = h.join(MEMBER);
    h.tick(8);
    h.room.handle('o', { t: 'away' });
    h.room.handle('m', { t: 'away' });
    expect(h.room.emptySince).not.toBeNull();
    const hour = h.room.state.clock.hour;
    h.moveWall(4 * 60_000);
    h.room.handle('m', { t: 'here' }); // under 5 minutes: it just resumes
    h.deliver();
    expect(h.room.state.clock.hour).toBe(hour);
    h.room.handle('m', { t: 'away' });
    h.moveWall(7 * 60_000);
    h.room.handle('m', { t: 'input' });
    h.deliver();
    expect(h.room.state.clock.hour - hour).toBeCloseTo(12, 5);
    for (const p of [o, m]) expect(p.welcome!.catchUp).toMatchObject({ hours: 12, capped: true });
    expect(h.room.stats.catchUps).toBe(1);
    h.tick(4);
    h.settle();
  });

  it('`returned` lets the host decide; nothing happens while paused', () => {
    const g = shop('playthrough_betta');
    g.clock.speed = 0;
    const h = harness(g);
    h.join(OWNER);
    expect(h.room.catchUp(3 * 3600_000)).toBeNull();
    g.clock.speed = 1;
    expect(h.room.catchUp(60_000)).toBeNull(); // under 5 minutes
  });
});

describe('chunk 12: fingerprints and snapshots cost less (§11)', () => {
  it('a fingerprint every 10 seconds, or more rarely when one takes long (at most 2% of the time, at most a minute apart)', () => {
    expect(fingerprintEvery(4)).toBe(10_000);
    expect(fingerprintEvery(200)).toBe(10_000);
    expect(fingerprintEvery(750)).toBe(37_500);
    expect(fingerprintEvery(5000)).toBe(60_000);
  });

  it('the exactness check: plain JSON passes; what JSON would change does not', () => {
    expect(jsonExact(shop('playthrough_betta'))).toBe(true);
    for (const bad of [{ a: NaN }, { a: [1, Infinity] }, { a: new Map() }, { a: new Date(0) }, { a: () => 1 }]) expect(jsonExact(bad)).toBe(false);
    expect(jsonExact({ a: null, b: [0, -0, 'x', true], c: Object.create(null) })).toBe(true);
  });

  it('a copy JSON can’t carry exactly is repaired before a snapshot, and everyone else gets it too', () => {
    const h = harness(shop('playthrough_betta'));
    const o = h.join(OWNER);
    h.room.state.finance.money = NaN; // a bug: JSON would write null
    h.join(MEMBER);
    expect(h.room.stats.snapshotRepairs).toBe(1);
    expect(o.got.filter((f) => f.kind === 'snapshot')).toHaveLength(2);
    h.settle();
  });

  it('several joins at one step share one snapshot’s bytes', () => {
    const h = harness(shop('playthrough_betta'));
    const a = h.join(OWNER);
    const b = h.join(MEMBER);
    const snap = (p: { got: Outgoing[] }) => p.got.find((f) => f.kind === 'snapshot')!.bin!;
    expect(snap(b)).toBe(snap(a)); // the same frame, made once
  });
});

describe('chunk 12: listing photos (§4.4)', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(100, 9)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(20, 3)]);

  it('only JPEG and WebP, by their bytes, and small', () => {
    expect(photoType(jpeg)).toBe('image/jpeg');
    expect(photoType(webp)).toBe('image/webp');
    expect(photoType(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(parsePhoto(`data:image/webp;base64,${jpeg.toString('base64')}`)!.mime).toBe('image/jpeg'); // the bytes decide
    expect(parsePhoto(`data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')}`)).toBeNull();
    expect(parsePhoto(`data:image/jpeg;base64,${Buffer.concat([jpeg, Buffer.alloc(MAX_PHOTO_BYTES)]).toString('base64')}`)).toBeNull();
    expect(parsePhoto('https://example.com/a.jpg')).toBeNull();
  });

  it('a member’s photo becomes the reference on every copy; six a minute each', () => {
    const h = harness(shop('playthrough_betta'));
    h.join(OWNER);
    const m = h.join(MEMBER);
    const fish = Object.values(h.room.state.creatures).filter((c) => c.status === 'alive' && !c.isStarter);
    const stored: string[] = [];
    (h.room as unknown as { io: { photoPut: (hash: string) => void } }).io.photoPut = (hash) => void stored.push(hash);
    for (let i = 0; i < 7; i++) h.cmd('m', { k: 'createListing', kind: 'creature', creatures: [fish[i % fish.length].id], reserve: 5, hours: 24, photo: `data:image/jpeg;base64,${jpeg.toString('base64')}` }, 10 + i);
    const listed = h.steps('o').flatMap((s) => s.cmds ?? []).filter((c) => c.c.k === 'createListing');
    expect(listed).toHaveLength(6);
    for (const c of listed) expect((c.c as { photo: string }).photo).toMatch(/^p:[0-9a-f]{64}$/);
    expect(stored).toHaveLength(1); // stored once: the same picture
    expect(h.rejects('m')).toEqual([{ t: 'reject', id: 16, why: 'rate' }]);
    expect(h.room.photoRefs().size).toBeGreaterThan(0);
    h.settle();
    expect(m.replica.state!.market.listings.some((l) => l.snapshot.photo?.startsWith('p:'))).toBe(true);
  });

  it('validateCommand and repairState accept exactly the reference', () => {
    const ref = `p:${'0123456789abcdef'.repeat(4)}`;
    const listing = { k: 'createListing', kind: 'creature', creatures: ['c1'], reserve: 1, hours: 24 };
    expect(validateCommand({ ...listing, photo: ref })).toMatchObject({ photo: ref });
    for (const bad of [`p:${'A'.repeat(64)}`, `p:${'a'.repeat(63)}`, 'p:', `q:${'a'.repeat(64)}`, `${ref} `, 'https://example.com/x.jpg']) expect(validateCommand({ ...listing, photo: bad }), bad).toBeNull();
    const g = shop('playthrough_betta');
    g.market.listings[0] ??= JSON.parse(JSON.stringify(shop('big_facility').market.listings[0]));
    const l = g.market.listings[0];
    l.snapshot.photo = ref;
    expect(decodeRecord(encodeRecord(g, 's', 0).text).state.market.listings[0].snapshot.photo).toBe(ref);
    l.snapshot.photo = 'https://example.com/x.jpg';
    expect(decodeRecord(encodeRecord(g, 's', 0).text).state.market.listings[0].snapshot.photo).toBeUndefined();
    l.snapshot.photo = `p:${'Z'.repeat(64)}`;
    expect(decodeRecord(encodeRecord(g, 's', 0).text).state.market.listings[0].snapshot.photo).toBeUndefined();
  });

  it('the interface puts only an embedded image in a listing’s <img src>, never a reference', () => {
    const src = readFileSync(join(ROOT, 'src/ui/panels/market/Listings.tsx'), 'utf8');
    const uses = [...src.matchAll(/src=\{([^}]*photo[^}]*)\}/g)];
    expect(uses.length).toBeGreaterThan(0);
    // each <img> of a listing's photo sits behind the data:image/ guard
    expect(src).toMatch(/if \(l\.snapshot\.photo\?\.startsWith\('data:image\/'\)\) return <img className="pn-listing__photo" src=\{l\.snapshot\.photo\}/);
    expect(uses).toHaveLength(1);
  });
});

describe('chunk 12: §3.2 rule 5, the stagger', () => {
  /** How many background tanks flushed in each step: their owed hours went back to 0. */
  function flushesPerStep(stagger: boolean): number[] {
    const g = shop('big_facility');
    flushSimDebt(g); // every tank's owed hours at 0 together, as after a catch-up or Hold all
    const out: number[] = [];
    for (let i = 0; i < 24; i++) {
      const before = g.tankOrder.map((id) => g.tanks[id].simDebtHours ?? 0);
      advanceWorld(g, 0.25, { focusTankIds: [g.tankOrder[0]], stagger });
      out.push(g.tankOrder.filter((id, j) => j > 0 && (g.tanks[id].simDebtHours ?? 0) === 0 && before[j] + 0.25 > 1e-9).length);
    }
    return out;
  }

  it('tanks that came due together flush over the next steps, a few at a time, instead of all in one', () => {
    const plain = flushesPerStep(false);
    const spread = flushesPerStep(true);
    expect(Math.max(...plain)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...spread)).toBeLessThanOrEqual(4);
    // nothing is skipped: about as many flushes over the same game hours
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
    expect(Math.abs(sum(spread) - sum(plain))).toBeLessThanOrEqual(14);
  });
});

describe('chunk 12: the build identity (§5.1; SHARE-016)', () => {
  it('covers the simulation, the data, the types and the pure persistence files, and nothing else', () => {
    const files = sharedBuildFiles(ROOT);
    expect(files).toContain('src/sim/sharedStep.ts');
    expect(files).toContain('src/types/shared.ts');
    expect(files).toContain('src/persistence/migrations.ts');
    expect(files.every((f) => /^src\/(sim|data|types)\//.test(f) || /^src\/persistence\/(hash|serialize|migrations|schema|types)\.ts$/.test(f))).toBe(true);
    expect(files.some((f) => f.endsWith('.test.ts'))).toBe(false);
  });

  it('changing a covered file changes the hash; line endings and files outside don’t', () => {
    const base = sharedBuildHash(ROOT);
    const read = (edit: (rel: string, text: string) => string) => (rel: string) => edit(rel, readFileSync(join(ROOT, rel), 'utf8'));
    expect(sharedBuildHash(ROOT, read((rel, t) => (rel === 'src/sim/sharedStep.ts' ? `${t}// x\n` : t)))).not.toBe(base);
    expect(sharedBuildHash(ROOT, read((rel, t) => (rel === 'src/persistence/hash.ts' ? t.replace('null', 'nul1') : t)))).not.toBe(base);
    expect(sharedBuildHash(ROOT, read((_, t) => t.replace(/\n/g, '\r\n')))).toBe(base);
    const touched: string[] = [];
    sharedBuildHash(ROOT, (rel) => (touched.push(rel), readFileSync(join(ROOT, rel), 'utf8')));
    expect(touched.some((f) => f.startsWith('src/ui/') || f.startsWith('server/'))).toBe(false);
  });
});
