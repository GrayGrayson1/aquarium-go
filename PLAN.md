# Aquarium Go: the build plan

What we're building, in which chunks, and where we are. Update "Next step" and the status table at the end of every
chunk. This file, `AGENTS.md` and `CLAUDE.md` replace the retired agent harness
(`docs/agent/decisions/ADR-0018-retire-the-harness.md`).

## Next step

1. **0.5.5 is released** (2026-10-19, ADR-0042 decision 6): chunks 7 and 8, on GitHub Pages and Render (see
   "Releases"). Aquarium Go online is live for people with an invite.
2. **Chunks 7 and 8 are done and released (0.5.5).** Chunk 7, hardening for multiplayer (2026-10-18, `7b98be8`,
   `06f80f8`). **Chunk 8, multiplayer stage 1** for people the owner knows (2026-10-19, `ee4998e` to `53cd7bf`; built
   by Marshall; ADR-0038 to ADR-0042): accounts by invite code, one online save, Social on the live Supabase project
   (ref `zkavcxrsxdgdlstravpj`, the Free organization "Aquarium Go"). The owner's account is set (2026-10-19, with the
   owner's yes: the only `is_owner`, and the first club's `created_by`; ARCHITECTURE.md's runbook);
   `docs/agent/SESSION_HANDOFF.md` has the order of work. Stage 2 (before strangers join) needs its own record.
3. **0.5.6 (chunk 9), the audit's five high findings, is released** (2026-10-20; ADR-0044; see "Releases"). Next:
   **shared shops** (the owner, 2026-10-20: "yes, start with the design and questions"): a separate shop a club plays
   together, live, up to 10 at once, run by a small free server on Render. The design is
   `docs/agent/design/SHARED-SHOPS.md` (every browser runs the same steps and the server's copy counts, because Render's
   free plan includes 5 GB of outbound data a month, and every copy uses the same arithmetic, because Node and the
   browsers round `Math.exp` and the like differently); the owner's answers, the screens' words included, are ADR-0043
   and ADR-0045. The design was reviewed (Opus, max effort) and revised. **Chunk 10, the test, is done** (2026-10-20,
   below): the lockstep holds in Node, Chromium and WebKit and on Render's x86-64 free instance, which keeps small
   shops at 10× but not a late-game one (SHARED-SHOPS.md §11). **Chunk 11, commands, is done** (2026-10-20, below):
   every player action is a command the server can pass on, and the solo game is unchanged. **Chunk 12, the server and
   the database, is done** (2026-10-21, Marshall, below; ADR-0047): the real server runs on the free Render service from
   `next` behind sign-in and a server password, the migration is live, the live smoke passes. **Chunk 13, the screens,
   is done** (2026-10-21, Chase, below; ADR-0048, ADR-0049): a club's shared shop opens from its card in Social or the
   title screen, your own aquarium waits, and nothing saves a shared shop on the device. **0.6.0, shared shops, is
   released** (2026-10-21, the owner: "test it and then release"; see "Releases"): GitHub Pages, the Render address and
   the shop server, all from `main`. **Next:** the owner and their daughter play a shared shop (the owner: "I'll have to
   test in a sec"); the opening card's back button from the title screen reuses the existing "Title" (not yet confirmed
   by the owner). **Chunk 14, shared shops' permission tiers and money pool, is done and released as 0.7.0** (2026-10-22; the owner:
   "Within CNVS make Marshall do it … as close to one-to-one as we talked about, as far as being a finished product";
   ADR-0043 decision 5, ADR-0050; see "Releases"). **Next:** the owner and their daughter play a shared shop (the owner
   sets each member's spending in the members list); the questions chunk 14 left for the owner (SESSION_HANDOFF.md). The audit's
   other findings (B-207, B-208) wait for the owner. **Chunk 15, the scenario lab** (dev tools to build any aquarium or
   setup and play it without playing up to it; the owner, 2026-10-23), is done (2026-10-23, Chase; ADR-0051): `npm run lab`
   from `~/LocalTest/AquariumGo`, and docs/SCENARIOS.md. A developer tool: nothing to release. **Next: chunk 16, 31 new
   species** (the owner, 2026-10-24; ADR-0052; the brief below): a friend's reef's missing 12, the maroon clownfish, 9
   reef and 9 freshwater favourites, with real colour forms, young and male/female colours, buyable from the start.
   It starts in a fresh context; it ends in 0.8.0 only with the owner's go-ahead.
4. **Released:** 0.7.0 (chunk 14, the money pool) on 2026-10-22; 0.6.0 (chunks 10 to 13, shared shops) on 2026-10-21; 0.5.6 (chunk 9) on 2026-10-20; 0.5.5 (chunks 7 and 8) on 2026-10-19; 0.5.4 (ADR-0036's and ADR-0037's changes) on 2026-10-18; 0.5.3 (chunk 6's end) and 0.5.2 (chunks 4
   and 5 and chunk 6 so far) on 2026-10-15; 0.5.1 (chunks 2 and 3) on 2026-10-11 and 0.5.0 on 2026-10-06 (see
   "Releases").
5. Every owner question is answered (ADR-0024 to ADR-0049) except, in `docs/agent/OWNER_QUESTIONS.md`: F1, the
   owner's VoiceOver pass during the play-through on a phone and a desktop (ACC-005). NOTIFY-011 and PLAT-004 (the
   native wrapper) stay deferred. The approved screens are in `docs/agent/design/DESIGN-0.5/` and
   `docs/agent/design/DESIGN-S3D/`.

## Status

