# ADR-0008 — Docs corrections after the owner's answers and the S0 reviews

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0, and ALL for the branch, schema and procedure rules\
**Requirements:** REL-001, HARNESS-001, HARNESS-004, HARNESS-005, HARNESS-008, PERSIST-003, SOC-011

## Context

The owner's answers in ADR-0004 to ADR-0007 and ADR-0009 left statements in the protected docs that are now wrong:
"never commit on `main`", a `SCHEMA_BUMP` owner gate, an S4 flow the scripts no longer follow. The S0 reviews also
found claims in ADR-0002 and ADR-0003 that the repository doesn't back. Accepted ADRs are never edited
(`decisions/INDEX.md`, `OPERATIONS.md` §10), so this ADR supersedes the wrong parts and lists every protected-file
change made under it. This is `HANDOFF.md` step 3.

**Numbering.** At `7c0dbf4`, `HANDOFF.md` step 3 called this corrections ADR "ADR-0006". ADR-0006's Consequences
renamed it, and commit `8c5700d` changed that line of the accepted ADR-0006 from "becomes ADR-0007" to "becomes
ADR-0008 (ADR-0007 records the push approval)"; that edit renumbers and changes no decision. ADR-0009 kept 0008
reserved. So where ADR-0004 decisions 3 and 4 say "ADR-0006" removes the master §3.5 owner-gate sentence and
withdraws ADR-0003 rule 7, they mean this ADR. ADR-0006 as written contains no schema decision.

## Decision

### 1. Corrections to ADR-0002

| ADR-0002 says (verbatim) | Flagged by | Correct statement |
|---|---|---|
| Verification, line 97: "The launcher's stop conditions are unit-tested by `scripts/agent/relaunch.mjs --self-test`." | adversarial-1 F5 and F18; code-architecture-harness-1 M11; security-data-1 SD-19 | No `--self-test` flag exists. The stop conditions are tested in `scripts/agent/agent.test.mjs` (test "relaunch: stop conditions, alarms first"), run with `node --test 'scripts/agent/*.test.mjs'`. At `c774d38` the flag was ignored, so once its pre-flight passed the command would have started the real unattended launcher (F5). Since `7c0dbf4`, `relaunch.mjs` refuses unknown options; that change is untested until `HANDOFF.md` step 2. Never run `relaunch.mjs` to check a claim. |
| Consequences, lines 90-91: "A fresh agent may rely on an owner decision only if it is recorded in an ADR, the master or `STATE.json`." | security-data-1 SD-13; adversarial review M03 | A fresh agent may rely on an owner decision only when the owner's own words are recorded verbatim in an ADR, with an `owner-decision` ledger event (`OPERATIONS.md` §2). `STATE.json` is agent-written: its flags only mirror such an ADR and are never an approval. |
| Decision 4, line 77: "S3 cannot be accepted without S3-D (master §45)." | adversarial review M86 | Master §45 doesn't say this. S3 can't be accepted without S3-D under the current slice boundaries: master §9 puts S3-D in S3, and ADR-0005 decision 5 keeps it there. |
| Verification, line 96: "`node scripts/agent/check-state.mjs` validates the registry, state and ledger (S0 helper)." | adversarial-1 F18 | It validates them, but it fails while `PROTECTED.json` is missing, and no commit has ever contained that file (adversarial-1 F1; `HANDOFF.md` lists the errors expected until steps 5 and 7). |

### 2. Corrections to ADR-0003

