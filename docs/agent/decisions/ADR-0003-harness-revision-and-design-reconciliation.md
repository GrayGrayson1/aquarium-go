# ADR-0003 — Harness revision after the adversarial review, and design reconciliation

**Status:** Accepted (owner-requested; the clarifications in "Rules this revision adds" stand unless the owner vetoes them)\
**Date:** 2026-10-05\
**Slice:** S0\
**Requirements:** HARNESS-001 to HARNESS-006, REL-001, REL-003, PERSIST-001 to PERSIST-005, SOC-002

## Context

The owner's request, verbatim: "I want you to do an adversarial review of the entirety of our app and the repo and
compare it against the logic of our harness and those rules and everything. If there's anything that needs to be
improved, improve it. Ask me all the questions that need to be asked so we can get some more clarity."

Fifteen independent reviewers examined the harness (consistency, red-team loopholes, a fresh-agent bootstrap test,
conflicts with the design, facts against the repo, the design's claims about the code) and the game (determinism, the
mutation boundary and layering, persistence and security, test integrity, and bugs in the economy, the living sim,
the loop, the UI and rendering). Skeptic agents tried to refute every finding before it was used. The full results are
in `docs/agent/evidence/S0/reviews/`.

The main verified problems with the harness as installed:
- the remote-action ban existed only as text, named one of the two deploy channels, and never defined what a valid
  owner approval looks like;
- "fresh context after every slice" and "slices advance automatically" couldn't both be carried out in Claude Code;
- the state machine used a state missing from its legal list, and several states had no exit;
- the three-repair stop could be evaded (self-judged "materially different", one global counter);
- `REQUIREMENTS.json` lacked five of its nine required fields and most of the approved scope;
- gates could pass on stale or foreign evidence: Playwright silently reused any server on port 4399, e2e specs were
  never typechecked, tests could pass with no assertions, logs were git-ignored (`*.log`), and nothing tied a gate
  result to the code it ran on;
- agents could edit the rules that judge them;
- AGENTS.md misstated the mutation boundary (`mutateFast` and `setGame` also write state) and the RNG rule
  (subsystems keep their own persisted streams);
- S3-D had no approved design, and the design spec still asserted rules the master overrides.

## Decision

### Changes made (all local, on `agent/aquariumgo-local-stack-20261005`)

- **New:** `OPERATIONS.md` (sessions, approvals, remote actions, the transition table, repairs, gates and evidence,
  reviewers, this machine, backlog, protected files); `prompts/KICKOFF.md`; `design/DESIGN_REGISTRY.json`,
  `design/DESIGN_INTAKE.md`, `templates/DESIGN_INTAKE_TEMPLATE.md`; `decisions/INDEX.md`; `BACKLOG.md`;
  `PROTECTED.json`; `evidence/S0/` (baseline, baseline failures, reviews, test inventory).
- **Scripts** (`scripts/agent/`, Node built-ins only, 30+ tests in `agent.test.mjs`): `check-state`, `record-event`,
  `requirements-audit`, `verify-slice`, `capture-evidence`, `context-pack`, `handoff` (the master §41 set), plus
  `diff-check`, `test-inventory`, `bootstrap-check`, `protect`, `relaunch` and the shared `lib`/`evidence` modules.
- **State and registry:** `STATE.json` schema 2 (baseline, branch, owner-gate reason and resume state, per-defect
  repair counters, all gates); `REQUIREMENTS.json` schema 2 (the master §13 fields, defined statuses, new HARNESS,
  REL, PERSIST and SOC requirements, and the design decomposition); `LEDGER.jsonl` seeded with this session's events.
- **Master:** two deploy channels and the approval rule (§3.1); how a fresh context happens (§3.2); per-defect repair
  counting (§3.3); no commits on `main` and no amended checkpoints (§3.4); the schema bump becomes an owner gate until
  the owner decides (§3.5); gate-defining files leave the §3.8 pre-authorization; the mutation and RNG laws (§5); the
  design registry (§7); the S3-D design dependency (§9); `MULTIPLAYER_READINESS_GATE` in §11 and the S4 flow; the
  file layout (§12); the state, ledger and requirement fields (§13); one canonical reading order (§15); YELLOW never
  advances on its own (§26); the gate list (§27); destructive commands defined (§29); the script list (§41); gates
  that can't run (§52); protected files (§54). Memory systems are named non-authoritative (§0).
- **AGENTS.md, CLAUDE.md, README_FIRST.md:** corrected rules, reviewer mode, commands and the canonical reading order.
- **Prompts and templates:** reviewer roles that write their own report files, an adversarial reviewer, a design
  intake reviewer and a requirements reviewer; templates with the fields the master requires.
