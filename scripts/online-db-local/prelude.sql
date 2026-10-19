-- chunk 8 — a stand-in for what a Supabase project provides, for scripts/online-db-local/run.sh: the roles, the auth
-- schema with auth.users and auth.uid() (from request.jwt.claim.sub), Supabase's default privileges on public (so the
-- migration's revokes are tested against them) and pgcrypto in the extensions schema. Not Supabase itself: the live
-- smoke test (scripts/online-smoke.mjs) checks the real project.
-- A stand-in for what Supabase provides: roles, the auth schema, auth.uid(), default privileges, pgcrypto.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create role supabase_auth_admin nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, encrypted_password text, raw_user_meta_data jsonb, created_at timestamptz default now());
create table auth.audit_log_entries (instance_id uuid, id uuid primary key default gen_random_uuid(), payload json, created_at timestamptz default now(), ip_address varchar(64) default '');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, supabase_auth_admin;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, update, delete on auth.users to supabase_auth_admin;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema extensions;
create extension pgcrypto schema extensions;
