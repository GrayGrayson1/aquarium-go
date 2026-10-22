# Session handoff: chunk 13 (shared shops, the screens and the play-test)

For the next agent on Aquarium Go. Chunk 8 was built by Marshall on 2026-10-19; chunk 9 by Chase the same day, at the
owner's request ("Yes, start", ADR-0043 decision 8). The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md`
rule; this file is the order of work and the practical knowledge that makes it go smoothly. Replace or delete it when
it's used up.

## Where things stand

- **0.5.5 is released** (2026-10-19: `main` = `9ae98b3`, Pages and Render): chunks 7 and 8 (PLAN.md; ADR-0039 to
  ADR-0042). Aquarium Go online is live for people with an invite.
- **0.5.6 is released** (2026-10-20: `main` = `3a0e8ce`, Pages and Render): chunk 9, the audit of `c7c0d34`'s five high
  findings, A1, B1, B2, D1 and E1 (with G1, B7 and C7), and the fresh review's blockers and its confirmations' (PLAN.md
  chunk 9; ADR-0044). The audit's report is private (an artifact for the owner); BACKLOG B-207 and B-208 say what's
  left.
- **The Supabase project is live**: the Free organization "Aquarium Go" (`kvqnsqbjufmnkpsrcjbj`), project
  `aquarium-go`, **ref `zkavcxrsxdgdlstravpj`**, us-east-1. Five migrations applied (`supabase/migrations`; the fifth,
  chunk 9's, on 2026-10-19 with the owner's yes), the advisors report no database issues (one Auth warning:
  leaked-password protection, off), the live smoke test passed 90 of 90. Three clubs, all the owner's ("Aquarium Go
  Friends", "CalliClub", "TheSushiBladesToTheMax"); the clubs keep their codes (ADR-0044 decision 3). Never write a
  code or a player's email in the repo, which is public (`select name, invite_code from public.clubs` reads codes).
