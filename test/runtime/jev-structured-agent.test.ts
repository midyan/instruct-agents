import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  InvalidAgentDefinitionError,
  Jev,
  defineStructuredAgent,
} from "../../src/index.js";
import { JEV_DEFAULT_TIMEOUT_MS } from "../../src/vendors/jev.js";
import * as runModule from "../../src/runtime/run-structured-agent.js";
import { fixturePath } from "../helpers/fixtures.js";

const RESPONSE_OPTIONS = ["implement", "review_only", "escalate"] as const;

describe("defineStructuredAgent (JEV)", () => {
  it("derives responseSchema from responseOptions and defaults timeout to 60s", async () => {
    const runSpy = vi
      .spyOn(runModule, "runStructuredAgent")
      .mockResolvedValue({ next: "implement", confidence: 0.9 });

    const agent = defineStructuredAgent({
      name: "decide",
      cwd: "/tmp/project",
      vendor: Jev.vendor,
      model: Jev.model.fast,
      responseOptions: RESPONSE_OPTIONS,
      prompt: "Choose the next step.",
    });

    expect(agent.definition.vendor).toBe("jev");
    expect(agent.definition.responseOptions).toEqual(RESPONSE_OPTIONS);
    expect(agent.definition.defaultTimeoutMs).toBe(JEV_DEFAULT_TIMEOUT_MS);
    expect(
      agent.definition.responseSchema.parse({
        next: "review_only",
        confidence: 0.4,
      }),
    ).toEqual({ next: "review_only", confidence: 0.4 });

    await expect(agent()).resolves.toEqual({
      next: "implement",
      confidence: 0.9,
    });
    runSpy.mockRestore();
  });

  it("supports input-bearing JEV agents", async () => {
    const runSpy = vi
      .spyOn(runModule, "runStructuredAgent")
      .mockResolvedValue({ next: "escalate", confidence: 0.55 });

    const agent = defineStructuredAgent({
      cwd: "/tmp/project",
      vendor: Jev.vendor,
      model: Jev.model.v1,
      responseOptions: RESPONSE_OPTIONS,
      inputSchema: z.object({ task: z.string() }),
      prompt: ({ task }) => `Decide for: ${task}`,
    });

    await expect(agent({ task: "ship it" })).resolves.toEqual({
      next: "escalate",
      confidence: 0.55,
    });
    expect(runSpy).toHaveBeenCalledWith(
      agent.definition,
      "Decide for: ship it",
      undefined,
    );
    runSpy.mockRestore();
  });

  it("rejects JEV definitions that include responseSchema", () => {
    expect(() =>
      defineStructuredAgent({
        cwd: "/tmp/project",
        vendor: Jev.vendor,
        model: Jev.model.v1,
        responseOptions: RESPONSE_OPTIONS,
        responseSchema: z.object({ next: z.string(), confidence: z.number() }),
        prompt: "Choose.",
      } as never),
    ).toThrow(InvalidAgentDefinitionError);
  });

  it("rejects non-JEV definitions that include responseOptions", () => {
    expect(() =>
      defineStructuredAgent({
        cwd: "/tmp/project",
        vendor: "cursor",
        model: "composer-2.5",
        responseSchema: z.object({ ok: z.boolean() }),
        responseOptions: RESPONSE_OPTIONS,
        prompt: "Return JSON.",
      } as never),
    ).toThrow(InvalidAgentDefinitionError);
  });

  it("runs a JEV agent through a process fixture with derived schema", async () => {
    const agent = defineStructuredAgent({
      cwd: process.cwd(),
      vendor: Jev.vendor,
      model: Jev.model.v1,
      responseOptions: RESPONSE_OPTIONS,
      prompt: "Return a JEV decision.",
    });

    await expect(
      agent({
        process: {
          command: process.execPath,
          args: [fixturePath("jev-decision.mjs")],
        },
      }),
    ).resolves.toEqual({ next: "implement", confidence: 0.92 });
  });
});
