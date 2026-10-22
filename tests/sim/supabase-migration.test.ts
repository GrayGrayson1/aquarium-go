// @vitest-environment node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §4, §8.1; REL-027) — the database's rules, read from every file in
 * supabase/migrations, in order (no Docker on the owner's Mac, so no local Supabase: this test reads the SQL's text,
 * scripts/online-db-local/run.sh runs it on a throwaway Postgres, and scripts/online-smoke.mjs checks the live project).
 *
 * The browser touches no table: every public table enables row-level security and none disables it; there is no
 * `create policy`, no view, no table grant, no blanket grant or default privilege; each table's privileges are revoked
 * from anon and authenticated. The functions the game calls (§4.3) do their work as SECURITY DEFINER functions in the
 * schema `private`, which the API doesn't expose (moved there by the second file, as Supabase's security advisors ask:
 * lints 0028 and 0029), each with an empty search_path and the auth.uid() check (resolve_invite may be anon); in
 * `public` each name is a SECURITY INVOKER function that only calls its private twin. EXECUTE is revoked from public
 * and anon on every function (and from authenticated on helpers and triggers) and never granted to PUBLIC; the callable
 * ones are granted to authenticated, resolve_invite alone to anon too. Both triggers on auth.users exist; the size
 * limits and the invite code's shape are there. The last block proves the checks fail on copies with one rule broken,
 * placed early in the files (a check that only looked at the end would miss them: the chunk 8 review's B4).
 *
 * Chunk 9 (ADR-0044 decision 2; the audit's A1 and B2): the latest resolve_invite and add_friend answer a read-only call
 * (an API GET) the same for every code, before any lookup; the save functions' twins (TWINS) are made in `private` from
 * the start, behind public wrappers like the rest, and refuse any account but the one the game names.
 *
 * Chunk 12 (ADR-0047; SHARED-SHOPS.md §5.8, §6, §9.1's guards): the shared shops' tables (and private.server_key, the
 * server's password's fingerprint) are as closed as stage 1's, to service_role too. Each server function (SERVER) is a
 * private definer function whose first statement checks the server's password (private.require_server, which compares
 * its SHA-256 with the stored one and is granted to nobody) behind a public wrapper that only anon may call, never a
 * player or service_role; the game's two (GAME) follow stage 1's rules. service_role's rights on every table and
 * function made before go, and the default privileges stop granting it anything, before any new object is made: the
 * only default-privilege changes allowed are those three revokes (the rule that no default privilege changes becomes
 * this one on purpose: it still forbids any grant), and nothing anywhere is granted to service_role.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

/** The functions the game calls (ONLINE-STAGE1.md §4.3), each granted to `authenticated`; only resolve_invite to anon. */
const CALLABLE = ['resolve_invite', 'me', 'my_clubs', 'join_club', 'create_club', 'add_friend', 'friend_requests', 'accept_friend', 'friends_aquariums', 'report_standing', 'leaderboard', 'news', 'mark_seen', 'save_meta', 'get_save', 'put_save', 'delete_my_account'];
const ANON = ['resolve_invite'];
/** Chunk 9 (B2): the save functions for a named account, made in `private` from the start, granted to `authenticated`. */
const TWINS = ['save_meta_for', 'get_save_for', 'put_save_for'];
const STAGE1_TABLES = ['profiles', 'clubs', 'club_members', 'friend_links', 'saves', 'invite_misses'];
/** Chunk 12 (SHARED-SHOPS.md §6.1): the shared shops' tables, as closed to the browser as stage 1's. */
const SHARED_TABLES = ['shared_shops', 'shared_photos', 'shared_usage'];
const TABLES = [...STAGE1_TABLES, ...SHARED_TABLES];
/** Chunk 12 (ADR-0047): the server's functions, each behind the server's password, callable only by anon. */
const SERVER = ['server_member', 'server_shop_get', 'server_shop_create', 'server_shop_put', 'server_shop_take', 'server_shop_release', 'server_set_pausers', 'server_photo_put', 'server_photo_get', 'server_photo_hashes', 'server_photos_delete', 'server_usage_add'];
/** Chunk 12: the game's two, made as stage 1's are, granted to `authenticated`. */
const GAME = ['club_shared_shops', 'shared_usage'];
/** Chunk 12 (§5.8): the only default privileges that may change: service_role's in public, taken away. */
const DEFAULTS = ['tables', 'functions', 'sequences'].map((k) => `alter default privileges in schema public revoke all on ${k} from service_role;`);
/**
 * The size limits §4.1 names, and the invite code's shape (ADR-0042), as the SQL writes them, each in its own table's
 * definition (chunk 12: shared_shops repeats the save's body limit, which must not stand in for the save's own).
 */
const LIMITS: [string, RegExp][] = [
  ['profiles', /char_length\(btrim\(display_name\)\) between 1 and 30/],
  ['clubs', /char_length\(btrim\(name\)\) between 2 and 40/],
  ['clubs', /char_length\(blurb\) <= 80/],
  ['profiles', /char_length\(shop_name\) <= 60/],
  ['saves', /char_length\(shop_name\) <= 60/],
  ['profiles', /char_length\(snapshot\) <= 200000/],
  ['saves', /char_length\(body\) <= 4000000/],
  ['saves', /char_length\(previous_body\) <= 4000000/],
  ['clubs', /invite_code ~ '\^\[a-z\]\{2,10\}-\[a-hj-np-z\]\{4\}\$'/],
  // chunk 12 (§6.1)
  ['shared_shops', /char_length\(btrim\(shop_name\)\) between 1 and 60/],
  ['shared_shops', /cardinality\(pausers\) <= 50/],
  ['shared_shops', /char_length\(body\) <= 4000000/],
  ['shared_photos', /hash ~ '\^\[0-9a-f\]\{64\}\$'/],
  ['shared_photos', /char_length\(data\) <= 64000/],
  ['server_key', /octet_length\(key_hash\) = 32/],
];

/** The SQL without comments, lower-cased, whitespace folded (string literals kept: they hold no `--`). */
function normalize(sql: string): string {
  return sql
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

interface Fn {
  /** where in the text it is made */
  at: number;
  schema: string;
  name: string;
  header: string;
  body: string;
}

/** Every `create function` in order: where it was made, its header (up to `as $$`) and its body. */
function functionsOf(sql: string): Fn[] {
  const out: Fn[] = [];
  const re = /create (?:or replace )?function (public|private)\.(\w+)\s*\(/g;
  for (let m = re.exec(sql); m; m = re.exec(sql)) {
    const open = sql.indexOf(' as $$', m.index);
    const close = sql.indexOf('$$;', open + 6);
    out.push({ at: m.index, schema: m[1], name: m[2], header: sql.slice(m.index, open), body: open < 0 ? '' : sql.slice(open + 6, close) });
  }
  return out;
}

const revoked = (sql: string, name: string, role: string, schema = 'public'): boolean => new RegExp(`revoke execute on function ${schema}\\.${name}\\([^)]*\\) from [a-z_, ]*\\b${role}\\b`).test(sql);
const grantedIn = (sql: string, schema: string, name: string, role: string): boolean => new RegExp(`grant execute on function ${schema}\\.${name}\\([^)]*\\) to [a-z_, ]*\\b${role}\\b`).test(sql);
const granted = (sql: string, name: string, role: string): boolean => new RegExp(`grant execute on function (?:public|private)\\.${name}\\([^)]*\\) to [a-z_, ]*\\b${role}\\b`).test(sql);
const tableRevoked = (sql: string, schema: string, table: string, role: string): boolean => new RegExp(`revoke all on table ${schema}\\.${table} from [a-z_, ]*\\b${role}\\b`).test(sql);
const moved = (sql: string, name: string): boolean => new RegExp(`alter function public\\.${name}\\([^)]*\\) set schema private;`).test(sql);

/** Everything wrong with the migrations' text, all files in order (empty: they keep the rules). */
export function migrationProblems(raw: string): string[] {
  const sql = normalize(raw);
  const out: string[] = [];
  const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
  for (const t of TABLES) if (!tables.includes(t)) out.push(`missing table ${t}`);
  for (const t of tables) {
    if (!sql.includes(`alter table public.${t} enable row level security`)) out.push(`${t}: row-level security not enabled`);
    if (!new RegExp(`revoke all on table public\\.${t} from [a-z, ]*\\banon\\b`).test(sql) || !new RegExp(`revoke all on table public\\.${t} from [a-z, ]*\\bauthenticated\\b`).test(sql)) out.push(`${t}: table privileges not revoked from anon and authenticated`);
    if (!tableRevoked(sql, 'public', t, 'service_role')) out.push(`${t}: table privileges not revoked from service_role`);
  }
  // chunk 12: a table in private (the server's password's fingerprint) is closed to everyone too
  const privateTables = [...sql.matchAll(/create table private\.(\w+)/g)].map((m) => m[1]);
  if (!privateTables.includes('server_key')) out.push('missing table private.server_key');
  for (const t of privateTables) {
    if (!sql.includes(`alter table private.${t} enable row level security`)) out.push(`private.${t}: row-level security not enabled`);
    for (const role of ['public', 'anon', 'authenticated', 'service_role']) if (!tableRevoked(sql, 'private', t, role)) out.push(`private.${t}: table privileges not revoked from ${role}`);
  }
  if (/disable row level security|no force row level security/.test(sql)) out.push('row-level security is turned off somewhere');
  if (/create policy/.test(sql)) out.push('a policy exists (the browser touches no table)');
  if (/create (?:or replace )?(?:materialized )?view/.test(sql)) out.push('a view exists (it would read the tables as its owner)');
  // any grant of a privilege on a table, a sequence or a schema's tables, anywhere in the files
  const nonFunctionGrants = sql.replace(/grant execute on function [^;]*;/g, '').replace(/grant usage on schema private to [^;]*;/g, '');
  if (/\bgrant [a-z, ]+ on /.test(nonFunctionGrants)) out.push('a table or schema privilege is granted');
  // chunk 12 (§5.8): the only default privileges that change are service_role's in public, taken away
  for (const m of sql.matchAll(/alter default privileges[^;]*;/g)) if (!DEFAULTS.includes(m[0])) out.push(`a default privilege changes: ${m[0]}`);
  if (/\bgrant [^;]*\bto [^;]*\bservice_role\b/.test(sql)) out.push('something is granted to service_role');
  if (/grant execute on function [^;]* to [a-z, ]*\bpublic\b/.test(sql)) out.push('execute granted to public');
  if (!/create schema private;/.test(sql) || !/revoke all on schema private from public;/.test(sql)) out.push('the private schema is missing or open');
  const fns = functionsOf(sql);
  for (const c of CALLABLE) {
    const defs = fns.filter((f) => f.name === c && f.schema === 'public');
    const anon = ANON.includes(c);
    if (defs.length !== 2 || !moved(sql, c)) {
      out.push(`${c}: not a private function behind a public wrapper`);
      continue;
    }
    const [work, wrapper] = defs;
    if (!/\bsecurity definer\b/.test(work.header)) out.push(`${c}: its private function isn't security definer`);
    if (!work.header.includes("set search_path = ''")) out.push(`${c}: its private function's search_path isn't empty`);
    if (!anon && !work.body.includes('public.require_uid()')) out.push(`${c}: doesn't check who is calling`);
    if (!/\bsecurity invoker\b/.test(wrapper.header) || /\bsecurity definer\b/.test(wrapper.header)) out.push(`${c}: its public wrapper isn't security invoker`);
    if (!wrapper.header.includes("set search_path = ''")) out.push(`${c}: its public wrapper's search_path isn't empty`);
    if (!new RegExp(`^ select private\\.${c}\\([^;]*\\); $`).test(wrapper.body)) out.push(`${c}: its public wrapper does more than call private.${c}`);
    // what's said before the move is about the private function; what's said after the wrapper is made, the wrapper
    const moveAt = sql.search(new RegExp(`alter function public\\.${c}\\([^)]*\\) set schema private;`));
    const wrapperAt = sql.indexOf(wrapper.header);
    for (const [part, text] of [['its private function', sql.slice(0, moveAt)], ['its public wrapper', sql.slice(wrapperAt)]] as const) {
      if (!revoked(text, c, 'public')) out.push(`${c}: ${part}: execute not revoked from public`);
      if (!anon && !revoked(text, c, 'anon')) out.push(`${c}: ${part}: execute not revoked from anon`);
      if (anon && !granted(text, c, 'anon')) out.push(`${c}: ${part}: not granted to anon`);
      if (!anon && granted(text, c, 'anon')) out.push(`${c}: ${part}: granted to anon`);
      if (!granted(text, c, 'authenticated')) out.push(`${c}: ${part}: not granted to authenticated`);
    }
  }
  // chunk 9 (B2): each twin does its work as a private definer function that refuses another account, behind a wrapper
  for (const c of TWINS) {
    const work = fns.filter((f) => f.name === c && f.schema === 'private');
    const wrapper = fns.filter((f) => f.name === c && f.schema === 'public');
    if (work.length !== 1 || wrapper.length !== 1) {
      out.push(`${c}: not one private function behind one public wrapper`);
      continue;
    }
    if (!/\bsecurity definer\b/.test(work[0].header) || !work[0].header.includes("set search_path = ''")) out.push(`${c}: its private function isn't security definer with an empty search_path`);
    if (!/if p_account is null or p_account <> public\.require_uid\(\) then raise exception 'account'; end if;/.test(work[0].body)) out.push(`${c}: doesn't refuse another account`);
    if (!/\bsecurity invoker\b/.test(wrapper[0].header) || /\bsecurity definer\b/.test(wrapper[0].header) || !wrapper[0].header.includes("set search_path = ''")) out.push(`${c}: its public wrapper isn't security invoker with an empty search_path`);
    if (!new RegExp(`^ select private\\.${c}\\([^;]*\\); $`).test(wrapper[0].body)) out.push(`${c}: its public wrapper does more than call private.${c}`);
    for (const schema of ['private', 'public']) {
      for (const role of ['public', 'anon']) if (!revoked(sql, c, role, schema)) out.push(`${schema}.${c}: execute not revoked from ${role}`);
      if (grantedIn(sql, schema, c, 'anon')) out.push(`${schema}.${c}: granted to anon`);
      if (!grantedIn(sql, schema, c, 'authenticated')) out.push(`${schema}.${c}: not granted to authenticated`);
    }
  }
  // chunk 12 (ADR-0047): each server function checks the server's password before it reads anything (its first
  // statement, with nothing computed in its declarations), behind a wrapper only anon may call (the server calls with
  // the publishable key): never a signed-in player, never service_role
  for (const c of SERVER) {
    const work = fns.filter((f) => f.name === c && f.schema === 'private');
    const wrapper = fns.filter((f) => f.name === c && f.schema === 'public');
    if (work.length !== 1 || wrapper.length !== 1) {
      out.push(`${c}: not one private function behind one public wrapper`);
      continue;
    }
    if (!/\bsecurity definer\b/.test(work[0].header) || !work[0].header.includes("set search_path = ''")) out.push(`${c}: its private function isn't security definer with an empty search_path`);
    const first = /^ (?:declare ([^]*?) )?begin perform private\.require_server\(p_key\);/.exec(work[0].body);
    if (!first || (first[1] ?? '').includes(':=')) out.push(`${c}: doesn't check the server's password first`);
    for (const f of [work[0], wrapper[0]]) if (!/^create function (?:public|private)\.\w+\( ?p_key text[,)]/.test(f.header)) out.push(`${f.schema}.${c}: the password isn't its first parameter`);
    if (!/\bsecurity invoker\b/.test(wrapper[0].header) || /\bsecurity definer\b/.test(wrapper[0].header) || !wrapper[0].header.includes("set search_path = ''")) out.push(`${c}: its public wrapper isn't security invoker with an empty search_path`);
    if (!new RegExp(`^ select private\\.${c}\\(p_key[^;]*\\); $`).test(wrapper[0].body)) out.push(`${c}: its public wrapper does more than call private.${c}`);
    for (const schema of ['private', 'public']) {
      for (const role of ['public', 'authenticated', 'service_role']) if (!revoked(sql, c, role, schema)) out.push(`${schema}.${c}: execute not revoked from ${role}`);
      if (!grantedIn(sql, schema, c, 'anon')) out.push(`${schema}.${c}: not granted to anon`);
      for (const m of sql.matchAll(new RegExp(`grant execute on function ${schema}\\.${c}\\([^)]*\\) to ([^;]*);`, 'g'))) if (m[1] !== 'anon') out.push(`${schema}.${c}: granted to ${m[1]}`);
    }
  }
  // the password check itself: the SHA-256 of a password of 32 to 200 characters equals the one stored, or forbidden
  const key = fns.filter((f) => f.name === 'require_server');
  if (key.length !== 1 || key[0].schema !== 'private') out.push('require_server: not one private function');
  else if (!/^ begin if p_key is null or char_length\(p_key\) not between 32 and 200 or not exists \(select 1 from private\.server_key k where k\.id = 1 and k\.key_hash = extensions\.digest\(p_key, 'sha256'\)\) then raise exception 'forbidden'; end if; end; $/.test(key[0].body)) out.push("require_server doesn't compare the password's SHA-256 with the stored one");
  // chunk 12: the game's two, as stage 1's are; the shop list shows only my clubs' shops, never a body, the pausers or
  // the lease; the meters only to the owner
  for (const c of GAME) {
    const work = fns.filter((f) => f.name === c && f.schema === 'private');
    const wrapper = fns.filter((f) => f.name === c && f.schema === 'public');
    if (work.length !== 1 || wrapper.length !== 1) {
      out.push(`${c}: not one private function behind one public wrapper`);
      continue;
    }
    if (!/\bsecurity definer\b/.test(work[0].header) || !work[0].header.includes("set search_path = ''")) out.push(`${c}: its private function isn't security definer with an empty search_path`);
    if (!/^ declare v_uid uuid := public\.require_uid\(\);/.test(work[0].body)) out.push(`${c}: doesn't check who is calling first`);
    if (!/\bsecurity invoker\b/.test(wrapper[0].header) || /\bsecurity definer\b/.test(wrapper[0].header) || !wrapper[0].header.includes("set search_path = ''")) out.push(`${c}: its public wrapper isn't security invoker with an empty search_path`);
    if (!new RegExp(`^ select private\\.${c}\\(\\); $`).test(wrapper[0].body)) out.push(`${c}: its public wrapper does more than call private.${c}`);
    for (const schema of ['private', 'public']) {
      for (const role of ['public', 'anon', 'service_role']) if (!revoked(sql, c, role, schema)) out.push(`${schema}.${c}: execute not revoked from ${role}`);
      if (grantedIn(sql, schema, c, 'anon')) out.push(`${schema}.${c}: granted to anon`);
      if (!grantedIn(sql, schema, c, 'authenticated')) out.push(`${schema}.${c}: not granted to authenticated`);
    }
  }
  const shops = fns.find((f) => f.name === 'club_shared_shops' && f.schema === 'private');
  if (shops && (/\bbody\b|pausers|lease_/.test(shops.body) || !/ where m\.user_id = v_uid /.test(shops.body))) out.push("club_shared_shops shows more than my clubs' shops");
  const meters = fns.find((f) => f.name === 'shared_usage' && f.schema === 'private');
  if (meters && !/ begin if not exists \(select 1 from public\.profiles p where p\.id = v_uid and p\.is_owner\) then raise exception 'forbidden'; end if;/.test(meters.body)) out.push('shared_usage is open to anyone');
  // the server's rules (§6.2, §6.3): put checks the lease, never writes over a newer build's shop (PERSIST-014) and
  // checks the revision, in that order, before writing; the lease is taken in one statement on the database's clock; a
  // shop is the owner's to create, once per club; a cap closes the month for good
  const put = fns.find((f) => f.name === 'server_shop_put' && f.schema === 'private');
  const steps = ['for update;', "'reason', 'missing'", "'reason', 'lease'", "'reason', 'too_new'", "'reason', 'conflict'", 'update public.shared_shops set'].map((x) => put?.body.indexOf(x) ?? -1);
  if (steps.some((at, i) => at < 0 || (i > 0 && at <= steps[i - 1]))) out.push("server_shop_put doesn't check the shop, the lease, too_new and the revision, in order, before writing");
  if (!put || !/ if v_shop\.lease_holder is distinct from p_holder or v_shop\.lease_until is null or v_shop\.lease_until < now\(\) then return jsonb_build_object\('ok', false, 'reason', 'lease'\);/.test(put.body)) out.push('server_shop_put writes without the lease');
  if (!put || !/ if v_shop\.schema_version > p_schema_version then return jsonb_build_object\('ok', false, 'reason', 'too_new'\);/.test(put.body)) out.push("server_shop_put writes over a newer build's shop");
  if (!put || !/ if v_shop\.revision <> p_expected then return jsonb_build_object\('ok', false, 'reason', 'conflict'/.test(put.body)) out.push('server_shop_put writes over a newer revision');
  const take = fns.find((f) => f.name === 'server_shop_take' && f.schema === 'private');
  if (!take || !/ update public\.shared_shops s set lease_holder = p_holder, lease_until = now\(\) \+ make_interval\(secs => p_seconds\) where s\.club_id = p_club and \(s\.lease_holder is null or s\.lease_holder = p_holder or s\.lease_until is null or s\.lease_until < now\(\)\) returning /.test(take.body)) out.push("server_shop_take doesn't take the lease in one statement on the database's clock");
  const make = fns.find((f) => f.name === 'server_shop_create' && f.schema === 'private');
  if (!make || !/ if not exists \(select 1 from public\.profiles p where p\.id = p_user and p\.is_owner\) or not exists \(select 1 from public\.club_members m where m\.club_id = p_club and m\.user_id = p_user\) then raise exception 'forbidden'; end if;/.test(make.body) || !/ on conflict \(club_id\) do nothing;/.test(make.body)) out.push("server_shop_create isn't the owner's, once per club");
  const usage = fns.find((f) => f.name === 'server_usage_add' && f.schema === 'private');
  if (!usage || !/ closed = coalesce\(u\.closed, case when u\.bytes_out \+ excluded\.bytes_out >= 2000000000 then 'cap' when u\.awake_seconds \+ excluded\.awake_seconds >= 1440000 then 'hours' end\),/.test(usage.body)) out.push("server_usage_add doesn't close the month at the caps for good");
  // chunk 12 (§5.8, ADR-0047 decision 4): service_role loses every right on every table and function, the ones made
  // before (and its default privileges) before anything new is made
  const firstNew = sql.search(/create (?:table|function) (?:public|private)\.(?:shared_|server_|club_shared_shops\b|require_server\b)/);
  if (firstNew < 0) out.push('no shared shops');
  const before = firstNew < 0 ? sql : sql.slice(0, firstNew);
  for (const d of DEFAULTS) if (!before.includes(d)) out.push(`missing before the new objects: ${d}`);
  for (const t of STAGE1_TABLES) if (!tableRevoked(before, 'public', t, 'service_role')) out.push(`${t}: not revoked from service_role before the new objects`);
  const dropped = new Set([...sql.matchAll(/drop function (?:public|private)\.(\w+)\(/g)].map((m) => m[1]));
  for (const name of new Set(fns.map((f) => f.name))) {
    if (dropped.has(name)) continue;
    const defs = fns.filter((f) => f.name === name);
    const schemas = new Set(defs.map((f) => f.schema));
    if (moved(sql, name)) schemas.add('private');
    const old = firstNew >= 0 && defs.some((f) => f.at < firstNew);
    for (const schema of schemas) {
      if (!revoked(sql, name, 'service_role', schema)) out.push(`${schema}.${name}: execute not revoked from service_role`);
      else if (old && !revoked(before, name, 'service_role', schema)) out.push(`${schema}.${name}: not revoked from service_role before the new objects`);
    }
  }
  for (const f of fns.filter((x) => ![...CALLABLE, ...TWINS, ...SERVER, ...GAME].includes(x.name))) {
    if (!/\bsecurity definer\b/.test(f.header)) out.push(`${f.name}: not security definer`);
    if (!f.header.includes("set search_path = ''")) out.push(`${f.name}: search_path not empty`);
    for (const role of ['public', 'anon', 'authenticated']) if (!revoked(sql, f.name, role, f.schema)) out.push(`${f.name}: execute not revoked from ${role} (nobody calls it)`);
    if (granted(sql, f.name, 'anon') || granted(sql, f.name, 'authenticated')) out.push(`${f.name}: granted though nobody calls it`);
  }
  if (!/raise exception 'not_signed_in'/.test(sql)) out.push('no not_signed_in check');
  if (!/create trigger \w+ before insert on auth\.users for each row execute function public\.check_signup\(\)/.test(sql)) out.push('missing the sign-up check trigger');
  if (!/create trigger \w+ after insert on auth\.users for each row execute function public\.create_profile\(\)/.test(sql)) out.push('missing the profile trigger');
  for (const [t, l] of LIMITS) if (!l.test(new RegExp(`create table (?:public|private)\\.${t} \\([^;]*;`).exec(sql)?.[0] ?? '')) out.push(`${t}: missing limit ${l.source}`);
  const putSave = fns.find((f) => f.name === 'put_save');
  if (!putSave || !/'too_new'/.test(putSave.body) || !/'conflict'/.test(putSave.body)) out.push('put_save lacks too_new or conflict');
  const createClub = fns.find((f) => f.name === 'create_club');
  if (!createClub || !/ if not exists \(select 1 from public\.profiles p where p\.id = v_uid and p\.is_owner\) then raise exception 'forbidden'; end if;/.test(createClub.body)) out.push('create_club is open to anyone');
  // the latest resolve_invite (part 4): a brake for everyone after 100 wrong codes in 10 minutes, no addresses kept,
  // that says it is braked (the same for every code) and tries its lock instead of queueing
  const resolve = fns.filter((f) => f.name === 'resolve_invite').at(-1);
  if (!resolve || resolve.schema !== 'private' || !/\) >= 100 then return jsonb_build_object\('braked', true\);/.test(resolve.body) || !/insert into public\.invite_misses \(at\) values \(now\(\)\)/.test(resolve.body) || !/if not pg_try_advisory_xact_lock\(/.test(resolve.body)) out.push('resolve_invite has no brake on wrong codes');
  // chunk 9 (A1): a read-only call gets one answer for every code, before any lookup
  const readOnlyFirst = /^ declare [^]*? begin if current_setting\('transaction_read_only'\) = 'on' then (return jsonb_build_object\('braked', true\)|raise exception 'invalid'); end if;/;
  if (!resolve || !readOnlyFirst.test(resolve.body)) out.push('resolve_invite answers a read-only call by what the code is');
  const add = fns.filter((f) => f.name === 'add_friend').at(-1);
  if (!add || add.schema !== 'private' || !readOnlyFirst.test(add.body)) out.push('add_friend answers a read-only call by what the code is');
  if (!/alter table public\.invite_misses drop column ip;/.test(sql) || !/drop function public\.request_ip\(\);/.test(sql)) out.push('network addresses are still kept');
  for (const f of fns.filter((x) => x.schema === 'private')) {
    if (!/\bsecurity definer\b/.test(f.header) || !f.header.includes("set search_path = ''")) out.push(`private.${f.name}: not security definer with an empty search_path`);
  }
  if (!/extensions\.gen_random_bytes\(4\)/.test(sql)) out.push('invite codes are not drawn from a secure source');
  return out;
}

describe('the online migrations (REL-027; chunk 12, SHARE-003)', () => {
  let files: string[] = [];
  let sql = '';
  beforeAll(async () => {
    files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
    sql = (await Promise.all(files.map((f) => readFile(join(DIR, f), 'utf8')))).join('\n');
  });

  it('keeps every rule, across every file', () => {
    expect(files).toEqual(['20261019000000_stage1.sql', '20261019000100_private_api.sql', '20261019000200_invite_brake.sql', '20261019000300_invite_brake_answer.sql', '20261019000400_readonly_and_account.sql', '20261021000000_shared_shops.sql']);
    expect(migrationProblems(sql)).toEqual([]);
  });

  it('defines exactly the tables and the callable functions §4 lists, with the sign-up check on the server', () => {
    const n = normalize(sql);
    expect([...n.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]).sort()).toEqual([...TABLES].sort());
    expect([...n.matchAll(/create table private\.(\w+)/g)].map((m) => m[1])).toEqual(['server_key']);
    const callable = [...new Set(functionsOf(n).map((f) => f.name))].filter((f) => granted(n, f, 'authenticated') || granted(n, f, 'anon')).sort();
    expect(callable).toEqual([...CALLABLE, ...TWINS, ...GAME, ...SERVER].sort());
    // chunk 12: only these reach anon besides resolve_invite, and nothing reaches service_role
    expect(callable.filter((f) => granted(n, f, 'anon')).sort()).toEqual([...ANON, ...SERVER].sort());
    expect(callable.filter((f) => granted(n, f, 'service_role'))).toEqual([]);
    // the server checks a club's invite code, the age box and the name (ADR-0038 decision 3, ADR-0039 decision 4)
    expect(n).toContain("raise exception 'invite'");
    expect(n).toContain("raise exception 'age'");
    expect(n).toContain("raise exception 'name'");
    expect(n).toMatch(/\(v_meta -> 'age_ok'\) is distinct from 'true'::jsonb/);
    // put_save refuses a lower schema version than the one stored (PERSIST-014 on the server)
    expect(n).toMatch(/if v_save\.schema_version > p_schema_version then return jsonb_build_object\('ok', false, 'reason', 'too_new'/);
    expect(n).toMatch(/if v_save\.revision <> p_expected then return jsonb_build_object\('ok', false, 'reason', 'conflict'/);
    // Delete my account removes the auth user (and its audit rows); everything else cascades
    expect(n).toContain('delete from auth.users where id = v_uid');
    expect(n).toContain("delete from auth.audit_log_entries a where a.payload ->> 'actor_id' = v_uid::text");
    for (const t of ['profiles', 'club_members', 'friend_links', 'saves']) expect(n).toMatch(new RegExp(`create table public\\.${t} \\([^;]*references auth\\.users \\(id\\) on delete cascade`));
    expect(n).toMatch(/created_by uuid references auth\.users \(id\) on delete set null/);
  });

  it('fails on copies with one rule broken, wherever in the files it is (the checks can fail)', () => {
    const early = (s: string, add: string) => s.replace('revoke all on table public.saves from anon, authenticated;', `revoke all on table public.saves from anon, authenticated;\n${add}`);
    /** Replace the last occurrence (the latest definition of a function). */
    const last = (s: string, a: string, b: string) => {
      const i = s.lastIndexOf(a);
      return i < 0 ? s : s.slice(0, i) + b + s.slice(i + a.length);
    };
    /** Chunk 12: replace the first `a` inside private.<name>'s definition. */
    const inFn = (s: string, name: string, a: string, b: string) => {
      const at = s.indexOf(`create function private.${name}(`);
      const i = at < 0 ? -1 : s.indexOf(a, at);
      return i < 0 ? s : s.slice(0, i) + b + s.slice(i + a.length);
    };
    const atEnd = (s: string, add: string) => s.replace(/commit;\s*$/, `${add}\ncommit;\n`);
    const LEASE = "  if v_shop.lease_holder is distinct from p_holder or v_shop.lease_until is null or v_shop.lease_until < now() then\n    return jsonb_build_object('ok', false, 'reason', 'lease');\n  end if;\n";
    const CONFLICT = "  if v_shop.revision <> p_expected then\n    return jsonb_build_object('ok', false, 'reason', 'conflict', 'revision', v_shop.revision);\n  end if;\n";
    const broken: [string, (s: string) => string][] = [
      ['no row-level security on saves', (s) => s.replace('alter table public.saves enable row level security;', '')],
      ['row-level security turned off early', (s) => early(s, 'alter table public.saves disable row level security;')],
      ['a policy', (s) => early(s, 'create policy p on public.saves for select using (true);')],
      ['a view early', (s) => early(s, 'create view public.all_saves as select * from public.saves;')],
      ['a table grant early', (s) => early(s, 'grant select, insert, update, delete on table public.saves to anon, authenticated;')],
      ['a table grant at the end', (s) => s.replace(/commit;\s*$/, 'grant select on public.profiles to authenticated;\ncommit;\n')],
      ['a default privilege', (s) => early(s, 'alter default privileges in schema public grant all on tables to anon;')],
      ['table privileges kept', (s) => s.replace('revoke all on table public.friend_links from anon, authenticated;', '')],
      ['execute to public', (s) => early(s, 'grant execute on function public.get_save() to public;')],
      ['a definer wrapper', (s) => s.replace("create function public.me() returns jsonb\nlanguage sql stable security invoker", "create function public.me() returns jsonb\nlanguage sql stable security definer")],
      ['a wrapper that reads more', (s) => s.replace('  select private.me();', '  select private.me(); select 1;')],
      ['a function left in public', (s) => s.replace('alter function public.get_save() set schema private;\n', '')],
      ['an invoker private function', (s) => s.replace(/(create function public\.get_save\(\) returns jsonb\nlanguage plpgsql stable) security definer/, '$1 security invoker')],
      ['a search path', (s) => s.replace(/(create function public\.leaderboard\(p_kind text\) returns jsonb\nlanguage plpgsql stable security definer) set search_path = ''/, '$1 set search_path = public')],
      ['execute left to public (the private function)', (s) => s.replace('revoke execute on function public.me() from public, anon;', 'revoke execute on function public.me() from anon;')],
      ['execute left to anon (the wrapper)', (s) => s.replace(/(set schema private;[\s\S]*)revoke execute on function public\.put_save\(([^)]*)\) from public, anon;/, '$1revoke execute on function public.put_save($2) from public;')],
      ['a helper callable', (s) => s.replace('revoke execute on function public.club_json(public.clubs, uuid, boolean) from public, anon, authenticated;', 'revoke execute on function public.club_json(public.clubs, uuid, boolean) from public, anon;')],
      ['a grant to anon', (s) => s.replace('grant execute on function public.me() to authenticated;', 'grant execute on function public.me() to anon, authenticated;')],
      ['a missing grant', (s) => s.replace(/grant execute on function public\.news\(\) to authenticated;/g, '')],
      ['no sign-up trigger', (s) => s.replace(/create trigger aquarium_go_check_signup[^\n]*\n/, '')],
      ['no size limit', (s) => s.replace('char_length(body) <= 4000000', 'char_length(body) >= 0')],
      // (a replacer function: in a replacement string `$'` would insert the rest of the text)
      ['digits in invite codes', (s) => s.replace("'^[A-Z]{2,10}-[A-HJ-NP-Z]{4}$'", () => "'^[A-Z]{2,10}-[0-9]{4}$'")],
      ['no brake on wrong codes', (s) => last(s, "m.at > now() - interval '10 minutes') >= 100 then", "m.at > now() - interval '10 minutes') >= 100000000 then")],
      ['a brake that answers null', (s) => last(s, "then\n    return jsonb_build_object('braked', true);\n  end if;\n  select", "then\n    return null;\n  end if;\n  select")],
      ['a lock that queues', (s) => last(s, 'if not pg_try_advisory_xact_lock(', 'if not pg_advisory_xact_lock(')],
      ['addresses kept', (s) => s.replace('alter table public.invite_misses drop column ip;', '')],
      ['an invoker replacement', (s) => last(s, 'create or replace function private.resolve_invite(p_code text) returns jsonb\nlanguage plpgsql volatile security definer', 'create or replace function private.resolve_invite(p_code text) returns jsonb\nlanguage plpgsql volatile security invoker')],
      // (a replacer function: in a replacement string `$$` would become `$`)
      ['no caller check', (s) => s.replace("create function public.get_save() returns jsonb\nlanguage plpgsql stable security definer set search_path = '' as $$\ndeclare\n  v_uid uuid := public.require_uid();", () => "create function public.get_save() returns jsonb\nlanguage plpgsql stable security definer set search_path = '' as $$\ndeclare\n  v_uid uuid := auth.uid();")],
      ['clubs for anyone', (s) => s.replace(/raise exception 'forbidden';/, 'null;')],
      // chunk 9 (A1, B2)
      ['an invite lookup that answers read-only', (s) => last(s, "  if current_setting('transaction_read_only') = 'on' then\n    return jsonb_build_object('braked', true);\n  end if;\n", '')],
      ['a friend lookup that answers read-only', (s) => last(s, "  if current_setting('transaction_read_only') = 'on' then\n    raise exception 'invalid';\n  end if;\n", '')],
      ['a read-only check after the lookup', (s) => last(s, "  if current_setting('transaction_read_only') = 'on' then\n    return jsonb_build_object('braked', true);\n  end if;\n  if p_code is null", "  if p_code is null or p_code = '' then\n    return null;\n  end if;\n  if current_setting('transaction_read_only') = 'on' then\n    return jsonb_build_object('braked', true);\n  end if;\n  if p_code is null")],
      ['a twin for any account', (s) => last(s, "  if p_account is null or p_account <> public.require_uid() then\n    raise exception 'account';\n  end if;\n  return private.put_save(", '  return private.put_save(')],
      ['a twin for anon', (s) => s.replace('grant execute on function public.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) to authenticated;', 'grant execute on function public.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) to anon, authenticated;')],
      ['a twin left open to anon', (s) => s.replace('revoke execute on function private.get_save_for(uuid) from public, anon;', 'revoke execute on function private.get_save_for(uuid) from public;')],
      ['a definer twin wrapper', (s) => s.replace("create function public.save_meta_for(p_account uuid) returns jsonb\nlanguage sql stable security invoker", "create function public.save_meta_for(p_account uuid) returns jsonb\nlanguage sql stable security definer")],
      // chunk 12: service_role (§5.8, ADR-0047 decision 4)
      ['a stage 1 table left to service_role', (s) => s.replace('revoke all on table public.saves from service_role;\n', '')],
      ['a helper left to service_role', (s) => s.replace('revoke execute on function public.club_json(public.clubs, uuid, boolean) from service_role;\n', '')],
      ['a moved function left to service_role', (s) => s.replace('revoke execute on function private.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from service_role;\n', '')],
      ['no default privilege revoke for functions', (s) => s.replace('alter default privileges in schema public revoke all on functions from service_role;\n', '')],
      ['a default privilege revoke after the new tables', (s) => atEnd(s.replace('alter default privileges in schema public revoke all on tables from service_role;\n', ''), 'alter default privileges in schema public revoke all on tables from service_role;')],
      ['a stage 1 revoke after the new tables', (s) => atEnd(s.replace('revoke all on table public.profiles from service_role;\n', ''), 'revoke all on table public.profiles from service_role;')],
      ['a default privilege for service_role', (s) => atEnd(s, 'alter default privileges in schema public grant all on tables to service_role;')],
      ['execute granted to service_role', (s) => atEnd(s, 'grant execute on function public.me() to service_role;')],
      // the shared tables and the fingerprint
      ['a shared table without row-level security', (s) => s.replace('alter table public.shared_photos enable row level security;', '')],
      ['a shared table left to players', (s) => s.replace('revoke all on table public.shared_shops from anon, authenticated, service_role;', 'revoke all on table public.shared_shops from anon, service_role;')],
      ['a shared table left to service_role', (s) => s.replace('revoke all on table public.shared_usage from anon, authenticated, service_role;', 'revoke all on table public.shared_usage from anon, authenticated;')],
      ['the fingerprint without row-level security', (s) => s.replace('alter table private.server_key enable row level security;', '')],
      ['the fingerprint left to anon', (s) => s.replace('revoke all on table private.server_key from public, anon, authenticated, service_role;', 'revoke all on table private.server_key from public, authenticated, service_role;')],
      ['photos without a size limit', (s) => s.replace('char_length(data) <= 64000', 'char_length(data) >= 0')],
      ['a shared shop without a body limit', (s) => last(s, 'body text not null check (char_length(body) <= 4000000),', 'body text not null,')],
      // the server's password (ADR-0047)
      ['a server function without the password', (s) => inFn(s, 'server_photo_get', '  perform private.require_server(p_key);\n', '')],
      ['the password checked second', (s) => inFn(s, 'server_photos_delete', "  perform private.require_server(p_key);\n  if p_club is null or p_hashes is null or cardinality(p_hashes) > 1000 then\n    raise exception 'invalid';\n  end if;\n", "  if p_club is null or p_hashes is null or cardinality(p_hashes) > 1000 then\n    raise exception 'invalid';\n  end if;\n  perform private.require_server(p_key);\n")],
      ['a read before the password', (s) => inFn(s, 'server_member', '  v_shop boolean;\n', '  v_shop boolean := exists (select 1 from public.shared_shops);\n')],
      ['a password check that compares nothing', (s) => inFn(s, 'require_server', "k.key_hash = extensions.digest(p_key, 'sha256')", 'k.key_hash is not null')],
      ['a short password let through', (s) => inFn(s, 'require_server', 'not between 32 and 200', 'not between 1 and 200')],
      ['the password check callable', (s) => s.replace('revoke execute on function private.require_server(text) from public, anon, authenticated, service_role;', 'revoke execute on function private.require_server(text) from public, authenticated, service_role;')],
      ['a server wrapper for players', (s) => s.replace('grant execute on function public.server_shop_take(text, uuid, text, integer) to anon;', 'grant execute on function public.server_shop_take(text, uuid, text, integer) to anon, authenticated;')],
      ['a server function for service_role', (s) => s.replace('grant execute on function private.server_usage_add(text, text, bigint, bigint) to anon;', 'grant execute on function private.server_usage_add(text, text, bigint, bigint) to anon, service_role;')],
      ['a server function left to players', (s) => s.replace('revoke execute on function private.server_set_pausers(text, uuid, uuid[]) from public, authenticated, service_role;', 'revoke execute on function private.server_set_pausers(text, uuid, uuid[]) from public, service_role;')],
      ['a server wrapper the server cannot call', (s) => s.replace('grant execute on function public.server_member(text, uuid, uuid) to anon;\n', '')],
      ['a definer server wrapper', (s) => s.replace("create function public.server_shop_get(p_key text, p_club uuid) returns jsonb\nlanguage sql stable security invoker", "create function public.server_shop_get(p_key text, p_club uuid) returns jsonb\nlanguage sql stable security definer")],
      ['a server wrapper that reads more', (s) => s.replace('  select private.server_photo_hashes(p_key, p_club);', '  select private.server_photo_hashes(p_key, p_club); select 1;')],
      // the server's rules (§6.2, §6.3)
      ['a save over another holder', (s) => inFn(s, 'server_shop_put', 'v_shop.lease_holder is distinct from p_holder or ', '')],
      ["a save over a newer build's shop", (s) => inFn(s, 'server_shop_put', 'if v_shop.schema_version > p_schema_version then', 'if v_shop.schema_version > p_schema_version + 1000 then')],
      ['the revision checked before the lease', (s) => inFn(inFn(s, 'server_shop_put', LEASE, ''), 'server_shop_put', CONFLICT, CONFLICT + LEASE)],
      ['a lease taken from a live holder', (s) => inFn(s, 'server_shop_take', ' or s.lease_until < now())', ')')],
      ['shops made by anyone', (s) => inFn(s, 'server_shop_create', ' and p.is_owner)', ')')],
      ['two shops for a club', (s) => inFn(s, 'server_shop_create', 'on conflict (club_id) do nothing', 'on conflict do nothing')],
      ['a cap that lets the month reopen', (s) => inFn(s, 'server_usage_add', 'closed = coalesce(u.closed, ', 'closed = (')],
      // the game's two
      ['the shop list for anon', (s) => s.replace('grant execute on function public.club_shared_shops() to authenticated;', 'grant execute on function public.club_shared_shops() to anon, authenticated;')],
      ['the shop list with the body', (s) => s.replace("'played_at', s.saved_at)", "'played_at', s.saved_at, 'body', s.body)")],
      ["the shop list for clubs I'm not in", (s) => inFn(s, 'club_shared_shops', 'where m.user_id = v_uid', 'where m.user_id is not null')],
      ['the shop list without a caller check', (s) => inFn(s, 'club_shared_shops', 'v_uid uuid := public.require_uid();', 'v_uid uuid := auth.uid();')],
      ['the meters for anyone', (s) => inFn(s, 'shared_usage', "    raise exception 'forbidden';\n", '    null;\n')],
      ['the meters left to service_role', (s) => s.replace('revoke execute on function public.shared_usage() from public, anon, service_role;', 'revoke execute on function public.shared_usage() from public, anon;')],
    ];
    for (const [what, mutate] of broken) {
      const copy = mutate(sql);
      expect(copy, what).not.toBe(sql); // the mutation applied
      expect(migrationProblems(copy).length, what).toBeGreaterThan(0);
    }
  });
});
