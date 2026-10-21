/**
 * A listing photo a member sends (SHARED-SHOPS.md §4.4): a data URL whose bytes must really be a WebP or a JPEG (the
 * first bytes decide, whatever the URL claims: Safari's canvas can hand back a PNG when asked for WebP), small enough
 * for one command and the database's 64,000 characters.
 */

/** The decoded image's limit: a 48 KB command carries at most this much as base64 (and the table takes 64,000). */
export const MAX_PHOTO_BYTES = 47_000;

const DATA_URL = /^data:image\/(?:jpeg|webp|png);base64,([A-Za-z0-9+/]+={0,2})$/;

export interface Photo {
  mime: 'image/webp' | 'image/jpeg';
  bytes: Uint8Array;
  /** The bytes as base64, as the database keeps them. */
  base64: string;
}

/** What the bytes are: a JPEG (FF D8 FF) or a WebP (RIFF, a size, WEBP); null for anything else. */
export function photoType(b: Uint8Array): Photo['mime'] | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function parsePhoto(url: string): Photo | null {
  if (typeof url !== 'string' || url.length > 64_100) return null;
  const m = DATA_URL.exec(url);
  if (!m) return null;
  const bytes = new Uint8Array(Buffer.from(m[1], 'base64'));
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return null;
  const mime = photoType(bytes);
  if (!mime) return null;
  const base64 = Buffer.from(bytes).toString('base64');
  return { mime, bytes, base64 };
}
