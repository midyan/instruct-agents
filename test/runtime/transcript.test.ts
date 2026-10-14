import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createTranscriptRun,
  openTranscriptAgent,
  sanitizeTranscriptName,
} from "../../src/runtime/transcript.js";

describe("sanitizeTranscriptName", () => {
  it("normalizes names for filenames", () => {
    expect(sanitizeTranscriptName("Review Agent")).toBe("review-agent");
  });
});

describe("createTranscriptRun", () => {
  it("creates a timestamped directory and run metadata", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({
      rootDir,
      startedAt: Date.parse("2026-09-22T20:30:00.000Z"),
    });

    const metadata = JSON.parse(
      await readFile(join(run.runDir, "run.json"), "utf8"),
    );

    expect(run.runDir).toContain("2026-09-22T20-30-00.000Z");
    expect(metadata.lifecycleOnly).toBe(false);
    expect(metadata.agents).toEqual([]);
  });
});

describe("openTranscriptAgent", () => {
  it("records full prompts, updates, and results", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({ rootDir });
    const recorder = await openTranscriptAgent(run, {
      name: "Reviewer",
      model: "composer-2.5",
      vendor: "cursor",
    });

    await recorder.recordPrompt("Return JSON.", 0);
    await recorder.recordSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: '{"ok":true}' },
      },
    });
    await recorder.recordResult({ ok: true });
    await recorder.finish("success", Date.now());

    const lines = (await readFile(recorder.filePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string });

    expect(lines.map((line) => line.type)).toEqual([
      "start",
      "prompt",
      "session_update",
      "result",
      "end",
    ]);

    const metadata = JSON.parse(
      await readFile(join(run.runDir, "run.json"), "utf8"),
    );
    expect(metadata.agents[0]?.outcome).toBe("success");
  });

  it("names transcript files with a default slug when no name is provided", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({ rootDir });
    const recorder = await openTranscriptAgent(run, {
      model: "composer-2.5",
      vendor: "cursor",
    });

    expect(recorder.filePath).toContain("-agent.jsonl");
  });

  it("records structured errors in full mode", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({ rootDir });
    const recorder = await openTranscriptAgent(run, {
      name: "Failure",
      model: "composer-2.5",
      vendor: "cursor",
    });

    await recorder.recordError(new Error("boom"));
    await recorder.finish("failure", Date.now());

    const transcript = await readFile(recorder.filePath, "utf8");
    expect(transcript).toContain('"type":"error"');
    expect(transcript).toContain("boom");
  });

  it("records non-error failure values", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({ rootDir });
    const recorder = await openTranscriptAgent(run, {
      model: "composer-2.5",
      vendor: "cursor",
    });

    await recorder.recordError("plain failure");
    const transcript = await readFile(recorder.filePath, "utf8");

    expect(transcript).toContain("plain failure");
  });

  it("forces lifecycle mode when the run is lifecycle-only", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({ rootDir, lifecycleOnly: true });
    const recorder = await openTranscriptAgent(run, {
      name: "Sensitive Run",
      model: "composer-2.5",
      vendor: "cursor",
    });

    await recorder.recordPrompt("secret prompt", 0);
    const transcript = await readFile(recorder.filePath, "utf8");

    expect(transcript).not.toContain("secret prompt");
  });

  it("retains only lifecycle metadata when transcriptMode is lifecycle", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "structured-agents-"));
    const run = await createTranscriptRun({ rootDir });
    const recorder = await openTranscriptAgent(run, {
      name: "Sensitive",
      model: "composer-2.5",
      vendor: "cursor",
      mode: "lifecycle",
    });

    await recorder.recordPrompt("secret prompt", 0);
    await recorder.recordSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "secret output" },
      },
    });
    await recorder.recordResult({ ok: true });
    await recorder.finish("success", Date.now());

    const transcript = await readFile(recorder.filePath, "utf8");

    expect(transcript).not.toContain("secret prompt");
    expect(transcript).not.toContain("secret output");
    expect(transcript).toContain('"type":"start"');
    expect(transcript).toContain('"type":"end"');
  });
});
