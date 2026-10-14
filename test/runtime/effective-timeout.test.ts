import { describe, expect, it } from "vitest";

import {
  CLEANUP_MARGIN_MS,
  computeEffectiveTimeoutMs,
} from "../../src/runtime/effective-timeout.js";
import { DEFAULT_TIMEOUT_MS } from "../../src/runtime/types.js";

describe("computeEffectiveTimeoutMs", () => {
  it("defaults to fifteen minutes when no overrides are set", () => {
    expect(computeEffectiveTimeoutMs({})).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("uses the minimum of invocation and definition timeouts", () => {
    expect(
      computeEffectiveTimeoutMs({
        timeoutMs: 30_000,
        defaultTimeoutMs: 60_000,
      }),
    ).toBe(30_000);
  });

  it("allows definition timeouts above the library default", () => {
    expect(
      computeEffectiveTimeoutMs({
        defaultTimeoutMs: 30 * 60_000,
      }),
    ).toBe(30 * 60_000);
  });

  it("returns null when the deadline leaves no cleanup margin", () => {
    const now = 1_000_000;
    expect(
      computeEffectiveTimeoutMs({
        deadline: now + CLEANUP_MARGIN_MS,
        now,
      }),
    ).toBeNull();
  });

  it("caps timeout by remaining deadline minus cleanup margin", () => {
    const now = 1_000_000;
    expect(
      computeEffectiveTimeoutMs({
        timeoutMs: 60_000,
        deadline: now + 10_000,
        now,
      }),
    ).toBe(10_000 - CLEANUP_MARGIN_MS);
  });
});
