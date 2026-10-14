// Demo data. Run with `npx prisma db seed` (also runs after `prisma migrate reset`).
//
// Three tenants, to show isolation and the three kinds of user:
//   SenecAI (consultancy)        admin, a consultant assigned to one client, a company user at NovaBank
//   Ionescu & Asociații (firm)   a lawyer running their own client, invisible to SenecAI
//   Vitalis Health (company)     a company on its own account that invited the lawyer as reviewer
//
// All passwords: changeme123

import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { withTenant, type Tx } from "../src/lib/tenant";
import { loadBundleFromDisk } from "../src/lib/content/load";
import { validateBundle } from "../src/lib/content/validate";
import type { Answers, ContentBundle } from "../src/lib/content/types";
import type { Actor } from "../src/lib/services/audit";
import { confirmClassification, submitClassification } from "../src/lib/services/classification";
import { createSystem, runApplicability, type SystemInput } from "../src/lib/services/inventory";
import { assessObligation } from "../src/lib/services/assessment";
import type { MemberRole, OrganizationType } from "../src/generated/prisma/enums";

const PASSWORD = "changeme123";

const NO_ROLE: Answers = {
  "role.develops": false, "role.integrates": false, "role.rebrands": false, "role.modifies": false,
  "role.repurposes": false, "role.uses": false, "role.imports": false, "role.distributes": false,
};
const BASE: Answers = {
  ...NO_ROLE, "scope.exclusions": [], "prohibited.practices": [], "hr.annexI": [], "hr.annexIII": [],
  "t.interacts": false, "t.generates": false, "t.emotionOrBiometric": false,
};

