# S0 review: security-data (instance 1)

- **Role:** security-data (`docs/agent/prompts/ROLE_PROMPTS.md`), fresh subagent, read-only except this file and
  throwaway probes in `scripts/_audit/H0-review-security/` (git-excluded).
- **Candidate:** `c774d38bc05ce2b9b62ae442ad6420537dd11535` on `agent/aquariumgo-local-stack-20261005`. **Base:** `94de6bb`.
  Diff: `git diff 94de6bb..HEAD` (76 files). Working tree was clean at the start.
- **Contract read:** `CURRENT_SLICE.md`; REL-001, HARNESS-002, HARNESS-004, HARNESS-005, PERSIST-001..004 in
  `REQUIREMENTS.json`; OPERATIONS §2, §3, §6, §10; master §3.1, §3.5, §29 (plus §3.4, §3.8 and §24 for context).
  I did not read `HANDOFF.md`, `LEDGER.jsonl`, commit messages or the other reviewers' reports.
- **Nothing remote was run.** No push, `gh`, `render` or network write. The only network-adjacent command was
  `claude --help` (with the auto-updater and non-essential traffic disabled) to check the launcher's CLI flags.

## How I checked (probes in `scripts/_audit/H0-review-security/`, run with `npx vite-node` or `node`)

| Probe | What it does | Result |
|---|---|---|
| `fuzz-ids.ts` (+ `fuzz-out.txt`, `fuzz-out-2.txt`) | 12 fixtures; every id-like string field set to `__proto__` / `constructor` / `toString` (the second six fixtures with `__proto__` only), and an own inherited-key entry added to every object; loaded through the real import path (`decodeRecord` → `migrateSave` → `repairState`), checked for repair idempotence and round-trip hash, then 3 h offline catch-up and 30-48 h of `advanceWorld` | 3,114 cases: **2 prototype-pollution paths**, 91 sim/catch-up crashes, 61 runs with swallowed sim errors; zero non-idempotent repairs, zero round-trip drift |
| `pollution-repro.ts`, `pollution-after.ts` | minimal crafted save (one field changed), then 200 world ticks in which a failing tick is retried, as atomic `mutateFast` does | `Object.prototype` gains 7 properties; after about 12 game hours every tick throws |
| `legit-saves.ts`, `load-v040.ts` (+ `v040-saves.json`) | all 46 fixtures, and 46 saves **written by v0.4.0 code** (0d9fc5a, generated in a throwaway worktree after a day of play), loaded at HEAD | all load with `repairs: []`; second repair is `[]`; save → load keeps `stateHash`; 12 h of play without a throw |
| `double-time.ts` | `runTick` for 10 real seconds at 1× with one throwing store subscriber, at HEAD and at the base code | HEAD advances **20.5 game hours**; base advances 1.0 (expected 1.0) |
| `harness-bypass.sh`, `harness-fast.mjs` (+ outputs) | each harness scenario in a throwaway clone/worktree (since deleted), using the real `check-state`, `protect`, `capture-evidence`, `bootstrap-check` code | every bypass below reproduced |

Also run read-only in the repository: `node scripts/agent/check-state.mjs` → exit 1 (`docs/agent/PROTECTED.json is
missing`); `node scripts/agent/protect.mjs` → exit 1 (same); `git check-ignore -v` on evidence and `.agent-runs/`
paths; `git config` for remotes, credential helpers, hooks and aliases.

## Findings

### SD-1 — High — A crafted save still pollutes `Object.prototype` (PERSIST-004 S0 claim not met)

The S0 fix drops unsafe map **keys** and checks a few references, but never normalises a record's own `id` field or
the other intra-save references, and the sim writes through plain `state.clutches[id]` lookups.

