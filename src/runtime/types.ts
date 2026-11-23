import type { z } from "zod";

import type { JevDecision, JevResponseOptions } from "./jev-response-schema.js";
import type { TranscriptRun } from "./transcript.js";

export type { TranscriptRun };
export type {
  JevDecision,
  JevResponse,
  JevResponseOptions,
  JevResponseSchema,
} from "./jev-response-schema.js";

/**
 * Vendor identifier. Built-ins: `"openai" | "anthropic" | "cursor" | "jev"`.
 * Custom vendors registered via `defineVendor` use their own id strings.
 */
export type VendorId = string;

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

type StructuredAgentDefinitionFields = {
  name?: string;
  cwd: string;
  model: string;
  modelContextWindow?: number;
  reasoningEffort?: ReasoningEffort;
  defaultTimeoutMs?: number;
};

/**
 * Runtime definition shape after schema resolution (includes `responseSchema`).
 * `responseOptions` is set on normalized JEV definitions for prompts / session config.
 */
export type StructuredAgentDefinitionBase<TOut> =
  StructuredAgentDefinitionFields & {
    vendor: VendorId;
    responseSchema: z.ZodType<TOut>;
    responseOptions?: JevResponseOptions;
  };

/** Non-JEV caller definition: `responseSchema` required; no `responseOptions`. */
export type NoInputStructuredAgentDefinition<TOut> = Omit<
  StructuredAgentDefinitionBase<TOut>,
  "responseOptions"
> & {
  prompt: string | (() => string);
  inputSchema?: undefined;
};

/** Non-JEV caller definition with typed input. */
export type InputStructuredAgentDefinition<TIn, TOut> = Omit<
  StructuredAgentDefinitionBase<TOut>,
  "responseOptions"
> & {
  prompt: string | ((input: TIn) => string);
  inputSchema: z.ZodType<TIn>;
};

/** Caller-facing JEV definition: `responseOptions` required, `responseSchema` forbidden. */
export type JevAgentDefinitionFields<TOptions extends JevResponseOptions> =
  StructuredAgentDefinitionFields & {
    vendor: "jev";
    responseOptions: TOptions;
    responseSchema?: never;
  };

export type NoInputJevAgentDefinition<TOptions extends JevResponseOptions> =
  JevAgentDefinitionFields<TOptions> & {
    prompt: string | (() => string);
    inputSchema?: undefined;
  };

export type InputJevAgentDefinition<
  TIn,
  TOptions extends JevResponseOptions,
> = JevAgentDefinitionFields<TOptions> & {
  prompt: string | ((input: TIn) => string);
  inputSchema: z.ZodType<TIn>;
};

export type JevAgentDefinition<
  TIn = unknown,
  TOptions extends JevResponseOptions = JevResponseOptions,
> =
  NoInputJevAgentDefinition<TOptions> | InputJevAgentDefinition<TIn, TOptions>;

/** Normalized JEV definition stored on the agent after schema derivation. */
export type NormalizedJevAgentDefinitionBase<
  TOptions extends JevResponseOptions,
> = StructuredAgentDefinitionBase<JevDecision<TOptions>> & {
  vendor: "jev";
  responseOptions: TOptions;
};

export type NoInputNormalizedJevAgentDefinition<
  TOptions extends JevResponseOptions,
> = NormalizedJevAgentDefinitionBase<TOptions> & {
  prompt: string | (() => string);
  inputSchema?: undefined;
};

export type InputNormalizedJevAgentDefinition<
  TIn,
  TOptions extends JevResponseOptions,
> = NormalizedJevAgentDefinitionBase<TOptions> & {
  prompt: string | ((input: TIn) => string);
  inputSchema: z.ZodType<TIn>;
};

export type StructuredAgentDefinition<TIn = unknown, TOut = unknown> =
  | NoInputStructuredAgentDefinition<TOut>
  | InputStructuredAgentDefinition<TIn, TOut>
  | NoInputNormalizedJevAgentDefinition<JevResponseOptions>
  | InputNormalizedJevAgentDefinition<TIn, JevResponseOptions>;

export type NoInputStructuredAgent<TOut> = ((
  options?: RunStructuredAgentOptions,
) => Promise<TOut>) & {
  definition:
    | NoInputStructuredAgentDefinition<TOut>
    | NoInputNormalizedJevAgentDefinition<JevResponseOptions>;
};

export type InputStructuredAgent<TIn, TOut> = ((
  input: TIn,
  options?: RunStructuredAgentOptions,
) => Promise<TOut>) & {
  definition:
    | InputStructuredAgentDefinition<TIn, TOut>
    | InputNormalizedJevAgentDefinition<TIn, JevResponseOptions>;
};

export type NoInputJevStructuredAgent<TOptions extends JevResponseOptions> = ((
  options?: RunStructuredAgentOptions,
) => Promise<JevDecision<TOptions>>) & {
  definition: NoInputNormalizedJevAgentDefinition<TOptions>;
};

export type InputJevStructuredAgent<
  TIn,
  TOptions extends JevResponseOptions,
> = ((
  input: TIn,
  options?: RunStructuredAgentOptions,
) => Promise<JevDecision<TOptions>>) & {
  definition: InputNormalizedJevAgentDefinition<TIn, TOptions>;
};

export const DEFAULT_TIMEOUT_MS = 15 * 60_000;
