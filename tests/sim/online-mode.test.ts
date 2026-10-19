// @vitest-environment node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §5.3; REL-025) — which Social service runs: `socialModeFor` for every
 * combination of the dev-tools gate, the two build flags and a configured project; neither flag set in deploy.yml or
 * render.yaml (as plat-dev-tools.test does for VITE_E2E_DEV_URL); Playwright's E2E_ENV setting VITE_SOCIAL_STUB, so no
 * e2e test reaches the live project; and, with a project configured, Social showing in the players' build on the
 * Supabase service, whose library loads only on first use (a dynamic import, its own chunk).
 */
import { describe, it, expect, vi, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { socialModeFor, socialAvailable, socialMode, startSocialService } from '@/ui/online/mode';
import { useDevTools } from '@/state/devTools';
import { localStub, provideSocialService, socialService } from '@/social';
import { parseNav } from '@/ui/nav/router';

vi.mock('@/social/project', () => ({ ONLINE_PROJECT: { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' } }));

const ROOT = join(__dirname, '..', '..');
const src = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const P = { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' };

describe('socialModeFor (§5.3)', () => {
  it.each([
    // devAllowed, VITE_SOCIAL_STUB, VITE_SOCIAL_ONLINE_IN_DEV, project → mode
    [true, undefined, undefined, null, 'stub'],
    [true, undefined, undefined, P, 'stub'],
    [true, '1', undefined, P, 'stub'],
    [true, undefined, '1', null, 'stub'],
    [true, undefined, '1', P, 'online'],
    [true, '1', '1', P, 'online'],
    [false, undefined, undefined, null, 'off'],
    [false, undefined, undefined, P, 'online'],
    [false, '1', undefined, null, 'stub'],
    [false, '1', undefined, P, 'stub'],
    [false, undefined, '1', P, 'online'], // the dev-only flag means nothing without the dev tools
    [false, undefined, '1', null, 'off'],
    [false, '0', undefined, P, 'online'],
  ] as const)('dev tools %s, VITE_SOCIAL_STUB %s, VITE_SOCIAL_ONLINE_IN_DEV %s, project %s → %s', (dev, stub, inDev, project, mode) => {
    expect(socialModeFor(dev, { VITE_SOCIAL_STUB: stub, VITE_SOCIAL_ONLINE_IN_DEV: inDev }, project)).toBe(mode);
  });
});

describe('the build flags (REL-025 A3)', () => {
  it('deploy.yml and render.yaml set neither VITE_SOCIAL_STUB nor VITE_SOCIAL_ONLINE_IN_DEV', () => {
    for (const f of ['.github/workflows/deploy.yml', 'render.yaml']) {
      expect(src(f), f).not.toContain('VITE_SOCIAL_STUB');
      expect(src(f), f).not.toContain('VITE_SOCIAL_ONLINE_IN_DEV');
    }
  });

  it('Playwright’s E2E_ENV sets VITE_SOCIAL_STUB, so every e2e build (dev and both production ones) uses the stub', () => {
    const pw = src('playwright.config.ts');
    expect(pw).toMatch(/const E2E_ENV = \{[^}]*VITE_SOCIAL_STUB: '1'[^}]*\};/);
    expect(pw).toMatch(/const E2E_DEV_URL_ENV = \{ \.\.\.E2E_ENV,/);
    // every web server takes one of the two
    expect([...pw.matchAll(/env: (E2E_ENV|E2E_DEV_URL_ENV),/g)]).toHaveLength(3);
    expect(pw).not.toContain('VITE_SOCIAL_ONLINE_IN_DEV');
  });

  it('the library loads only on first use: one dynamic import, no static one anywhere in src', () => {
    const files = readdirSync(join(ROOT, 'src'), { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name));
    let dynamic = 0;
    for (const e of files) {
      const text = readFileSync(join(e.parentPath, e.name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // code, not comments
      expect(text, e.name).not.toMatch(/(?:^|\n)\s*import[^;(]*from\s+['"]@supabase\/supabase-js['"]/);
      dynamic += [...text.matchAll(/import\(\s*['"]@supabase\/supabase-js['"]\s*\)/g)].length;
    }
    expect(dynamic).toBe(1);
  });
});

describe('with a project configured (the players’ build)', () => {
  afterAll(() => {
    useDevTools.setState({ allowed: true });
    provideSocialService(null);
  });

  it('Social shows without the dev tools, on the Supabase service; with them, on the stub', () => {
    useDevTools.setState({ allowed: true });
    expect(socialMode()).toBe('stub');
    useDevTools.setState({ allowed: false });
    expect(socialMode()).toBe('online');
    expect(socialAvailable()).toBe(true);
    expect(parseNav('#/social/join/FRIENDS-4821')?.route).toMatchObject({ kind: 'panel', panel: 'social', target: 'join:FRIENDS-4821' });
    expect(parseNav('#/settings/account')?.route).toEqual({ kind: 'settings', tab: 'account' });
    startSocialService();
    expect(localStub()).toBeNull(); // not the stub
    expect(typeof socialService().cloudUpload).toBe('function');
  });
});
