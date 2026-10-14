import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "tool-then-text",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    return { sessionId };
  },
  async prompt(params, client) {
    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "call-1",
        title: "Reading files",
        kind: "read",
        status: "pending",
      },
    });

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: '{"ok":true}',
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});
