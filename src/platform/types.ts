/**
 * Platform contracts (0.5 design §14). OWNER: lane "platform".
 *
 * A thin seam so the game never calls browser APIs directly (notifications, the clipboard, the share sheet, the page
 * lifecycle) and a native wrapper can be dropped in later. The web implementation is ./web.ts, the in-memory test
 * double ./memory.ts, and ./index.ts holds the active one. src/platform makes no runtime imports from persistence,
 * sim, state or ui; type-only imports are fine (KVBackend below).
 */
import type { KVBackend } from '@/persistence/storage';

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';
export type NotifyCategory = 'rare' | 'care' | 'market' | 'breeding' | 'shows' | 'test';
export interface PlatformNotification { id: string; title: string; body: string; route: string | null; category: NotifyCategory }

export interface NotificationPort {
  permission(): NotifyPermission;
  request(): Promise<NotifyPermission>;                        // call only from a user gesture
  show(n: PlatformNotification): Promise<boolean>;             // false = not shown (no permission / unsupported)
  schedule?(n: PlatformNotification, at: Date): Promise<boolean>; // native only (§12.7)
  cancelAll?(): Promise<void>;                                 // native only
  onOpen(cb: (route: string | null) => void): () => void;      // a notification was tapped
}

export interface Platform {
  kind: 'web' | 'native';
  notifications: NotificationPort;
  clipboard: { write(text: string): Promise<boolean> };
  share?(data: { title: string; url: string }): Promise<boolean>;
  lifecycle: { onPause(cb: () => void): () => void; onResume(cb: () => void): () => void };
  storageCandidates?(): KVBackend[];                           // optional: only a native platform supplies its own list
}
