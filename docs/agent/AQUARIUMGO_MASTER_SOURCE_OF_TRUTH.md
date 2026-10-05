# AquariumGo — Master Source of Truth and Autonomous Build System

**Status:** APPROVED PLAN / READY TO INSTALL\
**Date:** 2026-10-05\
**Repository:** `GrayGrayson1/aquarium-go`\
**Verified planning baseline:** `0d9fc5a46085f746510a1041335632cd4f7314a2` (`v0.4.0: Prismatic animals, named strains and the morph catalog`)\
**Current product version at that baseline:** `0.4.0`\
**Primary approved design contract:** `docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md`\
**Default autonomous stopping point:** complete the local Social stub and all prior mega-slices, harden the full local stack, then stop at the Multiplayer Readiness Gate.\
**Remote-state rule:** nothing is pushed, merged, deployed, migrated remotely, published, or submitted without explicit owner approval.

---

## 0. The two principles that govern everything

> **CONTEXT IS DISPOSABLE. REPOSITORY STATE + CONTRACTS + TESTS + EVIDENCE + DECISIONS ARE DURABLE.**

> **BUILD AND VALIDATE THE STACK LOCALLY FIRST. NOTHING LEAVES THE LOCAL ENVIRONMENT UNTIL THE OWNER EXPLICITLY APPROVES IT.**

No chat transcript, hidden model memory, verbal handoff, or agent summary is authoritative. A new agent must be able to lose all prior conversational context and still recover the project correctly from the repository.

No agent may claim success because the code "looks right." Success requires objective evidence.

---

# PART I — PRODUCT CONSTITUTION

## 1. What AquariumGo is

AquariumGo is a living-aquarium tycoon and collection game in which individual animals matter. The player starts with a remarkable creature, builds and maintains aquariums, breeds distinctive lines, collects rare phenotypes, runs an aquarium business, sells animals and aquariums, attracts visitors, and eventually operates sophisticated aquarium/aquaculture automation.

The experience should combine:

- the attachment of caring for individual creatures;
- the discovery and collection depth of genetics and rare variants;
- aquarium-building and aquascaping;
- breeding strategy and lineage;
- a credible but approachable living-aquarium simulation;
- tycoon expansion;
- a late-game automation layer that becomes meaningfully systemic rather than a set of convenience toggles;
- eventually, opt-in social and multiplayer systems without sacrificing the local single-player game.

The aquarium itself remains the visual hero.

## 2. Product priorities

When tradeoffs are necessary, prioritize in this order:

1. Beautiful, delightful and satisfying to watch.
2. Actually playable and understandable.
3. Correctness of the simulation and player state.
4. Individual-creature identity, collection and breeding depth.
5. Stable, testable, deterministic systems.
6. Clear mobile and desktop interaction.
7. Extensibility.
8. Performance.
9. Implementation elegance.

A clever architecture that weakens the game is not an improvement.

## 3. Hard owner decisions

These decisions are locked unless the owner explicitly changes them later.

### 3.1 Build/release model

- Work is performed locally on a single integration stack.
- Mega-slices build on the previous accepted mega-slice.
- A successful mega-slice is locally committed.
- Meaningful internally-green checkpoints may also be locally committed.
- The next mega-slice begins automatically after the previous one is accepted.
- There is no routine owner interruption between green local slices.
- No push, PR, remote merge, deploy, production migration, remote secret mutation, package/store publishing, or other mutating remote action is allowed without owner approval.
- Read-only network activity for documentation, package/API verification and research is allowed.

### 3.2 Context and agents

- Mandatory fresh-context rollover occurs after every mega-slice.
- A rollover may also occur inside a mega-slice if context health degrades.
- Zero project state may depend on the old context surviving.
- Every handoff is reconstructed from repository files and evidence.
- Independent review is mandatory for every mega-slice.
- Default review topology:
  - Builder
  - Independent code/architecture reviewer
  - Browser/QA reviewer
  - Security/data reviewer when state, persistence, auth, service workers, networking or trust boundaries change
  - Performance reviewer when rendering, simulation cost, large collections, route/layout churn or automation scale can regress performance

### 3.3 Failure behavior

After three materially different unsuccessful repair attempts for the same blocking defect, stop the repair loop.

The orchestrator must:
1. mark the slice `BLOCKED_MANUAL_REVIEW`;
2. preserve the failing state and evidence;
3. create a root-cause report;
4. stop for owner/manual inspection.

It must not continue making random changes.

### 3.4 Git behavior

- Use one local integration branch for the stacked build.
- Reviewers may use additional local worktrees for isolation.
- Subagents do not push.
- The orchestrator owns local integration commits.
- Each mega-slice ends in a named local checkpoint commit.
- Destructive Git commands are forbidden by default.

### 3.5 Save compatibility

Old save compatibility is **not a constitutional requirement**.

Prefer compatibility where it is easy and low-risk. The approved 0.5 design is already largely additive and may preserve old saves naturally. However, correctness and clean architecture outrank heroic preservation of old saves.

A schema bump or explicit migration is allowed if deep automation or later architecture requires it, provided it is documented, tested, and locally reversible during development.

This owner decision supersedes any older statement that schema version 1 can never change.

### 3.6 Versioning

Do not bump the release version at the beginning of the local stacked build.

Versioning happens only when the final locally validated feature set is known and the owner approves a release plan.

### 3.7 Dependencies

For the current web/local stack, preserve the existing "no new dependencies" rule unless a dependency is demonstrably necessary and receives an ADR plus owner approval.

