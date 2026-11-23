import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import type { ResolvedVendorProcess } from "./types.js";

export const JEV_API_KEY_ENV = "JEV_API_KEY";
export const JEV_BASE_URL_ENV = "JEV_BASE_URL";
export const JEV_MODEL_ENV = "JEV_MODEL";
export const JEV_SESSION_CONFIG_ENV = "JEV_SESSION_CONFIG";

/**
 * Recommended default timeout for JEV System One turns (cold start + Zod retries).
 * Callers may override via `defaultTimeoutMs` / `timeoutMs`.
 */
export const JEV_DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Placeholder until H11-114 lands the in-repo ACP HTTP shim.
 * Unit tests should pass `options.process` to avoid calling this.
 */
export function resolveJevProcess(
  _definition: Pick<StructuredAgentDefinitionBase<unknown>, "model">,
  _env?: NodeJS.ProcessEnv,
): ResolvedVendorProcess {
  void _definition;
  void _env;
  throw new Error(
    "JEV ACP shim is not implemented yet (H11-114). Pass RunStructuredAgentOptions.process in tests, or wait for the shim under src/vendors/jev/.",
  );
}
