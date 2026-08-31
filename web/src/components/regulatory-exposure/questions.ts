// questions.ts
// Streamlined regulatory-exposure intake — 20 questions across six plain-
// language themes. Deliberately does NOT label any section or question by
// regulation name (no "AI Act", "GDPR", "NIS2", "DORA", "CRA" in the live
// copy, and no article/annex citations in prompts or help text): a
// respondent who can see which regulation a question maps to can steer
// their answer toward a preferred outcome. That mapping exists only in
// `scoringTags` (never rendered) and in scoring.ts, and only surfaces to the
// user on the results screen once every answer is already locked in.
//
// NOTE ON CURRENCY: thresholds referenced in scoring.ts (NIS2 size bands,
// DORA entity categories, CRA product classes, AI Act phase-in dates)
// reflect EU law as of August 2026, including the AI Act "Digital Omnibus"
// deferral of the Annex III high-risk deadline to 2 December 2027. These
// shift with delegated acts — review scoring.ts periodically against the
// official texts rather than treating this as a static legal reference.

import { Answers, Section } from "./types";

export const sections: Section[] = [
  // ---------------------------------------------------------------------
  // A. About your organization — 6 questions
  // ---------------------------------------------------------------------
  {
    id: "org",
    title: "About your organization",
    description: "A few basics that shape which thresholds apply later in this assessment.",
    questions: [
      {
        id: "org.employees",
        type: "single",
        prompt: "How many employees does the organization have?",
        scoringTags: ["nis2", "dora", "gdpr"],
        options: [
          { value: "lt10", label: "Fewer than 10" },
          { value: "10-49", label: "10–49" },
          { value: "50-249", label: "50–249" },
          { value: "250+", label: "250 or more" },
        ],
      },
      {
        id: "org.turnover",
        type: "single",
        prompt: "What is the organization's annual turnover (or balance sheet total, if higher)?",
        scoringTags: ["nis2", "dora"],
        options: [
          { value: "lt2m", label: "Under €2M" },
          { value: "2-10m", label: "€2M – €10M" },
          { value: "10-50m", label: "€10M – €50M" },
          { value: "50m+", label: "Over €50M" },
        ],
      },
      {
        id: "org.partOfGroup",
        type: "boolean",
        prompt: "Is the organization part of a larger corporate group?",
        helpText: "Some size-based thresholds later are assessed at group level rather than for the standalone entity.",
        scoringTags: ["nis2", "dora"],
        optional: true,
      },
      {
        id: "org.sector",
        type: "single",
        prompt: "Which best describes the organization's primary sector?",
        scoringTags: ["nis2", "dora", "cra"],
        options: [
          {
            value: "annexI",
            label: "Energy, transport, banking, financial infrastructure, health, water, digital infrastructure, IT service management, public administration, or space",
          },
          {
            value: "annexII",
            label: "Postal/courier, waste management, chemicals, food production/distribution, manufacturing, digital platforms (marketplaces, search, social media), or research",
          },
          { value: "financial", label: "Banking, insurance, investment, payments, or another regulated financial-services activity" },
          { value: "other", label: "None of the above / general commercial or professional services" },
        ],
      },
      {
        id: "org.euNexus",
        type: "multi",
        prompt: "Which of these applies to the organization's relationship with the EU?",
        scoringTags: ["gdpr", "nis2", "dora", "cra", "aiAct"],
        options: [
          { value: "established", label: "Established in the EU (registered entity, branch, or subsidiary)" },
          { value: "offersToEU", label: "Not established in the EU, but offers goods or services to people in the EU" },
          { value: "monitorsEU", label: "Not established in the EU, but monitors the behaviour of people in the EU" },
          { value: "none", label: "None of the above" },
        ],
      },
      {
        id: "org.publicSector",
        type: "boolean",
        prompt: "Is the organization a public administration body at national or regional level?",
        scoringTags: ["nis2", "aiAct", "gdpr"],
      },
    ],
  },

  // ---------------------------------------------------------------------
  // B. Data you handle — 3 questions
  // ---------------------------------------------------------------------
  {
    id: "data",
    title: "Data you handle",
    questions: [
      {
        id: "data.processesPersonalData",
        type: "boolean",
        prompt: "Does the organization process personal data about identifiable individuals — employees, customers, users, or others?",
        scoringTags: ["gdpr"],
      },
      {
        id: "data.role",
        type: "single",
        prompt: "In most of these activities, is the organization deciding why and how the data is processed, or processing it on someone else's behalf?",
        scoringTags: ["gdpr"],
        showIf: (a) => a["data.processesPersonalData"] === true,
        options: [
          { value: "controller", label: "We decide the purpose and means" },
          { value: "processor", label: "We process on behalf of a client, following their instructions" },
          { value: "both", label: "Both, depending on the activity" },
        ],
      },
      {
        id: "data.flags",
        type: "multi",
        prompt: "Do any of these describe how the organization handles that data?",
        scoringTags: ["gdpr"],
        showIf: (a) => a["data.processesPersonalData"] === true,
        options: [
          { value: "specialCategory", label: "Includes health, biometric, genetic, religious, political, or similarly sensitive data" },
          { value: "largeScaleMonitoring", label: "Involves systematic monitoring at scale — profiling, tracking, behavioural analytics" },
          { value: "crossBorderTransfers", label: "Gets transferred outside the EU/EEA" },
          { value: "none", label: "None of the above" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------
  // C. AI & automated systems — 6 questions
  // ---------------------------------------------------------------------
  {
    id: "ai",
    title: "AI and automated systems",
    questions: [
      {
        id: "ai.role",
        type: "multi",
        prompt: "Which describes the organization's relationship to AI systems?",
        scoringTags: ["aiAct"],
        options: [
          { value: "provider", label: "We build or substantially modify AI systems or models" },
          { value: "deployer", label: "We use AI systems built by others in our own operations" },
          { value: "none", label: "We neither build nor use AI systems" },
        ],
      },
      {
        id: "ai.gpaiStatus",
        type: "single",
        prompt: "Do you develop a general-purpose foundation model — one trained on broad data and capable of a wide range of downstream tasks (e.g., a large language model)? If so, roughly what scale?",
        helpText: "A rough sense is enough here — this isn't asking for an exact figure.",
        scoringTags: ["aiAct"],
        showIf: (a) => asArray(a["ai.role"]).includes("provider"),
        options: [
          { value: "no", label: "No, we don't develop a model like this" },
          { value: "modest", label: "Yes — a smaller or narrower-scale model" },
          { value: "frontier", label: "Yes — a large-scale model trained with very significant computing resources" },
          { value: "unsureScale", label: "Yes — not sure of the scale" },
        ],
      },
      {
        id: "ai.useCases",
        type: "multi",
        prompt: "Do any AI systems you build or use touch on these areas?",
        scoringTags: ["aiAct"],
        showIf: (a) => asArray(a["ai.role"]).some((v) => v === "provider" || v === "deployer"),
        options: [
          { value: "biometrics", label: "Biometric identification or categorisation of people" },
          { value: "criticalInfra", label: "Managing or operating critical infrastructure (energy, water, transport, digital infra)" },
          { value: "education", label: "Education or vocational training (admissions, assessment, monitoring of students)" },
          { value: "employment", label: "Employment decisions (recruitment, task allocation, performance or termination)" },
          { value: "essentialServices", label: "Access to essential services (credit scoring, insurance pricing, public benefits)" },
          { value: "lawEnforcement", label: "Law enforcement" },
          { value: "migration", label: "Migration, asylum, or border control" },
          { value: "justice", label: "Administration of justice or democratic processes" },
          { value: "none", label: "None of the above" },
        ],
      },
      {
        id: "ai.redFlags",
        type: "multi",
        prompt: "Do any of these describe how the AI system behaves?",
        scoringTags: ["aiAct"],
        showIf: (a) => asArray(a["ai.role"]).some((v) => v === "provider" || v === "deployer"),
        options: [
          { value: "subliminal", label: "Uses subliminal or manipulative techniques capable of distorting behaviour and causing harm" },
          { value: "exploitsVulnerability", label: "Exploits vulnerabilities related to age, disability, or socio-economic situation" },
          { value: "socialScoring", label: "Scores or ranks individuals based on social behaviour or predicted traits" },
          { value: "emotionWorkplace", label: "Infers emotions in the workplace or in education settings" },
          { value: "biometricInference", label: "Uses biometric data to infer race, political views, religion, or sexual orientation" },
          { value: "realtimeBiometric", label: "Performs real-time remote biometric identification in public spaces for law enforcement" },
          { value: "none", label: "None of the above" },
        ],
      },
      {
        id: "ai.publicFacingContent",
        type: "boolean",
        prompt: "Does the system interact directly with people (e.g., a chatbot), or generate/manipulate synthetic audio, image, video or text content?",
        scoringTags: ["aiAct"],
        showIf: (a) => asArray(a["ai.role"]).some((v) => v === "provider" || v === "deployer"),
      },
      {
        id: "ai.embeddedInProduct",
        type: "boolean",
        prompt: "Is the AI a safety component embedded in a regulated product — machinery, a medical device, a toy, a lift, a vehicle, etc.?",
        scoringTags: ["aiAct"],
        showIf: (a) => asArray(a["ai.role"]).some((v) => v === "provider" || v === "deployer"),
      },
    ],
  },

  // ---------------------------------------------------------------------
  // D. Products and software you provide — 2 questions
  // ---------------------------------------------------------------------
  {
    id: "product",
    title: "Products and software you provide",
    questions: [
      {
        id: "product.placesOnEUMarket",
        type: "boolean",
        prompt: "Does the organization manufacture, publish, or sell a hardware or software product that connects — directly or indirectly — to a device or network, and make it available on the EU market?",
        scoringTags: ["cra"],
      },
      {
        id: "product.profile",
        type: "single",
        prompt: "Which best describes that product?",
        scoringTags: ["cra"],
        showIf: (a) => a["product.placesOnEUMarket"] === true,
        options: [
          { value: "sectorRegulated", label: "Already regulated under a sector-specific regime (medical devices, motor vehicles, civil aviation)" },
          { value: "pureSaaS", label: "Pure SaaS/cloud service, with no downloadable component and no connected hardware" },
          { value: "default", label: "A standard connected product — not listed below" },
          {
            value: "importantClass",
            label: "Performs a sensitive function (e.g., operating system, VPN, identity/access management, browser, password manager, network firewall, enterprise router/switch)",
          },
          {
            value: "criticalClass",
            label: "Performs a highly sensitive function (e.g., hypervisor, industrial firewall/intrusion detection, hardware security module, smart meter gateway, secure element)",
          },
          { value: "unsure", label: "Not sure" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------
  // E. Critical services and operations — 1 question
  // ---------------------------------------------------------------------
  {
    id: "ops",
    title: "Critical services and operations",
    questions: [
      {
        id: "ops.criticalRegardlessOfSize",
        type: "boolean",
        prompt: "Regardless of size, are you a sole provider of a critical service in a given country, or one of: a domain name provider, a top-level-domain registry, a qualified trust/certificate service provider, or a public electronic communications network/service provider?",
        scoringTags: ["nis2"],
      },
    ],
  },

  // ---------------------------------------------------------------------
  // F. Financial activity — 2 questions
  // ---------------------------------------------------------------------
  {
    id: "financial",
    title: "Financial activity",
    questions: [
      {
        id: "fin.isFinancialEntity",
        type: "multi",
        prompt: "Does the organization fall into any of these categories?",
        scoringTags: ["dora"],
        options: [
          { value: "credit", label: "Credit institution / bank" },
          { value: "payment", label: "Payment institution or e-money institution" },
          { value: "investment", label: "Investment firm, trading venue, CSD, or CCP" },
          { value: "insurance", label: "Insurance or reinsurance undertaking, or intermediary" },
          { value: "fundManager", label: "Fund manager (UCITS/AIFM) or institution for occupational retirement provision" },
          { value: "crypto", label: "Crypto-asset service provider or issuer" },
          { value: "cra_agency", label: "Credit rating agency or other regulated market infrastructure" },
          { value: "otherFinancial", label: "Another regulated financial entity not listed above" },
          { value: "none", label: "None of the above" },
        ],
      },
      {
        id: "fin.ictProviderScale",
        type: "single",
        prompt: "Do you provide ICT services — cloud, software, data analytics, network infrastructure, or similar — to financial-sector clients in the EU? If so, how many rely on it?",
        scoringTags: ["dora"],
        options: [
          { value: "no", label: "No" },
          { value: "fewClients", label: "Yes — a small number of clients" },
          { value: "manyClients", label: "Yes — many EU financial institutions depend on it" },
          { value: "unsureScale", label: "Yes — not sure how many" },
        ],
      },
    ],
  },
];

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  return [];
}

export function getAllQuestions() {
  return sections.flatMap((s) => s.questions);
}

export function isQuestionVisible(q: Section["questions"][number], answers: Answers): boolean {
  return q.showIf ? q.showIf(answers) : true;
}
