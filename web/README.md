# SenecAI Governance Hub — web app

Next.js (App Router) + TypeScript + Tailwind + Prisma/PostgreSQL. Currently implements
**Module 1 — AI Inventory & Risk Classification** and **Module 2 — Compliance Plan** of the
AI Act module; see `../docs/context/ai-act-platform-concept.md` for the full module roadmap
and `../CLAUDE.md` for product context that always applies to this repo.

## Local setup

Requires Node 20+ and a local PostgreSQL server.

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL / AUTH_SECRET if needed
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Seeded accounts (password `changeme123` for all):

| Email | Role | Access |
|---|---|---|
| `admin@senecai.dev` | `SENECAI_ADMIN` | all organizations |
| `consultant@senecai.dev` | `CONSULTANT` | assigned to "Demo Client SRL" via `ConsultantAssignment` |
| `client@demo.dev` | `CLIENT_ADMIN` | "Demo Client SRL" only |

## Architecture notes

- **Multi-tenant, no physical isolation.** One database; every tenant-owned row is scoped
  by `organizationId`. `src/lib/authz.ts` (`getAccessibleOrgIds`) is the single place that
  decides which organizations a session may read/write — matches the concept note's current
  decision not to isolate per client.
- **Decision trees as configurable data.** `src/lib/decision-trees/` is a generic
  engine (`engine.ts`) driven entirely by JSON (`trees/*.json`) — no AI-Act-specific logic
  lives in code. This is what the concept note requires so GDPR/DORA/NIS2/CRA can reuse the
  same engine later.
- **Obligation mapping as configurable data.** `src/lib/obligations/catalog.json` lists every
  obligation with its category (`GENERAL` / `PROVIDER_HIGH_RISK` / `DEPLOYER_HIGH_RISK`) and
  AI Act citation; `getApplicableObligations()` in `src/lib/obligations/index.ts` is a pure
  filter over a system's `legalRole`/`riskClassification` — same principle as the decision
  trees, so the same shape can be reused for GDPR/DORA/NIS2/CRA obligation sets later.
  `ObligationAssessment` rows (one per system × obligation) double as the gap-assessment
  status (Feature 2.2) and the roadmap action item (Feature 2.3: owner, due date, status).
  `scripts/validate-config.ts` structurally validates both the decision trees and the
  obligation catalog, and smoke-tests example decision-tree paths
  (`npx tsx scripts/validate-config.ts`).
- **GENERAL obligations are org-level, not per-system.** `getApplicableObligations()` only
  returns role/risk-gated (`PROVIDER_HIGH_RISK`/`DEPLOYER_HIGH_RISK`) items now;
  `getGeneralObligations()` returns the `GENERAL` catalog items once, tracked per organization
  via `OrganizationObligationAssessment` and surfaced on `/overview` rather than duplicated
  across every AI system's own screens.
- **Obligation-level PM sub-hub.** Each obligation's own checklist (`/compliance-plan/[id]/
  obligations/[obligationId]`) is driven by `src/lib/obligations/pm-steps.json` (a `PM_STEPS`
  map keyed by obligation id) — same configurable-data principle as the catalog and decision
  trees. Only two example templates are populated; any obligation without one falls back to
  the plain status control. Step completion (`ObligationPmStepCompletion`) rolls the
  obligation's own `status` up automatically.
- **Cross-regulation shell.** `/overview` aggregates AI Act readiness (per system and
  org-wide) plus each org's general obligations; the persistent top bar (`nav-shell.tsx`)
  covers Overview/AI Act/GDPR/NIS2/DORA/CRA, with only AI Act built — the rest are "Coming
  soon" stubs. `OrganizationRegulationScope` (set via `/settings/regulations`) records which
  regulations apply per org; the actual sector/size-based scoping questionnaire is still to be
  supplied, so today it's a direct checklist.
- **Everything AI-generated is marked preliminary.** Role and risk classification results
  (`AiSystem.legalRole` / `riskClassification`) are written with
  `*ReviewedByConsultant: false`; only a `CONSULTANT`/`SENECAI_ADMIN` can flip it to `true`
  (`markReviewed` in `src/lib/actions/ai-systems.ts`). This mirrors the concept note's
  requirement that AI-generated outputs are always human-reviewed before being treated as
  final.
- **Auth.js v5, split config.** `src/lib/auth.config.ts` is the Edge-safe base (no Prisma
  import) used by `src/proxy.ts` (Next.js 16 renamed Middleware to Proxy); `src/lib/auth.ts`
  extends it with the Credentials provider and Prisma lookups, and is only ever imported from
  Node-runtime code (route handlers, server actions, server components).

## Known gaps (see docs/context for detail)

- The high-risk decision tree only distinguishes `HIGH_RISK` vs. `NOT_HIGH_RISK` — it does not
  determine `PROHIBITED` (Art. 5) or the `LIMITED`/`MINIMAL` split. Those enum values exist in
  the schema for the concept note's full taxonomy but have no automated rule behind them yet.
  Module 2's obligation mapping only has rules for the `HIGH_RISK` branch as a result.
- The obligation catalog maps provider high-risk and deployer high-risk obligations only —
  importer/distributor/downstream-provider obligations (Art. 23–25) aren't mapped yet, matching
  the concept note's Feature 2.1 scope (provider + deployer + general only).
- Feature 2.1a (auto-generating/templating Annex IV technical documentation) isn't built —
  Module 2 currently tracks the *obligation* to produce it (with owner/due date/status) but not
  document generation itself.
- Modules 3–4 (Tracking, Regulatory Watch) are unbuilt placeholders.
- No self-serve signup — users are provisioned via `prisma/seed.ts` or direct DB access for now.
