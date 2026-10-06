# ADR-0018 — Retire the agent harness; build in large chunks on a `next` branch

**Status:** Accepted\
**Date:** 2026-10-06\
**Slice:** ALL (ends the S0-S4 harness program)\
**Requirements:** superseded: HARNESS-001 to HARNESS-030, PERF-003, REL-001, REL-003, REL-009, REL-010, REL-012 and
REL-018 (they describe the harness and its gates). Every other requirement stays, as a checklist.

## Context

The owner asked for an audit of the harness, "as if you're looking at it brand new", and whether it was worth keeping
(the owner's words are under "Owner approval"). What the repository showed on 2026-10-06:

- About 26 hours and four sessions since the harness was installed (`94de6bb`), and no slice accepted. Nothing a player
  sees had changed.
- The game work: about 345 lines in 21 `src/` files (contained fixes to saves, the game loop and the offline
  catch-up, and the rarity report) and about 1,470 lines of tests, nearly all of it on the first day.
- The harness: about 6,700 lines of scripts (about 3,100 of them its 149 self-tests) and about 30,000 lines of
  documents, records and evidence.
- The review loop: 10 S0 review reports, 9 RED and 1 YELLOW; of the 15 defects S0 logged, 11 or 12 were in the
  harness itself. 15 ADRs recorded owner decisions word for word.
- The owner ran every gate on the Mac by hand, 30 to 90 minutes a run: headless Chromium hangs in Claude Code's
  sandbox there, the Cowork VM has no npm, and ADR-0013 counted the unit gate only from the owner's own run.

The harness was built for unattended, zero-trust autonomy. In practice the owner was in the loop every few hours, so
the project paid its costs without needing most of what it protects against.

The owner's last run of every gate (2026-10-06, code tree `9beda1a3`, committed in `19928b8`) was green except e2e,
45 of 47. Both failures are test problems, not game bugs: the first test absorbed a cold Vite start (BACKLOG B-003),
and the listing test never confirms the "Sell to … ?" dialog that a low bid opens. Chunk 0 fixes both tests.

## Decision

1. **The harness is retired.** Its machinery moves, unchanged, into `docs/agent/archive/` (with `git mv`, so the
   history stays): the master source of truth, `OPERATIONS.md`, `README_FIRST.md`, `STATE.json`, `LEDGER.jsonl`,
   `PROTECTED.json`, `CURRENT_SLICE.md`, `HANDOFF.md`, `prompts/`, `templates/`, `evidence/`,
   `design/DESIGN_INTAKE.md`, `design/DESIGN_REGISTRY.json` and `scripts/agent/`. No state machine, ledger, evidence
   manifest, protected-file hashes, repair counters, bootstrap checks or reviewer quorum from now on. Nothing is
   deleted.
2. **What stays in use:** the designs (`docs/agent/design/`: the approved 0.5 spec, and the DESIGN-S3D capture with
   its intake note), the decisions (`docs/agent/decisions/`), `docs/agent/REQUIREMENTS.json` as a checklist,
   `docs/agent/BACKLOG.md`, the game's tests (including the determinism and layer guard tests) and S0's game fixes.
   The determinism contract moves from `OPERATIONS.md` §11 into `docs/ARCHITECTURE.md`.
3. **New, short rules:** `AGENTS.md` (the coding and safety rules that matter), `CLAUDE.md`, and `PLAN.md` (the chunk
   plan, its status and the next step), which replaces the state file, ledger, slice contracts and handoff.
4. **How work runs:** in large chunks that follow the 0.5 spec's own phases (§21), then multi-line production and
   S3-D. Each chunk is built on the `next` branch and is done when `npm run typecheck`, `npm test`, `npm run build`
   and `npm run e2e` pass and one fresh reviewer has checked the diff and its blockers are fixed; then `next` is
   pushed.
5. **Pushing and deploying:** pushing `next` after each chunk is approved, and it deploys nothing: GitHub Pages builds
   only on a push to `main`, and `render.yaml` names no branch, so Render follows `main`. Because `main` is what
   players get, `next` is merged into `main` only after a full green test pass, with the release step (version bump
   and CHANGELOG entry). The owner approved that in principle ("Let's push to main if everything is tested and looks
   fine to push"); an agent still confirms with the owner in the session before pushing `main`. For this change the
   owner left the choice to the agent, which chose `next`.
6. **Product decisions stay in force:** ADR-0001's product answers, ADR-0005, ADR-0016, and the owner's design answers
   in ADR-0014; `PLAN.md` summarises them. Where an earlier ADR sets harness process (sessions, slices, gates,
   evidence, reviewers, approvals recorded in ADRs, protected files, checkpoints and backups, holding the version
   bump until the end), this ADR supersedes it.

## Alternatives considered

- **Time-box S0 and slim the process for S1-S4:** offered in the audit; the owner chose to retire it.
- **Keep the harness:** rejected; it cost more than it protected while the owner is in the loop.

## Consequences

- Quality rests on the existing tests (1,809 unit and 47 e2e tests), one independent review per chunk, and the owner
  playing the work before it reaches `main`.
- Agents run the tests themselves where npm works: Claude Code in the repo on the owner's Mac. Headless Chromium hangs
  inside Claude Code's sandbox there, so e2e runs outside it with the owner's approval, or the owner runs it.
- S0's game requirements stay IN_PROGRESS until chunk 1's reviewer has read S0's game diff once (the harness's last
  re-reviews never ran).
- Older ADRs and documents still point at the old paths (for example `docs/agent/OPERATIONS.md`); those files now
  live under `docs/agent/archive/`.

## Owner approval

Given 2026-10-06 by the owner in a top-level Cowork session (Claude Code session
`fba2c9be-b138-5280-9d88-73d0d368cce5`).

The owner wrote (verbatim): "Do an audit on our harness and looping, and see if it's even worth it to run. Maybe we
just deprecate that entirely. I think we already have all the design files and everything. Maybe we just put that
into chunks, and then I just let you do large chunks, push it, and then large chunks. If all we've done is just go
around fixing a really broken system, then that's not great. Do an overview audit as if you're looking at it brand
new, and tell me if it's even worth using and if there's any way to salvage it to be something that's functional and
serves us rather than taking extra time."

After the audit, the owner wrote (verbatim): "Let's go ahead and push main updates to live sites. Actually, let's
just go with your suggestion: push each chunk to a next branch. As long as we're doing the next branch, we can get it
all together and then test it once and make sure that it can go to main. That's fine.

Let's get rid of the harness. Let's do pretty much all of your suggestions here. Let's make sure we can build and move
forward. Good Lord.

Let's push to main. We can fix whatever problems, right? Let's push to main. Retire the harness. Let's push to main if
everything is tested and looks fine to push, but if we don't know if it works or whatever, then let's do a next
branch. Your choice there."

Scope: retiring the harness as Decision 1 describes; the new rules files; pushing `next` after each chunk; pushing
`main` once everything is tested and looks fine (Decision 5).
