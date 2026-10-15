/**
 * lane:social (chunk 6; 0.5 spec §13.6, §20.1; SOC-002, SOC-006, SOC-008 A3, SOC-009; ADR-0034 decisions 1 and 3) — the
 * local Social stub: the sign-in rule, HIGHLAND-4821 the only invite that resolves, joining persists (with the month),
 * trades, friends, Add friend, the leaderboards with the player's row computed from a save, the password never stored,
 * the stored value's fields, the one injection point, and no social call touching the save.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence';
import { serializeState } from '@/persistence/serialize';
import { creatureValue, tankValuation } from '@/sim/economy/valuation';
import {
  createLocalSocialStub,
  friendCodeFor,
  playerStanding,
  provideSocialService,
  readStored,
  socialService,
  setStandingSource,
  validCredentials,
  looksLikeInvite,
  SOCIAL_STORAGE_KEY,
  VALID_INVITE,
  HIGHLAND_ID,
  LEADERBOARD_KINDS,
  type SocialService,
} from '@/social';
import type { GameState } from '@/types';

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; dump(): Record<string, string> };
function memory(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), dump: () => Object.fromEntries(m) };
}

const PASSWORD = 'correct horse battery';
const fast = (kv: KV, extra: Parameters<typeof createLocalSocialStub>[0] = {}) => createLocalSocialStub({ storage: kv, latency: [0, 0], ...extra });

describe('the sign-in rule (§13.2): x@y.z and a password of 8+ characters', () => {
  it.each([
    ['you@example.com', 'password1', true],
    ['  you@example.com ', '12345678', true],
    ['you@example', 'password1', false],
    ['youexample.com', 'password1', false],
    ['you@example.com', '1234567', false],
    ['', '', false],
  ])('%s / %s → %s', (email, pw, ok) => {
    expect(validCredentials(email, pw)).toBe(ok);
  });

  it('the stub rejects bad input with { code: "invalid" } and stores nothing', async () => {
    const kv = memory();
    const s = fast(kv);
    await expect(s.signIn('nope', 'short')).rejects.toEqual({ code: 'invalid' });
    await expect(s.signUp('you@example.com', 'short')).rejects.toEqual({ code: 'invalid' });
    expect(kv.dump()).toEqual({});
    expect(await s.currentUser()).toBeNull();
  });
});

describe('signing in, the stored value and the password (SOC-002, SOC-009 A3)', () => {
  it('signs in, remembers the account on this device, and signs out', async () => {
    const kv = memory();
    const s = fast(kv);
    const u = await s.signIn(' you@example.com ', PASSWORD);
    expect(u).toEqual({ id: 'local:you@example.com', email: 'you@example.com', displayName: 'you', friendCode: friendCodeFor('you@example.com') });
    expect(await fast(kv).currentUser()).toEqual(u); // a new stub (a reload) on the same storage
    await s.signOut();
    expect(await s.currentUser()).toBeNull();
    expect(kv.getItem(SOCIAL_STORAGE_KEY)).toBeNull();
  });

  it('never stores the password, after sign-in or sign-up', async () => {
    for (const how of ['signIn', 'signUp'] as const) {
      const kv = memory();
      const s = fast(kv);
      await s[how]('you@example.com', PASSWORD);
      await s.joinClub(HIGHLAND_ID);
      const everything = JSON.stringify(kv.dump());
      expect(everything).not.toContain(PASSWORD);
      expect(everything).not.toContain('battery');
    }
  });

  it('stores only email, displayName, joinedClubIds and joinedMonths', async () => {
    const kv = memory();
    const s = fast(kv, { now: () => new Date(2026, 9, 14) });
    await s.signUp('you@example.com', PASSWORD);
    await s.joinClub(HIGHLAND_ID);
    expect(Object.keys(kv.dump())).toEqual([SOCIAL_STORAGE_KEY]);
    expect(JSON.parse(kv.getItem(SOCIAL_STORAGE_KEY)!)).toEqual({ email: 'you@example.com', displayName: 'you', joinedClubIds: [HIGHLAND_ID], joinedMonths: { [HIGHLAND_ID]: '2026-10' } });
  });

  it('reads a damaged or foreign record as no account, and drops unknown clubs and bad months', () => {
    const kv = memory();
    for (const raw of ['{', 'null', '42', '{"email":7}', '{"email":""}']) {
      kv.setItem(SOCIAL_STORAGE_KEY, raw);
      expect(readStored(kv)).toBeNull();
    }
    kv.setItem(SOCIAL_STORAGE_KEY, JSON.stringify({ email: 'a@b.c', joinedClubIds: [HIGHLAND_ID, 'nope', 3, HIGHLAND_ID], joinedMonths: { [HIGHLAND_ID]: 'soon', nope: '2026-01' }, password: 'x' }));
    expect(readStored(kv)).toEqual({ email: 'a@b.c', displayName: 'a', joinedClubIds: [HIGHLAND_ID], joinedMonths: {} });
  });
});

describe('invites (§13.3, SOC-006): HIGHLAND-4821 resolves, everything else is expired', () => {
  it('resolves signed out, ignoring case and spaces', async () => {
    const s = fast(memory());
    const r = await s.resolveInvite(' highland-4821 ');
    expect(r?.club).toMatchObject({ id: HIGHLAND_ID, name: 'Highland Betta Club', members: 128, nextEvent: { title: 'Club show', when: 'Saturday' } });
    expect(r?.alreadyMember).toBe(false);
    expect(VALID_INVITE).toBe('HIGHLAND-4821');
  });

  it.each(['HIGHLAND-4822', 'REEF-1000', '', 'HIGHLAND'])('%j is expired (null)', async (code) => {
    expect(await fast(memory()).resolveInvite(code)).toBeNull();
  });

  it('joining needs an account, persists across reloads, and makes the invite "already used"', async () => {
    const kv = memory();
    const s = fast(kv, { now: () => new Date(2026, 8, 3) });
    await expect(s.joinClub(HIGHLAND_ID)).rejects.toEqual({ code: 'invalid' });
    await s.signIn('you@example.com', PASSWORD);
    await expect(s.joinClub('no-such-club')).rejects.toEqual({ code: 'invalid' });
    await s.joinClub(HIGHLAND_ID);
    await s.joinClub(HIGHLAND_ID); // twice is once
    const again = fast(kv);
    const clubs = await again.clubs();
    expect(clubs.mine.map((c) => [c.id, c.joined])).toEqual([[HIGHLAND_ID, '2026-09']]);
    expect(clubs.suggested.map((c) => c.id)).toEqual(['prismatic-hunters', 'nano-tank', 'reef-starter']);
    expect((await again.resolveInvite(VALID_INVITE))?.alreadyMember).toBe(true);
  });

  it('tells an invite code from a club search', () => {
    expect(looksLikeInvite('highland-4821')).toBe(true);
    expect(looksLikeInvite('Highland Betta')).toBe(false);
    expect(looksLikeInvite('reef')).toBe(false);
  });
});

describe('clubs, trades, friends and Add friend (ADR-0034 decision 1)', () => {
  it('serves the approved sample data', async () => {
    const s = fast(memory());
    expect((await s.clubs()).suggested.map((c) => `${c.name} · ${c.members} · ${c.blurb}`)).toEqual([
      'Highland Betta Club · 128 · Bettas, show dates and spawning logs',
      'Prismatic Hunters · 2341 · Rainbow finds, shared the day they land',
      'Nano Tank Collective · 412 · Small tanks, big ideas',
      'Reef Starter Circle · 87 · Marine beginners helping each other',
    ]);
    expect((await s.trades()).map((t) => `${t.from} ${t.gives} / ${t.wants}`)).toEqual([
      'Mara offers 2 Golden Bold-spotted Pea Puffers / for your Red Veiltail Betta',
      'Jun wants an Axanthic Axolotl / pays $190 or trades a Leucistic',
      'Teo offers 10 Fire Red Cherry Shrimp / for any Butterfly betta',
    ]);
    const friends = await s.friendsAquariums();
    expect(friends.map((f) => [f.title, f.gallons, f.likes])).toEqual([
      ['Ola’s Grand Reef', 1000, 48],
      ['The Ada Hall', null, 31],
      ['Jun’s axolotls', 40, 12],
      ['Priya’s Prismatic room', 220, 27],
      ['Teo’s shrimp rack', 60, 9],
      ['Sam’s planted 75', 75, 15],
    ]);
    // snapshots are drawn locally: no network (PERSIST-004's no-remote-URL rule; offline first)
    for (const f of friends) expect(f.snapshotUrl.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('Add friend accepts a code shaped like MYAQUA-7Q2 (not your own) and rejects the rest', async () => {
    const s = fast(memory());
    await expect(s.addFriend('MYAQUA-7Q2')).rejects.toEqual({ code: 'invalid' }); // signed out
    await s.signIn('you@example.com', PASSWORD);
    await expect(s.addFriend('myaqua-7q2')).resolves.toBeUndefined();
    for (const bad of ['', 'hello', 'MYAQUA7Q2', 'MY-AQ', friendCodeFor('you@example.com')]) await expect(s.addFriend(bad)).rejects.toEqual({ code: 'invalid' });
  });

  it('reports news only for what arrives after (the Social dot), and markSeen clears it', async () => {
    const s = fast(memory());
    expect(await s.news()).toEqual({ trades: 0, clubs: 0 }); // the canned trades count as seen
    s.pushTrade({ id: 't-new', from: 'Priya', gives: 'offers x', wants: 'for y', createdAt: '2026-10-14T00:00:00Z' });
    s.pushClubNews();
    expect(await s.news()).toEqual({ trades: 1, clubs: 1 });
    expect((await s.trades())[0].id).toBe('t-new');
    await s.markSeen();
    expect(await s.news()).toEqual({ trades: 0, clubs: 0 });
  });

  it('offline, every call rejects with { code: "network" }', async () => {
    const s = fast(memory());
    s.setOffline(true);
    for (const call of [() => s.currentUser(), () => s.signIn('you@example.com', PASSWORD), () => s.clubs(), () => s.trades(), () => s.friendsAquariums(), () => s.leaderboard('prismatics'), () => s.resolveInvite(VALID_INVITE)])
      await expect(call()).rejects.toEqual({ code: 'network' });
    s.setOffline(false);
    await expect(s.trades()).resolves.toHaveLength(3);
  });

  it('waits 300–600 ms by default (fake latency)', async () => {
    const s = createLocalSocialStub({ storage: memory(), random: () => 0 });
    const t = performance.now();
    await s.trades();
    expect(performance.now() - t).toBeGreaterThanOrEqual(290);
  });
});

describe('leaderboards (§13.5, SOC-008 A3): the top four, and the player computed from the save', () => {
  it('ranks the player after everyone with as much (the screens: $5,460 is 38th, one Prismatic 9th)', async () => {
    const at = (collection_value: number, prismatics: number, show_wins: number) => fast(memory(), { standing: () => ({ name: 'My Aquarium', collection_value, prismatics, show_wins }) });
    const a = await at(5460, 1, 0).leaderboard('collection_value');
    expect(a.rows.map((r) => [r.rank, r.name, r.value])).toEqual([
      [1, 'Ada Okafor', 214900],
      [2, 'Ola Brandt', 188420],
      [3, 'Priya Nair', 151030],
      [4, 'Sam Duarte', 97610],
    ]);
    expect(a.me).toEqual({ rank: 38, name: 'My Aquarium', value: 5460, me: true });
    expect((await at(5460, 1, 0).leaderboard('prismatics')).me.rank).toBe(9);
    const p = await at(0, 1, 0).leaderboard('prismatics');
    expect(p.rows.map((r) => [r.rank, r.name, r.value])).toEqual([
      [1, 'Priya Nair', 4],
      [2, 'Ada Okafor', 3],
      [3, 'Jun Park', 2],
      [4, 'Teo Silva', 1],
    ]);
    const w = await at(0, 0, 0).leaderboard('show_wins');
    expect(w.rows.map((r) => r.name)).toEqual(['Sam Duarte', 'Ola Brandt', 'Mara Quinn', 'Ada Okafor']);
  });

  it('puts a leading player in the top four, highlighted, and moves the others down', async () => {
    const s = fast(memory(), { standing: () => ({ name: 'Grand Hall', collection_value: 200000, prismatics: 9, show_wins: 6 }) });
    const c = await s.leaderboard('collection_value');
    expect(c.rows.map((r) => [r.rank, r.name, !!r.me])).toEqual([
      [1, 'Ada Okafor', false],
      [2, 'Grand Hall', true],
      [3, 'Ola Brandt', false],
      [4, 'Priya Nair', false],
    ]);
    expect((await s.leaderboard('prismatics')).me.rank).toBe(1);
    expect((await s.leaderboard('show_wins')).me.rank).toBe(4); // 6 wins: after Mara Quinn's 6
  });

  it('computes the player’s numbers from a save: animals at creatureValue, tanks’ hardware, Prismatics, wins this week', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 1234 });
    const st = playerStanding(g);
    const animals = Object.values(g.creatures).filter((c) => c.status === 'alive').reduce((a, c) => a + creatureValue(g, c).total, 0);
    const tanks = g.tankOrder.reduce((a, id) => a + tankValuation(g, id, { creatureIds: new Set() }).expected, 0);
    expect(st.collection_value).toBe(Math.round(animals + tanks));
    expect(st.collection_value).toBeGreaterThan(0);
    expect(st.name).toBe(g.shopName);
    expect(st.prismatics).toBe(0);
    expect(st.show_wins).toBe(0);
    // a Prismatic, and two class wins (one this week, one older), one second place
    const c = Object.values(g.creatures)[0];
    c.rareVariant = { kind: 'prismatic', origin: 'shop', visualSeed: 1 } as GameState['creatures'][string]['rareVariant'];
    const hour = g.clock.hour + 400;
    g.clock.hour = hour;
    g.shows = { ...(g.shows ?? {}), entries: [
      { id: 'e1', showId: 's', classId: 'c', kind: 'creature', subjectId: c.id, name: c.name, fee: 0, enteredHour: hour - 30, status: 'judged', judgedHour: hour - 24, rank: 1 },
      { id: 'e2', showId: 's', classId: 'c', kind: 'creature', subjectId: c.id, name: c.name, fee: 0, enteredHour: hour - 300, status: 'judged', judgedHour: hour - 200, rank: 1 },
      { id: 'e3', showId: 's', classId: 'c', kind: 'creature', subjectId: c.id, name: c.name, fee: 0, enteredHour: hour - 30, status: 'judged', judgedHour: hour - 20, rank: 2 },
    ] } as unknown as GameState['shows'];
    const later = playerStanding(g);
    expect(later.prismatics).toBe(1);
    expect(later.show_wins).toBe(1);
  });

  it('every kind answers with four rows and the player', async () => {
    const s = fast(memory(), { standing: () => playerStanding(newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 7 })) });
    for (const k of LEADERBOARD_KINDS) {
      const r = await s.leaderboard(k);
      expect(r.rows).toHaveLength(4);
      expect(r.me.me).toBe(true);
      expect(r.me.rank).toBeGreaterThan(0);
    }
  });
});

describe('the one injection point (SOC-009 A2) and the save (SOC-009 A3)', () => {
  afterEach(() => {
    provideSocialService(null);
    setStandingSource(() => null);
  });

  it('a fake service swaps in through provideSocialService', async () => {
    const fake = { currentUser: async () => ({ id: 'x', email: 'fake@x.y', displayName: 'fake', friendCode: 'FAKE-123' }) } as unknown as SocialService;
    provideSocialService(fake);
    expect(socialService()).toBe(fake);
    expect((await socialService().currentUser())?.email).toBe('fake@x.y');
    provideSocialService(null);
    expect(socialService()).not.toBe(fake);
  });

  describe('no social call changes the save', () => {
    let g: GameState;
    beforeEach(() => {
      g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 99 });
    });
    it('stateHash and the serialized save are unchanged after every call', async () => {
      const before = stateHash(g);
      const json = serializeState(g).json;
      const s = fast(memory(), { standing: () => playerStanding(g) });
      await s.signUp('you@example.com', PASSWORD);
      await s.joinClub(HIGHLAND_ID);
      await s.addFriend('MYAQUA-7Q2');
      for (const k of LEADERBOARD_KINDS) await s.leaderboard(k);
      await s.trades();
      await s.friendsAquariums();
      await s.markSeen();
      await s.signOut();
      expect(stateHash(g)).toBe(before);
      expect(serializeState(g).json).toBe(json);
      expect(json).not.toContain('example.com');
    });
  });
});
