# Checklist: Is My AI System "High-Risk"?

Sursă: `docs/context/sources/ai-act-high-risk-classification-checklist.docx`. Transcris ca referință umană; logica structurată/executabilă e în `config/decision-trees/high-risk-classification.json`.

Diagnostic to determine if a system must comply with Articles 8–15 (high-risk obligations). Run per AI system (Modulul 1.1 entry).

## Step 0 — Explicit Exclusions (scope check)
Tick if any apply:
- Military & Defense (exclusively military/defense/national security)
- Pure Research (sole purpose is scientific R&D, not market use)
- Personal Use (natural person, purely personal/non-professional)
- Open Source R&D (pre-market research/development, not tested in "real-world conditions")
- International Cooperation (non-EU public authority under international law-enforcement agreements)

→ Any ticked: **OUT OF SCOPE**, no AI Act obligations apply. → None ticked: Step 1.

## Step 1 — Annex I "Product Safety" Filter
Does the system serve as a safety component (or is it the product itself) for: Medical Devices, Toys/Personal Transport, Machinery & Industrial Tools, Lifts/Pressure Equipment/Gaseous Fuel Appliances, Marine/Aviation/Rail Equipment, Motor Vehicles (ADAS/autonomous driving)?

→ Any ticked: likely **HIGH-RISK**. → None ticked: Step 2.

## Step 2 — Annex III "Sensitive Use Case" Filter
High-impact domains, even if not a "machine":

1. **Biometrics & Emotion (non-prohibited):** remote biometric ID, biometric categorization (sensitive traits), emotion recognition (workplace/school)
2. **Critical Infrastructure:** safety components for road traffic / water / gas / heating / electricity; cybersecurity for essential utility networks
3. **Education & Vocational Training:** admissions, exam grading/learning-outcome assessment, behavior/cheating monitoring during assessments
4. **Employment & HR:** recruitment (CV sorting, candidate ranking, targeted job ads), worker management (promotion/termination/task allocation decisions)
5. **Essential Private & Public Services:** social benefits eligibility, finance (creditworthiness, loan approval, insurance pricing), emergency triage (112/999, dispatch)
6. **Law Enforcement:** re-offending/victim risk assessment, evidence/polygraph reliability evaluation, criminal-risk profiling
7. **Migration, Asylum & Border Control:** travel document verification/fraud detection, visa/asylum application assessment, border monitoring
8. **Administration of Justice & Democratic Processes:** judicial research/interpretation assistance, election-outcome/voter-behavior influencing systems

→ Any ticked: likely **HIGH-RISK**. → None ticked: likely not high-risk, continue to Step 3.

## Step 3 — Practical Rights Test
Even if not listed in Annex III, the Act follows a fundamental-rights principle. Does the system:
- Influence access to employment (significantly impacts who gets seen/hired)
- Influence access to finance (loans, credit, insurance)
- Influence access to healthcare (prioritizes/denies treatment/insurance)
- Influence access to education (admission/career-defining grades)
- Influence access to essential public services (social security, housing)
- Contribute to legal/administrative decisions (directly informs a judge/official's ruling)

**Practical rule:** if the AI affects someone's rights, opportunities, or economic wellbeing → treat as HIGH-RISK.

## Step 4 — Article 6(3) "Escape Hatch"
If Step 2 or 3 triggered, may still be exempt if purely "ancillary":
- Narrow Procedural Task (tiny administrative sub-step, e.g. formatting text)
- Improving Human Activity (only improves the result of a prior human decision)
- Preparatory Task (only organizes data / flags patterns for later human assessment)
- Pattern Detection (identifies deviations but doesn't influence the final decision)

⚠️ **Cannot use this exemption if the system performs Profiling** (automated assessment of personal traits/behavior) — profiling is High-Risk regardless of Step 3.

→ Any ticked (and not profiling): exempt from high-risk classification.

## Final Result
- **HIGH-RISK:** implement all high-risk obligations Art. 8–15 + Conformity Assessment, issue EU Declaration of Conformity, register in the EU database.
- **NOT HIGH-RISK:** comply with transparency and basic governance rules only.

## Disclaimer (source)
High-level overview only; nuances, thresholds and edge cases (downstream providers, GPAI APIs, hybrid roles) may materially affect classification — a tailored analysis is recommended. The platform marks this output as **preliminary, pending consultant review**.

Note: the source docx does not classify "prohibited" (Art. 5) practices — only high-risk vs. not-high-risk. The concept note's four-tier outcome (interzis / high-risk / limitat / minim) needs a prohibited-practices check upstream of this tree; that content hasn't been provided yet, so the JSON config only encodes high-risk/not-high-risk and leaves "prohibited" and the limited/minimal split as a TODO pending further source material.
