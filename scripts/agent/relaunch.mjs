#!/usr/bin/env node
/**
 * Opt-in automatic relaunch (ADR-0002 decision 3). By default the owner starts every orchestrator session with
 * docs/agent/prompts/KICKOFF.md. When the owner runs this script instead, it starts each next session headlessly
 * after the previous one stops cleanly, so green mega-slices advance without anyone at the keyboard.
 *
 *   node scripts/agent/relaunch.mjs                 # run until a stop condition (at most 6 sessions)
 *   node scripts/agent/relaunch.mjs --dry-run       # show the checks and the exact command; starts and writes nothing
 *   node scripts/agent/relaunch.mjs --max-sessions 3 --budget-usd 40 --model opus --effort max
 *
 * Unknown options, positional arguments, single-dash and typographic-dash forms (`-dry-run`, `—dry-run`), values on
 * booleans and empty values (`--dry-run=`) are refused (lib.mjs parseArgs), so a typo can never start real sessions.
 *
 * It never starts a session when docs/agent/STOP exists, another launcher holds the lock (taken with an exclusive
 * create), check-state.mjs reports errors, the state is an owner gate / BLOCKED_MANUAL_REVIEW / COMPLETE_LOCAL, remote
 * mutation is allowed, or the branch isn't the integration branch. After each session it stops on: a non-zero exit, no
 * recorded progress, any stop state, the session cap, the STOP file, a dirty tree, and (with an alarm) any sign of a
 * remote write or a guard change: the origin's refs moved or couldn't be read (git ls-remote), a remote-tracking ref
 * changed or appeared other than by fetch, a local ref was deleted or rewound, git config, hooks, .claude, .mcp.json or
 * the user-level Claude settings changed, a protected file or PROTECTED.json changed, the deploy configuration changed
 * (DEPLOY_CONFIG: what a later push would build and deploy), or the session recorded an owner decision or left a stop
 * state itself (only the owner decides, ledgerAlarms). It doesn't start a session when origin's refs can't be read.
 *
 * Sessions run with --permission-mode auto and --permission-prompts none (anything that would need a person is
 * denied), deny rules passed inline for every spawn, and push credentials stripped from the child environment.
 * Deny rules match command text, so they are a guard rail; the post-session checks back them up. Session transcripts
 * go to .agent-runs/ (ignored by Git); their paths and SHA-256 hashes go to the ledger.
 */
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { PATHS, ROOT, STOP_STATES, appendEvent, exists, git, isMainModule, nowIso, parseArgs, parseLedger, positiveInt, positiveNumber, readJson, readText, sha256File, sha256Text } from './lib.mjs';
import { checkRepository } from './check-state.mjs';
import { currentHashes, verifyProtected } from './protect.mjs';

export const RUNS_DIR = '.agent-runs';
export const LOCK_FILE = `${RUNS_DIR}/relaunch.lock`;
export const DEFAULT_MAX_SESSIONS = 6;
export const DEFAULT_BG_WAIT_HOURS = 6;
const ALLOWED = ['maxSessions', 'budgetUsd', 'model', 'effort', 'bgWaitHours', 'claude'];
const BOOLEANS = ['dryRun', 'help'];

/** The launcher's options; an unknown or mistyped one throws, so it can never start real sessions by accident. */
export function parseRelaunchArgs(argv) {
  return parseArgs(argv, BOOLEANS, ALLOWED);
}

/**
 * Commands an unattended session may never run ("Bash(pattern)" rules, where `*` matches any run of characters, at
 * the end or inside the pattern). agent.test.mjs checks them against the bypass forms the S0 reviews found.
 */
