import { notFound } from "next/navigation";
import { getCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { canAdmin } from "@/lib/authz";
import { saveBranding } from "@/lib/actions/branding";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ORG_TYPE_LABEL } from "@/lib/labels";

const LABEL = "block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label";

/** Admin: the name and logo printed on the organisation's PDFs. */
export default async function BrandingPage() {
  const ctx = await getCtx();
  if (!canAdmin(ctx)) notFound();
  const org = await withTenant(ctx, (tx) =>
    tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { name: true, type: true, brandName: true, brandLogo: true } }),
  );
  const fallback = org.type === "CONSULTANCY" ? "the SenecAI Compliance logo" : `your firm's name (${org.brandName ?? org.name}) in text`;

  return (
    <>
      <PageHeader
        crumb={`${ctx.orgName} · ${ORG_TYPE_LABEL[ctx.orgType]}`}
        title="Branding"
        subtitle="The name and logo at the top of every PDF your organisation issues to its clients."
        actions={<Button href="/clients">← Clients</Button>}
      />
      <div className="p-8">
        <Panel className="max-w-xl">
          <form action={saveBranding} encType="multipart/form-data" className="space-y-5">
            <div>
              <label htmlFor="brandName" className={LABEL}>Name on the PDFs</label>
              <input
                id="brandName"
                name="brandName"
                defaultValue={org.brandName ?? org.name}
                maxLength={200}
                className="mt-1.5 block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-ink"
              />
              <p className="mt-1 text-[12px] text-muted">Shown as &ldquo;Prepared by&rdquo; on the cover.</p>
            </div>
            <div>
              <p className={LABEL}>Logo</p>
              <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-hairline bg-white px-4">
                {org.brandLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a data: URI from the database
                  <img src={org.brandLogo} alt="Current logo" className="max-h-14 max-w-full object-contain" />
                ) : (
                  <span className="text-[12.5px] text-muted">No logo yet: PDFs show {fallback}.</span>
                )}
              </div>
              <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" className="mt-3 block text-[13px]" />
              <p className="mt-1 text-[12px] text-muted">PNG or JPEG, under 300 KB. A wide logo on a white or transparent background prints best.</p>
              {org.brandLogo && (
                <label className="mt-2 flex items-center gap-2 text-[13px] text-ink">
                  <input type="checkbox" name="removeLogo" /> Remove the logo
                </label>
              )}
            </div>
            <Button variant="primary">Save branding</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
