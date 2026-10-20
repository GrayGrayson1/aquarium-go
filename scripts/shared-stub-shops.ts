/**
 * The shared-shop prototype's stub shops (chunk 10, SHARED-SHOPS.md §10): builds a few dev fixtures and writes each as
 * a save (the online save's encoding) into dist-server/shops/, which the server loads as a wake loads a shop from the
 * database. Run by `npm run build:server` (vite-node, so the fixtures' imports resolve as in the game).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES } from '@/dev/fixtures';
import { encodeRecord } from '@/persistence/serialize';
import { newGame } from '@/sim/newGame';

const out = process.argv[2] ?? join(process.cwd(), 'dist-server', 'shops');
mkdirSync(out, { recursive: true });
const shops: Record<string, () => ReturnType<typeof newGame>> = {
  big_facility: () => FIXTURES.big_facility(),
  playthrough_betta: () => FIXTURES.playthrough_betta(),
  playthrough_axolotl: () => FIXTURES.playthrough_axolotl(),
  new_betta: () => newGame({ seed: 20261020, starterId: 'betta', starterName: '', shopName: 'Shared shop (test)' }),
};
for (const [name, make] of Object.entries(shops)) {
  const t0 = performance.now();
  const { text } = encodeRecord(make(), 'shared', 0);
  writeFileSync(join(out, `${name}.save`), text);
  console.log(`[stub shops] ${name}: ${(text.length / 1024).toFixed(0)} KB in ${(performance.now() - t0).toFixed(0)} ms`);
}