- **Path A (reproduced, `pollution-repro.ts`):** a clutch stored under a safe key whose own `id` is `"__proto__"`.
  `repairState` keeps it with `repairs: []` (`src/persistence/migrations.ts:395-406` never sets `cl.id = id`, unlike
  tanks at `:219` and creatures at `:269`). At birth, `src/sim/life/breeding/systems/seahorse.ts:80` passes `cl.id`
  to `giveBirth`, which re-reads `state.clutches[clutchId]` (`:224`) and gets `Object.prototype`;
  `releaseCarried` (`src/sim/life/breeding/clutch.ts:549-560`) then writes `guardedById`, `stage`, `stageSinceHour`,
  `nextStageHour`, `visual`, `anchor`, `fed` onto it. Every `{}` in the page now has `stage === "fry"`. About 12 game
  hours later, every world step throws in `morphRarity` (`src/sim/economy/valuation.ts:44`, a `for...in` over alleles,
  reached through the market refresh). With the new atomic `mutateFast`, the world then stays frozen until reload
  (`pollution-after.ts`: 95 ticks published, then 105 consecutive failures).
- **Path B (fuzz):** a creature with `repro.clutchId = "__proto__"`: `src/sim/life/breeding/systems/axolotl.ts:204-206`
  (`if (cl) cl.pendingEggs = 0`) sets `Object.prototype.pendingEggs`.
- Unvalidated references of the same kind (crash or swallowed errors in the fuzz, pollution wherever the code writes
  through the result): `repro.clutchId`, `repro.partnerId`, `clutch.guardedById/motherId/fatherId`,
  `market.listings[].tankId`, `shows.entries[].subjectId`, own inherited keys in `inventory.foods` and the other
  id-keyed sub-maps (`water.foodByTag`, `genome.alleles`, `visitors.exhibit`, `shows.tankAwards`, `staff.care`,
  `staff.warned`, `progress.counters`, `tutorial.flags`).

**Fix:** in `repairState`, set `cl.id = id` (and the self id of every record kept in an id-keyed map); validate every
intra-save reference with `hasKey` (null or drop it otherwise) and run `dropUnsafeKeys` on every id-keyed sub-map. As
defence in depth, read the three entity maps through an own-key helper (`Object.hasOwn(map, id) ? map[id] :
undefined`) in `src/sim`, and consider `Object.freeze(Object.prototype)` at boot after checking three/React/Immer
compatibility. Turn `fuzz-ids.ts` into a `tests/sim` regression test (every id-like field × inherited keys, through
`decodeRecord`, offline catch-up plus 48 h of steps, assert no prototype change and no throw).

### SD-2 — Medium — Crafted catalog ids still crash the sim loop and the catch-up (PERSIST-004, "crash the sim loop")

Only `findSpecies` became own-key (`src/data/species/index.ts:30`). The other catalog tables are plain objects
(`TANK_TIER_BY_ID`, `EQUIPMENT_BY_ID`, `DECOR_BY_ID`, `QUEST_BY_ID`, `RESEARCH_BY_ID`, `SHOW_CLASS_BY_ID`,
`ACHIEVEMENT_BY_ID` in `src/data/**`), so an inherited key finds `Object.prototype` or a built-in function:

- `tanks.*.tierId` passes repair (`migrations.ts:220` uses `!TANK_TIER_BY_ID[t.tierId]`) and crashes every step in
  `computeTankEnv` (`src/sim/water/env.ts:422`).
- `equipment[].defId` crashes `stepEquipmentWear` (`src/sim/water/step.ts:126`); `starterId` (`migrations.ts:366`
  only fills a missing value) crashes `giftedLayoutShare` (`src/sim/aquascape/starters.ts:284`);
  `progress.research.activeId` crashes `researchNewGrants` (`src/sim/facility/progression.ts:914`);
  `progress.quests[].id`, `progress.tutorial.starterId` and `market.listings[].tankId`
  (`src/sim/economy/valuation.ts:380`) crash the catch-up or the step; `decor[].defId` floods swallowed errors.

Each of these makes an imported save unplayable: the loop throws every tick and, with the atomic `mutateFast`, the
world never advances while the player sees no message. **Fix:** build every `*_BY_ID` table with a null prototype or
read it with `Object.hasOwn`; in repair, validate `tierId`, `starterId`, `tutorial.starterId`, equipment/decor/frag
`defId`, quest ids and `research.activeId` against own keys, and surface repeated tick failures to the player. If
this is left to S4, correct the PERSIST-004 note, which currently says inherited-key ids were fixed in S0.

