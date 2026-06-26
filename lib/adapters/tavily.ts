import { tavily } from "@tavily/core";

import { requireEnv } from "@/lib/env";
import type { Evidence, Supplier } from "@/lib/types";

let client: ReturnType<typeof tavily> | undefined;

function getTavilyClient() {
  if (client) return client;
  client = tavily({ apiKey: requireEnv("TAVILY_API_KEY") });
  return client;
}

export async function corroborateDemand(queries: string[]) {
  const tvly = getTavilyClient() as any;
  const evidence: Evidence[] = [];
  for (const query of queries.slice(0, 8)) {
    const result = await tvly.search(query, {
      searchDepth: "advanced",
      topic: "news",
      days: 30,
      maxResults: 10,
      includeAnswer: "advanced",
      includeRawContent: "markdown"
    });
    evidence.push({
      query,
      answer: result.answer,
      results: (result.results ?? []).map((item: any) => ({
        title: item.title,
        url: item.url,
        publishedDate: item.publishedDate ?? item.published_date,
        score: item.score,
        content: item.rawContent ?? item.raw_content ?? item.content
      }))
    });
  }
  return evidence;
}

export async function discoverSuppliers(productName: string) {
  const tvly = getTavilyClient() as any;
  const search = await tvly.search(`${productName} OEM private label manufacturer supplier`, {
    searchDepth: "advanced",
    maxResults: 10,
    includeAnswer: "advanced",
    includeRawContent: "markdown",
    includeDomains: ["alibaba.com", "made-in-china.com", "thomasnet.com", "globalsources.com"]
  });

  const urls = (search.results ?? [])
    .map((result: any) => result.url)
    .filter((url: unknown): url is string => typeof url === "string")
    .slice(0, 8);

  const extracted = urls.length
    ? await tvly.extract(urls, { extractDepth: "advanced", format: "markdown" })
    : { results: [] };

  return {
    answer: search.answer as string | undefined,
    searchResults: search.results ?? [],
    extracted: extracted.results ?? []
  };
}

export function supplierExtractionPrompt(input: {
  productName: string;
  raw: unknown;
}) {
  return [
    `Extract supplier candidates for "${input.productName}" from the following Tavily search and extract data.`,
    "Prefer OEM/private-label suppliers. Use fitScore 0..1 based on apparent product fit, credibility, MOQ/lead time signals, and contactability.",
    "Return only JSON.",
    JSON.stringify(input.raw).slice(0, 60000)
  ].join("\n");
}

export function emptySupplierList(): Supplier[] {
  return [];
}
