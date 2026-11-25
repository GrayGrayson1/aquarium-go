/**
 * chunk 21 (review S8) — morph catalogs built off the critical path for the Collection and the Encyclopedia's subtitle.
 * OWNER: lane "encyclopedia". A catalog takes up to about 55 ms to build at once (betta; 160–230 ms for all 97 species,
 * measured in Node on the owner's Mac), so a screen that needs some asks here: whatever isn't built yet is queued and
 * built in slices of about SLICE_MS (warmCatalog walks STEP genotypes per call; the slicing never changes a catalog),
 * one slice per task, so no frame is held for long (the longest slice measured 11 ms, against 160–230 ms at once).
 * Catalogs are cached for the session (src/sim/life/morphCatalog.ts), so this is paid once. Components re-render once,
 * when everything they asked for is ready (useCatalogsReady).
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { SpeciesDefinition } from '@/types';
import { catalogReady, warmCatalog } from '@/sim/life/morphCatalog';

/** A slice stops starting new calls after this long (ms of wall time), then yields to the browser. */
export const SLICE_MS = 5;
/**
 * Genotypes walked per warmCatalog call: at most about 2 ms on a desktop (betta, fancy guppy); the call that finishes a
 * catalog adds its shares and colour tree, up to about 6 ms (betta). Measured in Node on the owner's Mac under load.
 */
export const STEP = 500;

const queue: SpeciesDefinition[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Are all of these species' catalogs built? (Builds nothing.) */
export function catalogsReady(species: readonly SpeciesDefinition[]): boolean {
  for (const sp of species) if (!catalogReady(sp)) return false;
  return true;
}

/** One slice: build from the front of the queue until SLICE_MS has passed, then yield to the browser. */
function pump(): void {
  timer = null;
  const start = performance.now();
  let finished = false;
  while (queue.length && performance.now() - start < SLICE_MS) {
    if (warmCatalog(queue[0], STEP)) {
      queue.shift();
      finished = true;
    }
  }
  if (finished) for (const f of [...listeners]) f();
  if (queue.length) timer = setTimeout(pump, 0);
}

/** Queue whatever of these species' catalogs isn't built yet. True when all are already built. */
export function requestCatalogs(species: readonly SpeciesDefinition[]): boolean {
  let ready = true;
  for (const sp of species) {
    if (catalogReady(sp)) continue;
    ready = false;
    if (!queue.includes(sp)) queue.push(sp);
  }
  if (!ready && timer === null) timer = setTimeout(pump, 0);
  return ready;
}

function subscribe(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/**
 * Are these species' catalogs ready? If not, they are queued (after the first render, never during one), and the
 * component renders again once, when they all are. `key` names the list (a new key asks again).
 */
export function useCatalogsReady(species: readonly SpeciesDefinition[], key: string): boolean {
  const ready = useSyncExternalStore(
    subscribe,
    () => catalogsReady(species),
    () => catalogsReady(species),
  );
  useEffect(() => {
    if (!ready) requestCatalogs(species);
  }, [ready, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return ready;
}
