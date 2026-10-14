import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "structured-retry",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, { promptCount: 0 });
    return { sessionId };
  },
  async prompt(params, client) {
    const session = sessions.get(params.sessionId);
    session.promptCount += 1;
    const payload = session.promptCount === 1 ? '{"ok":"nope"}' : '{"ok":true}';

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: payload,
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});
