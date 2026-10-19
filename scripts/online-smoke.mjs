#!/usr/bin/env node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §8.3; REL-026, REL-027) — the live smoke test against the Aquarium Go
 * Supabase project. Run by hand after setup, never by `npm test` or e2e (they use the local stub):
 *
 *   node scripts/online-smoke.mjs        (from a clone with node_modules; the Supabase CLI signed in)
 *
 * It reads the project's address and publishable key from src/social/project.ts (or SMOKE_URL and SMOKE_KEY), makes
 * two throwaway accounts A and B with the first club's invite code (read with the CLI, never printed), checks the
 * database's rules from the browser's side, deletes both accounts and checks, through `supabase db query
 * --linked --project-ref <ref>` (admin), that no row of either is left in any table, Supabase Auth's audit log
 * included. It also checks the brake on wrong invite codes, and removes this run's misses so nobody stays braked. It prints each check's pass or fail and
 * exits 1 if any failed. It uses only the publishable key; it never reads or prints the secret key.
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CLI = process.env.SUPABASE_CLI ?? `${process.env.HOME}/.local/bin/supabase`;
const projectFile = readFileSync(new URL('../src/social/project.ts', import.meta.url), 'utf8');
const URL_ = process.env.SMOKE_URL ?? /url:\s*'([^']+)'/.exec(projectFile)?.[1];
const KEY = process.env.SMOKE_KEY ?? /publishableKey:\s*'([^']+)'/.exec(projectFile)?.[1];
const REF = process.env.SMOKE_REF ?? /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(URL_ ?? '')?.[1];
const DOMAIN = process.env.SMOKE_DOMAIN ?? 'example.com';
if (!URL_ || !KEY || !REF) {
  console.error('No project: set ONLINE_PROJECT in src/social/project.ts, or SMOKE_URL, SMOKE_KEY (and SMOKE_REF).');
  process.exit(2);
}

