import { DEFAULT_TIMEOUT_MS } from "./types.js";

export const CLEANUP_MARGIN_MS = 2000;

export type EffectiveTimeoutInput = {
  timeoutMs?: number;
  defaultTimeoutMs?: number;
  deadline?: number;
  now?: number;
};

/** Computes per-turn timeout from invocation/definition defaults, capped by deadline margin. */
export function computeEffectiveTimeoutMs(
  input: EffectiveTimeoutInput,
): number | null {
  const now = input.now ?? Date.now();
  const limits: number[] = [];

  if (input.timeoutMs !== undefined) {
    limits.push(input.timeoutMs);
  }

  if (input.defaultTimeoutMs !== undefined) {
    limits.push(input.defaultTimeoutMs);
  }

  let timeoutMs =
    limits.length === 0 ? DEFAULT_TIMEOUT_MS : Math.min(...limits);

  if (input.deadline !== undefined) {
    const remainingMs = input.deadline - now - CLEANUP_MARGIN_MS;
    if (remainingMs <= 0) {
      return null;
    }

    timeoutMs = Math.min(timeoutMs, remainingMs);
  }

  return timeoutMs;
}
