# Online, stage 1: the design chunk 8 builds

Written 2026-10-19 by Chase, after reading the Social stub (`src/social`, `src/ui/panels/social`), the save code
(`src/persistence`), the Supabase CLI's commands (v2.119.0, offline help) and the owner's answers. It turns ADR-0038
(stage 1), ADR-0039 (the privacy note, 13 and over) and ADR-0040 (setup, clubs, wording) into a build plan. The
owner's decisions win over this file; for what the code does today, the code wins. Requirements: REL-025 to REL-033.

## 1. What stage 1 is

- **Accounts:** email and password; sign-up only with a club's invite code (checked by the server); a display name
  ("Name friends see"); the 13-and-over checkbox; the privacy note linked from sign-up; Sign out; Delete my account
  (removes everything on the server). No emails at all: confirmation is off, and a forgotten password is reset by the
  owner or the agent (§3.8).
- **One online save:** while signed in, the game on screen goes online about every 2 minutes of play and when the tab
  is hidden. The device's own saves stay the source of truth offline. When the online copy differs from what this
  device last synced, a box asks which to keep (§6). A save from a newer build is never overwritten or loaded past
  (PERSIST-014), on the device and on the server.
- **Social on the real service**, for every player of the live site, once a project is configured: signed out, the
  approved "Bring your aquarium online" screen; signed in, Overview, Clubs, Trading, Friends and Leaderboards.
  Clubs: only the owner creates them and sees their invite links (ADR-0040 decision 2); anyone signed in joins.
  Friends: add by friend code; the other person accepts ("Friend requests"); friends see each other's aquarium
  picture. Leaderboards: me, my friends and the members of my clubs. Trades stay "open later" (ADR-0034).
- **Not in stage 1:** trades, likes, club events and the club-show reminder (sample clubs only), sign-in on the title
  screen, leaving a club, server-side checks of the save (stage 2), email of any kind.
- **The server trusts each browser on purpose** (ADR-0038): it stores what it is sent, within size limits.

## 2. Code layout

Layer rules (`tests/sim/core-architecture-boundaries.test.ts`): `social` may import only `types`, `data` and `sim`;
`ui` may import `persistence`, `state`, `social` and the rest. So the Supabase transport lives in `src/social`, and
everything that touches the save or the game store lives in `src/ui`. No new top-level layer.

| File | What |
|---|---|
| `src/social/service.ts` | The interface grows (§5.1): sign-up details, the owner flag, invite codes on owned clubs, friend requests, create club, delete account, standing report, the online-save calls; `FriendAquarium.likes` becomes `number \| null`; more `SocialError` codes |
| `src/social/localStub.ts` | The stub implements all of it (§5.4), so dev mode and e2e cover every screen |
| `src/social/project.ts` (new) | `ONLINE_PROJECT: { url: string; publishableKey: string } \| null`: null until setup (§3), then the project's address and its publishable (anon) key, which are public by design |
| `src/social/supabase/*.ts` (new) | `createSupabaseSocialService(project)`: the client loaded with a dynamic `import('@supabase/supabase-js')` (its own chunk; the title screen doesn't load it), error mapping, gzip and base64 for saves |
| `src/ui/online/mode.ts` (new) | `socialModeFor(devAllowed, env, project)` (pure) and `socialMode()` / `socialAvailable()` (§5.3) |
| `src/ui/online/cloudSync.ts` (new) | The online-save loop and its store (§6) |
| `src/ui/online/CloudPrompt.tsx` (new) | The "which copy" box |
| `src/ui/settings/AccountTab.tsx` (new) | Settings › Account (`#/settings/account`) |
| `src/ui/panels/social/*` | Sign-up mode, the privacy note, friend requests, the owner's club controls, the text changes |
| `supabase/config.toml`, `supabase/migrations/20261019000000_stage1.sql` (new) | Sign-in settings and the database (§3, §4) |
| `scripts/online-smoke.mjs` (new) | The live smoke test (§8.3), run by hand, never by `npm test` or e2e |

`@supabase/supabase-js` goes in `dependencies` at the exact version **2.117.2** (published 2026-09-25; 2.118.0 is a
few days old), and `tests/sim/core-dependencies.test.ts`'s list changes citing ADR-0038 decision 2. No other package.

## 3. Setting up Supabase (ADR-0040 decision 1)

The CLI is `/Users/brianbean/.local/bin/supabase` (v2.119.0), signed in to the owner's **whole** account: the
organization GrayGrayson1 (Pro) holds anonyform's two projects. Rules for every remote command:

- Pass the Aquarium Go project's ref explicitly (`--project-ref <ref>`) or check `supabase/.temp/project-ref` first.
  Never link to, query or push to any other project. If a command can't be scoped, stop and ask the owner.
- Never print, save or commit the project's secret (service_role) key. When reading keys, filter to the publishable
  (anon) key in the same command, so the secret never reaches the terminal. Never read the CLI's stored sign-in: an
  attempt was refused on 2026-10-18 as credential exploration, and must not be worked around.
- Anything that would cost money, any other organization or project, `main`, Render: ask the owner first.

Steps (do them once the migration and the smoke test exist, so the project is used the day it is made):

1. `supabase orgs list`: check that GrayGrayson1 is there and that no "Aquarium Go" organization exists yet.
2. `supabase orgs create "Aquarium Go"`, then note the new organization's id. Check it is on the Free plan: see
   whether `supabase orgs list -o json` shows a plan; if not, ask the owner to look at the new organization's billing
   page in the dashboard. **Stop if it isn't Free.**
3. Create the project with a random password that nobody keeps (ADR-0040), in one command so it never prints:
   `PW=$(openssl rand -base64 33 | tr -d '/+=\n' | cut -c1-32); supabase projects create aquarium-go --org-id <id> --region us-east-1 --db-password "$PW"; unset PW`.
   Never pass `--size` or `--high-availability`. Wait until `supabase projects list -o json` (filtered to the new ref)
   shows it healthy. If the owner's free-project quota refuses the project, stop and ask (the owner's "worst case"
   needs its own yes).
