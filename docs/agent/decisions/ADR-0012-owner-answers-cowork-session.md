# ADR-0012 — Owner answers in the Cowork session: reviewer subagents, how the cloud work reached local main, who runs the Mac gates

**Status:** Accepted\
**Date:** 2026-10-06\
**Slice:** S0\
**Requirements:** HARNESS-025, HARNESS-001, HARNESS-017, HARNESS-018, REL-001

## Context

The cloud session (`fb16c5d5-671a-5220-bdec-f4fad52a7de1`) ended with its work on the remote branch `agent/s0-wip`
(`b243b23`). `HANDOFF.md` asked the next session, on the Mac, to fast-forward local `main` to it, to run the unit and e2e
gates natively on the Mac, and to run the step 8 independent reviews with fresh subagents.

The owner started this session in Claude Cowork (the Claude desktop app). Its shell on the Mac is a sandboxed Linux VM
that mounts `/Volumes/Dev`. Its network blocks github.com and the npm registry, it can't delete files in the mounted
folder, and the repo's `node_modules` hold macOS builds, so vitest, vite and Playwright can't run there. ADR-0009's
approval of reviewer subagents covered the cloud session only.

The owner answered four questions in this top-level session. They are recorded word for word under "Owner approval"
(`OPERATIONS.md` §2).

## Decisions

1. **Reviewer subagents.** For this session (Claude Code session id `9fb166e0-94f7-5c6b-881e-3278c698d633`), the
   orchestrator may run fresh, independent reviewer subagents for `HANDOFF.md` step 8: requirements, code-architecture
   (game and config part), code-architecture (harness part), security-data and adversarial. It may also run a new
   reviewer instance after each repair. They follow `CLAUDE.md` and `OPERATIONS.md` §7, and subagents never push. The
   approval ends with this session and covers no builder subagents.
2. **How `b243b23` reached local `main`.** This records the method the owner chose ("Apply verified bundle", then
   "Apply it in place"). Steps taken:
   - The preconditions held: `/Volumes/Dev` mounted, a clean tree, and `main` at
     `8c5700df22f353c918c1bcf491b16c2d01738410`.
   - `git fetch origin agent/s0-wip` failed in the sandbox (the proxy returned HTTP 403).
   - The branch was fetched from GitHub in the agent's cloud workspace: `b243b23236109f5e69c9dbef7b1d1270bb89d11c`, a
     fast-forward of `8c5700d` by 19 commits.
   - It was written as a git bundle, `.agent-runs/sync/aquariumgo-s0-wip-b243b23.bundle` (SHA-256
     `ac84ebc685866750fcf1670022b26b991d7ff6260c8fde18aaf52047298d075f`), checked with `git bundle verify` and fetched
     into `refs/remotes/origin/agent/s0-wip`.
   - `git merge --ff-only` replaces each file by unlinking it, which the sandbox refuses, so the fast-forward was applied
     in place:
     - each of the 37 modified files was first checked to match `8c5700d` byte for byte;
     - all 58 changed files (21 added, 37 modified, all mode 100644) were then written byte for byte from `b243b23`;
     - `main` was moved with `git update-ref`, with the old value checked, and `ORIG_HEAD` set to `8c5700d`;
     - the index was rebuilt with `git read-tree -m -i 8c5700d b243b23`.
   - Afterwards `git status` was clean, and the index and the work tree equal `b243b23`'s tree. `package-lock.json` didn't
     change, so there was no `npm ci`. Nothing was pushed.
   - Side effects:
     - Two temporary pack files that git couldn't unlink remain in `.git/objects/pack/` (`tmp_pack_*` and `tmp_idx_*`,
       hard links to the received pack). Git's own `prune` removes them once they are two weeks old.
     - Empty lock files that git couldn't unlink were moved into the ignored folder `.agent-runs/sync/`, so they can't
       block git.
