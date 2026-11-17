/**
 * chunk 13 (SHARED-SHOPS.md §7, §8) — the shared shop's own screens, every word from §8: the opening card (saving your
 * aquarium, waking the server, catching up), the HUD strip with who's there and the way back, the owner's members
 * list with "Can pause and change speed", the lines over the shop while it reconnects or catches up, "Still here?",
 * the first-time card, and the card that says why the server closed the visit. chunk 19 (ADR-0055 decision 6, QOL-007):
 * the strip became the dropdown from the name pill (SharedMenu.tsx), which shows this file's members list. OWNER: lane "social".
 */
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSharedMode } from '@/state/sharedMode';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { guardedReload } from '../common/reload'; // the review of I2
import { Button, Modal, Toggle } from '../kit';
import { Wordmark } from '../screens/TitleScreen';
import { BUILD_ID, parseBuildId, versionUrl } from '../hud/updateCheck';
import { useShared } from './store';
import { dismissClosing, grantPause, leaveSharedShop, stillHere, tryAgainShared } from './session';
import { RELOAD_CLOSINGS, RETRY_CLOSINGS, SHARED_WORDS as W, closingText } from './words';
import { MemberSpending } from './SharedMoney';
import './shared.css';

/** How long the server may take between the socket opening and the shop before the card says it's catching up. */
const CATCH_UP_LINE_AFTER_MS = 1500;

/** The opening card, until the shop is on screen (§8 "Opening"). */
export function SharedOpening() {
  const phase = useShared((s) => s.phase);
  const from = useShared((s) => s.from);
  // B-230 (audit I1): the checks before the wake show the card too (the button behind it only went grey)
  const opening = phase === 'checking' || phase === 'saving' || phase === 'waking' || phase === 'joining';
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
        {phase !== 'saving' && phase !== 'checking' && (
          <Button variant="ghost" size="sm" onClick={() => void leaveSharedShop()} data-testid="shared-opening-back">
            <ArrowLeft size={14} aria-hidden /> {from === 'title' ? 'Title' : W.back}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * §8 "Members list (the owner)": each member there, with a switch "Can pause and change speed"; chunk 14 (ADR-0050):
 * and each one's spending tier and "Can approve requests and give money", for anyone the pool has a record of too
 * (their tier holds while they're away; who may pause is known only for the members there).
 */
export function MembersList({ inline = false }: { /** chunk 19 (QOL-007): inside the shared shop's dropdown (SharedMenu.tsx) */ inline?: boolean }) {
  const members = useShared((s) => s.members);
  const you = useShared((s) => s.you);
  const records = useGame((s) => s.game?.pool?.members);
  const others: { id: string; name: string; pause?: boolean }[] = members.filter((m) => m.id !== you?.id);
  for (const [id, r] of Object.entries(records ?? {})) if (id !== you?.id && !others.some((m) => m.id === id)) others.push({ id, name: r.name });
  if (!others.length) return null;
  return (
    <ul className={inline ? 'ag-shared-members is-inline' : 'ag-shared-members'} data-testid="shared-members">
      {others.map((m) => (
        <li key={m.id} className="ag-shared-members__row" data-testid={`shared-member-${m.id}`}>
          <span className="ag-shared-members__name">{m.name}</span>
          <MemberSpending id={m.id} name={m.name} />
          {m.pause !== undefined && (
            <span className="ag-shared-members__switch">
              <span className="ag-shared-members__label" aria-hidden>
                {W.canPause}
              </span>
              <Toggle checked={m.pause} onChange={(on) => grantPause(m.id, on)} label={`${m.name}: ${W.canPause}`} testId={`shared-grant-${m.id}`} />
            </span>
          )}
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
  const line = phase === 'reconnecting' ? W.lost : notice === 'slow' ? W.slow : notice === 'catchingUp' || phase === 'rejoining' ? W.catchingUp : null;
  if (!line) return null;
  return (
    <div className="ag-shared-notice" role="status" aria-live="polite" data-testid="shared-notice" data-kind={phase === 'reconnecting' ? 'lost' : phase === 'rejoining' ? 'catchingUp' : (notice ?? '')}>
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
    <Modal open={on} onClose={() => useShared.setState({ firstTime: false })} testId="shared-first-time" dismissible={false} labelledBy="shared-first-time-text" actions={<Button variant="primary" onClick={() => useShared.setState({ firstTime: false })} data-testid="shared-first-time-ok">{W.gotIt}</Button>}>
      <p className="ag-shared-first" id="shared-first-time-text">{W.firstTime(club)}</p>
    </Modal>
  );
}

/**
 * §5.1: after a release the server can be newer than the page this tab loaded, and Pages may serve the old page for a
 * few minutes more, so `build` offers Reload once the site's version.json names a build other than this one. Audit
 * 2026-11-17, I8: `same`, the site still serves this very build (it hasn't been redeployed), so a reload can't help.
 */
function useNewBuildOut(watch: boolean): 'new' | 'same' | null {
  const [out, setOut] = useState<'new' | 'same' | null>(BUILD_ID === 'dev' ? 'new' : null);
  useEffect(() => {
    if (!watch || out === 'new') return;
    let live = true;
    const look = () =>
      fetch(versionUrl(import.meta.env.BASE_URL ?? '/', Date.now()), { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          const id = parseBuildId(b);
          if (live && id) setOut(id !== BUILD_ID ? 'new' : 'same');
        })
        .catch(() => {});
    void look();
    const t = window.setInterval(look, 15_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [watch, out]);
  return out;
}

/** Why the visit ended (§8 "Closing: …"), over wherever the player went back to; `build` and `outofstep` offer Reload. */
export function SharedClosingCard() {
  const closing = useShared((s) => s.closing);
  const club = useShared((s) => s.club?.name ?? '');
  const [now] = useState(() => Date.now());
  const newBuild = useNewBuildOut(closing?.why === 'build');
  const onTitle = useUI((s) => s.screen === 'title');
  if (!closing) return null;
  // audit I8: the site serves this tab's own build still: say so, rather than a Reload that never turns on
  const siteBehind = closing.why === 'build' && newBuild === 'same';
  const reload = RELOAD_CLOSINGS.has(closing.why) && !siteBehind;
  // B-230 (audit I1): a shop that couldn't be reached offers Try again, and the way back to the aquarium behind the card
  const retry = RETRY_CLOSINGS.has(closing.why);
  return (
    <Modal
      open
      onClose={dismissClosing}
      testId="shared-closing"
      labelledBy="shared-closing-text"
      actions={
        reload ? (
          <Button variant="primary" disabled={closing.why === 'build' && newBuild !== 'new'} onClick={guardedReload} data-testid="shared-closing-reload">
            {W.reload}
          </Button>
        ) : retry ? (
          <>
            {!onTitle && (
              <Button variant="ghost" onClick={dismissClosing} data-testid="shared-closing-back">
                {W.back}
              </Button>
            )}
            {!closing.noRetry && (
              <Button variant="primary" onClick={() => void tryAgainShared()} data-testid="shared-closing-retry">
                {W.tryAgain}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <p className="ag-shared-first" id="shared-closing-text" data-why={closing.why} data-testid="shared-closing-text">
        {siteBehind ? W.siteBehind : closingText(closing.why, { club, until: closing.until, savedAt: closing.savedAt, now, onTitle })}
      </p>
    </Modal>
  );
}
