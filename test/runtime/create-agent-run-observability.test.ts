import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { Composer } from "../../src/runtime/vendors.js";
import { createAgentRunObservability } from "../../src/runtime/run-observability.js";
import { createTranscriptRun } from "../../src/runtime/transcript.js";

describe("createAgentRunObservability", () => {
  it("formats non-error failures for end logs", async () => {
    const events: Array<{ type: string; error?: string }> = [];
    const observability = await createAgentRunObservability({
      definition: {
        model: Composer.model.composer25,
        vendor: Composer.vendor,
      },
      timeoutMs: 60_000,
      startedAt: Date.now(),
      runOptions: {
        onLog: (event) => {
          events.push(event);
        },
      },
    });

    await observability.notifyStart();
    await observability.notifyFailure("plain failure");

    expect(events.at(-1)).toMatchObject({
      type: "agent_end",
      outcome: "failure",
      error: "plain failure",
    });
  });

  it("defaults transcript mode to full when transcriptRun is provided", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const transcriptRun = await createTranscriptRun({ rootDir });
    const observability = await createAgentRunObservability({
      definition: {
        name: "Recorder",
        model: Composer.model.composer25,
        vendor: Composer.vendor,
      },
      timeoutMs: 60_000,
      startedAt: Date.now(),
      runOptions: {
        transcriptRun,
      },
    });

    const submit = observability.wrapSubmitPrompt(async (prompt) => {
      await observability.handleSessionUpdate({
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: prompt },
        },
      });
      return { rawText: '{"ok":true}' };
    });

    await submit("visible prompt", 0);
    await observability.notifySuccess({ ok: true });

    const transcriptPath = join(
      transcriptRun.runDir,
      transcriptRun.agentTimings[0]!.fileName,
    );

    expect(await readFile(transcriptPath, "utf8")).toContain("visible prompt");
  });
});
