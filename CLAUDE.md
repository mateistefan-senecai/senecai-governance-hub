# SenecAI Governance Hub

## Authoritative spec — read before any product or scope decision

The platform is being rebuilt from these two documents (11 Oct 2026). They win over anything else in the repo:

- `docs/spec/ai-act-product-specification-v2.md` — the **what**: users and workspaces, inventory as the primary workspace, the six-step workflow and its PDFs, the obligation-to-evidence engine, AI drafting + review, repository, regulatory monitoring, implementation pathway, build stages and their exit criteria, open decisions.
- `docs/spec/concept-note-for-developers-v1.md` — the **how**: design principles, permission matrix, data model, PDF generation, document state machine, security requirements, suggested build order.

The original Word files are in `docs/spec/sources/`. If you edit the spec, edit the Word file and regenerate the markdown (`pandoc <file>.docx -t gfm --wrap=none`).

Scope right now: **EU AI Act only.** GDPR, NIS2, DORA and CRA are out of scope for this version, but the data model must allow adding them later without redesign.

Do not assume scope, sequencing or positioning beyond what the spec states — ask the user when something isn't covered.

## Supporting context (lower precedence)

- `docs/context/business-overview.md` — company background, team, SenecAI 2.0 rebrand. Written before the spec: where it conflicts (e.g. it says the Hub is not sold standalone and that GDPR is built in parallel), **the spec wins**.
- `docs/context/decision-trees/`, `docs/context/ai-inventory-questionnaire.md`, `docs/context/sources/` — earlier legal content (role and high-risk checklists, inventory questionnaire). Still valid source material for the questionnaires; the spec owner supplies the authoritative legal content as structured data.
- `docs/archive/` — superseded documents. Never build from these.

## Non-negotiables (from the spec)

- Deterministic where the law is concerned: classification, obligations and dates come from versioned content data, never from AI.
- Nothing reaches a client as approved without a named human reviewer.
- Strict tenant isolation: a firm's data is never visible to another firm or to SenecAI.
- Legal content is data, versioned, stored separately from client data.
