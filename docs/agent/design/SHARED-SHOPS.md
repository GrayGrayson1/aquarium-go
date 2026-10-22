# Shared shops: the design chunks 10 to 13 build

Written 2026-10-20 by Chase, after reading the store and the game loop (`src/state/game.ts`, `src/game`), the player
actions (`src/ui/panels/common/act.ts`, `src/ui/common/actions.ts`, every `mutate` call), the simulation's step
(`src/sim/world.ts`, `src/sim/time.ts`), the offline catch-up (`src/persistence/offline.ts`), the save fingerprint
(`src/persistence/hash.ts`), the online tables (`supabase/migrations`) and Render's free-plan pages, and after a probe of
how much a shop changes per second (§2.3). Revised the same day after a fresh review (Opus at max effort, with probes in
the internal-disk clone's `scripts/_audit/review-shared/`, git-excluded): its two blockers and thirteen major findings
are folded in below, and so are its confirmation pass's one blocker (the save repair deleted photo references) and
three majors (the step block's identity and atomicity, expectations against one's own commands, the build identity
and release order). It turns ADR-0043 (shared shops: what, who, pause, empty, carry-over) and ADR-0045 (the server
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
  5); **pause and speed** belong to the owner and the members the owner chooses (decision 4). Since chunk 14, each
  member spends the shop's money within the tier the owner sets (ADR-0050, §5.6).
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
- **Not in the first version:** permission tiers and the money pool (ADR-0043 decision 5; built in chunk 14, §5.6),
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
  (Two runs of the probe gave 16 to 18% for `atan2` and 8 to 11% for `cbrt`.) Only `+ − × ÷` and `Math.sqrt` agree
  everywhere. `src/sim` and `src/data` use the transcendental functions widely,
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
  from it, within a budget (§5.3). A joiner starts from a snapshot. What the fingerprint can't see (chunk 10's
  review): the order of an object's keys, keys whose value is `undefined`, and -0 against 0, so a copy can differ there
  and still match; rule 10 says what keeps those harmless.
- **Why this way:** a step message is about 100 bytes, so a player costs about 1 to 2 MB an hour, against 9 to 270 MB
  streaming the changes (§2.3, §11). The review's probes showed it works once every copy uses the same arithmetic: with
  the transcendental functions written in plain arithmetic, Node, Chromium and WebKit matched at all 33 fingerprints over
  1,344 steps on six fixtures at 1× and 10× (and the agent's re-run on two), with no measurable cost (`big_facility` at
  10×: 17.6 ms of sim per real second against 18.3 ms); with the engines' own functions they fell out of step within the
  first 10 seconds.

### 3.2 The rules that make every copy step identically

Each rule applies to shared shops; rule 1 also changes the solo game (its numbers move in the last digits).

1. **One arithmetic everywhere (`src/sim/dmath.ts`, chunk 10, unconditional).** `exp`, `log`, `log10`, `log2`, `log1p`,
   `expm1`, `pow`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `hypot` and `cbrt`
   are written with `+ − × ÷` and `Math.sqrt`, and `src/sim` and `src/data` use only them; a guard test bans the
   `Math` versions and the `**` operator there. The review ran all 236 test files (2,868 tests) with its
   pure-arithmetic shim active in every Vitest worker and they passed unchanged, so few seeded tests should shift; any
   that do say why (AGENTS.md). A cross-engine replay (Node, Chromium and WebKit replaying one step log) runs with the
   e2e suite and must find no mismatch, since browsers update themselves.
2. **The step block.** One function in `src/sim` (`runSharedStep`), used by the server's worker and by `sharedLoop`
   alike, runs each step as one synchronous block on a **working copy**, in this order: pin the world's identity (a
   `world.ts` helper sets `lastWorld` to this copy, so no later `enterWorld` in the block clears anything) and clear
   the compatibility caches and `reachCache`; apply the step's commands in order; advance the step's game hours with
   the step's full-detail list; apply the server's after-step changes (`post`). On success the working copy becomes
   the copy; if anything throws, the block is discarded whole (§5.2 item 3). Clearing costs about 1 to 2 ms per real
   second on `big_facility` (the review's `perf-cache.ts`). The fingerprint is taken from the resulting copy: on the
   server at once; in a browser in idle time after the step is published (`stateHash` takes about 9 ms on
   `big_facility` on a Mac, more on a phone), and compared with the step's.
3. **The server sizes every step:** `0.25 s × 0.1 × speed` game hours (as the loop's tick), or zero for a command's
   own step, advanced with `advanceWorld` in its usual sub-steps, whole: no 10 ms early stop, no backlog.
4. **The server names the full-detail tanks.** `AdvanceOptions` gains `focusTankIds` (a list; `focusTankId` stays for
   solo). The list is the tanks members are looking at, at most 4 (most viewers first, then tank order). It goes in the
   `welcome`, with every snapshot, and in the first step after it changes, so a copy always knows it.
5. **No smoothing pass** (it depends on a time budget). Background tanks flush at their usual thresholds, and after a
   catch-up, Hold all, Resume or Hold one the flushes are staggered over the next steps by a rule that depends only on
   the state, so they don't all land in one step. (Chunk 11 left the stagger to chunk 12: it changes no copy's
   agreement, only the server's busiest steps, so it is built and measured with the server's other speed work, §11.)
6. **What the loop does outside the step, the server decides and sends.** The starvation guard moves into `src/sim`,
   with its memory held per shop (not in module variables); its slow-down goes in `post`. (Chunk 11:
   `src/sim/starvation.ts`, `checkStarvation(state, memory)`; the solo loop keeps its memory in
   `src/game/starvationGuard.ts`.) `lastTickRealMs` is set from
   the server's clock on the server only (it is outside the fingerprint).
7. **No other write reaches the shared copy.** In a shared shop, saving and autosave stop before their flush, the hold
   actions' flush runs inside their command on every copy, `mutateFast` is used only by the loop and `sharedLoop`, and
   the error boundary doesn't pause (§7.3). Interface flags that rules read become rules or commands (§4.3). (Chunk 11:
   the hold functions already settle the background tanks themselves, ADR-0026 decision 5; the solo dispatcher's
   flush before them is only a speed-up on the plain copy, which a shared dispatcher skips.
   `core-mutation-boundary` checks the writers, §4.2.)