Native wrapping and real multiplayer/backend work are separately approved future dependency domains.

### 3.8 Core-owned files

The master build pre-authorizes **local** changes to core-owned files when those changes are explicitly required by an approved mega-slice.

Such changes must:
- be minimal;
- be mapped to a requirement ID;
- preserve contracts unless the contract change is explicitly approved;
- receive independent review;
- receive stronger regression coverage.

This does not authorize remote release.

### 3.9 UX authority

For desired behavior and design:

1. explicit owner decision;
2. this Master Source of Truth;
3. approved written design contract;
4. approved ADRs and slice contracts;
5. prototype visuals;
6. agent judgment.

For facts about what the code currently does, the repository wins.

When the prototype and the written design disagree, the written design wins unless the owner later changes it.

### 3.10 Product questions resolved on 2026-10-05

- Auto Water Changer shares the Autofeeder unlock.
- Quiet hours are fixed at 10:00 PM–8:00 AM for this release; players may turn quiet hours on/off.
- One-copy Metallic remains unnamed and adds only a subtle visual sheen; two copies produce the named Metallic phenotype.
- Locked destinations open a proper locked-state panel instead of only showing a toast.
- Multiple production lines per species are supported.
- Social remains a local stub for the first full autonomous stack.
- Native wrapping is deferred.
- Real multiplayer cannot begin automatically. It requires the Multiplayer Readiness Gate and explicit owner approval.

---

# PART II — VERIFIED REPOSITORY BASELINE

## 4. Baseline facts verified for this plan

At planning time, GitHub reports the latest visible commit as:

`0d9fc5a46085f746510a1041335632cd4f7314a2`

Commit subject:

`v0.4.0: Prismatic animals, named strains and the morph catalog`

The package at that commit reports:

- React `19.3.0`
- React DOM `19.3.0`
- Three.js `0.186.0`
- `@react-three/fiber` `9.8.0`
- `@react-three/drei` `10.7.8`
- Zustand `5.0.15`
- Immer `11.1.18`
- Vite `6.4.3`
- TypeScript `5.9.3`
- Vitest `3.2.7`
- Playwright `1.63.0`
- `idb-keyval`
- Motion
- postprocessing
- Lucide
- bundled Fraunces and Inter fonts

Existing scripts at the baseline:

```text
npm run dev
npm run build
npm run preview
npm start
npm run typecheck
npm test
npm run test:watch
npm run e2e
npm run shot
npm run qa:shots
npm run docs:research
npm run qa:motion
```

The harness MUST re-run a local baseline audit before implementation. These facts are a planning baseline, not permission to assume a future checkout is unchanged.

## 5. Verified architecture rules

The repository's architecture defines strict layers:

```text
src/types        contracts only
src/data         pure game/species/catalog data
src/sim          deterministic game simulation
src/state        Zustand game/UI/settings stores
src/persistence  save slots, migrations and offline handling
src/game         real-time loop
src/runtime      non-persisted per-frame registries
src/ai           creature behavior
src/render       Three/R3F rendering
src/ui           React DOM UI
src/audio        procedural Web Audio
src/dev          fixtures, sandboxes and debug support
```

Core architectural laws:

- the deterministic simulation is the source of truth;
- render code never mutates game state directly;
- persisted game mutations go through the game mutation boundary;
- species data is read through the species registry;
- simulation randomness uses the persisted simulation RNG;
- cosmetic randomness may be independent;
- exported contracts should remain stable unless a deliberate approved change requires otherwise.

## 6. Existing strengths that must not be accidentally rewritten

The current project is not a prototype shell. It already contains substantial systems.

The approved design and repository review establish that the build must **extend rather than replace** working foundations, including:

- deterministic simulation;
- tank/water systems;
- equipment;
- breeding/lifecycle;
- individual creatures;
- market/economy;
- compatibility;
- Prismatic rare variants;
- named strains;
- morph catalog;
- genetics and phenotype resolution;
- persistent saves and repairs;
- offline/catch-up simulation;
- visitors, shows and staff;
- R3F rendering, LOD and performance protections;
- mobile/landscape handling;
- UI test IDs;
- Vitest and Playwright coverage;
- screenshot and motion QA infrastructure.

The implementation agent must inspect the current files before editing. This section is a warning against unnecessary rewrites, not a substitute for inspection.

---

# PART III — DESIGN CONTRACT

## 7. Approved UX/UI result

The full approved v0.5 design specification is stored beside this document:

`docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md`

It is normative for:

- phone navigation;
- desktop dock changes;
- More sheet;
- routing and deep links;
- market/shop UX;
- offer detail;
- Prismatic surfaces;
- genetics presentation;
- Cambodian and Metallic behavior;
- Genetics Lab reveal behavior;
- temperament UI;
- Auto-feed and Auto-clean UX;
- Auto Water Changer behavior;
- production-line UX;
- notifications;
- Social stub;
- platform seam;
- copy;
- visual dimensions/tokens;
- accessibility;
- test IDs;
- expected tests and known at-risk tests.

Do not duplicate the entire design into slice prompts. Slice prompts should cite exact design sections and load only the relevant portions.

## 8. Design change gate

The present design is approved, but future design iterations are allowed.

A future design proposal is not automatically authoritative.

A Design Change Gate must:

1. identify the affected routes/screens/components;
2. compare against this master constitution;
3. compare against current product behavior;
4. check accessibility;
5. check mobile and landscape behavior;
6. check deep links and back navigation;
7. check simulation/state assumptions;
8. check performance implications;
9. list test IDs and screenshots that must change;
10. produce a Design ADR;
11. update only affected slice/task contracts and traceability records.

