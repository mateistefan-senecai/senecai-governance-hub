-- Tenant isolation in the data layer (concept note §11).
--
-- Every request runs inside a transaction that first sets
--   app.user_id  — the signed-in user
--   app.org_id   — the organisation they are acting in
-- (see src/lib/tenant.ts). The policies below hide every row of another
-- organisation. If the settings are missing, nothing is visible: the
-- policies fail closed.
--
-- FORCE makes the policies apply to the table owner too, because the app
-- connects as the same role that owns the tables (e.g. Neon's default role).
-- Only a superuser bypasses them.

CREATE FUNCTION app_org_id() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.org_id', true), '') $$;
CREATE FUNCTION app_user_id() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

-- Tables whose rows belong to exactly one organisation.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Client', 'ClientAssignment', 'AiSystem', 'VendorDocument', 'Classification',
    'SystemObligation', 'Action', 'Enquiry', 'AuditEvent'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("organizationId" = app_org_id()) WITH CHECK ("organizationId" = app_org_id())',
      t
    );
  END LOOP;
END $$;

-- Memberships: visible inside the active organisation, and a user can always
-- see their own (needed to list the organisations they can switch to).
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Membership"
  USING ("organizationId" = app_org_id() OR "userId" = app_user_id())
  WITH CHECK ("organizationId" = app_org_id());

-- Organisations: the active one, plus those the user is a member of.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Organization"
  USING (
    id = app_org_id()
    OR EXISTS (SELECT 1 FROM "Membership" m WHERE m."organizationId" = "Organization".id AND m."userId" = app_user_id())
  )
  WITH CHECK (id = app_org_id());

-- "User" (global identity, needed before an organisation is known at login)
-- and "ContentVersion" (shared legal content) are deliberately not
-- tenant-scoped.

-- The audit log is append-only. Deletion is allowed only as part of an
-- explicit purge of an organisation's data (retention / client deletion),
-- which sets app.allow_purge for that transaction.
CREATE FUNCTION audit_event_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditEvent is append-only';
END $$;
CREATE TRIGGER audit_event_append_only
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_append_only();
