/**
 * lane:fix3-saves (R03-01) — lasting banner for a tab that stopped saving because another tab played the same aquarium
 * further (see persistence/slots `refuseStale`). The player chooses: load the newer copy, or keep this one and save
 * here (which overwrites the other copy). A toast was too easy to miss, and its "reload" advice lost this tab's play.
 * It heads the toast column (Toasts.tsx renders it, like the update prompt): centred under the top bar it covered the
 * tank bar, and toasts slid in behind it.
 * OWNER: lane "core".
 */
import { useState, type CSSProperties } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useStaleSaves, keepThisCopy, saveCurrentGame } from '@/persistence';
import { loadIntoGame } from '@/ui/common/saves';
import { Button } from '@/ui/kit';

const wrap: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  pointerEvents: 'auto',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '10px 12px',
  padding: '12px 14px',
  borderRadius: 'var(--r-md, 12px)',
  background: 'var(--c-glass-strong, rgba(7, 17, 24, 0.84))',
  backdropFilter: 'var(--blur, blur(20px))',
  border: '1px solid rgba(251, 191, 36, 0.45)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  color: 'var(--c-ink, #eaf5f7)',
  font: '500 13px/1.4 var(--font-ui, system-ui, sans-serif)',
};

/** The banner's words. Audit 2026-11-17, I16: what ends it for good, and what Keep does on the button itself. */
export const STALE_WORDS = {
  text: 'This aquarium was played further in another tab, so this tab has stopped saving to keep that progress safe. Close the other tab to stop this.',
  load: 'Load the newer copy',
  keep: 'Keep this one (replaces the other tab’s progress)',
} as const;

/** Is the banner up (this tab's running aquarium was played further elsewhere)? */
export function useStaleBanner(): boolean {
  const saveId = useGame((s) => s.game?.saveId ?? null);
  const stale = useStaleSaves((s) => !!saveId && !!s.games[saveId]);
  const inGame = useUI((s) => s.screen === 'game');
  return stale && inGame;
}

export function StaleTabBanner() {
  const saveId = useGame((s) => s.game?.saveId ?? null);
  const slot = useStaleSaves((s) => (saveId ? s.games[saveId] : undefined));
  const inGame = useUI((s) => s.screen === 'game');
  const [busy, setBusy] = useState(false);
  if (!saveId || !slot || !inGame) return null;

  const loadNewer = async () => {
    setBusy(true);
    try {
      await loadIntoGame(slot);
    } finally {
      setBusy(false);
    }
  };
  const keepThis = async () => {
    setBusy(true);
    try {
      keepThisCopy(saveId);
      await saveCurrentGame(slot, { toast: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="alert" style={wrap} data-testid="stale-tab-banner">
      <TriangleAlert size={18} aria-hidden style={{ color: 'var(--c-watch, #fbbf24)', flex: 'none' }} />
      <span style={{ flex: '1 1 260px', minWidth: 0 }}>
        {STALE_WORDS.text}
      </span>
      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
        <Button size="sm" variant="primary" disabled={busy} onClick={() => void loadNewer()} data-testid="stale-tab-load">
          {STALE_WORDS.load}
        </Button>
        <Button size="sm" disabled={busy} onClick={() => void keepThis()} data-testid="stale-tab-keep" title="Save this tab’s aquarium over the other copy">
          {STALE_WORDS.keep}
        </Button>
      </span>
    </div>
  );
}
