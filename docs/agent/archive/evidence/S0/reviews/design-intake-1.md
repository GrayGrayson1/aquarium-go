# design-intake-1 — DESIGN-S3D capture sign-off (OPERATIONS.md §10)

**Role:** Design Intake Reviewer (`design-intake`), a fresh subagent, read-only except for this file.
**Date:** 2026-10-06.

## What I reviewed

- **Scope:** the capture step only (`docs/agent/design/DESIGN_INTAKE.md` step 1), as protected-file bookkeeping. This
  is the independent sign-off on the diff that `docs/agent/OPERATIONS.md` §10 requires before
  `node scripts/agent/protect.mjs --update --adr ADR-0014` records the hashes. `INTAKE.md` doesn't exist yet and is not
  reviewed here. Nothing in this report approves the design; only the owner does that.
- **Base:** `219e9a4736c4e7d45f75d290f6e02040edbbff2a`. **Candidate:** `6a42aeb2074ebb8825c9b3d1dd8da80c4113d436`,
  whose only parent is the base. The worktree `/home/claude/work/rev-capture` is detached at the candidate.
  `git status --porcelain` was empty before and after every command I ran there.
- **Diff** (`git diff --name-status 219e9a4 6a42aeb`): 110 files (108 added, 2 modified, no mode changes), all under
  `docs/agent/design/` and `docs/agent/decisions/`:
  - added: `docs/agent/design/DESIGN-S3D/SPEC.md`, `docs/agent/design/DESIGN-S3D/SOURCE.md`, the 105 PNGs in
    `docs/agent/design/DESIGN-S3D/screens/` and `docs/agent/decisions/ADR-0014-design-s3d-deep-automation.md`;
  - modified: `docs/agent/decisions/INDEX.md` (+1 line) and `docs/agent/design/DESIGN_REGISTRY.json` (+7, −3).
- **Compared with:** the owner's handoff folder `/mnt/user-data/uploads/Projects/AquariumGo-design-handoff/DESIGN-S3D/`.
  That means `HANDOFF-S3D.md` (the change contract), the original `SPEC.md`, `SOURCE.md` and `screens/`, and the
  original ADR-0014.
- **Not read**, as the reviewer rules require: `docs/agent/HANDOFF.md`, `docs/agent/LEDGER.jsonl`, builder reports and
  commit messages. All experiments ran in throwaway clones under `/tmp`.

## Commands and exit codes

