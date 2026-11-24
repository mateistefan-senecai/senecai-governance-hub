// Renders a deliverable to PDF from its snapshot (concept note §6).
//
// @react-pdf/renderer is plain JavaScript (no headless browser), so it runs
// in a Vercel serverless function. One typeface for all text: Sora (SIL Open
// Font License, latin + latin-ext so Romanian diacritics print), embedded
// from assets/fonts. The SenecAI Compliance logo is assets/senecai-compliance-logo.png.
//
// Design "A · Data sheet": white pages, a ruled header with the logo and a
// document id, letter-spaced labels, ruled tables, a system id tag per AI
// system and a spec-sheet table of its record. Every PDF kind uses it; the
// cover carries the client, state, version, reviewer, date, legal content
// version and the applicability result.

import fs from "node:fs";
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
  RISK_LABEL,
  STAGE_LABEL,
  USE_TYPE_LABEL,
  VENDOR_STATUS_LABEL,
  roleList,
} from "@/lib/labels";
import { prohibitedSummary } from "@/lib/services/classification";
import { KIND_BY_ID, MODULE_KINDS, STATE_LABEL } from "./kinds";
import type { Narrative, Statement } from "./narrative";
import type { ClassificationSnap, ObligationSnap, Snapshot, SystemSnap } from "./snapshot";

// ── Fonts and logo ────────────────────────────────────────────────────────

const F = "Sora";
let ready = false;
let logo: { data: Buffer; format: "png" } | null = null;

function prepare() {
  if (ready) return;
  const assets = path.join(process.cwd(), "assets");
  const dir = path.join(assets, "fonts");
  Font.register({
    family: F,
    fonts: [
      { src: path.join(dir, "Sora_300Light.ttf"), fontWeight: 300 },
      { src: path.join(dir, "Sora_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Sora_500Medium.ttf"), fontWeight: 500 },
      { src: path.join(dir, "Sora_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Sora_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Legal text: no automatic hyphenation.
  Font.registerHyphenationCallback((word) => [word]);
  logo = { data: fs.readFileSync(path.join(assets, "senecai-compliance-logo.png")), format: "png" };
  ready = true;
}

/** Characters Sora lacks, mapped to ones it has (only for printing; the snapshot is unchanged). */
const GLYPHS: [RegExp, string][] = [
  [/≈/g, "~"],
  [/→/g, "->"],
  [/←/g, "<-"],
  [/✓/g, "v"],
  [/[▸►]/g, "•"],
];
function printable<T>(value: T): T {
  if (typeof value === "string") return GLYPHS.reduce((s, [re, to]) => s.replace(re, to), value as string) as T;
  if (Array.isArray(value)) return value.map(printable) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, printable(v)])) as T;
  }
  return value;
}

// ── Style ─────────────────────────────────────────────────────────────────

type Style = Parameters<typeof StyleSheet.create>[0][string];

const C = {
  ink: "#16110d",
  body: "#3a2f27",
  muted: "#6e6157",
  faint: "#8c8076",
  rule: "#e3ddd7",
  panel: "#f7f5f3",
  bronze: "#8a5a33",
  bronzeTint: "#f3ebe3",
  white: "#ffffff",
};

const M = 44; // page margin (pt)

const s = StyleSheet.create({
  // lineHeight is set on the content, not the Page: on the Page it stops fixed footers from printing.
  page: { fontFamily: F, fontSize: 8.4, fontWeight: 400, color: C.body, paddingTop: 92, paddingBottom: 64, paddingHorizontal: M },
  cover: { fontFamily: F, fontSize: 8.4, color: C.body, paddingTop: 44, paddingBottom: 64, paddingHorizontal: M },
  body: { lineHeight: 1.45 },
  top: { position: "absolute", top: 34, left: M, right: M, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1.1, borderBottomColor: C.ink, paddingBottom: 10 },
  topMeta: { fontSize: 6.4, letterSpacing: 0.9, textTransform: "uppercase", color: C.muted, textAlign: "right" },
  foot: { position: "absolute", bottom: 26, left: M, right: M, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.6, borderTopColor: C.rule, paddingTop: 7, fontSize: 6, letterSpacing: 0.8, textTransform: "uppercase", color: C.faint },
  watermark: { position: "absolute", top: 380, left: 40, right: 40, textAlign: "center", fontSize: 76, fontWeight: 700, color: C.bronze, opacity: 0.06, transform: "rotate(-30deg)" },
  kicker: { fontSize: 6.6, fontWeight: 500, letterSpacing: 1.3, textTransform: "uppercase", color: C.bronze },
  label: { fontSize: 6.2, fontWeight: 500, letterSpacing: 1.0, textTransform: "uppercase", color: C.muted },
  h1: { fontSize: 32, fontWeight: 600, color: C.ink, letterSpacing: -0.6, marginTop: 6, lineHeight: 1.08 },
  h2: { fontSize: 19, fontWeight: 600, color: C.ink, letterSpacing: -0.3, marginTop: 3, lineHeight: 1.15 },
  h3: { fontSize: 13, fontWeight: 600, color: C.ink, letterSpacing: -0.2, lineHeight: 1.2 },
  strong: { fontWeight: 600, color: C.ink },
  muted: { color: C.muted },
  cite: { fontSize: 6.6, fontWeight: 500, color: C.bronze },
  tag: { fontSize: 6.8, fontWeight: 600, letterSpacing: 0.8, color: C.white, backgroundColor: C.ink, paddingVertical: 2.5, paddingHorizontal: 6, marginRight: 8 },
  chip: { fontSize: 6.8, borderWidth: 0.7, borderColor: "#bdb2a7", borderRadius: 2, paddingVertical: 1.4, paddingHorizontal: 4.5, marginRight: 3, marginBottom: 3, color: C.ink },
  chipHot: { backgroundColor: C.ink, borderColor: C.ink, color: C.white },
  notice: { borderWidth: 0.8, borderColor: C.bronze, backgroundColor: C.bronzeTint, color: "#5c3a1e", padding: 8, marginTop: 10 },
  section: { marginTop: 18 },
});

// ── Helpers ───────────────────────────────────────────────────────────────

const date = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).replace(/\//g, ".") : "—";

const PARTY = (p: string) => p.split(" & ").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" & ");
const sysId = (i: number) => `SYS-${String(i + 1).padStart(3, "0")}`;

