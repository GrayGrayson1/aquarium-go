/**
 * lane:social (chunk 6; 0.5 spec §13.6, §20.1; SOC-002, SOC-006, SOC-008 A3, SOC-009; ADR-0034 decisions 1 and 3) — the
 * local Social stub: the sign-in rule, HIGHLAND-4821 the only invite that resolves, joining persists (with the month),
 * trades, friends, Add friend, the leaderboards with the player's row computed from a save, the password never stored,
 * the stored value's fields, the one injection point, and no social call touching the save.
 * Chunk 8 (ONLINE-STAGE1.md §5.4; REL-032): sign-up takes details (a code that opens a club, the name, the age box) and
 * joins that club; the record keeps `owner` and the clubs the owner created only when set (SOC-009 A3's list grows on
 * purpose); the owner's clubs and invite codes, friend requests, Delete my account, the standing report and the
 * online save (revision and newer-build checks), with the dev hooks that play the owner, a friend and another device.
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
const DETAILS = { displayName: 'You', inviteCode: VALID_INVITE, ageConfirmed: true };
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
    await expect(s.signUp('you@example.com', 'short', DETAILS)).rejects.toEqual({ code: 'invalid' });
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
      await (how === 'signIn' ? s.signIn('you@example.com', PASSWORD) : s.signUp('you@example.com', PASSWORD, DETAILS));
      await s.joinClub(HIGHLAND_ID);
      const everything = JSON.stringify(kv.dump());
      expect(everything).not.toContain(PASSWORD);
      expect(everything).not.toContain('battery');
    }
  });

  it('stores only email, displayName, joinedClubIds and joinedMonths (chunk 8: owner and created clubs only when set)', async () => {
    const kv = memory();
    const s = fast(kv, { now: () => new Date(2026, 9, 14) });
    await s.signUp('you@example.com', PASSWORD, DETAILS); // joins the invite's club (chunk 8)
    await s.joinClub(HIGHLAND_ID);
    expect(Object.keys(kv.dump())).toEqual([SOCIAL_STORAGE_KEY]);
    expect(JSON.parse(kv.getItem(SOCIAL_STORAGE_KEY)!)).toEqual({ email: 'you@example.com', displayName: 'You', joinedClubIds: [HIGHLAND_ID], joinedMonths: { [HIGHLAND_ID]: '2026-10' } });
    s.setOwner(true);
    const club = await s.createClub('Aquarium Go Friends', 'Friends and family of Aquarium Go');
    const stored = JSON.parse(kv.getItem(SOCIAL_STORAGE_KEY)!);
    expect(Object.keys(stored)).toEqual(['email', 'displayName', 'joinedClubIds', 'joinedMonths', 'owner', 'createdClubs']);
    expect(stored.owner).toBe(true);
    expect(stored.createdClubs).toEqual([{ id: club.id, name: 'Aquarium Go Friends', initials: 'AG', colors: club.colors, members: 1, blurb: 'Friends and family of Aquarium Go', inviteCode: club.inviteCode }]);
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
    expect(looksLikeInvite('friends-kdwx')).toBe(true); // chunk 8: the real codes (ADR-0042)
    expect(looksLikeInvite('friends-kdw')).toBe(false);
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
      await s.signUp('you@example.com', PASSWORD, DETAILS);
      await s.joinClub(HIGHLAND_ID);
      await s.addFriend('MYAQUA-7Q2');
      // chunk 8's calls too (SOC-009 A3, REL-029)
      s.setOwner(true);
      await s.createClub('Reef Night', '');
      const r = s.pushFriendRequest('Sam');
      await s.friendRequests();
      await s.acceptFriend(r.id);
      await s.reportStanding({ shopName: g.shopName, gallons: 20, collectionValue: 100, prismatics: 0, showWins: 0 });
      await s.cloudUpload({ saveId: g.saveId, schemaVersion: g.schemaVersion, savedAt: g.lastSavedRealMs, hour: g.clock.hour, shopName: g.shopName, day: 1, money: g.finance.money, encoding: 'json', body: '{}' }, 0);
      await s.cloudMeta();
      await s.cloudDownload();
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

describe('chunk 8: sign-up details (ADR-0038 decision 3, ADR-0039 decision 4, ADR-0040 decision 2)', () => {
  it('needs a name of 1 to 30 characters, the age box and a code that opens a club; each failure has its code', async () => {
    const kv = memory();
    const s = fast(kv);
    await expect(s.signUp('you@example.com', PASSWORD, { ...DETAILS, displayName: '  ' })).rejects.toEqual({ code: 'name' });
    await expect(s.signUp('you@example.com', PASSWORD, { ...DETAILS, displayName: 'x'.repeat(31) })).rejects.toEqual({ code: 'name' });
    await expect(s.signUp('you@example.com', PASSWORD, { ...DETAILS, ageConfirmed: false })).rejects.toEqual({ code: 'age' });
    await expect(s.signUp('you@example.com', PASSWORD, { ...DETAILS, inviteCode: 'REEF-1000' })).rejects.toEqual({ code: 'invite' });
    await expect(s.signUp('you@example.com', PASSWORD, { ...DETAILS, inviteCode: '' })).rejects.toEqual({ code: 'invite' });
    expect(kv.dump()).toEqual({});
  });

  it('signs up with the name friends see and joins the invite’s club', async () => {
    const kv = memory();
    const s = fast(kv, { now: () => new Date(2026, 9, 19) });
    const u = await s.signUp(' you@example.com ', PASSWORD, { displayName: '  Sam  ', inviteCode: ' highland-4821 ', ageConfirmed: true });
    expect(u).toMatchObject({ email: 'you@example.com', displayName: 'Sam' });
    expect(u.isOwner).toBeUndefined();
    expect((await s.clubs()).mine.map((c) => [c.id, c.joined])).toEqual([[HIGHLAND_ID, '2026-10']]);
  });

  it('a friend code may start with one letter or digit, up to twelve', async () => {
    const s = fast(memory());
    await s.signIn('al@example.com', PASSWORD);
    await expect(s.addFriend('BO-7Q2')).resolves.toBeUndefined();
    await expect(s.addFriend(friendCodeFor('al@example.com'))).rejects.toEqual({ code: 'invalid' }); // your own
  });
});

describe('chunk 8: the owner’s clubs (ADR-0040 decision 2, ADR-0041 decision 5)', () => {
  it('only the owner creates clubs; the creator joins it and sees its invite code, which also signs people up', async () => {
    const kv = memory();
    const s = fast(kv, { now: () => new Date(2026, 9, 19), random: () => 0.4821 });
    await s.signIn('owner@example.com', PASSWORD);
    await expect(s.createClub('Aquarium Go Friends', '')).rejects.toEqual({ code: 'forbidden' });
    s.setOwner(true);
    expect((await s.currentUser())?.isOwner).toBe(true);
    await expect(s.createClub('A', '')).rejects.toEqual({ code: 'invalid' });
    await expect(s.createClub('x'.repeat(41), '')).rejects.toEqual({ code: 'invalid' });
    await expect(s.createClub('Reef', 'x'.repeat(81))).rejects.toEqual({ code: 'invalid' });
    const club = await s.createClub(' Aquarium Go Friends ', ' Friends and family of Aquarium Go ');
    expect(club).toMatchObject({ name: 'Aquarium Go Friends', initials: 'AG', members: 1, blurb: 'Friends and family of Aquarium Go', joined: '2026-10' });
    expect(club.inviteCode).toMatch(/^AQUARIUM-[A-HJ-NP-Z]{4}$/); // the club's word and four letters (ADR-0042)
    const { mine } = await s.clubs();
    expect(mine.find((c) => c.id === club.id)?.inviteCode).toBe(club.inviteCode);
    expect(mine.find((c) => c.id === HIGHLAND_ID)?.inviteCode).toBeUndefined();
    // its code resolves (without the code in the answer) and signs a new account up on this device's stub
    const inv = await s.resolveInvite(club.inviteCode!.toLowerCase());
    expect(inv?.club.id).toBe(club.id);
    expect(inv?.club.inviteCode).toBeUndefined();
    expect(inv?.alreadyMember).toBe(true);
    // a reload keeps the club and its code
    expect((await fast(kv).clubs()).mine.map((c) => c.name)).toContain('Aquarium Go Friends');
  });

  it('a club name’s invite word: its first word’s letters, 2 to 10, else CLUB', async () => {
    const { inviteWordOf, initialsOf } = await import('@/social');
    expect(['Aquarium Go Friends', 'Reef Night', '7 Seas', 'Ü', 'Supercalifragilistic Club', 'Al’s fish'].map(inviteWordOf)).toEqual(['AQUARIUM', 'REEF', 'CLUB', 'CLUB', 'SUPERCALIF', 'ALS']);
    expect(['Aquarium Go Friends', 'Reef', 'x'].map(initialsOf)).toEqual(['AG', 'RE', 'X']);
  });
});

describe('chunk 8: friend requests (ADR-0040 decision 4)', () => {
  it('lists who added the player, newest first; Accept adds them back and their aquarium shows (no likes)', async () => {
    const s = fast(memory());
    await expect(s.friendRequests()).rejects.toEqual({ code: 'invalid' }); // signed out
    await s.signIn('you@example.com', PASSWORD);
    expect(await s.friendRequests()).toEqual([]);
    const sam = s.pushFriendRequest('Sam');
    const ola = s.pushFriendRequest('Ola');
    expect((await s.friendRequests()).map((r) => r.name)).toEqual(['Ola', 'Sam']);
    await expect(s.acceptFriend('nobody')).rejects.toEqual({ code: 'invalid' });
    await s.acceptFriend(sam.id);
    expect((await s.friendRequests()).map((r) => r.id)).toEqual([ola.id]);
    const friends = await s.friendsAquariums();
    expect(friends[0]).toMatchObject({ id: sam.id, owner: 'Sam', title: 'Sam', likes: null });
    expect(friends[0].snapshotUrl.startsWith('data:image/svg+xml')).toBe(true);
  });
});

describe('chunk 8: the online save on the stub (ONLINE-STAGE1.md §5.4, §6)', () => {
  const save = (over: Partial<Parameters<SocialService['cloudUpload']>[0]> = {}) => ({ saveId: 'save_a', schemaVersion: 30, savedAt: 1000, hour: 50, shopName: 'Coral Corner', day: 3, money: 4210, encoding: 'json' as const, body: '{"x":1}', ...over });

  it('needs an account; writes when the revision matches, refuses a stale one (conflict) and a newer build’s copy (too_new)', async () => {
    const kv = memory();
    const s = fast(kv);
    await expect(s.cloudMeta()).rejects.toEqual({ code: 'invalid' });
    await s.signIn('you@example.com', PASSWORD);
    expect(await s.cloudMeta()).toBeNull();
    expect(await s.cloudUpload(save(), 1)).toEqual({ ok: false, reason: 'conflict', meta: null });
    expect(await s.cloudUpload(save(), 0)).toEqual({ ok: true, revision: 1 });
    expect(await s.cloudMeta()).toEqual({ revision: 1, saveId: 'save_a', schemaVersion: 30, savedAt: 1000, hour: 50, shopName: 'Coral Corner', day: 3, money: 4210 });
    expect(await s.cloudUpload(save({ hour: 60 }), 0)).toMatchObject({ ok: false, reason: 'conflict', meta: { revision: 1 } });
    expect(await s.cloudUpload(save({ hour: 60, schemaVersion: 31 }), 1)).toEqual({ ok: true, revision: 2 });
    // an older build never writes over a newer build's online save (PERSIST-014 on the server)
    expect(await s.cloudUpload(save({ hour: 70, schemaVersion: 30 }), 2)).toMatchObject({ ok: false, reason: 'too_new', meta: { revision: 2, schemaVersion: 31 } });
    expect(await s.cloudDownload()).toEqual({ meta: expect.objectContaining({ revision: 2, hour: 60 }), encoding: 'json', body: '{"x":1}' });
  });

  it('belongs to the account that wrote it; "another device" writes it with setCloud; Delete clears it and the record', async () => {
    const kv = memory();
    const s = fast(kv);
    await s.signIn('you@example.com', PASSWORD);
    s.setCloud({ revision: 7, saveId: 'save_b', schemaVersion: 30, savedAt: 5, hour: 9, shopName: 'Elsewhere', day: 1, money: 1 }, '{"state":1}');
    expect(s.cloud()).toMatchObject({ email: 'you@example.com', meta: { revision: 7 }, encoding: 'json', body: '{"state":1}' });
    await s.signOut();
    await s.signIn('other@example.com', PASSWORD);
    expect(await s.cloudMeta()).toBeNull(); // someone else's
    await s.signOut();
    await s.signIn('you@example.com', PASSWORD);
    expect((await s.cloudMeta())?.revision).toBe(7);
    await s.deleteAccount();
    expect(kv.dump()).toEqual({});
    expect(await s.currentUser()).toBeNull();
    await expect(s.deleteAccount()).rejects.toEqual({ code: 'invalid' });
  });

  it('keeps the last standing reported (tests read it); signed out it’s refused', async () => {
    const s = fast(memory());
    await expect(s.reportStanding({ shopName: 'x', gallons: 0, collectionValue: 0, prismatics: 0, showWins: 0 })).rejects.toEqual({ code: 'invalid' });
    await s.signIn('you@example.com', PASSWORD);
    await s.reportStanding({ shopName: 'Coral Corner', gallons: 40, collectionValue: 5460, prismatics: 1, showWins: 2, snapshot: 'data:image/jpeg;base64,AAAA' });
    expect(s.lastStanding()).toEqual({ shopName: 'Coral Corner', gallons: 40, collectionValue: 5460, prismatics: 1, showWins: 2, snapshot: 'data:image/jpeg;base64,AAAA' });
  });

  it('offline, the new calls reject with { code: "network" } too', async () => {
    const s = fast(memory());
    await s.signIn('you@example.com', PASSWORD);
    s.setOffline(true);
    for (const call of [() => s.cloudMeta(), () => s.cloudDownload(), () => s.cloudUpload(save(), 0), () => s.friendRequests(), () => s.createClub('Reef', ''), () => s.deleteAccount(), () => s.signUp('a@b.c', PASSWORD, DETAILS)])
      await expect(call()).rejects.toEqual({ code: 'network' });
  });
});

describe('chunk 8: the player’s gallons in the standing (the friends’ tile)', () => {
  it('adds up every tank’s size', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    const st = playerStanding(g);
    expect(st.gallons).toBeGreaterThan(0);
    expect(Number.isInteger(st.gallons)).toBe(true);
  });
});
