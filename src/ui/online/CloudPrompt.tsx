/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6; ADR-0040 decision 4, ADR-0041 decision 4; REL-029) — the online-save
 * box: when the online copy differs from what this device last synced, which copy to keep. Its title says which case
 * it is, both copies show as cards (name, day, money, when saved), and it doesn't close without a choice. OWNER: lane
 * "social".
 */
import { CloudDownload, Smartphone, Cloud, Upload } from 'lucide-react';
import { Button, Modal, formatMoney } from '@/ui/kit';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSharedMode } from '@/state/sharedMode';
import { SOCIAL_COPY as C } from '../panels/social/copy';
import { timeAgo } from '../common/saves';
import { keepDeviceCopy, loadOnlineCopy, useCloud } from './cloudSync';

const TITLES = { newer: C.cloudNewer, both: C.cloudBoth, other: C.cloudOther } as const;

export function CloudPrompt() {
  const prompt = useCloud((s) => s.prompt);
  const choosing = useCloud((s) => s.choosing);
  // a boolean, not the game: the box mustn't re-render on every simulation tick while it's closed
  const hasGame = useGame((s) => !!s.game && !s.game.isShowcase);
  const inGame = useUI((s) => s.screen === 'game');
  // chunk 13: never over a shared shop (a check that answered after it opened; both choices refuse in one)
  const shared = useSharedMode((s) => s.club !== null);
  const open = !!prompt && inGame && hasGame && !shared;
  return (
    <Modal open={open} onClose={() => {}} dismissible={false} title={prompt ? TITLES[prompt.kind] : ''} testId="cloud-prompt" width={460}>
      {prompt && open && (
        <div className="cl-prompt">
          <DeviceCard />
          <div className="cl-card cl-card--online" data-testid="cloud-card-online">
            <Cloud size={16} aria-hidden className="cl-card__icon" />
            <span>{C.cardOnline(prompt.online.shopName, prompt.online.day, formatMoney(prompt.online.money), timeAgo(prompt.online.savedAt))}</span>
          </div>
          <p className="cl-note">{C.cloudNote}</p>
          <div className="cl-actions">
            <Button disabled={choosing} onClick={() => void keepDeviceCopy()} data-testid="cloud-keep">
              <Upload size={15} aria-hidden /> {C.keepDevice}
            </Button>
            <Button variant="primary" disabled={choosing} onClick={() => void loadOnlineCopy()} data-testid="cloud-load">
              <CloudDownload size={15} aria-hidden /> {C.loadOnline}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** This device's card: only the fields it shows, so it re-renders when they change (the day, the money, a save). */
function DeviceCard() {
  const text = useGame((s) => (s.game ? C.cardDevice(s.game.shopName, Math.floor(s.game.clock.hour / 24) + 1, formatMoney(s.game.finance.money), timeAgo(s.game.lastSavedRealMs)) : ''));
  return (
    <div className="cl-card" data-testid="cloud-card-device">
      <Smartphone size={16} aria-hidden className="cl-card__icon" />
      <span>{text}</span>
    </div>
  );
}