const SCREEN_OF: Record<string, string> = {
  role: "Role",
  scope: "Scope",
  prohibited: "Prohibited practices",
  hr: "High-risk test",
  t: "Transparency",
  risk: "Risk class",
};

/** Text with **key words** printed in bold. */
function Rich({ text, style }: { text: string; style?: Style }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <Text key={i} style={s.strong}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

function Bullet({ children, cite }: { children: ReactNode; cite?: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 3.2 }} wrap={false}>
      <View style={{ width: 3.4, height: 3.4, backgroundColor: C.bronze, marginTop: 4.2, marginRight: 7 }} />
      <View style={{ flex: 1 }}>
        <Text>
          {children}
          {cite ? <Text style={s.cite}>  [{cite}]</Text> : null}
        </Text>
      </View>
    </View>
  );
}

function Label({ children, style }: { children: ReactNode; style?: Style }) {
  return <Text style={[s.label, style ?? {}]}>{children}</Text>;
}

type Col = { title: string; width: string };

/** A ruled table: ink top rule, letter-spaced header on a light panel, hairline rows. */
function Table({ cols, rows, minPresenceAhead = 60 }: { cols: Col[]; rows: ReactNode[][]; minPresenceAhead?: number }) {
  return (
    <View style={{ borderTopWidth: 1.1, borderTopColor: C.ink }}>
      <View style={{ flexDirection: "row", backgroundColor: C.panel, borderBottomWidth: 0.6, borderBottomColor: C.rule }} minPresenceAhead={minPresenceAhead}>
        {cols.map((c, i) => (
          <Text key={i} style={[s.label, { width: c.width, paddingVertical: 4.5, paddingHorizontal: 6 }]}>
            {c.title}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.rule }} wrap={false}>
          {r.map((cell, j) => (
            <View key={j} style={{ width: cols[j].width, paddingVertical: 4.5, paddingHorizontal: 6 }}>
              {typeof cell === "string" || typeof cell === "number" ? <Text>{cell}</Text> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Two-column spec sheet: label column on a light panel, value column. */
function Spec({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <View style={{ borderTopWidth: 1.1, borderTopColor: C.ink }}>
      {rows.map(([k, v], i) => (
        <View key={i} style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.rule }} wrap={false}>
          <View style={{ width: "26%", backgroundColor: C.panel, paddingVertical: 5, paddingHorizontal: 7 }}>
            <Label>{k}</Label>
          </View>
          <View style={{ width: "74%", paddingVertical: 4.5, paddingHorizontal: 8 }}>{typeof v === "string" ? <Text>{v || "—"}</Text> : v}</View>
        </View>
      ))}
    </View>
  );
}

function Chips({ items, hot = false, empty = "—" }: { items: string[]; hot?: boolean; empty?: string }) {
  if (!items.length) return <Text style={s.muted}>{empty}</Text>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: -3 }}>
      {items.map((x, i) => (
        <Text key={i} style={[s.chip, hot ? s.chipHot : {}]}>
          {x}
        </Text>
      ))}
    </View>
  );
}

/** A boxed strip of key figures (role, risk class, status…). */
function Strip({ cells }: { cells: { label: string; value: string; note?: string; dark?: boolean }[] }) {
  return (
    <View style={{ flexDirection: "row", borderWidth: 1.1, borderColor: C.ink, marginTop: 10 }} wrap={false}>
      {cells.map((c, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            padding: 8,
            borderRightWidth: i < cells.length - 1 ? 0.6 : 0,
            borderRightColor: C.rule,
            backgroundColor: c.dark ? C.ink : C.white,
          }}
        >
          <Text style={[s.kicker, c.dark ? { color: "#d9ae82" } : {}]}>{c.label}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: 600, color: c.dark ? C.white : C.ink, marginTop: 3, lineHeight: 1.2 }}>{c.value}</Text>
          {c.note ? <Text style={[s.cite, { marginTop: 2 }, c.dark ? { color: "#d9ae82" } : {}]}>{c.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function SystemTitle({ sys, index, total }: { sys: SystemSnap; index: number; total: number }) {
  return (
    <View style={{ marginBottom: 8 }} minPresenceAhead={140}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={s.tag}>{sysId(index)}</Text>
        <Text style={s.kicker}>
          AI system {index + 1} of {total}
        </Text>
      </View>
      <Text style={s.h2}>{sys.name}</Text>
    </View>
  );
}

function riskNote(c: ClassificationSnap): string | undefined {
  if (c.highRiskBasis.length) {
    // "annexIII" plus "annexIII:5b" prints once, as the point.
    const pointed = c.highRiskBasis.some((b) => b.startsWith("annexIII:"));
    return c.highRiskBasis
      .filter((b) => !(pointed && b === "annexIII"))
      .map((b) => (b.startsWith("annexIII") ? `Annex III${b.includes(":") ? `, point ${b.split(":")[1]}` : ""}` : b === "annexI:sectionB" ? "Annex I, Section B" : "Annex I"))
      .filter((x, i, a) => a.indexOf(x) === i)
      .join(" · ");
  }
  if (c.prohibitedPractices.length) return c.prohibitedPractices.join(", ");
  return undefined;
}

function statusText(c: ClassificationSnap) {
  return c.status === "PRELIMINARY" ? "Preliminary" : CLASSIFICATION_STATUS_LABEL[c.status];
}

// ── Input ─────────────────────────────────────────────────────────────────

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

function docId(input: RenderInput) {
  const k = { INVENTORY: "INV", CLASSIFICATION: "CLS", OBLIGATIONS: "OBL", GAP_ASSESSMENT: "GAP", ROADMAP: "MAP", PACK: "PACK" }[input.kind];
  const client = input.snapshot.client.name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "CLIENT";
  return `DOC-${k}-${client}-v${input.version}`;
}

// ── Cover ─────────────────────────────────────────────────────────────────

/** Organisation logo, when the organisation set one (data: URI); otherwise none. */
function OrgMark({ org }: { org: Snapshot["organization"] }) {
  if (!org.brandLogo?.startsWith("data:image/")) return null;
  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
  return <Image src={org.brandLogo} style={{ height: 22 }} />;
}

function Cover({ input }: { input: RenderInput }) {
  const { snapshot: snap, state } = input;
  const def = KIND_BY_ID.get(input.kind)!;
  const approved = state === "APPROVED" || state === "RELEASED";
  const index = MODULE_KINDS.indexOf(input.kind as Exclude<DocumentKind, "PACK">);
  const cells: [string, ReactNode][] = [
    ["Client", <Text key="c" style={s.strong}>{snap.client.name}</Text>],
    [
      "Status",
      <Text key="s" style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.8, color: approved ? C.bronze : C.ink, borderWidth: 0.8, borderColor: approved ? C.bronze : C.ink, paddingVertical: 2, paddingHorizontal: 5, alignSelf: "flex-start" }}>
        {STATE_LABEL[state].toUpperCase()}
      </Text>,
    ],
    ["Version", <Text key="v" style={s.strong}>v{input.version}</Text>],
    ["Date", <Text key="d" style={s.strong}>{date(approved ? input.approvedAt : input.createdAt)}</Text>],
    ["Reviewer", <Text key="r" style={s.strong}>{approved && input.reviewerName ? input.reviewerName : "Not yet approved"}</Text>],
    ["Prepared by", <Text key="p" style={s.strong}>{snap.organization.brandName ?? snap.organization.name}</Text>],
    ["Legal content", <Text key="l" style={s.strong}>{snap.contentVersion}</Text>],
    ["AI systems", <Text key="n" style={s.strong}>{String(snap.systems.length).padStart(2, "0")}</Text>],
  ];
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1.1, borderBottomColor: C.ink, paddingBottom: 12 }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        <Image src={logo!} style={{ height: 34 }} />
        <View>
          <Text style={s.topMeta}>{docId(input)}</Text>
          <Text style={[s.topMeta, { marginTop: 2 }]}>
            {date(input.createdAt)} · content {snap.contentVersion}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 64, flexDirection: "row" }}>
        <View style={{ width: "74%" }}>
          <Text style={s.kicker}>
            EU AI Act · {input.kind === "PACK" ? "Combined pack · deliverables 01–05" : `Deliverable ${String(index + 1).padStart(2, "0")} / 05`}
          </Text>
          <Text style={s.h1}>{def.title}</Text>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>{def.description}</Text>
          <Text style={[s.cite, { marginTop: 8 }]}>Main provisions: {def.provisions}</Text>
        </View>
        <View style={{ width: "26%", flexDirection: "row", justifyContent: "flex-end", height: 104 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ width: 1.2, height: "100%", backgroundColor: C.ink, opacity: 0.07, marginLeft: 4.4 }} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 34, borderTopWidth: 1.1, borderTopColor: C.ink, borderLeftWidth: 0.6, borderLeftColor: C.rule, flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map(([k, v], i) => (
          <View key={i} style={{ width: "25%", borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: C.rule, paddingVertical: 8, paddingHorizontal: 9, minHeight: 46 }}>
            <Text style={[s.kicker, { marginBottom: 5 }]}>{k}</Text>
            {v}
          </View>
        ))}
      </View>

      {!approved && (
        <View style={s.notice}>
          <Text style={{ fontWeight: 600 }}>
            {state === "DRAFT" ? "Draft" : "In review"}: not approved by a named reviewer. Do not rely on it as the reviewed assessment.
          </Text>
        </View>
      )}

      <View style={{ marginTop: 22 }}>
        <Text style={[s.kicker, { marginBottom: 6 }]}>Applicability</Text>
        {snap.applicability.findings.length === 0 ? (
          <Text style={s.muted}>The applicability check has not been run.</Text>
        ) : (
          snap.applicability.findings.map((f, i) => (
            <Bullet key={i} cite={f.provision}>
              <Text style={s.strong}>{f.name}</Text>
              {"  ·  "}
              <Text style={s.strong}>{f.applies === "yes" ? "Applies" : f.applies === "likely" ? "Likely applies" : "Does not apply"}</Text>
              {f.coveredInThisVersion ? "" : "  ·  not covered by the Hub"}
            </Bullet>
          ))
        )}
        <Text style={[s.muted, { fontSize: 6.8, marginTop: 4 }]}>
          Checked {date(snap.applicability.checkedAt)} on legal content {snap.applicability.contentVersion ?? "—"}.
        </Text>
      </View>

      <View style={{ position: "absolute", bottom: -24, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <Text style={[s.muted, { fontSize: 6.4, width: "78%", lineHeight: 1.5 }]}>
          A dated snapshot of the record kept in the Governance Hub. It is never edited: when the record changes it is marked outdated and a new version is
          generated. Classification, obligations and dates come from the versioned legal content above, not from AI. Summaries:{" "}
          {input.narrativeSource === "RULES" ? "filled from the rules and reviewer rationales" : input.narrativeSource}. Input SHA-256{" "}
          {input.inputHash.slice(0, 4)}…{input.inputHash.slice(-4)}.
        </Text>
        <OrgMark org={snap.organization} />
      </View>
    </View>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────

function SectionTitle({ kind }: { kind: DocumentKind }) {
  const def = KIND_BY_ID.get(kind)!;
  return (
    <View style={{ marginBottom: 12 }} minPresenceAhead={160}>
      <Text style={s.kicker}>
        {def.step} · {def.provisions}
      </Text>
      <Text style={[s.h2, { fontSize: 22 }]}>{def.title}</Text>
    </View>
  );
}

function Summary({ narrative, id }: { narrative: Narrative; id: string }) {
  const section = narrative.sections.find((x) => x.id === id);
  if (!section || !section.statements.length) return null;
  return (
    <View style={{ marginBottom: 14, padding: 10, backgroundColor: C.panel, borderLeftWidth: 2, borderLeftColor: C.bronze }}>
      <Text style={[s.kicker, { marginBottom: 6 }]}>Summary</Text>
      {section.statements.map((st: Statement, i) => (
        <Bullet key={i} cite={st.citations.length ? st.citations.join("; ") : undefined}>
          <Rich text={st.text} />
        </Bullet>
      ))}
    </View>
  );
}

function SystemRecord({ sys }: { sys: SystemSnap }) {
  const c = sys.classification;
  const rows: [string, ReactNode][] = [
    ["Purpose", sys.purpose],
    ["Origin", `${sys.origin === "BUILT" ? "Built in-house" : sys.origin === "BOUGHT" ? "Bought" : "Embedded third-party model"}${sys.supplier ? ` · supplier: ${sys.supplier}` : ""}`],
    ["Use", USE_TYPE_LABEL[sys.useType] ?? sys.useType],
    ["Owner", [sys.ownerName, sys.ownerRole].filter(Boolean).join(" · ")],
    ["Deployment", sys.deploymentContext],
    ["Area of use", <Chips key="a" items={sys.areas} />],
    [
      "Affected",
      <View key="f">
        <Chips items={sys.affectedGroups} empty="" />
        {sys.affectedPersons ? <Text style={{ marginTop: sys.affectedGroups.length ? 3 : 0 }}>{sys.affectedPersons}</Text> : null}
        {!sys.affectedGroups.length && !sys.affectedPersons ? <Text style={s.muted}>—</Text> : null}
      </View>,
    ],
    ["Capabilities", <Chips key="c" items={sys.capabilities} hot />],
    ["Data", <Chips key="d" items={sys.dataCategories} />],
    ["Autonomy", AUTONOMY_LABEL[sys.autonomy] ?? sys.autonomy],
    ["Stage", STAGE_LABEL[sys.stage] ?? sys.stage],
  ];
  if (sys.description) rows.splice(1, 0, ["How it works", sys.description]);
  return (
    <View>
      <Spec rows={rows} />
      <Strip
        cells={
          c
            ? [
                { label: "Company role", value: c.outOfScope ? "Out of scope" : roleList(c.roles).replace(" & ", " + ") },
                { label: "Risk class", value: RISK_LABEL[c.riskClass] ?? c.riskClass, note: riskNote(c), dark: c.riskClass === "HIGH_RISK" || c.riskClass === "PROHIBITED" },
                { label: "Classification", value: statusText(c), note: c.reviewedByName ? `${c.reviewedByName} · ${date(c.reviewedAt)}` : c.stale ? "outdated: record changed" : "not yet reviewed" },
              ]
            : [{ label: "Classification", value: "Not classified yet" }]
        }
      />
      {sys.vendorDocuments.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={[s.kicker, { marginBottom: 5 }]}>Vendor register · documents to obtain from {sys.supplier ?? "the supplier"}</Text>
          <Table
            cols={[
              { title: "Document", width: "52%" },
              { title: "Provision", width: "24%" },
              { title: "Status", width: "24%" },
            ]}
            rows={sys.vendorDocuments.map((v) => [v.label, <Text key="c" style={s.cite}>{v.citation}</Text>, VENDOR_STATUS_LABEL[v.status] ?? v.status])}
          />
        </View>
      )}
    </View>
  );
}

function InventorySection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  return (
    <View>
      <SectionTitle kind="INVENTORY" />
      <Summary narrative={narrative} id="INVENTORY" />
      {snap.systems.length === 0 ? (
        <Text style={s.muted}>No AI systems are recorded.</Text>
      ) : (
        <Table
          cols={[
            { title: "ID", width: "11%" },
            { title: "AI system", width: "29%" },
            { title: "Owner", width: "19%" },
            { title: "Company role", width: "20%" },
            { title: "Risk class", width: "21%" },
          ]}
          rows={snap.systems.map((x, i) => [
            <Text key="i" style={s.cite}>{sysId(i)}</Text>,
            <Text key="n" style={s.strong}>{x.name}</Text>,
            x.ownerName,
            x.classification ? roleList(x.classification.roles) : "—",
            x.classification ? `${RISK_LABEL[x.classification.riskClass] ?? x.classification.riskClass}${x.classification.status === "PRELIMINARY" ? " (prelim.)" : ""}` : "Not classified",
          ])}
        />
      )}
      {snap.systems.map((x, i) => (
        <View key={i} break>
          <SystemTitle sys={x} index={i} total={snap.systems.length} />
          <SystemRecord sys={x} />
        </View>
      ))}
    </View>
  );
}

