import { geminiModels, generateImages } from "../../lib/adapters/gemini";
import { printJson } from "./_helpers";

export async function smokeNanoBanana() {
  const paths = await generateImages({
    model: geminiModels.imageFast(),
    runId: "smoke",
    baseName: "concept",
    prompts: [
      "A clean product concept mockup of a compact desk cable organizer, white background, realistic ecommerce render"
    ],
    imageSize: "2K"
  });
  printJson({ paths });
}
