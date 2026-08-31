import { getAccessibleOrganizations } from "@/lib/actions/ai-systems";
import { getRegulationScope, setRegulationScope } from "@/lib/actions/regulation-scope";
import { REGULATIONS } from "@/lib/regulations";
import type { RegulationCode } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/ui/page-header";
import { PanelHeading } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { NoticeBar } from "@/components/ui/notice-bar";

const REGULATION_LABEL: Record<RegulationCode, string> = {
  AI_ACT: "AI Act",
  GDPR: "GDPR",
  NIS2: "NIS2",
  DORA: "DORA",
  CRA: "CRA",
};

const REGULATION_HELP: Record<RegulationCode, string> = {
  AI_ACT: "The only module actually built today.",
  GDPR: "Module not built yet — flagged here for when it is.",
  NIS2: "Module not built yet — flagged here for when it is.",
  DORA: "Module not built yet — flagged here for when it is.",
  CRA: "Module not built yet — flagged here for when it is.",
};

/**
 * Round-2 spec Section 6 — org-level regulation-scoping intake. This is
 * intentionally a direct checklist, not a derivation questionnaire: the
 * actual "which regulations apply given sector/size/etc." scoping logic
 * still needs to be supplied, so this only stores the resulting yes/no.
 */
export default async function RegulationScopePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const organizations = await getAccessibleOrganizations();
  const scopes = await Promise.all(organizations.map((org) => getRegulationScope(org.id)));

  return (
    <>
      {notice && <NoticeBar message={notice} />}
      <PageHeader
        crumb="Overview"
        title="Which regulations apply"
        subtitle="Determines which regulation tabs and the Overview dashboard treat as in scope for each organization. A full scoping questionnaire (sector, size, financial-sector status, etc.) is still to come — for now, set this directly."
      />

      <div className="p-8">
        {organizations.length === 0 && (
          <p className="rounded-xl border border-hairline bg-surface p-8 text-center text-[13px] text-muted shadow-sm">
            No organizations accessible yet.
          </p>
        )}

        {organizations.map((org, i) => {
          const scope = scopes[i];
          return (
            <div key={org.id} className="mt-6 first:mt-0">
              <PanelHeading title={org.name} kicker="Organization" />
              <form
                action={setRegulationScope}
                className="mt-3 rounded-xl border border-hairline bg-surface p-5 shadow-sm"
              >
                <input type="hidden" name="organizationId" value={org.id} />
                {/* AI Act is always in scope — it's the only module actually built — so its checkbox is
                    disabled (a disabled input never submits) and a hidden field carries the fixed value. */}
                <input type="hidden" name="regulation_AI_ACT" value="on" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {REGULATIONS.map((reg) => (
                    <label
                      key={reg}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-hairline bg-panel p-3 has-[:checked]:border-gold has-[:checked]:bg-gold-tint"
                    >
                      <input
                        type="checkbox"
                        name={reg === "AI_ACT" ? undefined : `regulation_${reg}`}
                        defaultChecked={scope[reg]}
                        disabled={reg === "AI_ACT"}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-[13px] font-semibold text-ink">{REGULATION_LABEL[reg]}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                          {REGULATION_HELP[reg]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <Button type="submit" variant="primary">
                    Save
                  </Button>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