### SD-3 — Medium — Regression: a throwing store subscriber makes the world run ~20× too fast

`src/game/GameLoop.tsx:105` sets `done = 0` on any exception, on the assumption that `mutateFast` published nothing.
That only holds for recipe errors. `publish(current)` (`src/game/fastMutate.ts:129`) runs outside the `try`, and
zustand stores the new state before it calls listeners, so an exception from any of the ten `useGame.subscribe`
listeners arrives after the tick **was** published. The tick is then re-queued as backlog (up to 1.5 game hours) and
simulated again on every tick. `double-time.ts`: 10 real seconds at 1× advanced the world 20.5 game hours at HEAD and
1.0 at the base code. Animals age, eat and die, and money moves 20× faster, all of it autosaved.
**Fix:** in the catch, zero `done` only when the store still holds the pre-tick game
(`if (useGame.getState().game === game) done = 0;`), or catch and report listener errors inside `publish` without
rethrowing them. Add the subscriber case to `tests/sim/core-fastmutate-atomic.test.ts`.

### SD-4 — Medium — Unattended push guard: realistic bypasses, and detection that only sees one kind of push (REL-001, HARNESS-002)

- **Deny rules** (`scripts/agent/relaunch.mjs:33-69`) use valid syntax (`claude --help` itself shows
  `"Bash(git *)"`), but they are prefix matches. `git -C /Volumes/Dev/Projects/AquariumGo push …` matches none of
  them. Agents here use that form routinely, because their shell's cwd resets between calls and they are told to use
  absolute paths. Also
  unmatched: `git -c k=v push`, `git --no-pager push`, `env git push`, `/usr/bin/git push`, `sh -c '…'`, a script
  file or `node -e` calling git, and `git credential fill` followed by `curl` against the GitHub or Render API.
- **Credentials are live.** Global git config has `credential.https://github.com.helper = !/opt/homebrew/bin/gh auth
  git-credential`, so any git push to github.com authenticates silently, and the deny rule on `gh` doesn't stop git
  from calling gh as its credential helper.
- **Detection** (`pushCount`, `relaunch.mjs:118-126`) counts "update by push" entries in `refs/remotes/*` reflogs.
  That misses pushes to an explicit URL, tag pushes (tags have no remote-tracking ref), pushes from another clone,
  GitHub API writes (refs, releases, `workflow_dispatch`) and Render API deploys. A remote branch deletion removes a
  reflog and *lowers* the count, and so does `git reflog delete` or deleting `.git/logs/refs/remotes/*`, neither of
  which is denied.

**Fix:** add deny patterns for the global-option forms (`git -C * push*`, `git -c * push*`, `git --git-dir* push*`,
`git --work-tree* push*`, `git --no-pager push*`) and for `git credential *`. Run the child without credentials: reset
`credential.helper` and `credential.https://github.com.helper` through `GIT_CONFIG_COUNT`/`KEY`/`VALUE`, point
`GH_CONFIG_DIR` at an empty directory, unset `GH_TOKEN`, `GITHUB_TOKEN`, `RENDER_API_KEY` and `SSH_AUTH_SOCK`, and set
`GIT_TERMINAL_PROMPT=0`. A separate macOS user with no GitHub/Render credentials is better still. Detect server-side
with a read-only `git ls-remote --heads --tags origin` before and after every session, and alarm on any difference;
`git fetch` and read-only network access are already allowed by OPERATIONS §3.

### SD-5 — Medium — The launcher's own guard rails can be changed by the sessions it launches

- The settings file holding the deny rules is written **once**, before the loop, into the agent-writable working tree
  (`relaunch.mjs:206-207`, `.agent-runs/relaunch-settings.json`). Session N can edit it, and session N+1 runs with the
  edited rules. In `-p` mode, per `claude --help`, "Settings files that fail validation are silently ignored", so one
  stray character removes every deny rule without a warning.
