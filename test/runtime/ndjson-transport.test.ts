import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { createNdjsonTransport } from "../../src/runtime/ndjson-transport.js";

describe("createNdjsonTransport", () => {
  it("writes and reads NDJSON messages", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const transport = createNdjsonTransport(stdin, stdout);
    const received: unknown[] = [];

    const unsubscribe = transport.onMessage((message) => {
      received.push(message);
    });

    transport.write({ type: "ping" });
    stdout.write('{"type":"pong"}\n');

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(received).toEqual([{ type: "pong" }]);

    unsubscribe();
    transport.close();
  });

  it("ignores blank lines", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const transport = createNdjsonTransport(stdin, stdout);
    const received: unknown[] = [];

    transport.onMessage((message) => {
      received.push(message);
    });

    stdout.write("\n");
    stdout.write('{"type":"pong"}\n');

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(received).toEqual([{ type: "pong" }]);
    transport.close();
  });
});
