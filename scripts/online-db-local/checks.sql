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
-- 20 wrong codes from one address, then even the right one gets no answer there; another address still does
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.7, 10.0.0.1"}', false) \g /dev/null
select count(public.resolve_invite('FRIENDS-' || n)) from generate_series(1, 20) as n \g /dev/null
\echo CASE ok anon-throttled
select case when public.resolve_invite(:'invite_code') is null then 'refused' else (1 / (random() * 0)::int)::text end;
select set_config('request.headers', '{"cf-connecting-ip": "198.51.100.9"}', false) \g /dev/null
\echo CASE ok anon-other-address
select case when public.resolve_invite(:'invite_code') is not null then 'answered' else (1 / (random() * 0)::int)::text end;
select set_config('request.headers', '', false) \g /dev/null
\echo CASE denied anon-read-misses
select * from public.invite_misses;
\echo CASE denied anon-request-ip
select public.request_ip();
\echo CASE denied anon-me
select public.me();
\echo CASE denied anon-put-save
select public.put_save(0, 'x', 1, 0, 0, 'x', 1, 0, 'json', '{}');
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
\echo CASE err a-add-self
select public.add_friend(:'a_friend_code');
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
\echo CASE ok leftovers
select (select count(*) from auth.users) || ' ' || (select count(*) from public.profiles) || ' ' || (select count(*) from public.club_members) || ' ' || (select count(*) from public.friend_links) || ' ' || (select count(*) from public.saves) || ' clubs ' || (select count(*) || '/' || count(created_by) from public.clubs) || ' audit ' || (select count(*) from auth.audit_log_entries);
\echo CASE end
