/**
 * chunk 6 (ACC-005, B-178; ADR-0024 decision 4, ADR-0035 decision 1) — WCAG 2.2 AA through the High contrast setting
 * (W3C technique G174), computed from tokens.css: under High contrast every surface token is opaque and text reaches
 * 4.5:1 and controls 3:1 on it whatever is behind; in normal mode the same pairs pass over a dark room (the §17 glass
 * is see-through by design, so a sunlit room behind it is what High contrast is for). The colour maths is WCAG's
 * relative luminance; translucent colours are composited over the backdrop first.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const tokens = readFileSync(join(ROOT, 'src/ui/styles/tokens.css'), 'utf8');

type RGBA = [number, number, number, number];

/** The `--name: value;` pairs of a CSS block. */
function block(css: string, selector: string): Record<string, string> {
  const i = css.indexOf(`${selector} {`);
  if (i < 0) throw new Error(`no ${selector} block`);
  const body = css.slice(i, css.indexOf('\n}', i));
  const out: Record<string, string> = {};
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const base = block(tokens, ':root');
const high = { ...base, ...block(tokens, ":root[data-contrast='high']") };

function parse(v: string, vars: Record<string, string>): RGBA {
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref) return parse(vars[ref[1]], vars);
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) return [parseInt(hex[1].slice(0, 2), 16), parseInt(hex[1].slice(2, 4), 16), parseInt(hex[1].slice(4, 6), 16), 1];
  const rgba = /^rgba?\(([^)]+)\)$/.exec(v);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(',').map((x) => Number(x.trim()));
    return [r, g, b, a];
  }
  throw new Error(`can't read colour ${v}`);
}
const over = (top: RGBA, under: RGBA): RGBA => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => {
  const c = [r, g, b].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: RGBA, b: RGBA) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const BRIGHT_ROOM: RGBA = [0xe8, 0xdc, 0xc0, 1];
const DARK_ROOM: RGBA = [0x03, 0x09, 0x0d, 1];
const TEXT = ['--c-ink', '--c-ink-2', '--c-ink-3', '--c-aqua', '--c-coral', '--c-gold', '--c-good', '--c-watch', '--c-danger', '--c-blue'];
const SURFACES = ['--c-glass', '--c-glass-strong'];

describe('High contrast: solid surfaces, AA text and controls on any background', () => {
  it.each(['--c-glass', '--c-glass-strong', '--c-glass-soft', '--c-glass-hover'])('%s is opaque', (t) => {
    expect(parse(high[t], high)[3]).toBe(1);
  });

  it('blur is off and the panel sheet is a solid gradient', () => {
    expect(high['--blur']).toBe('none');
    expect(high['--blur-strong']).toBe('none');
    expect(high['--pn-sheet-bg']).toMatch(/^linear-gradient\(180deg(, #[0-9a-f]{6} \d+%){3}\)$/);
  });

  for (const room of [BRIGHT_ROOM, DARK_ROOM]) {
    const label = room === BRIGHT_ROOM ? 'a sunlit room' : 'a dark room';
    it(`text reaches 4.5:1 and field borders 3:1 on every surface, over ${label}`, () => {
      for (const s of SURFACES) {
        const bg = over(parse(high[s], high), room);
        for (const t of TEXT) expect(ratio(parse(high[t], high), bg), `${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(over(parse(high['--c-line-field'], high), bg), bg), `--c-line-field against ${s}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe('normal mode keeps §17’s glass and passes AA over a dark room', () => {
  it('text on the glass reaches 4.5:1', () => {
    for (const s of SURFACES) {
      const bg = over(parse(base[s], base), DARK_ROOM);
      for (const t of TEXT) expect(ratio(parse(base[t], base), bg), `${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('a hovered control’s label, and a text field’s border, still pass (4.5:1, 3:1)', () => {
    const hover = over(parse(base['--c-glass-hover'], base), DARK_ROOM);
    expect(ratio(parse(base['--c-ink'], base), hover)).toBeGreaterThanOrEqual(4.5);
    const glass = over(parse(base['--c-glass-strong'], base), DARK_ROOM);
    expect(ratio(over(parse(base['--c-line-field'], base), glass), glass)).toBeGreaterThanOrEqual(3);
  });

  it('the checks can fail (§17’s --c-ink-4 is not text-strength on the glass)', () => {
    const glass = over(parse(base['--c-glass-strong'], base), DARK_ROOM);
    expect(ratio(parse(base['--c-ink-4'], base), glass)).toBeLessThan(4.5);
  });
});

describe('styles that were measured and fixed stay fixed (ACC-005)', () => {
  const css = (f: string) => readFileSync(join(ROOT, f), 'utf8');
  it('no placeholder, toast close or temperament end label uses --c-ink-4 as text', () => {
    expect(css('src/ui/kit/kit.css')).toMatch(/\.ag-input::placeholder \{ color: var\(--c-ink-3\)/);
    expect(css('src/ui/styles/hud.css')).toMatch(/\.ag-toast__close \{[^}]*color: var\(--c-ink-3\)[^}]*opacity: 1;/);
    expect(css('src/ui/panels/market/offer-genes.css')).toMatch(/\.ag-temper__ends \{[^}]*color: var\(--c-ink-3\)/);
  });
  it('HUD pills ring their focus on their own glass, not the scene', () => {
    expect(css('src/ui/styles/hud.css')).toMatch(/button\.ag-hudpill:focus-visible \{ outline: 2px solid var\(--c-aqua\); outline-offset: -3px;/);
    expect(css('src/ui/styles/operations-hud.css')).toMatch(/\.ag-hud-gear:focus-visible[^{]*\{ outline: 2px solid var\(--c-aqua\); outline-offset: -3px;/);
  });
  it('a11y.css loads after every other stylesheet', () => {
    const root = css('src/ui/UIRoot.tsx');
    const imports = [...root.matchAll(/^import '\.\/styles\/([\w-]+\.css)'/gm)].map((m) => m[1]);
    expect(imports.at(-1)).toBe('a11y.css');
  });
  it('the panels’ stylesheets (they load later, with their lazy panels) never style the focus states a11y.css rings', () => {
    // a11y.css's other rules carry :root[data-contrast] or two classes, so they win on specificity whatever the order
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = (t: string) => [...strip(t).matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim());
    const ringed = new Set<string>();
    for (const sel of rules(css('src/ui/styles/a11y.css')))
      for (const part of sel.split(/,(?![^()]*\))/).map((x) => x.trim()))
        if (!part.startsWith(':root') && part.includes(':focus')) for (const m of part.matchAll(/\.([\w-]+)/g)) ringed.add(m[1]);
    expect(ringed.size).toBeGreaterThan(10);
    const sheets = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((e) => (statSync(join(ROOT, dir, e)).isDirectory() ? sheets(`${dir}/${e}`) : e.endsWith('.css') && e !== 'a11y.css' ? [`${dir}/${e}`] : []));
    const clashes = sheets('src').flatMap((f) =>
      rules(css(f))
        .filter((sel) => sel.includes(':focus') && [...ringed].some((k) => new RegExp(`\\.${k}(?![\\w-])`).test(sel)))
        .map((sel) => `${f}: ${sel.slice(0, 100)}`),
    );
    expect(clashes).toEqual([]);
  });
});
