/**
 * chunk 13 — a browser's connection to a club's shared shop (SHARED-SHOPS.md §3.3, §5.3, §5.5, §7.5, §7.6), on the
 * browser's own WebSocket (no library). It wakes the server (`GET /health`), joins with the player's sign-in and the
 * build's identity, loads the snapshot into the replica (src/game/sharedLoop.ts), feeds it the server's steps, and
 * keeps the player "there": `here` and `away` with the tab, `input` at most once a minute, "Still here?" after 30
 * minutes without input, the session's token whenever Supabase refreshes it.
 *
 * Render's proxy eats the server's close frames (measured in chunk 12), so this acts on the server's `closing` and
 * `bye` messages and closes the socket itself. A connection that drops for any other reason reconnects with growing
 * waits (1 to 30 seconds), never while the tab is hidden; a hidden tab disconnects after 2 minutes and reconnects,
 * with a fresh snapshot, when it is shown again.
 *
 * Everything outside (the socket, the clock, the timers, the token, gzip) comes in `deps`, so the unit tests drive it
 * with a fake socket and a fake clock. The screens hear of it through `events`. OWNER: lane "social".
 */
import type { GameState } from '@/types';
import type { Command } from '@/sim/commands';
import type { CommandResult } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';
import { SharedReplica, type OutOfStep } from '@/game/sharedLoop';
import {
  FRAME_PHOTO,
  FRAME_SNAPSHOT_GZIP,
  FRAME_SNAPSHOT_PLAIN,
  PHOTO_TYPES,
  SHARED_BUILD,
  type ByeReason,
  type ClientMessage,
  type ClosingMessage,
  type RejectReason,
  type ServerMessage,
  type SharedMember,
} from '@/types/shared';

export type Welcome = Extract<ServerMessage, { t: 'welcome' }>;

