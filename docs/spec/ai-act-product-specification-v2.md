**SenecAI Governance Hub**

AI Act modules: product specification

Prepared by Matei Ștefan, SenecAI · 11 October 2026 · Version 2, for discussion

**1. Purpose and scope**

The Governance Hub is a web platform that takes an organisation from the question “does the EU AI Act apply to us?” to a reviewed, evidence-backed compliance roadmap. This specification covers the AI Act modules only. GDPR, NIS2, DORA and the Cyber Resilience Act are out of scope for this version, although the data model is built so that other regulations can be added later without redesign.

The Hub can be sold on its own. It is also the delivery tool for SenecAI’s consulting work, and its roadmap leads the client towards legal and technical implementation by consultants, which stays a human service. The product therefore has two jobs: to be useful without any services attached, and to make the services easy to buy when the client wants them.

**2. Users and workspaces**

**SenecAI consultants** are the internal team. They see every client of SenecAI, review everything the platform drafts, and approve documents before they are released to the client.

**Outside lawyers and compliance professionals** use the Hub as a project-management and delivery tool for their own clients. Each firm gets its own workspace, its own client list and its own team members. Nothing in a firm’s workspace is visible to SenecAI or to any other firm. The reviewing role belongs to the firm’s own lawyers, and the PDFs can carry the firm’s name and logo. These users are the likeliest buyers of a stand-alone subscription, because they get the structure, templates and drafting without building a tool themselves.

**Regulated companies** are the end clients. They complete the inventory and questionnaires, upload evidence, follow the status of each document, read the PDFs and receive alerts. They can work alone, or with a SenecAI consultant or an outside lawyer who has been invited into their organisation.

All three work on the same data. Permissions differ by role: a company user can edit its own inventory and evidence but cannot approve a document; a reviewer can edit and approve; an administrator manages users and branding. The audit log records who changed or approved what and when.

**3. The inventory as the primary workspace**

The AI system inventory is the main interface of the Hub, and it is where users do their work. It is not a first step that they complete and leave behind. After logging in, a company user lands on the inventory; a consultant or lawyer lands on the list of their clients and then on the inventory of the chosen client. Every other part of the product is reached from a system and is shown in the context of that system.

Each system in the inventory shows its status, its accountable owner, its regulatory classification (the company’s role and the risk class), the number of outstanding obligations, the completeness of its evidence and its next actions. Opening a system leads to its obligations, and opening an obligation leads to the evidence that supports it. A user should be able to move from a system to an obligation to a file in two clicks, and back again.

The PDFs are generated outputs of this underlying record. They are dated, signed snapshots that a client can keep, send to an auditor or file, and nobody edits them. Compliance is managed in the workspace and never in a PDF. When a record changes, the PDFs built from it are marked outdated and a new version is generated, instead of the old one being changed.

**4. The workflow and its PDFs**

The flow starts with an applicability check and then runs through six steps in a fixed order, because each depends on the one before. The applicability check asks about the company: where it is established, its size and sector, whether it builds or sells AI, uses third-party AI, and processes personal data. It returns which regulations apply, each with the provision it rests on. For this version, a positive AI Act result opens the six steps, and its short summary appears on the cover page of every PDF.

Five of the six steps produce their own PDF. The evidence step does not, because it is the working step; its result appears in the gap assessment PDF as an evidence index. Each PDF is generated from the structured data in the platform, so it always matches what the client sees on screen, and each one is versioned. Every PDF shows its status (draft, in review or approved), the reviewer’s name, the date and the version of the legal content it was built on. A combined pack can be exported as well.

| **PDF deliverable**     | **What it contains**                                                                                                                           | **Main provisions**                   |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| **AI inventory**        | Every AI system the company builds, buys or embeds, with owner, supplier, purpose, data used, where deployed, and the company’s role for each. | Arts. 3 and 26; Art. 4 (AI literacy)  |
| **Risk classification** | For each system: role, prohibited-practice screen, high-risk test, transparency duties, and the reasoning behind each answer.                  | Arts. 5, 6, 50; Annexes I and III     |
| **Obligation mapping**  | For each system, the obligations that follow from its classification, who carries them (provider or deployer), and the date each applies.      | Arts. 8 to 27, 43, 47 to 49, 72, 73   |
| **Gap assessment**      | Each obligation scored against the evidence on file: compliant, partial or gap, with a readiness score and the reasons.                        | Same, plus linked evidence            |
| **Compliance roadmap**  | Prioritised actions in phases, each tagged legal or technical, with owner, effort and status, and a path to request implementation.            | All obligations in the gap assessment |

