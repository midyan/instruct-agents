import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import { resolveModuleRelativePath } from "./resolve-package-bin.js";
import type { ResolvedVendorProcess } from "./types.js";

/** Canonical API key for JEV / System One (docs + CI). */
export const JEV_API_KEY_ENV = "JEV_API_KEY";
/** Optional TypeSafe API base; shim defaults to https://api.typesafe.ai. */
export const JEV_BASE_URL_ENV = "JEV_BASE_URL";
/** Model id from the agent definition (`jev-fast` / `jev-v1`). Set by resolve. */
export const JEV_MODEL_ENV = "JEV_MODEL";
/** JSON session config: `{ model, responseOptions }` for the ACP shim. */
export const JEV_SESSION_CONFIG_ENV = "JEV_SESSION_CONFIG";

/**
 * Recommended default timeout for JEV System One turns (cold start + Zod retries).
 * Callers may override via `defaultTimeoutMs` / `timeoutMs`.
 */
export const JEV_DEFAULT_TIMEOUT_MS = 60_000;

export type JevSessionConfig = {
  model: string;
  responseOptions: string[];
};

type JevDefinitionFields = Pick<
  StructuredAgentDefinitionBase<unknown>,
  "model" | "responseOptions"
>;

/** Builds the session config advertised through {@link JEV_SESSION_CONFIG_ENV}. */
export function buildJevSessionConfig(
  definition: JevDefinitionFields,
): JevSessionConfig {
  const responseOptions = definition.responseOptions;
  if (responseOptions === undefined || responseOptions.length === 0) {
    throw new Error(
      "JEV definitions require a non-empty responseOptions array for session config",
    );
  }

  return {
    model: definition.model,
    responseOptions: [...responseOptions],
  };
}

function mergeJevSessionConfig(
  definition: JevDefinitionFields,
  env: NodeJS.ProcessEnv,
): string {
  const existing = parseExistingJevSessionConfig(env[JEV_SESSION_CONFIG_ENV]);
  const built = buildJevSessionConfig(definition);
  return JSON.stringify({
    ...existing,
    ...built,
  });
}

function parseExistingJevSessionConfig(
  rawConfig: string | undefined,
): Partial<JevSessionConfig> {
  if (rawConfig === undefined || rawConfig.trim() === "") {
    return {};
  }

  return JSON.parse(rawConfig) as Partial<JevSessionConfig>;
}

/**
 * Maps a JEV definition to the in-repo ACP HTTP shim (Claude launcher pattern).
 *
 * Env contract (shim reads these):
 * - `JEV_API_KEY` (required at runtime; aliases `TYPESAFE_API_KEY` / `OPENROUTER_API_KEY`)
 * - `JEV_BASE_URL` (optional; default TypeSafe `https://api.typesafe.ai`)
 * - `JEV_MODEL` (catalog id from the definition)
 * - `JEV_SESSION_CONFIG` (JSON with `responseOptions` for Choice criteria)
 */
export function resolveJevProcess(
  definition: JevDefinitionFields,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedVendorProcess {
  const shimPath = resolveModuleRelativePath("./jev/jev-acp-shim.mjs");

  return {
    command: process.execPath,
    args: [shimPath],
    env: {
      ...env,
      [JEV_MODEL_ENV]: definition.model,
      [JEV_SESSION_CONFIG_ENV]: mergeJevSessionConfig(definition, env),
      ...(env[JEV_API_KEY_ENV] !== undefined
        ? { [JEV_API_KEY_ENV]: env[JEV_API_KEY_ENV] }
        : {}),
      ...(env[JEV_BASE_URL_ENV] !== undefined
        ? { [JEV_BASE_URL_ENV]: env[JEV_BASE_URL_ENV] }
        : {}),
    },
  };
}
