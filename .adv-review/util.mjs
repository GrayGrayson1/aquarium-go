// Helpers for adversarial scenarios against the review worktree (never the main checkout).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
export const WT = '/Volumes/Dev/Projects/AquariumGo-review-adv';
if (!process.cwd().startsWith(WT) && process.env.ADV_ALLOW !== '1') { /* scripts always use absolute WT paths */ }
export const p = (rel) => `${WT}/${rel}`;
export const rj = (rel) => JSON.parse(readFileSync(p(rel), 'utf8'));
export const wj = (rel, v) => writeFileSync(p(rel), `${JSON.stringify(v, null, 2)}\n`);
export const rt = (rel) => readFileSync(p(rel), 'utf8');
export const wt = (rel, t) => writeFileSync(p(rel), t);
export const sha = (rel) => createHash('sha256').update(readFileSync(p(rel))).digest('hex');
export const git = (...a) => execFileSync('git', a, { cwd: WT, encoding: 'utf8' }).trim();
export const node = (...a) => { try { return { code: 0, out: execFileSync('node', a, { cwd: WT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; } };
export function setProtectedHash(rel) {
  const pr = rj('docs/agent/PROTECTED.json');
  pr.files[rel] = sha(rel);
  wj('docs/agent/PROTECTED.json', pr);
}