**Step 1: AI inventory.** The inventory records each AI system with its purpose, internal owner, supplier, the data it uses, where it is used and whether it was built, bought or embedded. A vendor register sits beside it: for bought systems, the entry lists the documents to request from the vendor and tracks whether each was received. The inventory is a living register. Adding or changing a system, a vendor, a purpose or a deployment reopens the classification for that system and marks the dependent PDFs as outdated.

**Step 2: Risk classification.** Every system goes through its own questionnaire covering the company’s role (provider, deployer, importer or distributor), the Article 5 screen for prohibited practices, the high-risk test under Article 6 and the annexes, and the Article 50 transparency duties. The platform shows the outcome and the legal rationale behind it, and the reviewer can override it with a written justification. The override is kept in the record.

**Step 3: Obligation mapping.** The classification is turned into the concrete obligations for each system, split by role. A deployer of a high-risk system sees different duties from a provider of the same system. Each obligation shows its article, the reason it applies, a plain-language description and the date from which it applies. Dates come from versioned legal content and not from fixed text, because the timeline for high-risk obligations has been under proposed amendment and may change again. Because the mapping is generated automatically from the classification, users experience steps 2 and 3 as one continuous step.

**Step 4: Evidence.** After classification, the user is asked to provide the documentation that shows the obligations are met. For each obligation that applies, the platform states what evidence is expected, for example a logging specification, sample logs and a retention setting for the record-keeping duty, and the user uploads or links files against it. Files are attached to the obligation and the system they support, and vendor documents received through the vendor register are linked automatically. A reviewer then assesses the quality of each item: sufficient, partial or insufficient, with a comment. Evidence completeness, meaning the share of required evidence that has been provided, is shown for each system in the inventory.

**Step 5: Gap assessment.** Each obligation is assessed against the evidence provided and given a status of compliant, partial or gap. The platform proposes the status and the reviewer confirms it, recording their rationale. The result is a readiness score per system and overall, with the reasons given for each line, and it can also show how the findings relate to ISO/IEC 42001 areas, as a complement to the AI Act and not a substitute for it.

**Step 6: Compliance roadmap.** Gaps become corrective actions, grouped in phases by urgency and effort. Each action is marked as legal or technical and shows its accountable owner, deadline and status, and an action is closed only when completion evidence is attached. Actions SenecAI can deliver carry a request-implementation button, described in section 10.

**5. The obligation-to-evidence engine**

This is the core of the product and the part where development effort should be concentrated. Every obligation that applies to a system is a record that connects six things, and the platform must keep the connections intact at all times.

**Legal basis and applicability rationale:** the provision the obligation comes from and the reason it applies to this system, based on the classification answers.

**Responsible party and accountable owner:** whether the duty falls on the company as provider or as deployer, and the named person inside the company who answers for it.

**Evidence required:** what the legal content says would demonstrate that the obligation is implemented.

**Evidence provided:** the files and notes actually supplied, with version, date and expiry.

**Assessment result and reviewer rationale:** the status given, who gave it and why.

**Corrective action:** the action that follows from a gap, with its owner, deadline and completion evidence.

Linking these turns the platform from a document generator into a traceable compliance management system. For any obligation, a user or an auditor can ask how the company knows it is met, and the answer is a path from the legal basis to the evidence to the reviewer’s reasoning. The engine also enforces rules: an obligation cannot be marked compliant without at least one evidence item or a recorded reviewer rationale explaining why none is needed; a change to the system, the evidence or the legal content reopens the assessment; and a corrective action cannot be closed without completion evidence.

**6. AI drafting and the review workflow**

The platform drafts, and people approve. For each module, AI turns the structured data into the written parts of the PDF: classification reasoning, obligation descriptions, gap explanations and roadmap actions. It also drafts the main supporting documents from templates, filled with the company’s data. The first template set covers the AI system record, the classification memo, an AI use policy, an AI literacy record under Article 4, a vendor documentation request, an Article 50 transparency notice, a fundamental rights impact assessment under Article 27 where it applies, a risk management file, an Annex IV technical documentation skeleton and a serious-incident procedure under Article 73.

Every document moves through the same states: AI draft, in review, approved, released to the client. Nothing reaches a client as approved without a named reviewer. Each statement in a draft cites the provision it relies on, so the reviewer can check it, and the reviewer can edit the text, reject it or send it back with comments. The platform keeps the history of versions. AI processing must run under terms that prevent client data from being used for model training, and one tenant’s data must never be used to draft another tenant’s documents.

**7. Repository hub**

