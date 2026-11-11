import { DuplicateVendorError } from "../runtime/errors.js";
import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import type { ResolvedVendorProcess } from "./types.js";

/**
 * Feature flags a vendor may advertise for structured-agent definition validation.
 *
 * Omitted flags default to `false` (unsupported). Built-ins set these explicitly:
 * Codex enables both; Cursor and Claude disable both.
 */
export type VendorCapabilities = {
  /**
   * Whether `reasoningEffort` may be set on structured-agent definitions.
   * @default false
   */
  reasoningEffort?: boolean;
  /**
   * Whether `modelContextWindow` may be set on structured-agent definitions.
   * @default false
   */
  modelContextWindow?: boolean;
};

/** Resolved capability flags after applying documented defaults. */
export type ResolvedVendorCapabilities = {
  reasoningEffort: boolean;
  modelContextWindow: boolean;
};

/** Documented defaults for {@link VendorCapabilities}. */
export const DEFAULT_VENDOR_CAPABILITIES: ResolvedVendorCapabilities = {
  reasoningEffort: false,
  modelContextWindow: false,
};

/** Applies {@link DEFAULT_VENDOR_CAPABILITIES} to a partial capabilities object. */
export function resolveVendorCapabilities(
  capabilities?: VendorCapabilities,
): ResolvedVendorCapabilities {
  return {
    reasoningEffort:
      capabilities?.reasoningEffort ??
      DEFAULT_VENDOR_CAPABILITIES.reasoningEffort,
    modelContextWindow:
      capabilities?.modelContextWindow ??
      DEFAULT_VENDOR_CAPABILITIES.modelContextWindow,
  };
}

export type ResolveVendorProcessFn = (
  definition: StructuredAgentDefinitionBase<unknown>,
  env?: NodeJS.ProcessEnv,
) => ResolvedVendorProcess;

export type DefineVendorOptions<
  TId extends string = string,
  TModels extends Record<string, string> = Record<string, string>,
> = {
  id: TId;
  models: TModels;
  resolveProcess: ResolveVendorProcessFn;
  capabilities?: VendorCapabilities;
};

/** Input shape passed to {@link defineVendor}. */
export type VendorDefinition<
  TId extends string = string,
  TModels extends Record<string, string> = Record<string, string>,
> = DefineVendorOptions<TId, TModels>;

export type VendorCatalog<
  TId extends string = string,
  TModels extends Record<string, string> = Record<string, string>,
> = {
  vendor: TId;
  model: TModels;
};

export type RegisteredVendor = {
  id: string;
  resolveProcess: ResolveVendorProcessFn;
  capabilities: ResolvedVendorCapabilities;
};

const vendorRegistry = new Map<string, RegisteredVendor>();

/** Returns the registered vendor entry, or `undefined` when the id is unknown. */
export function getRegisteredVendor(id: string): RegisteredVendor | undefined {
  return vendorRegistry.get(id);
}

/**
 * Registers a vendor in the in-process registry and returns a catalog shaped
 * like the built-in `Composer` / `Claude` / `Codex` exports (`{ vendor, model }`).
 */
export function defineVendor<
  const TId extends string,
  const TModels extends Record<string, string>,
>(options: DefineVendorOptions<TId, TModels>): VendorCatalog<TId, TModels> {
  if (vendorRegistry.has(options.id)) {
    throw new DuplicateVendorError(options.id);
  }

  vendorRegistry.set(options.id, {
    id: options.id,
    resolveProcess: options.resolveProcess,
    capabilities: resolveVendorCapabilities(options.capabilities),
  });

  return {
    vendor: options.id,
    model: options.models,
  };
}
