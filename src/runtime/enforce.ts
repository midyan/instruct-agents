import type { z } from "zod";

import {
  buildCorrectionPrompt,
  buildInitialStructuredPrompt,
} from "./enforce-prompts.js";
import { StructuredOutputError } from "./errors.js";
import type { StructuredOutputAttempt } from "./errors.js";
import { parseStructuredResponse } from "./parse-structured-response.js";

export const DEFAULT_MAX_STRUCTURED_OUTPUT_ATTEMPTS = 3;
export const NORMAL_COMPLETION_STOP_REASON = "end_turn";

export type StructuredOutputTurn = {
  rawText: string;
  stopReason?: string;
};

export type SubmitStructuredOutputPrompt = (
  prompt: string,
  attemptIndex: number,
) => StructuredOutputTurn | Promise<StructuredOutputTurn>;

function recordAttempt(
  attempts: StructuredOutputAttempt[],
  prompt: string,
  turn: StructuredOutputTurn,
  failure?: string,
): void {
  attempts.push({
    prompt,
    rawText: turn.rawText,
    stopReason: turn.stopReason,
    failure,
  });
}

function assertNormalCompletion(
  turn: StructuredOutputTurn,
  attempts: StructuredOutputAttempt[],
  prompt: string,
): void {
  if (
    turn.stopReason !== undefined &&
    turn.stopReason !== NORMAL_COMPLETION_STOP_REASON
  ) {
    recordAttempt(attempts, prompt, turn);
    throw new StructuredOutputError(
      "stop_reason",
      `Agent stopped with reason "${turn.stopReason}"`,
      attempts,
    );
  }
}

function throwMaxAttemptsError(attempts: StructuredOutputAttempt[]): never {
  throw new StructuredOutputError(
    "max_attempts",
    "Structured output validation failed after maximum attempts",
    attempts,
  );
}

/** Validates model text against a Zod schema with bounded same-session retries. */
export async function enforceStructuredOutput<T>(options: {
  originalTask: string;
  responseSchema: z.ZodType<T>;
  submitPrompt: SubmitStructuredOutputPrompt;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts =
    options.maxAttempts ?? DEFAULT_MAX_STRUCTURED_OUTPUT_ATTEMPTS;
  const attempts: StructuredOutputAttempt[] = [];
  let prompt = buildInitialStructuredPrompt(
    options.originalTask,
    options.responseSchema,
  );

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const turn = await options.submitPrompt(prompt, attemptIndex);
    assertNormalCompletion(turn, attempts, prompt);

    const parsed = parseStructuredResponse(
      turn.rawText,
      options.responseSchema,
    );
    if (parsed.ok) {
      return parsed.data;
    }

    recordAttempt(attempts, prompt, turn, parsed.failure);

    const isLastAttempt = attemptIndex === maxAttempts - 1;
    if (isLastAttempt) {
      throwMaxAttemptsError(attempts);
    }

    prompt = buildCorrectionPrompt(
      options.originalTask,
      turn.rawText,
      parsed.failure,
      options.responseSchema,
    );
  }

  return throwMaxAttemptsError(attempts);
}
