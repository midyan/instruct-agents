import { defineVendor } from "./define-vendor.js";
import { resolveClaudeProcess } from "./claude.js";
import { resolveCodexProcess } from "./codex.js";
import { resolveCursorProcess } from "./cursor.js";

export const Codex = defineVendor({
  id: "openai",
  models: {
    sol: "sol",
    terra: "terra",
    luna: "luna",
    astra: "astra",
    spark: "spark",
    gpt35: "gpt-3.5",
  },
  resolveProcess: resolveCodexProcess,
  capabilities: {
    reasoningEffort: true,
    modelContextWindow: true,
  },
});

export const Claude = defineVendor({
  id: "anthropic",
  models: {
    sonnet: "claude-sonnet-4-20250514",
    haiku: "claude-3-5-haiku-20241022",
    opus: "claude-opus-4-20250514",
  },
  resolveProcess: resolveClaudeProcess,
});

export const Composer = defineVendor({
  id: "cursor",
  models: {
    composer25: "composer-2.5",
    composer25Fast: "composer-2.5-fast",
    composer1: "composer-1",
  },
  resolveProcess: resolveCursorProcess,
});

/** Alias for {@link Composer}; both refer to the Cursor model catalog. */
export const Cursor = Composer;

export type CodexVendor = typeof Codex.vendor;
export type ClaudeVendor = typeof Claude.vendor;
export type ComposerVendor = typeof Composer.vendor;
