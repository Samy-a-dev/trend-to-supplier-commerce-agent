import { ingestSignals } from "../../lib/adapters/apify";
import { printJson } from "./_helpers";

export async function smokeApify() {
  const result = await ingestSignals({
    vertical: "desk setup",
    tiktokHashtags: ["desksetup"],
    amazonQueries: ["desk cable organizer"],
    subreddits: ["desk setup"],
    validationQueries: ["desk cable organizer trend"]
  });
  printJson({
    tiktok: result.tiktok.length,
    amazonListings: result.amazonListings.length,
    reddit: result.reddit.length,
    amazonReviews: result.amazonReviews.length,
    warnings: result.warnings
  });
}
