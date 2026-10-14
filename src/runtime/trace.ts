import type { SessionNotification } from "@agentclientprotocol/sdk";

/** Resolves the writable stream used for live ACP trace output. */
export function resolveTraceStream(
  trace: boolean | NodeJS.WritableStream | undefined,
): NodeJS.WritableStream | null {
  if (trace === false) {
    return null;
  }

  if (trace === true || trace === undefined) {
    return process.stderr;
  }

  return trace;
}

function readStringField(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function formatToolTrace(update: Record<string, unknown>): string | null {
  const title = readStringField(update, "title");
  if (title === undefined) {
    return null;
  }

  const kind = readStringField(update, "kind");
  const status = readStringField(update, "status");
  const parts = [`[tool] ${title}`];

  if (kind !== undefined) {
    parts.push(`(${kind})`);
  }

  if (status !== undefined) {
    parts.push(`- ${status}`);
  }

  return `${parts.join(" ")}\n`;
}

function readTextContent(update: Record<string, unknown>): string | null {
  const content = update.content;
  if (
    typeof content !== "object" ||
    content === null ||
    (content as { type?: string }).type !== "text" ||
    typeof (content as { text?: unknown }).text !== "string"
  ) {
    return null;
  }

  return (content as { text: string }).text;
}

function formatThoughtTrace(update: Record<string, unknown>): string | null {
  const text = readTextContent(update);
  if (text === null) {
    return null;
  }

  return `[thought] ${text}\n`;
}

function formatTerminalTrace(update: Record<string, unknown>): string | null {
  const delta = readStringField(update, "delta");
  if (delta !== undefined) {
    return delta;
  }

  const output = readStringField(update, "output");
  if (output !== undefined) {
    return `${output}\n`;
  }

  return null;
}

function formatTextChunk(update: Record<string, unknown>): string | null {
  return readTextContent(update);
}

const TRACE_FORMATTERS: Record<
  string,
  (update: Record<string, unknown>) => string | null
> = {
  agent_message_chunk: formatTextChunk,
  agent_message: formatTextChunk,
  agent_thought_chunk: formatThoughtTrace,
  agent_thought: formatThoughtTrace,
  tool_call: formatToolTrace,
  tool_call_update: formatToolTrace,
  tool_call_content_chunk: formatToolTrace,
  terminal_output_chunk: formatTerminalTrace,
  terminal_update: formatTerminalTrace,
};

/** Formats an ACP session update for live trace output. */
export function formatSessionUpdateForTrace(
  notification: SessionNotification,
): string | null {
  const update = notification.update as Record<string, unknown>;
  const sessionUpdate = readStringField(update, "sessionUpdate");
  if (sessionUpdate === undefined) {
    return null;
  }

  const formatter = TRACE_FORMATTERS[sessionUpdate];
  if (formatter === undefined) {
    return null;
  }

  return formatter(update);
}

/** Writes a formatted trace chunk when a trace stream is configured. */
export function writeTraceUpdate(
  traceStream: NodeJS.WritableStream | null,
  notification: SessionNotification,
): void {
  if (traceStream === null) {
    return;
  }

  const formatted = formatSessionUpdateForTrace(notification);
  if (formatted !== null) {
    traceStream.write(formatted);
  }
}
