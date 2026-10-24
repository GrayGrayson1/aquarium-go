/**
 * Scenario links (chunk 15, ADR-0051 decision 3): `?scenario=<preset>` names a built-in or a kept preset, and
 * `?recipe=<text>` carries a whole recipe (UTF-8 JSON in base64url), so an agent can hand the owner a link. Both are
 * read only where the developer tools are allowed (src/state/devTools.ts); the live site ignores them.
 */

/** UTF-8 JSON → base64url (no padding). */
export function encodeRecipeParam(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url → the JSON text, or null when it isn't one. */
export function decodeRecipeParam(param: string): string | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** What the address asks the lab for: open the lab, a preset by name, or a recipe's text. */
export interface LabAddress {
  lab: boolean;
  preset: string | null;
  recipe: string | null;
}

export function readLabAddress(search: string): LabAddress {
  try {
    const q = new URLSearchParams(search);
    const raw = q.get('recipe');
    return { lab: q.get('lab') === '1', preset: q.get('scenario') || null, recipe: raw ? decodeRecipeParam(raw) : null };
  } catch {
    return { lab: false, preset: null, recipe: null };
  }
}
