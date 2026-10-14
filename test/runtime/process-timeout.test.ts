import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import { resetProcessRegistryForTests } from "../../src/runtime/agent-children.js";
import { TurnTimeoutError } from "../../src/runtime/errors.js";
import { runAgentProcessWithTimeout } from "../../src/runtime/process-timeout.js";
import { spawnAgentProcess } from "../../src/runtime/spawn-agent.js";

function createMockChild(pid = 5150) {
  const child = new EventEmitter() as EventEmitter & {
    pid: number;
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
  };

  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.pid = pid;

  return child;
}

describe("runAgentProcessWithTimeout", () => {
  it("completes when the run finishes before the timeout", async () => {
    resetProcessRegistryForTests();
    const child = createMockChild(6161);
    const agent = spawnAgentProcess(
      { command: "agent", args: [] },
      { spawn: () => child },
    );
    const disposeSpy = vi.spyOn(agent, "dispose").mockResolvedValue(undefined);

    await runAgentProcessWithTimeout(agent, 1_000, async () => undefined);

    expect(disposeSpy).toHaveBeenCalledOnce();
    disposeSpy.mockRestore();
  });

  it("rejects with turn_timeout and disposes the process", async () => {
    resetProcessRegistryForTests();
    vi.useFakeTimers();
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    const child = createMockChild(5150);
    const agent = spawnAgentProcess(
      { command: "agent", args: [] },
      { spawn: () => child },
    );
    const disposeSpy = vi.spyOn(agent, "dispose");

    const runPromise = runAgentProcessWithTimeout(agent, 100, async () => {
      await new Promise(() => {
        // never resolves
      });
    });

    const rejection =
      expect(runPromise).rejects.toBeInstanceOf(TurnTimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(disposeSpy).toHaveBeenCalledOnce();
    expect(killSpy).toHaveBeenCalledWith(-5150, "SIGKILL");

    killSpy.mockRestore();
    vi.useRealTimers();
  });
});
