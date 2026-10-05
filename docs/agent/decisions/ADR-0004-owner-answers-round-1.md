# ADR-0004 — Owner answers, review round 1 (guards, browser gates, save policy, revision rules)

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0, and ALL for the browser-gate and rule decisions\
**Requirements:** REL-001, HARNESS-002, HARNESS-006, PERSIST-001, PERSIST-003

## Context

After the adversarial review and the independent reviews of the S0 diff, the session asked the owner four questions
in a top-level Claude Code session. The questions and the owner's answers are recorded word for word
(`OPERATIONS.md` §2).

## Decisions

### 1. Mechanical guards against pushes and deploys

Question: "The ban on pushes and deploys is only text today, and your Claude memory held push and Render deploy
recipes (I've marked them owner-only). May I add mechanical guards? You'd still push from your own terminal with one
extra variable." Options offered: "Hook + deny list (Recommended)", "Claude deny list only", "Text rules only".

Owner's answer (verbatim): "lets not worry about this for now maybe 3 then"

Resulting rule: option 3, **text rules only**, for now. No pre-push hook, no project `.claude/settings.json` deny list
and no `pushurl` change are installed. The opt-in relaunch launcher keeps applying its own deny rules to the sessions
it starts. The question can be reopened by the owner at any time.

### 2. How browser tests run (BF-001)

Question: "Headless Chrome hangs inside Claude Code's sandboxed shell, so e2e and browser QA can't run there. That's
why the baseline e2e (47 tests) is recorded as not run. How should browser tests run during the build?" Options
offered: "Sandbox exception (Recommended)", "I run them at each gate", "No sandbox for sessions".

Owner's answer (verbatim): "next chunk of work I'll run in claude desktop app with web testing capability"

Resulting rule: the next orchestrator sessions run in the Claude desktop app, which has web testing capability. The
first job of that session is to check that `npm run e2e` and browser QA really run there, record a real baseline e2e
run (BF-001), and record browser evidence as `OPERATIONS.md` §6 requires. If browsers still can't start, the session
records the gate as not run and raises an owner gate (`BASELINE_RED:e2e`); it never records a pass it didn't see.

### 3. Save policy

Question: "The master says save compatibility is best-effort and a schema bump is allowed. But the live v0.4.0 code
treats a save from a newer schema as damaged … What's the save policy for this build?"

Owner's answer (verbatim): "what does this mean? eli5"

Resulting rule: **not decided yet**; the question is asked again in plain words (ADR-0005). Until then master §3.5
stands exactly as the owner wrote it (ADR-0006 removes the owner-gate sentence this revision had added), and the
known risk is recorded as a requirement to fix rather than as a ban.

### 4. Rules added by the harness revision (ADR-0003)

Question: "My harness revision added rules that tighten your originals: a defect also stops after 5 attempts in total
(not only 3 different ones), YELLOW never advances on its own, gate-defining files need an ADR plus review, protected
rule files need an ADR, and an owner gate parks only the blocked item while other work continues. Keep them?"

Owner's answer (selected option): **"Keep all (Recommended)"**, described as: "They close loopholes the red-team
review found, without loosening anything you decided."

Resulting rule: ADR-0003 rules 1 to 6 are confirmed by the owner. Rule 7 (schema bump as an owner gate) was not part
of this question and is withdrawn (ADR-0006) pending decision 3.

## Consequences

- REL-001 still rests on text rules, the launcher's deny list and its post-session checks; reviewers keep flagging
  any push risk.
- S0 acceptance needs a real e2e run from the desktop-app session (or the owner's acknowledgement of BF-001).

## Owner impact

Yes. These are the owner's own decisions.
