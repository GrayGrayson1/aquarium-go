# Requirements review 3: the repaired registry (208 entries)

- **Role:** requirements (`docs/agent/prompts/ROLE_PROMPTS.md`), reviewer mode (`AGENTS.md`). I am a fresh,
  independent subagent. I did not build or repair any of the reviewed work, and I received no builder summary.
- **Reviewed:** `docs/agent/REQUIREMENTS.json` at the candidate `fd9ed1489e3296c9d496cac3fe9ec0e60958d78d` (detached
  worktree, clean), plus its validator `scripts/agent/requirements.mjs` and `scripts/agent/requirements-audit.mjs`.
  The registry was last changed in `e79aeba` and is byte-identical at the candidate.
- **Base:** v0.4.0 `0d9fc5a46085f746510a1041335632cd4f7314a2`.
- **Change since requirements-2** (`5ae85a3`, 185 entries):
  - 23 entries added: PERSIST-014 and HARNESS-009 to HARNESS-030.
  - 34 entries changed. The only status change is PERSIST-004, S4 IN_PROGRESS → PENDING.
  - 151 entries unchanged. No id deleted.

## What I read

- **Listed in my prompt:**
  - `AGENTS.md` and `CLAUDE.md`.
  - The reviewer context pack. I regenerated it to stdout and it was identical apart from its timestamp line.
  - `CURRENT_SLICE.md`.
  - All 208 entries of `REQUIREMENTS.json`, with `requirements.mjs` and `requirements-audit.mjs`.
  - From the master: §0, §3 (incl. §3.5–§3.10), §9, §10, §11, §12, §13, §16–§19, §26–§31 and §40–§54.
  - The design spec: §1–§22 in full, plus the appendices.
  - `DESIGN_REGISTRY.json` and `DESIGN_INTAKE.md`.
  - The ADRs: ADR-0001 to ADR-0009, ADR-0011 and ADR-0012 through the pack; ADR-0010 directly; `decisions/INDEX.md`.
  - Evidence: `reviews/requirements-2.md`, `reviews/requirements-1.md` (skimmed for context),
    `requirements-draft.json` (ids), `manifest.json`, `baseline-failures.json`,
    `test-inventory-baseline.json` (counts) and `logs/requirementsAudit-20261006T001625283Z.log`.
- **Also used, narrowly, to check claims the registry makes** (as requirements-2 did with `check-state.mjs`):
  - `OPERATIONS.md` §4 and §6, plus a grep for the owner-gate reasons in §2.
  - `README_FIRST.md`.
  - `BACKLOG.md`: the "Design errata by slice" and "S0 game fixes" tables.
  - `STATE.json` fields.
  - Harness code: `lib.mjs` constants, `check-state.mjs` (where it runs the audit), the `test-inventory.mjs` header,
    and the `agent.test.mjs` test names, reading five tests in full.
  - The source and test lines that criteria quote (listed under "Repository facts").
- **Not read:** `HANDOFF.md`, `LEDGER.jsonl`, builder reports and commit messages. I listed SHAs with
  `git rev-list` (SHAs only). I used no `git log` message output, no `git show <commit>` and no `git blame`.
- **Scratch:** scripts and outputs are in `/tmp/requirements-3-scratch/`, outside the repo. `sim.mjs` imports the
  pure `auditRequirements` from `scripts/agent/requirements.mjs` and runs it on an in-memory copy of the registry.
  Nothing in the worktree was changed except this report; `git status --porcelain` was empty after every command.

## Commands run

