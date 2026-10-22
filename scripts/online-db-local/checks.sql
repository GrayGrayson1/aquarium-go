-- chunk 8 — the database's rules as each role sees them, against the stand-in (run.sh). Each `\echo CASE ok|err <name>`
-- says whether the statement after it must succeed or fail (`denied`: fail for want of a privilege); run.sh fails when one doesn't. The cases follow the live
-- smoke test (ONLINE-STAGE1.md §8.3).
\set QUIET on
\pset tuples_only on
\pset format unaligned
-- the first club, as the setup will make it
insert into public.clubs (name, blurb, initials, color_a, color_b, invite_code) values ('Aquarium Go Friends', 'Friends and family of Aquarium Go', 'AG', '#2fc4b2', '#127567', public.new_invite_code('FRIENDS'));
select invite_code from public.clubs \gset
\echo CASE ok first-club :invite_code
\echo CASE ok code-shape
select case when :'invite_code' ~ '^FRIENDS-[A-HJ-NP-Z]{4}$' then 'ok' else (1 / (random() * 0)::int)::text end;

set role supabase_auth_admin;
\echo CASE err signup-wrong-code
insert into auth.users (email, raw_user_meta_data) values ('a@x.test', '{"invite_code":"NOPE-0000","display_name":"A","age_ok":true}');
\echo CASE err signup-no-age
insert into auth.users (email, raw_user_meta_data) values ('a@x.test', format('{"invite_code":"%s","display_name":"A"}', :'invite_code')::jsonb);
\echo CASE err signup-age-text
insert into auth.users (email, raw_user_meta_data) values ('a@x.test', format('{"invite_code":"%s","display_name":"A","age_ok":"true"}', :'invite_code')::jsonb);
\echo CASE err signup-no-name
insert into auth.users (email, raw_user_meta_data) values ('a@x.test', format('{"invite_code":"%s","display_name":"  ","age_ok":true}', :'invite_code')::jsonb);
\echo CASE ok signup-a
insert into auth.users (email, raw_user_meta_data) values ('a@x.test', format('{"invite_code":"%s","display_name":"Smoke A","age_ok":true}', lower(:'invite_code'))::jsonb);
\echo CASE ok signup-b
insert into auth.users (email, raw_user_meta_data) values ('b@x.test', format('{"invite_code":"%s","display_name":"Al","age_ok":true}', :'invite_code')::jsonb);
reset role;
select id from auth.users where email = 'a@x.test' \gset a_
select id from auth.users where email = 'b@x.test' \gset b_
select friend_code from public.profiles where id = :'a_id' \gset a_
select friend_code from public.profiles where id = :'b_id' \gset b_
\echo CASE ok codes :a_friend_code :b_friend_code

-- anon: no tables, no functions but resolve_invite
set role anon;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
\echo CASE denied anon-read-profiles
select * from public.profiles;
\echo CASE denied anon-read-saves
select * from public.saves;
\echo CASE denied anon-read-clubs
select * from public.clubs;
\echo CASE denied anon-write-profiles
insert into public.profiles (id, display_name, friend_code) values (gen_random_uuid(), 'x', 'X-AAA');
\echo CASE ok anon-resolve
select public.resolve_invite(:'invite_code');
-- chunk 9 (A1): a read-only call (an API GET) learns nothing: the brake's answer for the right code and a wrong one, and
-- nothing counted
\echo CASE ok anon-readonly-right
begin read only;
select case when public.resolve_invite(:'invite_code') = '{"braked": true}'::jsonb then 'braked' else (1 / (random() * 0)::int)::text end;
commit;
\echo CASE ok anon-readonly-wrong
begin read only;
select case when public.resolve_invite('NOPE-ZZZZ') = '{"braked": true}'::jsonb then 'braked, the same' else (1 / (random() * 0)::int)::text end;
commit;
\echo CASE ok anon-readonly-still-answers
select case when public.resolve_invite(:'invite_code') ? 'club' then 'answered' else (1 / (random() * 0)::int)::text end;
-- 100 wrong codes in 10 minutes, from anyone, then even the right one gets no answer, from anywhere (no addresses kept)
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.7"}', false) \g /dev/null
select count(public.resolve_invite('GUESS-' || n)) from generate_series(1, 100) as n \g /dev/null
\echo CASE ok anon-braked
select case when public.resolve_invite(:'invite_code') = '{"braked": true}'::jsonb then 'braked' else (1 / (random() * 0)::int)::text end;
select set_config('request.headers', '{"cf-connecting-ip": "198.51.100.9"}', false) \g /dev/null
\echo CASE ok anon-braked-elsewhere
select case when public.resolve_invite('NOPE-ZZZZ') = '{"braked": true}'::jsonb then 'braked, the same for any code' else (1 / (random() * 0)::int)::text end;
reset role;
\echo CASE ok misses-hold-no-address
select case when (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'invite_misses') = 1 then 'time only' else (1 / (random() * 0)::int)::text end;
delete from public.invite_misses;
set role anon;
\echo CASE ok anon-after-brake
select case when public.resolve_invite(:'invite_code') is not null then 'answered' else (1 / (random() * 0)::int)::text end;
select set_config('request.headers', '', false) \g /dev/null
\echo CASE denied anon-read-misses
select * from public.invite_misses;

\echo CASE denied anon-me
select public.me();
\echo CASE denied anon-put-save
select public.put_save(0, 'x', 1, 0, 0, 'x', 1, 0, 'json', '{}');
\echo CASE denied anon-put-save-for
select public.put_save_for(gen_random_uuid(), 0, 'x', 1, 0, 0, 'x', 1, 0, 'json', '{}');
\echo CASE denied anon-meta-for
select public.save_meta_for(gen_random_uuid());
\echo CASE denied anon-helper
select public.require_uid();
\echo CASE denied anon-delete
select public.delete_my_account();
reset role;

