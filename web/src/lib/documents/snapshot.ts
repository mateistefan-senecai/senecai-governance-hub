// The structured data a PDF is built from, and its input hash.
//
// Every PDF is rendered from a snapshot taken from the same records the
// screens show, so the two always match (spec §4). The snapshot holds only
// what the deliverable prints, plus the legal content version, and nothing
// volatile (no "generated at"): the same records give the same snapshot and
// the same hash. When any of those records, or the current legal content
// version, changes, the hash changes and the document is outdated
// (concept note §6).

import { createHash } from "node:crypto";
import type { Tx } from "@/lib/tenant";
import type { DocumentKind } from "@/generated/prisma/enums";
import type { ContentBundle, Firing, ObligationDef, Outputs } from "@/lib/content/types";
import { getContentVersion, getCurrentContent } from "@/lib/content/current";
import { readiness } from "@/lib/services/assessment";
import type { Finding } from "@/lib/services/inventory";

// ── Shapes ────────────────────────────────────────────────────────────────

export type ApplicabilitySnap = {
  checkedAt: string | null;
  contentVersion: string | null;
  findings: Pick<Finding, "name" | "applies" | "provision" | "summary" | "coveredInThisVersion">[];
};

export type ClassificationSnap = {
  version: number;
  status: "PRELIMINARY" | "CONFIRMED" | "OVERRIDDEN";
  stale: boolean;
  contentVersion: string;
  riskClass: string;
  computedRiskClass: string;
  roles: string[];
  outOfScope: boolean;
  prohibited: boolean;
  prohibitedPractices: string[];
  highRisk: boolean;
  highRiskBasis: string[];
  art6_3Exempt: boolean;
  transparency: string[];
  attention: string[];
  reasoning: Firing[];
  overrideReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
};

export type ObligationSnap = {
  key: string;
  article: string;
  title: string;
  summary: string;
  party: string;
  appliesFrom: string | null;
  dateProvision: string | null;
  appliesBecause: string;
  evidenceExpected: string[];
  status: "NOT_ASSESSED" | "COMPLIANT" | "PARTIAL" | "GAP";
  statusRationale: string | null;
  assessedByName: string | null;
  assessedAt: string | null;
  needsReassessment: boolean;
  ownerName: string | null;
  contentVersion: string;
};

export type VendorDocSnap = { label: string; citation: string; status: string };

export type SystemSnap = {
  name: string;
  purpose: string;
  description: string | null;
  ownerName: string;
  ownerRole: string | null;
  origin: string;
  supplier: string | null;
  dataCategories: string[];
  deploymentContext: string;
  useType: string;
  autonomy: string;
  stage: string;
  affectedPersons: string | null;
  vendorDocuments: VendorDocSnap[];
  classification: ClassificationSnap | null;
  obligations: ObligationSnap[];
  readiness: number | null;
};

export type ActionSnap = {
  title: string;
  type: "LEGAL" | "TECHNICAL";
  phase: number;
  effort: string;
  ownerName: string | null;
  dueDate: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  systemName: string;
  article: string;
  obligationTitle: string;
  obligationStatus: string;
  helpRequested: boolean;
};

/** What a deliverable shows. Sections a kind does not print are left out, so they cannot outdate it. */
export type Snapshot = {
  kind: DocumentKind;
  /** Legal content version current at generation. */
  contentVersion: string;
  /** Content versions the client's classifications and obligations were built on. */
  recordContentVersions: string[];
  organization: { name: string; brandName: string | null; brandLogo: string | null };
  client: { name: string };
  applicability: ApplicabilitySnap;
  systems: SystemSnap[];
  actions?: ActionSnap[];
  overallReadiness?: number | null;
};

// ── Loading ───────────────────────────────────────────────────────────────

/**
 * Everything about one client the deliverables can print, read once. The
 * caller has already checked that the person may see the client.
 */
export async function loadClientRecord(tx: Tx, clientId: string) {
  const client = await tx.client.findUniqueOrThrow({ where: { id: clientId }, include: { organization: true } });
  const current = await getCurrentContent(tx);
  const systems = await tx.aiSystem.findMany({
    where: { clientId },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    include: {
      classifications: { where: { isCurrent: true } },
      systemObligations: { where: { active: true }, include: { actions: { include: { enquiry: { select: { id: true } } } } } },
      vendorDocuments: { orderBy: { kind: "asc" } },
    },
  });
  const versions = new Set<string>();
  for (const s of systems) {
    for (const c of s.classifications) versions.add(c.contentVersion);
    for (const o of s.systemObligations) versions.add(o.contentVersion);
  }
  const bundles = new Map<string, ContentBundle>([[current.version, current]]);
  for (const v of versions) if (!bundles.has(v)) bundles.set(v, await getContentVersion(tx, v));

  const userIds = new Set<string>();
  for (const s of systems) {
    for (const c of s.classifications) if (c.reviewedById) userIds.add(c.reviewedById);
    for (const o of s.systemObligations) if (o.assessedById) userIds.add(o.assessedById);
  }
  const users = await tx.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } });
  return { client, current, systems, bundles, versions: [...versions].sort(), userNames: new Map(users.map((u) => [u.id, u.name])) };
}

