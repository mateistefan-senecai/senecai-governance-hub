-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('SENECAI', 'CLIENT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SENECAI_ADMIN', 'CONSULTANT', 'CLIENT_ADMIN', 'CLIENT_MEMBER');

-- CreateEnum
CREATE TYPE "UseCaseType" AS ENUM ('PRODUCT', 'INTERNAL_OPS', 'HYBRID');

-- CreateEnum
CREATE TYPE "AutonomyLevel" AS ENUM ('FULLY_AUTOMATED', 'PARTIALLY_AUTOMATED', 'CONSULTATIVE');

-- CreateEnum
CREATE TYPE "ImplementationStage" AS ENUM ('PRODUCTION', 'PILOT', 'PLANNED');

-- CreateEnum
CREATE TYPE "LegalRole" AS ENUM ('PROVIDER', 'DEPLOYER', 'BOTH', 'IMPORTER', 'DISTRIBUTOR', 'DOWNSTREAM_PROVIDER', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "RiskClassification" AS ENUM ('PROHIBITED', 'HIGH_RISK', 'LIMITED', 'MINIMAL', 'OUT_OF_SCOPE', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantAssignment" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultantAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSystem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "useCaseType" "UseCaseType",
    "businessProcess" TEXT,
    "inputData" TEXT,
    "outputData" TEXT,
    "dataSource" TEXT,
    "humanOversightMechanism" TEXT,
    "autonomyLevel" "AutonomyLevel",
    "complianceOwnerName" TEXT,
    "complianceOwnerRole" TEXT,
    "decisionsAndImpact" TEXT,
    "userCount" INTEGER,
    "affectsEndCustomers" BOOLEAN,
    "endCustomerEstimate" TEXT,
    "implementationStage" "ImplementationStage",
    "legalRole" "LegalRole",
    "legalRoleReviewedByConsultant" BOOLEAN NOT NULL DEFAULT false,
    "riskClassification" "RiskClassification",
    "riskClassificationReviewedByConsultant" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionRun" (
    "id" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "treeVersion" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "resultField" TEXT NOT NULL,
    "resultValue" TEXT NOT NULL,
    "resultTentative" BOOLEAN NOT NULL DEFAULT true,
    "runByUserId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantAssignment_consultantId_clientOrganizationId_key" ON "ConsultantAssignment"("consultantId", "clientOrganizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantAssignment" ADD CONSTRAINT "ConsultantAssignment_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantAssignment" ADD CONSTRAINT "ConsultantAssignment_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRun" ADD CONSTRAINT "DecisionRun_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRun" ADD CONSTRAINT "DecisionRun_runByUserId_fkey" FOREIGN KEY ("runByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