- `-p` also skips the workspace-trust dialog. If one session manages to write `.claude/settings.json`,
  `.claude/settings.local.json` or `.mcp.json`, the next one loads it without asking, and hooks run outside the
  permission system. I did not test whether auto mode lets a session write those files; the launcher doesn't check
  either way. Likewise a
  `.git/hooks/post-commit` or a `.git/config` alias would run in every later session **and in the owner's own
  shell**. `snapshot()` (`relaunch.mjs:131-140`) checks none of these, and neither does a change to the protected
  harness files during a session.

**Fix:** rebuild the settings before every spawn and pass them inline (`--settings '<json>'` or `--disallowed-tools`),
or keep the file outside the repo and verify its hash before each spawn. Consider `--setting-sources user` for
unattended runs. Snapshot and compare `.claude/**`, `.mcp.json`, `~/.claude/settings*.json`, `.git/config`,
`.git/hooks/*`, `docs/agent/PROTECTED.json` and the protected files, and alarm-stop on any change. Today there are
no active hooks, no `core.hooksPath` and no aliases, so the baseline is clean.

### SD-6 — Medium — Remote or multiplayer permission is accepted on any existing file (HARNESS-004 AC1 not met)

`check-state.mjs:88-89` only needs `remoteApproval`/`multiplayerApproval` to be truthy, and `:302-304` only that the
path exists. Reproduced: `remoteMutationAllowed: true` with `remoteApproval: "README.md"` → `OK`. With an agent-written
`docs/agent/decisions/ADR-0099-owner-approves-push.md` → `OK` plus one warning ("new protected file … not recorded
yet"). `relaunch.mjs` refuses to start with remote permission (good), but an attended session gets a passing check.
**Fix:** require a path matching `^docs/agent/decisions/ADR-\d{4}-[^/]+\.md$` that is tracked at HEAD, recorded in
`PROTECTED.json` and cited by an `owner-decision` ledger event. Because every one of those files is agent-writable,
the honest options are an owner-only anchor (for example an SSH-signed tag `owner-approval/ADR-NNNN` verified with
`git verify-tag` against an allowed-signers file the agents can't change), or making `remoteMutationAllowed: true` an
error and having the owner run remote actions personally.

### SD-7 — Medium — Protected-file guard is not installed, and when installed it is self-attested (HARNESS-005, OPERATIONS §10)

- `docs/agent/PROTECTED.json` does not exist at the candidate, so `check-state.mjs` and `protect.mjs` both exit 1
  today. The S0 criterion "check-state.mjs exits 0" is unmet, and the `protectedFiles` gate can't pass.
- `PROTECTED.json` is not in its own patterns (`protect.mjs:20-31`). Reproduced: deleting both `git push` deny rules
  from `relaunch.mjs` and then running `protect.mjs --update --adr docs/agent/decisions/ADR-0001-owner-operating-decisions.md`
  (an old, unrelated ADR; `:76-81` only checks the name pattern and existence) → `OK`. Hand-editing the hash in
  `PROTECTED.json` (no ledger trace at all) → `OK`. New files in `decisions/` or `scripts/agent/` only warn
  (`:54-56`), and `relaunch.mjs` ignores warnings.

**Fix:** generate `PROTECTED.json` from the reviewed tree after these fixes, under an ADR. Verify it against its copy
at `lastAcceptedCheckpoint`, and require `--update` to name an ADR that is new since that checkpoint and lists the
changed files. Make unrecorded new files under `decisions/` and `scripts/agent/` errors, and have the launcher
alarm-stop on any protected-file change (SD-5).

### SD-8 — Medium — Append-only and tamper checks only hold against uncommitted edits (HARNESS-005 AC1 not met)

All of these were reproduced with the real functions (`harness-fast-out.txt`):

- Ledger: a rewritten line is caught before commit; after `git commit` it passes, because `validateLedger` compares
  only with HEAD (`check-state.mjs:229-231`, `:348-349`). The same holds for a deleted requirement id (`:215-217`,
  and `requirements-audit.mjs` uses HEAD too).
- Evidence: an edited log is caught; the same edit plus an updated `logSha256` in the manifest, and the failing e2e
  record removed, passes. Nothing makes `manifest.commands`/`reviews` append-only.
- A GREEN gate backed by a hand-written record `{gate, exitCode: 0}` with no `log` and no `codeTree` passes
  (`:126` skips the tree comparison when `rec.codeTree` is missing, and `:162` skips records without a log). Note
  that the S0 baseline records are already hand-written (`recordedBy` in the manifest).
- Evidence outside the repository (`../../outside.log`) passes the "ignored by Git" check: `git check-ignore` exits
  128 for it, and `gitOk` reads that as "not ignored" (`:166`, `:325`).

**Fix:** anchor every append-only check to `lastAcceptedCheckpoint`, or walk `git log <checkpoint>..HEAD` for the
ledger, requirements, manifests and evidence logs (`--diff-filter=MD` on committed evidence is an error). Require
`log`, `logSha256`, `codeTree` and `command === GATE_COMMANDS[gate]` on gate records. Normalise evidence paths and
require them under `docs/agent/evidence/<slice>/` (or `.agent-runs/` for full logs). Optionally hash-chain ledger
events, each carrying the previous line's SHA-256. ADR-0003's "Consequences" (`:106`) currently overstates what
check-state catches.

### SD-9 — Medium — A review can be recorded with a verdict it doesn't give, from anywhere, for any code tree (master §26)

- `reportStatesVerdict` (`capture-evidence.mjs:29-31`) matches the verdict word followed by the value anywhere in the
  text. A report that quotes the role prompt's closing instruction (which names all three values) and ends on RED is
  accepted when recorded as GREEN, and as YELLOW. Reproduced.
- `--report` can be any existing path (`:79`). A report under `.agent-runs/` is ignored by Git, and once deleted it
  only warns (`check-state.mjs:163-164`).
- Reviews are not bound to the reviewed tree. `capture-evidence` records the recorder's working tree at recording
  time, and `validateGateEvidence` (`:129-141`) accepts, at acceptance, a GREEN review of an older code tree.
  Reproduced. OPERATIONS §7 says a new reviewer must review the tree after every repair.

**Fix:** read only the last non-empty line, require exactly one verdict line, require the report under
`docs/agent/evidence/<slice>/reviews/` and not ignored, record the reviewed commit or tree explicitly
(`--candidate <sha>`), and at acceptance require each required role's last GREEN review to match the accepted tree.

### SD-10 — Low — `loadAndResume` still adopts a partly simulated catch-up (pre-existing; inconsistent with the new atomic rule)

`src/persistence/offline.ts:386-391`: when `simulateOffline` throws, the half-advanced `state` is kept, then
`lastTickRealMs = now`, then `setGame`. That is the outcome the `mutateFast` change now forbids ("a world step that
fails part-way must never become the game state"). **Fix:** simulate on a clone and keep the clean loaded state on
failure.

### SD-11 — Low — Owner decisions and fresh sessions are self-declared

`validateEvent` (`lib.mjs:196`) accepts any non-empty string as the `decisions` reference for leaving OWNER_GATE or
BLOCKED_MANUAL_REVIEW, and any actor may append `kind: owner-decision` (reproduced). `bootstrap-check.mjs:59-62`
compares the session id the assertion *claims* and never `CLAUDE_CODE_SESSION_ID` (reproduced with a made-up id).
**Fix:** require an existing, tracked ADR path in `decisions`, and compare `a.sessionId` with `currentSession()` when
it is set.

### SD-12 — Low — Deploy-config alarm misses the build inputs; the Render auto-deploy wording is brittle

`DEPLOY_CONFIG` (`relaunch.mjs:129`) is `.github` and `render.yaml`. Both channels run `npm ci && npm run build` on the
pushed tree, so `package.json` (scripts and dependencies), `package-lock.json` (resolved URLs), any `.npmrc` and
`vite.config.ts` (which runs `execSync` at build time) decide what runs in CI with `pages: write`/`id-token: write`.
Master §3.8 already calls `package.json` scripts gate-defining. Separately, `render.yaml` declares `autoDeploy: true`
while OPERATIONS §3 (line 60) says Render deploys only through the CLI, API or dashboard. If the Blueprint is ever
synced, a push deploys both channels. **Fix:** include those files in the alarm and the owner package, and say
"a push to main may deploy both channels".

### SD-13 — Low — Wording that weakens the approval and independence rules

- ADR-0002 line 90: "A fresh agent may rely on an owner decision only if it is recorded in an ADR, the master or
  STATE.json". STATE.json is agent-written. This contradicts OPERATIONS §2 (verbatim ADR only); supersede it in a
  later ADR.
- OPERATIONS §8 (line 210) tells agents where `gh` lives and says only that they don't use it "for anything that
  writes". Simpler and safer: agents don't use `gh`.
- `context-pack.mjs` puts `HANDOFF.md` in the pack (`:64-65`), and README_FIRST says reviewers get that pack, while
  OPERATIONS §7 and ROLE_PROMPTS forbid giving reviewers HANDOFF. Add a reviewer mode without the handoff.

### SD-14 — Low — Destructive-command deny gaps (master §29)

Not denied: `git gc --prune=now` (the rule needs a space after `--prune`), `git commit -a --amend` and
`--no-edit --amend` (the rule needs `--amend` first), `git reset --soft/--mixed HEAD~n`, `git branch -f`,
`git tag -f` (it moves a checkpoint tag; check-state then accepts the moved tag), `git switch -f` and
`git checkout -f`, `git reflog delete`, `git update-ref` without `-d`, and `rm`/`find -delete` under `docs/agent/`.
All are local and mostly recoverable, but they defeat the "accepted history" checks.

### Info

- **SD-15 PERSIST-003 (too_new) is unchanged and latent.** At HEAD, a too_new primary still fails to decode, the
  loader falls back to the backup (`src/persistence/slots.ts:403-411`), and two later saves rotate the newer record
  out of the backup. It is harmless only while `SCHEMA_VERSION` stays 1, which master §3.5 correctly gates. Sequencing
  matters: the older client is the one that overwrites, so the protection must ship at least one release **before**
  any version that writes v2 saves.
- **SD-16 Committed evidence and a public push.** The committed logs and docs hold no secrets today: only local paths,
  the Render service id (an identifier, not a credential), session ids and the owner's quoted answers. Future risks:
  npm failure output names `~/.npm/_logs` (the macOS user name); `capture-evidence --command` commits arbitrary output
  (add a guard that refuses token-like strings such as `gh[opsu]_`, `github_pat_`, `npm_`, `rnd_`, `Authorization:`
  and private-key headers); design intake `SOURCE.md` would commit private Claude Design links; never commit a Render
  deploy-hook URL, which embeds a key. `.gitignore` works as intended: `!docs/agent/evidence/**/*.log` re-includes the
  logs (`git check-ignore -v`), and `.agent-runs/` (transcripts, relaunch settings, full logs) is ignored.
- **SD-17 BF-001 decision.** A sandbox exception for `npm run e2e` runs arbitrary code unsandboxed: Playwright specs,
  `playwright.config.ts` `webServer.command` and the `e2e` script are all editable code, running with network access
  and the owner's credentials. Prefer the owner running e2e, or a separate credential-less user.
- **SD-18 Save-supplied colours** reach SVG `fill` attributes and CSS custom properties without validation
  (`src/ui/panels/common/Portrait.tsx:72-79`, `src/ui/common/Portrait.tsx:48`). I found no fetch path: the CSS
  variables sit inside gradients, and Blink and WebKit don't load cross-document paint servers. Still, validate
  `#rgb`/`#rrggbb` in S4 alongside PERSIST-004's remaining items.
- **SD-19 Small harness inaccuracies.** `test-inventory.mjs` `SKIP_RE` misses `.skip.each(` and `.todo.each(` (use
  `\.(skip|only|todo|fixme)\b`). ADR-0002 line 97 cites a `relaunch.mjs --self-test` that doesn't exist. Note for S4:
  no service worker and no password handling exist yet, so the Social-stub password check is not applicable at this
  candidate.

## What holds (verified)

- **Crafted-save fix, where it applies.** `isSafeKey`/`hasKey`/`dropUnsafeKeys` are correct for the paths they
  cover: tanks, creatures and clutches keys, `tankOrder`, `creature.tankId`, `clutch.tankId`, staff `tankIds`,
  listing `creatureIds`. Repair is idempotent on all 3,114 crafted inputs and keeps the round-trip hash.
- **Listing photos.** Restricting them to `data:image/` (`migrations.ts:431`) closes the only `<img src>` sink fed by
  save data that I found. `data:image/svg+xml` in `<img>` can neither script nor fetch. The fonts are bundled, and the
  update check fetches only same-origin `version.json`.
- **Legitimate saves (PERSIST-001/002).** 46 saves written by v0.4.0 code, and all current fixtures, load at HEAD with
  `repairs: []`, repair idempotently, keep `stateHash` across save → load, and play without throwing.
  `SCHEMA_VERSION` is unchanged (PERSIST-003 AC1).
- **Atomic `mutateFast` on the save paths.** A failed pre-save flush (`src/persistence/session.ts:36-45`, `:74-81`)
  still saves: it saves the unflushed state, with `simDebtHours` intact, and nothing partial. Before the change, a
  throw after `simDebtHours = 0` could publish the zeroed debt and lose that time. The same holds for
  `catchUpAfterHidden`. The only defect is the subscriber path (SD-3).
- **Hidden-tab catch-up** (`offline.ts:438-440`): `awayMs ≤ hiddenMs` and `≤ now − lastTickRealMs`, so it can't
  double time. It only skips time when `lastTickRealMs` is in the future (the clock moved backwards), which is
  conservative. Interval autosaves don't run while the tab is hidden (`useAutosave.ts:154`), and the save on hide
  stamps `lastTickRealMs` at the moment the tab goes dark.
- **`offlineGrace` stays transient.** It is stripped on save (`TRANSIENT_KEYS`) and deleted by `repairState` and by
  the load path's catch, so a save can't pin the market to 1× (`listings.ts:83`) or block equipment failures
  (`water/step.ts:133`).
- **No remote instructions.** Nothing in the diff tells an agent to run a remote command. Every remote action is
  forbidden consistently across AGENTS.md, CLAUDE.md, README_FIRST, the master, OPERATIONS §3, the prompts and the
  unattended note. Compared with the base, REL-001 is stated more completely (both deploy channels, tags, `gh api`,
  `workflow_dispatch`).
- **Launcher fails closed** on a STOP file, check-state errors, stop states, remote permission and a wrong branch.
  Its CLI flags are valid for Claude Code 2.1.289. The `osascript` notification can't be injected into (the argument
  is passed as an array and the text is JSON-escaped).

## Summary

The persistence changes are sound for legitimate saves, and the atomic `mutateFast` is safe for the save paths. But
the crafted-save hardening is incomplete in exactly the property this role must verify: a one-field crafted import
still pollutes `Object.prototype` (SD-1), and many inherited-key catalog ids still crash the loop (SD-2). The diff
also introduces a time-accounting regression when a store subscriber throws (SD-3).

On the harness side, the guards are well documented and fail closed at start-up, but several requirement claims are
stronger than what the scripts enforce:

- remote permission accepts any existing file (HARNESS-004);
- the append-only and tamper checks pass once the edit is committed, and gate records need neither a log nor a code
  tree (HARNESS-005);
- `PROTECTED.json` is missing, so check-state exits 1 today, and once present it can be re-blessed with any old ADR;
- a RED review can be recorded as GREEN;
- the unattended launcher's deny rules miss `git -C … push` while credentials are live, its push detection sees only
  pushes to a named remote's branches, and its settings can be changed by the sessions it starts.

Minimum for a GREEN re-review:

1. Fix SD-1 and SD-3, with regression tests.
2. Fix SD-2, or narrow the PERSIST-004 claim explicitly.
3. Create `PROTECTED.json` from the fixed tree.
4. Either fix SD-6 to SD-9 or record, in an owner-visible ADR, that these checks only detect uncommitted edits.
5. Before the launcher is ever run: rebuild the settings inline per spawn, strip credentials from the child, compare
   `git ls-remote` before and after each session, add the `git -C` patterns, and snapshot `.claude`, hooks and config
   (SD-4, SD-5).

Verdict: RED
