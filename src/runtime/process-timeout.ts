import { TurnTimeoutError } from "./errors.js";
import type { AgentProcess } from "./spawn-agent.js";

export async function runAgentProcessWithTimeout<T>(
  agentProcess: AgentProcess,
  timeoutMs: number,
  run: () => Promise<T>,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      agentProcess.killImmediately();
      reject(new TurnTimeoutError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
    await agentProcess.dispose();
  }
}
