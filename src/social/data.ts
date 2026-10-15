/**
 * The local stub's canned Social data (ADR-0034 decision 1: the approved screens' sample data, completed). OWNER:
 * lane "social". Friends' snapshots are small SVG pictures drawn here, so the stub never fetches anything (offline
 * first; PERSIST-004's no-remote-URL rule).
 */
import type { Club, FriendAquarium, LeaderboardKind, TradeOffer } from './service';

/** The one invite code that resolves (§13.6); every other code is expired. */
export const VALID_INVITE = 'HIGHLAND-4821';
export const HIGHLAND_ID = 'highland-betta';

export const CLUBS: readonly Club[] = [
  { id: HIGHLAND_ID, name: 'Highland Betta Club', initials: 'HB', colors: ['#2f55d4', '#16247a'], members: 128, blurb: 'Bettas, show dates and spawning logs', nextEvent: { title: 'Club show', when: 'Saturday' } },
  { id: 'prismatic-hunters', name: 'Prismatic Hunters', initials: 'PH', colors: ['#9b7bf0', '#5b3aa8'], members: 2341, blurb: 'Rainbow finds, shared the day they land' },
  { id: 'nano-tank', name: 'Nano Tank Collective', initials: 'NT', colors: ['#2fc4b2', '#127567'], members: 412, blurb: 'Small tanks, big ideas' },
  { id: 'reef-starter', name: 'Reef Starter Circle', initials: 'RS', colors: ['#f0845a', '#a8402a'], members: 87, blurb: 'Marine beginners helping each other' },
];

/** The member club's show strip: "Club show on Saturday · 12 entries so far" (§13.4). */
export const CLUB_SHOW_ENTRIES = 12;

export const TRADES: readonly TradeOffer[] = [
  { id: 'trade-mara', from: 'Mara', gives: 'offers 2 Golden Bold-spotted Pea Puffers', wants: 'for your Red Veiltail Betta', createdAt: '2026-10-12T18:20:00Z' },
  { id: 'trade-jun', from: 'Jun', gives: 'wants an Axanthic Axolotl', wants: 'pays $190 or trades a Leucistic', createdAt: '2026-10-12T09:05:00Z' },
  { id: 'trade-teo', from: 'Teo', gives: 'offers 10 Fire Red Cherry Shrimp', wants: 'for any Butterfly betta', createdAt: '2026-10-11T21:40:00Z' },
];

type Scene = 'reef' | 'hall' | 'axolotl' | 'prismatic' | 'shrimp' | 'planted';

