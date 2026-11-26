-- User invitations and the pilot flag.
--
-- An invitation belongs to the organisation that issued it. Its link carries
-- a random token and only the SHA-256 of the token is stored. Before the
-- invitee has an account there is no tenant to act in, so a second policy
-- lets a transaction read the one invitation whose hash it carries in
-- app.invite_token (src/lib/services/invitations.ts). Accepting it then runs
-- inside the invitation's organisation like any other change.
--
-- "pilot" on an organisation or a client marks the pilot with test clients:
-- their PDFs carry a "test version, not legal advice" watermark.

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "pilot" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "pilot" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "clientId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "invitedByName" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "emailStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invitation"
  USING ("organizationId" = app_org_id()) WITH CHECK ("organizationId" = app_org_id());
CREATE POLICY invite_by_token ON "Invitation" FOR SELECT
  USING ("tokenHash" = NULLIF(current_setting('app.invite_token', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "Invitation" TO hub_app;
