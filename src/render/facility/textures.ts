/**
 * Procedural canvas textures for facility rooms (floors, walls, rugs, fabrics, signs, paintings).
 * All original, generated at runtime from seeds — no image assets. OWNER: lane "facility".
 * Textures are cached by key and ref-counted; call `releaseTexture` (or use `useRoomTextures`) to dispose.
 */
import * as THREE from 'three';
import { visualRng } from '@/sim/rng';

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function shade(hex: string, k: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgba(${f(r)},${f(g)},${f(b)},${alpha})`;
}

/** Cheap value-noise speckle over the whole canvas. */
function speckle(ctx: Ctx, w: number, h: number, seed: string, count: number, alpha: number, size: [number, number], light = true): void {
  const rng = visualRng(seed);
  for (let i = 0; i < count; i++) {
    const s = size[0] + rng.next() * (size[1] - size[0]);
    const l = light ? rng.next() > 0.5 : false;
    ctx.fillStyle = l ? `rgba(255,255,255,${alpha * rng.next()})` : `rgba(0,0,0,${alpha * rng.next()})`;
    ctx.fillRect(rng.next() * w, rng.next() * h, s, s);
  }
}

/** Soft cloudy blotches (plaster, concrete, stone). */
function blotches(ctx: Ctx, w: number, h: number, seed: string, count: number, alpha: number, radius: [number, number], color = '0,0,0'): void {
  const rng = visualRng(seed);
  for (let i = 0; i < count; i++) {
    const x = rng.next() * w;
    const y = rng.next() * h;
    const r = radius[0] + rng.next() * (radius[1] - radius[0]);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = alpha * (0.3 + rng.next() * 0.7);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    // wrap so the texture tiles
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      if (x + ox + r < 0 || x + ox - r > w || y + oy + r < 0 || y + oy - r > h) continue;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
  }
}

function finish(c: HTMLCanvasElement, repeat = true, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// ───────────────────────────── generators ─────────────────────────────

export interface PlankOpts {
  base: string;
  seed: string;
  /** Planks across the texture. */
  planks?: number;
  /** Joints per plank column (staggered). */
  rows?: number;
  variation?: number;
  herringbone?: boolean;
}

/** Wooden floor planks with grain, staggered joints and per-plank tone. Texture covers ~2 m. */
export function woodPlanks(o: PlankOpts): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const rng = visualRng(o.seed);
  const n = o.planks ?? 8;
  const pw = S / n;
  ctx.fillStyle = o.base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) {
    const rows = o.rows ?? 2;
    const off = rng.next() * S;
    for (let r = 0; r < rows + 1; r++) {
      const y0 = ((r * S) / rows + off) % S - S / rows;
      const len = S / rows;
      const tone = (rng.next() - 0.5) * (o.variation ?? 0.22);
      const x = i * pw;
      ctx.fillStyle = shade(o.base, tone);
      ctx.fillRect(x, y0, pw, len);
      ctx.fillRect(x, y0 + S, pw, len);
      // grain
      const lines = 26;
      for (let k = 0; k < lines; k++) {
        const gx = x + rng.next() * pw;
        const amp = 1 + rng.next() * 3;
        const freq = 0.004 + rng.next() * 0.01;
        const ph = rng.next() * 6.28;
        ctx.strokeStyle = rng.next() > 0.5 ? `rgba(0,0,0,${0.05 + rng.next() * 0.08})` : `rgba(255,240,220,${0.03 + rng.next() * 0.05})`;
        ctx.lineWidth = 0.6 + rng.next() * 1.6;
        ctx.beginPath();
        for (let yy = 0; yy <= len; yy += 8) {
          const px = gx + Math.sin((y0 + yy) * freq + ph) * amp;
          if (yy === 0) ctx.moveTo(px, y0 + yy);
          else ctx.lineTo(px, y0 + yy);
        }
        ctx.stroke();
      }
      // occasional knot
      if (rng.next() < 0.25) {
        const kx = x + pw * (0.3 + rng.next() * 0.4);
        const ky = y0 + len * rng.next();
        const g = ctx.createRadialGradient(kx, ky, 0, kx, ky, 10 + rng.next() * 8);
        g.addColorStop(0, 'rgba(40,20,5,0.45)');
        g.addColorStop(1, 'rgba(40,20,5,0)');
        ctx.fillStyle = g;
        ctx.fillRect(kx - 20, ky - 20, 40, 40);
      }
      // end joint
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y0, pw, 2);
      ctx.fillRect(x, y0 + S, pw, 2);
    }
    // long seam
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(x0(i, pw), 0, 2, S);
  }
  speckle(ctx, S, S, o.seed + 's', 5000, 0.05, [1, 2]);
  return c;
}
const x0 = (i: number, pw: number) => Math.round(i * pw);

/** Smooth mottled plaster / paint. */
export function plaster(base: string, seed: string, strength = 1): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  blotches(ctx, S, S, seed, 60, 0.05 * strength, [30, 120]);
  blotches(ctx, S, S, seed + 'l', 50, 0.04 * strength, [20, 90], '255,255,255');
  speckle(ctx, S, S, seed + 's', 9000, 0.05 * strength, [1, 1.5]);
  return c;
}

/** Polished concrete / terrazzo floor. */
export function concrete(base: string, seed: string, terrazzo = false): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  blotches(ctx, S, S, seed, 90, terrazzo ? 0.025 : 0.06, [40, 200]);
  blotches(ctx, S, S, seed + 'b', 60, terrazzo ? 0.03 : 0.05, [30, 160], '255,255,255');
  if (terrazzo) {
    const rng = visualRng(seed + 't');
    const chips = ['#efe9df', '#b3b9b4', '#c9a58c', '#8b9290', '#ddd0b6', '#a4ada8'];
    for (let i = 0; i < 5200; i++) {
      const x = rng.next() * S;
      const y = rng.next() * S;
      const r = 1 + Math.pow(rng.next(), 4) * 5;
      ctx.fillStyle = chips[Math.floor(rng.next() * chips.length)];
      ctx.globalAlpha = 0.35 + rng.next() * 0.35;
      ctx.beginPath();
      const sides = 5 + Math.floor(rng.next() * 3);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2 + rng.next() * 0.6;
        const rr = r * (0.6 + rng.next() * 0.5);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  speckle(ctx, S, S, seed + 's', 16000, 0.06, [1, 2]);
  return c;
}

/** Large-format stone tiles with fine veining and grout (dark galleries / grand hall). */
export function stoneTiles(base: string, seed: string, opts: { tiles?: number; vein?: string; grout?: string; inlay?: string } = {}): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const n = opts.tiles ?? 2;
  const ts = S / n;
  const rng = visualRng(seed);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = shade(base, (rng.next() - 0.5) * 0.12);
      ctx.fillRect(i * ts, j * ts, ts, ts);
      ctx.save();
      ctx.beginPath();
      ctx.rect(i * ts, j * ts, ts, ts);
      ctx.clip();
      blotches(ctx, S, S, `${seed}${i}${j}`, 14, 0.12, [40, 160]);
      // veins
      for (let v = 0; v < 5; v++) {
        let x = i * ts + rng.next() * ts;
        let y = j * ts + rng.next() * ts;
        ctx.strokeStyle = opts.vein ?? 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.6 + rng.next() * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const dir = rng.next() * Math.PI * 2;
        for (let k = 0; k < 40; k++) {
          x += Math.cos(dir + Math.sin(k * 0.4 + v) * 0.9) * 9;
          y += Math.sin(dir + Math.sin(k * 0.4 + v) * 0.9) * 9;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.fillStyle = opts.grout ?? 'rgba(0,0,0,0.55)';
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * ts - 1.5, 0, 3, S);
    ctx.fillRect(0, i * ts - 1.5, S, 3);
  }
  if (opts.inlay) {
    // thin brass-like inlay diamond at tile corners
    ctx.fillStyle = opts.inlay;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      ctx.save();
      ctx.translate(i * ts, j * ts);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    }
  }
  speckle(ctx, S, S, seed + 's', 9000, 0.05, [1, 2]);
  return c;
}

/** Ceramic tile with grout (shop floors / splashbacks). */
export function tiles(base: string, seed: string, n = 4, grout = 'rgba(40,40,40,0.35)'): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const ts = S / n;
  const rng = visualRng(seed);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ctx.fillStyle = shade(base, (rng.next() - 0.5) * 0.06);
    ctx.fillRect(i * ts, j * ts, ts, ts);
  }
  blotches(ctx, S, S, seed, 40, 0.035, [60, 200]);
  ctx.fillStyle = grout;
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * ts - 2, 0, 4, S);
    ctx.fillRect(0, i * ts - 2, S, 4);
  }
  speckle(ctx, S, S, seed + 's', 6000, 0.04, [1, 2]);
  return c;
}

/** Vertical wooden slats (feature walls, counters). */
export function woodSlats(base: string, seed: string, slats = 16, gap = 'rgba(10,6,3,0.85)'): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const rng = visualRng(seed);
  const w = S / slats;
  for (let i = 0; i < slats; i++) {
    ctx.fillStyle = shade(base, (rng.next() - 0.5) * 0.2);
    ctx.fillRect(i * w, 0, w, S);
    for (let k = 0; k < 8; k++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.05 + rng.next() * 0.08})`;
      ctx.lineWidth = 0.8;
      const gx = i * w + rng.next() * w;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + 2, S * 0.3, gx - 2, S * 0.6, gx + 1, S);
      ctx.stroke();
    }
    ctx.fillStyle = gap;
    ctx.fillRect(i * w + w - 3, 0, 3, S);
    // soft shading on slat edges for depth
    const g = ctx.createLinearGradient(i * w, 0, i * w + w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(i * w, 0, w, S);
  }
  return c;
}

