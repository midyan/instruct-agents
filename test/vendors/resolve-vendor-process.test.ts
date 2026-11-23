import { describe, expect, it } from "vitest";

import { Claude, Codex, Composer, Jev } from "../../src/runtime/vendors.js";
import {
  UnknownVendorError,
  resolveVendorProcess,
} from "../../src/vendors/index.js";

describe("resolveVendorProcess", () => {
  it("resolves Cursor definitions to the Cursor CLI adapter", () => {
    expect(
      resolveVendorProcess({
        vendor: Composer.vendor,
        model: Composer.model.composer25,
        cwd: "/tmp",
        responseSchema: {} as never,
      }).args,
    ).toEqual(["--model", Composer.model.composer25, "acp"]);
  });

  it("resolves Claude definitions through the guarded launcher", () => {
    const resolved = resolveVendorProcess({
      vendor: Claude.vendor,
      model: Claude.model.sonnet,
      cwd: "/tmp",
      responseSchema: {} as never,
    });

    expect(resolved.command).toBe(process.execPath);
    expect(resolved.env?.ANTHROPIC_MODEL).toBe(Claude.model.sonnet);
  });

  it("resolves Codex definitions to codex-acp", () => {
    const resolved = resolveVendorProcess({
      vendor: Codex.vendor,
      model: Codex.model.sol,
      cwd: "/tmp",
      responseSchema: {} as never,
    });

    expect(resolved.command).toContain("codex-acp");
  });

  it("resolves JEV definitions through the ACP HTTP shim", () => {
    const resolved = resolveVendorProcess({
      vendor: Jev.vendor,
      model: Jev.model.v1,
      cwd: "/tmp",
      responseSchema: {} as never,
      responseOptions: ["implement", "review_only"] as const,
    });

    expect(resolved.command).toBe(process.execPath);
    expect(resolved.args[0]).toContain("jev-acp-shim.mjs");
    expect(resolved.env?.JEV_MODEL).toBe(Jev.model.v1);
    expect(JSON.parse(resolved.env?.JEV_SESSION_CONFIG ?? "{}")).toEqual({
      model: Jev.model.v1,
      responseOptions: ["implement", "review_only"],
    });
  });

  it("throws for unknown vendor ids", () => {
    expect(() =>
      resolveVendorProcess({
        vendor: "unknown",
        model: "m",
        cwd: "/tmp",
        responseSchema: {} as never,
      }),
    ).toThrow(UnknownVendorError);
  });
});
