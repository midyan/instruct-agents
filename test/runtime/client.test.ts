import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import { fixturePath } from "../helpers/fixtures.js";
import {
  buildAcceptedCreatePlanResponse,
  buildPermissionResponse,
  buildSkippedAskQuestionResponse,
  selectPermissionOptionId,
} from "../../src/runtime/client.js";
import { runAgentSession } from "../../src/runtime/runner.js";
import { enforceStructuredOutput } from "../../src/runtime/enforce.js";
import { z } from "zod";

describe("selectPermissionOptionId", () => {
  it("prefers allow-once over other options", () => {
    expect(
      selectPermissionOptionId([
        {
          kind: "reject_once",
          name: "Reject",
          optionId: "reject",
        },
        {
          kind: "allow_once",
          name: "Allow once",
          optionId: "allow-once",
        },
      ]),
    ).toBe("allow-once");
  });

  it("falls back to the first option when allow-once is absent", () => {
    expect(
      selectPermissionOptionId([
        {
          kind: "reject_once",
          name: "Reject",
          optionId: "reject",
        },
      ]),
    ).toBe("reject");
  });

  it("returns null when there are no options", () => {
    expect(selectPermissionOptionId([])).toBeNull();
  });
});

describe("buildPermissionResponse", () => {
  it("cancels when no permission options exist", () => {
    expect(
      buildPermissionResponse({
        sessionId: "session-1",
        toolCall: {
          toolCallId: "tool-1",
          title: "Tool",
        },
        options: [],
      }),
    ).toEqual({ outcome: { outcome: "cancelled" } });
  });

  it("selects allow-once when available", () => {
    expect(
      buildPermissionResponse({
        sessionId: "session-1",
        toolCall: {
          toolCallId: "tool-1",
          title: "Tool",
        },
        options: [
          {
            kind: "allow_once",
            name: "Allow once",
            optionId: "allow-once",
          },
        ],
      }),
    ).toEqual({
      outcome: {
        outcome: "selected",
        optionId: "allow-once",
      },
    });
  });
});

describe("Cursor extension responses", () => {
  it("skips ask_question prompts", () => {
    expect(buildSkippedAskQuestionResponse()).toEqual({
      outcome: { outcome: "skipped" },
    });
  });

  it("accepts create_plan prompts", () => {
    expect(buildAcceptedCreatePlanResponse()).toEqual({
      outcome: { outcome: "accepted" },
    });
  });
});

describe("createStructuredAgentClientApp", () => {
  it("writes streamed text to a custom trace stream", async () => {
    const trace = new PassThrough();
    const chunks: string[] = [];
    trace.on("data", (chunk: Buffer) => {
      chunks.push(chunk.toString("utf8"));
    });

    const { agentProcess } = await runAgentSession(
      {
        cwd: process.cwd(),
        clientInfo: { name: "trace-client", version: "0.0.0" },
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
        trace,
      },
      (submitPrompt) =>
        enforceStructuredOutput({
          originalTask: "Return success.",
          responseSchema: z.object({ ok: z.boolean() }),
          submitPrompt,
        }),
    );

    expect(chunks.join("")).toContain('{"ok":true}');
    await agentProcess.dispose();
  });

  it("disables trace output when trace is false", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const { agentProcess } = await runAgentSession(
      {
        cwd: process.cwd(),
        clientInfo: { name: "quiet-client", version: "0.0.0" },
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
        trace: false,
      },
      (submitPrompt) =>
        enforceStructuredOutput({
          originalTask: "Return success.",
          responseSchema: z.object({ ok: z.boolean() }),
          submitPrompt,
        }),
    );

    expect(stderrSpy).not.toHaveBeenCalled();
    stderrSpy.mockRestore();
    await agentProcess.dispose();
  });

  it("invokes onSessionUpdate for streamed updates", async () => {
    const updates: string[] = [];

    const { agentProcess } = await runAgentSession(
      {
        cwd: process.cwd(),
        clientInfo: { name: "observer-client", version: "0.0.0" },
        command: process.execPath,
        args: [fixturePath("structured-success.mjs")],
        trace: false,
        onSessionUpdate: (notification) => {
          updates.push(notification.update.sessionUpdate);
        },
      },
      (submitPrompt) =>
        enforceStructuredOutput({
          originalTask: "Return success.",
          responseSchema: z.object({ ok: z.boolean() }),
          submitPrompt,
        }),
    );

    expect(updates).toContain("agent_message_chunk");
    await agentProcess.dispose();
  });

  it("traces tool updates before text output", async () => {
    const trace = new PassThrough();
    const chunks: string[] = [];
    trace.on("data", (chunk: Buffer) => {
      chunks.push(chunk.toString("utf8"));
    });

    const { agentProcess } = await runAgentSession(
      {
        cwd: process.cwd(),
        clientInfo: { name: "tool-client", version: "0.0.0" },
        command: process.execPath,
        args: [fixturePath("tool-then-text.mjs")],
        trace,
      },
      (submitPrompt) =>
        enforceStructuredOutput({
          originalTask: "Return success.",
          responseSchema: z.object({ ok: z.boolean() }),
          submitPrompt,
        }),
    );

    const output = chunks.join("");
    expect(output).toContain("[tool] Reading files");
    expect(output).toContain('{"ok":true}');
    await agentProcess.dispose();
  });
});
