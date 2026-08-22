# SenecAI Governance Hub

## Context you must always draw from

Before making any product or scope decision in this repo, read:

- `docs/context/business-overview.md` — who SenecAI is, the SenecAI 2.0 rebrand (AI Act Guy → European Digital Compliance Platform), what's actually decided vs. still open, team, positioning, phasing.
- `docs/context/ai-act-platform-concept.md` — the concept note for the AI Act compliance module (the first module being built): MVP scope, module breakdown (Inventory & Risk Classification → Compliance Plan → Tracking → Regulatory Watch, with Modules 5–6 as v2.0 bonus), and the architecture principles (decision trees/obligation mappings as configurable data, not hardcoded logic; documents always human-reviewed before delivery to clients).

These two files are the authoritative product/business context for this repository. Do not assume product scope, sequencing, or positioning beyond what they state — ask the user when something isn't covered by them.

## What this repo is

The SenecAI Governance Hub: a real compliance/governance product (AI inventory, obligations, risk register, documentation, evidence, controls) for AI Act, GDPR, DORA, NIS2, CRA. It is a sister project to `senecai-website` (marketing site) but is being built independently — do not assume the website's stack, design, or scope applies here unless told so.
