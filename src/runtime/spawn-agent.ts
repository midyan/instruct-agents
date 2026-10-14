import { spawn, type SpawnOptions } from "node:child_process";
import type { Readable, Writable } from "node:stream";

import {
  registerCleanupCallback,
  registerProcessGroup,
} from "./agent-children.js";
import {
  createNdjsonTransport,
  type NdjsonTransport,
} from "./ndjson-transport.js";
import { killProcessGroup } from "./process-group.js";

export const GRACEFUL_TERMINATION_MS = 1000;

export type SpawnAgentProcessOptions = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  captureStderr?: boolean;
  onStderr?: (chunk: Buffer) => void;
};

export type AgentProcess = {
  pid: number;
  pgid: number;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream | null;
  ndjson: NdjsonTransport;
  waitForExit: () => Promise<number | null>;
  terminateGracefully: () => Promise<void>;
  killImmediately: () => void;
  dispose: () => Promise<void>;
};

export type SpawnableChild = {
  pid: number | undefined;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream | null;
  once: (
    event: "exit",
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ) => void;
};

export type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => SpawnableChild;

function attachStderrHandlers(
  child: SpawnableChild,
  captureStderr: boolean | undefined,
  onStderr: ((chunk: Buffer) => void) | undefined,
): NodeJS.ReadableStream | null {
  if (!captureStderr || !child.stderr) {
    return null;
  }

  child.stderr.on("data", (chunk: Buffer) => {
    onStderr?.(chunk);
  });

  return child.stderr;
}

function waitForChildExit(child: SpawnableChild): Promise<number | null> {
  return new Promise((resolve) => {
    child.once("exit", (code) => {
      resolve(code);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function spawnAgentProcess(
  options: SpawnAgentProcessOptions,
  dependencies: { spawn?: SpawnFn } = {},
): AgentProcess {
  const spawnImpl = dependencies.spawn ?? (spawn as SpawnFn);
  const args = options.args ?? [];
  const spawned = spawnImpl(options.command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", options.captureStderr ? "pipe" : "inherit"],
    detached: true,
  });

  if (
    spawned.pid === undefined ||
    spawned.stdin === null ||
    spawned.stdout === null
  ) {
    throw new Error("Failed to spawn agent process");
  }

  const pid = spawned.pid;
  const pgid = pid;
  const child: SpawnableChild = {
    pid,
    stdin: spawned.stdin,
    stdout: spawned.stdout,
    stderr: spawned.stderr,
    once: spawned.once.bind(spawned),
  };
  const unregisterProcessGroup = registerProcessGroup(pgid);
  const ndjson = createNdjsonTransport(
    child.stdin as Writable,
    child.stdout as Readable,
  );
  const stderr = attachStderrHandlers(
    child,
    options.captureStderr,
    options.onStderr,
  );

  let disposed = false;

  const cleanup = async (signal: "graceful" | "immediate"): Promise<void> => {
    if (disposed) {
      return;
    }

    disposed = true;
    ndjson.close();

    if (signal === "immediate") {
      killProcessGroup(pgid, "SIGKILL");
    } else {
      killProcessGroup(pgid, "SIGTERM");
      await Promise.race([
        waitForChildExit(child),
        sleep(GRACEFUL_TERMINATION_MS),
      ]);
      killProcessGroup(pgid, "SIGKILL");
    }

    unregisterProcessGroup();
  };

  const unregisterCleanup = registerCleanupCallback(() => {
    void cleanup("immediate");
  });

  return {
    pid,
    pgid,
    stdin: child.stdin,
    stdout: child.stdout,
    stderr,
    ndjson,
    waitForExit: () => waitForChildExit(child),
    terminateGracefully: async () => {
      await cleanup("graceful");
      unregisterCleanup();
    },
    killImmediately: () => {
      void cleanup("immediate");
      unregisterCleanup();
    },
    dispose: async () => {
      await cleanup("graceful");
      unregisterCleanup();
    },
  };
}
