-- CreateTable
CREATE TABLE "OrganizationExposureAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "answers" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "completedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationExposureAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationExposureAssessment_organizationId_key" ON "OrganizationExposureAssessment"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationExposureAssessment" ADD CONSTRAINT "OrganizationExposureAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationExposureAssessment" ADD CONSTRAINT "OrganizationExposureAssessment_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
