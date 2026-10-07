/**
 * Copy link on an offer (0.5 spec §6.6, §16; NAV-015): the offer's share link (no query flags, so never `?dev=1`)
 * goes to the clipboard through the platform; the button reads "Link copied" for 4 s, and a row under the back bar
 * shows the link, selected for a manual copy when the clipboard refused. OWNER: lane "ui-panels".
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, Link as LinkIcon } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { platform } from '@/platform';
import { shareUrl } from '@/ui/nav/routes';

/** How long the button says "Link copied". */
export const COPIED_MS = 4000;

export function useOfferLink(offerId: string) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (state !== 'copied') return;
    const t = window.setTimeout(() => setState('idle'), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [state]);
  const copy = async () => {
    const link = shareUrl({ kind: 'panel', panel: 'market', tab: 'shop', target: `offer:${offerId}` });
    setUrl(link);
    let ok = false;
    try {
      ok = await platform().clipboard.write(link);
    } catch {
      ok = false;
    }
    sfx(ok ? 'confirm' : 'error');
    setState(ok ? 'copied' : 'failed');
  };
  return { state, url, copy };
}

export function CopyLinkButton({ link, phone }: { link: ReturnType<typeof useOfferLink>; phone: boolean }) {
  const copied = link.state === 'copied';
  return (
    <>
      <button
        type="button"
        className={clsx('ag-btn ag-btn--sm pn-copylink', phone && 'pn-copylink--icon', copied && 'is-copied')}
        data-testid="offer-copy-link"
        aria-label={phone ? (copied ? 'Link copied' : 'Copy link to this offer') : undefined}
        title={phone ? undefined : 'Copy link to this offer'}
        onClick={() => void link.copy()}
      >
        {copied ? <Check size={14} aria-hidden /> : <LinkIcon size={14} aria-hidden />}
        {!phone && (copied ? 'Link copied' : 'Copy link')}
      </button>
      <span className="pn-sr" role="status">
        {copied ? 'Link copied' : ''}
      </span>
    </>
  );
}

export function OfferLinkRow({ link }: { link: ReturnType<typeof useOfferLink> }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // the clipboard refused: the link is ready to copy by hand
    if (link.state === 'failed') {
      input.current?.focus({ preventScroll: true });
      input.current?.select();
    }
  }, [link.state]);
  if (!link.url) return null;
  return (
    <div className={clsx('pn-linkrow', link.state === 'failed' && 'is-manual')} data-testid="offer-link-row">
      <LinkIcon size={14} aria-hidden />
      <input ref={input} className="pn-linkrow__url" readOnly value={link.url} aria-label="Link to this offer" onFocus={(e) => e.currentTarget.select()} />
    </div>
  );
}
