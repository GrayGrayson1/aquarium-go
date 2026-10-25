/** Save schema version. Bump when GameState shape changes and add a migration in migrations.ts. OWNER: core. */
// lane:automation (chunk 5, INTAKE C-44) — 2: the S3-D state (an older build reports such a save as too_new).
// chunk 16 (ADR-0052 decision 5) — 3: the 31 new species (an older build reports a save holding one as too_new).
export const SCHEMA_VERSION = 3;
