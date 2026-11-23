import {
  acp,
  createSessionStore,
  promptText,
  startAcpAgent,
} from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "jev-decision",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, { promptCount: 0 });
    return { sessionId };
  },
  async prompt(params, client) {
    const session = sessions.get(params.sessionId);
    session.promptCount += 1;

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: '{"next":"implement","confidence":0.73}',
        },
      },
    });

    void promptText(params);
    return { stopReason: "end_turn" };
  },
});