| ADR-0003 says (verbatim) | Flagged by | What the repository holds |
|---|---|---|
| Decision, lines 41-42: "New: … `BACKLOG.md`; `PROTECTED.json`; `evidence/S0/` (baseline, baseline failures, reviews, test inventory)." | adversarial-1 F18; code-architecture-harness-1 H4; requirements-1 F17 | None of `BACKLOG.md`, `PROTECTED.json`, `evidence/S0/reviews/` or a test inventory existed at `c774d38`. The review reports were committed in `7c0dbf4`. `BACKLOG.md` is written with this ADR (`HANDOFF.md` step 4). `PROTECTED.json` and the baseline test inventory are `HANDOFF.md` step 7. |
| Decision, line 43: "30+ tests in `agent.test.mjs`" | `HANDOFF.md` step 2 | True at `c774d38` (33 of 33 passed, adversarial-1 "What held up"). Since `7c0dbf4` the harness tests fail at import until step 2 updates them. |
| Decision, lines 47-48: `REQUIREMENTS.json` schema 2 with "… and the design decomposition" | code-architecture-harness-1 M11 | The decomposition (S0-T6) wasn't done then. A draft was reviewed in requirements-1 (RED) and merged into `REQUIREMENTS.json` in `5ae85a3` (`HANDOFF.md` step 5). |
| Consequences, lines 105-106: "evidence edits, deleted requirements, rewritten ledger lines, vanished tests and silent rule changes all fail `check-state.mjs`." | adversarial-1 F2, F3 and F18 | At `c774d38` only careless edits failed. Edits made with the code open, committed rewrites, and evidence after the checkpoint passed. `7c0dbf4` changes the scripts; that is unverified until step 2. |
| Verification, lines 113-114: "`npm run typecheck` and `npm test` pass on the changed configuration; the reuse change was verified …" | adversarial-1 F18; code-architecture-harness-1 M11 | `evidence/S0/manifest.json` holds only baseline records (code tree `454801df`, `0d9fc5a`/`94de6bb`). No run on a post-baseline tree is recorded (master §18 rule 6). |
| Verification, line 115: "Independent code-architecture and security-data reviews of this diff (`evidence/S0/reviews/`)." | adversarial-1 F18 | The reports were written later (`code-architecture-harness-1` RED, `code-architecture-game-1` YELLOW, `security-data-1` RED) and none is recorded in the manifest. None is GREEN. |
| Decision, lines 50-51: "no commits on `main` … (§3.4); the schema bump becomes an owner gate until the owner decides (§3.5)" | ADR-0005 decisions 1 and 6 | Both reversed by section 3 below. |

### 3. ADR-0003 rules 5 and 7 replaced

- **Rule 5** ("No commits on `main` or `feat/*`; local `main` stays equal to `origin/main`.") is superseded by ADR-0005
  decision 6. It now reads: no commits on `feat/*`. Work happens on `STATE.integrationBranch`, which is local `main`.
  A push of `main` deploys GitHub Pages, so it needs the owner's recorded approval like any push (REL-001). A cloud
  session works on `agent/s0-wip` and pushes only as an owner ADR allows (ADR-0007, ADR-0009). Local `main` is ahead
  of `origin/main` by design.
- **Rule 7** ("Until the owner decides the schema policy, a `SCHEMA_VERSION` bump is an owner gate.") is withdrawn
  (ADR-0004 decision 4, whose "ADR-0006" means this ADR). The schema policy is ADR-0005 decision 1: old v0.4.0 saves
  need not load; a schema change is allowed when a feature needs it, documented and tested (master §3.5 as the owner
  wrote it); the save code never treats a save written by newer code as damaged, falls back past it or overwrites it
  (PERSIST-003). There is no `SCHEMA_BUMP` owner gate.

### 4. ADR-0003's supersession register: rows answered since

| Row | Now |
|---|---|
| §1 item 10, §3.3, §15: "until the owner decides, no bump and v0.4.0 saves must load" | ADR-0005 decision 1 (rule 7 above). PERSIST-001 is superseded. |
| §11 single production line card: "the UI needs a design ADR before S3-C UI work" | ADR-0005 decision 6: the multi-line screens come with the owner's designs, registered as `DESIGN-S3C-LINES` (pending). |
| §22 risk 1 (rarity tiers): "Open owner question" | ADR-0005 decision 4: keep today's tier rule and count the real numbers (`npm run report:rarity`, GEN-013). |
| Consequences, line 108: e2e and browser QA can't pass "until the owner decides how they run (BF-001)" | ADR-0004 decision 2: browser work runs from the Claude desktop app. From a sandboxed shell they still can't pass. |
| New: design D2, D5 and §13, Social visible to players | ADR-0005 decision 3 (SOC-011): Social is reachable only in dev mode until a real backend exists. |

The §12.3 iOS copy row stays an open owner question.

### 5. Protected-file changes made under this ADR

