-- CreateEnum
CREATE TYPE "GdprRole" AS ENUM ('CONTROLLER', 'PROCESSOR', 'JOINT_CONTROLLER');

-- CreateEnum
CREATE TYPE "GdprCharacteristic" AS ENUM ('SPECIAL_CATEGORY_DATA', 'LARGE_SCALE', 'SYSTEMATIC_MONITORING', 'AUTOMATED_DECISION_MAKING', 'CHILDRENS_DATA', 'CROSS_BORDER_TRANSFER', 'USES_PROCESSOR');

-- CreateEnum
CREATE TYPE "DpiaOutcome" AS ENUM ('RESIDUAL_RISK_ACCEPTABLE', 'FLAGGED_FOR_AUTHORITY_CONSULTATION');

-- CreateEnum
CREATE TYPE "DsarRequestType" AS ENUM ('ACCESS', 'ERASURE', 'RECTIFICATION', 'OBJECTION', 'PORTABILITY', 'RESTRICTION');

-- CreateEnum
CREATE TYPE "DsarStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProcessingActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessFunction" TEXT,
    "dataSubjectCategories" TEXT,
    "dataCategories" TEXT,
    "purposeOfProcessing" TEXT,
    "recipients" TEXT,
    "retentionPeriod" TEXT,
    "securityMeasures" TEXT,
    "complianceOwnerName" TEXT,
    "complianceOwnerRole" TEXT,
    "implementationStage" "ImplementationStage",
    "role" "GdprRole",
    "characteristics" "GdprCharacteristic"[] DEFAULT ARRAY[]::"GdprCharacteristic"[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdprObligationAssessment" (
    "id" TEXT NOT NULL,
    "processingActivityId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "reviewedByConsultant" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GdprObligationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationGdprObligationAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "reviewedByConsultant" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationGdprObligationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataProtectionImpactAssessment" (
    "id" TEXT NOT NULL,
    "processingActivityId" TEXT NOT NULL,
    "necessityProportionality" TEXT,
    "risksIdentified" TEXT,
    "mitigationMeasures" TEXT,
    "dpoSignOffName" TEXT,
    "dpoSignOffDate" TIMESTAMP(3),
    "outcome" "DpiaOutcome",
    "outcomeNote" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataProtectionImpactAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsarRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestType" "DsarRequestType" NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "statutoryDeadline" TIMESTAMP(3) NOT NULL,
    "status" "DsarStatus" NOT NULL DEFAULT 'RECEIVED',
    "requesterNote" TEXT,
    "processingActivityId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DsarRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GdprObligationAssessment_processingActivityId_obligationId_key" ON "GdprObligationAssessment"("processingActivityId", "obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationGdprObligationAssessment_organizationId_obligat_key" ON "OrganizationGdprObligationAssessment"("organizationId", "obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "DataProtectionImpactAssessment_processingActivityId_key" ON "DataProtectionImpactAssessment"("processingActivityId");

-- AddForeignKey
ALTER TABLE "ProcessingActivity" ADD CONSTRAINT "ProcessingActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingActivity" ADD CONSTRAINT "ProcessingActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprObligationAssessment" ADD CONSTRAINT "GdprObligationAssessment_processingActivityId_fkey" FOREIGN KEY ("processingActivityId") REFERENCES "ProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprObligationAssessment" ADD CONSTRAINT "GdprObligationAssessment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationGdprObligationAssessment" ADD CONSTRAINT "OrganizationGdprObligationAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationGdprObligationAssessment" ADD CONSTRAINT "OrganizationGdprObligationAssessment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataProtectionImpactAssessment" ADD CONSTRAINT "DataProtectionImpactAssessment_processingActivityId_fkey" FOREIGN KEY ("processingActivityId") REFERENCES "ProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataProtectionImpactAssessment" ADD CONSTRAINT "DataProtectionImpactAssessment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsarRequest" ADD CONSTRAINT "DsarRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsarRequest" ADD CONSTRAINT "DsarRequest_processingActivityId_fkey" FOREIGN KEY ("processingActivityId") REFERENCES "ProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsarRequest" ADD CONSTRAINT "DsarRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
