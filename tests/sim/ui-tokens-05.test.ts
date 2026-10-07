/**
 * lane:ui-shell (chunk 1; DES-001; 0.5 spec §3 item 6, §17) — design-token fidelity for 0.5 CSS: every colour literal
 * in a CSS file added for 0.5 is either a tokens.css variable or a value the design itself gives (§17's table, §5.2's
 * tab bar), tokens.css keeps §17's values, and the tab labels are 10.5/620. CSS added by later chunks (social.css,
 * notify.css, offer-genes.css) is scanned as soon as it exists.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const CSS_05 = ['src/ui/styles/nav.css', 'src/ui/styles/social.css', 'src/ui/styles/notify.css', 'src/ui/panels/market/offer-genes.css'];

/** Colour literals the design gives outright (normalised: lower case, no spaces, no leading zero on alphas). */
const DESIGN_LITERALS = new Set(
  [
    // §17 colour table
    '#03090d', '#eaf5f7', '#b9ccd1', '#8199a0', '#5d7379', 'rgba(200,235,245,.11)', 'rgba(200,235,245,.20)', 'rgba(9,22,30,.68)', 'rgba(7,17,24,.84)',
    'rgba(255,255,255,.045)', 'rgba(255,255,255,.075)', '#5eead4', '#2dd4bf', '#04201d', '#ff8a65', '#f5c451', '#b69cff', '#7cc4ff', '#4ade80', '#fbbf24', '#f87171',
    'rgba(12,30,40,.86)', 'rgba(7,18,26,.9)', 'rgba(5,13,19,.93)', '#ffd1ef', '#fff0b3', '#c6ffe6', '#cfe4ff', '#e6d4ff', '#2a1640', 'rgba(5,13,19,.96)',
    'rgba(42,52,58,.62)', 'rgba(40,44,48,.92)',
    // the transparent start of a fade into §17's sheet background (rgba(5,13,19,.93))
    'rgba(5,13,19,0)',
    // §5.2 phone tab bar: glass shadow, active text and icon, active gradient and ring
    'rgba(0,0,0,.35)', '#f0fffc', 'rgba(94,234,212,.2)', 'rgba(45,212,191,.08)', 'rgba(94,234,212,.38)',
  ].map((v) => norm(v)),
);

function norm(v: string): string {
  return v.toLowerCase().replace(/\s+/g, '').replace(/([,(])0\./g, '$1.').replace(/\.(\d*?)0+\)/g, (_m, d: string) => (d ? `.${d})` : ')'));
}

/** Colour literals in CSS text, comments stripped. */
function colourLiterals(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...code.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)].map((m) => m[0]);
}

describe('0.5 CSS uses tokens or the design’s own values (DES-001)', () => {
  const files = CSS_05.filter((f) => existsSync(join(ROOT, f)));

  it('nav.css exists and is scanned', () => {
    expect(files).toContain('src/ui/styles/nav.css');
  });

  it.each(CSS_05.filter((f) => existsSync(join(ROOT, f))))('%s has no colour literal outside tokens.css and the design', (file) => {
    const strays = colourLiterals(readFileSync(join(ROOT, file), 'utf8')).filter((c) => !DESIGN_LITERALS.has(norm(c)));
    expect(strays, `${file}: use a tokens.css variable (or a value §17 / the owning section gives): ${strays.join(', ')}`).toEqual([]);
  });

  it('the scanner sees a stray colour (it can fail)', () => {
    expect(colourLiterals('.x { color: #123456; background: rgba(1, 2, 3, 0.5); } /* #ffffff */').filter((c) => !DESIGN_LITERALS.has(norm(c)))).toEqual(['#123456', 'rgba(1, 2, 3, 0.5)']);
    expect(DESIGN_LITERALS.has(norm('rgba(94, 234, 212, 0.38)'))).toBe(true);
  });
});

describe('tokens.css keeps §17’s values (DES-001 A2)', () => {
  const tokens = readFileSync(join(ROOT, 'src/ui/styles/tokens.css'), 'utf8');
  it.each([
    ['--c-bg', '#03090d'],
    ['--c-ink', '#eaf5f7'],
    ['--c-ink-2', '#b9ccd1'],
    ['--c-ink-3', '#8199a0'],
    ['--c-ink-4', '#5d7379'],
    ['--c-line', 'rgba(200, 235, 245, 0.11)'],
    ['--c-line-strong', 'rgba(200, 235, 245, 0.2)'],
    ['--c-glass', 'rgba(9, 22, 30, 0.68)'],
    ['--c-glass-strong', 'rgba(7, 17, 24, 0.84)'],
    ['--c-fill', 'rgba(255, 255, 255, 0.045)'],
    ['--c-fill-2', 'rgba(255, 255, 255, 0.075)'],
    ['--c-aqua', '#5eead4'],
    ['--c-aqua-2', '#2dd4bf'],
    ['--c-aqua-ink', '#04201d'],
    ['--c-coral', '#ff8a65'],
    ['--c-gold', '#f5c451'],
    ['--c-violet', '#b69cff'],
    ['--c-blue', '#7cc4ff'],
    ['--c-good', '#4ade80'],
    ['--c-watch', '#fbbf24'],
    ['--c-danger', '#f87171'],
  ])('%s: %s', (name, value) => {
    expect(tokens).toContain(`${name}: ${value};`);
  });
});

describe('type: the tab bar’s labels are 10.5/620 (DES-001 A3, §17)', () => {
  it('nav.css sets them', () => {
    const css = readFileSync(join(ROOT, 'src/ui/styles/nav.css'), 'utf8');
    const rule = /\.ag-tabbar__label \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('font-size: calc(10.5px * var(--text-scale))');
    expect(rule).toContain('font-weight: 620');
  });
});
