/**
 * chunk 18 (ADR-0054) — the owner's "Manage clubs and players" card, at the end of Social › Clubs and only for the
 * owner: what everything online takes, every club (members, its shared shop and that shop's size) with Delete shop and
 * Delete club, and every player (friend code, when they joined and last saved online, their clubs, their size) with
 * Delete account (not on the owner's own row: that is Settings › Account). Each delete asks first, then goes to the
 * database (`socialService()`'s owner calls, which refuse anyone else) and reloads the lists. Also the owner's
 * friend-removal box, which the Friends tab uses. OWNER: lane "social".
 */
import { useState } from 'react';
import { ShieldAlert, Store, Trash2, UserMinus, UserX } from 'lucide-react';
import { Button, Modal } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { isSocialError, socialService, type OwnerClub, type OwnerPlayer } from '@/social';
import { forgetSharedShops } from '../../shared/shopsCache';
import { SOCIAL_COPY as C, dayMonth, formatSize } from './copy';
import { ClubAvatar, ErrorNote, NetworkError, PersonAvatar, Skeleton } from './parts';
import { useSocialQuery } from './socialStore';

/** What a confirm box is about to delete. */
type Pending = { kind: 'club'; club: OwnerClub } | { kind: 'shop'; club: OwnerClub } | { kind: 'player'; player: OwnerPlayer } | { kind: 'friend'; id: string; name: string };

/** The confirm box's words and the call it makes. */
function plan(p: Pending): { title: string; body: string; yes: string; toast: string; detail: string; run: () => Promise<void> } {
  const s = socialService();
  switch (p.kind) {
    case 'club':
      return { title: C.deleteClubTitle(p.club.name), body: C.deleteClubBody, yes: C.deleteClub, toast: C.toastClubDeleted, detail: p.club.name, run: () => s.deleteClub(p.club.id) };
    case 'shop':
      return { title: C.deleteShopTitle(p.club.shop?.name ?? p.club.name), body: C.deleteShopBody(p.club.name), yes: C.deleteShop, toast: C.toastShopDeleted, detail: p.club.name, run: () => s.deleteSharedShop(p.club.id) };
    case 'player':
      return { title: C.deletePlayerTitle(p.player.name), body: C.deletePlayerBody, yes: C.deletePlayer, toast: C.toastPlayerDeleted, detail: p.player.name, run: () => s.deletePlayer(p.player.id) };
    case 'friend':
      return { title: C.removeFriendTitle(p.name), body: C.removeFriendBody, yes: C.removeFriend, toast: C.toastFriendRemoved, detail: p.name, run: () => s.removeFriend(p.id) };
  }
}

/** The confirm box (Cancel · the delete), and what happens on yes: the call, a toast, `onDone`, or an error inside the box. */
export function OwnerConfirm({ pending, onClose, onDone }: { pending: Pending | null; onClose: () => void; onDone: (p: Pending) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'network' | 'other' | null>(null);
  const p = pending ? plan(pending) : null;
  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };
  const yes = async () => {
    if (!pending || !p) return;
    setBusy(true);
    setError(null);
    try {
      await p.run();
      if (pending.kind === 'club' || pending.kind === 'shop') forgetSharedShops(); // the club cards read the shops again
      useUI.getState().toast(p.toast, 'success', { detail: p.detail });
      setBusy(false);
      onDone(pending);
    } catch (e) {
      setError(isSocialError(e) && e.code === 'network' ? 'network' : 'other');
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!pending}
      onClose={close}
      title={p?.title}
      testId="owner-confirm"
      actions={
        <>
          <Button variant="ghost" disabled={busy} onClick={close} data-testid="owner-confirm-cancel">
            {C.cancel}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void yes()} data-testid="owner-confirm-yes">
            <Trash2 size={15} aria-hidden /> {p?.yes}
          </Button>
        </>
      }
    >
      {error === 'network' && <NetworkError />}
      {error === 'other' && <ErrorNote>{C.manageError}</ErrorNote>}
      <p className="so-manage__body">{p?.body}</p>
    </Modal>
  );
}

