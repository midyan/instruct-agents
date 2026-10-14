import { describe, expect, it } from "vitest";

import {
  UnsupportedVendorOptionError,
  assertVendorDefinition,
} from "../../src/runtime/index.js";

describe("assertVendorDefinition", () => {
  it("allows reasoningEffort for Codex", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "openai",
        reasoningEffort: "high",
      }),
    ).not.toThrow();
  });

  it("rejects reasoningEffort for Cursor", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "cursor",
        reasoningEffort: "high",
      }),
    ).toThrow(UnsupportedVendorOptionError);
  });

  it("rejects reasoningEffort for Claude", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "anthropic",
        reasoningEffort: "medium",
      }),
    ).toThrow(/Codex \(openai\) vendor/);
  });

  it("allows definitions without reasoningEffort", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "cursor",
      }),
    ).not.toThrow();
  });
});
