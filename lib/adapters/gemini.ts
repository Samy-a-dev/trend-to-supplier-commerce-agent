import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z, type ZodType } from "zod";

import { optionalEnv, requireEnv } from "@/lib/env";
import { asError, slugify } from "@/lib/utils";

let ai: GoogleGenAI | undefined;

export const geminiModels = {
  reasoning: () => optionalEnv("GEMINI_MODEL_REASONING", "gemini-3.1-pro-preview"),
  extraction: () => optionalEnv("GEMINI_MODEL_EXTRACTION", "gemini-3.5-flash"),
  lite: () => optionalEnv("GEMINI_MODEL_LITE", "gemini-3.1-flash-lite"),
  imagePro: () => optionalEnv("GEMINI_MODEL_IMAGE_PRO", "gemini-3-pro-image"),
  imageFast: () => optionalEnv("GEMINI_MODEL_IMAGE_FAST", "gemini-3.1-flash-image")
};

export function getGeminiClient() {
  if (ai) return ai;
  ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return ai;
}

export async function listGeminiModels() {
  const client = getGeminiClient();
  const pager = await (client.models as any).list({ config: { pageSize: 50 } });
  const models: Array<{ name?: string; displayName?: string; supportedActions?: unknown }> = [];
  for await (const model of pager as AsyncIterable<any>) {
    models.push({
      name: model.name,
      displayName: model.displayName,
      supportedActions: model.supportedActions
    });
  }
  return models;
}

export async function generateJSON<T>(input: {
  model: string;
  schema: ZodType<T>;
  prompt: string;
  thinkingLevel?: "low" | "medium" | "high";
}) {
  const client = getGeminiClient();
  const responseJsonSchema = z.toJSONSchema(input.schema as any);
  const config: Record<string, unknown> = {
    responseMimeType: "application/json",
    responseJsonSchema
  };
  if (input.thinkingLevel) {
    config.thinkingConfig = { thinkingLevel: input.thinkingLevel };
  }

  async function call(prompt: string) {
    const response = await (client.models as any).generateContent({
      model: input.model,
      contents: prompt,
      config
    });
    const text =
      typeof response.text === "function" ? response.text() : response.text ?? "";
    return JSON.parse(text);
  }

  try {
    return input.schema.parse(await call(input.prompt));
  } catch (error) {
    const repairPrompt = [
      input.prompt,
      "",
      "The previous response failed JSON validation.",
      `Validation or parse error: ${asError(error).message}`,
      "Return only corrected JSON that conforms exactly to the provided schema."
    ].join("\n");
    return input.schema.parse(await call(repairPrompt));
  }
}

export async function generateImages(input: {
  model: string;
  prompts: string[];
  runId: string;
  baseName: string;
  aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
  imageSize?: "1K" | "2K" | "4K";
}) {
  const client = getGeminiClient();
  const outputDir = path.join(process.cwd(), "data", "images");
  await mkdir(outputDir, { recursive: true });

  const paths: string[] = [];
  for (let index = 0; index < input.prompts.length; index += 1) {
    const response = await (client.models as any).generateContent({
      model: input.model,
      contents: [{ role: "user", parts: [{ text: input.prompts[index] }] }],
      config: {
        imageConfig: {
          aspectRatio: input.aspectRatio ?? "1:1",
          imageSize: input.imageSize ?? "2K"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imageParts = parts.filter((part: any) => part.inlineData?.data);
    if (imageParts.length === 0) {
      throw new Error(`Gemini image model ${input.model} returned no inline image data.`);
    }

    for (let partIndex = 0; partIndex < imageParts.length; partIndex += 1) {
      const fileName = `${slugify(input.runId)}-${slugify(input.baseName)}-${index + 1}-${partIndex + 1}.png`;
      const filePath = path.join(outputDir, fileName);
      await writeFile(filePath, Buffer.from(imageParts[partIndex].inlineData.data, "base64"));
      paths.push(`/api/images/${fileName}`);
    }
  }

  return paths;
}
