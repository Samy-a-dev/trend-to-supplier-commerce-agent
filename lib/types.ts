import { z } from "zod";

export const pipelineSteps = [
  "discover",
  "ingest",
  "extract",
  "corroborate",
  "score",
  "variant",
  "suppliers",
  "draft",
  "report"
] as const;

export type PipelineStepName = (typeof pipelineSteps)[number];

export const stepLabels: Record<PipelineStepName, string> = {
  discover: "Discover",
  ingest: "Ingest",
  extract: "Extract",
  corroborate: "Corroborate",
  score: "Score",
  variant: "Variant",
  suppliers: "Suppliers",
  draft: "Draft RFQ",
  report: "Report"
};

export const RunRequestSchema = z.object({
  runId: z.uuid().optional(),
  vertical: z.string().min(2),
  region: z.string().min(2).default("United States")
});

export type RunRequest = z.infer<typeof RunRequestSchema>;

export const DiscoveryPlanSchema = z.object({
  vertical: z.string(),
  tiktokHashtags: z.array(z.string()).min(1).max(12),
  amazonQueries: z.array(z.string()).min(1).max(12),
  subreddits: z.array(z.string()).min(1).max(12),
  validationQueries: z.array(z.string()).min(1).max(12)
});

export type DiscoveryPlan = z.infer<typeof DiscoveryPlanSchema>;

export const ProductMentionSchema = z.object({
  name: z.string(),
  normalizedName: z.string(),
  evidenceCount: z.number(),
  platforms: z.array(z.string()),
  growthScore: z.number().min(0).max(1),
  averagePriceCents: z.number().int().nonnegative().optional()
});

export const ReviewThemeSchema = z.object({
  theme: z.string(),
  severity: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative(),
  quotes: z.array(z.string()).max(5)
});

export const CompetitorProductSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  weaknesses: z.array(z.string())
});

export const OpportunitySchema = z.object({
  productName: z.string(),
  normalizedName: z.string(),
  rationale: z.string(),
  targetCustomer: z.string(),
  estimatedPriceCents: z.number().int().nonnegative(),
  productMentions: z.array(ProductMentionSchema),
  reviewThemes: z.array(ReviewThemeSchema),
  competitors: z.array(CompetitorProductSchema)
});

export type Opportunity = z.infer<typeof OpportunitySchema>;

export const EvidenceSchema = z.object({
  query: z.string(),
  answer: z.string().optional(),
  results: z.array(
    z.object({
      title: z.string().optional(),
      url: z.string(),
      publishedDate: z.string().optional(),
      score: z.number().optional(),
      content: z.string().optional()
    })
  )
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const ScoreResultSchema = z.object({
  predicates: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  scores: z.object({
    trendStrength: z.number().min(0).max(1),
    demandQuality: z.number().min(0).max(1),
    painIntensity: z.number().min(0).max(1),
    saturation: z.number().min(0).max(1),
    differentiation: z.number().min(0).max(1),
    supplierFit: z.number().min(0).max(1),
    margin: z.number().min(0).max(1),
    risk: z.number().min(0).max(1)
  }),
  raw: z.unknown().optional()
});

export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export const VariantSchema = z.object({
  productName: z.string(),
  positioning: z.string(),
  differentiators: z.array(z.string()).min(1),
  materials: z.array(z.string()),
  dimensions: z.string().optional(),
  colorways: z.array(z.string()),
  packagingNotes: z.string(),
  imagePrompts: z.array(z.string()).min(1).max(6),
  imagePaths: z.array(z.string()).default([])
});

export type Variant = z.infer<typeof VariantSchema>;

export const SupplierSchema = z.object({
  name: z.string(),
  url: z.string(),
  country: z.string().optional(),
  capabilities: z.array(z.string()),
  contact: z.string().optional(),
  moq: z.string().optional(),
  leadTime: z.string().optional(),
  fitScore: z.number().min(0).max(1)
});

export type Supplier = z.infer<typeof SupplierSchema>;

export const RfqEmailSchema = z.object({
  emailId: z.string().optional(),
  supplierName: z.string(),
  supplierUrl: z.string().optional(),
  to: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  status: z.enum(["draft", "drafted_in_gmail"]).default("draft")
});

export type RfqEmail = z.infer<typeof RfqEmailSchema>;

export const ReportSchema = z.object({
  summary: z.string(),
  opportunity: OpportunitySchema,
  evidence: z.array(EvidenceSchema).default([]),
  scores: ScoreResultSchema.optional(),
  variant: VariantSchema.optional(),
  suppliers: z.array(SupplierSchema),
  emails: z.array(RfqEmailSchema),
  risks: z.array(z.string()),
  nextStep: z.string()
});

export type SourcingReport = z.infer<typeof ReportSchema>;

export type RawSignals = {
  tiktok: unknown[];
  amazonListings: unknown[];
  reddit: unknown[];
  amazonReviews: unknown[];
  warnings: string[];
};

export type PipelineState = {
  runId: string;
  vertical: string;
  region: string;
  discoveryPlan?: DiscoveryPlan;
  rawSignals?: RawSignals;
  opportunity?: Opportunity;
  evidence?: Evidence[];
  scores?: ScoreResult;
  variant?: Variant;
  suppliers?: Supplier[];
  emails?: RfqEmail[];
  report?: SourcingReport;
};

export type RunEventRow = {
  run_id: string;
  step: string;
  kind: "progress" | "state" | "warning" | "error" | "complete";
  message: string;
  data?: unknown;
};

export type AgentRunRow = {
  run_id: string;
  vertical: string;
  region: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string | null;
  summary?: string;
  payload?: string;
};
