import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import {
  resolveModuleRelativePath,
  resolvePackageBin,
} from "./resolve-package-bin.js";
import type { ResolvedVendorProcess } from "./types.js";

export const ANTHROPIC_MODEL_ENV = "ANTHROPIC_MODEL";

/** Maps a Claude definition to claude-agent-acp with model env and import guards. */
export function resolveClaudeProcess(
  definition: Pick<StructuredAgentDefinitionBase<unknown>, "model">,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedVendorProcess {
  const adapterPath = resolvePackageBin(
    "@agentclientprotocol/claude-agent-acp",
    "claude-agent-acp",
  );
  const launcherPath = resolveModuleRelativePath(
    "./claude/claude-launcher.mjs",
  );

  return {
    command: process.execPath,
    args: [launcherPath, adapterPath],
    env: {
      ...env,
      [ANTHROPIC_MODEL_ENV]: definition.model,
    },
  };
}
