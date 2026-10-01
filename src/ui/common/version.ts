/**
 * The release this bundle is: `version` from package.json plus the commit and time it was built, stamped in by
 * vite.config.ts (buildStamp). Shown on the title screen and in Settings so a player always knows which build they
 * run. Bump package.json `version` (and add a CHANGELOG.md entry) for every deploy; tests/sim/version.test.ts checks
 * the two agree.
 */

declare const __APP_VERSION__: string | undefined;
declare const __BUILD_SHA__: string | undefined;
declare const __BUILD_TIME__: string | undefined;

const stamped = (v: string | undefined): string => (typeof v === 'string' ? v : '');

/** Semver from package.json, e.g. "0.3.1" ('dev' when the bundle was not stamped, as in tests). */
export const APP_VERSION: string = stamped(typeof __APP_VERSION__ === 'undefined' ? undefined : __APP_VERSION__) || 'dev';
/** Short commit the build came from; 'dev' under the dev server. */
export const BUILD_SHA: string = stamped(typeof __BUILD_SHA__ === 'undefined' ? undefined : __BUILD_SHA__) || 'dev';
/** ISO time of the production build; '' under the dev server. */
export const BUILD_TIME: string = stamped(typeof __BUILD_TIME__ === 'undefined' ? undefined : __BUILD_TIME__);

/** "v0.3.1" (or "dev"). */
export function versionLabel(version: string = APP_VERSION): string {
  return /^\d/.test(version) ? `v${version}` : version;
}

/** "Build 9b58e9c · Oct 1, 2026", or "Development build" under the dev server. */
export function buildDetail(sha: string = BUILD_SHA, time: string = BUILD_TIME): string {
  if (sha === 'dev' || !time) return 'Development build';
  const d = new Date(time);
  const date = Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  return date ? `Build ${sha} · ${date}` : `Build ${sha}`;
}
