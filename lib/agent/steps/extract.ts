import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { insertJSON, sourcePayloadRow } from "@/lib/adapters/clickhouse";
import { geminiModels, generateJSON } from "@/lib/adapters/gemini";
import { OpportunitySchema, type PipelineState } from "@/lib/types";

export class ExtractStep extends PipelineStep {
  constructor() {
    super("extract", "Extracts product mentions, pain points, competitors, and the top opportunity.");
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.rawSignals) throw new Error("Missing raw signals.");
    const opportunity = await generateJSON({
      model: geminiModels.extraction(),
      schema: OpportunitySchema,
      prompt: [
        `Vertical: ${state.vertical}`,
        "From the live scraped data below, identify the single best product opportunity.",
        "Extract recurring pain points, competitor weaknesses, prices, review themes, and platform evidence.",
        "Do not invent sources; use only the supplied data.",
        JSON.stringify(state.rawSignals).slice(0, 90000)
      ].join("\n")
    });

    await Promise.all([
      insertJSON(
        "review_insights",
        opportunity.reviewThemes.map((theme) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "gemini",
            productName: opportunity.productName,
            payload: theme,
            extra: {
              theme: theme.theme,
              severity: theme.severity,
              evidence_count: theme.evidenceCount
            }
          })
        )
      ),
      insertJSON(
        "customer_pain_points",
        opportunity.reviewThemes.map((theme) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "gemini",
            productName: opportunity.productName,
            payload: theme,
            extra: {
              pain: theme.theme,
              severity: theme.severity
            }
          })
        )
      ),
      insertJSON(
        "competitor_products",
        opportunity.competitors.map((competitor) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "gemini",
            url: competitor.url,
            productName: opportunity.productName,
            payload: competitor,
            extra: {
              competitor_name: competitor.name,
              price_cents: competitor.priceCents ?? 0,
              rating: competitor.rating ?? 0,
              review_count: competitor.reviewCount ?? 0
            }
          })
        )
      )
    ]);

    return {
      stateDelta: { opportunity },
      message: `Selected ${opportunity.productName} as the top opportunity`,
      data: {
        productName: opportunity.productName,
        pains: opportunity.reviewThemes.map((theme) => theme.theme),
        competitors: opportunity.competitors.length
      }
    };
  }
}
