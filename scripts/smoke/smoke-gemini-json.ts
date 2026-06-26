import { z } from "zod";

import { geminiModels, generateJSON } from "../../lib/adapters/gemini";
import { printJson } from "./_helpers";

const SmokeSchema = z.object({
  vertical: z.string(),
  queries: z.array(z.string()).min(2).max(5)
});

export async function smokeGeminiJson() {
  const result = await generateJSON({
    model: geminiModels.lite(),
    schema: SmokeSchema,
    prompt: "Return JSON with vertical='desk setup' and 3 concise product search queries."
  });
  printJson(result);
}
