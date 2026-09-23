/**
 * Engraved brass exhibit plaque for plinth stands (500+ gallon displays). The tank's name is engraved and paint-filled
 * like a museum label, with a small species line underneath when there is room; it redraws when the tank is renamed
 * or its residents change. One canvas texture per plaque, disposed on change/unmount. OWNER: lane "qa-visual".
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useGame } from '@/state/game';
import { findSpecies } from '@/data/species';

const noPick = () => null;
const NP = { noPick: true };

const DISPLAY_FONT = '"Fraunces Display", "Fraunces Variable", "Fraunces", Georgia, serif';
const UI_FONT = '"Inter Variable", Inter, system-ui, sans-serif';

/** Deterministic hash → small LCG so the brushed grain is stable per plaque (visual only, never touches the sim). */
function lcg(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let s = h >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fit `text` to `maxW` by shrinking the font; returns the size used. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, size: number, maxW: number, minSize: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > minSize) {
    s *= 0.94;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

/** Paint-filled engraving: a bright lower lip (the cut catches the light), a dark upper wall, then the paint fill. */
function engrave(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, depth: number, fill: string): void {
  ctx.fillStyle = 'rgba(255, 238, 196, 0.55)';
  ctx.fillText(text, x, y + depth);
  ctx.fillStyle = 'rgba(40, 24, 6, 0.55)';
  ctx.fillText(text, x, y - depth * 0.6);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function drawPlaque(title: string, sub: string, aspect: number, seed: string): HTMLCanvasElement {
  const W = 1024;
  const H = Math.max(160, Math.round(W / aspect));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  // satin brass: warm vertical sheen band + horizontal brushing
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#caa266');
  g.addColorStop(0.32, '#e3c68a');
  g.addColorStop(0.55, '#c49b5a');
  g.addColorStop(1, '#a98246');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(seed);
  for (let i = 0; i < 520; i++) {
    const y = rnd() * H;
    const x = rnd() * W * 0.8;
    const len = W * (0.15 + rnd() * 0.6);
    ctx.strokeStyle = rnd() > 0.5 ? `rgba(255,244,214,${0.05 + rnd() * 0.08})` : `rgba(70,44,12,${0.04 + rnd() * 0.07})`;
    ctx.lineWidth = 0.6 + rnd() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rnd() - 0.5) * 1.5);
    ctx.stroke();
  }
  // bevelled edge: light top/left, dark bottom/right
  const b = Math.round(H * 0.045);
  ctx.fillStyle = 'rgba(255,246,222,0.35)';
  ctx.fillRect(0, 0, W, b);
  ctx.fillRect(0, 0, b, H);
  ctx.fillStyle = 'rgba(60,36,8,0.4)';
  ctx.fillRect(0, H - b, W, b);
  ctx.fillRect(W - b, 0, b, H);
  // engraved inner border
  const inset = Math.round(H * 0.11);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,240,205,0.5)';
  ctx.strokeRect(inset + 1.5, inset + 1.5, W - inset * 2, H - inset * 2);
  ctx.strokeStyle = 'rgba(52,32,10,0.8)';
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  // corner screws
  const r = H * 0.035;
  for (const [sx, sy] of [[inset * 0.5, inset * 0.5], [W - inset * 0.5, inset * 0.5], [inset * 0.5, H - inset * 0.5], [W - inset * 0.5, H - inset * 0.5]]) {
    const sg = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r);
    sg.addColorStop(0, '#f4dfae');
    sg.addColorStop(0.7, '#9c7438');
    sg.addColorStop(1, '#5a3e16');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,24,6,0.8)';
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    ctx.moveTo(sx - r * 0.6, sy + r * 0.25);
    ctx.lineTo(sx + r * 0.6, sy - r * 0.25);
    ctx.stroke();
  }
  // text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const innerW = W - inset * 2 - H * 0.2;
  const paint = '#23180b';
  const name = title.trim() || 'Exhibit';
  if (sub) {
    const ts = fitFont(ctx, name, 600, DISPLAY_FONT, H * 0.4, innerW, H * 0.14);
    engrave(ctx, name, W / 2, H * 0.4, Math.max(1.5, ts * 0.045), paint);
    // small engraved rule with a centre dot
    const ry = H * 0.625;
    ctx.fillStyle = 'rgba(40,24,6,0.75)';
    ctx.fillRect(W / 2 - W * 0.11, ry - 1.5, W * 0.095, 3);
    ctx.fillRect(W / 2 + W * 0.015, ry - 1.5, W * 0.095, 3);
    ctx.beginPath();
    ctx.arc(W / 2, ry, 3.2, 0, Math.PI * 2);
    ctx.fill();
    const label = sub.toUpperCase();
    // letter-spaced small caps: set the tracking first so the fit measures the spaced width
    const spaced = 'letterSpacing' in ctx;
    if (spaced) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${Math.round(H * 0.115 * 0.14)}px`;
    const ss = fitFont(ctx, label, 600, UI_FONT, H * 0.115, innerW * 0.94, H * 0.05);
    engrave(ctx, label, W / 2, H * 0.775, Math.max(1, ss * 0.06), 'rgba(35,24,11,0.92)');
    if (spaced) (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  } else {
    const ts = fitFont(ctx, name, 600, DISPLAY_FONT, H * 0.42, innerW, H * 0.16);
    engrave(ctx, name, W / 2, H * 0.52, Math.max(1.5, ts * 0.045), paint);
  }
  return c;
}

/** "Yellow Tang · Ocellaris Clownfish & 12 more" — the tank's residents, most numerous first. */
function useSpeciesLine(tankId: string): string {
  const key = useGame((s) => {
    const g = s.game;
    if (!g) return '';
    const counts: Record<string, number> = {};
    for (const id in g.creatures) {
      const c = g.creatures[id];
      if (c.tankId !== tankId || (c.status !== 'alive' && c.status !== 'listed')) continue;
      counts[c.speciesId] = (counts[c.speciesId] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([sp]) => sp)
      .join(',');
  });
  return useMemo(() => {
    if (!key) return '';
    const ids = key.split(',');
    const names = ids.map((id) => findSpecies(id)?.commonName ?? '').filter(Boolean);
    if (!names.length) return '';
    const shown = names.slice(0, names.length > 3 ? 2 : 3);
    const more = names.length - shown.length;
    return shown.join(' · ') + (more > 0 ? ` & ${more} more` : '');
  }, [key]);
}

/** Bump when the display font finishes loading so the plaque redraws in Fraunces instead of the fallback serif. */
function useFontEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let alive = true;
    Promise.all([document.fonts.load(`600 64px "Fraunces Display"`), document.fonts.load(`600 64px "Fraunces Variable"`), document.fonts.load(`600 24px "Inter Variable"`)])
      .catch(() => undefined)
      .then(() => {
        if (alive) setEpoch(1);
      });
    return () => {
      alive = false;
    };
  }, []);
  return epoch;
}

export function Plaque({ tankId, title, position, size }: { tankId: string; title: string; position: [number, number, number]; size: [number, number] }) {
  const [w, h] = size;
  const sub = useSpeciesLine(tankId);
  const epoch = useFontEpoch();
  const frame = useMemo(() => new RoundedBoxGeometry(w + 0.014, h + 0.014, 0.008, 2, 0.0025), [w, h]);
  const face = useMemo(() => new THREE.PlaneGeometry(w, h), [w, h]);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(drawPlaque(title, h / w > 0.2 ? sub : '', w / h, tankId));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // epoch: redraw once the web fonts are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, sub, w, h, tankId, epoch]);
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.5, envMapIntensity: 1.5 }), [tex]);
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a22', roughness: 0.35, metalness: 0.8, envMapIntensity: 1.3 }), []);
  useEffect(() => () => frame.dispose(), [frame]);
  useEffect(() => () => face.dispose(), [face]);
  useEffect(
    () => () => {
      tex.dispose();
      faceMat.dispose();
    },
    [tex, faceMat],
  );
  useEffect(() => () => frameMat.dispose(), [frameMat]);
  return (
    <group position={position}>
      <mesh geometry={frame} material={frameMat} raycast={noPick} userData={NP} />
      <mesh geometry={face} material={faceMat} position={[0, 0, 0.0042]} raycast={noPick} userData={NP} />
    </group>
  );
}
