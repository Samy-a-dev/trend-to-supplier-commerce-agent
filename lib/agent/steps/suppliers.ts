import type { InvocationContext } from "@google/adk";
import { z } from "zod";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { insertJSON, sourcePayloadRow } from "@/lib/adapters/clickhouse";
import { geminiModels, generateJSON } from "@/lib/adapters/gemini";
import { discoverSuppliers, supplierExtractionPrompt } from "@/lib/adapters/tavily";
import { SupplierSchema, type PipelineState } from "@/lib/types";

const SupplierListSchema = z.object({
  suppliers: z.array(SupplierSchema).max(8)
});

export class SuppliersStep extends PipelineStep {
  constructor() {
    super("suppliers", "Discovers and extracts supplier candidates from domain-biased Tavily results.", false);
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.opportunity) throw new Error("Missing opportunity.");
    const raw = await discoverSuppliers(state.opportunity.productName);
    const { suppliers } = await generateJSON({
      model: geminiModels.extraction(),
      schema: SupplierListSchema,
      prompt: supplierExtractionPrompt({
        productName: state.opportunity.productName,
        raw
      })
    });

    await insertJSON(
      "supplier_candidates",
      suppliers.map((supplier) =>
        sourcePayloadRow({
          runId: state.runId,
          source: "tavily",
          url: supplier.url,
          payload: supplier,
          extra: {
            supplier_name: supplier.name,
            country: supplier.country ?? "",
            fit_score: supplier.fitScore
          }
        })
      )
    );

    return {
      stateDelta: { suppliers },
      message: `Shortlisted ${suppliers.length} supplier candidate(s)`,
      data: suppliers.map((supplier) => ({
        name: supplier.name,
        fitScore: supplier.fitScore,
        url: supplier.url
      }))
    };
  }
}
