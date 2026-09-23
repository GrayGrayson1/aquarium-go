/**
 * Show awards as small original SVG art — rosettes, cups, plaques and bowls — plus the tier badge and the ribbons
 * row on the creature card. OWNER: lane "shows".
 */
import { memo, useId } from 'react';
import { Award, Crown, Globe2, Lock, Medal, Trophy, Users } from 'lucide-react';
import type { Creature, CreatureRibbon, ShowTier, TrophyRecord } from '@/types';
import { SHOW_TIERS } from '@/data/shows';
import { topTitle, TITLE_LABEL } from '@/sim/shows/titles';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import './shows.css';

// ───────────────────────────── colours ─────────────────────────────

/** Rosette colours by place (1st blue, 2nd red, 3rd gold, HM green; Best in Show purple and gold). */
export const ROSETTE: Record<string, { a: string; b: string; tail: string; label: string }> = {
  '1': { a: '#3d6fd1', b: '#6b96ec', tail: '#2d58ae', label: '1st' },
  '2': { a: '#c8454a', b: '#e2716f', tail: '#a2343a', label: '2nd' },
  '3': { a: '#d9a93c', b: '#efcb6f', tail: '#b98a28', label: '3rd' },
  '4': { a: '#3f9a73', b: '#6cc39a', tail: '#2f7c5b', label: 'HM' },
  bis: { a: '#7b55c9', b: '#a684ea', tail: '#5e3fa6', label: 'BIS' },
};

export const PLACE_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: 'Honourable Mention' };

// ───────────────────────────── art ─────────────────────────────

