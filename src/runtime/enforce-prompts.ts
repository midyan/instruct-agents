import type { z } from "zod";

export function getResponseJsonSchema(schema: z.ZodType): unknown {
  return schema.toJSONSchema();
}

function formatJsonSchema(schema: z.ZodType): string {
  return JSON.stringify(getResponseJsonSchema(schema), null, 2);
}

export function buildInitialStructuredPrompt(
  originalTask: string,
  responseSchema: z.ZodType,
): string {
  return `${originalTask}

Return your response as JSON only. Do not include markdown fences or explanatory text.

Required JSON Schema:
${formatJsonSchema(responseSchema)}`;
}

export function buildCorrectionPrompt(
  originalTask: string,
  previousOutput: string,
  failure: string,
  responseSchema: z.ZodType,
): string {
  return `${originalTask}

Your previous response did not satisfy the required JSON schema.

Previous output:
${previousOutput}

Validation error:
${failure}

Required JSON Schema:
${formatJsonSchema(responseSchema)}

Return JSON only. Do not include markdown fences or explanatory text.`;
}
