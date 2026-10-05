#!/usr/bin/env node
/**
 * Opt-in automatic relaunch (ADR-0002 decision 3). By default the owner starts every orchestrator session with
 * docs/agent/prompts/KICKOFF.md. When the owner runs this script instead, it starts each next session headlessly
 * after the previous one stops cleanly, so green mega-slices advance without anyone at the keyboard.
 *
 *   node scripts/agent/relaunch.mjs                 # run until a stop condition (at most 6 sessions)
 *   node scripts/agent/relaunch.mjs --dry-run       # show the checks and the exact command, start nothing
 *   node scripts/agent/relaunch.mjs --max-sessions 3 --budget-usd 40 --model opus --effort max
 *
 * It never starts a session when docs/agent/STOP exists, check-state.mjs reports errors, the state is an owner
 * gate / BLOCKED_MANUAL_REVIEW / COMPLETE_LOCAL, remote mutation is allowed, or the branch isn't the integration
 * branch. After each session it stops on: a non-zero exit, no recorded progress, any stop state, the session cap,
 * the STOP file, changed git remotes, a detected push, or changed deploy configuration (.github/, render.yaml).
 *
 * Sessions run with --permission-mode auto and --permission-prompts none (anything that would need a person is
 * denied) plus deny rules for pushes, deploys, publishing and destructive git commands. Deny rules match the command
 * text, so they are a guard rail rather than a guarantee; the post-session push and remote checks back them up.
 * Session transcripts go to .agent-runs/ (ignored by Git); their paths and SHA-256 hashes go to the ledger.
 */
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, ROOT, STOP_STATES, appendEvent, exists, git, nowIso, parseArgs, readJson, readText, sha256File } from './lib.mjs';
import { checkRepository } from './check-state.mjs';

export const RUNS_DIR = '.agent-runs';
export const DEFAULT_MAX_SESSIONS = 6;
export const DEFAULT_BG_WAIT_HOURS = 6;

/** Commands an unattended session may never run (documented "Bash(prefix *)" rule syntax). */
export const DENY_RULES = [
  'Bash(git push)',
  'Bash(git push *)',
  'Bash(git remote add *)',
  'Bash(git remote set-url *)',
  'Bash(git remote remove *)',
  'Bash(git remote rename *)',
  'Bash(gh *)',
  'Bash(/opt/homebrew/bin/gh *)',
  'Bash(render *)',
  'Bash(/opt/homebrew/bin/render *)',
  'Bash(vercel *)',
  'Bash(npx vercel *)',
  'Bash(netlify *)',
  'Bash(npm publish)',
  'Bash(npm publish *)',
  'Bash(git reset --hard)',
  'Bash(git reset --hard *)',
  'Bash(git clean *)',
  'Bash(git checkout -- *)',
  'Bash(git checkout .)',
  'Bash(git restore *)',
  'Bash(git stash drop)',
  'Bash(git stash drop *)',
  'Bash(git stash clear)',
  'Bash(git branch -D *)',
  'Bash(git tag -d *)',
  'Bash(git update-ref -d *)',
  'Bash(git worktree remove --force *)',
  'Bash(git rebase *)',
  'Bash(git commit --amend)',
  'Bash(git commit --amend *)',
  'Bash(git filter-branch *)',
  'Bash(git filter-repo *)',
  'Bash(git reflog expire *)',
  'Bash(git gc --prune *)',
];

export const UNATTENDED_NOTE = [
  'You are running unattended: scripts/agent/relaunch.mjs started this session and nobody is watching.',
  'Nobody will answer questions or permission prompts, and a denied action stays denied: do not retry it another way.',
  'Never push, deploy, publish or change anything outside this machine.',
  'When you need an owner decision, write the question under "Owner questions" in docs/agent/HANDOFF.md, set ownerGateRequired and ownerGateReason in docs/agent/STATE.json, move to OWNER_GATE, record the transition with scripts/agent/record-event.mjs, commit locally and end the session.',
  'At a mega-slice boundary or an early-rollover trigger (master §17), complete the rollover checklist, commit locally and end the session; the launcher starts the next one.',
].join(' ');

