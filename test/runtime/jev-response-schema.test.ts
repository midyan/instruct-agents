import { describe, expect, it } from "vitest";

import { buildJevResponseSchema } from "../../src/runtime/jev-response-schema.js";

describe("buildJevResponseSchema", () => {
  const schema = buildJevResponseSchema([
    "implement",
    "review_only",
    "escalate_system2",
  ] as const);

  it("parses a valid decision", () => {
    expect(schema.parse({ next: "implement", confidence: 0.82 })).toEqual({
      next: "implement",
      confidence: 0.82,
    });
  });

  it("rejects an unknown next label", () => {
    const result = schema.safeParse({ next: "skip", confidence: 0.5 });
    expect(result.success).toBe(false);
  });

  it("rejects confidence below 0", () => {
    const result = schema.safeParse({ next: "implement", confidence: -0.01 });
    expect(result.success).toBe(false);
  });

  it("rejects confidence above 1", () => {
    const result = schema.safeParse({ next: "implement", confidence: 1.01 });
    expect(result.success).toBe(false);
  });

  it("accepts confidence bounds 0 and 1", () => {
    expect(schema.parse({ next: "review_only", confidence: 0 })).toEqual({
      next: "review_only",
      confidence: 0,
    });
    expect(schema.parse({ next: "escalate_system2", confidence: 1 })).toEqual({
      next: "escalate_system2",
      confidence: 1,
    });
  });
});