export const DENY_RULES = [
  'Bash(git push)',
  'Bash(git push *)',
  'Bash(git -C *)',
  'Bash(git -c *)',
  'Bash(git --git-dir*)',
  'Bash(git --work-tree*)',
  'Bash(git --no-pager push*)',
  'Bash(git -* push*)',
  'Bash(/usr/bin/git *)',
  'Bash(/usr/local/bin/git *)',
  'Bash(/opt/homebrew/bin/git *)',
  'Bash(git credential*)',
  'Bash(git remote add *)',
  'Bash(git remote set-url *)',
  'Bash(git remote remove *)',
  'Bash(git remote rename *)',
  'Bash(git config *)',
  'Bash(gh *)',
  'Bash(/opt/homebrew/bin/gh *)',
  'Bash(render *)',
  'Bash(/opt/homebrew/bin/render *)',
  'Bash(vercel *)',
  'Bash(npx vercel *)',
  'Bash(netlify *)',
  'Bash(npm publish)',
  'Bash(npm publish *)',
  'Bash(curl *)',
  'Bash(wget *)',
  'Bash(ssh *)',
  'Bash(scp *)',
  'Bash(rsync *)',
  'Bash(nc *)',
  'Bash(sh -c *)',
  'Bash(bash -c *)',
  'Bash(zsh -c *)',
  'Bash(env *)',
  'Bash(xargs *)',
  'Bash(git reset --hard)',
  'Bash(git reset --hard *)',
  'Bash(git reset --soft *)',
  'Bash(git reset --mixed *)',
  'Bash(git clean *)',
  'Bash(git checkout -- *)',
  'Bash(git checkout .)',
  'Bash(git checkout -f*)',
  'Bash(git checkout --force*)',
  'Bash(git switch --discard-changes*)',
  'Bash(git switch -f*)',
  'Bash(git switch --force*)',
  'Bash(git restore *)',
  'Bash(git stash drop)',
  'Bash(git stash drop *)',
  'Bash(git stash clear)',
  'Bash(git branch -D *)',
  'Bash(git branch -d *)',
  'Bash(git branch --delete *)',
  'Bash(git branch -f *)',
  'Bash(git branch --force *)',
  'Bash(git tag -d *)',
  'Bash(git tag --delete *)',
  'Bash(git tag -f *)',
  'Bash(git update-ref *)',
  'Bash(git worktree remove --force *)',
  'Bash(git rebase *)',
  'Bash(git commit --amend)',
  'Bash(git commit --amend *)',
  'Bash(git commit -a --amend*)',
  'Bash(git commit *--amend*)',
  'Bash(git filter-branch *)',
  'Bash(git filter-repo *)',
  'Bash(git reflog expire *)',
  'Bash(git reflog delete*)',
  'Bash(git gc --prune*)',
];

export const UNATTENDED_NOTE = [
  'You are running unattended: scripts/agent/relaunch.mjs started this session and nobody is watching.',
  'Nobody will answer questions or permission prompts, and a denied action stays denied: do not retry it another way.',
  'Never push, deploy, publish or change anything outside this machine, and never change git config, hooks or .claude settings.',
  'When you need an owner decision, write the question under "Owner questions" in docs/agent/HANDOFF.md, move to OWNER_GATE with scripts/agent/record-event.mjs (--reason and --resume), commit locally and end the session.',
  'At a mega-slice boundary or an early-rollover trigger (master §17), complete the rollover checklist, commit locally (leave no uncommitted changes) and end the session; the launcher starts the next one.',
].join(' ');

