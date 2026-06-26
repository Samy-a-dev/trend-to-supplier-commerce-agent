import {
  BaseAgent,
  createEvent,
  createEventActions,
  type Event,
  type InvocationContext
} from "@google/adk";

import type { PipelineState, PipelineStepName } from "@/lib/types";
import { stepLabels } from "@/lib/types";
import { serializeError } from "@/lib/utils";

export type StepOutput = {
  stateDelta?: Record<string, unknown>;
  message?: string;
  data?: unknown;
};

export abstract class PipelineStep extends BaseAgent {
  protected constructor(
    public readonly stepName: PipelineStepName,
    description: string,
    private readonly critical = true
  ) {
    super({ name: `${stepName}_step`, description });
  }

  protected abstract execute(ctx: InvocationContext, state: PipelineState): Promise<StepOutput>;

  protected async *runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, void> {
    yield this.makeEvent(ctx, "progress", `${stepLabels[this.stepName]} started`);
    try {
      const output = await this.execute(ctx, this.readState(ctx));
      if (output.stateDelta && Object.keys(output.stateDelta).length > 0) {
        yield this.makeEvent(
          ctx,
          "state",
          output.message ?? `${stepLabels[this.stepName]} completed`,
          output.data ?? Object.keys(output.stateDelta),
          output.stateDelta
        );
      }
      yield this.makeEvent(ctx, "complete", `${stepLabels[this.stepName]} complete`);
    } catch (error) {
      yield this.makeEvent(
        ctx,
        "error",
        `${stepLabels[this.stepName]} failed: ${serializeError(error).message}`,
        serializeError(error)
      );
      if (this.critical) {
        throw error;
      }
    }
  }

  protected async *runLiveImpl(_ctx: InvocationContext): AsyncGenerator<Event, void, void> {
    throw new Error("Live mode is not supported for deterministic pipeline steps.");
  }

  protected readState(ctx: InvocationContext) {
    return ctx.session.state as PipelineState;
  }

  private makeEvent(
    ctx: InvocationContext,
    kind: "progress" | "state" | "warning" | "error" | "complete",
    message: string,
    data?: unknown,
    stateDelta?: Record<string, unknown>
  ) {
    return createEvent({
      invocationId: ctx.invocationId,
      author: this.name,
      branch: ctx.branch,
      content: { role: "model", parts: [{ text: message }] },
      actions: stateDelta ? createEventActions({ stateDelta }) : createEventActions(),
      customMetadata: {
        step: this.stepName,
        kind,
        data
      }
    });
  }
}
