import { z } from "zod";

/** Non-empty tuple of option labels for JEV `next`. */
export type JevResponseOptions = readonly [string, ...string[]];

/**
 * Fixed JEV decision output: selected option + calibrated confidence in [0, 1].
 * Confidence is the probability of the selected `next` label (see H11-114 shim).
 */
export type JevDecision<
  TOptions extends JevResponseOptions = JevResponseOptions,
> = {
  next: TOptions[number];
  confidence: number;
};

/**
 * Builds the fixed Zod schema for JEV structured turns.
 *
 * The enforce loop embeds this schema (including the `next` enum) in the initial
 * prompt; when `responseOptions` are also passed through, the prompt lists the
 * allowed `next` labels explicitly for the model.
 */
export function buildJevResponseSchema<const T extends JevResponseOptions>(
  responseOptions: T,
) {
  return z.object({
    next: z.enum(responseOptions),
    confidence: z.number().min(0).max(1),
  });
}

export type JevResponseSchema<T extends JevResponseOptions> = ReturnType<
  typeof buildJevResponseSchema<T>
>;

export type JevResponse<T extends JevResponseOptions> = z.infer<
  JevResponseSchema<T>
>;
