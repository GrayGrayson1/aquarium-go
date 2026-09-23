/**
 * Registers "Fraunces Display": the full-axis Fraunces (opsz / SOFT / WONK + italic) bundled with
 * @fontsource-variable/fraunces (SIL OFL 1.1). Used for the wordmark and creature names so we can use the
 * soft, high-optical-size cut. Falls back to 'Fraunces Variable' until loaded. OWNER: lane "ui-shell".
 */
import normalUrl from '@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2?url';
import italicUrl from '@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2?url';

let done = false;

export function registerDisplayFont(): void {
  if (done || typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  done = true;
  const faces = [
    new FontFace('Fraunces Display', `url(${normalUrl}) format('woff2')`, { weight: '100 900', style: 'normal', display: 'swap' }),
    new FontFace('Fraunces Display', `url(${italicUrl}) format('woff2')`, { weight: '100 900', style: 'italic', display: 'swap' }),
  ];
  for (const f of faces) {
    document.fonts.add(f);
    f.load().catch(() => {
      /* fall back to Fraunces Variable */
    });
  }
}
