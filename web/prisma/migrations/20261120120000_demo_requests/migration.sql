-- Demo requests from the public landing page.
--
-- A visitor has no account and no tenant, so a demo request is not tenant
-- data of its sender. It is addressed to the one organisation flagged
-- receivesDemoRequests (SenecAI, as the Hub's vendor), and only a
-- transaction acting in that organisation can read, update or delete it.
-- Every other tenant, and an anonymous visitor, can only insert a new row.

-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DemoRequesterType" AS ENUM ('LAW_FIRM', 'CONSULTANCY', 'COMPANY', 'OTHER');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "receivesDemoRequests" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "requesterType" "DemoRequesterType" NOT NULL,
    "role" TEXT,
    "message" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
    "handledById" TEXT,
    "handledByName" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoRequest_createdAt_idx" ON "DemoRequest"("createdAt");


-- At most one organisation receives demo requests.
CREATE UNIQUE INDEX "Organization_one_demo_request_receiver"
  ON "Organization" ("receivesDemoRequests") WHERE "receivesDemoRequests";

-- The flag decides who can read other people's requests, so the app can't
-- set it: only a migration, or the seed with app.allow_vendor_flag on.
CREATE FUNCTION organization_vendor_flag_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."receivesDemoRequests"
     AND (TG_OP = 'INSERT' OR NOT OLD."receivesDemoRequests")
     AND current_user = 'hub_app'
     AND current_setting('app.allow_vendor_flag', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'receivesDemoRequests can only be set by a migration';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER organization_vendor_flag_guard
  BEFORE INSERT OR UPDATE OF "receivesDemoRequests" ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION organization_vendor_flag_guard();

-- Existing databases: flag the SenecAI consultancy if there is exactly one.
-- FORCE row-level security hides every organisation from the table owner
-- when no app.org_id is set, so lift it for this one statement.
ALTER TABLE "Organization" NO FORCE ROW LEVEL SECURITY;
UPDATE "Organization" SET "receivesDemoRequests" = true
  WHERE name = 'SenecAI' AND type = 'CONSULTANCY'
    AND (SELECT count(*) FROM "Organization" WHERE name = 'SenecAI' AND type = 'CONSULTANCY') = 1;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;

-- SET search_path: the body is resolved when it runs, under the hub_app
-- role, whose search_path would not find the app's schema.
CREATE FUNCTION app_receives_demo_requests() RETURNS boolean LANGUAGE sql STABLE
  SET search_path FROM CURRENT AS $$
  SELECT EXISTS (SELECT 1 FROM "Organization" o WHERE o.id = app_org_id() AND o."receivesDemoRequests")
$$;
GRANT EXECUTE ON FUNCTION app_receives_demo_requests() TO hub_app;
GRANT EXECUTE ON FUNCTION organization_vendor_flag_guard() TO hub_app;

ALTER TABLE "DemoRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemoRequest" FORCE ROW LEVEL SECURITY;
-- Anyone may send a request, but only a fresh, unhandled one.
CREATE POLICY demo_request_insert ON "DemoRequest" FOR INSERT
  WITH CHECK (status = 'NEW' AND "handledById" IS NULL AND "handledAt" IS NULL);
CREATE POLICY demo_request_read ON "DemoRequest" FOR SELECT USING (app_receives_demo_requests());
CREATE POLICY demo_request_update ON "DemoRequest" FOR UPDATE
  USING (app_receives_demo_requests()) WITH CHECK (app_receives_demo_requests());
-- Deleting serves erasure requests and the retention period.
CREATE POLICY demo_request_delete ON "DemoRequest" FOR DELETE USING (app_receives_demo_requests());
GRANT SELECT, INSERT, UPDATE, DELETE ON "DemoRequest" TO hub_app;