/** The kickoff prompt: the first ```text block of docs/agent/prompts/KICKOFF.md. */
export function extractKickoff(markdown) {
  const m = markdown.match(/```text\n([\s\S]*?)\n```/);
  if (!m) throw new Error('docs/agent/prompts/KICKOFF.md has no ```text block');
  return m[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Child environment: no push credentials (tokens, the SSH agent and askpass helpers removed, git credential helpers
 * blanked, gh pointed at an empty config directory), no prompts.
 */
export function childEnv(base, bgWaitHours) {
  const env = { ...base };
  for (const k of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN', 'RENDER_API_KEY', 'VERCEL_TOKEN', 'NPM_TOKEN', 'SSH_AUTH_SOCK', 'GIT_ASKPASS', 'SSH_ASKPASS']) delete env[k];
  Object.assign(env, {
    GH_CONFIG_DIR: join(ROOT, RUNS_DIR, 'gh-config-empty'),
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'credential.helper',
    GIT_CONFIG_VALUE_0: '',
    GIT_CONFIG_KEY_1: 'credential.https://github.com.helper',
    GIT_CONFIG_VALUE_1: '',
    CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: String(Math.round(bgWaitHours * 3600000)),
  });
  return env;
}

/** Pure decision after a session ends. Alarms first. */
export function decide(o) {
  const stop = (reason, alarm = false) => ({ action: 'stop', reason, alarm });
  if (o.alarms?.length) return stop(o.alarms.join('; '), true);
  if (o.exitCode !== 0) return stop(`the session exited with code ${o.exitCode}`);
  if (o.checkErrors?.length) return stop(`check-state.mjs found ${o.checkErrors.length} error(s): ${o.checkErrors[0]}`);
  const s = o.after ?? {};
  if (s.remoteMutationAllowed) return stop('STATE.remoteMutationAllowed is true; unattended sessions never run with remote permission');
  if (STOP_STATES.includes(s.machineState)) return stop(`machineState is ${s.machineState}${s.ownerGateReason ? ` (${s.ownerGateReason})` : ''}`);
  if (s.ownerGateRequired) return stop(`owner gate required: ${s.ownerGateReason ?? 'no reason given'}`);
  if (o.dirty) return stop('the session left uncommitted changes (an incomplete handoff)');
  if (!o.progressed) return stop('the session made no recorded progress (HEAD, STATE.json and LEDGER.jsonl unchanged)');
  if (o.stopFile) return stop('docs/agent/STOP exists');
  // Written so that a cap that isn't a number (NaN, undefined) stops too, instead of never being reached (M9).
  if (!(o.sessionsRun < o.maxSessions)) return stop(`the session cap (${o.maxSessions}) was reached`);
  return { action: 'continue', reason: `continue with ${s.currentSlice} ${s.machineState}` };
}

/** Problems that forbid starting a session (empty when it may start). */
export function preflight({ state, checkErrors, stopFile, branch, locked }) {
  const problems = [];
  if (locked) problems.push(`another launcher holds ${LOCK_FILE}`);
  if (stopFile) problems.push('docs/agent/STOP exists');
  if (checkErrors.length) problems.push(`check-state.mjs reports ${checkErrors.length} error(s), first: ${checkErrors[0]}`);
  if (state.remoteMutationAllowed) problems.push('STATE.remoteMutationAllowed is true');
  if (STOP_STATES.includes(state.machineState)) problems.push(`machineState is ${state.machineState}`);
  if (state.ownerGateRequired) problems.push(`owner gate required: ${state.ownerGateReason ?? 'no reason given'}`);
  if (!state.integrationBranch) problems.push('STATE.integrationBranch is not set');
  else if (branch !== state.integrationBranch) problems.push(`on branch ${branch}, not the integration branch ${state.integrationBranch}`);
  return problems;
}

/** Map of every ref to its object id. */
function refs() {
  const out = {};
  for (const line of git('for-each-ref', '--format=%(refname) %(objectname)').split('\n').filter(Boolean)) {
    const [name, sha] = line.split(' ');
    out[name] = sha;
  }
  return out;
}

/** origin's refs as seen over the network (read-only), or null when unreachable. */
function remoteRefs() {
  const r = spawnSync('git', ['ls-remote', 'origin'], { cwd: ROOT, encoding: 'utf8', env: childEnv(process.env, 1), timeout: 30000 });
  return r.status === 0 ? r.stdout : null;
}

/**
 * Files whose content decides what a later push builds and deploys: both channels (GitHub Pages and Render) run
 * `npm ci && npm run build` on the pushed tree (SD-12).
 */
export const DEPLOY_CONFIG = ['.github', 'render.yaml', 'package.json', 'package-lock.json', '.npmrc', 'vite.config.ts'];

function dirHash(rel) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return 'absent';
  const parts = [];
  const walk = (d, prefix) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p, `${prefix}${name}/`);
      else parts.push(`${prefix}${name}:${sha256File(p)}`);
    }
  };
  walk(dir, '');
  return sha256Text(parts.join('\n'));
}

