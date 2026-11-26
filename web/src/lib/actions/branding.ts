"use server";

import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { assertAdmin } from "@/lib/authz";
import { ValidationError } from "@/lib/services/classification";
import { audit } from "@/lib/services/audit";
import { actor, run, str } from "./run";

/** Logos are stored on the organisation as a data: URI and printed on its PDFs. */
const MAX_LOGO_BYTES = 300 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg"];

export async function saveBranding(form: FormData) {
  const ctx = await getCtx();
  await run("/settings/branding", async () => {
    assertAdmin(ctx);
    const brandName = str(form, "brandName").slice(0, 200) || null;
    const file = form.get("logo");
    const remove = str(form, "removeLogo") === "on";
    let brandLogo: string | null | undefined = remove ? null : undefined;
    if (!remove && file instanceof File && file.size > 0) {
      if (!LOGO_TYPES.includes(file.type)) throw new ValidationError("Upload the logo as a PNG or JPEG file.");
      if (file.size > MAX_LOGO_BYTES) throw new ValidationError("The logo must be smaller than 300 KB.");
      brandLogo = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
    }
    await withTenant(ctx, async (tx) => {
      await tx.organization.update({ where: { id: ctx.orgId }, data: { brandName, ...(brandLogo !== undefined ? { brandLogo } : {}) } });
      await audit(tx, actor(ctx), {
        entityType: "Organization",
        entityId: ctx.orgId,
        action: "organization.branding",
        after: { brandName, logo: brandLogo === undefined ? "unchanged" : brandLogo ? "uploaded" : "removed" },
      });
    });
    return { notice: "Branding saved. New PDFs use it; existing PDFs show as outdated, so you can regenerate them." };
  });
}
