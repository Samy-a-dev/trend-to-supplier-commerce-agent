import { geminiModels, listGeminiModels } from "../../lib/adapters/gemini";
import { printJson } from "./_helpers";

export async function smokeGeminiModels() {
  const models = await listGeminiModels();
  const wanted = new Set(Object.values(geminiModels).map((getter) => getter()));
  const matching = models.filter((model) => {
    const name = model.name ?? "";
    return [...wanted].some((wantedModel) => name.endsWith(wantedModel));
  });
  printJson({
    configured: [...wanted],
    matching,
    sample: models.slice(0, 10)
  });
}
