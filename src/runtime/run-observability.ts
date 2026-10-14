import type { SessionNotification } from "@agentclientprotocol/sdk";

import {
  createHeartbeatScheduler,
  createStdoutActivityTracker,
  emitAgentLog,
} from "./agent-log.js";
import type { SubmitStructuredOutputPrompt } from "./enforce.js";
import {
  openTranscriptAgent,
  type AgentTranscriptRecorder,
} from "./transcript.js";
import type {
  AgentLogEvent,
  RunStructuredAgentOptions,
  StructuredAgentDefinitionBase,
  TranscriptMode,
} from "./types.js";

export type AgentRunObservabilityOptions = {
  definition: Pick<
    StructuredAgentDefinitionBase<unknown>,
    "name" | "model" | "vendor"
  >;
  runOptions?: RunStructuredAgentOptions;
  timeoutMs: number;
  startedAt: number;
};

export type AgentRunObservability = {
  handleSessionUpdate: (notification: SessionNotification) => void;
  wrapSubmitPrompt: (
    submitPrompt: SubmitStructuredOutputPrompt,
  ) => SubmitStructuredOutputPrompt;
  attachToProcess: (stdout: NodeJS.ReadableStream) => void;
  notifyStart: () => Promise<void>;
  notifySuccess: (result: unknown) => Promise<void>;
  notifyFailure: (error: unknown) => Promise<void>;
  dispose: () => void;
};

function resolveTranscriptMode(
  runOptions?: RunStructuredAgentOptions,
): TranscriptMode {
  return runOptions?.transcriptMode ?? "full";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/** Creates lifecycle logging, heartbeats, and transcript hooks for one agent run. */
export async function createAgentRunObservability(
  options: AgentRunObservabilityOptions,
): Promise<AgentRunObservability> {
  const onLog = options.runOptions?.onLog;
  const transcriptRun = options.runOptions?.transcriptRun;
  const tracker = createStdoutActivityTracker();
  let detachStdout: (() => void) | undefined;
  let transcript: AgentTranscriptRecorder | undefined;

  if (transcriptRun !== undefined) {
    transcript = await openTranscriptAgent(transcriptRun, {
      name: options.definition.name,
      model: options.definition.model,
      vendor: options.definition.vendor,
      mode: resolveTranscriptMode(options.runOptions),
    });
  }

  const heartbeat = createHeartbeatScheduler({
    startedAt: options.startedAt,
    timeoutMs: options.timeoutMs,
    deadline: options.runOptions?.deadline,
    onLog,
    tracker,
  });

  const emitStart = (): AgentLogEvent => ({
    type: "agent_start",
    name: options.definition.name,
    model: options.definition.model,
    vendor: options.definition.vendor,
    startedAt: options.startedAt,
  });

  const emitEnd = (
    outcome: "success" | "failure",
    endedAt: number,
    error?: unknown,
  ): AgentLogEvent => ({
    type: "agent_end",
    name: options.definition.name,
    model: options.definition.model,
    vendor: options.definition.vendor,
    startedAt: options.startedAt,
    endedAt,
    durationMs: endedAt - options.startedAt,
    outcome,
    ...(error === undefined ? {} : { error: formatErrorMessage(error) }),
  });

  return {
    handleSessionUpdate(notification) {
      void transcript?.recordSessionUpdate(notification);
    },
    wrapSubmitPrompt(submitPrompt) {
      return async (prompt, attemptIndex) => {
        await transcript?.recordPrompt(prompt, attemptIndex);
        return submitPrompt(prompt, attemptIndex);
      };
    },
    attachToProcess(stdout) {
      detachStdout?.();
      detachStdout = tracker.attach(stdout);
    },
    async notifyStart() {
      emitAgentLog(emitStart(), onLog);
      heartbeat.start();
    },
    async notifySuccess(result) {
      const endedAt = Date.now();
      emitAgentLog(emitEnd("success", endedAt), onLog);
      await transcript?.recordResult(result);
      await transcript?.finish("success", endedAt);
    },
    async notifyFailure(error) {
      const endedAt = Date.now();
      emitAgentLog(emitEnd("failure", endedAt, error), onLog);
      await transcript?.recordError(error);
      await transcript?.finish("failure", endedAt);
    },
    dispose() {
      heartbeat.stop();
      detachStdout?.();
      detachStdout = undefined;
    },
  };
}
