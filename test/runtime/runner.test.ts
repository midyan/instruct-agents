import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fixturePath } from "../helpers/fixtures.js";
import { enforceStructuredOutput } from "../../src/runtime/index.js";
import { runAgentSession } from "../../src/runtime/runner.js";

describe("runAgentSession", () => {
  it("spawns a fixture adapter and returns structured output", async () => {
    const { value, agentProcess } = await runAgentSession(
      {
        cwd: process.cwd(),
        clientInfo: { name: "test-client", version: "0.0.0" },
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
      },
      (submitPrompt) =>
        enforceStructuredOutput({
          originalTask: "Return success.",
          responseSchema: z.object({ ok: z.boolean() }),
          submitPrompt,
        }),
    );

    expect(value).toEqual({ ok: true });
    await agentProcess.dispose();
  });
});