Unaffected contracts remain stable.

---

# PART IV — TARGET BUILD AND MEGA-SLICES

## 9. Minimum practical slice count

The chosen structure is **five mega-slices including the harness slice**.

This is intentionally aggressive.

Smaller phases exist inside each slice, but they are internal implementation checkpoints rather than owner-facing projects.

The five-slice model gives the coding agent a very large workload while maintaining genuine architectural boundaries where failure isolation matters.

### S0 — Autonomous Harness, Baseline and Architecture Lock

Purpose: make the system capable of safely building everything else.

Includes:

- create `docs/agent` operating package;
- create machine-readable state and append-only ledger;
- create requirements traceability;
- create evidence capture;
- create current-slice contract;
- create context pack generator;
- create verification runner;
- create handoff generator;
- establish local integration branch;
- establish baseline test evidence;
- record baseline SHA;
- verify approved design against actual repo;
- create ADRs for any discovered conflict;
- prove a fresh agent can bootstrap from repository state alone.

No major product feature implementation is allowed until S0 itself passes.

### S1 — UX Foundation, Navigation and Platform

Includes the approved design's foundation/navigation work and all supporting architecture:

- platform abstraction;
- route parser/formatter;
- hash routing;
- deep links;
- two-way store synchronization;
- pending route boot behavior;
- Back/Forward/Esc behavior;
- phone five-tab bar;
- More sheet;
- desktop navigation changes needed for the approved target;
- full-height phone panels;
- locked destination states;
- tutorial fallback behavior;
- settings-tab widening;
- Copy link/share seam;
- base notification platform seam;
- responsive/accessibility behavior;
- design-token fidelity;
- required test IDs;
- route/unit/E2E coverage;
- baseline visual snapshots.

Social screens themselves remain for S4, but the route and shell architecture must be ready.

### S2 — Genetics, Collection, Shop and Breeding Intelligence

Includes:

- Genetics Lab reveal correction;
- Cambodian locus;
- Metallic locus;
- rare allele metadata;
- Cambodian Veiltail strain;
- updated betta catalog;
- offer Genes panel;
- genotype disclosure rules;
- temperament section;
- Prismatic-only filter;
- Rare genes filter;
- rare-stock nav signal;
- offer card redesign;
- offer detail redesign;
- destination-tank fit behavior;
- buy-state rules;
- gone-offer behavior;
- morph frequency presentation;
- encyclopedia updates;
- breeding forecast integration;
- exact test updates;
- determinism checks;
- catalog/performance checks.

No rewrite of the genetics engine is expected unless repository inspection proves the approved design cannot be implemented through existing data contracts.

### S3 — Full Local Automation, Notifications and Production

This is deliberately the largest product slice.

It contains **both** the approved v0.5 automation contract and the owner's approved deeper late-game automation ambition.

#### S3-A: maintenance automation

- Auto-feed controls;
- meals/day controls;
- Auto Water Changer;
- Auto-clean;
- water-change core extraction if still the safest implementation;
- deterministic daily water changes;
- weekly glass cleaning;
- marine/brackish salt consumption;
- staff interaction;
- alerts;
- finances/upkeep;
- offline/catch-up correctness.

#### S3-B: notifications

- device-local notification preferences;
- fixed 10 PM–8 AM quiet hours;
- categories;
- permission flow;
- web notification delivery;
- service worker click routing;
- deep-link return;
- rate limiting;
- notification evidence/testing.

Closed/native notifications remain deferred with the native wrapper.

#### S3-C: production lines

Multiple production lines per species.

Each line can independently define:

- breeding pair;
- breed tank;
- raise/grow-out tank;
- quarantine tank;
- safe/keeper tank;
- running/paused state;
- pause-when-full rule;
- never-sell-Prismatic rule;
- automatic listing rule;
- trait-based keep rules;
- sale reserve behavior;
- statistics.

The basic pipeline:

`Breed → Raise → Sort → Quarantine → Sell`

must be deterministic, restart-safe and tolerant of missing/reassigned creatures/tanks.

#### S3-D: extended aquarium/aquaculture automation

The production-line feature is not the ceiling.

The agent must build the deepest local automation layer that remains coherent with the current architecture and can be completed safely in this slice.

The target is a facility-level automation system with real progression, resource constraints and observable throughput.

Minimum target concepts:

##### Automation tiers

**Tier 1 — Assisted care**
- Autofeeder
- Auto Water Changer
- alerts
- schedules

**Tier 2 — Central life-support logistics**
- conditioned-water reserve(s);
- freshwater/saltwater preparation;
- reservoir capacity;
- salt consumption;
- automated top-off/water-change scheduling;
- central automation dashboard;
- storage and shortage indicators.

**Tier 3 — Feed production**
At least one deterministic facility-scale feed-production chain appropriate to species needs, for example:
- live-feed culture;
- prepared feed batches;
- hatch/culture cycles;
- storage capacity;
- consumption rates;
- shortage behavior.

Exact resource names must be reconciled with current inventory/food data before implementation rather than invented blindly.

**Tier 4 — Breeding facility**
- multiple production lines;
- nursery/grow-out routing;
- trait-based sorting;
- quarantine scheduling;
- protected keepers;
- automatic listing;
- capacity-aware pausing.

**Tier 5 — Operations control**
- facility automation overview;
- status of every automated subsystem;
- bottleneck/shortage reporting;
- per-line throughput;
- scheduling;
- pause/resume;
- emergency/manual override;
- weekly economics.

