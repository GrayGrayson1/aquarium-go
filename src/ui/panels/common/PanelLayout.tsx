/**
 * Shared chrome for every management panel: header (icon, serif title, subtitle), maximise/close, a sticky toolbar
 * row for tabs/filters, a scrolling body and an optional sticky footer. OWNER: lane "ui-panels".
 */
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
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

export function PanelLayout({ title, icon, subtitle, toolbar, children, footer, scrollKey, headerExtra }: { title: ReactNode; icon?: ReactNode; subtitle?: ReactNode; toolbar?: ReactNode; children: ReactNode; footer?: ReactNode; /** Scroll the body back to top when this changes (tab switches). */ scrollKey?: string; headerExtra?: ReactNode }) {
  const { close, maximised, toggleMax, phone, bottom = phone, startDrag } = useSheet();
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  return (
    <div className="pn-layout">
      <header className="pn-head" onPointerDown={bottom ? startDrag : undefined}>
        {bottom && <div className="pn-grab" aria-hidden />}
        <div className="pn-head__row">
          {icon && <span className="pn-head__icon">{icon}</span>}
          <div className="pn-head__titles">
            <h2 className="pn-head__title">{title}</h2>
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
      <div ref={bodyRef} className={clsx('pn-body')} tabIndex={-1}>
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