4. `supabase init` in the repo (it writes `supabase/config.toml` and `supabase/.gitignore`; keep `supabase/.temp`
   out of git), then `supabase link --project-ref <ref>` (if it asks for the database password, skip it; the next
   steps use the Management API).
5. Sign-in settings in `supabase/config.toml` (`[auth]`): `site_url` the Pages address
   (`https://graygrayson1.github.io/aquarium-go/`), the Render address in `additional_redirect_urls`,
   `enable_signup = true`, `minimum_password_length = 8`; `[auth.email]` `enable_signup = true`,
   `enable_confirmations = false`; phone and every external provider off. `supabase config push --project-ref <ref>`
   shows a diff before it asks: read it, and push only if it changes the sign-in settings you meant.
6. `supabase db query --linked -f supabase/migrations/20261019000000_stage1.sql` (the Management API, no database
   password), then `supabase db advisors --linked --type security --level warn`: fix every warning in the migration
   (a follow-up migration file) and run it again until clean.
7. The first club, with SQL (`db query --linked`): "Aquarium Go Friends", blurb "Friends and family of Aquarium Go",
   created_by null, its invite code made by the same function the owner's "Create club" uses (`FRIENDS-` and four
   digits). Note the code: the owner's invite link is
   `https://graygrayson1.github.io/aquarium-go/#/social/join/<CODE>`.
8. The smoke test (§8.3) against the project, with two throwaway accounts it deletes at the end.
9. Write the address and the publishable key into `src/social/project.ts` (read with
   `supabase projects api-keys --project-ref <ref> -o json`, filtered in the same pipeline to the publishable or anon
   key), commit, and record the ref, the first club's code and the smoke test's result in PLAN.md (not the key's
   value; it is in the committed file).
