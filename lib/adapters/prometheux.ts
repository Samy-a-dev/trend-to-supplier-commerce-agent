import { optionalEnv } from "@/lib/env";
import type { ScoreResult } from "@/lib/types";
import { withTimeout } from "@/lib/utils";

export async function deriveWithPrometheux(input: {
  program: string;
  outputPredicates: string[];
  timeoutMs?: number;
}) {
  const sidecarUrl = optionalEnv("SIDECAR_URL", "http://localhost:8000");
  return withTimeout("Prometheux sidecar", input.timeoutMs ?? 60000, async (signal) => {
    const response = await fetch(`${sidecarUrl.replace(/\/$/, "")}/derive`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        program: input.program,
        output_predicates: input.outputPredicates
      }),
      signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Prometheux sidecar failed: ${JSON.stringify(payload)}`);
    }
    return payload as { results: ScoreResult["predicates"]; raw: unknown };
  });
}
