# ADR-0013 — Owner answers after the S0 reviews: builder subagents for the repair round, the unit gate counts from the Mac, stricter owner-approval checks

**Status:** Accepted\
**Date:** 2026-10-06\
**Slice:** S0, and ALL for decisions 2 and 3\
**Requirements:** HARNESS-004, HARNESS-006, HARNESS-018, HARNESS-023, HARNESS-025, HARNESS-028, REL-001

## Context

All four step 8 reviews of `fd9ed14` (code tree `4d29120a`) came back RED: `requirements-3`,
`code-architecture-game-2`, `code-architecture-harness-2` and `security-data-2`. Their findings need repairs to:
- `scripts/agent/**`;
- `src/persistence` and `src/game`;
- the requirements registry and the S0 evidence files.

ADR-0012 approved reviewer subagents only.

The only unit run on this code tree, in the cloud on 4 cores, failed BF-003's wall-clock test. It also showed BF-002's
"Timeout calling onTaskUpdate" error, caused by a single test that ran for 68 s. ADR-0010's setup file can't prevent
that case. The owner's Mac passed the unit gate at the baseline.

`code-architecture-harness-2` F1 and `security-data-2` M2 found that every owner-approval check in the scripts accepts
any committed, indexed ADR. ADR-0011 open point 2 asked whether an approving ADR must list the files it covers.

The owner answered three questions in this top-level session. They then asked for a plain explanation, got one, and
confirmed the answers. All of it is recorded word for word under "Owner approval" (`OPERATIONS.md` §2).

## Decisions

1. **Builder subagents for the S0 repair round.**
   - For this session (Claude Code session id `9fb166e0-94f7-5c6b-881e-3278c698d633`), the orchestrator may run builder
     subagents to repair the findings of the four step 8 reviews: the harness scripts and their tests, the save fix, and
     the registry and evidence corrections.
   - Builders work in the agent's cloud workspace. The orchestrator checks their changes and applies them as local
     commits on `main`.
   - Every repaired tree gets fresh reviewer instances (ADR-0012 decision 1).
   - Subagents never push. This approval ends with this session.
2. **The unit gate counts only from the owner's Mac.**
   - The unit gate (`npm test`) passes or fails on the owner's native Mac run: `verify-slice.mjs` run in Terminal
     (ADR-0012 decision 3).
   - No test changes, no loosened budget and no retries.
   - Runs in the cloud or in the Cowork sandbox are recorded as evidence, but they don't decide the gate.
   - This answers `HANDOFF.md` owner question 1 with option (a).
   - It is the owner's acknowledgement of BF-002 and BF-003 in `baseline-failures.json`: both are failures of slower or
     busier machines. BF-002 is reclassified as mitigated, not fixed. ADR-0010's setup file covers a long file of short
     tests, but not a single test that runs for more than 60 s.
   - HARNESS-006's criteria are reworded to say so. A failure on the owner's Mac is still a real failure.
3. **Stricter owner-approval checks.**
   - The harness scripts accept an ADR as the owner's approval only when it has an "## Owner approval" section containing
     the owner's verbatim words. The template's placeholder text doesn't count.
   - This applies to gate waivers, repair overrides, leaving `OWNER_GATE` or `BLOCKED_MANUAL_REVIEW`, remote and
     multiplayer approvals, and `protect.mjs --update`. It also applies to every other place where the scripts take an
     ADR as the owner's approval: owner-decision events and design approvals.
   - When `protect.mjs --update` covers a changed owner-only file, the ADR must also name each owner-only file it lets
     change.

## Alternatives considered

- **Repairs:** the orchestrator fixing them itself, or stopping for today. Offered, not chosen.
- **Unit gate:** isolating the slow and wall-clock tests from the parallel suite (a gate-configuration change), or
  deciding later. Offered, not chosen.
- **Approvals:** requiring only the verbatim words, or keeping today's behaviour. Offered, not chosen.

## Consequences

- The repairs go ahead in this session as defects `D-S0-4` onward. Each attempt is logged with
  `record-event.mjs --kind repair`.
- Vitest can't run in the cloud workspace or in the Cowork sandbox, so game-code repairs are verified in two steps: the
  owner's Mac run of every gate on the repaired tree, then fresh reviewers. The adversarial review runs last.
- In `baseline-failures.json`, BF-002 becomes "mitigated", and BF-002 and BF-003 both cite this ADR as the owner's
  acknowledgement. BF-001 (e2e) stays open until a real e2e run on the Mac, or a separate owner ADR.
- The approval checks change `scripts/agent/**`, which is protected and gate-defining. The repair ADR records the change,
  including how ADRs written before the "## Owner approval" convention are treated, and an independent reviewer signs it
  off (`OPERATIONS.md` §10).
- Approvals recorded before this ADR keep their standing.

## Verification

- The repaired harness tests check every approval path with an ADR that lacks the section (refused) and one that has it
  (accepted). They also check `protect.mjs --update` with a changed owner-only file that the ADR doesn't name (refused).
- The next unit record that counts is a `verify-slice.mjs` run on the owner's Mac, on the repaired tree.

## Owner impact

Yes. These are the owner's own decisions.

## Owner approval

Given 2026-10-06 (UTC; the evening of 2026-10-05 in Denver) by the owner in this top-level Cowork session.

Question 1 (verbatim): "May I use builder subagents for the repairs (harness scripts and their tests, the save fix, the
registry and evidence corrections)? Every repair gets a fresh re-review; nothing is pushed. I'll record your answer word
for word in an ADR."

Owner's answer (selected option): **"Yes, builders (Recommended)"**, described as: "Builder subagents make the repairs
in my cloud workspace. I apply them to your repo as local commits, then run fresh reviewers on the result."

Question 2 (verbatim): "How should the unit gate count, given BF-002 and BF-003 (a 68-second test and a wall-clock
timing test both fail under parallel load on slower machines)?"

Owner's answer (selected option): **"Mac only (Recommended)"**, described as: "The unit gate counts only from your
Mac's native run, where it passed at the baseline. No test changes. HARNESS-006's wording is updated to say so."

Question 3 (verbatim): "To close the owner-approval gap, should the scripts require that an approving ADR contain your
verbatim words AND name each owner-only file it lets change (ADR-0011 open point 2)?"

Owner's answer (selected option): **"Yes, require both (Recommended)"**, described as: "Waivers, repair overrides,
owner-gate exits, remote approvals and protected-file updates all need an ADR with a real "Owner approval" section.
Protected-file updates also need the ADR to list each owner-only file it lets change."

The owner then wrote (verbatim): "eli5 those questions and answers". The orchestrator explained the three questions in
plain words, then asked (verbatim): "Now that they're explained, do you want to keep those three answers? (I'll record
them word for word in ADR-0013 before any repair starts.)"

Owner's answer (selected option): **"Keep all three"**, described as: "Builders do the repairs, the unit gate counts
from your Mac only, and approvals need your exact words (plus the file list for owner-only rule files)."

Scope: decision 1 for this session only; decisions 2 and 3 as written. None of these answers approves a push, PR,
deploy or any other remote action.