-- A, signed in
set role authenticated;
select set_config('request.jwt.claim.sub', :'a_id', false) \g /dev/null
\echo CASE denied a-read-saves
select * from public.saves;
\echo CASE denied a-update-owner
update public.profiles set is_owner = true;
\echo CASE denied a-helper-club-json
select public.club_json(null::public.clubs, null, true);
\echo CASE denied a-trigger-fn
select public.check_signup();
\echo CASE ok a-me
select public.me();
\echo CASE ok a-my-clubs
select public.my_clubs();
\echo CASE ok a-put-1
select public.put_save(0, 'save_a', 2, 1000, 12.5, 'Smoke Reef', 1, 100, 'json', '{"a":1}');
\echo CASE ok a-put-stale
select public.put_save(0, 'save_a', 2, 1000, 12.5, 'Smoke Reef', 1, 100, 'json', '{"a":1}');
\echo CASE ok a-put-newer
select public.put_save(1, 'save_a', 7, 1000, 12.5, 'Smoke Reef', 1, 100, 'json', '{"a":2}');
\echo CASE ok a-put-older
select public.put_save(2, 'save_a', 2, 1000, 12.5, 'Smoke Reef', 1, 100, 'json', '{"a":3}');
\echo CASE ok a-put-other
select public.put_save(2, 'save_other', 7, 1000, 12.5, 'Other', 1, 100, 'json', '{"o":1}');
\echo CASE err a-put-big
select public.put_save(3, 'save_other', 7, 1000, 12.5, 'Other', 1, 100, 'json', repeat('x', 4000001));
\echo CASE ok a-get
select public.get_save();
-- chunk 9 (B2): the save functions for the account the game believes is signed in
\echo CASE ok a-meta-for-self
select case when (public.save_meta_for(:'a_id') ->> 'revision')::int = 3 then 'revision 3' else (1 / (random() * 0)::int)::text end;
\echo CASE err a-meta-for-other
select public.save_meta_for(:'b_id');
\echo CASE err a-meta-for-null
select public.save_meta_for(null);
\echo CASE ok a-get-for-self
select case when public.get_save_for(:'a_id') ? 'body' then 'body' else (1 / (random() * 0)::int)::text end;
\echo CASE err a-get-for-other
select public.get_save_for(:'b_id');
\echo CASE err a-put-for-other
select public.put_save_for(:'b_id', 0, 'save_x', 7, 1000, 12.5, 'X', 1, 100, 'json', '{"x":1}');
\echo CASE ok a-put-for-other-wrote-nothing
reset role;
select case when not exists (select 1 from public.saves where user_id = :'b_id') then 'nothing for B' else (1 / (random() * 0)::int)::text end;
set role authenticated;
select set_config('request.jwt.claim.sub', :'a_id', false) \g /dev/null
\echo CASE ok a-put-for-self
select case when (public.put_save_for(:'a_id', 3, 'save_other', 7, 1000, 13, 'Other', 1, 100, 'json', '{"o":2}') ->> 'ok')::boolean then 'ok' else (1 / (random() * 0)::int)::text end;
\echo CASE err a-add-self
select public.add_friend(:'a_friend_code');
-- chunk 9 (A1): read-only, a right friend code and a wrong one get the same answer
select set_config('aq.right_code', :'b_friend_code', false) \g /dev/null
\echo CASE ok a-readonly-add-same-answer
begin read only;
do $$
declare
  r text;
  w text;
begin
  begin
    perform public.add_friend(current_setting('aq.right_code'));
  exception when others then r := sqlerrm;
  end;
  begin
    perform public.add_friend('NOPE-ZZZ');
  exception when others then w := sqlerrm;
  end;
  if r is distinct from w then
    raise exception 'different answers: % / %', r, w;
  end if;
end;
$$;
commit;
\echo CASE ok a-add-b
select public.add_friend(lower(:'b_friend_code'));
\echo CASE err a-create-club
select public.create_club('Smoke Club', '');
\echo CASE err a-bad-picture
select public.report_standing('A Reef', 10, 100, 0, 0, 'https://tracker.example/p.png');
\echo CASE ok a-standing
select public.report_standing('A Reef', 10, 100, 0, 3, 'data:image/jpeg;base64,/9j/AAAA');
\echo CASE err a-join-bad-uuid
select public.join_club('highland-betta');
\echo CASE err a-leaderboard-kind
select public.leaderboard('money');
reset role;

-- B
set role authenticated;
select set_config('request.jwt.claim.sub', :'b_id', false) \g /dev/null
\echo CASE ok b-get-none
select coalesce(public.get_save()::text, 'NULL');
\echo CASE ok b-requests
select public.friend_requests();
\echo CASE ok b-accept
select public.accept_friend(:'a_id');
\echo CASE ok b-requests-after
select public.friend_requests();
\echo CASE ok b-friends
select public.friends_aquariums();
\echo CASE ok b-leaderboard
select public.leaderboard('show_wins');
\echo CASE ok b-news
select public.news();
reset role;

-- the owner makes a club
update public.profiles set is_owner = true where id = :'b_id';
set role authenticated;
select set_config('request.jwt.claim.sub', :'b_id', false) \g /dev/null
\echo CASE ok b-create-club
select public.create_club('  Reef Night  ', 'Reefs, after dark');
\echo CASE ok b-my-clubs
select public.my_clubs();
\echo CASE err b-create-short
select public.create_club('R', '');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'a_id', false) \g /dev/null
\echo CASE ok a-sees-no-codes
select public.my_clubs();
\echo CASE ok a-news
select public.news();
reset role;

-- ───── chunk 12 (ADR-0047; SHARED-SHOPS.md §5.8, §6): service_role, the server's password and its functions ─────
-- A is in the first club; B, the owner, in the first club and Reef Night. Cascade Club starts without B.
select id from public.clubs where name = 'Aquarium Go Friends' \gset friends_
select id from public.clubs where name = 'Reef Night' \gset reef_
insert into public.clubs (name, blurb, initials, color_a, color_b, invite_code) values ('Cascade Club', '', 'CC', '#2f55d4', '#16247a', public.new_invite_code('CASCADE')) returning id \gset cascade_
\set server_key 'local-check-server-password-0123456789ABCDE'
\set wrong_key 'local-check-server-password-0123456789ABCDF'
select encode(extensions.digest(:'server_key', 'sha256'), 'hex') as server_hex, encode(extensions.digest(:'wrong_key', 'sha256'), 'hex') as wrong_hex \gset
select encode(sha256('photo one'::bytea), 'hex') as h1, encode(sha256('photo two'::bytea), 'hex') as h2 \gset
select to_char(now() at time zone 'UTC', 'YYYY-MM') as month_now,
  to_char(date_trunc('month', now() at time zone 'UTC') - interval '1 month', 'YYYY-MM') as month_last,
  to_char(date_trunc('month', now() at time zone 'UTC') - interval '2 months', 'YYYY-MM') as month_old,
  to_char(date_trunc('month', now() at time zone 'UTC') + interval '1 month', 'YYYY-MM') as month_next,
  to_char(date_trunc('month', now() at time zone 'UTC') + interval '1 month', 'YYYY-MM-DD') as reopens \gset