/** Woven fabric (upholstery, curtains). */
export function fabric(base: string, seed: string, weave = 2): HTMLCanvasElement {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += weave * 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, S, weave);
  }
  for (let x = 0; x < S; x += weave * 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(x, 0, weave, S);
  }
  speckle(ctx, S, S, seed, 4000, 0.07, [1, 2]);
  return c;
}

/** Wool rug with border bands and a geometric field (tileable = false; maps once). */
export function rug(seed: string, palette: { field: string; border: string; accent: string; ink: string }): HTMLCanvasElement {
  const W = 1024;
  const H = 720;
  const [c, ctx] = canvas(W, H);
  const rng = visualRng(seed);
  ctx.fillStyle = palette.border;
  ctx.fillRect(0, 0, W, H);
  const band = (inset: number, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  };
  ctx.fillStyle = palette.field;
  ctx.fillRect(70, 70, W - 140, H - 140);
  band(30, palette.accent, 6);
  band(58, palette.ink, 3);
  band(78, palette.accent, 2);
  // border motif: small diamonds
  ctx.fillStyle = palette.accent;
  for (let x = 50; x < W - 40; x += 34) for (const y of [44, H - 44]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  for (let y = 70; y < H - 60; y += 34) for (const x of [44, W - 44]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  // central medallion: nested lozenges
  const cx = W / 2;
  const cy = H / 2;
  const cols = [palette.ink, palette.accent, palette.border, palette.accent];
  for (let k = 0; k < 4; k++) {
    const s = 190 - k * 40;
    ctx.fillStyle = cols[k];
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.5, cy);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.5, cy);
    ctx.lineTo(cx, cy + s);
    ctx.closePath();
    ctx.fill();
  }
  // corner quarter-medallions
  for (const [x, y] of [
    [110, 110],
    [W - 110, 110],
    [110, H - 110],
    [W - 110, H - 110],
  ]) {
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  // wool: fibre noise + abrash (tonal bands)
  for (let y = 0; y < H; y += 6) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rng.next() * 0.04})`;
    ctx.fillRect(0, y, W, 3);
  }
  speckle(ctx, W, H, seed + 'w', 26000, 0.12, [1, 2.5]);
  return c;
}

/** Abstract watercolour seascape for picture frames. */
export function painting(seed: string, mood: 'sea' | 'reef' | 'dusk' = 'sea'): HTMLCanvasElement {
  const W = 384;
  const H = 288;
  const [c, ctx] = canvas(W, H);
  const rng = visualRng(seed);
  const pal =
    mood === 'reef'
      ? ['#0e3d52', '#1d6f7a', '#e79a6b', '#f2d6a2', '#ffffff']
      : mood === 'dusk'
        ? ['#2b2346', '#6a4a6e', '#d98b6a', '#f3cf9a', '#fff6e8']
        : ['#16364a', '#2f6d7a', '#9cc3bd', '#e9e1cc', '#fbf7ee'];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal[4]);
  g.addColorStop(0.45, pal[3]);
  g.addColorStop(1, pal[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const y = H * (0.45 + rng.next() * 0.55);
    ctx.fillStyle = pal[Math.floor(rng.next() * 3)];
    ctx.globalAlpha = 0.18 + rng.next() * 0.25;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 10 + rng.next() * 6);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
  }
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = pal[0];
  // a single fish silhouette
  const fx = W * (0.3 + rng.next() * 0.4);
  const fy = H * 0.72;
  ctx.beginPath();
  ctx.ellipse(fx, fy, 26, 10, 0, 0, Math.PI * 2);
  ctx.moveTo(fx - 22, fy);
  ctx.lineTo(fx - 40, fy - 12);
  ctx.lineTo(fx - 40, fy + 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  speckle(ctx, W, H, seed + 'p', 3000, 0.08, [1, 2]);
  return c;
}

/** Soft radial light pool (additive decal). */
export function radialGlow(): HTMLCanvasElement {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

/** Vertical wall wash (bright at the bottom, fading up) for uplights. */
export function wallWash(): HTMLCanvasElement {
  const W = 128;
  const H = 256;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, H);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return c;
}

/** Four-point star sprite for visitor "wow" sparkles. */
export function starSprite(): HTMLCanvasElement {
  const S = 64;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,245,210,0.8)');
  g.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  const r1 = S / 2;
  const r2 = S * 0.09;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const r = k % 2 === 0 ? r1 : r2;
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  return c;
}

/** Shop sign / plaque text. */
export function signCanvas(text: string, opts: { w?: number; h?: number; fg?: string; bg?: string | null; font?: string; weight?: number; sub?: string; glow?: string } = {}): HTMLCanvasElement {
  const W = opts.w ?? 1024;
  const H = opts.h ?? 256;
  const [c, ctx] = canvas(W, H);
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, W, H);
  } else ctx.clearRect(0, 0, W, H);
  const family = opts.font ?? '"Fraunces Variable", "Fraunces", Georgia, serif';
  let size = H * (opts.sub ? 0.46 : 0.58);
  ctx.font = `${opts.weight ?? 560} ${size}px ${family}`;
  while (ctx.measureText(text).width > W * 0.9 && size > 12) {
    size *= 0.92;
    ctx.font = `${opts.weight ?? 560} ${size}px ${family}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = H * 0.12;
  }
  ctx.fillStyle = opts.fg ?? '#f5efe4';
  ctx.fillText(text, W / 2, opts.sub ? H * 0.42 : H / 2);
  if (opts.sub) {
    ctx.shadowBlur = 0;
    ctx.font = `500 ${H * 0.14}px "Inter Variable", Inter, system-ui, sans-serif`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(opts.sub.toUpperCase().split('').join(' '), W / 2, H * 0.8);
    ctx.globalAlpha = 1;
  }
  return c;
}

