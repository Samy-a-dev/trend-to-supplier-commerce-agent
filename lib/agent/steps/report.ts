import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { ReportSchema, type PipelineState } from "@/lib/types";

export class ReportStep extends PipelineStep {
  constructor() {
    super("report", "Assembles the persisted sourcing report.");
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.opportunity) throw new Error("Missing opportunity.");

    const risks = [
      ...(state.rawSignals?.warnings ?? []),
      ...(state.scores ? [] : ["Prometheux scoring did not complete; inspect score step events."]),
      ...(state.variant ? [] : ["Variant image generation did not complete."]),
      ...((state.suppliers?.length ?? 0) > 0 ? [] : ["No supplier candidates were extracted."])
    ];

    const report = ReportSchema.parse({
      summary: `${state.opportunity.productName} is the strongest discovered opportunity in ${state.vertical}, backed by ${state.evidence?.reduce((sum, entry) => sum + entry.results.length, 0) ?? 0} corroborating web result(s).`,
      opportunity: state.opportunity,
      scores: state.scores,
      variant: state.variant,
      suppliers: state.suppliers ?? [],
      emails: state.emails ?? [],
      risks,
      nextStep:
        (state.emails?.length ?? 0) > 0
          ? "Review the RFQ drafts and approve selected Gmail drafts."
          : "Review supplier extraction gaps before outreach."
    });

    return {
      stateDelta: { report },
      message: `Report assembled for ${state.opportunity.productName}`,
      data: { report }
    };
  }
}
