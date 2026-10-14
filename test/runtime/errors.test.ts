import { describe, expect, it } from "vitest";

import {
  AgentRuntimeNotImplementedError,
  OverallRuntimeBudgetExhaustedError,
  StructuredOutputError,
  TurnTimeoutError,
  UnknownVendorError,
  UnsupportedVendorOptionError,
} from "../../src/runtime/errors.js";

describe("StructuredOutputError", () => {
  it("stores reason and attempts", () => {
    const attempts = [
      {
        prompt: "task",
        rawText: "{",
        failure: "invalid json",
      },
    ];
    const error = new StructuredOutputError(
      "max_attempts",
      "structured output failed",
      attempts,
    );

    expect(error.name).toBe("StructuredOutputError");
    expect(error.reason).toBe("max_attempts");
    expect(error.message).toBe("structured output failed");
    expect(error.attempts).toEqual(attempts);
  });

  it("serializes to JSON for CI output", () => {
    const error = new StructuredOutputError(
      "stop_reason",
      "agent stopped early",
      [
        {
          prompt: "task",
          rawText: "done",
          stopReason: "cancelled",
        },
      ],
    );

    expect(error.toJSON()).toEqual({
      name: "StructuredOutputError",
      reason: "stop_reason",
      message: "agent stopped early",
      attempts: [
        {
          prompt: "task",
          rawText: "done",
          stopReason: "cancelled",
        },
      ],
    });
  });
});

describe("UnsupportedVendorOptionError", () => {
  it("uses a stable error name", () => {
    const error = new UnsupportedVendorOptionError("unsupported option");
    expect(error.name).toBe("UnsupportedVendorOptionError");
    expect(error.message).toBe("unsupported option");
  });
});

describe("AgentRuntimeNotImplementedError", () => {
  it("uses a stable error name", () => {
    const error = new AgentRuntimeNotImplementedError();
    expect(error.name).toBe("AgentRuntimeNotImplementedError");
  });
});

describe("TurnTimeoutError", () => {
  it("uses turn_timeout as its message", () => {
    const error = new TurnTimeoutError();
    expect(error.name).toBe("TurnTimeoutError");
    expect(error.message).toBe("turn_timeout");
  });
});

describe("UnknownVendorError", () => {
  it("names the unknown vendor", () => {
    const error = new UnknownVendorError("cursor");
    expect(error.name).toBe("UnknownVendorError");
    expect(error.message).toBe('Unknown vendor "cursor"');
  });
});

describe("OverallRuntimeBudgetExhaustedError", () => {
  it("uses overall_runtime_budget_exhausted as its message", () => {
    const error = new OverallRuntimeBudgetExhaustedError();
    expect(error.name).toBe("OverallRuntimeBudgetExhaustedError");
    expect(error.message).toBe("overall_runtime_budget_exhausted");
  });
});
