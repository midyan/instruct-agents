import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { Claude } from "../../src/runtime/vendors.js";
import {
  ANTHROPIC_MODEL_ENV,
  resolveClaudeProcess,
} from "../../src/vendors/index.js";

describe("resolveClaudeProcess", () => {
  it("wraps claude-agent-acp with guards and ANTHROPIC_MODEL", () => {
    const resolved = resolveClaudeProcess(
      {
        model: Claude.model.sonnet,
      },
      {},
    );

    expect(resolved.command).toBe(process.execPath);
    expect(resolved.args[0]).toContain("claude-launcher.mjs");
    expect(existsSync(resolved.args[0]!)).toBe(true);
    expect(resolved.args[1]).toContain("claude-agent-acp");
    expect(resolved.env?.[ANTHROPIC_MODEL_ENV]).toBe(Claude.model.sonnet);
  });

  it("defaults to process.env when env is omitted", () => {
    const resolved = resolveClaudeProcess({
      model: Claude.model.sonnet,
    });

    expect(resolved.env?.[ANTHROPIC_MODEL_ENV]).toBe(Claude.model.sonnet);
  });
});
