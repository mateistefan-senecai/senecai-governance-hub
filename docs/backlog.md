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

## Platform review of 24 Nov 2026: closing Stage 1 (to discuss)

**Overall:** the foundation is sound, but the platform is not yet ready for a real client.

What held up in the review:

- Tenant isolation held when every account tried every other account's pages (about 250
  pages in total).
- Legal content is deterministic and versioned.
- Reviewer gates work, the database enforces the document state machine, and the audit
  trail is complete.

Fixed during the review: an empty Annex III purpose list counted as "none applies". It
now needs an explicit "None of these".

Proposed order:

1. **User invitations and management.** Firm staff and client company users can only be
   created in the database today. This is the main blocker for the Stage 1 exit criterion.
2. **Blank system-record fields still lower the risk class.** "What the system does" and
   "Who uses it or is affected" can be left empty, which hides the prohibited-practice
   and rights-impact questions. Apply the same "None of these" rule. Small change.
3. **Deploy safety.**
   - Run the tests automatically on every PR, against a Neon-like database (schema not
     on the search_path).
   - Alert when a production deploy fails. One bug blocked PRs #15-#18 for days
     without anyone noticing.
4. **Legal review of the content library** (still `DRAFT`):
   - question wording and the area-to-purpose mapping;
   - Annex I Section B treatment of machinery;
   - the NIS2/DORA/CRA/Data Act screening;
   - the Art. 15 explainer.

   Then check that the EUR-Lex "Read Article … in full" links land on the right article.
5. **Four-eyes on documents.** Decide whether the person who generated and submitted a
   document may also approve it. Today one reviewer can do all three; the spec only
   requires a named human reviewer. Then add MFA for reviewers and admins.
6. **Production clean-up.**
   - Set `SEED_DEMO_DATA=false` in Vercel.
   - Change or remove the demo accounts.
   - Delete test clients (e.g. "Test Matei 1.0", "Test 2", "Prințesa Puiuț SRL").

   Demo systems created before "areas of use" existed may have none recorded, so
   editing them fails with "Tick at least one area of use".

After 1-4: run one real pilot engagement, then start Stage 2.

Also known:

- **Areas of use limit the questions.** The classification relies on the system record:
  if an area of use is left unticked, its high-risk purposes are never asked. The
  classify page shows the facts it used, and the reviewer's confirmation is the
  safeguard.
- **AI drafting** of PDF narratives waits on the AI-provider decision (spec §12).
- **Branding settings** (logo on PDFs) are not built yet.
- **"Understand this obligation better"** exists only for Art. 15. To decide: which
  obligations get one next.
- **Not tested in the review:**
  - generating, approving and releasing PDFs in the browser (the automated tests cover
    them);
  - phone layouts and accessibility;
  - password reset and session expiry;
  - performance with many clients.

## Next build stages

- Stage 2: evidence (step 4), evidence repository, evidence-based gap assessment,
  templates with AI drafting.
