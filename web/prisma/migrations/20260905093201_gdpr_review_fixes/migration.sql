-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GdprCharacteristic" ADD VALUE 'LEGITIMATE_INTEREST_BASIS';
ALTER TYPE "GdprCharacteristic" ADD VALUE 'DIRECT_MARKETING';

-- AlterTable
ALTER TABLE "DataProtectionImpactAssessment" ADD COLUMN     "authorityConsultationDate" TIMESTAMP(3),
ADD COLUMN     "authorityConsultationOutcome" TEXT;
