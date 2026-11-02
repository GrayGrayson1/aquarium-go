/**
 * chunk 19 (ADR-0055 decision 4, QOL-005) — the decor tool hint's buttons for the piece in hand: turn it (in R's 15°
 * steps) and size it (as Shift+wheel does). DecorEditor sets these while it is mounted; touch players have no R key
 * or wheel. OWNER: lane "aquascape".
 */
export const ghostControls: { turn: ((steps: number) => void) | null; size: ((factor: number) => void) | null } = { turn: null, size: null };