##### Automation simulation rules

The automation engine must:

- be deterministic;
- run from game time, not render frames;
- survive variable simulation step sizes;
- work during bounded offline catch-up when logically appropriate;
- consume real tracked resources;
- never create money, animals, feed or supplies from nothing;
- be idempotent across retries/load boundaries;
- persist "last run" markers where required;
- never double-run an action after save/load;
- respect tank capacity and compatibility;
- preserve protected/Prismatic animals;
- surface shortages instead of silently skipping forever;
- be testable as pure simulation logic wherever possible.

##### Anti-dupe invariants

At minimum:

- one creature cannot occupy two automation stages at once;
- one creature cannot be sold/listed twice;
- one resource unit cannot be consumed twice;
- one scheduled maintenance crossing cannot execute twice;
- one clutch cannot be routed twice;
- one listing cannot be generated twice from the same automation event;
- save/load does not repeat a completed job;
- repair/recovery cannot duplicate a line's output.

##### Extended automation scope control

The orchestrator may simplify an individual proposed machine if the current data model makes it disproportionate, but it may not silently reduce extended automation to Auto-feed + Auto-clean.

Any substantial scope reduction requires:
- an ADR;
- an explanation of the architectural blocker;
- independent reviewer agreement;
- and, if it changes the owner-visible experience, owner approval.

### S4 — Social Stub, Whole-Stack Hardening and Multiplayer Readiness

Includes:

- Social panel;
- local SocialService;
- sign-in/create-account UX stub;
- no password persistence;
- clubs;
- invites;
- trading-circle UI stub;
- friends' aquarium snapshots;
- leaderboards;
- routes/deep links;
- desktop dock Social;
- phone More Social;
- loading/error/empty states;
- complete test coverage for the stub.

Then perform whole-stack hardening:

- typecheck;
- all unit tests;
- all E2E;
- production build;
- visual QA;
- responsive QA;
- performance QA;
- determinism;
- automation invariants;
- persistence sanity;
- route audit;
- accessibility review;
- unresolved TODO/stub audit;
- requirements traceability audit.

The Social stub is the default automatic stopping point.

---

# PART V — MULTIPLAYER READINESS GATE

## 10. The loop may not automatically cross into real multiplayer

When S4 is green, the orchestrator runs the Multiplayer Readiness Gate.

The gate asks:

- Are all five mega-slices accepted?
- Did every required independent review pass?
- Are there zero unresolved red defects?
- Did fresh-context handoffs succeed throughout the project?
- Are tests reliable rather than flaky?
- Is the current branch reproducible from the documented baseline?
- Is the simulation stable?
- Are automation invariants green?
- Is UI/browser QA green?
- Is performance within accepted budgets?
- Is requirements traceability complete?
- Does the architecture have a clean trust boundary for future server authority?
- Is technical debt small enough that multiplayer would not magnify it?

If green, produce:

`READY_FOR_MULTIPLAYER_EXPANSION`

plus a proposed multiplayer architecture, risks, schema, backend plan, security plan and next mega-slice.

Then STOP.

Real accounts, cloud saves, real trades, shared aquariums, authoritative economy or backend infrastructure require explicit owner approval.

---

# PART VI — AUTONOMOUS ORCHESTRATION STATE MACHINE

## 11. State machine

Legal states:

```text
BOOTSTRAP
BASELINE_VERIFY
SLICE_DISCOVERY
PLAN_LOCK
IMPLEMENT
TARGETED_VERIFY
FULL_VERIFY
BROWSER_QA
SPECIALIST_REVIEW
ADVERSARIAL_REVIEW
REPAIR
ACCEPT
CHECKPOINT
COMPACT
HANDOFF
NEXT_SLICE
OWNER_GATE
BLOCKED_MANUAL_REVIEW
COMPLETE_LOCAL
```

### 11.1 Normal flow

```text
BOOTSTRAP
  → BASELINE_VERIFY
  → SLICE_DISCOVERY
  → PLAN_LOCK
  → IMPLEMENT
  → TARGETED_VERIFY
  → FULL_VERIFY
  → BROWSER_QA (when UI-visible)
  → SPECIALIST_REVIEW (when triggered)
  → ADVERSARIAL_REVIEW
  → ACCEPT
  → CHECKPOINT
  → COMPACT
  → HANDOFF
  → NEXT_SLICE
```

At the end of S4:

```text
ACCEPT
  → CHECKPOINT
  → MULTIPLAYER_READINESS_GATE
  → OWNER_GATE
```

### 11.2 Failure transitions

Any verification/review failure:

`VERIFY/REVIEW → REPAIR → appropriate VERIFY state`

A materially different repair strategy increments `repairAttempt`.

At 3 failed materially-different repair attempts:

`REPAIR → BLOCKED_MANUAL_REVIEW`

The harness preserves evidence and stops.

### 11.3 Forbidden transitions

- `IMPLEMENT → ACCEPT`
- `TARGETED_VERIFY → CHECKPOINT` without full required gates
- `BUILDER CLAIM → ACCEPT`
- `ACCEPT → PUSH`
- `S4 → MULTIPLAYER IMPLEMENTATION` without owner approval

---

# PART VII — DURABLE AGENT MEMORY

## 12. Required in-repo operating structure