/** The part of a WebSocket this uses (the browser's, or a test's fake). */
export interface SocketLike {
  binaryType: string;
  readonly readyState: number;
  send(data: string): void;
  close(code?: number): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

const OPEN = 1;

/** How the visit starts: join the club's shop, or (the owner) create it, then join it. */
export type JoinAs = { kind: 'hello' } | { kind: 'create'; name: string; starter: string; starterName: string; seed: number };

export interface ConnectionDeps {
  /** The server's address (`https://…` or `http://127.0.0.1:…`): `/health` and `/shop` hang off it. */
  base: string;
  club: string;
  socket(url: string): SocketLike;
  /** `GET /health`: whether shops are closed for the month, or null when the server didn't answer. */
  health(url: string): Promise<{ closed: 'cap' | 'hours' | null; until: string | null } | null>;
  /** The player's access token now (null: signed out); `refresh` asks Supabase for a new one first. */
  token(opts?: { refresh?: boolean }): Promise<string | null>;
  /** Called with each new token Supabase hands out (an hourly refresh). Returns the unsubscribe. */
  onToken?(cb: (token: string) => void): () => void;
  gunzip(bytes: Uint8Array): Promise<string>;
  /** Can this browser gunzip (`DecompressionStream`)? If not, `hello` asks for plain snapshots. */
  canGunzip: boolean;
  /** Real time (ms) and a monotonic clock (ms). */
  wall(): number;
  now(): number;
  after(ms: number, fn: () => void): () => void;
  /** Is the tab hidden now? */
  hidden(): boolean;
  /** The replica's idle-time hook (tests run it at once). */
  idle?: (fn: () => void) => void;
}

export interface ConnectionEvents {
  /** The phase the screens show. */
  phase?(p: 'waking' | 'joining' | 'open' | 'reconnecting' | 'rejoining'): void;
  /** A welcome and its snapshot are in: the replica holds the shop (`first`: the visit's first). */
  welcome?(w: Welcome, first: boolean): void;
  /** One `steps` message applied (a batch): publish the copy. */
  applied?(): void;
  /** Each step, with its commands' results in order (the shared dispatcher settles its own). */
  step?(step: SharedStep, results: CommandResult[]): void;
  reject?(id: number, why: RejectReason): void;
  members?(members: SharedMember[]): void;
  /** The server closed the visit with words to show (§8). The connection is over. */
  closing?(m: ClosingMessage): void;
  /** The sign-in can't be renewed (a `bye sign-in` after a fresh token): the visit is over. */
  signedOut?(): void;
  /** A photo the server sent (§4.4). */
  photo?(hash: string, mime: string, bytes: Uint8Array): void;
  /** "Catching up with the shared shop…" or the slow device's line, or nothing. */
  notice?(n: 'catchingUp' | 'slow' | null): void;
  /** "Still here?" shows (true) or goes (false). */
  stillHere?(on: boolean): void;
  /** A connection ended: commands sent on it that no step settled are lost. */
  dropped?(): void;
  /** This copy asked the server for the shop again (out of step, or behind): what it sent so far lands in that snapshot. */
  resync?(): void;
}

/** §5.5, §7.5: the waits, in ms. */
export const HIDDEN_DISCONNECT_MS = 2 * 60_000;
export const INPUT_EVERY_MS = 60_000;
export const STILL_HERE_MS = 30 * 60_000;
export const STILL_HERE_ANSWER_MS = 60_000;
/** §7.6: more than this behind the server's steps, and the copy starts again from a snapshot. */
export const BEHIND_MS = 10_000;
export const RECONNECT_FIRST_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;
/** Ask for a fresh token this often anyway (Supabase's lasts an hour; the server allows 10 minutes' grace). */
export const TOKEN_EVERY_MS = 45 * 60_000;
const IDLE_CHECK_MS = 15_000;
/** How long the slow device's line stays up after the snapshot it asked for (§7.6). */
export const SLOW_LINE_MS = 12_000;

/** `https://host` → `wss://host/shop`. */
export function shopSocketUrl(base: string): string {
  return `${base.replace(/\/+$/, '').replace(/^http/, 'ws')}/shop`;
}

export class SharedConnection {
  readonly replica: SharedReplica;
  /** The account id the server knows this player by (`welcome.you.id`): the `by` of their own commands. */
  you = '';
  private ws: SocketLike | null = null;
  private joinAs: JoinAs;
  private ended = false;
  /** The server sent `bye away`: reconnect only once the player is back. */
  private awayDropped = false;
  /** The tab hid long enough that this disconnected on purpose. */
  private hiddenDropped = false;
  private signInRetried = false;
  /** Reconnecting because the player came back (a hidden tab, away too long), not because the connection failed. */
  private rejoin = false;
  private welcomed = false;
  private everWelcomed = false;
  private pendingWelcome: Welcome | null = null;
  private queue: Promise<void> = Promise.resolve();
  private retryMs = RECONNECT_FIRST_MS;
  private cancelRetry: (() => void) | null = null;
  private cancelHidden: (() => void) | null = null;
  private cancelIdle: (() => void) | null = null;
  private cancelToken: (() => void) | null = null;
  private offToken: (() => void) | null = null;
  private lastInputAt: number;
  private lastInputSent = -Infinity;
  /** Away because "Still here?" went unanswered (or the tab hid): the next input says `here`. */
  private idleAway = false;
  private stillHereUp = false;
  /** The smallest (local − server) clock difference seen since the last snapshot: lag is measured above it. */
  private minSkew = Infinity;
  private resyncing = false;
  /** The last re-sync was for falling behind: its line stays a while after the snapshot. */
  private slowAsked = false;
  private cancelSlow: (() => void) | null = null;
  private nextId = 1;
  private viewSent: string | null | undefined = undefined;
  private viewWanted: string | null = null;
  private cancelView: (() => void) | null = null;
  private lastViewAt = -Infinity;

  constructor(
    private readonly deps: ConnectionDeps,
    private readonly events: ConnectionEvents,
    joinAs: JoinAs = { kind: 'hello' },
  ) {
    this.joinAs = joinAs;
    this.replica = new SharedReplica(deps.idle);
    this.replica.onOutOfStep = (why: OutOfStep) => this.outOfStep(why);
    this.replica.onApplied = (step, results) => {
      try {
        this.events.step?.(step, results);
      } catch (e) {
        console.warn('[shared] a step listener failed', e);
      }
    };
    this.lastInputAt = deps.now();
  }

  /** Wake the server and join. Resolves once the connection is under way (the welcome comes as an event). */
  async start(): Promise<void> {
    this.offToken = this.deps.onToken?.((token) => this.tell({ t: 'token', token })) ?? null;
    this.scheduleIdleCheck();
    this.scheduleToken();
    await this.wake();
  }

  /** The visit is over: no more reconnects. */
  close(): void {
    if (this.ended) return;
    this.ended = true;
    for (const c of [this.cancelRetry, this.cancelHidden, this.cancelIdle, this.cancelToken, this.cancelView, this.cancelSlow, this.offToken]) c?.();
    this.dropSocket();
  }

