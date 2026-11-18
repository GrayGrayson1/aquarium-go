/**
 * Shared chrome for every management panel: header (icon, serif title, subtitle), maximise/close, a sticky toolbar
 * row for tabs/filters, a scrolling body and an optional sticky footer. OWNER: lane "ui-panels".
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { IconButton } from '@/ui/kit';

export interface SheetCtx {
  close: () => void;
  maximised: boolean;
  toggleMax: () => void;
  phone: boolean;
  /** Bottom-sheet presentation (phones + upright tablets). */
  bottom?: boolean;
  /** Pointer-down on the header starts a drag-to-dismiss on phones. */
  startDrag?: (e: React.PointerEvent) => void;
  /** Expand / restore the sheet (bottom sheets: full height vs half). */
  setMax?: (v: boolean) => void;
}

export const SheetContext = createContext<SheetCtx>({ close: () => {}, maximised: false, toggleMax: () => {}, phone: false });
export const useSheet = () => useContext(SheetContext);

/** Where a list was, and whether a sub-view (an offer, a species page, a show's entry) covers it. */
export interface ListPlace {
  list?: string;
  sub?: boolean;
}

/**
 * Audit B7 — where the body scrolls when `scrollKey` changes: coming back from a sub-view to the list it opened from,
 * where the player left that list; anything else (a tab switch, a sub-view opening), the top.
 */
export function scrollTopFor(prev: ListPlace, next: ListPlace, tops: ReadonlyMap<string, number>): number {
  return next.list !== undefined && !next.sub && !!prev.sub && prev.list === next.list ? (tops.get(next.list) ?? 0) : 0;
}

export function PanelLayout({ title, icon, subtitle, toolbar, children, footer, scrollKey, listKey, subOpen, headerExtra }: {
  title: ReactNode; icon?: ReactNode; subtitle?: ReactNode; toolbar?: ReactNode; children: ReactNode; footer?: ReactNode;
  /** Scroll the body back to top when this changes (tab switches). */
  scrollKey?: string;
  /** audit B7: the list on screen when no sub-view is open (the tab), and whether one is: back from it, the list's scroll returns. */
  listKey?: string;
  subOpen?: boolean;
  headerExtra?: ReactNode;
}) {
  const { close, maximised, toggleMax, phone, bottom = phone, startDrag } = useSheet();
  const bodyRef = useRef<HTMLDivElement>(null);
  const tops = useRef(new Map<string, number>());
  const place = useRef<ListPlace>({ list: listKey, sub: subOpen });
  // (before paint: the list has just rendered again, so its old place exists and nothing flashes at the top first)
  useLayoutEffect(() => {
    const next = { list: listKey, sub: subOpen };
    bodyRef.current?.scrollTo({ top: scrollTopFor(place.current, next, tops.current) });
    place.current = next;
  }, [scrollKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => {
    const el = bodyRef.current;
    if (el && listKey !== undefined && !subOpen) tops.current.set(listKey, el.scrollTop);
  };
  return (
    <div className="pn-layout">
      <header className="pn-head" onPointerDown={bottom ? startDrag : undefined}>
        {bottom && <div className="pn-grab" aria-hidden />}
        <div className="pn-head__row">
          {icon && <span className="pn-head__icon">{icon}</span>}
          <div className="pn-head__titles">
            {/* lane:ui-shell (chunk 1, §18) — opening a panel moves focus to its title (PanelHost) */}
            <h2 className="pn-head__title" tabIndex={-1}>
              {title}
            </h2>
            {subtitle && <div className="pn-head__sub">{subtitle}</div>}
          </div>
          {headerExtra}
          <IconButton label={maximised ? 'Restore panel size' : 'Expand panel'} onClick={toggleMax} className="pn-head__btn pn-head__max">
            {maximised ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </IconButton>
          <IconButton label="Close panel" onClick={close} className="pn-head__btn" data-testid="panel-close">
            <X size={19} />
          </IconButton>
        </div>
        {toolbar && <div className="pn-head__toolbar">{toolbar}</div>}
      </header>
      <div ref={bodyRef} className={clsx('pn-body')} tabIndex={-1} onScroll={listKey !== undefined ? onScroll : undefined}>
        {children}
      </div>
      {footer && <footer className="pn-foot">{footer}</footer>}
    </div>
  );
}

/**
 * Drill-downs on a half-open phone sheet (offer detail with its sticky buy bar, species page, listing wizard) leave a
 * ~130px window to read in: expand the sheet while the view is mounted and drop back to half height when it goes.
 */
export function useExpandSheet(): void {
  const { bottom, maximised, setMax } = useSheet();
  const ref = useRef({ bottom, maximised, setMax });
  ref.current = { bottom, maximised, setMax };
  useEffect(() => {
    const { bottom, maximised, setMax } = ref.current;
    if (!bottom || maximised || !setMax) return;
    setMax(true);
    return () => ref.current.setMax?.(false);
  }, []);
}

/** A sub-view inside a panel with its own back button (offer detail, species page, wizard). */
export function SubView({ onBack, backLabel = 'Back', title, children, actions }: { onBack: () => void; backLabel?: string; title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  useExpandSheet();
  return (
    <div className="pn-subview">
      <div className="pn-subview__bar">
        <button type="button" className="pn-back" onClick={onBack}>
          <span aria-hidden>←</span> {backLabel}
        </button>
        {title && <div className="pn-subview__title">{title}</div>}
        {actions}
      </div>
      {children}
    </div>
  );
}
