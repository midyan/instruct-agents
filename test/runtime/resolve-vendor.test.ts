import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  UnsupportedVendorOptionError,
  assertVendorDefinition,
} from "../../src/runtime/index.js";
import { defineVendor } from "../../src/vendors/define-vendor.js";

describe("assertVendorDefinition", () => {
  it("allows reasoningEffort for Codex", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "openai",
        reasoningEffort: "high",
      }),
    ).not.toThrow();
  });

  it("allows modelContextWindow for Codex", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "openai",
        modelContextWindow: 128_000,
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
    ).toThrow(/reasoningEffort is not supported for vendor "anthropic"/);
  });

  it("rejects reasoningEffort for a custom vendor without the capability", () => {
    const vendor = defineVendor({
      id: `test-no-reasoning-${randomUUID()}`,
      models: { default: "default" },
      resolveProcess: () => ({ command: "test-adapter", args: [] }),
    });

    expect(() =>
      assertVendorDefinition({
        vendor: vendor.vendor,
        reasoningEffort: "high",
      }),
    ).toThrow(UnsupportedVendorOptionError);
  });

  it("allows definitions without reasoningEffort", () => {
    expect(() =>
      assertVendorDefinition({
        vendor: "cursor",
      }),
    ).not.toThrow();
  });
});
