-- Aquarium Go online, stage 1 (chunk 8; ADR-0038, ADR-0039, ADR-0040; docs/agent/design/ONLINE-STAGE1.md §4).
--
-- The rule: the browser touches no table directly. Every table has row-level security on and no policies, `anon`
-- and `authenticated` hold no table privileges, and the game calls the security-definer functions below, each of
-- which checks auth.uid() itself (`not_signed_in`) and names every object with its schema (search_path is empty).
-- EXECUTE is revoked from public and anon on every function (Postgres grants it to PUBLIC by default, and Supabase's
-- default privileges grant it to anon and authenticated) and granted back only to `authenticated`, except
-- resolve_invite, which the signed-out invite screen calls as `anon`. Trigger functions and helpers are granted to
-- nobody. Errors the game maps carry fixed messages: invalid, forbidden, not_signed_in (and the sign-up check's
-- invite, age, name). The server trusts each browser on purpose in stage 1 (ADR-0038): it stores what it is sent,
-- within the size limits below.
--
-- Applied with `supabase db query --linked -f` (the Management API), not `db push`; later changes go in new files.

begin;

-- ───────────────────────────── tables (§4.1) ─────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  friend_code text not null unique check (friend_code ~ '^[A-Z0-9]{1,12}-[A-Z0-9]{3}$'),
  is_owner boolean not null default false,
  shop_name text check (shop_name is null or char_length(shop_name) <= 60),
  gallons integer not null default 0 check (gallons >= 0),
  snapshot text check (snapshot is null or (char_length(snapshot) <= 200000 and snapshot ~ '^data:image/(jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')),
  collection_value bigint not null default 0 check (collection_value >= 0),
  prismatics integer not null default 0 check (prismatics >= 0),
  show_wins integer not null default 0 check (show_wins >= 0),
  standing_at timestamptz,
  seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  blurb text not null default '' check (char_length(blurb) <= 80),
  initials text not null check (initials ~ '^[A-Z0-9]{1,2}$'),
  color_a text not null,
  color_b text not null,
  -- the club's word, a dash, four letters without I or O (the owner, 2026-10-19: "the name of the group plus four letters")
  invite_code text not null unique check (invite_code ~ '^[A-Z]{2,10}-[A-HJ-NP-Z]{4}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- the avatar gradients (src/social/localStub.ts CLUB_COLORS)
  check ((color_a, color_b) in (('#2f55d4', '#16247a'), ('#9b7bf0', '#5b3aa8'), ('#2fc4b2', '#127567'), ('#f0845a', '#a8402a'), ('#e8608f', '#b03565'), ('#e0b040', '#a87818')))
);

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_members_user_idx on public.club_members (user_id);