The repository is where all evidence and files live: policies, vendor documents, test reports, logs, contracts, training records and approved PDFs. It is the working space of step 4, not a separate file store. Every file is linked to the AI system and the obligation it supports, so that the assessment can point to the evidence behind each status and an auditor can follow the trail. Each obligation carries a list of the evidence expected, and the repository shows which items are still missing. Reviewers rate each item and leave comments. Files are versioned, carry an owner and a review date, and are flagged when they expire or when the system they relate to changes. Access follows the role model in section 2, with private folders for lawyers’ working notes that the client does not see. Storage is in the EU, and the retention period is set per client.

**8. Regulatory monitoring**

The monitoring system tells clients when something that affects them changes. Changes are recorded as entries in a change log: a new delegated or implementing act, a guideline from the Commission or the AI Office, a standard, an amendment, or a change to a date. Each entry is written and mapped by a person to the articles and obligations it touches, and states what it means in practice. Because obligations are linked to each client’s systems, an alert goes only to clients whose systems are affected, and it opens the affected items with a prompt to review them. Where a change alters a date or an obligation, the dependent PDFs are marked outdated until they are regenerated and reviewed. The first version is deliberately human-curated, because the value lies in the judgement; automated source tracking can be added later to feed the editors.

**9. Data model and security**

The model is a chain that mirrors the engine in section 5: organisation, client, AI system, classification, system obligation, evidence requirement, evidence item, assessment and action. Everything else attaches to it. Legal content (articles, obligations, required evidence, questionnaires, dates, templates) is stored as versioned data separate from client data, so that a legal update changes the content once and every affected client is told. The platform is multi-tenant with strict isolation between organisations, and SenecAI itself is one tenant like any other. Hosting is in the EU. The platform processes personal data of its users and may hold personal data inside evidence files, so it needs its own GDPR documentation: a privacy notice, processor terms, a subprocessor list and a retention schedule.

**10. Implementation pathway**

Legal and technical implementation stay with consultants. In the roadmap, each action that SenecAI can deliver carries a request button that sends the action and the relevant findings to SenecAI as a scoped enquiry. Technical and cyber actions are handled the same way, so the client sees one scope and one quote. For outside lawyers, the same button can route work to their own team or to SenecAI as a partner. The roadmap remains useful and complete without any request, and nothing in the module should be locked behind a services purchase.

**11. Build sequence**

The sequence is built around one aim: a professional should be able to use the product on a real client engagement as early as possible. Four stages follow, each with an exit criterion that says when it is done.

**Stage 1: assessment and client delivery.** The organisation and multi-client workspace structure; the AI system inventory and vendor register; guided role and risk classification with legal rationale; a versioned obligation library and applicability rules; an initial gap assessment and a prioritised action list; PDF exports, reviewer approval and an audit trail; and basic role-based permissions with tenant isolation. AI drafts the narrative parts of the PDFs under reviewer approval, and a simple enquiry button on the action list lets a client ask for implementation. In this stage the gap assessment is initial: the reviewer builds it from the questionnaire answers and the client interview, because the evidence workflow does not exist yet. The exit criterion is that a professional can take a real client from intake to a reviewed assessment and actionable roadmap without a parallel spreadsheet to manage the engagement.

**Stage 2: evidence and documentation workflow.** Built after the first stage has been tested on real engagements. It adds the evidence repository linked to obligations, the full obligation-to-evidence engine, evidence-quality assessment with reviewer comments, the core templates for policies, system records and applicable assessments with AI drafting, document versioning, expiry and change tracking, and action owners, deadlines and completion evidence. The gap assessment now rests on the evidence provided. The exit criterion is that a client can use the platform to manage implementation after the initial legal assessment.

**Stage 3: recurring governance.** Built when clients show recurring demand. It adds curated regulatory updates with impact assessments, periodic review reminders, reassessment whenever a system, vendor, purpose or deployment changes, and portfolio reporting with outstanding-action dashboards. The exit criterion is that customers have a reason to renew beyond keeping access to old PDFs.

**Stage 4: advanced capabilities.** Deferred until customer demand is established. It covers deeper integrations and technical evidence collection, further frameworks such as ISO/IEC 42001, broader digital-regulation modules, and portfolio analytics and enterprise features. The exit criterion is clear customer demand for each addition before it is built.

**12. Open decisions**

Four points remain to be settled. The first is pricing: per seat for lawyers and consultants, per client organisation, or a mix. The second is whether outside firms may white-label the PDFs fully or must keep a small “powered by” line. The third is which AI provider and hosting arrangement meets the no-training and EU-processing requirement. The fourth is the terms under which a draft counts as legal work product, and who carries responsibility for an approved document, which should be settled before any outside firm uses the platform with real clients.