- **Gate configuration** (gate-defining files, so recorded here and independently reviewed): `playwright.config.ts`
  reuses a running server only with `E2E_REUSE=1` (a busy port now fails; verified) and forbids `.only`;
  `tsconfig.json` typechecks `tests/e2e` and `playwright.config.ts` (verified clean); `vitest.config.ts` disallows
  `.only` and requires every test to assert. Nine species-data tests that could pass with zero assertions gained one
  unconditional check. `.gitignore` ignores `.agent-runs/` and `shot.png`, and stops ignoring evidence logs.
  `README.md` documents `E2E_REUSE=1`.

### Rules this revision adds (the owner may veto any of them)

1. A defect also stops the repair loop after five attempts in total, and a reviewer judges "materially different".
2. YELLOW never advances on its own: repair plus a fresh GREEN review, or an owner-approved ADR.
3. Protected files change only through an ADR and `protect.mjs --update`.
4. Gate-defining files and deploy files need an ADR and an independent reviewer's sign-off.
5. No commits on `main` or `feat/*`; local `main` stays equal to `origin/main`.
6. At an owner gate, the orchestrator parks the blocked item and keeps working on anything independent, then stops.
7. Until the owner decides the schema policy, a `SCHEMA_VERSION` bump is an owner gate.

### Design reconciliation (supersession register)

The 0.5 design stays normative for product behaviour. Its process instructions (the phase order, "paste the whole
file into ChatGPT", the release step) are replaced by the master's. Clause by clause:

| Design clause | Superseded or changed by | Result |
|---|---|---|
| §1 item 10, §3.3, §15 "no schema bump, saves keep loading" | master §3.5; PERSIST-001, PERSIST-003 | Compatibility is best-effort, but until the owner decides, no bump and v0.4.0 saves must load |
| §3.4 lanes and core sign-off, §15 sign-off column, §22 risk 3 | master §3.8 (minus gate-defining files) | Core edits an approved slice needs are pre-authorized, with the §3.8 conditions |
| D14, §15 version row, §16 About "What's new in 0.5", §21 release step | master §3.6; REL-003 | Prepared, not executed; `## Unreleased` notes; the owner sets the version |
| §1 line 74 and §11 "ships last", §21 phase order, §22 risk 9 | master §9 (production in S3, Social in S4) | Production is S3 scope and doesn't slip |
| §11 single production line card, §22 Q5 | master §3.10, ADR-0001 | Several lines per species; the UI needs a design ADR before S3-C UI work |
| §22 Q1-Q4 | master §3.10, ADR-0001 | Shared unlock; quiet hours fixed 22:00-08:00 with an on/off switch; one-copy Metallic unnamed; locked-state panels |
| D3 automation model | ADR-0001 option C, master §9 S3-D | The designed switches stay; S3-D adds facility automation (design pending, DESIGN-S3D) |
| D7 lock-screen part, D13 native part, §12.7, Phase 6, `notify-forecast.test.ts` | master §3.10 (native deferred) | DEFERRED |
| §3.5 "all state changes go through useGame.mutate" | master §5 | `mutate`, `mutateFast` and `setGame` are the boundary |
| §22 risk 1 (rarity tiers) | master §42 | Open owner question, to settle before S2 |
| §12.3 iOS "add to Home Screen" copy, §22 risk 5 | master §44 (truthful copy) | Open owner question |

## Alternatives considered

- Leave the harness as written and only report problems: rejected; the owner asked for improvements.
- Put every procedure in the master: rejected; the master is meant to change rarely, so procedures live in
  `OPERATIONS.md` under the same protection.
- Enforce the remote ban with deny rules and hooks now: not done; agents may not change their own permissions. The
  owner decides (see `HANDOFF.md`, owner questions). The relaunch launcher applies deny rules to the sessions it starts.

## Consequences

- Gate results are now tied to the code they ran on, and evidence edits, deleted requirements, rewritten ledger lines,
  vanished tests and silent rule changes all fail `check-state.mjs`.
- More bookkeeping per transition, done by scripts rather than prose.
- e2e and browser QA can't pass from a sandboxed Claude Code shell until the owner decides how they run (BF-001).

## Verification

- `node --test 'scripts/agent/*.test.mjs'` passes.
- `npm run typecheck` and `npm test` pass on the changed configuration; the reuse change was verified against a
  dummy server holding port 4399 ("is already used").
- Independent code-architecture and security-data reviews of this diff (`evidence/S0/reviews/`).

## Owner impact

Yes. The owner requested the revision; the added rules above are clarifications the owner may veto.
