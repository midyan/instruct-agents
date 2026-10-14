import { enforceStructuredOutput } from "./enforce.js";
import { OverallRuntimeBudgetExhaustedError } from "./errors.js";
import { computeEffectiveTimeoutMs } from "./effective-timeout.js";
import { resolveAgentProcess } from "./resolve-agent-process.js";
import { createAgentRunObservability } from "./run-observability.js";
import { runAcpSession, type AcpSessionOptions } from "./runner.js";
import { runAgentProcessWithTimeout } from "./process-timeout.js";
import { spawnAgentProcess } from "./spawn-agent.js";
import type {
  ClientInfo,
  RunStructuredAgentOptions,
  StructuredAgentDefinition,
} from "./types.js";

export const DEFAULT_CLIENT_INFO: ClientInfo = {
  name: "structured-agents",
  version: "0.0.0",
};

function resolveClientInfo(options?: RunStructuredAgentOptions): ClientInfo {
  return options?.clientInfo ?? DEFAULT_CLIENT_INFO;
}

function buildSessionOptions<TIn, TOut>(
  definition: StructuredAgentDefinition<TIn, TOut>,
  clientInfo: ClientInfo,
  options?: RunStructuredAgentOptions,
  onSessionUpdate?: AcpSessionOptions["onSessionUpdate"],
): AcpSessionOptions {
  return {
    cwd: definition.cwd,
    clientInfo,
    trace: options?.trace,
    onStderr: options?.onStderr,
    onSessionUpdate,
  };
}

/** Executes a validated structured-agent turn through a local ACP session. */
export async function runStructuredAgent<TIn, TOut>(
  definition: StructuredAgentDefinition<TIn, TOut>,
  taskPrompt: string,
  options?: RunStructuredAgentOptions,
): Promise<TOut> {
  const startedAt = Date.now();
  const timeoutMs = computeEffectiveTimeoutMs({
    timeoutMs: options?.timeoutMs,
    defaultTimeoutMs: definition.defaultTimeoutMs,
    deadline: options?.deadline,
  });

  if (timeoutMs === null) {
    throw new OverallRuntimeBudgetExhaustedError();
  }

  const observability = await createAgentRunObservability({
    definition,
    runOptions: options,
    timeoutMs,
    startedAt,
  });

  try {
    await observability.notifyStart();

    const sessionOptions = buildSessionOptions(
      definition,
      resolveClientInfo(options),
      options,
      observability.handleSessionUpdate,
    );
    const process = resolveAgentProcess(definition, options);
    const agentProcess = spawnAgentProcess({
      command: process.command,
      args: process.args,
      cwd: sessionOptions.cwd,
      env: process.env,
      captureStderr: sessionOptions.onStderr !== undefined,
      onStderr: sessionOptions.onStderr,
    });

    observability.attachToProcess(agentProcess.stdout);

    const result = await runAgentProcessWithTimeout(
      agentProcess,
      timeoutMs,
      () =>
        runAcpSession(agentProcess, sessionOptions, (submitPrompt) =>
          enforceStructuredOutput({
            originalTask: taskPrompt,
            responseSchema: definition.responseSchema,
            submitPrompt: observability.wrapSubmitPrompt(submitPrompt),
          }),
        ),
    );

    await observability.notifySuccess(result);
    return result;
  } catch (error) {
    await observability.notifyFailure(error);
    throw error;
  } finally {
    observability.dispose();
  }
}
