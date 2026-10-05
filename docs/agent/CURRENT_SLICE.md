# CURRENT SLICE

**Slice:** S0 — Autonomous Harness, Baseline and Architecture Lock\
**Status:** NOT STARTED\
**Machine state:** BOOTSTRAP

## Objective

Install and prove the durable orchestration system before product feature work.

## First tasks

1. Verify local Git status/SHA without discarding anything.
2. Run and capture the baseline test matrix.
3. Create/validate the local integration branch.
4. Install/validate agent state, ledger, evidence and context helpers.
5. Reconcile the approved design contract against the actual local checkout.
6. Run a fresh-agent bootstrap test.
7. Independently review the harness.

## Required gates

- typecheck
- unit suite
- build
- E2E
- git diff hygiene
- requirements audit
- independent code/architecture review

## Forbidden

No push, PR, deploy, remote mutation, multiplayer implementation, or product feature work before S0 acceptance.