function screens(c: ClassificationSnap): [string, string][] {
  return [
    ["Company role", c.outOfScope ? "Outside the scope of the AI Act" : roleList(c.roles)],
    ["Prohibited practices", prohibitedSummary(c.prohibitedPractices)],
    [
      "High-risk test",
      c.highRisk || c.highRiskBasis.includes("annexI:sectionB")
        ? `High-risk · ${riskNote(c) ?? ""}`
        : c.art6_3Exempt
          ? "Listed in Annex III but not high-risk under the Art. 6(3) derogation"
          : "Not high-risk",
    ],
    ["Transparency", c.transparency.length ? c.transparency.map((t) => `Art. ${t}`).join(", ") : "No transparency duty"],
  ];
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const i of items) (out[key(i)] ??= []).push(i);
  return out;
}

function ClassificationSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  return (
    <View>
      <SectionTitle kind="CLASSIFICATION" />
      <Summary narrative={narrative} id="CLASSIFICATION" />
      {snap.systems.map((x, i) => {
        const c = x.classification;
        return (
          <View key={i} break={i > 0} style={i === 0 ? { marginTop: 6 } : {}}>
            <SystemTitle sys={x} index={i} total={snap.systems.length} />
            {!c ? (
              <Text style={s.muted}>Not classified yet.</Text>
            ) : (
              <View>
                <Strip
                  cells={[
                    { label: "Company role", value: c.outOfScope ? "Out of scope" : roleList(c.roles).replace(" & ", " + ") },
                    { label: "Risk class", value: RISK_LABEL[c.riskClass] ?? c.riskClass, note: riskNote(c), dark: c.riskClass === "HIGH_RISK" || c.riskClass === "PROHIBITED" },
                    { label: "Status", value: statusText(c), note: `v${c.version} · content ${c.contentVersion}${c.reviewedByName ? ` · ${c.reviewedByName}` : ""}` },
                  ]}
                />
                <View style={{ marginTop: 10 }}>
                  <Spec rows={screens(c).map(([k, v]) => [k, k === "Prohibited practices" && c.prohibitedPractices.length ? <Text key="p" style={s.strong}>{v}</Text> : v])} />
                </View>
                {c.stale && <Text style={[s.cite, { marginTop: 6 }]}>The system record changed after this classification: it must be redone.</Text>}
                {c.overrideReason && (
                  <View style={s.notice}>
                    <Text>
                      <Text style={{ fontWeight: 600 }}>Reviewer override</Text> (computed: {RISK_LABEL[c.computedRiskClass] ?? c.computedRiskClass}): {c.overrideReason}
                    </Text>
                  </View>
                )}
                {c.attention.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.kicker, { marginBottom: 5 }]}>Points for the reviewer</Text>
                    {c.attention.map((a, j) => (
                      <Bullet key={j}>{a}</Bullet>
                    ))}
                  </View>
                )}
                <View style={{ marginTop: 12 }}>
                  <Text style={[s.kicker, { marginBottom: 6 }]}>Legal reasoning</Text>
                  {Object.entries(groupBy(c.reasoning, (r) => r.ruleId.split(".")[0])).map(([screen, firings]) => (
                    <View key={screen} style={{ marginBottom: 6 }}>
                      <Label style={{ marginBottom: 3, color: C.ink }}>{SCREEN_OF[screen] ?? screen}</Label>
                      {firings.map((r, j) => (
                        <Bullet key={j} cite={r.citation}>
                          {r.rationale}
                        </Bullet>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function GroupHeading({ title, note, index, total }: { title: string; note?: string; index?: number; total?: number }) {
  return (
    <View style={{ marginTop: 16, marginBottom: 6 }} minPresenceAhead={90}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={s.tag}>{index === undefined ? "COMPANY" : sysId(index)}</Text>
        {index !== undefined && total !== undefined ? <Text style={s.kicker}>AI system {index + 1} of {total}</Text> : <Text style={s.kicker}>Company-wide</Text>}
      </View>
      <Text style={[s.h3, { marginTop: 4 }]}>{title}</Text>
      {note ? <Text style={[s.muted, { marginTop: 1 }]}>{note}</Text> : null}
    </View>
  );
}

function ObligationTable({ list }: { list: ObligationSnap[] }) {
  return (
    <Table
      cols={[
        { title: "Article", width: "13%" },
        { title: "Obligation", width: "47%" },
        { title: "Why it applies", width: "20%" },
        { title: "Party · from", width: "20%" },
      ]}
      rows={list.map((o) => [
        <Text key="a" style={s.cite}>{o.article}</Text>,
        <View key="o">
          <Text style={s.strong}>{o.title}</Text>
          <Text>{o.summary}</Text>
        </View>,
        <Text key="w" style={s.muted}>{o.appliesBecause}</Text>,
        <View key="d">
          <Text>{PARTY(o.party)}</Text>
          <Text style={s.strong}>{date(o.appliesFrom)}</Text>
          {o.dateProvision ? <Text style={s.cite}>{o.dateProvision}</Text> : null}
        </View>,
      ])}
    />
  );
}

function ObligationsSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  const company = snap.companyObligations ?? [];
  const classified = snap.systems.map((x, i) => ({ x, i })).filter(({ x }) => x.classification);
  return (
    <View>
      <SectionTitle kind="OBLIGATIONS" />
      <Summary narrative={narrative} id="OBLIGATIONS" />
      <Text style={[s.muted, { fontSize: 7.2 }]}>Application dates come from legal content {snap.contentVersion}; a change to a date marks this document outdated.</Text>
      {company.length > 0 && (
        <View>
          <GroupHeading title="Company-wide obligations" note="Duties of the company as a whole, listed once rather than for each system." />
          <ObligationTable list={company} />
        </View>
      )}
      {classified.map(({ x, i }) => (
        <View key={i}>
          <GroupHeading title={x.name} index={i} total={snap.systems.length} note={x.classification?.stale ? "The system record changed after classification: this mapping may change." : undefined} />
          {x.obligations.length === 0 ? <Text style={s.muted}>No obligations follow from this classification.</Text> : <ObligationTable list={x.obligations} />}
        </View>
      ))}
    </View>
  );
}

const STATUS_STYLE: Record<string, Style> = {
  COMPLIANT: { borderColor: C.bronze, color: C.bronze },
  PARTIAL: { backgroundColor: C.bronzeTint, borderColor: C.bronzeTint, color: "#5c3a1e" },
  GAP: { backgroundColor: C.ink, borderColor: C.ink, color: C.white },
  NOT_ASSESSED: { borderColor: C.rule, color: C.muted },
};

function StatusChip({ status }: { status: string }) {
  return (
    <Text style={[{ fontSize: 6.4, fontWeight: 600, letterSpacing: 0.6, borderWidth: 0.7, paddingVertical: 1.6, paddingHorizontal: 4, alignSelf: "flex-start" }, STATUS_STYLE[status] ?? {}]}>
      {(OBLIGATION_STATUS_LABEL[status] ?? status).toUpperCase()}
    </Text>
  );
}

function AssessmentTable({ list }: { list: ObligationSnap[] }) {
  return (
    <Table
      cols={[
        { title: "Article", width: "13%" },
        { title: "Obligation", width: "27%" },
        { title: "Status", width: "17%" },
        { title: "Reviewer rationale", width: "43%" },
      ]}
      rows={list.map((o) => [
        <Text key="a" style={s.cite}>{o.article}</Text>,
        <Text key="t" style={s.strong}>{o.title}</Text>,
        <View key="s">
          <StatusChip status={o.status} />
          {o.needsReassessment ? <Text style={[s.cite, { marginTop: 2 }]}>To re-assess</Text> : null}
        </View>,
        <View key="r">
          <Text>{o.statusRationale ?? (o.status === "NOT_ASSESSED" ? "Not yet assessed." : "—")}</Text>
          {o.assessedByName ? <Text style={[s.muted, { fontSize: 6.8 }]}>{o.assessedByName} · {date(o.assessedAt)}</Text> : null}
        </View>,
      ])}
    />
  );
}

function GapSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  const company = snap.companyObligations ?? [];
  const all = [...company, ...snap.systems.flatMap((x) => x.obligations)];
  const n = (st: string) => all.filter((o) => o.status === st).length;
  const classified = snap.systems.map((x, i) => ({ x, i })).filter(({ x }) => x.classification);
  return (
    <View>
      <SectionTitle kind="GAP_ASSESSMENT" />
      <Strip
        cells={[
          { label: "Readiness", value: snap.overallReadiness == null ? "—" : `${snap.overallReadiness}%`, dark: true, note: "compliant = 1, partial = 0.5" },
          { label: "Compliant", value: String(n("COMPLIANT")) },
          { label: "Partial", value: String(n("PARTIAL")) },
          { label: "Gap", value: String(n("GAP")) },
          { label: "Not assessed", value: String(n("NOT_ASSESSED")) },
        ]}
      />
      <View style={{ marginTop: 12 }}>
        <Summary narrative={narrative} id="GAP_ASSESSMENT" />
      </View>
      {company.length > 0 && (
        <View>
          <GroupHeading title="Company-wide obligations" />
          <AssessmentTable list={company} />
        </View>
      )}
      {classified.map(({ x, i }) => (
        <View key={i}>
          <GroupHeading title={x.name} index={i} total={snap.systems.length} note={`Readiness: ${x.readiness == null ? "not yet assessed" : `${x.readiness}%`}`} />
          {x.obligations.length > 0 ? <AssessmentTable list={x.obligations} /> : <Text style={s.muted}>No obligations.</Text>}
        </View>
      ))}

      <View style={s.section} break>
        <Text style={s.kicker}>Evidence index</Text>
        <Text style={[s.h3, { marginTop: 3 }]}>Evidence the legal content expects</Text>
        <Text style={[s.muted, { marginTop: 3, marginBottom: 8 }]}>
          Evidence is collected and linked in the repository from Stage 2; none is recorded against these obligations yet.
        </Text>
        <Table
          cols={[
            { title: "Scope", width: "20%" },
            { title: "Article", width: "13%" },
            { title: "Evidence expected", width: "52%" },
            { title: "Provided", width: "15%" },
          ]}
          rows={[
            ...company.map((o) => ({ scope: "Company-wide", o })),
            ...snap.systems.flatMap((x, i) => x.obligations.map((o) => ({ scope: `${sysId(i)} · ${x.name}`, o }))),
          ].map(({ scope, o }) => [
            scope,
            <Text key="a" style={s.cite}>{o.article}</Text>,
            <View key="e">
              {o.evidenceExpected.map((e, j) => (
                <Bullet key={j}>{e}</Bullet>
              ))}
            </View>,
            "None yet",
          ])}
        />
      </View>
    </View>
  );
}

const PHASES = [
  { n: 1, title: "Phase 1 · now", hint: "Already applies, or applies within six months." },
  { n: 2, title: "Phase 2 · next", hint: "Applies within eighteen months, or a small piece of work." },
  { n: 3, title: "Phase 3 · later", hint: "Larger work with a later application date." },
];

function RoadmapSection({ snap, narrative }: { snap: Snapshot; narrative: Narrative }) {
  const actions = snap.actions ?? [];
  const open = actions.filter((a) => a.status !== "DONE");
  const done = actions.filter((a) => a.status === "DONE");
  return (
    <View>
      <SectionTitle kind="ROADMAP" />
      <Strip
        cells={[
          { label: "Open actions", value: String(open.length), dark: true },
          ...PHASES.map((p) => ({ label: p.title, value: String(open.filter((a) => a.phase === p.n).length) })),
          { label: "Legal · technical", value: `${open.filter((a) => a.type === "LEGAL").length} · ${open.filter((a) => a.type === "TECHNICAL").length}` },
        ]}
      />
      <View style={{ marginTop: 12 }}>
        <Summary narrative={narrative} id="ROADMAP" />
      </View>
      {actions.length === 0 && <Text style={s.muted}>No actions: no assessed obligation is a gap or partial.</Text>}
      {PHASES.map((p) => {
        const items = open.filter((a) => a.phase === p.n);
        if (!items.length) return null;
        return (
          <View key={p.n} style={{ marginTop: 14 }}>
            <View minPresenceAhead={80}>
              <Text style={s.h3}>{p.title}</Text>
              <Text style={[s.muted, { marginBottom: 6 }]}>{p.hint}</Text>
            </View>
            <Table
              cols={[
                { title: "Action", width: "35%" },
                { title: "Type", width: "11%" },
                { title: "Scope · article", width: "20%" },
                { title: "Effort", width: "9%" },
                { title: "Owner", width: "12%" },
                { title: "Deadline", width: "13%" },
              ]}
              rows={items.map((a) => [
                <View key="t">
                  <Text style={s.strong}>{a.title}</Text>
                  <Text style={[s.muted, { fontSize: 7 }]}>
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
                <View key="d">
                  <Text>{a.dueDate ? date(a.dueDate) : "—"}</Text>
                  <Text style={[s.muted, { fontSize: 7 }]}>{ACTION_STATUS_LABEL[a.status]}</Text>
                </View>,
              ])}
            />
          </View>
        );
      })}
      {done.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={[s.kicker, { marginBottom: 5 }]}>Closed actions</Text>
          {done.map((a, i) => (
            <Bullet key={i} cite={a.article}>
              <Text style={s.strong}>{a.title}</Text> · {a.systemName}
            </Bullet>
          ))}
        </View>
      )}
      <View style={[s.notice, { marginTop: 16 }]} wrap={false}>
        <Text style={{ fontWeight: 600, marginBottom: 2 }}>Implementation</Text>
        <Text>Legal and technical implementation is a human service: any action can be sent from the roadmap as a scoped request. The roadmap is complete without one.</Text>
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
  const approval = approved && input.reviewerName ? `Approved · ${input.reviewerName} · ${date(input.approvedAt)}` : `${STATE_LABEL[input.state]} · not approved`;

  const watermark = !approved && (
    <Text style={s.watermark} fixed>
      {input.state === "DRAFT" ? "DRAFT" : "IN REVIEW"}
    </Text>
  );
  const footer = (
    <View style={s.foot} fixed>
      <Text>SenecAI Compliance · Governance Hub</Text>
      <Text>{approval}</Text>
      <Text render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
    </View>
  );

  return (
    <Document title={title} author={snap.organization.brandName ?? snap.organization.name} subject={`EU AI Act · ${def.title}`} creator="SenecAI Compliance · Governance Hub" producer="Governance Hub">
      <Page size="A4" style={s.cover}>
        {watermark}
        {footer}
        <View style={s.body}>
          <Cover input={input} />
        </View>
      </Page>
      {kinds.map((k) => {
        const Section = SECTION[k];
        return (
          <Page key={k} size="A4" style={s.page} wrap>
            {watermark}
            <View style={s.top} fixed>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
              <Image src={logo!} style={{ height: 22 }} />
              <Text style={s.topMeta}>
                {KIND_BY_ID.get(k)!.title} · {snap.client.name} · v{input.version}
              </Text>
            </View>
            {footer}
            <View style={s.body}>
              <Section snap={snap} narrative={narrative} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function renderDocumentPdf(input: RenderInput): Promise<Uint8Array> {
  prepare();
  const clean = { ...input, snapshot: printable(input.snapshot), narrative: printable(input.narrative) };
  const buffer = await renderToBuffer(<DeliverablePdf input={clean} />);
  return new Uint8Array(buffer);
}
