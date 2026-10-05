# ADR-0010 — Vitest setup file: yield the worker's event loop between tests (BF-002)

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0, and ALL (the unit gate's configuration)\
**Requirements:** HARNESS-006, HARNESS-001

## Context

In the cloud session (a 4-core container), `npm test` ran every test green (161 files, 1,792 tests) but exited 1 with
"Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"" (3 errors in one run, 5 in another). The unit
gate therefore failed although no test failed.

Diagnosis, checked against the installed Vitest 3.2.7:
- A worker reports progress with an RPC call (`onTaskUpdate`) that starts a 60 s reply timer
  (`node_modules/vitest/dist/chunks/index.B521nVV-.js`, `DEFAULT_TIMEOUT = 6e4`).
- The runner moves from one test to the next on microtasks only, so a file of long synchronous simulation tests never
  lets the worker's event loop reach its I/O phase. When the loop frees up, the timers phase runs first, the 60 s timer
  fires, and the reply that has been waiting is never read.
- `tests/sim/playthrough-starters.test.ts` (6 tests, about 62 s of continuous simulation here) reproduces the error
  when run alone, at HEAD and at the v0.4.0 baseline `0d9fc5a` (temporary worktree). On the owner's Mac the baseline
  unit gate passed (`evidence/S0/manifest.json`), because the same file finishes in under 60 s there. Before `d8fb896`
  the handoff also recorded one such error on the Mac while about 15 agents were running.

It is a baseline failure that depends on machine speed and load: BF-002 in `evidence/S0/baseline-failures.json`.

## Decision

1. Add `tests/sim/setup/yield-between-tests.ts`: an `afterEach` that waits for `setImmediate`, so between tests the
   worker's event loop passes through its I/O phase and reads the RPC reply. It changes no test, assertion, timeout or
   test selection.
2. Register it in `vitest.config.ts` `test.setupFiles`.
3. BF-002 is recorded as found in the cloud session and fixed by this ADR, with the owner's acknowledgement below.

A single test that runs synchronously for more than 60 s would still trip the timer; the longest one measured here is
about 32 s (`playthrough-starters` "the long game").

## Alternatives considered

- Accept BF-002 as environment-only and count the unit gate only on the owner's Mac: offered to the owner, not chosen.
  The error can also appear on the Mac under load.
- Split or shorten `playthrough-starters.test.ts`: changes tests to suit the runner, and other long files (for example
  `fix-core-step-invariance`, about 73 s here) would need the same.
- Raise Vitest's RPC timeout: not configurable in Vitest 3.2.7.
- Retry the run: forbidden (`OPERATIONS.md` §6).

## Consequences

- The unit gate no longer fails on a slow or busy machine when every test passes.
- Each test gains one event-loop turn (well under a millisecond); 1,792 tests add a negligible amount of time.
- `vitest.config.ts` is a gate-defining, protected file (master §3.8, `OPERATIONS.md` §10): an independent reviewer
  signs off on this diff in the S0 review (`HANDOFF.md` step 8), and `protect.mjs --update` records it.

## Verification

- With the setup file applied through a throwaway config, `npx vitest run tests/sim/playthrough-starters.test.ts`
  exited 0 with no unhandled error (6 of 6 passed, 61.8 s); without it, the same command exited 1 with one
  "Timeout calling onTaskUpdate" error, at HEAD and at `0d9fc5a`.
- The full `npm test` exits 0 on this tree, recorded by `verify-slice.mjs` (`HANDOFF.md` step 7).

## Owner impact

It changes a gate-defining file and settles a baseline failure, so the owner decided.

## Owner approval

Given 2026-10-05 by the owner in the top-level cloud session (claude.ai/code, session
`fb16c5d5-671a-5220-bdec-f4fad52a7de1`).

Question (verbatim): "On this cloud machine the unit gate fails even though all 1,792 tests pass. One long test file
(playthrough-starters, about 62 s of nonstop simulation) keeps Vitest's worker busy past its 60 s internal message
timer, and Vitest then reports an error. Your v0.4.0 baseline fails the same way here; your faster Mac didn't. A
3-line setup file that lets each file pause briefly between tests fixes it: no test is changed, skipped or loosened.
It also guards your Mac when it's busy (the handoff saw one such error there). How should I handle it?"

Owner's answer (selected option): **"Fix it (Recommended)"**, described as: "Add the tiny setup file to
vitest.config.ts under a new ADR (gate-config change, checked by an independent reviewer). Record it as baseline
failure BF-002, found here and fixed."

Scope: decisions 1-3 above.
