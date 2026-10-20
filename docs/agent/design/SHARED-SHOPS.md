# Shared shops: the design chunks 10 to 13 build

Written 2026-10-20 by Chase, after reading the store and the game loop (`src/state/game.ts`, `src/game`), the player
actions (`src/ui/panels/common/act.ts`, `src/ui/common/actions.ts`, every `mutate` call), the simulation's step
(`src/sim/world.ts`, `src/sim/time.ts`), the offline catch-up (`src/persistence/offline.ts`), the save fingerprint
(`src/persistence/hash.ts`), the online tables (`supabase/migrations`) and Render's free-plan pages, and after a probe of
how much a shop changes per second (§2.3). Revised the same day after a fresh review (Opus at max effort, with probes in
the internal-disk clone's `scripts/_audit/review-shared/`, git-excluded): its two blockers and thirteen major findings
are folded in below. It turns ADR-0043 (shared shops: what, who, pause, empty, carry-over) and ADR-0045 (the server
key, `ws`, the caps, "there", the start, your own game, activity, first one wins, the words, photos) into a build plan.
The owner's decisions win over this file; for what the code does today, the code wins. Requirements: SHARE-001 to
SHARE-018 (§12), added to `REQUIREMENTS.json` with each chunk's brief.

## 1. What a shared shop is

- **A separate shop a club plays together, live** (ADR-0043 decision 1): its own money, tanks, animals, staff,
  research and shows. Each player's own game stays theirs, and **nothing carries over** either way (decision 7): no
  money, animals, trophies or leaderboard numbers; a shared shop isn't on the leaderboards (ADR-0045 decision 12).
- **One per club, created by the owner** (ADR-0043 decision 3), who names it and picks its starter animal; normal
  starting money; no guide steps (ADR-0045 decision 5).
- **Club members join, up to 10 at once.** Every member can do everything except pause and speed (ADR-0043 decision
  5); **pause and speed** belong to the owner and the members the owner chooses (decision 4).
- **There, or not:** a member counts as there while the shop is on their screen and they've used it in the last 30
  minutes (ADR-0045 decision 4). With nobody there it pauses. When someone comes back after under 5 minutes it simply
  resumes; after longer it catches up at most 12 game hours, under the grace rules (ADR-0043 decision 6, ADR-0045
  decision 14; `OFFLINE_HIDDEN_MIN_MS`, `OFFLINE_CAP_HOURS`).
- **Your own aquarium waits:** opening the shared shop saves your own game; going back resumes it where it was, with no
  catch-up for the time away (ADR-0045 decision 6).
- **Everyone sees what the others do:** each action goes in the alerts list as the game's own message with the
  person's name in front; big ones pop up (ADR-0045 decisions 7, 11). Two people acting on one thing: **the first one
  wins**, and the second is told who (decision 8).
- **Listing photos stay, small and visible to everyone** (ADR-0045 decision 13).
- **Opened from the club's card in Social,** and from the title screen on a device that has opened one before
  (ADR-0045 decision 9).
- **Favourites are shared:** a favourite protects an animal from automation (ADR-0025), which is a rule of the shop, so
  it can't be one person's (the agent's reading).
- **A small server on Render runs it** (ADR-0043 decision 2): free first, "with plans to expand", within a 2 GB monthly
  data cap and a 400-hour monthly cap on its awake time (ADR-0045 decisions 3, 15). Paid plans, add-ons and new
  services wait for the owner's yes.
- **Not in the first version:** permission tiers and the money pool (ADR-0043 decision 5 keeps room for them, §5.6),
  more than one shop per club, members creating shops, deleting a shop from the game (the agent does it with SQL on the
  owner's request), trading between a shared shop and anyone's own game.

## 2. What the code does today

### 2.1 How the game changes

- **One store** (`src/state/game.ts`): `useGame.mutate(recipe)` runs an Immer recipe for player actions; `mutateFast`
  (`src/game/fastMutate.ts`) runs the game loop on a plain working copy and publishes with structural sharing;
  `setGame` replaces the world.
- **Player actions are closures.** `act((d) => buyOffer(d, offerId, tankId), …)` (`src/ui/panels/common/act.ts`,
  `src/ui/common/actions.ts`), `edit(fn)` and direct `mutate` calls: about 100 `act(` lines in 32 files, 11 `edit(` in
  7 and about 30 direct `mutate` sites in 16 (the review's count, 2026-10-20), reaching about 70 functions in `src/sim`,
  which `TRUST_BOUNDARY.md` lists. A closure can't be sent to a server. Some callers read the game right after an
  action (the feed's servings used, a new tank's id, whether more decor is in storage), and about 25 use `act`'s result
  at once.
- **Other writes:** `tutorialFlag()` (20 calls in 7 files), the `act(…, {flag})` option (about 15), the panel host's
  `opened_<panel>` flags (`PanelHost.tsx`) and the staff tab's `HiredFlagSync` effect write
  `progress.tutorial.flags`, which gate quests and unlocks even after the guide is done (`q_first_show` needs
  `opened_shows`, `q_first_staff` pays on `hired_staff`, the market's listings unlock on `opened_market`). Saving
  (`saveCurrentGame`, `saveCurrentGameSync`, which autosave calls when a tab hides or closes) and Hold all, Resume and
  Hold one (`flushBackgroundTanks`) flush every background tank through `mutateFast` first.
- **The game loop** (`src/game/GameLoop.tsx`) ticks 4 times a second and advances `0.25 s × 0.1 × speed` game hours
  (`GAME_HOURS_PER_REAL_SECOND = 0.1`: a game day is 4 real minutes at 1×), in slices of at most 0.25 game hours
  (`SLICE_HOURS`), and **stops early when a tick has used 10 ms** (the rest carries over as a backlog). The tank you're
  looking at runs at full detail (`tankLod`: `focusTankId`), the others in coarser pieces; a smoothing pass flushes
  background tanks while the time budget lasts; the starvation guard (`src/game/starvationGuard.ts`, its memory held in
  module variables) drops 3× and 10× to 1×. So two copies of one shop on two devices already step differently.
- **State outside the save:** the compatibility caches (`src/sim/compat`, `CACHE` and `PAIR_CACHE`, B-167) answer by a
  rounded signature that leaves out whether an animal is a hypothetical candidate, and the UI and commands (a sale's
  relocation, a line's set-up) ask them too; `reachCache` (`src/sim/facility/layout.ts`) is one entry keyed by a
  rounded layout signature, read by the visitors' step and the render layer; `world.ts`'s `lastWorld` clears the
  compatibility cache when the world object changes. The rarity, strain and colour memos are exact. `lastTickRealMs`,
  `lastSavedRealMs`, `createdRealMs`, `saveId` and `offlineGrace` are left out of `stateHash` (`HASH_EXCLUDED_KEYS`).
- **Rounding between engines:** JavaScript lets each engine round `Math.exp`, `pow`, `log`, `sin`, `cos`, `atan2`,
  `hypot`, `tanh`, `cbrt` and the other transcendental functions its own way, and they do. Measured on 2026-10-20
  (the review's `math-engines.mjs`, re-run by the agent): Node 22 and Chromium 153 differ in the last bit in about 10% of
  `exp` and `pow` results, 16% of `atan2` and 11% of `tanh` and `cbrt`; WebKit differs from both (38% of `hypot`).
  Only `+ − × ÷` and `Math.sqrt` agree everywhere. `src/sim` and `src/data` use the transcendental functions widely,
  and the `**` operator at 16 sites (5 with fractional exponents).

### 2.2 The offline catch-up

`simulateOffline(state, realElapsedMs)` (`src/persistence/offline.ts`) converts real time at 1× and caps it at 12 game
hours, then simulates it in 1-hour chunks under the grace rules (nothing dies; floors never make anything better), and
ends with a flush of every background tank. A game paused when saved accumulates nothing. It lives beside the store's
code (the module imports the stores, the slots and `mutateFast`), which a Node server can't import (§5.1).

### 2.3 How much a shop changes (the probe, 2026-10-20)

`scripts/_audit/shared/sync-probe.ts` (git-excluded) stepped the dev fixtures as a server would, 4 ticks a second, and
diffed each tick's state against the one before:

| Fixture | Tanks, animals | State (gzipped) | Changes per second, gzipped: 1×, one tank in full | 10×, one in full | 1×, all in full | Sim time per real second (M-series Mac), 1× / 10× |
|---|---|---|---|---|---|---|
| `playthrough_betta` (30 days played) | 3, 26 | 221 KB (38 KB) | 2.1 KB | 9.2 KB | 7.3 KB | 0.7 / 0.8 ms |
| `playthrough_axolotl` | 2, 8 | 186 KB (34 KB) | 2.7 KB | 8.9 KB | 4.5 KB | 0.8 / 0.8 ms |
| `big_facility` (late game) | 15, 337 | 608 KB (123 KB) | 36.8 KB | 75.7 KB | 140.2 KB | 8.8 / 16.6 ms |

Render's free plan includes **5 GB of outbound data a month for the whole workspace** (the static site and DAS-Games'
`dascade` too; WebSocket messages count) ([outbound bandwidth](https://render.com/docs/outbound-bandwidth)). Streaming
`big_facility`'s changes to one player at 10× would use about 270 MB an hour. So the server doesn't stream the shop.

## 3. How a shared shop stays in step

### 3.1 The model: every copy runs the same steps; the server's copy counts

- **The server holds the one copy that counts.** It advances the shop in **steps** it sizes, applies members'
  **commands** (§4) inside steps in the order they arrived, and sends each step to every member.
- **Each browser applies exactly the same steps** to its own copy, through the same code and the same arithmetic
  (§3.2), so it shows the shop live without the server sending the shop itself. A browser never changes the shared copy
  on its own: no local ticking, no local actions.
- **A command goes out at once in its own zero-hour step** (no game time passes), so an action appears after about a
  round trip; while the shop is paused, commands still apply this way.
- **Fingerprints catch any drift.** Every 10 real seconds a step carries the server's `stateHash` after it. A browser
  whose copy differs asks for the shop again (a **snapshot**: the gzipped save, 34 to 140 KB by §2.3) and carries on
  from it, within a budget (§5.3). A joiner starts from a snapshot.
- **Why this way:** a step message is about 100 bytes, so a player costs about 1 to 2 MB an hour, against 9 to 270 MB
  streaming the changes (§2.3, §11). The review's probes showed it works once every copy uses the same arithmetic: with
  the transcendental functions written in plain arithmetic, Node, Chromium and WebKit matched at all 33 fingerprints over
  1,344 steps on six fixtures at 1× and 10× (and the agent's re-run on two), with no measurable cost (`big_facility` at
  10×: 17.6 ms of sim per real second against 18.3 ms); with the engines' own functions they fell out of step within the
  first 10 seconds.

### 3.2 The rules that make every copy step identically

Each rule applies to shared shops; rule 1 also changes the solo game (its numbers move in the last digits).

1. **One arithmetic everywhere (`src/sim/dmath.ts`, chunk 11, unconditional).** `exp`, `log`, `log10`, `log2`, `log1p`,
   `expm1`, `pow`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `hypot` and `cbrt`
   are written with `+ − × ÷` and `Math.sqrt`, and `src/sim` and `src/data` use only them; a guard test bans the
   `Math` versions and the `**` operator there. Every seeded test shifts in the last digits, and each changed
   expectation says why (AGENTS.md). A cross-engine replay (Node, Chromium and WebKit replaying one step log) runs with
   the e2e suite and must find no mismatch, since browsers update themselves.
2. **The step block.** Every copy runs each step as one synchronous block, in this order: clear the compatibility
   caches and `reachCache`; apply the step's commands in order; advance the step's game hours with the step's
   full-detail list; apply the server's after-step changes (`post`); take the fingerprint if the step carries one.
   Clearing costs about 1 to 2 ms per real second on `big_facility` (the review's `perf-cache.ts`).
3. **The server sizes every step:** `0.25 s × 0.1 × speed` game hours (as the loop's tick), or zero for a command's
   own step, advanced with `advanceWorld` in its usual sub-steps, whole: no 10 ms early stop, no backlog.
4. **The server names the full-detail tanks.** `AdvanceOptions` gains `focusTankIds` (a list; `focusTankId` stays for
   solo). The list is the tanks members are looking at, at most 4 (most viewers first, then tank order). It goes in the
   `welcome`, with every snapshot, and in the first step after it changes, so a copy always knows it.
5. **No smoothing pass** (it depends on a time budget). Background tanks flush at their usual thresholds, and after a
   catch-up the flushes are staggered over the next steps by a rule that depends only on the state, so they don't all
   land in one step.
6. **What the loop does outside the step, the server decides and sends.** The starvation guard moves into `src/sim`,
   with its memory held per shop (not in module variables); its slow-down goes in `post`. `lastTickRealMs` is set from
   the server's clock on the server only (it is outside the fingerprint).
7. **No other write reaches the shared copy.** In a shared shop, saving and autosave stop before their flush, the hold
   actions' flush runs inside their command on every copy, `mutateFast` is used only by the loop and `sharedLoop`, and
   the error boundary doesn't pause (§7.3). Interface flags that rules read become rules or commands (§4.3).
8. **Each player's own marks stay off the shared copy:** the alerts' read marks and "Clear all", the notification
   settings (`notify.*`) and the shows' results-seen hour (§7.4). Chunk 11 lists every other "seen" write and its
   effect; one that gates a rule becomes a command.
9. **The server runs each shop in its own worker thread** (`node:worker_threads`, built into Node), so every
   module-level cache, index and registry belongs to one shop, as on a browser.
10. **Snapshots and saves are exact.** A shared copy holds no data URLs (photos are references, §4.4), and the server
    checks after each save that the saved copy's fingerprint matches its live copy's; if not (`serializeState` turns
    NaN into 0), it replaces its live copy with the saved one, sends everyone a snapshot and logs it as a bug. Keys
    whose value is `undefined` (which a snapshot drops) are covered by the mid-run joiner tests (§9.1).
11. **The "shared" mark lives outside `GameState`** (in the shared-shop store), so it never enters a fingerprint.

### 3.3 Messages

JSON text frames, except snapshots (a binary frame: the gzipped save JSON; a browser without `DecompressionStream`,
such as an older Safari, says so in `hello` and gets plain JSON). Names are short because they repeat.

Browser to server:

| Message | Meaning |
|---|---|
| `{t:'hello', token, build, club, plain?}` | Join: the player's Supabase access token, the build's identity (§5.1), the club |
| `{t:'create', token, build, club, name, starter}` | The owner creates the club's shop (refused for anyone else, or if the club has one), then joins it |
| `{t:'cmd', id, c}` | A command (§4), with the browser's own id for it |
| `{t:'view', tank}` | The tank this player is looking at (or `null`): feeds §3.2 rule 4 |
| `{t:'here'}`, `{t:'away'}` | The tab became visible, or hidden or idle (§5.5) |
| `{t:'input'}` | The player used the game (at most once a minute): keeps them "there" and keeps Render awake |
| `{t:'token', token}` | A refreshed access token (Supabase refreshes hourly); refused unless it names the same player |
| `{t:'resync'}` | My fingerprint differs: send the shop again |
| `{t:'grant', user, pause}` | The owner gives or takes pause and speed (§5.4) |

Server to browser:

| Message | Meaning |
|---|---|
| `{t:'welcome', you, members, n, full, catchUp?}` then a snapshot frame | Joined: who I am and may do, who's there, the step number the snapshot is at, the full-detail list, and the welcome-back summary if the shop just caught up |
| `{t:'steps', s:[{n, h, full?, cmds?, post?, fp?}]}` | Steps in order. A command's zero-hour step goes out at once; others are batched about once a second |
| `{t:'reject', id, why}` | Your command wasn't applied: not allowed (pause without permission), malformed, rate-limited, or it threw on the server (§5.2). A command the game refuses by its rules (no money, already sold) is applied as usual, so every copy gets the same refusal and the sender's own copy says why (§4.3) |
| `{t:'members', members}` | Who's there, who can pause, what each is looking at; at most one a second |
| `{t:'closing', why}` | The server is closing this connection: `cap`, `hours`, `full`, `build`, `updating`, `removed`, `elsewhere`, `fault`, `restart`, `outofstep` (§8) |

## 4. Commands: player actions as data

### 4.1 The catalogue

- `src/sim/commands/` (new, in the `sim` layer): `type Command` is a union of plain objects, one kind for each player
  action (about 70: `{k:'buyOffer', offer, tank}`, `{k:'feedTank', tank, food, zone?, target?}`, `{k:'setSpeed',
  speed}`, …), and `applyCommand(state, cmd, actor?) → CommandResult`, which calls the same `src/sim` function the
  closure called. `CommandResult` is the `ActionResult` plus what callers read afterwards today (`tankId`,
  `servingsUsed`, the storage counts), so no caller reads the game right after an action.
- **Arguments are only ids, numbers, strings, booleans and small plain objects** (a placement `{x, z, rotY, scale}`).
  What an action used to read from the UI goes in its arguments (`buyTank`'s `seeded`); what it read from the game is
  worked out again when it applies (DecorEditor's `owned`, `defaultWaterClass`), since the game may have moved on.
- **Composite actions are one command each:** a target feed and its `noteInteraction`; a hire and its flag; an action
  and its guide flag.
- `validateCommand(x)` checks a value from the network: a known kind, each argument's type and range, the total size.
  The server runs it on everything it receives.
- **Device-only actions aren't commands:** camera, panels, settings and §3.2 rule 8's marks (TRUST_BOUNDARY.md "Not
  for a server"). Dev commands aren't commands and are off in a shared shop.

### 4.2 Dispatch and the layers

- `render` and `ai` may not import `game`, and `game` may not import `ui` (ARCHITECTURE.md's layer table), so the
  dispatcher lives on the game store: `useGame.getState().dispatch(cmd, opts)`, installed at boot by `src/game`
  (solo) and swapped by `src/ui/shared` (a shared shop), the way `registerSettler` is installed. The transport lives in
  `src/ui/shared`; `sharedLoop` in `src/game` receives steps through a registered function, not an import of `ui`.
- **Solo stays synchronous:** `dispatch` runs `mutate((d) => applyCommand(d, cmd))` at once and returns the result, as
  `act` does today. **Shared** returns a pending result that settles when the step that applied it arrives and this
  copy has applied it; the `act` helpers' toasts, sounds and guide flags follow the result in both.
- **Controls that send many values** (the equipment slider "fires per pixel", the stock budget) are coalesced per
  control: at most about 4 a second, plus the value on release, with the control showing its local value until the step
  lands.
- `core-mutation-boundary.test.ts` grows: outside the dispatcher, the loop, `sharedLoop`, persistence's load and save,
  and `src/dev`, nothing calls `mutate` or `mutateFast`.
- The solo game must behave as before: chunk 11 changes no player-visible behaviour, and its tests prove each command
  does what its closure did (§9.1).

### 4.3 Who did it, first one wins, and flags

- In a shared shop each command carries its sender (`actor`: the member's id and name). Applying it tags the events it
  emits with `by`, on every copy (the log stays identical everywhere); each screen hides the pop-up for its own
  actions. An action that emits no event today gets one line, on every copy, also tagged. The alerts line is the
  event's own message with the name in front (ADR-0045 decision 11).
- **First one wins** (decision 8). The game's rules don't refuse most second actions by themselves (`moveCreature`
  doesn't check where the animal is now; two feeds both apply; settings are last-writer-wins), so **each command
  carries what its sender saw**: the animal's tank for a move, the offer's, listing's or bid's state, a setting's
  previous value. A command whose expectation no longer holds is refused on every copy, and when another member's
  command in the last 30 seconds touched the same thing, the message names them ("Sam already sold that fish.",
  "Sam already moved that fish."). Each copy keeps that short memory from the steps, so every copy says the same.
- **Flags that rules read become rules:** `hireStaff` raises `hired_staff` itself, and so on for each `{flag}` an
  action passes. Panels' `opened_<panel>` flags, which gate quests and unlocks, become one command (`openedPanel`); the
  server forwards only the first for each flag, so ten members opening the market send one. The guide's own steps don't
  run (no guide, ADR-0045 decision 5).

### 4.4 Listing photos (ADR-0045 decision 13)

- In a shared shop a listing photo is taken as today, then shrunk to about 320 pixels wide (WebP where the browser
  supports it, else JPEG, roughly 10 to 20 KB) and sent with `createListing` (that one command may be up to 48 KB).
- The server stores it once (`shared_photos`, §6.1), keyed by its content's hash, and puts a reference (`p:<hash>`)
  in the command it forwards, so every copy, the sender's too, holds the reference, never the picture, and the photo's
  usual boost applies as today (the rules read only that a photo exists). Browsers show it from the server
  (`GET /photo/<club>/<hash>`, cacheable forever) and fetch it only when it's on screen.
- When the game prunes a listing's photo (the closed listings keep only the newest few), the server deletes the stored
  picture at its next save if nothing refers to it.

## 5. The server

### 5.1 Code, build and identity

- **`server/`** (new, top level, outside `src/`): Node 22, TypeScript, built with the repo's own Vite (`vite build
  --ssr server/main.ts --outDir dist-server`), so no new build tool. It imports `src/types`, `src/data`, `src/sim` and
  the pure persistence modules **directly** (`src/persistence/serialize.ts`, `hash.ts`, `schema.ts`,
  `migrations.ts`; the `@/persistence` index also re-exports the stores and IndexedDB code), never `src/state`,
  `src/game`, `src/ui` or anything with React; a boundary test checks it. The catch-up's rules move out of
  `src/persistence/offline.ts` into a pure module (`src/sim/catchUp.ts`), the store-facing part staying where it is.
- **`ws` 8.22.0** (ADR-0045 decision 2) is its only dependency, installed with chunk 10's test server; the few types it
  needs are declared in `server/ws.d.ts` (no `@types/ws`). Its `maxPayload` is set to 48 KB (the default is 100 MiB).
  Database calls use Node's `fetch` with the server's key; gzip uses `node:zlib`.
- **Files:** `main.ts` (HTTP: `/health` with CORS for the game's sites, `/photo/…`; the WebSocket upgrade at `/shop`;
  the origin check; SIGTERM saves every room), `room.ts` (one shop's worker: its copy, steps and members),
  `rooms.ts` (the workers), `auth.ts` (the token check), `store.ts` (the database calls), `usage.ts` (the meters),
  `config.ts` (environment), `stub.ts` (in-memory storage and accounts for tests and dev: `SHOPS_STUB=1`).
- **The build's identity** is a hash of the simulation's sources (`src/sim`, `src/data`, `src/types`), the
  `SCHEMA_VERSION` and a protocol number, stamped by a Vite plugin into both the game and the server. Builds that differ
  only elsewhere (the interface, the docs, a server-only fix) still play together. A browser whose identity differs from
  the server's is told to reload when the server is newer (`build`) and to try again later when the server is older
  (`updating`, while a deploy is in flight).
- **Releases deploy the server first,** then the static sites. Pages deploys on every push to `main` and the Render
  static site has `autoDeploy: true`, so the server goes out before `main` moves (chunk 12 writes the steps into
  PLAN.md's release procedure). Adding the service to `render.yaml` could create it on a Blueprint sync; chunk 10 checks
  how this workspace's Blueprint syncs before adding it.

### 5.2 A room's life

1. **Wake:** the first `hello` for a club whose shop isn't loaded. The server takes the shop's **lease** (§6.2),
   starts the shop's worker, loads and repairs the shop, and catches up: the time since the shop emptied (`left_at`;
   after a crash, `saved_at`), nothing under 5 minutes or if it was paused, else at 1× capped at 12 game hours, under
   the grace rules (§2.2). The joiners see "Catching up…" meanwhile.
2. **Running:** while at least one member is there, the worker steps 4 times a second at the shop's speed and runs
   each command in its own zero-hour step at once; every 10 seconds a step carries the fingerprint.
3. **A failing command:** before a command's step, the worker applies it to a scratch copy (caches cleared before and
   after). If it throws, it is left out and its sender gets `reject`; nobody else is affected. A failing time step
   (not a command) is dropped whole and retried next tick; three in a row stop the shop with `closing: fault`, after
   saving the last good copy.
4. **Saving:** every 3 minutes of play, when the last member leaves, and on SIGTERM; the saved copy is the live copy
   (no flush), serialized and gzipped as the online save is. A Render restart can lose at most the minutes since the
   last save; members are told (`closing: restart`, §8).
5. **Empty:** with nobody there the worker stops stepping, saves (recording `left_at`) and keeps the room for 15
   minutes; someone back within them gets the same catch-up rule as a wake. Then it ends, and the lease is released.
   Render sleeps the server 15 minutes after the last message it received.

### 5.3 Joining, signing in and limits

- The browser first calls `GET /health` (CORS-enabled) to wake the server (a cold start takes about a minute; §8 says
  so), then opens `wss://…/shop`.
- **Origin:** only the game's sites (`https://graygrayson1.github.io`, `https://aquarium-go.onrender.com`) and, in dev
  and tests, `http://127.0.0.1:<port>`.
- **The token:** the server asks Supabase who it is (`GET {project}/auth/v1/user` with the publishable key and the
  player's token) and caches the answer until the token expires.
- **Membership:** `server_member(user, club)` (§6.3) says whether they're in the club, their name, whether they're the
  owner and whether they may pause. The server checks again every 15 minutes; a member taken out of the club gets
  `closing: removed`.
- **Limits:** at most 10 connections per shop (the 11th gets `closing: full`); one per player (a second tab takes over;
  the first gets `closing: elsewhere`); messages at most 16 KB (48 KB for a listing with a photo); at most 10 commands
  and 30 messages a second per connection (over that, `reject`, then close); `view` changes count at most one a second.
- **Snapshot budget:** at most 3 snapshots per connection in 10 minutes, and 6 per member in an hour. Past that, or
  after 3 re-syncs in a row that didn't hold, the connection closes with `closing: outofstep` (§8), so a copy that
  can't stay in step can't drain the data cap.

### 5.4 Who may do what

- **Everyone in the club** may send every command except those below (ADR-0043 decision 5).
- **Pause and speed** (`setSpeed`): the owner (the shop's creator; only the owner creates shops, ADR-0043 decision 3)
  and the members in the shop's `pausers` list.
- **`grant`:** the owner only. The list is saved with the shop.
- One function, `allowed(member, cmd, shop)`, decides, so §5.6's tiers can come later without touching the rest.

### 5.5 Who's there

- A connection is **there** after `here` and until `away`, a dropped connection, or 30 minutes with no `input`
  (ADR-0045 decision 4). The browser sends `away` when the tab is hidden, and after 30 minutes without input it shows
  "Still here?" and sends `away` if nobody answers in a minute (§7.5). A command from a member who isn't there brings
  them back.
- A hidden tab stays connected for 2 minutes (a quick switch to another app costs nothing), then disconnects; showing
  the tab again reconnects with a snapshot. Commands in flight across a reconnect are dropped and the sender's control
  shows that nothing changed.
- The shop runs while at least one member is there. The server never steps for members who aren't.

### 5.6 Room for permission tiers (later, ADR-0043 decision 5)

The shop row's `pausers` becomes a per-member permissions object (`{pause, spend: 'all' | 'request' | 'allowance',
allowance}`), the money pool and requests become commands, and `allowed` reads them. Nothing in the first version
assumes everyone may spend, apart from `allowed` itself.

### 5.7 The caps and the meters

- The server counts the bytes it sends (WebSocket frames, photos and the bodies of its database calls), times 1.4 for
  the WebSocket, TLS and TCP/IP overhead on small frames, and its awake seconds, per calendar month (UTC), saving them
  with each save (`server_usage_add`, §6.3).
- **At 2 GB of data in a month** (ADR-0045 decision 3) it refuses new joins (`closing: cap`) and saves and closes the
  running rooms. **At 400 awake hours** (decision 15) it does the same with `closing: hours`. The club card says when
  they open again (§8). Both counts start again on the 1st.
- The owner's shop card shows the month's data and awake hours (Render's 750 free hours are shared with `dascade`).

### 5.8 Render and the key

- A new **free web service**, `aquarium-go-shops`, in the Virginia region (beside Supabase's us-east-1), from this
  repo: build `npm ci --include=dev --ignore-scripts && npm run build:server` (chunk 10 checks that the build still
  works without install scripts), start `node dist-server/main.js`, health check `/health`, `NODE_VERSION` 22,
  deployed by hand. Created only with the owner's yes.
- **Environment:** `SUPABASE_URL` and the publishable key (public), `ALLOWED_ORIGINS`, and **`SUPABASE_SECRET_KEY`,
  which the owner pastes in** (ADR-0045 decision 1), in chunk 12 (chunk 10's test runs on stub storage and needs no
  key): a new secret key made for this server in Supabase's dashboard (Project settings › API keys), so it can be
  switched off alone. The agent never sees, prints or saves it, and it never enters the repo.
- **The key's reach.** A Supabase secret key acts as `service_role`, which by Supabase's default privileges has every
  right on every table and function in `public` and bypasses row-level security: as it stands it could read and write
  every player's saves, profiles, clubs and friend links. So chunk 12's migration revokes `service_role`'s rights on
  the stage 1 tables and functions and grants it only `EXECUTE` on the `server_*` functions (§6.3), and the security
  advisors and a test check it. Render may expose environment variables to builds, so the build runs no install
  scripts (above) and chunk 12 checks what the build sees.
- The game's address for the server goes in `src/social/project.ts` beside the Supabase project (`SHARED_SHOP_SERVER`),
  `null` until the service exists.

## 6. The database

A new migration (never an edit of an applied one), applied to the live project with the owner's yes, after the local
database check (`scripts/online-db-local`) passes; then the security advisors and the live smoke test.

### 6.1 Tables (row level security on; no access for `anon` or `authenticated`)

- **`shared_shops`**: `club_id` (primary key, references `clubs`, cascade: one per club), `shop_name` (1 to 60),
  `created_by`, `created_at`, `pausers uuid[]`, `revision`, `schema_version`, `build`, `saved_at` (real ms), `left_at`
  (real ms when it emptied; null while running), `hour`, `day`, `money`, `encoding`, `body` (at most 4,000,000
  characters, as the online save), `lease_holder`, `lease_until`, `updated_at`.
- **`shared_photos`**: `club_id`, `hash` (primary key with the club), `mime` (`image/webp` or `image/jpeg`), `data`
  (base64, at most 64,000 characters), `created_at`; cascade with the shop.
- **`shared_usage`**: `month` (`YYYY-MM`, primary key), `bytes_out`, `awake_seconds`, `updated_at`.

### 6.2 The lease

`server_shop_take(club, holder, until)` takes the lease when it is free or expired (one statement, so two instances
can't both win). The holder renews it every 30 seconds for 90, on its own timer, and releases it when the room ends.
A joiner who reaches an instance while another holds the lease gets `closing: updating`. A server whose save is
refused because another holder has the lease closes the room with `closing: restart`.

### 6.3 Functions

- **For the game** (as in stage 1: `public` wrappers that call `private` functions checking `auth.uid()`):
  `club_shared_shops()` (for each club I'm in: whether it has a shop, its name, day, money and when it was last played;
  never the body) and `shared_usage()` (the owner only: this month's data and awake hours, and both caps).
- **For the server only** (granted only to `service_role`, after §5.8's revokes): `server_member`, `server_shop_get`,
  `server_shop_create` (the owner only, one per club), `server_shop_put` (checks the lease and the revision),
  `server_shop_take`, `server_shop_release`, `server_set_pausers`, `server_photo_put`, `server_photo_get`,
  `server_photos_prune`, `server_usage_add`.
- A save from a newer schema is never loaded past or overwritten (PERSIST-014): the server refuses to load it
  (`closing: updating`) until it runs a build that can.

## 7. The client

### 7.1 Where things go

| File | What |
|---|---|
| `src/sim/dmath.ts` (new) | §3.2 rule 1 |
| `src/sim/commands/*` (new) | The catalogue, `applyCommand`, `validateCommand` (§4) |
| `src/sim/catchUp.ts` (new) | The catch-up's rules, moved from `src/persistence/offline.ts` (which keeps the store-facing part) |
| `src/sim/starvation.ts` (new) | The starvation guard's rule, with its memory passed in (§3.2 rule 6); `src/game/starvationGuard.ts` keeps the solo memory |
| `src/state/game.ts` | The installed dispatcher (§4.2) |
| `src/game/dispatch.ts`, `src/game/sharedLoop.ts` (new) | The solo dispatcher; applying the server's steps through §3.2's step block, checking fingerprints |
| `src/social/service.ts`, `localStub.ts`, `supabase/*` | `sharedShops()` and `sharedUsage()` (§6.3), in the stub too |
| `src/social/project.ts` | `SHARED_SHOP_SERVER` |
| `src/ui/shared/*` (new) | The connection (the browser's own `WebSocket`, no library) and its store, the club card, the title button, the HUD strip, "Still here?", the members list, the messages |
| `server/*` (new) | §5 |

The connection lives in `src/ui` (it touches the store and the save), like the online save; `social` stays free of the
store. `server` is a new top-level folder: ARCHITECTURE.md's layer table and `core-architecture-boundaries` gain it on
purpose.

### 7.2 Opening a shared shop

1. From the club's card in Social, or the title screen's "Shared shop: {name}" button (shown on a device that has opened
   that shop before; ADR-0045 decision 9).
2. **Your own game waits** (ADR-0045 decision 6): it is saved to its slot first (with its online copy, as any save),
   and the device records which save it was and, while the shared shop is open, a heartbeat of the time.
3. The browser wakes the server, connects and gets the snapshot; the game shows the shared shop. The shop has its own
   id (`shared_<club>`), so it never matches a local slot.
4. **Leaving** ("Back to my aquarium", or the connection closing for good) loads your own save again with no catch-up
   for the time away (its `lastTickRealMs` is moved forward by the time spent in the shared shop before it resumes), or
   goes to the title screen if you came from there. If the browser was closed inside the shared shop, the next load of
   that save leaves out the recorded shared time the same way.

### 7.3 What changes inside a shared shop

- **The game loop doesn't tick;** `sharedLoop` applies the server's steps. Pause and speed work for those allowed and
  say who can for the rest (§8). The hidden-tab catch-up and the welcome-back card's own pause don't run (the server
  catches up and sends the summary, which the card shows).
- **Nothing saves on the device:** autosave, Save, Load, Import and Export, the online save and the leaderboard report
  all refuse a shared shop before doing anything (each has a guard and a test). Settings › Saves shows a line and "Back
  to my aquarium" instead.
- **No guide** (ADR-0045 decision 5): the shop starts with the guide finished, and the coach is hidden.
- **No dev panel or `?dev=1` writes.**
- **The HUD** shows the shop's name, who's there and the way back (§8).
- **Photo mode, feeding, decor, lines, staff, research, shows and the market** all work, through commands.
- **Others' feeds, taps and decor changes show** their particles and ripples on every screen looking at that tank: an
  applied command fires the same visual hooks (`aiFeed`, the tap ripple) as a local one.
- **The interface's error boundary** leaves the shop (it pauses a solo game; it mustn't pause everyone's).

### 7.4 Each player's own marks

The alerts' read marks and "Clear all", `notify.*` and the shows' results-seen hour are kept per player and shop in
`localStorage` (wrapped in try/catch), beside the shared copy, and read over it. Losing them only re-shows old alerts.

### 7.5 "Still here?"

After 30 minutes without input in a visible tab, a small box asks "Still here?"; answering keeps you there; a minute
without an answer marks you away (and the shop pauses if you were the last). Any input afterwards brings you back.

### 7.6 Falling behind, reconnecting

- A browser more than 10 seconds behind the server's steps (a slow phone at 10× with several tanks in full detail)
  takes a snapshot, within §5.3's budget, and says so ("Your device can't keep up…", §8); chunk 10 measures how often.
- A dropped connection retries with growing waits (1 s to 30 s, never while the tab is hidden), and gets a snapshot.
- A closing explains what happened and goes back (§8); `build` offers Reload.

## 8. Screens and words (approved, ADR-0045 decisions 10 and 15)

`{shop}`, `{name}`, `{owner}`, `{club}`, `{day}`, `{money}`, `{used}`, `{hours}`, `{date}`, `{time}`, `{minutes}` fill
in from the game.

| Where | Words |
|---|---|
| Club card, no shop, the owner | **Shared shop** — "Play one aquarium together, live, with up to 10 club members." [Create shared shop] |
| Club card, no shop, a member | "No shared shop yet." |
| Club card, a shop | **{shop}** — "Day {day} · {money}" [Open shared shop] |
| Club card, the owner's meter | "This month: {used} of 2 GB · server awake {hours} h" |
| Title screen (a device that has opened it) | "Shared shop: {shop}", under Continue |
| Creating (the owner) | The new-game naming and starter screens, titled "New shared shop", then "Your club can open it from Social." |
| Opening | "Saving your aquarium…", then "Waking the shared shop… This takes about a minute when nobody's been in for a while.", then "Catching up on the time nobody was here…" |
| First time in | "Your own aquarium is saved and waits for you. Everything here is shared with {club}." [Got it] |
| HUD strip | "Shared · {shop} · Here: {name}, {name}" [Back to my aquarium] |
| Pause or speed, not allowed | "Only {owner} and the people they choose can pause or change the speed." |
| Members list (the owner) | Each member there, with a switch "Can pause and change speed" |
| Others' actions (pop-ups) | "{name} paused the shop." · "{name} set the speed to 3×." · a sale or a purchase over $100: "{name}: Sold the clownfish pair for $240." |
| Alerts list line | "{name}: Bought 3 neon tetras for $36." (the action's own message, the name in front) |
| First one wins | "{name} already sold that fish." (and "moved that fish", "bought that offer"…) |
| Still here? | "Still here? The shared shop pauses when nobody's playing." [I'm here] |
| Closing: cap | "Shared shops have used this month's free data (2 GB). They open again on {date}." |
| Closing: hours | "Shared shops have used this month's free server hours. They open again on {date}." |
| Closing: full | "The shared shop is full (10 people). Try again soon." |
| Closing: build | "A new version of Aquarium Go is out. Reload to join the shared shop." [Reload] |
| Closing: updating | "The shared shop is updating. Try again in a few minutes." |
| Closing: removed | "You're no longer in {club}, so you can't open its shared shop." |
| Closing: elsewhere | "You opened this shared shop in another tab." |
| Closing: fault | "The shared shop hit a problem and stopped. It's saved as of {time}." |
| Closing: restart | "The shared shop's server restarted, so it went back to its last save ({minutes} minutes ago)." |
| Closing: outofstep | "Your game keeps falling out of step with the shared shop, so it stopped. Reload to try again." [Reload] |
| Connection lost | "Lost the connection to the shared shop. Reconnecting…" |
| Catching up (a snapshot) | "Catching up with the shared shop…" |
| A slow device | "Your device can't keep up with the shared shop at this speed, so it keeps catching up. Someone who can change the speed could slow it down." |

Any other player-visible words a chunk needs go to the owner first.

## 9. Tests

### 9.1 Unit (`npm test`)

- **One arithmetic:** each `dmath` function against a reference over wide ranges (error bounds, special values: ±0,
  ±Infinity, NaN, subnormals); the guard test (§3.2 rule 1); every seeded test that shifts says why.
- **Commands:** for each kind, applying the command gives the same `stateHash` as calling its `src/sim` function
  directly; every command survives `JSON.parse(JSON.stringify(cmd))` unchanged; `validateCommand` refuses wrong
  kinds, types, ranges and sizes; each expectation (§4.3) refuses when it no longer holds and names the earlier
  member; composite actions are one command; `core-mutation-boundary`'s new rule (§4.2).
- **Lockstep in one process:** a server room and two client copies (`sharedLoop`) on `playthrough_betta` and
  `big_facility`, two game weeks at 10×, with commands from both and UI-style reads (the compatibility engine, reports,
  `reachCache` users) between steps on one copy, and joiners from snapshots taken mid-run: every fingerprint matches.
  A copy changed by hand is caught at the next fingerprint and re-synced.
- **The server, in process, with `SHOPS_STUB=1`,** Node's built-in `WebSocket` as clients: join and snapshot (with the
  full-detail list); commands reach every copy; pause refused without permission and allowed after `grant`; first one
  wins with the right name; a throwing command rejected to its sender only; the shop pauses when the last member goes
  away and catches up (none under 5 minutes, capped at 12 game hours, from `saved_at` after a crash) when one comes
  back, also into a still-loaded room; 10 at once, the 11th refused; a second tab takes over; a wrong build (newer and
  older), origin, token or token user refused; a member removed from the club closed; both caps close rooms and refuse
  joins; the meters count; the snapshot budget closes a looping copy; the lease refuses a second holder and is renewed
  on its timer; SIGTERM saves; a newer schema's save refused; two rooms in one process keep their own caches (workers);
  photos stored once, served, pruned.
- **Guards:** every save path refuses a shared shop before its flush; `server` imports only what §5.1 allows; the
  migration's rules (no browser access; `service_role` only on the `server_*` functions), in `supabase-migration.test.ts`
  and the local database check.

### 9.2 e2e (Chromium and WebKit; the stub server, never the live one)

Playwright starts the stub server beside Vite. Two browser contexts in one shop: a purchase in one appears in the other;
pause refused, then granted; the activity line and pop-up; first one wins; a listing photo shows on both; leaving
brings your own game back unchanged, with no catch-up; "Still here?"; reconnect after the server restarts. **The
cross-engine replay** (§3.2 rule 1): one step log replayed in Node, a Chromium page and a WebKit page on `big_facility`
and a playthrough at 1× and 10×: no mismatch. Firefox isn't in the suite; `dmath` makes it the same arithmetic.

### 9.3 The live smoke (by hand, after deploys)

`scripts/shared-smoke.mjs`: a throwaway club and its shop are made with the server-only functions through the
Supabase CLI (scoped to the project, run by the agent with the owner's yes in that session); the stage 1 test account
joins it on the live server, sends commands, checks fingerprints, a photo and a refused pause; then the club, shop and
photos are removed and the script checks nothing is left.

## 10. The chunks

Each chunk follows CLAUDE.md: built on `next`, the four checks on the final code, one fresh reviewer (Opus at max
effort) with the brief and the diff, its blockers fixed, PLAN.md updated, `next` pushed. Nothing reaches players until
the owner says release.

- **Chunk 10, the test.** Local first: `dmath` written for real, the step block, and a throwaway room and `sharedLoop`
  prototype, to check §3.2 in one process; the cross-engine replay in Node, Chromium and WebKit for a game week at
  10× on several fixtures (expected: no mismatch); bytes per player-hour, per command and per save; the worker's time
  per step. Then, **with the owner's yes, on Render:** create the free service (stub storage, no database key) and
  deploy the prototype; measure the wake time, the time per step on 0.1 CPU (on Render's x86-64, also confirming the
  replay there) and a real two-browser session; check the build without install scripts and what Render exposes to
  builds. Installs `ws`. Writes the numbers into §11. No player-visible change.
- **Chunk 11, one arithmetic and commands.** §3.2 rule 1 for the whole game (every seeded test's shift explained), §4,
  and §3.2's other sim changes (`focusTankIds`, the step block, `catchUp.ts`, the starvation rule, the flags), with no
  other player-visible change; the full test pass guards the solo game. Can ship alone (0.5.7) if the owner wants.
- **Chunk 12, the server and the database.** §5 and §6: `server/`, the migration with the `service_role` revokes
  (applied live with the owner's yes), the owner's key pasted into Render, the stub, the server's tests, the deploy, the
  release order written into PLAN.md, and the live smoke.
- **Chunk 13, the screens and the play-test.** §7 and §8 with the approved words, the e2e tests, then a play-test with
  the owner and their daughter on the live server before release (0.6.0, with the owner's go-ahead).

## 11. Costs and limits (estimates until chunk 10 measures them)

- **Money: $0.** Render's free web service and Supabase's free project. Nothing paid without the owner's yes.
- **Data**, counted with the 1.4 overhead factor:
  - steps: about 1.4 MB per player-hour (about 100 bytes, once a second, plus a zero-hour step per command, each a few
    hundred bytes, to every member);
  - a snapshot of 34 to 140 KB per join, reconnect or re-sync;
  - the shop's saves, every 3 minutes: about 1 to 3.3 MB an hour per shop;
  - photos: each sent once to the server and fetched once by each member who sees it (10 to 20 KB each).
  - Two people for an hour: about 4 to 7 MB, so the 2 GB cap is roughly 300 to 500 hours. Ten people: about 20 to 40 MB
    an hour (each command's step goes to ten). The static site and `dascade` share the 5 GB.
- **Hours:** the server is awake only while someone is there, plus 15 minutes, up to the 400-hour cap; Render's 750
  free hours are shared with `dascade`, and the owner's card shows the server's share. If they ran out, Render would
  suspend both free web services until the next month; the static sites keep working.
- **CPU:** a free instance has 0.1 CPU. A small shop's steps cost about 1 ms of Mac time per real second; `big_facility`
  at 10× about 17 ms, which may be a large share of 0.1 CPU, and a 0.1 CPU limit usually means about 10 ms of work in
  every 100, so a longer step waits. Chunk 10 measures it on Render; if a shop can't keep up, the server lowers its top
  speed and says so (new words for the owner), and a paid instance is the owner's call.
- **Each device** simulates the shop as in solo play, plus up to 4 tanks in full detail instead of 1.
- **Latency:** an action appears after about a round trip (its zero-hour step goes out at once), plus any throttling
  on the server.

## 12. Requirements (to add to REQUIREMENTS.json with each brief)

| Id | Requirement |
|---|---|
| SHARE-001 | Every player action is a serializable command; the solo game behaves as before (chunk 11) |
| SHARE-002 | One arithmetic: copies stepped by the same steps and commands keep identical fingerprints in Node, Chromium and WebKit, with no mismatch (§3.2) |
| SHARE-003 | The server is the only writer of a shared shop; the browser touches no table; the server's key never enters the repo and reaches only the `server_*` functions (ADR-0045 decision 1) |
| SHARE-004 | One shop per club, created by the owner, named, with a starter; normal money; no guide |
| SHARE-005 | Club members join, at most 10 at once, one connection each; others are refused |
| SHARE-006 | Pause and speed only for the owner and the chosen members; the owner grants and removes it |
| SHARE-007 | Every other action is open to every member (first version) through one permission function |
| SHARE-008 | "There": visible and used in the last 30 minutes, with "Still here?"; the shop runs only while someone is there |
| SHARE-009 | Empty and back: no catch-up under 5 minutes or if paused, at most 12 game hours under grace otherwise |
| SHARE-010 | Your own game is saved on opening and resumes unchanged, with no catch-up for the time away, even after the browser closed inside the shared shop |
| SHARE-011 | Nothing saves a shared shop on the device or online as a player's save; nothing carries over; not on the leaderboards |
| SHARE-012 | Every member's action appears in everyone's alerts as its own message with their name; big ones pop up for the others |
| SHARE-013 | First one wins: commands carry what their sender saw, and the second sender is told who changed it |
| SHARE-014 | The 2 GB data cap and the 400-hour cap close shops until the 1st and say so; the owner sees both meters |
| SHARE-015 | Saves every 3 minutes, on emptying and on shutdown; a restart loses at most that, and says so; the lease keeps one server per shop |
| SHARE-016 | Builds play together when their simulation, schema and protocol match; otherwise reload or "updating"; a newer schema's shop is never loaded past or overwritten |
| SHARE-017 | A failing command affects only its sender; the snapshot budget stops a copy that can't stay in step |
| SHARE-018 | Listing photos in a shared shop are small, seen by every member, and stored once |

## 13. Things to know

- **The owner's steps** (each when its chunk needs it): a yes to create the Render service (chunk 10); a yes to apply
  the migration live and the secret key pasted into Render (chunk 12, about 2 minutes, walked through); the release
  (after the play-test). The owner's daughter needs an account: she signs up with the club's invite link; sign-up is
  for 13 and over, and a parent signs up for a younger player (ADR-0039 decision 4).
- **Trust and the stages:** the first version trusts club members to do anything a member may (ADR-0043), but no
  member's browser can change the shop except through commands the server checks, applied by the game's own rules on
  the server's copy. That is stage 2's model (ADR-0038) for shared shops, ahead of the solo game; chunk 12 adds a short
  shared-shops section to TRUST_BOUNDARY.md and DEBT_INVENTORY.md. Stage 3 (trading, a shared market, shows between
  players) isn't touched.
- **Render may restart a free service at any time** and has no disk: the database holds the shop, and §5.2's saves
  bound the loss.
- **A free Supabase project pauses after a week with no activity;** playing keeps it active.
- **Saves grow** (sold animals stay in the save, DEBT_INVENTORY): a big shop's snapshot is about 140 KB gzipped; the
  body's 4,000,000-character limit is the online save's. Photos are kept apart (§4.4).
- **If the owner later wants the game itself on the server** ("ideally the game would be able to run on the server"),
  this is the same model: the server's copy counts and the browser shows it.
