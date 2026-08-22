# SenecAI Governance Hub — web app

Next.js (App Router) + TypeScript + Tailwind + Prisma/PostgreSQL. Currently implements
**Module 1 — AI Inventory & Risk Classification** of the AI Act module; see
`../docs/context/ai-act-platform-concept.md` for the full module roadmap and
`../CLAUDE.md` for product context that always applies to this repo.

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
  same engine later. `scripts/validate-decision-trees.ts` structurally validates the trees and
  smoke-tests example paths (`npx tsx scripts/validate-decision-trees.ts`).
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
- Modules 2–4 (Compliance Plan, Tracking, Regulatory Watch) are unbuilt placeholders.
- No self-serve signup — users are provisioned via `prisma/seed.ts` or direct DB access for now.
