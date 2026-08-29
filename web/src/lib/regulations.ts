import type { RegulationCode } from "@/generated/prisma/enums";

// Plain constant, kept out of lib/actions/regulation-scope.ts because a
// "use server" file may only export async functions.
export const REGULATIONS: RegulationCode[] = ["AI_ACT", "GDPR", "NIS2", "DORA", "CRA"];
