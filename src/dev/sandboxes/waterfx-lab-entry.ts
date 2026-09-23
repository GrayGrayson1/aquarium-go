/** Standalone entry for waterfx-lab.html (independent of App/UI). Lane "waterfx" internal test harness. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import '@/dev/debugHooks';
import WaterfxLab from './waterfx-lab';

const el = document.getElementById('root');
if (el) createRoot(el).render(createElement(WaterfxLab));