8. **Each player's own marks stay off the shared copy:** the alerts' read marks and "Clear all", the notification
   settings (`notify.*`) and the shows' results-seen hour (§7.4). Chunk 11 lists every other "seen" write and its
   effect; one that gates a rule becomes a command. (Chunk 11: `src/ui/common/marks.ts` is the only way the interface
   writes them, with the list: the log's read mark and Research's "seen" join them, and none gates a rule; the panels'
   `opened_<panel>` flags and `hired_staff` do, so they're commands.)
9. **The server runs each shop in its own worker thread** (`node:worker_threads`, built into Node), so every
   module-level cache, index and registry belongs to one shop, as on a browser.
10. **Snapshots and saves are exact.** A shared copy holds no data URLs (photos are references, §4.4). Browsers read a
    snapshot with plain `JSON.parse` (no migration or repair: the server's copy is already repaired). Whenever the
    server makes a snapshot or a save, it checks that the serialized copy's fingerprint matches its live copy's; if not
    (`serializeState` turns NaN into 0), it replaces its live copy with the serialized one, sends everyone a snapshot
    and logs it as a bug. That check can't see what the fingerprint can't (§3.1): a JSON snapshot drops
    keys whose value is `undefined` (common today: `repro.stageEndsHour`, `illness`, `isStarter`, a stock offer's
    `note`, …) and a joiner adds them back at the end when they're set again, so its keys can come in a different order
    than the server's. Harmless while no rule reads a key's presence or the order of an object's keys; the mid-run
    joiner tests cover it (§9.1; chunk 10: 94 joiners over 600 steps on four shops, no divergence). Chunk 11 deletes such
    keys instead of setting `undefined` (about 30 places, and `compact` for values built from optional parts: an event,
    a listing), and the lockstep test and the catalogue test assert that no key holds `undefined` after any step or
    command (ten fixtures, 4 to 14 game days, checked by a probe too). The server
    repairs a shop only when it loads it from the database (a wake), before anyone has it.
11. **The "shared" mark lives outside `GameState`** (in the shared-shop store), so it never enters a fingerprint.

### 3.3 Messages

JSON text frames, except snapshots (a binary frame: the gzipped save JSON; a browser without `DecompressionStream`,
such as an older Safari, says so in `hello` and gets plain JSON) and photos. Names are short because they repeat. The
types are `src/types/shared.ts` (chunk 12 built the whole table below).

Browser to server:

| Message | Meaning |
|---|---|
| `{t:'hello', token, build, club, plain?}` | Join: the player's Supabase access token, the build's identity (§5.1: `{hash, version}`), the club. Nothing else is read until it's checked (later messages wait, at most 20) |
| `{t:'create', token, build, club, name, starter, starterName, seed?}` | The owner creates the club's shop (the shop's name, the starter, its name and the seed it was previewed with, so the starter is the one the owner saw), then joins it; a create for a club that has one joins that one; anyone else is closed (1008) |
| `{t:'cmd', id, c}` | A command (§4), with the browser's own id for it |
| `{t:'view', tank}` | The tank this player is looking at (or `null`): feeds §3.2 rule 4 |
| `{t:'here'}`, `{t:'away'}` | The tab became visible, or hidden or idle (§5.5) |
| `{t:'input'}` | The player used the game (at most once a minute): keeps them "there" and keeps Render awake |
| `{t:'token', token}` | A refreshed access token (Supabase refreshes hourly); refused unless it names the same player |
| `{t:'resync'}` | My fingerprint differs: send the shop again |
| `{t:'grant', user, pause}` | The owner gives or takes pause and speed (§5.4) |
| `{t:'photo', hash}` | Send me this listing photo (§4.4): only one a listing of the shop refers to, at most 60 a minute |

Server to browser:

| Message | Meaning |
|---|---|
| `{t:'welcome', you, shop, members, n, full, catchUp?}` then a snapshot frame | Joined: who I am and may do (`{id, name, owner, pause}`: the id is the account's), the shop (`{club, name, owner?}`; chunk 13: `owner`, the owner's name, for the pause refusal, when the shop has a recorded owner), who's there (`{id, name, here, pause}`), the step number the snapshot is at, the full-detail list, and the welcome-back summary if the shop caught up in the last 2 minutes. After a catch-up into a loaded room every member gets a welcome and a snapshot again |
| `{t:'steps', s:[{n, h, full?, cmds?, post?, fp?}], at?}` | Steps in order; each command in `cmds` is `{by, who, id, at, c}`: the sender's id and name, their own id for it, the server's time it arrived (first one wins' 30 seconds, §4.3), and the command. Command steps go out within about 50 to 100 ms (several commands in that window share a frame to each member); time steps are batched about once a second. Chunk 13: `at`, the server's clock when it sent them; a browser whose own clock has moved more than 10 seconds further since the closest the two came is behind (§7.6) |
| a binary photo frame | A requested photo: the tag 3, the hash's 64 hex characters, a type byte (1 WebP, 2 JPEG), then the image |
| `{t:'reject', id, why, cost?, can?}` | Your command wasn't applied: `forbidden` (pause without permission, the guide's own steps, or chunk 14's tiers and answers without the permission, §5.4), `malformed`, `rate` (over 10 commands a second, or 6 photo listings a minute), `failed` (it threw on the server, §5.2), or `spend` (chunk 14, §5.6: it cost `cost`, more than the `can` its sender may spend). A command the game refuses by its rules (no money, already sold) is applied as usual, so every copy gets the same refusal and the sender's own copy says why (§4.3). A `raiseFlag` whose flag the shop already has is dropped without a reply (§4.3) |
| `{t:'members', members}` | Who's there and who can pause (not what each is looking at, which no screen shows); at most one a second |
| `{t:'closing', why, until?, savedAt?}` | The server is closing this connection: `cap`, `hours` (with `until`, the 1st it opens again), `full`, `build`, `updating`, `removed`, `elsewhere`, `fault`, `restart` (with `savedAt`, the last save), `outofstep`, `gone` (the club has no shop; words for chunk 13, §8) (§8). Every close of the server's own says why in a message first, because Render's proxy doesn't pass the server's close frames on (chunk 12, measured: the message arrives, the close code doesn't, and the socket drops as 1006 about 20 seconds later); the server ends the socket 2 seconds after its close frame |
| `{t:'bye', why}` | A close with no words to show (chunk 12): `sign-in` (the token can't be checked: refresh the session and try again; close 1008), `away` (away 10 minutes: reconnect when the player is back; close 4000), `protocol` (a message the server refuses, a bug; close 1008), `server` (the database didn't answer: reconnect with the usual waits; close 1011) |

## 4. Commands: player actions as data

### 4.1 The catalogue

- `src/sim/commands/` (new, in the `sim` layer): `type Command` is a union of plain objects, one kind for each player
  action (80 in chunk 11, `kinds.ts`: `{k:'buyOffer', offer, tank, picks?}`, `{k:'feedTank', tank, food, zone?,
  target?}`, `{k:'setSpeed', speed}`, …, each with an optional guide `flag`), and `applyCommand(state, cmd, actor?) →
  CommandResult` (`apply.ts`), which calls the same `src/sim` function the closure called. Actions the interface
  doesn't call (`setManualMode`, `setOpenHours`, `renameLine`, the facility's fixtures, `sellFragsToStore`) aren't
  commands until a screen uses them. `CommandResult` is the `ActionResult` plus what callers read afterwards today (`tankId`,
  `servingsUsed`, the storage counts), so no caller reads the game right after an action.
- **Arguments are only ids, numbers, strings, booleans and small plain objects** (a placement `{x, z, rotY, scale}`).
  What an action used to read from the UI goes in its arguments (`buyTank`'s `seeded`, and its water class, which
  `defaultWaterClass` takes from the placement tool); what it read from the game is worked out again when it applies
  (DecorEditor's `owned`, the cooler water change, the Auto-feed patch), since the game may have moved on, and what the
  sender saw goes along when it matters (`placeDecor`'s `fromStorage`, `buyOffer`'s `saw`, a move's `from`).
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
- **Solo stays synchronous:** `dispatch(cmd, done?)` runs `mutate((d) => applyAction(d, cmd))` at once, then the guide
  flag in a write of its own (B-179), calls `done` and returns the result, as `act` did (`src/game/dispatch.ts`).
  **Shared** returns `undefined` and calls `done` when the step that applied it arrives and this copy has applied it;
  the `act` helpers' toasts, sounds and callers' follow-ups (`after`) wait for the result in both.
- **Controls that send many values** (the equipment slider "fires per pixel", the stock budget) are coalesced per
  control: at most about 4 a second, plus the value on release, with the control showing its local value until the step
  lands. (The shared dispatcher's job, chunk 13: solo applies every value at once, as today.)
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
  doesn't check where the animal is now; two feeds both apply), so **buying, selling, moving and taking carry what
  their sender saw**: the animal's tank for a move, the offer's, listing's or bid's state. A command whose expectation
  no longer holds is refused on every copy, and the message names the member whose command changed it in the last 30
  seconds ("Sam already sold that fish.", "Sam already moved that fish."). An expectation ignores changes made by the
  same sender's own earlier commands (two quick moves of one fish both work). Each copy keeps that short memory of who
  touched what from the steps, so every copy decides and says the same. (Chunk 11: the memory is the shop's state,
  `GameState.touches`, timed by the server's `at` on each command, so a joiner's snapshot carries it;
  `src/sim/commands/shared.ts`. Each touch keeps a mark of what the thing looked like after it, its tank or status,
  so the sender's own change is excused only while the thing is still as it left it: a change the game made since,
  which leaves no touch, still refuses. A partial purchase names its animals by id (`saw`), so a member who bought
  part of a group first doesn't shift what the next one gets; placing from storage says so (`fromStorage`), so the
  last piece is never bought anew for whoever comes second.)
- **Settings are last-writer-wins** (a slider, a light schedule, a budget): no expectation, so a coalesced control's
  later values never refuse its earlier ones; when another member changed the same setting in the last 30 seconds, the
  sender's screen notes it with the same "{name} already …" line.
- **Flags that rules read become rules:** `hireStaff` raises `hired_staff` itself, and so on for each `{flag}` an
  action passes. Panels' `opened_<panel>` flags, which gate quests and unlocks, become one command (chunk 11: `raiseFlag`, for
  every guide flag the interface raises); the server forwards only the first for each flag, so ten members opening the
  market send one. The guide's own steps don't
  run (no guide, ADR-0045 decision 5).

### 4.4 Listing photos (ADR-0045 decision 13)

- In a shared shop a listing photo is taken as today, then shrunk to about 320 pixels wide (WebP where the browser
  supports it, else JPEG, roughly 10 to 20 KB) and sent with `createListing` (that one command may be up to 48 KB).
- The server checks the image (its first bytes must be a WebP or JPEG; Safari's canvas can hand back a PNG when asked
  for WebP, so the browser checks what it got and falls back to JPEG), limits each member to about 6 photo listings a
  minute, stores it once (`shared_photos`, §6.1), keyed by its content's hash, and puts a reference (`p:<hash>`, the
  hash's exact format) in the command it forwards. So every copy, the sender's too, holds the reference, never the
  picture, and the photo's usual boost applies as today: the rules read only that a photo exists (the appeal, the
  tips and the pruning, `listings.ts`).
- **`repairState` accepts the reference.** Today it deletes any listing photo that isn't a `data:image/` string
  (`migrations.ts`, PERSIST-004: anything else would reach `<img src>`, the only way a save could make the game fetch a
  remote URL), which would strip every reference at each wake. It gains exactly one more accepted form, `p:` followed
  by the hash's format, and nothing else (a core-file change named in chunk 12's brief). The interface never puts a
  reference in `<img src>`: `Listings.tsx`, the only reader, builds the picture from a blob it fetched itself.
- **Browsers fetch a photo over the WebSocket** (`{t:'photo', hash}`, answered with a binary frame), only when it's on
  screen, and keep it for the session; there is no public photo address, so a leaked link can't spend the data cap.
  Until its database write lands, the server serves a new photo from memory.
- **Pruning:** when the game prunes a listing's photo (the closed listings keep only the newest few), the stored
  picture is deleted only after a save that no longer refers to it has been written, by a scan of every stored photo
  against the saved copy (which also removes photos from listings that were refused).

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
- **Files** (as built in chunk 12): `main.ts` (the entry: the database or the stub; SIGTERM saves every room), `app.ts`
  (HTTP: `/health` with CORS for the game's sites, `/stats`; the WebSocket upgrade at `/shop`; the origin check, sign-in,
  one connection per player, the limits; the only database caller), `rooms.ts` and `roomWorker.ts` (one worker per shop,
  started with an empty environment, or in-thread for the unit tests), `host.ts` (a room's life: the lease, load and
  repair, the catch-up, saves, photos, grants; it reaches the database through the main thread, `protocol.ts`, and only
  for its own club), `room.ts` (the copy, steps, members, permissions, photos), `auth.ts` (the token check), `store.ts`
  (the database calls), `usage.ts` (the meters and caps), `photos.ts` (a photo's checks), `config.ts` (environment),
  `stub.ts` (in-memory storage and accounts for tests and dev: `SHOPS_STUB=1`), `replay.ts` and `shops.ts` (the stub shops
  and the cross-engine replay's step log, stub only).
- **The build's identity** has two parts, stamped by a Vite plugin into both the game and the server:
  - a **hash** of everything every copy runs to stay in step: `src/sim`, `src/data` and `src/types` (inside a step the
    simulation imports nothing else but `@/persistence/schema`), `src/persistence/hash.ts`, `serialize.ts`,
    `migrations.ts` and `schema.ts` (the fingerprint and the server's repair), and the protocol's message code; files in
    a fixed order with normalised line endings. The step block itself is `runSharedStep` in `src/sim`, so it is covered.
  - the **release version** (`package.json`), which says which build is newer.

  Builds with the same hash play together, whatever else differs (the interface, the docs, a server-only fix). A
  browser whose hash differs is told to reload when its version is older than the server's (`build`) and to try again
  later when it is newer (`updating`: the server's deploy hasn't landed yet).
- **Releases push `main` first, then deploy the server.** Pages deploys on every push to `main` and the Render static
  site has `autoDeploy: true`, while the server is deployed by hand from `main`. In between, newer browsers see the
  accurate `updating`; once the server is out, older tabs are told to reload and get the new build (Pages may serve a
  cached page for about 10 minutes, so `build` waits for `version.json` to change before offering Reload). Chunk 12
  writes this into PLAN.md's release procedure. Chunk 10 created the service with the Render CLI (ADR-0046) and left
  `render.yaml` alone, so a Blueprint sync can't create or change it; the server stays out of `render.yaml`.

### 5.2 A room's life

1. **Wake:** the first `hello` for a club whose shop isn't loaded. The server takes the shop's **lease** (§6.2),
   starts the shop's worker, loads and repairs the shop, and catches up: the time since the shop emptied (`left_at`;
   after a crash, `saved_at`), nothing under 5 minutes or if it was paused, else at 1× capped at 12 game hours, under
   the grace rules (§2.2). The joiners see "Catching up…" meanwhile.
2. **Running:** while at least one member is there, the worker steps 4 times a second at the shop's speed and runs
   each command in its own zero-hour step at once; every 10 seconds a step carries the fingerprint.
3. **A failing block:** every command's block runs on a working copy (§3.2 rule 2; about 0.65 ms to copy `big_facility`
   with `fastMutate`'s copier), so a command is applied once, atomically. Time steps run in place (chunk 12, §11: the
   copy was 18 to 32% of a step): the room keeps a copy taken at each fingerprint and the steps since, and a time step
   that throws is undone by replaying from that copy, never sent. If a command's block throws, the copy is
   discarded, the command is left out of the steps, and its sender gets `reject`; nobody else is affected (commands
   arriving together get a block each). A time step that throws is discarded the same way and retried next tick; three
   in a row stop the shop with `closing: fault`, after saving the last good copy.
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
- **Re-sync budget:** re-syncs (a fingerprint mismatch, or falling behind) are counted apart from joins and
  reconnects: at most 3 per member in 10 minutes and 6 in an hour (counted per player, across reconnects, while the room
  lives). Past that the connection closes with `closing: outofstep` (§8), so a copy that can't stay in step can't drain
  the data cap. Joins and reconnects (a phone switching apps) have their own, looser limit: at most 20 per member in an
  hour, `outofstep` past it (a browser that waits after `updating` should wait minutes, not retry at once).

### 5.4 Who may do what

- **Everyone in the club** may send every command except those below (ADR-0043 decision 5).
- **Pause and speed** (`setSpeed`): the owner (the shop's creator; only the owner creates shops, ADR-0043 decision 3)
  and the members in the shop's `pausers` list.
- **`grant`:** the owner only. The list is saved with the shop.
- **Chunk 14 (§5.6):** tiers and approvers (`setSpending`, `setApprover`) for the owner only; answering requests and
  giving money (`answerAsk`, `giveMoney`) for the owner and the members they let approve. What a member may spend is
  the step's to say.
- One function, `allowed(member, cmd, shop)`, decides.

### 5.5 Who's there

- A connection is **there** after `here` and until `away`, a dropped connection, or 30 minutes with no `input`
  (ADR-0045 decision 4). The browser sends `away` when the tab is hidden, and after 30 minutes without input it shows
  "Still here?" and sends `away` if nobody answers in a minute (§7.5). A command from a member who isn't there brings
  them back.
- A hidden tab stays connected for 2 minutes (a quick switch to another app costs nothing), then disconnects; showing
  the tab again reconnects with a snapshot. A command in flight across a reconnect may or may not have been applied;
  the snapshot shows which, and its pending result settles from the steps or, if absent, as not applied.
- The shop runs while at least one member is there. The server never steps for members who aren't.

### 5.6 Permission tiers and the money pool (chunk 14, ADR-0043 decision 5, ADR-0050)

Built in chunk 14 (PLAN.md chunk 14; `src/sim/pool.ts`). The pool is the shop's own money; `GameState.pool` (optional,
only in a shared shop) holds each member's spending tier (Spends freely, Allowance a game day, Asks first), their
allowance left today and the money approved or given to them, who may approve, and the open requests, so every copy
shows the same thing and no message or database change was needed. Pause and speed stay on the shop's row (`pausers`).
Six commands change it (`askMoney`, `cancelAsk`, `answerAsk`, `giveMoney`, `setSpending`, `setApprover`); the server
marks the owner's commands on the step (`StepCommand.owner`), so every copy knows who may set tiers. `allowed` refuses
the owner's and approvers' kinds to anyone else. A member's spend is the money a command took from the pool (care and
the pool's own commands aside), taken from their allowance, then their approved money, in that command's step on
every copy; more than they have is known on the server's copy of the step (`overspend`) and refused before any copy
sees it (`reject` `spend`, with `cost` and `can`). Staff and the stock budget are refused on every copy for a member
who doesn't spend freely. The allowance tops up lazily: a record keeps what was left on which game day, and a later
day reads as the whole allowance.

### 5.7 The caps and the meters

- The server counts the bytes it sends (WebSocket frames, photos and its database calls, headers included), times 1.4
  for the WebSocket, TLS and TCP/IP overhead (nearer 1.6 for the smallest frames, chunk 10's review; chunk 12 checks
  the factor against Render's own figure), and its awake seconds, per calendar month (UTC), saving them with each save
  (`server_usage_add`, §6.3).
- **At 2 GB of data in a month** (ADR-0045 decision 3) it refuses new joins (`closing: cap`) and saves and closes the
  running rooms. **At 400 awake hours** (decision 15) it does the same with `closing: hours`. The club card says when
  they open again (§8). Both counts start again on the 1st.
- The owner's shop card shows the month's data and awake hours (Render's 750 free hours are shared with `dascade`).
- **Any request wakes Render,** so the club card reads whether shops are closed for the month from Supabase
  (`club_shared_shops()`, §6.3) and doesn't call the server (`/health`) while they are.

### 5.8 Render and the key

- A **free web service**, `aquarium-go-shops` (`srv-dbbt6gbncjis73c23br0`, https://aquarium-go-shops.onrender.com,
  created 2026-10-20 with the owner's yes, ADR-0046), in the Virginia region (beside Supabase's us-east-1), from this
  repo: build `npm ci --include=dev --ignore-scripts && npm run build:server` (chunk 10: it builds in about 54 seconds
  without install scripts), start `node dist-server/main.js`, health check `/health`, `NODE_VERSION` 22, auto-deploy
  off. It builds from `next` while chunk 10's prototype runs on it; chunk 12 switches it to `main`.
- **Environment:** the server's public settings (the Supabase URL and publishable key, the allowed origins) live in
  code, and **`SHOPS_SERVER_KEY`, the server's password, which the owner pastes in** (ADR-0047 decision 3, replacing
  ADR-0045 decision 1's Supabase secret key), in chunk 12 (chunk 10's test runs on stub storage and needs no key). The
  agent never sees, prints or saves it, and it never enters the repo, a log or a build.
- **The password's reach (ADR-0047).** A Supabase secret key acts as `service_role` and also opens Supabase Auth's
  admin tools (listing players' emails, deleting accounts), which no database rule can limit. So the server uses no
  Supabase key: it calls its functions (§6.3) through the API with the publishable key, as `anon`, and each refuses
  (`forbidden`) unless the SHA-256 of the password it is given equals the one fingerprint stored in
  `private.server_key`. `scripts/shared-server-key.mjs` makes a random 256-bit password, stores only its fingerprint
  (through the Supabase CLI, scoped to the project) and puts the password on the owner's clipboard without printing
  it; running it again replaces the password at once. A leaked password reaches only shared shops, their photos, the
  usage meter and club membership (names), never players' saves, profiles, emails or accounts. The password travels in
  the body of a POST (never a URL or a header, which logs may keep).
- **`service_role`'s reach, all the same.** By Supabase's default privileges `service_role` has every right on every
  table and function in `public` and bypasses row-level security, so any of the project's secret keys could read and
  write every player's saves, profiles, clubs and friend links. Nothing uses that role, so chunk 12's migration revokes
  its rights on every table and function in `public` (stage 1's and the new `shared_*` ones) and changes the schema's
  default privileges so future tables and functions don't grant it anything of their own (a function made later in
  `public` still gets EXECUTE through PUBLIC, as every Postgres function does, until its migration revokes that: every
  migration here does, and the text test checks it; chunk 12's review); a test checks every table and function in
  `public`, and the security advisors run after.
- **The build sees every variable set on the service** (chunk 10 printed the names a build gets: `ALLOWED_ORIGINS`,
  `SHOPS_*`, `NODE_VERSION` and Render's own), so the password would reach every program a build runs (npm, Vite, the
  stub shops' fixtures). The build command removes it first (`env -u SHOPS_SERVER_KEY sh -c '…'`) and runs no install
  scripts, and chunk 12 checks the build's log for the name.
- **What the owner sets, once (chunk 12).** The Render CLI (v2.28) changes a service's branch, build and start
  commands (`render services update`) but not its environment variables, so the server's public settings live in code
  (the Supabase URL and publishable key from `src/social/project.ts`; the game's two sites as the allowed origins when
  `RENDER` is set), and the owner's one dashboard visit pastes `SHOPS_SERVER_KEY` and deletes chunk 10's test
  variables (`SHOPS_REPLAY`, `ALLOWED_ORIGINS`, which allows only `127.0.0.1`; `SHOPS_BYTE_BUDGET`,
  `SHOPS_MAX_CONNECTIONS`, unless chunk 12's server reads them on purpose). With the owner's yes in that session, the
  agent switches the branch to `main` and sets the build command with the CLI.
- **Closed between tests.** The prototype's byte budget starts again at every wake and the service's address is in this
  public repo, so after chunk 10's measurements the prototype on Render takes no connections and no replays unless
  `SHOPS_OPEN=1` is set on the service (it answers `/health` and `/stats` only). Chunk 12's server, with sign-in,
  replaces it.
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
- **`shared_usage`**: `month` (`YYYY-MM`, primary key), `bytes_out`, `awake_seconds`, `closed` (`cap` or `hours` once
  a cap closed the month), `updated_at`.

### 6.2 The lease

`server_shop_take(club, holder, until)` takes the lease when it is free or expired (one statement, so two instances
can't both win). The holder renews it every 30 seconds for 90, on its own timer, and releases it when the room ends.
A joiner who reaches an instance while another holds the lease gets `closing: updating`. A server whose save is
refused because another holder has the lease closes the room with `closing: restart`.

### 6.3 Functions

- **For the game** (as in stage 1: `public` wrappers that call `private` functions checking `auth.uid()`):
  `club_shared_shops()` (for each club I'm in: whether it has a shop, its name, day, money and when it was last played,
  and whether shared shops are closed for the month and until when; never the body) and `shared_usage()` (the owner
  only: this month's data and awake hours, and both caps).
- **For the server only** (each takes the server's password first and refuses without it, §5.8; `private` functions
  behind `public` wrappers that only `anon` may call, as the server calls with the publishable key): `server_member`, `server_shop_get`,
  `server_shop_create` (the owner only, one per club), `server_shop_put` (checks the lease and the revision),
  `server_shop_take`, `server_shop_release`, `server_set_pausers`, `server_photo_put`, `server_photo_get`,
  `server_photo_hashes` and `server_photos_delete` (§4.4's prune), `server_usage_add` (which also records the month as
  closed when a cap is reached).
- A save from a newer schema is never loaded past or overwritten (PERSIST-014): the server refuses to load it
  (`closing: updating`) until it runs a build that can.

## 7. The client

### 7.1 Where things go

| File | What |
|---|---|
| `src/sim/dmath.ts` (new) | §3.2 rule 1 |
| `src/sim/commands/*` (new) | The catalogue, `applyCommand`, `validateCommand` (§4) |
| `src/sim/sharedStep.ts` (new) | `runSharedStep`, §3.2 rule 2's block, used by the server's worker and `sharedLoop` alike |
| `src/sim/catchUp.ts` (new) | The catch-up's rules, moved from `src/persistence/offline.ts` (which keeps the store-facing part) |
| `src/sim/starvation.ts` (new) | The starvation guard's rule, with its memory passed in (§3.2 rule 6); `src/game/starvationGuard.ts` keeps the solo memory |
| `src/state/game.ts` | The installed dispatcher (§4.2) |
| `src/game/dispatch.ts`, `src/game/sharedLoop.ts` (new) | The solo dispatcher; applying the server's steps with `runSharedStep` and publishing them, checking fingerprints in idle time |
| `src/ui/common/marks.ts` (new, chunk 11) | Each player's own "seen" marks, the only way the interface writes them (§3.2 rule 8) |
| `src/persistence/migrations.ts` | `repairState` accepts a photo reference (§4.4) |
| `src/social/service.ts`, `localStub.ts`, `supabase/*` | `sharedShops()` and `sharedUsage()` (§6.3), in the stub too |
| `src/social/project.ts` | `SHARED_SHOP_SERVER` |
| `src/ui/shared/*` (new) | The connection (the browser's own `WebSocket`, no library) and its store, the club card, the title button, the HUD strip, "Still here?", the members list, the messages. As built in chunk 13: `connection.ts` (wake, join, the replica, `here`/`away`/`input`, "Still here?", `token`, `resync`, falling behind, the waits, `closing` and `bye`), `dispatch.ts` (the shared dispatcher), `session.ts` (opening, your own game waiting, leaving, publishing the copy), `store.ts`, `marks.ts` (each player's marks over the copy), `photos.ts`, `activity.ts` (others' pop-ups, feeds and taps, the starvation toast), `words.ts` (§8's words), `shopsCache.ts`, `SharedScreens.tsx`, `SharedClubSection.tsx`, `shared.css` |
| `src/state/sharedMode.ts` (new, chunk 13) | The one flag every layer reads: a shared shop is open (persistence and the loop refuse it, §3.2 rule 11) |
| `src/persistence/sharedAway.ts` (new, chunk 13) | Your own game's record while you're away in a shop, and `isSharedShop`, the save paths' guard (§7.2, §7.3) |
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

**Group L's words, approved as drafted** (2026-10-21, ADR-0048: chunk 11's list and chunk 12's `gone`). The
first-one-wins lines are the catalogue's (`conflictText` in `src/sim/commands/shared.ts`): what the earlier member did,
and to what. The hold lines name the system in lower case (water changes, salt mixing, live food, autofeeders,
production lines).

| Where | Draft words |
|---|---|
| First one wins, an animal | "{name} already moved that fish." and "{name} already sold that fish." (both approved) · "{name} already listed that fish." |
| First one wins, the rest | "{name} already bought that offer." (approved) · "{name} already placed that stored piece." (the last one in storage) · "{name} already moved that clutch." · "{name} already sold that listing." · "{name} already withdrew that listing." · "{name} already accepted that bid." · "{name} already declined that bid." · "{name} already answered that bid." (a counter-offer) · "{name} already took a frag from that decoration." · "{name} already moved that decoration." · "{name} already sold that decoration." · "{name} already removed that decoration." · "{name} already listed that frag." · "{name} already planted that frag." · "{name} already sold that frag." · "{name} already removed that equipment." · "{name} already repaired that equipment." · "{name} already installed that equipment." · "{name} already hired that candidate." · "{name} already let that keeper go." · "{name} already ended that line." |
| First one wins, nobody named (the game changed it, or over 30 seconds ago) | "That fish has changed since you looked." (and the same with clutch, offer, listing, bid, frag, decoration, stored piece, equipment, candidate, keeper, line, tank) |
| A setting another member just changed (the sender's note) | "{name} already changed that." |
| An action with no message of its own (no alerts line today) | Pause and speed use the approved pop-ups. A favourite, watching or following an animal, a photo's story line, a tap on the glass, a bid held while a counter is typed and the guide's flags add no line, and a value changed again and again (a slider dragged, an amount typed) keeps one line per member, with its newest message, while they keep at it; switches and choices get a line each time. Hold all, Resume and one system: "{name} put automation on hold." · "{name} resumed all automation." · "{name} held {system}." / "{name} resumed {system}." |
| `reject`: too many actions | "Slow down a little: that was a lot of actions at once." |
| Closing: `gone` (chunk 12: the club has no shared shop now, after the agent removed it on request, or a race) | "{club} has no shared shop any more." |
| `reject`: failed on the server, or malformed | "That didn’t work, and nothing was changed. Please try again." (the game's own words for a failed action) |
| Settings › Saves, in a shared shop | "This is {club}'s shared shop: it saves on the server. Your own aquarium is saved and waits for you." [Back to my aquarium] |
| Save, Load, Import or Export tried in a shared shop | "The shared shop saves itself on the server." |

**Two more, approved as written** (2026-10-21, ADR-0049, chunk 13):

| Where | Words |
|---|---|
| Signed out, or the sign-in ended (the visit can't sign the player in; back to their own aquarium or the title) | "You need to be signed in to play the shared shop. Sign in from Social and open it again." |
| Pause refused when the game doesn't know the owner's name | "Only the owner and the people they choose can pause or change the speed." |

**The money pool's words, approved as previewed** (2026-10-21, ADR-0050 decision 6, chunk 14). `{amount}`, `{can}`,
`{cost}`, `{left}`, `{allowance}`, `{extra}`, `{note}`, `{n}` fill in from the game (money as the game writes it).

| Where | Words |
|---|---|
| HUD strip, everyone | [Money] · "Money: {can} to spend" (a member who doesn't spend freely) · "Money ({n})" (an approver, {n} requests waiting) |
| Shop money sheet | **Shop money** — "Pool: {money}. Everything the shop earns goes here." · "You can spend {can}." · "Allowance: {left} of {allowance} left today." · "Approved for you: {extra}." · [Ask for money]: "How much?", "What for? (optional)", [Send request] [Cancel] · **Your requests**: "{amount}: {note} · Waiting" [Cancel] · **Requests** (approvers): "{name} asks for {amount}: {note}" [Approve] [Decline] · **Give money** (approvers): a member, an amount, [Give] |
| Members list (the owner) | Each member: "Spending:" (•) Spends freely ( ) Allowance [amount] each game day ( ) Asks first · "Can approve requests and give money" · "Can pause and change speed" (as before) |
| A purchase over what the member can spend (`reject` `spend`) | "That costs {cost}, and you can spend {can}. Ask for more in Money." |
| Staff or the stock budget without Spends freely | "Staff and the stock budget keep spending the pool, so only members who spend freely can change them." |
| Pop-ups | "{name} asks for {amount}: {note}." (to approvers) · "{owner} approved your {amount}." · "{owner} declined your request for {amount}." · "{owner} gave you {amount} to spend." · a tier change's alerts line (to the member it's about) · "{n} requests are waiting in Money." (an approver opening the shop) |
| Alerts list lines (the name in front) | "Asked for {amount}: {note}." · "Approved {name}'s {amount}." · "Declined {name}'s request for {amount}." · "Gave {name} {amount} to spend." · "Cancelled the request for {amount}." · "Set {name} to spend freely." · "Set {name}'s allowance to {amount} a game day." · "Set {name} to ask first." · "Let {name} approve requests." · "{name} can no longer approve requests." |
| First one wins, a request | "{name} already answered that request." · "That request has changed since you looked." |
| Forms the previews imply (to confirm with the release) | A request with no note: "Asked for {amount}.", "{name} asks for {amount}.", "{amount} · Waiting"; one request waiting: "1 request is waiting in Money."; an approver who doesn't spend freely: "Money: {can} to spend ({n})" |

## 9. Tests

### 9.1 Unit (`npm test`)

- **One arithmetic:** each `dmath` function against a reference over wide ranges (error bounds, special values: ±0,
  ±Infinity, NaN, subnormals); the guard test (§3.2 rule 1); every seeded test that shifts says why.
- **Commands:** for each kind, applying the command gives the same `stateHash` as calling its `src/sim` function
  directly; every command survives `JSON.parse(JSON.stringify(cmd))` unchanged; `validateCommand` refuses wrong
  kinds, types, ranges and sizes; each expectation (§4.3) refuses when it no longer holds and names the earlier
  member, but not after the same sender's own earlier command; settings are last-writer-wins and a coalesced control
  ends on its last value; composite actions are one command; `core-mutation-boundary`'s new rule (§4.2).
- **The step block:** `runSharedStep` pins the world's identity, so a cache lookup inside a block is answered the same
  on a copy that has just been loaded, copied or replaced as on one that hasn't (the review's `scratch-identity.ts`
  case); a block that throws leaves the copy as it was.
- **Photos:** `repairState` keeps a well-formed reference and still deletes any other non-image value; the interface
  never puts a reference in an `<img src>`.
- **The build identity:** changing any file it covers changes the hash; a file outside it doesn't.
- **Lockstep in one process:** a server room and two client copies (`sharedLoop`) on `playthrough_betta` and
  `big_facility` at 10× (chunk 10: 7 and 2 game days), with commands from both and UI-style reads (the compatibility
  engine, reports, `reachCache` users) between steps on one copy, and joiners from snapshots taken mid-run: every
  fingerprint matches. A copy changed by hand is caught at the next fingerprint and re-synced.
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
brings your own game back unchanged, with no catch-up; "Still here?"; reconnect after the server restarts. (Chunk 13,
`tests/e2e/shared-shop.spec.ts`: the owner creates the shop from the club card through the new-game screens and the
member opens it from the card, each browser project in a club of its own (the stub opens the local Social stub's clubs
to every stub player); the restart is a stub server the spec starts, kills and starts again, the game pointed at it with
the dev-only `?shops=`. The unit side: `shared-client` runs the game's connection and dispatcher against the server in
process, `shared-connection` the timers on a fake socket, `shared-dispatch`, `shared-own-game` (the save guards and your
own game waiting), `shared-screens`, and `shared-server-chunk13` the server's additions.) **The
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

- **Chunk 10, the test.** Local first: `dmath` written for real and switched on for the whole simulation (§3.2 rule 1,
  moved here from chunk 11 so the test measures the real arithmetic), the step block, and a prototype room and
  `sharedLoop`, to check §3.2 in one process; the cross-engine replay in Node, Chromium and WebKit for a game week at
  10× on several fixtures (expected: no mismatch); bytes per player-hour, per command and per save; the worker's time
  per step. Then, **with the owner's yes, on Render:** create the free service (stub storage, no database key) and
  deploy the prototype; measure the wake time, the time per step on 0.1 CPU (on Render's x86-64, also confirming the
  replay there) and a real two-browser session; check the build without install scripts and what Render exposes to
  builds. Installs `ws`. Writes the numbers into §11. No player-visible change.
- **Chunk 11, commands.** §4, and §3.2's other sim changes (`catchUp.ts`, the starvation rule, the flags; chunk 10
  brings `focusTankIds` and the step block), with no player-visible change; the full test pass guards the solo game.
  Can ship alone (0.5.7) if the owner wants.
- **Chunk 12, the server and the database.** §5 and §6: `server/`, the migration with the `service_role` revokes
  (applied live with the owner's yes), the owner's key pasted into Render, the stub, the server's tests, the deploy, the
  release order written into PLAN.md, and the live smoke.
- **Chunk 13, the screens and the play-test.** §7 and §8 with the approved words, the e2e tests, then a play-test with
  the owner and their daughter on the live server before release (0.6.0, with the owner's go-ahead).

## 11. Costs and limits (measured in chunk 10, 2026-10-20)

Measured on the free web service (§5.8: Virginia, 0.1 CPU, Node 22.23.3 on x86-64) with chunk 10's prototype:
`scripts/shared-session.ts` (two members in Node on the owner's Mac, a feed every 5 seconds from each in turn, runs
of 60 to 90 seconds) and `scripts/shared-session-browsers.mjs` (Chromium and WebKit on the Mac). The stub shops: a new
game (`new_betta`: 1 tank), the 30-day playthroughs (`playthrough_betta`: 3 tanks, 26 animals; `playthrough_axolotl`)
and the late-game `big_facility` (15 tanks, 337 animals).

| Shop | Speed | Game time kept | Server CPU per real second (the free plan has about 100 ms) | A time step (wall) | A fingerprint | A command's round trip (median) |
|---|---|---|---|---|---|---|
| `new_betta` | 10× | 100% | 33 ms | 6 ms | 4 ms | 125 ms |
| `playthrough_betta` | 10× | 100% | 46 ms | 7 ms | 50 ms | 128 ms |
| `playthrough_betta` | 1× | 100% | 32 ms | 5 ms | 15 ms | 122 ms |
| `playthrough_axolotl` | 10× | 100% | 46 ms | 8 ms | 122 ms | 127 ms |
| `big_facility` | 1× | 84 to 92% | 119 ms | 100 to 160 ms | 750 ms | 220 to 360 ms |
| `big_facility` | 3× | 76% | over 100 ms | 200 ms | 600 ms | 610 to 650 ms |
| `big_facility` | 10× | 55% | over 100 ms | 370 ms | 540 ms | 0.7 to 1 s |

Every fingerprint matched in every run, the slow ones too: a shop the server can't keep up with runs slower, never out
of step.

**Chunk 12 (2026-10-21), the real server** (sign-in, the database) with chunk 12's speed work (time steps in place with
a checkpoint, fingerprints spaced by their cost, rule 5's stagger), on the same free instance: one member from the
Mac, a feed every 5 seconds, every animal fed at the start, 60 seconds a row (`npx vite-node scripts/shared-smoke.ts
--measure`; a throwaway club and account, removed after). CPU is the whole process's per real second (the free instance
gets about 100 ms and bursts a little above); a step's time is wall time, which the 0.1 CPU quota stretches.

| Shop | Speed | Game time kept | Server CPU per real second | A time step (wall, mean, max) | A fingerprint, its interval | A command's round trip (median) |
|---|---|---|---|---|---|---|
| `new_betta` | 10× | 100% | 18 ms (chunk 10: 33) | 1.9 ms, 200 | 3 ms, 10 s | 123 ms |
| `playthrough_betta` | 1× | 100% | 27 ms (32) | 3.6 ms, 90 | 107 ms, 10 s | 126 ms |
| `playthrough_betta` | 10× | 63%: the starvation guard slowed it to 1× once (§3.2 rule 6), not the server | 19 ms (46) | 3.0 ms, 97 | 65 ms, 10 s | 125 ms |
| `big_facility` | 1× | 93% (84 to 92%) | 113 ms (119) | 113 ms, 700 | 551 ms, 20 s | 238 ms |
| `big_facility` | 3× | 95% (76%) | 100 ms | 86 ms, 700 | 562 ms, 26 s | 240 ms |
| `big_facility` | 10× | 88% (55%) | 119 ms | 150 ms, 804 | 647 ms, 30 s | 372 ms (0.7 to 1 s) |

Every fingerprint matched. So the free instance now keeps a late-game shop within about 5 to 12% of real time at any
speed (a game day at 1× takes about 4.3 real minutes instead of 4), and small shops use a fifth of its CPU. The data,
including the throwaway shops' saves and snapshots: about 2.7 MB metered for the whole session of measurements.

- **Money: $0.** Render's free web service and Supabase's free project. Nothing paid without the owner's yes.
- **CPU.** The free instance runs a new or month-old shop (one to three tanks, up to about 30 animals) at any speed
  with half its CPU or more to spare. A late-game shop like `big_facility` needs more than the free instance has even
  at 1× (84 to 92% of real time), and at 10× the game runs at about half speed with commands taking a second. A shared
  shop starts as a new game (ADR-0045 decision 5), so this bites only when one grows large. What can help, cheapest
  first (chunk 12 and later): time steps in place instead of on a copy (the copy is 18 to 32% of a step's time on the
  Mac), a cheaper or rarer fingerprint for big shops (750 ms of wall time each on the free instance), a lower top speed
  for big shops (new words for the owner), or a paid instance (the owner's call).
- **Data,** as payload; the meter adds ×1.4 for the WebSocket, TLS and TCP/IP (maybe nearer ×1.6 for the smallest
  frames, §5.7):
  - steps: about 120 bytes a second per member, whatever the shop's size or speed (time steps batched once a second,
    commands at once, a fingerprint every 10 seconds): about 0.44 MB per member-hour, 0.6 MB metered;
  - a command: about 110 bytes to each member;
  - a snapshot (a join, a reconnect, a re-sync), gzipped: 12 KB (a new game), 34 to 39 KB (the playthroughs), 120 to
    160 KB (`big_facility`);
  - the shop's saves (chunk 12, every 3 minutes): about the snapshot each, so 0.25 to 3.2 MB an hour (0.35 to 4.5
    metered);
  - photos: each written once to the database and fetched once by each member who sees it (10 to 20 KB each).
  - Two people for an hour, metered: about 1.6 to 5.7 MB, so the 2 GB cap is about 350 to 1,250 hours, the saves the
    larger part for a big shop. Ten people, each acting every 3 to 5 seconds (each command goes to every member): about
    20 to 30 MB an hour. The static site and `dascade` share Render's 5 GB.
- **Hours:** the server is awake only while someone is there, plus 15 minutes, up to the 400-hour cap; Render's 750
  free hours are shared with `dascade`, and the owner's card shows the server's share. If they ran out, Render would
  suspend both free web services until the next month; the static sites keep working.
- **Waking:** after 15 minutes without a request the free instance sleeps; the next request was answered in 22 seconds
  (one measurement: Render started the instance after about 10 seconds and the server listened 2 seconds later; Render
  says up to a minute). Opening a shop then starts its worker: 1 to 3 seconds for a small shop, about 5 for
  `big_facility`, before the snapshot.
- **Across machines:** the stub shops built on Render's x86-64 build machine (the playthroughs simulate 30 game days of
  play) equal the Mac's arm64 builds bit for bit, and the server's step logs replay on the Mac with no mismatch.
- **Each device** applies the steps as the server does, with up to 4 tanks in full detail: on the Mac, about 1 ms a step
  for a small shop and 3 to 7 ms for `big_facility`, plus a fingerprint in idle time every 10 seconds. Chromium and
  WebKit on the Mac, in one shop on the Render service (`playthrough_betta` at 10× for 2 minutes, then `big_facility`
  at 1×): 1.6 to 2.2 ms a step and 4 ms a fingerprint on the small shop, 5 to 6 ms and 8 to 9 ms on the big one; every
  fingerprint matched and both ended at the same step with the same copy.
- **Latency:** an action appears after about a round trip, about 125 ms from the Mac to Virginia (including the
  server's 50 ms wait to batch commands), more when the server is busy.
- **The build:** about 54 seconds on Render, without install scripts; it sees every variable set on the service (§5.8).

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
| SHARE-016 | Builds play together when the hash of what every copy runs (§5.1) matches; otherwise the older side reloads or waits ("updating"); releases push `main` before the server; a newer schema's shop is never loaded past or overwritten |
| SHARE-017 | A failing command affects only its sender; the snapshot budget stops a copy that can't stay in step |
| SHARE-018 | Listing photos in a shared shop are small, seen by every member, and stored once |

## 13. Things to know

- **The owner's steps** (each when its chunk needs it): a yes to create the Render service (chunk 10); a yes to apply
  the migration live and to deploy the real server (chunk 12, ADR-0047), and one Render dashboard visit: the server's
  password pasted and chunk 10's test variables deleted (chunk 12, about 2 minutes, walked through, §5.8); the switch
  to `main` with the release
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
