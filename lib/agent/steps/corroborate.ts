import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { insertJSON, sourcePayloadRow } from "@/lib/adapters/clickhouse";
import { corroborateDemand } from "@/lib/adapters/tavily";
import type { PipelineState } from "@/lib/types";

export class CorroborateStep extends PipelineStep {
  constructor() {
    super("corroborate", "Uses Tavily to validate demand and trend context from open web sources.");
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.opportunity) throw new Error("Missing opportunity.");
    const queries = [
      `${state.opportunity.productName} trend demand ${state.region}`,
      `${state.opportunity.productName} customer complaints reviews`,
      ...(state.discoveryPlan?.validationQueries ?? [])
    ];
    const evidence = await corroborateDemand(queries);

    await insertJSON(
      "trend_observations",
      evidence.flatMap((entry) =>
        entry.results.map((result) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "tavily",
            url: result.url,
            title: result.title ?? "",
            productName: state.opportunity?.productName,
            payload: { query: entry.query, result },
            extra: { score: result.score ?? 0 }
          })
        )
      )
    );

    return {
      stateDelta: { evidence },
      message: `Corroborated demand with ${evidence.reduce((sum, item) => sum + item.results.length, 0)} web results`,
      data: {
        queries: evidence.map((item) => item.query),
        resultCount: evidence.reduce((sum, item) => sum + item.results.length, 0)
      }
    };
  }
}
