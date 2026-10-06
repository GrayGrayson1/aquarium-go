# Requirements review 1: draft of 149 new requirements (H0)

- **Role:** requirements (`docs/agent/prompts/ROLE_PROMPTS.md`), reviewer mode.
- **Reviewed:** `scripts/_audit/H0-main/requirements-new.json` (149 entries, sha256 `30a28dee6505e82dc1c7b46390ecf58131beb35fe2fe148812f6b6ec6edc5897`), merged after the 23 entries of `docs/agent/REQUIREMENTS.json` at HEAD `c774d38bc05ce2b9b62ae442ad6420537dd11535` (sha256 `14f0864e…acd0`, clean working tree).
- **Sources read:** master §3, §9, §10, §13, §40, plus the §30 checkpoint names and §41 audit rules; the whole design spec; ADR-0001, ADR-0002, ADR-0003; `DESIGN_REGISTRY.json`; the validator and audit code (`check-state.mjs`, `requirements-audit.mjs`, and the `lib.mjs` constants they use). I did not read `HANDOFF.md`, `LEDGER.jsonl` or any commit message.
- **Throwaway scripts** (git-excluded): `scripts/_audit/H0-review-reqs/{dump,validate,coverage,s4-accept-sim}.mjs`.

## Commands and results

| Command | Exit | Result |
|---|---|---|
| `node scripts/agent/requirements-audit.mjs` (committed registry) | 0 | `OK`; S0 6 IN_PROGRESS, ALL 4 ACTIVE, S1 1, S2 2, S3 4+1 BLOCKED, S4 3+1+1 |
| `validateRequirements({ requirements: [...existing, ...new] })` | n/a | 0 errors, 0 warnings |
| `validateRequirements(merged, HEAD registry)` | n/a | 0 errors: no id deleted, no collisions, no numbering gaps in any family |
| `auditRequirements(merged, STATE, …)` (current state S0) | n/a | 0 errors, 0 warnings |
| `node scripts/_audit/H0-review-reqs/coverage.mjs` | 0 | No uncovered design subsection, §16 area, §19 area or id, §20 test, or S1–S4 §9 bullet. Remaining hits are listed under Coverage below. |
| `node scripts/_audit/H0-review-reqs/s4-accept-sim.mjs` | 0 | Shows the S4 deadlock in F1 |

## Findings

### HIGH

**F1. The S4 acceptance deadlock (REL-009, REL-018; existing REL-002 and REL-003 have the same problem).**
`requirements-audit` reports an error when the current slice claims acceptance and one of its requirements is not GREEN, DEFERRED or SUPERSEDED. The states that claim acceptance (`lib.mjs` `ACCEPTED_STATES`) include ACCEPT, CHECKPOINT and MULTIPLAYER_READINESS_GATE. Three requirements can only be met after S4 is accepted:
- REL-009 A1 needs `checkpoint/S4-social-local-complete`, which master §30 creates "at mega-slice acceptance". Its A2 needs S4's GREEN acceptance report.
- REL-018 A1 needs the gate report, which master §10 produces only "when S4 is green".
- Existing REL-002 A1 needs the state to have already reached MULTIPLAYER_READINESS_GATE.

I simulated acceptance with every other S4 requirement GREEN. At ACCEPT, and again at MULTIPLAYER_READINESS_GATE, the audit reports "REL-002 / REL-009 / REL-018 is PENDING but S4 claims acceptance". It also reports "REL-003 is ACTIVE but S4 claims acceptance", because the audit doesn't treat a standing (ACTIVE) requirement as closed when it belongs to a numbered slice.

Fix (the orchestrator chooses one):
- move the post-acceptance gate items (REL-002, REL-009, REL-018) to slice `ALL` and evaluate them in MULTIPLAYER_READINESS_GATE;
- or reword them so they can be met before ACCEPT;
- or change the audit through an ADR (`scripts/agent/**` is gate-defining, master §3.8).

In every case, move REL-003 to `ALL`.

**F2. PROD-003 ignores ADR-0003's Production UI precondition (also affects DES-008, PROD-013 A3 and PROD-015 A4).**
ADR-0003's supersession table says: "Several lines per species; the UI needs a design ADR before S3-C UI work." No requirement in the merged set records that precondition. Instead, PROD-003 specifies a multi-line UI the design doesn't contain:
- one header card per line;
- "Set up a line" always available;
- a keep tank added to the setup flow, which design §11.1 defines as breed, raise and quarantine.