export type ClientRecord = Awaited<ReturnType<typeof loadClientRecord>>;

// ── Building ──────────────────────────────────────────────────────────────

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function classificationSnap(rec: ClientRecord, s: ClientRecord["systems"][number]): ClassificationSnap | null {
  const c = s.classifications[0];
  if (!c) return null;
  const e = c.effective as Outputs;
  const computed = c.computed as Outputs;
  return {
    version: c.version,
    status: c.status,
    stale: s.classificationStale,
    contentVersion: c.contentVersion,
    riskClass: String(e.riskClass),
    computedRiskClass: String(computed.riskClass),
    roles: strings(e.roles),
    outOfScope: e.outOfScope === true,
    prohibited: e.prohibited === true,
    prohibitedPractices: strings(e.prohibitedPractices),
    highRisk: e.highRisk === true,
    highRiskBasis: strings(e.highRiskBasis),
    art6_3Exempt: e.art6_3Exempt === true,
    transparency: strings(e.transparency),
    attention: strings(e.attention),
    reasoning: ((c.reasoning as Firing[]) ?? []).map((f) => ({ ruleId: f.ruleId, citation: f.citation, rationale: f.rationale })),
    overrideReason: c.overrideReason,
    reviewedByName: c.reviewedById ? (rec.userNames.get(c.reviewedById) ?? "Unknown reviewer") : null,
    reviewedAt: iso(c.reviewedAt),
  };
}

function obligationSnaps(rec: ClientRecord, s: ClientRecord["systems"][number]): ObligationSnap[] {
  const rows = s.systemObligations.map((o) => {
    const bundle = rec.bundles.get(o.contentVersion)!;
    const index = bundle.obligations.findIndex((d) => d.key === o.obligationKey);
    const def: ObligationDef | undefined = bundle.obligations[index];
    const dateKey = def ? resolveDateKeyFor(def, s.classifications[0]?.effective as Outputs | undefined) : null;
    const snap: ObligationSnap = {
      key: o.obligationKey,
      article: def?.article ?? o.obligationKey,
      title: def?.title ?? o.obligationKey,
      summary: def?.summary ?? "",
      party: o.party,
      appliesFrom: iso(o.appliesFrom),
      dateProvision: dateKey ? (bundle.dates[dateKey]?.provision ?? null) : null,
      appliesBecause: o.rationale,
      evidenceExpected: def?.evidenceExpected ?? [],
      status: o.status,
      statusRationale: o.statusRationale,
      assessedByName: o.assessedById ? (rec.userNames.get(o.assessedById) ?? "Unknown reviewer") : null,
      assessedAt: iso(o.assessedAt),
      needsReassessment: o.needsReassessment,
      ownerName: o.ownerName,
      contentVersion: o.contentVersion,
    };
    return { snap, index };
  });
  // Content-library order follows the articles.
  return rows.sort((a, b) => a.index - b.index || a.snap.key.localeCompare(b.snap.key)).map((r) => r.snap);
}

function resolveDateKeyFor(def: ObligationDef, effective: Outputs | undefined): string {
  if (def.appliesFrom !== "highRisk") return def.appliesFrom;
  const basis = strings(effective?.highRiskBasis);
  return basis.some((b) => b.startsWith("annexIII")) ? "highRiskAnnexIII" : "highRiskAnnexI";
}

