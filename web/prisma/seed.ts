import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getApplicableObligations } from "../src/lib/obligations";
import type { RegulationCode } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Fixed "today" for the demo dataset so seeded due dates read as sensible
// past/near-term/future relative to a stable point, regardless of when
// `prisma db seed` is actually run.
const TODAY = new Date("2026-08-31T00:00:00Z");
function addDays(days: number): Date {
  return new Date(TODAY.getTime() + days * 86_400_000);
}

type ObligationProfile = "mature" | "mid" | "early";

function statusForIndex(profile: ObligationProfile, index: number) {
  const patterns: Record<ObligationProfile, string[]> = {
    mature: ["IMPLEMENTED", "IMPLEMENTED", "IMPLEMENTED", "IN_PROGRESS"],
    mid: ["IMPLEMENTED", "IN_PROGRESS", "NOT_STARTED"],
    early: ["NOT_STARTED", "NOT_STARTED", "IN_PROGRESS"],
  };
  const arr = patterns[profile];
  return arr[index % arr.length] as "IMPLEMENTED" | "IN_PROGRESS" | "NOT_STARTED";
}

/**
 * Seeds one ObligationAssessment row per obligation applicable to a system
 * (mirrors `getApplicableObligations`), with statuses/due dates/review flags
 * staggered by a maturity "profile" so the demo shows a spread of real-looking
 * progress instead of every system looking identical.
 */
async function seedSystemObligations(params: {
  aiSystemId: string;
  legalRole: string | null;
  riskClassification: string | null;
  profile: ObligationProfile;
  ownerName: string;
  updatedById: string;
  notApplicable?: string[];
  notes?: Record<string, string>;
}) {
  const applicable = getApplicableObligations({
    legalRole: params.legalRole as never,
    riskClassification: params.riskClassification as never,
  });

  const created: Record<string, string> = {};

  for (const [index, obligation] of applicable.entries()) {
    const forcedNA = params.notApplicable?.includes(obligation.id) ?? false;
    const status = forcedNA ? "NOT_APPLICABLE" : statusForIndex(params.profile, index);
    const reviewedByConsultant =
      !forcedNA && status === "IMPLEMENTED" && params.profile !== "early";

    let dueDate: Date | null;
    if (forcedNA) dueDate = null;
    else if (status === "IMPLEMENTED") dueDate = addDays(-60 - index * 5);
    else if (status === "IN_PROGRESS") dueDate = addDays(20 + index * 4);
    else dueDate = params.profile === "early" && index === 0 ? addDays(-10) : addDays(45 + index * 5);

    const note = forcedNA
      ? (params.notes?.[obligation.id] ??
        "Not applicable — private entity, not a public body/public-service provider, and not a credit/insurance Annex III use case.")
      : (params.notes?.[obligation.id] ?? null);

    const row = await prisma.obligationAssessment.upsert({
      where: {
        aiSystemId_obligationId: { aiSystemId: params.aiSystemId, obligationId: obligation.id },
      },
      update: {},
      create: {
        aiSystemId: params.aiSystemId,
        obligationId: obligation.id,
        status,
        ownerName: params.ownerName,
        dueDate,
        note,
        reviewedByConsultant,
        updatedById: params.updatedById,
      },
    });
    created[obligation.id] = row.id;
  }

  return created;
}

/** Marks the first `doneCount` PM_STEPS entries for a given obligation as done. */
async function seedPmSteps(
  obligationAssessmentId: string,
  stepIds: string[],
  doneCount: number,
  updatedById: string,
) {
  for (const [index, stepId] of stepIds.entries()) {
    await prisma.obligationPmStepCompletion.upsert({
      where: { obligationAssessmentId_stepId: { obligationAssessmentId, stepId } },
      update: {},
      create: {
        obligationAssessmentId,
        stepId,
        done: index < doneCount,
        updatedById,
      },
    });
  }
}

async function seedGeneralObligations(
  organizationId: string,
  statuses: Record<string, "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED">,
  ownerName: string,
  updatedById: string,
) {
  for (const [obligationId, status] of Object.entries(statuses)) {
    await prisma.organizationObligationAssessment.upsert({
      where: { organizationId_obligationId: { organizationId, obligationId } },
      update: {},
      create: {
        organizationId,
        obligationId,
        status,
        ownerName,
        dueDate: status === "IMPLEMENTED" ? addDays(-45) : addDays(60),
        reviewedByConsultant: status === "IMPLEMENTED",
        updatedById,
      },
    });
  }
}

async function seedRegulationScope(
  organizationId: string,
  scope: Record<RegulationCode, boolean>,
  updatedById: string,
) {
  for (const [regulation, applicable] of Object.entries(scope) as [RegulationCode, boolean][]) {
    await prisma.organizationRegulationScope.upsert({
      where: { organizationId_regulation: { organizationId, regulation } },
      update: {},
      create: { organizationId, regulation, applicable, updatedById },
    });
  }
}

