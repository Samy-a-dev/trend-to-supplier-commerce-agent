import type { InvocationContext } from "@google/adk";
import { z } from "zod";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { insertOutreachEmails } from "@/lib/adapters/clickhouse";
import { geminiModels, generateJSON } from "@/lib/adapters/gemini";
import { RfqEmailSchema, type PipelineState } from "@/lib/types";

const RfqListSchema = z.object({
  emails: z.array(RfqEmailSchema).max(8)
});

export class DraftStep extends PipelineStep {
  constructor() {
    super("draft", "Drafts supplier-specific RFQ emails without sending them.");
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.opportunity) throw new Error("Missing opportunity.");
    const suppliers = state.suppliers ?? [];
    if (suppliers.length === 0) {
      return {
        stateDelta: { emails: [] },
        message: "No supplier candidates available for RFQ drafting",
        data: []
      };
    }

    const { emails: draftEmails } = await generateJSON({
      model: geminiModels.reasoning(),
      schema: RfqListSchema,
      thinkingLevel: "medium",
      prompt: [
        `Product opportunity: ${JSON.stringify(state.opportunity)}`,
        `Variant spec: ${JSON.stringify(state.variant ?? null)}`,
        `Suppliers: ${JSON.stringify(suppliers)}`,
        "Draft concise, ready-to-send RFQ emails. Do not invent email addresses; omit to when unavailable.",
        "Ask for MOQ, sample cost, unit cost tiers, lead time, customization options, certifications, packaging, and private-label terms.",
        "Return only JSON."
      ].join("\n")
    });

    const emails = await insertOutreachEmails({
      runId: state.runId,
      emails: draftEmails
    });

    return {
      stateDelta: { emails },
      message: `Drafted ${emails.length} RFQ email(s)`,
      data: emails.map((email) => ({
        emailId: email.emailId,
        supplierName: email.supplierName,
        subject: email.subject
      }))
    };
  }
}
