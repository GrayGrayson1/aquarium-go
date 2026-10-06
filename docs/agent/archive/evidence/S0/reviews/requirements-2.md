# Requirements review 2: the merged registry (whole-registry coverage)

- **Role:** requirements (`docs/agent/prompts/ROLE_PROMPTS.md`), reviewer mode.
- **Reviewed:** `docs/agent/REQUIREMENTS.json` at HEAD `b7b921c` (clean working tree; last commit that touched it is `5ae85a3`), 185 entries, and its validator `scripts/agent/requirements.mjs`.
- **Diff:** `git diff 7c0dbf4 HEAD -- docs/agent/REQUIREMENTS.json`: 3,716 insertions, 149 deletions. 23 → 185 entries; 162 added; of the 23 earlier entries, 14 changed and 9 are byte-identical, and none was deleted.
- **Draft:** `evidence/S0/requirements-draft.json` has 151 entries, all present in the registry. Seven were changed at merge (NAV-009, GEN-007, SOC-003, SOC-004, SOC-005, REL-009, REL-018). The registry also holds 34 entries that are not in the draft: the 23 earlier ones, plus CONST-004, GEN-013, MKT-016, SOC-011, PLAT-005 and PERSIST-009 to PERSIST-013.
- **Read:** `CURRENT_SLICE.md`; the registry and validator; master §9, §10, §40, plus §3.5–§3.10, §13 (`REQUIREMENTS.json`) and §41 (`requirements-audit`), because the registry cites them; the whole design spec (§1–§22); `DESIGN_REGISTRY.json`; ADR-0001, ADR-0004, ADR-0005, ADR-0006 and ADR-0008; `requirements-1.md`; the draft; and the S0 test files.
- **Also used:**
  - A narrow grep of `scripts/agent/check-state.mjs`, to check REL-009 A1's claim about ancestry.
  - `STATE.json`'s `currentSlice` and `machineState`, which `requirements-audit` reads and my simulation reused.
- **Not read:**
  - `HANDOFF.md`, `LEDGER.jsonl`, builder reports and commit messages.
  - ADR-0003, ADR-0007 and ADR-0009 (not in my list). Where the registry cites ADR-0003, I relied on ADR-0008 §4, which quotes the ADR-0003 rows it answers.
- **Scratch scripts** (in the session scratchpad, outside the repo): `dump.mjs`, `coverage.mjs`, `ids.mjs`, `s9.mjs` and `sim.mjs`. `sim.mjs` runs `auditRequirements` from `scripts/agent/requirements.mjs` on an in-memory copy of the registry.
- **Concurrent edits:** someone else edited the working tree during this review. Between 23:21 and 23:24 UTC, six harness files changed: `capture-evidence.mjs`, `check-state.mjs`, `lib.mjs`, `protect.mjs`, `relaunch.mjs` and `verify-slice.mjs` (135 insertions, 52 deletions, uncommitted). I didn't edit them and didn't review them.
  - My test run and simulation ran on the committed tree.
  - I re-ran the audit afterwards: still `OK`, exit 0.
  - The `lib.mjs` change touches only `checkTransition`, not the registry checks.
  - `requirements.mjs` and `requirements-audit.mjs` are unchanged.

## Summary

- **What holds:**
  - Design coverage is complete: every design subsection §2–§22, every §19 area and test id, and every §20 test maps to a requirement.
  - Every S1–S4 bullet of master §9 maps to a requirement, and so does every §10 gate question.
  - The registry is append-only across all three committed versions (`94de6bb`, `62df438`, `5ae85a3`).
  - The audit exits 0.
  - Most of requirements-1 is properly closed: F2, F4, F5, F6, F8, F9, F11, F12, F13, F15 and F18.
- **Why it can't be confirmed for S0:**
  - The S0 slice's own §9 bullets are still mostly untraced (requirements-1 gap 9; HARNESS-001 to HARNESS-006 are byte-identical to `7c0dbf4`). CURRENT_SLICE's acceptance criterion 4 requires every master §9 bullet to map to a requirement, which I cannot confirm.
  - F1's acceptance deadlock survives in four S4 requirements that depend on the readiness-gate report.
  - The audit never inspects slice ALL, so two standing requirements that govern S0 have no path to being met (PERSIST-003, PERSIST-002).

