-- ============================================================================
-- EntegreFlow — Postgres cluster bootstrap (runs once on first init).
--
-- Establishes the TWO-ROLE security model:
--   entegreflow_owner : BYPASSRLS, owns the schema. Used by migrate/seed/auth.
--   entegreflow_app   : NOBYPASSRLS, RLS-enforced. Used by api + worker runtime,
--                       with a FAIL-CLOSED sentinel default for app.tenant_id.
--
-- For Coolify-managed Postgres, run the equivalent statements once by hand
-- (passwords come from your secret store, not this file).
-- ============================================================================

CREATE ROLE entegreflow_owner LOGIN PASSWORD 'owner_pw' BYPASSRLS;
CREATE ROLE entegreflow_app LOGIN PASSWORD 'app_pw' NOBYPASSRLS;

-- Fail-closed: an unset tenant resolves to an impossible UUID, never NULL, so
-- RLS policies match zero rows instead of erroring or matching everything.
ALTER ROLE entegreflow_app SET app.tenant_id = '00000000-0000-0000-0000-000000000000';
ALTER ROLE entegreflow_app SET app.user_id = '';

-- Owner needs database-level CREATE (Drizzle creates a `drizzle` metadata schema).
GRANT ALL PRIVILEGES ON DATABASE entegreflow TO entegreflow_owner;

-- Schema ownership: owner creates objects; app may only use them.
ALTER SCHEMA public OWNER TO entegreflow_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO entegreflow_app;
GRANT CREATE ON SCHEMA public TO entegreflow_owner;

-- Per-table DML grants for the app role are issued by the migrate step
-- (packages/db buildRlsStatements), table by table, least privilege.
