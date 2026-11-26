# Backlog: parked items

Things agreed to deal with later. Check this list at the start of a session and raise any
item that has become relevant. Remove an item when it is done.

## Parked by the product owner

- **Email notifications to clients** (parked 24 Nov 2026: "we will deal with the email
  aspect later on"). The code is in place: confirming or overriding a classification and
  releasing a document create a `Notification`, shown in the client's Updates panel and
  emailed after commit. Emails are only sent once a provider is configured in Vercel:
  `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (verified sending domain), see
  `web/README.md`. Until then each notification records `skipped: no email provider
  configured`. To decide: the provider (Resend or another; EU processing and listing it
  as a subprocessor in the platform's GDPR documentation), the sending address, and
  whether SenecAI should also get an email on new demo or consultation requests.

## Open decisions (spec §12)

Left open on purpose (26 Nov 2026: "they don't need to be decided now"):

- Pricing model.
- White-labelling of PDFs (full, or a "powered by" line; PDFs currently keep a small
  "Governance Hub" mention).
- AI provider and hosting for AI drafting (no-training, EU processing). AI drafting of PDF
  narratives waits on this.
- Responsibility for approved documents and when a draft counts as legal work product.

## Decided on 26 Nov 2026 (to build)

- **Email provider: Resend.** The product owner is opening the account. Needs a verified
  sending domain (EU region) and `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` in Vercel.
- **User invitations.** The org admin invites anyone; a reviewer invites users for the
  clients assigned to them; a company user invites colleagues for their own company only.
  The invitee gets an email link to set a password; until Resend is configured the
  inviter sees the link to copy and send by hand.
- **Approval by the author is allowed**, without restriction: one reviewer may generate,
  submit and approve the same document (the spec only requires a named human reviewer).
- **Legal review of the content library** is done by the product owner, **inside the
  app** (a content-review screen to build). Annex I Section B (machinery) stays as now,
  marked open until that review.
- **PDF logo:** the logo of the reviewing organisation: a law firm's own logo for its
  clients, SenecAI's logo for SenecAI's clients.
- **No company works without a reviewer** (spec §2 and concept note updated). Ways in: an
  existing SenecAI client is offered the platform; a company **signs up by itself**,
  becomes a SenecAI client and is assigned a SenecAI consultant (included in its
  subscription); or a law firm brings it in. To build: self sign-up that creates the
  client under SenecAI and queues it for consultant assignment; move the demo company
  Vitalis Health under SenecAI as a self-signed-up client with an assigned consultant.
- **MFA:** code by email (needs Resend), optional during the pilot, mandatory for
  reviewers and admins before real clients.
- **EUR-Lex links:** checked by the product owner, they land on the right article.
- **Pilot with demo clients:** each pilot client chooses whether to enter real or
  fictitious data, covered by a short test agreement. Before the pilot: a watermark on
  PDFs ("Test version – not legal advice") and a "Send feedback" button.

## Before real clients use the platform

- Built on 26 Nov 2026 for the pilot: user invitations (with law firm workspaces opened
  by SenecAI at `/firms`), the pilot flag with its PDF watermark, the "Send feedback"
  button, and branding (logo on PDFs). Still to build: the content-review screen and MFA.
- AI drafting of PDF narratives (waits on the AI-provider decision).
- Annex I Section B (machinery) treatment: confirm or change during the content review.
- Legal review of the content library (still `DRAFT`): question wording, area-to-purpose
  mapping, NIS2/DORA/CRA/Data Act screening.
- Remove the pilot watermark; set `SEED_DEMO_DATA=false` in Vercel. Kept for now (26 Nov):
  the demo accounts and the test clients ("Test Matei 1.0", "Test 2",
  "Prințesa Puiuț SRL"); decide after the pilot.

## Next build stages

- Stage 2: evidence (step 4), evidence repository, evidence-based gap assessment,
  templates with AI drafting.