3. **The Mac-native gates.** The owner runs the unit and e2e gates natively on the Mac with one Terminal command the
   orchestrator provides (`node scripts/agent/verify-slice.mjs --gates unit,e2e`), which records its own evidence. The
   orchestrator then checks the logs, the manifest and `STATE.json`. The sandbox never runs `npm ci` or `npm install`
   into the Mac's `node_modules`.

## Alternatives considered

- **Sync:** the owner running `git fetch` and `git merge` in Terminal, computer use, or granting delete permission on
  `/Volumes/Dev` for this session. Offered, not chosen.
- **Gates:** computer use driving Terminal, or leaving the two gates pending. Offered, not chosen.
- **Reviews:** asking before each reviewer, or no subagents. Offered, not chosen.

## Consequences

- Step 8 can run in this session.
  - Reviewers work in a separate cloud checkout of the candidate commit, because the Mac sandbox can't run vitest. They
    re-run there the gates their verdicts depend on.
  - The orchestrator copies each report unchanged into `docs/agent/evidence/S0/reviews/` and records it with
    `capture-evidence.mjs --review`.
- The reflog of `main` shows the in-place fast-forward ("merge origin/agent/s0-wip: Fast-forward (applied in place from
  the Cowork sandbox, owner's choice)") instead of an entry written by `git merge`.
- The reviewers' cloud checkout has fewer CPU cores than the owner's Mac, so BF-003's wall-clock test is likely to fail
  there under load. That is environmental, and it is never a reason to loosen or retry the test.

## Verification

- Before this ADR: `git rev-parse main` printed `b243b23236109f5e69c9dbef7b1d1270bb89d11c`. After the index rebuild,
  `git diff --cached --quiet b243b23` and `git diff --quiet` both exited 0, and `git status` was clean.
- `node scripts/agent/check-state.mjs` exited 0 at `b243b23`. This session's bootstrap assertion
  (`evidence/S0/bootstrap-20261006T012944Z.json`) passed `bootstrap-check.mjs`, recorded in `evidence/S0/manifest.json`
  under the label `bootstrap-check`.

## Owner impact

Yes. These are the owner's own decisions.

## Owner approval

Given 2026-10-06 (UTC; the evening of 2026-10-05 in Denver) by the owner in this top-level Cowork session.

Question 1 (verbatim): "How should I bring agent/s0-wip (b243b23) onto local main?"

Owner's answer (selected option): **"Apply verified bundle (Recommended)"**, described as: "I copy the 19 commits I
fetched from GitHub into the ignored .agent-runs folder, verify them, point origin/agent/s0-wip at b243b23, then run git
merge --ff-only. Same commits and SHAs as a direct fetch."

Question 2 (verbatim): "How should the unit + e2e gates run natively on your Mac (HANDOFF step 2)?"

Owner's answer (selected option): **"I'll run one command (Recommended)"**, described as: "When it's time, I give you
one Terminal command (verify-slice.mjs --gates unit,e2e). It records the evidence itself, and I check it."

Question 3 (verbatim): "May I run fresh reviewer subagents for step 8 in this session? (I'll record your answer word
for word in ADR-0012.)"

Owner's answer (selected option): **"Yes, reviewers (Recommended)"**, described as: "Fresh, independent reviewer
subagents for step 8 (requirements, 2x code-architecture, security-data, adversarial), plus a new one after each repair.
They never push."

Question 4 (verbatim): "The bundle is in: origin/agent/s0-wip now points at b243b23 on your Mac, and all 19 commits'
objects check out. But my sandbox can't delete files in your folders, and git replaces each changed file by deleting the
old copy and writing a new one, so `git merge --ff-only` would fail partway from here. How should I finish the
fast-forward? (Side note: the same rule left two temporary pack files, about 415 KB, in .git. They're harmless, and git
removes them during its normal cleanup.)"

Owner's answer (selected option): **"Apply it in place"**, described as: "I overwrite the 58 changed files byte-for-byte
from b243b23 (no deletes), move main to b243b23 and rebuild the index, then prove it with a clean git status. Same
result, but not a literal git merge."

Scope: decision 1 for this session only; decisions 2 and 3 as written. None of these answers approves a push, PR,
deploy or any other remote action.
