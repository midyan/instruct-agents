import { describe, expect, it, vi } from "vitest";

import * as agentChildren from "../../src/runtime/agent-children.js";
import * as processGroup from "../../src/runtime/process-group.js";

const {
  getHostSignalExitCode,
  getProcessRegistryStateForTests,
  handleHostSignal,
  installProcessSignalHandlers,
  isVitestEnvironment,
  killAllTrackedProcessGroups,
  markHostForceShutdownForTests,
  registerCleanupCallback,
  registerProcessGroup,
  resetProcessRegistryForTests,
  runRegisteredCleanups,
  setVitestDetectionOverrideForTests,
  shutdownAllProcessGroups,
} = agentChildren;

describe("agent-children", () => {
  it("detects the Vitest runtime", () => {
    expect(isVitestEnvironment()).toBe(true);
  });

  it("honors the Vitest detection override", () => {
    setVitestDetectionOverrideForTests(false);
    expect(isVitestEnvironment()).toBe(false);
    resetProcessRegistryForTests();
  });

  it("falls back to process.env.VITEST when no override is set", () => {
    resetProcessRegistryForTests();
    const previousVitest = process.env.VITEST;
    delete process.env.VITEST;

    expect(isVitestEnvironment()).toBe(false);

    process.env.VITEST = "1";
    expect(isVitestEnvironment()).toBe(true);

    if (previousVitest === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = previousVitest;
    }
  });

  it("runs non-forced shutdown when options are omitted", async () => {
    resetProcessRegistryForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    registerProcessGroup(555);

    await shutdownAllProcessGroups();

    expect(killSpy).toHaveBeenCalledWith(555, "SIGTERM");
    expect(killSpy).toHaveBeenCalledWith(555, "SIGKILL");
    killSpy.mockRestore();
  });

  it("tracks and untracks process groups", () => {
    resetProcessRegistryForTests();
    const unregister = registerProcessGroup(4242);

    expect(getProcessRegistryStateForTests().trackedProcessGroups).toEqual([
      4242,
    ]);

    unregister();
    expect(getProcessRegistryStateForTests().trackedProcessGroups).toEqual([]);
  });

  it("runs registered cleanup callbacks", async () => {
    resetProcessRegistryForTests();
    const cleanup = vi.fn();
    registerCleanupCallback(cleanup);

    await runRegisteredCleanups();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("kills all tracked process groups", () => {
    resetProcessRegistryForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    registerProcessGroup(111);
    registerProcessGroup(222);

    killAllTrackedProcessGroups("SIGTERM");
    killAllTrackedProcessGroups("SIGKILL");

    expect(killSpy).toHaveBeenCalledWith(111, "SIGTERM");
    expect(killSpy).toHaveBeenCalledWith(222, "SIGTERM");
    expect(killSpy).toHaveBeenCalledWith(111, "SIGKILL");
    expect(killSpy).toHaveBeenCalledWith(222, "SIGKILL");
    killSpy.mockRestore();
  });

  it("runs cleanups before killing groups during shutdown", async () => {
    resetProcessRegistryForTests();
    const order: string[] = [];
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation((_pgid, signal) => {
        order.push(`kill:${signal}`);
      });

    registerCleanupCallback(async () => {
      order.push("cleanup");
    });
    registerProcessGroup(333);

    await shutdownAllProcessGroups();

    expect(order).toEqual(["cleanup", "kill:SIGTERM", "kill:SIGKILL"]);
    killSpy.mockRestore();
  });

  it("supports forced shutdown without SIGTERM", async () => {
    resetProcessRegistryForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    registerProcessGroup(444);

    await shutdownAllProcessGroups({ force: true });

    expect(killSpy).toHaveBeenCalledWith(444, "SIGKILL");
    expect(killSpy).not.toHaveBeenCalledWith(444, "SIGTERM");
    killSpy.mockRestore();
  });

  it("does not install host signal handlers under Vitest", () => {
    resetProcessRegistryForTests();
    installProcessSignalHandlers();

    expect(getProcessRegistryStateForTests().signalHandlersInstalled).toBe(
      false,
    );
    expect(getProcessRegistryStateForTests().exitCleanupInstalled).toBe(true);
  });

  it("installs exit cleanup only once", () => {
    resetProcessRegistryForTests();
    installProcessSignalHandlers();
    const exitListenerCount = process.listenerCount("exit");

    installProcessSignalHandlers();

    expect(process.listenerCount("exit")).toBe(exitListenerCount);
    resetProcessRegistryForTests();
  });

  it("kills tracked groups on process exit", () => {
    resetProcessRegistryForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    registerProcessGroup(999);
    installProcessSignalHandlers();

    const exitListeners = process.listeners("exit") as Array<() => void>;
    exitListeners.at(-1)?.();

    expect(killSpy).toHaveBeenCalledWith(999, "SIGKILL");
    killSpy.mockRestore();
    resetProcessRegistryForTests();
  });

  it("invokes the SIGINT host handler", async () => {
    resetProcessRegistryForTests();
    setVitestDetectionOverrideForTests(false);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.spyOn(processGroup, "killProcessGroup").mockImplementation(
      () => undefined,
    );

    installProcessSignalHandlers();

    const sigintListener = process.listeners("SIGINT").at(-1) as
      (() => void) | undefined;
    sigintListener?.();

    await vi.waitFor(() => {
      expect(exitSpy).toHaveBeenCalledWith(130);
    });

    exitSpy.mockRestore();
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
    resetProcessRegistryForTests();
  });

  it("invokes the SIGTERM host handler", async () => {
    resetProcessRegistryForTests();
    setVitestDetectionOverrideForTests(false);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.spyOn(processGroup, "killProcessGroup").mockImplementation(
      () => undefined,
    );

    installProcessSignalHandlers();

    const sigtermListener = process.listeners("SIGTERM").at(-1) as
      (() => void) | undefined;
    sigtermListener?.();

    await vi.waitFor(() => {
      expect(exitSpy).toHaveBeenCalledWith(143);
    });

    exitSpy.mockRestore();
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
    resetProcessRegistryForTests();
  });

  it("does not install duplicate host signal handlers", () => {
    resetProcessRegistryForTests();
    setVitestDetectionOverrideForTests(false);

    installProcessSignalHandlers();
    const sigintCount = process.listenerCount("SIGINT");

    installProcessSignalHandlers();

    expect(process.listenerCount("SIGINT")).toBe(sigintCount);

    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
    resetProcessRegistryForTests();
  });

  it("installs host signal handlers outside Vitest", () => {
    resetProcessRegistryForTests();
    setVitestDetectionOverrideForTests(false);

    installProcessSignalHandlers();

    expect(getProcessRegistryStateForTests().signalHandlersInstalled).toBe(
      true,
    );

    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
    resetProcessRegistryForTests();
  });

  it("maps host signal exit codes", () => {
    expect(getHostSignalExitCode("SIGINT")).toBe(130);
    expect(getHostSignalExitCode("SIGTERM")).toBe(143);
  });

  it("handles the first host signal by shutting down", async () => {
    resetProcessRegistryForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    registerProcessGroup(123);

    await handleHostSignal("SIGINT");

    expect(killSpy).toHaveBeenCalledWith(123, "SIGTERM");
    expect(killSpy).toHaveBeenCalledWith(123, "SIGKILL");
    expect(exitSpy).toHaveBeenCalledWith(130);

    killSpy.mockRestore();
    exitSpy.mockRestore();
    resetProcessRegistryForTests();
  });

  it("ignores duplicate host signals until force shutdown is requested", async () => {
    resetProcessRegistryForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    registerProcessGroup(123);

    await handleHostSignal("SIGTERM");
    await handleHostSignal("SIGTERM");

    expect(killSpy).toHaveBeenCalledTimes(2);
    expect(exitSpy).toHaveBeenCalledOnce();

    killSpy.mockRestore();
    exitSpy.mockRestore();
    resetProcessRegistryForTests();
  });

  it("force-kills tracked groups on a forced host signal", async () => {
    resetProcessRegistryForTests();
    markHostForceShutdownForTests();
    const killSpy = vi
      .spyOn(processGroup, "killProcessGroup")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    registerProcessGroup(123);

    await handleHostSignal("SIGINT");

    expect(killSpy).toHaveBeenCalledWith(123, "SIGKILL");
    expect(exitSpy).toHaveBeenCalledWith(130);

    killSpy.mockRestore();
    exitSpy.mockRestore();
    resetProcessRegistryForTests();
  });
});