-- for these checks only (dropped at the end): what each of the 12 server functions answers p_key, as the caller (its
-- error, or 'answered'), so a refusal is known to be the password's and not a call that doesn't fit
create schema checks;
grant usage on schema checks to anon, authenticated;
create function checks.server_answers(p_key text) returns text[]
language plpgsql set search_path = '' as $$
declare
  v_club uuid := gen_random_uuid();
  v_hash text := repeat('a', 64);
  v_out text[] := '{}';
begin
  for i in 1..12 loop
    begin
      case i
        when 1 then perform public.server_member(p_key, gen_random_uuid(), v_club);
        when 2 then perform public.server_shop_get(p_key, v_club);
        when 3 then perform public.server_shop_create(p_key, v_club, gen_random_uuid(), 'Shop', 30, 'build', 0, 0, 1, 0, 'json', '{}');
        when 4 then perform public.server_shop_put(p_key, v_club, 'host', 1, 'Shop', 30, 'build', 0, null, 0, 1, 0, 'json', '{}');
        when 5 then perform public.server_shop_take(p_key, v_club, 'host', 30);
        when 6 then perform public.server_shop_release(p_key, v_club, 'host');
        when 7 then perform public.server_set_pausers(p_key, v_club, '{}');
        when 8 then perform public.server_photo_put(p_key, v_club, v_hash, 'image/jpeg', '/9j/AAAA');
        when 9 then perform public.server_photo_get(p_key, v_club, v_hash);
        when 10 then perform public.server_photo_hashes(p_key, v_club);
        when 11 then perform public.server_photos_delete(p_key, v_club, '{}');
        else perform public.server_usage_add(p_key, to_char(now() at time zone 'UTC', 'YYYY-MM'), 0, 0);
      end case;
      v_out := v_out || 'answered'::text;
    exception when others then
      v_out := v_out || sqlerrm;
    end;
  end loop;
  return v_out;
end;
$$;

-- service_role (what any of the project's secret keys acts as): nothing in public, old or new
set role service_role;
\echo CASE denied service-read-profiles
select * from public.profiles;
\echo CASE denied service-write-profiles
delete from public.profiles where false;
\echo CASE denied service-read-clubs
select * from public.clubs;
\echo CASE denied service-write-clubs
delete from public.clubs where false;
\echo CASE denied service-read-club-members
select * from public.club_members;
\echo CASE denied service-write-club-members
insert into public.club_members (club_id, user_id) values (:'friends_id', :'a_id');
\echo CASE denied service-read-friend-links
select * from public.friend_links;
\echo CASE denied service-write-friend-links
delete from public.friend_links where false;
\echo CASE denied service-read-saves
select * from public.saves;
\echo CASE denied service-write-saves
delete from public.saves where false;
\echo CASE denied service-read-misses
select * from public.invite_misses;
\echo CASE denied service-write-misses
insert into public.invite_misses (at) values (now());
\echo CASE denied service-read-shared-shops
select * from public.shared_shops;
\echo CASE denied service-write-shared-shops
delete from public.shared_shops where false;
\echo CASE denied service-read-shared-photos
select * from public.shared_photos;
\echo CASE denied service-write-shared-photos
delete from public.shared_photos where false;
\echo CASE denied service-read-shared-usage
select * from public.shared_usage;
\echo CASE denied service-write-shared-usage
insert into public.shared_usage (month) values (:'month_now');
\echo CASE denied service-read-server-key
select * from private.server_key;
\echo CASE denied service-me
select public.me();
\echo CASE denied service-resolve
select public.resolve_invite('NOPE-ZZZZ');
\echo CASE denied service-helper
select public.club_json(null::public.clubs, null, true);
\echo CASE denied service-server-member
select public.server_member(:'server_key', :'a_id', :'friends_id');
\echo CASE denied service-club-shared-shops
select public.club_shared_shops();
reset role;
\echo CASE ok service-holds-nothing
select case when not exists (
    select 1 from pg_class c
    where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
      and has_table_privilege('service_role', c.oid, 'select,insert,update,delete,truncate,references,trigger'))
  and not exists (
    select 1 from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace) and has_function_privilege('service_role', p.oid, 'execute'))
  and (select count(*) from pg_class c where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and c.relkind = 'r') = 10
  and (select count(*) from pg_proc p where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)) > 70
  then 'nothing, in 10 tables and every function' else (1 / (random() * 0)::int)::text end;
-- made in public after the migration: still nothing for service_role (anon and authenticated still get Supabase's
-- defaults, which every migration revokes by hand)
create table public.zz_later (x integer);
create sequence public.zz_later_seq;
create function public.zz_later_fn() returns integer language sql as $$ select 1 $$;
\echo CASE ok service-nothing-new
select case when not has_table_privilege('service_role', 'public.zz_later', 'select,insert,update,delete,truncate,references,trigger')
    and not has_sequence_privilege('service_role', 'public.zz_later_seq', 'usage,select,update')
    and not exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = 'public.zz_later_fn()'::regprocedure and a.grantee = 'service_role'::regrole)
    and has_table_privilege('anon', 'public.zz_later', 'select')
  then 'nothing for service_role' else (1 / (random() * 0)::int)::text end;
set role service_role;
\echo CASE denied service-read-later
select * from public.zz_later;
\echo CASE denied service-write-later
insert into public.zz_later values (1);
reset role;
drop function public.zz_later_fn();
drop sequence public.zz_later_seq;
drop table public.zz_later;

