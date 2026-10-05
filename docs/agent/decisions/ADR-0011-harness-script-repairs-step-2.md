# ADR-0011 — Harness script repairs and tests (HANDOFF step 2)

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0\
**Requirements:** HARNESS-001, HARNESS-002, HARNESS-004, HARNESS-005, REL-001

## Context

`scripts/agent/` is protected and gate-defining (master §3.8, `OPERATIONS.md` §10): changes need an ADR and an
independent reviewer's sign-off. After the RED reviews (`evidence/S0/reviews/code-architecture-harness-1.md`,
`security-data-1.md`, `adversarial-1.md`), the scripts were repaired in `7c0dbf4` (untested), and further in the
cloud session: `72c0cf7` (a snapshot of an interrupted builder's edits) and the commit that carries this ADR.
`node --test 'scripts/agent/*.test.mjs'` failed at import because `agent.test.mjs` still imported the removed
`validateRepairCount`.

## Decision

The scripts and their tests change as follows (all within `scripts/agent/`, Node built-ins only):

- **Tests.** `agent.test.mjs` uses the current APIs and covers the fail-closed cases from the three reports: 75
  tests, including every transition rule, owner-gate entry and exit, repair limits (3 distinct, 5 total), gate
  records bound to the code tree, evidence edits and paths, manifest and ledger append-only checks, deleted
  requirement ids, test ids disappearing or gaining skip markers (31 forms), protected-file changes and edited accepted
  ADRs, the relaunch stop conditions, alarms and deny rules, and unknown CLI options on 10 scripts. Each guard was
  reverted once in a scratch copy and a test failed every time.
- **Guards kept from `72c0cf7`/`7c0dbf4`:** committed-version append-only checks; repair-limit, ADR, evidence-path and
  resume-state checks in `check-state.mjs`; session checks in `bootstrap-check.mjs`; the review report path rule in
  `capture-evidence.mjs`; `expandRange` in `context-pack.mjs`; owner-approval and Accepted-status checks in
  `protect.mjs`; the requirements ADR checks; relaunch deny rules, credential stripping and remote, protected-file and
  deploy-config alarms; `DISABLE_RE`.
- **Revised:** leaving `NEXT_SLICE` needs a known session that differs from the closing one, and entering
  `NEXT_SLICE` without a session id is refused (otherwise no later session could ever leave it); the prepared view
  requires both mandatory reviewers, code-architecture and adversarial (`OPERATIONS.md` §7 after ADR-0008).
- **New fixes the tests exposed:** relaunch stops on a NaN or missing session cap; a failed `git ls-remote` raises an
  alarm and blocks the next session; `.mcp.json` and `~/.claude/settings*.json` are compared after each session; a
  `Bash(git -* push*)` deny rule; `DISABLE_RE` catches a renamed destructured runtime skip; `protect.mjs --update`
  refuses when `PROTECTED.json` doesn't match its last ledger hash or is missing while the ledger records one.
- **Refactors for testability (behaviour unchanged):** `parseRelaunchArgs`, `parseVerifyArgs`, `reviewProblems`,
  `updateProblems`, `validateManifestHistory`, `evidenceScope`, `preparedView`.

## Alternatives considered

- Loosening a guard so an old test passes: forbidden (`AGENTS.md`).
- Splitting the tests across files: not done; ADR-0008 and `REQUIREMENTS.json` cite test names in `agent.test.mjs`.

## Consequences

Open points the scripts can't settle alone (listed as owner questions in `HANDOFF.md`):
1. `OPERATIONS.md` §10 says a new protected file only warns; `compareProtected` treats it as an error (since
   `7c0dbf4`, as the reviews recommended). The doc needs an owner-approved correction.
2. Before the first checkpoint, any Accepted ADR newer than the baseline with an Owner approval section can bless
   `protect.mjs --update`; requiring the ADR to list the files it changes would be a new rule.
3. `lastAcceptedCheckpoint` isn't checked against its tag; cloud sessions never receive tags.
4. `nextState` carries `gateWaivers` into the next slice.
5. `record-event.mjs --resolved` resets a defect's counters without evidence that its gate went GREEN.
6. Deny rules match command text only; the post-session alarms are the backstop.
7. `relaunch.mjs` `main()` and `snapshot()` are not exercised by tests (only the pure functions are).

## Verification

- `node --test 'scripts/agent/*.test.mjs'`: 75 of 75 pass (run three times by the builder, once by the orchestrator).
- `node scripts/agent/check-state.mjs`: only `docs/agent/PROTECTED.json is missing` (step 7) and the expected branch
  warning.
- An independent code-architecture and security-data review of `scripts/agent/` signs off on this diff
  (`HANDOFF.md` step 8).

## Owner impact

No owner-only file changes under this ADR. The owner's go-ahead for `HANDOFF.md` steps 1-8 (ADR-0006 decision 3)
covers doing step 2; this ADR records what changed so the independent reviewers can check it.
