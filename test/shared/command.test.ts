import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import {
  runCommand,
  type CommandDeps,
  type SpawnCommandChild,
  type SpawnCommandFn,
} from "../../src/shared/command.js";
import { CommandError, CommandTimeoutError } from "../../src/shared/errors.js";

function createMockChild(
  exitCode: number | null,
  stdout = "",
  stderr = "",
  delayMs = 0,
): SpawnCommandChild {
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  const stdinStream = new PassThrough();
  const kill = vi.fn((): boolean => true) as (
    signal?: NodeJS.Signals,
  ) => boolean;

  setTimeout(() => {
    if (stdout) {
      stdoutStream.write(stdout);
    }
    if (stderr) {
      stderrStream.write(stderr);
    }
    stdoutStream.end();
    stderrStream.end();
    closeListener?.(exitCode, null);
  }, delayMs);

  let closeListener:
    ((code: number | null, signal: NodeJS.Signals | null) => void) | undefined;

  return {
    stdout: stdoutStream,
    stderr: stderrStream,
    stdin: stdinStream,
    kill,
    once: (event, listener) => {
      if (event === "close") {
        closeListener = listener;
      }
    },
  };
}

describe("runCommand", () => {
  it("returns captured stdout and stderr on success", async () => {
    const spawn: SpawnCommandFn = () => createMockChild(0, "hello\n", "warn");
    const deps: CommandDeps = { spawn };
    const result = await runCommand({ command: "echo", args: ["hello"] }, deps);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello\n");
    expect(result.stderr).toBe("warn");
  });

  it("throws CommandError when the process exits non-zero", async () => {
    const spawn: SpawnCommandFn = () => createMockChild(1, "", "fatal");
    const deps: CommandDeps = { spawn };
    await expect(
      runCommand({ command: "git", args: ["status"] }, deps),
    ).rejects.toBeInstanceOf(CommandError);
  });

  it("returns non-zero results when allowFailure is set", async () => {
    const spawn: SpawnCommandFn = () => createMockChild(2, "", "oops");
    const deps: CommandDeps = { spawn };
    const result = await runCommand(
      { command: "git", args: ["status"], allowFailure: true },
      deps,
    );

    expect(result.exitCode).toBe(2);
  });

  it("writes stdin input before closing", async () => {
    const child = createMockChild(0, "ok");
    const endSpy = vi.spyOn(child.stdin, "end");

    const spawn: SpawnCommandFn = () => child;
    await runCommand({ command: "cat", input: "payload" }, { spawn });

    expect(endSpy).toHaveBeenCalledWith("payload");
  });

  it("collects string stdout chunks and null exit codes", async () => {
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    const stdinStream = new PassThrough();
    const spawn: SpawnCommandFn = () => ({
      stdout: stdoutStream,
      stderr: stderrStream,
      stdin: stdinStream,
      kill: () => true,
      once: (event, listener) => {
        if (event === "close") {
          stdoutStream.emit("data", "plain-text");
          stdoutStream.end();
          stderrStream.end();
          listener(null, null);
        }
      },
    });

    const result = await runCommand(
      { command: "echo", allowFailure: true },
      { spawn },
    );

    expect(result.stdout).toBe("plain-text");
    expect(result.exitCode).toBe(-1);
  });

  it("throws when spawn does not provide piped stdio", async () => {
    const spawn: SpawnCommandFn = () =>
      ({
        stdout: null,
        stderr: null,
        stdin: null,
        once: () => undefined,
        kill: () => true,
      }) as unknown as SpawnCommandChild;

    await expect(
      runCommand({ command: "git", args: ["status"] }, { spawn }),
    ).rejects.toThrow("Failed to spawn command with piped stdio");
  });

  it("rejects with CommandTimeoutError and kills the process", async () => {
    vi.useFakeTimers();
    const child = createMockChild(0, "late", "", 500);

    const spawn: SpawnCommandFn = () => child;
    const runPromise = runCommand(
      { command: "sleep", timeoutMs: 100 },
      { spawn },
    );

    const rejection =
      expect(runPromise).rejects.toBeInstanceOf(CommandTimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(vi.mocked(child.kill)).toHaveBeenCalledWith("SIGKILL");

    vi.useRealTimers();
  });
});
