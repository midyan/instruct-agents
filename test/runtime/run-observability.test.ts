import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  Composer,
  createTranscriptRun,
  runStructuredAgent,
} from "../../src/runtime/index.js";
import { fixturePath } from "../helpers/fixtures.js";

const ResponseSchema = z.object({ ok: z.boolean() });

const baseDefinition = {
  name: "Observed Agent",
  cwd: process.cwd(),
  vendor: Composer.vendor,
  model: Composer.model.composer25,
  prompt: "Return structured success.",
  responseSchema: ResponseSchema,
  defaultTimeoutMs: 60_000,
};

describe("runStructuredAgent observability", () => {
  it("emits start and end logs through onLog", async () => {
    const events: Array<{ type: string }> = [];

    await runStructuredAgent(baseDefinition, "task prompt", {
      process: {
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
      },
      onLog: (event) => {
        events.push(event);
      },
      trace: false,
    });

    expect(events[0]?.type).toBe("agent_start");
    expect(events.at(-1)?.type).toBe("agent_end");
  });

  it("does not write lifecycle logs to stderr when onLog is supplied", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    await runStructuredAgent(baseDefinition, "task prompt", {
      process: {
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
      },
      onLog: () => {},
      trace: false,
    });

    expect(
      stderrSpy.mock.calls.some(([chunk]) =>
        String(chunk).includes('"type":"agent_start"'),
      ),
    ).toBe(false);

    stderrSpy.mockRestore();
  });

  it("writes full transcripts when transcriptRun is configured", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const transcriptRun = await createTranscriptRun({ rootDir });

    await runStructuredAgent(baseDefinition, "task prompt", {
      process: {
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
      },
      transcriptRun,
      transcriptMode: "full",
      onLog: () => {},
      trace: false,
    });

    const metadata = JSON.parse(
      await readFile(join(transcriptRun.runDir, "run.json"), "utf8"),
    );

    expect(metadata.agents).toHaveLength(1);
    expect(metadata.agents[0]?.outcome).toBe("success");
  });

  it("records transcript failures without prompt text in lifecycle mode", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const transcriptRun = await createTranscriptRun({ rootDir });

    await expect(
      runStructuredAgent(baseDefinition, "task prompt", {
        process: {
          command: process.execPath,
          args: [fixturePath("bad-stop-reason.mjs")],
        },
        transcriptRun,
        transcriptMode: "lifecycle",
        onLog: () => {},
        trace: false,
      }),
    ).rejects.toThrow();

    const transcriptPath = join(
      transcriptRun.runDir,
      transcriptRun.agentTimings[0]!.fileName,
    );
    const transcript = await readFile(transcriptPath, "utf8");

    expect(transcript).not.toContain("task prompt");
    expect(transcript).toContain('"type":"end"');
    expect(transcript).toContain('"outcome":"failure"');
  });
});
