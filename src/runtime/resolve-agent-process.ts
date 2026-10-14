import { resolveVendorProcess } from "../vendors/index.js";
import type {
  ProcessOverride,
  RunStructuredAgentOptions,
  StructuredAgentDefinitionBase,
} from "./types.js";
import type { ResolvedVendorProcess } from "../vendors/types.js";

export type { ResolvedVendorProcess as ResolvedAgentProcess } from "../vendors/types.js";

function resolveProcessOverride(
  override: ProcessOverride,
): ResolvedVendorProcess {
  return {
    command: override.command,
    args: override.args ?? [],
  };
}

/** Resolves the ACP subprocess command for a definition or explicit override. */
export function resolveAgentProcess(
  definition: StructuredAgentDefinitionBase<unknown>,
  options?: RunStructuredAgentOptions,
): ResolvedVendorProcess {
  if (options?.process !== undefined) {
    return resolveProcessOverride(options.process);
  }

  return resolveVendorProcess(definition);
}
