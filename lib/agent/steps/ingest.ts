import type { InvocationContext } from "@google/adk";

import { PipelineStep, type StepOutput } from "@/lib/agent/base-step";
import { ingestSignals } from "@/lib/adapters/apify";
import { insertJSON, sourcePayloadRow } from "@/lib/adapters/clickhouse";
import type { PipelineState } from "@/lib/types";

export class IngestStep extends PipelineStep {
  constructor() {
    super("ingest", "Runs capped Apify actors and stores raw market signals.");
  }

  protected async execute(_ctx: InvocationContext, state: PipelineState): Promise<StepOutput> {
    if (!state.discoveryPlan) throw new Error("Missing discovery plan.");
    const rawSignals = await ingestSignals(state.discoveryPlan);

    await Promise.all([
      insertJSON(
        "trend_observations",
        rawSignals.tiktok.map((item: any) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "tiktok",
            url: item.webVideoUrl ?? item.url,
            title: item.text ?? item.desc ?? "",
            payload: item,
            extra: { score: Number(item.diggCount ?? item.likes ?? 0) }
          })
        )
      ),
      insertJSON(
        "marketplace_listings",
        rawSignals.amazonListings.map((item: any) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "amazon",
            url: item.url ?? item.productUrl,
            title: item.title ?? item.name ?? "",
            productName: item.title ?? item.name ?? "",
            payload: item,
            extra: {
              price_cents: parsePriceCents(item.price ?? item.priceValue),
              rating: Number(item.rating ?? item.stars ?? 0),
              review_count: Number(item.reviewsCount ?? item.reviewCount ?? 0)
            }
          })
        )
      ),
      insertJSON(
        "trend_observations",
        rawSignals.reddit.map((item: any) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "reddit",
            url: item.url ?? item.permalink,
            title: item.title ?? "",
            payload: item,
            extra: { score: Number(item.score ?? item.upvotes ?? 0) }
          })
        )
      ),
      insertJSON(
        "trend_observations",
        rawSignals.amazonReviews.map((item: any) =>
          sourcePayloadRow({
            runId: state.runId,
            source: "amazon_reviews",
            url: item.productUrl ?? item.url,
            title: item.title ?? item.reviewTitle ?? "",
            productName: item.productTitle ?? item.productName ?? "",
            payload: item,
            extra: { score: Number(item.rating ?? item.stars ?? 0) }
          })
        )
      )
    ]);

    return {
      stateDelta: { rawSignals },
      message: `Ingested ${rawSignals.tiktok.length + rawSignals.amazonListings.length + rawSignals.reddit.length + rawSignals.amazonReviews.length} raw records`,
      data: {
        tiktok: rawSignals.tiktok.length,
        amazonListings: rawSignals.amazonListings.length,
        reddit: rawSignals.reddit.length,
        amazonReviews: rawSignals.amazonReviews.length,
        warnings: rawSignals.warnings
      }
    };
  }
}

function parsePriceCents(value: unknown) {
  if (typeof value === "number") return Math.round(value * 100);
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}
