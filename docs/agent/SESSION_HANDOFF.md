# Session handoff: after group A and the 0.5.1 release

For the next agent session on Aquarium Go. Written 2026-10-11 by the session that asked group A and released 0.5.1;
it replaces the handoff written after chunk 3. The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule;
this file is the order of work and the practical knowledge that makes it go smoothly. Replace or delete it when it's
used up.

## Where things stand

- `next` holds chunks 1 to 3, all tested, and the owner's group A answers (ADR-0024). **0.5.1 is released**
  (chunks 2 and 3; PLAN.md "Releases" has the commit, the test run and the deploy checks). Nothing is uncommitted.
- **Owner questions:** group A is answered (ADR-0024). Groups **B to E are still open** in
  `docs/agent/OWNER_QUESTIONS.md`: the owner stopped after group A and asked for the docs to be ready for a new
  conversation.
- Chunk 4 (Production lines) waits on group B; chunk 5 (deep automation, DESIGN-S3D) on group C and chunk 4; chunk 6
  (Social stub, hardening, now also the WebKit e2e project and WCAG 2.2 AA from ADR-0024) on D1.

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, `PLAN.md` (Next step, Status, How a chunk runs, the chunk briefs) and
   `docs/agent/OWNER_QUESTIONS.md`.
2. **Ask the owner groups B to E, first thing**, before building anything:
   - AskUserQuestion, at most 4 questions per round, in the file's order, with the recommended option first and
     labelled "(Recommended)". Tell the owner up front how many rounds there are (12: B 3, C 4, D 1, E 4) and that
     they can stop after any group. In each group's last round add one question, "Go on to group {next}?", with "Stop
     here for now" as the other option; it fits within the 4 (B's last round has 2 questions, C's 3, D's 1). The
     owner may type an instruction instead of choosing; do what it says.
   - Before B1 open the production screens on the Mac:
     `open docs/agent/design/DESIGN-S3D/screens/livestock-production-*.png` (Preview), and point to SPEC.md §8.6 and
     §8.6.1. Before each C question open its screens the same way (`home-*` and `more-normal-phone.png` for C1 and C2,
     `tanks-*` for C3, `operations-water-*` and `build-facility-water-*` for C4 and C5, `operations-feed-*` and
     `market-supplies-home-grown-*` for C6, `build-facility-*` for C7, `visitors-staff-*` for C9,
     `settings-notifications-automation-*` for C10, `alerts-*` and `operations-issues-*` for C13,
     `operations-manual-*` and `tank-card-held-*` for C14) and name the SPEC.md section.
   - For C8, send the "C8's strings" table in `OWNER_QUESTIONS.md` (under group C) as a short message before the
     question, with your drafts for its four **not worded** rows.
   - For E, read each row in `docs/agent/BACKLOG.md` (and the review finding it cites) before asking; E's fourth
     round proposes closing B-132, B-133 and B-137 as "no action" (ADR-0018).