  get open(): boolean {
    return !this.ended && this.welcomed && this.ws?.readyState === OPEN;
  }

  /** Send a command; its id (which comes back in its step, or in a reject). Null when the shop isn't connected. */
  send(c: Command): number | null {
    if (!this.open) return null;
    const id = this.nextId++;
    this.tell({ t: 'cmd', id, c });
    this.noteInput();
    return id;
  }

  /** The tank on screen (§3.2 rule 4): at most one a second, the latest wins. */
  view(tank: string | null): void {
    this.viewWanted = tank;
    if (!this.open || this.viewSent === tank || this.cancelView) return;
    const wait = this.lastViewAt + 1000 - this.deps.now();
    if (wait <= 0) return this.sendView();
    this.cancelView = this.deps.after(wait, () => {
      this.cancelView = null;
      this.sendView();
    });
  }

  grant(user: string, pause: boolean): void {
    this.tell({ t: 'grant', user, pause });
  }

  photo(hash: string): void {
    this.tell({ t: 'photo', hash });
  }

  /** The player used the game: they're there (and "Still here?" goes). */
  noteInput(): void {
    this.lastInputAt = this.deps.now();
    if (this.stillHereUp) this.setStillHere(false);
    if (this.awayDropped && !this.deps.hidden()) {
      this.awayDropped = false;
      this.rejoin = true;
      this.reconnectSoon(0);
      return;
    }
    if (!this.open) return;
    if (this.idleAway) {
      this.idleAway = false;
      this.lastInputSent = this.deps.now();
      this.tell({ t: 'here' });
      return;
    }
    if (this.deps.now() - this.lastInputSent >= INPUT_EVERY_MS) {
      this.lastInputSent = this.deps.now();
      this.tell({ t: 'input' });
    }
  }

  /** Tests and the dev tools: as if the player had been quiet for `ms` more, then the idle check now. */
  quiet(ms: number): void {
    this.lastInputAt -= ms;
    this.idleCheck();
  }

  /** The tab was shown or hidden (§5.5). */
  visibility(hidden: boolean): void {
    if (this.ended) return;
    if (hidden) {
      this.tell({ t: 'away' });
      this.idleAway = true;
      this.cancelHidden?.();
      this.cancelHidden = this.deps.after(HIDDEN_DISCONNECT_MS, () => {
        this.cancelHidden = null;
        if (!this.deps.hidden() || this.ended) return;
        this.hiddenDropped = true;
        this.dropSocket();
      });
      return;
    }
    this.cancelHidden?.();
    this.cancelHidden = null;
    this.lastInputAt = this.deps.now();
    // steps that waited while the tab was hidden carry old clocks: not a sign of a slow device (the review's note 14)
    this.minSkew = Infinity;
    if (this.hiddenDropped || this.awayDropped || (!this.ws && !this.cancelRetry)) {
      this.rejoin = this.hiddenDropped || this.awayDropped;
      this.hiddenDropped = false;
      this.awayDropped = false;
      this.reconnectSoon(0);
      return;
    }
    if (this.open) {
      this.idleAway = false;
      this.tell({ t: 'here' });
    }
  }

  // ── joining ──────────────────────────────────────────────────────────────────────────────────────────────────

  /** The phase while (re)joining: the opening card's first time, then a lost or a quiet reconnect over the shop. */
  private joiningPhase(first: 'waking' | 'joining'): 'waking' | 'joining' | 'reconnecting' | 'rejoining' {
    return this.everWelcomed ? (this.rejoin ? 'rejoining' : 'reconnecting') : first;
  }

  private async wake(): Promise<void> {
    this.events.phase?.(this.joiningPhase('waking'));
    const h = await this.deps.health(`${this.deps.base.replace(/\/+$/, '')}/health`).catch(() => null);
    if (this.ended) return;
    if (!h) {
      // asleep, or unreachable: keep knocking, with the usual growing waits and never from a hidden tab
      const wait = this.retryMs;
      this.retryMs = Math.min(RECONNECT_MAX_MS, this.retryMs * 2);
      this.reconnectSoon(wait);
      return;
    }
    if (h.closed) return this.closed({ t: 'closing', why: h.closed, until: h.until ?? undefined });
    await this.connect();
  }

