// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §3.3, §5.3, §5.5, §7.5, §7.6; SHARE-008, SHARE-016, SHARE-017): the connection's own rules
 * on a fake socket and a fake clock. Nothing is sent before the welcome; a later welcome and snapshot replace the copy;
 * steps wait while a snapshot unpacks; `input` goes at most once a minute; a hidden tab says `away` and disconnects
 * after 2 minutes, reconnecting when shown; "Still here?" after 30 minutes without input, `away` a minute later; the
 * server's `closing` ends the visit, `bye sign-in` gets a fresh token once, `bye away` waits for the player; a dropped
 * socket reconnects with growing waits; more than 10 seconds behind the server asks for the shop again; each new
 * token is sent on. The whole conversation with the real server is shared-client.test.ts.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { tutorialSkip } from '@/sim/facility';
import { FRAME_PHOTO, FRAME_SNAPSHOT_GZIP, FRAME_SNAPSHOT_PLAIN, SHARED_BUILD, type ClientMessage, type ServerMessage } from '@/types/shared';
import {
  BEHIND_MS,
  HIDDEN_DISCONNECT_MS,
  INPUT_EVERY_MS,
  RECONNECT_MAX_MS,
  SLOW_LINE_MS,
  STILL_HERE_ANSWER_MS,
  STILL_HERE_MS,
  SharedConnection,
  TOKEN_EVERY_MS,
  shopSocketUrl,
  type ConnectionDeps,
  type ConnectionEvents,
  type JoinAs,
  type SocketLike,
} from '@/ui/shared/connection';

class FakeSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 0;
  sent: ClientMessage[] = [];
  closedByUs = false;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  constructor(readonly url: string) {}
  send(data: string): void {
    this.sent.push(JSON.parse(data) as ClientMessage);
  }
  close(): void {
    this.closedByUs = true;
    this.readyState = 3;
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  deliver(m: ServerMessage | Uint8Array): void {
    this.onmessage?.({ data: m instanceof Uint8Array ? m : JSON.stringify(m) });
  }
  drop(): void {
    this.readyState = 3;
    this.onclose?.({});
  }
}

