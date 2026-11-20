// Renders a deliverable to PDF from its snapshot (concept note §6).
//
// @react-pdf/renderer is plain JavaScript (no headless browser), so it runs
// in a Vercel serverless function. Fonts are embedded from assets/fonts
// (Inter and Source Serif 4, SIL Open Font License) because the PDF
// standard fonts cannot print Romanian diacritics (ș, ț, ă).
//
// The PDF is a sober legal deliverable: a cover with the client, the
// document's state, version, reviewer, date, legal content version and the
// applicability-check summary; then the module sections, with the article
// each statement rests on.

import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { DocumentKind, DocumentState } from "@/generated/prisma/enums";
import {
  ACTION_STATUS_LABEL,
  AUTONOMY_LABEL,
  CLASSIFICATION_STATUS_LABEL,
  EFFORT_LABEL,
  OBLIGATION_STATUS_LABEL,
  ORIGIN_LABEL,
  RISK_LABEL,
  STAGE_LABEL,
  USE_TYPE_LABEL,
  VENDOR_STATUS_LABEL,
  roleList,
} from "@/lib/labels";
import { KIND_BY_ID, MODULE_KINDS, STATE_LABEL } from "./kinds";
import type { Narrative } from "./narrative";
import type { ClassificationSnap, Snapshot, SystemSnap } from "./snapshot";

// ── Fonts ─────────────────────────────────────────────────────────────────

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(dir, "Inter_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Inter_400Regular_Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(dir, "Inter_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Inter_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "SourceSerif", fonts: [{ src: path.join(dir, "SourceSerif4_600SemiBold.ttf"), fontWeight: 600 }] });
  // Legal text: no automatic hyphenation.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

// ── Style ─────────────────────────────────────────────────────────────────

const C = {
  ink: "#16130f",
  body: "#3e3930",
  muted: "#6e6656",
  label: "#8b8375",
  hairline: "#d9d2c2",
  light: "#ede6d5",
  panel: "#f7f4ec",
  gold: "#a8801f",
  goldDeep: "#5c4712",
  goldTint: "#f2e6c8",
};

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 8.6, color: C.body, paddingTop: 62, paddingBottom: 58, paddingHorizontal: 48, lineHeight: 1.4 },
  header: { position: "absolute", top: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: C.hairline, paddingBottom: 6, fontSize: 7, color: C.muted },
  footer: { position: "absolute", bottom: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: C.hairline, paddingTop: 6, fontSize: 6.8, color: C.label },
  watermark: { position: "absolute", top: 360, left: 40, right: 40, textAlign: "center", fontSize: 72, fontWeight: 700, color: C.gold, opacity: 0.07, transform: "rotate(-30deg)" },
  kicker: { fontSize: 7, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: C.gold },
  h1: { fontFamily: "SourceSerif", fontWeight: 600, fontSize: 26, color: C.ink, marginTop: 6, lineHeight: 1.15 },
  h2: { fontFamily: "SourceSerif", fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 6, lineHeight: 1.2 },
  h3: { fontFamily: "SourceSerif", fontWeight: 600, fontSize: 11.5, color: C.ink, marginBottom: 3 },
  label: { fontSize: 6.6, fontWeight: 600, letterSpacing: 0.9, textTransform: "uppercase", color: C.label },
  strong: { fontWeight: 600, color: C.ink },
  muted: { color: C.muted },
  cite: { fontSize: 7, fontWeight: 600, color: C.goldDeep },
  para: { marginBottom: 4 },
  section: { marginTop: 18 },
  rule: { borderBottomWidth: 0.5, borderBottomColor: C.hairline, marginVertical: 10 },
  table: { borderWidth: 0.5, borderColor: C.hairline },
  th: { flexDirection: "row", backgroundColor: C.ink, color: "#f7f4ec", fontSize: 6.6, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.light },
  td: { paddingVertical: 4, paddingHorizontal: 5 },
  box: { borderWidth: 0.5, borderColor: C.hairline, backgroundColor: C.panel, padding: 8, marginTop: 6 },
  notice: { borderWidth: 0.8, borderColor: C.gold, backgroundColor: C.goldTint, color: C.goldDeep, padding: 8, marginTop: 10 },
  systemHead: { marginTop: 14, marginBottom: 5, paddingBottom: 4, borderBottomWidth: 0.8, borderBottomColor: C.ink },
});

