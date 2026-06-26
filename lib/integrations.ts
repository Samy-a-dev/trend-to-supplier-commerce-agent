import "./env";

export type IntegrationName =
  | "Apify"
  | "Tavily"
  | "ClickHouse"
  | "Gemini"
  | "Prometheux"
  | "Gmail";

export type IntegrationRequirement = {
  name: IntegrationName;
  purpose: string;
  env: string[];
  optionalEnv?: string[];
};

export const integrationRequirements: IntegrationRequirement[] = [
  {
    name: "Apify",
    purpose: "TikTok, Amazon, Reddit, and review scraping",
    env: ["APIFY_TOKEN"]
  },
  {
    name: "Tavily",
    purpose: "Open-web corroboration and supplier discovery",
    env: ["TAVILY_API_KEY"]
  },
  {
    name: "ClickHouse",
    purpose: "Run history, evidence, events, opportunities, suppliers, and RFQs",
    env: ["CLICKHOUSE_URL", "CLICKHOUSE_USER", "CLICKHOUSE_PASSWORD"]
  },
  {
    name: "Gemini",
    purpose: "Structured extraction, synthesis, RFQ drafting, and image generation",
    env: ["GEMINI_API_KEY"],
    optionalEnv: [
      "GEMINI_MODEL_REASONING",
      "GEMINI_MODEL_EXTRACTION",
      "GEMINI_MODEL_LITE",
      "GEMINI_MODEL_IMAGE_PRO",
      "GEMINI_MODEL_IMAGE_FAST"
    ]
  },
  {
    name: "Prometheux",
    purpose: "Vadalog derivation through the local sidecar",
    env: ["PMTX_TOKEN", "PMTX_ORG", "PMTX_USER"],
    optionalEnv: ["JARVISPY_URL", "PMTX_COMPUTE", "SIDECAR_URL"]
  },
  {
    name: "Gmail",
    purpose: "Operator-approved Gmail draft creation",
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
    optionalEnv: ["SMOKE_GMAIL_TO", "SMOKE_EMAIL_TO"]
  }
];

export function getIntegrationReadiness(env: NodeJS.ProcessEnv = process.env) {
  return integrationRequirements.map((integration) => {
    const missing = integration.env.filter((key) => !env[key]);
    const optionalMissing = (integration.optionalEnv ?? []).filter((key) => !env[key]);
    return {
      ...integration,
      ready: missing.length === 0,
      missing,
      optionalMissing
    };
  });
}

export function getMissingRequiredEnv(env: NodeJS.ProcessEnv = process.env) {
  return getIntegrationReadiness(env).flatMap((integration) => integration.missing);
}