- **Next: shared shops** (ADR-0043, ADR-0045): a whole shop a club plays together on a small server on Render. The
  design is `docs/agent/design/SHARED-SHOPS.md` (2026-10-20): every browser runs the same steps, the server's copy
  counts, fingerprints catch drift. Render's free plan includes only 5 GB of outbound data a month for the whole
  workspace (with DAS-Games' `dascade`, a free web service, and the static site), so the server never streams the
  shop; Render's 750 free instance hours are shared with `dascade` too. Node, Chromium and WebKit round `Math.exp`,
  `pow` and the other transcendental functions differently (measured 2026-10-20), so every copy must use the same
  arithmetic (`src/sim/dmath.ts`, switched on in chunk 10); the review's probes are in the internal-disk clone's
  `scripts/_audit/review-shared/`. Every design question is answered (ADR-0045, words included).
- **Chunk 10** (2026-10-20, PLAN.md): dmath switched on for the whole simulation, the step block, a prototype server
  (`server/`, `ws`) and replica, the lockstep tests (in one process, and the cross-engine replay in Chromium and
  WebKit), and the measurements on Render (SHARED-SHOPS.md §11). The free web service **`aquarium-go-shops`**
  (`srv-dbbt6gbncjis73c23br0`, created with the owner's yes, ADR-0046) builds from `next` and is deployed by hand
  (`render deploys create srv-dbbt6gbncjis73c23br0 --commit <full sha> --confirm --wait -o text`); after the
  measurements the prototype there is closed (no connections or replays unless `SHOPS_OPEN=1`, which the CLI can't set:
  the dashboard can). The Render CLI can create and deploy services but can't change their environment variables.
- **Chunk 11** (2026-10-20, PLAN.md): every player action is a command (`src/sim/commands`, 80 kinds) sent through
  `useGame.getState().dispatch`; the solo dispatcher (`src/game/dispatch.ts`) applies it at once, so the solo game is
  unchanged. With an actor (a shared shop), commands are tagged, first one wins and settings are last-writer-wins
  (`src/sim/commands/shared.ts`, the memory in `GameState.touches`). A new player action is a new command kind
  (`kinds.ts`, `apply.ts`, `validate.ts`, and a case in `tests/sim/commands-catalogue.test.ts`), never a closure.
- **Open owner questions:** F1 (the owner's VoiceOver pass); K1 (big shops on the free server, for chunk 12 or 13);
  L (the words chunk 13 still needs, drafts in SHARED-SHOPS.md §8); the audit's decisions A4 (the shared Pages origin,
  B-191), F5, F3, G2, A6 and new wording (B-207).
- **The Supabase CLI** (`/Users/brianbean/.local/bin/supabase`) is signed in to the owner's whole account, anonyform's
  Pro organization included. Scope every remote command to the project: `--linked --project-ref zkavcxrsxdgdlstravpj`
  (`db query` takes `--project-ref` only with `--linked`). Never print or save the secret key; never read the CLI's
  stored sign-in; stop and ask if anything would cost money (the owner: "lets make everything free if we can"). A
  query that would print another player's email is refused by Claude Code's auto mode (PII): count, or match the
  owner's own email, instead.

## Chunk 13 and the play-test: where it stands (Chase, 2026-10-21)

- **Built and reviewed** (PLAN.md chunk 13 has the record): the fresh review's 5 blockers and its confirmations' 2 more
  fixed, the third confirmation clean; the final pass on `c063c6e` green (unit 3,202, e2e 329 of 329); `next`
  fast-forwarded to `chunk13` (the worktree's branch, which can now go) and pushed. The owner's answers are ADR-0049:
  two more lines, and **the play-test on the Render address first**. Still to ask the owner, with the release: the
  opening card's back button from the title screen reuses the existing "Title".
- **The play-test, step by step** (ADR-0049 decision 3; after the four checks and the review are through and `next` is
  fast-forwarded to `chunk13` and pushed from the internal clone):
  1. The shop server from that commit: `render deploys create srv-dbbt6gbncjis73c23br0 --commit <full sha> --confirm
     --wait -o text` (ADR-0047 decision 2), then `npx vite-node scripts/shared-smoke.ts` from the internal clone.
  2. The game from the same commit on the Render static site only (`srv-dath0mfavr4c73dgk3j0`, which tracks `main`):
     `render deploys create srv-dath0mfavr4c73dgk3j0 --commit <full sha> --confirm --wait -o text`; if Render refuses a
     commit that isn't on `main`, `render services update srv-dath0mfavr4c73dgk3j0 --branch next`, deploy, and switch
     it back to `main` at the release (ADR-0049). Check `https://aquarium-go.onrender.com/version.json` and that the
     server's `/health` `build` equals the shared build hash of that commit (`sharedBuildHash` in vite.sharedBuild.ts).
  3. The owner and their daughter play on https://aquarium-go.onrender.com (its saves are that address's own: on
     signing in, the online-save box may ask; "Load online save" brings the owner's real aquarium there). The owner:
     Social › Clubs › the club › Create shared shop. Their daughter: her own account through the club's invite link
     (copied on the Render address; a parent signs up for a player under 13, ADR-0039 decision 4), then the club card ›
     Open shared shop.
  4. Then the 0.6.0 release, only on the owner's go-ahead in that session (PLAN.md "Releases", step 4).

## Handoff to Chase: chunk 13 and the 0.6.0 release (from Marshall, 2026-10-21, at the owner's request)

The owner (verbatim): "In CNVS have Chase the agents, Claude agents, build out the next portion. Give it everything it
absolutely needs. If it needs to read your repo, go ahead and tell it to do so if it'd be helpful, or not your repo, your
conversation, the terminal conversation. Just make sure it has everything it needs to be entirely successful." So Chase
builds **chunk 13** (the screens and the play-test, SHARED-SHOPS.md §7 and §8) as a full chunk (CLAUDE.md's routine:
brief in PLAN.md, the four checks on the final code from the internal-disk clone, one fresh Opus 5.5 max-effort reviewer
plus confirmation passes, its blockers fixed, PLAN.md updated, `next` pushed), then the play-test and the **0.6.0
release** on the owner's go-ahead. Marshall is the terminal "Marshall" on this canvas: ask it about chunk 12 with
`cnvs_prompt_agent`, or read its terminal (`cnvs_read_terminal`, target "Marshall") for the session's detail.

**Where chunk 12 stands** (PLAN.md chunk 12 has the record; read all of it, "For chunk 13" twice):
- Built and committed on `next` (`a4989d8` … `3890c74`), pushed up to `38bfbda`: the real server (`server/`), the
  migration, the build identity, photos, the stagger, `sharedShops()`/`sharedUsage()`, the live smoke and measurement
  script (`scripts/shared-smoke.ts`), docs, SHARE-003 to SHARE-018.
- Live: the migration (2026-10-21); the server password set on Render (ADR-0047: no Supabase key; a browser-capable
  Claude pasted it, see "Learned in chunk 12"); `aquarium-go-shops` deployed from `next` (`7c0e68d`); the live smoke 23 of
  23. K1 answered (big shops stay free, unchanged). **Group L answered** (ADR-0048): every word chunk 13 needs is
  approved (SHARED-SHOPS.md §8, all of it); any other player-visible words go to the owner first.
- **Still Marshall's:** chunk 12's fresh review (Opus 5.5, max effort) is running in Marshall's session. Marshall fixes
  its blockers (in `server/`, `supabase/`, `scripts/shared-*`, `tests/sim/shared-server*`, `shared-room*`,
  `supabase-migration*`, maybe `src/types/shared.ts`), re-runs the four checks, records it in PLAN.md, pushes `next` and
  messages Chase "chunk 12 done" through CNVS (and a canvas memory). A server fix that changes the protocol will be
  written in that message.

**How to work while chunk 12 finishes** (so two agents never edit one working tree):
- Build in the git worktree **`/Volumes/Dev/Projects/AquariumGo-chunk13`**, branch **`chunk13`**, made from `next` at
  this handoff's commit (Marshall made it; run `npm ci` there once for typecheck and unit tests, slow on the disk image).
  Commit there freely; don't push `chunk13` to GitHub.
- Leave Marshall's files alone until "chunk 12 done" (list above). If chunk 13 needs a server change, message Marshall.
- The internal-disk test clone `~/LocalTest/AquariumGo` is Marshall's until "chunk 12 done" (its review probes and the
  final passes run there). Until then run typecheck and unit tests in the worktree (slow but fine), no e2e.
- After "chunk 12 done": in the worktree `git merge next` (no rebase of anything pushed), keep building, and from then
  on use the test clone as usual (`git fetch dev chunk13 && git checkout --detach FETCH_HEAD`: the clone's remote `dev`
  is the Dev repo, which shares the worktree's branches). When chunk 13 is done, fast-forward `next` to it
  (`git -C /Volumes/Dev/Projects/AquariumGo merge --ff-only chunk13` on `next`) and push `next` from the internal clone.

**What chunk 13 builds** (SHARED-SHOPS.md §7, §8, §9.2; PLAN.md chunk 11's and chunk 12's "For chunk 13"):
- The connection (`src/ui/shared/*`, the browser's own `WebSocket`): wake with `GET /health` (CORS for the game's
  sites), then `hello` (or the owner's `create`) with the player's Supabase access token, `SHARED_BUILD` and the club;
  wait for `welcome` + the snapshot frame (gzip unless `plain`); the replica (`src/game/sharedLoop.ts`, already built)
  publishes to the game store; `view`, `here`/`away`/`input` (at most once a minute), `token` hourly, `resync` on a
  mismatch, `grant`, `photo`. `src/dev/sharedProto.ts` is a working headless reference (it's what e2e drives today).
- The shared dispatcher: `useGame.getState().installDispatch(fn)` while a shop is open, `soloDispatch`
  (`src/game/dispatch.ts`) back after. Send `cmd` with its id; settle `done` when the step with your `{by, id}` arrives
  and the replica applied it (`runSharedStep` returns results in `cmds` order); a `reject`, or a step lost across a
  reconnect, settles as not applied; a `raiseFlag` the shop already has gets **no step and no reply** (settle it at
  once); coalesce sliders (§4.2). Others' feeds and taps draw from applied commands.
- **Render's proxy eats the server's close frames** (measured): act on the `closing` and `bye` messages and close the
  socket yourself (`bye`: `sign-in` → refresh the session and retry once; `away` → reconnect only when the player is
  back; `protocol`/`server` → "Lost the connection to the shared shop. Reconnecting…" with growing waits). A hidden tab
  disconnects after 2 minutes; "Still here?" at 30 minutes (the server's own idle check is 31).
- Screens and words (§8, all approved): the club card (owner: create, the meters from `sharedUsage()`; member: open;
  closed-for-the-month from `sharedShops()`, which never wakes the server), the title button, the opening steps, the HUD
  strip, the members list with the owner's switch, the pop-ups and the alerts lines (the name in front; first one wins
  from the command's result), "Still here?", every `closing` (incl. `gone`: "{club} has no shared shop any more."),
  Settings › Saves and the save buttons in a shared shop, the starvation toast from a `post` of `setSpeed 1`.
- Your own game waits (§7.2, SHARE-010): saved first, no catch-up for the time away (move its `lastTickRealMs` on by the
  time in the shop), even after the browser closed inside the shop. Nothing saves a shared shop on the device or online
  (SHARE-011): autosave, Save, Load, Import, Export, the online save and the leaderboard report each refuse it first.
- Photos (§4.4): shrink a listing photo to about 320 px (WebP, falling back to JPEG when the browser hands back a PNG)
  before `createListing` (a command may be 48 KB); draw a `p:` reference from a blob fetched over the socket
  (`FRAME_PHOTO`: tag 3, 64 hex, type byte, bytes), never in `<img src>` (`Listings.tsx` already refuses it).
- The marks per player (`src/ui/common/marks.ts`), no guide, no dev panel writes, the error boundary leaves the shop.
- `SocialService` needs the player's access token for `hello` (add it: supabase-js's `getSession()`; the local stub
  gives a stub token, `stub:<id>:<name>` with `:owner` for the owner). `sharedShops()` on the local stub returns none
  today: e2e needs shops there, and the stub server (`server/stub.ts`, `SHOPS_STUB=1`, started by `playwright.config.ts`
  on port 4396) knows only the stub shops' clubs (`new_betta` …), while the game's stub clubs are `highland-betta` etc.:
  make them meet (for instance stub clubs open to every stub player, created by the owner on demand). Coordinate the
  `server/stub.ts` change with Marshall until "chunk 12 done".
- e2e (§9.2): two browser contexts in one shop (a purchase appears in the other; pause refused then granted; the
  activity line and pop-up; first one wins; a listing photo on both; leaving brings your own game back unchanged;
  "Still here?"; a reconnect after the server restarts). The cross-engine replay stays.

**The owner's gates left** (AskUserQuestion, recommended option first, answers verbatim in a new ADR from ADR-0049):
1. Any player-visible words beyond §8.
2. **The play-test** with the owner and their daughter on the live server: deploy `aquarium-go-shops` from `next` (ADR-0047
   decision 2 covers deploys from `next`: `render deploys create srv-dbbt6gbncjis73c23br0 --commit <full sha> --confirm
   --wait -o text`, then `npx vite-node scripts/shared-smoke.ts` from the internal clone); the game itself must reach
   the players for that, so how the play-test build reaches them (a release candidate on `main`, or a preview) is the
   owner's call: ask. Her account: she signs up with the club's invite link; under 13 a parent signs up for her
   (ADR-0039 decision 4).
3. **The 0.6.0 release**, only on the owner's go-ahead in that session: PLAN.md "Releases" (step 4 is new: `main` first,
   Pages deployed, then `render services update srv-dbbt6gbncjis73c23br0 --branch main` and a deploy from `main`; check
   `/health`'s `build` equals the game's hash and both `version.json` files).

**Standing rules** (on top of the ones in Marshall's handoff below, which all still hold): the server's password is never
asked for or shown in chat; if it must change, `node scripts/shared-server-key.mjs --yes` from the internal clone and the
browser-Claude prompt flow in "Learned in chunk 12" (the agent can't set Render variables). Never run a build or install
command to "check" it. The owner prefers agents to do everything they can themselves and to be asked once, batched.

## Handoff to Marshall: chunks 12 and 13 (from Chase, 2026-10-21, at the owner's request)

The owner: "Within CNVS Canvas go ahead and have Marshall build everything out and give it everything it needs to be
100% successful." So Marshall builds chunk 12 (the server and the database) and chunk 13 (the screens and the
play-test), each as a chunk (CLAUDE.md's routine), through to the 0.6.0 release on the owner's go-ahead. `next` is at
`e0721fb` (chunk 11 done, pushed); `main` is 0.5.6 (`3a0e8ce`). Chase is on the same canvas (the terminal "Chase") if a
question about chunks 10 and 11 comes up.

**Read first, in this order:** `AGENTS.md`, `CLAUDE.md`, PLAN.md's "Next step", chunk 10's and chunk 11's briefs and
their "For chunk 12" and "For chunk 13" lists (the work the earlier chunks left on purpose), the whole of
`docs/agent/design/SHARED-SHOPS.md` (§5 and §6 for chunk 12, §7 and §8 for chunk 13, §9 the tests, §11 the costs, §13
the owner's steps), ADR-0043, ADR-0045 and ADR-0046, `docs/agent/design/ONLINE-STAGE1.md` and ARCHITECTURE.md's
"Online" runbook (how chunk 8 set up and changes the Supabase project), `docs/agent/TRUST_BOUNDARY.md`, then the rest of
this file (the practical knowledge, "Learned in chunk 11" last).

**The owner's gates.** Ask once per round with AskUserQuestion (recommended option first), record the answers verbatim
in a new ADR (ADR-0047 onward), and wait for each yes in the session that needs it:
1. *Chunk 12, before anything live:* (a) a yes to apply the new migration to the live project, after the local
   database check passes (`scripts/online-db-local/run.sh`); (b) a yes to deploy the real server (sign-in and the
   database) to `aquarium-go-shops` from `next` for chunk 12's live smoke and chunk 13's play-test. ADR-0046 covered
   only chunk 10's prototype with stub shops and no key; switch the service to `main` at the 0.6.0 release, with that
   release's go-ahead; (c) the owner's one dashboard visit, walked through step by step (SHARED-SHOPS.md §5.8): the
   server's password, which `scripts/shared-server-key.mjs` leaves on the owner's clipboard (ADR-0047 decision 3: no
   Supabase secret key, which could reach accounts), pasted into the Render service's environment as
   `SHOPS_SERVER_KEY`, and chunk 10's test variables deleted (`SHOPS_REPLAY`, `ALLOWED_ORIGINS`, `SHOPS_BYTE_BUDGET`,
   `SHOPS_MAX_CONNECTIONS`, unless the new server reads one on purpose). The Render CLI changes the branch and the build
   command (`render services update srv-dbbt6gbncjis73c23br0 --build-command '…'`) but not the environment. The build
   command removes the password from the build (`env -u SHOPS_SERVER_KEY sh -c '…'`, §5.8); check the build's log for
   the name. (d) OWNER_QUESTIONS K1 (big shops on the free server) with chunk 12's own numbers. **Asked 2026-10-21
   (ADR-0047):** (a) yes once the local check passes, (b) yes once the server's tests pass, and the server password
   instead of a Supabase key; (c) and (d) are still to come.
2. *Chunk 13, first:* **answered 2026-10-21 (ADR-0048, every line approved as drafted).** OWNER_QUESTIONS group L, the words SHARED-SHOPS.md §8 lists as "Words still to approve" (drafts
   there and in `conflictText`, `src/sim/commands/shared.ts`), in one round before building the screens.
3. *Chunk 13, at the end:* the play-test with the owner and their daughter on the live server (she signs up with the
   club's invite link; a parent signs up for a player under 13, ADR-0039 decision 4), then the 0.6.0 release, only on
   the owner's go-ahead in that session: `main` first, the server deployed by hand from `main` after (§5.1), both
   `version.json` files checked.

**The owner's standing rules** (verbatim where quoted):
- "anything that's going to cost anything extra needs to be run by me first"; "lets make everything free if we can for
  now please". Render's free web service and Supabase's free project only; nothing paid without a yes.
- Never push `main` or deploy players' builds without the owner's yes in the session; never force-push or rewrite
  pushed history; push from the internal-disk clone (`git push origin "${N}:refs/heads/next"`).
- Supabase: scope every remote command `--linked --project-ref zkavcxrsxdgdlstravpj`; never print or save the secret
  key; never read the CLI's stored sign-in; the agent never sees the server's key (the owner pastes it into Render), and
  it never enters the repo. Never write invite codes or players' emails in the repo (it is public).
- Reviewers (the chunk's fresh reviewer and its confirmation passes) run on Opus 5.5 at max effort (the Agent tool:
  `model: "opus"`, `effort: "max"`), never Fable.
- No new dependencies without asking (`ws` 8.22.0 is approved, server only, no `@types/ws`). Never weaken, skip or delete
  a test; don't change permission settings, hooks or push guards; don't end a turn while tests or a reviewer you started
  are still running; never count a test that didn't run.

## The order of work

1. **Released** (0.5.5, 2026-10-19; PLAN.md "Releases").
2. **The owner's account: done** (2026-10-19, by Chase with the owner's yes). The owner signed up with the first
   club's link; ARCHITECTURE.md's runbook set `is_owner = true` (the only owner) and the first club's `created_by`.
   Sign-up sends no email (confirmations are off), so a player won't get one. Never write the owner's email in the
   repo.
3. **A database change** goes in a new file under `supabase/migrations` (never edit an applied one): check it with
   `scripts/online-db-local/run.sh` (a throwaway local Postgres, Homebrew's postgresql@16), apply it with `supabase db
   query --linked --project-ref <ref> -f <file>`, run `supabase db advisors --linked --project-ref <ref> --type security
   --level warn` (no database issues; Auth's leaked-password warning is known), then `node scripts/online-smoke.mjs`
   from the internal-disk clone (it has supabase-js; the Dev repo's `node_modules` is an old copy without it; for the
   few seconds it runs, its 100 wrong guesses brake real invite screens).
4. **Released 0.5.6** (2026-10-20; PLAN.md "Releases"). The next release goes as 0.5.4 to 0.5.6 went: the four checks green on the final code, bump
   `version` and add the CHANGELOG entry, merge `next` into
   `main` with the owner's go-ahead in the session (`git merge-tree --write-tree`, `commit-tree`, `update-ref`: no
   checkout), push from the internal-disk clone, watch the Pages run, deploy Render by hand, check both
   `version.json` files.
5. **Shared shops** (the owner chose them, 2026-10-20; "We need to build chunk 11, chunk 12, and chunk 13 however soon
   we can"): chunks 10 and 11 are done (PLAN.md). Next chunk 12 (the server, the database; PLAN.md's "For chunk 12":
   the owner's one Render dashboard visit pastes the key and deletes chunk 10's test variables, and the build command
   removes the key from the build, §5.8), then chunk 13 (ask group L's words first). OWNER_QUESTIONS K1 (big shops on
   the free server) waits for chunk 12's numbers. The audit's remaining findings (B-207, B-208) wait for the owner.

**Asking the owner** (how groups A to E and chunks 4 and 5 went): AskUserQuestion, at most 4 questions per round,
recommended option first and labelled "(Recommended)", each description giving the context needed to choose; put the
exact strings in the option's preview; open design screens on the Mac with `open <png>` first; record the answers
verbatim in an ADR (question as asked, option chosen with its description, notes), then the index, PLAN.md,
REQUIREMENTS.json and BACKLOG.md. Check new questions against earlier answers before asking.

## How this repo is worked (learned in chunks 1 to 5 and the 0.5.1 release)

**Edit in `/Volumes/Dev/Projects/AquariumGo`, test in `~/LocalTest/AquariumGo`.** The disk image is slow, at times very
slow (a `git add -A` and commit there took several minutes in chunk 5: run them with `run_in_background`; search the
test clone instead of the image when grep hangs). Typecheck takes about 2 minutes there, 9 seconds on the internal
disk; e2e times out there. The clone's remote `dev` is this repo.
To test uncommitted work, apply it as a patch on the same base commit (make the script in your scratchpad):

```zsh
cd /Volumes/Dev/Projects/AquariumGo && git add -N . && git diff HEAD --binary > $S/wip.patch
BASE=$(git rev-parse HEAD); cd ~/LocalTest/AquariumGo
git checkout -q -- . && git clean -fdq tests src docs public
git fetch -q dev next && git checkout -q --detach $BASE && git apply $S/wip.patch
```

The four checks on a commit (run it in the background with `run_in_background`, then wait; don't end a turn while it
or a reviewer runs):

```zsh
cd ~/LocalTest/AquariumGo && git fetch -q dev next && git checkout -q --detach <sha>   # npm ci if the dependencies changed
for c in typecheck test build e2e; do echo "=== npm run $c"; PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright npm run $c; echo "=== $c exit $?"; done > $S/checks.log 2>&1
```

Unit tests take about 45 s, e2e about 32 to 35 minutes in Chromium and WebKit (inside Claude Code's sandbox; it works,
don't ask to leave it). **Hold sleep off for a long run:** wrap the checks in `caffeinate -i -s bash -c "…"`. On battery
and idle, the Mac sleeps mid-run (chunk 7: six e2e failures in two passes, every one inside a `pmset -g log` sleep
window); the tests stall, and on wake Vite's client loses its server connection and reloads the page. Every e2e run also builds the production site twice under `/aquarium-go/`: `.e2e-dist` with
`VITE_E2E_DEV_URL=1` for `base-path.spec`, and `.e2e-dist-prod` without it (the players' build) for `prod-mode.spec`.
`npx vitest run --reporter=json --outputFile=<file>` gives a list of failures to compare before and after a sim change.

**Seeing a screen.** Start `npx vite --port 4455 --strictPort --host 127.0.0.1` in the test clone and drive it with a
small Playwright script (the clone's `node_modules/playwright`, `PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`):
`__AQ.newGame`, `__AQ.dev.unlockAll`, `__AQ.act('buyTank', …)`, `__AQ.dev.spawnSpecies`, then set `location.hash`. The
production actions (`createLine`, `setLineRunning`, …) are in `__AQ.act` too. Stop the server when done.

**Releasing.** The local `main` branch can lag `origin/main` (0.5.0 was pushed straight from `next`). Before merging:
`git fetch origin && git checkout main && git merge --ff-only origin/main`, then `git merge --no-ff next`. A version
bump changes `package.json` and the two root `version` fields in `package-lock.json` (no dependency change, so no
`npm ci`). Pages deploys from the push (about 1.5 minutes); check `…/version.json` on Pages and Render, and deploy
Render by hand only if it didn't update (the owner's memory note `render-manual-deploy` has the command).

**Learned in chunk 6.**
- *Push from the internal-disk clone* (`~/LocalTest/AquariumGo`, remote `origin` is GitHub): a push from the disk
  image hung for 13 minutes. Fetch `dev` there, then `git push origin "${SHA}:refs/heads/main"` (braces: zsh reads
  `$M:r` as a modifier). A change under `.github/workflows/` needs gh's `workflow` scope (the owner added it in his own
  Terminal; the device flow times out when run with `!`).
- *Publishing runs the unit tests* (B-193): GitHub's runner and Render's build are about 2× slower and Render's has few
  CPUs. Wall-clock limits in tests/sim go through `tests/sim/support/timeBudget.ts` (×4 on CI and RENDER) and Vitest
  uses two workers when RENDER is set. Watch the Pages run (`gh run watch`) before deploying Render.
- *WebKit*: Tab skips buttons unless Safari's setting is on (press Option+Tab in WebKit); it grants no clipboard
  permissions; it doesn't focus a button on click; it drops a page's hash changes after about 200 in quick
  succession (split long route walks across pages); a transient element can come and go before a poll sees it
  (record it with a MutationObserver from the page's first moment).
- *Silent e2e*: the audio engine treats an automated browser (`navigator.webdriver`) as muted; Chromium was muted by
  Playwright already, WebKit played the game aloud.
- *Fixed-position sheets*: `offsetParent` is always null; measure their box and computed style.

**Determinism.** In `src/sim` and `src/data` randomness comes only from `ctx.rng`, `simRng(state)`, a subsystem's own
stream or a keyed `mulberry32(hashString(key))`. Since chunk 4 every `simRng` draw re-reads `state.rngState`, so
generators can't fork the stream (`core-rng-one-stream`). Every new log event takes an id from the shared `idCounter`, and some
rolls are keyed on ids, so even a new event shifts later rolls: run the whole unit suite before and after, and say so.
A test that compares two runs can see ids shift when its own harness logs differently (production-line's step-size
case compares hours and counts for that reason).

**Moves settle tanks (B-127).** Code that moves an animal or a brood between tanks goes through `moveCreature` /
`moveClutch` (or calls `settleTanks` from `src/sim/settle.ts`): both tanks catch up first, anchored at the step's end
inside a world step, and the move is checked after that (the animal may have died, the brood been raised). Production
lines and a sold tank's relocations already do. Since chunk 5 (ADR-0026 decision 5) so do a shop purchase into a tank,
a water conversion, a substrate change, the Water room's jobs and every manual-mode change: a player action that
changes a background tank settles that tank first (`settleTanks` on its id costs a few ms; settling all 40 tanks
inside an Immer action costs about 85 ms, so a whole-facility settle goes through `flushBackgroundTanks`, mutateFast).

**Reviews take time.** Chunk 4's reviewer on Opus 5.5 at max effort ran about three hours, chunk 5's about 40
minutes; its completion arrives as a notification, so keep working (docs, tests) meanwhile. Follow-ups through
SendMessage (same agent, context kept) confirm fixes in 10 to 15 minutes, and do find new problems in the fixes:
chunk 5's first confirmation pass caught a regression the fix had introduced.

**Learned in chunk 7.**
- *Show the owner numbers before a balance change:* a throwaway probe under the git-excluded `scripts/_audit/` run with
  `npx vite-node` in the internal-disk clone (today's code, then the fix applied to the clone's working copy and
  reverted) gave before-and-after tables the owner could choose from (ADR-0039).
- *A loop hunt needs a fair yardstick:* "worth" counted by the game's own instant sales flagged a frag cut from an
  already-grown coral as a gain until the measure cut a frag from every ready piece too, and frag prices fall a little
  with each sale, so the measure sells everything in one batch per kind. Prove such a test fails with a planted loop.
- *An e2e test that walks the guide* should read the guide's current step and act on it: the betta guide starts on
  "meet", and a fixed script that assumed "camera" failed in both browsers.

**Tests that pass by day and fail by night.** Notification delivery reads the device clock (quiet hours 22:00–08:00).
A test that expects a notification turns quiet hours off (e2e: `aquarium-go.notify.v1` in an init script) or pins the
clock and `timezoneId`.

**Unit-test patterns.** Server-rendered tests (`renderToStaticMarkup`) read a zustand store's *initial* state: copy the
live state into `getInitialState()` first. Sim tests build worlds with `newGame`, `createTank`, `installEquipment`,
`createCreature`/`addCreature` and step with `advanceWorld` or `stepTank` (see `tests/sim/automation-*.test.ts`). Tank
tiers and decor start locked: unlock with `UNLOCK_KEYS` and `unlock(g, k, { silent: true })`. Breeding needs real
cover: the `@/sim/aquascape` mock doesn't reach the breeding module, so put planted decor in the tank
(`tests/sim/support/production.ts` builds a working farm and line; `tests/sim/support/automation.ts` a facility with
the Water room, the Live food room and a stock manager). To make a sim function fail in a test, `vi.mock` the file that
defines it (`@/sim/economy/purchases`), not an index: the economy index's imports reach the staff code while the mock
is being made, and that code then keeps the original. Operations' caches key on the game hour and on
`useGame.getState().actions` (player actions); a test that renders twice in one hour and expects a recompute must
change one of those.

**e2e patterns.** Open the game with `?dev=1` (dev mode unlocks every destination, and counts the Genetics Lab as
researched). Since chunk 7 a production build honours it only when built with `VITE_E2E_DEV_URL=1`; the live site
never does, so anything that scripts a production preview builds it with the flag (README). `aq(page, 'dev.setSpeed', 0)` pauses the clock (a restock mid-test changes shop counts). `__AQ.mutate` takes
a function, so call it inside `page.evaluate`. Playwright's `toBeEnabled` counts `aria-disabled` as disabled.
Notifications are recorded by stubbing `window.Notification` and `ServiceWorkerRegistration.prototype.showNotification`
(`tests/e2e/notifications.spec.ts`).

**Learned in chunk 8.**
- *Supabase's advisors* warn about every SECURITY DEFINER function the API exposes (lints 0028, 0029): the functions
  the game calls live in the schema `private`, behind SECURITY INVOKER wrappers in `public` with the same names.
- *`config push`* pushes every declared section: match `config.toml`'s non-auth settings to the project's first
  (`supabase config diff --project-ref <ref>`), so only what you mean changes.
- *A forwarded address* (`x-forwarded-for`) is the caller's to choose, and keeping addresses is data the privacy note
  doesn't cover: the brake on wrong invite codes is one for everyone, with only times kept.
- *In a JavaScript `replace` string, `$$` becomes `$`*: a test mutation of SQL with `$$` needs a replacer function.
- *The online save's e2e* turns autosave off in its setup, so only the test's own saves count as this device's play;
  `__AQ.social.cloudSyncNow()` waits for the check and send under way.
- *Another project's e2e* (another Claude session's) may run on the same Mac at the same time: a wall-clock test (perf)
  that misses once may be that; look at `pgrep -fl playwright` before calling it a regression.

**Rules that bite.** No new dependencies without asking. Never weaken, skip or delete a test; a changed test is a
deliberate fix explained in the commit. Push `next` with `export PATH=/opt/homebrew/bin:$PATH` first (git's
credential helper is `gh`); never push `main` without the owner's go-ahead in your session; never force-push. Don't
change permission settings or hooks. Ask the owner once, batched, and never more than needed. Use plain literal paths
in commands (the owner dislikes approving command after command). Report a test that didn't run as not run.

**Learned in chunk 10.**
- *Measuring the server:* `scripts/shared-session.ts` (members in Node; Node's WebSocket sends no Origin, so the script
  presents the dev page's) and `scripts/shared-session-browsers.mjs` (Chromium and WebKit through the test page,
  `tests/e2e/shared/page.html`, which needs `npx vite --port 4455`). Room stats on `/stats` add up over a room's life:
  take the difference before and after a run. A free instance sleeps after 15 minutes without requests; the next one
  waits about 20 seconds.
- *Java's StrictMath is fdlibm:* the JDK's `lib/src.zip` holds `java/lang/FdLibm.java`, and `javac`/`java` from
  Homebrew's openjdk@21 compute reference results bit for bit (`scripts/_audit/chunk10/Ref.java` in the internal-disk
  clone).
- *zsh doesn't split words:* `for c in "big_facility 1"; do cmd $c; done` passes one argument; use `${=c}`.
- *A test's own browser contexts:* close them in an `afterEach`; left open in WebKit they slowed the specs after them
  until those timed out, which looked like a flake in someone else's spec.

**Learned in chunk 11.**
- *A new player action is a new command:* its kind in `src/sim/commands/kinds.ts`, its call in `apply.ts`, its fields in
  `validate.ts`'s `SCHEMA` (TypeScript checks every field has one), and a case in `tests/sim/commands-catalogue.test.ts`
  whose sample changes the game (or is a pinned refusal the wrong mapping would turn into a change). If it buys,
  sells, moves or takes, it gets an expectation in `shared.ts` (`staleOf`, `touchesOf`, `markOf`); a setting gets a
  `settingKey`; a new guide flag on an action goes in `ACTION_FLAGS`. The interface sends it with `act(cmd, opts)` and
  reads the result in `opts.after`, never from the return.
- *What chunk 13's shared dispatcher has to do:* `useGame.getState().installDispatch(fn)` while a shop is open, put
  the solo one (`soloDispatch`, `src/game/dispatch.ts`) back after. Send the command with its id; when the step with
  that `{by, id}` arrives and the replica has applied it, call `done` with that command's result (`runSharedStep`
  returns the results in `cmds` order); a rejected or lost command settles as not applied. Coalesce sliders
  (§4.2). The "seen" marks have one home, `src/ui/common/marks.ts`: keep them per player there. Others' feeds and taps
  should draw from applied commands (today the sender's `after` draws them). Today's 640-pixel listing photo is
  larger than a command may be (48 KB): shrink it first (§4.4), and `validateCommand`'s photo field and `repairState`
  gain the `p:<hash>` reference in chunk 12.
- *Mutants find the tests that can't fail.* The review swapped one mapping at a time in a copy of a module
  (`scripts/_audit/review-chunk11/mut/`: `make-mutant.mjs`, `vitest.mut.config.ts`, `confirm.mjs`;
  `scripts/_audit/chunk11/mut/run.sh` is the author's). A sample that changes nothing can't tell a right mapping from
  a wrong one.
- *Syncing to the test clone:* `~/LocalTest/AquariumGo/scripts/_audit/sync-from-dev.sh` copies the Dev repo's sources
  into the clone (no git there). **Never while an e2e pass runs in the clone:** its Vite server serves `src` live,
  so later specs test the new files and the pass no longer tests its commit (a pass on `2202c45` had to be thrown
  away). Check the clone out at the commit for a counted pass: `git checkout -q -- . && git clean -q -fd src server
  tests docs && git fetch -q dev next && git checkout -q --detach FETCH_HEAD`.
- *The reviewer can work during a pass* if its commands run with `nice -n 19`, vitest with `--maxWorkers=1`, and no
  browsers or builds: the e2e pass stayed 319 of 319 while it probed.
- *First one wins needs a mark:* a member's own earlier change is excused only while the thing is as their command left
  it (each touch keeps one); otherwise the game's own later change would be overridden. Offers and the last stored
  piece have no mark on purpose.


**Learned in chunk 12.**
- *The server's password, not a Supabase key* (ADR-0047): a secret key also opens Supabase Auth's admin tools, which no
  database rule limits. `node scripts/shared-server-key.mjs --yes` (from the internal-disk clone, which is linked to the
  project) stores a new password's SHA-256 and leaves the password on the clipboard only; the old one stops at once.
  The agent can't put it into Render (the CLI can't set environment variables; reading the CLI's sign-in to use the API
  is blocked by Claude Code's safety check). What worked: a prompt for a browser-capable Claude in the owner's Chrome
  profile, which stops before pasting; the owner says "make it", the agent runs the script, the owner says "go". Copying
  the prompt overwrites the clipboard, so the password is made last. Never ask for the password in chat: one pasted
  there had to be replaced. Check it took from the build log (`render logs --resources srv-dbbt6gbncjis73c23br0 --text
  "env names"`: the names only; `SHOPS_SERVER_KEY` must be absent) and the server's start-up line (no "not set").
- *Never run a build command to "check" it:* piping `npm ci && …` into `head` ran `npm ci` in the Dev repo before the
  pipe closed and left its `node_modules` half-installed (reinstalled afterwards). Test a command's quoting with `echo`.
- *A preflight before a live migration:* a read-only query (who runs it, role memberships, what `service_role` reaches,
  whose default privileges) told in advance that the migration's own final check would pass.
- *Rooms in the unit tests run in-thread* (`inline` in `server/rooms.ts`) with one fake clock for the rooms, the server's
  jobs and the stub database (`tests/sim/support/sharedServer.ts`); real workers are covered by e2e against the built
  server. A test that waits on the server must move the fake clock (`pump`), or command steps (flushed 50 ms later)
  never go out.
- *The simulation shrugs off most broken data* (a null `water` or `market` steps fine): to make a step throw in a test,
  null `finance`, `progress`, a creature's `stats` or a tank's `decor`.

**Learned in chunk 13.**
- *A woken shop keeps the id it was saved with* (only `create` sets `shared_<club>`; the stub's fixture shops have their
  fixtures' ids): the client goes by the shared mode (`src/state/sharedMode.ts`), and the `shared_` id is only a second
  guard (the slot layer refuses it whoever asks).
- *The game's own guards meet a shared shop in odd places:* the guide card (a stub shop whose guide wasn't done), the
  online save's store listener (the server's saves bump `lastSavedRealMs`), the welcome-back card repeating on every
  welcome for 2 minutes, a hidden tab's return showing the opening card. Look at the screens, not just the tests:
  `scripts/_audit/chunk13/look.mjs` and `two.mjs` (git-excluded) screenshot them against a local stub server.
- *Ports:* the e2e suite uses 4395 (the restart test's own stub server) to 4399; a look-around runs its own stub server
  and Vite elsewhere (4391, 4392), so a pass in the test clone is never disturbed.
- *The e2e stub server lives for the whole run* (Chromium, then WebKit): each browser project plays its own club, and a
  test that sells or lists a fish buys one first.
- *`expect.poll` stops at the first exception* its callback throws: read possibly-missing values null-safely
  (`(await gameOf(page))?.saveId ?? null`).
- *An owner question can take hours to come back:* ask it while there's other work to do, not at the end.