DES-008 asserts the single-line copy verbatim. With two betta lines, that copy would show "Betta line" twice.

Fix: give the Production UI requirements the precondition, either as BLOCKED with `blockedBy` naming the design ADR, or as a first acceptance criterion requiring that ADR. Take the layout and copy from the ADR. The simulation requirements (PROD-002 and PROD-004 to PROD-017) stay PENDING.

### MEDIUM

**F3. The rarity-tier question is treated as settled (GEN-007, GEN-006).**
ADR-0003 lists "§22 risk 1 (rarity tiers)" as an open owner question to settle before S2. GEN-007 replaces the owner's answer with a reviewer verdict and keeps today's thresholds by default. GEN-006 hard-codes the tier counts 1/9/21/43/466 and the tier words in its frequency labels; MKT-006 A2 and MKT-004 depend on those words too.

Fix: add a criterion that the owner's answer is recorded in an ADR before S2's tier work, and stop at OWNER_GATE until it is. GEN-006's tier assertions then follow that answer.

**F4. Notification copy that ADR-0003 and the native deferral leave open (DES-009, NOTIFY-006 A2).**
Both require every §12.2–§12.5 string verbatim, which pulls in two kinds of copy that shouldn't ship as settled:
- The Unsupported callout says "On iPhone, add Aquarium Go to your Home Screen to get notifications." ADR-0003 lists this copy, together with design §22 risk 5, as an open owner question under master §44. The app has no manifest, so the sentence isn't true today.
- The `app` variants promise alerts "even when the game is closed". Native wrapping is deferred (NOTIFY-011), and existing NOTIFY-001 says no copy promises alerts while the game is closed.

Fix: leave both out of the verbatim copy test, record the iOS sentence as an owner gate, and defer the `app` variants along with NOTIFY-011.

**F5. CONST-003 A3 already fails on today's code.**
The criterion is "a scan of src/sim finds no Math.random, Date.now, performance.now". Today:
- `src/sim/newGame.ts:97` has `const now = Date.now();`
- `src/sim/newGame.ts:171` has `randomSeed()`, which returns `(Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0`.

Both are new-game setup, outside the world step.

Fix: limit the scan to the step and automation code, as AUTO-016 A2 does, or allow-list the new-game seed.

**F6. HARNESS-007's criteria contradict each other.**
Its A2 accepts ACTIVE for S1–S4 requirements, but A1 (the audit exits 0) fails on an ACTIVE requirement in the slice being accepted (see F1, REL-003). Align them once standing requirements move to `ALL`.

**F7. Requirements that must turn GREEN have no tests.**
`validateRequirements` rejects "GREEN without tests and evidence", and these have `tests: []`:
- from the draft: AUTO-028 (S3); REL-008, REL-009, REL-010, REL-011, REL-014, REL-016 and REL-017 (S4);
- already in the registry: AUTO-002 (the S3 umbrella) and PERSIST-005 (S3).

As written, none of them can close. Name the check each one uses: a script, a command or an evidence file.

**F8. NAV-006 contradicts design §5.2 for phones held sideways.**
§5.2 keeps today's landscape sheet rule (`top: max(6px, safe-area-inset-top)`, `panels.css` L965–980). NAV-006 says every full panel on a phone opens from `calc(var(--safe-t) + var(--edge) + var(--topbar-h) + 6px)`. Neither NAV-006 nor DES-012 tests the landscape sheet top or the folded 2×4 tool rail ending above the bar.

Fix: exclude 844×390 from NAV-006 and add a landscape criterion.

**F9. No performance budgets are ever recorded (PERF-001, PERF-002).**
Master §10 asks whether performance is "within accepted budgets", and PERF-002 A2/A3 test against "the budgets the slice contracts recorded". No requirement makes any contract record numeric budgets: PERF-001 is only a reviewer verdict, and only PERSIST-005 asks for a save-size budget.

Fix: add a criterion that the S1, S2 and S3 contracts record frame-time and sim-step budgets before implementation.

**F10. Thresholds and policies the design doesn't state.**
I'm flagging these, not rejecting them. The owner should decide the first group (owner-visible behaviour); a reviewer can settle the second (test tolerances).

Owner:
- **AUTO-019 A1:** automated moves are refused when the compatibility verdict is High risk or Incompatible. The design only says setup is "validated with existing compat and stocking".
- **AUTO-017 A3:** every shortage gets an Alerts-drawer row. Design §10.3 gives the out-of-salt case only a 24 h-throttled notice.
- **AUTO-012 A4:** the Auto Water Changer draws on the S3-D reserves. This pre-empts DESIGN-S3D and conflicts with AUTO-010 A1's rule that salt use equals a manual change.
- **PROD-006 A3, AUTO-020 A2:** new notices and refusals for which the design gives no copy.

