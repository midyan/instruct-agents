import { describe, expect, it } from "vitest";

import {
  buildInputTaskPrompt,
  buildNoInputTaskPrompt,
} from "../../src/runtime/build-prompt.js";

describe("buildInputTaskPrompt", () => {
  it("returns static prompts unchanged", () => {
    expect(buildInputTaskPrompt("inspect repo", { id: "a" })).toBe(
      "inspect repo",
    );
  });

  it("calls prompt functions with validated input", () => {
    const prompt = buildInputTaskPrompt(
      ({ id }: { id: string }) => `inspect ${id}`,
      { id: "demo" },
    );

    expect(prompt).toBe("inspect demo");
  });
});

describe("buildNoInputTaskPrompt", () => {
  it("returns static prompts unchanged", () => {
    expect(buildNoInputTaskPrompt("inspect repo")).toBe("inspect repo");
  });

  it("calls zero-arg prompt functions", () => {
    expect(buildNoInputTaskPrompt(() => "generated task")).toBe(
      "generated task",
    );
  });
});