  private async connect(refresh = false): Promise<void> {
    if (this.ended) return;
    this.events.phase?.(this.joiningPhase('joining'));
    // no session is the sign-in line (ADR-0049); a network failure fetching it is only a lost connection
    const token = await this.deps.token({ refresh }).then(
      (t) => t,
      () => undefined,
    );
    if (this.ended) return;
    if (token === undefined) return this.lost();
    if (!token) return this.signedOut();
    const first: ClientMessage =
      this.joinAs.kind === 'create'
        ? { t: 'create', token, build: SHARED_BUILD, club: this.deps.club, name: this.joinAs.name, starter: this.joinAs.starter, starterName: this.joinAs.starterName, seed: this.joinAs.seed, ...(this.deps.canGunzip ? {} : { plain: true }) }
        : { t: 'hello', token, build: SHARED_BUILD, club: this.deps.club, ...(this.deps.canGunzip ? {} : { plain: true }) };
    let ws: SocketLike;
    try {
      ws = this.deps.socket(shopSocketUrl(this.deps.base));
    } catch {
      return this.lost();
    }
    this.ws = ws;
    this.welcomed = false;
    this.pendingWelcome = null;
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      if (this.ws !== ws) return;
      ws.send(JSON.stringify(first));
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      const data = ev.data;
      this.queue = this.queue.then(() => this.receive(data)).catch((e: unknown) => console.warn('[shared] a message failed', e));
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.lost();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  // ── receiving ────────────────────────────────────────────────────────────────────────────────────────────────

  private async receive(data: unknown): Promise<void> {
    if (this.ended) return;
    if (typeof data !== 'string') {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      if (bytes[0] === FRAME_PHOTO) return this.photoFrame(bytes);
      if (bytes[0] !== FRAME_SNAPSHOT_GZIP && bytes[0] !== FRAME_SNAPSHOT_PLAIN) return;
      const body = bytes.subarray(1);
      const json = bytes[0] === FRAME_SNAPSHOT_GZIP ? await this.deps.gunzip(body) : new TextDecoder().decode(body);
      const w = this.pendingWelcome;
      if (!w || this.ended) return;
      this.pendingWelcome = null;
      this.replica.load(JSON.parse(json) as GameState, w.n, w.full);
      this.minSkew = Infinity;
      this.resyncing = false;
      this.cancelSlow?.();
      this.cancelSlow = null;
      if (this.slowAsked) {
        // a slow device's line stays a while: it says why the shop just jumped (§7.6)
        this.slowAsked = false;
        this.cancelSlow = this.deps.after(SLOW_LINE_MS, () => {
          this.cancelSlow = null;
          this.events.notice?.(null);
        });
      } else this.events.notice?.(null);
      const first = !this.everWelcomed;
      this.welcomed = true;
      this.everWelcomed = true;
      this.retryMs = RECONNECT_FIRST_MS;
      this.signInRetried = false;
      this.rejoin = false;
      this.events.welcome?.(w, first);
      this.events.phase?.('open');
      // the tank on screen and whether the tab is visible, for this connection
      this.viewSent = undefined;
      this.view(this.viewWanted);
      if (this.deps.hidden()) this.tell({ t: 'away' });
      return;
    }
    const m = JSON.parse(data) as ServerMessage;
    switch (m.t) {
      case 'welcome':
        this.pendingWelcome = m;
        this.you = m.you.id;
        this.joinAs = { kind: 'hello' }; // a reconnect joins the shop this made
        break;
      case 'steps':
        if (!this.welcomed) break;
        this.replica.apply(m.s);
        try {
          this.events.applied?.();
        } catch (e) {
          console.warn('[shared] publishing failed', e);
        }
        if (typeof m.at === 'number') this.checkBehind(m.at);
        break;
      case 'reject':
        this.events.reject?.(m.id, m.why);
        break;
      case 'members':
        this.events.members?.(m.members);
        break;
      case 'closing':
        this.closed(m);
        break;
      case 'bye':
        this.bye(m.why);
        break;
    }
  }

  private photoFrame(bytes: Uint8Array): void {
    if (bytes.length < 66) return;
    const hash = new TextDecoder().decode(bytes.subarray(1, 65));
    const mime = PHOTO_TYPES[bytes[65]];
    if (!mime || !/^[0-9a-f]{64}$/.test(hash)) return;
    this.events.photo?.(hash, mime, bytes.slice(66));
  }

  /**
   * §7.6: how far behind the server this copy is. The two clocks differ by an unknown amount, so the lag is how much
   * further this clock has moved than the server's since the closest they came (re-based at every snapshot).
   */
  private checkBehind(at: number): void {
    if (this.deps.hidden()) return;
    const skew = this.deps.wall() - at;
    if (skew < this.minSkew) this.minSkew = skew;
    if (this.resyncing || skew - this.minSkew <= BEHIND_MS) return;
    this.resyncing = true;
    this.slowAsked = true;
    this.events.notice?.('slow');
    this.askResync();
  }

  private outOfStep(why: OutOfStep): void {
    void why;
    this.resyncing = true;
    this.events.notice?.('catchingUp');
    this.askResync();
  }

  private askResync(): void {
    this.events.resync?.();
    this.tell({ t: 'resync' });
  }

  // ── closing ──────────────────────────────────────────────────────────────────────────────────────────────────

  private closed(m: ClosingMessage): void {
    this.close();
    this.events.closing?.(m);
  }

  private signedOut(): void {
    this.close();
    this.events.signedOut?.();
  }

  private bye(why: ByeReason): void {
    this.dropSocket();
    switch (why) {
      case 'sign-in':
        // the token can't be checked: a fresh one, once; failing again, the visit is over
        if (this.signInRetried) return this.signedOut();
        this.signInRetried = true;
        void this.connect(true);
        return;
      case 'away':
        // away too long: back when the player is (the shop stays on screen, still)
        this.awayDropped = true;
        return;
      default:
        // protocol or server: the usual waits
        this.lost();
    }
  }

  /** The socket ended without a closing: reconnect with growing waits, never while the tab is hidden. */
  private lost(): void {
    this.ws = null;
    this.welcomed = false;
    this.rejoin = false;
    this.events.dropped?.();
    if (this.ended || this.hiddenDropped || this.awayDropped) return;
    // before the first welcome the opening card stays (the shop isn't on screen yet: the review's note 2)
    this.events.phase?.(this.joiningPhase('joining'));
    const wait = this.retryMs;
    this.retryMs = Math.min(RECONNECT_MAX_MS, this.retryMs * 2);
    this.reconnectSoon(wait);
  }

  private reconnectSoon(ms: number): void {
    if (this.ended) return;
    this.cancelRetry?.();
    this.cancelRetry = this.deps.after(ms, () => {
      this.cancelRetry = null;
      if (this.ended) return;
      if (this.deps.hidden()) {
        this.hiddenDropped = true; // shown again later: then
        return;
      }
      void this.wake();
    });
  }

  private dropSocket(): void {
    const ws = this.ws;
    this.ws = null;
    const was = this.welcomed;
    this.welcomed = false;
    this.pendingWelcome = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close(1000);
      } catch {
        /* already closed */
      }
      if (was) this.events.dropped?.();
    }
  }

