import type {
  ReasoningEffort,
  StructuredAgentDefinitionBase,
} from "../runtime/types.js";
import { resolvePackageBin } from "./resolve-package-bin.js";
import type { ResolvedVendorProcess } from "./types.js";

export const CODEX_CONFIG_ENV = "CODEX_CONFIG";

export type CodexSessionConfig = {
  model: string;
  model_context_window?: number;
  model_reasoning_effort?: ReasoningEffort;
};

/** Builds the Codex session config object advertised through CODEX_CONFIG. */
export function buildCodexSessionConfig(
  definition: Pick<
    StructuredAgentDefinitionBase<unknown>,
    "model" | "modelContextWindow" | "reasoningEffort"
  >,
): CodexSessionConfig {
  const config: CodexSessionConfig = {
    model: definition.model,
  };

  if (definition.modelContextWindow !== undefined) {
    config.model_context_window = definition.modelContextWindow;
  }

  if (definition.reasoningEffort !== undefined) {
    config.model_reasoning_effort = definition.reasoningEffort;
  }

  return config;
}

function mergeCodexConfig(
  definition: Pick<
    StructuredAgentDefinitionBase<unknown>,
    "model" | "modelContextWindow" | "reasoningEffort"
  >,
  env: NodeJS.ProcessEnv,
): string {
  const merged = {
    ...parseExistingCodexConfig(env[CODEX_CONFIG_ENV]),
    ...buildCodexSessionConfig(definition),
  };

  return JSON.stringify(merged);
}

function parseExistingCodexConfig(
  rawConfig: string | undefined,
): Partial<CodexSessionConfig> {
  if (rawConfig === undefined || rawConfig.trim() === "") {
    return {};
  }

  return JSON.parse(rawConfig) as Partial<CodexSessionConfig>;
}

/** Maps a Codex definition to the codex-acp adapter with CODEX_CONFIG set. */
export function resolveCodexProcess(
  definition: Pick<
    StructuredAgentDefinitionBase<unknown>,
    "model" | "modelContextWindow" | "reasoningEffort"
  >,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedVendorProcess {
  return {
    command: resolvePackageBin("@agentclientprotocol/codex-acp", "codex-acp"),
    args: [],
    env: {
      ...env,
      [CODEX_CONFIG_ENV]: mergeCodexConfig(definition, env),
    },
  };
}
