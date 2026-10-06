# Design intake: bringing a new design into the harness

This is how a new or changed design (for example the S3-D automation screens the owner is making in Claude Design)
becomes something agents may build. It puts the Design Change Gate (master §8) into practice.

## Why the repo copy matters

A Claude Design canvas or artifact link is private to the owner. Other agents, and fresh Claude sessions without
access, can't read it. The repository is the memory, so every design is copied into the repo before anyone builds
from it. The copy in the repo is normative; the canvas is a reference that ranks below it (master §3.9).

## Statuses

Every design has one entry in `docs/agent/design/DESIGN_REGISTRY.json`:

| Status | Meaning |
|---|---|
| `PENDING_OWNER_DESIGN` | The owner is still making it. Nothing that depends on it may start. |
| `RECEIVED` | The owner has handed it over, and it is captured in the repo. Not yet checked. |
| `UNDER_REVIEW` | The intake checks below are in progress. |
| `APPROVED` | The owner approved the reconciled version. Dependent work may start. |
| `SUPERSEDED` | Replaced by a newer approved design (record which sections). |
| `REJECTED` | The owner decided not to use it. |

Only the owner moves a design to `APPROVED`. The approval is recorded word for word in the "## Owner approval"
section of an ADR, like ADR-0016 (step 5).

## Intake steps

1. **Capture.** Create `docs/agent/design/<DESIGN-ID>/` with:
   - `SPEC.md`: the normative text. Screens and their states (empty, loading, error, locked, phone, landscape,
     desktop), copy, test ids, routes and deep links, data the screens read and write, and the simulation
     behaviour behind them.
   - `screens/`: exported PNGs of every screen and state, named `<screen>-<state>-<viewport>.png`.
   - `SOURCE.md`: the canvas or artifact link, the export date, and the SHA-256 of every exported file.
   Set the registry entry to `RECEIVED` with `path` pointing at `SPEC.md`.
2. **Reconcile.** Fill in `docs/agent/templates/DESIGN_INTAKE_TEMPLATE.md` as `docs/agent/design/<DESIGN-ID>/INTAKE.md`.
   It runs the master §8 checklist against the master, the 0.5 spec, the current code and the existing tests.
   Every conflict is listed with a proposed resolution. Set the status to `UNDER_REVIEW`.
3. **Check the data against the code.** Resource, food, equipment and inventory names in the design are matched
   against `src/data/**` and `src/types/**` (master §45 says S3-D names must be reconciled, not invented).
   Mismatches are listed in INTAKE.md.
4. **Independent review.** A reviewer subagent that did not write INTAKE.md checks it against the design files
   and the code, and returns GREEN, YELLOW or RED. Each intake review writes its report to
   `docs/agent/evidence/<current slice>/reviews/design-intake-<n>.md`, ending with the verdict line, and is recorded
   with a ledger event (`record-event.mjs --kind review`, the report as `--evidence`), not in the slice manifest: a
   design intake review doesn't judge the slice's code tree, and `check-state.mjs` requires every report series in
   the manifest to end GREEN on the accepted tree.
5. **Owner approval.** The owner reads INTAKE.md and approves, changes or rejects it. Record the answer verbatim
   in a new ADR whose "## Owner approval" section names the design id, then commit the ADR and list it in
   `decisions/INDEX.md`. Set the status, and fill in `approval`, citing that ADR before any other. `check-state.mjs`
   accepts an `APPROVED` entry only when the first ADR its `approval` cites is the owner's approval
   (`OPERATIONS.md` §2) and names the design id (the script finds the id anywhere in the ADR), and its `path` exists.
   Then run `protect.mjs --update --adr <that ADR>`: `design/` is protected, so the files steps 1 and 2 add and
   every registry change fail `protect.mjs` and `check-state.mjs` until an update records them
   (`OPERATIONS.md` §10).
6. **Traceability.** Add requirement ids (`DES-*`, `AUTO-*` and so on) to `REQUIREMENTS.json` for every
   normative behaviour, add the test ids to a new section of `docs/TEST_IDS.md`, and update the affected slice
   contract. Unaffected contracts stay as they are (master §8).
7. **Record.** Append a ledger event for each status change.

## What an orchestrator does when a needed design is not approved

- It finishes any work that doesn't depend on the design.
- It doesn't invent screens, copy, test ids or player-facing names to fill the gap.
- It stops at `OWNER_GATE` with `ownerGateReason` set to `DESIGN_PENDING:<DESIGN-ID>`, and lists in `HANDOFF.md`
  exactly what is waiting on the design.

## When the owner brings a design to a session

The owner may simply paste a link or attach exported files and ask an agent to "take a look". The agent then runs
steps 1 to 4 above, reports the conflicts and questions, and waits for the owner's decision (step 5). It doesn't
build anything from the design in that session unless the owner approves it.
