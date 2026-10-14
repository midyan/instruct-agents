import type { StructuredAgentDefinitionBase } from "../runtime/types.js";
import type { ResolvedVendorProcess } from "./types.js";

export const CURSOR_AGENT_COMMAND_ENV = "CURSOR_AGENT_COMMAND";

/** Resolves the Cursor CLI executable, overridable through the environment. */
export function resolveCursorAgentCommand(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env[CURSOR_AGENT_COMMAND_ENV] ?? "agent";
}

/** Maps a Cursor definition to `agent --model <id> acp`. */
export function resolveCursorProcess(
  definition: Pick<StructuredAgentDefinitionBase<unknown>, "model">,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedVendorProcess {
  return {
    command: resolveCursorAgentCommand(env),
    args: ["--model", definition.model, "acp"],
  };
}
