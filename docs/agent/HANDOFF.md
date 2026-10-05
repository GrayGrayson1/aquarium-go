# HANDOFF

_Written 2026-10-05 at the end of the harness-review session (context full). Read this first, then
`docs/agent/README_FIRST.md`. Verify everything below against Git; don't trust it blindly._

## Where we are
- **Slice S0, machine state IMPLEMENT, in a repair round.** Five independent reviews of the S0 work came back
  RED or YELLOW. The repairs to the harness scripts are written but **untested**. The game-code repairs have **not
  started**.
- **Branch:** local `main` is the integration branch (owner decision, ADR-0005 #6). It holds all the work below.
  `agent/aquariumgo-local-stack-20261005` points at the same commit and can be deleted. **Nothing has been
  pushed.** A push of `main` deploys GitHub Pages; Render deploys through its CLI. Both need the owner's recorded
  yes.
- **The latest commit is a WIP commit** ("S0 WIP: repair round in progress"): the harness-script repairs,
  ADR-0004/0005, the review reports and the requirements draft. Earlier commits on top of `0d9fc5a` (v0.4.0):
  `94de6bb` (owner's harness unchanged) → `62df438` (harness revision) → `8a4c6c8` (gate config) → `2ef1ff7`
  (architecture lock and locale fix) → `3e00a32` (atomic mutateFast) → `dfc0a13` (offline market speed, **wrong,
  must be reverted**) → `6347c5d` (crafted saves, partial) → `16233a1` (equipment grace) → `c774d38` (hidden-tab
  overlap).

## Owner decisions this session (verbatim in the ADRs)
- **ADR-0002:** branch plus local commits; fix contained bugs and log the rest; sessions stop at slice boundaries,
  with an opt-in relauncher; S3-D designs come from the owner through design intake.
- **ADR-0004:**
  - no push guards for now (text rules only);
  - browser tests run in the next session from the Claude desktop app (BF-001);
  - keep all of ADR-0003's tightened rules.
- **ADR-0005:**
  - old v0.4.0 saves don't matter, so a schema bump is allowed, but saves must be sound going forward (PERSIST-003:
    never overwrite a newer-format save);
  - dev write tools only with `?dev=1` (PLAT-005);
  - Social is dev-mode only (SOC-011);
  - rarity: keep today's rule, and build a counting tool now (`npm run report:rarity`, GEN-013, not built yet);
  - S3-D stays in S3;
  - multi-line Production screens come with the owner's designs (DESIGN-S3C-LINES);
  - **local main is the integration branch**;
  - back up each checkpoint to another drive (folder not named yet, HARNESS-008).

## Review results (all in `docs/agent/evidence/S0/reviews/`)
- `adversarial-review-2026-10-05.json`: 15 reviewers plus skeptics (404 agents). Its `synthesis.merged` holds 101
  findings, each with an action class; `synthesis.questions` holds 57 owner questions, mostly still open.
- `code-architecture-harness-1.md` **RED** (H1-H5, M1-M13, L1-L13); `security-data-1.md` **RED** (SD-1..);
  `adversarial-1.md` **RED** (43-row bypass table); `code-architecture-game-1.md` **YELLOW**;
  `requirements-1.md` **RED** (fixed in the draft, not yet re-reviewed).

## Exact next steps (in order)
1. Repair the game fixes (brief in the reports above):
   - Revert `dfc0a13`'s change in `src/sim/economy/listings.ts`: the original code was right, only its comment was
     wrong. Bids made during a catch-up must last 3-6 real minutes after the player returns at the saved speed.
     Replace `tests/sim/fix-econ-offline-market-speed.test.ts` with a test of that promise.
   - `src/game/GameLoop.tsx`: zero `done` only when nothing was published (check that the store game is unchanged),
     so a subscriber that throws doesn't make time run away. Add tests for that and for a throw after several
     slices.
   - Finish crafted-save hardening (SD-1/SD-2): make map ids equal their keys, sanitize every id-valued field in
     `repairState`, and add a seeded fuzz test.
   - Make the guard tests read files asynchronously (they time out the Vitest worker under load) and extend the
     determinism regexes.
   - Write the layer matrix into `docs/ARCHITECTURE.md`.
2. Update `scripts/agent/agent.test.mjs` to the repaired script APIs, which changed:
   - `checkTransition` and the strict `parseArgs`;
   - `validateRepairs` and `repairCounts`, which replace `validateRepairCount`;
   - `reportVerdict`, `validateManifestAppendOnly`, `alarmsBetween`, `childEnv`, `nextState`, `designCitations`,
     `DISABLE_RE` and `hasOwnerApproval`;
   - `requirements.mjs`, which is new.

   Then make `node --test 'scripts/agent/*.test.mjs'` pass. **It is currently broken.**
3. Update the docs for the owner decisions:
   - AGENTS.md and the master: main is the integration branch (drop "never commit on main"); remove the SCHEMA_BUMP
     sentence from master §3.5.
   - OPERATIONS.md: the slice-start procedure (`next-slice.mjs`), backups, the S4 flow (readiness gate in a new
     session), reviewers re-running gates, what the checks can't catch, and that adversarial review is required.
   - Design registry: add DESIGN-S3C-LINES and the Social dev-only override.
   - Write ADR-0006 to correct ADR-0002/0003's wrong claims (`--self-test`, missing evidence) and to replace
     ADR-0003 rules 5 and 7, then add it to `decisions/INDEX.md`.
4. Write `docs/agent/BACKLOG.md` from `synthesis.merged` (needs-slice, owner-decision, record-only and any fix-now
   item left over), including the design errata (M15-M17, M48-M52).
5. Merge `docs/agent/evidence/S0/requirements-draft.json` (151 entries) into `REQUIREMENTS.json`, plus:
   - REL-002 and REL-003 move to ALL;
   - umbrella criteria say "closed";
   - PERSIST-001 becomes SUPERSEDED (ADR-0005), and PERSIST-003 becomes the forward-safety rule;
   - add PLAT-005, SOC-011, GEN-013, HARNESS-008 and requirements for each S0 fix.

   Then run a fresh requirements review.
6. Build `npm run report:rarity` (GEN-013).
7. Record evidence:
   - `node scripts/agent/test-inventory.mjs --baseline`;
   - `node scripts/agent/protect.mjs --update --adr ADR-0006` (needs an "## Owner approval" section);
   - `node scripts/agent/verify-slice.mjs` for every gate except e2e.
8. Run a fresh independent re-review (code-architecture, security-data, adversarial) and repair what it finds.
9. Then the owner's chunk: intake of the designs (DESIGN-S3D, DESIGN-S3C-LINES); e2e in the Claude desktop app
   (BF-001); a fresh-session bootstrap check (S0-T11); owner review; S0 acceptance, checkpoint and backup bundle.

## Open owner questions
The backup folder path; whether `docs/agent` goes public on a push; the remaining questions in
`synthesis.questions` (triage them, ask the important ones).

## Environment
- Claude Code's sandboxed shell can't start headless Chromium (BF-001).
- Reviewer scratch worktrees exist at `/Volumes/Dev/Projects/AquariumGo-review-game` and `-review-adv` (safe to
  remove with `git worktree remove`).
- Probes are in the git-excluded `scripts/_audit/H0-*`.

## Forbidden
No push, PR or deploy, no remote mutation, no multiplayer, no product features before S0 is accepted, no version
bump.
