/**
 * Side-effect imports that register every creature visual. OWNER: lane "fishart" (fish) + lane "critterart" (special).
 * Each lane keeps its own barrel: ./fish/index.ts and ./special/index.ts.
 */
import './fish';
import './special';
export { getCreatureFactory } from './registry';
