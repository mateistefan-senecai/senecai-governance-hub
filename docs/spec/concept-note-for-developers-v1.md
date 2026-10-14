**SenecAI Governance Hub**

AI Act modules: concept note for developers

Prepared by Matei Ștefan, SenecAI · 11 October 2026 · Version 1, for discussion

**1. What we are building**

The Governance Hub is a multi-tenant web application that guides an organisation through EU AI Act compliance. A user answers questions about their company, records every AI system they build, buy or embed, and the platform works out which rules apply to each system, how far the company is from compliance, and what to do about it. The result is a set of reviewed PDF reports and a repository of evidence. Legal and technical implementation work is done by human consultants, and the platform leads the client towards ordering it.

The product is used by three kinds of people: SenecAI consultants, outside lawyers or compliance professionals who run their own clients on the platform, and the regulated companies themselves. It can be sold on its own. This note is written for the developer who will help build it. It explains the intent and the main design questions, and where I suggest a technical approach I mark it as a suggestion that you are free to change. The legal content is my responsibility, and I will supply it as structured data.

The existing prototype runs on Next.js and Tailwind CSS, hosted on Vercel, with no component library. I am happy to keep that stack or move away from it if you see good reasons. Please tell me what you would change and why.

**2. Principles that drive the design**

**Deterministic where the law is concerned, generative where the writing is concerned.** The classification of an AI system, the list of obligations that follow and the dates they apply from must come from explicit rules and versioned data, so that the same answers always give the same result and a lawyer can inspect why. AI is used only to write explanations and drafts around those results, and never to decide them.

**Nothing is approved without a person.** Every document passes through a named human reviewer before the client sees it as approved. The platform records who approved what and when.

**One data model, three views.** Consultants, outside lawyers and companies all work on the same records. They differ in what they can see and do, not in how the data is stored.

**Strict separation between tenants.** A law firm’s clients, notes and drafts must never be visible to another firm or to SenecAI. This is a legal and commercial requirement, not a nice-to-have.

**Law changes, so content is data.** Articles, obligations, questionnaires, dates and templates are stored and versioned outside the code, so that a legal update is a content change and not a deployment.

**3. Users, workspaces and permissions**

An organisation is the account holder: a consultancy, a law firm or a company. An organisation can contain several clients, which are the regulated companies it works for. A company that signs up by itself is simply an organisation with one client. A user can belong to more than one organisation, for example a lawyer who is invited into a client’s workspace as a reviewer. The matrix below is the intended permission model.

| **Capability**                            | **Company user** | **Reviewer (consultant or lawyer)** | **Org admin**  |
|-------------------------------------------|------------------|-------------------------------------|----------------|
| **Edit inventory, answer questionnaires** | Yes, own company | Yes, for assigned clients           | Yes            |
| **Upload and link evidence**              | Yes              | Yes                                 | Yes            |
| **Edit AI drafts, comment**               | Comment only     | Yes                                 | Yes            |
| **Approve and release documents**         | No               | Yes                                 | Yes            |
| **Override a classification**             | No               | Yes, with written reason            | Yes            |
| **Private working notes**                 | No access        | Yes                                 | Own notes only |
| **Invite users, set branding, billing**   | No               | No                                  | Yes            |

Reviewers can keep private working notes on a client that the company user never sees. Invitations should work in both directions: an organisation invites a client, and a company invites an outside reviewer.

**4. The flow**

A client starts with an applicability check: a short profile form (establishment in the EU, sector, size, whether they build or use AI, whether they process personal data), which returns which regulations apply and the provision each finding rests on. In this version only the AI Act continues into modules, but the check should be designed to return a list, because other regulations will be added later. A positive AI Act result opens five modules in a fixed order, because each depends on the one before.

**1. AI inventory.** A register of AI systems. For each one: purpose, internal owner, supplier, data used, where it is deployed, and whether it was built, bought or embedded. For bought systems the user sees a list of documents to request from the vendor and a status for each. Adding or changing a system invalidates what was derived from it.

