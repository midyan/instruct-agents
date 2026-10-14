import { spawn, type SpawnOptions } from "node:child_process";

import { CommandError, CommandTimeoutError } from "./errors.js";

export type RunCommandOptions = {
  command: string;
  args?: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
  allowFailure?: boolean;
};

export type CommandResult = {
  command: string;
  args: readonly string[];
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type SpawnCommandChild = {
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  stdin: NodeJS.WritableStream;
  once: (
    event: "close",
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ) => void;
  kill: (signal?: NodeJS.Signals) => boolean;
};

export type SpawnCommandFn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => SpawnCommandChild;

export type CommandDeps = {
  spawn?: SpawnCommandFn;
};

const defaultSpawn: SpawnCommandFn = (command, args, options) =>
  spawn(command, args, options) as unknown as SpawnCommandChild;

function collectStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function writeInput(
  stdin: NodeJS.WritableStream,
  input: string | undefined,
): void {
  if (!input) {
    stdin.end();
    return;
  }

  stdin.end(input);
}

function waitForClose(child: SpawnCommandChild): Promise<number | null> {
  return new Promise((resolve) => {
    child.once("close", (code) => {
      resolve(code);
    });
  });
}

function spawnPipedCommand(
  spawnFn: SpawnCommandFn,
  command: string,
  args: string[],
  options: Pick<RunCommandOptions, "cwd" | "env">,
): SpawnCommandChild {
  const spawned = spawnFn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (!spawned.stdin || !spawned.stdout || !spawned.stderr) {
    throw new Error("Failed to spawn command with piped stdio");
  }

  return {
    stdin: spawned.stdin,
    stdout: spawned.stdout,
    stderr: spawned.stderr,
    once: spawned.once.bind(spawned),
    kill: spawned.kill.bind(spawned),
  };
}

async function waitForCommandExit(
  child: SpawnCommandChild,
  timeoutMs?: number,
): Promise<number | null> {
  if (!timeoutMs) {
    return waitForClose(child);
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      waitForClose(child),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new CommandTimeoutError(timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function ensureSuccessfulExit(
  options: RunCommandOptions,
  result: CommandResult,
): void {
  if (!options.allowFailure && result.exitCode !== 0) {
    throw new CommandError(
      `${options.command} exited with code ${result.exitCode}`,
      result,
    );
  }
}

/** Runs a subprocess and returns captured stdout/stderr. */
export async function runCommand(
  options: RunCommandOptions,
  deps: CommandDeps = {},
): Promise<CommandResult> {
  const spawnFn = deps.spawn ?? defaultSpawn;
  const args = options.args ? [...options.args] : [];
  const child = spawnPipedCommand(spawnFn, options.command, args, options);

  writeInput(child.stdin, options.input);

  const stdoutPromise = collectStream(child.stdout);
  const stderrPromise = collectStream(child.stderr);
  const exitCode = await waitForCommandExit(child, options.timeoutMs);

  const result: CommandResult = {
    command: options.command,
    args,
    exitCode: exitCode ?? -1,
    stdout: await stdoutPromise,
    stderr: await stderrPromise,
  };

  ensureSuccessfulExit(options, result);
  return result;
}
