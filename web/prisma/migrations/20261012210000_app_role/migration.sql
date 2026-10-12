-- Every request switches to this role for its transaction (src/lib/tenant.ts).
--
-- Why: row-level security does not apply to roles with BYPASSRLS or
-- SUPERUSER, and on managed Postgres (e.g. Neon) the role the app logs in
-- with may have such attributes. Role attributes are not inherited through
-- membership, so after SET ROLE hub_app the transaction runs without them
-- and the tenant policies always apply, whatever role the app connects as.
--
-- The connecting role needs CREATEROLE to run this migration once.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hub_app') THEN
    CREATE ROLE hub_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  -- Let the connecting role switch to hub_app. Since PostgreSQL 16 the
  -- creator of a role is not automatically allowed to SET to it.
  IF current_setting('server_version_num')::int >= 160000 THEN
    EXECUTE format('GRANT hub_app TO %I WITH SET TRUE, INHERIT FALSE', current_user);
  ELSE
    EXECUTE format('GRANT hub_app TO %I', current_user);
  END IF;
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO hub_app', current_schema());
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO hub_app', current_schema());
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hub_app', current_schema());
  EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO hub_app', current_schema());
END $$;

-- The migration history is not the app's business.
REVOKE ALL ON "_prisma_migrations" FROM hub_app;
