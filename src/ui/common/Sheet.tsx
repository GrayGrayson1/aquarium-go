/**
 * Responsive sheet: slides in from the side on desktop, becomes a bottom sheet on phones. Never a permanent layer
 * over the aquarium. Bottom sheets open at about half height (tap the handle to expand).
 *
 * Occlusion contract with the renderer: the root carries `data-occlude="right" | "left" | "bottom"` so the camera
 * frames the aquarium in the part of the screen the sheet leaves free (src/render/camera/viewport.ts).
 * OWNER: lane "ui-shell".
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { isTextEntry, SHORT_LANDSCAPE_QUERY, useMedia } from './safe';

/** Phones (either way up), and tablets held upright, get bottom sheets so the tank stays visible above. */
export const BOTTOM_SHEET_QUERY = `(max-width: 720px), (max-width: 1000px) and (orientation: portrait), ${SHORT_LANDSCAPE_QUERY}`;

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  /** Header content (replaces the default title row). */
  header?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  testId?: string;
  className?: string;
  label: string;
  /** Close on Escape (default true). */
  escToClose?: boolean;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, side = 'right', children, header, title, subtitle, testId, className, label, escToClose = true, footer }: SheetProps) {
  const mobile = useMedia(BOTTOM_SHEET_QUERY);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open || !escToClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (isTextEntry(t)) return;
      if (document.querySelector('.ag-modal-backdrop')) return;
      // a slider / select / switch keeps Escape too: it lets go of the field and the sheet closes in one press
      if (t && t !== document.body && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) t.blur();
      e.preventDefault();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, escToClose]);

  // Keyboard users: when opened from a focused control, move focus into the sheet and restore it on close.
  // (Opening by clicking a fish in the 3D scene leaves focus alone.)
  const sheetRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const fromControl = !!opener && opener !== document.body && !!opener.closest?.('button, [role="button"], a');
    if (fromControl) {
      const t = window.setTimeout(() => sheetRef.current?.querySelector<HTMLElement>('.ag-sheet__close')?.focus({ preventScroll: true }), 60);
      return () => {
        window.clearTimeout(t);
        if (!opener || !sheetRef.current?.contains(document.activeElement)) return;
        if (document.contains(opener)) opener.focus({ preventScroll: true });
        else {
          // the opener is gone (a Livestock row closes its panel to show the card): back to that panel's dock button
          const panel = opener.closest<HTMLElement>('[data-testid^="panel-"]')?.dataset.testid?.slice(6);
          if (panel) document.querySelector<HTMLElement>(`[data-testid="dock-${panel}"]`)?.focus({ preventScroll: true });
        }
      };
    }
  }, [open]);

  const from = mobile ? { y: '100%', x: 0, opacity: 1 } : { x: side === 'right' ? 40 : -40, y: 0, opacity: 0 };
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          ref={sheetRef}
          key={mobile ? 'm' : 'd'}
          className={clsx('ag-sheet', `ag-sheet--${mobile ? 'bottom' : side}`, mobile && expanded && 'is-expanded', className)}
          data-testid={testId}
          data-occlude={mobile ? 'bottom' : side}
          aria-label={label}
          role="complementary"
          initial={from}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={from}
          transition={{ type: 'spring', stiffness: 360, damping: 36, mass: 0.9 }}
        >
          {mobile && <SheetHandle expanded={expanded} onToggle={() => setExpanded((v) => !v)} />}
          <div className="ag-sheet__head">
            {header ?? (
              <div className="ag-grow">
                {title && <h2 className="ag-sheet__title">{title}</h2>}
                {subtitle && <div className="ag-sheet__sub">{subtitle}</div>}
              </div>
            )}
            <button type="button" className="ag-sheet__close" aria-label={`Close ${label}`} onClick={() => { sfx('close'); onClose(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="ag-sheet__body">{children}</div>
          {footer && <div className="ag-sheet__foot">{footer}</div>}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function SheetHandle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="ag-sheet__handle" aria-label={expanded ? 'Shrink sheet' : 'Expand sheet'} aria-expanded={expanded} onClick={onToggle}>
      <span aria-hidden />
    </button>
  );
}
