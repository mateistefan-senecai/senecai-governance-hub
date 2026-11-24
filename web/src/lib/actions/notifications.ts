"use server";

import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { markUpdatesSeen } from "@/lib/services/notifications";
import { run } from "./run";

/** The client's company user marks their updates as read. */
export async function markUpdatesSeenAction(back: string) {
  const ctx = await getCtx();
  // Only back to a page of the Hub.
  await run(back.startsWith("/clients/") ? back : "/home", async () => {
    await withTenant(ctx, (tx) => markUpdatesSeen(tx, ctx.membershipId));
  });
}
