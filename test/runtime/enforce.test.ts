import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  StructuredOutputError,
  buildInitialStructuredPrompt,
  enforceStructuredOutput,
} from "../../src/runtime/index.js";

const ResponseSchema = z.object({
  ok: z.boolean(),
});

describe("enforceStructuredOutput", () => {
  it("returns typed output on the first valid response", async () => {
    const result = await enforceStructuredOutput({
      originalTask: "Return success.",
      responseSchema: ResponseSchema,
      submitPrompt: () => ({ rawText: '{"ok":true}' }),
    });

    expect(result).toEqual({ ok: true });
  });

  it("retries with a correction prompt after schema failure", async () => {
    const prompts: string[] = [];

    const result = await enforceStructuredOutput({
      originalTask: "Return success.",
      responseSchema: ResponseSchema,
      submitPrompt: (prompt, attemptIndex) => {
        prompts.push(prompt);

        if (attemptIndex === 0) {
          return { rawText: '{"ok":"nope"}' };
        }

        return { rawText: '{"ok":true}' };
      },
    });

    expect(result).toEqual({ ok: true });
    expect(prompts[0]).toBe(
      buildInitialStructuredPrompt("Return success.", ResponseSchema),
    );
    expect(prompts[1]).toContain("Your previous response did not satisfy");
    expect(prompts[1]).toContain('{"ok":"nope"}');
  });

  it("throws StructuredOutputError after max attempts", async () => {
    await expect(
      enforceStructuredOutput({
        originalTask: "Return success.",
        responseSchema: ResponseSchema,
        submitPrompt: () => ({ rawText: "not json" }),
        maxAttempts: 3,
      }),
    ).rejects.toMatchObject({
      name: "StructuredOutputError",
      reason: "max_attempts",
      attempts: [
        { failure: expect.stringContaining("valid JSON") },
        { failure: expect.stringContaining("valid JSON") },
        { failure: expect.stringContaining("valid JSON") },
      ],
    });
  });

  it("throws StructuredOutputError for non-end_turn stop reasons", async () => {
    try {
      await enforceStructuredOutput({
        originalTask: "Return success.",
        responseSchema: ResponseSchema,
        submitPrompt: () => ({
          rawText: '{"ok":true}',
          stopReason: "cancelled",
        }),
      });
      expect.unreachable("expected StructuredOutputError");
    } catch (error) {
      expect(error).toBeInstanceOf(StructuredOutputError);
      if (error instanceof StructuredOutputError) {
        expect(error.reason).toBe("stop_reason");
        expect(error.attempts[0]?.stopReason).toBe("cancelled");
      }
    }
  });

  it("throws when maxAttempts is zero", async () => {
    await expect(
      enforceStructuredOutput({
        originalTask: "Return success.",
        responseSchema: ResponseSchema,
        submitPrompt: () => ({ rawText: '{"ok":true}' }),
        maxAttempts: 0,
      }),
    ).rejects.toMatchObject({
      reason: "max_attempts",
      attempts: [],
    });
  });

  it("accepts end_turn as a normal completion reason", async () => {
    const result = await enforceStructuredOutput({
      originalTask: "Return success.",
      responseSchema: ResponseSchema,
      submitPrompt: () => ({
        rawText: '{"ok":true}',
        stopReason: "end_turn",
      }),
    });

    expect(result).toEqual({ ok: true });
  });
});