```text
docs/agent/
  README_FIRST.md
  AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md

  design/
    AQUARIUM_GO_0_5_DESIGN_SPEC.md

  STATE.json
  LEDGER.jsonl
  REQUIREMENTS.json
  CURRENT_SLICE.md
  HANDOFF.md

  decisions/
    ADR-0001-*.md
    ADR-0002-*.md
    ...

  evidence/
    S0/
      manifest.json
      ...
    S1/
    S2/
    S3/
    S4/

  prompts/
    MASTER_ORCHESTRATOR_PROMPT.md
    ROLE_PROMPTS.md

  templates/
    CURRENT_SLICE_TEMPLATE.md
    HANDOFF_TEMPLATE.md
    ADR_TEMPLATE.md
    ACCEPTANCE_REPORT_TEMPLATE.md
    EVIDENCE_MANIFEST_TEMPLATE.json
```

Generated local scratch output that is large or ephemeral may live outside Git, but its path/hash must be recorded in evidence.

## 13. What each file means

### `STATE.json`

Small machine-readable current truth.

It answers:
- baseline;
- current branch;
- current slice;
- current state-machine state;
- current task;
- retry count;
- whether context rollover is required;
- required reviewers;
- current gates;
- last accepted checkpoint;
- whether owner approval is required.

It must stay small.

### `LEDGER.jsonl`

Append-only event history.

Every meaningful transition writes one JSON object:
- timestamp;
- actor;
- slice;
- task;
- fromState;
- toState;
- command/evidence refs;
- decision refs;
- result.

Never rewrite old ledger lines.

### `REQUIREMENTS.json`

Stable traceability registry.

Every requirement has:
- ID;
- source;
- description;
- slice;
- tasks;
- acceptance criteria;
- tests;
- evidence;
- status.

### `CURRENT_SLICE.md`

Human-readable slice contract.

This is what a builder works from.

### `HANDOFF.md`

A compact, regenerated handoff for the next context.

It is not a narrative diary. It contains only durable facts that a fresh agent needs.

### `decisions/`

Any approved deviation or architecture decision that changes future work.

### `evidence/`

Objective proof.

---

# PART VIII — CONTEXT FIREWALL

## 14. Context policy

No agent receives the entire project history by default.

The bootstrap packet should consume no more than roughly **20% of the model's usable context window**.

Reserve:
- at least 50% for live repository/tool work;
- at least 20% for test output, diffs and review evidence;
- at least 10% for unexpected investigation.

If the environment cannot estimate token usage precisely, use document-size heuristics and err toward a smaller packet.

## 15. Mandatory reading order for a fresh agent

1. `docs/agent/README_FIRST.md`
2. `docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`
3. `docs/agent/STATE.json`
4. `docs/agent/CURRENT_SLICE.md`
5. `docs/agent/HANDOFF.md`
6. ADRs explicitly referenced by CURRENT_SLICE/HANDOFF
7. only the relevant sections of the approved design spec
8. repository architecture/lane docs relevant to touched areas
9. actual target code files
10. relevant tests

Do not preload unrelated old slice reports.

## 16. Bootstrap comprehension test

Before editing, a fresh agent must write a short machine-readable bootstrap assertion containing:

- expected baseline/checkpoint SHA;
- current slice;
- current task;
- required acceptance gates;
- forbidden actions;
- exact files it plans to inspect first;
- top three risks.

Then it verifies the SHA and files.

If repository reality contradicts the packet, repository reality wins for "what exists now," and the mismatch becomes an ADR or state repair.

## 17. Context rollover triggers

Mandatory rollover:
- after every accepted mega-slice.

Early rollover:
- context exceeds approximately 65% of usable capacity;
- the agent starts repeating already-resolved investigation;
- tool output becomes too large to reason about reliably;
- more than one architectural subproblem has accumulated unresolved;
- a repair loop has run twice and the agent is carrying too much failed-history noise;
- a major ADR changes the plan.

Before rollover:
1. stop coding at a stable point;
2. run the applicable cheap/targeted checks;
3. update `STATE.json`;
4. append `LEDGER.jsonl`;
5. update requirement statuses;
6. update evidence manifest;
7. regenerate `HANDOFF.md`;
8. record dirty/clean Git status;
9. list exact next action.

A new agent then boots from repository state.

---

# PART IX — ANTI-HALLUCINATION RULESET

## 18. Repository truth rules

Every agent must obey:

1. Inspect before editing.
2. Never invent a file path.
3. Never invent an exported API.
4. Never claim a dependency exists without checking `package.json`/lockfile.
5. Never rely on a remembered line number without re-finding the code.
6. Never claim a test ran without command + exit code/evidence.
7. Never claim UI works without browser evidence when browser verification is required.
8. Never claim a route works without exercising it.
9. Never claim a migration works without a fixture/run.
10. Never claim performance improved without measurements.
11. Never mark a TODO/stub complete unless the contract explicitly says the stub is the deliverable.
12. Never suppress a failing test merely to obtain green.
13. Never delete or weaken a test unless a changed requirement explicitly invalidates it.
14. Never silently remove scope.
15. Never "fix" a failure by disabling the feature.
16. Never modify unrelated systems for convenience.
17. Never assume a previous agent's summary is accurate when Git or evidence can verify it.
18. Unknown facts are marked `UNKNOWN`, not guessed.
19. Tool/API behavior that is version-sensitive must be verified against installed versions or authoritative documentation.
20. After large edits, re-read the resulting file; do not trust the patch alone.

## 19. Anti-drift rules

Every code change must map to:
`Requirement ID → Task ID → file/diff → test/evidence`

Any change without a requirement mapping is either:
- necessary refactor with an ADR;
- test/harness work;
- defect repair caused by an approved change;
- or out of scope.

