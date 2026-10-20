/**
 * The prototype's stub shops (chunk 10): saves built from the dev fixtures at build time
 * (scripts/shared-stub-shops.ts writes dist-server/shops/<name>.save), loaded as a wake loads a shop from the
 * database (§5.2 item 1): the worker decodes, migrates and repairs one (./roomWorker.ts). The main thread reads only the
 * files, so it never loads the simulation. Chunk 12 replaces this with the database.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const STUB_SHOPS = ['big_facility', 'playthrough_betta', 'playthrough_axolotl', 'new_betta'] as const;

export function shopDir(): string {
  return process.env.SHOPS_DIR ?? join(import.meta.dirname, 'shops');
}

export function availableShops(dir = shopDir()): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.save'))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch {
    return [];
  }
}

export function loadShopText(name: string, dir = shopDir()): string {
  if (!/^[a-z0-9_]{1,40}$/.test(name)) throw new Error('bad shop name');
  return readFileSync(join(dir, `${name}.save`), 'utf8');
}
