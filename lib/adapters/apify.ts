import { ApifyClient } from "apify-client";

import { requireEnv } from "@/lib/env";
import type { DiscoveryPlan, RawSignals } from "@/lib/types";
import { asError, withRetry } from "@/lib/utils";

let client: ApifyClient | undefined;

function getApifyClient() {
  if (client) return client;
  client = new ApifyClient({ token: requireEnv("APIFY_TOKEN") });
  return client;
}

async function runActor(slug: string, input: Record<string, unknown>, limit: number) {
  const apify = getApifyClient();
  const run = await withRetry(slug, 2, () =>
    apify.actor(slug).call(input, {
      waitSecs: 120,
      memory: 1024
    })
  );

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify actor ${slug} ended with status ${run.status}`);
  }

  const datasetId = run.defaultDatasetId;
  if (!datasetId) {
    throw new Error(`Apify actor ${slug} did not return a dataset id.`);
  }

  const dataset = await apify.dataset(datasetId).listItems({ limit, clean: true });
  return dataset.items as unknown[];
}

export async function ingestSignals(plan: DiscoveryPlan): Promise<RawSignals> {
  const warnings: string[] = [];

  const amazonUrls = plan.amazonQueries.slice(0, 5).map((query) => {
    const url = new URL("https://www.amazon.com/s");
    url.searchParams.set("k", query);
    return url.toString();
  });

  const [tiktok, amazonListings, reddit] = await Promise.all([
    runActor(
      "clockworks/tiktok-scraper",
      {
        hashtags: plan.tiktokHashtags.slice(0, 8),
        resultsPerPage: 20,
        commentsPerPost: 0
      },
      80
    ).catch((error) => {
      warnings.push(`TikTok actor failed: ${asError(error).message}`);
      return [];
    }),
    runActor(
      "junglee/amazon-crawler",
      {
        categoryOrProductUrls: amazonUrls,
        maxItemsPerStartUrl: 20,
        maxSearchPagesPerStartUrl: 1
      },
      100
    ).catch((error) => {
      warnings.push(`Amazon listings actor failed: ${asError(error).message}`);
      return [];
    }),
    runActor(
      "trudax/reddit-scraper-lite",
      {
        searches: plan.subreddits.slice(0, 8),
        maxItems: 30,
        maxComments: 10
      },
      120
    ).catch((error) => {
      warnings.push(`Reddit actor failed: ${asError(error).message}`);
      return [];
    })
  ]);

  const productUrls = amazonListings
    .map((item: any) => item.url ?? item.productUrl)
    .filter((url): url is string => typeof url === "string")
    .slice(0, 8);

  let amazonReviews: unknown[] = [];
  if (productUrls.length > 0) {
    try {
      amazonReviews = await runActor(
        "junglee/amazon-reviews-scraper",
        { productUrls, maxReviews: 50 },
        400
      );
    } catch (primaryError) {
      warnings.push(`Primary Amazon reviews actor failed: ${asError(primaryError).message}`);
      try {
        amazonReviews = await runActor(
          "axesso_data/amazon-reviews-scraper",
          { productUrls, maxReviews: 50 },
          400
        );
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
