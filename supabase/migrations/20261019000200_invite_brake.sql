-- Aquarium Go online, stage 1, part 3 (chunk 8's review confirmation, 2026-10-19; ADR-0042).
--
-- The cap on wrong invite codes keyed on the caller's network address, which a caller can choose (a forwarded header)
-- and which, kept in the database, would be data that leaves the device without an account (the approved privacy note,
-- ADR-0039 decision 3). It becomes one brake for everyone, with no addresses: after 100 wrong codes in 10 minutes,
-- from anyone, resolve_invite answers null to everyone until they age out (331,776 codes per word take weeks that
-- way). Rows hold only a time and are kept 10 minutes. Sign-up doesn't depend on resolve_invite (the game skips it;
-- the sign-up trigger checks the code), so tripping the brake on purpose only delays invite screens.

begin;

delete from public.invite_misses;
drop index public.invite_misses_ip_at_idx;
alter table public.invite_misses drop column ip;
create index invite_misses_at_idx on public.invite_misses (at);

drop function public.request_ip();

-- As before (part 1, moved to `private` by part 2), with the brake in place of the per-address cap.
create or replace function private.resolve_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs;
begin
  if p_code is null or char_length(p_code) > 40 then
    return null;
  end if;
  -- one at a time, so a burst can't slip past the count
  perform pg_advisory_xact_lock(hashtext('aquarium-go invite misses'));
  if (select count(*) from public.invite_misses m where m.at > now() - interval '10 minutes') >= 100 then
    return null;
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
