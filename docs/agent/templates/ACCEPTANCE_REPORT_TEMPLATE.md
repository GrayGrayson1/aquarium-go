# ACCEPTANCE REPORT — S#

Write to `docs/agent/evidence/S#/acceptance-report.md`.

## Verdict
GREEN | YELLOW | RED

## Checkpoint SHA
The candidate commit, its code tree (`codeTreeOf`) and the checkpoint tag.

## Requirements completed
Output of `node scripts/agent/requirements-audit.mjs`, and every requirement closed in this slice.

## Commands and results
Each gate from `manifest.json`: command, exit code, counts, log path and hash, code tree. List every re-run.

## Flaky or environment-limited gates
Gates that failed and then passed on the same code tree, and gates that couldn't run here (with their classification).

## Test inventory
`node scripts/agent/test-inventory.mjs` against the previous slice: added, removed (with `test-changes.json` approval)
and newly skipped tests.

## Browser QA
## Specialist reviews
Each required role: report path, verdict and reviewed code tree.

## Adversarial findings
## Repairs performed
Defect ids, attempts and strategies (from the ledger's repair events).

## Remaining limitations
## Performance
## Persistence/state
## Diff summary
`git diff --stat <previous checkpoint>..<candidate>`, gate-defining and deploy files called out.

## Handoff readiness
`node scripts/agent/check-state.mjs` output in the accepted state.