/** A 16:10 snapshot of an aquarium, drawn as SVG (a data URL; no network). */
export function snapshot(scene: Scene): string {
  const water: Record<Scene, [string, string]> = {
    reef: ['#1f7fb8', '#0b3557'],
    hall: ['#173a5c', '#071526'],
    axolotl: ['#5f8f8a', '#21403d'],
    prismatic: ['#3b4fa8', '#13183f'],
    shrimp: ['#4d8c56', '#163a22'],
    planted: ['#3f8f6a', '#123d2a'],
  };
  const [top, bottom] = water[scene];
  const plants = (xs: number[], color: string, h: number) =>
    xs.map((x, i) => `<path d="M${x} 168 C ${x - 6} ${150 - (i % 3) * 8}, ${x + 8} ${120 - h}, ${x + 2} ${108 - h}" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('');
  const fish = (pts: [number, number, string][]) => pts.map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4.5" fill="${c}"/><path d="M${x + 8} ${y} l7 -5 v10 z" fill="${c}"/>`).join('');
  const scenes: Record<Scene, string> = {
    reef: `${plants([40, 70, 250, 285], '#e86a6a', 10)}<circle cx="160" cy="166" r="22" fill="#f3a35c"/><circle cx="196" cy="170" r="14" fill="#c86bd8"/>${fish([[110, 80, '#ffb347'], [200, 64, '#5fd0ff'], [240, 104, '#ffe066']])}`,
    hall: `<rect x="0" y="0" width="320" height="34" fill="#0a1220"/><rect x="96" y="10" width="128" height="16" rx="3" fill="#c9a24a"/><rect x="20" y="52" width="280" height="110" rx="6" fill="none" stroke="#7fa6c9" stroke-width="3"/>${plants([60, 260], '#3fae6a', 0)}${fish([[130, 96, '#ffd166'], [190, 120, '#7bdff2']])}`,
    axolotl: `${plants([30, 290], '#6fbf73', -10)}<ellipse cx="150" cy="150" rx="34" ry="11" fill="#f4b8c6"/><circle cx="118" cy="146" r="10" fill="#f4b8c6"/><ellipse cx="220" cy="158" rx="28" ry="9" fill="#e8e3d8"/><circle cx="194" cy="154" r="8" fill="#e8e3d8"/>`,
    prismatic: `${plants([50, 270], '#58c08c', 6)}${fish([[120, 80, '#ff6fd8'], [170, 100, '#7afcff'], [220, 70, '#feff9c'], [150, 130, '#b388ff']])}`,
    shrimp: `<rect x="16" y="40" width="288" height="4" fill="#9fb6a6"/><rect x="16" y="104" width="288" height="4" fill="#9fb6a6"/>${[40, 90, 140, 190, 240].map((x) => `<ellipse cx="${x}" cy="90" rx="8" ry="3.5" fill="#e0453a"/><ellipse cx="${x + 20}" cy="152" rx="8" ry="3.5" fill="#e0453a"/>`).join('')}`,
    planted: `${plants([30, 55, 80, 230, 255, 280, 300], '#4fc26a', 16)}${fish([[150, 84, '#ff5e5e'], [170, 92, '#ff5e5e'], [160, 100, '#5ed1ff']])}`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="320" height="200" fill="url(#w)"/><rect y="168" width="320" height="32" fill="#cdb98f"/>${scenes[scene]}<rect x="0" y="0" width="320" height="200" fill="none" stroke="#0c1a24" stroke-width="6"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const FRIENDS: readonly FriendAquarium[] = [
  { id: 'friend-ola', owner: 'Ola Brandt', title: 'Ola’s Grand Reef', gallons: 1000, likes: 48, snapshotUrl: snapshot('reef'), updatedAt: '2026-10-12T20:00:00Z' },
  { id: 'friend-ada', owner: 'Ada Okafor', title: 'The Ada Hall', gallons: null, likes: 31, snapshotUrl: snapshot('hall'), updatedAt: '2026-10-12T16:30:00Z' },
  { id: 'friend-jun', owner: 'Jun Park', title: 'Jun’s axolotls', gallons: 40, likes: 12, snapshotUrl: snapshot('axolotl'), updatedAt: '2026-10-11T22:10:00Z' },
  { id: 'friend-priya', owner: 'Priya Nair', title: 'Priya’s Prismatic room', gallons: 220, likes: 27, snapshotUrl: snapshot('prismatic'), updatedAt: '2026-10-11T19:45:00Z' },
  { id: 'friend-teo', owner: 'Teo Silva', title: 'Teo’s shrimp rack', gallons: 60, likes: 9, snapshotUrl: snapshot('shrimp'), updatedAt: '2026-10-10T08:15:00Z' },
  { id: 'friend-sam', owner: 'Sam Duarte', title: 'Sam’s planted 75', gallons: 75, likes: 15, snapshotUrl: snapshot('planted'), updatedAt: '2026-10-09T12:00:00Z' },
];

/**
 * This week's leaderboards: the four named leaders (ADR-0034), then players whose names never appear, so the
 * player's row has a rank (the screens: $5,460 ranks 38th, one Prismatic 9th). Values only go down the list.
 */
function tail(start: number, ratio: number, n: number, step: number, floor: number): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    out.push(Math.max(floor, Math.round(v / step) * step));
    v *= ratio;
  }
  return out;
}

export const LEADERS: Readonly<Record<LeaderboardKind, readonly { name: string; value: number }[]>> = {
  collection_value: [
    { name: 'Ada Okafor', value: 214900 },
    { name: 'Ola Brandt', value: 188420 },
    { name: 'Priya Nair', value: 151030 },
    { name: 'Sam Duarte', value: 97610 },
    // 33 more above $5,460 (the screens' 38th), then a tail
    ...tail(90000, 0.9169, 116, 10, 120).map((value) => ({ name: '', value })),
  ],
  prismatics: [
    { name: 'Priya Nair', value: 4 },
    { name: 'Ada Okafor', value: 3 },
    { name: 'Jun Park', value: 2 },
    { name: 'Teo Silva', value: 1 },
    ...[1, 1, 1, 1].map((value) => ({ name: '', value })),
    ...new Array<number>(112).fill(0).map((value) => ({ name: '', value })),
  ],
  show_wins: [
    { name: 'Sam Duarte', value: 9 },
    { name: 'Ola Brandt', value: 7 },
    { name: 'Mara Quinn', value: 6 },
    { name: 'Ada Okafor', value: 5 },
    ...[4, 4, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((value) => ({ name: '', value })),
    ...new Array<number>(97).fill(0).map((value) => ({ name: '', value })),
  ],
};