-- anon, before any password is stored: every server function refuses
set role anon;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
\echo CASE err anon-nokey-member
select public.server_member(:'server_key', :'a_id', :'friends_id');
\echo CASE err anon-nokey-get
select public.server_shop_get(:'server_key', :'friends_id');
\echo CASE err anon-nokey-create
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', 'Friends Shop', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}');
\echo CASE err anon-nokey-put
select public.server_shop_put(:'server_key', :'friends_id', 'host-1', 1, 'Friends Shop', 30, 'test-build', 1000, null, 8, 1, 2500, 'json', '{}');
\echo CASE err anon-nokey-take
select public.server_shop_take(:'server_key', :'friends_id', 'host-1', 30);
\echo CASE err anon-nokey-release
select public.server_shop_release(:'server_key', :'friends_id', 'host-1');
\echo CASE err anon-nokey-pausers
select public.server_set_pausers(:'server_key', :'friends_id', '{}');
\echo CASE err anon-nokey-photo-put
select public.server_photo_put(:'server_key', :'friends_id', :'h1', 'image/jpeg', '/9j/AAAA');
\echo CASE err anon-nokey-photo-get
select public.server_photo_get(:'server_key', :'friends_id', :'h1');
\echo CASE err anon-nokey-photo-hashes
select public.server_photo_hashes(:'server_key', :'friends_id');
\echo CASE err anon-nokey-photos-delete
select public.server_photos_delete(:'server_key', :'friends_id', array[:'h1']);
\echo CASE err anon-nokey-usage
select public.server_usage_add(:'server_key', :'month_now', 0, 0);
\echo CASE ok anon-nokey-all-forbidden
select case when checks.server_answers(:'server_key') = array_fill('forbidden'::text, array[12]) then 'all 12 forbidden' else (1 / (random() * 0)::int)::text end;
reset role;

-- the owner's script stores a fingerprint (scripts/shared-server-key.mjs: this statement); running it again replaces it
\echo CASE ok store-fingerprint
insert into private.server_key (id, key_hash) values (1, decode(:'wrong_hex', 'hex')) on conflict (id) do update set key_hash = excluded.key_hash, set_at = now();
set role anon;
\echo CASE ok anon-first-password
select case when public.server_member(:'wrong_key', :'a_id', :'friends_id') is not null then 'answered' else (1 / (random() * 0)::int)::text end;
reset role;
\echo CASE ok replace-fingerprint
insert into private.server_key (id, key_hash) values (1, decode(:'server_hex', 'hex')) on conflict (id) do update set key_hash = excluded.key_hash, set_at = now();
\echo CASE ok one-fingerprint
select case when (select count(*) from private.server_key) = 1 then 'one row' else (1 / (random() * 0)::int)::text end;
\echo CASE err fingerprint-second-row
insert into private.server_key (id, key_hash) values (2, decode(:'wrong_hex', 'hex'));
\echo CASE err fingerprint-shape
update private.server_key set key_hash = '\x00';
set role anon;
\echo CASE err anon-old-password
select public.server_member(:'wrong_key', :'a_id', :'friends_id');
\echo CASE ok anon-old-password-all-forbidden
select case when checks.server_answers(:'wrong_key') = array_fill('forbidden'::text, array[12]) then 'all 12 forbidden' else (1 / (random() * 0)::int)::text end;
\echo CASE ok anon-no-password-all-forbidden
select case when checks.server_answers(null) = array_fill('forbidden'::text, array[12]) then 'all 12 forbidden' else (1 / (random() * 0)::int)::text end;
\echo CASE ok anon-short-password-all-forbidden
select case when checks.server_answers(left(:'server_key', 31)) = array_fill('forbidden'::text, array[12]) then 'all 12 forbidden' else (1 / (random() * 0)::int)::text end;
\echo CASE ok anon-right-password
select case when public.server_member(:'server_key', :'a_id', :'friends_id') is not null then 'answered' else (1 / (random() * 0)::int)::text end;
-- anon, with or without the password, still has no table and none of the game's functions
\echo CASE denied anon-read-shared-shops
select * from public.shared_shops;
\echo CASE denied anon-write-shared-shops
insert into public.shared_shops (club_id, shop_name, revision, schema_version, build, saved_at, hour, day, money, encoding, body) values (:'friends_id', 'x', 1, 1, 'b', 0, 0, 0, 0, 'json', '{}');
\echo CASE denied anon-read-shared-photos
select * from public.shared_photos;
\echo CASE denied anon-read-shared-usage
select * from public.shared_usage;
\echo CASE denied anon-write-shared-usage
insert into public.shared_usage (month) values (:'month_now');
\echo CASE denied anon-read-server-key
select * from private.server_key;
\echo CASE denied anon-write-server-key
insert into private.server_key (id, key_hash) values (1, decode(repeat('00', 32), 'hex'));
\echo CASE denied anon-require-server
select private.require_server(:'server_key');
\echo CASE denied anon-club-shared-shops
select public.club_shared_shops();
\echo CASE denied anon-shared-usage
select public.shared_usage();

