# HANDOFF

<!-- generated:start -->
(regenerate with `node scripts/agent/handoff.mjs --write`)
<!-- generated:end -->

## Verified complete
- S0-T1 to S0-T3: baseline verified at `0d9fc5a` (= origin/main); typecheck, unit (151 files, 1,753 tests), build and
  diff check passed (`evidence/S0/manifest.json`); integration branch created; the owner's harness committed unchanged
  as `94de6bb`.
- S0-T4, S0-T5, S0-T7, S0-T9: harness revision (ADR-0003): `OPERATIONS.md`, the `scripts/agent/` set with its own
  tests, STATE and REQUIREMENTS schema 2, design registry and intake, reconciled master, prompts and templates, and
  trustworthy gate configuration. Pending the independent review (S0-T10).
- S0-T8 (partial): contained game fixes, each with a test that fails on the original code and passes with the fix
  (listed in `BACKLOG.md` under "Fixed in S0").

## Verified failing
- e2e: not run. Headless Chromium can't start in Claude Code's sandboxed shell (`evidence/S0/baseline-failures.json`
  BF-001). Needs the owner's decision on how browser work runs.

## Evidence references
- `docs/agent/evidence/S0/manifest.json`, `evidence/S0/logs/`, `evidence/S0/baseline-failures.json`
- `docs/agent/evidence/S0/reviews/` (the adversarial review of the harness and repo, and the S0 diff reviews)

## Relevant ADRs
ADR-0001, ADR-0002, ADR-0003 (`decisions/INDEX.md`).

## Risks
- e2e and browser QA can't pass from a sandboxed session (BF-001).
- S3 will stop at an owner gate unless the S3-D design (DESIGN-S3D) is approved first.
- Several approved-design statements are wrong about today's code; their errata are in `BACKLOG.md` and must be
  applied in the S1-S4 slice contracts.

## Owner questions
See the "Owner questions" section in `BACKLOG.md`; answers are recorded verbatim in ADR-0004.

## Exact next legal action
Finish S0-T6 (requirements registry review), S0-T8 (remaining contained fixes) and S0-T10 (independent review of the
S0 diff), then S0-T11 (a fresh session's bootstrap check) and S0-T12 (owner review, acceptance and checkpoint).

## Required first reads
`docs/agent/README_FIRST.md` (canonical order), then `BACKLOG.md`.

## Forbidden actions
No push, PR, deploy, remote mutation, multiplayer, product feature work, version bump, or protected-file edits without
the ADR process (`OPERATIONS.md` §10).
