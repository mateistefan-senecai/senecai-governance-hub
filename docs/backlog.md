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

- Pricing model.
- White-labelling of PDFs (full, or a "powered by" line; PDFs currently keep a small
  "Governance Hub" mention).
- AI provider and hosting for AI drafting (no-training, EU processing). AI drafting of PDF
  narratives waits on this.
- Responsibility for approved documents and when a draft counts as legal work product.

## Before real clients use the platform

- Stage 1 gaps against the spec (found in the 24 Nov 2026 review): no way to invite users
  or add a company user for a client from the UI; AI drafting of PDF narratives (waits on
  the AI-provider decision).
- Decide whether a document may be approved by the same person who generated and
  submitted it (today one reviewer can do all three; the spec only requires a named
  human reviewer).

- Legal review of the content library (still `DRAFT`): question wording, area-to-purpose
  mapping, Annex I Section B treatment of machinery, NIS2/DORA/CRA/Data Act screening.
- Set `SEED_DEMO_DATA=false` in Vercel, change or remove the demo accounts, delete test
  clients (e.g. "Test Matei 1.0", "Test 2", "Prințesa Puiuț SRL").
- Check one EUR-Lex "Read Article … in full" link lands on the right article.
- User invitations, branding settings (logo on PDFs), MFA for reviewers and admins.

## Next build stages

- Stage 2: evidence (step 4), evidence repository, evidence-based gap assessment,
  templates with AI drafting.
