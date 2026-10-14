import type { z } from "zod";

import type { TranscriptRun } from "./transcript.js";

export type { TranscriptRun };

export type VendorId = "openai" | "anthropic" | "cursor";

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

export type ClientInfo = {
  name: string;
  version: string;
};

export type TranscriptMode = "full" | "lifecycle";

export type AgentStartLogEvent = {
  type: "agent_start";
  name?: string;
  model: string;
  vendor: VendorId;
  startedAt: number;
};

export type AgentEndLogEvent = {
  type: "agent_end";
  name?: string;
  model: string;
  vendor: VendorId;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  outcome: "success" | "failure";
  error?: string;
};

export type AgentHeartbeatLogEvent = {
  type: "heartbeat";
  elapsedMs: number;
  stdoutBytes: number;
  lastStdoutAt: number | null;
  agentTimeRemainingMs: number | null;
  overallTimeRemainingMs: number | null;
};

export type AgentQuietTransportLogEvent = {
  type: "no_recent_transport_output";
  quietForMs: number;
  lastStdoutAt: number | null;
};

export type AgentLogEvent =
  | AgentStartLogEvent
  | AgentEndLogEvent
  | AgentHeartbeatLogEvent
  | AgentQuietTransportLogEvent;

/** Placeholder until ACP fixtures land in Phase 4. */
export type ProcessOverride = {
  command: string;
  args?: string[];
};

export type RunStructuredAgentOptions = {
  deadline?: number;
  timeoutMs?: number;
  clientInfo?: ClientInfo;
  trace?: boolean | NodeJS.WritableStream;
  transcriptRun?: TranscriptRun;
  transcriptMode?: "full" | "lifecycle";
  onLog?: (event: AgentLogEvent) => void;
  onStderr?: (chunk: Buffer) => void;
  process?: ProcessOverride;
};

export type StructuredAgentDefinitionBase<TOut> = {
  name?: string;
  cwd: string;
  model: string;
  vendor: VendorId;
  responseSchema: z.ZodType<TOut>;
  modelContextWindow?: number;
  reasoningEffort?: ReasoningEffort;
  defaultTimeoutMs?: number;
};

export type NoInputStructuredAgentDefinition<TOut> =
  StructuredAgentDefinitionBase<TOut> & {
    prompt: string | (() => string);
    inputSchema?: undefined;
  };

export type InputStructuredAgentDefinition<TIn, TOut> =
  StructuredAgentDefinitionBase<TOut> & {
    prompt: string | ((input: TIn) => string);
    inputSchema: z.ZodType<TIn>;
  };

export type StructuredAgentDefinition<TIn = unknown, TOut = unknown> =
  | NoInputStructuredAgentDefinition<TOut>
  | InputStructuredAgentDefinition<TIn, TOut>;

export type NoInputStructuredAgent<TOut> = ((
  options?: RunStructuredAgentOptions,
) => Promise<TOut>) & {
  definition: NoInputStructuredAgentDefinition<TOut>;
};

export type InputStructuredAgent<TIn, TOut> = ((
  input: TIn,
  options?: RunStructuredAgentOptions,
) => Promise<TOut>) & {
  definition: InputStructuredAgentDefinition<TIn, TOut>;
};

export const DEFAULT_TIMEOUT_MS = 15 * 60_000;