-- the server's functions with the right password, as anon (the server calls with the publishable key)
\echo CASE ok srv-member
select case when public.server_member(:'server_key', :'a_id', :'friends_id') = '{"name": "Smoke A", "owner": false, "pause": false, "shop": false}'::jsonb then 'member' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-member-not-in-club
select case when public.server_member(:'server_key', :'a_id', :'reef_id') is null then 'null' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-member-nobody
select case when public.server_member(:'server_key', gen_random_uuid(), :'friends_id') is null then 'null' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-member-owner
select case when public.server_member(:'server_key', :'b_id', :'reef_id') = '{"name": "Al", "owner": true, "pause": true, "shop": false}'::jsonb then 'owner' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-member-null
select public.server_member(:'server_key', null, :'friends_id');
\echo CASE err srv-create-not-owner
select public.server_shop_create(:'server_key', :'friends_id', :'a_id', 'Friends Shop', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{"shop":"friends"}');
\echo CASE err srv-create-not-member
select public.server_shop_create(:'server_key', :'cascade_id', :'b_id', 'Cascade Shop', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}');
\echo CASE err srv-create-blank-name
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', '   ', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}');
\echo CASE err srv-create-long-name
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', repeat('n', 61), 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}');
\echo CASE err srv-create-no-build
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', 'Friends Shop', 30, '', 1000, 8, 1, 2500, 'json', '{}');
\echo CASE err srv-create-encoding
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', 'Friends Shop', 30, 'test-build', 1000, 8, 1, 2500, 'xml', '{}');
\echo CASE err srv-create-not-finite
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', 'Friends Shop', 30, 'test-build', 1000, 8, 1, 'NaN', 'json', '{}');
\echo CASE err srv-create-big
select public.server_shop_create(:'server_key', :'friends_id', :'b_id', 'Friends Shop', 30, 'test-build', 1000, 8, 1, 2500, 'json', repeat('x', 4000001));
\echo CASE ok srv-create
select case when public.server_shop_create(:'server_key', :'friends_id', :'b_id', '  Friends Shop  ', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{"shop":"friends"}') = '{"ok": true, "revision": 1}'::jsonb then 'created' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-create-exists
select case when public.server_shop_create(:'server_key', :'friends_id', :'b_id', 'Another', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}') = '{"ok": false, "reason": "exists"}'::jsonb then 'exists' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-create-reef
select case when public.server_shop_create(:'server_key', :'reef_id', :'b_id', 'Reef Shop', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{"shop":"reef"}') = '{"ok": true, "revision": 1}'::jsonb then 'created' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-get
select case when public.server_shop_get(:'server_key', :'friends_id') = jsonb_build_object(
    'meta', jsonb_build_object('club_id', :'friends_id'::uuid, 'shop_name', 'Friends Shop', 'created_by', :'b_id'::uuid, 'pausers', '[]'::jsonb, 'revision', 1, 'schema_version', 30, 'build', 'test-build', 'saved_at', 1000, 'left_at', null, 'hour', 8, 'day', 1, 'money', 2500),
    'encoding', 'json', 'body', '{"shop":"friends"}')
  then 'as created' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-get-none
select case when public.server_shop_get(:'server_key', gen_random_uuid()) is null then 'null' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-member-shop
select case when public.server_member(:'server_key', :'a_id', :'friends_id') = '{"name": "Smoke A", "owner": false, "pause": false, "shop": true}'::jsonb then 'member, with a shop' else (1 / (random() * 0)::int)::text end;

-- the lease (§6.2)
\echo CASE ok srv-take-missing
select case when public.server_shop_take(:'server_key', gen_random_uuid(), 'host-1', 30) = '{"ok": false, "reason": "missing"}'::jsonb then 'missing' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-take-short
select public.server_shop_take(:'server_key', :'friends_id', 'host-1', 9);
\echo CASE err srv-take-long
select public.server_shop_take(:'server_key', :'friends_id', 'host-1', 601);
\echo CASE err srv-take-no-holder
select public.server_shop_take(:'server_key', :'friends_id', '', 30);
\echo CASE ok srv-take
with t as (select public.server_shop_take(:'server_key', :'friends_id', 'host-1', 10) as r, floor(extract(epoch from now()) * 1000)::bigint as now_ms)
select case when (r ->> 'ok')::boolean and (r ->> 'until_ms')::bigint between now_ms + 9000 and now_ms + 11000 then 'ten seconds' else (1 / (random() * 0)::int)::text end from t;
\echo CASE ok srv-take-held
select case when public.server_shop_take(:'server_key', :'friends_id', 'host-2', 30) = '{"ok": false, "reason": "held"}'::jsonb then 'held' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-take-renew
select case when (public.server_shop_take(:'server_key', :'friends_id', 'host-1', 10) ->> 'ok')::boolean then 'renewed' else (1 / (random() * 0)::int)::text end;
-- the checks in order: missing, lease, too_new, conflict
\echo CASE ok srv-put-not-holder
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-2', 5, 'Friends Shop', 29, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{}') = '{"ok": false, "reason": "lease"}'::jsonb then 'lease' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-put-too-new
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-1', 5, 'Friends Shop', 29, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{}') = '{"ok": false, "reason": "too_new"}'::jsonb then 'too_new' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-put-conflict
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-1', 5, 'Friends Shop', 31, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{}') = '{"ok": false, "reason": "conflict", "revision": 1}'::jsonb then 'conflict' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-put-missing
select case when public.server_shop_put(:'server_key', gen_random_uuid(), 'host-1', 1, 'Friends Shop', 31, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{}') = '{"ok": false, "reason": "missing"}'::jsonb then 'missing' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-put-big
select public.server_shop_put(:'server_key', :'friends_id', 'host-1', 1, 'Friends Shop', 31, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', repeat('x', 4000001));
\echo CASE err srv-put-negative-left
select public.server_shop_put(:'server_key', :'friends_id', 'host-1', 1, 'Friends Shop', 31, 'test-build-2', 2000, -1, 9.5, 2, 3000, 'json', '{}');
\echo CASE err srv-put-no-holder
select public.server_shop_put(:'server_key', :'friends_id', null, 1, 'Friends Shop', 31, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{}');
\echo CASE ok srv-put
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-1', 1, '  Friends Shop 2 ', 31, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{"shop":"friends","v":2}') = '{"ok": true, "revision": 2}'::jsonb then 'revision 2' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-put-stored
select case when public.server_shop_get(:'server_key', :'friends_id') = jsonb_build_object(
    'meta', jsonb_build_object('club_id', :'friends_id'::uuid, 'shop_name', 'Friends Shop 2', 'created_by', :'b_id'::uuid, 'pausers', '[]'::jsonb, 'revision', 2, 'schema_version', 31, 'build', 'test-build-2', 'saved_at', 2000, 'left_at', 9000, 'hour', 9.5, 'day', 2, 'money', 3000),
    'encoding', 'json', 'body', '{"shop":"friends","v":2}')
  then 'stored' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-put-stale
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-1', 1, 'Friends Shop 2', 31, 'test-build-2', 2000, 9000, 9.5, 2, 3000, 'json', '{}') = '{"ok": false, "reason": "conflict", "revision": 2}'::jsonb then 'conflict' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-put-running
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-1', 2, 'Friends Shop 2', 31, 'test-build-2', 2500, null, 10, 3, 3500, 'json', '{"shop":"friends","v":3}') = '{"ok": true, "revision": 3}'::jsonb then 'revision 3, running' else (1 / (random() * 0)::int)::text end;
-- host-1's ten seconds run out
reset role;
update public.shared_shops set lease_until = now() - interval '1 second' where club_id = :'friends_id';
set role anon;
\echo CASE ok srv-put-expired
select case when public.server_shop_put(:'server_key', :'friends_id', 'host-1', 3, 'Friends Shop 2', 31, 'test-build-2', 2600, null, 10, 3, 3500, 'json', '{}') = '{"ok": false, "reason": "lease"}'::jsonb then 'lease' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-take-expired
select case when (public.server_shop_take(:'server_key', :'friends_id', 'host-2', 10) ->> 'ok')::boolean then 'taken' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-take-held-again
select case when public.server_shop_take(:'server_key', :'friends_id', 'host-1', 10) = '{"ok": false, "reason": "held"}'::jsonb then 'held' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-release-not-holder
select case when not public.server_shop_release(:'server_key', :'friends_id', 'host-1') then 'not theirs' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-release
select case when public.server_shop_release(:'server_key', :'friends_id', 'host-2') then 'released' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-release-again
select case when not public.server_shop_release(:'server_key', :'friends_id', 'host-2') then 'nothing held' else (1 / (random() * 0)::int)::text end;
reset role;
\echo CASE ok srv-released
select case when (select lease_holder is null and lease_until is null and revision = 3 from public.shared_shops where club_id = :'friends_id') then 'free, revision 3' else (1 / (random() * 0)::int)::text end;
set role anon;
\echo CASE ok srv-take-after-release
select case when (public.server_shop_take(:'server_key', :'friends_id', 'host-1', 10) ->> 'ok')::boolean then 'taken' else (1 / (random() * 0)::int)::text end;

-- who may pause
\echo CASE ok srv-pausers
select case when public.server_set_pausers(:'server_key', :'friends_id', array[:'a_id'::uuid, gen_random_uuid(), :'a_id'::uuid, null, :'b_id'::uuid]) = jsonb_build_array(:'a_id'::uuid, :'b_id'::uuid) then 'members only, once each' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-member-pause
select case when public.server_member(:'server_key', :'a_id', :'friends_id') = '{"name": "Smoke A", "owner": false, "pause": true, "shop": true}'::jsonb then 'may pause' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-pausers-stored
select case when public.server_shop_get(:'server_key', :'friends_id') -> 'meta' -> 'pausers' = jsonb_build_array(:'a_id'::uuid, :'b_id'::uuid) then 'stored' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-pausers-too-many
select public.server_set_pausers(:'server_key', :'friends_id', array(select gen_random_uuid() from generate_series(1, 51)));
\echo CASE err srv-pausers-no-shop
select public.server_set_pausers(:'server_key', gen_random_uuid(), '{}');
\echo CASE err srv-pausers-null
select public.server_set_pausers(:'server_key', :'friends_id', null);
\echo CASE ok srv-pausers-cleared
select case when public.server_set_pausers(:'server_key', :'friends_id', '{}') = '[]'::jsonb then 'none' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-member-no-pause
select case when public.server_member(:'server_key', :'a_id', :'friends_id') ->> 'pause' = 'false' then 'may not pause' else (1 / (random() * 0)::int)::text end;

-- listing photos (§4.4)
\echo CASE ok srv-photo-put
select case when public.server_photo_put(:'server_key', :'friends_id', :'h1', 'image/webp', 'UklGRhIAAABXRUJQ') then 'stored' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-put-again
select case when not public.server_photo_put(:'server_key', :'friends_id', :'h1', 'image/webp', 'UklGRhIAAABXRUJQ') then 'already there' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-get
select case when public.server_photo_get(:'server_key', :'friends_id', :'h1') = '{"mime": "image/webp", "data": "UklGRhIAAABXRUJQ"}'::jsonb then 'served' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-get-none
select case when public.server_photo_get(:'server_key', :'friends_id', :'h2') is null then 'null' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-other-club
select case when public.server_photo_get(:'server_key', :'reef_id', :'h1') is null then 'not in another club' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-put-two
select case when public.server_photo_put(:'server_key', :'friends_id', :'h2', 'image/jpeg', '/9j/4AAQSkZJRg==') then 'stored' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-hashes
select case when (select array_agg(e ->> 'hash' order by n) from jsonb_array_elements(public.server_photo_hashes(:'server_key', :'friends_id')) with ordinality as x(e, n)) = array[:'h1', :'h2']
    and (select bool_and((e ->> 'at')::bigint between floor(extract(epoch from now()) * 1000)::bigint - 600000 and floor(extract(epoch from now()) * 1000)::bigint) from jsonb_array_elements(public.server_photo_hashes(:'server_key', :'friends_id')) as e)
  then 'oldest first, with times' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-hashes-none
select case when public.server_photo_hashes(:'server_key', :'reef_id') = '[]'::jsonb then 'none' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-photo-upper-hash
select public.server_photo_put(:'server_key', :'friends_id', repeat('A', 64), 'image/webp', 'UklGRhIAAABXRUJQ');
\echo CASE err srv-photo-short-hash
select public.server_photo_put(:'server_key', :'friends_id', 'abc123', 'image/webp', 'UklGRhIAAABXRUJQ');
\echo CASE err srv-photo-png
select public.server_photo_put(:'server_key', :'friends_id', repeat('b', 64), 'image/png', 'iVBORw0KGgo=');
\echo CASE err srv-photo-data-url
select public.server_photo_put(:'server_key', :'friends_id', repeat('b', 64), 'image/jpeg', 'data:image/jpeg;base64,/9j/AAAA');
\echo CASE err srv-photo-too-big
select public.server_photo_put(:'server_key', :'friends_id', repeat('b', 64), 'image/jpeg', repeat('A', 64001));
\echo CASE err srv-photo-no-shop
select public.server_photo_put(:'server_key', :'cascade_id', repeat('b', 64), 'image/jpeg', '/9j/AAAA');
\echo CASE err srv-photo-get-bad-hash
select public.server_photo_get(:'server_key', :'friends_id', 'nope');
\echo CASE ok srv-photos-delete
select case when public.server_photos_delete(:'server_key', :'friends_id', array[:'h1', repeat('0', 64)]) = 1 then 'one deleted' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photos-after-delete
select case when public.server_photo_hashes(:'server_key', :'friends_id') -> 0 ->> 'hash' = :'h2' and jsonb_array_length(public.server_photo_hashes(:'server_key', :'friends_id')) = 1 then 'one left' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-photos-delete-too-many
select public.server_photos_delete(:'server_key', :'friends_id', array(select repeat('0', 64) from generate_series(1, 1001)));
reset role;
insert into public.shared_photos (club_id, hash, mime, data) select :'friends_id', encode(sha256(convert_to('fill ' || n, 'UTF8')), 'hex'), 'image/jpeg', '/9j/AAAA' from generate_series(1, 999) as n;
set role anon;
select set_config('aq.key', :'server_key', false), set_config('aq.club', :'friends_id', false), set_config('aq.h1', :'h1', false) \g /dev/null
\echo CASE ok srv-photo-full
do $$
begin
  perform public.server_photo_put(current_setting('aq.key'), current_setting('aq.club')::uuid, current_setting('aq.h1'), 'image/webp', 'UklGRhIAAABXRUJQ');
  raise exception 'a photo past 1000';
exception when others then
  if sqlerrm <> 'full' then
    raise;
  end if;
end;
$$;
\echo CASE ok srv-photo-known-when-full
select case when not public.server_photo_put(:'server_key', :'friends_id', :'h2', 'image/jpeg', '/9j/4AAQSkZJRg==') then 'already there' else (1 / (random() * 0)::int)::text end;
reset role;
delete from public.shared_photos where club_id = :'friends_id' and hash <> :'h2';

-- the meters (§5.7)
set role anon;
\echo CASE ok srv-usage-empty
select case when public.server_usage_add(:'server_key', :'month_now', 0, 0) = jsonb_build_object('month', :'month_now', 'bytes_out', 0, 'awake_seconds', 0, 'closed', null) then 'nothing yet' else (1 / (random() * 0)::int)::text end;
reset role;
\echo CASE ok srv-usage-read-wrote-nothing
select case when not exists (select 1 from public.shared_usage) then 'no row' else (1 / (random() * 0)::int)::text end;
set role anon;
\echo CASE ok srv-usage-add
select case when public.server_usage_add(:'server_key', :'month_now', 1000, 60) = jsonb_build_object('month', :'month_now', 'bytes_out', 1000, 'awake_seconds', 60, 'closed', null) then 'added' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-usage-add-more
select case when public.server_usage_add(:'server_key', :'month_now', 500, 30) = jsonb_build_object('month', :'month_now', 'bytes_out', 1500, 'awake_seconds', 90, 'closed', null) then 'added up' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-usage-read
select case when public.server_usage_add(:'server_key', :'month_now', 0, 0) = jsonb_build_object('month', :'month_now', 'bytes_out', 1500, 'awake_seconds', 90, 'closed', null) then 'read' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-usage-last-month
select case when public.server_usage_add(:'server_key', :'month_last', 5, 5) = jsonb_build_object('month', :'month_last', 'bytes_out', 5, 'awake_seconds', 5, 'closed', null) then 'last month' else (1 / (random() * 0)::int)::text end;
\echo CASE err srv-usage-old-month
select public.server_usage_add(:'server_key', :'month_old', 1, 1);
\echo CASE err srv-usage-next-month
select public.server_usage_add(:'server_key', :'month_next', 1, 1);
\echo CASE err srv-usage-bad-month
select public.server_usage_add(:'server_key', '2026-13', 1, 1);
\echo CASE err srv-usage-negative
select public.server_usage_add(:'server_key', :'month_now', -1, 0);
\echo CASE err srv-usage-too-many-bytes
select public.server_usage_add(:'server_key', :'month_now', 10000000001, 0);
\echo CASE err srv-usage-too-many-seconds
select public.server_usage_add(:'server_key', :'month_now', 0, 3000001);
reset role;

-- a signed-in player: no table, no server function; the game's two
set role authenticated;
select set_config('request.jwt.claim.sub', :'a_id', false) \g /dev/null
\echo CASE denied a-read-shared-shops
select * from public.shared_shops;
\echo CASE denied a-write-shared-shops
update public.shared_shops set money = 0;
\echo CASE denied a-read-shared-photos
select * from public.shared_photos;
\echo CASE denied a-read-shared-usage
select * from public.shared_usage;
\echo CASE denied a-read-server-key
select * from private.server_key;
\echo CASE denied a-require-server
select private.require_server(:'server_key');
\echo CASE denied a-private-server-fn
select private.server_shop_get(:'server_key', :'friends_id');
\echo CASE denied a-server-member
select public.server_member(:'server_key', :'a_id', :'friends_id');
\echo CASE denied a-server-get
select public.server_shop_get(:'server_key', :'friends_id');
\echo CASE denied a-server-create
select public.server_shop_create(:'server_key', :'friends_id', :'a_id', 'Mine', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}');
\echo CASE denied a-server-put
select public.server_shop_put(:'server_key', :'friends_id', 'host-1', 3, 'Mine', 31, 'test-build', 1000, null, 8, 1, 2500, 'json', '{}');
\echo CASE denied a-server-take
select public.server_shop_take(:'server_key', :'friends_id', 'host-a', 30);
\echo CASE denied a-server-release
select public.server_shop_release(:'server_key', :'friends_id', 'host-1');
\echo CASE denied a-server-pausers
select public.server_set_pausers(:'server_key', :'friends_id', array[:'a_id'::uuid]);
\echo CASE denied a-server-photo-put
select public.server_photo_put(:'server_key', :'friends_id', :'h1', 'image/jpeg', '/9j/AAAA');
\echo CASE denied a-server-photo-get
select public.server_photo_get(:'server_key', :'friends_id', :'h2');
\echo CASE denied a-server-photo-hashes
select public.server_photo_hashes(:'server_key', :'friends_id');
\echo CASE denied a-server-photos-delete
select public.server_photos_delete(:'server_key', :'friends_id', array[:'h2']);
\echo CASE denied a-server-usage
select public.server_usage_add(:'server_key', :'month_now', 0, 0);
\echo CASE ok a-club-shared-shops
select case when public.club_shared_shops() = jsonb_build_object(
    'shops', jsonb_build_array(jsonb_build_object('club', :'friends_id'::uuid, 'name', 'Friends Shop 2', 'day', 3, 'money', 3500, 'played_at', 2500)),
    'closed', null, 'reopens', null)
  then 'my club''s shop only, no body' else (1 / (random() * 0)::int)::text end;
\echo CASE err a-shared-usage
select public.shared_usage();
select set_config('request.jwt.claim.sub', :'b_id', false) \g /dev/null
\echo CASE ok b-club-shared-shops
select case when (select array_agg(e ->> 'club' order by n) from jsonb_array_elements(public.club_shared_shops() -> 'shops') with ordinality as x(e, n))
    = (select array_agg(v.id::text order by v.id) from (values (:'friends_id'::uuid), (:'reef_id'::uuid)) as v(id))
  then 'both clubs, in order' else (1 / (random() * 0)::int)::text end;
\echo CASE ok b-shared-usage
select case when public.shared_usage() = jsonb_build_object('month', :'month_now', 'bytes_out', 1500, 'awake_seconds', 90, 'closed', null, 'bytes_cap', 2000000000, 'seconds_cap', 1440000) then 'the owner''s meters' else (1 / (random() * 0)::int)::text end;
reset role;

-- the caps: whichever is reached first closes the month and stays
set role anon;
\echo CASE ok srv-usage-cap
select case when public.server_usage_add(:'server_key', :'month_now', 2000000000, 0) = jsonb_build_object('month', :'month_now', 'bytes_out', 2000001500, 'awake_seconds', 90, 'closed', 'cap') then 'closed: cap' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-usage-cap-stays
select case when public.server_usage_add(:'server_key', :'month_now', 0, 1440000) = jsonb_build_object('month', :'month_now', 'bytes_out', 2000001500, 'awake_seconds', 1440090, 'closed', 'cap') then 'still cap' else (1 / (random() * 0)::int)::text end;
reset role;
delete from public.shared_usage where month = :'month_last';
set role anon;
\echo CASE ok srv-usage-hours
select case when public.server_usage_add(:'server_key', :'month_last', 0, 1440000) = jsonb_build_object('month', :'month_last', 'bytes_out', 0, 'awake_seconds', 1440000, 'closed', 'hours') then 'closed: hours, first save of the month' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-usage-hours-stays
select case when public.server_usage_add(:'server_key', :'month_last', 2000000000, 0) = jsonb_build_object('month', :'month_last', 'bytes_out', 2000000000, 'awake_seconds', 1440000, 'closed', 'hours') then 'still hours' else (1 / (random() * 0)::int)::text end;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'a_id', false) \g /dev/null
\echo CASE ok a-club-shared-shops-closed
select case when public.club_shared_shops() ->> 'closed' = 'cap' and public.club_shared_shops() ->> 'reopens' = :'reopens' and jsonb_array_length(public.club_shared_shops() -> 'shops') = 1 then 'closed until the 1st' else (1 / (random() * 0)::int)::text end;
select set_config('request.jwt.claim.sub', :'b_id', false) \g /dev/null
\echo CASE ok b-shared-usage-closed
select case when public.shared_usage() ->> 'closed' = 'cap' and (public.shared_usage() ->> 'bytes_out')::bigint = 2000001500 then 'cap' else (1 / (random() * 0)::int)::text end;
reset role;

-- a club deleted takes its shop and its photos with it
insert into public.club_members (club_id, user_id) values (:'cascade_id', :'b_id');
set role anon;
\echo CASE ok srv-create-cascade
select case when public.server_shop_create(:'server_key', :'cascade_id', :'b_id', 'Cascade Shop', 30, 'test-build', 1000, 8, 1, 2500, 'json', '{}') = '{"ok": true, "revision": 1}'::jsonb then 'created' else (1 / (random() * 0)::int)::text end;
\echo CASE ok srv-photo-cascade
select case when public.server_photo_put(:'server_key', :'cascade_id', :'h1', 'image/jpeg', '/9j/AAAA') then 'stored' else (1 / (random() * 0)::int)::text end;
reset role;
delete from public.clubs where id = :'cascade_id';
\echo CASE ok club-delete-cascades
select case when not exists (select 1 from public.shared_shops where club_id = :'cascade_id') and not exists (select 1 from public.shared_photos where club_id = :'cascade_id')
    and (select count(*) from public.shared_shops) = 2 and (select count(*) from public.shared_photos) = 1
  then 'gone with the club' else (1 / (random() * 0)::int)::text end;

-- Supabase Auth's audit log names A; Delete removes those rows too
insert into auth.audit_log_entries (payload) values (json_build_object('actor_id', :'a_id', 'actor_username', 'a@x.test', 'action', 'user_signedup'));
-- delete both
set role authenticated;
select set_config('request.jwt.claim.sub', :'a_id', false) \g /dev/null
\echo CASE ok a-delete
select public.delete_my_account();
select set_config('request.jwt.claim.sub', :'b_id', false) \g /dev/null
\echo CASE ok b-delete
select public.delete_my_account();
reset role;
-- chunk 12: a club's shops outlive their creator (created_by set null); then this run's shops, photos, meters,
-- fingerprint and helper go, and nothing of them is left
\echo CASE ok shared-shops-outlive-their-creator
select case when (select count(*) || '/' || count(created_by) from public.shared_shops) = '2/0' then 'kept, creator gone' else (1 / (random() * 0)::int)::text end;
delete from public.shared_shops;
delete from public.shared_usage;
delete from private.server_key;
drop schema checks cascade;
\echo CASE ok shared-leftovers
select case when (select count(*) from public.shared_shops) + (select count(*) from public.shared_photos) + (select count(*) from public.shared_usage) + (select count(*) from private.server_key) = 0
    and not exists (select 1 from pg_namespace where nspname = 'checks')
  then 'none' else (1 / (random() * 0)::int)::text end;
\echo CASE ok leftovers
select (select count(*) from auth.users) || ' ' || (select count(*) from public.profiles) || ' ' || (select count(*) from public.club_members) || ' ' || (select count(*) from public.friend_links) || ' ' || (select count(*) from public.saves) || ' clubs ' || (select count(*) || '/' || count(created_by) from public.clubs) || ' audit ' || (select count(*) from auth.audit_log_entries);
\echo CASE end