| File | Change | Why |
|---|---|---|
| `AGENTS.md` | "Never commit on `main` or `feat/*`" becomes "Never commit on `feat/*`", plus: work on `STATE.integrationBranch` (local `main`); a push of `main` deploys and needs the owner's yes; a cloud session works on `agent/s0-wip` and pushes only as an owner ADR allows. | ADR-0005 decision 6; ADR-0007; ADR-0009 |
| Master header | Revisions line cites this ADR. | Record of the change |
| Master §3.2 | Review topology lists the adversarial reviewer for every slice. | `next-slice.mjs` `MANDATORY_REVIEWERS`; code-architecture-harness-1 L4 (no document required the role that leads into ACCEPT) |
| Master §3.4 | The integration branch is local `main`; "Nobody commits on `main` or `feat/*`; local `main` stays equal to `origin/main` …" becomes "Nobody commits on `feat/*`", with the push rule and the cloud-session sentence. | Rule 5 above |
| Master §3.5 | The "Open owner question … `SCHEMA_BUMP` …" paragraph is removed; §3.5 is again the owner's text. | Rule 7 above; ADR-0004 decision 3 |
| Master §11.1 | The S4 flow goes `HANDOFF → NEXT_SLICE` (the session ends), then `MULTIPLAYER_READINESS_GATE` in a new session. | `scripts/agent/lib.mjs` `TRANSITIONS` (`HANDOFF` leads only to `NEXT_SLICE`; `NEXT_SLICE` to the gate only after an accepted S4); code-architecture-harness-1 L2 |
| Master §29 | "Recommended local branch: `agent/aquariumgo-local-stack-20261005`" becomes "Local integration branch: `main`", noting the old branch is no longer used. | ADR-0005 decision 6 |
| `OPERATIONS.md` §2 | "a schema bump" leaves the list of owner approvals, with a sentence giving the schema rule; `SCHEMA_BUMP` leaves the owner-gate reasons. Both contradicted ADR-0005 decision 1. | Rule 7 above |
| `OPERATIONS.md` §4 | `HANDOFF → NEXT_SLICE` for every slice; `NEXT_SLICE → MULTIPLAYER_READINESS_GATE` replaces `HANDOFF → MULTIPLAYER_READINESS_GATE`; a new "After S4" paragraph. | `lib.mjs` as above; `next-slice.mjs`; `bootstrap-check.mjs` |
| `OPERATIONS.md` §6 | Checkpoint step 2: reviewers re-run gates. New step 5: `git bundle create` to `/Volumes/Dev/Backup Projects/AquariumGo/` and `git bundle verify`, recorded; a cloud session records it as not run. Old step 5 becomes 6 and runs `next-slice.mjs`. New "Starting the next slice" paragraph describing `next-slice.mjs` as the script does it. | ADR-0006 decision 1 and its Consequences (HARNESS-008); code-architecture-harness-1 L1; the `next-slice.mjs` header cites this section |
| `OPERATIONS.md` §7 | `adversarial` required for every slice; reviewers re-run the gates their verdict depends on, with the plain commands; a "What the checks can't catch" list. | adversarial-1 F2 ("The real control is an independent agent re-running the gates on the checkpoint tree; OPERATIONS §6 should say so"); adversarial review M08; code-architecture-harness-1 L4; the list cites adversarial-1 F10 and BACKLOG B-103, B-107, B-109, B-133, B-137, B-161, B-173, B-185 |
| `OPERATIONS.md` §8 | A cloud-session bullet (no `/Volumes/Dev`, work survives only if pushed under an owner ADR, the expected branch warning, Chromium checked rather than assumed). The sandbox bullet says the owner decided browser work runs from the desktop app. | ADR-0009; ADR-0004 decision 2 |
| `prompts/MASTER_ORCHESTRATOR_PROMPT.md` | "Never commit on `main` or `feat/*`" corrected as in AGENTS.md; the readiness gate runs in a new session after S4's handoff; the acceptance list names the adversarial review. | As above |
| `design/DESIGN_REGISTRY.json` | New `DESIGN-S3C-LINES` (`PENDING_OWNER_DESIGN`, S3-C; blocks the multi-line Production UI, not the S3-C simulation DESIGN-0.5 §11 covers). DESIGN-0.5 `overriddenBy` gains the Social dev-only row (D2, D5, §13; ADR-0005 decision 3, SOC-011) and the §11.1 single-line row; the §3.3 row cites ADR-0005 decision 1. DESIGN-S3D's `doesNotBlock` no longer says S3-C is free of design dependencies. | ADR-0005 decisions 1, 3 and 6; adversarial review M35 |
| `decisions/INDEX.md` | Row for this ADR, before ADR-0009. | Index |
| `decisions/ADR-0008-docs-corrections.md` | This file. | — |

Not changed, because nothing in them was made wrong by these decisions: `CLAUDE.md` (it has no branch rule),
`README_FIRST.md`, `prompts/KICKOFF.md` and `prompts/ROLE_PROMPTS.md`. `docs/agent/BACKLOG.md` is new and isn't a
protected file.

## Alternatives considered

- Editing ADR-0002 and ADR-0003 in place: rejected; accepted ADRs are never edited, and `protect.mjs` fails on an
  edited ADR once hashes are recorded.
