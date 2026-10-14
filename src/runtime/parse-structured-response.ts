import { prettifyError } from "zod";
import type { z } from "zod";

import { parseJsonFromResponse } from "./extract-json.js";

export type StructuredParseResult<T> =
  { ok: true; data: T } | { ok: false; failure: string };

export function parseStructuredResponse<T>(
  rawText: string,
  responseSchema: z.ZodType<T>,
): StructuredParseResult<T> {
  const json = parseJsonFromResponse(rawText);
  if (json === null) {
    return {
      ok: false,
      failure: "Response did not contain valid JSON.",
    };
  }

  const result = responseSchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      failure: prettifyError(result.error),
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}
