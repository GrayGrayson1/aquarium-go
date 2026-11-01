-- Aquarium Go online: the owner's deletes (chunk 18; ADR-0054).
--
-- The owner (profiles.is_owner, one account: ADR-0040 decision 2) sees every club and every player, with what each
-- keeps on the server, and may delete any of them: a club (its members list, its shared shop and that shop's photos go
-- with it), a club's shared shop alone (the club and its members stay), a player's account (as Delete my account does:
-- their profile, save, friend links and club places cascade; clubs and shops they made keep going with created_by
-- null), and a friend or a friend request of the owner's own. Deleting something already gone does nothing.
--
-- The browser still touches no table. Each function is a SECURITY DEFINER function in `private` with an empty
-- search_path whose first statements check the caller (`not_signed_in`) and then that the caller is the owner
-- (`forbidden`), behind a SECURITY INVOKER wrapper of the same name in `public` that only calls it. Both are granted to
-- `authenticated` only: never PUBLIC, anon or service_role. Applied with `supabase db query --linked --project-ref
-- <ref> -f`, like the files before it.

begin;

-- ───────────────────────────── what the owner sees ─────────────────────────────

-- Every club, newest first (its members, when it was made, its shared shop with the bytes the shop and its photos
-- take), every player, newest first (when they joined and last saved online, how many clubs they're in, the bytes
-- their save, its previous copy and their picture take), and the database's size in bytes.
create function private.owner_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'clubs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'initials', c.initials,
        'colors', jsonb_build_array(c.color_a, c.color_b),
        'members', (select count(*) from public.club_members m where m.club_id = c.id),
        'created_at', to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD'),
        'shop', (
          select jsonb_build_object(
            'name', s.shop_name,
            'day', s.day,
            'bytes', octet_length(s.body) + coalesce((select sum(octet_length(ph.data)) from public.shared_photos ph where ph.club_id = s.club_id), 0)
          )
          from public.shared_shops s where s.club_id = c.id
        )
      ) order by c.created_at desc, c.id)
      from public.clubs c
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.display_name,
        'friend_code', p.friend_code,
        'owner', p.is_owner,
        'created_at', to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD'),
        'saved_at', (select to_char(sv.updated_at at time zone 'UTC', 'YYYY-MM-DD') from public.saves sv where sv.user_id = p.id),
        'clubs', (select count(*) from public.club_members m where m.user_id = p.id),
        'bytes', coalesce(octet_length(p.snapshot), 0) + coalesce((select octet_length(sv.body) + coalesce(octet_length(sv.previous_body), 0) from public.saves sv where sv.user_id = p.id), 0)
      ) order by p.created_at desc, p.id)
      from public.profiles p
    ), '[]'::jsonb),
    'bytes', pg_catalog.pg_database_size(pg_catalog.current_database())
  );
end;
$$;

-- ───────────────────────────── what the owner may delete ─────────────────────────────

-- A club, with its members list, its shared shop and that shop's photos (the foreign keys cascade). A server running
-- the shop finds it missing at its next save or lease renewal and closes it for everyone there (`gone`).
create function private.owner_delete_club(p_club uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  if p_club is null then
    raise exception 'invalid';
  end if;
  delete from public.clubs c where c.id = p_club;
end;
$$;

-- A club's shared shop and its photos; the club and its members stay, and the owner may make a new shop for it.
create function private.owner_delete_shop(p_club uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  if p_club is null then
    raise exception 'invalid';
  end if;
  delete from public.shared_shops s where s.club_id = p_club;
end;
$$;

-- Another player's account, as Delete my account removes one (its audit-log rows too, where the role may delete
-- them). Not the owner's own (that is Delete my account, in Settings) and never an owner's.
create function private.owner_delete_player(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  if p_user is null or p_user = v_uid or exists (select 1 from public.profiles p where p.id = p_user and p.is_owner) then
    raise exception 'invalid';
  end if;
  begin
    delete from auth.audit_log_entries a where a.payload ->> 'actor_id' = p_user::text;
  exception when undefined_table or insufficient_privilege then
    null; -- no audit log here, or not ours to clean: the account itself still goes
  end;
  delete from auth.users u where u.id = p_user;
end;
$$;

-- A friend of the owner's, or someone asking to be one: the links between them both ways (their account stays).
create function private.owner_remove_friend(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  if p_id is null then
    raise exception 'invalid';
  end if;
  delete from public.friend_links l where (l.from_id = v_uid and l.to_id = p_id) or (l.from_id = p_id and l.to_id = v_uid);
end;
$$;

create function public.owner_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.owner_overview();
$$;
create function public.owner_delete_club(p_club uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.owner_delete_club(p_club);
$$;
create function public.owner_delete_shop(p_club uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.owner_delete_shop(p_club);
$$;
create function public.owner_delete_player(p_user uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.owner_delete_player(p_user);
$$;
create function public.owner_remove_friend(p_id uuid) returns void
language sql volatile security invoker set search_path = '' as $$
  select private.owner_remove_friend(p_id);
$$;

-- ───────────────────────────── who may call what ─────────────────────────────

revoke execute on function private.owner_overview() from public, anon, service_role;
revoke execute on function private.owner_delete_club(uuid) from public, anon, service_role;
revoke execute on function private.owner_delete_shop(uuid) from public, anon, service_role;
revoke execute on function private.owner_delete_player(uuid) from public, anon, service_role;
revoke execute on function private.owner_remove_friend(uuid) from public, anon, service_role;
revoke execute on function public.owner_overview() from public, anon, service_role;
revoke execute on function public.owner_delete_club(uuid) from public, anon, service_role;
revoke execute on function public.owner_delete_shop(uuid) from public, anon, service_role;
revoke execute on function public.owner_delete_player(uuid) from public, anon, service_role;
revoke execute on function public.owner_remove_friend(uuid) from public, anon, service_role;
grant execute on function private.owner_overview() to authenticated;
grant execute on function private.owner_delete_club(uuid) to authenticated;
grant execute on function private.owner_delete_shop(uuid) to authenticated;
grant execute on function private.owner_delete_player(uuid) to authenticated;
grant execute on function private.owner_remove_friend(uuid) to authenticated;
grant execute on function public.owner_overview() to authenticated;
grant execute on function public.owner_delete_club(uuid) to authenticated;
grant execute on function public.owner_delete_shop(uuid) to authenticated;
grant execute on function public.owner_delete_player(uuid) to authenticated;
grant execute on function public.owner_remove_friend(uuid) to authenticated;

commit;