class Clock {
  t = 0;
  private timers: { at: number; fn: () => void; live: boolean }[] = [];
  after = (ms: number, fn: () => void): (() => void) => {
    const x = { at: this.t + ms, fn, live: true };
    this.timers.push(x);
    return () => {
      x.live = false;
    };
  };
  advance(ms: number): void {
    const end = this.t + ms;
    for (;;) {
      const due = this.timers.filter((x) => x.live && x.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.t = due.at;
      due.live = false;
      due.fn();
    }
    this.t = end;
  }
}

const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

function shopState(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Blue', shopName: 'Club Shop', seed: 99 });
  tutorialSkip(g);
  return JSON.parse(JSON.stringify(g)) as GameState;
}

const plainSnapshot = (g: GameState): Uint8Array => {
  const body = new TextEncoder().encode(JSON.stringify(g));
  const b = new Uint8Array(body.length + 1);
  b[0] = FRAME_SNAPSHOT_PLAIN;
  b.set(body, 1);
  return b;
};

const welcomeMsg = (n = 5): ServerMessage => ({
  t: 'welcome',
  you: { id: 'u_a', name: 'Ann', owner: false, pause: false },
  shop: { club: 'club_1', name: 'Club Shop' },
  members: [{ id: 'u_a', name: 'Ann', here: true, pause: false }],
  n,
  full: [],
});

interface Rig {
  clock: Clock;
  sockets: FakeSocket[];
  conn: SharedConnection;
  log: string[];
  hidden: { v: boolean };
  tokens: { refresh?: boolean }[];
  tokenCbs: ((t: string) => void)[];
  health: { answer: { closed: 'cap' | 'hours' | null; until: string | null } | null };
  tokenAnswer: { value: string | null | Error };
  gunzip: { hold: boolean; waiting: (() => void)[] };
  sock(): FakeSocket;
}

function make(opts: { canGunzip?: boolean; joinAs?: JoinAs; events?: Partial<ConnectionEvents> } = {}): Rig {
  const clock = new Clock();
  const sockets: FakeSocket[] = [];
  const log: string[] = [];
  const hidden = { v: false };
  const tokens: { refresh?: boolean }[] = [];
  const tokenCbs: ((t: string) => void)[] = [];
  const health: Rig['health'] = { answer: { closed: null, until: null } };
  const gz: Rig['gunzip'] = { hold: false, waiting: [] };
  const tokenAnswer: Rig['tokenAnswer'] = { value: 'tok' };
  const deps: ConnectionDeps = {
    base: 'https://shops.example',
    club: 'club_1',
    socket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    health: async () => health.answer,
    token: async (o) => {
      tokens.push(o ?? {});
      if (tokenAnswer.value instanceof Error) throw tokenAnswer.value;
      return tokenAnswer.value;
    },
    onToken: (cb) => {
      tokenCbs.push(cb);
      return () => {};
    },
    gunzip: (b) =>
      new Promise((resolve) => {
        const done = () => resolve(new TextDecoder().decode(b));
        if (gz.hold) gz.waiting.push(done);
        else done();
      }),
    canGunzip: opts.canGunzip ?? true,
    wall: () => 1_700_000_000_000 + clock.t,
    now: () => clock.t,
    after: clock.after,
    hidden: () => hidden.v,
    idle: (fn) => fn(),
  };
  const ev = (name: string) => (...a: unknown[]) => log.push(`${name}${a.length ? ` ${JSON.stringify(a[0])}` : ''}`);
  const conn = new SharedConnection(
    deps,
    {
      phase: ev('phase'),
      welcome: (_w, first) => log.push(`welcome ${first}`),
      closing: (m) => log.push(`closing ${m.why}${m.until ? ` ${m.until}` : ''}`),
      signedOut: () => log.push('signedOut'),
      notice: ev('notice'),
      stillHere: ev('stillHere'),
      photo: (hash, mime, bytes) => log.push(`photo ${hash.slice(0, 4)} ${mime} ${bytes.length}`),
      dropped: () => log.push('dropped'),
      resync: () => log.push('resync'),
      ...opts.events,
    },
    opts.joinAs,
  );
  return { clock, sockets, conn, log, hidden, tokens, tokenCbs, health, tokenAnswer, gunzip: gz, sock: () => sockets[sockets.length - 1] };
}

/** Start, open the socket, and deliver a welcome with its snapshot. */
async function joined(opts: Parameters<typeof make>[0] = {}): Promise<Rig> {
  const r = make(opts);
  await r.conn.start();
  await flush();
  r.sock().open();
  r.sock().deliver(welcomeMsg());
  r.sock().deliver(plainSnapshot(shopState()));
  await flush();
  return r;
}

const kinds = (s: FakeSocket) => s.sent.map((m) => m.t);

describe('chunk 13: joining', () => {
  it('wakes the server, says hello first with the token, the build and the club, and asks for plain snapshots without gunzip', async () => {
    const r = make({ canGunzip: false });
    await r.conn.start();
    await flush();
    expect(r.log).toContain('phase "waking"');
    expect(r.sock().url).toBe('wss://shops.example/shop');
    expect(shopSocketUrl('http://127.0.0.1:4396/')).toBe('ws://127.0.0.1:4396/shop');
    r.sock().open();
    expect(r.sock().sent).toEqual([{ t: 'hello', token: 'tok', build: SHARED_BUILD, club: 'club_1', plain: true }]);
  });

  it("the owner's create carries the shop's name, starter, its name and the preview seed; a reconnect says hello", async () => {
    const r = make({ joinAs: { kind: 'create', name: 'Reef Club', starter: 'betta', starterName: 'Blue', seed: 7 } });
    await r.conn.start();
    await flush();
    r.sock().open();
    expect(r.sock().sent[0]).toMatchObject({ t: 'create', name: 'Reef Club', starter: 'betta', starterName: 'Blue', seed: 7, club: 'club_1' });
    r.sock().deliver(welcomeMsg());
    r.sock().deliver(plainSnapshot(shopState()));
    await flush();
    r.sock().drop();
    r.clock.advance(1000);
    await flush();
    r.sock().open();
    expect(r.sock().sent[0].t).toBe('hello');
  });

  it('a server that doesn’t answer is asked again; one closed for the month says so without opening a socket', async () => {
    const r = make();
    r.health.answer = null;
    await r.conn.start();
    await flush();
    expect(r.sockets).toHaveLength(0);
    r.health.answer = { closed: 'cap', until: '2026-11-01' };
    r.clock.advance(5000);
    await flush();
    expect(r.sockets).toHaveLength(0);
    expect(r.log).toContain('closing cap 2026-11-01');
  });

  it('sends nothing before the welcome, and a later welcome and snapshot replace the copy', async () => {
    const r = make();
    await r.conn.start();
    await flush();
    r.sock().open();
    r.conn.view('t1');
    r.conn.noteInput();
    expect(r.conn.send({ k: 'setSpeed', speed: 1 })).toBeNull();
    expect(kinds(r.sock())).toEqual(['hello']);
    r.sock().deliver(welcomeMsg(5));
    r.sock().deliver(plainSnapshot(shopState()));
    await flush();
    expect(r.log).toContain('welcome true');
    expect(r.conn.replica.n).toBe(5);
    r.sock().deliver(welcomeMsg(40));
    r.sock().deliver(plainSnapshot(shopState()));
    await flush();
    expect(r.log).toContain('welcome false');
    expect(r.conn.replica.n).toBe(40);
  });

  it('steps that arrive while a snapshot unpacks wait for it, in order', async () => {
    const r = make();
    await r.conn.start();
    await flush();
    r.sock().open();
    r.gunzip.hold = true;
    r.sock().deliver(welcomeMsg(5));
    const g = new TextEncoder().encode(JSON.stringify(shopState()));
    const frame = new Uint8Array(g.length + 1);
    frame[0] = FRAME_SNAPSHOT_GZIP;
    frame.set(g, 1);
    r.sock().deliver(frame);
    r.sock().deliver({ t: 'steps', s: [{ n: 6, h: 0.025 }, { n: 7, h: 0.025 }] });
    await flush();
    expect(r.conn.replica.n).toBe(0);
    r.gunzip.waiting.forEach((f) => f());
    await flush();
    expect(r.conn.replica.n).toBe(7);
    expect(r.conn.replica.stalled).toBeNull();
  });

  it('a photo frame is the hash, the type and the picture', async () => {
    const r = await joined();
    const hash = 'ab'.repeat(32);
    const f = new Uint8Array(66 + 3);
    f[0] = FRAME_PHOTO;
    f.set(new TextEncoder().encode(hash), 1);
    f[65] = 1;
    r.sock().deliver(f);
    await flush();
    expect(r.log).toContain('photo abab image/webp 3');
  });
});

describe('chunk 13: being there (§5.5, §7.5)', () => {
  it('input goes at most once a minute', async () => {
    const r = await joined();
    r.conn.noteInput();
    r.conn.noteInput();
    r.clock.advance(INPUT_EVERY_MS - 1);
    r.conn.noteInput();
    expect(kinds(r.sock()).filter((k) => k === 'input')).toHaveLength(1);
    r.clock.advance(1);
    r.conn.noteInput();
    expect(kinds(r.sock()).filter((k) => k === 'input')).toHaveLength(2);
  });

  it('a hidden tab says away, disconnects after 2 minutes, and reconnects when shown', async () => {
    const r = await joined();
    r.hidden.v = true;
    r.conn.visibility(true);
    expect(kinds(r.sock())).toContain('away');
    r.clock.advance(HIDDEN_DISCONNECT_MS - 1);
    expect(r.sock().closedByUs).toBe(false);
    r.clock.advance(1);
    expect(r.sock().closedByUs).toBe(true);
    // hidden: no reconnect however long
    r.clock.advance(10 * 60_000);
    await flush();
    expect(r.sockets).toHaveLength(1);
    r.hidden.v = false;
    const mark = r.log.length;
    r.conn.visibility(false);
    r.clock.advance(0);
    await flush();
    expect(r.sockets).toHaveLength(2);
    // coming back is quiet ("Catching up…"), not a lost connection or the opening card; the shop stays on screen
    expect(r.log.slice(mark).filter((l) => l.startsWith('phase'))).toEqual(['phase "rejoining"', 'phase "rejoining"']);
  });

  it('a quick switch away and back says away then here, and keeps the connection', async () => {
    const r = await joined();
    r.hidden.v = true;
    r.conn.visibility(true);
    r.clock.advance(30_000);
    r.hidden.v = false;
    r.conn.visibility(false);
    expect(kinds(r.sock()).slice(-2)).toEqual(['away', 'here']);
    r.clock.advance(HIDDEN_DISCONNECT_MS);
    expect(r.sock().closedByUs).toBe(false);
  });

  it('"Still here?" after 30 minutes without input; away a minute later; any input brings the player back', async () => {
    const r = await joined();
    r.clock.advance(STILL_HERE_MS + 15_000);
    expect(r.log).toContain('stillHere true');
    expect(kinds(r.sock())).not.toContain('away');
    r.clock.advance(STILL_HERE_ANSWER_MS);
    expect(kinds(r.sock())).toContain('away');
    r.conn.noteInput();
    expect(r.log).toContain('stillHere false');
    expect(kinds(r.sock()).at(-1)).toBe('here');
  });
});

describe('chunk 13: closings and reconnecting (§3.3, §7.6)', () => {
  it("the server's closing ends the visit: the socket is closed here and nothing reconnects", async () => {
    const r = await joined();
    r.sock().deliver({ t: 'closing', why: 'full' });
    await flush();
    expect(r.log).toContain('closing full');
    expect(r.sock().closedByUs).toBe(true);
    r.clock.advance(5 * 60_000);
    await flush();
    expect(r.sockets).toHaveLength(1);
  });

  it('bye sign-in gets a fresh token once; a second one ends the visit', async () => {
    const r = await joined();
    r.sock().deliver({ t: 'bye', why: 'sign-in' });
    await flush();
    expect(r.tokens.at(-1)).toEqual({ refresh: true });
    expect(r.sockets).toHaveLength(2);
    r.sock().open();
    r.sock().deliver({ t: 'bye', why: 'sign-in' });
    await flush();
    expect(r.log).toContain('signedOut');
  });

  it('bye away waits for the player to come back', async () => {
    const r = await joined();
    r.sock().deliver({ t: 'bye', why: 'away' });
    await flush();
    r.clock.advance(10 * 60_000);
    await flush();
    expect(r.sockets).toHaveLength(1);
    r.conn.noteInput();
    r.clock.advance(0);
    await flush();
    expect(r.sockets).toHaveLength(2);
  });

  it('a dropped connection reconnects with growing waits up to 30 seconds, and its commands are lost', async () => {
    const r = await joined();
    const waits: number[] = [];
    for (let i = 0; i < 7; i++) {
      const before = r.sockets.length;
      r.sock().drop();
      await flush();
      let waited = 0;
      while (r.sockets.length === before && waited < 60_000) {
        r.clock.advance(500);
        waited += 500;
        await flush();
      }
      waits.push(waited);
    }
    expect(waits).toEqual([1000, 2000, 4000, 8000, 16000, RECONNECT_MAX_MS, RECONNECT_MAX_MS]);
    expect(r.log.filter((l) => l === 'dropped').length).toBeGreaterThanOrEqual(1);
  });

  it('more than 10 seconds behind the server asks for the shop again, once, and says why', async () => {
    const r = await joined();
    const at0 = 1_700_000_000_000;
    r.sock().deliver({ t: 'steps', s: [{ n: 6, h: 0 }], at: at0 });
    await flush();
    // this device falls behind: its clock moves 11 s further than the server's
    r.clock.advance(BEHIND_MS + 1_000);
    r.sock().deliver({ t: 'steps', s: [{ n: 7, h: 0 }], at: at0 });
    await flush();
    expect(r.log).toContain('notice "slow"');
    expect(kinds(r.sock()).filter((k) => k === 'resync')).toHaveLength(1);
    r.sock().deliver({ t: 'steps', s: [{ n: 8, h: 0 }], at: at0 });
    await flush();
    expect(kinds(r.sock()).filter((k) => k === 'resync')).toHaveLength(1);
  });

  it('sends each new token on, and asks for one every 45 minutes anyway', async () => {
    const r = await joined();
    r.tokenCbs[0]('fresh');
    expect(r.sock().sent.at(-1)).toEqual({ t: 'token', token: 'fresh' });
    const asked = r.tokens.length;
    r.clock.advance(TOKEN_EVERY_MS);
    await flush();
    expect(r.tokens.length).toBe(asked + 1);
    expect(r.sock().sent.at(-1)).toEqual({ t: 'token', token: 'tok' });
  });

  it('the tank on screen goes at most once a second, the latest winning', async () => {
    const r = await joined();
    const views = () => r.sock().sent.filter((m) => m.t === 'view');
    expect(views()).toEqual([{ t: 'view', tank: null }]); // each connection says what's on screen once it's in
    r.clock.advance(1000);
    const before = views().length;
    r.conn.view('a');
    r.conn.view('b');
    r.conn.view('c');
    expect(views().length).toBe(before + 1);
    r.clock.advance(1000);
    expect(views().at(-1)).toEqual({ t: 'view', tank: 'c' });
  });
});

describe('chunk 13: the review’s cases', () => {
  it('bye protocol and bye server reconnect with the usual waits', async () => {
    for (const why of ['protocol', 'server'] as const) {
      const r = await joined();
      r.sock().deliver({ t: 'bye', why });
      await flush();
      expect(r.sock().closedByUs).toBe(true);
      r.clock.advance(999);
      await flush();
      expect(r.sockets).toHaveLength(1);
      r.clock.advance(1);
      await flush();
      expect(r.sockets).toHaveLength(2);
      expect(r.log).toContain('phase "reconnecting"');
      r.conn.close();
    }
  });

  it('a connection that drops while the tab is hidden waits until it is shown', async () => {
    const r = await joined();
    r.hidden.v = true;
    r.sock().drop();
    await flush();
    r.clock.advance(5 * 60_000);
    await flush();
    expect(r.sockets).toHaveLength(1);
    r.hidden.v = false;
    r.conn.visibility(false);
    r.clock.advance(0);
    await flush();
    expect(r.sockets).toHaveLength(2);
  });

  it('a server that doesn’t answer /health is asked again with growing waits, and never from a hidden tab', async () => {
    const r = make();
    let asked = 0;
    r.health.answer = null;
    const health = (r.conn as unknown as { deps: ConnectionDeps }).deps;
    const real = health.health;
    health.health = async (u) => {
      asked++;
      return real(u);
    };
    await r.conn.start();
    await flush();
    const at: number[] = [];
    for (let t = 0; t < 40_000; t += 500) {
      const before = asked;
      r.clock.advance(500);
      await flush();
      if (asked > before) at.push(r.clock.t);
    }
    expect(at.slice(0, 4)).toEqual([1000, 3000, 7000, 15000]);
    r.hidden.v = true;
    const n = asked;
    r.clock.advance(5 * 60_000);
    await flush();
    expect(asked).toBe(n);
  });

  it('a network failure fetching the token is a lost connection, not a sign-out; no session is the sign-in line', async () => {
    const r = await joined();
    r.tokenAnswer.value = new Error('network');
    r.sock().drop();
    r.clock.advance(1000);
    await flush();
    expect(r.log).not.toContain('signedOut');
    r.tokenAnswer.value = null;
    r.clock.advance(2000);
    await flush();
    expect(r.log).toContain('signedOut');
  });

  it('a drop before the first welcome keeps the opening card (the shop was never on screen)', async () => {
    const r = make();
    await r.conn.start();
    await flush();
    r.sock().open();
    r.sock().drop();
    await flush();
    expect(r.log.filter((l) => l.startsWith('phase'))).not.toContain('phase "reconnecting"');
    expect(r.log.at(-1)).toBe('phase "joining"');
  });

  it('out of step or behind: the copy says it asked for the shop again (the dispatcher settles what it sent before)', async () => {
    const r = await joined();
    r.sock().deliver({ t: 'steps', s: [{ n: 9, h: 0 }] }); // a gap: 6 was due
    await flush();
    expect(r.log).toContain('resync');
    expect(kinds(r.sock())).toContain('resync');
  });

  it("a slow device's line stays a while after its snapshot, then goes", async () => {
    const r = await joined();
    const at0 = 1_700_000_000_000;
    r.sock().deliver({ t: 'steps', s: [{ n: 6, h: 0 }], at: at0 });
    await flush();
    r.clock.advance(BEHIND_MS + 1000);
    r.sock().deliver({ t: 'steps', s: [{ n: 7, h: 0 }], at: at0 });
    await flush();
    r.sock().deliver(welcomeMsg(20));
    r.sock().deliver(plainSnapshot(shopState()));
    await flush();
    expect(r.log.filter((l) => l.startsWith('notice')).at(-1)).toBe('notice "slow"');
    r.clock.advance(SLOW_LINE_MS);
    expect(r.log.filter((l) => l.startsWith('notice')).at(-1)).toBe('notice null');
  });

  it('steps read while the tab was hidden never count as falling behind', async () => {
    const r = await joined();
    const at0 = 1_700_000_000_000;
    r.sock().deliver({ t: 'steps', s: [{ n: 6, h: 0 }], at: at0 });
    await flush();
    r.hidden.v = true;
    r.conn.visibility(true);
    r.clock.advance(60_000);
    r.sock().deliver({ t: 'steps', s: [{ n: 7, h: 0 }], at: at0 + 1000 });
    await flush();
    r.hidden.v = false;
    r.conn.visibility(false);
    // the backlog arrives with old clocks just after the tab is shown
    r.sock().deliver({ t: 'steps', s: [{ n: 8, h: 0 }], at: at0 + 2000 });
    await flush();
    expect(kinds(r.sock())).not.toContain('resync');
    expect(r.log).not.toContain('notice "slow"');
  });

  it('bye sign-in whose fresh token failed on the network asks for a fresh one again, not the old one', async () => {
    const r = await joined();
    r.tokenAnswer.value = new Error('network');
    r.sock().deliver({ t: 'bye', why: 'sign-in' });
    await flush();
    expect(r.tokens.at(-1)).toEqual({ refresh: true });
    r.tokenAnswer.value = 'fresh';
    r.clock.advance(1000);
    await flush();
    expect(r.tokens.at(-1)).toEqual({ refresh: true });
    r.sock().open();
    expect(r.sock().sent[0]).toMatchObject({ t: 'hello', token: 'fresh' });
    expect(r.log).not.toContain('signedOut');
  });
});

