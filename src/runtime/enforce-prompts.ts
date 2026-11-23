import type { z } from "zod";

import type { JevResponseOptions } from "./jev-response-schema.js";

export function getResponseJsonSchema(schema: z.ZodType): unknown {
  return schema.toJSONSchema();
}

function formatJsonSchema(schema: z.ZodType): string {
  return JSON.stringify(getResponseJsonSchema(schema), null, 2);
}

/** Lists allowed `next` labels when enforcing a JEV decision schema. */
export function formatJevResponseOptionsHint(
  responseOptions: JevResponseOptions,
): string {
  return `Allowed values for "next": ${responseOptions.join(" | ")}`;
}

export function buildInitialStructuredPrompt(
  originalTask: string,
  responseSchema: z.ZodType,
  responseOptions?: JevResponseOptions,
): string {
  const optionsHint =
    responseOptions === undefined
      ? ""
      : `\n${formatJevResponseOptionsHint(responseOptions)}\n`;

  return `${originalTask}

Return your response as JSON only. Do not include markdown fences or explanatory text.
${optionsHint}
Required JSON Schema:
${formatJsonSchema(responseSchema)}`;
}

export function buildCorrectionPrompt(
  originalTask: string,
  previousOutput: string,
  failure: string,
  responseSchema: z.ZodType,
  responseOptions?: JevResponseOptions,
): string {
  const optionsHint =
    responseOptions === undefined
      ? ""
      : `\n${formatJevResponseOptionsHint(responseOptions)}\n`;

  return `${originalTask}

Your previous response did not satisfy the required JSON schema.

Previous output:
${previousOutput}

Validation error:
${failure}
${optionsHint}
Required JSON Schema:
${formatJsonSchema(responseSchema)}

Return JSON only. Do not include markdown fences or explanatory text.`;
}