## `requirements-audit.mjs`

```
$ node scripts/agent/requirements-audit.mjs
ALL: 9 ACTIVE, 1 SUPERSEDED, 3 PENDING
S4: 34 PENDING, 1 DEFERRED, 1 IN_PROGRESS
S0: 14 IN_PROGRESS
S1: 28 PENDING
S2: 31 PENDING
S3: 55 PENDING, 7 BLOCKED, 1 DEFERRED
OK
exit 0
```

Other commands:

| Command | Exit | Result |
|---|---|---|
| `npx vitest run` on the 11 test files the S0 requirements name (the `core-*`, `fix-*` and `report-rarity` tests) | 0 | 11 files and 54 tests pass. The TypeError on stderr is the throw `core-fastmutate-atomic` provokes on purpose. `git status` is still clean. |
| Simulated audit (`sim.mjs`): S0, S3 and S4 at ACCEPT and S4 at MULTIPLAYER_READINESS_GATE, with all earlier-slice requirements set to GREEN | n/a | 0 errors in each case, so F1's mechanical deadlock is gone |
| Id check across every committed registry version | n/a | No id from `94de6bb` (11 ids), `62df438` (23) or `5ae85a3` (185) is missing |
| Existence check of every non-"new:" test path the registry names | n/a | 161 references, none missing; no "new:" file already exists |

## Coverage

### Master §9

**S0 — the gaps (finding B1)**

