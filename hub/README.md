# SenecAI Governance Hub — AI Act (rebuild)

The rebuild of the Governance Hub described in `../docs/spec/`. EU AI Act only for now.
The previous prototype is in `../web/` and is untouched; this app does not share its
database or code.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Prisma 7 · PostgreSQL · Auth.js.

## Run it locally

Needs Node 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy       # schema + row-level security
npx prisma db seed              # legal content + demo data
npm run dev
```

Demo accounts (password `changeme123`):

| Email | Organisation | Role | Sees |
|---|---|---|---|
| `admin@senecai.dev` | SenecAI (consultancy) | Org admin | all SenecAI clients |
| `consultant@senecai.dev` | SenecAI | Reviewer | NovaBank only (assigned) |
| `client@novabank.dev` | SenecAI | Company user | NovaBank's own inventory |
| `lawyer@ionescu.law` | Ionescu & Asociații (law firm) + Vitalis Health | Org admin / Reviewer | their firm's client; switches org to review Vitalis |
| `it@vitalis.health` | Vitalis Health (company on its own) | Org admin | itself |

## Tests

```bash
npm test
```

- `tests/content.test.ts`: legal scenarios (credit scoring, CV screening, chatbots,
  Art. 6(3), prohibited practices, scope exclusions, Annex I), plus the content validator.
- `tests/tenant-isolation.test.ts`: tries to read, update and insert across tenants
  at the database level, and to tamper with the audit log.
- `tests/workflow.test.ts`: engine rules: the living register reopens the
  classification, overrides need a reason, a compliant status needs a rationale,
  and actions open and close with the assessment.

The last two need a seeded database.

## How it is built

**Tenancy (spec §2, concept note §3 and §11).** An organisation (consultancy, law
firm or company) is the tenant. It holds clients, the regulated companies it works for.
A user can hold a membership in several organisations, with one role in each:
`ORG_ADMIN`, `REVIEWER` or `COMPANY_USER`. Isolation is enforced by PostgreSQL
row-level security (`prisma/migrations/*_row_level_security`), with `FORCE` so it binds
the table owner too. Every request runs in a transaction that sets `app.org_id`
(`src/lib/tenant.ts`). Without it, no tenant row is visible. Role checks inside an
organisation live in `src/lib/authz.ts`.

**Legal content is data (concept note §2).** `content/ai-act/*.json` holds the
applicability check, the classification questionnaire and its rules, the obligation
library (article, parties, condition, application date, plain-language summary, action,
expected evidence), the dates, and the vendor documents. `npm run content:validate`
checks every reference, and `npm run content:publish` stores the library as an
immutable `ContentVersion`. Classifications and obligations record the version they
were built on. To change content, edit the JSON, bump `manifest.json`'s version, and
publish.

**Deterministic engine.** `src/lib/content/engine.ts` evaluates the questionnaire
against the rules in order and records every rule that fired, with its citation and
rationale. That trail is the "legal reasoning" shown to the reviewer. AI does not
decide anything.

**The workflow.**

| Spec step | Where |
|---|---|
| Applicability check | `/clients/[id]/applicability`; a positive AI Act result opens the inventory |
| 1 Inventory + vendor register | `/clients/[id]/inventory` (the main workspace), system page |
| 2 Classification | `/systems/[id]/classify`; reviewer confirms or overrides with a written reason |
| 3 Obligation mapping | regenerated automatically from the effective classification |
| 4 Evidence | **Stage 2**: the obligation page shows the expected evidence |
| 5 Gap assessment | reviewer sets compliant / partial / gap with a rationale (Stage 1: from the interview) |
| 6 Roadmap | `/clients/[id]/roadmap`: phases, owner, deadline, request implementation |

Engine rules already enforced:
- editing a system's purpose, origin, supplier, deployment, use, autonomy or affected
  people marks the classification outdated and flags assessed obligations;
- an obligation is marked compliant only with a reviewer rationale (evidence from Stage 2);
- every gap or partial obligation has one action, closed only by a compliant assessment;
- the audit log is append-only (database trigger).

## Not built yet (Stage 1 remainder and later)

- PDF deliverables with draft → in review → approved → released states, input hashes and
  "outdated" detection.
- AI drafting of narrative sections under reviewer approval.
- User invitations and branding settings (users are created by the seed for now), and
  MFA for reviewers and admins.
- A cross-tenant queue so SenecAI receives enquiries routed to it by other firms. Today
  an enquiry is stored in the sender's tenant.
- Stage 2: evidence repository, evidence-based gap assessment, templates. Stage 3:
  regulatory monitoring.
