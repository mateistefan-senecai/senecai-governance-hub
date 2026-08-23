"use client";

import { useState } from "react";
import { WizardModal } from "@/components/decision-tree-wizard/wizard-modal";
import { ClassificationTag } from "@/components/ui/classification-tag";
import { Button } from "@/components/ui/button";
import { markBothReviewed } from "@/lib/actions/ai-systems";
import type { LegalRole, RiskClassification } from "@/generated/prisma/enums";

export function ClassificationCard({
  aiSystemId,
  aiSystemName,
  legalRole,
  riskClassification,
  legalRoleReviewed,
  riskClassificationReviewed,
  canReview,
}: {
  aiSystemId: string;
  aiSystemName: string;
  legalRole: LegalRole | null;
  riskClassification: RiskClassification | null;
  legalRoleReviewed: boolean;
  riskClassificationReviewed: boolean;
  canReview: boolean;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const bothReviewed = legalRoleReviewed && riskClassificationReviewed;
  const hasClassification = legalRole !== null || riskClassification !== null;

  return (
    <div className="border-2 border-ink bg-surface p-4">
      <p className="font-narrow text-[10px] font-semibold uppercase tracking-micro-wide text-label">
        Features 1.2 &amp; 1.3 — classification
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <ClassificationTag value={legalRole} reviewed={legalRoleReviewed} variant="record" />
        <ClassificationTag value={riskClassification} reviewed={riskClassificationReviewed} variant="record" />
      </div>

      <p className="mt-2 text-[12px] text-muted">
        {!hasClassification
          ? "Not classified yet."
          : bothReviewed
            ? "Approved by a consultant."
            : "Derived by the decision trees — a consultant must review before it's binding."}
      </p>

      <Button variant="primary" className="mt-3 w-full justify-start" onClick={() => setWizardOpen(true)}>
        {hasClassification ? "Re-run decision tree →" : "Run decision tree →"}
      </Button>

      {canReview && hasClassification && !bothReviewed && (
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start"
          disabled={approving}
          onClick={async () => {
            setApproving(true);
            await markBothReviewed(aiSystemId);
            setApproving(false);
          }}
        >
          {approving ? "Approving…" : "Consultant: approve classification"}
        </Button>
      )}

      {wizardOpen && (
        <WizardModal
          aiSystemId={aiSystemId}
          aiSystemName={aiSystemName}
          aiSystemPath={`/inventory/${aiSystemId}`}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