| S0 bullet | Requirement and criterion | Status |
|---|---|---|
| create docs/agent operating package | HARNESS-001 A1–A2 (implicit) | partial |
| state + append-only ledger | HARNESS-001 A3, HARNESS-005 A1, HARNESS-004 A2 | covered |
| requirements traceability | HARNESS-005 A1 (a deleted id fails) only. No S0 criterion that the audit passes or that the registry covers the contract; that is only in CURRENT_SLICE, and HARNESS-007 is S4. | **partial** |
| evidence capture | HARNESS-005 A1 (edited evidence fails). `capture-evidence.mjs` has no criterion. | **partial** |
| current-slice contract | — | **GAP** |
| context pack generator (`context-pack.mjs`) | — | **GAP** |
| verification runner (`verify-slice.mjs`) | Only REL-004 to REL-007 and REL-014, all S4 | **GAP at S0** |
| handoff generator (`handoff.mjs`) | — | **GAP** |
| local integration branch | HARNESS-002 A1 (relaunch refuses to start off the integration branch). Nothing checks that `STATE.integrationBranch` is local `main` (ADR-0005 decision 6). | **partial** |
| baseline test evidence (incl. BF-001; ADR-0004 decision 2: a real e2e run or the owner's acknowledgement) | Task S0-T2 only | **GAP** |
| record baseline SHA | Task S0-T1 only; REL-014 (S4) mentions `0d9fc5a` | **GAP at S0** |
| verify the approved design against the repo | HARNESS-003 covers the registry and intake, not the reconciliation | **partial** |
| ADRs for discovered conflicts | — | **GAP** |
| prove a fresh agent can bootstrap | HARNESS-001 A1, HARNESS-002 A3 | covered |
| "No major product feature … until S0 passes" | — | **GAP** (minor) |

**S1 to S4: all covered**

| Slice | Bullets → requirements |
|---|---|
| S1 (21) | platform abstraction PLAT-001 · route parser/formatter and hash routing NAV-009 · deep links NAV-010, NAV-013 · two-way sync NAV-011 · pending route boot NAV-013 · Back/Forward/Esc NAV-012 · five-tab bar NAV-002, NAV-003 · More sheet NAV-004 · desktop navigation changes NAV-008 (SOC-004 in S4) · full-height panels NAV-006, NAV-007 · locked states NAV-008 · tutorial fallback NAV-005 · settings-tab widening NAV-016 · Copy link/share NAV-015 · notification platform seam PLAT-002 · responsive/accessibility ACC-001, ACC-002 · token fidelity DES-001 · test ids DES-003, DES-004 · route/unit/E2E coverage NAV-009 to NAV-019 · baseline snapshots DES-002 · "Social route and shell ready" NAV-009 (Social rows as pure data) |
| S2 (23) | GEN-002 to GEN-012, MKT-002 to MKT-014, PERF-001 (as in requirements-1) · exact test updates GEN-005, GEN-006, GEN-009, GEN-012 · determinism GEN-009 A3 · catalog/performance PERF-001, GEN-007 · no engine rewrite GEN-001 A2, GEN-003 A3 |
| S3-A (12) | AUTO-003 to AUTO-011 · alerts AUTO-005, DES-007 · finances AUTO-006 · offline catch-up AUTO-009 A4 |
| S3-B (9 + native deferral) | NOTIFY-002, -003, -005, -007, -008, -009, -010 · native deferred: NOTIFY-011, PLAT-004 |
| S3-C (12 + pipeline) | PROD-004 to PROD-015 · several lines PROD-002, PROD-001 A2 · deterministic PROD-016 · restart-safe AUTO-026 · tolerant PROD-017 · UI PROD-003 (BLOCKED) with PROD-018 |
| S3-D | design dependency AUTO-002 A2 · Tier 1 = the S3-A requirements · Tier 2 AUTO-012 · Tier 3 AUTO-013 · Tier 4 AUTO-014 · Tier 5 AUTO-015 · simulation rules AUTO-016 to AUTO-019 and AUTO-026 · anti-dupe invariants AUTO-020 to AUTO-027 · scope control AUTO-028 |
| S4 stub (14) | SOC-002 to SOC-010 (no password persistence: SOC-002), with owner override SOC-011 |
| S4 hardening (14) | REL-004 to REL-007 · visual DES-011 · responsive DES-012 · performance PERF-002 · determinism CONST-003 · automation invariants AUTO-029 · persistence PERSIST-004 (see M3), PERSIST-008 · route audit NAV-019 · accessibility ACC-005 · TODO/stub REL-008 · traceability HARNESS-007 |
| §10 gate (13 questions + output + stop) | REL-009, REL-010, REL-011, REL-012, REL-013, REL-014, REL-015, AUTO-029, DES-011, PERF-002/PERF-003, HARNESS-007, REL-016, REL-017 · output REL-018 · stop REL-002 |

### Design normative subsections (cited by `source` or `designSections`)

| Section | Subsections → requirements | Gaps |
|---|---|---|
| §2 D1–D14 | D1 NAV-002/004 · D2 SOC-004 (+SOC-011) · D3 AUTO-004/006 · D4 MKT-002/008, GEN-010 · D5 SOC-008 (+SOC-011) · D7 NAV-013, MKT-002, NOTIFY-011, PROD-* · D9 NAV-009 · D10 GEN-003/004 · D11 GEN-005 · D12 MKT-009/010 · D13 NOTIFY-008/011 · D14 REL-003 (overridden) | none (D6 and D8 are not behaviour) |
| §3 items 1–8 | CONST-001; GEN-001 A2; PERSIST-007 (+override); SOC-003 A4, PERSIST-006 A4, PROD-016 A2; CONST-003, AUTO-016; DES-001, NAV-018, ACC-*; DES-003; CONST-002 | none |
| §5.1–§5.7 | NAV-002 to NAV-008, NAV-017, MKT-014, SOC-004, DES-012 | m8: the More dot for any More destination; the desktop dock-social dot |
| §6.1–§6.6 | NAV-009 to NAV-016, MKT-003, MKT-012, NOTIFY-009, SOC-003, SOC-006 | none |
| §7.1–§7.8 (incl. §7.4.1) | MKT-002 to MKT-015, GEN-008, GEN-010, GEN-011, NAV-015, NOTIFY-004, SOC-008, AUTO-007 | none |
| §8.1–§8.7 | GEN-002 to GEN-010, GEN-012, GEN-013, PERF-001 | m1, m2 |
| §9.1–§9.2 | GEN-010, GEN-011 | none |
| §10.1–§10.4 | AUTO-003 to AUTO-012, AUTO-016 to AUTO-018, AUTO-023 | none |
| §11.1–§11.3 | PROD-002 to PROD-017, DES-008, AUTO-014, AUTO-019 to AUTO-025 | owner questions in notes (m7) |
| §12.1–§12.8 | NOTIFY-002 to NOTIFY-011, DES-009, AUTO-005, NAV-016 | m8: club-show reminder route under SOC-011 |
| §13.1–§13.6 | SOC-002, SOC-003, SOC-005 to SOC-010, DES-010 | none |
| §14 | PLAT-001 to PLAT-004 | none |
| §15 | PROD-002, PERSIST-006, PERSIST-007, AUTO-006, AUTO-018, NOTIFY-004, SOC-003, MKT-014, NAV-016, GEN-002 and others (15 in all) | none |
| §16 (10 copy areas) | Navigation DES-003 · Links/boot DES-004 · Locked NAV-008 · Shop and offers DES-005 · Automation DES-007 · Production DES-008 (BLOCKED) · Notifications DES-009 · Social DES-010 · Encyclopedia DES-006 · Settings › About REL-003 (proposal only; registry override of D14 and §21 release) | none |
| §17 | DES-001, DES-002, DES-011 and 11 others | none |
| §18 | ACC-001 to ACC-005, SOC-005, NAV-012 | none |
| §21 Done-when clauses (requirements-1 gap 10) | Phase 0 NAV-009, PLAT-001 · Phase 1 NAV-010 · Phase 2 GEN-006, GEN-009 · Phase 3 AUTO-009, NOTIFY-003 · Phase 4 SOC-004, SOC-006 · Phase 5 PROD-002, PERSIST-006 · Phase 6 NOTIFY-011 (DEFERRED) · "v0.4.0 save loads" PERSIST-001 (SUPERSEDED) | none |
| §22 risks 1–13 | GEN-007/013, NAV-012, (SOC-003, PROD-016, PERSIST-006, NOTIFY-009), NOTIFY-001, DES-009, PERF-001, NAV-003, AUTO-006, PROD-018, SOC-011, NAV-006, SOC-004, AUTO-008 | none |

### §19 areas (every listed id appears in a requirement's description or acceptance)

| Area | Ids | Requirements |
|---|---|---|
| Navigation | 15/15 | DES-003, NAV-002, NAV-004, DES-010, SOC-004 |
| Boot / links | 2/2 | DES-004, NAV-013 |
| Shop | 7/7 | DES-005, MKT-002, MKT-003 |
| Offer | 10/10 | DES-005, NAV-015, MKT-005 to MKT-011 |
| Encyclopedia | 4/4 | DES-006, GEN-012 |
| Tank card | 6/6 | DES-007, AUTO-003, AUTO-004, AUTO-007 |
| Alerts | 2/2 | DES-007 (A2 "each listed id"), AUTO-005, NOTIFY-007 |
| Settings | 6/6 | DES-009 (A3), NOTIFY-006, NAV-016 |
| Social | 14/14 | DES-010 (A2 "each id"), SOC-003 to SOC-008 |
| Production | 5/5 | DES-008, PROD-003 (both BLOCKED by DESIGN-S3C-LINES) |

### §20 tests

| Table | Tests → requirements |
|---|---|
| §20.1 (16) | nav-routes NAV-009/014/015/016 · nav-sync NAV-010/011/012, MKT-006 · genetics-expansion GEN-002 to GEN-009 · genetics-lab-reveal GEN-010 · shop-filters MKT-002/003 · offer-genes MKT-007/008 · automation-water-changer AUTO-006, -008 to -011, -023 · notify-navdots MKT-014 · notify-offer-events NOTIFY-004 · automation-autofeed-ui AUTO-003/004/005 · notify-rules NOTIFY-002/003/005/008 · notify-forecast NOTIFY-011 (DEFERRED) · platform-memory PLAT-001/002 · social-stub SOC-002/005/006/008/009 · production-line PROD-002 to PROD-017 · persistence-05 PERSIST-002/006/007/008 (its v0.4.0 row is superseded: PERSIST-001) |
| §20.2 (8) | nav.spec NAV-010/011/012/014/015, MKT-012 · deeplink-boot NAV-013, DES-004 · mobile-tabbar NAV-002 to NAV-005 · shop-filters.spec MKT-002/003 · automation.spec AUTO-003/004/007 · notifications.spec NOTIFY-006/007/009 · dock-width SOC-004 · mobile-sheets NAV-003/006/007 |
| §20.3 (8 rows) | ui-layout.spec NAV-017 · morph-catalog GEN-006 A4 · ui-prismatic GEN-012 A2 · fix-panels-b-morphs GEN-005 A2–A3 · hand-built name tests GEN-009 A4 · version.test REL-003 · Settings-tab and dock counts NOTIFY-006 A4, SOC-004 A4 · fix-hud-* NAV-018 |
| §20.4 | CONST-002 A1–A2 (all listed tests); AUTO-004 A4 and AUTO-011 A3 for the keeper and Autofeeder rows |

## Findings

### Blocker

**B1. Most master §9 S0 bullets have no requirement with a testable criterion** (requirements-1 gap 9 is still open).
- Files: `REQUIREMENTS.json`, HARNESS-001 to HARNESS-006 (unchanged since `7c0dbf4`); `CURRENT_SLICE.md` acceptance criterion 4.
- What's missing (see the S0 table):
  - No criterion at all: context pack generator, handoff generator, verification runner, current-slice contract, baseline SHA, baseline test evidence (including ADR-0004 decision 2's real e2e run or the owner's acknowledgement of BF-001), and ADRs for discovered conflicts.
  - Only partly covered: evidence capture, the integration branch (ADR-0005 decision 6: local `main`), and verifying the design against the repo.
  - HARNESS-001 lists S0-T1 to S0-T12 as tasks, but its three criteria (bootstrap, check-state exit 0, STATE/ledger/handoff agree with Git) test none of these.
- Why it blocks: S0 is the current slice, and its contract needs an independent reviewer to confirm full §9 coverage. I can't confirm it.
- Fix: add criteria to HARNESS-001, or new HARNESS-009 and up, one per bullet. For example:
  - `context-pack.mjs` writes the pack for the current slice;
  - `handoff.mjs` regenerates `HANDOFF.md` from state;
  - `verify-slice.mjs` records each gate with command, exit code and code tree in `evidence/S0/manifest.json`;
  - `capture-evidence.mjs` hashes what it records;
  - `STATE.actualBaselineSha` = `0d9fc5a` matches `logs/baseline-git-state.log`;
  - the baseline matrix is recorded, with e2e GREEN or BF-001 acknowledged in an owner ADR;
  - `DESIGN_REGISTRY.json` overrides and errata exist for each discovered conflict, each with an ADR;
  - `STATE.integrationBranch` is `main`, and work happens there or on the ADR-approved cloud branch;
  - no product-feature diff before S0 acceptance beyond the ADR-0002 decision 2 fixes.
- Each criterion names a test: `agent.test.mjs` or an evidence path.

### Major

**M1. F1 is only partly fixed: four S4 requirements need the readiness-gate report.**
- REL-013 A1, REL-015 A1, REL-016 A3 and REL-017 A1–A2 write to or judge "the gate report".
- They are slice S4, so the audit requires them GREEN at S4 ACCEPT.
- But the report is produced at MULTIPLAYER_READINESS_GATE, which runs after S4 is accepted, in a new session: REL-018, master §10, and ADR-0008 §5 (master §11.1 row).
- The audit simulation passes only because it can't see this dependency.
- Fix: move these four to ALL beside REL-009 and REL-018, or have them record into S4's own acceptance evidence and let REL-018 link to it.

**M2. Standing (ALL) requirements have no closure path, and two that govern S0 can't be met.**
- `auditRequirements` checks only `r.slice === state.currentSlice` and numbered slices (`requirements.mjs`), so ALL entries are never audited for tasks, tests or status. HARNESS-007 A2 covers only S1–S4.
- PERSIST-003 (ALL/ACTIVE) is listed as governing S0 in `CURRENT_SLICE.md`, yet its own note says "Not implemented yet": the v0.4.0 code treats a `too_new` save as damaged. It has no task or slice, and its test is only proposed.
- PERSIST-002 (ALL/ACTIVE) also governs S0, but names only `persistence-05.test.ts`, which is a Phase 5 (S3) file.
- CONST-001 A1 compares against the S0 checkpoint, but its only test, `core-dependencies.test.ts`, is proposed with no slice to write it.
- Fix:
  - Split PERSIST-003 into a PENDING implementation requirement with a slice and task, plus the standing rule.
  - Name an existing test for PERSIST-002 at S0 (for example `core-crafted-saves` "a second repair finds nothing left to fix", or `core-persistence`), or drop it from the S0 governing list.
  - Give CONST-001's test a slice.
  - Add a criterion (HARNESS-007 or a new HARNESS item) that every ALL/ACTIVE requirement's named tests pass at each slice acceptance.

**M3. PERSIST-004 (S4/IN_PROGRESS) could close without its remaining scope.**
- Its A1 and A2 (inherited-key ids, non-embedded photos) are the S0 part now owned by PERSIST-011, and they already pass.
- The S4 remainder its note names ("oversized arrays and number ranges", and "crash the sim loop" in its description) has no criterion. PERSIST-004 could therefore turn GREEN in S4 with that work quietly dropped.
- IN_PROGRESS, with task S0-T8, is also the wrong status for a part that hasn't started.
- Fix: rewrite A1/A2 for the remainder (for example: a save with oversized arrays or out-of-range numbers loads, is repaired with a note and steps a day without throwing), and set the status to PENDING.

**M4. Owner-confirmed harness rules have no HARNESS requirement.**
- From ADR-0001:
  - "Three materially different failed repairs triggers manual inspection"
  - "Green mega-slices automatically advance"
  - "Local commit after each mega-slice"
  - "Independent builder/reviewer/QA topology": only REL-010 A2 checks it, and only at S4.
- From ADR-0004 decision 4, which keeps ADR-0003 rules 1–6 (as quoted there):
  - the five-attempt total stop;
  - YELLOW never advances on its own;
  - an owner gate parks only the blocked item.
  - Of the rules decision 4 lists, only the protected files have a criterion (HARNESS-005 A3); gate-defining files have one only at S4 (REL-004 A2, tsconfig only).
- Fix: add HARNESS requirements for these rules, tested in `agent.test.mjs` (transitions and watchdogs) where they are scripted.

### Minor

- **m1 (GEN-006, GEN-007).** GEN-006's description and A3 still read as if the tier model were undecided: "recorded in the owner's ADR before S2 starts", "not today's MORPH_TIER_MIN_SHARE thresholds by default". ADR-0005 decision 4 kept today's rule.
  - GEN-006 should cite ADR-0005 decision 4 and assert the §20.1 tiers: Royal Blue Butterfly Halfmoon rare, Red Cambodian Veiltail very_rare, Royal Blue Metallic Butterfly Halfmoon legendary.
  - GEN-007's source still cites ADR-0003's "open owner question … to settle before S2" as current.
- **m2 (GEN-013, GEN-006).** `tests/sim/report-rarity.test.ts` pins today's betta row (240 entries at 1/9/21/39/170, 9 strains). S2's new loci must change it, but no requirement names that change, and it isn't a §20.3 row, so the test-integrity checks would see an unplanned test edit. Name it the way the §20.3 rows are named.
- **m3 (stale text).**
  - REL-008 and REL-017 notes say `docs/agent/BACKLOG.md` "is not in the tree"; it is (242 lines).
  - SOC-011's note points to "HANDOFF step 3" for the registry override, which is now in `DESIGN_REGISTRY.json`.
  - HARNESS-003 A1 lists DESIGN-0.5 and DESIGN-S3D but not DESIGN-S3C-LINES (ADR-0005 decision 6, ADR-0008 §5).
- **m4 (SOC-002).** It names no umbrella, so SOC-001 can turn GREEN while "no password persistence" is still open. Add "umbrella SOC-001".
- **m5 (GEN-009 A1, PERSIST-002).** GEN-009 requires that loading a v0.4.0 save keeps every betta's cached name, appearance and value, and PERSIST-002 round-trips "a legacy save". PERSIST-001 is superseded (ADR-0005 decision 1: old saves not required). Either say design §8.6 still applies as genome normalisation, or reword to the normalisation test only.
- **m6 (GEN-003 A3).** "git diff shows no change to … morphCatalog.ts" has no base. The file already changed in S0 (`localeCompare(…, 'en')`, under CONST-004). Name the S1 checkpoint as the base.
- **m7 (open notes).**
  - 27 requirements carry "Needs owner or reviewer confirmation" notes: DES-001, DES-009, DES-011, DES-012, NAV-004, NAV-007, NAV-014, NAV-015, AUTO-007, AUTO-009, AUTO-011, AUTO-019, AUTO-020, NOTIFY-002, NOTIFY-006, PROD-006, PROD-008, PROD-011, PROD-013, PROD-015, PROD-016, PROD-017, SOC-010, REL-008, REL-013, REL-015 and REL-017.
  - These include the PROD-017 / PERSIST-006 conflict (pause the line with a notice versus drop dangling lines on load).
  - Nothing makes a slice settle them before PLAN_LOCK. Have each slice contract resolve its own, or add an audit warning for notes in the current slice.
- **m8 (design details without a criterion).**
  - §5.2: the More dot for any More destination (NAV-004 A4 covers only Shows).
  - §5.4: the desktop dock-social attention dot (in SOC-004's description only).
  - §12.2: Shows club-show reminders route to `#/social/clubs`, which SOC-011 makes unreachable outside dev mode; NOTIFY-003 doesn't say what happens.
  - PERSIST-012's "the random stream is unchanged" is claimed in its description but no criterion or test checks it.
- **m9 (S0 test traceability).**
  - The S0 edits to `species-fw.test.ts` and `species-marine.test.ts` (one added assertion each, for `expect.requireAssertions`) aren't named by HARNESS-006.
  - `core-fastmutate-atomic.test.ts`'s header still tags PERSIST-004, though its describes say PERSIST-009.
- **m10 (REL-001).** It cites only ADR-0001. The cloud-session pushes of `agent/s0-wip` that AGENTS.md and ADR-0008 §3 attribute to ADR-0007 and ADR-0009 aren't referenced, so A1's "approval recorded in an ADR" has no pointer to the approvals in force. I didn't read those two ADRs.

### Checked and correct

- **Schema and validator:** 15 families, each numbered from 001 with no gaps.
- **Statuses:**
  - Seven BLOCKED: AUTO-002 and AUTO-012 to AUTO-015 by DESIGN-S3D; DES-008 and PROD-003 by DESIGN-S3C-LINES.
  - DEFERRED and SUPERSEDED entries cite committed ADRs: NOTIFY-011 and PLAT-004 cite ADR-0001; PERSIST-001 cites ADR-0005 decision 1.
  - No S1–S4 requirement is ACTIVE.
- **Umbrellas:** every one uses the "umbrella X" rule. The only cross-slice links are REL-010 to REL-017 → REL-002 (ALL), which is intended.
- **Owner decisions in requirements:**
  - ADR-0005 decision 1: PERSIST-001 superseded, PERSIST-003 rewritten.
  - Decision 2: PLAT-005, NAV-009 A4, SOC-005 A3.
  - Decision 3: SOC-011, with notes on SOC-003 and SOC-004.
  - Decision 4: GEN-007 and GEN-013.
  - Decision 5: S3-D stays in S3.
  - Decision 6: PROD-018, DESIGN-S3C-LINES.
  - Decision 7 with ADR-0006: HARNESS-008 names `/Volumes/Dev/Backup Projects/AquariumGo/`.
- **S0 tests:** CONST-004, GEN-013, MKT-016 and PERSIST-009 to PERSIST-013 name tests that exist, carry their id in the `describe` titles, assert what the criteria say, and pass.
- **Repo facts quoted in criteria:**
  - `ui-layout.spec` lines 89 and 98, `ui-prismatic` line 49, `morph-catalog` lines 58–65 and `hud.css` lines 521–523 match.
  - The landscape rule `top: max(6px, env(safe-area-inset-top))` is in `src/ui/panels/panels.css`.
  - Playwright `retries: 0`.
  - `check-state.mjs` checks checkpoint ancestry (`merge-base --is-ancestor`), as REL-009 A1 claims.

## Status of requirements-1 findings

| Finding | Status |
|---|---|
| F1 S4 acceptance deadlock | **Partly closed.** REL-002, REL-009, REL-018 and REL-003 are now ALL, and the simulated audit passes at S4 ACCEPT and at the gate. The semantic deadlock remains in REL-013, REL-015, REL-016 and REL-017 (M1). |
| F2 Production UI precondition | Closed: PROD-003 and DES-008 are BLOCKED by DESIGN-S3C-LINES, PROD-018 adds the gate, and the registry lists the design as PENDING_OWNER_DESIGN. |
| F3 rarity tiers treated as settled | Closed by ADR-0005 decision 4 (GEN-007 rewritten, GEN-013 added). GEN-006 still has stale wording (m1). |
| F4 notification copy | Closed: DES-009 A2 and NOTIFY-006 A2 exclude the iOS sentence and the `app` variants; the owner gate is recorded in a note (ADR-0008 §4 keeps the row open). |
| F5 CONST-003 A3 fails on today's code | Closed: the allow-list is the `newGame.ts` seed and time (CONST-003 A3, CONST-004 A1); the guard passes. |
| F6 HARNESS-007 contradiction | Closed: A2 excludes ACTIVE in S1–S4, and none is ACTIVE there. |
| F7 requirements without tests | Closed: every non-deferred requirement names a test (the validator enforces it). Several "tests" are harness scripts or proposed files. |
| F8 NAV-006 landscape | Closed: the description and A2 keep the landscape rule and the tool-rail check. |
| F9 performance budgets | Closed: PERF-003 (ALL), cited by PERF-001 and PERF-002. |
| F10 thresholds the design doesn't state | Mostly closed. The owner group now defers to DESIGN-S3D (AUTO-012 A4, AUTO-017 A3, AUTO-019 A1) or carries notes (PROD-006, AUTO-020); tolerances are marked "proposed"; copy criteria now say "exactly as design §16 specifies", and DES-009's note flags the apostrophe rule. These are still open as notes (m7). |
| F11 DEFERRED decisions | Closed: they cite ADR-0001. |
| F12 e2e specs not named | Closed: CONST-002 A1 names all 12 specs in `tests/e2e`. |
| F13 AUTO-008 and AUTO-009 tests | Closed: they now include `fix-water-grace-equipment` and `waterlab-compat`. |
| F14 placeholder criteria | Open, documented in notes (AUTO-019, PROD-015, SOC-010, NAV-014, REL-015, DES-011). |
| F15 PERSIST-007 | Closed: `alleles[].rare` is excluded and the ADR escape is added. |
| F16 Sort and Prismatic destinations | Open, documented as owner decisions (PROD-008, PROD-011). |
| F17 missing BACKLOG.md | Closed in the tree, but REL-008 and REL-017 notes are stale (m3). |
| F18 core-owned edits | Closed: SOC-003 A4 and PERSIST-006 A4 carry the master §3.8 conditions. |
| Gap 5 (§10.2/§10.3 lock states) | Closed: AUTO-004 A2 has the lock hint; AUTO-007 A4 mirrors it, with a note. |
| Gap 9 (S0 bullets) | **Open** (B1). |
| Gap 10 (§21 Done-when) | Closed (see the design table). |

None was wrongly closed outright. F1 is presented as fixed, but four S4 entries still carry the gate-report dependency.

Verdict: RED
