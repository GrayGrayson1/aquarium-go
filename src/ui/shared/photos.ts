/**
 * chunk 13 (SHARED-SHOPS.md §4.4; SHARE-018) — listing photos in a shared shop. A photo is taken small (about 320
 * pixels wide: WebP, or JPEG when the browser hands back something else, as Safari's canvas can) so `createListing` fits
 * in one command (48 KB), and every copy then holds the server's reference (`p:` and the picture's hash), never the
 * picture. A reference is drawn from the bytes fetched over the shop's connection, once per hash for the visit (the
 * server sends each one once per connection), as an object URL made from those bytes: the reference itself never goes
 * in an `<img src>`. OWNER: lane "social".
 */
import { useEffect, useState } from 'react';
import { PHOTO_REF } from '@/types/shared';
import { capturePhoto } from '@/render/camera/photo';

/** The shrunk photo's width, and the most base64 it may take (the server takes 47,000 bytes; this leaves room). */
export const SHARED_PHOTO_WIDTH = 320;
export const SHARED_PHOTO_MAX_CHARS = 44_000;

const fits = (url: string, mime: string) => url.startsWith(`data:${mime};base64,`) && url.length - url.indexOf(',') - 1 <= SHARED_PHOTO_MAX_CHARS;

/**
 * A listing photo for a shared shop: WebP where the browser makes one, else JPEG, at falling qualities until it fits.
 * `capture` is the camera (tests pass their own). Null when nothing fits or the camera can't.
 */
export async function captureSharedPhoto(capture: typeof capturePhoto = capturePhoto): Promise<string | null> {
  for (const format of ['image/webp', 'image/jpeg'] as const) {
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const url = await capture({ width: SHARED_PHOTO_WIDTH, hideUI: true, format, quality }).catch(() => null);
      if (!url) return null;
      // asked for WebP and given a PNG (Safari): JPEG instead
      if (!url.startsWith(`data:${format};`)) break;
      if (fits(url, format)) return url;
    }
  }
  return null;
}

// ── the visit's pictures ───────────────────────────────────────────────────────────────────────────────────────

interface Entry {
  url: string | null;
  asked: boolean;
  listeners: Set<() => void>;
}

const pictures = new Map<string, Entry>();
let requester: ((hash: string) => boolean) | null = null;

/** The session's connection asks the server for a photo (true when it was sent). */
export function setPhotoRequester(r: ((hash: string) => boolean) | null): void {
  requester = r;
  // a new connection: the ones not yet in can be asked for again
  if (r) for (const [hash, e] of pictures) if (!e.url && e.listeners.size) e.asked = r(hash);
}

/** A photo arrived over the connection. */
export function photoArrived(hash: string, mime: string, bytes: Uint8Array): void {
  const e = pictures.get(hash) ?? { url: null, asked: true, listeners: new Set() };
  if (e.url) return;
  try {
    e.url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  } catch {
    return;
  }
  pictures.set(hash, e);
  for (const l of e.listeners) l();
}

/** Leaving the shop: the pictures go. */
export function clearSharedPhotos(): void {
  for (const e of pictures.values()) if (e.url) URL.revokeObjectURL(e.url);
  pictures.clear();
}

/** The picture for a shared shop's photo reference, fetched when first shown; null until it's in. */
export function useSharedPhoto(ref: string | undefined): string | null {
  const hash = ref && PHOTO_REF.test(ref) ? ref.slice(2) : null;
  const [, bump] = useState(0);
  useEffect(() => {
    if (!hash) return;
    let e = pictures.get(hash);
    if (!e) {
      e = { url: null, asked: false, listeners: new Set() };
      pictures.set(hash, e);
    }
    const l = () => bump((n) => n + 1);
    e.listeners.add(l);
    if (!e.url && !e.asked && requester) e.asked = requester(hash);
    const entry = e;
    return () => {
      entry.listeners.delete(l);
    };
  }, [hash]);
  return hash ? (pictures.get(hash)?.url ?? null) : null;
}
