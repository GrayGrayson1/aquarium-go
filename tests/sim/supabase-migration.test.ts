// @vitest-environment node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §4, §8.1; REL-027) — the database's rules, read from the migration (no
 * Docker on the owner's Mac, so no local database: this test and the live smoke test, scripts/online-smoke.mjs, check
 * the SQL). The browser touches no table: every public table enables row-level security; there is no `create
 * policy`; `anon` and `authenticated` hold no table privileges (each table's are revoked, none granted); every function
 * is `security definer` with `set search_path = ''`, has EXECUTE revoked from public and anon (and from authenticated
 * when nobody calls it) and an explicit grant when the game calls it, `resolve_invite` alone to anon; both triggers on
 * auth.users exist; the size limits are there. The last block proves the checks fail on copies with one rule removed.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const FILE = join(__dirname, '..', '..', 'supabase', 'migrations', '20261019000000_stage1.sql');

/** The functions the game calls (ONLINE-STAGE1.md §4.3), each granted to `authenticated`; only resolve_invite to anon. */
const CALLABLE = ['resolve_invite', 'me', 'my_clubs', 'join_club', 'create_club', 'add_friend', 'friend_requests', 'accept_friend', 'friends_aquariums', 'report_standing', 'leaderboard', 'news', 'mark_seen', 'save_meta', 'get_save', 'put_save', 'delete_my_account'];
const ANON = ['resolve_invite'];
const TABLES = ['profiles', 'clubs', 'club_members', 'friend_links', 'saves'];
/** The size limits §4.1 names, as the SQL writes them. */
const LIMITS = [
  /char_length\(btrim\(display_name\)\) between 1 and 30/,
  /char_length\(btrim\(name\)\) between 2 and 40/,
  /char_length\(blurb\) <= 80/,
  /char_length\(shop_name\) <= 60/,
  /char_length\(snapshot\) <= 200000/,
  /char_length\(body\) <= 4000000/,
  /char_length\(previous_body\) <= 4000000/,
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
  name: string;
  header: string;
}

function functionsOf(sql: string): Fn[] {
  const out: Fn[] = [];
  const re = /create (?:or replace )?function public\.(\w+)\s*\(/g;
  for (let m = re.exec(sql); m; m = re.exec(sql)) {
    const start = m.index;
    const body = sql.indexOf(' as $$', start);
    out.push({ name: m[1], header: sql.slice(start, body < 0 ? undefined : body) });
  }
  return out;
}

const revoked = (sql: string, name: string, role: string): boolean => new RegExp(`revoke execute on function public\\.${name}\\([^)]*\\) from [a-z, ]*\\b${role}\\b`).test(sql);
const granted = (sql: string, name: string, role: string): boolean => new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to [a-z, ]*\\b${role}\\b`).test(sql);

/** Everything wrong with a migration's text (empty: it keeps the rules). */
export function migrationProblems(raw: string): string[] {
  const sql = normalize(raw);
  const out: string[] = [];
  const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
  for (const t of TABLES) if (!tables.includes(t)) out.push(`missing table ${t}`);
  for (const t of tables) {
    if (!sql.includes(`alter table public.${t} enable row level security`)) out.push(`${t}: row-level security not enabled`);
    if (!new RegExp(`revoke all on table public\\.${t} from [a-z, ]*\\banon\\b`).test(sql) || !new RegExp(`revoke all on table public\\.${t} from [a-z, ]*\\bauthenticated\\b`).test(sql)) out.push(`${t}: table privileges not revoked from anon and authenticated`);
  }
  if (/create policy/.test(sql)) out.push('a policy exists (the browser touches no table)');
  if (/grant [a-z, ]+ on (?:table )?public\.(?!.*function)/.test(sql.replace(/grant execute on function/g, 'grant-fn'))) out.push('a table privilege is granted');
  if (/grant [a-z, ]+ on all tables/.test(sql) || /alter default privileges/.test(sql)) out.push('a blanket grant or default privilege');
  const fns = functionsOf(sql);
  const names = fns.map((f) => f.name);
  for (const c of CALLABLE) if (!names.includes(c)) out.push(`missing function ${c}`);
  for (const f of fns) {
    if (!/\bsecurity definer\b/.test(f.header)) out.push(`${f.name}: not security definer`);
    if (!f.header.includes("set search_path = ''")) out.push(`${f.name}: search_path not empty`);
    if (!revoked(sql, f.name, 'public')) out.push(`${f.name}: execute not revoked from public`);
    const callable = CALLABLE.includes(f.name);
    const anon = ANON.includes(f.name);
    if (!anon && !revoked(sql, f.name, 'anon')) out.push(`${f.name}: execute not revoked from anon`);
    if (anon && !granted(sql, f.name, 'anon')) out.push(`${f.name}: not granted to anon`);
    if (!anon && granted(sql, f.name, 'anon')) out.push(`${f.name}: granted to anon`);
    if (callable && !granted(sql, f.name, 'authenticated')) out.push(`${f.name}: not granted to authenticated`);
    if (!callable && !revoked(sql, f.name, 'authenticated')) out.push(`${f.name}: execute not revoked from authenticated (nobody calls it)`);
    if (!callable && granted(sql, f.name, 'authenticated')) out.push(`${f.name}: granted though nobody calls it`);
  }
  // every function body that names the caller checks it (require_uid raises not_signed_in); resolve_invite may be anon
  for (const c of CALLABLE.filter((c) => !ANON.includes(c))) {
    const f = fns.find((x) => x.name === c);
    const body = f ? sql.slice(sql.indexOf(f.header) + f.header.length, sql.indexOf('$$;', sql.indexOf(f.header))) : '';
    if (f && !body.includes('public.require_uid()')) out.push(`${c}: doesn't check who is calling`);
  }
  if (!/raise exception 'not_signed_in'/.test(sql)) out.push('no not_signed_in check');
  if (!/create trigger \w+ before insert on auth\.users for each row execute function public\.check_signup\(\)/.test(sql)) out.push('missing the sign-up check trigger');
  if (!/create trigger \w+ after insert on auth\.users for each row execute function public\.create_profile\(\)/.test(sql)) out.push('missing the profile trigger');
  for (const l of LIMITS) if (!l.test(sql)) out.push(`missing limit ${l.source}`);
  if (!/'too_new'/.test(sql) || !/'conflict'/.test(sql)) out.push('put_save lacks too_new or conflict');
  if (!/raise exception 'forbidden'/.test(sql)) out.push('create_club is open to anyone');
  return out;
}