-- A friendship is a link each way; a link one way is a request.
create table public.friend_links (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index friend_links_to_idx on public.friend_links (to_id);

-- Wrong invite codes asked about, by network address: resolve_invite answers at most 20 of them in 10 minutes from one
-- address, so codes can't be found by trying them (sign-up itself is limited by Supabase Auth). Rows older than a day
-- are dropped as new ones come.
create table public.invite_misses (
  ip text not null,
  at timestamptz not null default now()
);
create index invite_misses_ip_at_idx on public.invite_misses (ip, at);

create table public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision bigint not null check (revision >= 1),
  save_id text not null check (char_length(save_id) between 1 and 200),
  schema_version integer not null check (schema_version >= 1),
  saved_at bigint not null,
  hour double precision not null,
  shop_name text not null check (char_length(shop_name) <= 60),
  day integer not null,
  money double precision not null,
  encoding text not null check (encoding in ('gzip-base64', 'json')),
  body text not null check (char_length(body) <= 4000000),
  -- the last different aquarium this one replaced (restored with SQL on request; docs/ARCHITECTURE.md)
  previous_save_id text,
  previous_encoding text check (previous_encoding is null or previous_encoding in ('gzip-base64', 'json')),
  previous_body text check (previous_body is null or char_length(previous_body) <= 4000000),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.friend_links enable row level security;
alter table public.saves enable row level security;
alter table public.invite_misses enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.clubs from anon, authenticated;
revoke all on table public.club_members from anon, authenticated;
revoke all on table public.friend_links from anon, authenticated;
revoke all on table public.saves from anon, authenticated;
revoke all on table public.invite_misses from anon, authenticated;

-- ───────────────────────────── helpers (called only by the functions below) ─────────────────────────────

-- The caller's id, or `not_signed_in`.
create function public.require_uid() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  return v_uid;
end;
$$;

-- p_len characters from the friend-code alphabet (no 0, 1, I or O).
create function public.random_code(p_len integer) returns text
language sql volatile security definer set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
  from generate_series(1, p_len);
$$;

-- An invite code: the word, a dash, four letters without I or O, from a secure random source (24^4 = 331,776 codes
-- per word). The first club's word is FRIENDS; create_club passes the name's.
create function public.new_invite_code(p_word text) returns text
language sql volatile security definer set search_path = '' as $$
  select p_word || '-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + get_byte(r.bytes, i) % 24, 1), '' order by i)
  from (select extensions.gen_random_bytes(4) as bytes) r, generate_series(0, 3) as i;
$$;

-- The caller's network address as the API gateway reports it (for invite_misses), or 'unknown'.
create function public.request_ip() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_h jsonb;
begin
  begin
    v_h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_h := null;
  end;
  return left(coalesce(
    nullif(btrim(v_h ->> 'cf-connecting-ip'), ''),
    nullif(btrim(split_part(v_h ->> 'x-forwarded-for', ',', 1)), ''),
    nullif(btrim(v_h ->> 'x-real-ip'), ''),
    'unknown'
  ), 64);
end;
$$;

-- A club name's invite word: its first word's letters A–Z, 2 to 10 of them, else CLUB (src/social/localStub.ts).
create function public.invite_word(p_name text) returns text
language plpgsql immutable security definer set search_path = '' as $$
declare
  v_word text := left(regexp_replace(upper(split_part(btrim(p_name), ' ', 1)), '[^A-Z]', '', 'g'), 10);
begin
  return case when char_length(v_word) >= 2 then v_word else 'CLUB' end;
end;
$$;

-- A club as the game reads it; its invite code only for the club's creator, and only where p_with_code.
create function public.club_json(p_club public.clubs, p_uid uuid, p_with_code boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p_club.id,
    'name', p_club.name,
    'initials', p_club.initials,
    'colors', jsonb_build_array(p_club.color_a, p_club.color_b),
    'members', (select count(*) from public.club_members m where m.club_id = p_club.id),
    'blurb', p_club.blurb,
    'joined', (select to_char(m.joined_at at time zone 'UTC', 'YYYY-MM') from public.club_members m where m.club_id = p_club.id and m.user_id = p_uid),
    'invite_code', case when p_with_code and p_uid is not null and p_club.created_by = p_uid then p_club.invite_code end
  ));
$$;

-- A save row's meta, without the bodies.
create function public.save_meta_json(p_save public.saves) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'revision', p_save.revision,
    'save_id', p_save.save_id,
    'schema_version', p_save.schema_version,
    'saved_at', p_save.saved_at,
    'hour', p_save.hour,
    'shop_name', p_save.shop_name,
    'day', p_save.day,
    'money', p_save.money
  );
$$;

-- ───────────────────────────── sign-up, on the server (§4.2) ─────────────────────────────

-- Before a new account is stored: a club's invite code, the age box, a name of 1 to 30 characters (ADR-0038
-- decision 3, ADR-0039 decision 4). Raising here makes the sign-up fail ("Database error saving new user").
create function public.check_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_code text := upper(btrim(coalesce(v_meta ->> 'invite_code', '')));
  v_name text := btrim(coalesce(v_meta ->> 'display_name', ''));
begin
  if not exists (select 1 from public.clubs c where c.invite_code = v_code) then
    raise exception 'invite';
  end if;
  if (v_meta -> 'age_ok') is distinct from 'true'::jsonb then
    raise exception 'age';
  end if;
  if char_length(v_name) not between 1 and 30 then
    raise exception 'name';
  end if;
  return new;
end;
$$;

-- After it is stored: the profile (the name, a new friend code) and the club whose code signed it up.
create function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(btrim(coalesce(v_meta ->> 'display_name', '')), 30);
  v_letters text := left(regexp_replace(upper(v_name), '[^A-Z0-9]', '', 'g'), 6);
  v_club uuid;
  v_tries integer := 0;
