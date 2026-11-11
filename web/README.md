# SenecAI Governance Hub — AI Act (rebuild)

The Governance Hub, rebuilt from the spec in `../docs/spec/`. EU AI Act only for now.
It replaced the earlier prototype on 12 Oct 2026.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Prisma 7 · PostgreSQL · Auth.js.

## Run it locally

Needs Node 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy       # tables, row-level security, the hub_app role
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
- `tests/documents.test.ts`: the PDF state machine: role rules, no approval without a
  named reviewer (also refused by the database), open points, outdated detection after a
  record or legal content change, old versions and their PDFs kept, every transition
  audited.

The last three, and the document tests in `tests/tenant-isolation.test.ts`, need a
seeded database.

`npx tsx scripts/pdf-samples.ts <dir>` writes one sample PDF of each deliverable from
the demo data (rolled back afterwards). The current samples are in
`../docs/screenshots/pdf-samples/`.

## Deploying (Vercel + Neon)

The Vercel project's root directory is `web/`. Each build runs
`prisma migrate deploy`, publishes the legal content, seeds demo data **only into an
empty database**, then builds Next.js. Environment variables:

| Variable | |
|---|---|
| `DATABASE_URL` | pooled connection (set by the Neon integration) |
| `DATABASE_URL_UNPOOLED` | direct connection, used by migrations (set by the Neon integration) |
| `AUTH_SECRET` | long random string |
| `SEED_DEMO_DATA` | set to `false` once real clients use the platform |
| `DB_SCHEMA` | optional, defaults to `hub` |

The app keeps its tables in their own PostgreSQL schema (`hub`), so it can share a
database with other tables. The production database still holds the retired
prototype's tables in `public`; they are unused and can be dropped whenever convenient.

The connecting role needs `CREATEROLE` once, for the migration that creates the
`hub_app` role. Every request switches to `hub_app`, which cannot bypass row-level
security, so tenant isolation holds even if the login role could bypass it.

The legal content version in `content/ai-act/manifest.json` is immutable once
deployed: changing content without bumping the version fails the build on purpose.

## How it is built

**Tenancy (spec §2, concept note §3 and §11).** An organisation (consultancy, law
firm or company) is the tenant. It holds clients, the regulated companies it works for.
A user can hold a membership in several organisations, with one role in each:
`ORG_ADMIN`, `REVIEWER` or `COMPANY_USER`. Isolation is enforced by PostgreSQL
row-level security (`prisma/migrations/*_row_level_security`). Every request runs in a
transaction that switches to the `hub_app` role and sets `app.org_id`
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
| PDFs (steps 1, 2, 3, 5, 6 + pack) | `/clients/[id]/documents`: generate, submit for review, approve, release, download; linked from the inventory and the roadmap |

Engine rules already enforced:
- editing a system's purpose, origin, supplier, deployment, use, autonomy or affected
  people marks the classification outdated and flags assessed obligations;
- an obligation is marked compliant only with a reviewer rationale (evidence from Stage 2);
- every gap or partial obligation has one action, closed only by a compliant assessment;
- the audit log is append-only (database trigger);
- any change to what a PDF prints (system record, vendor register, classification,
  obligations, assessments, owners, actions, enquiries, applicability, legal content
  version) marks that PDF outdated.

**PDF deliverables (spec §3–4, concept note §6–7).** `src/lib/documents/` and
`src/lib/services/documents.ts`.

- *Snapshot and input hash.* A document version stores the structured data it prints
  (`snapshot.ts`) and the SHA-256 of its canonical JSON, which includes the current legal
  content version. Each kind snapshots only what it prints, so an assessment outdates the
  gap assessment, roadmap and pack, but not the inventory. The services call
  `refreshDocuments` (`freshness.ts`) after every record change; the documents page calls
  it too, which catches a newly published content version. Approval re-checks the hash.
- *State machine.* draft → in review → approved → released, plus "send back" from review
  to draft with a comment. Only `REVIEWER` and `ORG_ADMIN` generate and move documents;
  `COMPANY_USER` sees and downloads released versions only (drafts are for reviewers,
  concept note §7). Approval records the reviewer's name and date. Every transition and
  every "marked outdated" goes to the audit log.
- *Immutability, in the database* (migration `documents`): a trigger rejects any change
  to the snapshot, illegal transitions, moving an outdated document forward, clearing the
  outdated flag, changing a signed approval, and deletes; a CHECK constraint rejects an
  approved or released row without a named reviewer. Regenerating creates a new version;
  old versions and their PDFs stay downloadable.
- *Storage.* One rendered PDF per state the document passes through (`DocumentFile`,
  insert-only), all from the same frozen snapshot, so the cover always shows the true
  state and reviewer. Bytes are in PostgreSQL under row-level security, behind
  `DocumentStore` (`store.ts`) so they can move to EU object storage with the Stage 2
  repository.
- *Rendering.* `@react-pdf/renderer` (`render.tsx`): pure JavaScript, runs in a Vercel
  function, no headless browser. Inter and Source Serif 4 (OFL) are embedded from
  `assets/fonts/` because the standard PDF fonts cannot print Romanian diacritics.
  The package is ESM-only, which is why `package.json` has `"type": "module"`.
- *Narrative.* Filled from the deterministic data (rule rationales, obligation summaries,
  reviewer rationales), every statement with its citation (`narrative.ts`). An AI drafter
  can implement `NarrativeDrafter` later and is recorded in `Document.narrativeSource`;
  the review states stay the same. No model is called today.

Decisions taken where the spec is silent (conservative by default; to confirm):
- A reviewer cannot approve a deliverable with *open points*: a classification,
  obligation, gap, roadmap or pack PDF that contains an unreviewed, outdated or missing
  classification, or (gap, roadmap, pack) an unassessed or to-be-reassessed obligation.
  The inventory has none: it states what is recorded, including "not classified".
- No four-eyes rule: the reviewer who generated a document may approve it (a one-lawyer
  firm must be able to work). Both names are recorded.
- A released document that becomes outdated stays visible to the client, flagged
  outdated, until a new version is released.
- Only the latest version of a deliverable can move through the states.
- Generating when nothing changed since the latest current version is refused.
- The PDF cover keeps a small "Governance Hub" line and the hub name in the PDF metadata
  until the white-label question (spec §12) is decided. The logo prints once
  `Organization.brandLogo` holds a `data:image/…` URI (no network fetch at render time);
  branding settings are not built yet, so PDFs show the brand name or organisation name.
- Company users do not see draft documents in the audit log either.

## Not built yet (Stage 1 remainder and later)

- AI drafting of narrative sections under reviewer approval (the PDFs carry a
  deterministic narrative; the drafter interface is in place).
- Reviewer comments and edits on a document beyond "send back with a comment"; the
  evidence index in the gap assessment lists expected evidence only (Stage 2).
- User invitations and branding settings (users are created by the seed for now), and
  MFA for reviewers and admins.
- A cross-tenant queue so SenecAI receives enquiries routed to it by other firms. Today
  an enquiry is stored in the sender's tenant.
- Stage 2: evidence repository, evidence-based gap assessment, templates. Stage 3:
  regulatory monitoring.
