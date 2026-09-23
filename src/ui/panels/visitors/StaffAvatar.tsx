/**
 * Procedural staff portrait (SVG) from a seed: a friendly face in the team uniform — teal polo with a collar and a
 * white name badge — on a role-tinted backdrop. Same drawing approach as the buyer avatars (common/Avatar.tsx);
 * original art, no faces copied from anywhere. OWNER: lane "staff".
 */
import { memo, useId } from 'react';
import type { StaffRole } from '@/types';

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

// Same palettes as the 3D staff figures / visitors so a person looks like themselves in both places.
const SKIN = ['#f3d6c1', '#eac4a6', '#dcae8a', '#c99470', '#b07a55', '#90603f', '#6f462d', '#553322'];
const HAIR = ['#1c1512', '#2e1f16', '#4a3020', '#6b4428', '#8f5a32', '#b3713a', '#d7ae6a', '#9b9894', '#a8432c'];
/** Backdrop hue per role: aquarists sea-green, stock manager amber, docents violet-blue. */
const ROLE_BG: Record<StaffRole, [string, string]> = {
  aquarist: ['#1f6f6a', '#0b2b2e'],
  stock_manager: ['#7a5a22', '#2b1f0b'],
  docent: ['#4b4f9a', '#1a1c3d'],
};
export const POLO = '#1f8f86';

export const StaffAvatar = memo(function StaffAvatar({ seed, role, size = 44, name }: { seed: number; role: StaffRole; size?: number; name?: string }) {
  const uid = useId().replace(/:/g, '');
  const r = rng(seed * 2654435761);
  const skin = SKIN[Math.floor(r() * SKIN.length) % SKIN.length];
  const hair = HAIR[Math.floor(r() * HAIR.length) % HAIR.length];
  const style = Math.floor(r() * 5) % 5;
  const glasses = r() < 0.22;
  const [bg1, bg2] = ROLE_BG[role] ?? ROLE_BG.aquarist;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="st-avatar" role="img" aria-label={name ? `${name}’s portrait` : 'Staff portrait'}>
      <defs>
        <linearGradient id={`sb${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
        <linearGradient id={`sp${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#27a79c" />
          <stop offset="1" stopColor={POLO} />
        </linearGradient>
        <clipPath id={`sc${uid}`}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#sc${uid})`}>
        <rect width="40" height="40" fill={`url(#sb${uid})`} />
        {/* long hair falls behind the shoulders */}
        {style === 1 && <path d="M12.2 17 C 11 26, 12 30, 14 31 L 26 31 C 28 30, 29 26, 27.8 17 Z" fill={hair} />}
        {/* polo: body, collar points, placket */}
        <path d="M5.5 42 C 6.5 31.5, 12.5 27.4, 20 27.4 C 27.5 27.4, 33.5 31.5, 34.5 42 Z" fill={`url(#sp${uid})`} />
        <rect x="17.4" y="22" width="5.2" height="6.2" rx="2" fill={skin} />
        <path d="M15.2 27.6 L 20 31.2 L 17.6 32.8 Z M24.8 27.6 L 20 31.2 L 22.4 32.8 Z" fill="#e9fbf8" opacity="0.92" />
        <path d="M20 31.2 L 20 36" stroke="#146d66" strokeWidth="0.8" />
        {/* name badge */}
        <rect x="23.2" y="32.4" width="6.2" height="3.6" rx="0.8" fill="#fbfdfc" />
        <rect x="23.2" y="32.4" width="6.2" height="1.1" rx="0.5" fill="#5eead4" />
        <ellipse cx="20" cy="17.5" rx="7" ry="8" fill={skin} />
        {style === 0 && <path d="M12.6 16 C 12.6 9, 27.4 9, 27.4 16 C 26 12.6, 14 12.6, 12.6 16 Z" fill={hair} />}
        {style === 1 && <path d="M12.4 18 C 11 8, 29 8, 27.6 18 C 27 13.5, 24 11.8, 20 11.8 C 16 11.8, 13 13.5, 12.4 18 Z" fill={hair} />}
        {style === 2 && <path d="M12.8 15 C 13 9.4, 18 8.6, 21 9.2 C 25 9.6, 28 12, 27.2 16 C 24 13, 18 14, 12.8 15 Z" fill={hair} />}
        {style === 3 && (
          <>
            <circle cx="20" cy="9.2" r="3.3" fill={hair} />
            <path d="M12.8 16 C 13 11, 27 11, 27.2 16 C 24 13.6, 16 13.6, 12.8 16 Z" fill={hair} />
          </>
        )}
        {style === 4 && <path d="M13 14.4 C 14 10.2, 26 10.2, 27 14.4 C 24.5 12.9, 15.5 12.9, 13 14.4 Z" fill={hair} opacity="0.85" />}
        <circle cx="17.2" cy="18" r="0.9" fill="#1b1b1b" />
        <circle cx="22.8" cy="18" r="0.9" fill="#1b1b1b" />
        <circle cx="17.5" cy="17.7" r="0.28" fill="#fff" />
        <circle cx="23.1" cy="17.7" r="0.28" fill="#fff" />
        <path d="M17.6 21.4 C 19 22.8, 21 22.8, 22.4 21.4" stroke="#6b3a2a" strokeWidth="0.85" fill="none" strokeLinecap="round" />
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