async function main() {
  const senecai = await prisma.organization.upsert({
    where: { id: "senecai-hq" },
    update: {},
    create: { id: "senecai-hq", name: "SenecAI", type: "SENECAI" },
  });

  const demoClient = await prisma.organization.upsert({
    where: { id: "demo-client" },
    update: {},
    create: { id: "demo-client", name: "Demo Client SRL", type: "CLIENT" },
  });

  const passwordHash = await bcrypt.hash("changeme123", 10);

  await prisma.user.upsert({
    where: { email: "admin@senecai.dev" },
    update: {},
    create: {
      email: "admin@senecai.dev",
      passwordHash,
      name: "SenecAI Admin",
      role: "SENECAI_ADMIN",
      organizationId: senecai.id,
    },
  });

  const consultant = await prisma.user.upsert({
    where: { email: "consultant@senecai.dev" },
    update: {},
    create: {
      email: "consultant@senecai.dev",
      passwordHash,
      name: "Demo Consultant",
      role: "CONSULTANT",
      organizationId: senecai.id,
    },
  });

  await prisma.consultantAssignment.upsert({
    where: {
      consultantId_clientOrganizationId: {
        consultantId: consultant.id,
        clientOrganizationId: demoClient.id,
      },
    },
    update: {},
    create: { consultantId: consultant.id, clientOrganizationId: demoClient.id },
  });

  await prisma.user.upsert({
    where: { email: "client@demo.dev" },
    update: {},
    create: {
      email: "client@demo.dev",
      passwordHash,
      name: "Demo Client Admin",
      role: "CLIENT_ADMIN",
      organizationId: demoClient.id,
    },
  });

  // ── Second consultant, so the demo shows more than one consultant/org mix ──
  const anaConsultant = await prisma.user.upsert({
    where: { email: "ana.popescu@senecai.dev" },
    update: {},
    create: {
      email: "ana.popescu@senecai.dev",
      passwordHash,
      name: "Ana Popescu",
      role: "CONSULTANT",
      organizationId: senecai.id,
    },
  });

  // ── Client 1: NovaBank Retail SRL (retail banking) ────────────────────────
  const novabank = await prisma.organization.upsert({
    where: { id: "novabank" },
    update: {},
    create: { id: "novabank", name: "NovaBank Retail SRL", type: "CLIENT" },
  });
  const novabankAdmin = await prisma.user.upsert({
    where: { email: "radu.ionescu@novabank.dev" },
    update: {},
    create: {
      email: "radu.ionescu@novabank.dev",
      passwordHash,
      name: "Radu Ionescu",
      role: "CLIENT_ADMIN",
      organizationId: novabank.id,
    },
  });
  const novabankMember = await prisma.user.upsert({
    where: { email: "elena.marin@novabank.dev" },
    update: {},
    create: {
      email: "elena.marin@novabank.dev",
      passwordHash,
      name: "Elena Marin",
      role: "CLIENT_MEMBER",
      organizationId: novabank.id,
    },
  });

  // ── Client 2: MediCore Diagnostics SRL (healthcare / medical imaging) ─────
  const medicore = await prisma.organization.upsert({
    where: { id: "medicore" },
    update: {},
    create: { id: "medicore", name: "MediCore Diagnostics SRL", type: "CLIENT" },
  });
  const medicoreAdmin = await prisma.user.upsert({
    where: { email: "ioana.dumitrescu@medicore.dev" },
    update: {},
    create: {
      email: "ioana.dumitrescu@medicore.dev",
      passwordHash,
      name: "Ioana Dumitrescu",
      role: "CLIENT_ADMIN",
      organizationId: medicore.id,
    },
  });

  // ── Client 3: LogiFlow Transport SRL (logistics / fleet & warehouse) ──────
  const logiflow = await prisma.organization.upsert({
    where: { id: "logiflow" },
    update: {},
    create: { id: "logiflow", name: "LogiFlow Transport SRL", type: "CLIENT" },
  });
  const logiflowAdmin = await prisma.user.upsert({
    where: { email: "mihai.stanescu@logiflow.dev" },
    update: {},
    create: {
      email: "mihai.stanescu@logiflow.dev",
      passwordHash,
      name: "Mihai Stănescu",
      role: "CLIENT_ADMIN",
      organizationId: logiflow.id,
    },
  });

  // ── Consultant assignments ────────────────────────────────────────────────
  await prisma.consultantAssignment.upsert({
    where: {
      consultantId_clientOrganizationId: {
        consultantId: consultant.id,
        clientOrganizationId: novabank.id,
      },
    },
    update: {},
    create: { consultantId: consultant.id, clientOrganizationId: novabank.id },
  });
  await prisma.consultantAssignment.upsert({
    where: {
      consultantId_clientOrganizationId: {
        consultantId: anaConsultant.id,
        clientOrganizationId: medicore.id,
      },
    },
    update: {},
    create: { consultantId: anaConsultant.id, clientOrganizationId: medicore.id },
  });
  await prisma.consultantAssignment.upsert({
    where: {
      consultantId_clientOrganizationId: {
        consultantId: anaConsultant.id,
        clientOrganizationId: logiflow.id,
      },
    },
    update: {},
    create: { consultantId: anaConsultant.id, clientOrganizationId: logiflow.id },
  });

  // ── Cross-regulation scope per client ─────────────────────────────────────
  await seedRegulationScope(
    novabank.id,
    { AI_ACT: true, GDPR: true, DORA: true, NIS2: false, CRA: false },
    consultant.id,
  );
  await seedRegulationScope(
    medicore.id,
    { AI_ACT: true, GDPR: true, DORA: false, NIS2: false, CRA: false },
    anaConsultant.id,
  );
  await seedRegulationScope(
    logiflow.id,
    { AI_ACT: true, GDPR: true, DORA: false, NIS2: true, CRA: false },
    anaConsultant.id,
  );

  // ── Org-level GENERAL obligations (AI literacy, governance policy, Art 50) ─
  await seedGeneralObligations(
    novabank.id,
    {
      "general.governance-policy": "IMPLEMENTED",
      "general.art4-ai-literacy": "IN_PROGRESS",
      "general.art50-transparency": "IMPLEMENTED",
    },
    "Radu Ionescu",
    consultant.id,
  );
  await seedGeneralObligations(
    medicore.id,
    {
      "general.governance-policy": "IMPLEMENTED",
      "general.art4-ai-literacy": "IMPLEMENTED",
      "general.art50-transparency": "IN_PROGRESS",
    },
    "Ioana Dumitrescu",
    anaConsultant.id,
  );
  await seedGeneralObligations(
    logiflow.id,
    {
      "general.governance-policy": "IN_PROGRESS",
      "general.art4-ai-literacy": "NOT_STARTED",
      "general.art50-transparency": "NOT_STARTED",
    },
    "Mihai Stănescu",
    logiflowAdmin.id,
  );

  // ══════════════════════════════════════════════════════════════════════
  // NovaBank Retail SRL — AI systems
  // ══════════════════════════════════════════════════════════════════════

  const creditScoring = await prisma.aiSystem.upsert({
    where: { id: "novabank-credit-scoring-engine" },
    update: {},
    create: {
      id: "novabank-credit-scoring-engine",
      organizationId: novabank.id,
      name: "Credit Scoring Engine",
      description:
        "In-house model that scores retail loan applicants' creditworthiness and feeds the underwriting decision.",
      useCaseType: "PRODUCT",
      businessProcess: "Retail loan underwriting",
      inputData:
        "Applicant income, employment history, existing debt, credit bureau data, banking transaction history",
      outputData: "Credit risk score (0-1000) and recommended approve/refer/decline decision",
      dataSource: "Internal core banking system + national credit bureau feed",
      humanOversightMechanism:
        "Loan officer reviews every 'refer' and 'decline' outcome before communicating to the applicant; the score alone cannot auto-decline above a set exposure threshold.",
      autonomyLevel: "PARTIALLY_AUTOMATED",
      complianceOwnerName: "Radu Ionescu",
      complianceOwnerRole: "Head of Risk & Compliance",
      decisionsAndImpact:
        "Directly determines whether a customer is offered credit and at what rate; a wrong decline can cut off access to finance.",
      userCount: 40,
      affectsEndCustomers: true,
      endCustomerEstimate: "~18,000 retail applicants/year",
      implementationStage: "PRODUCTION",
      legalRole: "PROVIDER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "HIGH_RISK",
      riskClassificationReviewedByConsultant: true,
      createdById: novabankAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-credit-scoring-engine-role-run" },
    update: {},
    create: {
      id: "novabank-credit-scoring-engine-role-run",
      aiSystemId: creditScoring.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["provider-original"] }],
      resultField: "legalRole",
      resultValue: "PROVIDER",
      resultTentative: false,
      runByUserId: novabankAdmin.id,
      runAt: addDays(-140),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-credit-scoring-engine-risk-run" },
    update: {},
    create: {
      id: "novabank-credit-scoring-engine-risk-run",
      aiSystemId: creditScoring.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: [] },
        { nodeId: "annex-iii", kind: "checklist", checked: ["finance"] },
        { nodeId: "escape-hatch", kind: "checklist", checked: [] },
      ],
      resultField: "riskClassification",
      resultValue: "HIGH_RISK",
      resultTentative: false,
      runByUserId: consultant.id,
      runAt: addDays(-138),
    },
  });
  const creditScoringObligations = await seedSystemObligations({
    aiSystemId: creditScoring.id,
    legalRole: creditScoring.legalRole,
    riskClassification: creditScoring.riskClassification,
    profile: "mature",
    ownerName: "Radu Ionescu",
    updatedById: consultant.id,
    notes: {
      "provider-hr.art49-eu-database-registration":
        "Registered in the EU database for high-risk AI systems; entry kept in sync with each model version.",
    },
  });
  if (creditScoringObligations["provider-hr.art9-risk-management"]) {
    await seedPmSteps(
      creditScoringObligations["provider-hr.art9-risk-management"],
      ["brainstorm-risks", "assess-risks", "define-mitigation", "review-signoff"],
      4,
      consultant.id,
    );
  }
  if (creditScoringObligations["provider-hr.art14-human-oversight"]) {
    await seedPmSteps(
      creditScoringObligations["provider-hr.art14-human-oversight"],
      ["identify-oversight-points", "design-hmi", "train-overseers", "test-intervention"],
      4,
      consultant.id,
    );
  }

  const cvScreening = await prisma.aiSystem.upsert({
    where: { id: "novabank-cv-screening-assistant" },
    update: {},
    create: {
      id: "novabank-cv-screening-assistant",
      organizationId: novabank.id,
      name: "CV Screening Assistant",
      description:
        "Third-party ATS plugin used by HR to pre-rank external candidates for open banking roles, used strictly as provided by the vendor.",
      useCaseType: "HYBRID",
      businessProcess: "Recruitment & candidate screening",
      inputData: "CVs/resumes, cover letters, structured application form answers",
      outputData: "Candidate ranking score and shortlist recommendation",
      dataSource: "Applicant tracking system (third-party SaaS)",
      humanOversightMechanism:
        "HR recruiter reviews the full ranked list before any candidate is rejected; the AI ranking is advisory only.",
      autonomyLevel: "CONSULTATIVE",
      complianceOwnerName: "Elena Marin",
      complianceOwnerRole: "Compliance Analyst",
      decisionsAndImpact:
        "Influences which candidates are invited to interview; a biased ranking could disadvantage protected groups.",
      userCount: 6,
      affectsEndCustomers: false,
      implementationStage: "PRODUCTION",
      legalRole: "DEPLOYER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "HIGH_RISK",
      riskClassificationReviewedByConsultant: false,
      createdById: consultant.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-cv-screening-assistant-role-run" },
    update: {},
    create: {
      id: "novabank-cv-screening-assistant-role-run",
      aiSystemId: cvScreening.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["deployer-use"] }],
      resultField: "legalRole",
      resultValue: "DEPLOYER",
      resultTentative: false,
      runByUserId: novabankMember.id,
      runAt: addDays(-40),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-cv-screening-assistant-risk-run" },
    update: {},
    create: {
      id: "novabank-cv-screening-assistant-risk-run",
      aiSystemId: cvScreening.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: [] },
        { nodeId: "annex-iii", kind: "checklist", checked: ["hr-recruitment"] },
        { nodeId: "escape-hatch", kind: "checklist", checked: [] },
      ],
      resultField: "riskClassification",
      resultValue: "HIGH_RISK",
      resultTentative: true,
      runByUserId: novabankMember.id,
      runAt: addDays(-40),
    },
  });
  await seedSystemObligations({
    aiSystemId: cvScreening.id,
    legalRole: cvScreening.legalRole,
    riskClassification: cvScreening.riskClassification,
    profile: "early",
    ownerName: "Elena Marin",
    updatedById: novabankMember.id,
    notApplicable: ["deployer-hr.art27-fria", "deployer-hr.art49-3-eu-database"],
  });

  const supportChatbot = await prisma.aiSystem.upsert({
    where: { id: "novabank-customer-support-chatbot" },
    update: {},
    create: {
      id: "novabank-customer-support-chatbot",
      organizationId: novabank.id,
      name: "Customer Support Chatbot",
      description:
        "Public-facing chatbot on the NovaBank website that answers account/product questions and escalates anything account-specific to a human agent.",
      useCaseType: "PRODUCT",
      businessProcess: "Customer service / support",
      inputData: "Customer chat messages, FAQ knowledge base",
      outputData: "Text responses to customer queries; escalation flag to a human agent",
      dataSource: "Public website chat widget",
      humanOversightMechanism:
        "Any request involving account changes or complaints is escalated to a human agent; the chatbot cannot execute transactions.",
      autonomyLevel: "FULLY_AUTOMATED",
      complianceOwnerName: "Elena Marin",
      complianceOwnerRole: "Compliance Analyst",
      decisionsAndImpact:
        "Provides information only; does not make decisions affecting customers' rights or finances.",
      userCount: 3,
      affectsEndCustomers: true,
      endCustomerEstimate: "~90,000 chat sessions/year",
      implementationStage: "PRODUCTION",
      legalRole: "DEPLOYER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "NOT_HIGH_RISK",
      riskClassificationReviewedByConsultant: true,
      createdById: novabankMember.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-customer-support-chatbot-role-run" },
    update: {},
    create: {
      id: "novabank-customer-support-chatbot-role-run",
      aiSystemId: supportChatbot.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["deployer-use"] }],
      resultField: "legalRole",
      resultValue: "DEPLOYER",
      resultTentative: false,
      runByUserId: novabankMember.id,
      runAt: addDays(-200),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-customer-support-chatbot-risk-run" },
    update: {},
    create: {
      id: "novabank-customer-support-chatbot-risk-run",
      aiSystemId: supportChatbot.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: [] },
        { nodeId: "annex-iii", kind: "checklist", checked: [] },
        { nodeId: "practical-rights", kind: "checklist", checked: [] },
      ],
      resultField: "riskClassification",
      resultValue: "NOT_HIGH_RISK",
      resultTentative: false,
      runByUserId: novabankMember.id,
      runAt: addDays(-200),
    },
  });

  const fraudAlerts = await prisma.aiSystem.upsert({
    where: { id: "novabank-fraud-detection-alerts" },
    update: {},
    create: {
      id: "novabank-fraud-detection-alerts",
      organizationId: novabank.id,
      name: "Fraud Detection Alerts",
      description:
        "In-house system that flags suspicious transactions for the fraud team to review; it only raises flags and never blocks a transaction on its own.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Transaction monitoring / fraud operations",
      inputData: "Transaction metadata, device fingerprint, historical fraud patterns",
      outputData: "Risk flag with explanation, raised to the fraud analyst queue",
      dataSource: "Core banking transaction stream",
      humanOversightMechanism:
        "A fraud analyst reviews every flagged transaction before any account action is taken; the system cannot freeze accounts on its own.",
      autonomyLevel: "CONSULTATIVE",
      complianceOwnerName: "Radu Ionescu",
      complianceOwnerRole: "Head of Risk & Compliance",
      decisionsAndImpact:
        "Surfaces suspicious activity for human review; does not itself decide account restrictions.",
      userCount: 12,
      affectsEndCustomers: true,
      endCustomerEstimate: "~1,200 flagged transactions/month",
      implementationStage: "PRODUCTION",
      legalRole: "PROVIDER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "NOT_HIGH_RISK",
      riskClassificationReviewedByConsultant: true,
      createdById: novabankAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-fraud-detection-alerts-role-run" },
    update: {},
    create: {
      id: "novabank-fraud-detection-alerts-role-run",
      aiSystemId: fraudAlerts.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["provider-original"] }],
      resultField: "legalRole",
      resultValue: "PROVIDER",
      resultTentative: false,
      runByUserId: novabankAdmin.id,
      runAt: addDays(-300),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "novabank-fraud-detection-alerts-risk-run" },
    update: {},
    create: {
      id: "novabank-fraud-detection-alerts-risk-run",
      aiSystemId: fraudAlerts.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: [] },
        { nodeId: "annex-iii", kind: "checklist", checked: [] },
        { nodeId: "practical-rights", kind: "checklist", checked: [] },
      ],
      resultField: "riskClassification",
      resultValue: "NOT_HIGH_RISK",
      resultTentative: false,
      runByUserId: novabankAdmin.id,
      runAt: addDays(-300),
    },
  });

  // ══════════════════════════════════════════════════════════════════════
  // MediCore Diagnostics SRL — AI systems
  // ══════════════════════════════════════════════════════════════════════

  const radiologyTriage = await prisma.aiSystem.upsert({
    where: { id: "medicore-radiology-triage-ai" },
    update: {},
    create: {
      id: "medicore-radiology-triage-ai",
      organizationId: medicore.id,
      name: "Radiology Triage AI",
      description:
        "CE-marked medical device software module that analyzes chest X-rays and flags likely-abnormal studies for radiologist priority review.",
      useCaseType: "PRODUCT",
      businessProcess: "Radiology reporting / diagnostic triage",
      inputData: "DICOM chest X-ray images, patient demographics",
      outputData: "Abnormality likelihood score; priority flag in the radiologist worklist",
      dataSource: "Hospital PACS (picture archiving and communication system)",
      humanOversightMechanism:
        "A licensed radiologist reviews and signs off every study; the AI only re-orders the worklist and never issues a diagnosis.",
      autonomyLevel: "CONSULTATIVE",
      complianceOwnerName: "Ioana Dumitrescu",
      complianceOwnerRole: "Quality & Regulatory Affairs Manager",
      decisionsAndImpact:
        "Prioritizes which studies a radiologist reads first; a missed flag delays but does not replace clinical review.",
      userCount: 15,
      affectsEndCustomers: true,
      endCustomerEstimate: "~22,000 studies/year",
      implementationStage: "PRODUCTION",
      legalRole: "PROVIDER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "HIGH_RISK",
      riskClassificationReviewedByConsultant: true,
      createdById: medicoreAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "medicore-radiology-triage-ai-role-run" },
    update: {},
    create: {
      id: "medicore-radiology-triage-ai-role-run",
      aiSystemId: radiologyTriage.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["provider-original"] }],
      resultField: "legalRole",
      resultValue: "PROVIDER",
      resultTentative: false,
      runByUserId: medicoreAdmin.id,
      runAt: addDays(-400),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "medicore-radiology-triage-ai-risk-run" },
    update: {},
    create: {
      id: "medicore-radiology-triage-ai-risk-run",
      aiSystemId: radiologyTriage.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: ["medical-devices"] },
      ],
      resultField: "riskClassification",
      resultValue: "HIGH_RISK",
      resultTentative: false,
      runByUserId: anaConsultant.id,
      runAt: addDays(-398),
    },
  });
  const radiologyObligations = await seedSystemObligations({
    aiSystemId: radiologyTriage.id,
    legalRole: radiologyTriage.legalRole,
    riskClassification: radiologyTriage.riskClassification,
    profile: "mature",
    ownerName: "Ioana Dumitrescu",
    updatedById: anaConsultant.id,
    notes: {
      "provider-hr.art43-conformity-assessment":
        "Conformity assessment carried out jointly with the medical device Notified Body review.",
    },
  });
  if (radiologyObligations["provider-hr.art9-risk-management"]) {
    await seedPmSteps(
      radiologyObligations["provider-hr.art9-risk-management"],
      ["brainstorm-risks", "assess-risks", "define-mitigation", "review-signoff"],
      4,
      anaConsultant.id,
    );
  }
  if (radiologyObligations["provider-hr.art14-human-oversight"]) {
    await seedPmSteps(
      radiologyObligations["provider-hr.art14-human-oversight"],
      ["identify-oversight-points", "design-hmi", "train-overseers", "test-intervention"],
      3,
      anaConsultant.id,
    );
  }

  const patientIntake = await prisma.aiSystem.upsert({
    where: { id: "medicore-patient-intake-chatbot" },
    update: {},
    create: {
      id: "medicore-patient-intake-chatbot",
      organizationId: medicore.id,
      name: "Patient Intake Chatbot",
      description:
        "Chat-based intake assistant that collects symptoms and scheduling preferences from patients before their appointment and hands off to clinical staff.",
      useCaseType: "PRODUCT",
      businessProcess: "Patient intake / pre-visit triage",
      inputData: "Patient-reported symptoms, appointment preferences, basic demographics",
      outputData: "Structured intake summary for nursing staff; suggested appointment slot",
      dataSource: "Patient portal web/mobile app",
      humanOversightMechanism:
        "Nursing staff review every intake summary before the appointment; the chatbot does not diagnose or triage clinical urgency itself.",
      autonomyLevel: "PARTIALLY_AUTOMATED",
      complianceOwnerName: "Ioana Dumitrescu",
      complianceOwnerRole: "Quality & Regulatory Affairs Manager",
      decisionsAndImpact:
        "Structures information for staff; does not make or influence a clinical decision itself.",
      userCount: 8,
      affectsEndCustomers: true,
      endCustomerEstimate: "~9,500 patients/year",
      implementationStage: "PRODUCTION",
      legalRole: "DEPLOYER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "LIMITED",
      riskClassificationReviewedByConsultant: true,
      createdById: medicoreAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "medicore-patient-intake-chatbot-role-run" },
    update: {},
    create: {
      id: "medicore-patient-intake-chatbot-role-run",
      aiSystemId: patientIntake.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["deployer-use"] }],
      resultField: "legalRole",
      resultValue: "DEPLOYER",
      resultTentative: false,
      runByUserId: medicoreAdmin.id,
      runAt: addDays(-90),
    },
  });
  // No automated decision run for the risk field: the checklist tool only
  // distinguishes HIGH_RISK vs NOT_HIGH_RISK — LIMITED here reflects Ana's
  // manual judgment call (Art. 50 transparency applies; not an Annex III
  // high-risk use case) rather than a tree outcome.

  const schedulingOptimizer = await prisma.aiSystem.upsert({
    where: { id: "medicore-appointment-scheduling-optimizer" },
    update: {},
    create: {
      id: "medicore-appointment-scheduling-optimizer",
      organizationId: medicore.id,
      name: "Appointment Scheduling Optimizer",
      description:
        "Internal tool that suggests optimal daily scheduling of appointment slots across rooms and equipment to reduce patient wait times.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Facility & appointment scheduling",
      inputData: "Historical appointment durations, room/equipment availability, staff rosters",
      outputData: "Suggested daily schedule; front-desk staff can override any slot",
      dataSource: "Practice management system",
      humanOversightMechanism:
        "Front-desk staff can override any AI-suggested slot; no patient-facing decision is automated.",
      autonomyLevel: "PARTIALLY_AUTOMATED",
      complianceOwnerName: "Ioana Dumitrescu",
      complianceOwnerRole: "Quality & Regulatory Affairs Manager",
      decisionsAndImpact:
        "Optimizes internal scheduling only; no effect on any individual's legal rights or access to care.",
      userCount: 5,
      affectsEndCustomers: false,
      implementationStage: "PRODUCTION",
      legalRole: "PROVIDER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "MINIMAL",
      riskClassificationReviewedByConsultant: true,
      createdById: medicoreAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "medicore-appointment-scheduling-optimizer-role-run" },
    update: {},
    create: {
      id: "medicore-appointment-scheduling-optimizer-role-run",
      aiSystemId: schedulingOptimizer.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["provider-original"] }],
      resultField: "legalRole",
      resultValue: "PROVIDER",
      resultTentative: false,
      runByUserId: medicoreAdmin.id,
      runAt: addDays(-60),
    },
  });

  const codingAssistant = await prisma.aiSystem.upsert({
    where: { id: "medicore-clinical-coding-assistant" },
    update: {},
    create: {
      id: "medicore-clinical-coding-assistant",
      organizationId: medicore.id,
      name: "Clinical Coding Assistant",
      description:
        "AI tool that suggests ICD-10 diagnosis and procedure codes from clinician notes for billing. MediCore substantially retrained the vendor's base model on its own historical coding data, changing its output behavior.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Medical billing / clinical coding",
      inputData: "De-identified clinician notes, historical coding decisions",
      outputData: "Suggested ICD-10 codes for the billing team to confirm",
      dataSource: "EHR export, retrained on MediCore's own historical claims",
      humanOversightMechanism:
        "The billing team confirms or corrects every suggested code before submission; no code is submitted automatically.",
      autonomyLevel: "CONSULTATIVE",
      complianceOwnerName: "Ioana Dumitrescu",
      complianceOwnerRole: "Quality & Regulatory Affairs Manager",
      decisionsAndImpact:
        "Feeds into billing accuracy; incorrect codes could affect claims and, indirectly, cost of care.",
      userCount: 4,
      affectsEndCustomers: false,
      implementationStage: "PILOT",
      legalRole: "REVIEW_REQUIRED",
      legalRoleReviewedByConsultant: false,
      riskClassification: "REVIEW_REQUIRED",
      riskClassificationReviewedByConsultant: false,
      createdById: anaConsultant.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "medicore-clinical-coding-assistant-role-run" },
    update: {},
    create: {
      id: "medicore-clinical-coding-assistant-role-run",
      aiSystemId: codingAssistant.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "signals", kind: "signalChecklist", checked: [] },
        { nodeId: "as-is-fallback", kind: "boolean", value: false },
      ],
      resultField: "legalRole",
      resultValue: "REVIEW_REQUIRED",
      resultTentative: true,
      runByUserId: medicoreAdmin.id,
      runAt: addDays(-12),
    },
  });
  // No high-risk-classification run yet — flagged for Ana to determine role
  // first, since the obligation mapping depends on it.

  // ══════════════════════════════════════════════════════════════════════
  // LogiFlow Transport SRL — AI systems
  // ══════════════════════════════════════════════════════════════════════

  const driverFatigue = await prisma.aiSystem.upsert({
    where: { id: "logiflow-driver-fatigue-monitoring" },
    update: {},
    create: {
      id: "logiflow-driver-fatigue-monitoring",
      organizationId: logiflow.id,
      name: "Driver Fatigue Monitoring",
      description:
        "In-cab camera system, bought from a fleet-safety vendor and used as-is, that detects signs of driver drowsiness/distraction in real time and logs events for fleet safety review.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Fleet safety monitoring",
      inputData: "In-cab video feed, steering/lane telemetry",
      outputData: "Real-time drowsiness alert to the driver; event log for the fleet safety team",
      dataSource: "Vehicle-mounted cameras and telematics unit",
      humanOversightMechanism:
        "A fleet safety officer reviews flagged events weekly; the system never takes disciplinary action on its own.",
      autonomyLevel: "PARTIALLY_AUTOMATED",
      complianceOwnerName: "Mihai Stănescu",
      complianceOwnerRole: "Operations & Compliance Director",
      decisionsAndImpact:
        "Alerts drivers in real time and informs safety-coaching decisions about individual drivers.",
      userCount: 85,
      affectsEndCustomers: false,
      implementationStage: "PILOT",
      legalRole: "DEPLOYER",
      legalRoleReviewedByConsultant: false,
      riskClassification: "HIGH_RISK",
      riskClassificationReviewedByConsultant: false,
      createdById: logiflowAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "logiflow-driver-fatigue-monitoring-role-run" },
    update: {},
    create: {
      id: "logiflow-driver-fatigue-monitoring-role-run",
      aiSystemId: driverFatigue.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["deployer-use"] }],
      resultField: "legalRole",
      resultValue: "DEPLOYER",
      resultTentative: true,
      runByUserId: logiflowAdmin.id,
      runAt: addDays(-15),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "logiflow-driver-fatigue-monitoring-risk-run" },
    update: {},
    create: {
      id: "logiflow-driver-fatigue-monitoring-risk-run",
      aiSystemId: driverFatigue.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: [] },
        { nodeId: "annex-iii", kind: "checklist", checked: ["hr-worker-management"] },
        { nodeId: "escape-hatch", kind: "checklist", checked: [] },
      ],
      resultField: "riskClassification",
      resultValue: "HIGH_RISK",
      resultTentative: true,
      runByUserId: logiflowAdmin.id,
      runAt: addDays(-15),
    },
  });
  await seedSystemObligations({
    aiSystemId: driverFatigue.id,
    legalRole: driverFatigue.legalRole,
    riskClassification: driverFatigue.riskClassification,
    profile: "early",
    ownerName: "Mihai Stănescu",
    updatedById: logiflowAdmin.id,
    notApplicable: ["deployer-hr.art27-fria", "deployer-hr.art49-3-eu-database"],
    notes: {
      "deployer-hr.art26-7-worker-notice":
        "Driver notice letters drafted; being rolled out fleet-by-fleet during the pilot.",
    },
  });

  const routeOptimizer = await prisma.aiSystem.upsert({
    where: { id: "logiflow-route-optimization-engine" },
    update: {},
    create: {
      id: "logiflow-route-optimization-engine",
      organizationId: logiflow.id,
      name: "Route Optimization Engine",
      description:
        "In-house engine that plans daily delivery routes to minimize fuel use and delivery time across the fleet.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Route planning & dispatch",
      inputData: "Delivery addresses, traffic data, vehicle capacity, driver shift schedules",
      outputData: "Optimized route plan per vehicle; dispatcher can manually adjust any stop",
      dataSource: "Dispatch / transport management system",
      humanOversightMechanism:
        "The dispatcher approves the daily route plan and can reorder or reassign stops before it's sent to drivers.",
      autonomyLevel: "PARTIALLY_AUTOMATED",
      complianceOwnerName: "Mihai Stănescu",
      complianceOwnerRole: "Operations & Compliance Director",
      decisionsAndImpact:
        "Optimizes internal logistics; does not affect any individual's legal rights or access to services.",
      userCount: 10,
      affectsEndCustomers: false,
      implementationStage: "PRODUCTION",
      legalRole: "PROVIDER",
      legalRoleReviewedByConsultant: true,
      riskClassification: "NOT_HIGH_RISK",
      riskClassificationReviewedByConsultant: true,
      createdById: logiflowAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "logiflow-route-optimization-engine-role-run" },
    update: {},
    create: {
      id: "logiflow-route-optimization-engine-role-run",
      aiSystemId: routeOptimizer.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [{ nodeId: "signals", kind: "signalChecklist", checked: ["provider-original"] }],
      resultField: "legalRole",
      resultValue: "PROVIDER",
      resultTentative: false,
      runByUserId: logiflowAdmin.id,
      runAt: addDays(-250),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "logiflow-route-optimization-engine-risk-run" },
    update: {},
    create: {
      id: "logiflow-route-optimization-engine-risk-run",
      aiSystemId: routeOptimizer.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: [] },
        { nodeId: "annex-iii", kind: "checklist", checked: [] },
        { nodeId: "practical-rights", kind: "checklist", checked: [] },
      ],
      resultField: "riskClassification",
      resultValue: "NOT_HIGH_RISK",
      resultTentative: false,
      runByUserId: logiflowAdmin.id,
      runAt: addDays(-250),
    },
  });

  const warehouseRobotics = await prisma.aiSystem.upsert({
    where: { id: "logiflow-warehouse-robotics-vision-system" },
    update: {},
    create: {
      id: "logiflow-warehouse-robotics-vision-system",
      organizationId: logiflow.id,
      name: "Warehouse Robotics Vision System",
      description:
        "Computer-vision system guiding collaborative picking robots in the warehouse. LogiFlow integrates a vendor's vision model into its own robot control software and operates the robots on its floor.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Warehouse operations / automated picking",
      inputData: "Warehouse camera feeds, item barcodes, robot position telemetry",
      outputData: "Robot pick/place commands; safety-stop signal on human proximity",
      dataSource: "Warehouse camera network + robot control system",
      humanOversightMechanism:
        "Warehouse floor staff can trigger a manual e-stop at any time; a safety engineer reviews near-miss logs weekly.",
      autonomyLevel: "FULLY_AUTOMATED",
      complianceOwnerName: "Mihai Stănescu",
      complianceOwnerRole: "Operations & Compliance Director",
      decisionsAndImpact:
        "Controls physical robot movement around warehouse staff; a malfunction is a direct safety hazard.",
      userCount: 30,
      affectsEndCustomers: false,
      implementationStage: "PRODUCTION",
      legalRole: "BOTH",
      legalRoleReviewedByConsultant: true,
      riskClassification: "HIGH_RISK",
      riskClassificationReviewedByConsultant: true,
      createdById: logiflowAdmin.id,
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "logiflow-warehouse-robotics-vision-system-role-run" },
    update: {},
    create: {
      id: "logiflow-warehouse-robotics-vision-system-role-run",
      aiSystemId: warehouseRobotics.id,
      treeId: "role-classification",
      treeVersion: 1,
      answers: [
        {
          nodeId: "signals",
          kind: "signalChecklist",
          checked: ["deployer-use", "provider-integration"],
        },
      ],
      resultField: "legalRole",
      resultValue: "BOTH",
      resultTentative: false,
      runByUserId: anaConsultant.id,
      runAt: addDays(-180),
    },
  });
  await prisma.decisionRun.upsert({
    where: { id: "logiflow-warehouse-robotics-vision-system-risk-run" },
    update: {},
    create: {
      id: "logiflow-warehouse-robotics-vision-system-risk-run",
      aiSystemId: warehouseRobotics.id,
      treeId: "high-risk-classification",
      treeVersion: 1,
      answers: [
        { nodeId: "exclusions", kind: "checklist", checked: [] },
        { nodeId: "annex-i", kind: "checklist", checked: ["machinery"] },
      ],
      resultField: "riskClassification",
      resultValue: "HIGH_RISK",
      resultTentative: false,
      runByUserId: anaConsultant.id,
      runAt: addDays(-178),
    },
  });
  const warehouseObligations = await seedSystemObligations({
    aiSystemId: warehouseRobotics.id,
    legalRole: warehouseRobotics.legalRole,
    riskClassification: warehouseRobotics.riskClassification,
    profile: "mid",
    ownerName: "Mihai Stănescu",
    updatedById: anaConsultant.id,
    notApplicable: ["deployer-hr.art27-fria", "deployer-hr.art49-3-eu-database"],
  });
  if (warehouseObligations["provider-hr.art9-risk-management"]) {
    await seedPmSteps(
      warehouseObligations["provider-hr.art9-risk-management"],
      ["brainstorm-risks", "assess-risks", "define-mitigation", "review-signoff"],
      2,
      anaConsultant.id,
    );
  }
  if (warehouseObligations["provider-hr.art14-human-oversight"]) {
    await seedPmSteps(
      warehouseObligations["provider-hr.art14-human-oversight"],
      ["identify-oversight-points", "design-hmi", "train-overseers", "test-intervention"],
      1,
      anaConsultant.id,
    );
  }

  await prisma.aiSystem.upsert({
    where: { id: "logiflow-recruitment-cv-ranker" },
    update: {},
    create: {
      id: "logiflow-recruitment-cv-ranker",
      organizationId: logiflow.id,
      name: "Recruitment CV Ranker",
      description:
        "New AI-based CV ranking tool being evaluated by HR to help shortlist candidates for warehouse and driver roles; not yet in use, still being configured.",
      useCaseType: "INTERNAL_OPS",
      businessProcess: "Recruitment & candidate screening",
      inputData: "CVs/resumes, structured application answers",
      outputData: "(planned) candidate ranking score",
      dataSource: "Applicant tracking system (vendor evaluation license)",
      humanOversightMechanism:
        "(planned) HR recruiter to review all rankings before any candidate is rejected.",
      autonomyLevel: "CONSULTATIVE",
      complianceOwnerName: "Mihai Stănescu",
      complianceOwnerRole: "Operations & Compliance Director",
      decisionsAndImpact:
        "Would influence which candidates are shortlisted for interview once live.",
      userCount: 3,
      affectsEndCustomers: false,
      implementationStage: "PLANNED",
      createdById: logiflowAdmin.id,
    },
  });

  console.log("Seeded:");
  console.log("  admin@senecai.dev / changeme123 (SENECAI_ADMIN)");
  console.log("  consultant@senecai.dev / changeme123 (CONSULTANT — Demo Client SRL, NovaBank)");
  console.log("  ana.popescu@senecai.dev / changeme123 (CONSULTANT — MediCore, LogiFlow)");
  console.log("  client@demo.dev / changeme123 (CLIENT_ADMIN at Demo Client SRL)");
  console.log("  radu.ionescu@novabank.dev / changeme123 (CLIENT_ADMIN at NovaBank Retail SRL)");
  console.log("  elena.marin@novabank.dev / changeme123 (CLIENT_MEMBER at NovaBank Retail SRL)");
  console.log(
    "  ioana.dumitrescu@medicore.dev / changeme123 (CLIENT_ADMIN at MediCore Diagnostics SRL)",
  );
  console.log(
    "  mihai.stanescu@logiflow.dev / changeme123 (CLIENT_ADMIN at LogiFlow Transport SRL)",
  );
  console.log("");
  console.log(
    "3 demo clients seeded: NovaBank Retail SRL (4 AI systems), MediCore Diagnostics SRL (4 AI systems), LogiFlow Transport SRL (4 AI systems).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
