// @vitest-environment node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6 "What the check decides"; REL-029) — `decideOnline`, every row of the
 * table, and which row wins where two could apply.
 */
import { describe, it, expect } from 'vitest';
import { decideOnline, deviceChanged, type CloudLink, type DeviceCopy } from '@/ui/online/rules';
import type { CloudSaveMeta } from '@/social';

const V = 30;
const NOW = 1_000_000;
const online = (o: Partial<CloudSaveMeta> = {}): CloudSaveMeta => ({ revision: 4, saveId: 'save_a', schemaVersion: V, savedAt: 500, hour: 100, shopName: 'Coral Corner', day: 5, money: 100, ...o });
const link = (o: Partial<CloudLink> = {}): CloudLink => ({ revision: 4, saveId: 'save_a', savedAt: 500, sentAt: 900, ...o });
const device = (o: Partial<DeviceCopy> = {}): DeviceCopy => ({ saveId: 'save_a', savedAt: 500, localAt: 800, ...o });

describe('decideOnline: §6, row by row', () => {
  it('online none, a game: send it (expected 0)', () => {
    expect(decideOnline(null, null, device(), V, NOW)).toEqual({ kind: 'send', expected: 0 });
    expect(decideOnline(null, link(), device(), V, NOW)).toEqual({ kind: 'send', expected: 0 }); // the account's copy is gone
  });

  it('a newer build’s online save, whatever this device has: blocked (PERSIST-014)', () => {
    expect(decideOnline(online({ schemaVersion: V + 1 }), link(), device(), V, NOW)).toEqual({ kind: 'blocked' });
    expect(decideOnline(online({ schemaVersion: V + 1, revision: 9, saveId: 'save_b' }), null, device(), V, NOW)).toEqual({ kind: 'blocked' });
    expect(decideOnline(online({ schemaVersion: V - 1 }), link(), device(), V, NOW)).toEqual({ kind: 'inStep' }); // older is fine
  });

  it('revision equals the link’s: in step, whatever this device plays (even another aquarium)', () => {
    expect(decideOnline(online(), link(), device(), V, NOW)).toEqual({ kind: 'inStep' });
    expect(decideOnline(online(), link(), device({ localAt: 99_999 }), V, NOW)).toEqual({ kind: 'inStep' });
    expect(decideOnline(online(), link(), device({ saveId: 'save_new' }), V, NOW)).toEqual({ kind: 'inStep' });
  });

  it('changed online since the link, same aquarium, this device unchanged: "A newer save is online"', () => {
    expect(decideOnline(online({ revision: 6 }), link(), device({ localAt: 900 }), V, NOW)).toEqual({ kind: 'prompt', reason: 'newer' });
    expect(decideOnline(online({ revision: 6 }), link(), device({ localAt: 0 }), V, NOW)).toEqual({ kind: 'prompt', reason: 'newer' });
  });

  it('changed online and changed here too: "Your aquarium changed on two devices"', () => {
    expect(decideOnline(online({ revision: 6 }), link(), device({ localAt: 901 }), V, NOW)).toEqual({ kind: 'prompt', reason: 'both' });
  });

  it('no link on this device, same aquarium: the same savedAt links up in step; otherwise the two-devices box', () => {
    expect(decideOnline(online({ savedAt: 500 }), null, device({ savedAt: 500 }), V, NOW)).toEqual({ kind: 'inStep', link: { revision: 4, saveId: 'save_a', savedAt: 500, sentAt: NOW } });
    expect(decideOnline(online({ savedAt: 501 }), null, device({ savedAt: 500 }), V, NOW)).toEqual({ kind: 'prompt', reason: 'both' });
    // a link to another aquarium is no link to this one
    expect(decideOnline(online({ revision: 6 }), link({ saveId: 'save_old' }), device({ savedAt: 1 }), V, NOW)).toEqual({ kind: 'prompt', reason: 'both' });
  });

  it('a different aquarium online, linked or not: "Your account has a different aquarium online" (a new device’s fresh game)', () => {
    expect(decideOnline(online({ saveId: 'save_b' }), null, device(), V, NOW)).toEqual({ kind: 'prompt', reason: 'other' });
    expect(decideOnline(online({ saveId: 'save_b', revision: 7 }), link(), device(), V, NOW)).toEqual({ kind: 'prompt', reason: 'other' });
  });

  it('no game on this device: nothing yet, whatever is online', () => {
    for (const o of [null, online(), online({ schemaVersion: V + 1 }), online({ saveId: 'save_b' })]) expect(decideOnline(o, link(), null, V, NOW)).toEqual({ kind: 'wait' });
  });

  it('this device changed since the link: a local save landed after the last send', () => {
    expect(deviceChanged(link({ sentAt: 900 }), device({ localAt: 900 }))).toBe(false);
    expect(deviceChanged(link({ sentAt: 900 }), device({ localAt: 901 }))).toBe(true);
    expect(deviceChanged(link(), device({ saveId: 'save_b', localAt: 0 }))).toBe(true);
  });
});