async function main() {
  // Runs on every deploy (see the build script) but only fills an empty
  // database. Set SEED_DEMO_DATA=false once real clients use the platform.
  if (process.env.SEED_DEMO_DATA === "false") {
    console.log("SEED_DEMO_DATA=false; skipping demo data.");
    return;
  }
  if (await prisma.user.count()) {
    console.log("Database already has users; skipping seed. Use `npx prisma migrate reset` to start over.");
    return;
  }
  const bundle = await ensureContent();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = (email: string, name: string) => prisma.user.create({ data: { email, name, passwordHash: hash } });

  const admin = await user("admin@senecai.dev", "Matei Ștefan");
  const consultant = await user("consultant@senecai.dev", "Elena Marin");
  const companyUser = await user("client@novabank.dev", "Radu Ionescu");
  const lawyer = await user("lawyer@ionescu.law", "Andrei Ionescu");
  const vitalisAdmin = await user("it@vitalis.health", "Ioana Dobre");

  // ── SenecAI ──────────────────────────────────────────────────────────
  const senecai = await createOrg("SenecAI", "CONSULTANCY", "SenecAI");
  await withTenant({ userId: admin.id, orgId: senecai }, async (tx) => {
    const actor: Actor = { userId: admin.id, userName: admin.name, orgId: senecai };
    const consultantActor: Actor = { userId: consultant.id, userName: consultant.name, orgId: senecai };
    await member(tx, admin.id, senecai, "ORG_ADMIN");
    const consultantMembership = await member(tx, consultant.id, senecai, "REVIEWER");

    const novabank = await tx.client.create({ data: { organizationId: senecai, name: "NovaBank Retail SRL" } });
    const medicore = await tx.client.create({ data: { organizationId: senecai, name: "MediCore Diagnostics SRL" } });
    await tx.clientAssignment.create({ data: { organizationId: senecai, clientId: novabank.id, membershipId: consultantMembership.id } });
    await member(tx, companyUser.id, senecai, "COMPANY_USER", novabank.id);
    void medicore; // left before the applicability check, to show the gate

    const nb = await runApplicability(tx, actor, novabank, {
      "co.establishedInEU": true, "co.size": "large", "co.sector": "finance",
      "ai.builds": true, "ai.placesOnEUMarket": true, "ai.uses": true, "ai.importsOrDistributes": false,
      "data.personal": true,
    }, bundle);

    const scoring = await createSystem(tx, actor, nb, sys({
      name: "Credit Scoring Engine",
      purpose: "Scores retail loan applicants' creditworthiness and feeds the underwriting decision.",
      ownerName: "Mihai Georgescu", ownerRole: "Head of Credit Risk", origin: "BUILT",
      dataCategories: ["Financial data", "Identity data", "Credit bureau data"],
      deploymentContext: "Retail lending, all branches and online", useType: "PRODUCT", autonomy: "PARTIAL", stage: "PRODUCTION",
      affectedPersons: "Loan applicants (≈40,000 a year)",
    }));
    const scoringClass = await submitClassification(tx, actor, scoring, {
      ...BASE, "role.develops": true, "role.uses": true, "role.publicBody": false,
      "hr.annexIII": ["5b"], "hr.profiling": true,
    }, bundle);
    await confirmClassification(tx, consultantActor, scoringClass);
    await assess(tx, consultantActor, scoring.id, bundle, {
      "art4.literacy": ["COMPLIANT", "Credit risk team completed the internal AI literacy course in May 2026; attendance list reviewed in the client interview."],
      "art9.riskManagement": ["PARTIAL", "Model risk framework exists under banking rules, but does not yet cover fundamental-rights risks."],
      "art10.dataGovernance": ["GAP", "No documented bias examination of training data."],
      "art11.technicalDocumentation": ["GAP", "Model documentation exists but not in Annex IV structure."],
      "art12.recordKeeping": ["COMPLIANT", "Every score is logged with inputs, model version and timestamp; retention 10 years under banking rules."],
      "art14.humanOversight": ["PARTIAL", "Underwriters can override scores, but no documented guidance against automation bias."],
      "art27.fria": ["GAP", "No fundamental rights impact assessment carried out."],
    });

    const cv = await createSystem(tx, actor, nb, sys({
      name: "CV Screening Assistant",
      purpose: "Pre-ranks external candidates for open roles before HR review.",
      ownerName: "Laura Petrescu", ownerRole: "HR Director", origin: "BOUGHT", supplier: "TalentRank BV",
      dataCategories: ["CVs", "Application forms"],
      deploymentContext: "HR recruitment, used as provided by the vendor", useType: "INTERNAL", autonomy: "ADVISORY", stage: "PRODUCTION",
      affectedPersons: "Job applicants",
    }));
    await submitClassification(tx, actor, cv, {
      ...BASE, "role.uses": true, "role.publicBody": false, "hr.annexIII": ["4a"], "hr.profiling": true,
    }, bundle);
    await tx.vendorDocument.updateMany({ where: { systemId: cv.id, kind: "instructionsForUse" }, data: { status: "RECEIVED" } });
    await tx.vendorDocument.updateMany({ where: { systemId: cv.id, kind: "declarationOfConformity" }, data: { status: "REQUESTED" } });

    const chatbot = await createSystem(tx, actor, nb, sys({
      name: "Customer Support Chatbot",
      purpose: "Answers account and product questions on the website and hands over to a human agent.",
      ownerName: "Andreea Stan", ownerRole: "Digital Channels Lead", origin: "EMBEDDED", supplier: "Conversa AI GmbH",
      dataCategories: ["Chat transcripts"], deploymentContext: "Public website and mobile app",
      useType: "PRODUCT", autonomy: "FULL", stage: "PRODUCTION", affectedPersons: "Customers and website visitors",
    }));
    await submitClassification(tx, actor, chatbot, {
      ...BASE, "role.integrates": true, "role.uses": true, "role.publicBody": false,
      "t.interacts": true, "t.generates": true, "t.deepfake": false, "t.publicText": false,
    }, bundle);

    const fraud = await createSystem(tx, actor, nb, sys({
      name: "Fraud Detection Alerts",
      purpose: "Flags suspicious card transactions for the fraud team to review.",
      ownerName: "Victor Enache", ownerRole: "Head of Fraud Operations", origin: "BUILT",
      dataCategories: ["Transaction data"], deploymentContext: "Card payments monitoring",
      useType: "INTERNAL", autonomy: "ADVISORY", stage: "PRODUCTION", affectedPersons: "Card holders",
    }));
    await submitClassification(tx, actor, fraud, {
      ...BASE, "role.develops": true, "role.uses": true, "role.publicBody": false, "hr.rightsImpact": ["finance"],
    }, bundle);

    await createSystem(tx, actor, nb, sys({
      name: "Marketing Copy Generator",
      purpose: "Drafts campaign emails and social posts for the marketing team.",
      ownerName: "Andreea Stan", ownerRole: "Digital Channels Lead", origin: "BOUGHT", supplier: "WriteWell Inc.",
      dataCategories: ["Product information"], deploymentContext: "Marketing department",
      useType: "INTERNAL", autonomy: "ADVISORY", stage: "PILOT",
    }));
  });

  // ── Ionescu & Asociații (separate tenant) ───────────────────────────
  const ionescu = await createOrg("Ionescu & Asociații", "LAW_FIRM", "Ionescu & Asociații");
  await withTenant({ userId: lawyer.id, orgId: ionescu }, async (tx) => {
    const actor: Actor = { userId: lawyer.id, userName: lawyer.name, orgId: ionescu };
    await member(tx, lawyer.id, ionescu, "ORG_ADMIN");
    const logiflow = await tx.client.create({ data: { organizationId: ionescu, name: "LogiFlow Transport SRL" } });
    const lf = await runApplicability(tx, actor, logiflow, {
      "co.establishedInEU": true, "co.size": "medium", "co.sector": "manufacturing",
      "ai.builds": true, "ai.placesOnEUMarket": true, "ai.uses": true, "ai.importsOrDistributes": false,
      "data.personal": true,
    }, bundle);
    const robots = await createSystem(tx, actor, lf, sys({
      name: "Warehouse Picking Vision",
      purpose: "Guides collaborative picking robots using a vendor vision model integrated into LogiFlow's robot control software.",
      ownerName: "Cristian Vlad", ownerRole: "CTO", origin: "EMBEDDED", supplier: "VisionCore AG",
      dataCategories: ["Camera images"], deploymentContext: "Warehouses in Cluj and Timișoara; robots also sold to partners",
      useType: "HYBRID", autonomy: "FULL", stage: "PRODUCTION", affectedPersons: "Warehouse workers",
    }));
    await submitClassification(tx, actor, robots, {
      ...BASE, "role.integrates": true, "role.uses": true, "role.publicBody": false,
      "hr.annexI": ["machinery"], "hr.thirdPartyAssessment": true,
    }, bundle);
  });

  // ── Vitalis Health (a company on its own account) ────────────────────
  const vitalis = await createOrg("Vitalis Health SA", "COMPANY", null);
  await withTenant({ userId: vitalisAdmin.id, orgId: vitalis }, async (tx) => {
    await member(tx, vitalisAdmin.id, vitalis, "ORG_ADMIN");
    const self = await tx.client.create({ data: { organizationId: vitalis, name: "Vitalis Health SA" } });
    // The company invited an outside lawyer into its own workspace as reviewer.
    const invited = await member(tx, lawyer.id, vitalis, "REVIEWER");
    await tx.clientAssignment.create({ data: { organizationId: vitalis, clientId: self.id, membershipId: invited.id } });
  });

  console.log("Seeded 3 organisations. Sign in with any of:");
  for (const e of ["admin@senecai.dev", "consultant@senecai.dev", "client@novabank.dev", "lawyer@ionescu.law", "it@vitalis.health"]) {
    console.log(`  ${e}  /  ${PASSWORD}`);
  }
}

