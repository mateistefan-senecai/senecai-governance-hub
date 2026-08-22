import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

  console.log("Seeded:");
  console.log("  admin@senecai.dev / changeme123 (SENECAI_ADMIN)");
  console.log("  consultant@senecai.dev / changeme123 (CONSULTANT, assigned to Demo Client SRL)");
  console.log("  client@demo.dev / changeme123 (CLIENT_ADMIN at Demo Client SRL)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
