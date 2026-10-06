# Kickoff: starting an orchestrator session

Every orchestrator session starts from repository state with the same short prompt (ADR-0002 decision 3).

## Default: you start each session

1. Open a new Claude Code session in `/Volumes/Dev/Projects/AquariumGo`. Check that `/Volumes/Dev` is mounted first.
2. Paste the prompt below as the first message.
3. The session works until the current mega-slice is accepted and checkpointed, or until it reaches a stop
   condition. It then writes the handoff and ends. Start the next session the same way.

## Optional: automatic relaunch

Run `node scripts/agent/relaunch.mjs` from a terminal in the repo. It sends the same prompt to a new headless
session each time the previous one stops cleanly, and stops at owner gates, blocks, errors, a session without
progress, the file `docs/agent/STOP`, or its session cap. See `node scripts/agent/relaunch.mjs --help`.

## The prompt

```text
You are the AquariumGo orchestrator. Assume you remember nothing from any earlier session. Read AGENTS.md, then
docs/agent/README_FIRST.md, and follow its reading order. Verify Git reality and write the bootstrap assertion to
docs/agent/evidence/<current slice>/bootstrap-<UTC timestamp>.json. Then continue from the exact next legal action in
docs/agent/HANDOFF.md. Work until the current mega-slice is accepted and checkpointed, or until a stop condition:
an owner gate, BLOCKED_MANUAL_REVIEW, a design that is not yet approved, or an early-rollover trigger (master §17).
Before you stop, complete the rollover checklist (master §17): update STATE.json, LEDGER.jsonl, REQUIREMENTS.json,
the evidence manifest, CURRENT_SLICE.md and HANDOFF.md, and commit locally. Then end the session. Never push,
deploy, publish or change anything outside this machine.
```

## When the session is unattended

The launcher appends a note telling the session nobody is watching. An unattended session never waits for an
answer. When it needs an owner decision, it writes the question under "Owner questions" in `HANDOFF.md`, sets
`ownerGateRequired` and `ownerGateReason` in `STATE.json`, moves to `OWNER_GATE`, and ends.
