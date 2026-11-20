-- PDF deliverables (spec §4, concept note §6–7): Document and DocumentFile.

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('INVENTORY', 'CLASSIFICATION', 'OBLIGATIONS', 'GAP_ASSESSMENT', 'ROADMAP', 'PACK');

-- CreateEnum
CREATE TYPE "DocumentState" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'RELEASED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "DocumentState" NOT NULL DEFAULT 'DRAFT',
    "inputHash" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "narrative" JSONB NOT NULL,
    "narrativeSource" TEXT NOT NULL DEFAULT 'RULES',
    "outdated" BOOLEAN NOT NULL DEFAULT false,
    "outdatedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewerName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "reviewComment" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "state" "DocumentState" NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_organizationId_clientId_idx" ON "Document"("organizationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_clientId_kind_version_key" ON "Document"("clientId", "kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFile_documentId_state_key" ON "DocumentFile"("documentId", "state");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Tenant isolation ──────────────────────────────────────────────────────
-- Same policy as every tenant table (migration row_level_security): a row is
-- visible and writable only inside its own organisation.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Document', 'DocumentFile'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("organizationId" = app_org_id()) WITH CHECK ("organizationId" = app_org_id())',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO hub_app', t);
  END LOOP;
END $$;

-- ── Nothing is approved without a named reviewer ─────────────────────────
ALTER TABLE "Document" ADD CONSTRAINT "Document_approved_needs_reviewer" CHECK (
  "state" NOT IN ('APPROVED', 'RELEASED')
  OR ("reviewerId" IS NOT NULL AND "reviewerName" IS NOT NULL AND btrim("reviewerName") <> '' AND "approvedAt" IS NOT NULL)
);
ALTER TABLE "Document" ADD CONSTRAINT "Document_released_needs_release" CHECK (
  "state" <> 'RELEASED' OR ("releasedById" IS NOT NULL AND "releasedAt" IS NOT NULL)
);

-- ── Documents are immutable snapshots ────────────────────────────────────
-- Only the workflow fields may change, only along the state machine of
-- concept note §7, and an outdated document can never be approved,
-- released, or made current again. Versions are never deleted, except in an
-- explicit purge of an organisation's data (app.allow_purge, as for the
-- audit log). Foreign keys bypass row-level security, so inserts also check
-- that the client (or document) belongs to the same organisation.
CREATE FUNCTION document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('app.allow_purge', true) = 'on' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Document versions are kept: they cannot be deleted';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "Client" c WHERE c.id = NEW."clientId" AND c."organizationId" = NEW."organizationId") THEN
      RAISE EXCEPTION 'Document client is not in this organisation';
    END IF;
    IF NEW."state" <> 'DRAFT' OR NEW."outdated" THEN
      RAISE EXCEPTION 'A new document version starts as a current draft';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."id" <> OLD."id" OR NEW."organizationId" <> OLD."organizationId" OR NEW."clientId" <> OLD."clientId"
     OR NEW."kind" <> OLD."kind" OR NEW."version" <> OLD."version" OR NEW."inputHash" <> OLD."inputHash"
     OR NEW."contentVersion" <> OLD."contentVersion" OR NEW."snapshot" <> OLD."snapshot"
     OR NEW."narrative" <> OLD."narrative" OR NEW."narrativeSource" <> OLD."narrativeSource"
     OR NEW."createdById" <> OLD."createdById" OR NEW."createdByName" <> OLD."createdByName"
     OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'Document snapshot is immutable: generate a new version instead';
  END IF;

  IF OLD."outdated" AND NOT NEW."outdated" THEN
    RAISE EXCEPTION 'An outdated document cannot be made current again: generate a new version';
  END IF;

  IF OLD."approvedAt" IS NOT NULL AND (
       NEW."reviewerId" IS DISTINCT FROM OLD."reviewerId" OR NEW."reviewerName" IS DISTINCT FROM OLD."reviewerName"
       OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt") THEN
    RAISE EXCEPTION 'The approval of a document is locked';
  END IF;
  IF OLD."releasedAt" IS NOT NULL AND (
       NEW."releasedById" IS DISTINCT FROM OLD."releasedById" OR NEW."releasedAt" IS DISTINCT FROM OLD."releasedAt") THEN
    RAISE EXCEPTION 'The release of a document is locked';
  END IF;

  IF NEW."state" <> OLD."state" THEN
    IF NOT ((OLD."state"::text, NEW."state"::text) IN (
      ('DRAFT', 'IN_REVIEW'), ('IN_REVIEW', 'DRAFT'), ('IN_REVIEW', 'APPROVED'), ('APPROVED', 'RELEASED')
    )) THEN
      RAISE EXCEPTION 'Illegal document transition % -> %', OLD."state", NEW."state";
    END IF;
    IF NEW."state" IN ('IN_REVIEW', 'APPROVED', 'RELEASED') AND NEW."outdated" THEN
      RAISE EXCEPTION 'An outdated document cannot move forward: generate a new version';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER document_guard
  BEFORE INSERT OR UPDATE OR DELETE ON "Document"
  FOR EACH ROW EXECUTE FUNCTION document_guard();

-- A rendered PDF is never edited or replaced.
CREATE FUNCTION document_file_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "Document" d WHERE d.id = NEW."documentId" AND d."organizationId" = NEW."organizationId") THEN
      RAISE EXCEPTION 'Document file does not belong to a document of this organisation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND current_setting('app.allow_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Document files are immutable';
END $$;

CREATE TRIGGER document_file_guard
  BEFORE INSERT OR UPDATE OR DELETE ON "DocumentFile"
  FOR EACH ROW EXECUTE FUNCTION document_file_guard();

-- The trigger functions look up "Client" and "Document" when they run, so
-- they carry the app's schema (DB_SCHEMA, `hub` by default) on their path.
DO $$
BEGIN
  EXECUTE format('ALTER FUNCTION document_guard() SET search_path = %I, pg_temp', current_schema());
  EXECUTE format('ALTER FUNCTION document_file_guard() SET search_path = %I, pg_temp', current_schema());
END $$;

GRANT EXECUTE ON FUNCTION document_guard() TO hub_app;
GRANT EXECUTE ON FUNCTION document_file_guard() TO hub_app;
