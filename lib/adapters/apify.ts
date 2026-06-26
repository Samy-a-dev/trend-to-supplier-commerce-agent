import { ApifyClient } from "apify-client";

import { requireEnv } from "@/lib/env";
import type { DiscoveryPlan, RawSignals } from "@/lib/types";
import { asError, withRetry } from "@/lib/utils";

let client: ApifyClient | undefined;

type ActorResult = {
  items: unknown[];
  status: string;
};

function getApifyClient() {
  if (client) return client;
  client = new ApifyClient({ token: requireEnv("APIFY_TOKEN") });
  return client;
}

async function runActor(
  slug: string,
  input: Record<string, unknown>,
  limit: number,
  waitSecs = 180
) {
  const apify = getApifyClient();
  const run = await withRetry(slug, 2, () =>
    apify.actor(slug).call(input, {
      waitSecs,
      memory: 1024
    })
  );

  const datasetId = run.defaultDatasetId;
  if (!datasetId) {
    throw new Error(`Apify actor ${slug} did not return a dataset id.`);
  }

  const dataset = await apify.dataset(datasetId).listItems({ limit, clean: true });
  const items = dataset.items as unknown[];

  if (isActiveRunStatus(run.status)) {
    await apify.run(run.id).abort({ gracefully: true }).catch(() => undefined);
  }

  if (run.status !== "SUCCEEDED" && items.length === 0 && !isActiveRunStatus(run.status)) {
    throw new Error(`Apify actor ${slug} ended with status ${run.status}`);
  }

  return { items, status: run.status } satisfies ActorResult;
}

async function runActorItems(
  label: string,
  slug: string,
  input: Record<string, unknown>,
  limit: number,
  warnings: string[],
  waitSecs?: number
) {
  return runActor(slug, input, limit, waitSecs)
    .then((result) => {
      if (result.status !== "SUCCEEDED") {
        warnings.push(
          `${label} actor returned ${result.items.length} partial records with status ${result.status}`
        );
      }
      return result.items;
    })
    .catch((error) => {
      warnings.push(`${label} actor failed: ${asError(error).message}`);
      return [];
    });
}

function isActiveRunStatus(status: string) {
  return status === "READY" || status === "RUNNING";
}

export async function ingestSignals(plan: DiscoveryPlan): Promise<RawSignals> {
  const warnings: string[] = [];
  const amazonUrls = plan.amazonQueries.slice(0, 4).map((query) => {
    const url = new URL("https://www.amazon.com/s");
    url.searchParams.set("k", query);
    return { url: url.toString() };
  });

  const [tiktok, amazonListings, reddit] = await Promise.all([
    runActorItems(
      "TikTok",
      "clockworks/tiktok-scraper",
      {
        hashtags: plan.tiktokHashtags.slice(0, 8),
        resultsPerPage: 20,
        commentsPerPost: 0
      },
      80,
      warnings,
      120
    ),
    runActorItems(
      "Amazon listings",
      "junglee/amazon-crawler",
      {
        country: "US",
        categoryOrProductUrls: amazonUrls,
        maxItemsPerStartUrl: 8,
        maxSearchPagesPerStartUrl: 1,
        liveView: false
      },
      40,
      warnings,
      180
    ),
    runActorItems(
      "Reddit",
      "trudax/reddit-scraper-lite",
      {
        searches: plan.subreddits.slice(0, 8),
        maxItems: 30,
        maxComments: 10
      },
      120,
      warnings,
      60
    )
  ]);

  const productUrls = amazonListings
    .map((item: any) => item.url ?? item.productUrl)
    .filter((url): url is string => typeof url === "string")
    .slice(0, 8);
  const productUrlInputs = productUrls.slice(0, 1).map((url) => ({ url }));

  let amazonReviews: unknown[] = [];
  if (productUrlInputs.length > 0) {
    try {
      amazonReviews = await runActor(
        "junglee/amazon-reviews-scraper",
        { productUrls: productUrlInputs, maxReviews: 10 },
        400,
        120
      ).then((result) => result.items);
    } catch (primaryError) {
      warnings.push(`Primary Amazon reviews actor failed: ${asError(primaryError).message}`);
      try {
        amazonReviews = await runActor(
          "axesso_data/amazon-reviews-scraper",
          { productUrls, maxReviews: 50 },
          400
        ).then((result) => result.items);
      } catch (fallbackError) {
        warnings.push(`Fallback Amazon reviews actor failed: ${asError(fallbackError).message}`);
      }
    }
  }

  return {
    tiktok,
    amazonListings,
    reddit,
    amazonReviews,
    warnings
  };
}
