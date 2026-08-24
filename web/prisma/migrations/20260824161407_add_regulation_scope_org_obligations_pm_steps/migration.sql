-- CreateEnum
CREATE TYPE "RegulationCode" AS ENUM ('AI_ACT', 'GDPR', 'NIS2', 'DORA', 'CRA');

-- CreateTable
CREATE TABLE "OrganizationRegulationScope" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "regulation" "RegulationCode" NOT NULL,
    "applicable" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRegulationScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationObligationAssessment" (
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

    CONSTRAINT "OrganizationObligationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligationPmStepCompletion" (
    "id" TEXT NOT NULL,
    "obligationAssessmentId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObligationPmStepCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRegulationScope_organizationId_regulation_key" ON "OrganizationRegulationScope"("organizationId", "regulation");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationObligationAssessment_organizationId_obligationI_key" ON "OrganizationObligationAssessment"("organizationId", "obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "ObligationPmStepCompletion_obligationAssessmentId_stepId_key" ON "ObligationPmStepCompletion"("obligationAssessmentId", "stepId");

-- AddForeignKey
ALTER TABLE "OrganizationRegulationScope" ADD CONSTRAINT "OrganizationRegulationScope_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRegulationScope" ADD CONSTRAINT "OrganizationRegulationScope_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationObligationAssessment" ADD CONSTRAINT "OrganizationObligationAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationObligationAssessment" ADD CONSTRAINT "OrganizationObligationAssessment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationPmStepCompletion" ADD CONSTRAINT "ObligationPmStepCompletion_obligationAssessmentId_fkey" FOREIGN KEY ("obligationAssessmentId") REFERENCES "ObligationAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationPmStepCompletion" ADD CONSTRAINT "ObligationPmStepCompletion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