function systemSnap(rec: ClientRecord, s: ClientRecord["systems"][number], kind: DocumentKind): SystemSnap {
  const withInventory = kind === "INVENTORY" || kind === "PACK";
  const withObligations = kind !== "INVENTORY" && kind !== "CLASSIFICATION";
  const withAssessment = kind === "GAP_ASSESSMENT" || kind === "ROADMAP" || kind === "PACK";
  const bundle = rec.bundles.get(s.classifications[0]?.contentVersion ?? rec.current.version) ?? rec.current;
  const vendorLabels = new Map(bundle.vendorDocuments.map((d) => [d.kind, d]));

  let obligations = withObligations ? obligationSnaps(rec, s) : [];
  if (withObligations && !withAssessment) {
    // The obligation mapping does not print assessments, so they must not outdate it.
    obligations = obligations.map((o) => ({
      ...o,
      status: "NOT_ASSESSED",
      statusRationale: null,
      assessedByName: null,
      assessedAt: null,
      needsReassessment: false,
    }));
  }
  // Every deliverable prints each system's role and risk class.
  let classification = classificationSnap(rec, s);
  if (classification && kind === "INVENTORY") {
    // The inventory prints the role and risk class, not the reasoning.
    classification = { ...classification, reasoning: [], attention: [] };
  }
  // Every deliverable heads a system with its name, purpose, owner and
  // origin; the full record is printed by the inventory only.
  return {
    name: s.name,
    purpose: s.purpose,
    ownerName: s.ownerName,
    origin: s.origin,
    supplier: s.supplier,
    description: withInventory ? s.description : null,
    ownerRole: withInventory ? s.ownerRole : null,
    dataCategories: withInventory ? s.dataCategories : [],
    deploymentContext: withInventory ? s.deploymentContext : "",
    useType: withInventory ? s.useType : "",
    autonomy: withInventory ? s.autonomy : "",
    stage: withInventory ? s.stage : "",
    affectedPersons: withInventory ? s.affectedPersons : null,
    vendorDocuments: withInventory
      ? s.vendorDocuments.map((v) => ({
          label: vendorLabels.get(v.kind)?.label ?? v.kind,
          citation: vendorLabels.get(v.kind)?.citation ?? "",
          status: v.status,
        }))
      : [],
    classification,
    obligations,
    readiness: withAssessment ? readiness(s.systemObligations) : null,
  };
}

function actionSnaps(rec: ClientRecord): ActionSnap[] {
  const rows: { action: ActionSnap; order: number }[] = [];
  for (const s of rec.systems) {
    for (const o of s.systemObligations) {
      const bundle = rec.bundles.get(o.contentVersion)!;
      const index = bundle.obligations.findIndex((d) => d.key === o.obligationKey);
      const def = bundle.obligations[index];
      for (const a of o.actions) {
        rows.push({
          order: index,
          action: {
            title: a.title,
            type: a.type,
            phase: a.phase,
            effort: a.effort,
            ownerName: a.ownerName,
            dueDate: iso(a.dueDate),
            status: a.status,
            systemName: s.name,
            article: def?.article ?? o.obligationKey,
            obligationTitle: def?.title ?? o.obligationKey,
            obligationStatus: o.status,
            helpRequested: a.enquiry !== null,
          },
        });
      }
    }
  }
  return rows
    .sort(
      (x, y) =>
        x.action.phase - y.action.phase ||
        x.action.systemName.localeCompare(y.action.systemName) ||
        x.order - y.order ||
        x.action.title.localeCompare(y.action.title),
    )
    .map((r) => r.action);
}

/** The snapshot a document of `kind` would be built from right now. */
export function buildSnapshot(rec: ClientRecord, kind: DocumentKind): Snapshot {
  const org = rec.client.organization;
  const app = rec.client.applicability as { findings?: Finding[] } | null;
  const withActions = kind === "ROADMAP" || kind === "PACK";
  const withReadiness = kind === "GAP_ASSESSMENT" || kind === "ROADMAP" || kind === "PACK";
  return {
    kind,
    contentVersion: rec.current.version,
    recordContentVersions: rec.versions,
    organization: { name: org.name, brandName: org.brandName, brandLogo: org.brandLogo },
    client: { name: rec.client.name },
    applicability: {
      checkedAt: iso(rec.client.applicabilityAt),
      contentVersion: rec.client.applicabilityContentVersion,
      findings: (app?.findings ?? []).map((f) => ({
        name: f.name,
        applies: f.applies,
        provision: f.provision,
        summary: f.summary,
        coveredInThisVersion: f.coveredInThisVersion,
      })),
    },
    systems: rec.systems.map((s) => systemSnap(rec, s, kind)),
    ...(withActions ? { actions: actionSnaps(rec) } : {}),
    ...(withReadiness ? { overallReadiness: readiness(rec.systems.flatMap((s) => s.systemObligations)) } : {}),
  };
}

// ── Hashing ───────────────────────────────────────────────────────────────

/** JSON with object keys sorted, so the hash does not depend on key order (jsonb does not keep it). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
            .map((k) => [k, (v as Record<string, unknown>)[k]]),
        )
      : v,
  );
}

export function inputHash(snapshot: Snapshot): string {
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}
