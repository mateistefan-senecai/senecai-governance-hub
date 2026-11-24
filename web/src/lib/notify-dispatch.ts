// Not a server action module: these helpers take a context and must not be
// callable from the browser.
import type { Ctx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { dispatchNotifications } from "@/lib/services/notifications";

/** Emails pending notifications after the change that created them committed. Never fails the action. */
export async function dispatchAfterCommit(ctx: Ctx) {
  try {
    await withTenant(ctx, (tx) => dispatchNotifications(tx, ctx.orgId));
  } catch (e) {
    console.error("Notification email dispatch failed", e);
  }
}
