-- Notifications to the client (classification confirmed or overridden, document
-- released): shown in the client's Updates panel and emailed to its company
-- users. Tenant data like the rest, under row-level security.

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('CLASSIFICATION_CONFIRMED', 'CLASSIFICATION_OVERRIDDEN', 'DOCUMENT_RELEASED');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "updatesSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailStatus" TEXT,
    "emailedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_clientId_createdAt_idx" ON "Notification"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_emailStatus_idx" ON "Notification"("organizationId", "emailStatus");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification"
  USING ("organizationId" = app_org_id()) WITH CHECK ("organizationId" = app_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "Notification" TO hub_app;
