// @vitest-environment node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6 "What goes up"; REL-029) — a save's text travels gzipped and base64'd
 * (`gzip-base64`) where the browser has CompressionStream, and as it is (`json`) where it doesn't; both come back as
 * the same text, and a body that isn't one of ours is refused.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { exportSaveText, importSaveText } from '@/persistence';
import { canCompress, decodeSaveBody, encodeSaveBody, MAX_CLOUD_BODY } from '@/social';

describe('the online save’s body', () => {
  const text = exportSaveText(newGame({ starterId: 'betta', starterName: 'Ember', seed: 12 }));

  it('gzip-base64: much smaller, base64 only, and back to the same text, which imports', async () => {
    expect(canCompress()).toBe(true);
    const b = await encodeSaveBody(text);
    expect(b.encoding).toBe('gzip-base64');
    expect(b.body).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(b.body.length).toBeLessThan(text.length / 2);
    const back = await decodeSaveBody(b);
    expect(back).toBe(text);
    expect((await importSaveText(back)).ok).toBe(true);
  });

  it('the json fallback (no CompressionStream): the text as it is', async () => {
    const b = await encodeSaveBody(text, { compress: false });
    expect(b).toEqual({ encoding: 'json', body: text });
    expect(await decodeSaveBody(b)).toBe(text);
  });

  it('keeps text that isn’t ASCII exactly (names with accents, curly quotes, emoji)', async () => {
    const odd = '{"shopName":"Zoë’s “Reef” 🐠","x":"' + 'é'.repeat(100_000) + '"}';
    expect(await decodeSaveBody(await encodeSaveBody(odd))).toBe(odd);
  });

  it('refuses an unknown encoding, bad base64 and bytes that aren’t gzip', async () => {
    await expect(decodeSaveBody({ encoding: 'zip' as 'json', body: 'x' })).rejects.toThrow();
    await expect(decodeSaveBody({ encoding: 'gzip-base64', body: '***' })).rejects.toThrow();
    await expect(decodeSaveBody({ encoding: 'gzip-base64', body: btoa('not gzip at all') })).rejects.toThrow();
  });

  it('the server’s limit is 4,000,000 characters', () => {
    expect(MAX_CLOUD_BODY).toBe(4_000_000);
  });
});
