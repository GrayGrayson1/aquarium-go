/**
 * Procedural buyer avatar (SVG) from a seed — soft abstract portrait, no faces copied from anywhere.
 * OWNER: lane "ui-panels".
 */
import { memo, useId } from 'react';
import type { BuyerArchetype } from '@/types';

function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIN = ['#f3d2bd', '#e7b99a', '#d49a74', '#b87a55', '#8d5a3b', '#6a412a', '#f0c8a8'];
const HAIR = ['#1f1a17', '#3b2a20', '#6b4a2e', '#a7743f', '#d8b36a', '#8f8f94', '#c9502e', '#2a2f45'];
const ARCH_HUE: Record<BuyerArchetype, number> = {
  beginner: 160,
  experienced_keeper: 190,
  breeder: 280,
  collector: 42,
  aquascaper: 120,
  family: 20,
  public_aquarium: 210,
  conservation: 140,
  bargain_hunter: 0,
};

export const BuyerAvatar = memo(function BuyerAvatar({ seed, archetype, size = 40, name }: { seed: number; archetype?: BuyerArchetype; size?: number; name?: string }) {
  const uid = useId().replace(/:/g, '');
  const r = rng(seed);
  const hue = (archetype ? ARCH_HUE[archetype] : 0) + Math.floor(r() * 40) - 20;
  const skin = SKIN[Math.floor(r() * SKIN.length)];
  const hair = HAIR[Math.floor(r() * HAIR.length)];
  const hairStyle = Math.floor(r() * 4);
  const shirt = `hsl(${(hue + 180 + Math.floor(r() * 60)) % 360} 45% 48%)`;
  const glasses = r() < 0.28;
  const bg1 = `hsl(${hue} 55% 38%)`;
  const bg2 = `hsl(${(hue + 40) % 360} 60% 20%)`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="pn-avatar" role="img" aria-label={name ? `${name}’s avatar` : 'Buyer avatar'}>
      <defs>
        <linearGradient id={`ab${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
        <clipPath id={`ac${uid}`}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#ac${uid})`}>
        <rect width="40" height="40" fill={`url(#ab${uid})`} />
        <path d="M6 42 C 7 31, 13 27, 20 27 C 27 27, 33 31, 34 42 Z" fill={shirt} />
        <rect x="17.4" y="22" width="5.2" height="6" rx="2" fill={skin} />
        <ellipse cx="20" cy="17.5" rx="7" ry="8" fill={skin} />
        {hairStyle === 0 && <path d="M12.6 16 C 12.6 9, 27.4 9, 27.4 16 C 26 12.6, 14 12.6, 12.6 16 Z" fill={hair} />}
        {hairStyle === 1 && <path d="M12.4 18 C 11 8, 29 8, 27.6 18 C 27 14, 24 12, 20 12 C 16 12, 13 14, 12.4 18 Z M 12.4 18 L 12 26 L 14 26 Z M 27.6 18 L 28 26 L 26 26 Z" fill={hair} />}
        {hairStyle === 2 && <path d="M12.8 15 C 13 9.4, 18 8.6, 21 9.2 C 25 9.6, 28 12, 27.2 16 C 24 13, 18 14, 12.8 15 Z" fill={hair} />}
        {hairStyle === 3 && <circle cx="20" cy="9.5" r="3.4" fill={hair} />}
        {hairStyle === 3 && <path d="M12.8 16 C 13 11, 27 11, 27.2 16 C 24 13.6, 16 13.6, 12.8 16 Z" fill={hair} />}
        <circle cx="17.2" cy="18" r="0.9" fill="#1b1b1b" />
        <circle cx="22.8" cy="18" r="0.9" fill="#1b1b1b" />
        <path d="M17.8 21.6 C 19 22.6, 21 22.6, 22.2 21.6" stroke="#6b3a2a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        {glasses && (
          <g stroke="#1b1b1b" strokeWidth="0.7" fill="rgba(255,255,255,0.12)">
            <circle cx="17.2" cy="18" r="2.2" />
            <circle cx="22.8" cy="18" r="2.2" />
            <path d="M19.4 18 L 20.6 18" />
          </g>
        )}
      </g>
      <circle cx="20" cy="20" r="19.5" fill="none" stroke="rgba(255,255,255,0.18)" />
    </svg>
  );
});
