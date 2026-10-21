/**
 * The shared-shop server's entry (SHARED-SHOPS.md §5): reads its settings (./config.ts), signs members in with
 * Supabase Auth and keeps shops in the database through the server's password (ADR-0047), or runs on the in-memory
 * stub (`SHOPS_STUB=1`: tests, e2e and dev, with the dev fixtures' stub shops as open clubs). SIGTERM (a Render deploy
 * or restart) saves every room and writes the month's meters before exiting.
 */
import { readConfig } from './config';
import { createShopServer } from './app';
import { supabaseAuth } from './auth';
import { supabaseStore, StoreError, type Store } from './store';
import { StubWorld } from './stub';
import { shopDir } from './shops';

const config = readConfig();
let meter: (bytes: number) => void = () => {};
let store: Store;
let auth;
if (config.stub) {
  const world = new StubWorld();
  const shops = world.addStubShops(shopDir());
  store = world.store;
  auth = world.auth;
  console.log(`[server] stub accounts and storage; stub shops: ${shops.join(', ') || 'none'}`);
} else if (config.project && config.key) {
  store = supabaseStore(config.project, config.key, (b) => meter(b));
  auth = supabaseAuth(config.project, (b) => meter(b));
} else {
  // no password yet (the owner pastes it into Render, ADR-0047): nothing can sign in or load, and /health says so
  const missing = (): Promise<never> => Promise.reject(new StoreError('SHOPS_SERVER_KEY is not set'));
  store = new Proxy({} as Store, { get: () => missing });
  auth = { verify: async () => null };
  console.log('[server] SHOPS_SERVER_KEY is not set: shared shops stay closed');
}

const app = createShopServer({ config, store, auth, shopsDir: shopDir() });
meter = (b) => app.usage.count('db', b);

const port = await app.listen();
console.log(`[server] shared shops ${config.version} on :${port}${config.stub ? ' (stub)' : ''}`);

let ending = false;
process.on('SIGTERM', () => {
  if (ending) return;
  ending = true;
  console.log('[server] SIGTERM: saving every shop');
  app.shutdown().then(
    () => process.exit(0),
    () => process.exit(1),
  );
});
