import { describe, expect, it, vi } from "vitest";

import {
  isProcessAlive,
  killProcessGroup,
} from "../../src/runtime/process-group.js";

describe("process-group", () => {
  it("reports the current process as alive", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it("reports missing processes as not alive", () => {
    expect(isProcessAlive(9_999_999)).toBe(false);
  });

  it("ignores kill errors for missing process groups", () => {
    expect(() => killProcessGroup(9_999_999, "SIGKILL")).not.toThrow();
  });

  it("returns after a successful group kill", () => {
    const killSpy = vi.spyOn(process, "kill").mockReturnValue(true);

    killProcessGroup(500, "SIGTERM");

    expect(killSpy).toHaveBeenCalledOnce();
    expect(killSpy).toHaveBeenCalledWith(-500, "SIGTERM");
    killSpy.mockRestore();
  });

  it("ignores errors when both group and pid kills fail", () => {
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      throw new Error("gone");
    });

    expect(() => killProcessGroup(502, "SIGTERM")).not.toThrow();
    killSpy.mockRestore();
  });

  it("falls back to direct pid kill when group kill fails", () => {
    const killSpy = vi.spyOn(process, "kill").mockImplementation((pid) => {
      if (pid === -500) {
        throw new Error("no such process group");
      }

      return true;
    });

    killProcessGroup(500, "SIGTERM");

    expect(killSpy).toHaveBeenCalledWith(-500, "SIGTERM");
    expect(killSpy).toHaveBeenCalledWith(500, "SIGTERM");
    killSpy.mockRestore();
  });
});
