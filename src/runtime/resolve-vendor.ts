import {
  DEFAULT_VENDOR_CAPABILITIES,
  getRegisteredVendor,
} from "../vendors/define-vendor.js";
// Ensure built-in vendors are registered before capability lookups.
import "../vendors/builtins.js";
import { UnsupportedVendorOptionError } from "./errors.js";
import type { StructuredAgentDefinition } from "./types.js";

export function assertVendorDefinition(
  definition: Pick<
    StructuredAgentDefinition,
    "vendor" | "reasoningEffort" | "modelContextWindow"
  >,
): void {
  const capabilities =
    getRegisteredVendor(definition.vendor)?.capabilities ??
    DEFAULT_VENDOR_CAPABILITIES;

  if (
    definition.reasoningEffort !== undefined &&
    !capabilities.reasoningEffort
  ) {
    throw new UnsupportedVendorOptionError(
      `reasoningEffort is not supported for vendor "${definition.vendor}"`,
    );
  }

  if (
    definition.modelContextWindow !== undefined &&
    !capabilities.modelContextWindow
  ) {
    throw new UnsupportedVendorOptionError(
      `modelContextWindow is not supported for vendor "${definition.vendor}"`,
    );
  }
}
