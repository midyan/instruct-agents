import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "jev-always-invalid-next",
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
          text: '{"next":"not_a_valid_option","confidence":0.5}',
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});
