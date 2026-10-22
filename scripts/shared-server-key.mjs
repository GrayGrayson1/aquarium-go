#!/usr/bin/env node
/**
 * chunk 12 (ADR-0047; docs/agent/design/SHARED-SHOPS.md §5.8) — the shared-shop server's password. The server uses no
 * Supabase key: a secret key acts as service_role and also opens Supabase Auth's admin tools (listing players' emails,
 * deleting accounts), which no database rule can limit. Instead the server calls its own functions
 * (supabase/migrations/20261021000000_shared_shops.sql) with the publishable key, and each refuses unless it is given a
 * password whose SHA-256 equals the one fingerprint stored in private.server_key. Run by the agent on the owner's Mac
 * when the owner is ready, never by `npm test` or e2e:
 *
 *   node scripts/shared-server-key.mjs --yes     (the Supabase CLI signed in; this clone linked to the project)
 *
 * It makes a random 256-bit password (43 characters, base64url), puts it on the clipboard (pbcopy, through its standard
 * input), then stores only its SHA-256 through the Supabase CLI, scoped to the project. The password is never printed,
 * logged, written to a file or passed as an argument (only the fingerprint reaches the CLI), so the agent never sees
 * it: the owner pastes it into the Render service aquarium-go-shops as SHOPS_SERVER_KEY. Running it again replaces the
 * password, and the old one stops working at once. If storing fails, the clipboard is emptied and nothing changes.
 * Without --yes it only says what it would do.
 */
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REF = 'zkavcxrsxdgdlstravpj';
const CLI = process.env.SUPABASE_CLI ?? `${process.env.HOME}/.local/bin/supabase`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);

const PLAN = `This makes the shared-shop server's password (ADR-0047):
  1. a random 256-bit password (43 characters), never shown;
  2. the password onto the clipboard (pbcopy);
  3. its SHA-256 fingerprint into private.server_key in the Supabase project ${REF}, with
     ${CLI} db query --linked --project-ref ${REF}
     replacing any password stored before (the old one stops working at once).
Then paste it into the Render service aquarium-go-shops as SHOPS_SERVER_KEY.
Run it with --yes to do this.`;

if (args.includes('--help') || args.includes('-h')) {
  console.log(PLAN);
  process.exit(0);
}
if (args.some((a) => a !== '--yes')) {
  console.error(`The only option is --yes.\n\n${PLAN}`);
  process.exit(2);
}
if (!args.includes('--yes')) {
  console.log(PLAN);
  process.exit(1);
}
if (process.platform !== 'darwin') {
  console.error('This needs macOS: pbcopy puts the password on the clipboard. Nothing was changed.');
  process.exit(2);
}

/** Put text on the clipboard through pbcopy's standard input (never an argument). */
function clipboard(text) {
  execFileSync('pbcopy', [], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
}

const password = randomBytes(32).toString('base64url');
const fingerprint = createHash('sha256').update(password, 'utf8').digest('hex');
if (password.length !== 43 || !/^[0-9a-f]{64}$/.test(fingerprint)) {
  console.error('The password came out the wrong shape. Nothing was changed.');
  process.exit(2);
}

// the clipboard first: if it fails, nothing is stored, and the server's current password (if any) keeps working
try {
  clipboard(password);
} catch {
  console.error('Could not put the password on the clipboard (pbcopy failed). Nothing was changed.');
  process.exit(1);
}

const sql = `insert into private.server_key (id, key_hash) values (1, decode('${fingerprint}', 'hex')) on conflict (id) do update set key_hash = excluded.key_hash, set_at = now()`;
try {
  execFileSync(CLI, ['db', 'query', '--linked', '--project-ref', REF, sql], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] });
} catch (e) {
  try {
    clipboard('');
  } catch {
    // the clipboard keeps a password nothing accepts
  }
  const missing = e?.code === 'ENOENT' ? `\nNo Supabase CLI at ${CLI} (set SUPABASE_CLI to its path).` : '';
  const said = typeof e?.stderr === 'string' && e.stderr.trim() ? `\nThe Supabase CLI said:\n${e.stderr.trim().split('\n').slice(-4).join('\n')}` : '';
  console.error(`Storing the fingerprint failed, so nothing changed (any password stored before still works) and the clipboard was emptied.${missing}${said}`);
  process.exit(1);
}

console.log(`Stored the new password's fingerprint in the Supabase project ${REF}.
The password is on your clipboard: paste it into the Render service aquarium-go-shops as SHOPS_SERVER_KEY
(Environment), then save. Running this again replaces the password; the old one stops working at once.`);
