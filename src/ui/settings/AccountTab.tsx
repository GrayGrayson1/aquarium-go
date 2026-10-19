/**
 * chunk 8 (ADR-0039 decision 3, ADR-0040 decision 3, ADR-0041 decisions 2–3; ONLINE-STAGE1.md §7; REL-031) —
 * Settings › Account (`#/settings/account`), where Social exists (`socialAvailable()`). Signed in: who, the name friends
 * see and the friend code, the online-save line, Open Social, Sign out, Delete my account (asked first) and the
 * privacy note. Signed out: the approved line and Open Social. Social opens only inside a game, so on the title screen
 * Open Social isn't offered. OWNER: lane "social".
 */
import { useEffect, useState } from 'react';
import { Globe, LogOut, Trash2 } from 'lucide-react';
import { Button, Modal, Section } from '../kit';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { socialService } from '@/social';
import { SOCIAL_COPY as C } from '../panels/social/copy';
import { NetworkError, PrivacyLink, Skeleton } from '../panels/social/parts';
import { loadSocialUser, setSocialUser, useSocial } from '../panels/social/socialStore';
import { timeAgo } from '../common/saves';
import { go } from '../nav/router';
import { forgetCloudLink, useCloud } from '../online/cloudSync';
import '@/ui/styles/social.css';
import '@/ui/styles/online.css';

/** The online-save line (ADR-0041 decision 2), from the loop's state. */
export function onlineLine(status: ReturnType<typeof useCloud.getState>['status'], syncedAt: number | null): { text: string; warn: boolean } {
  if (status === 'blocked') return { text: C.onlineTooNew, warn: true };
  if (status === 'saving') return { text: C.savingOnline, warn: false };
  if (status === 'unreachable') return { text: C.onlineUnreachable, warn: true };
  if (syncedAt !== null) return { text: C.savedOnline(timeAgo(syncedAt)), warn: false };
  return { text: C.notSavedOnline, warn: false };
}

export function AccountTab() {
  const user = useSocial((s) => s.user);
  const offline = useSocial((s) => s.offline);
  const hasGame = useGame((s) => !!s.game && !s.game.isShowcase);
  const onGameScreen = useUI((s) => s.screen === 'game');
  const inGame = hasGame && onGameScreen;
  const status = useCloud((s) => s.status);
  const syncedAt = useCloud((s) => s.syncedAt);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // "Saved online 2 min ago" moves on while the tab is open
  const [, setTick] = useState(0);
  useEffect(() => {
    void loadSocialUser();
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const openSocial = () => go({ kind: 'panel', panel: 'social' });

  const signOut = async () => {
    setBusy(true);
    setError(false);
    try {
      await socialService().signOut();
      setSocialUser(null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setBusy(true);
    setError(false);
    try {
      await socialService().deleteAccount();
      forgetCloudLink(user.id);
      setSocialUser(null);
      setConfirm(false);
      useUI.getState().toast(C.toastDeleted, 'success', { detail: C.toastDeletedDetail });
    } catch {
      setConfirm(false);
      setError(true); // the account is as it was: say the server couldn't be reached
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) return <Skeleton rows={3} />;

  if (!user)
    return (
      <Section>
        <div className="ac-account" data-testid="settings-account">
          {offline && <NetworkError />}
          <p className="ac-line" data-testid="account-signed-out">
            {C.accountSignedOut}
          </p>
          {inGame && (
            <div className="ac-actions">
              <Button onClick={openSocial} data-testid="account-open-social">
                <Globe size={15} aria-hidden /> {C.openSocial}
              </Button>
            </div>
          )}
          <PrivacyLink testId="account-privacy" />
        </div>
      </Section>
    );

  const line = onlineLine(status, syncedAt);
  return (
    <Section>
      <div className="ac-account" data-testid="settings-account">
        {error && <NetworkError />}
        <p className="ac-line ac-line--strong" data-testid="account-who">
          {C.subtitleIn(user.email)}
        </p>
        <p className="ac-line" data-testid="account-name">
          {C.accountNameCode(user.displayName, user.friendCode)}
        </p>
        <p className={line.warn ? 'ac-status ac-status--warn' : 'ac-status'} role="status" data-testid="account-online">
          {line.text}
        </p>
        <div className="ac-actions">
          {inGame && (
            <Button onClick={openSocial} data-testid="account-open-social">
              <Globe size={15} aria-hidden /> {C.openSocial}
            </Button>
          )}
          <Button variant="ghost" disabled={busy} onClick={() => void signOut()} data-testid="account-signout">
            <LogOut size={15} aria-hidden /> {C.signOut}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => setConfirm(true)} data-testid="account-delete">
            <Trash2 size={15} aria-hidden /> {C.deleteAccount}
          </Button>
        </div>
        <PrivacyLink testId="account-privacy" />
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={C.deleteTitle}
        testId="account-delete-confirm"
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)} data-testid="account-delete-cancel">
              {C.cancel}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void deleteAccount()} data-testid="account-delete-yes">
              {C.deleteAccount}
            </Button>
          </>
        }
      >
        <p className="ac-line">{C.deleteBody}</p>
      </Modal>
    </Section>
  );
}