  // ── keeping "there" ──────────────────────────────────────────────────────────────────────────────────────────

  private scheduleIdleCheck(): void {
    this.cancelIdle = this.deps.after(IDLE_CHECK_MS, () => {
      this.cancelIdle = null;
      if (this.ended) return;
      this.idleCheck();
      this.scheduleIdleCheck();
    });
  }

  /** §7.5: 30 minutes without input in a visible tab asks "Still here?"; a minute unanswered says `away`. */
  private idleCheck(): void {
    if (this.deps.hidden() || !this.open) return;
    const quiet = this.deps.now() - this.lastInputAt;
    if (quiet >= STILL_HERE_MS + STILL_HERE_ANSWER_MS) {
      if (!this.idleAway) {
        this.idleAway = true;
        this.tell({ t: 'away' });
      }
    } else if (quiet >= STILL_HERE_MS && !this.stillHereUp) this.setStillHere(true);
  }

  private setStillHere(on: boolean): void {
    this.stillHereUp = on;
    this.events.stillHere?.(on);
  }

  private scheduleToken(): void {
    this.cancelToken = this.deps.after(TOKEN_EVERY_MS, () => {
      this.cancelToken = null;
      if (this.ended) return;
      void this.deps
        .token()
        .then((token) => {
          if (token) this.tell({ t: 'token', token });
        })
        .catch(() => {});
      this.scheduleToken();
    });
  }

  private sendView(): void {
    if (!this.open) return;
    this.viewSent = this.viewWanted;
    this.lastViewAt = this.deps.now();
    this.tell({ t: 'view', tank: this.viewWanted });
  }

  private tell(m: ClientMessage): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN || !this.welcomed) return;
    ws.send(JSON.stringify(m));
  }
}