begin
  if v_letters = '' then
    v_letters := 'AQUA';
  end if;
  loop
    begin
      insert into public.profiles (id, display_name, friend_code) values (new.id, v_name, v_letters || '-' || public.random_code(3));
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 50 then
        raise;
      end if;
    end;
  end loop;
  select c.id into v_club from public.clubs c where c.invite_code = upper(btrim(coalesce(v_meta ->> 'invite_code', '')));
  if v_club is not null then
    insert into public.club_members (club_id, user_id) values (v_club, new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger aquarium_go_check_signup before insert on auth.users for each row execute function public.check_signup();
create trigger aquarium_go_create_profile after insert on auth.users for each row execute function public.create_profile();

-- ───────────────────────────── the functions the game calls (§4.3) ─────────────────────────────

-- The club an invite code opens, and whether the caller is in it; null when it opens nothing. Signed out too. After 20
-- wrong codes in 10 minutes from one address, it answers null to that address, right code or wrong, until they age out.
create function public.resolve_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ip text := public.request_ip();
  v_club public.clubs;
begin
  if p_code is null or char_length(p_code) > 40 then
    return null;
  end if;
  if (select count(*) from public.invite_misses m where m.ip = v_ip and m.at > now() - interval '10 minutes') >= 20 then
    return null;
  end if;
  select * into v_club from public.clubs c where c.invite_code = upper(btrim(p_code));
  if not found then
    insert into public.invite_misses (ip) values (v_ip);
    delete from public.invite_misses m where m.at < now() - interval '1 day';
    return null;
  end if;
  return jsonb_build_object(
    'club', public.club_json(v_club, v_uid, false),
    'already_member', v_uid is not null and exists (select 1 from public.club_members m where m.club_id = v_club.id and m.user_id = v_uid)
  );
end;
$$;

create function public.me() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  return (
    select jsonb_build_object('id', p.id, 'email', u.email, 'display_name', p.display_name, 'friend_code', p.friend_code, 'is_owner', p.is_owner)
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = v_uid
  );
end;
$$;

-- Clubs I'm in (oldest first; invite codes on the ones I created) and every other club.
create function public.my_clubs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  return jsonb_build_object(
    'mine', coalesce((
      select jsonb_agg(public.club_json(c, v_uid, true) order by m.joined_at, c.id)
      from public.club_members m join public.clubs c on c.id = m.club_id
      where m.user_id = v_uid
    ), '[]'::jsonb),
    'suggested', coalesce((
      select jsonb_agg(public.club_json(c, v_uid, false) order by c.created_at, c.id)
      from public.clubs c
      where not exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = v_uid)
    ), '[]'::jsonb)
  );
end;
$$;

create function public.join_club(p_club uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.clubs c where c.id = p_club) then
    raise exception 'invalid';
  end if;
  insert into public.club_members (club_id, user_id) values (p_club, v_uid) on conflict do nothing;
end;
$$;

-- Only the owner makes clubs (ADR-0040 decision 2); the creator joins it.
create function public.create_club(p_name text, p_blurb text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_blurb text := btrim(coalesce(p_blurb, ''));
  v_words text[];
  v_initials text;
  v_pick integer;
  v_club public.clubs;
  v_tries integer := 0;
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_owner) then
    raise exception 'forbidden';
  end if;
  if char_length(v_name) not between 2 and 40 or char_length(v_blurb) > 80 then
    raise exception 'invalid';
  end if;
  v_words := array(select w from unnest(regexp_split_to_array(upper(v_name), '[^A-Z0-9]+')) as w where w <> '');
  v_initials := case
    when coalesce(array_length(v_words, 1), 0) > 1 then left(v_words[1], 1) || left(v_words[2], 1)
    when coalesce(array_length(v_words, 1), 0) = 1 then left(v_words[1], 2)
    else 'C'
  end;
  v_pick := 1 + (abs(hashtext(v_name)::bigint) % 6)::integer;
  loop
    begin
      insert into public.clubs (name, blurb, initials, color_a, color_b, invite_code, created_by)
      values (
        v_name, v_blurb, v_initials,
        (array['#2f55d4', '#9b7bf0', '#2fc4b2', '#f0845a', '#e8608f', '#e0b040'])[v_pick],
        (array['#16247a', '#5b3aa8', '#127567', '#a8402a', '#b03565', '#a87818'])[v_pick],
        public.new_invite_code(public.invite_word(v_name)),
        v_uid
      )
      returning * into v_club;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 50 then
        raise exception 'invalid';
      end if;
    end;
  end loop;
  insert into public.club_members (club_id, user_id) values (v_club.id, v_uid);
  return public.club_json(v_club, v_uid, true);
end;
$$;

-- A link from me to whoever has that friend code; at most 100 links from one player.
create function public.add_friend(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_to uuid;
begin
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

-- Who linked to me that I haven't linked back, newest first.
create function public.friend_requests() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'created_at', l.created_at) order by l.created_at desc, p.id)
    from public.friend_links l join public.profiles p on p.id = l.from_id
    where l.to_id = v_uid
      and not exists (select 1 from public.friend_links b where b.from_id = v_uid and b.to_id = l.from_id)
  ), '[]'::jsonb);
end;
$$;