Each command ran from the worktree root, except rows marked "clone" (a `git clone` of the worktree under `/tmp`).

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `node scripts/agent/protect.mjs` | 1 | `FAILED with 110 error(s)`. 108 are "is not recorded" (the 105 PNGs, `SPEC.md`, `SOURCE.md`, ADR-0014) and 2 are "changed without a recorded approval" (`INDEX.md`, `DESIGN_REGISTRY.json`). The files named are exactly the 110 files in the diff. There is no `approvedBy`, ledger-hash or other error. |
| 2 | `CLAUDE_CODE_SESSION_ID=x node scripts/agent/check-state.mjs` | 1 | The same 110 ERROR lines (identical to #1) plus one warning, `current branch HEAD is not the integration branch main`, because the worktree is detached. Nothing else. |
| 3 | `node scripts/agent/diff-check.mjs` | 0 | `diff-check against 0d9fc5a46085f746510a1041335632cd4f7314a2: clean (0 untracked file(s) checked)` |
| 4 | `git diff --check 219e9a4 6a42aeb` | 0 | clean |
| 5 | `node --test 'scripts/agent/*.test.mjs'` | 0 | 145 tests: 145 pass, 0 fail |
| 6 | the owner-approval probe from the brief (below) | 0 | `true []` |
| 7 | the same functions run on the handoff original (its "Pending" section), as a control | 0 | `false`, and the problem `has no "## Owner approval" section with the owner's words …` |
| 8 | `approvalTextProblems` on ADR-0014 as committed | 0 | only `is Proposed, not Accepted` |
| 9 | clone at `219e9a4`: `node scripts/agent/protect.mjs` | 0 | `OK`. The base is clean, so #1 hides nothing. |
| 10 | clone at `6a42aeb`, unchanged: `node scripts/agent/protect.mjs --update --adr ADR-0014` | 1 | refused: `… is Proposed, not Accepted: a proposed ADR approves nothing yet` |
| 11 | clone, after the two-line flip and a commit: `node scripts/agent/protect.mjs --update --adr ADR-0014` | 0 | `recorded 167 protected files (110 changed) under docs/agent/decisions/ADR-0014-design-s3d-deep-automation.md` |
| 12 | clone, then `node scripts/agent/protect.mjs` | 0 | `OK` |
| 13 | clone, then `CLAUDE_CODE_SESSION_ID=x node scripts/agent/check-state.mjs` | 0 | `OK`, with only the detached-HEAD branch warning |
| 14 | clone, then `node scripts/agent/diff-check.mjs` | 0 | clean |

Probe #6, as given in the brief:

```sh
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {hasOwnerApproval, approvalTextProblems} from './scripts/agent/lib.mjs'; const t=readFileSync('docs/agent/decisions/ADR-0014-design-s3d-deep-automation.md','utf8'); const tpl=readFileSync('docs/agent/templates/ADR_TEMPLATE.md','utf8'); console.log(hasOwnerApproval(t,tpl), approvalTextProblems(t.replace('**Status:** Proposed','**Status:** Accepted'),{templateText:tpl}))"
```

Everything else below comes from read-only Python and Node scripts: byte and hash comparisons, PNG headers and JSON
comparisons.

## Results

### 1. The captured files

- `docs/agent/design/DESIGN-S3D/` holds exactly 107 files: the 105 PNGs, `SPEC.md` and `SOURCE.md`, all mode 100644.
  The file list is the same as the handoff folder's, with nothing extra and nothing missing. `HANDOFF-S3D.md` was
  correctly left out.
- All 107 files are byte-identical to the handoff originals. For each one, the SHA-256 of the committed blob and of the
  working copy equals the SHA-256 of the handoff file.
- `SOURCE.md` has 105 PNG rows and no duplicates: 26 final boards, 16 accepted additions and 63 prototype states,
  which is the split ADR-0014 decision 1 gives. The rows name exactly the files in `screens/`, and every file's SHA-256
  matches its row. `SOURCE.md` also lists 44 board files: the 42 that the PNG rows name plus the two prototype files.
  All 149 hashes in it are distinct.
- Every file name matches `^[a-z0-9]+(-[a-z0-9]+)+-(phone|desktop)\.png$`, so it follows
  `<screen>-<state>-<viewport>.png`.
- All 105 files are valid PNGs that end in IEND.
  - The 52 phone files are 390×844 and the 53 desktop files are 1440×948, as `SOURCE.md` says.
  - 104 files are 256-colour palette images and exactly one, `home-manual-on-phone.png`, is full colour, also as
    `SOURCE.md` says.
  - Each file has the C2PA `caBX` chunk that `SOURCE.md` mentions (Anthropic content credentials, with no e-mail
    address or other personal string) and no text or EXIF chunk.
  - None is blank. I opened two, `livestock-production-new-line-step-1-phone.png` and
    `operations-issues-locked-before-desk-desktop.png`. Each shows what its name and SPEC §8.6.1 or §7.8 describe.
- The PNGs add 28,405,921 bytes in total. DESIGN_INTAKE.md step 1 requires them to be in the repo.

### 2. ADR-0014

- **(a) Nothing above the section changed.** Lines 1–317 (through `## Owner approval`, 22,086 bytes) are
  byte-identical to the handoff original. The only change replaces the original's lines 319–322 (`**Pending.** …` and
  item 1 of "Next") with lines 319–363. The original's items 2 and 3 follow unchanged, and no section comes after it.