**2. Risk classification.** A questionnaire per system: the company’s role (provider, deployer, importer or distributor), a screen against the prohibited practices in Article 5, the high-risk test under Article 6 and Annexes I and III, and the transparency duties in Article 50. The result is stored with the answers and the reasoning, and a reviewer can override it with a written reason. I suggest modelling the questionnaire as a decision tree in JSON that the application interprets, so that I can edit it without code changes.

**3. Obligation mapping.** For each classified system, the platform selects the obligations that apply from the content database, filtered by role and risk class, with the date each takes effect. Dates must come from the content version, because the timeline for high-risk obligations has been under proposed amendment and may move.

**4. Gap assessment.** Each obligation on each system gets a status of compliant, partial or gap, based on the evidence linked to it in the repository. The platform proposes the status and a reviewer confirms it. A readiness percentage is calculated per system and overall.

**5. Compliance roadmap.** Every gap generates an action. Actions are grouped into phases, tagged legal or technical, and given an owner and a status. Actions that SenecAI delivers carry a request-implementation button that sends the action and its findings to us as an enquiry.

**5. Data model**

The core is a chain: organisation, client, AI system, classification, obligation, evidence and action. I suggest a relational database (PostgreSQL), with JSON columns for questionnaire answers. The entities below are the minimum; field names are indicative.

| **Entity**                | **Purpose**                                                                                         | **Key fields and relations**                                                                                                              |
|---------------------------|-----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| **Organisation (tenant)** | A consultancy, law firm or company that holds an account. SenecAI is one tenant.                    | name, type, branding, plan, region                                                                                                        |
| **Client**                | A regulated company managed inside an organisation. A company on its own account is its own client. | organisation_id, profile answers (JSON), applicability result                                                                             |
| **User, Membership**      | A person and their role in an organisation or client.                                               | user_id, org_id, client_id, role                                                                                                          |
| **AISystem**              | One entry in the inventory.                                                                         | client_id, name, purpose, owner, supplier, data categories, deployment context, status, origin (built, bought, embedded)                  |
| **Classification**        | The outcome of the questionnaire for one system, versioned.                                         | system_id, role, prohibited_flag, high_risk_flag, transparency flags, answers (JSON), reasoning, override (reason, user), content_version |
| **Obligation (content)**  | One legal obligation, stored as data and not shared across tenants.                                 | article, title, plain text, applies_to (role, risk class), applies_from date, version                                                     |
| **SystemObligation**      | The obligation as it applies to one system, with its score.                                         | system_id, obligation_id, status (compliant, partial, gap), score reason, reviewer                                                        |
| **Evidence**              | A file or note in the repository.                                                                   | client_id, file ref, version, owner, review_by date, links to systems and obligations                                                     |
| **Action**                | A roadmap item generated from a gap.                                                                | system_obligation_id, type (legal or technical), phase, owner, status, request_id                                                         |
| **Document**              | A generated PDF or template-based document with its workflow state.                                 | client_id, kind, version, state, input_hash, content_version, reviewer, released_at                                                       |
| **ChangeLogEntry**        | A regulatory change, written by an editor.                                                          | title, summary, source URL, effective date, affected obligation ids                                                                       |
| **AuditEvent**            | An append-only record of every meaningful change.                                                   | actor, entity, action, before, after, timestamp                                                                                           |

Legal content (obligations, questionnaires, templates, dates) sits in its own tables with a version number, separate from client data. Each classification, assessment and document records which content version it was built on. When I publish a new content version, the platform should be able to list every client and system whose results depend on a changed item.

**6. PDF deliverables**

Each module produces one PDF: AI inventory, risk classification, obligation mapping, gap assessment and compliance roadmap. A combined pack can be exported too. The PDF is generated on the server from the structured data, so that it always matches what is on screen. I suggest rendering styled HTML to PDF with a headless browser, because it gives good typography with little effort, but any reliable method is fine. Each PDF shows its state (draft, in review, approved), the reviewer’s name, the date, the version and the content version. For outside firms, the PDF should carry the firm’s own name and logo, which is set in the organisation’s branding.

To know when a PDF is out of date, store a hash of the inputs it was built from (the relevant records and the content version). If the hash changes, the document is marked outdated, and a new version starts as a draft.

