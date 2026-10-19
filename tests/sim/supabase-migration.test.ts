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
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

/** The functions the game calls (ONLINE-STAGE1.md §4.3), each granted to `authenticated`; only resolve_invite to anon. */
const CALLABLE = ['resolve_invite', 'me', 'my_clubs', 'join_club', 'create_club', 'add_friend', 'friend_requests', 'accept_friend', 'friends_aquariums', 'report_standing', 'leaderboard', 'news', 'mark_seen', 'save_meta', 'get_save', 'put_save', 'delete_my_account'];
const ANON = ['resolve_invite'];
const TABLES = ['profiles', 'clubs', 'club_members', 'friend_links', 'saves', 'invite_misses'];
/** The size limits §4.1 names, and the invite code's shape (ADR-0042), as the SQL writes them. */
const LIMITS = [
  /char_length\(btrim\(display_name\)\) between 1 and 30/,
  /char_length\(btrim\(name\)\) between 2 and 40/,
  /char_length\(blurb\) <= 80/,
  /char_length\(shop_name\) <= 60/,
  /char_length\(snapshot\) <= 200000/,
  /char_length\(body\) <= 4000000/,
  /char_length\(previous_body\) <= 4000000/,
  /invite_code ~ '\^\[a-z\]\{2,10\}-\[a-hj-np-z\]\{4\}\$'/,
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
    out.push({ schema: m[1], name: m[2], header: sql.slice(m.index, open), body: open < 0 ? '' : sql.slice(open + 6, close) });
  }
  return out;
}

const revoked = (sql: string, name: string, role: string): boolean => new RegExp(`revoke execute on function public\\.${name}\\([^)]*\\) from [a-z, ]*\\b${role}\\b`).test(sql);
const granted = (sql: string, name: string, role: string): boolean => new RegExp(`grant execute on function (?:public|private)\\.${name}\\([^)]*\\) to [a-z, ]*\\b${role}\\b`).test(sql);
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
  }
  if (/disable row level security|no force row level security/.test(sql)) out.push('row-level security is turned off somewhere');
  if (/create policy/.test(sql)) out.push('a policy exists (the browser touches no table)');
  if (/create (?:or replace )?(?:materialized )?view/.test(sql)) out.push('a view exists (it would read the tables as its owner)');
  // any grant of a privilege on a table, a sequence or a schema's tables, anywhere in the files
  const nonFunctionGrants = sql.replace(/grant execute on function [^;]*;/g, '').replace(/grant usage on schema private to [^;]*;/g, '');
  if (/\bgrant [a-z, ]+ on /.test(nonFunctionGrants)) out.push('a table or schema privilege is granted');
  if (/alter default privileges/.test(sql)) out.push('a default privilege changes');
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
  for (const f of fns.filter((x) => !CALLABLE.includes(x.name))) {
    if (!/\bsecurity definer\b/.test(f.header)) out.push(`${f.name}: not security definer`);
    if (!f.header.includes("set search_path = ''")) out.push(`${f.name}: search_path not empty`);
    for (const role of ['public', 'anon', 'authenticated']) if (!revoked(sql, f.name, role)) out.push(`${f.name}: execute not revoked from ${role} (nobody calls it)`);
    if (granted(sql, f.name, 'anon') || granted(sql, f.name, 'authenticated')) out.push(`${f.name}: granted though nobody calls it`);
  }
  if (!/raise exception 'not_signed_in'/.test(sql)) out.push('no not_signed_in check');
  if (!/create trigger \w+ before insert on auth\.users for each row execute function public\.check_signup\(\)/.test(sql)) out.push('missing the sign-up check trigger');
  if (!/create trigger \w+ after insert on auth\.users for each row execute function public\.create_profile\(\)/.test(sql)) out.push('missing the profile trigger');
  for (const l of LIMITS) if (!l.test(sql)) out.push(`missing limit ${l.source}`);
  if (!/'too_new'/.test(sql) || !/'conflict'/.test(sql)) out.push('put_save lacks too_new or conflict');
  if (!/raise exception 'forbidden'/.test(sql)) out.push('create_club is open to anyone');
  if (!/m\.at > now\(\) - interval '10 minutes'\) >= 20 then return null;/.test(sql)) out.push('resolve_invite has no cap on wrong codes');
  if (!/extensions\.gen_random_bytes\(4\)/.test(sql)) out.push('invite codes are not drawn from a secure source');
  return out;
}

describe('the stage 1 migrations (REL-027)', () => {
  let files: string[] = [];
  let sql = '';
  beforeAll(async () => {
    files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
    sql = (await Promise.all(files.map((f) => readFile(join(DIR, f), 'utf8')))).join('\n');
  });

  it('keeps every rule, across every file', () => {
    expect(files).toEqual(['20261019000000_stage1.sql', '20261019000100_private_api.sql']);
    expect(migrationProblems(sql)).toEqual([]);
  });

  it('defines exactly the tables and the callable functions §4 lists, with the sign-up check on the server', () => {
    const n = normalize(sql);
    expect([...n.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]).sort()).toEqual([...TABLES].sort());
    const callable = [...new Set(functionsOf(n).map((f) => f.name))].filter((f) => granted(n, f, 'authenticated') || granted(n, f, 'anon')).sort();
    expect(callable).toEqual([...CALLABLE].sort());
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
      ['digits in invite codes', (s) => s.replace("'^[A-Z]{2,10}-[A-HJ-NP-Z]{4}$'", "'^[A-Z]{2,10}-[0-9]{4}$'")],
      ['no cap on wrong codes', (s) => s.replace("m.at > now() - interval '10 minutes') >= 20 then", "m.at > now() - interval '10 minutes') >= 20000000 then")],
      // (a replacer function: in a replacement string `$$` would become `$`)
      ['no caller check', (s) => s.replace("create function public.get_save() returns jsonb\nlanguage plpgsql stable security definer set search_path = '' as $$\ndeclare\n  v_uid uuid := public.require_uid();", () => "create function public.get_save() returns jsonb\nlanguage plpgsql stable security definer set search_path = '' as $$\ndeclare\n  v_uid uuid := auth.uid();")],
      ['clubs for anyone', (s) => s.replace(/raise exception 'forbidden';/, 'null;')],
    ];
    for (const [what, mutate] of broken) {
      const copy = mutate(sql);
      expect(copy, what).not.toBe(sql); // the mutation applied
      expect(migrationProblems(copy).length, what).toBeGreaterThan(0);
    }
  });
});