- **(b) The harness's test.** Probe #6 prints `true []`. The same test fails on the original (#7). On the committed
  text the only problem is the Status (#8), so the ADR passes once its Status line says Accepted.
- **(c) Scope.** Lines 347–353 cover:
  - `SPEC.md`, `SOURCE.md` and the 105 PNGs;
  - this ADR and its INDEX row;
  - the DESIGN-S3D registry entry at RECEIVED, and then at UNDER_REVIEW;
  - `INTAKE.md`;
  - `protect.mjs --update --adr ADR-0014` for those files.

  Lines 355–356 say the ADR doesn't approve the design, doesn't set DESIGN-S3D or DESIGN-S3C-LINES to APPROVED and
  approves no push, PR, deploy or other remote action. The scope stays within the capture and the intake note.
- **(d) Owner-only files.** The ADR names none of the nine `OWNER_ONLY` entries in `scripts/agent/protect.mjs`: the
  `lib.mjs` function `namesPath` returns false for each. None of the 110 changed files is owner-only (checked with
  `isOwnerOnlyPath`).
- **(e) Consistency.**
  - Between them, the two questions list exactly the items in the Scope bullets. The first lists `SPEC.md`,
    `SOURCE.md`, the 105 screens, the ADR, the index row and the registry's RECEIVED entry, and asks to lock them. The
    second lists `INTAKE.md` and UNDER_REVIEW, and asks to lock them too.
  - "The ADR-0014 number you reserved" matches INDEX.md's ADR-0015 row ("ADR-0014 is reserved for the DESIGN-S3D
    intake"). No other ADR-0014 file exists.
  - The section uses the same layout as Accepted ADR-0016: the owner's typed message, then each question, then
    "Owner's answer (selected option)" with the option's description and the other option offered.
  - ADR-0014 doesn't exist at the protect.mjs anchor (`STATE.actualBaselineSha` `0d9fc5a`; `lastAcceptedCheckpoint`
    is null), so `--update` can use it.

### 3. decisions/INDEX.md

- Exactly one row was added (line 21), between ADR-0013 and ADR-0015. The ids run 0001–0016 in order with no
  duplicates, and every other line is identical to the base. The link target exists, and `lib.mjs`
  `findAdr('ADR-0014')` resolves it.
- Compared with the row in `HANDOFF-S3D.md`, the link, date (2026-10-05), Status (`Proposed`, the same as in the
  handoff) and Summary cells are identical. Only the Owner decision cell differs. It changed from "Answers recorded;
  approval pending" to "Capture: yes (2026-10-06); design approval pending".
- **Judgement: accurate.** The owner approved the capture on 2026-10-06 (ADR-0014, Owner approval), and the design
  approval is still pending. The dropped "Answers recorded" is still covered by the Summary ("the owner's design
  answers from two rounds"). `Proposed` is the correct Status until the flip. I-2 notes one omission.

### 4. design/DESIGN_REGISTRY.json

- The file is valid JSON. The top-level keys and the DESIGN-0.5 and DESIGN-S3C-LINES entries are unchanged.
- The DESIGN-S3D entry:
  - `status` is `RECEIVED`, a value in the vocabulary;
  - `path` is `docs/agent/design/DESIGN-S3D/SPEC.md`, which exists;
  - `source` and `notes` exactly equal the values in `HANDOFF-S3D.md` (parsed and compared as JSON);
  - `approval` (null), `scope`, `blocks`, `doesNotBlock`, `title` and `id` are unchanged.
- The only new key is `notes`. `validateRegistry` in `check-state.mjs` doesn't look at it (it checks ids, statuses and
  the APPROVED rules), and command #2 reports no registry error.

### 5. Nothing outside the capture

`git diff --name-status 219e9a4 6a42aeb` lists only the 110 files above, all under `docs/agent/decisions` and
`docs/agent/design`. `STATE.json`, `LEDGER.jsonl`, `PROTECTED.json`, the code and the tests are untouched.

### 6. Gate commands

See commands #1–#5. The protected-file errors are exactly the 110 expected, check-state adds only the branch warning,
diff-check is clean and the harness tests pass.

### 7. Rehearsal of the recording step