create function public.accept_friend(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if p_id is null or not exists (select 1 from public.friend_links l where l.from_id = p_id and l.to_id = v_uid) then
    raise exception 'invalid';
  end if;
  if not exists (select 1 from public.friend_links l where l.from_id = v_uid and l.to_id = p_id)
     and (select count(*) from public.friend_links l where l.from_id = v_uid) >= 100 then
    raise exception 'invalid';
  end if;
  insert into public.friend_links (from_id, to_id) values (v_uid, p_id) on conflict do nothing;
end;
$$;

-- My friends (links both ways) and their aquarium pictures, most recently reported first.
create function public.friends_aquariums() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'owner', p.display_name,
      'title', coalesce(nullif(btrim(p.shop_name), ''), p.display_name),
      'gallons', p.gallons,
      'snapshot', p.snapshot,
      'updated_at', coalesce(p.standing_at, p.created_at)
    ) order by coalesce(p.standing_at, p.created_at) desc, p.id)
    from public.friend_links a
    join public.friend_links b on b.from_id = a.to_id and b.to_id = a.from_id
    join public.profiles p on p.id = a.to_id
    where a.from_id = v_uid
  ), '[]'::jsonb);
end;
$$;

-- My own numbers, as this browser counts them (trusted in stage 1); the picture only when one is sent.
create function public.report_standing(p_shop_name text, p_gallons integer, p_collection bigint, p_prismatics integer, p_show_wins integer, p_snapshot text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if p_snapshot is not null and (char_length(p_snapshot) > 200000 or p_snapshot !~ '^data:image/(jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$') then
    raise exception 'invalid';
  end if;
  update public.profiles set
    shop_name = left(btrim(coalesce(p_shop_name, '')), 60),
    gallons = greatest(0, coalesce(p_gallons, 0)),
    collection_value = greatest(0, coalesce(p_collection, 0)),
    prismatics = greatest(0, coalesce(p_prismatics, 0)),
    show_wins = greatest(0, coalesce(p_show_wins, 0)),
    snapshot = coalesce(p_snapshot, snapshot),
    standing_at = now()
  where id = v_uid;
end;
$$;

-- Me, my friends and the members of my clubs, by the kind's value, highest first; on a tie others rank ahead of me.
-- The top four rows and my own; my row is named by my shop name (the game writes "You · {name}").
create function public.leaderboard(p_kind text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  if p_kind is null or p_kind not in ('collection_value', 'prismatics', 'show_wins') then
    raise exception 'invalid';
  end if;
  return (
    with people as (
      select v_uid as id
      union
      select a.to_id from public.friend_links a
      join public.friend_links b on b.from_id = a.to_id and b.to_id = a.from_id
      where a.from_id = v_uid
      union
      select o.user_id from public.club_members m
      join public.club_members o on o.club_id = m.club_id
      where m.user_id = v_uid
    ),
    scored as (
      select p.id,
        case when p.id = v_uid then coalesce(nullif(btrim(p.shop_name), ''), p.display_name) else p.display_name end as name,
        case p_kind when 'collection_value' then p.collection_value when 'prismatics' then p.prismatics::bigint else p.show_wins::bigint end as value
      from people x join public.profiles p on p.id = x.id
    ),
    ranked as (
      select s.*, row_number() over (order by s.value desc, (s.id = v_uid), s.name, s.id) as rank from scored s
    )
    select jsonb_build_object(
      'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', r.rank, 'name', r.name, 'value', r.value, 'me', r.id = v_uid) order by r.rank) from ranked r where r.rank <= 4), '[]'::jsonb),
      'me', (select jsonb_build_object('rank', r.rank, 'name', r.name, 'value', r.value, 'me', true) from ranked r where r.id = v_uid)
    )
  );
end;
$$;

-- What's new for the Social dot: no trades in stage 1; members who joined my clubs since I last looked.
create function public.news() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_seen timestamptz;
begin
  select p.seen_at into v_seen from public.profiles p where p.id = v_uid;
  return jsonb_build_object(
    'trades', 0,
    'clubs', (
      select count(*) from public.club_members mine
      join public.club_members o on o.club_id = mine.club_id
      where mine.user_id = v_uid and o.user_id <> v_uid and o.joined_at > mine.joined_at and o.joined_at > coalesce(v_seen, '-infinity'::timestamptz)
    )
  );
end;
$$;

create function public.mark_seen() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  update public.profiles set seen_at = now() where id = v_uid;
end;
$$;

-- ───────────────────────────── the online save (§6) ─────────────────────────────

create function public.save_meta() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_save public.saves;
begin
  select * into v_save from public.saves s where s.user_id = v_uid;
  if not found then
    return null;
  end if;
  return public.save_meta_json(v_save);
