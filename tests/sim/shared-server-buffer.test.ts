// @vitest-environment node
/**
 * Chunk 12's confirmation pass (its blocker): a member whose socket has more than MAX_BUFFERED queued is dropped at
 * once, and nothing about it can loop or throw. Before the fix, send() ended the connection through end(), whose `bye`
 * went back through send(), until the stack ran out: the other members lost their frames and one malformed message
 * crashed the server. This file makes the server's own socket for one member report 9 MB queued (the `ws` package's
 * socket, patched here only).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket as WsSocket } from 'ws';
import { StubWorld } from '../../server/stub';
import { MAX_BUFFERED } from '../../server/app';
import { pump, rig, shopText, sleep, type Rig } from './support/sharedServer';

const proto = WsSocket.prototype as unknown as Record<string, unknown>;
const buffered = Object.getOwnPropertyDescriptor(WsSocket.prototype, 'bufferedAmount')!;
const send = proto.send as (this: unknown, ...a: unknown[]) => unknown;
/** The server's socket for each member, learned from the welcome it sends them. */
const socketOf = new Map<string, object>();
const stuck = new WeakSet<object>();
Object.defineProperty(WsSocket.prototype, 'bufferedAmount', {
  configurable: true,
  get(this: object) {
    return stuck.has(this) ? MAX_BUFFERED + 1_000_000 : (buffered.get as () => number).call(this);
  },
});
proto.send = function (this: object, data: unknown, ...rest: unknown[]) {
  if (typeof data === 'string' && data.startsWith('{"t":"welcome"')) socketOf.set((JSON.parse(data) as { you: { id: string } }).you.id, this);
  return send.call(this, data, ...rest);
};

let r: Rig | null = null;
afterEach(async () => {
  await r?.stop();
  r = null;
});

describe('chunk 12: a member who stops reading', () => {
  it('is dropped at once; the others keep getting every frame; nothing they send afterwards throws', async () => {
    const world = new StubWorld();
    const x = (r = await rig({ world }));
    world.addClub('club_1', ['u_o', 'u_a', 'u_b'], { text: shopText() });
    const ann = await x.join('stub:a:Ann', 'club_1');
    const ben = await x.join('stub:b:Ben', 'club_1');
    const owner = await x.join('stub:o:Owner:owner', 'club_1');
    owner.send({ t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 3 } });
    await pump(x.time, () => ben.texts('steps').length > 0, { step: 100 });
    stuck.add(socketOf.get('u_a')!);
    const before = ben.texts('steps').length;
    ann.send({ t: 'cmd', id: 2, c: { k: 'raiseFlag', name: 'opened_market' } });
    ann.send('{"t":');
    await pump(x.time, () => ann.closed !== null && ben.texts('steps').length > before + 2, { step: 250, what: 'Ann dropped, Ben still served' });
    await sleep(50);
    expect(x.logs.filter((l) => /call stack|RangeError/.test(l))).toEqual([]);
    expect(ben.closed).toBeNull();
    expect(owner.closed).toBeNull();
  });
});
