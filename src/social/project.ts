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

/** The Free organization "Aquarium Go", project `aquarium-go` (ref zkavcxrsxdgdlstravpj, us-east-1), set up 2026-10-19. */
export const ONLINE_PROJECT: OnlineProject | null = { url: 'https://zkavcxrsxdgdlstravpj.supabase.co', publishableKey: 'sb_publishable_6_05nIKMwdOtelVdC27QHQ_QgNWjagA' };

/**
 * chunk 12 (SHARED-SHOPS.md §5.8) — the shared-shop server: the free Render web service `aquarium-go-shops`
 * (srv-dbbt6gbncjis73c23br0, ADR-0046), which wakes on `/health` and plays shops at `/shop`. Public, like the project's
 * address. Chunk 13's screens connect to it.
 */
export const SHARED_SHOP_SERVER: string | null = 'https://aquarium-go-shops.onrender.com';
