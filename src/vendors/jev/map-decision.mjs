/**
 * Maps a TypeSafe System One Choice answer to instruct-agents JEV JSON.
 *
 * Spike Q5: `confidence` is the **selected option's probability** in [0, 1],
 * not TypeSafe's derived confidence statistic. Missing probability is an error
 * (do not default to 1.0).
 *
 * @param {{ choice?: string, probabilities?: Record<string, number> }} answer
 * @param {string[]} responseOptions
 * @returns {{ next: string, confidence: number }}
 */
export function mapJevChoiceAnswer(answer, responseOptions) {
  const next = answer?.choice;
  if (typeof next !== "string" || next.length === 0) {
    throw new Error("JEV Choice answer is missing a selected choice");
  }

  if (!responseOptions.includes(next)) {
    throw new Error(
      `JEV Choice "${next}" is not in responseOptions: ${responseOptions.join(", ")}`,
    );
  }

  const probabilities = answer?.probabilities;
  if (
    probabilities === undefined ||
    typeof probabilities !== "object" ||
    probabilities === null
  ) {
    throw new Error(
      `JEV Choice answer for "${next}" is missing per-option probabilities`,
    );
  }

  const confidence = probabilities[next];
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    throw new Error(
      `JEV Choice answer is missing probability for selected option "${next}"`,
    );
  }

  if (confidence < 0 || confidence > 1) {
    throw new Error(
      `JEV probability for "${next}" must be in [0, 1], got ${confidence}`,
    );
  }

  return { next, confidence };
}

/**
 * Catalog ids → TypeSafe System One model names.
 * Exact SKUs may be refined when product confirms fast vs v1 upstream ids.
 */
export const JEV_UPSTREAM_MODEL_MAP = {
  "jev-fast": "jev-latest",
  "jev-v1": "jev-latest",
};

/** @param {string} catalogModel */
export function resolveUpstreamJevModel(catalogModel) {
  return JEV_UPSTREAM_MODEL_MAP[catalogModel] ?? catalogModel;
}
