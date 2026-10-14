import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fixturePath } from "../helpers/fixtures.js";
import {
  Composer,
  OverallRuntimeBudgetExhaustedError,
  TurnTimeoutError,
  defineStructuredAgent,
  resolveAgentProcess,
  runStructuredAgent,
} from "../../src/runtime/index.js";

const ResponseSchema = z.object({
  ok: z.boolean(),
  permission: z.string().optional(),
  ask: z.string().optional(),
  plan: z.string().optional(),
});

const baseDefinition = {
  cwd: process.cwd(),
  vendor: Composer.vendor,
  model: Composer.model.composer25,
  prompt: "Return structured success.",
  responseSchema: ResponseSchema,
  defaultTimeoutMs: 60_000,
};

function fixtureProcess(name: string) {
  return {
    command: process.execPath,
    args: [fixturePath(name)],
  };
}

describe("runStructuredAgent", () => {
  it("resolves the Cursor vendor adapter without a process override", () => {
    expect(resolveAgentProcess(baseDefinition)).toEqual({
      command: "agent",
      args: ["--model", Composer.model.composer25, "acp"],
    });
  });

  it("fails immediately when the overall deadline is exhausted", async () => {
    await expect(
      runStructuredAgent(baseDefinition, "task prompt", {
        deadline: Date.now() + 1,
        process: fixtureProcess("structured-success.mjs"),
      }),
    ).rejects.toBeInstanceOf(OverallRuntimeBudgetExhaustedError);
  });

  it("returns typed output from a local ACP fixture", async () => {
    const result = await runStructuredAgent(baseDefinition, "task prompt", {
      process: fixtureProcess("structured-success.mjs"),
    });

    expect(result).toEqual({ ok: true });
  });

  it("retries malformed structured output in the same session", async () => {
    const result = await runStructuredAgent(baseDefinition, "task prompt", {
      process: fixtureProcess("structured-retry.mjs"),
    });

    expect(result).toEqual({ ok: true });
  });

  it("throws StructuredOutputError for non-end_turn stop reasons", async () => {
    await expect(
      runStructuredAgent(baseDefinition, "task prompt", {
        process: fixtureProcess("bad-stop-reason.mjs"),
      }),
    ).rejects.toMatchObject({
      name: "StructuredOutputError",
      reason: "stop_reason",
    });
  });

  it("auto-selects allow-once permissions during fixture turns", async () => {
    const result = await runStructuredAgent(baseDefinition, "task prompt", {
      process: fixtureProcess("permission-agent.mjs"),
    });

    expect(result).toEqual({ ok: true, permission: "allow-once" });
  });

  it("authenticates with cursor_login when advertised", async () => {
    const result = await runStructuredAgent(baseDefinition, "task prompt", {
      process: fixtureProcess("cursor-auth.mjs"),
    });

    expect(result).toEqual({ ok: true });
  });

  it("handles Cursor ask_question and create_plan extension methods", async () => {
    const result = await runStructuredAgent(baseDefinition, "task prompt", {
      process: fixtureProcess("cursor-extensions.mjs"),
    });

    expect(result).toEqual({
      ok: true,
      ask: "skipped",
      plan: "accepted",
    });
  });

  it("rejects when the turn exceeds its timeout budget", async () => {
    const agent = defineStructuredAgent({
      ...baseDefinition,
      defaultTimeoutMs: 50,
    });

    await expect(
      agent({ process: fixtureProcess("slow-agent.mjs") }),
    ).rejects.toBeInstanceOf(TurnTimeoutError);
  });
});
