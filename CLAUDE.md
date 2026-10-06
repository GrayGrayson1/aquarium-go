@AGENTS.md

## Claude Code

- Work in this repo on the owner's Mac (Claude Code in Terminal, or the desktop app's Code tab), where `npm`, the
  tests and `git push` work. Some sandboxes can't reach the npm registry or GitHub; if yours can't, say so.
- For a chunk: read `PLAN.md` and the chunk's design sections; build on `next`; run the four checks; then start one
  fresh reviewer subagent with the chunk brief and the diff (`git diff <chunk start>..HEAD`), not your own summary,
  and fix its blockers; update `PLAN.md`; commit; push `next`.
- Headless Chromium hangs inside Claude Code's sandbox on this Mac. Ask the owner to approve running `npm run e2e`
  outside the sandbox, or to run it in Terminal. Never get around a denial yourself, and never count a test that
  didn't run as passed.
- Don't change permission settings, hooks or push guards yourself.
- Don't end a turn while tests or a reviewer you started are still running.