/** An admin query through the CLI, scoped to this project; returns the rows. */
function admin(sql) {
  const out = execFileSync(CLI, ['db', 'query', '--linked', '--project-ref', REF, '-o', 'json', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const start = out.search(/[[{]/);
  const parsed = JSON.parse(out.slice(start));
  return Array.isArray(parsed) ? parsed : (parsed.rows ?? parsed.result ?? parsed.data ?? []);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}
const client = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const describe = (r) => (r?.error ? `${r.error.code ?? ''} ${r.error.message ?? ''}`.trim() : JSON.stringify(r?.data)?.slice(0, 160));

const stamp = Date.now();
const EMAIL_A = `smoke-a-${stamp}@${DOMAIN}`;
const EMAIL_B = `smoke-b-${stamp}@${DOMAIN}`;
const PASSWORD = `Smoke-${stamp}-${Math.random().toString(36).slice(2)}`;
const SCHEMA = 30;
const TABLES = ['profiles', 'clubs', 'club_members', 'friend_links', 'saves'];
const FUNCTIONS = {
  me: {},
  my_clubs: {},
  join_club: { p_club: '00000000-0000-0000-0000-000000000000' },
  create_club: { p_name: 'Smoke club', p_blurb: '' },
  add_friend: { p_code: 'NOBODY-123' },
  friend_requests: {},
  accept_friend: { p_id: '00000000-0000-0000-0000-000000000000' },
  friends_aquariums: {},
  report_standing: { p_shop_name: 'x', p_gallons: 1, p_collection: 1, p_prismatics: 0, p_show_wins: 0 },
  leaderboard: { p_kind: 'prismatics' },
  news: {},
  mark_seen: {},
  save_meta: {},
  get_save: {},
  put_save: { p_expected: 0, p_save_id: 'x', p_schema_version: 1, p_saved_at: 0, p_hour: 0, p_shop_name: 'x', p_day: 1, p_money: 0, p_encoding: 'json', p_body: '{}' },
  delete_my_account: {},
};
const putSave = (c, expected, schema, body, saveId = `save_smoke_${stamp}`) =>
  c.rpc('put_save', { p_expected: expected, p_save_id: saveId, p_schema_version: schema, p_saved_at: Date.now(), p_hour: 12.5, p_shop_name: 'Smoke Reef', p_day: 1, p_money: 100, p_encoding: 'json', p_body: body });

const A = client();
const B = client();
const anon = client();
let idA = null;
let idB = null;

try {
  const code = admin("select invite_code from public.clubs where name = 'Aquarium Go Friends' order by created_at limit 1")[0]?.invite_code;
  check('the first club exists ("Aquarium Go Friends")', !!code);
  if (!code) throw new Error('no first club');

  // 1. sign-up needs a club's code, the age box and a name (the server's trigger)
  const meta = (o) => ({ invite_code: code, display_name: 'Smoke A', age_ok: true, ...o });
  const wrong = await anon.auth.signUp({ email: EMAIL_A, password: PASSWORD, options: { data: meta({ invite_code: 'NOPE-0000' }) } });
  check('sign-up with a wrong invite code fails', !!wrong.error && !wrong.data?.user, describe(wrong));
  const noAge = await anon.auth.signUp({ email: EMAIL_A, password: PASSWORD, options: { data: meta({ age_ok: undefined }) } });
  check('sign-up without the age box fails', !!noAge.error, describe(noAge));
  const ageText = await anon.auth.signUp({ email: EMAIL_A, password: PASSWORD, options: { data: meta({ age_ok: 'true' }) } });
  check('sign-up with the age box as text fails (only true counts)', !!ageText.error, describe(ageText));
  const noName = await anon.auth.signUp({ email: EMAIL_A, password: PASSWORD, options: { data: meta({ display_name: '   ' }) } });
  check('sign-up without a name fails', !!noName.error, describe(noName));
  const upA = await A.auth.signUp({ email: EMAIL_A, password: PASSWORD, options: { data: meta({ display_name: 'Smoke A' }) } });
  check('sign-up A with the first club’s code succeeds, signed in at once (no email)', !upA.error && !!upA.data?.session, describe(upA));
  const upB = await B.auth.signUp({ email: EMAIL_B, password: PASSWORD, options: { data: meta({ display_name: 'Smoke B' }) } });
  check('sign-up B succeeds', !upB.error && !!upB.data?.session, describe(upB));
  idA = upA.data?.user?.id ?? null;
  idB = upB.data?.user?.id ?? null;
  const again = await anon.auth.signUp({ email: EMAIL_A, password: PASSWORD, options: { data: meta({}) } });
  check('a second sign-up with A’s email fails', !!again.error || !again.data?.session, describe(again));

  const meA = await A.rpc('me');
  const meB = await B.rpc('me');
  check('me() names A, with a friend code', meA.data?.id === idA && /^[A-Z0-9]{1,12}-[A-Z0-9]{3}$/.test(meA.data?.friend_code ?? '') && meA.data?.display_name === 'Smoke A' && meA.data?.is_owner === false, describe(meA));
  const clubsA = await A.rpc('my_clubs');
  check('A joined the first club at sign-up, and sees no invite code (not its creator)', clubsA.data?.mine?.some((c) => c.name === 'Aquarium Go Friends' && !('invite_code' in c)), describe(clubsA));

  // 2. no table, read or written, for A or for an anonymous client; anon may call resolve_invite and nothing else
  for (const [who, c] of [['A', A], ['anon', anon]]) {
    for (const t of TABLES) {
      const r = await c.from(t).select('*').limit(5);
      check(`${who} can’t read ${t}`, !!r.error || (Array.isArray(r.data) && r.data.length === 0), describe(r));
    }
    const ins = await c.from('profiles').insert({ id: idA, display_name: 'x', friend_code: 'X-AAA' });
    check(`${who} can’t write profiles`, !!ins.error, describe(ins));
    const up = await c.from('saves').upsert({ user_id: idA, revision: 1, save_id: 'x', schema_version: 1, saved_at: 0, hour: 0, shop_name: 'x', day: 1, money: 0, encoding: 'json', body: '{}' });
    check(`${who} can’t write saves`, !!up.error, describe(up));
    const owner = await c.from('profiles').update({ is_owner: true }).eq('id', idA ?? '');
    check(`${who} can’t make itself the owner`, !!owner.error, describe(owner));
  }
  const inv = await anon.rpc('resolve_invite', { p_code: code.toLowerCase() });
  check('anon can resolve the invite (the signed-out invite screen)', inv.data?.club?.name === 'Aquarium Go Friends' && inv.data?.already_member === false && !('invite_code' in (inv.data?.club ?? {})), describe(inv));
  const none = await anon.rpc('resolve_invite', { p_code: 'NOPE-0000' });
  check('anon gets null for a code that opens nothing', !none.error && none.data === null, describe(none));
  for (const [fn, args] of Object.entries(FUNCTIONS)) {
    const r = await anon.rpc(fn, args);
    check(`anon can’t call ${fn}`, !!r.error, describe(r));
  }
  for (const fn of ['require_uid', 'club_json', 'save_meta_json', 'check_signup', 'create_profile', 'random_code', 'new_invite_code', 'invite_word', 'request_ip']) {
    const r = await A.rpc(fn, {});
    check(`A can’t call the helper ${fn}`, !!r.error, describe(r));
  }

  // 3. the online save: A's own, the revision check and the newer-build refusal
  const body = JSON.stringify({ format: 'aquarium-go-save', smoke: stamp, pad: 'x'.repeat(200_000) });
  const p1 = await putSave(A, 0, SCHEMA, body);
  check('A’s first put_save is written (revision 1)', p1.data?.ok === true && p1.data?.revision === 1, describe(p1));
  const bGet = await B.rpc('get_save');
  check('B’s get_save is B’s own (none), not A’s', !bGet.error && bGet.data === null, describe(bGet));
  const stale = await putSave(A, 0, SCHEMA, body);
  check('a stale revision is a conflict', stale.data?.ok === false && stale.data?.reason === 'conflict' && stale.data?.meta?.revision === 1, describe(stale));
  const newer = await putSave(A, 1, SCHEMA + 5, body);
  check('a newer build’s save is written (revision 2)', newer.data?.ok === true && newer.data?.revision === 2, describe(newer));
  const older = await putSave(A, 2, SCHEMA, body);
  check('an older build can’t write over it (too_new)', older.data?.ok === false && older.data?.reason === 'too_new' && older.data?.meta?.schema_version === SCHEMA + 5, describe(older));
  const aGet = await A.rpc('get_save');
  check('A’s get_save has A’s body', aGet.data?.body === body && aGet.data?.meta?.revision === 2 && aGet.data?.encoding === 'json', describe(aGet));
  const big = await putSave(A, 2, SCHEMA + 5, 'x'.repeat(4_000_001));
  check('a body over 4,000,000 characters is refused', !!big.error || big.data?.ok !== true, describe(big));
  const other = await putSave(A, 2, SCHEMA + 5, '{"other":1}', `save_other_${stamp}`);
  check('another aquarium replaces it (revision 3), the old one kept as previous', other.data?.ok === true && admin(`select previous_save_id from public.saves where user_id = '${idA}'`)[0]?.previous_save_id === `save_smoke_${stamp}`, describe(other));

  // 4. friends: A adds B's code, B sees the request and accepts, each sees the other
  const self = await A.rpc('add_friend', { p_code: meA.data?.friend_code });
  check('A can’t add itself', !!self.error, describe(self));
  const add = await A.rpc('add_friend', { p_code: meB.data?.friend_code?.toLowerCase() });
  check('A adds B’s friend code', !add.error, describe(add));
  const reqs = await B.rpc('friend_requests');
  check('B sees A’s request', reqs.data?.some?.((r) => r.id === idA && r.name === 'Smoke A'), describe(reqs));
  const acc = await B.rpc('accept_friend', { p_id: idA });
  check('B accepts', !acc.error, describe(acc));
  const reqs2 = await B.rpc('friend_requests');
  check('the request is gone once accepted', Array.isArray(reqs2.data) && !reqs2.data.some((r) => r.id === idA), describe(reqs2));
  const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const badPic = await B.rpc('report_standing', { p_shop_name: 'B Reef', p_gallons: 40, p_collection: 500, p_prismatics: 1, p_show_wins: 0, p_snapshot: 'https://tracker.example/p.png' });
  check('a picture that isn’t an embedded JPEG or WebP is refused', !!badPic.error, describe(badPic));
  const rep = await B.rpc('report_standing', { p_shop_name: 'B Reef', p_gallons: 40, p_collection: 500, p_prismatics: 1, p_show_wins: 0, p_snapshot: jpeg });
  check('B reports its standing and a picture', !rep.error, describe(rep));
  const fa = await A.rpc('friends_aquariums');
  check('A sees B’s aquarium and picture', fa.data?.some?.((f) => f.id === idB && f.title === 'B Reef' && f.gallons === 40 && f.snapshot === jpeg), describe(fa));
  const fb = await B.rpc('friends_aquariums');
  check('B sees A’s aquarium', fb.data?.some?.((f) => f.id === idA), describe(fb));
  const lbA = await A.rpc('leaderboard', { p_kind: 'prismatics' });
  check('A’s leaderboard ranks B (1 Prismatic) above A (0)', lbA.data?.rows?.[0]?.name === 'Smoke B' && lbA.data?.me?.me === true && lbA.data?.me?.value === 0, describe(lbA));
  const lbB = await B.rpc('leaderboard', { p_kind: 'collection_value' });
  check('B’s leaderboard has A in it', lbB.data?.rows?.some?.((r) => r.name === 'Smoke A') || lbB.data?.me?.rank > 1, describe(lbB));

  // 5. only the owner creates clubs
  const club = await B.rpc('create_club', { p_name: 'Smoke Club', p_blurb: '' });
  check('B’s create_club is forbidden', club.error?.message === 'forbidden', describe(club));

  // 6. guessing codes stops working: 100 wrong ones in 10 minutes, then nobody gets an answer (cleaned up below);
  // sign-up doesn't ask resolve_invite, so the brake never blocks it, and no network address is kept
  for (let i = 0; i < 100; i++) await anon.rpc('resolve_invite', { p_code: `GUESS-${'ABCDEFGHJKLMNPQRSTUVWXYZ'[i % 24]}${'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(i / 24)]}AA` });
  const braked = await anon.rpc('resolve_invite', { p_code: code });
  check('after 100 wrong codes the right one gets no answer either (the brake)', !braked.error && braked.data === null, describe(braked));
  const cols = admin("select string_agg(column_name, ',') as cols from information_schema.columns where table_schema = 'public' and table_name = 'invite_misses'")[0]?.cols;
  check('the brake keeps only times, no addresses', cols === 'at', String(cols));
  admin(`delete from public.invite_misses where at > to_timestamp(${Math.floor(stamp / 1000)})`);
  const after = await anon.rpc('resolve_invite', { p_code: code });
  check('once the misses are gone, the code answers again', after.data?.club?.name === 'Aquarium Go Friends', describe(after));
} catch (e) {
  check('the run finished', false, e instanceof Error ? e.message : String(e));
} finally {
  // 6. delete both accounts, then no row for either anywhere
  for (const [who, c, id] of [['A', A, idA], ['B', B, idB]]) {
    if (!id) continue;
    const del = await c.rpc('delete_my_account');
    check(`delete_my_account for ${who}`, !del.error, describe(del));
  }
  try {
    admin(`delete from public.invite_misses where at > to_timestamp(${Math.floor(stamp / 1000)})`); // this run's guesses: nobody stays braked
    const left = admin(
      `select (select count(*) from auth.users where email in ('${EMAIL_A}', '${EMAIL_B}')) as users, ` +
        `(select count(*) from public.profiles p where p.display_name like 'Smoke _' and p.created_at > now() - interval '1 hour') as profiles, ` +
        `(select count(*) from public.club_members where user_id in (${[idA, idB].filter(Boolean).map((i) => `'${i}'`).join(', ') || 'null'})) as members, ` +
        `(select count(*) from public.friend_links where from_id in (${[idA, idB].filter(Boolean).map((i) => `'${i}'`).join(', ') || 'null'}) or to_id in (${[idA, idB].filter(Boolean).map((i) => `'${i}'`).join(', ') || 'null'})) as links, ` +
        `(select count(*) from public.saves where user_id in (${[idA, idB].filter(Boolean).map((i) => `'${i}'`).join(', ') || 'null'})) as saves, ` +
        `(select count(*) from auth.audit_log_entries where payload ->> 'actor_id' in (${[idA, idB].filter(Boolean).map((i) => `'${i}'`).join(', ') || 'null'})) as audit`,
    )[0];
    const total = ['users', 'profiles', 'members', 'links', 'saves', 'audit'].reduce((n, k) => n + Number(left?.[k] ?? 1), 0);
    check('nothing of A or B is left in any table', total === 0, JSON.stringify(left));
    if (total !== 0) {
      admin(`delete from auth.users where email in ('${EMAIL_A}', '${EMAIL_B}')`);
      console.log('       (removed the leftovers as admin)');
    }
  } catch (e) {
    check('the leftover check ran', false, e instanceof Error ? e.message : String(e));
  }
  const back = await anon.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD });
  check('A can’t sign in once deleted', !!back.error, describe(back));
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed} of ${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
