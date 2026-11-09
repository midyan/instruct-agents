import { DuplicateVendorError } from "../runtime/errors.js";
import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import type { ResolvedVendorProcess } from "./types.js";

/** Optional feature flags a vendor may advertise for later validation. */
export type VendorCapabilities = {
  reasoningEffort?: boolean;
  modelContextWindow?: boolean;
};

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
  capabilities?: VendorCapabilities;
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
    capabilities: options.capabilities,
  });

  return {
    vendor: options.id,
    model: options.models,
  };
}