function pleat(cx: number, cy: number, r0: number, r1: number, n: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r0 : r1;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** A show rosette: pleated rings, a button centre and two notched tails. */
export const Rosette = memo(function Rosette({ place, bis, size = 40, title }: { place: 1 | 2 | 3 | 4; bis?: boolean; size?: number; title?: string }) {
  const uid = useId().replace(/:/g, '');
  const c = ROSETTE[bis ? 'bis' : String(place)];
  const h = size * 1.3;
  return (
    <svg viewBox="0 0 64 84" width={size} height={h} className="sh-rosette" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={`rb${uid}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.6" stopColor="#f0d58a" />
          <stop offset="1" stopColor="#b98a2e" />
        </radialGradient>
        <linearGradient id={`rt${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.a} />
          <stop offset="1" stopColor={c.tail} />
        </linearGradient>
      </defs>
      <path d="M26 38 L18 80 L23.5 74 L28 81 L34 40 Z" fill={`url(#rt${uid})`} />
      <path d="M38 38 L46 80 L40.5 74 L36 81 L30 40 Z" fill={`url(#rt${uid})`} opacity={0.92} />
      <polygon points={pleat(32, 30, 23, 27.5, 22)} fill={c.tail} />
      <polygon points={pleat(32, 30, 19, 23, 20)} fill={c.a} />
      <polygon points={pleat(32, 30, 15, 17.5, 18)} fill={c.b} />
      <circle cx="32" cy="30" r="12" fill={`url(#rb${uid})`} stroke="rgba(90,60,10,0.35)" strokeWidth="0.8" />
      <text x="32" y="34" textAnchor="middle" fontSize={c.label.length > 2 ? 8.5 : 10} fontWeight={800} fontFamily="Inter Variable, system-ui, sans-serif" fill="#4a3208">
        {c.label}
      </text>
    </svg>
  );
});

const METAL: Record<ShowTier, [string, string, string]> = {
  club: ['#f3d9a6', '#c9955a', '#8a5d2b'],
  regional: ['#f4f6f8', '#b9c1c8', '#7b858e'],
  national: ['#f7fafc', '#c4ccd4', '#86909a'],
  international: ['#fff1c2', '#e2b44f', '#9a6c17'],
};

/** A two-handled cup on a plinth (gold for International and Best in Show, silver for Regional / National). */
export const Cup = memo(function Cup({ tier, bis, size = 44 }: { tier: ShowTier; bis?: boolean; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const [l, m, d] = METAL[bis ? 'international' : tier];
  return (
    <svg viewBox="0 0 64 84" width={size} height={size * 1.3} aria-hidden>
      <defs>
        <linearGradient id={`cm${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={d} />
          <stop offset="0.28" stopColor={l} />
          <stop offset="0.55" stopColor={m} />
          <stop offset="1" stopColor={d} />
        </linearGradient>
      </defs>
      <rect x="17" y="70" width="30" height="11" rx="1.5" fill="#3a2718" />
      <rect x="17" y="70" width="30" height="2" fill="#5a3d26" />
      <rect x="25" y="74" width="14" height="4" rx="0.8" fill={m} opacity={0.9} />
      <path d="M22 70 Q32 64 42 70 Z" fill={`url(#cm${uid})`} />
      <rect x="29.5" y="50" width="5" height="15" fill={`url(#cm${uid})`} />
      <ellipse cx="32" cy="55" rx="5" ry="2.4" fill={`url(#cm${uid})`} />
      <path d="M14 14 Q14 44 32 50 Q50 44 50 14 Z" fill={`url(#cm${uid})`} />
      <ellipse cx="32" cy="14" rx="18" ry="3.6" fill={d} />
      <ellipse cx="32" cy="13.4" rx="16.4" ry="2.6" fill={m} opacity={0.6} />
      <path d="M14.5 19 C4 18, 3 36, 18 38" fill="none" stroke={`url(#cm${uid})`} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M49.5 19 C60 18, 61 36, 46 38" fill="none" stroke={`url(#cm${uid})`} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 20 Q21 36 29 43" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round" />
      {bis && <path d="M32 24 l2.4 4.9 5.4 0.8 -3.9 3.8 0.9 5.4 -4.8 -2.6 -4.8 2.6 0.9 -5.4 -3.9 -3.8 5.4 -0.8 z" fill="#fff6d6" opacity={0.9} />}
    </svg>
  );
});

/** A walnut shield plaque with a brass plate (aquascape class wins at Regional). */
export const Plaque = memo(function Plaque({ size = 40 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 84" width={size} height={size * 1.3} aria-hidden>
      <defs>
        <linearGradient id={`pw${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a5236" />
          <stop offset="1" stopColor="#3b2416" />
        </linearGradient>
        <linearGradient id={`pb${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8e6a2c" />
          <stop offset="0.4" stopColor="#f2d58e" />
          <stop offset="1" stopColor="#a47a30" />
        </linearGradient>
      </defs>
      <path d="M10 10 H54 V46 Q54 68 32 78 Q10 68 10 46 Z" fill={`url(#pw${uid})`} stroke="#2a180c" strokeWidth="1" />
      <path d="M15 15 H49 V45 Q49 63 32 72 Q15 63 15 45 Z" fill="none" stroke="rgba(255,220,170,0.18)" strokeWidth="1" />
      <path d="M22 30 Q26 22 32 30 T42 30" fill="none" stroke="#5fcfb5" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 38 Q32 30 44 38" fill="none" stroke="#3f8f63" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="18" y="46" width="28" height="9" rx="1.5" fill={`url(#pb${uid})`} />
    </svg>
  );
});

/** A cut-crystal bowl on a short foot (aquascape class wins at National and International). */
export const Bowl = memo(function Bowl({ tier, size = 44 }: { tier: ShowTier; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gold = tier === 'international';
  return (
    <svg viewBox="0 0 64 84" width={size} height={size * 1.3} aria-hidden>
      <defs>
        <linearGradient id={`bw${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={gold ? '#9a6c17' : '#6f8fa0'} />
          <stop offset="0.35" stopColor={gold ? '#fff1c2' : '#f2fbff'} />
          <stop offset="0.6" stopColor={gold ? '#e2b44f' : '#b6d3df'} />
          <stop offset="1" stopColor={gold ? '#9a6c17' : '#5d7c8c'} />
        </linearGradient>
      </defs>
      <rect x="15" y="72" width="34" height="9" rx="1.5" fill="#2a2320" />
      <path d="M24 72 Q32 66 40 72 Z" fill={`url(#bw${uid})`} />
      <rect x="29.5" y="56" width="5" height="12" fill={`url(#bw${uid})`} />
      <path d="M6 30 Q8 56 32 58 Q56 56 58 30 Z" fill={`url(#bw${uid})`} opacity={0.95} />
      <ellipse cx="32" cy="30" rx="26" ry="5" fill={gold ? '#b8862a' : '#8fb0bf'} />
      <ellipse cx="32" cy="29.5" rx="23.5" ry="3.4" fill={gold ? '#f3d68a' : '#dff2f8'} opacity={0.7} />
      {[14, 22, 32, 42, 50].map((x) => (
        <path key={x} d={`M${x} 35 L${x + (32 - x) * 0.18} 54`} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      ))}
    </svg>
  );
});

/** Draw a trophy record with the right piece of art. */
export function TrophyArt({ t, size = 44 }: { t: Pick<TrophyRecord, 'kind' | 'tier' | 'place' | 'bestInShow'>; size?: number }) {
  if (t.kind === 'cup') return <Cup tier={t.tier} bis={t.bestInShow} size={size} />;
  if (t.kind === 'plaque') return <Plaque size={size * 0.95} />;
  if (t.kind === 'bowl') return <Bowl tier={t.tier} size={size} />;
  return <Rosette place={t.place} bis={t.bestInShow} size={size * 0.92} />;
}

// ───────────────────────────── tier badge ─────────────────────────────

const TIER_ICON: Record<ShowTier, typeof Award> = { club: Users, regional: Award, national: Medal, international: Globe2 };

export function TierBadge({ tier, locked }: { tier: ShowTier; locked?: boolean }) {
  const Icon = locked ? Lock : TIER_ICON[tier];
  return (
    <span className={`sh-tier sh-tier--${tier}`}>
      <Icon size={11} aria-hidden />
      {SHOW_TIERS[tier].name}
    </span>
  );
}

// ───────────────────────────── creature card row ─────────────────────────────

export function TitleBadge({ c }: { c: Pick<Creature, 'awards'> }) {
  const t = topTitle(c);
  if (!t) return null;
  return (
    <span className={`sh-title sh-title--${t}`} title={t === 'grand_champion' ? 'Grand Champion — three class wins at National or higher' : 'Champion — three class wins at Regional or higher'}>
      {t === 'grand_champion' ? <Crown size={11} aria-hidden /> : <Trophy size={11} aria-hidden />}
      {TITLE_LABEL[t]}
    </span>
  );
}

function ribbonTitle(r: CreatureRibbon): string {
  return `${r.bestInShow ? 'Best in Show · ' : ''}${PLACE_LABEL[r.place]} in ${r.className} — ${r.showName} (${SHOW_TIERS[r.tier].name}, ${r.score})`;
}

/**
 * The creature card's ribbons row: its title (if any) and its best rosettes, newest first. Tapping it opens the
 * Shows panel's trophy case. Renders nothing for an animal that has never placed.
 */
export function CreatureRibbons({ c, max = 6 }: { c: Pick<Creature, 'awards' | 'name'>; max?: number }) {
  const a = c.awards;
  const ribbons = a?.ribbons ?? [];
  if (!a || (!ribbons.length && !a.titles?.length)) return null;
  // best first: Best in Show, then wins by tier, then placing; ties newest first
  const tierRank = (t: ShowTier) => SHOW_TIERS[t]?.order ?? 0;
  const sorted = [...ribbons].sort((x, y) => Number(!!y.bestInShow) - Number(!!x.bestInShow) || x.place - y.place || tierRank(y.tier) - tierRank(x.tier) || y.hour - x.hour);
  const shown = sorted.slice(0, max);
  const more = ribbons.length - shown.length;
  return (
    <div className="sh-ribbons" data-testid="creature-ribbons">
      <TitleBadge c={c} />
      {shown.length > 0 && (
        <button
          type="button"
          className="sh-ribbons__btn"
          aria-label={`${c.name}’s show ribbons: ${ribbons.length}. Open the trophy case`}
          title={shown.map(ribbonTitle).join('\n')}
          onClick={() => {
            sfx('open');
            useUI.getState().set({ panel: 'shows', panelTarget: 'tab:trophies' });
          }}
        >
          {shown.map((r, i) => (
            <Rosette key={i} place={r.place} bis={r.bestInShow} size={17} />
          ))}
          {more > 0 && <span className="sh-ribbons__more">+{more}</span>}
        </button>
      )}
    </div>
  );
}