| Command | Exit | Result |
|---|---|---|
| `git status`; `git rev-parse HEAD` | 0 | Clean, detached at `fd9ed14…` |
| `node scripts/agent/requirements-audit.mjs` | 0 | `ALL: 17 ACTIVE, 1 SUPERSEDED, 3 PENDING` · `S4: 35 PENDING, 1 DEFERRED` · `S0: 28 IN_PROGRESS` · `S1: 29 PENDING` · `S2: 31 PENDING` · `S3: 55 PENDING, 7 BLOCKED, 1 DEFERRED` · `OK`. Same output as the recorded `logs/requirementsAudit-20261006T001625283Z.log`, which ran at `4c1a987`, a descendant of `e79aeba` with the same registry. |
| `node scripts/agent/check-state.mjs` | 0 | `WARNING current branch HEAD is not the integration branch main` (expected in this detached checkout), then `OK` |
| `node --test 'scripts/agent/*.test.mjs'` | 0 | 75 tests, 75 pass, 0 fail |
| `node scripts/agent/context-pack.mjs --for reviewer --out -` | 0 | 135,214 bytes, identical to the provided pack after its timestamp line, with no handoff or ledger section (HARNESS-014 A2) |
| `git rev-list 0d9fc5a..HEAD -- docs/agent/REQUIREMENTS.json` | 0 | `94de6bb`, `62df438`, `5ae85a3`, `e79aeba` |
| `git show <sha>:docs/agent/REQUIREMENTS.json` for those four and HEAD | 0 | Saved to scratch for the id check |
| `git diff --quiet e79aeba HEAD -- docs/agent/REQUIREMENTS.json` | 0 | Identical |
| `git merge-base --is-ancestor e79aeba 4c1a987`; `git diff --quiet 4c1a987 HEAD -- docs/agent/REQUIREMENTS.json` | 0; 0 | The recorded audit ran on this registry |
| `git diff --name-status --diff-filter=M 0d9fc5a HEAD -- tests` | 0 | Only `fix-core-offline`, `species-fw` and `species-marine`; the diffs are the P5-09 helper and one unconditional `expect` each (HARNESS-006 A6 holds) |
| `git diff 0d9fc5a HEAD -- package.json`; `git diff --stat 0d9fc5a HEAD -- package-lock.json` | 0 | Only the `report:rarity` script was added; the lockfile is unchanged (CONST-001 A1 holds) |
| `git diff --stat 0d9fc5a HEAD -- src/persistence/schema.ts` | 0 | Empty (PERSIST-003 note holds) |
| `git diff --stat 0d9fc5a HEAD -- src scripts/report-rarity.ts` | 0 | 22 files, all in BACKLOG "S0 game fixes" or the rarity tool (HARNESS-022 A1 testable) |
| `git diff 94de6bb HEAD -- docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md` | 0 | Only the 6-line harness banner, which shifts every later line by 6 |
| `git rev-parse 94de6bb^`; `git merge-base --is-ancestor 0d9fc5a HEAD`; `git rev-list --merges 0d9fc5a..HEAD \| wc -l` | 0; 0; 0 | Parent `0d9fc5a`; ancestor; no merges (HARNESS-017 A3) |
| `git cat-file -e e79aeba:docs/agent/decisions/ADR-0012-owner-answers-cowork-session.md` | 128 | ADR-0012 postdates the last registry change |
| `git diff e79aeba HEAD -- docs/agent/CURRENT_SLICE.md docs/agent/STATE.json` | 0 | ADR-0012 added to the governing decisions, S0-T11 marked DONE, `requirementsAudit` gate set GREEN |
| `git check-ignore -q .agent-runs/x` | 0 | Ignored (HARNESS-009 A2) |
| `git ls-files --error-unmatch` on every master §12 path | 0 / 1 | All tracked except `evidence/S0/test-inventory.json` and `evidence/S0/acceptance-report.md`, which are due at S0-T12 per HARNESS-009's note |
| Scratch: `ids.mjs`, `slice.mjs`, `paths.mjs`, `coverage.mjs`, `s9.mjs`, `s19.mjs`, `s19s20.mjs`, `status.mjs`, `sim.mjs`, `idents.sh` | 0 each | Results below |
| `grep`/`sed` on the quoted lines of `tests/e2e/ui-layout.spec.ts`, `tests/sim/{morph-catalog,ui-prismatic,fix-panels-b-morphs,lifecycle-genetics,rare-variants,version,ui-notify-news,report-rarity,core-*}.test.ts`, `src/ui/styles/hud.css`, `src/ui/panels/panels.css`, `src/render/camera/viewport.ts`, `src/ui/common/safe.ts`, `src/data/quests.ts`, `src/sim/water/step.ts`, `src/sim/life/{morphCatalog,rarityReport}.ts`, the two `format.ts` and `CompatPreview.tsx`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json` | 0 | See "Repository facts" |

**Not run.** This container has no `node_modules`, and the npm registry is blocked. These gates need npm and
were not run; none of them is reported as passed:
- `npm run typecheck`
- `npm test`, including any single Vitest file
- `npm run build`
- `npm run e2e`
- `node scripts/agent/test-inventory.mjs`

I made no network call. In particular I ran no `git fetch`, so HARNESS-017 A4 and REL-001 A3 are not re-checked
here.

## Summary

- **What holds:**
  - **Coverage is complete.** Every master §9 bullet (S0 to S4) maps to a requirement with testable acceptance
    criteria. So does every §10 gate question, every normative design subsection, all 87 §19 test ids (alternatives
    expanded) in 10 areas, and every §20.1–§20.4 test. The only gaps are at detail level (R3-m3, R3-m4).
  - The registry is append-only across every committed version.
  - The audit and the harness tests pass.
  - Statuses, slices and umbrellas are consistent.
  - All of requirements-2's findings are resolved except m9, which is partly resolved.
- **Why it isn't GREEN:**
  - The B1 repair added two S0 requirements, HARNESS-013 and HARNESS-016, each with a criterion that can only be
    observed after S0's `ACCEPT`.
  - From `ACCEPT` on, `check-state.mjs` refuses any S0 requirement that isn't closed. So as written, S0 can't be
    accepted truthfully (R3-B1).
  - This is requirements-2's M1 pattern, now in the current slice. One S4 instance of the same pattern also remains
    (R3-M1).

## Coverage

### Master §9 S0 (all now covered; requirements-2 B1)

| S0 bullet | Requirement | Testable criteria (checked) | Note |
|---|---|---|---|
| create `docs/agent` operating package | HARNESS-009 | A1 `git ls-files` of every §12 path (logged); A2 `check-ignore` (verified); A3 README_FIRST paths; A4 `protect.mjs` | A1/A3 say "at the S0 checkpoint" (R3-B1) |
| machine-readable state and append-only ledger | HARNESS-010 (+HARNESS-004) | A1–A3 `agent.test.mjs` state, transitions, ledger (test names exist); A4 check-state on the real files | A4 wording (R3-B1) |
| requirements traceability | HARNESS-011 | A1–A2 validator and audit tests; A3 this review; A4 task agreement (verified: 0 mismatches between the 13 task rows and the registry) | A1 overclaims (R3-m2) |
| evidence capture | HARNESS-012 (+HARNESS-005) | A1–A4 `agent.test.mjs` (evidence counts, files, reviews, manifest, oversized logs) | `--browser`/`--perf` untested until first use (documented in its note) |
| current-slice contract | HARNESS-013 | A1 check-state/audit; A2 sections equal the template, governing list holds all 28 S0 entries, reviewers ⊇ STATE (all verified) | **A3 only after `NEXT_SLICE` (R3-B1)** |
| context pack generator | HARNESS-014 | A1–A2 tests; A3 runs logged (I re-ran the reviewer pack: exit 0) | — |
| verification runner | HARNESS-015 | A1–A2 tests; A3 the eight gates GREEN on the final tree | — |
| handoff generator | HARNESS-016 | A1 `agent.test.mjs` handoff | **A2 only in "the commit that closes S0" (R3-B1)** |
| local integration branch | HARNESS-017 | A1 `integrationBranch` is `main` (verified); A2 tests; A3 history (verified); A4 `origin/main` | — |
| baseline test evidence | HARNESS-018 | A1 manifest baseline runs (verified: tree `454801df`, unit 151/1,753, e2e exit 143); A2 BF entries and ADRs; A3 real e2e run or owner ADR; A4 unit GREEN; A5 inventory (verified 1,753 + 47) | ADR-0012 not reflected (R3-m1) |
| record baseline SHA | HARNESS-019 | A1 both STATE SHAs (verified); A2 log, manifest and tree (verified); A3 ancestry | A3 wording (R3-B1) |
| verify the approved design against the repo | HARNESS-020 (+HARNESS-003) | A1 supersession rows (each ADR-0003/ADR-0008 §4 row checked: registry row, requirement or open question); A2 repo facts (this review); A3 errata rows in BACKLOG (verified, e.g. B-150, B-151); A4 registry validation | A2 mismatches found (R3-m2) |
| ADRs for discovered conflicts | HARNESS-021 | A1 INDEX; A2 verbatim owner words; A3 `protect.mjs` on accepted ADRs; A4 open questions answered or listed | A2 omits ADR-0012 (R3-m1) |
| prove a fresh agent can bootstrap | HARNESS-001 (+HARNESS-002 A3) | A1 `bootstrap-check.mjs` (manifest: `check:bootstrap-check`, exit 0 at `b243b23`) | A2 wording (R3-B1) |
| "No major product feature … until S0 passes" | HARNESS-022 | A1 `git diff --stat` of `src` (verified, 22 files); A2 reviews | — |
| (slice title) Architecture Lock | CONST-004 | A1–A3 the two guards | — |

### Master §9 S1 to S4

| Slice | Bullet → requirement |
|---|---|
| S1 | **Platform and routing:** platform abstraction PLAT-001 (+PERSIST-014, persistence seam) · route parser/formatter NAV-009 · hash routing NAV-009 · deep links NAV-010, NAV-013 · two-way sync NAV-011 · pending route boot NAV-013 A2 · Back/Forward/Esc NAV-012<br>**Navigation surfaces:** five-tab bar NAV-002, NAV-003 · More sheet NAV-004 · desktop navigation changes NAV-008 (lock badges and locked panels) and NAV-004 A3 (Social dock item in S4: SOC-004) · full-height panels NAV-006, NAV-007, NAV-017 · locked states NAV-008 · tutorial fallback NAV-005 · settings-tab widening NAV-016 · Copy link/share NAV-015, PLAT-003 · notification seam PLAT-002<br>**Quality:** responsive/accessibility ACC-001, ACC-002 · token fidelity DES-001 · test ids DES-003, DES-004 · route/unit/E2E coverage NAV-009 to NAV-018 · baseline snapshots DES-002 · "Social route and shell ready" NAV-009 (Social rows round-trip as data) |
| S2 | **Genetics:** reveal correction GEN-010 · Cambodian GEN-003 · Metallic GEN-004 · rare alleles GEN-002 · Cambodian Veiltail GEN-005 · catalog GEN-006 · Genes panel MKT-007, MKT-008 · disclosure GEN-010, MKT-008 · temperament GEN-011<br>**Shop:** Prismatic-only and Rare genes filters MKT-002, MKT-003 · rare-stock signal MKT-014 · card MKT-004 · detail MKT-005, MKT-006 · tank fit MKT-009, MKT-010 · buy states MKT-011 · gone offer MKT-012 · morph frequency MKT-006<br>**Other:** encyclopedia GEN-012, DES-006 · forecast GEN-008 · exact test updates GEN-005 A2–A3, GEN-006 A4–A5, GEN-009 A4, GEN-012 A2 · determinism GEN-009 A3 · catalog/performance PERF-001, GEN-007 · no engine rewrite GEN-001 A2, GEN-003 A3 |
| S3-A | Auto-feed and meals/day AUTO-004 · Auto Water Changer AUTO-006 · Auto-clean AUTO-007 · core extraction AUTO-008 (A3: an ADR if the alternative is used) · daily changes and weekly glass AUTO-009 · salt AUTO-010 · staff AUTO-011 · alerts AUTO-005, DES-007 · finances/upkeep AUTO-006 A3 · offline catch-up AUTO-009 A4 |
| S3-B | preferences and fixed quiet hours NOTIFY-002 · categories NOTIFY-003 · permission flow NOTIFY-007 · web delivery NOTIFY-008 · service-worker click routing and deep-link return NOTIFY-009 · rate limiting NOTIFY-005 · evidence NOTIFY-010 · closed/native deferred NOTIFY-011, PLAT-004 (DEFERRED, ADR-0001) |
| S3-C | several lines PROD-002, PROD-001 A2 · pair PROD-004 · breed PROD-005 · raise PROD-006 · quarantine PROD-007 · keeper tank PROD-008 · running/paused PROD-009 · pause-when-full PROD-010 · never-sell-Prismatic PROD-011 · auto-listing PROD-012 · keep rules PROD-013 · reserve PROD-014 · statistics PROD-015 · Breed→Sell pipeline PROD-004 to PROD-014 · deterministic PROD-016 · restart-safe AUTO-026 · tolerant PROD-017 · UI PROD-003, DES-008 (BLOCKED: DESIGN-S3C-LINES) with PROD-018 |
| S3-D | **Gating:** design dependency AUTO-002 A2, HARNESS-003 A3, HARNESS-027, AUTO-028 A1<br>**Tiers:** Tier 1 = the S3-A requirements · Tier 2 AUTO-012 · Tier 3 AUTO-013 (A1 reconciles names) · Tier 4 AUTO-014 · Tier 5 AUTO-015 (throughput and bottlenecks via AUTO-014 A2; shortages via AUTO-012, AUTO-013, AUTO-017; **"scheduling" has no criterion**, R3-m4)<br>**Rules:** simulation rules AUTO-016, AUTO-017, AUTO-018, AUTO-019, AUTO-026 · anti-dupe invariants AUTO-020 to AUTO-027 · scope control AUTO-028 |
| S4 | **Stub:** panel SOC-003 · SocialService SOC-009 · sign-in SOC-005 · no password persistence SOC-002 · clubs, trading, friends and leaderboards SOC-008 · invites SOC-006 · routes SOC-003 · dock and More Social SOC-004 · states SOC-010 · stub tests SOC-009 A1 · dev-only override SOC-011<br>**Hardening:** typecheck REL-004 · unit REL-005 · e2e REL-006 · build REL-007 · visual QA DES-011 · responsive QA DES-012 · performance PERF-002 · determinism CONST-003 · automation invariants AUTO-029 · persistence PERSIST-004, PERSIST-008 · route audit NAV-019 · accessibility ACC-005 · TODO/stub audit REL-008 · traceability HARNESS-007<br>**Stop:** default stopping point REL-002, HARNESS-024 A2 |

### Master §10 (13 questions, output, stop)

| Question | Requirement |
|---|---|
| All five slices accepted? | REL-009 |
| Every required review passed? | REL-010 |
| Zero unresolved red defects? | REL-011 (A2: R3-M1) |
| Handoffs succeeded? | REL-012 |
| Tests reliable? | REL-013 |
| Branch reproducible? | REL-014 |
| Simulation stable? | REL-015 |
| Automation invariants green? | AUTO-029 |
| UI/browser QA green? | DES-011 |
| Performance within budgets? | PERF-002, PERF-003 |
| Traceability complete? | HARNESS-007 |
| Clean trust boundary? | REL-016 |
| Debt small enough? | REL-017 |
| Output (`READY_FOR_MULTIPLAYER_EXPANSION` and the six proposals) | REL-018 |
| STOP, and owner approval for real multiplayer | REL-002 |

### Design subsections

§1 (Goals) and §4 (what exists today) only summarise later sections; their items are mapped through those sections.
§1 item 10 maps to CONST-001 and to PERSIST-001, which is SUPERSEDED (ADR-0005 decision 1). The appendices are
informative: Appendix C backs §8.5 and is cited by GEN-006.

| Section | Requirements | Gaps |
|---|---|---|
| §2 D1–D14 | **Navigation and Social:** D1 NAV-002, NAV-004 · D2 SOC-004 (+SOC-011) · D5 SOC-003 to SOC-008 (+SOC-011) · D9 NAV-009, CONST-001<br>**Automation and notifications:** D3 AUTO-004, AUTO-006, AUTO-007 · D7 NAV-013, MKT-002, NOTIFY-011, PROD-* · D13 NOTIFY-008, NOTIFY-011<br>**Genetics and shop:** D4 MKT-002, MKT-008, GEN-010 · D10 GEN-003, GEN-004 · D11 GEN-005 · D12 MKT-009, MKT-010<br>**Release:** D14 REL-003 (overridden: prepared only) | none (D6 and D8 aren't behaviour) |
| §3 items 1–8 | 1 CONST-001 · 2 GEN-001 A2, GEN-003 A3 · 3 PERSIST-007 (+master §3.5, PERSIST-003) · 4 master §3.8 override: SOC-003 A4, PERSIST-006 A4, PROD-016 A2 · 5 CONST-003, CONST-004, AUTO-016, REL-016 A1 · 6 DES-001, NAV-018, ACC-002, ACC-003 · 7 DES-003 A3 · 8 CONST-002 | none |
| §5.1–§5.7 | NAV-002 to NAV-008, NAV-010 A4, NAV-017, MKT-014, SOC-004 (A1, A2, A5), DES-012; §5.7 edge states via MKT-003, MKT-010, MKT-011, NAV-014, SOC-005, SOC-006, NOTIFY-006 | none (requirements-2 m8 closed) |
| §6.1–§6.6 | NAV-009 to NAV-016, MKT-003, MKT-006, MKT-012, NOTIFY-009, SOC-003, SOC-006, PROD-003, PLAT-005 A4, NAV-019 | none |
| §7.1–§7.8, §7.4.1 | MKT-002 to MKT-015, GEN-008, GEN-010, GEN-011, NAV-015, NOTIFY-004, SOC-008, AUTO-007 A3 | none |
| §8.1–§8.7 | GEN-002 to GEN-013, MKT-004, MKT-007, PERF-001 | details: R3-m3 |
| §9.1–§9.2 | GEN-010, GEN-011 | none |
| §10.1–§10.4 | AUTO-003 to AUTO-011, AUTO-023, DES-007 A1 | none |
| §11.1–§11.3 | PROD-002 to PROD-018, DES-008, AUTO-014, AUTO-019 to AUTO-025 | owner questions in notes (HARNESS-030) |
| §12.1–§12.8 | NOTIFY-002 to NOTIFY-011, DES-009, AUTO-005, NAV-016, SOC-011 A5 | none |
| §13.1–§13.6 | SOC-002, SOC-003, SOC-005 to SOC-011, DES-010 | none |
| §14 | PLAT-001 to PLAT-004, PERSIST-014 | none |
| §15 | Every row mapped: GEN-002, GEN-003 to GEN-005, AUTO-006, AUTO-008, AUTO-009, AUTO-011, NOTIFY-004, MKT-014, GEN-011, PROD-016, SOC-003, NAV-016, PERSIST-006, GEN-010, REL-003, NOTIFY-002, SOC-009, NOTIFY-009, NAV-018 (new CSS files). Compatibility checks: PERSIST-002, PERSIST-006 A3, PERSIST-007 A2; the v0.4.0 row is PERSIST-001 (SUPERSEDED) | none |
| §16 (10 copy areas) | Navigation DES-003 · Links/boot DES-004 · Locked NAV-008 · Shop/offers DES-005 · Encyclopedia DES-006 · Automation DES-007 · Production DES-008 (BLOCKED) · Notifications DES-009 · Social DES-010 · About REL-003 (proposal only) | none |
| §17 | DES-001, DES-011, NAV-003, NAV-005, NAV-006, NAV-007, NAV-013, MKT-002, MKT-007, MKT-009, GEN-011, AUTO-003, ACC-002 (the "OS notification" rows imitate OS chrome and aren't built) | none |
| §18 | ACC-001 to ACC-005, SOC-005 A4, NAV-012 A2 | none |
| §21 | **Phases:** Phase 0 NAV-009, PLAT-001, DES-003 A3 · Phase 1 NAV-010, NAV-012, NAV-013, NAV-017 · Phase 2 GEN-006, GEN-009, MKT-* · Phase 3 AUTO-009, NOTIFY-003 · Phase 4 SOC-004, SOC-006 · Phase 5 PROD-002, PERSIST-006 · Phase 6 NOTIFY-011, PLAT-004 (DEFERRED)<br>**Release and per-phase rules:** release step REL-003 · no new dependencies CONST-001 · "v0.4.0 save loads" PERSIST-001 (SUPERSEDED) | none |
| §22 | **Risks 1–13:** GEN-007, GEN-013 · NAV-012 · SOC-003 A4, PROD-016 A2, PERSIST-006 A4, NOTIFY-009 · NOTIFY-001 A2 · DES-009, NOTIFY-006 (owner question) · PERF-001 A3 · NAV-003 · AUTO-006 · production stays S3 (master §9) · SOC-011 · NAV-006 · SOC-004 A1 · AUTO-008 A2<br>**Q1–Q5:** AUTO-006 A2, NOTIFY-002, GEN-004 A4, NAV-008, PROD-002 | none |

### §19 test-id areas (87 ids with alternatives expanded; each appears in a requirement's description, criteria or tests)

| Area | Ids | Requirements |
|---|---|---|
| Navigation | 15/15 | DES-003, NAV-002, NAV-004, NAV-005, ACC-001; `more-social` and `dock-social` in DES-010, SOC-004, SOC-011 |
| Boot / links | 2/2 | DES-004, NAV-013 |
| Shop | 7/7 | DES-005, MKT-002, MKT-003 |
| Offer | 10/10 | DES-005, NAV-015, MKT-006 to MKT-011, GEN-011 |
| Encyclopedia | 4/4 | DES-006, GEN-012 |
| Tank card | 6/6 | DES-007, AUTO-003, AUTO-004, AUTO-007, ACC-004 |
| Alerts | 2/2 | DES-007, AUTO-005, NOTIFY-007 |
| Settings | 14/14 | DES-009, NAV-016, NOTIFY-006, NOTIFY-002 |
| Social | 16/16 | DES-010, SOC-003 to SOC-008 |
| Production | 11/11 | DES-008, PROD-003 (both BLOCKED), PROD-009, ACC-004 |

### §20 tests

**§20.1 (16 unit test files)**

| Test | Requirements |
|---|---|
| nav-routes | NAV-009, NAV-014, NAV-015, NAV-016 |
| nav-sync | NAV-010, NAV-011, NAV-012, MKT-006 |
| genetics-expansion | GEN-002 to GEN-009, PERF-001 |
| genetics-lab-reveal | GEN-010 |
| shop-filters | MKT-002, MKT-003 |
| offer-genes | MKT-007, MKT-008 |
| automation-water-changer | AUTO-006, AUTO-008 to AUTO-011, AUTO-023 |
| notify-navdots | MKT-014 |
| notify-offer-events | NOTIFY-004 |
| automation-autofeed-ui | AUTO-003, AUTO-004, AUTO-005 |
| notify-rules | NOTIFY-002, NOTIFY-003, NOTIFY-005, NOTIFY-008 |
| notify-forecast | NOTIFY-011 (DEFERRED) |
| platform-memory | PLAT-001, PLAT-002 |
| social-stub | SOC-002, SOC-005, SOC-006, SOC-008, SOC-009 |
| production-line | PROD-002 to PROD-017 |
| persistence-05 | PERSIST-002, PERSIST-006, PERSIST-007, PERSIST-008 (its v0.4.0 row is PERSIST-001, SUPERSEDED) |

**§20.2 (8 e2e specs)**

| Spec | Requirements |
|---|---|
| nav.spec | NAV-010, NAV-011, NAV-012, NAV-014, NAV-015, MKT-012 |
| deeplink-boot | NAV-013, DES-004 |
| mobile-tabbar | NAV-002 to NAV-005 |
| shop-filters.spec | MKT-002, MKT-003 |
| automation.spec | AUTO-004, AUTO-007 |
| notifications.spec | NOTIFY-006, NOTIFY-007, NOTIFY-009 |
| dock-width | SOC-004 A1 |
| mobile-sheets | NAV-003, NAV-006, NAV-007 |

**§20.3 (8 rows)**

| Row | Requirements |
|---|---|
| ui-layout phone test | NAV-017 |
| morph-catalog | GEN-006 A4 |
| ui-prismatic | GEN-012 A2 |
| fix-panels-b-morphs | GEN-005 A2–A3 |
| hand-built name tests | GEN-009 A4 |
| version.test | REL-003 |
| Settings-tab and dock-item counts | NOTIFY-006 A4, SOC-004 A4 |
| fix-hud-* | NAV-018 |

**§20.4 (must stay green)**

| Item | Requirements |
|---|---|
| The listed tests | CONST-002 A1–A2 |
| openPanel | NAV-002 A2 |
| calm HUD | NAV-003 A3 |
| Market bids dot | MKT-014 A2 |
| save.spec | NAV-016 A3 |
| shop-offer-0 | MKT-002 A2 |
| reload behaviour | NAV-012 A1 |
| keeper and Autofeeder behaviour | AUTO-004 A4, AUTO-011 A3 |
| copy-fixes | GEN-003 A4 |
| species-fw | GEN-002 A2 |

## Findings

Severity:
- **Blocker:** S0 can't be accepted until it's fixed.
- **Major:** must be fixed before the affected slice plans its work.
- **Minor:** should be fixed. Items marked "before S0 acceptance" fall under HARNESS-020 A2 ("a mismatch is
  repaired in the requirement before S0 acceptance").

### Blocker

**R3-B1. HARNESS-013 and HARNESS-016 can only be met after S0 is accepted, but must be closed when it is.**

- **File:** `docs/agent/REQUIREMENTS.json`, HARNESS-013 A3 and HARNESS-016 A2. Both are new in this candidate.
- **The criteria:**
  - HARNESS-013 A3: "… and after S0's NEXT_SLICE evidence/S0/slice-contract.md holds the S0 contract and
    CURRENT_SLICE.md is S1's draft from the template".
  - HARNESS-016 A2: "In the commit that closes S0, HANDOFF.md holds the generated block that node
    scripts/agent/handoff.mjs prints for that state …".
- **Why S0 can't close them:**
  - `lib.mjs` defines `ACCEPTED_STATES` as `ACCEPT`, `CHECKPOINT`, `COMPACT`, `HANDOFF`, `NEXT_SLICE`, and so on.
    In those states `check-state.mjs` runs the full audit (L508).
  - In those states the audit (`requirements.mjs`) reports an error for any current-slice requirement that isn't
    GREEN, DEFERRED or SUPERSEDED. After `next-slice.mjs`, the same applies to S0 as an accepted slice.
  - `OPERATIONS.md` §6 records `ADVERSARIAL_REVIEW → ACCEPT` in checkpoint step 3. `next-slice.mjs` and
    `handoff.mjs --write` run, and the closing commit is made, only in step 6.
  - `sim.mjs` confirms it on an in-memory copy. With every S0 requirement GREEN, the audit at `ACCEPT` passes. With
    HARNESS-013 and HARNESS-016 still IN_PROGRESS, it fails at `ACCEPT`, at `NEXT_SLICE` and at S1 `BOOTSTRAP`
    ("… is IN_PROGRESS but S0 claims acceptance", then "… belongs to accepted slice S0").
  - So there is no state where they can stay open. Marking them GREEN at step 3 would claim evidence that doesn't
    exist yet (master §18 rule 6).
- **Same wording, but checkable before ACCEPT:** HARNESS-001 A2, HARNESS-009 A1 and A3, HARNESS-010 A4 and
  HARNESS-019 A3 say "at/on the S0 checkpoint". These can be run on the accepted tree before step 3, because the
  checkpoint commit holds exactly that tree. Their wording should say so.
- **Fix:**
  - In S0, criteria should test only what S0 can test: `next-slice.mjs`'s archive-and-draft and `handoff.mjs`'s
    block, in `agent.test.mjs` or a logged dry run, and the handoff block printed before `ACCEPT`.
  - Move "after S0's NEXT_SLICE" and "the commit that closes S0" to the standing HARNESS-024 (ALL), which already
    covers checkpoints and `next-slice`, or to an S1 requirement checked at S1's `BOOTSTRAP`.

### Major

**R3-M1. REL-011 A2 depends on the owner package, which is written after S4 is accepted.**

- **File:** `REQUIREMENTS.json`, REL-011 (S4).
- **The criterion:** "Every defect logged since S0 is fixed, or is recorded as a non-blocking limitation in the owner
  package."
- **Why it can't be met in time:** the owner package is written at `MULTIPLAYER_READINESS_GATE`
  (`OPERATIONS.md` §4 "After S4"; master §49 "At the final gate"). But the audit requires REL-011 GREEN at S4
  `ACCEPT`.
- **Effect:** any defect left as a limitation can't be evidenced when it must be. requirements-2 M1 fixed this
  pattern in REL-013, REL-015, REL-016 and REL-017, not here.
- **Fix:** record limitations in S4's own evidence before `ACCEPT` (for example REL-017's debt inventory or
  `docs/KNOWN_LIMITATIONS.md`), and have the owner package link them (master §49 item 6, REL-018).

### Minor

**R3-m1. The registry predates ADR-0012** (owner answers, 2026-10-06; added after `e79aeba`) and doesn't cite it.
`CURRENT_SLICE.md` now lists ADR-0012 as a governing decision.
- HARNESS-018 A3 still says "ADR-0004 decision 2: the Claude desktop app". Its note says "HANDOFF step 9 has the
  owner run e2e from the Claude desktop app".
  - ADR-0012 decision 3 has the owner run `verify-slice.mjs --gates unit,e2e` natively from Terminal.
  - Whether that settles BF-003's open owner question isn't recorded. `baseline-failures.json` still has
    `ownerAcknowledgement: null` for BF-001 and BF-003.
- HARNESS-021 A2 lists the owner-decision ADRs as "ADR-0002 and ADR-0004 to ADR-0010", without ADR-0012.

**R3-m2. Repository facts that don't match the S0 tree** (HARNESS-020 A2: fix before S0 acceptance).
- **NAV-006:** its source cites "AQUARIUM_GO_0_5_DESIGN_SPEC.md L191-193" for "Phones held sideways". Since the
  harness banner was added (`62df438`), those lines are L197-199.
- **HARNESS-011 A1:** it says `check-state.mjs` and `requirements-audit.mjs` fail on "GREEN without existing tests
  and evidence".
  - `validateRequirements` checks only that a GREEN requirement names some test and that its evidence paths exist.
    Test files are never checked.
  - The `agent.test.mjs` "requirements: schema, append-only ids and GREEN evidence" test covers only the evidence
    path.
  - So a requirement can go GREEN while still naming an unwritten "new:" test; only HARNESS-007 A3 at S4 would
    catch it.
  - **Fix:** reword A1, or extend the validator (a gate-defining file, so that needs an ADR and a review).

**R3-m3. Design §8.1 and §8.3 data details without a criterion.**
- **Cambodian overlay `rarity`:** GEN-003's description omits the overlay's `rarity: 0.25`, and no criterion
  asserts either overlay's rarity. The value feeds `resolveMorph`'s rarity (`genetics.ts` L387-388), which
  valuation and buyers use (`morphRarity`).
- **Metallic locus note:** §8.1 says "The locus note fields must say they are simplifications". GEN-003 A3 checks
  only the Cambodian note; GEN-004 has no check of the Metallic note.
- **Species notes:** GEN-005's `genetics.notes` sentence has no criterion.

**R3-m4. Master §9 S3-D Tier 5 "scheduling" has no criterion.** AUTO-015's description names it, but A1–A4 don't
test it. Bottlenecks, throughput and shortages are tested only through AUTO-014 A2 and AUTO-012, AUTO-013 and
AUTO-017. The requirement is BLOCKED on DESIGN-S3D, so add the criterion at design intake (`DESIGN_INTAKE.md`
step 6).

**R3-m5. Two requirements rename an existing test without the approval the testInventory gate needs.**
- NAV-017 renames the `ui-layout.spec` phone test, and GEN-006 A5 renames the pinned `report-rarity` betta test.
- `test-inventory.mjs` allows a renamed or removed test id only when `evidence/<slice>/test-changes.json` lists it
  with a requirement and a committed ADR. Neither criterion says so, and no harness document mentions
  `test-changes.json`.

**R3-m6. HARNESS-029 A2 conflicts with the BF-001 fallback.**
- A2 says "Every existing test named by an ALL/ACTIVE requirement passes on the accepted tree". At S0 that includes
  CONST-002's twelve e2e specs.
- This conflicts with CONST-002's note ("first judged at S1 acceptance") and with the BF-001 fallback in
  HARNESS-018 A3 and `CURRENT_SLICE.md` acceptance criterion 3.
- HARNESS-029 A1 allows "not run with the reason"; A2 should say the same.

**R3-m7. CONST-001's test has no S1 carrier.** Its proposed `core-dependencies.test.ts` is "written in S1", but no
S1 requirement or audited criterion fails S1 when it's missing. Compare PERSIST-003, implemented through
PERSIST-014, and PERSIST-002 and PERSIST-007, carried by PERSIST-006. Only HARNESS-007 A4 at S4 enforces it. This is
what remains of requirements-2 M2.

**R3-m8. Nothing mechanical enforces this review at S0 acceptance.** `STATE.requiredReviewers` is
`code-architecture`, `security-data` and `adversarial`. So `check-state.mjs` doesn't require a GREEN requirements
review at S0 acceptance. CURRENT_SLICE acceptance criterion 4 and HARNESS-011 A3 rest on the acceptance report
alone. Adding `requirements` to S0's required reviewers would enforce it.

### Checked and correct

- **Ids:**
  - Append-only across every committed version: `94de6bb` (11), `62df438` (23), `5ae85a3` (185), `e79aeba` = HEAD
    (208).
  - All 151 draft ids are present.
  - 15 families, each numbered from 001 with no gaps.
- **Statuses:**
  - No ACTIVE entry outside ALL; no IN_PROGRESS entry outside S0; all 28 S0 entries are IN_PROGRESS.
  - Seven BLOCKED, matching HARNESS-003 A3 exactly: DES-008 and PROD-003 by DESIGN-S3C-LINES; AUTO-002 and
    AUTO-012 to AUTO-015 by DESIGN-S3D.
  - DEFERRED and SUPERSEDED entries cite committed, indexed ADRs: NOTIFY-011 and PLAT-004 cite ADR-0001;
    PERSIST-001 cites ADR-0005 decision 1.
- **Umbrellas:** each of the nine umbrellas lists exactly its family's children in its slice. The only cross-slice
  links are REL-010 to REL-017 → REL-002 (ALL), which is intended.
- **Slices:** they follow master §9: S3 before S4; PERSIST-014 in S1 with a written reason; PLAT-005 in S1.
- **Sources:** checked for the new and changed entries. The ADR decision numbers quoted (ADR-0004 decision 4 →
  ADR-0003 rules 1, 2, 4 and 6; ADR-0005 decisions 1–7; ADR-0008 §3–§5) match the ADRs.
- **CURRENT_SLICE agreement:**
  - The governing list holds every S0 entry.
  - The 13 task rows and the requirements' `tasks` agree, with 0 mismatches.
  - The sections equal the template.
  - The required reviewers include STATE's.
- **Paths:** all 65 distinct existing test paths named exist. None of the 57 "new:" paths exists yet. Every
  `agent.test.mjs` label a criterion cites matches a real test.
- **Repository facts** (beyond R3-m2): these quoted facts match the candidate tree.
  - **Test lines:**
    - `ui-layout.spec` L84–104, L89, L98
    - `morph-catalog` L58–65
    - `ui-prismatic` L49
    - `fix-panels-b-morphs` L58–77
    - `lifecycle-genetics` L150–152
    - `rare-variants` L202–203 and L241–242
    - `version.test` L19–22
    - `ui-notify-news` L117
  - **CSS and source values:**
    - `hud.css` L521–523
    - `panels.css` landscape rule L965–980
    - `hudReserve` phone bottom 150
    - `MOBILE_QUERY`
    - `CompatPreview` long labels with `StatusBadge` + `verdictStatus` (L39)
  - **Config:**
    - `playwright.config.ts` `retries: 0`, `forbidOnly`, `E2E_REUSE`
    - `vitest.config.ts` `allowOnly: false`, `requireAssertions`, `setupFiles`
    - `tsconfig.json` include
  - **Quoted test names:** PERSIST-002's five and GEN-006 A5's pinned betta row.
  - **Code and data:**
    - The `water/step.ts` grace change: the stuck-heater draw is skipped, so PERSIST-012's corrected description
      holds.
    - The `morphCatalog.ts` locale change.
    - `rarityReport.ts` uses `morphCatalog` and `strainTier`.
    - `test-inventory-baseline.json`: 1,753 Vitest and 47 Playwright tests at `0d9fc5a`, tree `454801df`.
    - `PROTECTED.json` at `fe6f674`.
  - **Identifiers:** all 72 existing-code identifiers the registry quotes exist in `src`, for example `lockedToast`,
    `pickAutofeedFood`, `rememberOfferReturn`, `previewAddition`, `warnKey`, `keeperWaterCare`,
    `configureStorageDetection`, `marketTimeScale` and `findNonFinite`.

## Status of requirements-2 findings

| Finding | Status | What settles it |
|---|---|---|
| **B1** (S0 §9 bullets untraced) | **Resolved** (coverage) | **Per bullet:** HARNESS-009 operating package · HARNESS-010 state/ledger · HARNESS-011 traceability · HARNESS-012 evidence capture · HARNESS-013 slice contract · HARNESS-014 context pack · HARNESS-015 verification runner · HARNESS-016 handoff generator · HARNESS-017 branch (A1 "integrationBranch is "main"") · HARNESS-018 baseline evidence (A3 "BF-001: npm run e2e runs for real … if browsers still can't start … an owner ADR acknowledges BF-001") · HARNESS-019 baseline SHA · HARNESS-020 design vs repo · HARNESS-021 ADRs · HARNESS-001 bootstrap · HARNESS-022 no product features.<br>**HARNESS-001:** its tasks are now S0-T4, S0-T11 and S0-T12.<br>**Caveat:** two of the new criteria cause R3-B1. |
| **M1** (S4 entries need the gate report) | **Resolved** for the four named | **Rewritten to record before S4 is accepted:** REL-013 A1 "each run recorded as its own record in evidence/S4/manifest.json … before S4 is accepted" · REL-015 A1 "recorded in evidence/S4/manifest.json … before S4 is accepted" · REL-016 A3 "Before S4 is accepted, S4's evidence lists …" · REL-017 A1–A2 "recorded in S4's evidence … before S4 is accepted".<br>**Linking:** REL-018 A3 links them.<br>**Remaining:** the same pattern in REL-011 A2 (R3-M1). |
| **M2** (ALL has no closure path) | **Resolved** | **PERSIST-003:** PERSIST-014 (S1, PENDING) "implements PERSIST-003 A1-A2", and PERSIST-003's test is "written in S1 by PERSIST-014".<br>**PERSIST-002:** A1–A2 name five existing tests (quoted names verified).<br>**CONST-001:** A1 checks S0 by `git diff` (verified true), and its test is "written in S1".<br>**HARNESS-029:** adds the per-acceptance table of ALL/ACTIVE tests.<br>**Residual:** R3-m6, R3-m7. |
| **M3** (PERSIST-004 could close without its scope) | **Resolved** | **Status:** S4, PENDING (was IN_PROGRESS).<br>**Criteria for the remainder:** A1 oversized lists in bounded time · A2 non-finite or out-of-range numbers · A3 enum fields (B-004) · A4 the clone copies only own keys · A5 a second repair finds nothing and PERSIST-011's tests stay green.<br>**Open:** its thresholds are flagged as proposals (HARNESS-030). |
| **M4** (owner-confirmed rules) | **Resolved** | **New ALL/ACTIVE requirements:** HARNESS-023 stop at 3 distinct strategies or 5 attempts, judged by a reviewer · HARNESS-024 checkpoint commit and tag, automatic advance · HARNESS-025 independent topology, with code-architecture and adversarial every slice · HARNESS-026 YELLOW never advances · HARNESS-027 an owner gate parks only the blocked item · HARNESS-028 gate-defining and deploy files need an ADR and a sign-off.<br>**Tests:** each cites `agent.test.mjs` tests that exist. |
| m1 (stale tier wording) | Resolved | **GEN-006:** the description says today's rule "which ADR-0005 decision 4 keeps", and A3 asserts the §20.1 tiers and the 1 / 9 / 21 / 43 / 466 counts.<br>**GEN-007:** its source says the ADR-0003 row was "answered by ADR-0005 decision 4". |
| m2 (report-rarity re-pin unnamed) | Resolved | GEN-006 A5 names the re-pin of the "betta, pinned from the current data …" test, and the GEN-013 note points to it. The rename needs a `test-changes.json` entry (R3-m5). |
| m3 (stale text) | Resolved | **Notes:** REL-008 and REL-017 notes say BACKLOG.md exists. The SOC-011 note points to the registry row "D2, D5 and §13", which `DESIGN_REGISTRY.json` has.<br>**Criterion:** HARNESS-003 A1 names DESIGN-S3C-LINES. |
| m4 (SOC-002 umbrella) | Resolved | SOC-002's source ends "umbrella SOC-001", which gives SOC-001 10 children. |
| m5 (v0.4.0 load wording) | Resolved | GEN-009 A1 says "(design §8.6 as genome normalisation)". PERSIST-002 says "This is idempotence, not a promise that v0.4.0 saves load". |
| m6 (no diff base) | Resolved | GEN-003 A3 uses `git diff <S1 checkpoint>..<S2 candidate>`. The S0 `morphCatalog.ts` change is verified. |
| m7 (open notes) | Resolved | HARNESS-030 (ALL/ACTIVE) makes each slice settle its "Needs owner or reviewer confirmation" notes before PLAN_LOCK and none may remain at ACCEPT. There are 26 such notes now (REL-008 and REL-017 settled, PERSIST-004 added), none in S0. |
| m8 (design details) | Resolved | **Design details:** NAV-004 A4 (the More dot for any More destination) · SOC-004 A5 (the dock-social dot) · SOC-011 A5 and the NOTIFY-003 note (club-show reminders only in dev mode).<br>**PERSIST-012:** the description, A3 and the note are corrected, and the code is verified. |
| m9 (S0 test traceability) | **Partly resolved** | **Resolved:** HARNESS-006 A6 names the `species-fw` and `species-marine` edits (diff verified).<br>**Still open:** PERSIST-009 A3 requires the header to name PERSIST-009. `tests/sim/core-fastmutate-atomic.test.ts` line 3 still says "PERSIST-004", so this S0 criterion is not met yet. |
| m10 (REL-001 approvals) | Resolved | REL-001's description and A1 name ADR-0007 (one push to `agent/s0-wip`) and ADR-0009 (fast-forward pushes during session `fb16c5d5-…` only). The source adds ADR-0004 decision 1 and `OPERATIONS.md` §3. |

Verdict: RED