Out-of-scope improvements go to a backlog. They are not implemented opportunistically.

---

# PART X — AGENT ROLES

## 20. Orchestrator

The orchestrator does not perform broad implementation itself unless a small integration edit is necessary.

It owns:
- state machine;
- slice/task allocation;
- context packs;
- evidence requirements;
- review assignment;
- repair escalation;
- local integration commits;
- local checkpoint tags;
- final owner gate.

It cannot waive gates because work "looks done."

## 21. Builder

Receives:
- current slice;
- relevant design sections;
- relevant ADRs;
- target files;
- test expectations.

Must implement, test and report evidence.

Does not self-approve.

## 22. Independent code/architecture reviewer

Must receive less narrative context than the builder.

Receives:
- requirement contract;
- design excerpt;
- actual diff;
- relevant current files;
- test evidence.

Must look for:
- missing scope;
- architecture drift;
- broken contracts;
- race/determinism issues;
- brittle assumptions;
- untested edge cases;
- accidental rewrites.

## 23. Browser/QA reviewer

Exercises the real app.

Required for user-visible slices.

Checks:
- correct route;
- expected state;
- Back/Forward/Esc;
- responsive breakpoints;
- phone portrait;
- phone landscape;
- desktop;
- empty/error/locked states;
- focus/keyboard behavior;
- console errors;
- network/service-worker failures;
- screenshot fidelity.

## 24. Security/data reviewer

Required when:
- persistence schema changes;
- service worker changes;
- auth/social state changes;
- any backend/network trust boundary is introduced;
- user-entered credentials are handled;
- trading/economy authority changes.

In the Social stub, specifically verify that passwords are never persisted.

## 25. Performance reviewer

Required when:
- R3F/render code changes;
- catalog/genetics enumeration grows;
- automation runs across many tanks/lines;
- route synchronization causes frequent renders;
- new dashboard lists can grow large;
- simulations add per-tick work.

---

# PART XI — ACCEPTANCE QUORUM

## 26. A slice cannot approve itself

Minimum green quorum:

**Objective test gates + independent code review + QA review (when visible)**

Specialist review must also pass when triggered.

Verdicts:

- `GREEN`: all required evidence passed; no unresolved blocker.
- `YELLOW`: acceptable local limitation documented, no contract violation, owner-visible risk clearly listed.
- `RED`: acceptance criterion violated, regression, missing evidence or unresolved blocker.

A mega-slice may advance only with `GREEN`.

`YELLOW` requires orchestrator review and, if it changes owner-visible behavior, owner approval.

---

# PART XII — TEST AND EVIDENCE HIERARCHY

## 27. Verification levels

### Level 0 — edit hygiene
Run frequently:
- syntax/type-aware editor diagnostics if available;
- targeted test;
- `git diff --check`.

### Level 1 — task verification
After an internal task:
- targeted Vitest file(s);
- specific static/unit tests;
- targeted browser flow if UI changed.

### Level 2 — internal checkpoint
At a meaningful green internal milestone:
- relevant suite group;
- `npm run typecheck`;
- relevant E2E;
- screenshot/browser evidence.

