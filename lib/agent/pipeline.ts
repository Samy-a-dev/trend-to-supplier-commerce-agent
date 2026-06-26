import { SequentialAgent } from "@google/adk";

import { CorroborateStep } from "@/lib/agent/steps/corroborate";
import { DiscoverStep } from "@/lib/agent/steps/discover";
import { DraftStep } from "@/lib/agent/steps/draft";
import { ExtractStep } from "@/lib/agent/steps/extract";
import { IngestStep } from "@/lib/agent/steps/ingest";
import { ReportStep } from "@/lib/agent/steps/report";
import { ScoreStep } from "@/lib/agent/steps/score";
import { SuppliersStep } from "@/lib/agent/steps/suppliers";
import { VariantStep } from "@/lib/agent/steps/variant";

export function createPipeline() {
  return new SequentialAgent({
    name: "trend_supplier_pipeline",
    description: "Runs the deterministic trend-to-supplier sourcing pipeline.",
    subAgents: [
      new DiscoverStep(),
      new IngestStep(),
      new ExtractStep(),
      new CorroborateStep(),
      new ScoreStep(),
      new VariantStep(),
      new SuppliersStep(),
      new DraftStep(),
      new ReportStep()
    ]
  });
}
