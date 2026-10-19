/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6) — how a save travels to the online copy and back: the text of an
 * export file (`exportSaveText`), gzipped with the browser's CompressionStream and base64'd (`gzip-base64`), or as it
 * is (`json`) where the browser has no CompressionStream. OWNER: lane "social". No game state here: text in, text out.
 */
import type { CloudBody } from './service';

/** The server keeps a body of at most this many characters (ONLINE-STAGE1.md §4.1); a longer one isn't sent. */
export const MAX_CLOUD_BODY = 4_000_000;

/** A body that unpacks past this is refused (the importer's own limit is 64 MB): no unpacking without end. */
const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;

export const canCompress = (): boolean => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function';

/** Pack a save's text: gzip and base64 where the browser can (`compress: false` forces the plain form). */
export async function encodeSaveBody(text: string, opts: { compress?: boolean } = {}): Promise<CloudBody> {
  if (opts.compress === false || !canCompress()) return { encoding: 'json', body: text };
  const packed = new Response(text).body!.pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(packed).arrayBuffer());
  return { encoding: 'gzip-base64', body: toBase64(bytes) };
}

/** Unpack a body back into the save's text. Throws on an unknown encoding, bad base64, bad gzip or a runaway size. */
export async function decodeSaveBody(b: CloudBody): Promise<string> {
  if (b.encoding === 'json') return b.body;
  if (b.encoding !== 'gzip-base64') throw new Error(`unknown save encoding ${String(b.encoding)}`);
  if (!canCompress()) throw new Error('this browser cannot unpack a gzipped save');
  const bytes = fromBase64(b.body);
  const reader = new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip')).getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_UNPACKED_BYTES) {
      await reader.cancel();
      throw new Error('the online save unpacks too large');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