### Level 3 — mega-slice acceptance
Required:
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`
- `git diff --check`
- requirement audit
- independent review
- browser QA for user-visible work

Also run as appropriate:
- `npm run qa:shots`
- `npm run qa:motion`
- deterministic/step-invariance tests
- persistence tests
- performance profiling

### Level 4 — full local stack
At S4:
everything in Level 3 plus whole-stack acceptance.

## 28. Evidence rules

For every command capture:

- command;
- working directory;
- timestamp;
- exit code;
- relevant pass/fail counts;
- log path;
- associated requirement/task IDs;
- commit/dirty-tree SHA context.

Browser evidence captures:

- route;
- viewport;
- fixture/save state;
- actions;
- observed expected result;
- console error count;
- screenshot path/hash.

Performance evidence captures:

- scenario;
- machine/browser;
- quality setting;
- population/tank count;
- frame timing or applicable metric;
- comparison baseline.

---

# PART XIII — LOCAL GIT SAFETY

## 29. Integration model

Recommended local branch:

`agent/aquariumgo-local-stack-20261005`

The harness must derive the actual name at installation and store it in `STATE.json`.

### Allowed

- fetch/read remote metadata;
- local branch;
- local worktrees;
- local commits;
- local lightweight tags/checkpoint refs;
- local revert commits when needed;
- `git status`, `diff`, `show`, `log`, `blame`.

### Forbidden before owner approval

- `git push`
- `git push --force`
- creating remote PRs
- merging remote branches
- remote branch deletion
- deployment
- GitHub release creation
- production database migration
- remote secret/config changes
- App Store / Play submission
- package publishing
- external destructive API actions

### Destructive local commands prohibited by default

- `git reset --hard`
- `git clean -fd`
- deleting untracked work without evidence
- rebasing away accepted checkpoints
- mass checkout/restore that discards unknown work

Recovery should use explicit commits/worktrees/reverts so history remains inspectable.

## 30. Checkpoint naming

At mega-slice acceptance:

```text
checkpoint/S0-harness
checkpoint/S1-ux-nav
checkpoint/S2-genetics-market
checkpoint/S3-automation
checkpoint/S4-social-local-complete
```

The implementation may use commits rather than actual Git tags if simpler, but the checkpoint SHA must be recorded.

---

# PART XIV — WATCHDOGS

## 31. Repair watchdog

Three materially different failed repairs → manual stop.

## 32. Oscillation detector

If:
- fixing A repeatedly breaks B;
- fixing B repeatedly breaks A;
- the same files alternate between two states;

then stop routine repair, spawn a fresh diagnosis agent, and require a root-cause plan.

## 33. Diff-size alarm

A task that unexpectedly touches broad unrelated areas triggers review before continuation.

Examples:
- genetics task unexpectedly changes renderer architecture;
- navigation task rewrites state management;
- automation task alters unrelated market valuation.

Large diffs are allowed when the slice genuinely requires them, but they must be explained.

## 34. Architecture-drift alarm

Trigger if:
- simulation logic leaks into rendering;
- rendering mutates game state;
- UI starts owning authoritative simulation behavior;
- new global state bypasses established stores/contracts;
- duplicated species facts appear outside species data;
- nondeterministic randomness enters simulation.

## 35. Test-integrity alarm

Trigger if:
- tests are skipped;
- assertion counts drop unexpectedly;
- tests are loosened without requirement changes;
- retries are used to hide flakes;
- snapshots are blindly regenerated.

## 36. Context-health alarm

Trigger handoff when:
- the agent can no longer restate the current task accurately;
- it repeatedly re-reads irrelevant history;
- summaries contradict repository evidence;
- current context has accumulated large obsolete tool output.

---

# PART XV — RECOVERY

## 37. Corrupted working tree

1. Stop.
2. Record `git status` and diff.
3. Identify last green checkpoint SHA.
4. Preserve the broken work on a local recovery branch/worktree if necessary.
5. Diagnose before reverting.
6. Restore through explicit commits/reverts, not unrecorded destructive cleanup.

## 38. Broken migration/state

1. Freeze feature work.
2. Save failing fixtures.
3. Verify whether corruption is deterministic.
4. Repair migration logic.
5. Re-run fresh game, old fixture (if supported), round-trip and idempotence tests.
6. Require data reviewer approval.

## 39. Half-completed slice after agent loss

A new orchestrator reads:
- STATE;
- ledger;
- last checkpoint;
- dirty diff;
- CURRENT_SLICE;
- HANDOFF;
- evidence.

It must independently decide whether the dirty state is:
- valid continued work;
- partially verified;
- corrupt/unsafe.

It never assumes "the previous agent was almost done."

---

# PART XVI — REQUIREMENTS TRACEABILITY

## 40. Requirement ID families

Use stable prefixes:

```text
CONST-*    constitution / owner constraints
DES-*      approved design behavior
NAV-*      navigation/routing
GEN-*      genetics
MKT-*      market/shop
AUTO-*     automation
NOTIFY-*   notifications
PROD-*     production lines
SOC-*      social stub
PLAT-*     platform abstraction
ACC-*      accessibility
PERF-*     performance
PERSIST-*  state/save/persistence
HARNESS-*  autonomous build harness
REL-*      release/owner gates
```

Each requirement must trace to at least one acceptance criterion.

No requirement may disappear simply because a later agent did not load its source section.

---

# PART XVII — S0 HARNESS IMPLEMENTATION

## 41. Recommended helper scripts

All should use Node built-ins wherever practical; no new dependency is required.

```text
scripts/agent/check-state.mjs
scripts/agent/record-event.mjs
scripts/agent/requirements-audit.mjs
scripts/agent/context-pack.mjs
scripts/agent/capture-evidence.mjs
scripts/agent/verify-slice.mjs
scripts/agent/handoff.mjs
```

### `check-state.mjs`

Validates:
- STATE schema;
- referenced slice exists;
- checkpoint SHA exists;
- current branch matches;
- forbidden "accepted without evidence" combinations;
- requirements referenced by CURRENT_SLICE exist.

### `record-event.mjs`

Append-only write to `LEDGER.jsonl`.

### `requirements-audit.mjs`

Fails if:
- an in-scope requirement has no task;
- a completed requirement has no acceptance evidence;
- a task references an unknown requirement;
- an accepted slice still has required requirements not GREEN.

### `context-pack.mjs`

Generates a compact `CONTEXT_PACK.md` from:
- constitution;
- current slice;
- handoff;
- relevant ADRs;
- relevant requirement subset;
- design section references.

It does not include old chat.

### `capture-evidence.mjs`

Writes command/browser evidence metadata and hashes logs/files.

### `verify-slice.mjs`

Runs the configured gates for the current slice and writes a verification report. It cannot mark the independent review as passed.

### `handoff.mjs`

Builds the new HANDOFF from state/evidence rather than freeform memory.

---

# PART XVIII — CURRENT DESIGN RISKS THAT MUST REMAIN VISIBLE

## 42. Known risk: rarity tier inflation

The approved design predicts a very large share of the expanded betta catalog becoming Legendary under the current absolute frequency thresholds.

This is not to be silently "fixed" by the builder.

S2 must:
- reproduce the catalog numbers;
- evaluate actual player-facing tier distribution;
- have reviewer inspect whether the rarity labels still communicate useful hierarchy.

If a tier-model change is proposed, it needs an ADR and owner-visible explanation.

## 43. Known risk: route behavior on reload

The approved design intentionally returns reloads to title behavior for compatibility with current tests/boot semantics.

The agent must implement the contract, not casually "improve" it.

A later change requires a design decision.

## 44. Known risk: notification expectations

Web notifications cannot honestly behave like a native always-running game.

Copy must remain truthful.

Native background/local-notification work is deferred.

## 45. Known risk: deep automation scope

S3 is deliberately ambitious.

The orchestrator must keep the domain coherent and may use internal tasks/checkpoints heavily.

It must not shrink the result to simple switches merely to finish.

---

# PART XIX — WHOLE PROJECT DEFINITION OF DONE

## 46. Task DoD

A task is done when:
- requirement mapped;
- implementation complete;
- targeted tests pass;
- no known unrecorded regression;
- evidence recorded.

## 47. Mega-slice DoD

A mega-slice is done when:
- every required task is done;
- full slice gates pass;
- independent reviews pass;
- browser QA passes when applicable;
- no RED findings remain;
- requirements audit passes;
- evidence manifest complete;
- local checkpoint commit created;
- HANDOFF regenerated;
- fresh-context rollover performed.

## 48. Local project DoD

The first autonomous program is complete when S0–S4 are accepted locally and:

- v0.5 design behaviors are implemented or explicitly superseded by an approved ADR;
- deep local automation is functional;
- multiple production lines per species work;
- Social stub is complete;
- full test/build/E2E suite passes;
- requirements traceability is complete;
- no untracked blocker remains;
- final owner package is generated;
- Multiplayer Readiness Gate result is generated.

Nothing has been pushed merely because Local DoD was reached.

---

# PART XX — OWNER APPROVAL PACKAGE

## 49. What the owner receives

At the final gate:

1. baseline SHA;
2. final local SHA;
3. list of mega-slice checkpoint SHAs;
4. summary of major features;
5. requirement completion report;
6. unresolved limitations;
7. full test command/results table;
8. browser QA screenshots;
9. performance results;
10. migration/state notes;
11. list of dependencies changed (expected none in this stack);
12. architecture ADR list;
13. security/data review;
14. diff statistics;
15. exact proposed remote actions;
16. Multiplayer Readiness result.

Then ask:

**Approve remote release actions?**

No default yes.

---

# PART XXI — MASTER ORCHESTRATOR CONTRACT

## 50. Core instruction

The orchestrator's job is not to write as much code as possible in one context.

Its job is to move the repository from one **verified durable state** to the next until S4 is locally complete.

It should maximize autonomy while minimizing unverified assumptions.

At any point, it must be able to answer from repository state:

- What slice are we on?
- What is the next legal task?
- What requirements does it satisfy?
- What source contract governs it?
- What files are likely relevant?
- What tests must pass?
- What evidence already exists?
- What failed?
- How many repair attempts remain?
- Is context rollover required?
- Which independent reviewer is required?
- Can we advance?
- Are we at an owner gate?

If it cannot answer, it must repair the project state documentation before continuing.

---

# PART XXII — INSTALLATION / FIRST RUN

## 51. Before S0

On the local machine:

1. enter `/Volumes/Dev/Projects/AquariumGo` if that remains the correct clone;
2. inspect `git status`;
3. record current branch and SHA;
4. fetch remote read-only if needed;
5. compare local SHA to expected baseline;
6. do not discard local changes;
7. run dependency install only if the existing checkout requires it; do not modify dependencies;
8. run the baseline test matrix;
9. store exact evidence;
10. create the local integration branch only after baseline state is understood.

If local HEAD is newer than `0d9fc5a`, do not reset backward. Re-audit changes and update the baseline fields.

## 52. Baseline gate

Minimum baseline:

```text
npm run typecheck
npm test
npm run build
npm run e2e
git diff --check
```

If existing baseline tests are red, S0 must classify them as pre-existing before feature implementation.

Do not begin S1 with unexplained red baseline failures.

---

# PART XXIII — SOURCE HIERARCHY AND CHANGE CONTROL

## 53. Sources

Authoritative material for this build:

- this Master Source of Truth;
- `AQUARIUM_GO_0_5_DESIGN_SPEC.md`;
- actual repository code at the current checkpoint;
- repository `docs/ARCHITECTURE.md`;
- repository `docs/LANES.md`;
- repository `docs/TEST_IDS.md`;
- accepted ADRs;
- machine-readable state/requirements/evidence.

External research may inform decisions but does not silently override the approved product.

## 54. Updating this master

The master should be changed rarely.

A normal implementation discovery belongs in an ADR or slice contract.

Change the master only when:
- owner changes a constitutional rule;
- mega-slice boundaries change materially;
- release policy changes;
- multiplayer gate policy changes;
- source hierarchy changes.

---

# PART XXIV — FINAL NON-NEGOTIABLES

1. Do not rewrite working core systems without a demonstrated reason.
2. Do not let UI become simulation authority.
3. Do not make rendering state authoritative.
4. Preserve determinism.
5. Do not claim green without evidence.
6. Do not let the builder approve itself.
7. Do not lose requirements across contexts.
8. Do not use old chat as project memory.
9. Do not silently reduce automation scope.
10. Do not implement real multiplayer before explicit approval.
11. Do not push or deploy before explicit approval.
12. Do not weaken tests to make a slice pass.
13. Do not continue an unhealthy repair loop indefinitely.
14. Prefer a clean, inspectable local history.
15. Every accepted slice must be recoverable by a completely fresh agent.

---

# END STATE

The intended first-program endpoint is:

**A fully locally-built AquariumGo stack with the approved v0.5 UX, deep genetics/market improvements, full local automation and production systems, notifications, and Social stub; independently tested and reviewed; checkpointed; context-clean; and ready for owner review.**

If the harness proves healthy and the Multiplayer Readiness Gate passes, the system may propose the real multiplayer/backend program.

It may not start that program until the owner explicitly says yes.
