import {
  acp,
  createSessionStore,
  promptText,
  startAcpAgent,
} from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "structured-success",
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
          text: '{"ok":true}',
        },
      },
    });

    void promptText(params);
    return { stopReason: "end_turn" };
  },
});