export function OwnerManage({ onChanged }: { onChanged: () => void }) {
  const [q, reload] = useSocialQuery(() => socialService().ownerOverview(), []);
  const [pending, setPending] = useState<Pending | null>(null);
  const done = () => {
    setPending(null);
    reload();
    onChanged();
  };
  return (
    <section className="so-card so-card--plain so-manage" data-testid="owner-manage">
      <h3 className="so-section">
        <ShieldAlert size={14} aria-hidden /> {C.manageTitle}
      </h3>
      {q.state === 'loading' && <Skeleton rows={4} />}
      {q.state === 'error' && (q.network ? <NetworkError /> : <ErrorNote>{C.manageError}</ErrorNote>)}
      {q.state === 'ok' && (
        <>
          <p className="so-manage__stored" data-testid="owner-stored">
            {C.manageStored(formatSize(q.data.bytes))}
          </p>
          <h4 className="so-manage__head">{C.manageClubs(q.data.clubs.length)}</h4>
          {q.data.clubs.length ? (
            <ul className="so-clubs" data-testid="owner-clubs">
              {q.data.clubs.map((c) => (
                <li key={c.id} className="so-suggest so-manage__row" data-testid={`owner-club-${c.id}`}>
                  <ClubAvatar club={{ ...c, blurb: '' }} size={36} />
                  <div className="so-suggest__text">
                    <div className="so-suggest__name">{c.name}</div>
                    <div className="so-suggest__meta">{C.manageClubMeta(c.members, c.shop ? C.manageShop(c.shop.name, c.shop.day, formatSize(c.shop.bytes)) : null)}</div>
                  </div>
                  <div className="so-manage__actions">
                    {c.shop && (
                      <Button size="sm" variant="ghost" onClick={() => setPending({ kind: 'shop', club: c })} aria-label={C.deleteShopLabel(c.name)} data-testid={`owner-shop-delete-${c.id}`}>
                        <Store size={14} aria-hidden /> {C.deleteShop}
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'club', club: c })} aria-label={C.deleteClubLabel(c.name)} data-testid={`owner-club-delete-${c.id}`}>
                      <Trash2 size={14} aria-hidden /> {C.deleteClub}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="so-note">{C.manageNone}</p>
          )}
          <h4 className="so-manage__head">{C.managePlayers(q.data.players.length)}</h4>
          <ul className="so-clubs" data-testid="owner-players">
            {q.data.players.map((p) => (
              <li key={p.id} className="so-suggest so-manage__row" data-testid={`owner-player-${p.id}`}>
                <PersonAvatar name={p.name} size={36} />
                <div className="so-suggest__text">
                  <div className="so-suggest__name">{p.owner ? C.manageYou(p.name) : p.name}</div>
                  <div className="so-suggest__meta">{C.managePlayerMeta(p.friendCode, dayMonth(p.createdAt), p.savedAt ? dayMonth(p.savedAt) : null, p.clubs, formatSize(p.bytes))}</div>
                  {p.owner && <div className="so-suggest__meta">{C.manageYouNote}</div>}
                </div>
                {!p.owner && (
                  <div className="so-manage__actions">
                    <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'player', player: p })} aria-label={C.deletePlayerLabel(p.name)} data-testid={`owner-player-delete-${p.id}`}>
                      <UserX size={14} aria-hidden /> {C.deletePlayer}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <OwnerConfirm pending={pending} onClose={() => setPending(null)} onDone={done} />
    </section>
  );
}

/** The owner's Remove on a friend's tile and Decline on a request (the Friends tab). */
export function RemoveFriendButton({ id, name, onAsk, decline }: { id: string; name: string; onAsk: (p: Pending) => void; decline?: boolean }) {
  return (
    <Button size="sm" variant="ghost" className="so-friend__remove" onClick={() => onAsk({ kind: 'friend', id, name })} aria-label={decline ? C.declineLabel(name) : C.removeFriendLabel(name)} data-testid={decline ? 'social-decline' : `social-friend-remove-${id}`}>
      <UserMinus size={14} aria-hidden /> {decline ? C.declineRequest : C.removeFriend}
    </Button>
  );
}

export type { Pending as OwnerPending };
