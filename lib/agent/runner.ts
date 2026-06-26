import {
  InMemorySessionService,
  Runner,
  StreamingMode,
  stringifyContent,
  type Event
} from "@google/adk";

import { createPipeline } from "@/lib/agent/pipeline";
import { createAgentRun, finishAgentRun, persistRunEvent } from "@/lib/adapters/clickhouse";
import { migrate } from "@/lib/db/migrate";
import { RunRequestSchema, type PipelineState, type RunEventRow } from "@/lib/types";
import { parseJson, safeJson, serializeError } from "@/lib/utils";

export async function* streamPipelineRun(input: unknown): AsyncGenerator<RunEventRow, void, void> {
  const request = RunRequestSchema.parse(input);
  const runId = request.runId ?? crypto.randomUUID();
  const initialState: PipelineState = {
    runId,
    vertical: request.vertical,
    region: request.region
  };
  let state: Record<string, unknown> = { ...initialState };

  try {
    await migrate();
    await createAgentRun({ runId, vertical: request.vertical, region: request.region });

    const sessionService = new InMemorySessionService();
    const appName = "trend_to_supplier";
    const userId = "local_operator";
    await sessionService.createSession({
      appName,
      userId,
      sessionId: runId,
      state: initialState
    });

    const runner = new Runner({
      appName,
      agent: createPipeline(),
      sessionService
    });

    for await (const event of runner.runAsync({
      userId,
      sessionId: runId,
      newMessage: {
        role: "user",
        parts: [{ text: `Run product sourcing pipeline for ${request.vertical} in ${request.region}.` }]
      },
      runConfig: { streamingMode: StreamingMode.SSE }
    })) {
      const row = eventToRunRow(runId, event);
      if (!row) continue;
      Object.assign(state, event.actions?.stateDelta ?? {});
      await persistRunEvent(row);
      yield row;
    }

    const report = state.report;
    await finishAgentRun({
      runId,
      status: "completed",
      summary:
        typeof report === "object" && report && "summary" in report
          ? String((report as { summary?: unknown }).summary ?? "")
          : "Run completed.",
      payload: report ?? state
    });
  } catch (error) {
    const row: RunEventRow = {
      run_id: runId,
      step: "runner",
      kind: "error",
      message: serializeError(error).message,
      data: serializeError(error)
    };
    await persistRunEvent(row).catch(() => undefined);
    await finishAgentRun({
      runId,
      status: "failed",
      summary: row.message,
      payload: { state, error: row.data }
    }).catch(() => undefined);
    yield row;
  }
}

function eventToRunRow(runId: string, event: Event): RunEventRow | null {
  const metadata = event.customMetadata ?? {};
  if (typeof metadata.step !== "string" || typeof metadata.kind !== "string") {
    return null;
  }

  const stateDelta = event.actions?.stateDelta ?? {};
  const data =
    metadata.data ??
    (Object.keys(stateDelta).length
      ? parseJson<Record<string, unknown>>(safeJson(stateDelta), {})
      : {});

  return {
    run_id: runId,
    step: metadata.step,
    kind: normalizeKind(metadata.kind),
    message: stringifyContent(event),
    data
  };
}

function normalizeKind(kind: string): RunEventRow["kind"] {
  if (kind === "state" || kind === "warning" || kind === "error" || kind === "complete") {
    return kind;
  }
  return "progress";
}
