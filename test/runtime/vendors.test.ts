import { describe, expect, it } from "vitest";

import {
  Claude,
  Codex,
  Composer,
  Cursor,
  Jev,
} from "../../src/runtime/vendors.js";

describe("vendor catalogs", () => {
  it("exports stable vendor ids", () => {
    expect(Codex.vendor).toBe("openai");
    expect(Claude.vendor).toBe("anthropic");
    expect(Composer.vendor).toBe("cursor");
    expect(Jev.vendor).toBe("jev");
  });

  it("aliases Cursor to Composer", () => {
    expect(Cursor).toBe(Composer);
  });

  it("lists repository-approved model identifiers", () => {
    expect(Codex.model.sol).toBe("sol");
    expect(Claude.model.sonnet).toMatch(/^claude-/);
    expect(Composer.model.composer25).toBe("composer-2.5");
    expect(Composer.model.composer25Fast).toBe("composer-2.5-fast");
    expect(Jev.model.fast).toBe("jev-fast");
    expect(Jev.model.v1).toBe("jev-v1");
  });
});
