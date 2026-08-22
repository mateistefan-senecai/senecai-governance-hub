-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "ObligationAssessment" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "reviewedByConsultant" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObligationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObligationAssessment_aiSystemId_obligationId_key" ON "ObligationAssessment"("aiSystemId", "obligationId");

-- AddForeignKey
ALTER TABLE "ObligationAssessment" ADD CONSTRAINT "ObligationAssessment_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationAssessment" ADD CONSTRAINT "ObligationAssessment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