3. **Record the answers** after each group, verbatim (question as asked, option chosen with its description, the
   owner's notes or typed answer), in ADRs like ADR-0019 to ADR-0024:
   - The next free number for groups B, D and E (ADR-0025 onward); the DESIGN-S3D approval (group C) gets an ADR of
     its own that names the 0.5 items it replaces (C2) and is also written into `INTAKE.md` §14 "Owner decision".
   - Then: `decisions/INDEX.md`; mark the rows "Answered (ADR-00NN)" in `OWNER_QUESTIONS.md`; PLAN.md ("Product
     decisions in force", "Next step", the chunk briefs' "Before starting" lines); REQUIREMENTS.json notes (PROD-006,
     PROD-008, PROD-011, PROD-015, PROD-017, SOC-010); BACKLOG.md rows (status **decided**, the ADR).
   - Commit ("Owner answers, group …") and push `next`.
4. **Build the next chunk** that the answers unblock: chunk 4 if B1 is approved and B2 to B10 are answered; otherwise
   chunk 6 (needs D1). Chunk 5 only after C15 approves and chunk 4 is done. Follow PLAN.md "How a chunk runs"
   exactly:
   - note the start commit; read only the brief and the design sections it names; apply the chunk's BACKLOG errata and
     fix or defer its open rows;
   - ask the owner (batched, once) about player-visible text no design or ADR gives;
   - run the seeded tests before and after any sim change and explain every changed expectation (never retune data to
     hide a shift);
   - the four checks pass on the final code; one fresh reviewer subagent reads the brief (verbatim from PLAN.md at the
     start commit) and `git diff <start>..HEAD`, not your summary; fix its blockers and re-run;
   - update PLAN.md (the chunk's record, Status, Next step, Last full test run), REQUIREMENTS.json (GREEN, or
     DEFERRED/IN_PROGRESS with the reason), BACKLOG.md, ADRs; commit and push `next`;
   - tell the owner each command with its pass or fail line, what changed, and what to try (`npm run dev`, then
     http://127.0.0.1:5173/?dev=1).
5. **Between chunks** (the owner's routine): bring the docs up to date and prune them, push, then the owner types
   `/compact` (an agent can't) and you re-read the docs before the next chunk. Releases (`main`) only when the owner
   says so in the session, through PLAN.md "Releases".

## How this repo is worked (learned in chunks 1 to 3 and the 0.5.1 release)

**Edit in `/Volumes/Dev/Projects/AquariumGo`, test in `~/LocalTest/AquariumGo`.** The disk image is slow (typecheck
about 2 minutes there, 9 seconds on the internal disk; e2e times out there). The clone's remote `dev` is this repo.
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

Unit tests take about 40 s, e2e about 8 minutes (inside Claude Code's sandbox; it works, don't ask to leave it).
Every e2e run also builds the production site under `/aquarium-go/` for the `base-path` project (about 10 s more).

**Releasing.** The local `main` branch can lag `origin/main` (0.5.0 was pushed straight from `next`). Before merging:
`git fetch origin && git checkout main && git merge --ff-only origin/main`, then `git merge --no-ff next`. A version
bump changes `package.json` and the two root `version` fields in `package-lock.json` (no dependency change, so no
`npm ci`). Pages deploys from the push (about 1.5 minutes); check `…/version.json` on Pages and Render, and deploy
Render by hand only if it didn't update (the owner's memory note `render-manual-deploy` has the command).

**Determinism.** In `src/sim` and `src/data` randomness comes only from `ctx.rng`, `simRng(state)`, a subsystem's own
stream or a keyed `mulberry32(hashString(key))`. Every new log event takes an id from the shared `idCounter`, and some
rolls are keyed on ids, so even a new event shifts later rolls: run the whole unit suite before and after, and say so.

**Tests that pass by day and fail by night.** Notification delivery reads the device clock (quiet hours 22:00–08:00).
A test that expects a notification turns quiet hours off (e2e: `aquarium-go.notify.v1` in an init script) or pins the
clock and `timezoneId`.

**Unit-test patterns.** Server-rendered tests (`renderToStaticMarkup`) read a zustand store's *initial* state: copy the
live state into `getInitialState()` first. Sim tests build worlds with `newGame`, `createTank`, `installEquipment`,
`createCreature`/`addCreature` and step with `advanceWorld` or `stepTank` (see `tests/sim/automation-*.test.ts`).

**e2e patterns.** Open the game with `?dev=1` (dev mode unlocks every destination, and counts the Genetics Lab as
researched). `aq(page, 'dev.setSpeed', 0)` pauses the clock (a restock mid-test changes shop counts). `__AQ.mutate` takes
a function, so call it inside `page.evaluate`. Playwright's `toBeEnabled` counts `aria-disabled` as disabled.
Notifications are recorded by stubbing `window.Notification` and `ServiceWorkerRegistration.prototype.showNotification`
(`tests/e2e/notifications.spec.ts`).

**Rules that bite.** No new dependencies without asking. Never weaken, skip or delete a test; a changed test is a
deliberate fix explained in the commit. Push `next` with `export PATH=/opt/homebrew/bin:$PATH` first (git's
credential helper is `gh`); never push `main` without the owner's go-ahead in your session; never force-push. Don't
change permission settings or hooks. Ask the owner once, batched, and never more than needed. Use plain literal paths
in commands (the owner dislikes approving command after command). Report a test that didn't run as not run.
