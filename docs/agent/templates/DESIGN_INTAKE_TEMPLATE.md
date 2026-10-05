# DESIGN INTAKE — DESIGN-ID

**Design:** title\
**Registry status:** RECEIVED | UNDER_REVIEW | APPROVED | REJECTED\
**Captured files:** `docs/agent/design/DESIGN-ID/` (SPEC.md, screens/, SOURCE.md with SHA-256s)\
**Slices affected:** S#

## 1. Affected routes, screens and components
List every route, panel, card and component that is new or changes, with the current file paths.

## 2. Comparison with the master constitution
Product priorities (master §2), hard owner decisions (§3), automation rules and anti-dupe invariants (S3), and
anything the design asks for that the master forbids or doesn't cover.

## 3. Comparison with current product behaviour
What the game does today on these screens and systems (cite files), and what changes.

## 4. Accessibility
Status shown as icon plus word, never colour alone; focus order; keyboard and Esc; reduced motion; high contrast.

## 5. Phone, landscape and desktop
Phone portrait, phone landscape (short height), desktop, and dock and tab-bar collisions.

## 6. Routes, deep links and Back
New hash routes, how they parse and format, how Back, Forward and Esc behave, and reload behaviour (master §43).

## 7. Simulation and state assumptions
New state fields, determinism (no new randomness outside the sim's RNG streams), step-size invariance,
offline catch-up, idempotency across save and load, and save compatibility (master §3.5).

## 8. Performance
Per-tick and per-frame cost, large collections, dashboards that can grow.

## 9. Names checked against data
Every player-facing resource, food, equipment and inventory name, matched to `src/data/**` and `src/types/**`.

## 10. Test ids and screenshots
New test ids (for the `docs/TEST_IDS.md` section), screenshots that change, and existing tests at risk.

## 11. Conflicts and proposed resolutions
| # | Conflict | Sources | Proposed resolution | Needs owner? |
|---|---|---|---|---|

## 12. Requirements to add or change
| ID | Description | Acceptance criterion | Test |
|---|---|---|---|

## 13. Independent review
Reviewer, verdict (GREEN, YELLOW or RED) and findings.

## 14. Owner decision
Owner's words, verbatim, and the ADR that records them.
