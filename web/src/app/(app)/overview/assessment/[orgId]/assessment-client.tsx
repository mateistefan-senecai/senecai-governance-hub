"use client";

import { useState } from "react";
import RegulatoryExposureForm from "@/components/regulatory-exposure/RegulatoryExposureForm";
import type { Answers, AssessmentResult } from "@/components/regulatory-exposure/types";
import { saveExposureAssessment } from "@/lib/actions/exposure-assessment";

export function AssessmentClient({
  organizationId,
  organizationName,
  initialAnswers,
}: {
  organizationId: string;
  organizationName: string;
  initialAnswers?: Answers;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <RegulatoryExposureForm
      organizationName={organizationName}
      initialAnswers={initialAnswers}
      saving={saving}
      onComplete={async (result: AssessmentResult) => {
        setSaving(true);
        await saveExposureAssessment(organizationId, result);
      }}
    />
  );
}