// ───────────────────────────── cache ─────────────────────────────

const cache = new Map<string, { tex: THREE.CanvasTexture; refs: number }>();

/** Get (or build) a cached texture. Pair every call with `releaseTexture(key)`. */
export function acquireTexture(key: string, build: () => HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean } = {}): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) {
    hit.refs++;
    return hit.tex;
  }
  const tex = finish(build(), opts.repeat ?? true, opts.srgb ?? true);
  cache.set(key, { tex, refs: 1 });
  return tex;
}

export function releaseTexture(key: string): void {
  const hit = cache.get(key);
  if (!hit) return;
  hit.refs--;
  if (hit.refs <= 0) {
    hit.tex.dispose();
    cache.delete(key);
  }
}

/** Build a one-off texture (caller disposes). */
export function makeTexture(c: HTMLCanvasElement, repeat = true, srgb = true): THREE.CanvasTexture {
  return finish(c, repeat, srgb);
}

/** Floor medallion (compass rose in brass and stone) for grand spaces. Transparent outside the disc. */
export function medallion(stone: string, brass: string): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const cx = S / 2;
  const cy = S / 2;
  const ring = (r: number, w: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S / 2);
  g.addColorStop(0, shade(stone, 0.12));
  g.addColorStop(0.92, shade(stone, -0.05));
  g.addColorStop(1, shade(stone, -0.15));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, S / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ring(S / 2 - 12, 10, brass);
  ring(S / 2 - 40, 3, brass);
  ring(S * 0.3, 4, brass);
  ring(S * 0.12, 3, brass);
  // 16-point star
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const long = k % 2 === 0;
    const r1 = long ? S * 0.44 : S * 0.3;
    const w = long ? 0.07 : 0.1;
    ctx.fillStyle = k % 4 === 0 ? brass : long ? shade(stone, 0.35) : shade(stone, -0.25);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a + w) * S * 0.1, cy + Math.sin(a + w) * S * 0.1);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - w) * S * 0.1, cy + Math.sin(a - w) * S * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  // wave band between the rings
  ctx.strokeStyle = shade(brass, -0.2, 0.8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const r = S * 0.4 + Math.sin(a * 24) * 10;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  speckle(ctx, S, S, 'medallion', 6000, 0.05, [1, 2]);
  return c;
}
