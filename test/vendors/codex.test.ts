import { describe, expect, it } from "vitest";

import { Codex } from "../../src/runtime/vendors.js";
import {
  buildCodexSessionConfig,
  resolveCodexProcess,
} from "../../src/vendors/index.js";

describe("buildCodexSessionConfig", () => {
  it("includes model, context window, and reasoning effort", () => {
    expect(
      buildCodexSessionConfig({
        model: Codex.model.sol,
        modelContextWindow: 128_000,
        reasoningEffort: "high",
      }),
    ).toEqual({
      model: Codex.model.sol,
      model_context_window: 128_000,
      model_reasoning_effort: "high",
    });
  });
});

describe("resolveCodexProcess", () => {
  it("launches codex-acp with a fresh CODEX_CONFIG when none exists", () => {
    const resolved = resolveCodexProcess(
      {
        model: Codex.model.sol,
      },
      {},
    );

    expect(JSON.parse(resolved.env?.CODEX_CONFIG ?? "{}")).toEqual({
      model: Codex.model.sol,
    });
  });

  it("launches codex-acp with merged CODEX_CONFIG", () => {
    const resolved = resolveCodexProcess(
      {
        model: Codex.model.sol,
        reasoningEffort: "medium",
      },
      {
        CODEX_CONFIG: '{"model":"old-model","keep":true}',
      },
    );

    expect(resolved.args).toEqual([]);
    expect(resolved.command).toContain("codex-acp");
    expect(JSON.parse(resolved.env?.CODEX_CONFIG ?? "{}")).toEqual({
      keep: true,
      model: Codex.model.sol,
      model_reasoning_effort: "medium",
    });
  });

  it("defaults to process.env when env is omitted", () => {
    const resolved = resolveCodexProcess({
      model: Codex.model.sol,
    });

    expect(JSON.parse(resolved.env?.CODEX_CONFIG ?? "{}").model).toBe(
      Codex.model.sol,
    );
  });
});
