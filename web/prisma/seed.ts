import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedDemoData } from "../src/lib/demo-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await seedDemoData(prisma);

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