Reviewer:
- AUTO-009 A3 requires "matching water values" for 4 h versus 0.25 h steps, but design §20.1 says ≈, so state a tolerance.
- REL-013 A1 sets "3 consecutive runs".
- NAV-004 A1 allows 48% ± 3%, NAV-015 A2 allows 4 s ± 0.5 and NAV-007 A3 allows 118px ± 2.
- DES-001 A1's colour-literal scan may trip on literals the design itself gives in §5.2, §7.2 and §7.3.
- SOC-005 A3 reads "dev mode" as `?dev=1`.
- PROD-013 A2 breaks ties by id, and PROD-016 A1 compares 1 h with 6 h steps.

Apostrophes: DES-009 A1 makes the §12 strings use curly apostrophes, but NOTIFY-007 A3, SOC-005 A1, SOC-006 A1/A3 and SOC-010 quote §12 and §13 strings with straight ones. Choose one rule for both sections.

### LOW

- **F11 (NOTIFY-011, PLAT-004).** Their `decision` is "master §3.10", but master §13 says a DEFERRED requirement cites the ADR that decided it. Cite ADR-0001 ("Native wrapping deferred") and ADR-0003's supersession row; master §3.10 can stay in `source`.
- **F12 (CONST-002).** A1 lists only part of the e2e suite. `camera-freeze.spec`, `mobile.spec`, `resilience.spec` and `starters.spec` are named by no requirement, yet design §3 item 8 says the existing e2e flows keep passing. Write "every tests/e2e spec except the §20.3 rows".
- **F13 (AUTO-008, AUTO-009).** The test lists omit `fix-water-grace-equipment.test.ts` (equipment doesn't fail during the offline grace) and `waterlab-compat.test.ts`. The grace rule matters for a new device with `failureRate 0.002` that runs during catch-up.
- **F14 (placeholder criteria).** AUTO-019 A3 (favorite flag), PROD-015 A3 (cost attribution), SOC-010 A3 and NAV-014 A3 (copy DESIGN-0.5 doesn't define), REL-015 A1 (no minimum run length) and DES-011 A2 (doesn't say which §17 values are checked) can't be judged until a contract or the owner supplies the missing part.
- **F15 (PERSIST-007).** A1 lists `alleles[].rare` as a persisted field, but it is species data, not save data. PERSIST-007 also lacks PERSIST-001's escape, "unless an owner-approved ADR changes the save policy" (master §3.5).
- **F16 (design ambiguities for the S3 contract).** The draft leaves open where trait-kept juveniles go at Sort (§11.3 says "keep", not where), and where a Prismatic juvenile goes when keepPrismatic is off. PROD-011 A2 forbids listing it, so it would stay in quarantine indefinitely.
- **F17 (missing backlog).** `docs/agent/BACKLOG.md` isn't tracked and isn't in the tree. REL-008 A2 and REL-017 A1 cite it, and the design header and ADR-0003 say the design errata live there, so I couldn't check the errata against the draft.
- **F18 (core-owned edits).** Only PROD-016 A2 (the `world.ts` hook) carries master §3.8's conditions for core-owned edits. SOC-003 (`src/state/ui.ts`) and PERSIST-006 (`migrations.ts`) don't.

## Coverage

The cross-check found every item cited at least once:

| Area | Covered |
|---|---|
| Design subsections §5.1–§22 | 64 of 64 |
| §16 copy areas | 10 of 10 (Settings › About only through REL-003, as ADR-0003 intends) |
| §19 areas | 10 of 10, with every listed id inside some criterion |
| §20.1 / §20.2 / §20.3 / §20.4 tests | 16 / 8 / 13 / 15 (notify-forecast is DEFERRED) |
| Master §9 S1 / S2 / S3-A / S3-B / S3-C / S3-D / S4 bullets | 21 / 23 / 12 / 10 / 16 / 26 / 28 |
| Master §10 gate items | 14 of 14 |

Four §9 bullets matched by substance rather than by keyword:
- S1 "required test IDs": DES-003 to DES-010.
- S1 "route/unit/E2E coverage": NAV-009 to NAV-019.
- S2 "exact test updates": GEN-005, GEN-006, GEN-009, GEN-012, NAV-017 and NAV-018.
- S4 "no password persistence": SOC-002.

### Gaps (10)

1. ADR-0003's precondition for the S3-C UI (a design ADR) is recorded by no requirement (F2).
2. The rarity-tier owner question, due before S2, isn't recorded (F3).
3. The owner question about the §12.3 iOS "Home Screen" copy isn't recorded (F4).
4. Design §5.2 for phones held sideways: no criterion covers the landscape sheet top or the folded tool rail, and NAV-006 contradicts the landscape rule (F8).
5. Design §10.2 and §10.3 when the gear isn't unlocked yet:
   - The Autofeeder lock hint ("Research Better Life Support, or build husbandry mastery with regular care.") appears only in AUTO-004's description and has no acceptance criterion.
   - Because the two devices share the Autofeeder unlock (master §3.10), the Auto-clean row can show while `gear_autofeeder` is still locked. Neither the design nor AUTO-007 defines that state, and the "Not installed" row offers "Buy · $120".
6. No requirement records the performance budgets the §10 gate needs (F9).
7. Four existing e2e specs (`camera-freeze`, `mobile`, `resilience`, `starters`) are named by no requirement (F12).
8. DESIGN-0.5 has no copy for the §6.5 not-found states (tank, creature, listing, species) or for empty Social lists, and no requirement asks the owner or a design for it (F14).
9. Master §9 S0 bullets without an explicit criterion: context-pack generator, verification runner, handoff generator, evidence capture, baseline SHA and test evidence, checking the design against the repo, and an ADR per discovered conflict. Existing HARNESS-001 covers them only through its task list. This is outside the draft's brief; settle it before S0 acceptance.
10. Traceability: no requirement cites the §21 "Done when" clauses of Phases 0, 2, 3, 4 or 5, although every test and outcome they name is covered piecewise.

## Checked and correct

- **Schema.** Ids use master §40 families, every status is legal, and each requirement has 2–4 acceptance criteria. BLOCKED items carry `blockedBy` and DEFERRED items carry `decision`. No id collides with an existing one, and no existing entry is changed.
- **Owner overrides applied:**

  | Override | Where |
  |---|---|
  | Several production lines per species | PROD-002 |
  | Quiet hours fixed at 22:00–08:00, on/off switch only, no editing | NOTIFY-002 A4 |
  | One-copy Metallic unnamed | GEN-004 A4 |
  | Locked destinations open a locked panel, with no lockedToast | NAV-008 A1 |
  | Auto Water Changer shares `gear_autofeeder` | AUTO-006 A2 |
  | Native wrapping, §12.7, Phase 6 and notify-forecast deferred | NOTIFY-011, PLAT-004 |
  | Release prepared, not executed | no requirement bumps the version; REL-003 is intact |
  | S3-D Tiers 2–5 blocked by DESIGN-S3D | AUTO-012 to AUTO-015; the simulation rules and the eight anti-dupe invariants stay PENDING |

- **Slices.** Every requirement that cites a master §9 bullet sits in that bullet's slice, and the S4 hardening items are in S4. No requirement cites an umbrella from a different slice; NAV-019 and AUTO-029 correctly cite none.
- **Remote actions and constraints.** No requirement asks for a push, deploy, version bump, schema bump or new dependency. REL-016 uses ADR-0003's mutation boundary: `mutate`, `mutateFast` and `setGame`.
- **Facts checked against the repo:**
  - All 45 existing test files the requirements cite exist, and `npm run qa:shots` exists.
  - `tokens.css` holds the §17 colours that DES-001 A2 asserts.
  - Playwright `retries` is 0, which REL-013 A2 needs.
  - `version.test.ts` only matches versioned headings, so REL-003's `## Unreleased` works.
- **Duplicates.** None. The overlaps (AUTO-018 / AUTO-026, PERSIST-006 / AUTO-027 / PERSIST-008, CONST-003 / AUTO-016 / AUTO-029) are deliberate and differ in slice or angle. DES-005 combines the §19 Shop and Offer areas, and DES-007 combines Tank card and Alerts; both are acceptable.

## Summary

Coverage is complete except for the gaps above, and the merged set passes the harness validator. It still can't be merged as it stands:
- F1 would make S4 unacceptable under the harness's own audit.
- F2 would let S3-C build an owner-visible UI that ADR-0003 says needs a design ADR first.
- F3 and F4 treat three of ADR-0003's open owner questions as settled.
- F5 is a criterion that fails on today's code.

The fixes are targeted edits to about 20 requirements, with no restructuring.

Verdict: RED
