import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { insertJSON, sourcePayloadRow } from "@/lib/adapters/clickhouse";
import { deriveWithPrometheux } from "@/lib/adapters/prometheux";
import { buildVadalogProgram } from "@/lib/reasoning/vadalog";
import type { PipelineState, ScoreResult } from "@/lib/types";

export class ScoreStep extends PipelineStep {
  constructor() {
    super("score", "Runs Prometheux Vadalog rules and computes opportunity scores.", false);
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.opportunity) throw new Error("Missing opportunity.");
    if (!state.evidence) throw new Error("Missing corroborating evidence.");

    const program = buildVadalogProgram({
      opportunity: state.opportunity,
      evidence: state.evidence
    });
    const derived = await deriveWithPrometheux({
      program,
      outputPredicates: ["stockCandidate", "differentiationOpportunity", "supplierFit"]
    });

    const scores: ScoreResult = {
      predicates: derived.results,
      scores: computeScores(state),
      raw: derived.raw
    };

    await insertJSON("product_opportunities", [
      sourcePayloadRow({
        runId: state.runId,
        source: "prometheux",
        productName: state.opportunity.productName,
        payload: { program, scores },
        extra: {
          trend_strength: scores.scores.trendStrength,
          demand_quality: scores.scores.demandQuality,
          pain_intensity: scores.scores.painIntensity,
          saturation: scores.scores.saturation,
          differentiation: scores.scores.differentiation,
          supplier_fit: scores.scores.supplierFit,
          margin: scores.scores.margin,
          risk: scores.scores.risk
        }
      })
    ]);

    return {
      stateDelta: { scores },
      message: `Prometheux scoring completed for ${state.opportunity.productName}`,
      data: scores.scores
    };
  }
}

function computeScores(state: PipelineState): ScoreResult["scores"] {
  const opportunity = state.opportunity;
  const evidence = state.evidence ?? [];
  const topMention = Math.max(...(opportunity?.productMentions.map((item) => item.growthScore) ?? [0]));
  const painIntensity = average(opportunity?.reviewThemes.map((item) => item.severity) ?? []);
  const demandQuality = Math.min(
    1,
    evidence.reduce((sum, item) => sum + item.results.length, 0) / 30
  );
  const saturation = Math.min(1, (opportunity?.competitors.length ?? 0) / 12);
  const differentiation = Math.max(0, painIntensity * (1 - saturation * 0.45));
  const margin = opportunity?.estimatedPriceCents
    ? Math.min(1, Math.max(0.1, opportunity.estimatedPriceCents / 10000))
    : 0.3;
  const risk = Math.min(1, saturation * 0.55 + (1 - demandQuality) * 0.3);

  return {
    trendStrength: topMention,
    demandQuality,
    painIntensity,
    saturation,
    differentiation,
    supplierFit: 0,
    margin,
    risk
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
