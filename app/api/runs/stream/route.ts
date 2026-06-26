import { streamPipelineRun } from "@/lib/agent/runner";
import { safeJson } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamPipelineRun(body)) {
          controller.enqueue(encoder.encode(`data: ${safeJson(event)}\n\n`));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${safeJson({
              run_id: body.runId ?? "",
              step: "runner",
              kind: "error",
              message: error instanceof Error ? error.message : String(error)
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
