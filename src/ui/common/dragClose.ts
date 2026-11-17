/**
 * Audit 2026-11-17, B18 — a phone sheet's grab bar and header close it on a downward swipe, as the panels do
 * (src/ui/panels/PanelHost.tsx): More, Settings and the tank card drew the same bar but ignored the swipe. The rule and
 * where a drag may start, shared by those sheets. OWNER: lane "ui-shell".
 */

/** PanelHost's rule: 120 px down, or a flick faster than 700 px/s. */
export const swipedDown = (info: { offset: { y: number }; velocity: { y: number } }): boolean => info.offset.y > 120 || info.velocity.y > 700;

/** Controls keep their own press: a drag never starts on one. */
const CONTROLS = 'button, input, select, textarea, a, [role="tab"], [role="radio"], [role="switch"], [role="slider"]';

/** Does a press here start the sheet's drag? On its chrome (`chrome`: its grab bar and header), never on a control or its list. */
export function startsDrag(target: EventTarget | null, chrome: string): boolean {
  const t = target as Element | null;
  if (!t || typeof t.closest !== 'function') return false;
  return !t.closest(CONTROLS) && !!t.closest(chrome);
}