**7. AI drafting and the review workflow**

AI writes the narrative parts of the PDFs and the main supporting documents, which are generated from templates filled with the client’s data. The first set is the AI system record, the classification memo, an AI use policy, an AI literacy record, a vendor documentation request, a transparency notice, a fundamental rights impact assessment where it applies, a risk management file, an Annex IV technical documentation skeleton and an incident procedure. Every document follows the same state machine.

| **Document state** | **Meaning and allowed transitions**                                                                               |
|--------------------|-------------------------------------------------------------------------------------------------------------------|
| **ai_draft**       | Created by the generator. Visible to reviewers only. Can move to in_review or be discarded and regenerated.       |
| **in_review**      | A reviewer is editing or commenting. Can move to approved, or back to ai_draft after changes to the inputs.       |
| **approved**       | Locked and signed with reviewer name and date. Can move to released.                                              |
| **released**       | Visible to the client. Becomes outdated if inputs or legal content change; a new version then starts at ai_draft. |

For the generation step I suggest a small internal service with a provider abstraction, so the model can be swapped. The prompt should contain only the structured data for the one client concerned and the exact legal text taken from the content database. The model should return structured output in which every statement carries a reference to a provision, and the application should check that each reference exists in the content database before showing the draft. Drafts that fail the check are rejected or flagged. The contract with the AI provider must exclude training on our data and must allow processing in the EU. Prompts and outputs should be logged against the document version for audit.

**8. Repository**

The repository stores all evidence: policies, vendor documents, test reports, logs, contracts, training records and the approved PDFs. Every file is linked to the AI system and the obligation it supports, which is what makes the gap assessment traceable. Files are versioned, have an owner and a review date, and are flagged when they expire or when the system they relate to changes. I suggest S3-compatible object storage in an EU region, uploads and downloads through short-lived signed URLs, a virus scan on upload, and access checks on every request. Retention periods are set per client, and deleting a client must remove its files and records completely.

**9. Regulatory monitoring**

When something changes in the law, clients whose systems are affected should be told. The first version is a curated change log. I write each entry, with a summary, a source and the articles or obligations it touches. The application finds every client system linked to those obligations, notifies the relevant users by email and in the app, and opens the affected items with a prompt to review them. If the change alters an obligation or a date, the dependent documents are marked outdated. Automatic crawling of official sources can be added later to feed my editorial work, but I do not want it to publish anything on its own.

**10. Implementation requests**

A request-implementation button on a roadmap action, or on a group of actions, creates a request record containing the selected actions, the related findings and the client’s contact. The request appears in a queue for the SenecAI team, who reply with a scoped quote. Outside firms should be able to send the same request to their own team instead, or to SenecAI as a partner. Nothing in the modules should be locked behind a services purchase.

**11. Security and compliance requirements**

Hosting and data storage in the EU. Tenant isolation enforced in the data layer (for example row-level security) and not only in application code, with tests that try to cross tenants. Role checks on every endpoint. Multi-factor authentication for reviewers and administrators. An append-only audit log for approvals, overrides, evidence changes and permission changes. Encryption in transit and at rest. The platform processes personal data of its users and holds personal data inside client evidence files, so it needs a privacy notice, processor terms, a subprocessor list and a deletion process, which I will prepare. Please tell me what the chosen infrastructure means for each of these.

**12. Suggested build order**

Stage one: authentication, organisations, clients and the three-role permission model, followed by the applicability check, the AI inventory and risk classification, with their PDFs. The permission model goes first because adding it later means touching every screen. Stage two: obligation mapping, gap assessment and the roadmap, with their PDFs. Stage three: the repository, the templates, the AI drafting service and the review workflow. Stage four: regulatory monitoring and implementation requests.

**13. Questions for you**

Please tell me whether you would keep the current stack or change it, and how you would enforce tenant isolation. I would also like your view on the best way to generate the PDFs, on how to store and edit the legal content so that it is easy for a lawyer to maintain, and on the hosting that fits EU-only processing. Finally, a rough estimate for each of the four stages, and anything in this note that you think is unclear, too ambitious or missing, would be very useful.
