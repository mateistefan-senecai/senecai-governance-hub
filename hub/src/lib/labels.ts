import type { TagTone } from "@/components/ui/tag";

export const RISK_LABEL: Record<string, string> = {
  PROHIBITED: "Prohibited",
  HIGH_RISK: "High-risk",
  LIMITED: "Limited risk",
  MINIMAL: "Minimal risk",
  OUT_OF_SCOPE: "Out of scope",
};

export const RISK_TONE: Record<string, TagTone> = {
  PROHIBITED: "ink-fill",
  HIGH_RISK: "gold-fill",
  LIMITED: "outline",
  MINIMAL: "muted",
  OUT_OF_SCOPE: "muted",
};

export const ROLE_LABEL: Record<string, string> = {
  provider: "Provider",
  deployer: "Deployer",
  importer: "Importer",
  distributor: "Distributor",
};

export const OBLIGATION_STATUS_LABEL: Record<string, string> = {
  NOT_ASSESSED: "Not assessed",
  COMPLIANT: "Compliant",
  PARTIAL: "Partial",
  GAP: "Gap",
};

export const OBLIGATION_STATUS_TONE: Record<string, TagTone> = {
  NOT_ASSESSED: "muted",
  COMPLIANT: "outline",
  PARTIAL: "prelim",
  GAP: "gold-fill",
};

export const CLASSIFICATION_STATUS_LABEL: Record<string, string> = {
  PRELIMINARY: "Preliminary",
  CONFIRMED: "Confirmed",
  OVERRIDDEN: "Overridden",
};

export const ORIGIN_LABEL: Record<string, string> = { BUILT: "Built", BOUGHT: "Bought", EMBEDDED: "Embedded" };
export const USE_TYPE_LABEL: Record<string, string> = { PRODUCT: "Product for customers", INTERNAL: "Internal operations", HYBRID: "Both" };
export const AUTONOMY_LABEL: Record<string, string> = {
  ADVISORY: "Advisory (human in the loop)",
  PARTIAL: "Partly automated (human on the loop)",
  FULL: "Fully automated",
};
export const STAGE_LABEL: Record<string, string> = { PLANNED: "Planned", PILOT: "Pilot", PRODUCTION: "In production", RETIRED: "Retired" };
export const MEMBER_ROLE_LABEL: Record<string, string> = { ORG_ADMIN: "Org admin", REVIEWER: "Reviewer", COMPANY_USER: "Company user" };
export const ORG_TYPE_LABEL: Record<string, string> = { CONSULTANCY: "Consultancy", LAW_FIRM: "Law firm", COMPANY: "Company" };
export const VENDOR_STATUS_LABEL: Record<string, string> = {
  TO_REQUEST: "To request",
  REQUESTED: "Requested",
  RECEIVED: "Received",
  NOT_AVAILABLE: "Not available",
};
export const ACTION_STATUS_LABEL: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In progress", DONE: "Done" };
export const EFFORT_LABEL: Record<string, string> = { S: "Small", M: "Medium", L: "Large" };

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function roleList(roles: string[]): string {
  return roles.length ? roles.map((r) => ROLE_LABEL[r] ?? r).join(" & ") : "No role";
}
