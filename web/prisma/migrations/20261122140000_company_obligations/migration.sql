-- Company-level obligations (spec: AI literacy under Art. 4 is a duty of the
-- company, not of each system). A SystemObligation now belongs to a client;
-- systemId is null for a company-level one, of which a client has at most
-- one per obligation.

BEGIN;

ALTER TABLE "SystemObligation" ADD COLUMN "clientId" TEXT;

-- Row-level security hides every row from the table owner when no
-- app.org_id is set (FORCE), so lift it for the data steps of this migration.
ALTER TABLE "SystemObligation" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Action" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AiSystem" NO FORCE ROW LEVEL SECURITY;
-- Validating the new foreign key reads "Client", which RLS would hide too.
ALTER TABLE "Client" NO FORCE ROW LEVEL SECURITY;

UPDATE "SystemObligation" so SET "clientId" = s."clientId" FROM "AiSystem" s WHERE s.id = so."systemId";

ALTER TABLE "SystemObligation" ALTER COLUMN "clientId" SET NOT NULL;
ALTER TABLE "SystemObligation" ALTER COLUMN "systemId" DROP NOT NULL;
ALTER TABLE "SystemObligation" ADD CONSTRAINT "SystemObligation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "SystemObligation_clientId_idx" ON "SystemObligation"("clientId");
CREATE UNIQUE INDEX "SystemObligation_company_unique"
  ON "SystemObligation"("clientId", "obligationKey") WHERE "systemId" IS NULL;

-- Existing AI literacy records (one per system): keep one per client as the
-- company-level record (the most recently assessed, else the oldest), and
-- retire the others with their open, unrequested actions.
WITH ranked AS (
  SELECT id, "clientId",
         row_number() OVER (PARTITION BY "clientId"
                            ORDER BY ("status" <> 'NOT_ASSESSED') DESC, "assessedAt" DESC NULLS LAST, "createdAt") AS rn
  FROM "SystemObligation"
  WHERE "obligationKey" = 'art4.literacy' AND active
)
UPDATE "SystemObligation" so SET "systemId" = NULL FROM ranked r WHERE so.id = r.id AND r.rn = 1;

DELETE FROM "Action" a USING "SystemObligation" so
  WHERE a."systemObligationId" = so.id AND so."obligationKey" = 'art4.literacy' AND so."systemId" IS NOT NULL
    AND a.status = 'OPEN' AND a."enquiryId" IS NULL;
UPDATE "SystemObligation" SET active = false
  WHERE "obligationKey" = 'art4.literacy' AND "systemId" IS NOT NULL;

ALTER TABLE "SystemObligation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Action" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AiSystem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;

COMMIT;
