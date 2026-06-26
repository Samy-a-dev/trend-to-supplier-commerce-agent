import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { geminiModels, generateJSON } from "@/lib/adapters/gemini";
import { DiscoveryPlanSchema, type PipelineState } from "@/lib/types";

export class DiscoverStep extends PipelineStep {
  constructor() {
    super("discover", "Builds a live discovery plan from the requested vertical.");
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    const plan = await generateJSON({
      model: geminiModels.reasoning(),
      schema: DiscoveryPlanSchema,
      thinkingLevel: "high",
      prompt: [
        `Vertical: ${state.vertical}`,
        `Region: ${state.region}`,
        "Produce a focused discovery plan for finding rising product opportunities.",
        "Use capped, specific TikTok hashtags, Amazon search queries, subreddit/search terms, and validation web queries.",
        "Return only JSON."
      ].join("\n")
    });

    return {
      stateDelta: { discoveryPlan: plan },
      message: `Discovery plan created with ${plan.amazonQueries.length} marketplace queries`,
      data: {
        hashtags: plan.tiktokHashtags,
        amazonQueries: plan.amazonQueries,
        validationQueries: plan.validationQueries
      }
    };
  }
}
