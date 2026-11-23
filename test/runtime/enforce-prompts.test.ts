import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildCorrectionPrompt,
  buildInitialStructuredPrompt,
  getResponseJsonSchema,
} from "../../src/runtime/enforce-prompts.js";

const ResponseSchema = z.object({
  ok: z.boolean(),
});

describe("buildInitialStructuredPrompt", () => {
  it("appends JSON-only instructions and schema", () => {
    const prompt = buildInitialStructuredPrompt(
      "Inspect the repository.",
      ResponseSchema,
    );

    expect(prompt).toContain("Inspect the repository.");
    expect(prompt).toContain("Return your response as JSON only.");
    expect(prompt).toContain('"ok"');
    expect(prompt).toContain(
      JSON.stringify(getResponseJsonSchema(ResponseSchema), null, 2),
    );
  });

  it("lists allowed next labels when responseOptions are provided", () => {
    const prompt = buildInitialStructuredPrompt(
      "Choose next.",
      ResponseSchema,
      ["implement", "review_only"] as const,
    );

    expect(prompt).toContain(
      'Allowed values for "next": implement | review_only',
    );
  });
});

describe("buildCorrectionPrompt", () => {
  it("includes the original task, previous output, failure, and schema", () => {
    const prompt = buildCorrectionPrompt(
      "Inspect the repository.",
      '{"ok":"nope"}',
      "Expected boolean, received string",
      ResponseSchema,
    );

    expect(prompt).toContain("Inspect the repository.");
    expect(prompt).toContain('{"ok":"nope"}');
    expect(prompt).toContain("Expected boolean, received string");
    expect(prompt).toContain("Return JSON only.");
  });
});
