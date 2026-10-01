/**
 * Versioning: package.json `version` is what players see (title screen, Settings › About, the reload prompt), and
 * every deploy bumps it with a CHANGELOG.md entry. These checks keep the two in step and pin the display helpers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APP_VERSION, BUILD_SHA, buildDetail, versionLabel } from '@/ui/common/version';
import { parseLiveVersion } from '@/ui/hud/updateCheck';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
const changelog = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
const entries = [...changelog.matchAll(/^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})$/gm)].map((m) => m[1]);
const cmp = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

describe('versioning', () => {
  it('package.json version is semver and is the newest CHANGELOG entry', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(entries[0]).toBe(pkg.version);
  });

  it('CHANGELOG versions are unique and newest first', () => {
    expect(new Set(entries).size).toBe(entries.length);
    for (let i = 1; i < entries.length; i++) expect(cmp(entries[i - 1], entries[i])).toBeGreaterThan(0);
  });

  it('labels: unstamped bundles (tests, dev) read as dev; stamped ones show version, commit and date', () => {
    expect(APP_VERSION).toBe('dev');
    expect(BUILD_SHA).toBe('dev');
    expect(versionLabel()).toBe('dev');
    expect(versionLabel('0.3.1')).toBe('v0.3.1');
    expect(buildDetail()).toBe('Development build');
    expect(buildDetail('9b58e9c', '2026-10-01T13:36:21.000Z')).toMatch(/^Build 9b58e9c · .*2026/);
    expect(buildDetail('9b58e9c', 'not a date')).toBe('Build 9b58e9c');
  });

  it('the reload prompt only trusts a well-formed live version', () => {
    expect(parseLiveVersion({ id: 'abc-1', version: '0.3.2' })).toBe('0.3.2');
    for (const bad of [null, {}, { version: 3 }, { version: '' }, { version: 'v0.3.2' }, { version: '<b>1.0.0</b>' }]) expect(parseLiveVersion(bad)).toBeNull();
  });
});
