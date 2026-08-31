"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/generated/prisma/enums";
import { seedDemoData } from "@/lib/demo-data";
import { revalidatePath } from "next/cache";

/**
 * Loads the synthetic 3-client demo dataset into whichever database this
 * deployment is actually connected to. Exists because a deployed
 * environment's DB isn't reachable to run `prisma/seed.ts` against directly
 * — a SenecAI admin triggers this from the running app instead, so the write
 * happens through the app's own DB connection. Safe to call more than once:
 * every row is upserted by a fixed id, so a repeat call just re-syncs it.
 */
export async function loadDemoData() {
  const session = await auth();
  if (!session || session.user.role !== UserRole.SENECAI_ADMIN) {
    throw new Error("Only a SenecAI admin can load demo data");
  }

  await seedDemoData(prisma);

  revalidatePath("/overview");
  revalidatePath("/inventory");
  revalidatePath("/compliance-plan");
  revalidatePath("/settings/regulations");
}