10. After the owner signs up on the live site (after a release, the owner's call): with the owner's yes and the email
    they used, `update public.profiles set is_owner = true` for that account and set the first club's `created_by`
    to it. Until then nobody can create clubs, which is fine.

Runbook for later (write it into `docs/ARCHITECTURE.md`'s online section):
- **Forgotten password** (no emails): with the owner's yes, `update auth.users set encrypted_password =
  extensions.crypt('<new>', extensions.gen_salt('bf')) where email = '<email>'`, and tell the player in person.
- **Paused project** (a free project pauses after a week with no activity; the game then shows the network message
  and plays offline): the owner presses Restore in the dashboard.
- **A displaced online save** (§4.2 keeps the previous aquarium's body): restore with SQL on request.

## 4. The database

One migration, `supabase/migrations/20261019000000_stage1.sql`. The principle: **the browser touches no table
directly.** Every table has row-level security on and no policies, `anon` and `authenticated` have no table
privileges, and the game calls a small set of functions (§4.3) that check `auth.uid()` themselves. That is easy to
review and to test statically.

### 4.1 Tables (all in `public`, all `enable row level security`)

- `profiles`: `id uuid primary key references auth.users on delete cascade`, `display_name text not null` (1 to 30
  characters after trimming), `friend_code text not null unique`, `is_owner boolean not null default false`,
  `shop_name text` (≤ 60), `gallons integer` (≥ 0), `snapshot text` (≤ 200,000 characters, `data:image/jpeg;base64,`
  or `data:image/webp;base64,`), `collection_value bigint`, `prismatics integer`, `show_wins integer` (each ≥ 0,
  default 0), `standing_at timestamptz`, `seen_at timestamptz not null default now()`, `created_at`.
- `clubs`: `id uuid primary key default gen_random_uuid()`, `name text` (2 to 40), `blurb text` (≤ 80, default ''),
  `initials text`, `color_a text`, `color_b text` (from a fixed palette), `invite_code text not null unique`,
  `created_by uuid references auth.users on delete set null`, `created_at`.
- `club_members`: `club_id` (cascade), `user_id` (cascade), `joined_at`, primary key both.
- `friend_links`: `from_id`, `to_id` (both cascade), `created_at`, primary key both, `check (from_id <> to_id)`. A
  friendship is a link each way; a link one way is a request.
- `saves`: `user_id uuid primary key references auth.users on delete cascade`, `revision bigint not null`,
  `save_id text`, `schema_version integer`, `saved_at bigint` (the device's ms), `hour double precision`, `shop_name`,
  `day integer`, `money double precision`, `encoding text` (`gzip-base64` or `json`), `body text` (≤ 4,000,000
  characters), `previous_save_id`, `previous_encoding`, `previous_body` (the last different aquarium this one
  replaced), `updated_at timestamptz`.

### 4.2 Sign-up, on the server (triggers on `auth.users`)

- `before insert`: `public.check_signup()` reads `new.raw_user_meta_data`: `invite_code` must match a club's
  `invite_code` (trimmed, upper-cased), `age_ok` must be `true`, `display_name` 1 to 30 characters after trimming;
  otherwise `raise exception`, which makes the sign-up fail ("Database error saving new user" reaches the client).
  This is the server-side check ADR-0038 decision 3 asks for.
- `after insert`: `public.create_profile()` inserts the profile with the display name and a new friend code: the
  name's letters and digits, upper-cased, up to six (`AQUA` if none), a dash, three characters from
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; retried on a clash. (Same shape as the stub's `friendCodeFor` and
  `looksLikeFriendCode`.)
- The trigger functions: `security definer`, `set search_path = ''`, execute revoked from `public`, `anon` and
  `authenticated`.

### 4.3 Functions the game calls

All `security definer`, `set search_path = ''`, every name schema-qualified, `raise exception 'not_signed_in'` when
`auth.uid()` is null (except `resolve_invite`). Postgres grants EXECUTE to PUBLIC on new functions: **revoke it from
`public` and `anon` on every function**, then grant to `authenticated` (and `resolve_invite` also to `anon`). Errors
the game maps carry fixed messages: `invalid`, `forbidden`, `not_signed_in`.

| Function | Does |
|---|---|
| `resolve_invite(p_code text)` | The club for that code, `{ club, already_member }`, or null. Anyone may call it (the signed-out invite callout) |
| `me()` | `{ id, email, display_name, friend_code, is_owner }` |
| `my_clubs()` | `{ mine, suggested }`: clubs I'm in (with `joined_at`, and `invite_code` only where `created_by` is me) and every other club; member counts |
| `join_club(p_club uuid)` | Join (idempotent); `invalid` if no such club |
| `create_club(p_name, p_blurb)` | `forbidden` unless `is_owner`; makes initials, colours and the invite code (the first word's letters A–Z, 2 to 10 of them, else `CLUB`; a dash; four digits; retried on a clash); the creator joins it |
| `add_friend(p_code)` | A link from me to the profile with that friend code; `invalid` for no match or myself; at most 100 links from one player |
| `friend_requests()` | Profiles linked to me that I haven't linked back: `[{ id, name, created_at }]` |
| `accept_friend(p_id uuid)` | `invalid` unless `p_id` linked to me; links me back |
| `friends_aquariums()` | My friends (links both ways): `[{ id, owner, title, gallons, snapshot, updated_at }]` |
| `report_standing(p_shop_name, p_gallons, p_collection, p_prismatics, p_show_wins, p_snapshot default null)` | Updates my profile within the limits above (the snapshot only when given); `standing_at = now()` |
| `leaderboard(p_kind text)` | Me, my friends and the members of my clubs, by the kind's value, highest first; on a tie others rank ahead of me (the stub's rule); `{ rows: the top 4, me }`, my row named by my `shop_name` (the UI writes "You · {name}") |
| `news()` | `{ trades: 0, clubs: members who joined my clubs after my seen_at }` |
| `mark_seen()` | `seen_at = now()` |
| `save_meta()` | My save row without the bodies, or null |
| `get_save()` | My save: the meta, `encoding` and `body` |
| `put_save(p_expected bigint, p_save_id, p_schema_version, p_saved_at, p_hour, p_shop_name, p_day, p_money, p_encoding, p_body)` | Locks my row. A stored `schema_version` above `p_schema_version` → `{ ok: false, reason: 'too_new', meta }` (PERSIST-014 on the server). A stored revision other than `p_expected` (0 when there is no row) → `{ ok: false, reason: 'conflict', meta }`. Otherwise writes, `revision + 1`, keeps the old body in `previous_*` when `save_id` changes, and returns `{ ok: true, revision }` |
| `delete_my_account()` | `delete from auth.users where id = auth.uid()`; everything else cascades; clubs I created keep going with `created_by` null |

## 5. The client

### 5.1 The interface (`src/social/service.ts`)

- `signUp(email, password, details: { displayName: string; inviteCode: string; ageConfirmed: boolean })`.
- `SocialError.code` adds `'credentials'` (wrong email or password), `'taken'` (the email has an account),
  `'invite'` (the code opens nothing), `'age'`, `'name'`, `'forbidden'`; `isSocialError` accepts them all.
- `SocialUser.isOwner?: boolean`; `Club.inviteCode?: string` (only on clubs the player created);
  `FriendAquarium.likes: number | null` (null: the tile shows no likes; the real service sends null, the stub keeps
  its sample numbers).
- New methods: `createClub(name, blurb)`, `friendRequests()`, `acceptFriend(id)`, `deleteAccount()`,
  `reportStanding(r)`, and the online save: `cloudMeta()`, `cloudDownload()`, `cloudUpload(payload, expected)`, with
  `CloudSaveMeta { revision, saveId, schemaVersion, savedAt, hour, shopName, day, money }`.

### 5.2 The Supabase service

- The client: `createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true,
  storageKey: 'aquarium-go.auth.v1' } })`, made once, on first use. supabase-js keeps tokens in localStorage, never the
  password (SOC-002's test covers the real service too, with a fake storage).
- `signIn`: `auth.signInWithPassword`; `invalid_credentials` → `credentials`; no response or 5xx → `network`.
- `signUp`: check the form first (age, name, `validCredentials`), then `resolve_invite` (null → `invite`), then
  `auth.signUp({ email, password, options: { data: { invite_code, display_name, age_ok: true } } })`;
  `user_already_exists` / `email_exists` → `taken`; a 500 "Database error saving new user" → `invite` (the server
  refused it). Then `me()`.
- `trades()` returns `[]` without a call. `friendsAquariums()` uses the stub's drawn `snapshot('planted')` picture for
  a friend with none yet. `leaderboard(kind)` sends `report_standing` first (from `setStandingSource`), then asks.
- Everything else maps one-to-one onto §4.3.
- `deleteAccount()`: `delete_my_account`, then `auth.signOut({ scope: 'local' })`.

### 5.3 Which service, and where Social shows

`socialModeFor(devAllowed, env, project)`:
- dev tools allowed (dev builds, and `?dev=1` in the e2e builds): `'stub'`, unless `VITE_SOCIAL_ONLINE_IN_DEV=1` and a
  project is configured (`'online'`, for a hands-on check against the real project);
- else `VITE_SOCIAL_STUB=1` (the e2e builds only): `'stub'`;
- else `'online'` if `ONLINE_PROJECT` is set, otherwise `'off'`.

`socialAvailable()` (mode isn't `'off'`) replaces the dev-mode checks that gate Social today: `PanelHost`, the dock's
`devOnly` item, the More sheet, `parseNav` and the router's `case 'panel'`. The club-show reminder and the stub's
dev hint stay stub-only. At boot, mode `'online'` calls `provideSocialService(createSupabaseSocialService(...))`.
Playwright's `E2E_ENV` gains `VITE_SOCIAL_STUB: '1'`, so no test ever reaches the live project; a unit test checks
that `deploy.yml` and `render.yaml` set neither flag (as `plat-dev-tools.test.ts` does for `VITE_E2E_DEV_URL`).
SOC-011's "only in dev mode" ends here, through ADR-0038: its criteria change on purpose, and prod-mode.spec's Social
check changes with them (the players' build shows Social and no dev hint).

### 5.4 The stub

The stub gets every new method: sign-up needs `HIGHLAND-4821` (the one code that resolves), the checkbox and a name;
an owner flag and friend requests come from dev hooks; `createClub` makes a club with a code; `deleteAccount` clears
its record and its online save; the online save lives in localStorage under `aquarium-go.social.cloud.v1`. The dev
hooks (`window.__AQ.social`, `src/dev/debugHooks.ts`) add `setOwner`, `pushFriendRequest`, `setCloud(meta, text)`,
`cloud()` and `cloudSyncNow()`, so e2e can play "another device".

## 6. The online save (`src/ui/online/cloudSync.ts`)

**What goes up:** `exportSaveText(game)` (`src/persistence/transfer.ts`), gzipped with `CompressionStream` and
base64'd (`gzip-base64`), or plain (`json`) where `CompressionStream` is missing; with the meta. A body over 4,000,000
characters isn't sent (the status line shows the network line; logged). Showcase worlds are never sent.

**This device's link** (`aquarium-go.cloud.v1` in localStorage, per account, never in the save):
`{ revision, saveId, savedAt }` of the last copy this device sent or loaded.

**When it checks** (reads `cloudMeta()`): on sign-in; when a game starts or loads (the game's `saveId` changes); when
the tab comes back after 2 minutes or more hidden; after an upload's `conflict`.

**What the check decides** (a pure function, `decideOnline`, tested row by row):

| Online | This device | Then |
|---|---|---|
| none | a game | send it (expected 0) |
| `schemaVersion` above `SCHEMA_VERSION` | anything | blocked for the session: never send; the status line says so (PERSIST-014) |
| revision equals the link's | any | in step: send when the game next saves |
| changed since the link, same aquarium | unchanged since the link | box: "A newer save is online" |
| changed, same aquarium | changed too | box: "Your aquarium changed on two devices" |
| no link on this device, same aquarium | a game | the same `savedAt`: link it, in step; otherwise the two-devices box |
| a different aquarium (`saveId`), linked or not | a game | box: "Your account has a different aquarium online" (a new device's fresh game lands here) |
| anything | no game | nothing yet (Social opens only inside a game) |

**When it sends:** after a local save of the current game lands (`useGame`'s `game.lastSavedRealMs` changes, set by
`saveCurrentGame` on success), at most once every 2 minutes, and at once when the tab is hidden; never while blocked,
while the box is open, signed out, or in mode `'off'`. The send passes the link's revision as `expected`;
`too_new` → blocked; `conflict` → check again.

**The box** (`CloudPrompt.tsx`): the title for the case, both copies as cards (name, day, money, when saved), and two
buttons. It doesn't close without a choice.
- **Load online save:** `cloudDownload()`, then `importSaveText(text, 'auto')` (validates, migrates, refuses a newer
  build's save) and the same load as Settings › Saves' Load (`src/ui/common/saves.ts`), so the offline catch-up and
  the welcome-back card run; the slot's backup keeps this device's copy as "Previous autosave". The link becomes the
  online copy's.
- **Keep this device's:** send it with `expected` set to the online revision; the link follows.

**Sign out** stops the loop (the link stays). **Delete my account** stops it and clears the link. The local save
paths (`src/persistence`) don't change.

## 7. Screens and words

### 7.1 Approved (ADR-0039, ADR-0040): build these strings exactly

- Privacy note: ADR-0039's text, verbatim, titled "Your account and your data", opened from the sign-up form and
  from Settings › Account. Its "Settings > Account > Delete my account" may use the screen's arrows.
- Checkbox (required): "I'm 13 or older, or I'm a parent or guardian signing up for my child."
- Sign-up fields: "Name friends see", "Invite code" (plus Email, Password and the approved buttons).
- Errors: "That invite code didn't work. Ask whoever invited you for their link." · "Tick the box to confirm your
  age." · "Enter a name of 1 to 30 characters." · "An account with that email already exists. Sign in instead." ·
  "That email and password don't match an account."
- Under Sign in: "Forgot your password? Ask whoever invited you."
- Settings › Account: shows who is signed in, the friend code, Sign out and Delete my account. Signed out: "Sign in
  from Social to save your aquarium online and see friends."
- Delete confirmation body: "This removes your account, online save, friends and clubs from Aquarium Go's server. The
  game on this device stays."
- The online-save box's titles: "A newer save is online" · "Your aquarium changed on two devices" · "Your account has
  a different aquarium online"; buttons "Keep this device's" · "Load online save"; loading keeps this device's copy
  in Settings › Saves as "Previous autosave".
- Trades note (`soonText`): "Trading isn't open yet. Nothing was offered, and your animals stay in your aquarium."
- Joining a club (`joinText`): "Members see each other's aquariums and share a leaderboard."
- Friends tab: "Friend requests", rows "{name} added you" with "Accept".
- Friends' tiles drop the likes count when `likes` is null (the real service).

Curly apostrophes and quotes in the code, as `copy.ts` writes them (§16 of the 0.5 spec). Pin them all in a copy test.

### 7.2 Kept as they are

The approved §13 screens and strings stay, including the sign-in title and text, "Have an invite?" and its field,
the invite callout and join card, the toasts after sign-in and sign-up, the network message ("Can't reach Aquarium Go
online right now. Your game is fine — try again in a moment.", used for a paused or unreachable project), the empty
states, the leaderboard. The club-show strip and the "Welcome" toast's club-show line appear only for a club with an
event (the stub's sample clubs); for real clubs the toast has no second line.

### 7.3 Drafts, not yet approved: ask the owner in one round before building these (OWNER_QUESTIONS group I)

Put the exact strings in the options' previews (AskUserQuestion, recommended first). The owner stopped an earlier
round with previews; plain text worked (ADR-0040), so offer the round as text if the tool is declined.
- Sign-up mode: placeholders "e.g. Sam" (name) and "From your invite link" (code); the link back, "Back to sign in".
- Settings › Account (tab label "Account"): "Name friends see: {name} · Friend code {code}"; "Open Social"; the
  online-save line: "Saving online…" · "Saved online {2 min ago}" · "Not saved online yet" · "Can't reach Aquarium Go
  online. Your game still saves on this device." · "Your online save comes from a newer version of Aquarium Go.
  Refresh the page to update."
- Delete dialog: title "Delete your account?", buttons "Delete my account" and "Cancel"; toast "Account deleted" ·
  "Your game is still on this device."
- The online-save box's cards: "On this device · {shop} · Day {n} · {$money} · saved {ago}" and "Online · …"; its
  note: "If you load the online save, this device's copy stays in Settings › Saves as Previous autosave."
- The owner's club controls: "Create a club"; fields "Club name" and "What it's about (optional)"; "Create club";
  error "Enter a club name of 2 to 40 characters."; toast "Club created" · "Copy its invite link to bring friends
  in."; on the owner's clubs "Invite link {CODE}" with "Copy link", toast "Link copied".

Everything else can be built meanwhile. No other new copy without asking.

## 8. Tests

### 8.1 Unit (`npm test`)

- `online-mode.test.ts`: `socialModeFor` for every combination; neither flag in `deploy.yml` or `render.yaml`;
  Playwright's `E2E_ENV` sets `VITE_SOCIAL_STUB`.
- `social-supabase.test.ts`: the service against a fake client (records `auth.*` and `rpc` calls, answers as
  Supabase does): each method's call and mapping; every error mapping; sign-up's metadata; no stored value contains
  the password.
- `online-rules.test.ts`: `decideOnline`, every row of §6.
- `online-sync.test.ts`: the loop with a fake service and fake timers: at most one send per 2 minutes, a send on
  hidden, never a showcase, conflict → check → box, too_new → blocked and nothing sent, both choices, sign-out and
  delete stopping it, the link outside the save (`stateHash` unchanged by any social action, SOC-009 A3).
- `online-compress.test.ts`: gzip-base64 round trip and the json fallback.
- `supabase-migration.test.ts`: reads the SQL: every `public` table enables row-level security; no `create policy`;
  no table grant to `anon` or `authenticated`; every function is `security definer` with `set search_path = ''`, has
  its execute revoked from `public` (and `anon`, except `resolve_invite`) and an explicit grant; both `auth.users`
  triggers exist; the size limits exist. Proved failing on a copy with one of these removed.
- Updated on purpose: `social-stub.test.ts` (the new methods), `social-ui.test.ts` (sign-up mode, the checkbox, the
  privacy note, the Account tab, friend requests, the owner's controls), a copy test pinning §7.1 and the approved
  §7.3 strings, `core-dependencies.test.ts` (ADR-0038), `nav-routes.test.ts` (`#/settings/account`), the dock and
  More tests (Social shows where `socialAvailable()`).

