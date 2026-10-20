-- Aquarium Go online, stage 1, part 5 (chunk 9, 0.5.6; ADR-0044 decision 2; the audit of 2026-10-19, A1 and B2).
--
-- A1: the API runs a GET call to a function inside a read-only transaction. resolve_invite stored a wrong code only
-- after looking it up, so read-only, a wrong code failed at that insert (never stored, so never counted by the brake)
-- while a right one answered: codes could be tried as fast as the network allowed. add_friend told a right friend code
-- from a wrong one the same way (a different error). Now a read-only call to either gets one answer for every code,
-- before any lookup: resolve_invite the brake's ({"braked": true}), add_friend 'invalid'. The game always calls them
-- with POST, so it never meets these answers.
--
-- B2: a tab whose session was switched to another account in another tab went on sending its aquarium under the new
-- account's session. The save functions gain twins that take the account the game believes is signed in and refuse
-- any other ('account'). The game from 0.5.6 calls only the twins; the old three stay for the builds before it, until
-- they reload.

begin;

create or replace function private.resolve_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs;
begin
  -- a read-only call can't count a wrong code, so it learns nothing: the brake's answer, for every code
  if current_setting('transaction_read_only') = 'on' then
    return jsonb_build_object('braked', true);
  end if;
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

create or replace function private.add_friend(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_to uuid;
begin
  -- read-only, a right code would fail at the insert and a wrong one before it: one answer for both
  if current_setting('transaction_read_only') = 'on' then
    raise exception 'invalid';
  end if;
  if p_code is null or char_length(p_code) > 40 then
    raise exception 'invalid';
  end if;
  select p.id into v_to from public.profiles p where p.friend_code = upper(btrim(p_code));
  if v_to is null or v_to = v_uid then
    raise exception 'invalid';
  end if;
  if not exists (select 1 from public.friend_links l where l.from_id = v_uid and l.to_id = v_to)
     and (select count(*) from public.friend_links l where l.from_id = v_uid) >= 100 then
    raise exception 'invalid';
  end if;
  insert into public.friend_links (from_id, to_id) values (v_uid, v_to) on conflict do nothing;
end;
$$;

-- The save functions for the account the game believes is signed in: anyone else is refused before anything is read
-- or written.
create function private.save_meta_for(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_account is null or p_account <> public.require_uid() then
    raise exception 'account';
  end if;
  return private.save_meta();
end;
$$;

create function private.get_save_for(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_account is null or p_account <> public.require_uid() then
    raise exception 'account';
  end if;
  return private.get_save();
end;
$$;

create function private.put_save_for(
  p_account uuid, p_expected bigint, p_save_id text, p_schema_version integer, p_saved_at bigint, p_hour double precision,
  p_shop_name text, p_day integer, p_money double precision, p_encoding text, p_body text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_account is null or p_account <> public.require_uid() then
    raise exception 'account';
  end if;
  return private.put_save(p_expected, p_save_id, p_schema_version, p_saved_at, p_hour, p_shop_name, p_day, p_money, p_encoding, p_body);
end;
$$;

create function public.save_meta_for(p_account uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.save_meta_for(p_account);
$$;
create function public.get_save_for(p_account uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.get_save_for(p_account);
$$;
create function public.put_save_for(p_account uuid, p_expected bigint, p_save_id text, p_schema_version integer, p_saved_at bigint, p_hour double precision, p_shop_name text, p_day integer, p_money double precision, p_encoding text, p_body text) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.put_save_for(p_account, p_expected, p_save_id, p_schema_version, p_saved_at, p_hour, p_shop_name, p_day, p_money, p_encoding, p_body);
$$;

revoke execute on function private.save_meta_for(uuid) from public, anon;
revoke execute on function private.get_save_for(uuid) from public, anon;
revoke execute on function private.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from public, anon;
revoke execute on function public.save_meta_for(uuid) from public, anon;
revoke execute on function public.get_save_for(uuid) from public, anon;
revoke execute on function public.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from public, anon;
grant execute on function private.save_meta_for(uuid) to authenticated;
grant execute on function private.get_save_for(uuid) to authenticated;
grant execute on function private.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) to authenticated;
grant execute on function public.save_meta_for(uuid) to authenticated;
grant execute on function public.get_save_for(uuid) to authenticated;
grant execute on function public.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) to authenticated;

commit;
