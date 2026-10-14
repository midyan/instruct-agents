import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import { UnknownVendorError as RuntimeUnknownVendorError } from "../runtime/errors.js";
import { resolveClaudeProcess } from "./claude.js";
import { resolveCodexProcess } from "./codex.js";
import { resolveCursorProcess } from "./cursor.js";
import type { ResolvedVendorProcess } from "./types.js";

export { UnknownVendorError } from "../runtime/errors.js";

/** Maps a structured-agent definition to a local ACP adapter subprocess. */
export function resolveVendorProcess(
  definition: StructuredAgentDefinitionBase<unknown>,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedVendorProcess {
  switch (definition.vendor) {
    case "cursor":
      return resolveCursorProcess(definition, env);
    case "openai":
      return resolveCodexProcess(definition, env);
    case "anthropic":
      return resolveClaudeProcess(definition, env);
    default:
      throw new RuntimeUnknownVendorError(definition.vendor);
  }
}

export { ANTHROPIC_MODEL_ENV, resolveClaudeProcess } from "./claude.js";
export {
  buildCodexSessionConfig,
  CODEX_CONFIG_ENV,
  resolveCodexProcess,
} from "./codex.js";
export type { CodexSessionConfig } from "./codex.js";
export {
  CURSOR_AGENT_COMMAND_ENV,
  resolveCursorAgentCommand,
  resolveCursorProcess,
} from "./cursor.js";
export {
  resolveModuleRelativePath,
  resolvePackageBin,
} from "./resolve-package-bin.js";
export type { ResolvedVendorProcess } from "./types.js";
export {
  disableHeadlessTitleGeneration,
  EXPECTED_PIPE_ERROR_CODES,
  installPipeCloseGuard,
} from "./claude/guards.js";