function pathHash(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return 'absent';
  return statSync(p).isDirectory() ? dirHash(rel) : sha256File(p);
}

/**
 * The user-level Claude Code settings a later session loads (SD-5): permission rules and hooks that live outside the
 * repository. Only these files, because the rest of the config directory (transcripts, history) changes every session.
 */
function userSettingsHash() {
  const dir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  return ['settings.json', 'settings.local.json'].map((f) => (existsSync(join(dir, f)) ? `${f}:${sha256File(join(dir, f))}` : `${f}:absent`)).join(' ');
}

function snapshot() {
  return {
    head: git('rev-parse', 'HEAD'),
    stateText: readText(PATHS.state),
    ledgerText: exists(PATHS.ledger) ? readText(PATHS.ledger) : '',
    refs: refs(),
    remote: remoteRefs(),
    gitConfig: sha256File(join(ROOT, '.git', 'config')),
    hooks: dirHash('.git/hooks'),
    claude: dirHash('.claude'),
    mcp: pathHash('.mcp.json'),
    userSettings: userSettingsHash(),
    protectedErrors: verifyProtected().errors.length,
    protectedFiles: sha256Text(JSON.stringify(currentHashes())),
    protectedRecord: pathHash(PATHS.protected),
    deployConfig: Object.fromEntries(DEPLOY_CONFIG.map((rel) => [rel, pathHash(rel)])),
  };
}

/** Alarms comparing two snapshots (pure). `isAncestor(a, b)` and `reflogSubjects(ref)` are injected. */
export function alarmsBetween(before, after, { integrationBranch, isAncestor, reflogSubjects }) {
  const alarms = [];
  if (!before.remote || !after.remote) alarms.push(`could not read origin's refs (git ls-remote) ${before.remote ? 'after' : 'before'} the session, so a push can't be ruled out`);
  else if (before.remote !== after.remote) alarms.push("origin's refs changed during the session (git ls-remote): a push or remote write happened");
  for (const [ref, sha] of Object.entries(before.refs)) {
    const now = after.refs[ref];
    if (now === undefined) {
      alarms.push(`ref ${ref} was deleted`);
      continue;
    }
    if (now === sha) continue;
    if (ref.startsWith('refs/remotes/')) {
      if (reflogSubjects(ref).some((s) => !s.startsWith('fetch'))) alarms.push(`remote-tracking ref ${ref} changed other than by fetch (a push?)`);
    } else if (ref === `refs/heads/${integrationBranch}`) {
      if (!isAncestor(sha, now)) alarms.push(`the integration branch ${integrationBranch} was rewound or rewritten`);
    } else if (ref.startsWith('refs/tags/')) alarms.push(`tag ${ref} was moved`);
    else alarms.push(`ref ${ref} was moved`);
  }
  for (const ref of Object.keys(after.refs)) {
    if (ref in before.refs || !ref.startsWith('refs/remotes/')) continue;
    if (reflogSubjects(ref).some((s) => !s.startsWith('fetch'))) alarms.push(`remote-tracking ref ${ref} appeared other than by fetch (a push of a new branch?)`);
  }
  if (before.gitConfig !== after.gitConfig) alarms.push('.git/config changed');
  if (before.hooks !== after.hooks) alarms.push('.git/hooks changed');
  if (before.claude !== after.claude) alarms.push('.claude settings changed');
  if (before.mcp !== after.mcp) alarms.push('.mcp.json changed (MCP servers a later session would load without asking)');
  if (before.userSettings !== after.userSettings) alarms.push('the user-level Claude Code settings changed (~/.claude/settings*.json)');
  if (after.protectedErrors > before.protectedErrors) alarms.push('protected harness files changed without an approval (protect.mjs)');
  if (before.protectedFiles !== after.protectedFiles || before.protectedRecord !== after.protectedRecord) alarms.push('protected harness files or docs/agent/PROTECTED.json changed during the session: the owner reviews the change and its ADR');
  const deploy = [...new Set([...Object.keys(before.deployConfig ?? {}), ...Object.keys(after.deployConfig ?? {})])].filter((p) => before.deployConfig?.[p] !== after.deployConfig?.[p]);
  if (deploy.length) alarms.push(`deploy configuration changed (${deploy.join(', ')}): a push would build and deploy it, so the owner reviews it first`);
  alarms.push(...ledgerAlarms(before.ledgerText ?? '', after.ledgerText ?? ''));
  return alarms;
}

