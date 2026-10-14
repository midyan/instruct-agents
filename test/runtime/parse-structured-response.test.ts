import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseStructuredResponse } from "../../src/runtime/parse-structured-response.js";

const ResponseSchema = z.object({
  ok: z.boolean(),
});

describe("parseStructuredResponse", () => {
  it("returns typed data for valid JSON and schema", () => {
    const result = parseStructuredResponse('{"ok":true}', ResponseSchema);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ ok: true });
    }
  });

  it("reports invalid JSON", () => {
    const result = parseStructuredResponse("not json", ResponseSchema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure).toContain("valid JSON");
    }
  });

  it("reports schema validation failures", () => {
    const result = parseStructuredResponse('{"ok":"nope"}', ResponseSchema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.length).toBeGreaterThan(0);
    }
  });
});