/** The kickoff prompt: the first ```text block of docs/agent/prompts/KICKOFF.md. */
export function extractKickoff(markdown) {
  const m = markdown.match(/```text\n([\s\S]*?)\n```/);
  if (!m) throw new Error('docs/agent/prompts/KICKOFF.md has no ```text block');
  return m[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Pure decision after a session ends. */
export function decide(o) {
  const stop = (reason, alarm = false) => ({ action: 'stop', reason, alarm });
  if (o.pushesDetected) return stop('a git push happened during the session (a remote-tracking reflog says "update by push")', true);
  if (o.remotesChanged) return stop('the git remotes changed during the session', true);
  if (o.deployConfigChanged?.length) return stop(`deploy configuration changed (${o.deployConfigChanged.join(', ')}); the owner must review it`, true);
  if (o.exitCode !== 0) return stop(`the session exited with code ${o.exitCode}`);
  if (o.checkErrors?.length) return stop(`check-state.mjs found ${o.checkErrors.length} error(s): ${o.checkErrors[0]}`);
  const s = o.after ?? {};
  if (s.remoteMutationAllowed) return stop('STATE.remoteMutationAllowed is true; unattended sessions never run with remote permission');
  if (STOP_STATES.includes(s.machineState)) return stop(`machineState is ${s.machineState}${s.ownerGateReason ? ` (${s.ownerGateReason})` : ''}`);
  if (s.ownerGateRequired) return stop(`owner gate required: ${s.ownerGateReason ?? 'no reason given'}`);
  if (!o.progressed) return stop('the session made no recorded progress (HEAD, STATE.json and LEDGER.jsonl unchanged)');
  if (o.stopFile) return stop('docs/agent/STOP exists');
  if (o.sessionsRun >= o.maxSessions) return stop(`the session cap (${o.maxSessions}) was reached`);
  return { action: 'continue', reason: `continue with ${s.currentSlice} ${s.machineState}` };
}

/** Problems that forbid starting a session (empty when it may start). */
export function preflight({ state, checkErrors, stopFile, branch }) {
  const problems = [];
  if (stopFile) problems.push('docs/agent/STOP exists');
  if (checkErrors.length) problems.push(`check-state.mjs reports ${checkErrors.length} error(s), first: ${checkErrors[0]}`);
  if (state.remoteMutationAllowed) problems.push('STATE.remoteMutationAllowed is true');
  if (STOP_STATES.includes(state.machineState)) problems.push(`machineState is ${state.machineState}`);
  if (state.ownerGateRequired) problems.push(`owner gate required: ${state.ownerGateReason ?? 'no reason given'}`);
  if (!state.integrationBranch) problems.push('STATE.integrationBranch is not set');
  else if (branch !== state.integrationBranch) problems.push(`on branch ${branch}, not the integration branch ${state.integrationBranch}`);
  return problems;
}

/** Number of "update by push" entries in the remote-tracking reflogs. */
export function pushCount() {
  let n = 0;
  const refs = git('for-each-ref', '--format=%(refname)', 'refs/remotes').split('\n').filter(Boolean);
  for (const ref of refs) {
    const r = spawnSync('git', ['reflog', 'show', '--format=%gs', ref], { cwd: ROOT, encoding: 'utf8' });
    n += (r.stdout ?? '').split('\n').filter((l) => l.includes('update by push')).length;
  }
  return n;
}

/** Files whose changes alter what a later owner push would deploy. */
export const DEPLOY_CONFIG = ['.github', 'render.yaml'];

function snapshot() {
  return {
    head: git('rev-parse', 'HEAD'),
    stateText: readText(PATHS.state),
    ledgerText: exists(PATHS.ledger) ? readText(PATHS.ledger) : '',
    remotes: git('remote', '-v'),
    pushes: pushCount(),
    deployStatus: git('status', '--porcelain', '--', ...DEPLOY_CONFIG),
  };
}

/** Deploy-config paths committed or left modified by the session (owner's earlier edits don't count). */
export function deployConfigChanges(before, after) {
  const committed = before.head === after.head ? '' : git('diff', '--name-only', before.head, after.head, '--', ...DEPLOY_CONFIG);
  const changed = committed.split('\n').filter(Boolean);
  if (after.deployStatus !== before.deployStatus) changed.push(`uncommitted: ${after.deployStatus || '(reverted)'}`);
  return changed;
}

/** Ledger events added since `beforeText` by anyone other than the launcher. */
function foreignLedgerEvents(beforeText, afterText) {
  if (!afterText.startsWith(beforeText)) return 1; // rewritten; check-state reports it
  return afterText
    .slice(beforeText.length)
    .split('\n')
    .filter(Boolean)
    .filter((line) => {
      try {
        return JSON.parse(line).actor !== 'relaunch';
      } catch {
        return true;
      }
    }).length;
}

function notify(message) {
  if (process.platform !== 'darwin') return;
  spawnSync('osascript', ['-e', `display notification ${JSON.stringify(message)} with title "AquariumGo relaunch"`], { stdio: 'ignore' });
}

function claudeArgs({ kickoff, settingsPath, slice, stamp, model, effort, budgetUsd }) {
  return [
    '-p',
    kickoff,
    '--permission-mode',
    'auto',
    '--permission-prompts',
    'none',
    '--settings',
    settingsPath,
    '--append-system-prompt',
    UNATTENDED_NOTE,
    '--output-format',
    'stream-json',
    '--verbose',
    '--name',
    `aquariumgo-${slice}-${stamp}`,
    ...(model ? ['--model', String(model)] : []),
    ...(effort ? ['--effort', String(effort)] : []),
    ...(budgetUsd ? ['--max-budget-usd', String(budgetUsd)] : []),
  ];
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ['dryRun', 'help']);
  if (args.help) {
    console.log('Usage: node scripts/agent/relaunch.mjs [--dry-run] [--max-sessions N] [--budget-usd X] [--model M] [--effort E] [--bg-wait-hours H] [--claude PATH]');
    console.log('Stops at owner gates, blocks, errors, no progress, docs/agent/STOP, a detected push or deploy-config change, or the session cap.');
    return 0;
  }
  const maxSessions = Number(args.maxSessions ?? DEFAULT_MAX_SESSIONS);
  const bgWaitHours = Number(args.bgWaitHours ?? DEFAULT_BG_WAIT_HOURS);
  const claude = String(args.claude ?? 'claude');
  const kickoff = extractKickoff(readText(PATHS.kickoff));
  mkdirSync(join(ROOT, RUNS_DIR), { recursive: true });
  const settingsPath = join(ROOT, RUNS_DIR, 'relaunch-settings.json');
  writeFileSync(settingsPath, `${JSON.stringify({ permissions: { deny: DENY_RULES } }, null, 2)}\n`);

  for (let sessionsRun = 0; ; ) {
    const state = readJson(PATHS.state);
    const check = checkRepository();
    const problems = preflight({ state, checkErrors: check.errors, stopFile: exists(PATHS.stopFile), branch: git('rev-parse', '--abbrev-ref', 'HEAD') });
    if (problems.length) {
      const msg = `Not starting a session: ${problems.join('; ')}`;
      console.log(msg);
      notify(msg);
      return sessionsRun ? 0 : 1;
    }
    const stamp = nowIso().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const argv = claudeArgs({ kickoff, settingsPath, slice: state.currentSlice, stamp, model: args.model, effort: args.effort, budgetUsd: args.budgetUsd });
    if (args.dryRun) {
      console.log('Pre-flight OK. Would run:');
      console.log([claude, ...argv.map((a) => JSON.stringify(a))].join(' '));
      console.log(`with CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=${Math.round(bgWaitHours * 3600000)} and deny rules in ${settingsPath}`);
      return 0;
    }

    const before = snapshot();
    const logRel = `${RUNS_DIR}/${stamp}-${state.currentSlice}.jsonl`;
    const errRel = `${RUNS_DIR}/${stamp}-${state.currentSlice}.err.log`;
    appendEvent({ kind: 'session-start', actor: 'relaunch', slice: state.currentSlice, task: state.currentTask, fromState: state.machineState, toState: state.machineState, result: `session ${sessionsRun + 1} of at most ${maxSessions} started`, evidence: [logRel] });
    console.log(`[${nowIso()}] session ${sessionsRun + 1}: ${state.currentSlice} ${state.currentTask} (${state.machineState}) → ${logRel}`);

    const out = openSync(join(ROOT, logRel), 'w');
    const err = openSync(join(ROOT, errRel), 'w');
    const exitCode = await new Promise((resolveExit) => {
      const child = spawn(claude, argv, {
        cwd: ROOT,
        stdio: ['ignore', out, err],
        env: { ...process.env, CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: String(Math.round(bgWaitHours * 3600000)) },
      });
      child.on('error', () => resolveExit(127));
      child.on('exit', (code, signal) => resolveExit(code ?? (signal === 'SIGINT' ? 130 : 143)));
    });
    closeSync(out);
    closeSync(err);
    sessionsRun++;

    const after = snapshot();
    let afterState;
    try {
      afterState = JSON.parse(after.stateText);
    } catch {
      afterState = { machineState: 'BLOCKED_MANUAL_REVIEW', ownerGateReason: 'STATE.json is not valid JSON after the session' };
    }
    const deployConfigChanged = deployConfigChanges(before, after);
    const decision = decide({
      exitCode,
      after: afterState,
      checkErrors: checkRepository().errors,
      progressed: after.head !== before.head || after.stateText !== before.stateText || foreignLedgerEvents(before.ledgerText, after.ledgerText) > 0,
      stopFile: exists(PATHS.stopFile),
      sessionsRun,
      maxSessions,
      deployConfigChanged,
      remotesChanged: after.remotes !== before.remotes,
      pushesDetected: after.pushes > before.pushes,
    });
    appendEvent({
      kind: 'session-end',
      actor: 'relaunch',
      slice: afterState.currentSlice ?? state.currentSlice,
      task: afterState.currentTask ?? state.currentTask,
      fromState: state.machineState,
      toState: afterState.machineState ?? state.machineState,
      result: `exit ${exitCode}; ${decision.action}: ${decision.reason}`,
      evidence: [`${logRel} sha256:${sha256File(join(ROOT, logRel))}`, `${errRel} sha256:${sha256File(join(ROOT, errRel))}`],
    });
    console.log(`[${nowIso()}] session ${sessionsRun} ended with exit ${exitCode}: ${decision.action} (${decision.reason})`);
    if (decision.action === 'stop') {
      notify(`${decision.alarm ? 'ALARM: ' : ''}${decision.reason}`);
      return decision.alarm ? 2 : 0;
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.stack ?? String(e));
      process.exit(1);
    },
  );
}
