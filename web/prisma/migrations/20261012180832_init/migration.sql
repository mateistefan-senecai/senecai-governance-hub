-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CONSULTANCY', 'LAW_FIRM', 'COMPANY');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ORG_ADMIN', 'REVIEWER', 'COMPANY_USER');

-- CreateEnum
CREATE TYPE "SystemOrigin" AS ENUM ('BUILT', 'BOUGHT', 'EMBEDDED');

-- CreateEnum
CREATE TYPE "UseType" AS ENUM ('PRODUCT', 'INTERNAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "Autonomy" AS ENUM ('ADVISORY', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('PLANNED', 'PILOT', 'PRODUCTION', 'RETIRED');

-- CreateEnum
CREATE TYPE "VendorDocStatus" AS ENUM ('TO_REQUEST', 'REQUESTED', 'RECEIVED', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('PRELIMINARY', 'CONFIRMED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('NOT_ASSESSED', 'COMPLIANT', 'PARTIAL', 'GAP');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('LEGAL', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "EnquiryRoute" AS ENUM ('SENECAI', 'OWN_TEAM');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'QUOTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "brandName" TEXT,
    "brandLogo" TEXT,
    "region" TEXT NOT NULL DEFAULT 'EU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile" JSONB,
    "applicability" JSONB,
    "applicabilityContentVersion" TEXT,
    "applicabilityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSystem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT NOT NULL,
    "ownerRole" TEXT,
    "origin" "SystemOrigin" NOT NULL,
    "supplier" TEXT,
    "dataCategories" TEXT[],
    "deploymentContext" TEXT NOT NULL,
    "useType" "UseType" NOT NULL,
    "autonomy" "Autonomy" NOT NULL,
    "stage" "Stage" NOT NULL,
    "affectedPersons" TEXT,
    "classificationStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "VendorDocStatus" NOT NULL DEFAULT 'TO_REQUEST',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "contentVersion" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "computed" JSONB NOT NULL,
    "reasoning" JSONB NOT NULL,
    "effective" JSONB NOT NULL,
    "status" "ClassificationStatus" NOT NULL DEFAULT 'PRELIMINARY',
    "overrideReason" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemObligation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "obligationKey" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "appliesFrom" TIMESTAMP(3),
    "rationale" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "ObligationStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "proposedStatus" "ObligationStatus",
    "statusRationale" TEXT,
    "assessedById" TEXT,
    "assessedAt" TIMESTAMP(3),
    "needsReassessment" BOOLEAN NOT NULL DEFAULT false,
    "ownerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "systemObligationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "phase" INTEGER NOT NULL,
    "effort" TEXT NOT NULL,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "enquiryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "route" "EnquiryRoute" NOT NULL,
    "message" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "version" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "bundle" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("version")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssignment_clientId_membershipId_key" ON "ClientAssignment"("clientId", "membershipId");

-- CreateIndex
CREATE INDEX "AiSystem_organizationId_clientId_idx" ON "AiSystem"("organizationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDocument_systemId_kind_key" ON "VendorDocument"("systemId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_systemId_version_key" ON "Classification"("systemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SystemObligation_systemId_obligationKey_key" ON "SystemObligation"("systemId", "obligationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Action_systemObligationId_key" ON "Action"("systemObligationId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_at_idx" ON "AuditEvent"("organizationId", "at");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemObligation" ADD CONSTRAINT "SystemObligation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemObligation" ADD CONSTRAINT "SystemObligation_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_systemObligationId_fkey" FOREIGN KEY ("systemObligationId") REFERENCES "SystemObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
