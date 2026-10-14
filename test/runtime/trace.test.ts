import { PassThrough } from "node:stream";

import type { SessionNotification } from "@agentclientprotocol/sdk";

import { describe, expect, it, vi } from "vitest";

import {
  formatSessionUpdateForTrace,
  resolveTraceStream,
  writeTraceUpdate,
} from "../../src/runtime/trace.js";

describe("resolveTraceStream", () => {
  it("returns null when trace is disabled", () => {
    expect(resolveTraceStream(false)).toBeNull();
  });

  it("returns stderr by default", () => {
    expect(resolveTraceStream(undefined)).toBe(process.stderr);
  });

  it("returns a custom stream when provided", () => {
    const stream = new PassThrough();
    expect(resolveTraceStream(stream)).toBe(stream);
  });

  it("returns stderr when trace is explicitly enabled", () => {
    expect(resolveTraceStream(true)).toBe(process.stderr);
  });
});

describe("formatSessionUpdateForTrace", () => {
  it("formats agent message chunks as raw text", () => {
    expect(
      formatSessionUpdateForTrace({
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: '{"ok":true}' },
        },
      }),
    ).toBe('{"ok":true}');
  });

  it("formats tool updates with only a title", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "call-1",
        title: "Run tests",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBe(
      "[tool] Run tests\n",
    );
  });

  it("formats tool updates with kind but no status", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "call-1",
        title: "Lint",
        kind: "lint",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBe(
      "[tool] Lint (lint)\n",
    );
  });

  it("formats tool updates with status but no kind", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "call-1",
        title: "Lint",
        status: "completed",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBe(
      "[tool] Lint - completed\n",
    );
  });

  it("formats tool updates with title and status", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "call-1",
        title: "Reading files",
        kind: "read",
        status: "pending",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBe(
      "[tool] Reading files (read) - pending\n",
    );
  });

  it("formats thought chunks with a heading", () => {
    expect(
      formatSessionUpdateForTrace({
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_thought_chunk",
          content: { type: "text", text: "Planning next step" },
        },
      }),
    ).toBe("[thought] Planning next step\n");
  });

  it("formats terminal output deltas", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "terminal_output_chunk",
        delta: "npm test\n",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBe("npm test\n");
  });

  it("formats terminal_update output fields", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "terminal_update",
        output: "done",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBe("done\n");
  });

  it("returns null when tool updates have no title", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "call-1",
        status: "pending",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBeNull();
  });

  it("returns null when message chunks have non-text content", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message",
        content: { type: "image" },
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBeNull();
  });

  it("returns null when thought chunks have no text content", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "image" },
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBeNull();
  });

  it("returns null when terminal updates have no output", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "terminal_update",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBeNull();
  });

  it("returns null when sessionUpdate is missing", () => {
    expect(
      formatSessionUpdateForTrace({
        sessionId: "session-1",
        update: {},
      } as SessionNotification),
    ).toBeNull();
  });

  it("returns null for unknown session updates", () => {
    const notification = {
      sessionId: "session-1",
      update: {
        sessionUpdate: "unknown_update",
        message: "hello",
      },
    } as unknown as SessionNotification;

    expect(formatSessionUpdateForTrace(notification)).toBeNull();
  });
});

describe("writeTraceUpdate", () => {
  it("ignores updates when trace is disabled", () => {
    expect(() => {
      writeTraceUpdate(null, {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "ignored" },
        },
      });
    }).not.toThrow();
  });

  it("skips writes when formatting returns null", () => {
    const trace = new PassThrough();
    const writeSpy = vi.spyOn(trace, "write").mockImplementation(() => true);

    writeTraceUpdate(trace, {
      sessionId: "session-1",
      update: {
        sessionUpdate: "unknown_update",
      },
    } as unknown as SessionNotification);

    expect(writeSpy).not.toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it("writes formatted updates to the trace stream", () => {
    const trace = new PassThrough();
    const chunks: string[] = [];
    trace.on("data", (chunk: Buffer) => {
      chunks.push(chunk.toString("utf8"));
    });

    writeTraceUpdate(trace, {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "hello" },
      },
    });

    expect(chunks.join("")).toBe("hello");
  });
});
