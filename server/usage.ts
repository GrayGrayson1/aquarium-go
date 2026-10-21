/**
 * The caps' meters (SHARED-SHOPS.md §5.7; ADR-0045 decisions 3 and 15): the bytes the server sends (WebSocket frames
 * with their headers, HTTP answers, the database calls), times 1.4 for the WebSocket, TLS and TCP/IP overhead, and its
 * awake seconds, per calendar month (UTC), added to the database's count (`server_usage_add`) every few minutes and on
 * shutdown. At 2 GB in a month, or 400 awake hours, shared shops close until the 1st: the database records it, so the
 * club card can say so without waking the server.
 */
import type { Store, UsageRow } from './store';

/** The overhead the network adds to what the server counts (chunk 10's review: nearer 1.6 for the smallest frames). */
export const WIRE_FACTOR = 1.4;
export const BYTES_CAP = 2_000_000_000;
export const SECONDS_CAP = 400 * 3600;
/** How often the count goes to the database, and the most it may grow before it goes sooner. */
export const FLUSH_EVERY_MS = 5 * 60_000;
export const FLUSH_BYTES = 50_000_000;

/** `YYYY-MM` of a time, in UTC. */
export function monthOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The 1st of the month after `ms`'s, `YYYY-MM-DD`: when closed shops open again. */
export function reopensOn(ms: number): string {
  const d = new Date(ms);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}

/** The bytes a WebSocket frame's header adds to a payload of `n` bytes (server frames aren't masked). */
export const frameHeader = (n: number): number => (n < 126 ? 2 : n < 65536 ? 4 : 10);

export class Usage {
  /** Bytes counted since the last flush (before the factor), and when the awake count last moved. */
  private pendingBytes = 0;
  private awakeFrom: number;
  /** The database's count as of the last flush. */
  row: UsageRow | null = null;
  private flushing: Promise<void> | null = null;
  private lastFlush: number;
  /** Bytes counted since the server started (before the factor), by kind: `/stats`. */
  readonly sent: Record<string, number> = {};

  constructor(
    private readonly store: Store,
    private readonly now: () => number = Date.now,
    private readonly onClosed: (why: 'cap' | 'hours', until: string) => void = () => {},
  ) {
    this.awakeFrom = now();
    this.lastFlush = now();
  }

  count(kind: string, bytes: number): void {
    this.pendingBytes += bytes;
    this.sent[kind] = (this.sent[kind] ?? 0) + bytes;
    if (this.pendingBytes * WIRE_FACTOR >= FLUSH_BYTES) void this.flush();
  }

  /** The month's count as it stands, with what hasn't gone to the database yet. */
  estimate(): { bytes: number; seconds: number; closed: 'cap' | 'hours' | null } {
    const t = this.now();
    const sameMonth = this.row && this.row.month === monthOf(t);
    const bytes = (sameMonth ? this.row!.bytes_out : 0) + this.pendingBytes * WIRE_FACTOR;
    const seconds = (sameMonth ? this.row!.awake_seconds : 0) + (t - this.awakeFrom) / 1000;
    const closed = sameMonth && this.row!.closed ? this.row!.closed : bytes >= BYTES_CAP ? 'cap' : seconds >= SECONDS_CAP ? 'hours' : null;
    return { bytes, seconds, closed };
  }

  /** Closed for the month: the reason and when shops open again, or null. */
  closed(): { why: 'cap' | 'hours'; until: string } | null {
    const c = this.estimate().closed;
    return c ? { why: c, until: reopensOn(this.now()) } : null;
  }

  tick(): void {
    if (this.now() - this.lastFlush >= FLUSH_EVERY_MS) void this.flush();
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = (async () => {
      const t = this.now();
      const month = monthOf(t);
      // a count that crosses the 1st goes to the new month; at most a few minutes' worth lands a month late
      const bytes = this.pendingBytes * WIRE_FACTOR;
      const seconds = Math.max(0, (t - this.awakeFrom) / 1000);
      this.pendingBytes = 0;
      this.awakeFrom = t;
      this.lastFlush = t;
      const wasClosed = this.row?.month === month ? this.row.closed : null;
      try {
        this.row = await this.store.usageAdd(month, bytes, seconds);
      } catch {
        // put it back for next time
        this.pendingBytes += bytes / WIRE_FACTOR;
        this.awakeFrom -= seconds * 1000;
      }
      const c = this.row?.month === month ? this.row.closed : null;
      if (c && c !== wasClosed) this.onClosed(c, reopensOn(t));
    })().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }
}
