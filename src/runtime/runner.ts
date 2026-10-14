import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";

import {
  CURSOR_LOGIN_METHOD_ID,
  createStructuredAgentClientApp,
  type StructuredAgentClientOptions,
} from "./client.js";
import type { SubmitStructuredOutputPrompt } from "./enforce.js";
import {
  spawnAgentProcess,
  type AgentProcess,
  type SpawnAgentProcessOptions,
} from "./spawn-agent.js";
import type { ClientInfo } from "./types.js";

export type AcpSessionOptions = {
  cwd: string;
  clientInfo: ClientInfo;
  trace?: boolean | NodeJS.WritableStream;
  onSessionUpdate?: StructuredAgentClientOptions["onSessionUpdate"];
  onStderr?: (chunk: Buffer) => void;
};

export type RunAgentSessionOptions = AcpSessionOptions & {
  command: string;
  args?: string[];
};

function createAcpStream(agentProcess: AgentProcess): acp.Stream {
  const input = Writable.toWeb(agentProcess.stdin as Writable);
  const output = Readable.toWeb(agentProcess.stdout as Readable);
  return acp.ndJsonStream(input, output);
}

function advertisesCursorLogin(
  authMethods: acp.InitializeResponse["authMethods"],
): boolean {
  return (authMethods ?? []).some(
    (method) => method.id === CURSOR_LOGIN_METHOD_ID,
  );
}

async function authenticateCursorLogin(
  ctx: acp.ClientContext,
  initResult: acp.InitializeResponse,
): Promise<void> {
  if (!advertisesCursorLogin(initResult.authMethods)) {
    return;
  }

  await ctx.request(acp.methods.agent.authenticate, {
    methodId: CURSOR_LOGIN_METHOD_ID,
  });
}

async function submitStructuredPrompt(
  session: acp.ActiveSession,
  prompt: string,
): Promise<{ rawText: string; stopReason?: string }> {
  const textPromise = session.readText();
  const response = await session.prompt(prompt);
  const rawText = await textPromise;

  return {
    rawText,
    stopReason: response.stopReason,
  };
}

async function runStructuredPromptLoop<T>(
  ctx: acp.ClientContext,
  cwd: string,
  run: (submitPrompt: SubmitStructuredOutputPrompt) => Promise<T>,
): Promise<T> {
  return ctx.buildSession(cwd).withSession(async (session) => {
    const submitPrompt: SubmitStructuredOutputPrompt = async (prompt) =>
      submitStructuredPrompt(session, prompt);

    return run(submitPrompt);
  });
}

/** Runs ACP initialization and session work on an already-spawned adapter process. */
export async function runAcpSession<T>(
  agentProcess: AgentProcess,
  options: AcpSessionOptions,
  run: (submitPrompt: SubmitStructuredOutputPrompt) => Promise<T>,
): Promise<T> {
  const clientApp = createStructuredAgentClientApp({
    clientInfo: options.clientInfo,
    trace: options.trace,
    onSessionUpdate: options.onSessionUpdate,
  });
  const stream = createAcpStream(agentProcess);

  return clientApp.connectWith(stream, async (ctx) => {
    const initResult = await ctx.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: {
        name: options.clientInfo.name,
        version: options.clientInfo.version,
      },
    });

    await authenticateCursorLogin(ctx, initResult);
    return runStructuredPromptLoop(ctx, options.cwd, run);
  });
}

function toSpawnOptions(
  options: RunAgentSessionOptions,
): SpawnAgentProcessOptions {
  return {
    command: options.command,
    args: options.args,
    cwd: options.cwd,
    captureStderr: options.onStderr !== undefined,
    onStderr: options.onStderr,
  };
}

/** Spawns an ACP adapter, initializes a session, and runs structured-output work. */
export async function runAgentSession<T>(
  options: RunAgentSessionOptions,
  run: (submitPrompt: SubmitStructuredOutputPrompt) => Promise<T>,
): Promise<{ value: T; agentProcess: AgentProcess }> {
  const agentProcess = spawnAgentProcess(toSpawnOptions(options));
  const value = await runAcpSession(agentProcess, options, run);
  return { value, agentProcess };
}
