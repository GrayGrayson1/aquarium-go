-- Aquarium Go online, stage 1, part 4 (chunk 8's review, its last confirmation pass, 2026-10-19).
--
-- While the brake on wrong invite codes holds (part 3), resolve_invite says so instead of answering null: null reads as
-- "no such club" and the game showed a friend's real invite link as expired. The answer is the same for every code,
-- right or wrong, so it gives nothing away; the game shows its network message and, signed out, the sign-in form with
-- the link's code filled in. And the lock is tried, not waited for: a lookup that finds another one under way answers
-- as braked too (try again in a moment), so a flood can't queue calls that each hold a database connection.

begin;

create or replace function private.resolve_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs;
begin
  if p_code is null or char_length(p_code) > 40 then
    return null;
  end if;
  if not pg_try_advisory_xact_lock(hashtext('aquarium-go invite misses')) then
    return jsonb_build_object('braked', true);
  end if;
  if (select count(*) from public.invite_misses m where m.at > now() - interval '10 minutes') >= 100 then
    return jsonb_build_object('braked', true);
  end if;
  select * into v_club from public.clubs c where c.invite_code = upper(btrim(p_code));
  if not found then
    insert into public.invite_misses (at) values (now());
    delete from public.invite_misses m where m.at < now() - interval '10 minutes';
    return null;
  end if;
  return jsonb_build_object(
    'club', public.club_json(v_club, v_uid, false),
    'already_member', v_uid is not null and exists (select 1 from public.club_members m where m.club_id = v_club.id and m.user_id = v_uid)
  );
end;
$$;

commit;