/**
 * Alarms for ledger events an unattended session added (pure): nobody can give an owner decision in a session nobody
 * attends, so an owner-decision event, or a transition out of a stop state (OWNER_GATE, BLOCKED_MANUAL_REVIEW), means
 * the session decided for the owner, even if it ended in an ordinary state (security-data-2 M2). A ledger that no
 * longer starts with its text from before the session was rewritten.
 */
export function ledgerAlarms(beforeText = '', afterText = '') {
  if (!afterText.startsWith(beforeText)) return ['LEDGER.jsonl was rewritten during the session (it no longer starts with its text from before)'];
  const alarms = [];
  for (const e of parseLedger(afterText.slice(beforeText.length)).events) {
    if (e?.kind === 'owner-decision') alarms.push(`an owner-decision event (${(e.decisions ?? []).join(', ') || 'no ADR'}) was recorded during an unattended session: only the owner decides, in a session they attend`);
    if (e?.kind === 'transition' && STOP_STATES.includes(e.fromState)) alarms.push(`the unattended session left ${e.fromState} itself (${e.fromState} → ${e.toState}): only an owner decision, recorded in an attended session, leaves a stop state`);
  }
  return alarms;
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

export function claudeArgs({ kickoff, slice, stamp, model, effort, budgetUsd }) {
  return [
    '-p',
    kickoff,
    '--permission-mode',
    'auto',
    '--permission-prompts',
    'none',
    '--settings',
    JSON.stringify({ permissions: { deny: DENY_RULES } }),
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

/** Whether a process with this pid runs (one owned by another user counts as running). */
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

/** Whether the lock is held by a running launcher (read-only, for --dry-run). An unreadable pid counts as held. */
function lockHeld() {
  const p = join(ROOT, LOCK_FILE);
  if (!existsSync(p)) return false;
  const pid = Number(readFileSync(p, 'utf8').trim());
  return !(Number.isInteger(pid) && pid > 0) || pidAlive(pid);
}

/**
 * Take the launcher lock with an exclusive create, so two launchers started together can't both hold it
 * (code-architecture-harness-2 m8). A lock whose pid no longer runs (a launcher that died) is removed and taken; a lock
 * whose pid can't be read yet counts as held. Returns a function that releases the lock if it is still this process's,
 * or null when another launcher holds it.
 */
export function acquireLock(path, { pid = process.pid, isAlive = pidAlive } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd;
    try {
      fd = openSync(path, 'wx');
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let holder;
      try {
        holder = Number(readFileSync(path, 'utf8').trim());
      } catch {
        continue; // released meanwhile: try again
      }
      if (Number.isInteger(holder) && holder > 0 && !isAlive(holder)) {
        rmSync(path, { force: true });
        continue;
      }
      return null;
    }
    writeSync(fd, String(pid));
    closeSync(fd);
    return () => {
      try {
        if (readFileSync(path, 'utf8').trim() === String(pid)) rmSync(path, { force: true });
      } catch {
        /* already gone */
      }
    };
  }
  return null;
}

async function main() {
  const args = parseRelaunchArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/agent/relaunch.mjs [--dry-run] [--max-sessions N] [--budget-usd X] [--model M] [--effort E] [--bg-wait-hours H] [--claude PATH]');
    console.log('Stops at owner gates, blocks, errors, no progress, a dirty tree, docs/agent/STOP, the session cap, or (with an alarm) any sign of a remote write or guard change.');
    return 0;
  }
  const maxSessions = positiveInt(args.maxSessions, 'max-sessions', DEFAULT_MAX_SESSIONS);
  const bgWaitHours = positiveNumber(args.bgWaitHours, 'bg-wait-hours', DEFAULT_BG_WAIT_HOURS);
  const budgetUsd = args.budgetUsd === undefined ? undefined : positiveNumber(args.budgetUsd, 'budget-usd');
  const claude = String(args.claude ?? 'claude');
  const kickoff = extractKickoff(readText(PATHS.kickoff));

  if (args.dryRun) {
    const state = readJson(PATHS.state);
    const problems = preflight({ state, checkErrors: checkRepository().errors, stopFile: exists(PATHS.stopFile), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), locked: lockHeld() });
    console.log(problems.length ? `Would not start: ${problems.join('; ')}` : 'Pre-flight OK. Would run:');
    console.log([claude, ...claudeArgs({ kickoff, slice: state.currentSlice, stamp: 'STAMP', model: args.model, effort: args.effort, budgetUsd }).map((a) => JSON.stringify(a))].join(' '));
    console.log(`with push credentials stripped and CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=${Math.round(bgWaitHours * 3600000)}`);
    return problems.length ? 1 : 0;
  }

  const release = acquireLock(join(ROOT, LOCK_FILE));
  if (!release) {
    console.log(`Not starting: another launcher holds ${LOCK_FILE}`);
    return 1;
  }
  process.on('exit', release);

  for (let sessionsRun = 0; ; ) {
    const state = readJson(PATHS.state);
    const problems = preflight({ state, checkErrors: checkRepository().errors, stopFile: exists(PATHS.stopFile), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), locked: false });
    if (problems.length) {
      const msg = `Not starting a session: ${problems.join('; ')}`;
      console.log(msg);
      notify(msg);
      return sessionsRun ? 0 : 1;
    }
    const stamp = nowIso().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const argv = claudeArgs({ kickoff, slice: state.currentSlice, stamp, model: args.model, effort: args.effort, budgetUsd });
    const before = snapshot();
    if (!before.remote) {
      const msg = "Not starting a session: git ls-remote origin failed, so a push during the session couldn't be detected";
      console.log(msg);
      notify(msg);
      return sessionsRun ? 0 : 1;
    }
    const logRel = `${RUNS_DIR}/${stamp}-${state.currentSlice}.jsonl`;
    const errRel = `${RUNS_DIR}/${stamp}-${state.currentSlice}.err.log`;
    appendEvent({ kind: 'session-start', actor: 'relaunch', slice: state.currentSlice, task: state.currentTask, fromState: state.machineState, toState: state.machineState, result: `session ${sessionsRun + 1} of at most ${maxSessions} started`, evidence: [logRel] });
    console.log(`[${nowIso()}] session ${sessionsRun + 1}: ${state.currentSlice} ${state.currentTask} (${state.machineState}) → ${logRel}`);

    const out = openSync(join(ROOT, logRel), 'w');
    const err = openSync(join(ROOT, errRel), 'w');
    const exitCode = await new Promise((resolveExit) => {
      const child = spawn(claude, argv, { cwd: ROOT, stdio: ['ignore', out, err], env: childEnv(process.env, bgWaitHours) });
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
    const alarms = alarmsBetween(before, after, {
      integrationBranch: state.integrationBranch,
      isAncestor: (a, b) => spawnSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: ROOT }).status === 0,
      reflogSubjects: (ref) => (spawnSync('git', ['reflog', 'show', '--format=%gs', ref], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '').split('\n').filter(Boolean).slice(0, 20),
    });
    const decision = decide({
      alarms,
      exitCode,
      after: afterState,
      checkErrors: checkRepository().errors,
      dirty: git('status', '--porcelain').length > 0,
      progressed: after.head !== before.head || after.stateText !== before.stateText || foreignLedgerEvents(before.ledgerText, after.ledgerText) > 0,
      stopFile: exists(PATHS.stopFile),
      sessionsRun,
      maxSessions,
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

if (isMainModule(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.message ?? String(e));
      process.exit(1);
    },
  );
}
