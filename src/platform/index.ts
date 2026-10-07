/**
 * The platform seam's public API (0.5 design §14). OWNER: lane "platform".
 *
 * UI code calls `platform()`, never a browser API directly: the web platform by default, created on first use, or
 * whatever a native wrapper or a test installed with `setPlatform()`. Persistence doesn't import the platform; a
 * platform's own storage list reaches it at boot through src/ui/platformBoot.ts.
 */
import type { Platform } from './types';
import { createWebPlatform } from './web';

export type { NotifyPermission, NotifyCategory, PlatformNotification, NotificationPort, Platform } from './types';
export { createWebPlatform, APP_ICON, NOTIFICATION_CLICK, type NotificationClickMessage } from './web';
export { createMemoryPlatform, type MemoryPlatform, type MemoryPlatformOptions } from './memory';

let current: Platform | null = null;

/** The active platform. The first call creates the web platform; every later call returns the same object. */
export function platform(): Platform {
  return (current ??= createWebPlatform());
}

/** Install a platform (a native wrapper at boot, or a test). null forgets it: the next platform() makes a web one. */
export function setPlatform(p: Platform | null): void {
  current = p;
}