// ── Helpers ───────────────────────────────────────────────────────────────

const date = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—";

const PARTY = (p: string) => p.split(" & ").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" & ");

const SCREEN_OF: Record<string, string> = {
  role: "Role (Art. 3, Art. 25)",
  scope: "Scope (Art. 2)",
  prohibited: "Prohibited practices (Art. 5)",
  hr: "High-risk test (Art. 6, Annexes I and III)",
  t: "Transparency (Art. 50)",
  risk: "Risk class",
};

type Col = { title: string; width: number | string };

function Table({ cols, rows }: { cols: Col[]; rows: ReactNode[][] }) {
  return (
    <View style={s.table}>
      <View style={s.th}>
        {cols.map((c, i) => (
          <Text key={i} style={[s.td, { width: c.width }]}>
            {c.title}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {r.map((cell, j) => (
            <View key={j} style={[s.td, { width: cols[j].width }]}>
              {typeof cell === "string" || typeof cell === "number" ? <Text>{cell}</Text> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function KeyValues({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {items.map(([k, v]) => (
        <View key={k} style={{ width: "50%", paddingRight: 8, marginBottom: 5 }}>
          <Text style={s.label}>{k}</Text>
          <Text style={{ color: C.ink }}>{v || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function SystemHeading({ sys, index, brief = false }: { sys: SystemSnap; index: number; brief?: boolean }) {
  const c = sys.classification;
  return (
    <View style={s.systemHead} minPresenceAhead={80}>
      <Text style={s.h3}>
        {index + 1}. {sys.name}
      </Text>
      {!brief && <Text style={s.muted}>
        {sys.purpose} · Owner: {sys.ownerName} · {ORIGIN_LABEL[sys.origin]}
        {sys.supplier ? ` (${sys.supplier})` : ""}
        {c ? ` · ${RISK_LABEL[c.riskClass] ?? c.riskClass} · ${roleList(c.roles)}` : " · Not classified"}
      </Text>}
    </View>
  );
}

function classificationStatusLine(c: ClassificationSnap) {
  const base = `${CLASSIFICATION_STATUS_LABEL[c.status]}${c.reviewedByName ? ` by ${c.reviewedByName}, ${date(c.reviewedAt)}` : " — not yet reviewed"}`;
  return `${base} · classification v${c.version} · legal content ${c.contentVersion}${c.stale ? " · OUTDATED: the system record changed after classification" : ""}`;
}

// ── Cover ─────────────────────────────────────────────────────────────────

export type RenderInput = {
  kind: DocumentKind;
  version: number;
  state: DocumentState;
  snapshot: Snapshot;
  narrative: Narrative;
  narrativeSource: string;
  inputHash: string;
  createdAt: Date;
  createdByName: string;
  reviewerName: string | null;
  approvedAt: Date | null;
  releasedAt: Date | null;
};

/**
 * The organisation's mark. Branding settings are not built yet: this prints
 * the brand name (or organisation name), and the logo once
 * `Organization.brandLogo` holds an image. Only `data:` URIs are used, so
 * rendering never fetches from the network.
 */
function BrandMark({ org }: { org: Snapshot["organization"] }) {
  const name = org.brandName ?? org.name;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {org.brandLogo?.startsWith("data:image/") ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
        <Image src={org.brandLogo} style={{ height: 28, marginRight: 10 }} />
      ) : null}
      <Text style={{ fontFamily: "SourceSerif", fontWeight: 600, fontSize: 13, color: C.ink }}>{name}</Text>
    </View>
  );
}

function Cover({ input }: { input: RenderInput }) {
  const { snapshot: snap, state } = input;
  const def = KIND_BY_ID.get(input.kind)!;
  const approved = state === "APPROVED" || state === "RELEASED";
  const facts: [string, string][] = [
    ["Client", snap.client.name],
    ["Status", STATE_LABEL[state]],
    ["Version", `Version ${input.version}`],
    ["Date", date(approved ? input.approvedAt : input.createdAt) + (approved ? " (approved)" : " (generated)")],
    ["Reviewer", approved && input.reviewerName ? input.reviewerName : "Not yet approved by a reviewer"],
    ["Released to client", input.releasedAt ? date(input.releasedAt) : "Not released"],
    ["Legal content version", snap.contentVersion],
    ["Prepared by", `${input.createdByName}, ${snap.organization.name}`],
  ];
  return (
    <View>
      <BrandMark org={snap.organization} />
      <View style={{ marginTop: 70 }}>
        <Text style={s.kicker}>EU AI Act (Regulation (EU) 2024/1689) · {def.step}</Text>
        <Text style={s.h1}>{def.title}</Text>
        <Text style={{ fontSize: 13, color: C.body, marginTop: 6 }}>{snap.client.name}</Text>
        <Text style={[s.muted, { marginTop: 8, maxWidth: 400 }]}>{def.description}</Text>
        <Text style={[s.cite, { marginTop: 6 }]}>Main provisions: {def.provisions}</Text>
      </View>

      <View style={[s.box, { marginTop: 28, padding: 12 }]}>
        <KeyValues items={facts} />
      </View>
      {!approved && (
        <View style={s.notice}>
          <Text style={{ fontWeight: 600 }}>
            {state === "DRAFT" ? "Draft" : "In review"}: not approved. This document has not been approved by a named reviewer and must not be relied on
            as the reviewed assessment.
          </Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.label}>Applicability check</Text>
        <Text style={[s.muted, { marginBottom: 5, marginTop: 2 }]}>
          Run on {date(snap.applicability.checkedAt)} on legal content {snap.applicability.contentVersion ?? "—"}. Only the EU AI Act is covered in
          this version of the platform; other findings are shown for information.
        </Text>
        <Table
          cols={[
            { title: "Regulation", width: "30%" },
            { title: "Result", width: "11%" },
            { title: "Provision", width: "17%" },
            { title: "Finding", width: "42%" },
          ]}
          rows={snap.applicability.findings.map((f) => [
            <Text key="n" style={s.strong}>
              {f.name}
            </Text>,
            f.applies === "yes" ? "Applies" : f.applies === "likely" ? "Likely" : "Does not apply",
            <Text key="p" style={s.cite}>
              {f.provision}
            </Text>,
            f.summary,
          ])}
        />
      </View>

      <Text style={[s.muted, { marginTop: 18, fontSize: 7.2 }]}>
        This PDF is a dated snapshot of the structured record kept in the Governance Hub. It is not edited: when the record changes, the document is
        marked outdated and a new version is generated. Classification, obligations and dates come from the versioned legal content named above,
        not from AI. Narrative source: {input.narrativeSource === "RULES" ? "filled from the rules and reviewer rationales (no AI drafting)" : input.narrativeSource}.
        Input hash {input.inputHash.slice(0, 16)}.
      </Text>
    </View>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────

function NarrativeBlock({ narrative, id }: { narrative: Narrative; id: string }) {
  const section = narrative.sections.find((x) => x.id === id);
  if (!section || !section.statements.length) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[s.label, { marginBottom: 3 }]}>{section.heading}</Text>
      {section.statements.map((st, i) => (
        <Text key={i} style={s.para}>
          {st.text}
          {st.citations.length ? <Text style={s.cite}> [{st.citations.join("; ")}]</Text> : null}
        </Text>
      ))}
    </View>
  );
}

function SectionTitle({ kind }: { kind: DocumentKind }) {
  const def = KIND_BY_ID.get(kind)!;
  return (
    <View minPresenceAhead={120}>
      <Text style={s.kicker}>
        {def.step} · {def.provisions}
      </Text>
      <Text style={[s.h2, { marginTop: 2 }]}>{def.title}</Text>
    </View>
  );
}

function InventorySection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  return (
    <View>
      <SectionTitle kind="INVENTORY" />
      <NarrativeBlock narrative={narrative} id="INVENTORY" />
      {snap.systems.length === 0 ? (
        <Text style={s.muted}>No AI systems are recorded.</Text>
      ) : (
        <Table
          cols={[
            { title: "AI system", width: "27%" },
            { title: "Owner", width: "17%" },
            { title: "Origin / supplier", width: "18%" },
            { title: "Company role", width: "19%" },
            { title: "Risk class", width: "19%" },
          ]}
          rows={snap.systems.map((x) => [
            <Text key="n" style={s.strong}>
              {x.name}
            </Text>,
            x.ownerName,
            `${ORIGIN_LABEL[x.origin]}${x.supplier ? ` · ${x.supplier}` : ""}`,
            x.classification ? roleList(x.classification.roles) : "Not classified",
            x.classification
              ? `${RISK_LABEL[x.classification.riskClass] ?? x.classification.riskClass}${x.classification.status === "PRELIMINARY" ? " (preliminary)" : ""}${x.classification.stale ? " (outdated)" : ""}`
              : "—",
          ])}
        />
      )}
      {snap.systems.map((x, i) => (
        <View key={i} wrap={false}>
          <SystemHeading sys={x} index={i} brief />
          <KeyValues
            items={[
              ["Purpose", x.purpose],
              ["Accountable owner", [x.ownerName, x.ownerRole].filter(Boolean).join(", ")],
              ["Origin", `${ORIGIN_LABEL[x.origin]}${x.supplier ? ` · supplier: ${x.supplier}` : ""}`],
              ["Data used", x.dataCategories.join(", ")],
              ["Where deployed", x.deploymentContext],
              ["Use", USE_TYPE_LABEL[x.useType] ?? x.useType],
              ["Autonomy", AUTONOMY_LABEL[x.autonomy] ?? x.autonomy],
              ["Lifecycle stage", STAGE_LABEL[x.stage] ?? x.stage],
              ["People affected", x.affectedPersons ?? ""],
              ["Company role", x.classification ? roleList(x.classification.roles) : "Not classified yet"],
            ]}
          />
          {x.description ? <Text style={s.muted}>{x.description}</Text> : null}
          {x.vendorDocuments.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <Text style={[s.label, { marginBottom: 2 }]}>Vendor register: documents to obtain from {x.supplier ?? "the supplier"}</Text>
              {x.vendorDocuments.map((v, j) => (
                <Text key={j}>
                  {v.label} <Text style={s.cite}>[{v.citation}]</Text> — {VENDOR_STATUS_LABEL[v.status] ?? v.status}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function screens(c: ClassificationSnap): [string, string][] {
  return [
    ["Company’s role", c.outOfScope ? "Outside the scope of the AI Act" : roleList(c.roles)],
    ["Prohibited practices (Art. 5)", c.prohibited ? `Prohibited: ${c.prohibitedPractices.join(", ")}` : "No prohibited practice identified"],
    [
      "High-risk test (Art. 6)",
      c.highRisk
        ? `High-risk on the basis of ${c.highRiskBasis.map((b) => (b.startsWith("annexIII") ? `Annex III${b.includes(":") ? ` point ${b.split(":")[1]}` : ""}` : "Annex I")).join(", ")}`
        : c.art6_3Exempt
          ? "Listed in Annex III but not high-risk under the Art. 6(3) derogation"
          : "Not high-risk",
    ],
    ["Transparency duties (Art. 50)", c.transparency.length ? c.transparency.map((t) => `Art. ${t}`).join(", ") : "None"],
  ];
}

function ClassificationSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  return (
    <View>
      <SectionTitle kind="CLASSIFICATION" />
      <NarrativeBlock narrative={narrative} id="CLASSIFICATION" />
      {snap.systems.map((x, i) => {
        const c = x.classification;
        return (
          <View key={i}>
            <SystemHeading sys={x} index={i} />
            {!c ? (
              <Text style={s.muted}>Not classified yet.</Text>
            ) : (
              <View>
                <Text style={[s.muted, { marginBottom: 4 }]}>{classificationStatusLine(c)}</Text>
                <View style={{ flexDirection: "row", marginBottom: 4 }}>
                  <View style={{ width: "25%" }}>
                    <Text style={s.label}>Risk class</Text>
                    <Text style={[s.strong, { fontSize: 11 }]}>{RISK_LABEL[c.riskClass] ?? c.riskClass}</Text>
                  </View>
                  <View style={{ width: "75%" }}>
                    <KeyValues items={screens(c)} />
                  </View>
                </View>
                {c.overrideReason && (
                  <View style={s.notice}>
                    <Text>
                      <Text style={{ fontWeight: 600 }}>Reviewer override </Text>(computed result: {RISK_LABEL[c.computedRiskClass] ?? c.computedRiskClass}):{" "}
                      {c.overrideReason}
                    </Text>
                  </View>
                )}
                {c.attention.length > 0 && (
                  <View style={s.box}>
                    {c.attention.map((a, j) => (
                      <Text key={j}>
                        <Text style={s.strong}>Point for the reviewer: </Text>
                        {a}
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={[s.label, { marginTop: 8, marginBottom: 2 }]}>Legal reasoning</Text>
                {Object.entries(groupBy(c.reasoning, (r) => r.ruleId.split(".")[0])).map(([screen, firings]) => (
                  <View key={screen} style={{ marginBottom: 4 }} wrap={false}>
                    <Text style={[s.strong, { fontSize: 7.8 }]}>{SCREEN_OF[screen] ?? screen}</Text>
                    {firings.map((r, j) => (
                      <Text key={j} style={{ paddingLeft: 8 }}>
                        – {r.rationale} <Text style={s.cite}>[{r.citation}]</Text>
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const i of items) (out[key(i)] ??= []).push(i);
  return out;
}

function ObligationsSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  return (
    <View>
      <SectionTitle kind="OBLIGATIONS" />
      <NarrativeBlock narrative={narrative} id="OBLIGATIONS" />
      <Text style={[s.muted, { marginBottom: 4 }]}>
        Application dates come from legal content {snap.contentVersion}. The timeline for high-risk obligations has been under proposed amendment and may
        move; a change marks this document outdated.
      </Text>
      {snap.systems
        .filter((x) => x.classification)
        .map((x, i) => (
          <View key={i}>
            <SystemHeading sys={x} index={i} />
            {x.classification?.stale && <Text style={s.cite}>The system record changed after classification: this mapping may change on reclassification.</Text>}
            {x.obligations.length === 0 ? (
              <Text style={s.muted}>No obligations follow from this classification.</Text>
            ) : (
              <Table
                cols={[
                  { title: "Article", width: "13%" },
                  { title: "Obligation and why it applies", width: "57%" },
                  { title: "Carried as", width: "13%" },
                  { title: "Applies from", width: "17%" },
                ]}
                rows={x.obligations.map((o) => [
                  <Text key="a" style={s.cite}>
                    {o.article}
                  </Text>,
                  <View key="o">
                    <Text style={s.strong}>{o.title}</Text>
                    <Text>{o.summary}</Text>
                    <Text style={[s.muted, { marginTop: 2 }]}>Why it applies: {o.appliesBecause}</Text>
                  </View>,
                  PARTY(o.party),
                  <View key="d">
                    <Text>{date(o.appliesFrom)}</Text>
                    {o.dateProvision ? <Text style={s.cite}>{o.dateProvision}</Text> : null}
                  </View>,
                ])}
              />
            )}
          </View>
        ))}
    </View>
  );
}

function GapSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  return (
    <View>
      <SectionTitle kind="GAP_ASSESSMENT" />
      <View style={[s.box, { flexDirection: "row", marginBottom: 8 }]}>
        <View style={{ width: "30%" }}>
          <Text style={s.label}>Overall readiness</Text>
          <Text style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{snap.overallReadiness == null ? "—" : `${snap.overallReadiness}%`}</Text>
        </View>
        <Text style={[s.muted, { width: "70%" }]}>
          Readiness is the share of applicable obligations met: compliant counts in full, partial counts half, gap and not yet assessed count as not met.
          Initial assessment (Stage 1), built by the reviewer from the classification answers and the client interview.
        </Text>
      </View>
      <NarrativeBlock narrative={narrative} id="GAP_ASSESSMENT" />
      {snap.systems
        .filter((x) => x.classification)
        .map((x, i) => (
          <View key={i}>
            <SystemHeading sys={x} index={i} />
            <Text style={[s.muted, { marginBottom: 3 }]}>Readiness: {x.readiness == null ? "not yet assessed" : `${x.readiness}%`}</Text>
            {x.obligations.length > 0 && (
              <Table
                cols={[
                  { title: "Article", width: "13%" },
                  { title: "Obligation", width: "24%" },
                  { title: "Status", width: "16%" },
                  { title: "Reviewer rationale", width: "47%" },
                ]}
                rows={x.obligations.map((o) => [
                  <Text key="a" style={s.cite}>
                    {o.article}
                  </Text>,
                  o.title,
                  <View key="s">
                    <Text style={s.strong}>{OBLIGATION_STATUS_LABEL[o.status]}</Text>
                    {o.needsReassessment ? <Text style={s.cite}>To re-assess: the record changed</Text> : null}
                  </View>,
                  <View key="r">
                    <Text>{o.statusRationale ?? (o.status === "NOT_ASSESSED" ? "Not yet assessed." : "—")}</Text>
                    {o.assessedByName ? (
                      <Text style={s.muted}>
                        {o.assessedByName}, {date(o.assessedAt)}
                      </Text>
                    ) : null}
                  </View>,
                ])}
              />
            )}
          </View>
        ))}

      <View style={s.section}>
        <Text style={s.h3}>Evidence index</Text>
        <Text style={[s.muted, { marginBottom: 4 }]}>
          The evidence the legal content expects for each obligation. Evidence is collected and linked in the repository from Stage 2; none is recorded
          against these obligations yet.
        </Text>
        <Table
          cols={[
            { title: "System", width: "20%" },
            { title: "Article", width: "13%" },
            { title: "Evidence expected", width: "52%" },
            { title: "Provided", width: "15%" },
          ]}
          rows={snap.systems.flatMap((x) =>
            x.obligations.map((o) => [
              x.name,
              <Text key="a" style={s.cite}>
                {o.article}
              </Text>,
              o.evidenceExpected.map((e) => `• ${e}`).join("\n"),
              "None yet",
            ]),
          )}
        />
      </View>
    </View>
  );
}

const PHASES = [
  { n: 1, title: "Phase 1 — now", hint: "Already applies, or applies within six months." },
  { n: 2, title: "Phase 2 — next", hint: "Applies within eighteen months, or a small piece of work." },
  { n: 3, title: "Phase 3 — later", hint: "Larger work with a later application date." },
];

function RoadmapSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  const actions = snap.actions ?? [];
  const open = actions.filter((a) => a.status !== "DONE");
  const done = actions.filter((a) => a.status === "DONE");
  return (
    <View>
      <SectionTitle kind="ROADMAP" />
      <NarrativeBlock narrative={narrative} id="ROADMAP" />
      {actions.length === 0 && <Text style={s.muted}>No actions: none of the assessed obligations is a gap or partial.</Text>}
      {PHASES.map((p) => {
        const items = open.filter((a) => a.phase === p.n);
        if (!items.length) return null;
        return (
          <View key={p.n} style={{ marginTop: 10 }}>
            <Text style={s.h3}>{p.title}</Text>
            <Text style={[s.muted, { marginBottom: 3 }]}>{p.hint}</Text>
            <Table
              cols={[
                { title: "Action", width: "34%" },
                { title: "Type", width: "11%" },
                { title: "System · article", width: "21%" },
                { title: "Effort", width: "8%" },
                { title: "Owner", width: "12%" },
                { title: "Deadline · status", width: "14%" },
              ]}
              rows={items.map((a) => [
                <View key="t">
                  <Text style={s.strong}>{a.title}</Text>
                  <Text style={s.muted}>
                    {OBLIGATION_STATUS_LABEL[a.obligationStatus]} · {a.obligationTitle}
                    {a.helpRequested ? " · implementation requested" : ""}
                  </Text>
                </View>,
                a.type === "LEGAL" ? "Legal" : "Technical",
                <View key="s">
                  <Text>{a.systemName}</Text>
                  <Text style={s.cite}>{a.article}</Text>
                </View>,
                EFFORT_LABEL[a.effort] ?? a.effort,
                a.ownerName ?? "—",
                `${a.dueDate ? date(a.dueDate) : "No deadline"}\n${ACTION_STATUS_LABEL[a.status]}`,
              ])}
            />
          </View>
        );
      })}
      {done.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={s.h3}>Closed actions</Text>
          {done.map((a, i) => (
            <Text key={i}>
              {a.title} · {a.systemName} <Text style={s.cite}>[{a.article}]</Text>
            </Text>
          ))}
        </View>
      )}
      <View style={s.box}>
        <Text style={s.strong}>Implementation</Text>
        <Text>
          Legal and technical implementation is a human service. Any action above can be sent from the roadmap in the Governance Hub as a scoped request
          for implementation; the roadmap is complete without one.
        </Text>
      </View>
    </View>
  );
}

const SECTION: Record<Exclude<DocumentKind, "PACK">, (p: { snap: Snapshot; narrative: Narrative }) => ReactNode> = {
  INVENTORY: InventorySection,
  CLASSIFICATION: ClassificationSection,
  OBLIGATIONS: ObligationsSection,
  GAP_ASSESSMENT: GapSection,
  ROADMAP: RoadmapSection,
};

// ── Document ──────────────────────────────────────────────────────────────

function DeliverablePdf({ input }: { input: RenderInput }) {
  const { snapshot: snap, narrative } = input;
  const def = KIND_BY_ID.get(input.kind)!;
  const kinds = input.kind === "PACK" ? MODULE_KINDS : [input.kind as Exclude<DocumentKind, "PACK">];
  const approved = input.state === "APPROVED" || input.state === "RELEASED";
  const title = `${def.title} · ${snap.client.name}`;

  const chrome = (
    <>
      {!approved && (
        <Text style={s.watermark} fixed>
          {input.state === "DRAFT" ? "DRAFT" : "IN REVIEW"}
        </Text>
      )}
      <View style={s.header} fixed>
        <Text>
          {snap.organization.brandName ?? snap.organization.name} · {snap.client.name}
        </Text>
        <Text>
          {def.title} · v{input.version} · {STATE_LABEL[input.state]}
        </Text>
      </View>
      <View style={s.footer} fixed>
        <Text>
          Legal content {snap.contentVersion} · input {input.inputHash.slice(0, 12)} ·{" "}
          {approved && input.reviewerName ? `approved by ${input.reviewerName}, ${date(input.approvedAt)}` : "not approved"}
        </Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );

  return (
    <Document title={title} author={snap.organization.brandName ?? snap.organization.name} subject={`EU AI Act · ${def.title}`} creator="Governance Hub" producer="Governance Hub">
      <Page size="A4" style={s.page}>
        {chrome}
        <Cover input={input} />
      </Page>
      {kinds.map((k) => {
        const Section = SECTION[k];
        return (
          <Page key={k} size="A4" style={s.page} wrap>
            {chrome}
            <Section snap={snap} narrative={narrative} />
          </Page>
        );
      })}
    </Document>
  );
}

export async function renderDocumentPdf(input: RenderInput): Promise<Uint8Array> {
  registerFonts();
  const buffer = await renderToBuffer(<DeliverablePdf input={input} />);
  return new Uint8Array(buffer);
}
