import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { Jev } from "../../src/runtime/vendors.js";
import {
  JEV_API_KEY_ENV,
  JEV_BASE_URL_ENV,
  JEV_MODEL_ENV,
  JEV_SESSION_CONFIG_ENV,
  buildJevSessionConfig,
  resolveJevProcess,
} from "../../src/vendors/index.js";

const RESPONSE_OPTIONS = ["implement", "review_only", "escalate"] as const;

describe("buildJevSessionConfig", () => {
  it("includes model and responseOptions", () => {
    expect(
      buildJevSessionConfig({
        model: Jev.model.v1,
        responseOptions: RESPONSE_OPTIONS,
      }),
    ).toEqual({
      model: Jev.model.v1,
      responseOptions: ["implement", "review_only", "escalate"],
    });
  });

  it("throws when responseOptions are missing", () => {
    expect(() =>
      buildJevSessionConfig({
        model: Jev.model.fast,
      }),
    ).toThrow(/responseOptions/);
  });
});

describe("resolveJevProcess", () => {
  it("launches the in-repo ACP shim with model and session config", () => {
    const resolved = resolveJevProcess(
      {
        model: Jev.model.fast,
        responseOptions: RESPONSE_OPTIONS,
      },
      {
        [JEV_API_KEY_ENV]: "test-key",
      },
    );

    expect(resolved.command).toBe(process.execPath);
    expect(resolved.args).toHaveLength(1);
    expect(resolved.args[0]).toContain("jev-acp-shim.mjs");
    expect(existsSync(resolved.args[0]!)).toBe(true);
    expect(resolved.env?.[JEV_MODEL_ENV]).toBe(Jev.model.fast);
    expect(resolved.env?.[JEV_API_KEY_ENV]).toBe("test-key");
    expect(JSON.parse(resolved.env?.[JEV_SESSION_CONFIG_ENV] ?? "{}")).toEqual({
      model: Jev.model.fast,
      responseOptions: ["implement", "review_only", "escalate"],
    });
  });

  it("forwards optional JEV_BASE_URL and merges existing session config", () => {
    const resolved = resolveJevProcess(
      {
        model: Jev.model.v1,
        responseOptions: RESPONSE_OPTIONS,
      },
      {
        [JEV_BASE_URL_ENV]: "https://example.test",
        [JEV_SESSION_CONFIG_ENV]: '{"keep":true,"model":"old"}',
      },
    );

    expect(resolved.env?.[JEV_BASE_URL_ENV]).toBe("https://example.test");
    expect(JSON.parse(resolved.env?.[JEV_SESSION_CONFIG_ENV] ?? "{}")).toEqual({
      keep: true,
      model: Jev.model.v1,
      responseOptions: ["implement", "review_only", "escalate"],
    });
  });

  it("defaults to process.env when env is omitted", () => {
    const resolved = resolveJevProcess({
      model: Jev.model.v1,
      responseOptions: RESPONSE_OPTIONS,
    });

    expect(resolved.env?.[JEV_MODEL_ENV]).toBe(Jev.model.v1);
    expect(
      JSON.parse(resolved.env?.[JEV_SESSION_CONFIG_ENV] ?? "{}").model,
    ).toBe(Jev.model.v1);
  });
});
