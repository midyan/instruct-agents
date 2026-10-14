import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";

import {
  Codex,
  Composer,
  UnsupportedVendorOptionError,
  defineStructuredAgent,
} from "../../src/index.js";
import { AgentRuntimeNotImplementedError } from "../../src/runtime/errors.js";
import * as runModule from "../../src/runtime/run-structured-agent.js";

const ResponseSchema = z.object({ ok: z.boolean() });

describe("defineStructuredAgent", () => {
  it("creates a no-input agent and retains its definition", async () => {
    const runSpy = vi
      .spyOn(runModule, "runStructuredAgent")
      .mockResolvedValue({ ok: true });
    const agent = defineStructuredAgent({
      name: "inspect",
      cwd: "/tmp/project",
      vendor: Composer.vendor,
      model: Composer.model.composer25,
      prompt: "Inspect the repository.",
      responseSchema: ResponseSchema,
    });

    expect(agent.definition.name).toBe("inspect");
    expect(agent.definition.defaultTimeoutMs).toBe(15 * 60_000);
    expect(agent.definition.prompt).toBe("Inspect the repository.");

    await expect(agent()).resolves.toEqual({ ok: true });
    expect(runSpy).toHaveBeenCalledWith(
      agent.definition,
      "Inspect the repository.",
      undefined,
    );
    runSpy.mockRestore();
  });

  it("creates an input-bearing agent with a function prompt", async () => {
    const runSpy = vi
      .spyOn(runModule, "runStructuredAgent")
      .mockResolvedValue({ ok: true });
    const InputSchema = z.object({ id: z.string() });
    const agent = defineStructuredAgent({
      cwd: "/tmp/project",
      vendor: Composer.vendor,
      model: Composer.model.composer25,
      inputSchema: InputSchema,
      responseSchema: ResponseSchema,
      prompt: ({ id }) => `Scaffold project ${id}`,
    });

    expect(agent.definition.inputSchema).toBe(InputSchema);

    await expect(agent({ id: "demo" })).resolves.toEqual({ ok: true });
    expect(runSpy).toHaveBeenCalledWith(
      agent.definition,
      "Scaffold project demo",
      undefined,
    );
    runSpy.mockRestore();
  });

  it("validates input before the runtime is invoked", async () => {
    const runSpy = vi.spyOn(runModule, "runStructuredAgent");
    const agent = defineStructuredAgent({
      cwd: "/tmp/project",
      vendor: Composer.vendor,
      model: Composer.model.composer25,
      inputSchema: z.object({ id: z.string().min(1) }),
      responseSchema: ResponseSchema,
      prompt: ({ id }) => `Scaffold project ${id}`,
    });

    await expect(agent({ id: "" })).rejects.toBeInstanceOf(ZodError);
    expect(runSpy).not.toHaveBeenCalled();
    runSpy.mockRestore();
  });

  it("passes the rendered prompt to the runtime for valid input", async () => {
    const runSpy = vi
      .spyOn(runModule, "runStructuredAgent")
      .mockRejectedValue(new AgentRuntimeNotImplementedError());
    const agent = defineStructuredAgent({
      cwd: "/tmp/project",
      vendor: Composer.vendor,
      model: Composer.model.composer25,
      inputSchema: z.object({ id: z.string() }),
      responseSchema: ResponseSchema,
      prompt: ({ id }) => `Scaffold project ${id}`,
    });

    await expect(agent({ id: "demo" })).rejects.toBeInstanceOf(
      AgentRuntimeNotImplementedError,
    );
    expect(runSpy).toHaveBeenCalledWith(
      agent.definition,
      "Scaffold project demo",
      undefined,
    );
    runSpy.mockRestore();
  });

  it("allows Codex reasoningEffort on definition", () => {
    const agent = defineStructuredAgent({
      cwd: "/tmp/project",
      vendor: Codex.vendor,
      model: Codex.model.sol,
      reasoningEffort: "high",
      prompt: "Review the change.",
      responseSchema: ResponseSchema,
    });

    expect(agent.definition.reasoningEffort).toBe("high");
  });

  it("rejects reasoningEffort for non-Codex vendors at definition time", () => {
    expect(() =>
      defineStructuredAgent({
        cwd: "/tmp/project",
        vendor: Composer.vendor,
        model: Composer.model.composer25,
        reasoningEffort: "high",
        prompt: "Review the change.",
        responseSchema: ResponseSchema,
      }),
    ).toThrow(UnsupportedVendorOptionError);
  });
});
