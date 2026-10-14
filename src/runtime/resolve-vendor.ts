import { UnsupportedVendorOptionError } from "./errors.js";
import type { StructuredAgentDefinition } from "./types.js";

export function assertVendorDefinition(
  definition: Pick<
    StructuredAgentDefinition,
    "vendor" | "reasoningEffort" | "modelContextWindow"
  >,
): void {
  if (
    definition.reasoningEffort !== undefined &&
    definition.vendor !== "openai"
  ) {
    throw new UnsupportedVendorOptionError(
      `reasoningEffort is supported only for the Codex (openai) vendor, not "${definition.vendor}"`,
    );
  }
}
