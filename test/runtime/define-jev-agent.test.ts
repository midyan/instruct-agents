import { describe, expect, it } from "vitest";
import { z } from "zod";

import { Jev, defineStructuredAgent } from "../../src/index.js";
import { routeNextStep } from "../../examples/jev-route-next-step.js";
import { fixturePath } from "../helpers/fixtures.js";

function jevFixtureProcess(name: string) {
  return {
    command: process.execPath,
    args: [fixturePath(name)],
  };
}

describe("define JEV agent (reference + fixture)", () => {
  it("runs the reference routeNextStep agent with the decision fixture", async () => {
    const result = await routeNextStep(
      { summary: "Small typo fix in README; no behavior change." },
      { process: jevFixtureProcess("jev-decision.mjs") },
    );

    expect(result).toEqual({ next: "implement", confidence: 0.92 });
    expect(routeNextStep.definition.vendor).toBe(Jev.vendor);
    expect(routeNextStep.definition.responseOptions).toEqual([
      "implement",
      "review_only",
      "escalate_system2",
    ]);
  });

  it("retries when the fixture returns an invalid next, then accepts a valid decision", async () => {
    const agent = defineStructuredAgent({
      cwd: process.cwd(),
      vendor: Jev.vendor,
      model: Jev.model.fast,
      responseOptions: [
        "implement",
        "review_only",
        "escalate_system2",
      ] as const,
      prompt: "Choose next.",
    });

    await expect(
      agent({ process: jevFixtureProcess("jev-invalid-next-retry.mjs") }),
    ).resolves.toEqual({ next: "implement", confidence: 0.92 });
  });

  it("fails enforce after repeated invalid next values", async () => {
    const agent = defineStructuredAgent({
      cwd: process.cwd(),
      vendor: Jev.vendor,
      model: Jev.model.v1,
      responseOptions: ["implement", "review_only"] as const,
      prompt: "Choose next.",
      inputSchema: z.object({ summary: z.string() }),
    });

    await expect(
      agent(
        { summary: "x" },
        { process: jevFixtureProcess("jev-always-invalid-next.mjs") },
      ),
    ).rejects.toMatchObject({
      name: "StructuredOutputError",
      reason: "max_attempts",
    });
  });
});
