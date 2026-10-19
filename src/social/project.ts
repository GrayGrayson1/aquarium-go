/**
 * chunk 8 (ADR-0038 decision 5, ADR-0040 decision 1; docs/agent/design/ONLINE-STAGE1.md §2, §3) — the Supabase project
 * the players' build talks to: its address and its publishable (anon) key, both public by design (the database's own
 * rules protect the data: no table access, functions that check who is asking). null until the project is set up;
 * with null the players' build shows no Social, as before chunk 8. Never the secret (service_role) key. OWNER: lane
 * "social".
 */
export interface OnlineProject {
  url: string;
  publishableKey: string;
}

export const ONLINE_PROJECT: OnlineProject | null = null;