In a clone of the candidate I changed exactly two lines, committed, then ran the update and the checks (#10–#14):
- ADR-0014 line 3, from `**Status:** Proposed\` to `**Status:** Accepted\`;
- the Status cell on INDEX.md line 21.

Results:
- Before the flip, `--update` refused (#10). After it, `--update` was accepted and recorded 167 files, 110 of them
  changed (#11).
- `PROTECTED.json` went from 59 files to 167: 108 added, 2 changed, 0 removed. The added and changed files are
  exactly the 110 files in the diff.
- `approvedBy` moved from ADR-0016 to ADR-0014. `patterns` and `ownerOnly` were unchanged.
- Verification was then clean: protect.mjs OK, check-state OK with only the branch warning, diff-check clean.

### 8. SPEC.md and SOURCE.md, capture level

- **Board titles:** every board title in `SOURCE.md` (21 titles, phone and desktop) appears in `SPEC.md`, either as a
  bracketed section reference or in Appendix A.
- **Routes and scenarios:** every prototype route is in SPEC §6 or is a 0.5 route (`#/`, `#/more`, `#/tanks`,
  `#/tanks/ember/equipment`, `#/research`). Every scenario is one of Appendix B's.
- **States:** every exported state maps to a section that describes it. For example, `operations-issues-decided` maps
  to §7.6, `tank-card-held` to §8.2 and `operations-map-room-sheet` to §7.5.
- **Paths:** all 11 repo paths in backticks in `SPEC.md` exist at the candidate. All of those in ADR-0014 exist too,
  except `INTAKE.md` (not written yet), this report (written now) and two glob patterns.
- **Accepted additions:** the stems Appendix A gives for them exist for both viewports.
- **ADR number:** the three "ADR-0014" mentions in `SPEC.md` that HANDOFF-S3D.md lists are all present, so no
  renumbering was needed.

I found no capture-level problem.

## Findings

There are no BLOCKER or MAJOR findings.

