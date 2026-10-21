/**
 * chunk 13 (SHARED-SHOPS.md §7, §8) — the shared shop's own screens, every word from §8: the opening card (saving your
 * aquarium, waking the server, catching up), the HUD strip with who's there and the way back, the owner's members
 * list with "Can pause and change speed", the lines over the shop while it reconnects or catches up, "Still here?",
 * the first-time card, and the card that says why the server closed the visit. OWNER: lane "social".
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { useSharedMode } from '@/state/sharedMode';
import { Button, Modal, Toggle } from '../kit';
import { useIsMobile } from '../common/safe';
import { Wordmark } from '../screens/TitleScreen';
import { useShared } from './store';
import { dismissClosing, grantPause, leaveSharedShop, stillHere } from './session';
import { RELOAD_CLOSINGS, SHARED_WORDS as W, closingText } from './words';
import './shared.css';

/** How long the server may take between the socket opening and the shop before the card says it's catching up. */
const CATCH_UP_LINE_AFTER_MS = 1500;

/** The opening card, until the shop is on screen (§8 "Opening"). */
export function SharedOpening() {
  const phase = useShared((s) => s.phase);
  const from = useShared((s) => s.from);
  const opening = phase === 'saving' || phase === 'waking' || phase === 'joining';
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (phase !== 'joining') return;
    const t = window.setTimeout(() => setSlow(true), CATCH_UP_LINE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [phase]);
  if (!opening || (useShared.getState().creating && phase === 'saving')) return null;
  const line = phase === 'saving' ? W.saving : phase === 'waking' || !slow ? W.waking : W.catchingUpEmpty;
  return (
    <div className="ag-boot ag-shared-open">
      <div className="ag-boot__card" data-testid="shared-opening" data-phase={phase} role="status" aria-live="polite">
        <Wordmark size="md" />
        <p className="ag-boot__line">{line}</p>
        <div className="ag-boot__bar" aria-hidden>
          <span />
        </div>
        {phase !== 'saving' && (
          <Button variant="ghost" size="sm" onClick={() => void leaveSharedShop()} data-testid="shared-opening-back">
            <ArrowLeft size={14} aria-hidden /> {from === 'title' ? 'Title' : W.back}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The HUD strip: "Shared · {shop} · Here: {name}, {name}" and the way back; the owner's members list from it. */
export function SharedStrip() {
  const shared = useSharedMode((s) => s.club !== null);
  const phase = useShared((s) => s.phase);
  const shop = useShared((s) => s.shopName);
  const members = useShared((s) => s.members);
  const owner = useShared((s) => !!s.you?.owner);
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  if (!shared || (phase !== 'open' && phase !== 'reconnecting')) return null;
  const here = members.filter((m) => m.here).map((m) => m.name);
  const text = W.strip(shop, here);
  return (
    <div className={`ag-shared-strip${mobile ? ' ag-shared-strip--low' : ''}`} data-testid="shared-strip">
      {owner ? (
        <button type="button" className="ag-shared-strip__text is-button" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="shared-strip-members">
          <Users size={13} aria-hidden /> <span>{text}</span>
        </button>
      ) : (
        <span className="ag-shared-strip__text" data-testid="shared-strip-text">
          <Users size={13} aria-hidden /> <span>{text}</span>
        </span>
      )}
      <Button size="sm" variant="ghost" className="ag-shared-strip__back" onClick={() => void leaveSharedShop()} data-testid="shared-back">
        {W.back}
      </Button>
      {owner && open && <MembersList onClose={() => setOpen(false)} />}
    </div>
  );
}

/** §8 "Members list (the owner)": each member there, with a switch "Can pause and change speed". */
function MembersList({ onClose }: { onClose: () => void }) {
  const members = useShared((s) => s.members);
  const you = useShared((s) => s.you);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const others = members.filter((m) => m.id !== you?.id);
  return (
    <ul className="ag-shared-members" data-testid="shared-members">
      {others.map((m) => (
        <li key={m.id} className="ag-shared-members__row" data-testid={`shared-member-${m.id}`}>
          <span className="ag-shared-members__name">{m.name}</span>
          <span className="ag-shared-members__switch">
            <span className="ag-shared-members__label" aria-hidden>
              {W.canPause}
            </span>
            <Toggle checked={m.pause} onChange={(on) => grantPause(m.id, on)} label={`${m.name}: ${W.canPause}`} testId={`shared-grant-${m.id}`} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The lines over the shop: reconnecting, catching up from a snapshot, a device that can't keep up (§7.6, §8). */
export function SharedNotices() {
  const shared = useSharedMode((s) => s.club !== null);
  const phase = useShared((s) => s.phase);
  const notice = useShared((s) => s.notice);
  if (!shared) return null;
  const line = phase === 'reconnecting' ? W.lost : notice === 'slow' ? W.slow : notice === 'catchingUp' ? W.catchingUp : null;
  if (!line) return null;
  return (
    <div className="ag-shared-notice" role="status" aria-live="polite" data-testid="shared-notice" data-kind={phase === 'reconnecting' ? 'lost' : notice ?? ''}>
      {line}
    </div>
  );
}

/** §7.5: "Still here? The shared shop pauses when nobody's playing." [I'm here] */
export function SharedStillHere() {
  const on = useShared((s) => s.stillHere);
  if (!on) return null;
  return (
    <div className="ag-shared-still" role="alertdialog" aria-label={W.stillHere} data-testid="shared-still-here">
      <p>{W.stillHere}</p>
      <Button variant="primary" size="sm" onClick={stillHere} data-testid="shared-still-here-yes" autoFocus>
        {W.imHere}
      </Button>
    </div>
  );
}

/** §8 "First time in": once per shop on this device. */
export function SharedFirstTime() {
  const on = useShared((s) => s.firstTime && s.phase === 'open');
  const club = useShared((s) => s.club?.name ?? '');
  return (
    <Modal open={on} onClose={() => useShared.setState({ firstTime: false })} testId="shared-first-time" dismissible={false} actions={<Button variant="primary" onClick={() => useShared.setState({ firstTime: false })} data-testid="shared-first-time-ok">{W.gotIt}</Button>}>
      <p className="ag-shared-first">{W.firstTime(club)}</p>
    </Modal>
  );
}

/** Why the visit ended (§8 "Closing: …"), over wherever the player went back to; `build` and `outofstep` offer Reload. */
export function SharedClosingCard() {
  const closing = useShared((s) => s.closing);
  const club = useShared((s) => s.club?.name ?? '');
  const [now] = useState(() => Date.now());
  if (!closing) return null;
  const reload = RELOAD_CLOSINGS.has(closing.why);
  return (
    <Modal
      open
      onClose={dismissClosing}
      testId="shared-closing"
      actions={
        reload ? (
          <Button variant="primary" onClick={() => location.reload()} data-testid="shared-closing-reload">
            {W.reload}
          </Button>
        ) : undefined
      }
    >
      <p className="ag-shared-first" data-why={closing.why} data-testid="shared-closing-text">
        {closingText(closing.why, { club, until: closing.until, savedAt: closing.savedAt, now })}
      </p>
    </Modal>
  );
}