- Fixing only the docs and leaving the ADR claims: rejected; a fresh agent reading ADR-0002's Verification would run
  `relaunch.mjs --self-test`, which at `c774d38` would have started the real launcher once its pre-flight passed
  (adversarial-1 F5).
- Keeping a `SCHEMA_BUMP` owner gate as extra caution: rejected; the owner answered (ADR-0005 decision 1), and a rule
  the owner didn't make shouldn't stand in for one.

## Consequences

- The written branch rule matches `STATE.integrationBranch` (`main`); "never commit on main" is gone from AGENTS.md,
  the master and the orchestrator prompt.
- Reviewer work grows: every slice has an adversarial reviewer, and reviewers re-run gates.
- S0's `STATE.requiredReviewers` (`code-architecture`, `security-data`) doesn't list `adversarial`. `HANDOFF.md` step 8
  already runs one; the orchestrator adds it to STATE (outside this ADR's files).
- `scripts/agent` has no backup step; the bundle is a manual, recorded checkpoint step until a script does it.
- `protect.mjs --update` checks that the approving ADR has a non-empty "Owner approval" section, not its Status line.
  The owner's answer is recorded below, so it may now be run with ADR-0008 (`HANDOFF.md` step 7).

## Verification

- These find nothing:

  ```bash
  grep -n 'commit on `main`\|commits on `main`' AGENTS.md CLAUDE.md docs/agent/README_FIRST.md \
    docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md docs/agent/OPERATIONS.md docs/agent/prompts/*.md
  grep -n SCHEMA_BUMP docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md docs/agent/OPERATIONS.md
  ```
- `DESIGN_REGISTRY.json` parses, and `validateRegistry` in `check-state.mjs` reports no errors.
- The `OPERATIONS.md` §4 table matches `TRANSITIONS` in `scripts/agent/lib.mjs`, and §6's description matches
  `scripts/agent/next-slice.mjs`.
- An independent reviewer checks this diff against this ADR (`OPERATIONS.md` §10), then
  `node scripts/agent/protect.mjs --update --adr ADR-0008` (`HANDOFF.md` step 7) and `node scripts/agent/protect.mjs`
  exits 0.

## Owner impact

Yes. Owner-only protected files change: `AGENTS.md`, the master, `OPERATIONS.md` and a prompt (master §54). The
owner's explicit approval of this ADR is required before it becomes Accepted.

## Owner approval

Given 2026-10-05 by the owner in the top-level cloud session (claude.ai/code, session
`fb16c5d5-671a-5220-bdec-f4fad52a7de1`), after the orchestrator read this ADR and the diff it covers.

Question (verbatim): "ADR-0008 corrects the harness docs to match your earlier answers:
- "Never commit on main" becomes "never commit on feat/*": local main is the integration branch (ADR-0005), and a push of main still needs your yes.
- The SCHEMA_BUMP owner gate is removed (your save answer in ADR-0005 replaced it).
- OPERATIONS.md gains the checkpoint backup step (a git bundle to your Backup Projects folder), the next-slice procedure, reviewers re-running the gates, a "what the checks can't catch" list, and a note for cloud sessions.
- Wrong claims in ADR-0002/0003 are corrected (e.g. a --self-test flag that never existed).
- The registry adds the pending multi-line Production design and the Social dev-only override.
The builder also made a few extra small edits: every slice gets an adversarial reviewer, and the multiplayer gate runs in a new session after S4. Approve it?"

Owner's answer (selected option): **"Approve as written (Recommended)"**, described as: "ADR-0008 becomes Accepted
with your words recorded; I commit the doc changes and lock the protected-file hashes under it (step 7)."

Scope: the protected-file changes listed in section 5, as written, including the extra edits named in the question.

Earlier owner words this work rests on, quoted from accepted ADRs:

- ADR-0006 (2026-10-05): "just put it on my dev drive in a backup projects made folder we can decide on public as we
  get closer. so just run "where the next session starts" then after do the after that comes your part?" ADR-0006
  decision 3 records this as authorizing `HANDOFF.md` next steps 1-8 and then step 9. Step 3 of those steps is these
  doc corrections.
- ADR-0005 decision 6 (2026-10-05): "I'm just finalizing the designs now to give to you. what we need to do is make
  sure this is local main, update everything we have and haven't done, prune old info, add new info to update our
  docs and next chunk I'll have fed the designs in"

Neither quote approved the specific wording; the owner's answer above does.
