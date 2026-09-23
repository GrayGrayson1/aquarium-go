/**
 * Standalone entry for the critterart gallery (served by /src/dev/sandboxes/critterart-gallery.html) so visual QA
 * of creatures doesn't depend on the rest of the app compiling. OWNER: lane "critterart".
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import CritterartGallery from './critterart-gallery';

createRoot(document.getElementById('root')!).render(createElement(CritterartGallery));