async function ensureContent(): Promise<ContentBundle> {
  const bundle = loadBundleFromDisk();
  const errors = validateBundle(bundle);
  if (errors.length) throw new Error(`Content is invalid:\n${errors.join("\n")}`);
  await prisma.contentVersion.upsert({
    where: { version: bundle.version },
    create: { version: bundle.version, status: bundle.status, notes: bundle.notes, bundle: bundle as object },
    update: {},
  });
  return bundle;
}

async function createOrg(name: string, type: OrganizationType, brandName: string | null) {
  const id = randomUUID();
  // The insert must happen inside the new organisation's own context: the
  // row-level security policy only accepts rows for the active organisation.
  await withTenant({ userId: "seed", orgId: id }, (tx) => tx.organization.create({ data: { id, name, type, brandName } }));
  return id;
}

function member(tx: Tx, userId: string, organizationId: string, role: MemberRole, clientId?: string) {
  return tx.membership.create({ data: { userId, organizationId, role, clientId } });
}

function sys(s: Partial<SystemInput> & Pick<SystemInput, "name" | "purpose" | "ownerName" | "origin" | "deploymentContext" | "useType" | "autonomy" | "stage">): SystemInput {
  return { description: null, ownerRole: null, supplier: null, dataCategories: [], affectedPersons: null, ...s };
}

async function assess(tx: Tx, actor: Actor, systemId: string, bundle: ContentBundle, statuses: Record<string, ["COMPLIANT" | "PARTIAL" | "GAP", string]>) {
  for (const [key, [status, why]] of Object.entries(statuses)) {
    const so = await tx.systemObligation.findUniqueOrThrow({
      where: { systemId_obligationKey: { systemId, obligationKey: key } },
      include: { system: { select: { clientId: true } } },
    });
    await assessObligation(tx, actor, so, status, why, bundle);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
