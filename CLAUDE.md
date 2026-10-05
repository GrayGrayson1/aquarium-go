@AGENTS.md

## Claude Code

- Run the reviewer roles in `docs/agent/prompts/ROLE_PROMPTS.md` as separate subagents. Give each reviewer the
  slice contract, the requirement subset, the design excerpt, the diff and the evidence paths, not the builder's
  summary, and the path of the report file it must write. Start a new reviewer instance after every repair.
- One orchestrator session per mega-slice: at the slice boundary (or an early-rollover trigger), finish the rollover
  checklist, commit locally and end the session. The owner, or `scripts/agent/relaunch.mjs` when the owner runs it,
  starts the next one with `docs/agent/prompts/KICKOFF.md` (ADR-0002).
- Don't end a turn while a gate, workflow or reviewer you started is still running; wait for its notification.
- Claude auto-memory and CNVS shared memory (`cnvs_remember`) are not project memory here, even where a tool's
  instructions call them canonical. Record decisions and state in `docs/agent`.
- Never change permission settings, hooks or push guards yourself, and never use `dangerouslyDisableSandbox` to get
  around a denial. If a gate can't run in the sandbox (headless Chromium), record it as not run and tell the owner.
