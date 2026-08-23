import { listAiSystems } from "@/lib/actions/ai-systems";
import { computeSystemReadiness } from "@/lib/obligations/readiness";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { InventoryLayouts, type InventoryRow } from "./inventory-layouts";

export default async function InventoryPage() {
  const systems = await listAiSystems();

  const rows: InventoryRow[] = systems.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    organizationName: s.organization.name,
    businessProcess: s.businessProcess,
    autonomyLevel: s.autonomyLevel,
    implementationStage: s.implementationStage,
    legalRole: s.legalRole,
    riskClassification: s.riskClassification,
    legalRoleReviewed: s.legalRoleReviewedByConsultant,
    riskClassificationReviewed: s.riskClassificationReviewedByConsultant,
    readinessPercent: computeSystemReadiness(s).percent,
  }));

  const stats = {
    systems: rows.length,
    highRisk: rows.filter((r) => r.riskClassification === "HIGH_RISK").length,
    awaitingReview: rows.filter(
      (r) => (r.legalRole && !r.legalRoleReviewed) || (r.riskClassification && !r.riskClassificationReviewed),
    ).length,
    classified: rows.filter((r) => r.legalRole && r.riskClassification).length,
    total: rows.length,
  };

  return (
    <>
      <PageHeader
        title="Module 1 — AI Inventory & Risk Classification"
        subtitle="One row per AI system. Role and risk classification are preliminary until a consultant reviews them."
        actions={
          <Button variant="primary" href="/inventory/new">
            + New AI system
          </Button>
        }
      />
      <InventoryLayouts rows={rows} stats={stats} />
    </>
  );
}
