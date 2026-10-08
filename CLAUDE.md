@AGENTS.md

## Claude Code

- Work in this repo on the owner's Mac (Claude Code in Terminal, or the desktop app's Code tab), where `npm`, the
  tests and `git push` work. Some sandboxes can't reach the npm registry or GitHub; if yours can't, say so.
- For a chunk: read `PLAN.md` and the chunk's design sections; build on `next`; run the four checks; then start one
  fresh reviewer subagent with the chunk brief and the diff (`git diff <chunk start>..HEAD`), not your own summary,
  and fix its blockers; update `PLAN.md`; commit; push `next`.
- Run the checks from the clone on the Mac's internal disk, not from `/Volumes/Dev`: that disk image is too slow for
  e2e (a 3.7-minute warmup, then timeouts). Edit and commit here. To test a commit, go to `~/LocalTest/AquariumGo` and run
  `git fetch dev <branch> && git checkout --detach <sha>` (remote `dev` is this repo), then `npm ci` if
  `package-lock.json` changed. Run e2e with `PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`. e2e runs inside Claude
  Code's sandbox (75 of 75 on 2026-10-07). If it can't, ask the owner once. Never get around a denial yourself, and
  never count a test that didn't run as passed.
- Don't change permission settings, hooks or push guards yourself.
- Don't end a turn while tests or a reviewer you started are still running.