| # | Severity | File | Finding |
|---|---|---|---|
| M-1 | MINOR | `docs/agent/LEDGER.jsonl` (unchanged in this diff) | Two ledger events the process needs are not in this diff. I didn't read the ledger, so I can't say whether they were recorded elsewhere. The first is the DESIGN-S3D `PENDING_OWNER_DESIGN` → `RECEIVED` event (DESIGN_INTAKE.md step 7; HANDOFF-S3D.md step 2 puts it before the recording). The second is the `owner-decision` event citing ADR-0014. Without that event, OPERATIONS.md §2 doesn't count the approval as valid. It can only be recorded after ADR-0014 is committed as Accepted, because `record-event.mjs` and `check-state.mjs` line 355 apply `ownerApprovalProblems`. Record both after the flip commit (`record-event.mjs --kind owner-decision --decision ADR-0014 …`) and commit them. This is not a defect in the capture diff. |
| I-1 | INFO | `docs/agent/decisions/ADR-0014-design-s3d-deep-automation.md` lines 356–358 | The Owner approval section already says that an independent reviewer signed off, and cites this report's path. That becomes true once this report (GREEN) is committed. Commit it in or before the flip commit, so the path cited by the Accepted ADR (which can't change afterwards) exists. |
| I-2 | INFO | `docs/agent/decisions/INDEX.md` line 21; ADR-0014 lines 271–277 | Neither the Owner decision cell ("Capture: yes …") nor the unchanged Consequences text ("Accepted for the capture and the recorded answers") says that the same approval also covers `INTAKE.md` and the UNDER_REVIEW status. The Owner approval section (lines 347–353) is the scope that counts, so no change is needed. |
| I-3 | INFO | `scripts/agent/protect.mjs` (`--update`) | `--update` records the hash of every protected file present, not only the files in this diff, so it would also approve any other pending protected change. Immediately before running it, `node scripts/agent/protect.mjs` must name exactly the 110 files in this diff, and `--update` must report "110 changed". If this work moves to a repository whose `PROTECTED.json` or `LEDGER.jsonl` has since changed (for example the owner's Mac after its verify-slice run), run `--update` and the ledger events there, on the final base. Don't carry over or hand-merge a `PROTECTED.json` and ledger made elsewhere. |
| I-4 | INFO | ADR-0014 lines 351–353; `scripts/agent/protect.mjs` line 131 | This sign-off covers only 219e9a4..6a42aeb plus the two-line flip. Locking `INTAKE.md` and the UNDER_REVIEW registry change under ADR-0014 later needs its own §10 sign-off on that diff. `--update` also refuses an ADR that already existed at the last accepted checkpoint. So once S0's checkpoint is accepted, ADR-0014 can no longer record `INTAKE.md`, and a new ADR would be needed. |
| I-5 | INFO | `scripts/agent/check-state.mjs` lines 211–216 | Recording this report in `docs/agent/evidence/S0/manifest.json` (`capture-evidence.mjs --review`) makes `…/reviews/design-intake` a report series. S0 acceptance then needs that series' latest review to be GREEN on the accepted code tree. The capture doesn't change the code tree, but later S0 code changes will. A later design-intake review on the final tree would then be needed, for example the INTAKE.md review if it is GREEN. |
| I-6 | INFO (for the INTAKE review) | ADR-0014 line 226; `SPEC.md` line 3 | Two notes for the INTAKE review; neither is a capture defect. First, the Design Change Gate lists `dock-width.spec` as a test at risk, but no such file exists yet. It is planned: 0.5 spec §20.2 and REQUIREMENTS.json ("new: tests/e2e/dock-width.spec.ts"). Second, the header of `SPEC.md` says "Registry status: RECEIVED on capture", which becomes out of date when the registry status changes. |

## The flip and the update

The flip and the update are acceptable under these conditions:
1. Compared with `6a42aeb`, the flip commit changes exactly two lines, and nothing else under `docs/agent/design/` or
   `docs/agent/decisions/`:
   - ADR-0014 line 3, from `**Status:** Proposed\` to `**Status:** Accepted\`, keeping the trailing backslash;
   - the Status cell of the ADR-0014 row (INDEX.md line 21), from `Proposed` to `Accepted`.

   `PROTECTED.json` doesn't record ADR-0014 before the flip, so the flip doesn't edit an Accepted ADR. After the
   update, the ADR can never change.
2. This report is committed in or before that commit (I-1).
3. Just before `node scripts/agent/protect.mjs --update --adr ADR-0014`, `node scripts/agent/protect.mjs` names exactly
   the 110 files in this diff, and the update reports "(110 changed)" (I-3).
4. Afterwards, `protect.mjs` and `check-state.mjs` report OK (apart from the warning about not being on `main`).
   `PROTECTED.json` and the ledger event that `--update` appends are then committed.
5. The two ledger events in M-1 follow.

The rehearsal (#10–#14) showed that this sequence works on the candidate.

## Limitations

- I can't verify that the words quoted in ADR-0014's Owner approval section are the owner's, or how they were given.
  They were given in the top-level session, which I can't see. The session id the ADR names matches the session
  directory this review ran in. This is a limitation, not a finding.
- I can't reach the owner's Mac or the canvas. So I can't confirm that the uploaded handoff folder is the same as
  `/Volumes/Dev/Projects/AquariumGo-design-handoff/DESIGN-S3D`, or that the canvas Version 23 board files match the
  hashes in `SOURCE.md`. Inside the folder, every PNG matches `SOURCE.md`.
- I didn't do the intake checks; they belong to the INTAKE.md review:
  - every state checked against SPEC in depth;
  - the master §8 checklist;
  - names checked against `src/data/**` and `src/types/**`;
  - the list of conflicts.
- I didn't read the ledger (see M-1).
- I ran no product gates (typecheck, unit, build, e2e). The diff touches only `docs/agent`, so the code tree is
  unchanged.
- `check-state.mjs` computes its code tree with `git write-tree` on a temporary index. That writes unreferenced objects
  into the shared Git object store. No tracked or untracked file in the worktree changed.

Verdict: GREEN