describe('the stage 1 migration (REL-027)', () => {
  let sql = '';
  beforeAll(async () => {
    sql = await readFile(FILE, 'utf8');
  });

  it('keeps every rule', () => {
    expect(migrationProblems(sql)).toEqual([]);
  });

  it('defines exactly the tables and the callable functions §4 lists, with the sign-up check on the server', () => {
    const n = normalize(sql);
    expect([...n.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]).sort()).toEqual([...TABLES].sort());
    const callable = functionsOf(n)
      .map((f) => f.name)
      .filter((f) => granted(n, f, 'authenticated') || granted(n, f, 'anon'))
      .sort();
    expect(callable).toEqual([...CALLABLE].sort());
    // the server checks a club's invite code, the age box and the name (ADR-0038 decision 3, ADR-0039 decision 4)
    expect(n).toContain("raise exception 'invite'");
    expect(n).toContain("raise exception 'age'");
    expect(n).toContain("raise exception 'name'");
    expect(n).toMatch(/\(v_meta -> 'age_ok'\) is distinct from 'true'::jsonb/);
    // put_save refuses a lower schema version than the one stored (PERSIST-014 on the server)
    expect(n).toMatch(/if v_save\.schema_version > p_schema_version then return jsonb_build_object\('ok', false, 'reason', 'too_new'/);
    expect(n).toMatch(/if v_save\.revision <> p_expected then return jsonb_build_object\('ok', false, 'reason', 'conflict'/);
    // Delete my account removes the auth user; everything else cascades
    expect(n).toContain('delete from auth.users where id = v_uid');
    for (const t of ['profiles', 'club_members', 'friend_links', 'saves']) expect(n).toMatch(new RegExp(`create table public\\.${t} \\([^;]*references auth\\.users \\(id\\) on delete cascade`));
    expect(n).toMatch(/created_by uuid references auth\.users \(id\) on delete set null/);
  });

  it('fails on copies with one rule removed (the checks can fail)', () => {
    const broken: [string, (s: string) => string][] = [
      ['no row-level security on saves', (s) => s.replace('alter table public.saves enable row level security;', '')],
      ['a policy', (s) => s.replace('commit;', "create policy p on public.saves for select using (true);\ncommit;")],
      ['a table grant', (s) => s.replace('commit;', 'grant select on table public.profiles to authenticated;\ncommit;')],
      ['table privileges kept', (s) => s.replace('revoke all on table public.friend_links from anon, authenticated;', '')],
      ['an invoker function', (s) => s.replace(/(create function public\.get_save\(\) returns jsonb\nlanguage plpgsql stable) security definer/, '$1 security invoker')],
      ['a search path', (s) => s.replace(/(create function public\.leaderboard\(p_kind text\) returns jsonb\nlanguage plpgsql stable security definer) set search_path = ''/, '$1 set search_path = public')],
      ['execute left to public', (s) => s.replace('revoke execute on function public.me() from public, anon;', 'revoke execute on function public.me() from anon;')],
      ['execute left to anon', (s) => s.replace('revoke execute on function public.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from public, anon;', 'revoke execute on function public.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from public;')],
      ['a helper callable', (s) => s.replace('revoke execute on function public.club_json(public.clubs, uuid, boolean) from public, anon, authenticated;', 'revoke execute on function public.club_json(public.clubs, uuid, boolean) from public, anon;')],
      ['a grant to anon', (s) => s.replace('grant execute on function public.me() to authenticated;', 'grant execute on function public.me() to anon, authenticated;')],
      ['a missing grant', (s) => s.replace('grant execute on function public.news() to authenticated;', '')],
      ['no sign-up trigger', (s) => s.replace(/create trigger aquarium_go_check_signup[^\n]*\n/, '')],
      ['no size limit', (s) => s.replace('char_length(body) <= 4000000', 'char_length(body) >= 0')],
      ['no caller check', (s) => s.replace("create function public.get_save() returns jsonb\nlanguage plpgsql stable security definer set search_path = '' as $$\ndeclare\n  v_uid uuid := public.require_uid();", "create function public.get_save() returns jsonb\nlanguage plpgsql stable security definer set search_path = '' as $$\ndeclare\n  v_uid uuid := auth.uid();")],
      ['clubs for anyone', (s) => s.replace(/raise exception 'forbidden';/, 'null;')],
    ];
    for (const [what, mutate] of broken) {
      const copy = mutate(sql);
      expect(copy, what).not.toBe(sql); // the mutation applied
      expect(migrationProblems(copy).length, what).toBeGreaterThan(0);
    }
  });
});
