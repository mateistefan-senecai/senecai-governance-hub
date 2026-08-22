# AI Act Role Classification Checklist

Sursă: `docs/context/sources/ai-act-role-classification-checklist.docx`. Transcris ca referință umană; logica structurată/executabilă e în `config/decision-trees/role-classification.json`.

Are you a Provider, Deployer, or Both? Diagnostic tool for primary classification under the EU AI Act. An org may hold different roles for different AI tools — this tree is meant to be run per AI system (Modulul 1.1 entry), not once per organization.

## Step 1 — Internal Usage (The Deployer Test)
**Do you use an AI system in a professional capacity to perform a task?**
(e.g. third-party tool for HR screening, summarizing documents with an LLM, AI-driven fraud detection.)
- Yes → **DEPLOYER**
- No → Step 2

## Step 2 — Original Creation (The Provider Test)
**Do you develop an AI system and either sell it or use it for the first time under your own brand?**
(Developing = designing the logic, training the model, building the software architecture.)
- Yes → **PROVIDER** (Art. 3(2)) — note: if the model is "General Purpose" (foundation model), additional GPAI Provider obligations may apply.
- No → Step 3

## Step 3 — White-Labeling & Branding
**Do you put your own name, logo, or trademark on an existing AI system developed by someone else?**
(Even without writing the code, if the customer sees your brand, you're deemed the Provider by law.)
- Yes → **PROVIDER** (Art. 25(1)(a))
- No → Step 4

## Step 4 — Repurposing (Intended Purpose)
**Do you change the "Intended Purpose" of a high-risk AI system?**
(e.g. taking a general text-summarization AI and marketing/using it for calculating credit scores.)
- Yes → **PROVIDER** (Art. 25(1)(c))
- No → Step 5

## Step 5 — Substantial Modification
**Do you make a "Substantial Modification" to an existing AI system?**
(A change affecting compliance or risk profile — e.g. retraining with a massive new dataset that changes core outputs.)
- Yes → **PROVIDER** (Art. 25(1)(b)) — note: the original provider is usually no longer responsible for the modified version.
- No → Step 6

## Step 6 — Third-Party Integration
**Do you integrate an AI model into a larger software product you sell?**
(e.g. a CRM embedding a third-party API for predictive sales analytics.)
- Yes → **PROVIDER of the system** (even if not provider of the underlying model)
- No → Step 7

## Step 7 — As-Is Usage
**Do you use the AI system as-is, strictly according to the provider's instructions?**
(No change to intended purpose, no substantial modification, no rebranding/resale, internal/operational use only.)
- Yes → **DEPLOYER**
- No → Review previous steps — may still qualify as PROVIDER or BOTH

## Step 8 — Dual Role
**Are you both selling and using the AI system?** (checked boxes under both Provider and Deployer)
- Yes → **BOTH** (dual obligations apply)

## Result Summary
- Any Provider box checked → provider obligations (Arts. 9–15: risk management, technical documentation, and where applicable conformity assessment).
- Only Deployer boxes checked → deployer obligations (human oversight, transparency, monitoring, and FRIA where required).

## Disclaimer (source)
High-level overview only. The AI Act contains nuances, thresholds, and edge cases (downstream providers, GPAI APIs, hybrid roles) that may materially affect classification — a tailored analysis is recommended. This is exactly why the platform marks this output as **preliminary, pending consultant review**, per the architecture principle in the concept note.
