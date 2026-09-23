/**
 * Standalone entry for the fishart sandboxes (lane "fishart", dev only) so visual QA does not depend on the rest of
 * the app compiling. Open /src/dev/sandboxes/fishart-standalone.html?s=gallery (or s=tank).
 */
import { createElement, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

const which = new URLSearchParams(location.search).get('s') ?? 'gallery';
const loaders: Record<string, () => Promise<{ default: ComponentType }>> = {
  gallery: () => import('./fishart-gallery'),
  tank: () => import('./fishart-tank'),
  portraits: () => import('./fishart-portraits'),
};
(loaders[which] ?? loaders.gallery)().then((m) => {
  createRoot(document.getElementById('root')!).render(createElement(m.default));
});
