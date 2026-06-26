import { runSmokeTests } from "./_helpers";
import { smokeApify } from "./smoke-apify";
import { smokeClickHouse } from "./smoke-clickhouse";
import { smokeGeminiJson } from "./smoke-gemini-json";
import { smokeGeminiModels } from "./smoke-gemini-models";
import { smokeGmail } from "./smoke-gmail";
import { smokeNanoBanana } from "./smoke-nano-banana";
import { smokePrometheux } from "./smoke-prometheux";
import { smokeTavily } from "./smoke-tavily";

await runSmokeTests([
  { name: "ClickHouse insert/select", run: smokeClickHouse },
  { name: "Gemini models.list", run: smokeGeminiModels },
  { name: "Gemini structured JSON", run: smokeGeminiJson },
  { name: "Nano Banana image generation", run: smokeNanoBanana },
  { name: "Tavily search/extract", run: smokeTavily },
  { name: "Apify actor run", run: smokeApify },
  { name: "Prometheux sidecar derive", run: smokePrometheux },
  { name: "Gmail draft create", run: smokeGmail }
]);
