import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import { UnknownVendorError as RuntimeUnknownVendorError } from "../runtime/errors.js";
import { getRegisteredVendor } from "./define-vendor.js";
import type { ResolvedVendorProcess } from "./types.js";

// Register built-in vendors (Cursor / Claude / Codex / Jev) at module load.
import "./builtins.js";

export { UnknownVendorError } from "../runtime/errors.js";
export { DuplicateVendorError } from "../runtime/errors.js";
export {
  DEFAULT_VENDOR_CAPABILITIES,
  defineVendor,
  getRegisteredVendor,
  resolveVendorCapabilities,
} from "./define-vendor.js";
export type {
  DefineVendorOptions,
  RegisteredVendor,
  ResolvedVendorCapabilities,
  ResolveVendorProcessFn,
  VendorCapabilities,
  VendorCatalog,
  VendorDefinition,
} from "./define-vendor.js";
export { Claude, Codex, Composer, Cursor, Jev } from "./builtins.js";
export type {
  ClaudeVendor,
  CodexVendor,
  ComposerVendor,
  JevVendor,
} from "./builtins.js";

/** Maps a structured-agent definition to a local ACP adapter subprocess. */
export function resolveVendorProcess(
  definition: StructuredAgentDefinitionBase<unknown>,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedVendorProcess {
  const registered = getRegisteredVendor(definition.vendor);
  if (registered === undefined) {
    throw new RuntimeUnknownVendorError(definition.vendor);
  }

  return registered.resolveProcess(definition, env);
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
  buildJevSessionConfig,
  JEV_API_KEY_ENV,
  JEV_BASE_URL_ENV,
  JEV_DEFAULT_TIMEOUT_MS,
  JEV_MODEL_ENV,
  JEV_SESSION_CONFIG_ENV,
  resolveJevProcess,
} from "./jev.js";
export type { JevSessionConfig } from "./jev.js";
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