### 8.2 e2e (the stub; Chromium and WebKit)

- `social.spec.ts`: sign-up needs a working code, a name and the checkbox; the privacy note opens and closes;
  a friend request accepted; the owner creates a club and copies its link (the stub's owner hook).
- `online-save.spec.ts` (new): signed in, the stub's online save receives the game (`cloudSyncNow`); a newer copy
  written by `setCloud` → the newer-save box → Load → the game is that copy; both changed → Keep this device's → the
  stub holds this device's; a different aquarium → its title; a newer schema → the status line, nothing sent.
- Settings › Account signed out and in, and Delete my account (the stub is cleared, the game stays).
- `prod-mode.spec.ts`: Social reachable in the players' build without the dev hint (the rest unchanged);
  `nav-routes-matrix.spec.ts` gains `#/settings/account`; `viewports.spec.ts` covers the Account tab and the box.

### 8.3 Live smoke (`node scripts/online-smoke.mjs`, by hand, after setup)

Against the project, with two throwaway accounts A and B (`smoke-a-<time>@example.com`), deleted at the end; print
each check's pass or fail:
1. Sign-up with a wrong code fails; without `age_ok` fails; with the first club's code, A and B succeed.
2. Direct table reads and writes (`from('saves')`, `from('profiles')`, …) return nothing or are refused, for A and
   for an anonymous client; an anonymous client can call `resolve_invite` and nothing else.
3. A's `put_save`, then `get_save` as B returns B's own (none); the revision check (`conflict`) and the newer-schema
   refusal (`too_new`).
4. A adds B's friend code; B sees the request and accepts; each sees the other in `friends_aquariums` and
   `leaderboard`.
5. B's `create_club` is `forbidden`.
6. `delete_my_account` for both; then, through `db query --linked` (admin), no row for either in any table.

## 9. Things to know

- **No Docker on the Mac**, so no local Supabase: the SQL is checked by the static test and the live smoke. `psql`
  exists but isn't needed.
- The free project **pauses after a week with no activity**; the network message covers it.
- e2e: run the four checks in `~/LocalTest/AquariumGo` under `caffeinate -i -s` (the Mac sleeps on battery), about 33
  minutes; two full passes in a row before calling the chunk done.
- Nothing here touches `src/sim` or `src/data`; social and UI code may read the clock (not the simulation).
- The stub's current `signUp: signIn` goes; its sign-up now needs details.
- WebKit has `CompressionStream` (Safari 16.4+); the json fallback covers the rest.
- No content-security policy limits fetches (`index.html` has none) and the service worker has no fetch handler
  (`public/sw.js`), so calls to `*.supabase.co` need no change there.

## 10. Requirements

REL-025 (which service, and Social for players), REL-026 (the project's setup), REL-027 (the database's rules),
REL-028 (accounts), REL-029 (the online save), REL-030 (Social on the real service), REL-031 (Settings › Account),
REL-032 (the stub and the tests), REL-033 (docs and the owner's runbook). Their criteria are in
`docs/agent/REQUIREMENTS.json`.
