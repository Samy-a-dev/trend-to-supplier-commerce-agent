import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { insertJSON, sourcePayloadRow } from "@/lib/adapters/clickhouse";
import { geminiModels, generateImages, generateJSON } from "@/lib/adapters/gemini";
import { VariantSchema, type PipelineState } from "@/lib/types";

export class VariantStep extends PipelineStep {
  constructor() {
    super("variant", "Synthesizes a differentiated product variant and generates concept images.", false);
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.opportunity) throw new Error("Missing opportunity.");
    const variantDraft = await generateJSON({
      model: geminiModels.reasoning(),
      schema: VariantSchema.omit({ imagePaths: true }).extend({
        imagePaths: VariantSchema.shape.imagePaths.optional()
      }),
      thinkingLevel: "high",
      prompt: [
        `Opportunity: ${JSON.stringify(state.opportunity)}`,
        `Scores: ${JSON.stringify(state.scores ?? null)}`,
        "Design a differentiated private-label product variant that directly addresses the strongest pain points and competitor gaps.",
        "Include image prompts for hero product mockup, packaging, colorway, and lifestyle shots.",
        "Return only JSON."
      ].join("\n")
    });

    const prompts = variantDraft.imagePrompts.slice(0, 4);
    const proPrompts = prompts.slice(0, 2);
    const fastPrompts = prompts.slice(2);
    const imagePaths = [
      ...(proPrompts.length
        ? await generateImages({
            model: geminiModels.imagePro(),
            prompts: proPrompts,
            runId: state.runId,
            baseName: state.opportunity.productName,
            imageSize: "2K"
          })
        : []),
      ...(fastPrompts.length
        ? await generateImages({
            model: geminiModels.imageFast(),
            prompts: fastPrompts,
            runId: state.runId,
            baseName: `${state.opportunity.productName}-fast`,
            imageSize: "2K"
          })
        : [])
    ];

    const variant = VariantSchema.parse({ ...variantDraft, imagePaths });

    await insertJSON("product_opportunities", [
      sourcePayloadRow({
        runId: state.runId,
        source: "gemini_variant",
        productName: state.opportunity.productName,
        payload: variant,
        extra: {
          trend_strength: state.scores?.scores.trendStrength ?? 0,
          demand_quality: state.scores?.scores.demandQuality ?? 0,
          pain_intensity: state.scores?.scores.painIntensity ?? 0,
          saturation: state.scores?.scores.saturation ?? 0,
          differentiation: state.scores?.scores.differentiation ?? 0,
          supplier_fit: state.scores?.scores.supplierFit ?? 0,
          margin: state.scores?.scores.margin ?? 0,
          risk: state.scores?.scores.risk ?? 0
        }
      })
    ]);

    return {
      stateDelta: { variant },
      message: `Generated ${imagePaths.length} concept image(s) for ${variant.productName}`,
      data: {
        productName: variant.productName,
        imagePaths,
        differentiators: variant.differentiators
      }
    };
  }
}