end;
$$;

create function public.get_save() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_save public.saves;
begin
  select * into v_save from public.saves s where s.user_id = v_uid;
  if not found then
    return null;
  end if;
  return jsonb_build_object('meta', public.save_meta_json(v_save), 'encoding', v_save.encoding, 'body', v_save.body);
end;
$$;

-- Write my save if its revision is still p_expected (0: no row yet). A stored save from a newer build is never
-- written over (PERSIST-014 on the server): too_new. Another device moved it on: conflict. When the aquarium changes
-- (another save_id), the replaced one's body is kept as previous_*.
create function public.put_save(
  p_expected bigint, p_save_id text, p_schema_version integer, p_saved_at bigint, p_hour double precision,
  p_shop_name text, p_day integer, p_money double precision, p_encoding text, p_body text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
  v_save public.saves;
begin
  if p_expected is null or p_expected < 0
     or p_save_id is null or char_length(p_save_id) not between 1 and 200
     or p_schema_version is null or p_schema_version < 1
     or p_saved_at is null or p_hour is null or p_day is null or p_money is null
     or p_encoding is null or p_encoding not in ('gzip-base64', 'json')
     or p_body is null or char_length(p_body) > 4000000 then
    raise exception 'invalid';
  end if;
  select * into v_save from public.saves s where s.user_id = v_uid for update;
  if found then
    if v_save.schema_version > p_schema_version then
      return jsonb_build_object('ok', false, 'reason', 'too_new', 'meta', public.save_meta_json(v_save));
    end if;
    if v_save.revision <> p_expected then
      return jsonb_build_object('ok', false, 'reason', 'conflict', 'meta', public.save_meta_json(v_save));
    end if;
    update public.saves set
      revision = v_save.revision + 1,
      save_id = p_save_id,
      schema_version = p_schema_version,
      saved_at = p_saved_at,
      hour = p_hour,
      shop_name = left(coalesce(p_shop_name, ''), 60),
      day = p_day,
      money = p_money,
      encoding = p_encoding,
      body = p_body,
      previous_save_id = case when v_save.save_id <> p_save_id then v_save.save_id else v_save.previous_save_id end,
      previous_encoding = case when v_save.save_id <> p_save_id then v_save.encoding else v_save.previous_encoding end,
      previous_body = case when v_save.save_id <> p_save_id then v_save.body else v_save.previous_body end,
      updated_at = now()
    where user_id = v_uid;
    return jsonb_build_object('ok', true, 'revision', v_save.revision + 1);
  end if;
  if p_expected <> 0 then
    return jsonb_build_object('ok', false, 'reason', 'conflict', 'meta', null);
  end if;
  insert into public.saves (user_id, revision, save_id, schema_version, saved_at, hour, shop_name, day, money, encoding, body)
  values (v_uid, 1, p_save_id, p_schema_version, p_saved_at, p_hour, left(coalesce(p_shop_name, ''), 60), p_day, p_money, p_encoding, p_body)
  on conflict (user_id) do nothing;
  if not found then
    -- another device wrote the first copy a moment ago
    select * into v_save from public.saves s where s.user_id = v_uid;
    return jsonb_build_object('ok', false, 'reason', 'conflict', 'meta', public.save_meta_json(v_save));
  end if;
  return jsonb_build_object('ok', true, 'revision', 1);
end;
$$;

-- Delete my account: everything else cascades; clubs I created keep going with created_by null. Supabase Auth's audit
-- log names the account too (the privacy note promises all of it goes): its rows go where the role may delete them.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_uid();
begin
  begin
    delete from auth.audit_log_entries a where a.payload ->> 'actor_id' = v_uid::text;
  exception when undefined_table or insufficient_privilege then
    null; -- no audit log here, or not ours to clean: the account itself still goes
  end;
  delete from auth.users where id = v_uid;
end;
$$;

-- ───────────────────────────── who may call what ─────────────────────────────

revoke execute on function public.require_uid() from public, anon, authenticated;
revoke execute on function public.random_code(integer) from public, anon, authenticated;
revoke execute on function public.new_invite_code(text) from public, anon, authenticated;
revoke execute on function public.request_ip() from public, anon, authenticated;
revoke execute on function public.invite_word(text) from public, anon, authenticated;
revoke execute on function public.club_json(public.clubs, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.save_meta_json(public.saves) from public, anon, authenticated;
revoke execute on function public.check_signup() from public, anon, authenticated;
revoke execute on function public.create_profile() from public, anon, authenticated;

revoke execute on function public.resolve_invite(text) from public, anon;
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