| Chunk | What | Status |
|---|---|---|
| 0 | Clean-up: the harness retired, S0's game fixes kept, two flaky e2e tests fixed | Done 2026-10-06. Its e2e run (owner, `3601860`): 47 of 48, the one failure camera-freeze's teardown hang, fixed in `859858a` |
| 1 | Navigation, links and the platform layer | Done 2026-10-07 (released in 0.5.0 on 2026-10-06). Its e2e run (`f59d51a`): 75 of 75, no fixes needed |
| 2 | Shop and genetics | Done 2026-10-11 (released in 0.5.1), with the owner's follow-ups (ADR-0022). Its full run (`7acb0b9`): typecheck, unit 2,107, build, e2e 81 of 81; the reviewer's blockers fixed (ADR-0021) |
| 3 | Automation and notifications | Done 2026-10-11 (released in 0.5.1). Its full run (`aeb7657`): typecheck, unit 2,227, build, e2e 90 of 90; the reviewer found no blockers, and its cheap notes were fixed |
| 4 | Production lines | Done 2026-10-14 (not released). Its full run (`ab03ff1`): typecheck, unit 2,302, build, e2e 93 of 93; the reviewer's 8 blockers fixed (`a342098`) and its confirmation pass's one more (`ab03ff1`) |
| 5 | Deep automation (S3-D) | Done 2026-10-14 (not released). Its full run (`baa2234`): typecheck, unit 2,402, build, e2e 107 of 107; the reviewer's 3 blockers fixed (`0b316f1`), its confirmation passes' one each (`d917bdd`, `6a36439`), and its third pass's first note (`baa2234`) |
| 6 | Social stub, hardening and the last 0.5 release | Done 2026-10-15 (released in 0.5.2 and 0.5.3). Its two full passes (`9bff79e`): typecheck, unit 2,697, build, e2e 285 of 285, twice; the code reviewer's 5 blockers fixed (`bba00ab`) and its confirmation's 3 notes (`d1c37bd`); the QA reviewer RED → GREEN (`e23b8a2`, `d1c37bd`, `9bff79e`). The owner's play-through (with VoiceOver, F1) to come |
| 7 | Hardening for multiplayer (ADR-0037, ADR-0039) | Done 2026-10-18 (released in 0.5.5). Two full passes in a row on `06f80f8`: typecheck, unit 2,719, build, e2e 291 of 291, both times; the reviewer's 3 blockers fixed (`06f80f8`) and its confirmation's one (docs) |
| 8 | Multiplayer stage 1, for people the owner knows (ADR-0038 to ADR-0042) | Done 2026-10-19 (released in 0.5.5). The Supabase project set up (ref `zkavcxrsxdgdlstravpj`), the live smoke test 80 of 80; the reviewer's 5 blockers fixed and its confirmations' 2 more, then clean; two full passes in a row on `53cd7bf` (passes 3 and 4): typecheck, unit 2,828, build, e2e 307 of 307, both times |
| 9 | 0.5.6: the audit's five high findings (ADR-0043, ADR-0044) | Done 2026-10-20 (released in 0.5.6). The fifth migration applied live, the smoke test 91 of 91; the reviewer's 4 blockers fixed and its four confirmation passes' 6 more, the last clean; two full passes in a row on `9266584`: typecheck, unit 2,868, build, e2e 311 of 311, both times |
| 10 | Shared shops, the test (SHARED-SHOPS.md §10, ADR-0046) | Done 2026-10-20 (released in 0.6.0). One arithmetic, the step block, the prototype server on the free Render service; the review's 2 blockers fixed and its notes; the final pass on `e0f14de`: typecheck, unit 2,891, build, e2e 319 of 319 |
| 11 | Shared shops, commands (§4, §3.2) | Done 2026-10-20 (released in 0.6.0). Every player action a command (80 kinds), the solo dispatcher, who did it and first one wins, rule 10; the review's 4 blockers fixed and its confirmation's notes; the final pass on `e692066`: typecheck, unit 3,037, build, e2e 319 of 319 |
| 12 | Shared shops, the server and the database (§5, §6) | Done 2026-10-21 (released in 0.6.0). The real server on the free Render service and the migration live (ADR-0047: a server password, no Supabase key); the review's 3 blockers fixed and its first confirmation's one, the second clean; the final pass on `aa7b184`: typecheck, unit 3,103, build, e2e 321 of 321; the live smoke 23 of 23 on `8b65dbf` |
| 13 | Shared shops, the screens and the play-test (§7, §8) | Done 2026-10-21 (released in 0.6.0; Chase, at the owner's request; the words approved, ADR-0048 and ADR-0049). The connection, the shared dispatcher, the screens, your own game waiting, the save guards, photos; the review's 5 blockers fixed and its confirmations' 2 more, the third clean; the final pass on `c063c6e`: typecheck, unit 3,202, build, e2e 329 of 329. The play-test build on the Render address, the agent's live two-browser test 18 of 18 there and again on Pages after the release; the owner's own play-test next |
| 15 | The scenario lab (ADR-0051) | Done 2026-10-23 (Chase, at the owner's request; not released: a developer tool). Recipes, the builder, 13 presets, the lab screen, the addresses and `__AQ.scenario`, `npm run lab` and `npm run scenario`, docs/SCENARIOS.md; the review's 4 blockers fixed, its first confirmation's 2, the second clean; the final pass on `aae0922`: typecheck, unit 3,363, build, e2e 335 of 335 |
| 14 | Shared shops, permission tiers and the money pool (ADR-0043 decision 5, ADR-0050) | Done 2026-10-22 (released in 0.7.0; Marshall, at the owner's request; the owner's answers, ADR-0050). The pool's tiers, requests, allowances and gifts in the shop's state, six commands, the server's spend refusal, the Money sheet; the review's blocker and its confirmations' notes fixed, the second confirmation clean; the final pass on the release commit `d16dd72`: typecheck, unit 3,243, build, e2e 331 of 331; live: the smoke 27 of 27, the two-browser money test 29 of 29 on Pages and on the Render address |
| 16 | 31 new species (ADR-0052) | Brief written 2026-10-24 (Chase, at the owner's request); not started. A friend's reef's 12 missing animals and the maroon clownfish, 9 reef and 9 freshwater favourites; real colour forms; young and male/female colours; buyable from the start; `SCHEMA_VERSION` 3; ends in 0.8.0 with the owner's go-ahead |

**Last full test runs:** chunk 15's final code `aae0922`, the owner's Mac, 2026-10-24, from the internal-disk clone under
`caffeinate -i -s`: typecheck passed; unit 261 files, 3,363 tests passed; build passed; e2e 335 of 335 in Chromium and
WebKit, dev and both production builds (39.9 minutes). Before it: `f9c62ab` the same four green (e2e 335 of 335, 40.0
minutes); `0bdc84c` the same four green (unit 3,341, e2e 335 of
335, 40.5 minutes), followed by the review's fixes; a pass on `765b6b6` was stopped part-way when the confirmation's
fixes landed.
Before chunk 15: chunk 14's release commit `d16dd72`, the owner's Mac, 2026-10-22, from the internal-disk clone
under `caffeinate -i -s`: typecheck passed; unit 257 files, 3,243 tests passed; build passed; e2e 331 of 331 in Chromium
and WebKit, dev and both production builds (39.9 minutes). Before it: `5843bb0` the same four green (unit 3,243, e2e 331
of 331, 40.4 minutes), followed by the confirmation's notes (`a8131b1`); `84799bc` typecheck, unit 3,237 and build green,
e2e 328 of 329 (the money test's pop-up check in Chromium, a toast the stack held back; the test fixed on purpose).
Before chunk 14: chunk 13's final code `c063c6e`, the owner's Mac, 2026-10-21, from the internal-disk clone under
`caffeinate -i -s`: typecheck passed; unit 255 files, 3,202 tests passed; build passed; e2e 329 of 329 in Chromium and
WebKit, dev and both production builds (39.4 minutes). Before it: `d6c7926` (unit 3,166, e2e 329 of 329) and `882c06c`
(unit 3,192, e2e 329 of 329), both green, each followed by the review's fixes; a pass on `7e44242` was stopped in its e2e
(its typecheck, unit 3,198 and build green) when the second confirmation's fix landed.
Before chunk 13: chunk 12's final code `aa7b184`, the owner's Mac, 2026-10-21, from the internal-disk clone under
`caffeinate -i -s`: typecheck passed; unit 246 files, 3,103 tests passed; build passed; e2e 321 of 321 in Chromium and
WebKit, dev and both production builds (38.0 minutes); then `8b65dbf` (one test and PLAN.md more): typecheck and unit
3,104 passed. Before it: `cdc5387` the same four green (unit 3,085, e2e 321 of 321, 37.8 minutes); a pass on `1689c46`
was stopped at 160 e2e tests without a failure (typecheck, unit 3,100 and build green) when the confirmation's fix
landed.
Before chunk 12: chunk 11's final commit `e692066`, the owner's Mac, 2026-10-20, from the internal-disk clone
under `caffeinate -i -s`: typecheck passed; unit 243 files, 3,037 tests passed; build passed; e2e 319 of 319 in
Chromium and WebKit, dev and both production builds (36.7 minutes). Before it: `03b3f4b` the same four green (unit
2,998, e2e 319 of 319, 37.1 minutes); a pass on `2202c45` was stopped part-way (its unit 3,028 and build green) when
files were copied into the clone during its e2e, and isn't counted.
Before chunk 11: chunk 10's final commit `e0f14de`, the owner's Mac, 2026-10-20, from the internal-disk clone
under `caffeinate -i -s`: typecheck passed; unit 239 files, 2,891 tests passed; build passed; e2e 319 of 319 in Chromium
and WebKit, dev and both production builds (37.2 minutes). Before it: `01e854c` 316 of 317 and `51eb240` 318 of 319
(both a WebKit `social.spec` timeout caused by `shared-lockstep.spec`'s open contexts, then fixed), `1d1f7ed` 316 of
319 (WebKit perf under load, 8 of 8 alone).
Before chunk 10: chunk 9's final commit `9266584`, the owner's Mac, 2026-10-20, from the internal-disk clone,
twice in a row under `caffeinate -i -s`: typecheck passed; unit 236 files, 2,868 tests passed; build passed; e2e 311 of
311 in Chromium and WebKit, dev and both production builds (35.7 and 35.6 minutes). Before them, the same four checks
on `c51a7f1` (unit 2,851, e2e 311 of 311) and `827eacd` (unit 2,858, e2e 311 of 311), both green, each superseded by
the review's fixes; passes on `b5d169f`, `34292ff` and `f98c986` were stopped part-way when the next fix landed.
Before chunk 9: chunk 8's final commit `53cd7bf`, the owner's Mac, 2026-10-19, from the internal-disk clone,
twice in a row under `caffeinate -i -s` (passes 3 and 4): typecheck passed; unit 235 files, 2,828 tests passed; build
passed; e2e 307 of 307 in Chromium and WebKit, dev and both production builds (35.7 and 35.2 minutes). Before them:
pass 1 on `6f5f724` (302 of 307: six Settings tabs and Social's re-ask, both chunk 8 effects then fixed, and one
WebKit perf timing while another project's e2e and the review ran on the same Mac) and pass 2 on `956aa55` (306 of
307: the sign-in form's late network error, then fixed). The live smoke test on the project: 80 of 80.
Before chunk 8: chunk 7's final commit `06f80f8`, the owner's Mac, 2026-10-18, from the internal-disk clone,
twice in a row under `caffeinate -i -s` (passes 4 and 5): typecheck passed; unit 229 files, 2,719 tests passed; build
passed; e2e 291 of 291 in Chromium and WebKit, dev and both production builds (32.2 and 32.1 minutes). Before them on
`06f80f8`: pass 2 the same (32.4 min); pass 3 287 of 291, all four failures inside the Mac's idle-sleep windows on
battery (B-204). Pass 1 on `7b98be8`: 287 of 291 (the tutorial test in both browsers, fixed in `06f80f8`, and two
WebKit viewports tests inside a sleep window).
Before chunk 7: 0.5.4's release commit `97da6bc`, the owner's Mac, 2026-10-18, from the internal-disk clone
checked out at that commit: typecheck passed; unit 227 files, 2,702 tests passed; build passed; e2e 289 of 289 in
Chromium and WebKit, dev and production builds (31.9 minutes). Before it, `50dc443` (the same code; the CHANGELOG's
version not yet fixed): the same except e2e 288 of 289 (B-204's fourth: a WebKit graphics error on the title screen,
26 of 26 alone). Chunk 6's two passes in a row (REL-013) on `9bff79e`, 2026-10-15: typecheck, unit 2,697, build, e2e
285 of 285, both times. Earlier: `d7560f9` clean (2,696; 281 of 281); `db25042` one failure (`shop-filters.spec.ts:75`, a
sheet's focus race, fixed in `e23b8a2`).

## How a chunk runs

1. `git checkout next && git pull`, and note the commit you start from.
2. Read the chunk's brief below and only the design sections it names (the 0.5 spec is 159 KB). The harness's
   slices map to chunks: S1 is chunk 1, S2 is 2, S3 (S3-A, S3-B) is 3, S3-C is 4, S3-D is 5, S4 is 6. In
   `docs/agent/BACKLOG.md`, apply your chunk's rows of "Design errata by slice", and fix the open rows of your slice
   or defer them here with a reason. Fix cheap items in the files you touch and mark them fixed.
3. Build it in sensible commits, following `AGENTS.md`.
4. Run `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` on the final code; all four pass (for e2e
   see `CLAUDE.md`). The 0.5 spec also asks that a v0.4.0 save loads with no repairs; that is best-effort only
   (ADR-0005). What must hold: PERSIST-002, PERSIST-003, PERSIST-007 and, from chunk 1, PERSIST-014.
5. One fresh reviewer subagent gets the brief and `git diff <start>..HEAD` (not your summary) and reports blockers;
   fix them and re-run the checks. Reviewers run on Opus 5.5 at max effort (`model: "opus"`, `effort: "max"`), never
   Fable (the owner, 2026-10-11).
6. Update this file, commit, push `next`, and tell the owner what to try (`npm run dev`, then
   http://127.0.0.1:5173).

**The owner's one-line check run**, for when the agent can't run e2e itself. It pushes `next`, checks it out in the
internal-disk clone (Next step 2), runs all four checks there and keeps a log in
`~/LocalTest/AquariumGo/.agent-runs/checks-next.log`:

```bash
cd /Volumes/Dev/Projects/AquariumGo && git push -u origin next && cd ~/LocalTest/AquariumGo && git fetch dev next && git checkout --detach FETCH_HEAD && npm ci && mkdir -p .agent-runs && { git log --oneline -1; for c in typecheck test build e2e; do echo "=== npm run $c"; PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright npm run $c; echo "=== $c exit $?"; done; } 2>&1 | tee .agent-runs/checks-next.log
```

**Known flaky tests** (from the harness's baseline): `boot.spec.ts:17` and `camera-freeze.spec.ts:34` once timed out
tearing down the browser; `playthrough-starters` can trip Vitest's RPC timeout on a slow machine; `core-gameloop`'s
20 ms median-tick test depends on machine speed. If one fails, re-run it alone on an idle machine before calling it
a regression, and never loosen it on the owner's Mac. (On GitHub Actions and Render's build, `CI` and `RENDER`, every
wall-clock limit in tests/sim is multiplied by 4 through `tests/sim/support/timeBudget.ts`: those machines measured 2×
slower on 2026-10-15, and the rest is room for a busy build machine, since a failed Render build blocks a release.)
The teardown hang is Chromium's graceful `context.close()` on a busy WebGL page
(headless, Metal): in the owner's run on `3601860` camera-freeze's body passed in 38 s and the close then hung for
120 s, while closing the browser took 1.4 s. `camera-freeze.spec` now runs in a browser of its own and closes it with
`browser.close()` (`859858a`); give `boot.spec.ts:17` the same treatment if it hangs again.

**Testing notes** (from chunks 1 to 4):
- To test uncommitted work, `git diff --binary` it into a patch and `git apply` that in the internal-disk clone (on
  the same base commit); run the checks there.
- An e2e spec that counts shop stock pauses the clock (`dev.setSpeed 0`): a restock mid-test changes the counts.
  `dev.addShopOffer` offers never light the Market's rare-stock dot; clone a stock offer under a new id through
  `__AQ.mutate` to light it.
- Server-rendered unit tests (`renderToStaticMarkup`) read a zustand store's initial state, not its live state: copy
  the live state into `getInitialState()` first (see `tests/sim/ui-shop-05.test.ts`).
- Notification delivery reads the device clock (quiet hours): a test that expects one to show turns quiet hours off
  (the e2e specs set `aquarium-go.notify.v1` in an init script) or pins the clock and timezone, or it fails at night.
  e2e records notifications by stubbing `window.Notification` and `ServiceWorkerRegistration.prototype
  .showNotification`. Playwright's `toBeEnabled` counts `aria-disabled` as disabled.
- Every e2e run also builds the game for production under `/aquarium-go/` and serves it for the `base-path` project
  (about 10 s more, even for one spec).
- Sim tests that breed need real cover: the `@/sim/aquascape` mock doesn't reach the breeding module, so put planted
  decor in the tank (`tests/sim/support/production.ts` builds a working farm and line). Tank tiers and decor start
  locked: unlock them with `UNLOCK_KEYS` and `unlock(g, k, { silent: true })`.

**Requirements.** The ids below come from `docs/agent/REQUIREMENTS.json`; their acceptance criteria are the
checklist. Skip criteria that only made sense for the harness (gates, ledgers, evidence manifests, reviewer records,
slice contracts). Where a criterion leaves a value to "the slice contract" (a budget, a tolerance, a string), choose
it, write it under the chunk below, and ask the owner about player-visible text the designs don't give. When a chunk
is done, set its ids to `GREEN` (or `DEFERRED`, with the reason in `note`).

## Chunk briefs

### 1. Navigation, links and the platform layer (0.5 phases 0 and 1) — done 2026-10-07

- **Built:** `src/platform/` (a new top-level layer, in `docs/ARCHITECTURE.md` and the architecture test);
  `src/ui/nav/` (routes, the hash router, the boot, reload and leave rules); the phone tab bar and More sheet;
  full-height phone sheets; locked panels; Copy link on offers; forward-safe saves (PERSIST-014). Requirements
  NAV-001 to NAV-018, PLAT-001 to PLAT-003, PLAT-005, ACC-001, ACC-002, DES-001 to DES-004, PERSIST-014, CONST-005.
- **Decided:**
  - The owner's answers are ADR-0019: a link to a real screen skips the title and opens the latest save behind the
    loading card; a reload (or a return through history) reopens this tab's aquarium at the address; the loading
    card's bar loops; the not-found toasts' wording.
  - Phone sheets start at 64 px ± 2, the tank card at 118 px ± 2, the More sheet's top at 48 % of the height;
    "Link copied" shows for 4 s.
  - `?dev=1` allows the developer tools for that session only and doesn't switch the dev panel on by itself (e2e and
    QA open the game with `?dev=1`, and dev mode unlocks every destination). The owner confirmed it (ADR-0024).
  - The More tab opens the More sheet; while it's highlighted, tapping it returns to the tank view. A panel's first
    tab has no URL segment (`#/build` is Build › Tanks). A link opened in a fresh tab gets no synthetic parent entry.
  - DESIGN-S3D will move Settings to a gear and put Operations in the dock and first in More (`INTAKE.md` C-1, C-2):
    the dock and More are built so that's a small change.

### 2. Shop and genetics (0.5 phase 2) — done 2026-10-11

- **Built:** shop filters and counts; morph-named offer cards; the offer detail's Genes and Temperament sections,
  morph line, from-notification banner, per-tile verdicts, fit badge and buy labels; the gone-offer button; the
  Market's rare-stock dot; the Genetics Lab reveal fix; the Cambodian and Metallic betta genes, the Cambodian Veiltail
  strain and the `rare` allele flags; the Encyclopedia's genes line and science article. Requirements GEN-001 to
  GEN-012, MKT-001 to MKT-015, DES-005, DES-006, ACC-003, PERF-001.
- **Decided:**
  - The owner's answers: ADR-0020 (long verdict labels in the offer detail; white and double tail below their
    partners; the article, the betta note and the no-tank wording; gene nouns; tile reasons only for temperature),
    ADR-0021 (a gene that leaves no trace reads "Can’t be seen on this animal" before the Genetics Lab; "all their
    young"; "Pair it") and ADR-0022 (Legendary below 1 in 10,000; the Stability word "Stable · Sensitive · Fragile";
    the lined seahorse's yellow/red looks Yellow).
  - Tiers (`npm run report:rarity`): betta 240 morphs at 1 / 9 / 21 / 39 / 170 (v0.4.0) → 540 at
    1 / 9 / 21 / 145 / 364, 0.56 % of betta stock Legendary.
  - **PERF-001 budgets**, measured on the owner's Mac (internal disk, vite-node, median of 7). v0.4.0 (`0d9fc5a`) →
    chunk 2: building the betta catalog 5 ms (first 10 ms) → 33 ms (first 43 ms); Encyclopedia › Betta's genetics
    sections from cold 9 ms → 28 ms, warm 4 ms → 4 ms; previews for `big_facility`'s 10 freshwater tanks 0.8 ms →
    0.8 ms. Budgets: the betta catalog builds in ≤ 100 ms once per session; Encyclopedia › Betta renders in ≤ 100 ms
    cold and ≤ 16 ms warm; an offer computes at most 6 tile previews eagerly (plus the selected tank), ≤ 8 ms
    together; the first offer of a species builds its look table once (bettas ≈ 30 ms); `perf.spec` stays green.
  - Before the Genetics Lab a Genes row says only what the animal's look proves (`lookalikePairs` in
    `src/ui/panels/market/offerGenetics.ts`; a property test checks look-alikes read alike in every species). The
    morph line shows for every tier except a degenerate "about 1 in 1". `dev.addShopOffer` offers count as seen (a
    test scenario isn't news) and take `alleles`. The Encyclopedia's genes line is shown for bettas only.
  - Seeded tests: B-128's three seed-fragile tests were rebuilt first (`6343ca2`), the rest passed unchanged.
  - Deferred, with reasons in `docs/agent/BACKLOG.md`: B-130 to chunk 4, B-170 to chunk 5, B-181 to the next render
    pass; B-178's high-contrast panels go to chunk 6 (ADR-0024: WCAG 2.2 AA with solid high-contrast panels).

### 3. Automation and notifications (0.5 phase 3) — done 2026-10-11

- **Built:** the Auto Water Changer (data, one per tank, the shared water-change core `src/sim/water/change.ts`,
  `runWaterChanger`, salt, keepers, save repair of its two lab hours); the tank card's Automation section (Auto-feed
  with Meals a day, Auto-clean, buying from the card) and the Water tab's note; the "Auto-feed is paused" alert (drawer
  row, tank dot, a once-a-day sim event); notification tags on sim events (`GameEvent.notice`, `offerId`) and the
  "auction ending soon" event; Settings › Notifications; web delivery (`src/ui/notify/`), `public/sw.js`, the 192 px
  icon; the Alerts drawer footer; tap routing with the one-shot offer banner; the `base-path` e2e project (B-126).
  Requirements AUTO-001, AUTO-003 to AUTO-011, AUTO-023, NOTIFY-001 to NOTIFY-010, DES-007, DES-009 GREEN; AUTO-016
  to AUTO-018, AUTO-022, AUTO-026, ACC-004 and PERSIST-006 IN_PROGRESS (met for this chunk's automation; chunks 4 and
  5 add production lines and the S3-D chains).
- **Decided:**
  - The owner's answers: ADR-0022 decisions 4 and 5 (the Unsupported callout, "auction ending soon") and ADR-0023
    (the "ending soon" wording, "{Name} gave birth" for live births, a prize-less show result keeps the log's line,
    the locked Auto-clean row shows the Auto-feed lock hint).
  - Quiet hours run from 22:00 up to 07:59 (22:00 held, 08:00 shown, B-173's proposal); a held notification is dropped,
    not delivered at 8 AM (the Alerts drawer keeps everything). Danger-level Animal care, and untagged danger events
    about a tank, come through. "Auction ending soon" fires 3 game hours before the end.
  - Step-size tolerance (AUTO-009): 4 h and 0.25 h pieces make the same changes and scrapes at the same hours and end
    within 0.15 °C, 0.05 pH and 3 % of nitrate (or 0.5 ppm); the owner accepted such tolerances for water values
    (ADR-0024 decision 7). A keeper's 30-hour window is strict (30 h: the keeper
    works again). The device skips a change for lack of salt (never a weak one) and retries the next morning.
  - What notifies: events the sim tags (rare stock, bids, sales, ending soon, breeding milestones that toast, show
    results, animal-care warnings) plus danger events about a tank. The notification needs come from the event, copied
    when it happens. The service worker is registered only once permission is granted.
  - Not built: the optional Finances "Automation gear" row (it would repeat the tanks' costs above it).
  - Seeded tests: none moved. The device runs only where installed; the new events fire only where the scenarios
    don't look (the full unit suite passed unchanged after the sim commits, before the new tests). Accepted across
    builds: the two new events ("auction ending soon", a switched-off Autofeeder with a hungry resident) take ids, and
    some rolls are keyed on ids, so a save continued in this build can roll differently from the old one (old saves
    are best-effort, ADR-0005).
  - Backlog: fixed B-013, B-117 (S3-B), B-126, B-149, B-173, B-188, B-189; partly B-169 (one salt formula; the UI-lane
    mutators move with chunk 5) and B-176 (the device is LOD-exact; cool-water cues left); deferred B-177 and B-127,
    B-171, B-174 to chunk 4 and B-180 to chunk 5 (reasons in `docs/agent/BACKLOG.md`); B-167 stays open (no
    compatibility decisions in this chunk).

### 4. Production lines (0.5 phase 5, several lines per species) — done 2026-10-14

- **Built:** `src/sim/production` (the line step once per game hour crossed from the world step; set-up checks,
  slots, names and ids; End line; Add a quarantine tank; costs; the view numbers) and Livestock › Production
  (`Production.tsx`, `ProductionSetup.tsx`: the line picker and slot caption, each line's header, tiles, five stages,
  route strip and Line rules, the three set-up steps, End line, Add a quarantine tank, the Sort sheet, choosing another
  pair or tank). Routes `#/livestock/production/:lineId` and `/new`. The economy and research fixes (B-017, B-138,
  B-139, B-174, B-195), B-127 (moves settle both tanks), B-171 (the save budget) and B-177 (mutateFast). Requirements
  PROD-001 to PROD-017 and PROD-019 to PROD-021, DES-008, AUTO-019 to AUTO-021, AUTO-024, AUTO-025, ACC-004,
  PERSIST-005 and PERSIST-006 GREEN; PROD-018 SUPERSEDED (ADR-0025); AUTO-014, AUTO-016 to AUTO-018, AUTO-026 and
  AUTO-027 IN_PROGRESS (met for production lines; chunk 5 adds the S3-D chains, the overview and AUTO-027's backup
  case).
- **Reviewed:** one fresh reviewer (Opus 5.5, max effort) read `02959af..bd02cb2` against this brief: 8 blockers, all
  fixed in `a342098` (the stream fork when a line's moves settle tanks; moves checked before settling; no temperament
  check at set-up; a keep tank shared with another line's other stages; one creature in two lines; the pair list's
  overall cap; a gone line's address; set-up taking a display tank off display), with most of its 19 smaller points.
  Its confirmation pass found all 8 fixed and one new blocker (the quarantine "cycled" line), fixed in `ab03ff1`.
- **Decided:**
  - The owner's answers: ADR-0025 (group B), ADR-0026 decision 3, ADR-0030 (this chunk's copy, the betta female,
    whole-tank sales) and ADR-0031 (the review's four lines of copy).
  - **The hold (PROD-010):** a held pair carries `repro.lineHold`, which keeps `readinessTarget` at 0 as resting
    does, so no species starts a new courtship; nothing is moved. A pair is held while the line is paused by the
    player, waiting for room, or missing a partner or tank. Waiting for room = the raise tank holds the line's young
    and has fewer places than the species raises per clutch (INTAKE C-30's places at the raised size).
  - **Raise** starts when a brood is free-swimming (the species' last rearing phase, out of the egg and parent) and
    lasts until the breeding sim raises it (species data, ADR-0025 decision 2); **Sort** runs on the young the hour
    after they're raised; **Quarantine**: the first free, cycled quarantine tank with room, one batch per tank across
    lines, 168 h; what doesn't fit waits as its own batch. "Cycled" is the game's line for a tank with animals,
    bioMaturity 0.4 (the water report's "Tank is still cycling"); a batch held only by an uncycled tank says so once.
  - **Set-up** checks each stage's tank for water, temperature, places for young and temperament: the compatibility
    engine's aggression, predation and social reasons at warning or worse refuse it, in the engine's words (stocking
    stays the places check's). Lines may share tanks, never a keep tank with another line's other stages.
  - **One owner:** a creature belongs to one line; becoming a line's parent takes it out of every batch, and costs
    count it for that line only. **Keep rules** are phenotype rule ids (the morph catalog's traits), best by value,
    ties by creature id. Favourites are never moved; Prismatics follow the switch and are never listed.
  - **Costs** are hour by hour: each line pays its share of its tanks' running cost (`tankDailyCost / 24`) and of
    each serving fed (`noteFoodSpend`), its share being its pair, young and broods over everyone in the tank.
  - **One random stream:** every `simRng` draw re-reads `state.rngState`, so a generator made before a settle's
    draws continues the stream instead of replaying it (the review's fork; also `newGame`'s own, below).
  - **Step sizes (PROD-016, AUTO-016):** 1-hour and 6-hour steps give the same moves, sorts and listings at the same
    hours; random partitions give the same counts with hours within one game hour (the breeding sim raises a brood
    inside a sub-step), the tolerance ADR-0024 decision 7 allows. Runs with background tanks (the settler running)
    repeat exactly.
  - **The save budget (PERSIST-005):** 2.5 million characters (`SAVE_BUDGET_CHARS`), what the smallest common
    localStorage quota holds. A Grand Hall with 40 tanks, 500 animals and eight lines fits. Recorded exception: listing
    photos. Past the budget the page-close copy leaves them out, and as the newest copy it's the one the next load
    uses, so those listings lose their photos (KNOWN_LIMITATIONS).
  - The pair list shows up to 30 pairs per species (a line's own and ready pairs first). A gone line's address opens
    the lines with "This line isn't here any more" (ADR-0026 decision 9). Line colours follow the line's place in the
    list (DESIGN-S3D §12), so a line's colour can change when an earlier line ends.
  - Not built: the Production tab's dot and the link row to Operations › Lines (chunk 5 has Operations); a screen for
    ended lines' history (kept in the save; Operations › Lines can show it); a sell editor (Sell is fixed at fair value
    −10%, ADR-0030 decision 6).
  - Seeded tests: one moved, explained in `a342098`. `simRng`'s fix also ends a fork in `newGame` (a generator made
    before `starterAquascape` drew, then the starter rolled from it), so `newGame(seed)` without a previewed starter
    continues the stream differently; the game's own start passes the previewed starter, so a player's seed still
    gives the same world. `fix-core-offline` R03-04 compared each tetra with the healthy run's best recovery, which a
    chance illness there pulled down; it now compares each tetra with itself. Before that, the full unit suite ran
    before and after each sim change (2,227 → 2,232 → 2,273 → 2,283), the only failures being five tests pinning the
    old whole-tank-sale rule, changed on purpose for ADR-0030 decision 8 (`6996ef7`).
  - Backlog: fixed B-017, B-127, B-135, B-138, B-139, B-171, B-174, B-177, B-195; partly B-130 (M24 and M62 wait for
    their fixes); B-167 stays open (set-up now asks the engine; runtime moves don't).

### 5. Deep automation (S3-D) — done 2026-10-14

- **Built:** `src/sim/automation` (the Water room: prep flow, salt mixing at 10 AM and 10 PM, water changes from the
  reserves at each tank's lights-on, the Auto Top-Off on the fresh reserve; the Live food room: hatchery cones,
  infusoria jars, the storage limit, live-food dosers; manual mode's five holds; Problems, Today, the weekly money and
  the flows), the three Facility research projects (finishing one installs its room), the stock manager's check split
  into a pure plan (`planPurchases`, the forecast) and the purchase (`stockCheck`), the orders switch, the nightly
  running costs, brine shrimp egg tins and 5 / 20 / 40 kg salt, SCHEMA_VERSION 2. The UI: Operations (Overview early,
  before the Desk and full; Water; Feed; Lines; Map; Problems with "Why the line stops"; Manual mode; the locked
  pages), Operations in the dock after Build and Settings on the gear (`hud-settings`), the More row, the manual-mode
  pill, the Facility map room chip, the tank chips in the Tanks panel (problems first) and on the tank card, the doser
  row, the alerts drawer's Automation section, Build › Facility rooms, Supplies (Live food, Cultures, Dry food, salt
  sizes), Staff (the $1 slider, the orders switch, the status line), Research's Facility branch, the Automation
  notification category, the Production tab's dot and link row. Routes
  `#/operations[/water|feed|lines|map|issues|manual][?layer=]` and `#/build/facility/water|food`.
- **Requirements:** NAV-020 to NAV-024, MKT-017, NOTIFY-012, ACC-006, PERF-004, PERSIST-016, AUTO-002 and its chunk
  5 children (AUTO-012 to AUTO-018, AUTO-022, AUTO-026 to AUTO-028, AUTO-030 to AUTO-047) GREEN. DES-013 (a test that
  finds every SPEC §11 string and §14 id) and DES-014 (a full Browser QA pass against `screens/`) IN_PROGRESS, for
  chunk 6's hardening and the owner's play-through.
- **Reviewed:** one fresh reviewer (Opus 5.5, max effort) read `130995d..010d64a` against this brief: 3 blockers (the
  keepers' salt lost once a Water room exists; the forecast recomputed on every panel refresh, PERF-004; Hold and
  Resume not settling background tanks) and 10 smaller points, fixed in `0b316f1`. Its confirmation pass found them
  fixed and one new blocker (salt sorting ahead of food that was out), fixed in `d917bdd` with three of its smaller
  points; two points went to the owner (ADR-0033). Its second pass found the two Water room warnings hid most real
  shortfalls (a day's totals missed the 60 % rule and the reserve's size): `6a36439` drives them from a dry run of the
  room's week (`forecast.ts`), with the owner's third round (ADR-0033). Its third pass found no blockers (verdict:
  ready); its first point (a mixer starved of fresh water reported as a salt shortage) is fixed in `baa2234`, the
  rest is B-202. Its check of `baa2234`: no blockers, ready; its two notes on the fresh warning's wording are in B-202.
- **Decided:**
  - The owner's answers: ADR-0026 (C1 to C14), ADR-0027 (the approval), ADR-0032 (this chunk's copy: shortages, the
    quiet log lines, toasts and receipts, the stock manager's lines without a pronoun, the small labels) and ADR-0033
    (the review's copy; salt batches grow with the reservoir; "Salt water runs short" and "Fresh water runs short").
  - **Jobs** run at their game hours in time order, same-hour jobs in SPEC §9.9's order; each has its own marker, so a
    re-stepped window, a save and load or the catch-up never repeats one; no randomness. The prep flow is added up to
    each job's hour first.
  - **Settling (ADR-0026 decision 5, B-176):** a background tank catches up before each shared water job, a move, a
    sale, a line's moves, a purchase into it, its water conversion or substrate change, and every manual-mode change
    (Hold all and Resume flush every tank on the fast path first, `flushBackgroundTanks`); the focused tank runs at full
    detail. Idle tanks stay coarse.
  - **Water changes with a Water room** go tank by tank in `tankOrder` at each tank's lights-on; a change the reserve
    can't cover is skipped, never done weak. The per-tank Auto Water Changer stands aside. The player's and the keepers'
    changes stay on tap water and shelf salt (C-67).
  - **The Auto Top-Off** draws from the fresh reserve as its tank catches up: background tanks' top-offs land at the end
    of their chunk, so the fresh reserve agrees across step sizes and focus within 0.5 gal; the jobs' own gallons are
    exact (AUTO-037's tolerance, KNOWN_LIMITATIONS).
  - **Salt** is mixed at SG 1.025; a batch is half the salt reserve (30 gal and 4.1 kg at the base room, up to 120 gal
    with three Reservoirs, ADR-0033); the design's 60 % rule stays, so with the morning's changes the mixer sustains
    about 33 gal a day at the base room and 118 with three Reservoirs; brackish tanks blend it with fresh. The salt machinery runs
    only while a salt tank or a hatchery uses salt water. **The stock manager's salt** with a Water room: the mixer's
    use (reorder under 11 days, `SALT_ORDER_DAYS`) plus two or three changes' worth for the salt tanks no changer
    serves, never ahead of food that's out; without a Water room the rule is unchanged. A shelf check buys as it plans,
    so a failed purchase leaves its money for the orders after it.
  - **Live food** never expires; a harvest that would pass the room's storage (60 servings a cone, 20 a jar) waits
    ("Full"). Dosers are tank equipment (kind `doser`), feed at 8, 14 and 20, a serving per 20 young.
  - **Manual mode** holds water changes, salt mixing, live food, Autofeeders and production lines; a held job is skipped,
    not queued; a held Autofeeder raises the hungry-animal alert; held lines act as paused. Life support, keepers, the
    Auto Top-Off, auctions already listed and the stock manager's orders keep running.
  - **Problems** also warns when the Water room's next week, dry-run with the jobs' rules (`forecast.ts`, which also
    gives Today its batches), skips changes for want of salt or fresh water after its first two days ("Salt water runs
    short", "Fresh water runs short", the prep rate or the reserve's size; ADR-0033). The Water room's Overview tile
    stays "OK" meanwhile: the design has no status word for it.
  - **PERF-004:** the forecast is computed once per Operations key (the game hour, the stock, the budget, the holds,
    the lines, and the player's actions, counted by `useGame.mutate`, so a change made while paused shows at once);
    Today, the flows, the week's money and Staff's dry runs are kept per key (`opsMemo`).
  - **Not as drawn:** a line "pauses", never "pauses tonight" (it holds as soon as its grow-out tank can't take the
    next clutch; KNOWN_LIMITATIONS); the Map shows each room's flows as rows rather than the drawn pipe schematic, and
    its layer control sits in the map body; the Overview's manual-mode banner has no "What's on hold" link (§7.1 draws
    none).
  - **Saves:** every new field is optional and checked by `repairState`; SCHEMA_VERSION 1 → 2 (a no-op migration).
  - **Core files:** `world.ts` (the automation hook), the types, persistence (repair, the schema bump),
    `src/state/game.ts` (the `actions` counter), `src/game/fastMutate.ts` (`flushBackgroundTanks`); AGENTS.md's store
    boundary now names the flush before a manual-mode change.
  - `dev.unlockAll` installs both rooms, so e2e games start with them.
  - Seeded tests: none moved (the jobs draw no random numbers; the settles run outside the world step's draws). Tests
    changed on purpose: `core-save-forward-safety` pins `KNOWN_AT[2]`, `production-line` expects SCHEMA_VERSION 2 (and
    PROD-015's sale now also checks the ledger's line tag); the notification defaults gain `auto: true`; the e2e
    Settings helper clicks the gear; `mobile-tabbar.spec` expects the More sheet's top at about 40 %; `shop-filters`'
    phone Supplies test measures the side line's last button (the Hatchery link comes before Buy).
  - Backlog: fixed B-176; closed B-145 (no action); partly B-169 and B-170 (the rest in chunk 6); B-167 and B-180 stay
    open; new B-202 (the Water room dry run's limits and the fresh warning's wording in edge cases, from the review).

### 6. Social stub, hardening and the last 0.5 release (0.5 phase 4 and the release step)

- **Design:** 0.5 spec §13 (Social stays reachable only in dev mode, ADR-0005 decision 3), §5.4 (the dock-width fix)
  and §21's release step.
- **Requirements:** SOC-001 to SOC-011, DES-010 to DES-012, NAV-019, AUTO-029, CONST-003, ACC-005, PERF-002,
  PERSIST-004, PERSIST-008, REL-004 to REL-008, REL-011, REL-013 to REL-017.
- **Also (ADR-0024):** accessibility to WCAG 2.2 AA for text and controls, with solid panels under the high-contrast
  setting (B-178, ACC-005); a WebKit e2e project beside Chromium (B-129). WebKit needs Playwright's WebKit browser in
  `~/LocalTest/playwright` (check the internal disk's free space first; no new npm package), and REL-013's repeated
  full runs include it. A WebKit-only failure is fixed, never skipped.
- **Also (ADR-0029):** the banner when the simulation keeps failing, "Something went wrong — your aquarium is paused.
  Save and reload." with Save and Reload (E1, B-002); typecheck and unit tests before the GitHub deploy and Render's
  build (E7, B-193; `deploy.yml` and `render.yaml` are core files, and a Render setting outside `render.yaml` is a
  remote change: ask first); the morph data (E8, B-194: rename the bristlenose fin overlay with a save migration, a
  test that no two looks share a name, odds that match how stock is picked); "Move tank" on the tank card with an e2e
  test (E10, B-196). (E9, the holding container's copy, was done in chunk 4.)
- **Done when:** `social-stub.test.ts` and `dock-width.spec` pass; `#/social/join/HIGHLAND-4821` works signed out,
  then signed in, then joined; two full test passes in a row on the Mac (REL-013); the owner has played it on a phone
  and a desktop. Then the release.
- **Decided:** SOC-010's empty states (ADR-0028, D1): "No trades yet" · "Trades you start or accept appear here." and
  "No friends yet" · "Friends you add appear here."
- **Built (2026-10-15, `cf9f5bc..` on `next`):**
  - **Social stub** (`src/social`: the SocialService, the local stub with ADR-0034's sample data, standings;
    `src/ui/panels/social`), dev mode only (SOC-011): dock, More, dots (B-152), routes and the club invite
    (`#/social/join/HIGHLAND-4821` signed out → in → joined), the Friday club-show reminder (dev only).
  - **Hardening:** the failure banner (B-002), Move tank (B-196), the morph data (B-194), save hardening (PERSIST-004,
    PERSIST-008; B-004, B-010, B-012, B-122, B-198), B-175, "What's new in 0.5" (Settings › About), the TODO check
    (REL-008), the week-ahead water check (B-202), the tank edits in the sim (B-169), the food and species rules in the
    data (B-170), far-tank AI cost (B-180), WCAG 2.2 AA through High contrast (ACC-005, B-178; ADR-0035), typecheck and
    unit tests before publishing on Pages and Render (B-193), silent e2e (the servers Playwright starts build the game
    with VITE_E2E_MUTE, which the engine treats as Mute; `silent-runs.spec.ts`).
  - **S3-D copy** (DES-013, ADR-0035 decision 3): the 18 missing strings and the rewordings, pinned with chunk 5's
    approved strings and every §14 id by `tests/sim/ui-copy-s3d.test.ts`.
  - **0.5 geometry** (DES-011): §17 measured by `tests/e2e/design-geometry.spec.ts`; toasts and the buy bar's price
    brought to it.
  - **Viewports** (DES-012): `tests/e2e/viewports.spec.ts`, every screen at eight sizes in both browsers; it found
    Operations' header off screen at 721–1000 px portrait, fixed.
  - **Hardening tests:** the route matrix with Social, Production and Operations (NAV-019), long runs over every dev
    fixture and the full-feature facility (REL-015, CONST-003, AUTO-029), the mutation boundary (REL-016,
    `docs/agent/TRUST_BOUNDARY.md`), the debt inventory (REL-017, `docs/agent/DEBT_INVENTORY.md`).
  - **WebKit** (B-129): every spec runs in Chromium and WebKit; WebKit-only test problems fixed on purpose (Tab focus,
    clipboard permissions, a loading card faster than a poll, focus return after a mouse click, a sheet's focus race,
    the ~200 hash changes WebKit allows a page).
- **Reviewed:** a fresh code reviewer (Opus 5.5, max effort) read `cf9f5bc..db25042` against this brief: 5 blockers
  (the bell's "Add a quarantine tank" dialog closed itself; a save's unknown staff role threw at payday; the Problems
  view's out-of-salt card listed every day to the short one; ACC-005 GREEN without its VoiceOver pass; DES-011's and
  REL-016's notes resting on records that didn't exist) and 14 notes, all fixed or recorded (`bba00ab`; F2 and F3 in
  OWNER_QUESTIONS). Its REL-017 verdict on the debt inventory: **YELLOW** (the core-owned workarounds and B-190
  missing, B-167 and B-161 understated; the magnified set otherwise small, known and fixable), fixed in the document.
  A fresh browser/QA reviewer compared every 0.5 surface with `DESIGN-0.5/screens` at 1440×900 and 390×844:
  **RED** (the phone buy bar floating mid-sheet, one-line offer titles, phone Clubs running off the screen, smaller
  style gaps), fixed (`e23b8a2`). The code reviewer's confirmation pass on `db25042..d7560f9`: all five blockers
  fixed, nothing broken, no new blocker, **REL-017 GREEN**; its three new notes (the panel switcher's focus, staff
  roles in F3, `alerts-close` untested and unlisted) fixed (`d1c37bd`). The QA reviewer's second pass: **YELLOW** (the
  three RED items and six of the other seven fixed; left: desktop offer names still cut in two-column cards, the
  Settings strip clipping its first label, the Genetics Lab card's shop chip, polish, and four screens not captured),
  fixed (`d1c37bd`); its third pass YELLOW (chips stretched in uneven grid rows), fixed (`9bff79e`); its check on
  `9bff79e`: **GREEN** (DES-011), measured on the captures, zero console errors.
- **Requirements:** SOC-001 to SOC-011, DES-010, DES-013, DES-014, NAV-019, AUTO-029, CONST-003, PERF-002,
  PERSIST-004, PERSIST-008, REL-008, REL-015, REL-016, REL-017, DES-011, DES-012 GREEN; ACC-005 waits for the owner's
  VoiceOver pass (F1); REL-004 to REL-007, REL-011, REL-013 and REL-014 GREEN on the two passes on `9bff79e` (their
  harness-era evidence paths, `evidence/S4`, `STATE.json` and the scripts, are retired: PLAN.md records them).
- **Measured (PERF-002, 2026-10-15, the owner's Mac, headless Chromium with hardware WebGL):** big_facility (15 tanks,
  356 animals) room view 60 fps (p95 16.7 ms), sim 3.19 ms a tick; the 1,000 gal display 60 fps; 80 schooling fish 60
  fps; 10× sim 6.08 ms a tick on average (44.7 ms worst), no game time dropped; memory +3.3 MB over 20 tank-view trips
  (budgets: 30 fps, 12 ms, 40 MB). The maximum-scale save (Grand Hall, 41 tanks, 513 animals, six lines) with every
  automation system on: 0.67 ms a tick at 1×, 2.82 ms at 10×, a game day in 220 ms (vite-node, one core).
- **Browser QA (DES-014):** Operations at 1440×900 and 390×844 matches `DESIGN-S3D/screens` apart from chunk 5's "Not as
  drawn" (the Map's flows as rows, its layer control in the map body).
- **Not as drawn:** phones keep their compact one-line toasts (tap to expand) at §17's geometry; the decided-line card
  names a quarantine tank as added only when it is newer than the line; four days or more of out-of-salt water changes
  read "Days 39–44" (the design's range form; the design draws two days); Social (dev only) shows drawn placeholders for
  friends' snapshots and a larger club name on phones; Settings keeps its "Save now" footer, which no approved Settings
  screen draws, on General and Saves only since ADR-0036 (OWNER_QUESTIONS F4).
- **Releases:** 0.5.2 went out mid-chunk at the owner's request (see "Releases"); chunk 6 ends with 0.5.3.
- **After 0.5.3 (2026-10-16): group F's answers (ADR-0036), on `next` for 0.5.4.** F2: "Best foot forward" reads
  "Enter a show and see it judged. A healthy, settled adult that trusts you shows best." F3: `core-save-forward-safety`
  pins the water classes, show tiers, buyer types, staff roles and staff traits per save format (`TABLES_AT`, from
  v2), so adding one without raising `SCHEMA_VERSION` fails (PERSIST-003 A7). F4: Settings' "Save now" footer shows
  on General and Saves only, and focus on it moves to the new tab as it goes (save.spec checks each tab and the focus;
  mobile-sheets.spec that a 390×844 phone with no notifications shows 4 of Notifications' 6 categories before
  scrolling, 3 with the footer as measured, and that the tab's end clears the tab bar). None of the three tabs fits
  that phone whole (ADR-0036 corrects the F4 option's "whole list" and its count of five). Each new test was run
  failing without its change, except save.spec's click step (a clicked tab takes focus itself in Chromium and WebKit).
  The fresh review (Opus 5.5, max) found 2 blockers, both wording (the six categories; the handoff's "`next` =
  `main`"), and 7 notes: fixed, or B-203 for the save values outside the five tables. Its confirmation pass on
  `f74e9d8`: no blockers; its five wording notes fixed, and B-203 asked as G1. Two full passes on `c9445af`: typecheck,
  unit 2,699, build, all passed twice; e2e 287 of 289 (41.5 min, the machine loaded) and 288 of 289 (32.5 min), three
  different tests failing once each, none in this change's code (B-204: the route walk's `#/operations/lines` in
  Chromium; Social's expired codes in WebKit, a 2-minute hang in its set-up; the tutorial in WebKit), each passing in
  the other pass and 5 of 5 alone on `c9445af`. Not a clean pass: a release needs one (REL-013).
- **G1 (ADR-0037, 2026-10-18), on `next` for 0.5.4.** A new Water room prep level, a higher reservoir limit or a new
  rare-variant kind raises `SCHEMA_VERSION` too: `repairState` reads the two limits from `WATER_ROOM` (they were
  literals), the kinds are a table (`RARE_VARIANT_KINDS`, `src/data/rarity.ts`) that `sanitizeRareVariant` reads, and
  `core-save-forward-safety` pins them per save format (`LIMITS_AT`, from v2). `persistence-limits-from-tables.test.ts`
  makes both tables bigger and checks a save at the new limits loads unchanged. All three new tests were run failing
  without the change, and the pin failing with the reservoir limit raised to 4. B-203 partly fixed (its removed-show
  clause goes to chunk 7).
- **Released as 0.5.4 on 2026-10-18** (see "Releases"). Its fresh review (Opus 5.5, max) on `ce5dcc0..50dc443`: one
  blocker, the CHANGELOG's "since 0.5.3" for B-175's fix, which shipped in 0.5.2, fixed in `97da6bc` with 11 notes
  (docs, chunk 7's brief made buildable; the pin test's `prepPrices` check and two comment fixes after the release).

**Deferred:** NOTIFY-011 and PLAT-004 (alerts while the game is closed, the native wrapper: 0.5 phase 6, needs the
owner). **Retired with the harness:** HARNESS-001 to HARNESS-030, PERF-003, REL-001, REL-003, REL-009, REL-010,
REL-012, REL-018.

### 7. Hardening for multiplayer (ADR-0037) — done 2026-10-18 (not released)

- **Why:** the owner chose to make the single-player game ready for other players before any backend (ADR-0037
  decisions 3 and 4), starting with `docs/agent/DEBT_INVENTORY.md`'s magnified items. Nothing here adds a server, an
  account or a dependency.
- **Requirements:** add one per item below (REL-019 onwards), with acceptance criteria from this brief, before
  building.
- **Build:**
  1. **The live site ignores `?dev=1` (B-190).** A production build has no write tools whatever the address says:
     `window.__AQ` stays read-only, and the dev panel, registry fixtures and fixture autosave (what `?dev=1` gates
     today) stay off. This changes ADR-0005 decision 2 and ADR-0024 A5 ("`?dev=1` as built") for the live site. The
     dev server keeps `?dev=1` as today. Also: `?sandbox=` isn't gated at all in production (`src/App.tsx`): gate it
     the same way. Starter showcases (`?showcase=`, a never-saved demo world) stay unless the owner says otherwise.
     - The tests: `base-path.spec` needs the tools (it opens the production build with `?dev=1` and calls
       `__AQ.newGame` and `__AQ.mutate`), and `prod-mode.spec` checks they're absent, on the same `.e2e-dist` build
       today. So the e2e build that `base-path.spec` opens turns the tools on with a build-time flag that `deploy.yml`
       and `render.yaml` never set (both stay unchanged: core files), and `prod-mode.spec` gets a second production
       build without the flag, on its own port and project, and checks it with `?dev=1` added.
  2. **Counter-offers stay under the buyer's ceiling (B-124):** repeated small counters never take a buyer past their
     private ceiling, and a listing closes when it ends; its loop test in `tests/sim/economy-loops.test.ts` (no sale
     above the buyer's ceiling, however the counters go).
  3. **Admission takings peak inside the slider's range (B-162):** demand keeps falling with price, so takings stop
     rising before the slider's $40, and the sim refuses an admission the slider can't set; its test: a day's takings
     peak inside $0–40.
     - Both fixes change what players see. Before building, show the owner B-124's sale prices after a run of
       counters and B-162's takings at a few prices, before and after, and ask (ADR-0037 decision 3).
  4. **A loop hunt (B-130):** a seeded test running many short sequences of buying, selling, listing, quick-selling,
     converting and fragging, with no game time passing, that fails when a sequence ends with more money plus stock
     value than it began with. B-124 and B-162 involve time and sales, so they keep their own tests (items 2 and 3).
  5. **Research gates in the rules (B-160):** `buyTank` refuses marine, reef and brackish, and `convertWaterClass`
     marine and reef (it already refuses brackish, `src/sim/tankOps.ts`), without their research, with the screens'
     own wording; a sim test for each.
  6. **Cheap items:**
     - B-203's other clauses: a show removed on load for an unknown tier scratches and refunds its entries, with a
       note; the Live food room's cone and jar cap on load (12) and the staff skill range (1–5) are read from their
       tables; an unknown rare-variant origin stays as is (or is pinned like the kinds).
     - B-204: the three e2e tests wait on the panel or the step, not on fixed delays.
- **Done when:** the four checks pass on the final code twice in a row (REL-013); one fresh reviewer (Opus 5.5, max
  effort) reads `git diff <start>..HEAD` against this brief and its blockers are fixed; DEBT_INVENTORY's magnified
  rows and TRUST_BOUNDARY's dev-tools line are brought up to date.
- **Beside it:** the multiplayer decision record, drafted 2026-10-18 and approved for stage 1 the same day (ADR-0038):
  chunk 8.
- **Not in this chunk:** a server, accounts, cloud saves, trading, or running the offline catch-up on a server.
- **The owner's answers before building (ADR-0039, 2026-10-18):** counters capped at the buyer's limit and stopped once
  bidding closes ("Bidding has closed. Accept an offer or let it expire."); admission demand keeps falling above about
  twice the fair price, with $40 the rules' cap. The before-and-after numbers came from two throwaway probes
  (`scripts/_audit/H7/`, git-excluded) and are in the ADR.
- **As built (`7b98be8`; requirements REL-019 to REL-024):**
  1. REL-019: `devToolsAtBoot(devBuild, VITE_E2E_DEV_URL, address)` in `src/state/devTools.ts`; `urlSandboxName` gates
     `?sandbox=`. `playwright.config.ts` builds `.e2e-dist` with the flag (base-path.spec) and `.e2e-dist-prod` without
     it on E2E_PROD_PORT 4397 (projects `prod`, `webkit-prod`: prod-mode.spec, which also opens `?dev=1`, a registry
     fixture and a sandbox). `plat-dev-tools` checks the gate's cases and that `deploy.yml` and `render.yaml` never set
     the flag. A production preview reused with E2E_REUSE=1 must be built with the flag (README).
  2. REL-020: splits capped at the ceiling, a buyer at their ceiling holds; `holdBidForCounter` and `counterBid` refuse
     after the listing's end hour. `fix-econ-listings`' hold test now opens the form before bidding closes (at 10× an
     offer outlives the bidding window).
  3. REL-021: `admissionDraw` (the line to 1.15 ÷ 0.6 × fair, then the square law) and `MAX_ADMISSION` ($40, the
     slider's end too).
  4. REL-022: `tests/sim/economy-loop-hunt.test.ts`: 300 seeded sequences of 10 instant actions on `frags_reef`; worth is
     money plus what one batch per kind of instant sales would pay (a frag cut from every ready piece included, so a
     cut only realises growth that has already happened: a bought piece starts below a cut's growth). Checked failing
     with decor sold back at 105%.
  5. REL-023: `waterClassLock` in `src/sim/facility/progression.ts` (the screens' rule and wording), used by `buyTank`,
     `convertWaterClass`, Build and Tanks.
  6. REL-024: a show removed on load scratches and refunds its pending entries ("This show was called off. The club
     refunded the fee.", reachable only from a damaged save); `FOOD_ROOM`'s maxima, `STAFF_MAX_SKILL` and
     `RARE_VARIANT_ORIGINS` read on load and pinned (`ROOM_LIMITS_AT` in `core-save-forward-safety`: ADR-0037's rule
     applied to the limits its review found, approved after the review as ADR-0039 decision 6, with the note); B-204's route walk and tutorial test wait on the router and the guide's
     step. Left in B-204: `social.spec`'s WebKit hang and the WebKit graphics error (no fixed delay to replace).
  - Every new sim test was run failing without its change; no seeded test's expectations shifted. Typecheck and the
    unit tests (229 files, 2,719 tests) passed on the working tree before the commit.
- **Review (Opus 5.5, max effort) on `afe46d0..ef76be4`:** 3 blockers, 10 notes, fixed in `06f80f8`: the tutorial test
  now does whatever the guide's current step asks (it had assumed the guide starts on "camera"); the removed-show note
  and the four extra save-format pins went to the owner (ADR-0039 decisions 5 and 6, both approved); prod-mode.spec
  stores the Developer tools switch as on and checks no wrench and no Developer section (it fails on the tools-on
  build). Notes fixed: the router's sandbox check gated, a bid with no ceiling keeps its first one, the loop hunt's
  limits stated, stale `?dev=1` wording, B-206 logged. Its confirmation pass found one docs blocker (the README's
  tools-on preview reused `.e2e-dist`, which the e2e run rebuilds: now `.e2e-dist-reuse`) and doc notes, fixed in the
  chunk's closing docs commit. Left, logged: listings stay open after their end hour until their open offers expire
  (ADR-0039's "Accept an offer or let it expire"; counters and holds no longer extend them), and a loaded save's
  admission above $40 is kept (it earns almost nothing).
- **Tests:** see "Last full test runs". The six e2e failures in passes 1 and 3 that weren't the tutorial test were the
  Mac idle-sleeping on battery mid-run (`pmset -g log`; one trace shows Vite's client losing its server and reloading
  the page); long runs now hold sleep off with `caffeinate`.

### 8. Multiplayer stage 1, for people the owner knows (ADR-0038, ADR-0040) — brief written 2026-10-19; handed to Marshall

- **What:** ADR-0038's stage 1: accounts (email and password, sign-up only with a club's invite code, no emails,
  "Delete my account"), one online save (local first; when the online copy differs, the player picks a copy;
  PERSIST-014 on the device and the server), and the Social screens for players of the live site on the real service
  (clubs, friend codes with requests to accept, friends' aquarium pictures, leaderboards among friends and club
  members; trades stay "open later"). The server trusts each browser on purpose; nothing of stage 2 or 3.
- **Design:** `docs/agent/design/ONLINE-STAGE1.md`, the build plan: the code layout and layer rules (§2), the setup
  steps (§3), the database (§4: row-level security on every table, no table access, a small set of security-definer
  functions), the client (§5), the online save's rules (§6), the screens and words (§7) and the tests (§8).
- **Owner answers (ADR-0040, 2026-10-19):** the agent sets up the Supabase project with the CLI on the owner's Mac
  (a Free organization "Aquarium Go", the project `aquarium-go` in `us-east-1`, a random database password nobody
  keeps; stop if it isn't Free, costs money or would touch anonyform); **only the owner creates clubs, for now**, and
  a club's invite code is the sign-up code (the first club, "Aquarium Go Friends", made with SQL); the sign-up,
  account and online-save wording approved as asked; ADR-0039's privacy note and 13-and-over checkbox.
- **Group I (ADR-0041, 2026-10-19):** the strings ONLINE-STAGE1.md §7.3 drafted, asked in one round at the chunk's
  start, approved as written (with the privacy link named by the note's title and "Signed in as {email}" on Settings ›
  Account).
- **Platform:** `@supabase/supabase-js` at exactly 2.117.2 (approved, ADR-0038 decision 2; `core-dependencies`' list
  changes citing it); SQL in `supabase/migrations`, sign-in settings in `supabase/config.toml`; the project's address
  and publishable key in `src/social/project.ts`. No change to `deploy.yml`, `render.yaml` or Render's settings.
  The stub stays for dev mode and every e2e build (`VITE_SOCIAL_STUB=1` in Playwright's `E2E_ENV`); e2e never reaches
  the live project. Setting up the project (ONLINE-STAGE1.md §3) comes once the migration and the smoke test exist.
- **Requirements:** REL-025 to REL-033 (`docs/agent/REQUIREMENTS.json`); SOC-011's dev-only criteria superseded on
  purpose by REL-025; SOC-002 and SOC-009 extended to the real service.
- **Done when:** the four checks pass twice in a row on the final code (Chromium and WebKit, under `caffeinate`); the
  live smoke test passes and leaves nothing behind; one fresh reviewer (Opus 5.5, max effort) has read
  `git diff fd0e0fd..HEAD` against this brief and its blockers are fixed; PLAN.md records the project ref and the runs
  (the first club's code goes to the owner in the session, not here: the repo is public, ADR-0042). Releasing (with chunk 7, as 0.5.5 or 0.6.0) is the owner's call; once released, the owner
  signs up with the first club's link, and the agent sets the owner flag with the owner's yes (§3 step 10).
- **Not in chunk 8:** sign-in on the title screen (a new device starts a game first), likes, leaving a club, club
  events, trades, email.
- **As built (`ee4998e`, `6f5f724`; REL-025 to REL-033):**
  1. REL-025: `src/ui/online/mode.ts` (`socialModeFor`, `socialAvailable`); the panel host, the dock (`needsSocial`),
     More, `parseNav` and the router gate on it, so SOC-011 is superseded on purpose; `VITE_SOCIAL_STUB` in
     Playwright's `E2E_ENV`; `@supabase/supabase-js` 2.117.2 exactly, one dynamic import.
  2. REL-027: `supabase/migrations/20261019000000_stage1.sql` (five tables with row-level security, no policies or
     table grants; security-definer functions with an empty search_path; the sign-up and profile triggers on
     `auth.users`); `supabase/config.toml`; `tests/sim/supabase-migration.test.ts`; `scripts/online-smoke.mjs`.
  3. REL-028, REL-030: the grown interface, the stub (with its dev hooks) and the Supabase service; sign-up mode, the
     privacy note, friend requests, the owner's Create a club and invite links, no likes on real tiles.
  4. REL-029: `src/ui/online/cloudSync.ts`, `rules.ts`, `CloudPrompt.tsx`. Two choices beyond the design's words:
     "this device changed since the link" is "a local save of this aquarium landed after the last send" (the
     device's own clock, `aquarium-go.cloud.v1`), so a hidden tab's send waits for its hidden save to land; and
     loading the online copy of the *same* aquarium keeps this device's copy under a new `saveId` (`…_kept_…`),
     because the slot's backup is listed as "Previous autosave" only when it holds a different aquarium.
  5. REL-031: Settings › Account (`#/settings/account`, after Saves, where Social exists).
  6. REL-033: ARCHITECTURE.md "Online" with the owner's runbook, TRUST_BOUNDARY.md, DEBT_INVENTORY.md,
     KNOWN_LIMITATIONS.md, TEST_IDS.md, README.
  - Also: a friend code may start with one to twelve letters (a two-letter name such as "Al" made a code the stub's
    shape check refused); the kit's Modal gains `dismissible`.
  - **The repo is public** (GrayGrayson1/aquarium-go), so the first club's invite code, which is also the sign-up
    code, isn't written here: it went to the owner in the session, and `select name, invite_code from public.clubs`
    reads it back (ARCHITECTURE.md's runbook). The owner agreed and chose to keep the repo public (ADR-0042).
- **The setup (2026-10-19, ADR-0040 decision 1, ADR-0042):** the Free organization "Aquarium Go"
  (`kvqnsqbjufmnkpsrcjbj`, created with the CLI, no payment method; the owner found it in the dashboard) holds the
  project `aquarium-go`, **ref `zkavcxrsxdgdlstravpj`**, us-east-1, free size, a random database password nobody
  keeps. Every remote command named that ref; nothing touched GrayGrayson1 or anonyform. `supabase config push`
  changed only the five sign-in settings meant (redirect URLs, confirmation off, passwords of 8, the site address),
  after `supabase/config.toml`'s other settings were matched to the project's. Both migrations applied with
  `db query --linked --project-ref`; `db advisors --type security --level warn`: no issues (the first file alone
  drew 18 warnings, one per SECURITY DEFINER function the API exposed: the second file moved them to `private`). The
  first club "Aquarium Go Friends" made with SQL (code to the owner). `src/social/project.ts` holds the address and
  the publishable key (`sb_publishable_…`); the secret key was never printed or saved.
  - Checked before the live run: `scripts/online-db-local/run.sh` (new: a throwaway local Postgres 16 with a stand-in
    for Supabase's auth schema and default privileges) ran every rule as anon, two players and the owner, all as
    expected, and caught a planted grant to anon.
  - **The live smoke test** (`node scripts/online-smoke.mjs` from the internal-disk clone): **79 of 79 checks
    passed**, and nothing of the two throwaway accounts was left in any table, Supabase Auth's audit log included;
    it removed its own wrong-code guesses afterwards, so the owner's address isn't capped.
- **Review (Opus 5.5, max effort) on `fd0e0fd..6f5f724`: 5 blockers, 15 notes.** Fixed: B1 invite codes (the owner's
  word-and-four-letters format from a secure source, and the cap on wrong codes per address: ADR-0042); B2 the online
  copy now stores what a local save stores (the welcome-back card's resume speed, not its pause), uploads and the kept
  copy alike (`stateForSaving`, exported from persistence); B3 Load online save stores the online copy once and
  resumes that very state (`resumeState`, the second half of `loadAndResume`, exported: a core change), so no retry
  loop and no autosave between storing and resuming; B4 `supabase-migration.test.ts` reads every migration file,
  checks the private functions and their wrappers, and catches grants, views, disabled row-level security and
  EXECUTE to PUBLIC anywhere (27 broken copies, each placed early, must fail); B5 the four docs that said to write the
  first club's code in PLAN.md. Notes fixed: a failed save of this device's copy stops the load (1); a check waits for
  a send under way, and an unanswered send that landed counts as this device's own copy (3); a newer build's block is
  per account (4); a failed send waits out the 2-minute gap (5); Delete removes the account's rows in Supabase Auth's
  audit log (6); the docs (7); a test title (8); the load uses the save's own identity (9); `--linked --project-ref`
  everywhere (11); friend-code guessing in TRUST_BOUNDARY (12); `VITE_SOCIAL_STUB=1` in the reuse instructions (13);
  the stub's accepted friend titled by name (14); Social and Account re-ask who is signed in when opened (15). Left:
  loading the online copy replaces any older "Previous autosave", as every load does (2, KNOWN_LIMITATIONS); the load's
  messages reuse Settings › Saves' words (10). Also found by the agent: a tab whose saves another tab refuses sends
  nothing, and a hidden tab sends only when its hidden save lands; the online-save box no longer re-renders on every
  simulation tick.
- **Its confirmation pass on `6f5f724..956aa55`:** B1–B5 and the notes confirmed fixed; two new blockers in the cap
  on wrong codes, fixed by `20261019000200_invite_brake.sql`: the cap keyed on a network address a caller can choose
  (a forwarded header), and keeping addresses would have been data the approved privacy note doesn't cover (ADR-0039
  decision 3). Now one brake for everyone (100 wrong codes in 10 minutes), only times kept, 10 minutes; sign-up no
  longer asks `resolve_invite` (the trigger checks the code), so the brake never blocks it. Notes fixed: leaving the
  tab right after an autosave sends at once (1); sign-up as a slow way to test codes, and replacing a leaked code, in
  TRUST_BOUNDARY, KNOWN_LIMITATIONS and the runbook (2); the brake's count under an advisory lock (3); a comment (4);
  KNOWN_LIMITATIONS' wording (5). Pass 2 also showed the sign-in form missed a network error found after it appeared
  (social.spec's network test): fixed.
- **Its last confirmation pass on `956aa55..4758129`: no blockers, two notes, both fixed in
  `20261019000300_invite_brake_answer.sql`** (applied live; the advisors still report no issues): a held brake
  answered null, which showed a friend's real invite link as expired (now `{"braked": true}`, the same for every code:
  the game shows its network message and keeps the link's code in the sign-up form); and the brake's lock is tried, not
  waited for, so a flood can't queue calls that each hold a connection.

### 9. 0.5.6: the audit's five high findings (ADR-0043, ADR-0044) — started 2026-10-19 (Chase)

- **What:** fix the five high findings of the audit of `c7c0d34` (2026-10-19; a private report, so security details
  stay out of this public repo until fixed), with the owner's answers in ADR-0044. The chunk starts at `42effca`.
  - **A1 (REL-034):** a read-only call to the invite lookup skipped the brake on wrong codes; the friend-code lookup had
    the same gap. A new migration answers every read-only call with the brake's answer; the local database check and
    the smoke test gain read-only cases. The three clubs keep their codes (ADR-0044 decision 3).
  - **B2 (REL-035):** the game follows sign-in changes from other tabs (`onAuthStateChange` and the session's `storage`
    event), and the save functions take the account the game believes is signed in and refuse any other.
  - **D1 (REL-036):** tank-sale bonuses apply to the animals and living plants only; hardscape at its base price; a
    loop test at several sizes (ADR-0044 decision 1). Prices players see change on purpose.
  - **E1, G1 (REL-037):** a newer copy of the same aquarium is never dropped silently: an older copy written over it
    keeps it, listed, under a new identity (as the online save's kept copy does); Load offers "Save to Slot N & load"
    for the same aquarium; Replace says when the slot holds a later copy; Import into a slot that holds a save asks
    first; both say when the listed previous copy goes. The approved strings are ADR-0044's.
  - **B1 (REL-038):** Load online save never pushes out an aquarium kept only in the autosave: it saves it to a free
    slot first, or loads nothing when every slot is full (ADR-0044's two messages).
- **Live database:** the owner's yes (ADR-0044 decision 2): the local check (`scripts/online-db-local/run.sh`), then
  `supabase db query --linked --project-ref zkavcxrsxdgdlstravpj -f <file>`, the advisors (no issues), the smoke test.
- **Not in this chunk:** the audit's other 111 findings (BACKLOG.md's audit row), decisions A4, F5, F3, G2, A6.
- **Done when:** the four checks pass twice in a row on the final code; one fresh reviewer (Opus 5.5, max effort) reads
  this brief, ADR-0044 and `git diff 42effca..HEAD`, and its blockers are fixed; the live smoke test passes; PLAN.md,
  the requirements and the docs say what changed; `next` pushed. Releasing 0.5.6 is the owner's call.
- **Built** (2026-10-19, Chase): `3a0f314` D1; `7373225` A1 and B2 (the fifth migration, applied live with the owner's
  yes, the advisors with no database issues); `c51a7f1` E1, G1 and B1; `56e0215` the review's fixes; `827eacd` the
  release step (0.5.6, the owner's "release when green", ADR-0044 decision 5). The live smoke test: 91 of 91.
- **The fresh review** (Opus 5.5, max effort) on `42effca..c51a7f1`: the migration, A1/B2's client, D1's arithmetic and
  the six approved strings sound; four blockers, all in the save paths, each shown by a probe and fixed in `56e0215`
  with tests that fail without them: a kept-copy save skipped the stale-tab guard (`staleAs`); Load online save
  dropped a kept copy of the same aquarium further along than both (and the audit's B7 in that case; a second Load
  can still replace a first's kept copy that is behind, which goes as a switch does); the page-close copy moved into
  IndexedDB on boot pushed the further copy out (`migrateSlot`); with autosave off, Load saved nothing first. Its notes
  fixed too: supabase-js no longer loads at boot (the auth events attach on the first real call), the account
  re-checked during Load online save, a storage clear counts as a sign-out, three small ones, and the smoke test's
  roll-back check. For the owner (KNOWN_LIMITATIONS, ADR-0044): Load's line for a Previous autosave it replaces, the
  wording for loading a later copy, the valuation breakdown's rows, D1's extensions (rarity, lineage, a buyer's
  taste) and its sales near cost.
- **Its confirmation passes:** the first (`c51a7f1..827eacd`) confirmed the four closed and found three more save paths
  (present since `c51a7f1`), fixed in `b5d169f`: Load online save's progress check now covers a copy with the device's
  own identity; Settings' Load first saves a further copy of the aquarium kept only in the autosave to a free slot, with
  B1's messages (the owner's yes, ADR-0044 decision 6); those messages show after the load. The second
  (`827eacd..b5d169f`) confirmed them and found one more, fixed next: Settings' Load read its slot after its own save
  had written it, so "Previous autosave" loaded right after a title-screen load gave another save; Load now reads first.
  The last (`b5d169f..34292ff`) found that reading first cleared a stale tab's refusal, so the stale banner's "load the
  newer copy" pushed out another aquarium's "Previous autosave": a stale tab saves nothing first again, and a load
  saves again at once only after its own save-first (a title or Continue load writes nothing, as before). The final
  one (`34292ff..f98c986`) found that this skipped keeping a further copy in a stale tab: that step runs in a stale tab
  too now; only the save-first waits on the stale flag.
  Left for the owner: whether Settings' Load should also keep another aquarium kept only in the autosave (as 0.5.5,
  it goes; KNOWN_LIMITATIONS).

### 10. Shared shops, the test (SHARED-SHOPS.md §10, ADR-0046) — done 2026-10-20 (Chase)

- **What:** check the design's lockstep (§3) before chunks 11 to 13 build on it, and measure what it costs. The chunk
  starts at `885e43e`. No player-visible change.
  - **One arithmetic (SHARE-002, §3.2 rule 1):** `src/sim/dmath.ts`, fdlibm's functions in plain arithmetic (equal to
    Java's StrictMath bit for bit), and every transcendental `Math` call and `**` in `src/sim` switched to it; the
    determinism guard bans the engine's versions in `src/sim` and `src/data`. Moved here from chunk 11 so the test
    measures the real arithmetic, not a shim; every seeded test that shifts says why (none did: 2,872 of 2,872).
  - **The step block (§3.2 rules 2 to 4):** `runSharedStep` in `src/sim/sharedStep.ts` on a working copy (the world's
    identity pinned, the compatibility caches and `reachCache` cleared, commands, the advance with the full-detail
    list, `post`; discarded whole if it throws), `focusTankIds` beside `focusTankId`, the copier moved to
    `src/sim/clone.ts`; a first command set (`src/sim/commands/`: speed, feeding, a water change) that chunk 11 grows to
    the whole catalogue.
  - **A prototype server** (`server/`, Node 22, `ws` 8.22.0, built by the repo's Vite into `dist-server/`): §3.3's
    messages without accounts or the database; stub shops built from the dev fixtures at build time; one worker thread
    per shop; time steps batched once a second, command steps at once, fingerprints every 10 seconds, snapshots for
    joins and re-syncs; meters for bytes and CPU (`/stats`); a step-log endpoint for the replay; a connection cap and a
    byte budget for the public test service.
  - **A prototype client:** the replica (`src/game/sharedLoop.ts`: applies steps in order, fingerprints in idle time,
    asks for a re-sync on a mismatch) and a dev-only connection (`src/dev/sharedProto.ts`, `__AQ.shared`), headless:
    it doesn't show the shop (chunk 13 does).
  - **Tests:** dmath against fdlibm, the engine's Math and ECMAScript's special values; the step block; lockstep in one
    process (a room, two replicas, joiners from mid-run snapshots, a copy changed by hand caught); e2e: the cross-engine
    replay (the Node server's step log replayed in Chromium and WebKit, a game week at 10× on `big_facility` and a
    playthrough) and two browser contexts in one shop.
  - **Measured, into §11:** bytes per player-hour, per command, per snapshot and per save; the server's time per step;
    then on Render (ADR-0046): the wake time, the time per step on 0.1 CPU, the replay on x86-64, a two-browser
    session from the Mac, the build without install scripts, what Render shows a build.
- **Render:** the owner's yes (ADR-0046): the agent creates the free web service `aquarium-go-shops` (Virginia, from
  `next`, deployed by hand, stub shops, no key) and deploys the prototype; afterwards it sleeps, for chunk 12.
- **Not in this chunk:** the rest of the command catalogue and first one wins (chunk 11), accounts, the database, the
  caps, the lease and the build identity (chunk 12), the screens and every player-visible word (chunk 13).
- **Done when:** the four checks pass on the final code; one fresh reviewer (Opus 5.5, max effort) reads this brief,
  SHARED-SHOPS.md §3, §5 and §10 and `git diff 885e43e..HEAD`, and its blockers are fixed; the Render measurements are
  in SHARED-SHOPS.md §11; PLAN.md and the docs say what changed; `next` pushed.
- **Built** (2026-10-20, Chase): `017756d` one arithmetic (dmath equals StrictMath bit for bit on 364,200 probe inputs;
  unit 2,872 of 2,872 after the switch); `01e854c` the step block, `focusTankIds`, the first commands, the prototype
  server (`server/`, `ws` 8.22.0), the replica and the dev connection, the lockstep tests (unit 2,888; the new e2e spec
  6 of 6 in Chromium and WebKit). Without the step block's cache clears, `big_facility` drifts and the in-process test
  fails; with them, a probe replayed 7 cases (4 shops, 1× to 10×, up to a game week) in both browsers with 136
  fingerprints each and no mismatch.
- **On Render** (ADR-0046): `aquarium-go-shops` created and deployed from `next`; it builds in about 54 seconds without
  install scripts. Its x86-64 step logs replay on the Mac's arm64 with no mismatch, and the stub shops it built (30 game
  days of play for the playthroughs) equal the Mac's. The free instance keeps a new or month-old shop at 10× with half
  its CPU to spare (33 to 46 ms a second of about 100), commands round trip in about 125 ms; a late-game shop
  (`big_facility`) can't keep real time even at 1× (84 to 92%), and runs at 55% at 10×, still in step. Data: about 120
  bytes a second per member for the steps (0.6 MB an hour metered), snapshots 12 to 160 KB, the shop's saves the larger
  part (SHARED-SHOPS.md §11). A cold wake answered in 22 seconds. Chromium and WebKit on the Mac in one shop there:
  every fingerprint matched, both ended at the same step with the same copy. A build sees every variable set on the
  service, so chunk 12's build command removes the key first (§5.8). Afterwards the prototype on Render was closed
  (no connections or replays unless `SHOPS_OPEN=1`), since its byte budget restarts at every wake and its address is
  public.
- **The fresh review** (Opus 5.5, max effort) on `885e43e..e778ba5`: dmath sound (line by line against FdLibm.java;
  687,826 targeted inputs equal to StrictMath; bit-identical in Node, Chromium and WebKit, whose own Math differ on
  tens of thousands of them), the switch faithful (solo play after 14 game days: money, animals and the random
  stream identical), the protocol sound. One blocker, fixed: a deeply nested message (6 KB) crashed the server, since
  the main thread copied the parsed object to the worker; it now hands the worker the text, which the worker parses and
  checks (`parseClientMessage`), and any error closes only that connection. Its notes, fixed: re-syncs budgeted as §5.3
  says (3 in 10 minutes, 6 an hour, then `outofstep`), one replay at a time, connections closed if they don't say
  `hello` within 10 seconds, the header's claim corrected; a test that the step block pins the world (it failed
  without the pin); the dmath reference file grown to 2,593 inputs, which reach every block the review's inputs reach;
  the browser replay does the interface's reads between steps; separators in two cache keys; inherited names refused
  as a tank; the paused two-browser check reads until both agree; the docs (the meter's factor, what fingerprints can't
  see). Left for chunk 11: keys holding `undefined`, which a snapshot drops and a joiner re-adds in another order
  (harmless today; SHARED-SHOPS.md §3.2 rule 10).
- **Its confirmation pass** (`e778ba5..668a57d`): every item above confirmed; one more blocker of the same kind, there
  since `01e854c`, fixed next: a request whose target isn't a URL (`GET //`) crashed the server, even closed on Render,
  since both handlers parsed it unguarded. Both now parse it guarded (400) and catch whatever their bodies throw, the
  stats call included; the hostile-message e2e sends `//` and `/\` as requests and upgrades. Its notes, fixed too:
  the browser replay's reads include an animal's rarity and strains (the caches the step block doesn't clear); a
  socket that never says `hello` is dropped at once; a replay worker that ends without answering frees the slot. For
  chunk 12: the re-sync budget is per connection and joins are unlimited, so it belongs to the player, with §5.3's
  join limit. Its final pass (`668a57d..51eb240`): no blockers, nothing else on the main thread that a request, message
  or worker event can make throw; its three small notes fixed (the replay slot is taken only once a worker exists, one
  answer per request, the stats call's last catch). For chunk 11: `validateCommand` must check ids as own properties
  (a command on `__proto__` is refused today only because the water code throws first).
- **The full passes:** `01e854c` and `51eb240`: typecheck, unit (2,888, then 2,891), build passed; e2e 316 of 317, then
  318 of 319, the one failure both times a WebKit `social.spec` timeout caused by `shared-lockstep.spec` leaving two
  browser contexts open (fixed: it closes them; those four specs together in WebKit, 22 of 22). The final pass, on
  `e0f14de` (the contexts closed in an `afterEach`, the review's last note): typecheck, unit 2,891, build, e2e 319 of
  319 (37.2 minutes). Between, `1d1f7ed`'s pass had 316 of 319: three WebKit `perf.spec` frame-rate checks (22.8 fps
  against 30) while other apps held about two cores, 8 of 8 alone.
- **For chunk 11** (from the review): delete keys instead of setting `undefined` and assert none in the lockstep test
  (§3.2 rule 10); `validateCommand` checks ids as own properties.
- **For chunk 12** (from the measurements): time steps in place, not on a copy (18 to 32% of a step); a cheaper or rarer
  fingerprint and snapshot check for big shops (750 ms and 1.6 s of wall time on the free instance); the key out of the
  build; and, before big shops matter, the owner's choice between a lower top speed for them and a paid instance. From
  the review: the re-sync budget per player, not per connection, with §5.3's join limit; the meter counts headers. The
  owner's part: one dashboard visit (the key pasted, chunk 10's test variables deleted) and a yes to switch the service
  to `main` (SHARED-SHOPS.md §5.8), since the Render CLI can't change environment variables.
- **For chunk 13:** ask the owner, in one round before building the screens, for the words SHARED-SHOPS.md §8 lists as
  still needed (chunk 11 writes the exact list). The play-test needs an account for the owner's daughter (her own
  sign-up with the club's invite link; a parent signs up for a player under 13, §13).

### 11. Shared shops, commands (SHARED-SHOPS.md §4, §3.2) — done 2026-10-20 (Chase)

- **What:** every player action becomes a command, with no player-visible change; the solo game must behave exactly as
  before, and the full test pass guards it. The chunk starts at `a3a177d`.
  - **The catalogue (SHARE-001, §4.1):** `src/sim/commands/`: one kind per player action (every `act(`, `edit(` and
    direct `mutate` in `src/ui`, `src/render` and `src/ai`), `applyCommand(state, cmd, actor?)` calling the same `src/sim`
    function the closure called, a `CommandResult` that carries what callers read afterwards, and `validateCommand`
    (a known kind, each argument's type and range, the size; ids that aren't own properties refused, chunk 10's note).
  - **Dispatch (§4.2):** `useGame.getState().dispatch(cmd, then?)`, installed at boot by `src/game/dispatch.ts`: solo
    runs it at once, as `act` does, and calls `then` before returning; a shared shop (chunk 13) settles it when its step
    lands. The `act` helpers send commands; callers that read the result use `then`. The device-only marks (the alerts'
    read marks and Clear all, the log's read mark, the shows' and research's "seen") go through one UI module, so chunk
    13 can keep them per player. `core-mutation-boundary` grows: outside the dispatcher, that module, the loop,
    `sharedLoop`, persistence's load and save, and the dev tools, nothing calls `mutate` or `mutateFast`.
  - **Who did it, first one wins, flags (§4.3):** with an actor (a shared shop only), the events a command emits are
    tagged with who sent it, an action with no event gets one line (its own message), buying, selling, moving and taking
    carry what their sender saw and are refused on every copy when it no longer holds (naming the member who changed it
    in the last 30 seconds, never refusing the sender's own earlier change), and settings are last-writer-wins with a
    note. The memory of who touched what lives in the shop's state, so a joiner decides the same. A command's guide flag
    rides in the command; `hireStaff` raises `hired_staff` itself.
  - **§3.2's other sim changes:** the catch-up's rules into `src/sim/catchUp.ts` (rule 1's server needs them), the
    starvation guard's rule into `src/sim/starvation.ts` with its memory passed in (rule 6), the hold actions' flush
    inside their command (rule 7), the list of "seen" writes (rule 8), keys deleted instead of set to `undefined`
    and the lockstep test asserting none (rule 10).
  - **The words for chunk 13:** the exact list of player-visible lines this catalogue needs that §8 doesn't approve
    (written into SHARED-SHOPS.md §8 for the owner).
- **Not in this chunk:** the server's accounts, database, caps and coalescing on the wire (chunk 12), the screens, the
  transport's pending results and every new word on screen (chunk 13). Photos stay data URLs in solo (§4.4 is chunk 12).
- **Done when:** the four checks pass on the final code (no seeded test shifts: chunk 11 changes no rule); one fresh
  reviewer (Opus 5.5, max effort) reads this brief, SHARED-SHOPS.md §3.2, §4 and §9.1 and `git diff a3a177d..HEAD`, and
  its blockers are fixed; PLAN.md and the docs say what changed; `next` pushed. SHARE-001 GREEN.
- **Built** (2026-10-20, Chase): `03b3f4b`. The catalogue: 80 kinds (`kinds.ts`), `applyCommand` (`apply.ts`),
  `validateCommand` (`validate.ts`), who did it and first one wins (`shared.ts`). The solo dispatcher
  (`src/game/dispatch.ts`, installed by the `act` helpers), every interface write converted (about 170 sites in 50
  files; callers that read the result use `after`), the marks module (`src/ui/common/marks.ts`), the photo story line
  and the Auto-feed patch moved into the sim. `src/sim/catchUp.ts` and `src/sim/starvation.ts`. Rule 10: about 30
  places delete a key instead of setting `undefined`, and `compact` covers events and listings; a probe ran ten
  fixtures 4 to 14 game days with none left. Tests: `commands-catalogue` (each kind's `stateHash` equals the old
  closure's on five real worlds, 97 samples; after the review, every one changes the game or is a refusal the wrong mapping would turn into a change),
  `commands-shared`, `commands-dispatch`, the lockstep runs with conflicts from three members and a joiner (the room
  counts them: `stats.conflicts`); `ui-mutate-atomic` and `guide-feedback` rewritten on purpose for commands. No seeded
  test shifted.
- **The full passes:** `03b3f4b`: typecheck, unit 2,998 of 2,998 (242 files), build, e2e 319 of 319 (37.1 minutes).
  The final, on `e692066`: typecheck, unit 3,037 of 3,037 (243 files), build, e2e 319 of 319 (36.7 minutes).
- **The fresh review** (Opus 5.5, max effort) on `a3a177d..03b3f4b`, with probes and mutants
  (`scripts/_audit/review-chunk11/` in the internal-disk clone): four blockers, all fixed.
  - **B1:** `raiseFlag`'s own field was `flag`, the guide flag every command carries, so the dispatcher raised it
    twice and the solo guide skipped a step (feed, then open the tank card: the water step done at once). Its field
    is `name` now, and the catalogue's guide samples run on a new game whose guide is running.
  - **B2:** `validateCommand` let any string through as a listing photo (a remote address would reach every member's
    `<img>`) and refused the holding container's empty `from`. Photos are image data only (chunk 12 adds the
    reference), `from` may be `''`, a command carries only the guide flags actions raise (`ACTION_FLAGS`, checked
    against the interface's sources), `raiseFlag` names no inherited key, -0 becomes 0, names refuse control and
    text-direction characters, a substrate colour is a hex colour, and two ranges are tighter.
  - **B3:** first one wins missed partial purchases (a member got animals they didn't pick, since a partial sale
    shifts the rest) and the last stored piece (the second member's "from storage" bought a new one). A purchase now
    carries the animals' ids (`saw`) and buys them by id; `placeDecor` carries `fromStorage`.
  - **B4:** 18 catalogue samples changed nothing and 12 mapping mutants survived. Every sample now changes the game
    (or is a refusal pinned on purpose, where the wrong mapping would succeed), with second samples for the optional
    arguments (target feeds, picks, the rack, a tank or frag listing, `replace`, a line's rules, sort and morph, the
    breeding tank); all 14 mutants and a canary now fail the tests (`scripts/_audit/chunk11/mut/run.sh`).
  - **Notes, fixed:** rule 10's last three places (and a test that walks every step of five shops and the actions that
    end a guard or a pair); the sign and favourite switches read the live game, so a quick second click undoes the
    first as before; an `after` that throws is no longer reported as a failed action (and not called twice); the
    fallback alerts line skips quiet kinds and repeats (one line per member and setting in 30 seconds); the same-sender
    exception holds only while the thing is as the sender's command left it (each touch keeps a mark); the
    welcome-back card's resume is a command and the store-writer test names persistence's two files; the five helpers
    that returned a result take a callback; the tagging and install tests can fail now; the room's `at` comes from
    its clock (`io.wall`); the dev panel's buyer visit toasts again.
- **Its confirmation pass** (`03b3f4b..2202c45`): every blocker and note confirmed fixed, no blockers, 45 mutants
  run (all caught but nine, now fixed or explained). Its notes, fixed: a slider's repeated values keep one alerts
  line current (its newest message; the first fix kept the first value) and switches always get a line; the sender's
  own quick second Buy of an animal they already bought is refused (an offer's touch has no mark); B1's scenario is a
  test (feed by tapping, open the tank card: the water step waits); samples for the light hours and moonlight, an
  equipment setting, a keeper taken off a tank and Auto-feed on from a legacy 0; the quiet kinds tested with a bid's
  renewals; `raiseFlag hired_staff` does nothing without a team; a redundant check dropped. The feed zone's mutant is
  equivalent: the sim doesn't read the zone (it's for the visuals).
- **Left on purpose:** §3.2 rule 5's stagger (chunk 12: it changes only the server's busiest steps, so it is built and
  measured with the server's speed work); coalescing a control's many values and the pending results' transport
  (chunk 13, the shared dispatcher); actions the interface doesn't call (`setManualMode`, `setOpenHours`,
  `renameLine`, the fixtures, `sellFragsToStore`) aren't commands until a screen uses them; the words the screens
  will need are drafted in SHARED-SHOPS.md §8 for the owner (OWNER_QUESTIONS L, chunk 13).
- **For chunk 12:** the room puts the starvation guard's slow-down in `post` (`checkStarvation(state, memory)` with a
  memory per room) and runs `simulateOffline` from `src/sim/catchUp.ts` on a wake; `allowed(member, cmd)` gates
  `setSpeed`; the server forwards only the first `raiseFlag` for each flag (§4.3).
- **For chunk 13:** a listing photo must be shrunk before it's sent (§4.4): today's 640-pixel JPEG is larger than a
  command may be (48 KB). The shared dispatcher (send, settle `done` from the step's results; coalesce sliders), the marks
  kept per player (`src/ui/common/marks.ts` is the one place), the visuals of others' feeds and taps from applied
  commands (today the sender's `after` draws them), and group L's words first.

### 12. Shared shops, the server and the database (SHARED-SHOPS.md §5, §6) — done 2026-10-21 (Marshall)

- **What:** the real server and its database: a club's shop lives in Supabase and runs on the free Render service
  behind sign-in. Still nothing players see (the screens and every word are chunk 13). The chunk starts at `eef5b74`.
  - **The migration (§6, §5.8; SHARE-003):** a new file under `supabase/migrations` (never an edit of an applied one):
    `shared_shops`, `shared_photos` and `shared_usage` (row-level security on, no access for `anon` or
    `authenticated`); the server's functions (`server_member`; `server_shop_get`; `server_shop_create`, the owner only,
    one per club; `server_shop_put`, which checks the lease and the revision and never writes over a newer schema's
    shop, PERSIST-014; `server_shop_take` and `server_shop_release`, the lease in one statement on the database's clock;
    `server_set_pausers`; `server_photo_put`, `server_photo_get`, `server_photo_hashes`, `server_photos_delete`;
    `server_usage_add`, which records the month as closed at a cap), reachable only with the server's password
    (ADR-0047: `private` functions behind `public` wrappers that `anon` may call, each refusing unless the password's
    SHA-256 equals the one fingerprint stored; `scripts/shared-server-key.mjs` makes the password and stores it);
    the game's two (`club_shared_shops()`, `shared_usage()` for the owner) as stage 1's are, `private` behind `public`
    wrappers. `service_role`'s rights on every table and function in `public` revoked and the schema's default
    privileges changed so nothing new grants it any. Checked by `scripts/online-db-local/run.sh` (new cases as `anon`,
    two players, the owner and the server), then applied live with the owner's yes, then the security advisors and the
    stage 1 smoke (`scripts/online-smoke.mjs`).
  - **The server (§5; SHARE-004 to SHARE-009 and SHARE-014 to SHARE-017, their server side):** chunk 10's prototype
    becomes the server. `auth.ts` (the player's token asked of Supabase Auth with the publishable key, cached until it
    expires; membership through `server_member`, checked again every 15 minutes: `removed`), `store.ts` (the database
    through Node's `fetch` with the publishable key and the password from `SHOPS_SERVER_KEY`, never logged),
    `stub.ts` (in-memory storage and accounts, `SHOPS_STUB=1`, for the tests and e2e; the replay endpoint stays
    stub-only), `usage.ts` (bytes sent, headers
    included, ×1.4, and awake seconds, per UTC month; the 2 GB and 400-hour caps close rooms and refuse joins),
    `config.ts` (the public settings in code: the project's address and publishable key from `src/social/project.ts`,
    the game's two sites as the origins when `RENDER` is set). A room's life (§5.2): wake (the lease, load and repair,
    `simulateOffline` from `left_at`, or `saved_at` after a crash: nothing under 5 minutes or if paused, at most 12 game
    hours under grace), running only while someone is there, saved every 3 minutes, on emptying and on SIGTERM, the lease
    renewed every 30 seconds for 90, the room kept 15 minutes empty. `create` (the owner only: a new game with the
    shop's name and starter, normal money, the guide finished, ADR-0045 decision 5). The limits (§5.3): 10 per shop
    (`full`), one connection per player (`elsewhere`), 16 KB messages (48 KB for a listing with a photo), 10 commands and
    30 messages a second, the re-sync budget per player rather than per connection, and 20 joins an hour.
    `allowed(member, cmd, shop)` gates `setSpeed` (the owner and `pausers`), `grant` is the owner's; only the first
    `raiseFlag` for each flag is forwarded; the starvation guard's slow-down goes in `post` with a memory per room;
    `token` refreshes the sign-in (the same player only).
  - **The build identity (§5.1; SHARE-016):** a Vite plugin hashes what every copy runs (`src/sim`, `src/data`,
    `src/types`, the four pure persistence files) in a fixed order with normalised line endings, and stamps the hash and
    the release version into the game and the server; a different hash is told `build` (older) or `updating` (newer).
  - **Photos (§4.4; SHARE-018, the server's side):** `createListing`'s photo checked (WebP or JPEG by its first bytes,
    at most 48 KB), stored once per club by its SHA-256 and forwarded as the reference `p:<hash>`; `{t:'photo'}`
    answered with a binary frame; about 6 photo listings a minute per member; a stored photo deleted only after a save
    that no longer refers to it. `validateCommand` and `repairState` accept exactly that reference and nothing more
    (a core-file change, named in the commit); the interface never puts one in `<img src>` (chunk 13 draws it).
  - **Speed (§11, for K1):** time steps in place (the copy was 18 to 32% of a step), with a checkpoint copy at each
    fingerprint and the steps since, so a step that throws is undone by replaying from the checkpoint and never sent;
    the fingerprint's interval scaled to what it costs (`big_facility`'s took 750 ms on the free instance); a cheaper
    snapshot check than two fingerprints (§3.2 rule 10); rule 5's stagger after a catch-up, Hold all, Resume and Hold
    one. Measured again on Render (the stub shops at 1×, 3× and 10×) into §11; those numbers go to the owner as K1.
  - **The game's side, no screens:** `sharedShops()` and `sharedUsage()` in `SocialService`, the stub and the Supabase
    service; `SHARED_SHOP_SERVER` in `src/social/project.ts`.
  - **The release order (§5.1):** PLAN.md's "Releases" gains it: `main` first, then the server by hand from `main`;
    both `version.json` files and the server's `/health` checked.
- **Render and the owner's steps (ADR-0046, ADR-0047):** the migration live once its local check passes (ADR-0047
  decision 1); then the owner's one dashboard visit, walked through: the server's password, which
  `scripts/shared-server-key.mjs` leaves on the owner's clipboard, pasted as `SHOPS_SERVER_KEY`, and chunk 10's
  `SHOPS_REPLAY`, `ALLOWED_ORIGINS`, `SHOPS_BYTE_BUDGET` and `SHOPS_MAX_CONNECTIONS` deleted; then, once the server's
  tests pass (decision 2), the agent sets the build command so the password never reaches the build (`env -u
  SHOPS_SERVER_KEY sh -c 'npm ci --include=dev --ignore-scripts && npm run build:server'`, the build's log checked for
  the name) and deploys from `next`. The service stays on `next` for chunk 13's play-test; the 0.6.0 release switches
  it to `main`.
- **The live smoke (§9.3):** `scripts/shared-smoke.mjs`: a throwaway club, shop and account made through the CLI
  (scoped to the project), the account joins on the live server, sends commands, checks fingerprints, a photo and a
  refused pause; then everything is removed and checked gone. Run with the owner's yes in the session.
- **Not in this chunk:** the connection in the game, the screens, the shared dispatcher and every player-visible word
  (chunk 13); permission tiers and the money pool (later, §5.6).
- **Tests (§9.1):** the server in process with `SHOPS_STUB=1` and Node's own `WebSocket` as members, every case §9.1
  lists (join and snapshot, commands everywhere, pause refused then granted, first one wins named, a throwing command
  rejected to its sender only, empty and back with and without a catch-up, 10 and the 11th, a second tab, wrong build,
  origin, token or user, removed, both caps, the meters, the re-sync budget, the lease and its renewal, SIGTERM saves,
  a newer schema refused, two rooms with their own caches, photos stored, served and pruned, a step that throws
  undone); the migration's rules in `supabase-migration.test.ts` and the local database check; the build identity
  (a covered file changes the hash, another doesn't); `repairState`'s reference; the boundary test (the server reaches
  only `ws`, Node's modules and the pure layers). e2e: the cross-engine replay runs on the stub server.
- **Done when:** the four checks pass on the final code; one fresh reviewer (Opus 5.5, max effort) reads this brief,
  SHARED-SHOPS.md §3.3, §4.4, §5, §6, §9 and §11 and `git diff eef5b74..HEAD`, and its blockers are fixed; the
  migration is live with the advisors clean; the server is deployed and the live smoke passes; K1 is asked with the new
  numbers; PLAN.md, SHARED-SHOPS.md §11, TRUST_BOUNDARY.md and DEBT_INVENTORY.md (§13's shared-shops sections) say what
  changed; `next` pushed. SHARE-003, SHARE-005, SHARE-007, SHARE-009, SHARE-015 and SHARE-017 GREEN; the server's side
  of SHARE-004, SHARE-006, SHARE-014, SHARE-016 and SHARE-018 done, GREEN with chunk 13.
- **The owner's answers** (2026-10-21, ADR-0047): the migration live once its local check passes; the real server
  deployed from `next` once tested, with the live smoke; **a server password instead of a Supabase secret key**, which
  could reach accounts (players' emails, deleting accounts) through Supabase Auth's admin tools.
- **Built** (2026-10-21, Marshall): `a4989d8`. The server (`server/app.ts`, `host.ts`, `room.ts`, `rooms.ts`,
  `protocol.ts`, `store.ts`, `auth.ts`, `stub.ts`, `usage.ts`, `photos.ts`, `config.ts`); the migration (a helper agent
  wrote it and its 181 new local cases against a fixed interface; the author read it line by line); the build identity
  (`vite.sharedBuild.ts`); the photo reference in `validateCommand` and `repairState`; rule 5's stagger (a shared shop's
  background tanks flush most-owed first, at most as many a step as flush on average); `sharedShops()` and
  `sharedUsage()`; `scripts/shared-smoke.ts` (the live smoke, and `--measure` for K1). Tests: `shared-server` (28: the
  server in process on the stub, members on Node's WebSocket), `shared-room` (19), the lockstep and e2e specs updated on
  purpose (a clock that moves 250 ms a tick, members with permissions, stub tokens), an e2e case with two shops at once
  in their own workers; the local database check 253 cases as expected. Found by the new tests: every save was refused
  by the room-call gate (it compared a save's object with the club), fixed before the commit.
- **Live** (2026-10-21, ADR-0047 decision 1): a read-only preflight first (the CLI runs as `postgres`; `service_role`
  isn't a member of `anon`; everything it reached was ours), then the migration applied; afterwards `service_role`
  reaches 0 tables and 0 functions in `public` and `private`, the 12 server functions refuse (no password yet), the
  security advisors report only Auth's known leaked-password warning, and the stage 1 smoke passed 91 of 91.
- **On Render** (2026-10-21, ADR-0047 decisions 2 and 3): the build command now removes the password first; the owner's
  browser-capable Claude pasted the password (made by the script, clipboard only; one the owner had pasted into the chat
  was replaced) and deleted chunk 10's test variables; deployed from `next` (`cdc5387`, then `7c0e68d`,
  `dep-dbcgnonavr4c73cjr7q0`). The build's variable names show no `SHOPS_SERVER_KEY` and no `SHOPS_*` left; the server
  started with its password. The live smoke (`npx vite-node scripts/shared-smoke.ts`) passed 23 of 23 after it found
  that Render's proxy eats the server's close frames (fixed with `bye`, `7c0e68d`).
- **K1** (ADR-0047 round 2): measured on the free instance (SHARED-SHOPS.md §11, "Chunk 12"): small shops on a fifth of
  its CPU; `big_facility` keeps 93%, 95% and 88% of real time at 1×, 3× and 10× (chunk 10: 84 to 92%, 76%, 55%). The
  owner chose to keep it free with no change.
- **The fresh review** (Opus 5.5, max effort) on `eef5b74..38bfbda`, with probes in the internal clone's
  `scripts/_audit/review-chunk12/`: the migration, the password model, the lockstep core and the core-file changes sound
  (253 local database cases; the live `/health` hash equal to the local one). Three blockers, fixed:
  - **B1:** another spelling of a club's id (upper case, no hyphens: Postgres reads them as the same UUID) opened a
    second room for one shop, and with one lease holder per process both rooms ran, so a member could fork the shop and
    roll back everyone's play. Outside the stub a club is now its canonical lowercase UUID, and each room has its own
    lease holder.
  - **B2:** flipping `away` and `here` saved the whole shop each time, queued without limit (about 440 KB/s for a new
    shop). Saves now coalesce (one in flight, at most one more), and the save on emptying waits 10 seconds and comes at
    most once a minute.
  - **B3:** the room-call gate and a save the database refuses had no test that could fail: `roomCallAllowed` is tested,
    and a save refused for the lease, a newer revision and a newer build each stop the room (`restart`, `updating`) with
    nothing more saved.
  - **Notes, fixed:** each photo once per connection, and no photo while much is queued for a member (the connection ends
    past 8 MB); a failing save backs off (5 seconds, doubling, at most 2 minutes); a room that ends while opening releases
    its joiners and tells anyone left (`restart`); the fingerprint's own step carries a waiting full-detail list; an
    expired sign-in nobody refreshed ends the connection (`bye: sign-in`, 10 minutes' grace); the prune keeps exactly the
    saved copy's photos, and a photo listed again after a prune is stored again; an undo that throws leaves the checkpoint,
    never a half-applied step; the replica (`src/game/sharedLoop.ts`) is in the build identity; tests for the stagger in
    the step block, its most-owed-first order and the fingerprint spacing; the docs (default privileges and PUBLIC, what
    only binds browsers, `shared_usage.closed`, the re-sync budget as built, replacing the password).
- **Its confirmation pass** (`38bfbda..1689c46`): the three blockers and the notes confirmed fixed, and the new tests
  catch the old mutants; one new blocker in note 1's fix, fixed next: past 8 MB queued, `send()` ended the connection
  through `end()`, whose `bye` came back through `send()` until the stack ran out (the other members lost their frames,
  and one malformed message from that member crashed the server). Now the socket is dropped at once, never through
  `end()`; a test forces a member's buffer past the limit (it fails against the old code). Its notes, fixed: a photo is
  marked sent when it goes out (none are skipped for a busy member any more; the 8 MB limit guards memory); a worker that
  fails releases its room's lease from the main thread, so a member back at once needn't wait 90 seconds; tests for the
  emptying save's minimum interval and the save backoff. Left, covered by the review's probes (`vt/c1` to `c4`,
  `vt/p2`, `p4` in the internal clone's `scripts/_audit/review-chunk12/`) rather than the suite: the per-room lease
  holder, a room ending while opening, the undo's fallback to the checkpoint, and the prune's saved-copy references.
- **Its second confirmation pass** (`1689c46..aa7b184`): no blockers; the send/end blocker and the three notes confirmed
  fixed, nothing new broken (its probes and mutants at `aa7b184`). Its one test gap, closed in a test-only commit: a
  photo asked for but not delivered (the database failed) can be asked for again.
- **For chunk 13** (what the server does that the client must meet): send `hello` (or the owner's `create`, with the
  starter's name and the preview seed) and wait for the welcome before anything else; `you.id` is the account's id, the
  `by` of your own commands; a `raiseFlag` the shop already has gets no step and no reply, so settle it at once; through
  Render's proxy the server's close frames never arrive (1006 about 20 seconds later), so act on the `closing` and `bye`
  messages and close the socket yourself: `bye` `away` means reconnect only when the player is back, `sign-in` means
  refresh the session (and send `token` hourly); a `post` of `setSpeed 1` is the starvation guard (show its toast from your own copy); photo frames are tag
  3, the hash, a type byte, the bytes; `gone` needs its words (§8); joining the welcome's `catchUp` shows the
  welcome-back card; every snapshot after the first (a catch-up, a re-sync) replaces the copy.

### 13. Shared shops, the screens and the play-test (SHARED-SHOPS.md §7, §8) — built 2026-10-21 (Chase); the play-test next

- **What:** the game opens a club's shared shop: the connection, the shared dispatcher, the screens with §8's approved
  words (ADR-0045, ADR-0048), your own game waiting, the save guards and photos; then a play-test with the owner and
  their daughter on the live server, and the 0.6.0 release with the owner's go-ahead. The chunk starts at `64e86e3`, on
  the branch `chunk13` in the worktree `/Volumes/Dev/Projects/AquariumGo-chunk13` (at the owner's request, SESSION_HANDOFF.md
  "Handoff to Chase"); until Marshall's "chunk 12 done" it leaves `server/`, `supabase/`, `scripts/shared-*` and chunk
  12's tests alone and runs no e2e, then merges `next` in.
  - **The connection** (`src/ui/shared/connection.ts`, the browser's own `WebSocket`; SHARE-005, SHARE-008, SHARE-016,
    SHARE-017; §3.3, §5.3, §5.5, §7.6): `GET {SHARED_SHOP_SERVER}/health` to wake the server (never while
    `sharedShops()` says shops are closed for the month, §5.7), then `wss://…/shop` and `hello` (or the owner's
    `create`) with the player's access token, `SHARED_BUILD`, the club, and `plain` where `DecompressionStream` is
    missing; nothing else until the `welcome` and its snapshot frame. The replica (`SharedReplica`) applies the steps
    and the game store shows its copy (published with `share`, fastMutate's structural sharing, through `setGame`, never
    aliasing the replica's copy); every snapshot after the first replaces it. `view` (the focused tank), `here` and
    `away` (the tab shown or hidden), `input` (at most once a minute), `token` hourly and whenever supabase-js refreshes
    the session, `resync` when the replica falls out of step, and a snapshot with the slow-device line when it is more
    than 10 seconds behind. Render's proxy eats the server's close frames, so the client acts on `closing` and `bye` and
    closes the socket itself: `bye sign-in` refreshes the session and tries once more; `bye away` reconnects only when the
    player is back; `bye protocol` or `server`, or a dropped socket: "Lost the connection to the shared shop.
    Reconnecting…", with waits growing from 1 to 30 seconds, never while the tab is hidden. A hidden tab disconnects
    after 2 minutes and reconnects, with a snapshot, when shown.
  - **The shop's store** (`src/ui/shared/store.ts`; §3.2 rule 11): the "shared" mark lives outside `GameState`: the club,
    the shop's name, `you`, the members, the connection's phase (waking, joining, catching up, open, reconnecting,
    closed and why) and the pending commands. Persistence and the game loop can't import `src/ui`, so whether a shared
    shop is open is one small flag every layer may read (in `src/state`), set only by `src/ui/shared`.
  - **The shared dispatcher** (`src/ui/shared/dispatch.ts`; §4.2): installed with `installDispatch` while a shop is open,
    `soloDispatch` put back after. It sends `{t:'cmd', id, c}` and returns `undefined`, and settles `done` with that
    command's result once the step carrying `{by: you.id, id}` has been applied here (`runSharedStep`'s results come in
    `cmds` order, so `SharedReplica` hands them on: a change to `src/game/sharedLoop.ts`). A `reject` settles it as not
    applied, with its words (`rate`: "Slow down a little: that was a lot of actions at once."; `failed` or `malformed`:
    "That didn’t work, and nothing was changed. Please try again."); a `raiseFlag` the shop already has settles at once
    and isn't sent (the server would send no step and no reply); a command in flight across a reconnect settles from
    the snapshot's later steps, or as not applied. Controls that send many values (the equipment slider, the stock
    budget, any amount typed or dragged) are coalesced per control: at most about 4 a second plus the value on release,
    the control showing its own value until the step lands. Pause and speed without permission aren't sent: "Only
    {owner} and the people they choose can pause or change the speed."
  - **Opening and leaving** (`src/ui/shared/session.ts`; §7.2; SHARE-010): opening saves your own game to its slot
    first ("Saving your aquarium…", with its online copy as any save), and records on the device which save it was
    and, while the shop is open, a heartbeat of the time (`localStorage`, wrapped in try/catch). Inside, the game loop
    doesn't tick, and the hidden-tab catch-up and the welcome-back card's own pause don't run. Leaving ("Back to my
    aquarium", or a closing that ends the visit) loads your own save with its `lastTickRealMs` moved on by the time in
    the shop, so nothing catches up, or goes back to the title screen when you came from there; the next load of that
    save after the browser closed inside the shop leaves out the recorded time the same way. The shop's id is
    `shared_<club>` (the server sets it), never a slot's.
  - **Nothing saves a shared shop** (SHARE-011; §7.3): autosave (its timer and the saves on hiding and closing the tab),
    Save, Load, Import, Export, the online save and the leaderboard report each refuse a shared shop before anything
    else, flush included, each with a test. The guards in persistence are a core-file change, named in their commit.
    Settings › Saves shows "This is {club}'s shared shop: it saves on the server. Your own aquarium is saved and waits
    for you." [Back to my aquarium]; a save button tried: "The shared shop saves itself on the server."
  - **The screens** (§8, every word approved; SHARE-004, SHARE-006, SHARE-008, SHARE-014, SHARE-016): the club card in
    Social (the owner with no shop: **Shared shop** and [Create shared shop]; a member: "No shared shop yet."; a shop:
    **{shop}**, "Day {day} · {money}", [Open shared shop]; the owner's meter from `sharedUsage()`; closed for the month:
    the cap or hours line with its date, from `sharedShops()`, which never wakes the server); the title screen's "Shared
    shop: {shop}" under Continue, on a device that has opened that shop; creating: the new-game naming and starter
    screens titled "New shared shop" (the starter previewed with a seed that `create` sends, so the shop gets the one the
    owner saw), then "Your club can open it from Social."; the opening steps ("Saving your aquarium…", "Waking the shared
    shop…", "Catching up on the time nobody was here…"); "First time in", once per shop on the device; the HUD strip
    "Shared · {shop} · Here: {name}, {name}" [Back to my aquarium]; the owner's members list, each with "Can pause and
    change speed" (`grant`); "Still here?" after 30 minutes without input in a visible tab, `away` a minute later if
    unanswered; every `closing` (`gone`: "{club} has no shared shop any more.", back to where the player came from;
    `build` and `outofstep` offer [Reload], and `build` waits for `version.json` to change first, §5.1); "Catching up
    with the shared shop…"; the slow-device line; the welcome-back card from the welcome's `catchUp`; the starvation
    guard's toast from a `post` of `setSpeed 1`, shown from the player's own copy.
  - **Others' actions** (SHARE-012, SHARE-013; §4.3): an alerts line is the event's own message with "{name}: " in front
    (the events are tagged `by`); pop-ups for a pause, a speed change, and a sale or purchase over $100, never for your
    own; first one wins and "{name} already changed that." on the sender's screen, from the command's result.
    `conflictText`'s DRAFT note becomes "approved (ADR-0048)" (`src/sim`, so it changes the shared build's hash: the
    server is deployed from the same commit as the game it plays with). Others' feeds, taps and decor changes fire the
    same visual hooks (`aiFeed`, `aiTap`) from applied commands on every screen looking at that tank (today the
    sender's `after` draws them).
  - **Each player's own marks** (§3.2 rule 8, §7.4): in a shared shop `mark()` (`src/ui/common/marks.ts`) keeps the
    alerts' read marks and Clear all, the log's read mark and Research's and the shows' "seen" per player and shop in
    `localStorage`, and their readers read them over the shared copy; so do the notification settings (`notify.*`).
  - **Photos** (§4.4; SHARE-018): a listing photo is shrunk to about 320 pixels wide before `createListing` (WebP; JPEG
    when the browser hands back a PNG or anything else; under the command's 48 KB). A `p:` reference is drawn from a
    blob fetched over the socket (`{t:'photo', hash}`, answered with a `FRAME_PHOTO` frame), only when it's on screen,
    kept for the session, and never put in `<img src>` as such (an object URL made from the blob is the picture).
  - **The rest:** no guide (the coach hidden); the dev panel and `?dev=1` write nothing in a shared shop; the interface's
    error boundary doesn't pause a shared shop (it would pause everyone's) and offers [Back to my aquarium] where a solo
    game offers "Save & reload"; `SocialService` gains the access token (supabase-js `getSession()`; the local stub's
    `stub:<id>:<name>`, with `:owner` for the owner); the local stub's `sharedShops()` returns its clubs' shops, and the
    stub server (`server/stub.ts`) knows the game's stub clubs (`highland-betta` …), the owner creating a shop on demand,
    agreed with Marshall while chunk 12 finishes.
- **Words:** §8's only. Any other player-visible words the screens turn out to need (a label, an accessible name, a
  button) go to the owner in one batched round (AskUserQuestion, recommended option first), recorded verbatim in a new
  ADR from ADR-0049.
- **The owner's gates** (SESSION_HANDOFF.md): (1) any words beyond §8; (2) the play-test with the owner and their
  daughter on the live server: `aquarium-go-shops` deployed from `next` at the chunk's final commit (ADR-0047 decision
  2) and the shared smoke run after (`npx vite-node scripts/shared-smoke.ts` from the internal-disk clone). The server
  accepts only the game's two sites as origins, so how the game itself reaches the players for it is the owner's call,
  asked once. Her account comes from the club's invite link (a parent signs up for a player under 13, ADR-0039 decision
  4). (3) The 0.6.0 release, only on the owner's go-ahead in that session ("Releases", step 4: `main` first, then the
  server switched to `main` and deployed by hand; `/health`'s `build` and both `version.json` files checked).
- **Not in this chunk:** permission tiers and the money pool (§5.6), more than one shop per club, members creating
  shops, deleting a shop from the game, trading between a shared shop and anyone's own game, Firefox in the suite.
- **Tests (§9):** unit: the dispatcher (settled from the step by `{by, id}` in `cmds` order; a reject; a command lost
  across a reconnect; `raiseFlag` at once; a coalesced control ends on its last value); the connection's phases on a
  fake socket (the welcome and snapshot, each `closing` and `bye`, the growing waits, a hidden tab's 2 minutes, `token`,
  `input` at most once a minute, falling behind); every save path refuses a shared shop before its flush; your own game
  resumes with no catch-up, also after the browser closed inside the shop; the marks per player; the photo's shrink and
  its fallback; the alerts line's name and the pop-up's rules; the error boundary leaves a shared shop running;
  `core-mutation-boundary` and the layer test take the new files on purpose. e2e (`tests/e2e/shared-shop.spec.ts`,
  Chromium and WebKit, the stub server, never the live one): the owner creates a shop from the club card; two browser
  contexts in one shop: a purchase in one appears in the other; pause refused, then granted; the activity line and the
  pop-up; first one wins, named; a listing photo on both; leaving brings your own game back unchanged with no catch-up;
  "Still here?"; a reconnect after the server restarts (a stub server the spec starts and stops itself). The
  cross-engine replay stays.
- **Done when:** the four checks pass on the final code, from the internal-disk clone; one fresh reviewer (Opus 5.5,
  max effort) reads this brief, SHARED-SHOPS.md §3.3, §4.2 to §4.4, §5.3, §5.5, §7, §8 and §9 and chunk 13's own diff
  (`git diff next...chunk13` after the last merge of `next`), and its blockers and its confirmation passes' are fixed;
  PLAN.md, SHARED-SHOPS.md (as built), ARCHITECTURE.md, TRUST_BOUNDARY.md and REQUIREMENTS.json say what changed; `next`
  fast-forwarded to `chunk13` and pushed from the internal-disk clone. SHARE-004, SHARE-006, SHARE-008, SHARE-010 to
  SHARE-014, SHARE-016 and SHARE-018 GREEN (with chunk 12's server side). Then the play-test and the release, each on
  the owner's yes.
- **The owner's answers** (2026-10-21, ADR-0049): two more lines approved as written ("You need to be signed in to play
  the shared shop. Sign in from Social and open it again."; the pause refusal with "the owner" when the game doesn't
  know the owner's name); **the play-test on the Render address first**: the chunk's final commit on the Render static
  site `aquarium-go` (https://aquarium-go.onrender.com) by hand, the shop server from the same commit, GitHub Pages
  staying 0.5.6 until the owner says release.
- **Built** (2026-10-21, Chase; `666127a` … `d6c7926`, `next` merged at chunk 12's end `e1666ed`):
  - *The client* (`src/ui/shared/`): `connection.ts` (wake, `hello`/`create` with the access token and `SHARED_BUILD`,
    the replica, `view`, `here`/`away`, `input` once a minute, "Still here?" at 30 minutes and `away` at 31, `token` on
    each refresh and every 45 minutes, `resync` out of step or more than 10 seconds behind the server's clock, `closing`
    and `bye` acted on with the socket closed here, reconnects at 1 to 30 seconds never while hidden, a hidden tab
    disconnected after 2 minutes and rejoined quietly when shown), `dispatch.ts` (commands settle from their own step's
    results, rejects with §8's words, a drop settles what it carried, known flags and refused pauses never sent, sliders
    at most 4 values a second ending on the last, "{name} already changed that."), `session.ts` (your own aquarium saved
    and recorded first, the shared mode, the copy published with `share` and `setGame(…, { actions })`, the marks over
    it, leaving back to your own save or the title, the closings), `marks.ts`, `photos.ts` (320-pixel WebP or JPEG; a
    `p:` reference drawn from bytes fetched once per connection), `activity.ts` (others' pop-ups, feeds and taps, the
    starvation toast), `words.ts` (§8 and ADR-0049), and the screens (the club card's section, the opening card, the
    strip with the owner's members list, the notices, "Still here?", the first-time and closing cards).
  - *Elsewhere in the game:* `src/state/sharedMode.ts`; `src/persistence/sharedAway.ts` and the guards in `session.ts`,
    `slots.ts` and `offline.ts` (core files: a shared shop is never saved on the device, a slot never takes a `shared_`
    id, the time in a shop is no time away, no hidden-tab catch-up); `setGame`'s `actions` (core: `src/state/game.ts`);
    the loop and autosave stand still; Save, Load, Import, Export, the online save and the leaderboard refuse; the
    error boundary leaves a shared shop running and offers the way back; no guide, no dev writes; the title button; the
    new-game screens titled "New shared shop"; Settings › Saves; the speed refusal; the alerts line's name; the Social
    service's access token (Supabase, the local stub's stub token) and the local stub's shop list.
  - *The server's side* (after "chunk 12 done"): the welcome names the owner (a room may look up its own club's members
    only), steps carry the server's clock, the stub opens the local Social stub's clubs to every stub player and lists
    its shops (`GET /stub/shops`, the stub only). Two optional protocol fields (`src/types/shared.ts`).
  - *Tests:* unit `shared-client` (the client against the server in process: join, commands both ways, pause refused
    then granted, a known flag, first one wins named, the setting note, a drop and the reconnect), `shared-connection`
    (17 timer cases on a fake socket), `shared-dispatch` (8), `shared-own-game` (8: your own game waits; every save
    path refuses), `shared-screens` (12), `shared-social` (5), `shared-server-chunk13` (6); B3a's gate line changed on
    purpose (a room may now look up its own club's members). e2e `shared-shop.spec.ts` (4 tests in each browser, 9 of 9
    with the warm-up in Chromium and WebKit on `aa9fab4`). Found while building: a shop woken from storage keeps its
    stored id (only `create` sets `shared_<club>`), so the guards go by the shared mode first; the guide card showed in
    a stub shop whose guide wasn't done (hidden in every shared shop now); the HUD strip moved above the dock (under the
    tank bar on phones) after screenshots at 1280 × 720 showed it over the tool rail.
- **The first full pass** on `d6c7926` (2026-10-21, the internal-disk clone, under `caffeinate -i -s`): typecheck passed;
  unit 253 files, 3,166 tests passed; build passed; e2e 329 of 329 in Chromium and WebKit (39.1 minutes).
- **The final pass** on `c063c6e` (after the review and its three confirmations): typecheck passed; unit 255 files, 3,202
  tests passed; build passed; e2e 329 of 329 in Chromium and WebKit (39.4 minutes).
- **The play-test build** (2026-10-21, ADR-0047 decision 2, ADR-0049 decision 3): `next` = `30a699f` pushed (Claude Code's
  auto mode refused the agent's first push; the owner gave permission in the session and the agent pushed);
  `aquarium-go-shops` deployed from it (`dep-dbcmsq2vcj2c73f6mok0`; `/health` `build` `681ac8b023eeaca7`, this commit's
  shared build hash; no `SHOPS_SERVER_KEY` in the build's variables); the live smoke 23 of 23; the Render static site
  `aquarium-go` deployed from the same commit (`dep-dbcmugi9lscs73eerrtg`, no branch switch needed: Render took a
  commit from `next`), its `version.json` `30a699f-…`; GitHub Pages still 0.5.6 (`3a0e8ce`).
- **The agent's live test of that build** (the owner, 2026-10-21: "test it and then release"): two throwaway members,
  one in Chromium and one in WebKit, played a throwaway club's shared shop on https://aquarium-go.onrender.com and the
  live server through the real interface (both open it from the club card, the strips name both, the member's pause
  refused with "the owner", the owner's pause and speed on both copies with their pop-ups, Settings › Saves in a shop,
  Back to my aquarium, no page errors), then the club, the shop and both accounts were removed and checked gone: 18 of
  18 (`scripts/_audit/chunk13/live.ts` in the internal clone, git-excluded). Run again on GitHub Pages after the
  release: 18 of 18.
- **The fresh review** (Opus 5.5, max effort) on `next...chunk13` at `d6c7926`, with probes and mutants
  (`scripts/_audit/review-chunk13/`, git-excluded): five blockers, all fixed in `882c06c`.
  - **B1:** the created shop's starter wasn't the animal the owner previewed (the server rolled its own from the world's
    stream; 0 of 30 seeds matched). `create` now passes `previewStarters(seed)[starter]`; chunk 12's create test compares
    the whole animal.
  - **B2:** a command in flight when the copy fell out of step never settled (its step was skipped, the snapshot replaced
    the copy). The dispatcher now settles what was pending when the copy asked for the shop again once that snapshot
    lands, as applied with its result unseen (the server reads the socket in order, so it is in the snapshot).
  - **B3:** follow-ups ran before the copy holding their result was published (salt and egg stock lines, "Manual mode
    off"). A batch is published first, then its commands settle; one follow-up that throws no longer skips the rest.
  - **B4:** the online save's refusals had no test: tests in `online-sync.test.ts`.
  - **B5:** the title button woke the server even when shops were closed for the month. Before anything wakes it, a
    signed-out player and closed shops get their line at once.
  - **Notes, fixed:** the /health retry uses the growing waits and never runs hidden; a drop before the first welcome
    keeps the opening card; a network failure fetching the token is a lost connection, not a sign-out; the slow line
    stays a while, and steps read while hidden don't count as behind; one leave at a time; opening from the title leaves
    a waiting save's record alone; the waiting save loads from whichever slot holds it; the parked game's online copy
    goes at once; the remaining dev writers refuse; the online-save box never shows over a shared shop; any purchase or
    sale over $100 pops up (not rewards or refunds); the dialogs are named by their own line; Settings' subtitle;
    `removed` forgets the title button; the phone notice; the date fallback; the boundary tests name the new files; the
    e2e leaving test's margin; tests for the mutants that survived (`bye protocol`/`server`, a drop while hidden, held-back
    values on a drop, the Toasts filter) and a session test with a fake connection (`shared-session`).
  - **Left on purpose:** a guide flag the server drops as a repeat while this copy doesn't show it yet stays pending
    until a drop (harmless: `edit()` asks for no result); the opening card's back button from the title screen reuses the
    starter screen's existing "Title" (to put to the owner with the release question).
- **Its confirmation passes.** The first (`d6c7926..882c06c`): B1 to B5 confirmed, B2's reasoning checked against the
  server, and one new blocker from B5's fix: two quick clicks on Open started two visits while the checks ran. Fixed in
  `7e44242` (one opening at a time, a busy phase before the first wait), with its notes: a result unseen across a
  re-sync plays no sound or toast, a publish that throws still settles its batch, `bye sign-in` keeps asking for a fresh
  token after a network failure, and tests for the re-sync wiring, the online copy sent on parking and the online save
  with autosave off. The second (`882c06c..7e44242`): one small blocker, Open dead after Back until the first `/health`
  answered; fixed in `c063c6e` (the guard ends once the visit exists), with the other action helper quiet for an unseen
  result and the checks in a quiet `checking` phase. The third (`7e44242..c063c6e`): clean, no blockers. Its two notes,
  left: a late-finishing earlier open could clear a newer one's guard (not reachable by a click: the buttons are busy
  meanwhile; only `__AQ.shared.open` gets through), and the opening's `catch` resets only the visit's store (nothing
  between the mode going on and the visit existing can throw).

### 14. Shared shops, permission tiers and the money pool (ADR-0043 decision 5, ADR-0050) — done 2026-10-22 (Marshall; released in 0.7.0)

- **What:** the owner's tiers of permission and group pool, as close to their own words as the game allows (ADR-0043
  round 2 question 2; ADR-0050 has the answers, the previews and the words, verbatim): each member spends the pool
  freely, from an allowance topped up each game day, or only with money asked for and approved; members ask for an
  amount; the owner and the members they let approve answer and can give money (the one-off grant, the Prismatic
  case); staff and the stock budget only for members who spend freely. Finished enough to release as 0.7.0 on the
  owner's go-ahead. The chunk starts at `9359894` on `next` (SESSION_HANDOFF.md "Handoff to Marshall: chunk 14").
- **Where the state lives: the shop's `GameState`** (ADR-0050's "no database change"). `GameState.pool?` (new, optional,
  only in a shared shop): `members` (by account id: `name`, `tier` `free` | `allowance` | `ask`, `allowance` a game day,
  `left` and `day` (the allowance left on game day `day`; a later day reads as the whole allowance, so the top-up needs
  no step of its own), `extra` (approved and given money, kept until spent), `approve`) and `asks` (the open requests:
  `id`, `by`, `name`, `amount`, `note?`, `hour`; an answered or cancelled one leaves the list, its story stays in the
  log). Validated in `repairState` when present (an unreadable entry dropped, an empty pool removed); absent, the shop
  plays as 0.6.0 and `stateHash` is unchanged. A member with no record spends freely (decision 1). Pause and speed stay
  on the shop's row (`pausers`), as in 0.6.0. Every copy reads the same pool, so the screens agree without new messages.
- **Commands** (six new kinds, `src/sim/commands` + `src/sim/pool.ts`; each in `kinds.ts`, `apply.ts`/`index.ts`,
  `validate.ts` and the catalogue test): `askMoney {amount, note?}`, `cancelAsk {ask}`, `answerAsk {ask, yes}`,
  `giveMoney {member, name, amount}`, `setSpending {member, name, tier, allowance?}`, `setApprover {member, name, on}`.
  They need an actor (a shared shop); in a solo game they're refused and change nothing. Amounts are whole dollars, 1
  to 10,000,000; a note at most 60 characters; at most 3 open requests a member; nobody answers, gives to or changes
  themselves; only the owner changes tiers and approvers; only the owner and approvers answer and give. **The owner
  flag rides on the step:** the server marks the owner's commands (`StepCommand.owner`, from `server_member`, never
  from the browser), so every copy knows who the owner is and refuses the same things.
- **Spending** (decision 3): a member's spend is the pool's money before a command minus after it, for every kind but
  care (`feedTank`, `waterChange`, `topOff`, `cleanTank`, `dose`, `repairEquipment`: every tier cares for the animals,
  decision 2) and the pool's own. For a member on Allowance or Asks first, every copy takes it from the allowance left
  today first, then the approved money, in the command's own step. **More than they can spend:** the server's copy of
  the step (it already runs each command's step on a copy) says so (`overspend: {cost, can}` on the result), and the
  server refuses the command (`reject` `spend`, with `cost` and `can`) before any copy sees it: "That costs {cost}, and
  you can spend {can}. Ask for more in Money." **Running costs** (`hireStaff`, `fireStaff`, `setStockBudget`,
  `setStockOrders`) are refused on every copy for a member who doesn't spend freely: "Staff and the stock budget keep
  spending the pool, so only members who spend freely can change them." The pool is never split or reserved: it drops
  only when something is bought, and the game's own "Not enough money" still applies to it.
- **The server** (`server/room.ts`): `allowed(member, cmd, state)` adds the owner-only and approver-only kinds (refused
  as `forbidden`; the screens never offer them to anyone else); the owner flag on the owner's step commands; the
  `spend` refusal. `src/types/shared.ts`: `RejectReason` gains `spend`, the `reject` message `cost` and `can`.
- **The screens** (`src/ui/shared`; every word from ADR-0050's previews): the strip's **Money** button for everyone
  ("Money"; "Money: {can} to spend" for a member who doesn't spend freely; "Money ({n})" for an approver with {n}
  requests waiting); the **Shop money** sheet ("Pool: {money}. Everything the shop earns goes here."; "You can spend
  {can}."; "Allowance: {left} of {allowance} left today."; "Approved for you: {extra}."; Ask for money with "How
  much?", "What for? (optional)", Send request and Cancel; Your requests, "{amount}: {note} · Waiting" with Cancel;
  for approvers, Requests, "{name} asks for {amount}: {note}" with Approve and Decline, and Give money with a member, an
  amount and Give); the owner's **members list** gains each member's Spending (Spends freely, Allowance [amount] each
  game day, Asks first) and "Can approve requests and give money", beside "Can pause and change speed", for the members
  there and anyone with a record. **Pop-ups** (never for one's own action): "{name} asks for {amount}: {note}." to
  approvers; "{owner} approved your {amount}.", "{owner} declined your request for {amount}.", "{owner} gave you
  {amount} to spend." to the member; a tier change's alerts line to the member it's about; "{n} requests are waiting in
  Money." to an approver opening the shop. **Alerts** (everyone, the name in front, the game's own tagging): "Asked for
  {amount}: {note}.", "Approved {name}'s {amount}.", "Declined {name}'s request for {amount}.", "Gave {name} {amount} to
  spend.", "Cancelled the request for {amount}.", "Set {name} to spend freely.", "Set {name}'s allowance to {amount} a
  game day.", "Set {name} to ask first.", "Let {name} approve requests.", "{name} can no longer approve requests."
  **First one wins:** "Sam already answered that request." (ADR-0048's pattern; "That request has changed since you
  looked." when nobody is named). Forms the previews imply but don't show (a request with no note, one request
  waiting) go to the owner with the release question.
- **Tests** (SESSION_HANDOFF.md "Testing it yourself afterwards"): unit, `allowed` for every tier and kind; a refused
  purchase leaves every copy unchanged; a request asked, approved, declined, cancelled and spent; the allowance topped
  up on a new game day and used before the approved money; an allowance running out across quick purchases; a gift
  used once; two approvers on one request (the first wins); the coalesced controls refused for a member who doesn't
  spend freely; `repairState`; the lockstep tests match fingerprints with the pool in play. e2e
  (`tests/e2e/shared-shop.spec.ts`, two players on the stub server, Chromium and WebKit): a member on Asks first is
  refused with the approved words, asks, the owner approves, the member buys, and the pool and the member's money
  update on both screens. Live, right after the release (decision 7): `scripts/shared-smoke.ts` and the two-browser
  test extended to the money flows. The four checks; one fresh reviewer (Opus 5.5, max effort) on `git diff
  9359894..HEAD`, then confirmation passes until clean.
- **Requirements:** SHARE-019 (tiers), SHARE-020 (the pool and spending), SHARE-021 (requests), SHARE-022
  (allowances and gifts), SHARE-023 (the screens and words), SHARE-024 (the lockstep holds with the pool).
- **Core files:** `src/types/game.ts` (`GameState.pool`), `src/persistence/migrations.ts` (`repairState`),
  `src/types/shared.ts` (the reject), `src/sim/sharedStep.ts` (the owner flag): the reviewer checks them closely. The
  shared build hash changes, so 0.7.0's site and server go out together (step 4 of "Releases").
- **Built** (`84799bc`, Marshall, 2026-10-21): `src/sim/pool.ts` (the tiers, the spend measured per command, the six
  commands, the approved lines), the commands' catalogue and first one wins for requests, `repairPool`, the server's
  `allowed` and spend refusal, the screens (`src/ui/shared/SharedMoney.tsx`: the Money button and sheet, the owner's
  spending row; the pop-ups in `activity.ts`; the refusals in `dispatch.ts`), the live smoke's pool checks. A look in
  both browsers at desktop and phone sizes (`scripts/_audit/chunk14/look.mjs` in the internal clone, git-excluded) found
  two things, fixed before the commit: on a phone a tap on "Allowance" landed in its amount field (the field now sits
  beside the choice), and a long Money label squeezed who's here out of the strip (it gets its own row on phones). The
  toast stack shows a few at a time and lets routine ones lapse behind the game's own news, so a pool pop-up can go
  unseen in a busy shop; its line is in the alerts list either way (the game's toast rules, unchanged).
- **The fresh review** (Opus 5.5, max effort, on `9359894..84799bc`): one blocker, a test that couldn't fail (care that
  costs money was never sent by a member who can't spend; two mutants survived); its notes: caps the save keeps but the
  commands didn't (approved money, open requests in all), a double-clicked Approve's words, the allowance field sending
  twice, gifts to made-up ids, the refusal reading "costs $300, and you can spend $300", and test gaps. All fixed in
  `5843bb0` (the care test fails without the exemption). Left on purpose, for the owner: care is never refused or
  counted, as decided (a dose for a big reef tank costs up to about $400 from the pool); approvers can give each other
  money (by design: the owner chooses them); gifts go only to members who don't spend freely (as the screen offers).
- **The full pass on `84799bc`:** typecheck passed; unit 257 files, 3,237 tests passed; build passed; e2e 328 of 329
  (39.3 min): the money test's pop-up check in Chromium, the toast stack above; the test now records pop-ups as raised.
- **The confirmation pass** (the same reviewer, `84799bc..5843bb0`): no blockers; each fix checked (its mutants caught,
  its fuzz of 4 × 400 actions clean). Its notes, fixed after: in the owner's spending row a send that didn't go through
  couldn't be retried with the same choice, and a press on a choice that never became a click could swallow the next
  typed amount (now honoured only within 600 ms); the two-day test's joiner never joined; a gift to a member whose
  record spends freely wasn't covered by a test; the drafted live money test called a dev hook the players' build
  doesn't have (it now buys through Market › Supplies and reads the pop-ups from the toast record); ADR-0050 decision
  8's reading of the request's refusal labelled as the agent's. The second confirmation (`5843bb0..d16dd72`): clean
  (the release commit checked against ADR-0050 too). Its one residue, cosmetic: on a touch screen a press on a choice
  held over 600 ms right after typing an amount can still send the amount and then the choice (two lines).
- **The final pass** on the release commit `d16dd72`: typecheck, unit 3,243, build, e2e 331 of 331 (39.9 min).
- **Released as 0.7.0** (2026-10-22, the owner's go-ahead in ADR-0050 round 2; "Releases"). Live, after the deploys:
  `scripts/shared-smoke.ts` 27 of 27 (with the pool's four checks), and the two-browser money test
  (`scripts/_audit/chunk14/live.ts` in the internal clone, git-excluded: a throwaway club whose stored shop makes one
  throwaway member an approver and the other Asks first, since no throwaway is the game's owner) 29 of 29 on Pages and
  29 of 29 on the Render address, the accounts and the club removed and checked gone.
- **Left for the owner** (SESSION_HANDOFF.md): care is never counted or refused, as decided, so a member on Asks first
  can still spend the pool on doses (up to about $400 a dose for a 1,000-gallon reef tank); approvers can give each
  other money (by design); a pool pop-up can lapse behind the game's own news in a busy shop (the toast stack's rules;
  the line is in the alerts list).

### 15. The scenario lab (ADR-0051) — done 2026-10-23 (Chase)

- **What:** developer tools to build any aquarium or setup and play it without playing up to it (the owner,
  2026-10-23, verbatim in ADR-0051). The owner describes a setup (tanks, water, animals with genes, Prismatic, age and
  health, gear, decor, eggs and fry, and the shop around them: money, time, facility, unlocks, research, staff, shows,
  the market) and plays it in seconds; keeps it, loads it again, exports or imports it, and hands it to an agent or a
  test. A developer tool on the owner's Mac (ADR-0051 decision 1): never in the players' build, no new service, and
  ADR-0037 decision 3 unchanged (the live site ignores `?dev=1`, `?lab=`, `?scenario=` and `?recipe=`; where the tools
  are allowed Social is the local stub). Solo games only. The chunk starts at `117aca9` on `next`
  (SESSION_HANDOFF.md "Handoff to Chase: chunk 15").
- **The recipe** (`src/dev/scenario/recipe.ts`, documented in `docs/SCENARIOS.md`): versioned JSON (`format`
  `aquarium-go-scenario`, `version` 1). A base (`blank`: an empty shop, everything unlocked and researched, the guide
  finished, $50,000 and plenty of food, ADR-0051 decision 2; `starter:<id>`; `fixture:<name>`; `current`, the game on
  screen), a seed, the shop, tanks (tier or gallons, water class, purpose, cycled, age, exact water values, equipment
  added or broken, substrate, decor automatic, none, listed or both, lights, backdrop), animals per tank (species,
  count, sex plan, age or stage, names, genes or a morph by name, potentials, Prismatic, stats, illness, injury,
  breeding `ready` or `spawned`), eggs, larvae or fry, staff, the stock budget, the market (offers incl. Prismatic,
  listings with bids, demand), shows (entries, show day), production lines, a warm-up, how it opens (tank, view,
  speed; paused by default, ADR-0051 decision 3), checks (what should be true after N hours) and a `patch` (a deep
  merge for anything else, prototype keys refused).
- **The builder** (`src/dev/scenario/build.ts`, pure): `buildScenario(recipe, env)` builds through the game's own
  functions (`newGame`, `createTank`, `createCreature`, `installEquipment`, `placeDecor`, `devForceBreeding`,
  `createClutch`, `addStaffDirect`, `createListing`, `forceBuyerVisit`, `enterShow`, `createLine` …), sets the clock
  before it makes anything, never throws on a bad recipe (each problem named, by path: an error skips that part, a
  warning or note builds it) and is deterministic (same recipe and seed, same `stateHash`). Every built world goes
  through the real save path (`encodeRecord` → `decodeRecord`, so `repairState` runs) and the loaded copy is what's
  returned; a repair it needed is reported. `validateRecipe` is a trial build plus the game's own compatibility
  verdict per tank (warned, never refused). `captureRecipe` turns the game on screen into a recipe. `runScenario` runs
  a built world forward and judges the checks.
- **The screen** (`src/dev/lab/`, its own chunks, mounted by `App.tsx` only where the tools are allowed): presets
  (built in, and the owner's own kept in this browser: save, duplicate, delete), an editor (Setup, Tanks with animals
  and young, Shop & market, JSON with copy, paste into it, import and export a file, and capture), the problems and verdicts
  while editing, Copy link, Build and play. While a scenario plays, a badge ("Scenario: … · not saved") with Start again
  and Lab. A scenario never autosaves over the player's game (`neverAutosave`, `src/game/useAutosave.ts`). Refused in
  a shared shop. Opened by `npm run lab` (`?lab=1`), the title screen's Scenario lab (with Developer tools on), the dev
  panel (which also gains a fixture picker for the 46 fixtures, loaded never autosaved) and `__AQ.scenario.open()`.
- **Addresses and hooks:** `?lab=1`, `?scenario=<preset>`, `?recipe=<base64url JSON>` behind the gate
  (`urlLabParams`/`urlScenarioBoot` in `src/state/devTools.ts`; the router treats a scenario address like a fixture
  boot); `__AQ.scenario` (presets, recipe, validate, play, restart, capture, run, link, current, open, close).
- **Headless:** `npm run scenario -- <recipe.json | preset> [--hours N] [--json] [--save out.json] [--force]`
  (`scripts/scenario.ts`): builds, runs, prints the report (money, births, deaths with causes, each tank's animals and
  water, the game's own log lines, the checks), exits 1 on build errors or a failed check.
- **Presets** (ADR-0051 decision 4, `src/dev/scenario/presets.ts`): Sandbox; Problems (ammonia crisis, broke shop
  with hungry fish, crowded and aggressive tank, heater stuck on); Breeding (betta pair ready, clownfish pair with
  eggs, a tank of fry); Showpieces (reef with a Prismatic clownfish, late-game grand hall); Running a business (staffed
  store, show day, market with bids).
- **Tests:** unit (`tests/sim/scenario-*.test.ts`): every preset builds with no error and no repair, nothing
  non-finite, the same `stateHash` twice, loads again through the save path and steps a day; every species at least
  once; every water class and tank tier; bad recipes name their problems and still build; the patch refuses prototype
  keys; morphs by name; capture → build; checks pass and fail; the gate (`urlLabParams` null in production). e2e
  (`tests/e2e/scenario-lab.spec.ts`): build a recipe through the screen and play it (paused, the badge, Start again,
  nothing autosaved), and `prod-mode.spec` checks the players' build ignores `?lab=1`, `?scenario=` and `?recipe=`. The
  four checks; one fresh reviewer (Opus 5.5, max effort) on `git diff 117aca9..HEAD`; then testing it as the owner
  would (a look script with screenshots at desktop and phone widths).
- **Requirements:** LAB-001 (the recipe), LAB-002 (the builder), LAB-003 (legal saves), LAB-004 (the screen), LAB-005
  (addresses and hooks), LAB-006 (headless), LAB-007 (presets), LAB-008 (`npm run lab`, the docs, the e2e).
- **Core files:** `package.json` (scripts `lab` and `scenario`), `src/state/devTools.ts` (the lab's addresses behind
  the gate), `src/state/lab.ts` (new store), `src/game/useAutosave.ts` (`neverAutosave`), `src/App.tsx`,
  `src/ui/nav/router.ts` (a scenario address boots like a fixture): the reviewer checks them closely. No new
  dependency; no save field; `SCHEMA_VERSION` unchanged.
- **Built** (`0bdc84c`, Chase, 2026-10-23): everything above. The lab's chunks are left out of the players' build
  altogether (`LAB_BUILD`, a build-time constant, guards every `import()` of them; checked in a built bundle), on top of
  the runtime gate. Copying goes through `src/platform` (the clipboard has no read, so the JSON box takes a paste
  directly). Found and fixed on the way: `Toasts.tsx` dismissed UI toasts inside a state updater (a dev-only React
  warning the lab's world switches brought out in WebKit). The look-around (`scripts/_audit/chunk15/look2.mjs` in the
  internal clone, git-excluded): every preset and a recipe of my own built through the screen in Chromium and WebKit at
  1440×900 and 390×844, played 12 game hours (the betta pair laid 77 eggs, the shrimp berried), exported, re-imported
  and reopened from a link after a reload, with no page errors; it moved the in-game badge clear of the tank bar and
  the tool rail.
- **The full pass on `0bdc84c`:** typecheck passed; unit 260 files, 3,341 tests passed; build passed; e2e 335 of 335
  (40.5 min).
- **The fresh review** (Opus 5.5, max effort, on `117aca9..0bdc84c`): four blockers, all fixed in `765b6b6`: (0) a
  build used up a Prismatic forced from the dev panel (set aside and restored now); (1) "Save now", "Save and return to
  title", the error screens and the page-close save wrote a scenario over the player's autosave (the save path itself
  now refuses slot `auto` for a scenario, `src/persistence/session.ts`; Build and play and the fixture picker save the
  player's own game first, as Load does); (2) Start again on a `current` base stacked the recipe onto the scenario (the
  scenario keeps the game it was built from); (3) the "nothing non-finite" test couldn't fail (the builder reports
  such numbers now). Its notes, fixed too: capture lost duplicate equipment and hidden or sex-changing roles; a named
  sex for a sex-changing species; `unlocks: "none"` undone by research; checks skipped silently; names like
  "constructor"; patches that threw; unclamped inputs; untested session paths and script (the script's logic is now
  `src/dev/scenario/cli.ts`). Every mutant the review and the fixes tried is caught. Outside the lab: `illnessDef` read
  a plain object (a save whose illness kind was "constructor" crashed every step); BACKLOG B-210 records two crafted
  save shapes `repairState` passes that crash a step.
- **The confirmation pass** (the same reviewer, `0bdc84c..765b6b6`): each blocker fixed and its test failing without
  the fix. Two more, fixed after: the patch's play-test stepped a copy of the world in the lab's trial builds too, and
  stepping any world clears the sim's shared caches, so checking a patched recipe changed the game on screen (now no
  trial build steps a world; a test plays two game days beside the lab's checking and compares hashes); and the
  play-test stepped no tank, so a tank's or an animal's patch that crashes the game got through (now the finished
  world is played once with every tank stepped, and one the game can't play is rebuilt without the patches). Its
  notes, fixed too: a scenario could still go online with Settings › Autosave off (`syncableGame` refuses it); a
  non-number in a `current` base is reported (tested); an exact piece's impossible failure is named. A pass on
  `765b6b6` was stopped part-way when these fixes landed (typecheck, unit 3,360 and build green; 83 e2e tests run,
  none failed).
- **The second confirmation** (`765b6b6..f9c62ab`): clean. Its notes: a tank patch naming a tank size that doesn't
  exist still made the build throw (fixed after, in `aae0922`, with its own full pass); the online-save line
  has no test (it matters only on the dev stub); `__AQ.scenario.run` leaves the game on screen's state alone but
  starts its caches cold, as a load does (SCENARIOS.md says so now).
- **The final pass** on `f9c62ab`: typecheck passed; unit 261 files, 3,363 tests passed; build passed; e2e 335 of 335
  (40.0 min), pushed to `next` (`ba1227d`). The follow-up `aae0922` (a patch the build can't finish is caught too): the
  four checks again, typecheck, unit 3,363, build, e2e 335 of 335 (39.9 min), pushed. Nothing deployed (a developer tool
  needs no release; ADR-0051 decision 1).

### 16. 31 new species (ADR-0052) — brief written 2026-10-24 (Chase); built 2026-10-24; done 2026-10-25 (`66e4a37`); 0.8.0 being released

- **What:** the owner's words, verbatim (2026-10-24): "add all 12 missing species as the next chunk and what other
  species should we be adding? how will this work for variations?" It began with a friend's 210-gallon reef the owner
  asked to recreate in the scenario lab ("can you create me a 210 (or closest) tank with these animals and the style of
  the tank decorations?"): the game lacked 12 of its animals. The owner's answers (ADR-0052, verbatim): add the maroon
  clownfish too; add the reef and freshwater favourites as well; build young and male/female colours; every new species
  buyable from the start. **31 species, 48 → 79.** A player-facing change: it ends in a release (0.8.0) only with the
  owner's go-ahead in the session. The chunk starts at the commit that adds this brief (SESSION_HANDOFF.md "Handoff:
  chunk 16, 31 new species").
- **The species, in three waves** (land and test each wave before the next; scientific names to check against the
  sources):
  - *A, the friend's reef (13):* emperor angelfish (*Pomacanthus imperator*; young: dark blue with white rings, adult:
    yellow and blue stripes; needs a big tank), sailfin tang (*Zebrasoma veliferum*; banded; the Red Sea sailfin, *Z.
    desjardinii*, is a separate species now, so a "Red Sea form" only if the sources support it), chocolate tang
    (*Acanthurus pyroferus*; young copy a yellow dwarf angel), lyretail anthias (*Pseudanthias squamipinnis*; orange
    females, magenta males with a long dorsal ray; protogynous; a group of females with one male), melanurus wrasse
    (*Halichoeres melanurus*; protogynous; males brighter; buries in the sand at night, so it needs sand), elegant
    starfish (*Fromia* sp.; red and orange forms; hard to keep: starves without film algae), fighting conch (*Strombus
    alatus*; a sand-sifter), Mexican turbo snail (*Turbo fluctuosus*), Nassarius snail (*Nassarius* sp.; buried, comes
    up at feeding), Astraea snail (*Lithopoma tectum*; cone shell; can't right itself), Cerith snail (*Cerithium* sp.;
    spire shell), scarlet reef hermit crab (*Paguristes cadenati*), maroon clownfish (*Premnas biaculeatus*; White
    Stripe, Gold Stripe, Lightning; protandrous like the ocellaris, the female much bigger; hosts the bubble-tip).
  - *B, reef favourites (9):* flame angelfish (*Centropyge loricula*), six-line wrasse (*Pseudocheilinus hexataenia*),
    lawnmower blenny (*Salarias fasciatus*; perches, grazes), flame hawkfish (*Neocirrhitus armatus*; perches; eats
    small shrimp), yellowtail damselfish (*Chrysiptera parasema*), emerald crab (*Mithraculus sculptus*; eats bubble
    algae), tuxedo urchin (*Mespilia globulus*; carries debris on its spines), sand-sifting starfish (*Astropecten
    polyacanthus*; buries; starves in small tanks), bubble-tip anemone as a living animal (*Entacmaea quadricolor*;
    green, rose and rainbow forms; wanders until it settles, needs strong light, splits; the clownfish host it as they
    host the decor piece today, which stays for old saves).
  - *C, freshwater favourites (9):* freshwater angelfish (*Pterophyllum scalare*; the hobby's real genes: marble, zebra,
    gold, smokey, stripeless, veil; pairs and guards eggs), German blue ram (*Mikrogeophagus ramirezi*; electric blue,
    gold, balloon; females with a pink belly; warm water), harlequin rasbora (*Trigonostigma heteromorpha*), zebra
    danio (*Danio rerio*; long-fin, leopard, golden; no GloFish, a trademarked GM line), platy (*Xiphophorus
    maculatus*; many colour and tail-spot forms; livebearer), swordtail (*Xiphophorus hellerii*; only males have the
    sword; red, green, black, lyretail), dwarf gourami (*Trichogaster lalius*; powder blue, flame; males bright, females
    silver; builds a bubble nest), ghost shrimp (*Palaemonetes paludosus*; clear body), ramshorn snail (*Planorbella*
    sp.; red, blue and leopard; breeds readily).
- **Variations** (ADR-0052 decision 2): each species' `genetics` (loci, phenotypes, `baseVisual`, `variation`) as the
  existing species do: named forms only where the hobby has them, the intensity locus ("Richly coloured") where it has
  none (`intensityLocus`, `intensityOverlay`), and Prismatic comes for free. Check them with `npm run report:rarity`,
  the morph catalogue's own checks (`morphCatalog`) and `tests/sim/morph-data.test.ts`.
- **Young and sex colours** (decision 3): the art gets the creature (`args.creature`: `stage`, `sex`, `reproRole`;
  `isJuvenile`, `isFemale` in `src/render/creatures/fish/common.ts`). Today `juvenile()` changes only proportions. Add
  per-species young colours (and male/female colours) in each species' plan, with the plan's cache `key` including the
  look, so an animal changes when it grows or changes sex. Anthias and the melanurus wrasse are `protogynous` (the
  coral beauty, clown goby and grouper are the existing examples).
- **Where a species is wired** (from `kole_tang`, `nerite_snail` and `cherry_shrimp`): its file in
  `src/data/species/{marine,freshwater}/` and that folder's `index.ts`; `src/data/species/roster.ts` (the fixed ids);
  `src/types/species.ts` (a new `behaviorSet` id goes in its union); the art, `src/render/creatures/fish/<id>.ts` and
  `fish/index.ts`, or `src/render/creatures/special/` (snail, hermit, shrimp, frog, seahorse, axolotl today, with
  `looks.ts`); the behaviour (`src/ai/core/brain.ts`, `acts.ts`, `cosmetics.ts`' night colours); the UI portrait plan
  (`src/ui/panels/common/Portrait.tsx`: fish, longfin, seahorse, axolotl, shrimp, snail, crab, frog, coral, anemone,
  eel, flat); `src/data/buyers.ts` (specialties); `src/data/shows.ts` where it names species; the research
  (`docs/research/{marine,freshwater}.md`, `docs/RESEARCH_SOURCES.md`); the tests that pin species
  (`tests/sim/core-save-forward-safety.test.ts`, `tests/sim/fixtures/food-rules-pin.json`, `species-marine`,
  `species-fw`, `morph-data`, `guide-species`, `render/creatures/creatures.test.ts`). New art needed: starfish (two
  species), urchin, conch, crab (the emerald crab; the hermit exists), a living anemone, five snail shells (turbo,
  Nassarius, Astraea cone, Cerith spire, ramshorn coil), the ghost shrimp, and every fish plan.
- **Buyable from the start** (decision 4): `unlock.requires: []` on each new species (`requiredUnlocks`,
  `isSpeciesAvailable` in `src/sim/economy/shop.ts`); tanks, water and gear keep their unlocks. **Seeded tests will
  shift:** the shop draws from the available species, so new day-one species change seeded stock. Run the seeded tests
  before and after, explain each changed expectation, and never retune data to hide a shift (AGENTS.md).
- **Saves** (decision 5): `SCHEMA_VERSION` 2 → 3 (`src/persistence/schema.ts`, a migration in `migrations.ts`,
  ADR-0016), the forward-safety pin updated; a save from 0.7.0 loads; a new save is "too new" for 0.7.0.
- **The lab** (decision 6): a built-in preset "A friend's reef" from `docs/agent/design/CHUNK-16/friends-reef-standins.json`
  with the real stock (5 anthias, 5 chromis, 2 maroons, the wrasse, a living bubble-tip, the chocolate and sailfin tangs,
  the emperor, the starfish, the conch, 10 turbo, 20 Nassarius, 3 Astraea and 4 Cerith snails, 2 blue-leg and 1
  scarlet hermit, the foxface) and the same aquascape; its check: no deaths in 48 game hours. A second preset showing
  every new species, for the look-around.
- **Done means** the four checks on the final code, one fresh reviewer (Opus 5.5, max effort) on the brief and
  `git diff <start>..HEAD`, its blockers fixed; then your own testing as the owner would: each new species in the lab
  at desktop and phone widths (young and adult, male and female, a few forms each), the friend's reef next to the
  photo's description (a long live-rock ridge with an arch and a tall centre pile, aragonite sand, red macroalgae along
  the front, the anemone, deep actinic blue), a week of play headless with an autofeeder, a 0.7.0 save loaded.
- **Requirements:** SPC-001 to SPC-010 (`docs/agent/REQUIREMENTS.json`).
- **Built (2026-10-24, Chase), all three waves** (31 species, 48 → 79; `SCHEMA_VERSION` 3):
  - *Names checked against the sources* (ADR-0052 decision 1 asked for corrections here): the sailfin tang is
    *Zebrasoma velifer*, the maroon *Amphiprion biaculeatus* (Premnas is now a synonym), the elegant starfish *Fromia
    milleporella*, the fighting conch *Strombus pugilis* (the West Indian fighting conch of the trade), the Nassarius
    *Phrontis vibex*, the Cerith *Cerithium atratum*, the flame angel *Centropyge loriculus*, the flame hawkfish
    *Neocirrhites armatus*, the ghost shrimp *Palaemon paludosus* (formerly Palaemonetes) and the ramshorn *Planorbella
    duryi*; the dwarf gourami stays *Trichogaster lalius* (Catalog of Fishes has treated it as *T. fasciata* since 2022;
    the data says so). The living anemone's id is `bubbletip_anemone` (the decor piece keeps `bubble_tip_anemone`).
  - *Round 2* (ADR-0052 decision 9): a new species needs no research, but the shop stocks it only once its water type
    is researched (`requiredUnlocks` falls back to `waterClassKeys`), and restocks the moment that research completes.
  - *Behaviour:* twelve new AI sets (wrasse, starfish, conch, snail_sand; urchin, starfish_sand, crab, blenny,
    hawkfish, damsel, cichlid_dwarf, anemone) and the six-line's rock sleep in a mucus cocoon; sand burying
    (`rt.ai.buried`, the floor clamp lets a digging animal down); clownfish host a living anemone, which wanders until
    it settles; social sex change in four species the game doesn't breed (`special.socialSexChange`).
  - *Breeding:* the bubble-tip splits in two (new system `fission`); the ramshorn lays jelly clutches under water (the
    snail module's `layOf`); the ghost shrimp is berried with a short larval week; others as their data says.
  - *Art:* a fish plan per fish with young and male/female colours (`FishPlan.recolor`, the plan key carries the look),
    new marks `ring_thin` and `wedge`, the platy's tail spots (`tailSpot`) and tuxedo (`bodyMark`); new critters: two
    starfish, urchin, conch, crab, living anemone, five snail shells, ghost shrimp, scarlet hermit.
  - *Seeded tests:* the new species shift the shared stream (the shop draws from the species available). Every failing
    seeded test passed with the 31 hidden; each was made independent of the stream rather than re-pinned (see the
    commits). Two real bugs found on the way were fixed with regression tests: a harassment death named the wrong
    cause, and a hardy harassed female could linger at 1.4 health for good (S02-08). MKT-016's test asserted more than
    the minimum the owner accepted (ADR-0016 decision 3) and now asserts that minimum at 1×, 3× and 10× (about 68,
    148 and 176 real seconds); the catch-up bid windows stay as they are (a change built here was reverted on review,
    and the owner kept them, decision 13). The first hour's toast cap is now 100 (the owner, ADR-0052 decision 10).
  - *Lab:* "A friend's reef" (the 180, the real stock, a living bubble-tip, marine pellets four times a day: a week
    with no deaths, one anthias turns male on day 4) and "Every new species" (a showroom with three tanks and
    autofeeders). The lab warns that the friend's emperor needs 220 gallons as an adult (LAB-007 expects that one
    warning).
  - *Rock as drawn:* the AI's rock surfaces now follow the drawn rock (`src/ai/core/rockshape.ts`) instead of the
    collider box: the anemone was settling on a box top that stood up to 16 cm above the rock. Older crawlers
    (algae grazers, hillstream loaches, dwarf and cleaner shrimp, snails, hermit crabs) use it too, so they now sit on
    the rock rather than hovering above it: a visible change to released species.
  - *After the fresh review* (Opus 5.5, max effort, on `1b929a7..5068399`): the split works inside a command's Immer
    draft (`deepClone`, not `structuredClone`); a living anemone stings a seahorse once, as the decor piece does (the
    pairwise sting rule is only for an anemone not yet in the tank); the maroon's female is much bigger, as the brief
    says (`special.maleSizeFactor` 0.45: a male and a young one grow to under half her size, and the male that
    becomes the female grows into it; Fishes of Australia: females 2–3× the males); a young barred angelfish shows
    seven bars, the adult four (FishBase); the flame angel's "Blood red" is "Richly coloured" (decision 2); a digging
    animal's body centre stays above the floor glass under a thin sand bed (the render's floor clamp).
  - *After the confirmation review* (Opus 5.5, max effort, on `5068399..10a96ab`): the pairwise sting rule is skipped
    only when the tank's stinging count already covers it, so moving an anemone in from another tank still warns, and
    a listed anemone still stings once (`livingAnemones` counts listed ones, as the tank's members do); a male that
    becomes the female grows into her size at the growth curve's pace (about two weeks), not in hours; an adult male
    maroon is judged by a male's size (`adultSizeOf`: the tank he needs, a show's size points, the shop's "young"
    check); a young one's size estimate uses the young's curve; the AI buries a swimmer only as deep as the bed allows,
    so in a thin bed it lies partly covered and in sight.
  - *Done differently from the brief, on purpose:* the elegant starfish has Red and Red & Black, not an orange form:
    no source names one (Quality Marine's "red to orangish red" is individual variation), and decision 2 allows no
    invented forms (told to the owner in round 4). The Astraea's "can't right itself" is a data tag only: nothing in
    the game turns a snail over. Under the rarity rule the platy has no Common form (224 forms; like the fancy guppy),
    so a beginner's platies mostly show as Uncommon to Very rare.
  - *The owner's round 4* (ADR-0052 decisions 11–14): the new wording approved, with the living anemone's breeding
    card reading "Splits by itself"; the autofeeder weighs each animal's vote by its feeding need and passes over a
    food made for another species or water while a fitting one is in stock (B-211); catch-up bids as ADR-0016 keeps
    them; release 0.8.0 once green.
  - *0.8.0's first Pages build failed* (run `40237089954`, on `main` `0289eaf`; nothing deployed, the Render static
    site's deploy was cancelled): two AI tests that pass on the Mac failed on GitHub's x64 Node, which takes a
    different path through a long AI run. The collider test caught an axolotl's centre in a java fern's crown for one
    sample, at rest: it had come down onto the crown. A probe (the test's body on 96 start positions nudged by up to
    10 µm) found the kinds on the Mac too, among them one that stays for good: an axolotl wedged between a crown and
    the back glass, whose way out led into the glass. Fixed: the way out counts the nose and tail against the glass;
    a swimming walker lands only where its body fits, and after a moment refused swims to open floor that fits
    (`reposition`). The collider tests measure a rock drawn smaller than its box (river stones, live rock: since chunk
    16 solid as drawn) as drawn, so a shrimp at a live rock's face no longer counts as inside it. The blenny's dart was
    measured a second after the tap, when it is often over, and could catch a chase's burst; it is now measured from a
    calm tap, and a startled darter whose cover is behind it flips round to it (a C-start: perched head up it only
    backed away). Over the 96 paths: the collider test 5 with a brief nose or tail in decor (5 to 7 before the chunk;
    B-217), the blenny's dart 0.
  - *Backlog:* B-211 to B-217 (B-211, the autofeeder's vote, and B-213, the anemone's split, built; B-217 the rare
    brief collisions above).

## Releases

`main` is what players get: a push to `main` deploys GitHub Pages. Render doesn't build on a push, though
`render.yaml` has auto-deploy on (it didn't for 0.5.0 or 0.5.1): check its `version.json` after a release and deploy
it by hand with the Render CLI (`docs/ARCHITECTURE.md`; the owner's memory note has the command). To release:

1. a full green run of the four checks on `next`, and the owner has played it;
2. bump `version` in `package.json` and add the `CHANGELOG.md` entry (patch for fixes, minor for features;
   `tests/sim/version.test.ts` checks that the newest entry matches);
3. with the owner's go-ahead, merge `next` into `main` and push `main`;
4. (from 0.6.0, SHARED-SHOPS.md §5.1) **the shared-shop server after `main`, never before:** once Pages has deployed,
   deploy `aquarium-go-shops` by hand from `main` (`render deploys create srv-dbbt6gbncjis73c23br0 --commit <main's full
   sha> --confirm --wait -o text`; the 0.6.0 release first switches the service's branch to `main` with `render services
   update`), then check that its `/health` `build` equals the game's build hash and both `version.json` files read the
   release. In between, newer tabs are told the shop is updating; afterwards older tabs are told to reload.

- **0.5.0, released 2026-10-06** at the owner's request ("push to github prod and make sure it's on render"), from
  `next` after chunk 1: chunk 1, S0's stability fixes (the planned 0.4.1) and chunk 0. The owner chose to release
  before chunk 1's e2e run (step 1 of "To release" waived for this release only); typecheck, unit and build passed.
  Later chunks ship as 0.5.x (§21).
- **0.5.1, released 2026-10-11** at the owner's request (ADR-0024 decision 1, "Release 0.5.1 now"): chunks 2 (shop
  and genetics) and 3 (automation and notifications). The four checks passed on the release commit `6594d21`
  (typecheck; unit 194 files, 2,227 tests; build; e2e 90 of 90); the owner's A1 answer stood for step 1's "the owner
  has played it". `main` was fast-forwarded to `origin/main` (`5608ede`), `6594d21` merged with `--no-ff` as
  `78548a3` (its tree is `6594d21`'s) and pushed. Pages deployed by itself; Render stayed on 0.5.0 and was deployed by
  hand (`render deploys create … --commit 78548a3…`, deploy `dep-db61hn3bc2fs73afp29g`). Both `version.json` files
  read `{"id":"78548a3-…","version":"0.5.1"}`.
- **0.5.2, released 2026-10-15** at the owner's request in the session ("run the checks and release 0.5.2 if green
  yeah run all you were going to then release for sure"), before chunk 6 ends: chunks 4 (production lines) and 5
  (Operations, the Water and Live food rooms) and chunk 6 so far. The four checks passed on `86de7c3` (typecheck; unit
  222 files, 2,602 tests; build; e2e 257 of 257, Chromium and WebKit) after the first full WebKit runs found five
  WebKit-only test problems (`3435f27`, `86de7c3`). Merged as `1268783` and pushed, but the Pages deploy (now running
  typecheck and the unit tests, B-193) failed two wall-clock limits on GitHub's slower runner: `c36efa1` scales the
  unit tests' time limits on CI and Render (merge `8a8b98e`, Pages deployed). Render's build (also running the tests
  since ADR-0035) passed every test but failed on Vitest worker RPC timeouts: `6bc1bf8` uses two workers on Render
  (merge `e527e10`). Pushes go from the internal-disk clone (from the disk image the push hung), after the owner added
  gh's `workflow` scope (deploy.yml changed). Pages deployed `e527e10` by itself; Render by hand
  (`dep-db8j6mpsrm7s73eh8f30`). Both `version.json` files read `{"id":"e527e10-…","version":"0.5.2"}`.
- **0.5.3, released 2026-10-15** at the owner's go-ahead in the session ("release 0.5.3 if pass 2 is green"): chunk 6's
  end, after its reviews. Two full passes in a row on `9bff79e` (typecheck; unit 226 files, 2,697 tests; build; e2e
  285 of 285, Chromium and WebKit, twice); on the release commit `31f8b7b` (version, CHANGELOG and docs only)
  typecheck, unit 2,697, build and the production-build specs passed. The owner chose to release before the
  play-through (step 1's "the owner has played it" waived for this release). Merged as `382a637` (its tree is
  `31f8b7b`'s) and pushed from the internal-disk clone with `next`. Pages deployed `382a637` by itself (its run tests
  first, B-193; GitHub notes that `deploy-pages@v4` runs on a deprecated Node 20 and that `ubuntu-latest` moves to
  Ubuntu 26 from 2026-10-19: `deploy.yml` is a core file, left for the owner); Render by hand
  (`dep-db8o0s7f3r2c73eplvm0`). Both `version.json` files read `{"id":"382a637-…","version":"0.5.3"}`.
- **0.6.0, released 2026-10-21** at the owner's go-ahead in the session ("test it and then release. I'll have to test
  in a sec"): chunks 10 to 13, shared shops. The four checks passed on chunk 13's final code `c063c6e` (typecheck; unit
  255 files, 3,202 tests; build; e2e 329 of 329, Chromium and WebKit, 39.4 min); the release commit `d8e83e7` (version,
  CHANGELOG, docs) passed typecheck, unit 3,202, build and 19 of 19 e2e (the production-build, base-path, shared-shop
  and boot specs). The agent's live two-browser test on the play-test build: 18 of 18 (chunk 13's record). Merged as
  `289bea8` and pushed with `next`, but the Pages run failed one unit test on GitHub's runner: shared-client's first one
  wins test assumed Ann's sale reached the server before Ben's over two sockets, which keep no order between them. Fixed
  on purpose in `3d7d2cc` (Ben sends once the room has applied Ann's; test only; the file 8 of 8 runs, typecheck, unit
  3,202), merged as `298b3ff` (its tree is `3d7d2cc`'s) and pushed from the internal-disk clone. (The Dev repo's first
  merge of the fix was made on its old local `main`; GitHub refused it as not a fast-forward, it was never pushed, and
  the merge was made again in the clone on `289bea8`.) Pages deployed `298b3ff` by itself (run `39714062207`, its tests
  first). Then, §5.1's order, the shop server: `aquarium-go-shops` switched to `main` (`render services update
  srv-dbbt6gbncjis73c23br0 --branch main`) and deployed from `298b3ff` (`dep-dbcnuivb9u1s73cani10`); `/health` reads
  `{"version":"0.6.0","build":"681ac8b023eeaca7","stub":false}`, the game's shared build hash; the live smoke 23 of 23.
  The Render static site from the same commit (`dep-dbcnuivb9u1s73canhng`). Both `version.json` files read
  `{"id":"298b3ff-…","version":"0.6.0"}`. The live two-browser test again on GitHub Pages after the release: 18 of 18.
- **0.5.6, released 2026-10-20** at the owner's go-ahead in the session (ADR-0044 decision 5, "release when green"):
  chunk 9, the audit of 0.5.5's five high findings. The release commit `827eacd` (version, CHANGELOG) was followed by
  the review's confirmation fixes; two full passes in a row on `9266584` (typecheck; unit 236 files, 2,868 tests;
  build; e2e 311 of 311, Chromium and WebKit, 35.7 and 35.6 min), then a docs-only commit `4c7f7a6`. Merged as
  `3a0e8ce` (its tree is `4c7f7a6`'s) and pushed from the internal-disk clone with `next`. The Supabase migration was
  applied before the release (the old functions stay for 0.5.5 tabs until they reload). Pages deployed `3a0e8ce` by
  itself (its run tests first); Render by hand (`dep-dbbhqbjncjis738q3e4g`). Both `version.json` files read
  `{"id":"3a0e8ce-…","version":"0.5.6"}` (Render's after a cache-busting read).
- **0.5.5, released 2026-10-19** at the owner's go-ahead in the session (ADR-0042 decisions 5 and 6: "yes change it to
  FRIENDS-KDWX, release when green", then "0.5.5 is fine, go ahead if we're ready"): chunks 7 and 8. The release
  commit `1f19426` (version, CHANGELOG, the "Have an invite?" example) passed typecheck, unit 2,828 and build, and e2e
  306 of 307: social.spec's skeleton test missed its transient rows in WebKit (a known race), fixed on purpose in
  `82ef975` (a MutationObserver records them), which passed the four checks in full (typecheck; unit 2,828; build;
  e2e 307 of 307, Chromium and WebKit, 36.3 min). Merged as `9ae98b3` (its tree is `82ef975`'s) and pushed from the
  internal-disk clone with `next`. Pages deployed `9ae98b3` by itself (its run tests first); Render by hand
  (`dep-dbb8u8jl550s73fstvcg`). Both `version.json` files read `{"id":"9ae98b3-…","version":"0.5.5"}`.
- **0.5.4, released 2026-10-18** at the owner's go-ahead in the session (ADR-0037 decision 2, "Bundle with G1
  (Recommended)": one full test pass, then GitHub Pages and Render): ADR-0036's three changes and G1's. The four checks
  passed on the release commit `97da6bc` (typecheck; unit 227 files, 2,702 tests; build; e2e 289 of 289, Chromium and
  WebKit, 31.9 min); the pass before, on `50dc443` (the same code; the CHANGELOG's version not yet fixed), had one
  WebKit failure (B-204). Released before the owner's play-through, as the option allowed. Merged as `63caa8e` (its
  tree is `97da6bc`'s) and pushed from the internal-disk clone with `next`. The Pages run's first attempt failed after
  every unit test passed: Vitest's worker RPC timed out on GitHub's runner ("Timeout calling onTaskUpdate", B-205);
  re-running the failed job passed and deployed. Render by hand (`dep-dbaii3eq1p3s73bqbvvg`). Both `version.json`
  files read `{"id":"63caa8e-…","version":"0.5.4"}`.
- **0.7.0, released 2026-10-22** at the owner's go-ahead in the session (ADR-0050 round 2: "Yes, release when clean"):
  chunk 14, shared shops' money pool and spending tiers. Step 1's "the owner has played it" was waived by that answer
  (live tests right after the release, ADR-0050 decision 7). The four checks passed on the release commit `d16dd72`
  (version, CHANGELOG; typecheck; unit 257 files, 3,243 tests; build; e2e 331 of 331, 39.9 min) and the review's second
  confirmation was clean. Merged in the internal clone onto a freshly fetched `origin/main` as `a704e63` (its tree is
  `d16dd72`'s) and pushed with `next`. Pages deployed `a704e63` (run `39825698067`, its tests first); then the shop
  server from `main` (`dep-dbd4rsfavr4c73cdn2l0`; `/health` `version` 0.7.0, `build` `74779d9a30306b9c`, the game's
  shared build hash) and the Render static site (`dep-dbd4sc67bikc73f3pn7g`). Both `version.json` files read
  `{"id":"a704e63-…","version":"0.7.0"}`. The live smoke 27 of 27; the two-browser money test 29 of 29 on Pages and on
  the Render address.

## Product decisions in force

- Priorities, in order: beautiful, delightful and satisfying to watch; playable and understandable; a correct
  simulation and player state; individual creatures, collection and breeding depth; stable, testable, deterministic
  systems; clear phone and desktop use; extensibility; performance; elegance.
- Local single-player first. No real multiplayer, accounts or backend without the owner (REL-002); the native
  wrapper is deferred (ADR-0001). Multiplayer starts with people the owner knows, after chunk 7's hardening (ADR-0037):
  stage 1 on a free Supabase project, sign-up by invite code, no emails, `@supabase/supabase-js` (ADR-0038). Stage 2
  (before strangers join) needs its own record.
- Shared shops (ADR-0043), after 0.5.6: a whole shop a club plays together, separate from each player's own game
  (nothing carries over); one per club, created by the owner for now; club members join, up to 10 at once; a small
  server runs it, on Render (free first; paid only with the owner's yes), and the game should run on a server
  eventually; pause and speed for the creator and the people the creator chooses; at first every member does
  everything else, with permission tiers later (a group money pool, requests, allowances, one-off grants); empty, it
  pauses and catches up at most 12 game hours on return.
- Shared shops' design (ADR-0045, SHARED-SHOPS.md): the server saves with its own Supabase key, which the owner pastes
  into Render (never in the repo); `ws` approved for the server only; a 2 GB monthly data cap; "there" means on screen
  and used in the last 30 minutes ("Still here?"); a new shop starts like a new game, with no guide; your own game
  waits, with no catch-up; members' actions in everyone's alerts with their name, big ones pop up; first one wins,
  and the second sender is told who.
  Also (ADR-0045 rounds 3 and 4): opened from the club card and, on a device that has opened one, the title screen; the
  screens' words approved (SHARED-SHOPS.md §8); others' actions read as the game's message with the name in front; not
  on the leaderboards; listing photos kept, small and seen by everyone, stored once; a break under 5 minutes doesn't
  count; a 400-hour monthly cap on the server's awake time.
- Automation goes deep (ADR-0001, option C): more than Auto-feed and Auto-clean.
- The Auto Water Changer shares the Autofeeder unlock. Quiet hours are fixed at 10 PM to 8 AM, with a switch to turn
  them off (0.5 spec §12.3). One-copy Metallic is unnamed, with a subtle sheen. Locked destinations open a locked
  panel. Several production lines per species. Social is a local stub, reachable only in dev mode (ADR-0001,
  ADR-0005).
- Old saves are best-effort (ADR-0005). A new species or tank size bumps `SCHEMA_VERSION` (ADR-0016), and so does a new
  water class, show tier, buyer type, staff role or staff trait (ADR-0036), a Water room prep level, a higher reservoir
  limit or a rare-variant kind (ADR-0037), and more Live food cones or jars, a higher staff skill or a rare-variant
  origin (chunk 7, ADR-0039 decision 6).
- From chunk 7 (ADR-0039): a counter never takes a buyer past their private ceiling, and once bidding closes an offer
  can be accepted but not countered; admission demand keeps falling above about twice the fair price, and the rules
  cap admission at $40, the slider's end; the research gates for brackish, marine and reef water are rules.
- For chunk 8 (ADR-0039): the privacy note approved as drafted; sign-up for 13 and over (a parent signs up for a
  younger player).
- Catch-up bid windows stay as they are (ADR-0016).
- Morph tiers: Legendary below 1 in 10,000 of market stock (ADR-0022, replacing ADR-0005 decision 4's threshold).
- From the owner's group A answers (ADR-0024): an older build that finds a newer save keeps today's one message
  ("Refresh the page"); e2e gains a WebKit project (chunk 6); accessibility aims at WCAG 2.2 AA with solid
  high-contrast panels (chunk 6); `?dev=1` as built in dev builds, and since chunk 7 the live site ignores it
  (ADR-0037 decision 3, REL-019); chunk 3's five flagged wordings stay; automation's step-size
  checks are exact for job counts, run hours and stock units and within stated tolerances for water values.
- From group B (ADR-0025): production lines follow DESIGN-S3D §8.6 and §8.6.1; automation never lists a Prismatic;
  protected animals (keep tanks, Prismatics, favourites) are never moved out, listed or sold by automation; lines can
  be ended; a line with a missing parent or tank is paused and kept, not dropped. A line's "This week" tile shows sales
  and count, then the net after food and power (ADR-0026 decision 3).
- From chunk 4 (ADR-0030, ADR-0031): a line's Sell step lists at fair value −10% (no sell editor); for bettas the
  line moves the female in to breed and back out; a sold tank's animals move only into a tank with room and never
  into a high-risk mix, else they rest in the holding container. Set-up checks temperament; a keep tank is never
  another line's working tank; each animal belongs to one line. A save fits 2.5 million characters, listing photos
  aside (PERSIST-005). The simulation draws from one random stream (`simRng` re-reads `rngState` on each draw).
- From group C (ADR-0026, ADR-0027): DESIGN-S3D is approved for chunk 5. Settings becomes a gear in every build; water
  stays free; live food never expires (storage caps it); no schedule editor.
- From group E (ADR-0029): tank-sale bonuses need animals; "sales" counts sales; the shared Pages origin stays; deploys
  run the unit tests; no linter (no new dependency); B-008's path stays.
- No new dependencies without asking the owner.
