/**
 * The few types the server uses from `ws` 8.22.0 (ADR-0045 decision 2: `ws` approved, without `@types/ws`).
 */
declare module 'ws' {
  import type { IncomingMessage } from 'node:http';
  import type { Duplex } from 'node:stream';
  import { EventEmitter } from 'node:events';

  export class WebSocket extends EventEmitter {
    static readonly OPEN: 1;
    readonly readyState: number;
    readonly bufferedAmount: number;
    send(data: string | Uint8Array, cb?: (err?: Error) => void): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
    ping(): void;
    on(event: 'message', listener: (data: Buffer, isBinary: boolean) => void): this;
    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'pong', listener: () => void): this;
  }

  export interface ServerOptions {
    noServer?: boolean;
    maxPayload?: number;
    perMessageDeflate?: boolean;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: ServerOptions);
    handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, cb: (ws: WebSocket, req: IncomingMessage) => void): void;
    close(cb?: () => void): void;
  }
}
