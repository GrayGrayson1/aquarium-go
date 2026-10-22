-- Aquarium Go shared shops (chunk 12; ADR-0043, ADR-0045, ADR-0047; docs/agent/design/SHARED-SHOPS.md §5.8, §6).
--
-- A club's shared shop lives here and runs on a small server (Render). The browser still touches no table: the new
-- tables have row-level security on, no policies, and no privileges for anon, authenticated or service_role.
--
-- The server uses no Supabase key (ADR-0047): a secret key acts as service_role and also opens Supabase Auth's admin
-- tools, which no database rule can limit. It calls its functions through the API with the publishable key, as `anon`,
-- and each refuses (`forbidden`) unless it is given the server's password, whose SHA-256 is the one row of
-- private.server_key. scripts/shared-server-key.mjs makes the password, stores only that fingerprint and leaves the
-- password on the owner's clipboard; until it runs, the table is empty and every server function refuses. Each server
-- function is a SECURITY DEFINER function in `private` whose first statement checks the password, behind a SECURITY
-- INVOKER wrapper of the same name in `public` that only anon may execute (no signed-in player, no service_role). The
-- game's two (club_shared_shops, shared_usage) follow stage 1's pattern: auth.uid() checked, granted to authenticated.
--
-- First, service_role loses every right it holds in public (stage 1's tables and functions, and the functions moved to
-- private), and the default privileges of the role running this (postgres, which makes our objects) stop granting it
-- anything new there. Nothing in the game or the server uses that role; afterwards no secret key can read or write
-- players' data through the API. A check at the end refuses the whole file if service_role still reaches anything.
--
-- Errors carry fixed messages: invalid, forbidden, full (and stage 1's not_signed_in). Applied with `supabase db query
-- --linked --project-ref <ref> -f`, like the files before it.

begin;

-- ───────────────────────────── service_role reaches nothing (§5.8, ADR-0047 decision 4) ─────────────────────────────

revoke all on table public.profiles from service_role;
revoke all on table public.clubs from service_role;
revoke all on table public.club_members from service_role;
revoke all on table public.friend_links from service_role;
revoke all on table public.saves from service_role;
revoke all on table public.invite_misses from service_role;

-- stage 1's helpers and trigger functions
revoke execute on function public.require_uid() from service_role;
revoke execute on function public.random_code(integer) from service_role;
revoke execute on function public.new_invite_code(text) from service_role;
revoke execute on function public.invite_word(text) from service_role;
revoke execute on function public.club_json(public.clubs, uuid, boolean) from service_role;
revoke execute on function public.save_meta_json(public.saves) from service_role;
revoke execute on function public.check_signup() from service_role;
revoke execute on function public.create_profile() from service_role;

-- the game's wrappers in public
revoke execute on function public.resolve_invite(text) from service_role;
revoke execute on function public.me() from service_role;
revoke execute on function public.my_clubs() from service_role;
revoke execute on function public.join_club(uuid) from service_role;
revoke execute on function public.create_club(text, text) from service_role;
revoke execute on function public.add_friend(text) from service_role;
revoke execute on function public.friend_requests() from service_role;
revoke execute on function public.accept_friend(uuid) from service_role;
revoke execute on function public.friends_aquariums() from service_role;
revoke execute on function public.report_standing(text, integer, bigint, integer, integer, text) from service_role;
revoke execute on function public.leaderboard(text) from service_role;
revoke execute on function public.news() from service_role;
revoke execute on function public.mark_seen() from service_role;
revoke execute on function public.save_meta() from service_role;
revoke execute on function public.get_save() from service_role;
revoke execute on function public.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from service_role;
revoke execute on function public.delete_my_account() from service_role;
revoke execute on function public.save_meta_for(uuid) from service_role;
revoke execute on function public.get_save_for(uuid) from service_role;
revoke execute on function public.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from service_role;

-- the functions that do the work (made in public, so granted to service_role by default, then moved to private)
revoke execute on function private.resolve_invite(text) from service_role;
revoke execute on function private.me() from service_role;
revoke execute on function private.my_clubs() from service_role;
revoke execute on function private.join_club(uuid) from service_role;
revoke execute on function private.create_club(text, text) from service_role;
revoke execute on function private.add_friend(text) from service_role;
revoke execute on function private.friend_requests() from service_role;
revoke execute on function private.accept_friend(uuid) from service_role;
revoke execute on function private.friends_aquariums() from service_role;
revoke execute on function private.report_standing(text, integer, bigint, integer, integer, text) from service_role;
revoke execute on function private.leaderboard(text) from service_role;
revoke execute on function private.news() from service_role;
revoke execute on function private.mark_seen() from service_role;
revoke execute on function private.save_meta() from service_role;
revoke execute on function private.get_save() from service_role;
revoke execute on function private.put_save(bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from service_role;
revoke execute on function private.delete_my_account() from service_role;
revoke execute on function private.save_meta_for(uuid) from service_role;
revoke execute on function private.get_save_for(uuid) from service_role;
revoke execute on function private.put_save_for(uuid, bigint, text, integer, bigint, double precision, text, integer, double precision, text, text) from service_role;

-- what this role makes in public from here on (this file's tables and functions included) grants service_role nothing
alter default privileges in schema public revoke all on tables from service_role;
alter default privileges in schema public revoke all on functions from service_role;
alter default privileges in schema public revoke all on sequences from service_role;

-- ───────────────────────────── tables (§6.1) ─────────────────────────────

-- A club's shared shop: one per club, gone with the club. The body is the saved shop as the online save stores one.
create table public.shared_shops (
  club_id uuid primary key references public.clubs (id) on delete cascade,
  shop_name text not null check (char_length(btrim(shop_name)) between 1 and 60),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- the members the owner lets pause and change the speed (the owner always may)
  pausers uuid[] not null default '{}' check (cardinality(pausers) <= 50),
  revision bigint not null check (revision >= 1),
  schema_version integer not null check (schema_version >= 1),
  build text not null check (char_length(build) between 1 and 120),
  -- real time in ms: when it was saved, and when it emptied (null while someone is there)
  saved_at bigint not null,
  left_at bigint,
  hour double precision not null,
  day integer not null,
  money double precision not null,
  encoding text not null check (encoding in ('gzip-base64', 'json')),
  body text not null check (char_length(body) <= 4000000),
  -- the server instance running it (§6.2), until the database's clock passes lease_until
  lease_holder text check (lease_holder is null or char_length(lease_holder) between 1 and 100),
  lease_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Listing photos (§4.4), stored once per club by their SHA-256; base64 without a data: prefix.
create table public.shared_photos (
  club_id uuid not null references public.shared_shops (club_id) on delete cascade,
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  mime text not null check (mime in ('image/webp', 'image/jpeg')),
  data text not null check (char_length(data) <= 64000 and data ~ '^[A-Za-z0-9+/]+={0,2}$'),
  created_at timestamptz not null default now(),
  primary key (club_id, hash)
);

-- The server's meters per calendar month (UTC), and the cap that closed the month, if one did (§5.7).
create table public.shared_usage (
  month text primary key check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  bytes_out bigint not null default 0 check (bytes_out >= 0),
  awake_seconds bigint not null default 0 check (awake_seconds >= 0),
  closed text check (closed is null or closed in ('cap', 'hours')),
  updated_at timestamptz not null default now()
);

-- The server's password's fingerprint (ADR-0047): at most one row, written only by scripts/shared-server-key.mjs.
create table private.server_key (
  id smallint primary key default 1 check (id = 1),
  key_hash bytea not null check (octet_length(key_hash) = 32),
  set_at timestamptz not null default now()
);

alter table public.shared_shops enable row level security;
alter table public.shared_photos enable row level security;
alter table public.shared_usage enable row level security;
alter table private.server_key enable row level security;

revoke all on table public.shared_shops from anon, authenticated, service_role;
revoke all on table public.shared_photos from anon, authenticated, service_role;
revoke all on table public.shared_usage from anon, authenticated, service_role;
revoke all on table private.server_key from public, anon, authenticated, service_role;

-- ───────────────────────────── the server's password ─────────────────────────────

-- Nothing (`forbidden`) unless p_key's SHA-256 is the stored fingerprint. Granted to nobody: the server's functions,
-- running as their owner, call it first.
create function private.require_server(p_key text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_key is null or char_length(p_key) not between 32 and 200
     or not exists (select 1 from private.server_key k where k.id = 1 and k.key_hash = extensions.digest(p_key, 'sha256')) then
    raise exception 'forbidden';
  end if;
end;
$$;

-- ───────────────────────────── the server's functions (§6.3) ─────────────────────────────
--
-- Each checks the password before it reads anything (no declared value is computed before that), then its arguments.

-- A player as the server sees them in a club: null unless they are a member.
create function private.server_member(p_key text, p_user uuid, p_club uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_pausers uuid[];
  v_shop boolean;
begin
  perform private.require_server(p_key);
  if p_user is null or p_club is null then
    raise exception 'invalid';
  end if;
  if not exists (select 1 from public.club_members m where m.club_id = p_club and m.user_id = p_user) then
    return null;
  end if;
  select * into v_profile from public.profiles p where p.id = p_user;
  if not found then
    return null;
  end if;
  select s.pausers into v_pausers from public.shared_shops s where s.club_id = p_club;
  v_shop := found;
  return jsonb_build_object(
    'name', v_profile.display_name,
    'owner', v_profile.is_owner,
    'pause', v_profile.is_owner or coalesce(p_user = any(v_pausers), false),
    'shop', v_shop
  );
end;
$$;

-- The club's shop, or null.
create function private.server_shop_get(p_key text, p_club uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_shop public.shared_shops;
begin
  perform private.require_server(p_key);
  if p_club is null then
    raise exception 'invalid';
  end if;
  select * into v_shop from public.shared_shops s where s.club_id = p_club;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'meta', jsonb_build_object(
      'club_id', v_shop.club_id,
      'shop_name', v_shop.shop_name,
      'created_by', v_shop.created_by,
      'pausers', to_jsonb(v_shop.pausers),
      'revision', v_shop.revision,
      'schema_version', v_shop.schema_version,
      'build', v_shop.build,
      'saved_at', v_shop.saved_at,
      'left_at', v_shop.left_at,
      'hour', v_shop.hour,
      'day', v_shop.day,
      'money', v_shop.money
    ),
    'encoding', v_shop.encoding,
    'body', v_shop.body
  );
end;
$$;

-- A new shop for a club (the owner only for now, ADR-0043; and only in a club the owner is in): one per club.
create function private.server_shop_create(
  p_key text, p_club uuid, p_user uuid, p_name text, p_schema_version integer, p_build text, p_saved_at bigint,
  p_hour double precision, p_day integer, p_money double precision, p_encoding text, p_body text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server(p_key);
  if p_club is null or p_user is null
     or p_name is null or char_length(btrim(p_name)) not between 1 and 60
     or p_schema_version is null or p_schema_version < 1
     or p_build is null or char_length(p_build) not between 1 and 120
     or p_saved_at is null or p_saved_at < 0
     or p_hour is null or p_hour in ('NaN', 'Infinity', '-Infinity')
     or p_day is null or p_day < 0
     or p_money is null or p_money in ('NaN', 'Infinity', '-Infinity')
     or p_encoding is null or p_encoding not in ('gzip-base64', 'json')
     or p_body is null or char_length(p_body) > 4000000 then
    raise exception 'invalid';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.is_owner)
     or not exists (select 1 from public.club_members m where m.club_id = p_club and m.user_id = p_user) then
    raise exception 'forbidden';
  end if;
  insert into public.shared_shops (club_id, shop_name, created_by, pausers, revision, schema_version, build, saved_at, left_at, hour, day, money, encoding, body)
  values (p_club, btrim(p_name), p_user, '{}', 1, p_schema_version, p_build, p_saved_at, null, p_hour, p_day, p_money, p_encoding, p_body)
  on conflict (club_id) do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'exists');
  end if;
  return jsonb_build_object('ok', true, 'revision', 1);
end;
$$;

-- Save the shop: only by the lease's holder while it lasts, never over a newer build's shop (PERSIST-014: too_new),
-- and only if its revision is still p_expected (conflict). The pausers, the creator and the lease stay as they are.
create function private.server_shop_put(
  p_key text, p_club uuid, p_holder text, p_expected bigint, p_shop_name text, p_schema_version integer, p_build text,
  p_saved_at bigint, p_left_at bigint, p_hour double precision, p_day integer, p_money double precision,
  p_encoding text, p_body text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_shop public.shared_shops;
begin
  perform private.require_server(p_key);
  if p_club is null
     or p_holder is null or char_length(p_holder) not between 1 and 100
     or p_expected is null or p_expected < 0
     or p_shop_name is null or char_length(btrim(p_shop_name)) not between 1 and 60
     or p_schema_version is null or p_schema_version < 1
     or p_build is null or char_length(p_build) not between 1 and 120
     or p_saved_at is null or p_saved_at < 0
     or p_left_at < 0
     or p_hour is null or p_hour in ('NaN', 'Infinity', '-Infinity')
     or p_day is null or p_day < 0
     or p_money is null or p_money in ('NaN', 'Infinity', '-Infinity')
     or p_encoding is null or p_encoding not in ('gzip-base64', 'json')
     or p_body is null or char_length(p_body) > 4000000 then
    raise exception 'invalid';
  end if;
  select * into v_shop from public.shared_shops s where s.club_id = p_club for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if v_shop.lease_holder is distinct from p_holder or v_shop.lease_until is null or v_shop.lease_until < now() then
    return jsonb_build_object('ok', false, 'reason', 'lease');
  end if;
  if v_shop.schema_version > p_schema_version then
    return jsonb_build_object('ok', false, 'reason', 'too_new');
  end if;
  if v_shop.revision <> p_expected then
    return jsonb_build_object('ok', false, 'reason', 'conflict', 'revision', v_shop.revision);
  end if;
  update public.shared_shops set
    shop_name = btrim(p_shop_name),
    revision = v_shop.revision + 1,
    schema_version = p_schema_version,
    build = p_build,
    saved_at = p_saved_at,
    left_at = p_left_at,
    hour = p_hour,
    day = p_day,
    money = p_money,
    encoding = p_encoding,
    body = p_body,
    updated_at = now()
  where club_id = p_club;
  return jsonb_build_object('ok', true, 'revision', v_shop.revision + 1);
end;
$$;

-- Take the lease, or renew it (the same call by the same holder), for p_seconds on the database's clock (§6.2). One
-- statement, so two instances can't both win: a second one waits for the first and then finds it held.
create function private.server_shop_take(p_key text, p_club uuid, p_holder text, p_seconds integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_until timestamptz;
begin
  perform private.require_server(p_key);
  if p_club is null or p_holder is null or char_length(p_holder) not between 1 and 100
     or p_seconds is null or p_seconds not between 10 and 600 then
    raise exception 'invalid';
  end if;
  update public.shared_shops s set lease_holder = p_holder, lease_until = now() + make_interval(secs => p_seconds)
  where s.club_id = p_club
    and (s.lease_holder is null or s.lease_holder = p_holder or s.lease_until is null or s.lease_until < now())
  returning s.lease_until into v_until;
  if found then
    return jsonb_build_object('ok', true, 'until_ms', floor(extract(epoch from v_until) * 1000)::bigint);
  end if;
  if not exists (select 1 from public.shared_shops s where s.club_id = p_club) then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  return jsonb_build_object('ok', false, 'reason', 'held');
end;
$$;

-- Let the lease go, if p_holder holds it.
create function private.server_shop_release(p_key text, p_club uuid, p_holder text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server(p_key);
  if p_club is null or p_holder is null or char_length(p_holder) not between 1 and 100 then
    raise exception 'invalid';
  end if;
  update public.shared_shops s set lease_holder = null, lease_until = null where s.club_id = p_club and s.lease_holder = p_holder;
  return found;
end;
$$;

-- Who may pause besides the owner: the club's members among p_pausers, each once, in the order given.
create function private.server_set_pausers(p_key text, p_club uuid, p_pausers uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_keep uuid[];
begin
  perform private.require_server(p_key);
  if p_club is null or p_pausers is null or cardinality(p_pausers) > 50 then
    raise exception 'invalid';
  end if;
  v_keep := array(
    select x.id from unnest(p_pausers) with ordinality as x(id, n)
    where exists (select 1 from public.club_members m where m.club_id = p_club and m.user_id = x.id)
    group by x.id
    order by min(x.n)
  );
  update public.shared_shops s set pausers = v_keep where s.club_id = p_club;
  if not found then
    raise exception 'invalid';
  end if;
  return to_jsonb(v_keep);
end;
$$;

-- Store a listing photo once (true when it is new); at most 1000 per club (`full`).
create function private.server_photo_put(p_key text, p_club uuid, p_hash text, p_mime text, p_data text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server(p_key);
  if p_club is null
     or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
     or p_mime is null or p_mime not in ('image/webp', 'image/jpeg')
     or p_data is null or char_length(p_data) > 64000 or p_data !~ '^[A-Za-z0-9+/]+={0,2}$' then
    raise exception 'invalid';
  end if;
  if not exists (select 1 from public.shared_shops s where s.club_id = p_club) then
    raise exception 'invalid';
  end if;
  -- one at a time per club, so two can't both take the last place
  perform pg_advisory_xact_lock(hashtext('aquarium-go shared photos ' || p_club::text));
  if exists (select 1 from public.shared_photos ph where ph.club_id = p_club and ph.hash = p_hash) then
    return false;
  end if;
  if (select count(*) from public.shared_photos ph where ph.club_id = p_club) >= 1000 then
    raise exception 'full';
  end if;
  insert into public.shared_photos (club_id, hash, mime, data) values (p_club, p_hash, p_mime, p_data) on conflict do nothing;
  return found;
end;
$$;

create function private.server_photo_get(p_key text, p_club uuid, p_hash text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_server(p_key);
  if p_club is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid';
  end if;
  return (select jsonb_build_object('mime', ph.mime, 'data', ph.data) from public.shared_photos ph where ph.club_id = p_club and ph.hash = p_hash);
end;
$$;

-- The club's photos and when each was stored (epoch ms), oldest first, for the prune (§4.4).
create function private.server_photo_hashes(p_key text, p_club uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_server(p_key);
  if p_club is null then
    raise exception 'invalid';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('hash', ph.hash, 'at', floor(extract(epoch from ph.created_at) * 1000)::bigint) order by ph.created_at, ph.hash)
    from public.shared_photos ph
    where ph.club_id = p_club
  ), '[]'::jsonb);
end;
$$;

create function private.server_photos_delete(p_key text, p_club uuid, p_hashes text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform private.require_server(p_key);
  if p_club is null or p_hashes is null or cardinality(p_hashes) > 1000 then
    raise exception 'invalid';
  end if;
  delete from public.shared_photos ph where ph.club_id = p_club and ph.hash = any(p_hashes);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Add to a month's meters (this UTC month or the one before, for a save that spans the 1st). The month closes at the
-- first cap it reaches, 2 GB of data (ADR-0045 decision 3) or 400 awake hours (decision 15), and stays closed. With 0
-- and 0 it reads the month without changing it.
create function private.server_usage_add(p_key text, p_month text, p_bytes bigint, p_seconds bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_this text;
  v_last text;
  v_usage public.shared_usage;
begin
  perform private.require_server(p_key);
  v_this := to_char(now() at time zone 'UTC', 'YYYY-MM');
  v_last := to_char(date_trunc('month', now() at time zone 'UTC') - interval '1 month', 'YYYY-MM');
  if p_month is null or p_month not in (v_this, v_last)
     or p_bytes is null or p_bytes not between 0 and 10000000000
     or p_seconds is null or p_seconds not between 0 and 3000000 then
    raise exception 'invalid';
  end if;
  if p_bytes = 0 and p_seconds = 0 then
    select * into v_usage from public.shared_usage u where u.month = p_month;
  else
    insert into public.shared_usage as u (month, bytes_out, awake_seconds, closed)
    values (p_month, p_bytes, p_seconds, case when p_bytes >= 2000000000 then 'cap' when p_seconds >= 1440000 then 'hours' end)
    on conflict (month) do update set
      bytes_out = u.bytes_out + excluded.bytes_out,
      awake_seconds = u.awake_seconds + excluded.awake_seconds,
      closed = coalesce(u.closed, case when u.bytes_out + excluded.bytes_out >= 2000000000 then 'cap' when u.awake_seconds + excluded.awake_seconds >= 1440000 then 'hours' end),
      updated_at = now()
    returning * into v_usage;
  end if;
  return jsonb_build_object(
    'month', p_month,
    'bytes_out', coalesce(v_usage.bytes_out, 0),
    'awake_seconds', coalesce(v_usage.awake_seconds, 0),
    'closed', v_usage.closed
  );
end;
$$;

create function public.server_member(p_key text, p_user uuid, p_club uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.server_member(p_key, p_user, p_club);
$$;
create function public.server_shop_get(p_key text, p_club uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.server_shop_get(p_key, p_club);
$$;
create function public.server_shop_create(p_key text, p_club uuid, p_user uuid, p_name text, p_schema_version integer, p_build text, p_saved_at bigint, p_hour double precision, p_day integer, p_money double precision, p_encoding text, p_body text) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.server_shop_create(p_key, p_club, p_user, p_name, p_schema_version, p_build, p_saved_at, p_hour, p_day, p_money, p_encoding, p_body);
$$;
create function public.server_shop_put(p_key text, p_club uuid, p_holder text, p_expected bigint, p_shop_name text, p_schema_version integer, p_build text, p_saved_at bigint, p_left_at bigint, p_hour double precision, p_day integer, p_money double precision, p_encoding text, p_body text) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.server_shop_put(p_key, p_club, p_holder, p_expected, p_shop_name, p_schema_version, p_build, p_saved_at, p_left_at, p_hour, p_day, p_money, p_encoding, p_body);
$$;
create function public.server_shop_take(p_key text, p_club uuid, p_holder text, p_seconds integer) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.server_shop_take(p_key, p_club, p_holder, p_seconds);
$$;
create function public.server_shop_release(p_key text, p_club uuid, p_holder text) returns boolean
language sql volatile security invoker set search_path = '' as $$
  select private.server_shop_release(p_key, p_club, p_holder);
$$;
create function public.server_set_pausers(p_key text, p_club uuid, p_pausers uuid[]) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.server_set_pausers(p_key, p_club, p_pausers);
$$;
create function public.server_photo_put(p_key text, p_club uuid, p_hash text, p_mime text, p_data text) returns boolean
language sql volatile security invoker set search_path = '' as $$
  select private.server_photo_put(p_key, p_club, p_hash, p_mime, p_data);
$$;
create function public.server_photo_get(p_key text, p_club uuid, p_hash text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.server_photo_get(p_key, p_club, p_hash);
$$;
create function public.server_photo_hashes(p_key text, p_club uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.server_photo_hashes(p_key, p_club);
$$;
create function public.server_photos_delete(p_key text, p_club uuid, p_hashes text[]) returns integer
language sql volatile security invoker set search_path = '' as $$
  select private.server_photos_delete(p_key, p_club, p_hashes);
$$;
create function public.server_usage_add(p_key text, p_month text, p_bytes bigint, p_seconds bigint) returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.server_usage_add(p_key, p_month, p_bytes, p_seconds);
$$;

-- ───────────────────────────── the game's functions (§6.3) ─────────────────────────────

-- The shared shops of the clubs I'm in (never the body, the pausers or the lease), and whether shared shops are closed
-- for the month (a cap reached, §5.7) and the day they open again. The club card reads this instead of waking the server.
create function private.club_shared_shops() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_closed text;
begin
  select u.closed into v_closed from public.shared_usage u where u.month = to_char(now() at time zone 'UTC', 'YYYY-MM');
  return jsonb_build_object(
    'shops', coalesce((
      select jsonb_agg(jsonb_build_object('club', s.club_id, 'name', s.shop_name, 'day', s.day, 'money', s.money, 'played_at', s.saved_at) order by s.club_id)
      from public.shared_shops s join public.club_members m on m.club_id = s.club_id
      where m.user_id = v_uid
    ), '[]'::jsonb),
    'closed', v_closed,
    'reopens', case when v_closed is not null then to_char(date_trunc('month', now() at time zone 'UTC') + interval '1 month', 'YYYY-MM-DD') end
  );
end;
$$;

-- The owner's meters for this UTC month and both caps.
create function private.shared_usage() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_month text := to_char(now() at time zone 'UTC', 'YYYY-MM');
  v_usage public.shared_usage;
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  select * into v_usage from public.shared_usage u where u.month = v_month;
  return jsonb_build_object(
    'month', v_month,
    'bytes_out', coalesce(v_usage.bytes_out, 0),
    'awake_seconds', coalesce(v_usage.awake_seconds, 0),
    'closed', v_usage.closed,
    'bytes_cap', 2000000000,
    'seconds_cap', 1440000
  );
end;
$$;

create function public.club_shared_shops() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.club_shared_shops();
$$;
create function public.shared_usage() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.shared_usage();
$$;

-- ───────────────────────────── who may call what ─────────────────────────────

revoke execute on function private.require_server(text) from public, anon, authenticated, service_role;

revoke execute on function private.server_member(text, uuid, uuid) from public, authenticated, service_role;
revoke execute on function private.server_shop_get(text, uuid) from public, authenticated, service_role;
revoke execute on function private.server_shop_create(text, uuid, uuid, text, integer, text, bigint, double precision, integer, double precision, text, text) from public, authenticated, service_role;
revoke execute on function private.server_shop_put(text, uuid, text, bigint, text, integer, text, bigint, bigint, double precision, integer, double precision, text, text) from public, authenticated, service_role;
revoke execute on function private.server_shop_take(text, uuid, text, integer) from public, authenticated, service_role;
revoke execute on function private.server_shop_release(text, uuid, text) from public, authenticated, service_role;
revoke execute on function private.server_set_pausers(text, uuid, uuid[]) from public, authenticated, service_role;
revoke execute on function private.server_photo_put(text, uuid, text, text, text) from public, authenticated, service_role;
revoke execute on function private.server_photo_get(text, uuid, text) from public, authenticated, service_role;
revoke execute on function private.server_photo_hashes(text, uuid) from public, authenticated, service_role;
revoke execute on function private.server_photos_delete(text, uuid, text[]) from public, authenticated, service_role;
revoke execute on function private.server_usage_add(text, text, bigint, bigint) from public, authenticated, service_role;
revoke execute on function public.server_member(text, uuid, uuid) from public, authenticated, service_role;
revoke execute on function public.server_shop_get(text, uuid) from public, authenticated, service_role;
revoke execute on function public.server_shop_create(text, uuid, uuid, text, integer, text, bigint, double precision, integer, double precision, text, text) from public, authenticated, service_role;
revoke execute on function public.server_shop_put(text, uuid, text, bigint, text, integer, text, bigint, bigint, double precision, integer, double precision, text, text) from public, authenticated, service_role;
revoke execute on function public.server_shop_take(text, uuid, text, integer) from public, authenticated, service_role;
revoke execute on function public.server_shop_release(text, uuid, text) from public, authenticated, service_role;
revoke execute on function public.server_set_pausers(text, uuid, uuid[]) from public, authenticated, service_role;
revoke execute on function public.server_photo_put(text, uuid, text, text, text) from public, authenticated, service_role;
revoke execute on function public.server_photo_get(text, uuid, text) from public, authenticated, service_role;
revoke execute on function public.server_photo_hashes(text, uuid) from public, authenticated, service_role;
revoke execute on function public.server_photos_delete(text, uuid, text[]) from public, authenticated, service_role;
revoke execute on function public.server_usage_add(text, text, bigint, bigint) from public, authenticated, service_role;

-- the server calls with the publishable key, no player's token: anon, and nobody else
grant execute on function private.server_member(text, uuid, uuid) to anon;
grant execute on function private.server_shop_get(text, uuid) to anon;
grant execute on function private.server_shop_create(text, uuid, uuid, text, integer, text, bigint, double precision, integer, double precision, text, text) to anon;
grant execute on function private.server_shop_put(text, uuid, text, bigint, text, integer, text, bigint, bigint, double precision, integer, double precision, text, text) to anon;
grant execute on function private.server_shop_take(text, uuid, text, integer) to anon;
grant execute on function private.server_shop_release(text, uuid, text) to anon;
grant execute on function private.server_set_pausers(text, uuid, uuid[]) to anon;
grant execute on function private.server_photo_put(text, uuid, text, text, text) to anon;
grant execute on function private.server_photo_get(text, uuid, text) to anon;
grant execute on function private.server_photo_hashes(text, uuid) to anon;
grant execute on function private.server_photos_delete(text, uuid, text[]) to anon;
grant execute on function private.server_usage_add(text, text, bigint, bigint) to anon;
grant execute on function public.server_member(text, uuid, uuid) to anon;
grant execute on function public.server_shop_get(text, uuid) to anon;
grant execute on function public.server_shop_create(text, uuid, uuid, text, integer, text, bigint, double precision, integer, double precision, text, text) to anon;
grant execute on function public.server_shop_put(text, uuid, text, bigint, text, integer, text, bigint, bigint, double precision, integer, double precision, text, text) to anon;
grant execute on function public.server_shop_take(text, uuid, text, integer) to anon;
grant execute on function public.server_shop_release(text, uuid, text) to anon;
grant execute on function public.server_set_pausers(text, uuid, uuid[]) to anon;
grant execute on function public.server_photo_put(text, uuid, text, text, text) to anon;
grant execute on function public.server_photo_get(text, uuid, text) to anon;
grant execute on function public.server_photo_hashes(text, uuid) to anon;
grant execute on function public.server_photos_delete(text, uuid, text[]) to anon;
grant execute on function public.server_usage_add(text, text, bigint, bigint) to anon;

revoke execute on function private.club_shared_shops() from public, anon, service_role;
revoke execute on function private.shared_usage() from public, anon, service_role;
revoke execute on function public.club_shared_shops() from public, anon, service_role;
revoke execute on function public.shared_usage() from public, anon, service_role;
grant execute on function private.club_shared_shops() to authenticated;
grant execute on function private.shared_usage() to authenticated;
grant execute on function public.club_shared_shops() to authenticated;
grant execute on function public.shared_usage() to authenticated;

-- ───────────────────────────── the check ─────────────────────────────

-- service_role holds no right on any table or function in public or private, and this role's default privileges in
-- public (or everywhere) grant it nothing; otherwise none of this file is applied.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_class c
    where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
      and pg_catalog.has_table_privilege('service_role', c.oid, 'select,insert,update,delete,truncate,references,trigger')
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and pg_catalog.has_function_privilege('service_role', p.oid, 'execute')
  ) or exists (
    select 1 from pg_catalog.pg_default_acl d, pg_catalog.aclexplode(d.defaclacl) a
    where d.defaclrole = (select r.oid from pg_catalog.pg_roles r where r.rolname = current_user)
      and d.defaclnamespace in (0, 'public'::regnamespace)
      and a.grantee = (select r.oid from pg_catalog.pg_roles r where r.rolname = 'service_role')
  ) then
    raise exception 'service_role still reaches something in public or private';
  end if;
end;
$$;

commit;
