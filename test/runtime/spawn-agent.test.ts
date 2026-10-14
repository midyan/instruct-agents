import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  resetProcessRegistryForTests,
  runRegisteredCleanups,
} from "../../src/runtime/agent-children.js";
import { isProcessAlive } from "../../src/runtime/process-group.js";
import { spawnAgentProcess } from "../../src/runtime/spawn-agent.js";

function createMockChild(pid = 4242) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = new EventEmitter() as EventEmitter & {
    pid: number;
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };

  child.pid = pid;
  child.stdin = stdin;
  child.stdout = stdout;
  child.stderr = stderr;
  child.kill = vi.fn();

  return child;
}

describe("spawnAgentProcess", () => {
  it("throws when spawn does not return a pid", () => {
    resetProcessRegistryForTests();

    expect(() =>
      spawnAgentProcess(
        { command: "agent", args: [] },
        {
          spawn: () => {
            const child = createMockChild();
            child.pid = undefined as unknown as number;
            return child;
          },
        },
      ),
    ).toThrow("Failed to spawn agent process");
  });

  it("forwards captured stderr chunks to onStderr", async () => {
    resetProcessRegistryForTests();
    const child = createMockChild(778);
    const onStderr = vi.fn();

    spawnAgentProcess(
      {
        command: "agent",
        args: [],
        captureStderr: true,
        onStderr,
      },
      { spawn: () => child },
    );

    child.stderr.emit("data", Buffer.from("warning"));

    expect(onStderr).toHaveBeenCalledWith(Buffer.from("warning"));
  });

  it("waits for child exit", async () => {
    resetProcessRegistryForTests();
    const child = createMockChild(779);

    const agent = spawnAgentProcess(
      { command: "agent", args: [] },
      { spawn: () => child },
    );

    setTimeout(() => {
      child.emit("exit", 0, null);
    }, 10);

    await expect(agent.waitForExit()).resolves.toBe(0);
  });

  it("registers the process group and exposes NDJSON transport", () => {
    resetProcessRegistryForTests();
    const child = createMockChild(777);

    const agent = spawnAgentProcess(
      { command: "agent", args: ["acp"], captureStderr: true },
      { spawn: () => child },
    );

    expect(agent.pgid).toBe(777);
    expect(agent.stderr).not.toBeNull();
    expect(agent.ndjson).toBeDefined();
  });

  it("inherits stderr when captureStderr is disabled", () => {
    resetProcessRegistryForTests();
    const child = createMockChild(776);

    const agent = spawnAgentProcess(
      { command: "agent", args: ["acp"] },
      { spawn: () => child },
    );

    expect(agent.stderr).toBeNull();
  });

  it("terminates gracefully with SIGTERM then SIGKILL", async () => {
    resetProcessRegistryForTests();
    const child = createMockChild(888);
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

    const agent = spawnAgentProcess(
      { command: "agent", args: [] },
      { spawn: () => child },
    );

    setTimeout(() => {
      child.emit("exit", 0, null);
    }, 10);

    await agent.terminateGracefully();

    expect(killSpy).toHaveBeenCalledWith(-888, "SIGTERM");
    expect(killSpy).toHaveBeenCalledWith(-888, "SIGKILL");
    killSpy.mockRestore();
  });

  it("kills the process group immediately on timeout cleanup", () => {
    resetProcessRegistryForTests();
    const child = createMockChild(999);
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

    const agent = spawnAgentProcess(
      { command: "agent", args: [] },
      { spawn: () => child },
    );

    agent.killImmediately();

    expect(killSpy).toHaveBeenCalledWith(-999, "SIGKILL");
    killSpy.mockRestore();
  });

  it("runs spawn cleanup callbacks during global cleanup", async () => {
    resetProcessRegistryForTests();
    const child = createMockChild(880);
    const killSpy = vi.spyOn(process, "kill").mockReturnValue(true);

    spawnAgentProcess({ command: "agent", args: [] }, { spawn: () => child });

    await runRegisteredCleanups();

    expect(killSpy).toHaveBeenCalledWith(-880, "SIGKILL");
    killSpy.mockRestore();
  });

  it("kills a spawned grandchild via process-group cleanup", async () => {
    resetProcessRegistryForTests();
    const fixturePath = fileURLToPath(
      new URL("../fixtures/spawn-grandchild.mjs", import.meta.url),
    );

    const agent = spawnAgentProcess({
      command: process.execPath,
      args: [fixturePath],
    });

    const grandchildPid = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("timed out waiting for grandchild")),
        5_000,
      );

      agent.stdout.once("data", (chunk: Buffer) => {
        clearTimeout(timeout);
        const match = chunk.toString().match(/ready:(\d+)/);
        if (!match?.[1]) {
          reject(new Error("missing grandchild pid"));
          return;
        }

        resolve(Number(match[1]));
      });
    });

    expect(isProcessAlive(grandchildPid)).toBe(true);

    await agent.dispose();

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    expect(isProcessAlive(grandchildPid)).toBe(false);
    expect(isProcessAlive(agent.pid)).toBe(false);
  });
});
