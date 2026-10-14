import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "bad-stop-reason",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    return { sessionId };
  },
  async prompt(params, client) {
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

    return { stopReason: "cancelled" };
  },
});
