import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";

function promptText(params) {
  return params.prompt
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
}

export function createSessionStore() {
  return new Map();
}

export function startAcpAgent(handlers) {
  const input = Writable.toWeb(process.stdout);
  const output = Readable.toWeb(process.stdin);
  const stream = acp.ndJsonStream(input, output);

  let app = acp.agent({ name: handlers.name ?? "structured-agents-fixture" });

  if (handlers.initialize) {
    app = app.onRequest("initialize", (ctx) => handlers.initialize(ctx.params));
  } else {
    app = app.onRequest("initialize", () => ({
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
    }));
  }

  if (handlers.authenticate) {
    app = app.onRequest("authenticate", (ctx) =>
      handlers.authenticate(ctx.params),
    );
  } else {
    app = app.onRequest("authenticate", () => ({}));
  }

  app = app
    .onRequest("session/new", (ctx) => handlers.newSession(ctx.params))
    .onRequest("session/prompt", (ctx) =>
      handlers.prompt(ctx.params, ctx.client),
    )
    .onNotification("session/cancel", () => {});

  for (const [method, handler] of handlers.customRequests ?? []) {
    app = app.onRequest(method, (ctx) => handler(ctx.params, ctx.client));
  }

  app.connect(stream);
}

export { acp, promptText };
