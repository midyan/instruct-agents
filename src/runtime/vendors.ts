export const Codex = {
  vendor: "openai",
  model: {
    sol: "sol",
    terra: "terra",
    luna: "luna",
    astra: "astra",
    spark: "spark",
    gpt35: "gpt-3.5",
  },
} as const;

export const Claude = {
  vendor: "anthropic",
  model: {
    sonnet: "claude-sonnet-4-20250514",
    haiku: "claude-3-5-haiku-20241022",
    opus: "claude-opus-4-20250514",
  },
} as const;

export const Composer = {
  vendor: "cursor",
  model: {
    composer25: "composer-2.5",
    composer25Fast: "composer-2.5-fast",
    composer1: "composer-1",
  },
} as const;

/** Alias for {@link Composer}; both refer to the Cursor model catalog. */
export const Cursor = Composer;

export type CodexVendor = typeof Codex.vendor;
export type ClaudeVendor = typeof Claude.vendor;
export type ComposerVendor = typeof Composer.vendor;
