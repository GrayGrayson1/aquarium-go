/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6; REL-029) — what the online-save check decides, as a pure function
 * (online-rules.test.ts walks every row of §6's table). OWNER: lane "social".
 *
 * This device's link (per account, in localStorage, never in the save) is the online copy this device last sent or
 * loaded: its revision and aquarium (`saveId`), and when this device last sent one (`sentAt`). Whether this device's
 * game changed since then is `localAt > sentAt`, where `localAt` is when a local save of that aquarium last landed on
 * this device (tracked even while signed out). Comparing the device's own clock with itself keeps the answer honest
 * when two devices' clocks disagree.
 */
import type { CloudSaveMeta } from '@/social';

export interface CloudLink {
  /** The online copy's revision when this device last sent or loaded it. */
  revision: number;
  saveId: string;
  /** That copy's `savedAt` (the writing device's `lastSavedRealMs`). */
  savedAt: number;
  /** This device's clock when it last sent (or loaded) the copy. */
  sentAt: number;
}

/** The game on this device, as the check sees it (null: no game, or a showcase). */
export interface DeviceCopy {
  saveId: string;
  /** The game's `lastSavedRealMs`. */
  savedAt: number;
  /** This device's clock when a local save of this aquarium last landed (0: none seen). */
  localAt: number;
}

export type CloudPromptKind = 'newer' | 'both' | 'other';

export type OnlineDecision =
  /** No game on screen: nothing yet (Social opens only inside a game). */
  | { kind: 'wait' }
  /** The online save comes from a newer build: never send this session (PERSIST-014). */
  | { kind: 'blocked' }
  /** No online save: send this one (expected revision 0). */
  | { kind: 'send'; expected: 0 }
  /** In step: send when the game next saves. `link`: adopt this link first (a same-aquarium copy with no link). */
  | { kind: 'inStep'; link?: CloudLink }
  /** The box: which copy to keep. */
  | { kind: 'prompt'; reason: CloudPromptKind };

/** Has this device's game changed since the link? */
export const deviceChanged = (link: CloudLink, device: DeviceCopy): boolean => device.saveId !== link.saveId || device.localAt > link.sentAt;

/** ONLINE-STAGE1.md §6's table, row by row. */
export function decideOnline(online: CloudSaveMeta | null, link: CloudLink | null, device: DeviceCopy | null, schemaVersion: number, now: number): OnlineDecision {
  if (!device) return { kind: 'wait' };
  if (!online) return { kind: 'send', expected: 0 };
  if (online.schemaVersion > schemaVersion) return { kind: 'blocked' };
  // nothing new online since this device last sent or loaded it: this device goes on sending, whatever it plays
  if (link && online.revision === link.revision) return { kind: 'inStep' };
  if (online.saveId !== device.saveId) return { kind: 'prompt', reason: 'other' };
  if (!link || link.saveId !== online.saveId) {
    // this aquarium, but no link to it on this device: the very same copy links up, anything else asks
    return online.savedAt === device.savedAt ? { kind: 'inStep', link: { revision: online.revision, saveId: online.saveId, savedAt: online.savedAt, sentAt: now } } : { kind: 'prompt', reason: 'both' };
  }
  return deviceChanged(link, device) ? { kind: 'prompt', reason: 'both' } : { kind: 'prompt', reason: 'newer' };
}
