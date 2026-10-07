/**
 * The loading card a link or a reload shows while it opens the save (0.5 spec §6.4 item 3, §16, §17; ADR-0019
 * decision 3): a looping bar, since loading can't promise how long it takes, the real time away, and where it goes
 * next. OWNER: lane "ui-shell".
 */
import { useNav } from './router';
import { Wordmark } from '../screens/TitleScreen';

/** "3 h 12 min" / "40 min" / "3 days" of real time away, or null under a minute (the card then says only "Loading your save…"). */
export function awayText(ms: number | null): string | null {
  if (ms == null || !(ms >= 60_000)) return null;
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 48) return m ? `${h} h ${m} min` : `${h} h`;
  return `${Math.round(ms / 86_400_000)} days`;
}

/** The card's main line (§16 "Loading card"). */
export function bootLine(awayMs: number | null): string {
  const away = awayText(awayMs);
  return away ? `Loading your save · catching up ${away}…` : 'Loading your save…';
}

/** The app icon (public/favicon.svg), inline so it never waits on a request. */
function AppIcon() {
  return (
    <svg className="ag-boot__icon" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="ag-boot-icon" cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#7ff5e6" />
          <stop offset="1" stopColor="#0b3a52" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#ag-boot-icon)" />
      <path d="M14 34c8-10 22-12 32-4l8-6-2 10 2 10-8-6c-10 8-24 6-32-4z" fill="#ff9a62" />
      <circle cx="22" cy="32" r="2.2" fill="#0b1b24" />
    </svg>
  );
}

export function BootCard() {
  const boot = useNav((s) => s.boot);
  if (!boot) return null;
  return (
    <div className="ag-boot">
      <div className="ag-boot__card" data-testid="boot-deeplink" role="status" aria-live="polite">
        <AppIcon />
        <Wordmark size="md" />
        <p className="ag-boot__line">{bootLine(boot.awayMs)}</p>
        <div className="ag-boot__bar" aria-hidden>
          <span />
        </div>
        {boot.dest && (
          <span className="ag-boot__dest" data-testid="boot-deeplink-dest">
            Then: {boot.dest}
          </span>
        )}
      </div>
    </div>
  );
}
