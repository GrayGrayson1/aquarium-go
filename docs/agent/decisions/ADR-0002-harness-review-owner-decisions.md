# ADR-0002 — Owner decisions from the S0 harness review

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0, and ALL for the session-boundary protocol and design intake\
**Requirements:** HARNESS-001, HARNESS-002, HARNESS-003, HARNESS-004, REL-001

## Context

On 2026-10-05 the owner asked a Claude Code session to review the newly installed harness and the whole repo
adversarially against it, improve what needed improving, and ask every question needed for clarity. The session
asked four process questions before changing anything. The answers are recorded here word for word, so a fresh
agent can verify them instead of trusting a summary (see master §18 rule 17).

## Decisions

### 1. How harness changes are recorded

Question: "Your harness files are untracked, so once I edit them you can't diff my changes against your
originals. How should I record my changes?"

Owner's answer (selected option): **"Branch + local commits"**, described as: "Create the harness's local branch
agent/aquariumgo-local-stack-20261005, commit your files exactly as you wrote them, then put my fixes in separate
local commits. Nothing is pushed."

Done: branch `agent/aquariumgo-local-stack-20261005` was created at `0d9fc5a`. The owner's harness is committed
unchanged as `94de6bb` ("S0: add the owner's agent harness, unchanged"). Every later harness change is a separate
local commit.

### 2. Game bugs found by the review

Question: "When the review confirms real bugs in the game itself (not the harness), what should I do with them?"

Owner's answer (selected option): **"Fix safe ones, log rest"**, described as: "Fix contained, clearly correct bugs
now, each with a test and an independent review. Everything else goes into the requirements registry or backlog
for the slices."

### 3. Session boundaries (fresh context after each mega-slice)

Question: "The harness requires a fresh context after every mega-slice and also says green slices advance
automatically. One Claude Code session can't wipe its own context. How should a slice boundary work?"

Owner's answer (verbatim): "Can we have the best of both worlds? Maybe we have something that can activate the
scripted relaunch. Let's do this: let's do number one as kind of our default, with the option of making a way to
activate the scripted relaunch so it just goes automatically."

Option one was: "At each slice boundary the orchestrator writes the handoff and stops. You start a new session
with a fixed one-line kickoff."

Resulting rule:
- **Default.** At every mega-slice boundary, and at every early-rollover point (master §17), the orchestrator
  completes the rollover checklist, writes the handoff and **ends its session**. The owner starts the next session
  with the kickoff in `docs/agent/prompts/KICKOFF.md`.
- **Opt-in automatic relaunch.** `scripts/agent/relaunch.mjs`, started by the owner, starts each next session
  headlessly after a clean stop. It never runs unless the owner starts it, and it stops at owner gates,
  `BLOCKED_MANUAL_REVIEW`, `COMPLETE_LOCAL`, any session error, a session that made no recorded progress, a stop
  file, or its session cap. Starting the launcher is the owner's approval for the sessions it starts. It does not
  approve any remote action.

### 4. Design for S3-D extended automation

Question: "S3's extended automation (water reserves, feed production, operations dashboard) has no approved
screens, copy or test ids in the design spec. Who designs it?"

Owner's answer (verbatim): "I'm actually having Claude design go through those right now. If that changes anything
about how we need to run our harness and everything else that we have here, and if we need to adjust right now so
we can be in the clear and confident moving forward, then add what we need to support those designs later (because
I will have those not too long from now and I'll just be able to have you take a look at them at that time). Will
that work?"

Resulting rule:
- The harness gains a design registry (`docs/agent/design/DESIGN_REGISTRY.json`) and an intake procedure
  (`docs/agent/design/DESIGN_INTAKE.md`). The S3-D design is registered as `PENDING_OWNER_DESIGN`.
- Work that depends on a design (owner-visible surfaces, copy, test ids, and the resource and data names those
  surfaces show) may not start until that design is `APPROVED` in the registry.
- If S3-A, S3-B and S3-C are complete and the S3-D design is still not approved, the orchestrator stops at
  `OWNER_GATE` with reason `DESIGN_PENDING:DESIGN-S3D`. S3 cannot be accepted without S3-D (master §45).

## Alternatives considered

- Asking the owner nothing and editing in place: rejected, because untracked edits can't be diffed or reviewed.
- One long session with a fresh subagent per slice: rejected as the default, because the parent context keeps
  growing and isolation is weaker.
- Letting the orchestrator design S3-D itself: superseded by decision 4.

## Consequences

- The owner touches the build once per mega-slice by default, or zero times while the launcher runs.
- S3 can stop at an owner gate if the S3-D design arrives late. That is intended.
- Owner answers are now recorded verbatim in ADRs. A fresh agent may rely on an owner decision only if it is
  recorded in an ADR, the master or `STATE.json`.

## Verification

- `git show 94de6bb --stat` lists exactly the owner's 18 harness files.
- `node scripts/agent/check-state.mjs` validates the registry, state and ledger (S0 helper).
- The launcher's stop conditions are unit-tested by `scripts/agent/relaunch.mjs --self-test`.

## Owner impact

Yes. These are the owner's own decisions.
