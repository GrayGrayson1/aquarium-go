-- Aquarium Go online, stage 1, part 2 (chunk 8; docs/agent/design/ONLINE-STAGE1.md §3 step 6, §4.3).
--
-- Supabase's security advisors warn about every SECURITY DEFINER function the API exposes to `anon` or
-- `authenticated` (lints 0028 and 0029): the stage 1 design calls exactly such functions. As the advisors advise, the
-- functions that do the work move to the schema `private`, which the API doesn't expose, keeping their rules (security
-- definer, an empty search_path, the auth.uid() check, their grants); in `public` each name becomes a SECURITY INVOKER
-- function with the same parameters that only calls its private twin, so the game's calls don't change. The browser
-- still touches no table. Helpers and trigger functions stay where they are, granted to nobody.

begin;

create schema private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.resolve_invite(text) set schema private;
alter function public.me() set schema private;
alter function public.my_clubs() set schema private;
alter function public.join_club(uuid) set schema private;
alter function public.create_club(text, text) set schema private;
alter function public.add_friend(text) set schema private;
alter function public.friend_requests() set schema private;
alter function public.accept_friend(uuid) set schema private;
alter function public.friends_aquariums() set schema private;
alter function public.report_standing(text, integer, bigint, integer, integer, text) set schema private;
alter function public.leaderboard(text) set schema private;
alter function public.news() set schema private;
alter function public.mark_seen() set schema private;
alter function public.save_meta() set schema private;
alter function public.get_save() set schema private;
alter function public.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) set schema private;
alter function public.delete_my_account() set schema private;

create function public.resolve_invite(p_code text) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.resolve_invite(p_code);
$$;
create function public.me() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.me();
$$;
create function public.my_clubs() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.my_clubs();
$$;
create function public.join_club(p_club uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.join_club(p_club);
$$;
create function public.create_club(p_name text, p_blurb text) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.create_club(p_name, p_blurb);
$$;
create function public.add_friend(p_code text) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.add_friend(p_code);
$$;
create function public.friend_requests() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.friend_requests();
$$;
create function public.accept_friend(p_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.accept_friend(p_id);
$$;
create function public.friends_aquariums() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.friends_aquariums();
$$;
create function public.report_standing(p_shop_name text, p_gallons integer, p_collection bigint, p_prismatics integer, p_show_wins integer, p_snapshot text default null) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.report_standing(p_shop_name, p_gallons, p_collection, p_prismatics, p_show_wins, p_snapshot);
$$;
create function public.leaderboard(p_kind text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.leaderboard(p_kind);
$$;
create function public.news() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.news();
$$;
create function public.mark_seen() returns void
language sql volatile security invoker set search_path = '' as $$
  select private.mark_seen();
$$;
create function public.save_meta() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.save_meta();
$$;
create function public.get_save() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.get_save();
$$;
create function public.put_save(p_expected bigint, p_save_id text, p_schema_version integer, p_saved_at bigint, p_hour double precision, p_shop_name text, p_day integer, p_money double precision, p_encoding text, p_body text) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.put_save(p_expected, p_save_id, p_schema_version, p_saved_at, p_hour, p_shop_name, p_day, p_money, p_encoding, p_body);
$$;
create function public.delete_my_account() returns void
language sql volatile security invoker set search_path = '' as $$
  select private.delete_my_account();
$$;

revoke execute on function public.resolve_invite(text) from public;
revoke execute on function public.me() from public, anon;
revoke execute on function public.my_clubs() from public, anon;
revoke execute on function public.join_club(uuid) from public, anon;
revoke execute on function public.create_club(text, text) from public, anon;
revoke execute on function public.add_friend(text) from public, anon;
revoke execute on function public.friend_requests() from public, anon;
revoke execute on function public.accept_friend(uuid) from public, anon;
revoke execute on function public.friends_aquariums() from public, anon;
revoke execute on function public.report_standing(text, integer, bigint, integer, integer, text) from public, anon;
revoke execute on function public.leaderboard(text) from public, anon;
revoke execute on function public.news() from public, anon;
revoke execute on function public.mark_seen() from public, anon;
revoke execute on function public.save_meta() from public, anon;
revoke execute on function public.get_save() from public, anon;
revoke execute on function public.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.resolve_invite(text) to anon, authenticated;
grant execute on function public.me() to authenticated;
grant execute on function public.my_clubs() to authenticated;
grant execute on function public.join_club(uuid) to authenticated;
grant execute on function public.create_club(text, text) to authenticated;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.friend_requests() to authenticated;
grant execute on function public.accept_friend(uuid) to authenticated;
grant execute on function public.friends_aquariums() to authenticated;
grant execute on function public.report_standing(text, integer, bigint, integer, integer, text) to authenticated;
grant execute on function public.leaderboard(text) to authenticated;
grant execute on function public.news() to authenticated;
grant execute on function public.mark_seen() to authenticated;
grant execute on function public.save_meta() to authenticated;
grant execute on function public.get_save() to authenticated;
grant execute on function public.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

commit;
